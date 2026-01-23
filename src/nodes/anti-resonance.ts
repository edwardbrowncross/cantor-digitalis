import type { Node } from "./types";

export type AntiResonanceParams = {
  /** Anti-formant centre frequency in Hz (nominally 4700 Hz, scaled by αS) */
  F: number;
  /** Anti-formant quality factor (nominally 2.5) */
  Q: number;
};

/**
 * Anti-Resonance (Notch Filter) AudioWorklet Processor code.
 *
 * Implements the transfer function from Section 3.3.2:
 * BQ(z) = (1 + β*z⁻¹ + z⁻²) / ((1 + α) + β*z⁻¹ + (1 - α)*z⁻²)
 *
 * Where:
 *   α = sin(2π * F * Ts) / (2 * Q)
 *   β = -2 * cos(2π * F * Ts)
 *
 * This creates a notch (anti-resonance) at frequency F with width controlled by Q.
 */
const processorCode = `
class AntiResonanceProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Biquad coefficients (normalized so a0 = 1)
    this.b0 = 1;
    this.b1 = 0;
    this.b2 = 1;
    this.a1 = 0;
    this.a2 = 0;

    // Filter state (delay line)
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;

    this.port.onmessage = (event) => {
      if (event.data.type === 'updateCoefficients') {
        this.updateCoefficients(event.data.F, event.data.Q);
      }
    };
  }

  updateCoefficients(F, Q) {
    const Ts = 1 / sampleRate;
    const omega = 2 * Math.PI * F * Ts;

    // Intermediate coefficients from the paper
    const alpha = Math.sin(omega) / (2 * Q);
    const beta = -2 * Math.cos(omega);

    // Normalize by dividing by (1 + alpha) so that a0 = 1
    const a0 = 1 + alpha;

    // Numerator coefficients (feedforward)
    // From: (1 + β*z⁻¹ + z⁻²) / a0
    this.b0 = 1 / a0;
    this.b1 = beta / a0;
    this.b2 = 1 / a0;

    // Denominator coefficients (feedback), normalized
    // From: ((1 + α) + β*z⁻¹ + (1 - α)*z⁻²) / a0
    // a0/a0 = 1 (implicit), a1 = β/a0, a2 = (1 - α)/a0
    this.a1 = beta / a0;
    this.a2 = (1 - alpha) / a0;
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

registerProcessor('anti-resonance-processor', AntiResonanceProcessor);
`;

// Track whether the worklet module has been registered
let moduleRegistered = false;

/**
 * Registers the anti-resonance worklet module with the AudioContext.
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
 * Hypo-pharynx Anti-Resonance Filter (BQ)
 *
 * A notch filter in cascade with the parallel formants that models the
 * anti-resonances caused by the hypo-pharynx cavity (the space between
 * the larynx and the pharynx). This creates spectral dips at approximately
 * 2.5–3.5 kHz and 4–5 kHz that contribute to natural voice timbre.
 *
 * The transfer function (Section 3.3.2) is:
 *
 * BQ(z) = (1 + β*z⁻¹ + z⁻²) / ((1 + α) + β*z⁻¹ + (1 - α)*z⁻²)
 *
 * Where:
 *   α = sin(2π * F * Ts) / (2 * Q)
 *   β = -2 * cos(2π * F * Ts)
 *
 * This is a bi-quadratic second-order notch filter that attenuates
 * frequencies near the centre frequency F, with the notch width
 * controlled by the quality factor Q.
 *
 * Paper reference: Section 3.3.2 (filter structure), Section 4.3.8 (parameter values)
 *
 * Input parameters:
 *   - F (anti-formant centre frequency in Hz) — nominally 4700 Hz,
 *     scaled by αS (vocal tract size factor)
 *   - Q (anti-formant quality factor) — fixed at 2.5 in the paper
 */
export class AntiResonance implements Node<AntiResonanceParams> {
  private workletNode: AudioWorkletNode;
  public in: AudioNode;
  public out: AudioNode;

  private constructor(_ctx: AudioContext, workletNode: AudioWorkletNode) {
    this.workletNode = workletNode;
    this.in = workletNode;
    this.out = workletNode;
  }

  /**
   * Creates a new AntiResonance node.
   *
   * The AudioWorklet module is registered automatically on first use.
   */
  static async create(
    ctx: AudioContext,
    params: AntiResonanceParams
  ): Promise<AntiResonance> {
    await ensureModuleRegistered(ctx);

    const workletNode = new AudioWorkletNode(ctx, "anti-resonance-processor");
    const node = new AntiResonance(ctx, workletNode);
    node.update(params);

    return node;
  }

  /**
   * Updates the anti-resonance parameters.
   * Sends new coefficients to the worklet processor for real-time updates.
   */
  update(params: AntiResonanceParams): void {
    this.workletNode.port.postMessage({
      type: "updateCoefficients",
      F: params.F,
      Q: params.Q,
    });
  }

  destroy(): void {
    this.workletNode.disconnect();
  }
}
