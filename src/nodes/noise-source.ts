import type { Node } from "./types";

export type NoiseSourceParams = {
  /** Noise amplitude, derived directly from B (breathiness) */
  An: number;
};

/**
 * Noise Source AudioWorklet Processor code.
 *
 * Generates Gaussian white noise using the Box-Muller transform,
 * scaled by an amplitude parameter.
 */
const processorCode = `
class NoiseSourceProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.amplitude = 0;
    // Box-Muller spare value
    this.hasSpare = false;
    this.spare = 0;

    this.port.onmessage = (event) => {
      if (event.data.type === 'updateAmplitude') {
        this.amplitude = event.data.An;
      }
    };
  }

  /**
   * Generate a Gaussian-distributed random number using Box-Muller transform.
   * Returns values with mean 0 and standard deviation 1.
   */
  gaussianRandom() {
    if (this.hasSpare) {
      this.hasSpare = false;
      return this.spare;
    }

    // Generate two uniform random numbers in (0, 1)
    let u, v, s;
    do {
      u = Math.random() * 2 - 1;
      v = Math.random() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);

    const mul = Math.sqrt(-2 * Math.log(s) / s);
    this.spare = v * mul;
    this.hasSpare = true;
    return u * mul;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0]?.[0];

    if (!output) {
      return true;
    }

    for (let i = 0; i < output.length; i++) {
      output[i] = this.amplitude * this.gaussianRandom();
    }

    return true;
  }
}

registerProcessor('noise-source-processor', NoiseSourceProcessor);
`;

// Track whether the worklet module has been registered
let moduleRegistered = false;

/**
 * Registers the noise source worklet module with the AudioContext.
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
 * Noise Source (NS)
 *
 * The noise source provides the aspiration component for breathy voice qualities.
 * It consists of Gaussian white noise filtered through a bandpass filter
 * (Butterworth, 1000–6000 Hz cutoff frequencies) and scaled by an amplitude factor.
 *
 * The noise can be modulated by the glottal flow derivative for mixed voice
 * qualities (not implemented in this basic version).
 *
 * Paper reference: Section 3.2.3 (filter structure), Section 4.2.5 (parameter mapping)
 *
 * Input parameters:
 *   - An (noise amplitude) — derived directly from B (breathiness), with
 *     scaling by E when voicing is off
 *
 * Signal flow:
 *   Gaussian Noise → Highpass (1000 Hz) → Lowpass (6000 Hz) → Output
 *
 * The bandpass is implemented as a cascade of 2nd-order Butterworth highpass
 * and lowpass filters using native BiquadFilterNodes.
 */
export class NoiseSource implements Node<NoiseSourceParams> {
  private workletNode: AudioWorkletNode;
  private highpassFilter: BiquadFilterNode;
  private lowpassFilter: BiquadFilterNode;

  public in: AudioNode | null = null; // Noise source has no input
  public out: AudioNode;

  private constructor(
    _ctx: AudioContext,
    workletNode: AudioWorkletNode,
    highpassFilter: BiquadFilterNode,
    lowpassFilter: BiquadFilterNode
  ) {
    this.workletNode = workletNode;
    this.highpassFilter = highpassFilter;
    this.lowpassFilter = lowpassFilter;
    this.out = lowpassFilter;
  }

  /**
   * Creates a new NoiseSource node.
   *
   * The AudioWorklet module is registered automatically on first use.
   */
  static async create(
    ctx: AudioContext,
    params: NoiseSourceParams
  ): Promise<NoiseSource> {
    await ensureModuleRegistered(ctx);

    // Create noise generator worklet
    const workletNode = new AudioWorkletNode(ctx, "noise-source-processor");

    // Create Butterworth bandpass as highpass + lowpass cascade
    // Highpass at 1000 Hz
    const highpassFilter = ctx.createBiquadFilter();
    highpassFilter.type = "highpass";
    highpassFilter.frequency.setValueAtTime(1000, ctx.currentTime);
    highpassFilter.Q.setValueAtTime(Math.SQRT1_2, ctx.currentTime); // Butterworth Q = 1/√2

    // Lowpass at 6000 Hz
    const lowpassFilter = ctx.createBiquadFilter();
    lowpassFilter.type = "lowpass";
    lowpassFilter.frequency.setValueAtTime(6000, ctx.currentTime);
    lowpassFilter.Q.setValueAtTime(Math.SQRT1_2, ctx.currentTime); // Butterworth Q = 1/√2

    // Connect signal chain: noise → highpass → lowpass
    workletNode.connect(highpassFilter);
    highpassFilter.connect(lowpassFilter);

    const node = new NoiseSource(ctx, workletNode, highpassFilter, lowpassFilter);
    node.update(params);

    return node;
  }

  /**
   * Updates the noise source amplitude.
   * Sends new amplitude to the worklet processor for real-time updates.
   */
  update(params: NoiseSourceParams): void {
    this.workletNode.port.postMessage({
      type: "updateAmplitude",
      An: params.An,
    });
  }

  destroy(): void {
    this.workletNode.disconnect();
    this.highpassFilter.disconnect();
    this.lowpassFilter.disconnect();
  }
}
