import type { Node } from "./types";
import { registerWorkletOnce } from "./worklet-utils";
import { evaluateBiquad } from "../utils/frequency-response";

export type FormantResonatorParams = {
  /** Formant centre frequency in Hz */
  F: number;
  /** Formant bandwidth in Hz */
  B: number;
  /** Formant amplitude (linear gain) */
  A: number;
};

/**
 * Formant Resonator AudioWorklet Processor code.
 *
 * Implements the transfer function from Section 3.3.1:
 * R(z) = A * (1 - R) * (1 - R*z^{-2}) / (1 - 2R*cos(θ)*z^{-1} + R²*z^{-2})
 *
 * Where:
 *   R = e^(-π * B * Ts)  (pole radius, Ts = 1/sampleRate)
 *   θ = 2π * F * Ts      (pole angle)
 *
 * This is a 2-pole 2-zero digital resonator (bandpass filter).
 */
const processorCode = `
class FormantResonatorProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "F", defaultValue: 500, minValue: 100, maxValue: 8000, automationRate: "a-rate" },
      { name: "B", defaultValue: 100, minValue: 10, maxValue: 4000, automationRate: "a-rate" },
      { name: "A", defaultValue: 1, minValue: 0, maxValue: 10, automationRate: "a-rate" }
    ];
  }

  constructor() {
    super();
    // Filter state (delay line)
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;

    // Cached parameter values for change detection
    this.lastF = -1;
    this.lastB = -1;
    this.lastA = -1;

    // Cached coefficients
    this.b0 = 0;
    this.b2 = 0;
    this.a1 = 0;
    this.a2 = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];

    if (!input || !output) {
      return true;
    }

    // a-rate parameters (per-sample values)
    const F = parameters.F[0];
    const B = parameters.B[0];
    const A = parameters.A[0];

    // Recompute coefficients if any parameter changed
    if (F !== this.lastF || B !== this.lastB || A !== this.lastA) {
      const Ts = 1 / sampleRate;

      // Pole radius and angle
      const R = Math.exp(-Math.PI * B * Ts);
      const theta = 2 * Math.PI * F * Ts;

      // Gain scaling factor
      const g = 1 - R;

      // Numerator coefficients (feedforward)
      // From: A * g * (1 - R*z^{-2}) = A*g + 0*z^{-1} - A*g*R*z^{-2}
      this.b0 = A * g;
      this.b2 = -A * g * R;

      // Denominator coefficients (feedback)
      // From: 1 - 2R*cos(θ)*z^{-1} + R²*z^{-2}
      this.a1 = -2 * R * Math.cos(theta);
      this.a2 = R * R;

      this.lastF = F;
      this.lastB = B;
      this.lastA = A;
    }

    for (let i = 0; i < input.length; i++) {
      const x0 = input[i];

      // Direct Form I biquad (b1 is always 0)
      const y0 = this.b0 * x0 + this.b2 * this.x2
                 - this.a1 * this.y1 - this.a2 * this.y2;

      // Update delay line
      this.x2 = this.x1;
      this.x1 = x0;
      this.y2 = this.y1;
      this.y1 = y0;

      output[i] = y0;
    }

    return true;
  }
}

registerProcessor('formant-resonator-processor', FormantResonatorProcessor);
`;

const PROCESSOR_NAME = "formant-resonator-processor";

/**
 * Formant Resonator (Ri)
 *
 * A single formant filter representing one resonance of the vocal tract.
 * Implemented as a 2-pole 2-zero digital resonator (bandpass filter) with
 * controllable centre frequency (F), bandwidth (B), and amplitude (A).
 *
 * The transfer function (Section 3.3.1) is:
 *
 * R(z) = A * (1 - R) * (1 - R*z^{-2}) / (1 - 2R*cos(θ)*z^{-1} + R²*z^{-2})
 *
 * Where:
 *   R = e^(-π * B * Ts)  (pole radius, Ts = sampling period)
 *   θ = 2π * F * Ts      (pole angle)
 *
 * The vocal tract model uses six formant resonators (R1-R6) in parallel:
 *   - F1-F3: Primary formants that determine vowel identity
 *   - F4-F6: Higher formants that contribute to voice timbre
 *
 * Grouping F3, F4, and F5 closely together can produce the "singer's formant"
 * characteristic of trained classical voices.
 *
 * Paper reference: Section 3.3.1 (filter structure), Section 4.3.1 (vowel table),
 *                  Section 4.3.6 (bandwidths), Section 4.3.7 (amplitudes)
 *
 * Input parameters:
 *   - F (formant centre frequency in Hz) — interpolated from vowel table,
 *     scaled by αS (vocal tract size) and K (larynx position factor)
 *   - B (formant bandwidth in Hz) — interpolated from vowel table
 *   - A (formant amplitude, linear) — interpolated from vowel table,
 *     with correction when harmonics coincide with formant frequencies
 */
