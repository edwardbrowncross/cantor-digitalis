import type { Node } from "./types";

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

    this.port.onmessage = (event) => {
      if (event.data.type === 'updateCoefficients') {
        this.updateCoefficients(event.data.Tl1, event.data.Tl2);
      }
    };
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

    const Ts = 1 / sampleRate;
    const omega = 2 * Math.PI * 3000 * Ts;
    const cosOmega = Math.cos(omega);

    // Power ratio at 3000 Hz (10^(Tl/10) is the attenuation factor)
    const attenuationRatio = Math.pow(10, Tl / 10);

    // Compute ν from Section 3.2.2
    // νᵢ = 1 + (1 - cos(ω)) / (10^(Tlᵢ/10) - 1)
    const nu = 1 + (1 - cosOmega) / (attenuationRatio - 1);

    // Compute pole coefficient: a = ν - √(ν² - 1)
    // This ensures 0 < a < 1 for stability
    const a = nu - Math.sqrt(nu * nu - 1);
    const g = 1 - a;

    return [a, g];
  }

  updateCoefficients(Tl1, Tl2) {
    [this.a1, this.g1] = this.computeStageCoefficients(Tl1);
    [this.a2, this.g2] = this.computeStageCoefficients(Tl2);
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];

    if (!input || !output) {
      return true;
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

// Track whether the worklet module has been registered
let moduleRegistered = false;

/**
 * Registers the spectral tilt worklet module with the AudioContext.
 * Only registers once per application lifetime.
 */
async function ensureModuleRegistered(ctx: AudioContext): Promise<void> {
  if (moduleRegistered) {
    return;
  }

  const blob = new Blob([processorCode], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);

  try {
    await ctx.audioWorklet.addModule(url);
    moduleRegistered = true;
  } finally {
    URL.revokeObjectURL(url);
  }
}

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
  private workletNode: AudioWorkletNode;
  public in: AudioNode;
  public out: AudioNode;

  private constructor(_ctx: AudioContext, workletNode: AudioWorkletNode) {
    this.workletNode = workletNode;
    this.in = workletNode;
    this.out = workletNode;
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
    await ensureModuleRegistered(ctx);

    const workletNode = new AudioWorkletNode(ctx, "spectral-tilt-processor");
    const node = new SpectralTilt(ctx, workletNode);
    node.update(params);

    return node;
  }

  /**
   * Updates the spectral tilt parameters.
   * Sends new coefficients to the worklet processor for real-time updates.
   */
  update(params: SpectralTiltParams): void {
    this.workletNode.port.postMessage({
      type: "updateCoefficients",
      Tl1: params.Tl1,
      Tl2: params.Tl2,
    });
  }

  destroy(): void {
    this.workletNode.disconnect();
  }
}
