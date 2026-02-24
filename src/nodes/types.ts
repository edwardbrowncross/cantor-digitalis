export interface Node<T extends Record<string, any>> {
  update(params: T): void;
  destroy(): void;

  in: AudioNode | null;
  out: AudioNode | null;

  /**
   * Computes the frequency response of this node at the given frequencies.
   *
   * @param frequencies Array of frequencies in Hz to evaluate
   * @param sampleRate Sample rate in Hz (typically from AudioContext.sampleRate)
   * @returns Array of linear amplitude values at each frequency
   */
  getFrequencyResponse(frequencies: number[], sampleRate: number): number[];
}

export interface NodeStatic<T extends Record<string, any>> {
  create (ctx: BaseAudioContext, params: T): Node<T>;
}