import type { Node } from "./types";

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
  constructor() {
    super();
    // Biquad coefficients
    this.b0 = 0;
    this.b1 = 0;
    this.b2 = 0;
    this.a1 = 0;
    this.a2 = 0;

    // Filter state (delay line)
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;

    this.port.onmessage = (event) => {
      if (event.data.type === 'updateCoefficients') {
        this.updateCoefficients(event.data.F, event.data.B, event.data.A);
      }
    };
  }

  updateCoefficients(F, B, A) {
    const Ts = 1 / sampleRate;

    // Pole radius and angle
    const R = Math.exp(-Math.PI * B * Ts);
    const theta = 2 * Math.PI * F * Ts;

    // Gain scaling factor
    const g = 1 - R;

    // Numerator coefficients (feedforward)
    // From: A * g * (1 - R*z^{-2}) = A*g + 0*z^{-1} - A*g*R*z^{-2}
    this.b0 = A * g;
    this.b1 = 0;
    this.b2 = -A * g * R;

    // Denominator coefficients (feedback)
    // From: 1 - 2R*cos(θ)*z^{-1} + R²*z^{-2}
    this.a1 = -2 * R * Math.cos(theta);
    this.a2 = R * R;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];

    if (!input || !output) {
      return true;
    }

    for (let i = 0; i < input.length; i++) {
      const x0 = input[i];

      // Direct Form I biquad
      const y0 = this.b0 * x0 + this.b1 * this.x1 + this.b2 * this.x2
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

// Track whether the worklet module has been registered
let moduleRegistered = false;

/**
 * Registers the formant resonator worklet module with the AudioContext.
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
  private workletNode: AudioWorkletNode;
  public in: AudioNode;
  public out: AudioNode;

  private constructor(_ctx: AudioContext, workletNode: AudioWorkletNode) {
    this.workletNode = workletNode;
    this.in = workletNode;
    this.out = workletNode;
  }

  /**
   * Creates a new FormantResonator node.
   *
   * The AudioWorklet module is registered automatically on first use.
   */
  static async create(
    ctx: AudioContext,
    params: FormantResonatorParams
  ): Promise<FormantResonator> {
    await ensureModuleRegistered(ctx);

    const workletNode = new AudioWorkletNode(ctx, "formant-resonator-processor");
    const node = new FormantResonator(ctx, workletNode);
    node.update(params);

    return node;
  }

  /**
   * Updates the formant resonator parameters.
   * Sends new coefficients to the worklet processor for real-time updates.
   */
  update(params: FormantResonatorParams): void {
    this.workletNode.port.postMessage({
      type: "updateCoefficients",
      F: params.F,
      B: params.B,
      A: params.A,
    });
  }

  destroy(): void {
    this.workletNode.disconnect();
  }
}
