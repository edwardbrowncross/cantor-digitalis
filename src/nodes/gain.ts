import type { Node } from "./types";

export type GainParams = {
  gain: number;
}

export class Gain implements Node<GainParams> {
  private ctx: AudioContext;
  private gainNode: GainNode;
  public in: AudioNode;
  public out: AudioNode;

  private constructor(ctx: AudioContext, gainNode: GainNode) {
    this.ctx = ctx;
    this.gainNode = gainNode;
    this.in = gainNode;
    this.out = gainNode;
  }

  static async create(ctx: AudioContext, params: GainParams): Promise<Gain> {
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(params.gain, ctx.currentTime);
    return new Gain(ctx, gainNode);
  }

  update(params: GainParams) {
    this.gainNode.gain.setTargetAtTime(params.gain, this.ctx.currentTime, 0.02);
  }

  destroy() {
    this.gainNode.disconnect();
  }

  get gain(): AudioParam {
    return this.gainNode.gain;
  }

  /**
   * Computes the frequency response of the gain node (static version).
   *
   * Returns an array filled with the specified gain value (flat response).
   * This static method allows frequency response calculation without an AudioContext.
   *
   * @param frequencies Array of frequencies in Hz
   * @param gain The gain value (linear amplitude)
   * @returns Array of linear amplitude values (all equal to gain)
   */
  static getFrequencyResponse(frequencies: number[], gain: number): number[] {
    return frequencies.map(() => gain);
  }

  /**
   * Computes the frequency response of the gain node.
   *
   * Returns an array filled with the current gain value (flat response).
   */
  getFrequencyResponse(frequencies: number[]): number[] {
    return Gain.getFrequencyResponse(frequencies, this.gainNode.gain.value);
  }
}
