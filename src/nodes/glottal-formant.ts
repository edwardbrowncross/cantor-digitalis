import type { Node } from "./types";

export type GlottalFormantParams = {
  /** Glottal formant centre frequency in Hz, computed as f0 / (2 * Oq) */
  Fg: number;
  /** Glottal formant bandwidth in Hz, computed from f0, Oq, and αm */
  Bg: number;
  /** Source amplitude, derived from E, Oq, and R (shimmer) */
  Ag: number;
};

/**
 * Glottal Formant AudioWorklet Processor code.
 *
 * Implements the transfer function from Section 3.2.1:
 * GF(z) = -Ag * z^{-1} * (1 - z^{-1}) / (1 - 2R*cos(θ)*z^{-1} + R²*z^{-2})
 *
 * Where:
 *   R = e^(-π * Bg * Ts)  (pole radius, Ts = 1/sampleRate)
 *   θ = 2π * Fg * Ts      (pole angle)
 */
const processorCode = `
class GlottalFormantProcessor extends AudioWorkletProcessor {
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
        this.updateCoefficients(event.data.Fg, event.data.Bg, event.data.Ag);
      }
    };
  }

  updateCoefficients(Fg, Bg, Ag) {
    const Ts = 1 / sampleRate;

    // Pole radius and angle
    const R = Math.exp(-Math.PI * Bg * Ts);
    const theta = 2 * Math.PI * Fg * Ts;

    // Numerator coefficients (feedforward)
    // From: -Ag * z^{-1} * (1 - z^{-1}) = -Ag*z^{-1} + Ag*z^{-2}
    this.b0 = 0;
    this.b1 = -Ag;
    this.b2 = Ag;

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

registerProcessor('glottal-formant-processor', GlottalFormantProcessor);
`;

// Track whether the worklet module has been registered
let moduleRegistered = false;

/**
 * Registers the glottal formant worklet module with the AudioContext.
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
 * Glottal Formant (GF)
 *
 * The glottal formant represents the main spectral peak of the voice source,
 * corresponding to the resonance characteristics of the glottal pulse. It is
 * implemented as a 2-pole 1-zero digital resonant filter in series with a
 * 1-zero differentiation filter.
 *
 * The transfer function (Section 3.2.1) is:
 *
 * GF(z) = -Ag * z^{-1} * (1 - z^{-1}) / (1 - 2R*cos(θ)*z^{-1} + R²*z^{-2})
 *
 * Where:
 *   R = e^(-π * Bg * Ts)  (pole radius, Ts = sampling period)
 *   θ = 2π * Fg * Ts      (pole angle)
 *
 * The filter shapes the periodic impulse train (at frequency f0) to produce
 * the characteristic spectrum of the glottal flow derivative.
 *
 * Paper reference: Section 3.2.1 (filter structure), Section 4.2.2 (parameter mapping)
 *
 * Input parameters:
 *   - Fg (glottal formant centre frequency) — computed as f0 / (2·Oq)
 *   - Bg (glottal formant bandwidth) — computed from f0, Oq, and αm
 *   - Ag (source amplitude) — derived from E, Oq, and R (shimmer)
 *
 * The intermediate parameters Oq (open quotient) and αm (asymmetry coefficient)
 * are computed from T (tenseness), E (vocal effort), and M (laryngeal mechanism).
 */
export class GlottalFormant implements Node<GlottalFormantParams> {
  private workletNode: AudioWorkletNode;
  public in: AudioNode;
  public out: AudioNode;

  private constructor(_ctx: AudioContext, workletNode: AudioWorkletNode) {
    this.workletNode = workletNode;
    this.in = workletNode;
    this.out = workletNode;
  }

  /**
   * Creates a new GlottalFormant node.
   *
   * The AudioWorklet module is registered automatically on first use.
   */
  static async create(
    ctx: AudioContext,
    params: GlottalFormantParams
  ): Promise<GlottalFormant> {
    await ensureModuleRegistered(ctx);

    const workletNode = new AudioWorkletNode(ctx, "glottal-formant-processor");
    const node = new GlottalFormant(ctx, workletNode);
    node.update(params);

    return node;
  }

  /**
   * Updates the glottal formant parameters.
   * Sends new coefficients to the worklet processor for real-time updates.
   */
  update(params: GlottalFormantParams): void {
    this.workletNode.port.postMessage({
      type: "updateCoefficients",
      Fg: params.Fg,
      Bg: params.Bg,
      Ag: params.Ag,
    });
  }

  destroy(): void {
    this.workletNode.disconnect();
  }
}
