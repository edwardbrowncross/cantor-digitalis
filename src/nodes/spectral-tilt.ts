import type { Node } from "./types";
import { registerWorkletOnce } from "./worklet-utils";
import { evaluateFirstOrder, combineSeries } from "../utils/frequency-response";

export type SpectralTiltParams = {
  /** First stage attenuation in dB at 3000 Hz, derived from E and M */
  Tl1: number;
  /** Second stage attenuation in dB at 3000 Hz, derived from E and M */
  Tl2: number;
};

/**
 * Spectral Tilt AudioWorklet Processor code.
 *
 * Implements the transfer function from Section 3.2.2:
 * ST(z) = ST₁(z) × ST₂(z)
 *
 * Where each stage is:
 * STᵢ(z) = (1 - aᵢ) / (1 - aᵢ·z⁻¹)
 *
 * And:
 *   aᵢ = νᵢ - √(νᵢ² - 1)
 *   νᵢ = 1 + (1 - cos(2π·3000·Ts)) / (10^(Tlᵢ/10) - 1)
 *
 * This gives unity gain at DC and specified attenuation (Tlᵢ dB) at 3000 Hz.
 */
const processorCode = `
class SpectralTiltProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "Tl1", defaultValue: 0, minValue: 0, maxValue: 50, automationRate: "k-rate" },
      { name: "Tl2", defaultValue: 0, minValue: 0, maxValue: 30, automationRate: "k-rate" }
    ];
  }

  constructor() {
    super();
    // Filter coefficients for two stages
    this.a1 = 0;  // First stage pole
    this.a2 = 0;  // Second stage pole
    this.g1 = 1;  // First stage gain (1 - a1)
    this.g2 = 1;  // Second stage gain (1 - a2)

    // Filter state (one delay element per stage)
    this.y1_prev = 0;  // Previous output of stage 1
    this.y2_prev = 0;  // Previous output of stage 2

    // Cache last parameter values for change detection
    this.lastTl1 = -1;
    this.lastTl2 = -1;

    // Pre-compute cosOmega since it's constant for a given sample rate
    const Ts = 1 / sampleRate;
    this.cosOmega = Math.cos(2 * Math.PI * 3000 * Ts);
  }

  /**
   * Compute the pole coefficient for a single stage.
   * Returns [a, g] where a is the pole and g = 1 - a is the gain.
   */
  computeStageCoefficients(Tl) {
    // Bypass if attenuation is zero or negative
    if (Tl <= 0) {
      return [0, 1];
    }

    // Power ratio at 3000 Hz (10^(Tl/10) is the attenuation factor)
    const attenuationRatio = Math.pow(10, Tl / 10);

    // Compute ν from Section 3.2.2
    // νᵢ = 1 + (1 - cos(ω)) / (10^(Tlᵢ/10) - 1)
    const nu = 1 + (1 - this.cosOmega) / (attenuationRatio - 1);

    // Compute pole coefficient: a = ν - √(ν² - 1)
    // This ensures 0 < a < 1 for stability
    const a = nu - Math.sqrt(nu * nu - 1);
    const g = 1 - a;

    return [a, g];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];

    if (!input || !output) {
      return true;
    }

    // k-rate parameters (single value per block)
    const Tl1 = parameters.Tl1[0];
    const Tl2 = parameters.Tl2[0];

    // Recompute coefficients if parameters changed
    if (Tl1 !== this.lastTl1) {
      [this.a1, this.g1] = this.computeStageCoefficients(Tl1);
      this.lastTl1 = Tl1;
    }
    if (Tl2 !== this.lastTl2) {
      [this.a2, this.g2] = this.computeStageCoefficients(Tl2);
      this.lastTl2 = Tl2;
    }

    for (let i = 0; i < input.length; i++) {
      // Stage 1: y1[n] = g1 * x[n] + a1 * y1[n-1]
      const y1 = this.g1 * input[i] + this.a1 * this.y1_prev;
      this.y1_prev = y1;

      // Stage 2: y2[n] = g2 * y1[n] + a2 * y2[n-1]
      const y2 = this.g2 * y1 + this.a2 * this.y2_prev;
      this.y2_prev = y2;

      output[i] = y2;
    }

    return true;
  }
}

registerProcessor('spectral-tilt-processor', SpectralTiltProcessor);
`;

const PROCESSOR_NAME = "spectral-tilt-processor";