export class FormantResonator implements Node<FormantResonatorParams> {
  private ctx: BaseAudioContext;
  private workletNode: AudioWorkletNode;
  public in: AudioNode;
  public out: AudioNode;

  private constructor(ctx: BaseAudioContext, workletNode: AudioWorkletNode) {
    this.ctx = ctx;
    this.workletNode = workletNode;
    this.in = workletNode;
    this.out = workletNode;
  }

  /** Formant centre frequency AudioParam (a-rate, 100-8000 Hz) */
  get F(): AudioParam {
    return this.workletNode.parameters.get("F")!;
  }

  /** Formant bandwidth AudioParam (a-rate, 20-1000 Hz) */
  get B(): AudioParam {
    return this.workletNode.parameters.get("B")!;
  }

  /** Formant amplitude AudioParam (a-rate, 0-10) */
  get A(): AudioParam {
    return this.workletNode.parameters.get("A")!;
  }

  /**
   * Creates a new FormantResonator node.
   *
   * The AudioWorklet module is registered automatically on first use.
   */
  static async create(
    ctx: BaseAudioContext,
    params: FormantResonatorParams
  ): Promise<FormantResonator> {
    await registerWorkletOnce(ctx, PROCESSOR_NAME, processorCode);

    const workletNode = new AudioWorkletNode(ctx, PROCESSOR_NAME);
    const node = new FormantResonator(ctx, workletNode);
    node.update(params);

    return node;
  }

  /**
   * Updates the formant resonator parameters.
   * Sets AudioParams via setTargetAtTime for smooth transitions.
   */
  update(params: FormantResonatorParams): void {
    this.F.setTargetAtTime(params.F, this.ctx.currentTime, 0.02);
    this.B.setTargetAtTime(params.B, this.ctx.currentTime, 0.02);
    this.A.setTargetAtTime(params.A, this.ctx.currentTime, 0.02);
  }

  destroy(): void {
    this.workletNode.disconnect();
  }

  /**
   * Computes the frequency response of the formant resonator (static version).
   *
   * This static method allows frequency response calculation without an BaseAudioContext.
   *
   * @param frequencies Array of frequencies in Hz
   * @param params The formant resonator parameters (F, B, A)
   * @param sampleRate Sample rate in Hz (default: 96000)
   * @returns Array of linear amplitude values
   */
  static getFrequencyResponse(
    frequencies: number[],
    params: FormantResonatorParams,
    sampleRate: number = 96000
  ): number[] {
    const { F, B, A } = params;

    const Ts = 1 / sampleRate;
    const R = Math.exp(-Math.PI * B * Ts);
    const theta = 2 * Math.PI * F * Ts;
    const g = 1 - R;

    // Numerator: A*g + 0*z^{-1} - A*g*R*z^{-2}
    const b0 = A * g;
    const b2 = -A * g * R;
    const b: [number, number, number] = [b0, 0, b2];

    // Denominator: 1 - 2R*cos(θ)*z^{-1} + R²*z^{-2}
    const a1 = -2 * R * Math.cos(theta);
    const a2 = R * R;
    const a: [number, number, number] = [1, a1, a2];

    return evaluateBiquad(b, a, frequencies, sampleRate);
  }

  /**
   * Computes the frequency response of the formant resonator.
   *
   * Uses current values of F, B, and A parameters.
   */
  getFrequencyResponse(frequencies: number[], sampleRate: number = 96000): number[] {
    return FormantResonator.getFrequencyResponse(
      frequencies,
      { F: this.F.value, B: this.B.value, A: this.A.value },
      sampleRate
    );
  }
}
