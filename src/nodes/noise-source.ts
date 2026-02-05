import type { Node } from "./types";
import { registerWorkletOnce } from "./worklet-utils";
import {
  combineSeries,
} from "../utils/frequency-response";

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
  static get parameterDescriptors() {
    return [
      { name: "An", defaultValue: 0, minValue: 0, maxValue: 1, automationRate: "a-rate" }
    ];
  }

  constructor() {
    super();
    // Box-Muller spare value
    this.hasSpare = false;
    this.spare = 0;
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
      // a-rate: per-sample value for An
      const An = parameters.An.length > 1 ? parameters.An[i] : parameters.An[0];
      output[i] = An * this.gaussianRandom();
    }

    return true;
  }
}

registerProcessor('noise-source-processor', NoiseSourceProcessor);
`;

const PROCESSOR_NAME = "noise-source-processor";

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
  private ctx: AudioContext;
  private workletNode: AudioWorkletNode;
  private highpassFilter: BiquadFilterNode;
  private lowpassFilter: BiquadFilterNode;

  public in: AudioNode | null = null; // Noise source has no input
  public out: AudioNode;

  private constructor(
    ctx: AudioContext,
    workletNode: AudioWorkletNode,
    highpassFilter: BiquadFilterNode,
    lowpassFilter: BiquadFilterNode
  ) {
    this.ctx = ctx;
    this.workletNode = workletNode;
    this.highpassFilter = highpassFilter;
    this.lowpassFilter = lowpassFilter;
    this.out = lowpassFilter;
  }

  /** Noise amplitude AudioParam (a-rate, 0-1) */
  get An(): AudioParam {
    return this.workletNode.parameters.get("An")!;
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
    await registerWorkletOnce(ctx, PROCESSOR_NAME, processorCode);

    // Create noise generator worklet
    const workletNode = new AudioWorkletNode(ctx, PROCESSOR_NAME);

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
   * Sets AudioParam via setTargetAtTime for smooth transitions.
   */
  update(params: NoiseSourceParams): void {
    this.An.setTargetAtTime(params.An, this.ctx.currentTime, 0.02);
  }

  destroy(): void {
    this.workletNode.disconnect();
    this.highpassFilter.disconnect();
    this.lowpassFilter.disconnect();
  }

  /**
   * Computes the frequency response of the noise source bandpass filter.
   *
   * Uses native BiquadFilterNode.getFrequencyResponse() for accurate results.
   * The response is the product of the highpass and lowpass filters.
   */
  getFrequencyResponse(frequencies: number[]): number[] {
    const freqArray = new Float32Array(frequencies);
    const magResponse = new Float32Array(frequencies.length);
    const phaseResponse = new Float32Array(frequencies.length);

    // Get highpass response
    this.highpassFilter.getFrequencyResponse(freqArray, magResponse, phaseResponse);
    const highpassMag = Array.from(magResponse);

    // Get lowpass response
    this.lowpassFilter.getFrequencyResponse(freqArray, magResponse, phaseResponse);
    const lowpassMag = Array.from(magResponse);

    // Combine in series (multiply magnitudes)
    return combineSeries(highpassMag, lowpassMag);
  }
}