/**
 * Spectral Tilt (ST)
 *
 * The spectral tilt filter models the high-frequency roll-off of the glottal
 * source spectrum. Louder, more pressed phonation has less spectral tilt
 * (brighter sound), while softer or breathier phonation has more tilt
 * (darker sound).
 *
 * It is implemented as a cascade of two 1-pole 1-zero low-pass filters, each
 * providing attenuation specified in dB at 3000 Hz.
 *
 * The transfer function (Section 3.2.2) is:
 *
 * ST(z) = ST₁(z) × ST₂(z)
 *
 * Where each stage is:
 * STᵢ(z) = (1 - aᵢ) / (1 - aᵢ·z⁻¹)
 *
 * With:
 *   aᵢ = νᵢ - √(νᵢ² - 1)
 *   νᵢ = 1 + (1 - cos(2π·3000·Ts)) / (10^(Tlᵢ/10) - 1)
 *
 * Paper reference: Section 3.2.2 (filter structure), Section 4.2.3 (parameter mapping)
 *
 * Input parameters:
 *   - Tl₁ (first tilt stage attenuation in dB at 3 kHz) — derived from E and M
 *   - Tl₂ (second tilt stage attenuation in dB at 3 kHz) — derived from E and M
 *
 * Parameter mapping from Section 4.2.3:
 *   For M=1 (chest voice):
 *     Tl₁ = 27 - 21·Ep dB
 *     Tl₂ = 11 - 11·Ep dB
 *   For M=2 (falsetto):
 *     Tl₁ = 45 - 36·Ep dB
 *     Tl₂ = 20 - 18.5·Ep dB
 *
 * Where Ep is the perturbed vocal effort (E with heartbeat and slow perturbations).
 */
export class SpectralTilt implements Node<SpectralTiltParams> {
  private ctx: AudioContext;
  private workletNode: AudioWorkletNode;
  public in: AudioNode;
  public out: AudioNode;

  private constructor(ctx: AudioContext, workletNode: AudioWorkletNode) {
    this.ctx = ctx;
    this.workletNode = workletNode;
    this.in = workletNode;
    this.out = workletNode;
  }

  /** First stage spectral tilt attenuation AudioParam (k-rate, 0-50 dB at 3kHz) */
  get Tl1(): AudioParam {
    return this.workletNode.parameters.get("Tl1")!;
  }

  /** Second stage spectral tilt attenuation AudioParam (k-rate, 0-30 dB at 3kHz) */
  get Tl2(): AudioParam {
    return this.workletNode.parameters.get("Tl2")!;
  }

  /**
   * Creates a new SpectralTilt node.
   *
   * The AudioWorklet module is registered automatically on first use.
   */
  static async create(
    ctx: AudioContext,
    params: SpectralTiltParams
  ): Promise<SpectralTilt> {
    await registerWorkletOnce(ctx, PROCESSOR_NAME, processorCode);

    const workletNode = new AudioWorkletNode(ctx, PROCESSOR_NAME);
    const node = new SpectralTilt(ctx, workletNode);
    node.update(params);

    return node;
  }

  /**
   * Updates the spectral tilt parameters.
   * Sets AudioParams via setTargetAtTime for smooth transitions.
   */
  update(params: SpectralTiltParams): void {
    this.Tl1.setTargetAtTime(params.Tl1, this.ctx.currentTime, 0.02);
    this.Tl2.setTargetAtTime(params.Tl2, this.ctx.currentTime, 0.02);
  }

  destroy(): void {
    this.workletNode.disconnect();
  }

  /**
   * Computes the coefficients for a single spectral tilt stage.
   * Returns [a, g] where a is the pole coefficient and g is the gain.
   */
  private computeStageCoefficients(
    Tl: number,
    sampleRate: number
  ): [number, number] {
    if (Tl <= 0) {
      return [0, 1]; // Bypass
    }

    const Ts = 1 / sampleRate;
    const cosOmega = Math.cos(2 * Math.PI * 3000 * Ts);
    const attenuationRatio = Math.pow(10, Tl / 10);
    const nu = 1 + (1 - cosOmega) / (attenuationRatio - 1);
    const a = nu - Math.sqrt(nu * nu - 1);
    const g = 1 - a;

    return [a, g];
  }

  /**
   * Computes the frequency response of the spectral tilt filter.
   *
   * Uses current values of Tl1 and Tl2 parameters.
   * The response is the product of two cascaded first-order filters.
   */
  getFrequencyResponse(frequencies: number[], sampleRate: number): number[] {
    const Tl1 = this.Tl1.value;
    const Tl2 = this.Tl2.value;

    const [a1, g1] = this.computeStageCoefficients(Tl1, sampleRate);
    const [a2, g2] = this.computeStageCoefficients(Tl2, sampleRate);

    // Each stage: H(z) = g / (1 - a*z^{-1})
    // In standard form: b = [g, 0], a = [1, -a]
    const response1 = evaluateFirstOrder([g1, 0], [1, -a1], frequencies, sampleRate);
    const response2 = evaluateFirstOrder([g2, 0], [1, -a2], frequencies, sampleRate);

    return combineSeries(response1, response2);
  }
}
