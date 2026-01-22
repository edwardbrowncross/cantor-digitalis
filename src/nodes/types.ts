export interface Node<T extends Record<string, any>> {
  update(params: T): void;
  destroy(): void;

  in: AudioNode | null;
  out: AudioNode | null;
}

export interface NodeStatic<T extends Record<string, any>> {
  create (ctx: AudioContext, params: T): Node<T>;
}