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
   * Computes the frequency response of the gain node.
   *
   * Returns an array filled with the current gain value (flat response).
   */
  getFrequencyResponse(frequencies: number[], _sampleRate: number): number[] {
    const gainValue = this.gainNode.gain.value;
    return frequencies.map(() => gainValue);
  }
}
