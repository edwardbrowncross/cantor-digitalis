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
  static get parameterDescriptors() {
    return [
      { name: "Fg", defaultValue: 110, minValue: 20, maxValue: 3000, automationRate: "a-rate" },
      { name: "Bg", defaultValue: 50, minValue: 10, maxValue: 3000, automationRate: "a-rate" },
      { name: "Ag", defaultValue: 1, minValue: 0, maxValue: 10, automationRate: "a-rate" }
    ];
  }

  constructor() {
    super();
    // Filter state (delay line)
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;

    // Cached coefficient values to avoid recomputing when unchanged
    this.lastFg = -1;
    this.lastBg = -1;
    this.R = 0;
    this.cosTheta = 0;
    this.a1 = 0;
    this.a2 = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];

    if (!input || !output) {
      return true;
    }

    const Ts = 1 / sampleRate;
    // k-rate parameters (single value per block)
    const Fg = parameters.Fg[0];
    const Bg = parameters.Bg[0];

    // Recompute filter coefficients if Fg or Bg changed
    if (Fg !== this.lastFg || Bg !== this.lastBg) {
      this.R = Math.exp(-Math.PI * Bg * Ts);
      const theta = 2 * Math.PI * Fg * Ts;
      this.cosTheta = Math.cos(theta);
      this.a1 = -2 * this.R * this.cosTheta;
      this.a2 = this.R * this.R;
      this.lastFg = Fg;
      this.lastBg = Bg;
    }

    for (let i = 0; i < input.length; i++) {
      // a-rate: per-sample value for Ag
      const Ag = parameters.Ag.length > 1 ? parameters.Ag[i] : parameters.Ag[0];

      const x0 = input[i];

      // Numerator coefficients (feedforward) depend on Ag
      // From: -Ag * z^{-1} * (1 - z^{-1}) = -Ag*z^{-1} + Ag*z^{-2}
      const b1 = -Ag;
      const b2 = Ag;

      // Direct Form I biquad (b0 is always 0)
      const y0 = b1 * this.x1 + b2 * this.x2
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

  /** Glottal formant centre frequency AudioParam (a-rate, 20-2000 Hz) */
  get Fg(): AudioParam {
    return this.workletNode.parameters.get("Fg")!;
  }

  /** Glottal formant bandwidth AudioParam (a-rate, 10-500 Hz) */
  get Bg(): AudioParam {
    return this.workletNode.parameters.get("Bg")!;
  }

  /** Source amplitude AudioParam (a-rate, 0-10) */
  get Ag(): AudioParam {
    return this.workletNode.parameters.get("Ag")!;
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
   * Sets AudioParams via setTargetAtTime for smooth transitions.
   */
  update(params: GlottalFormantParams): void {
    this.Fg.setTargetAtTime(params.Fg, this.ctx.currentTime, 0.02);
    this.Bg.setTargetAtTime(params.Bg, this.ctx.currentTime, 0.02);
    this.Ag.setTargetAtTime(params.Ag, this.ctx.currentTime, 0.02);
  }

  destroy(): void {
    this.workletNode.disconnect();
  }
}
