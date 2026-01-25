import type { Node } from "./types";
import { GlottalFlowDerivative } from "./glottal-flow-derivative";
import { VocalTract } from "./vocal-tract";
import { Gain } from "./gain";
import { SynthParams } from "../parameters";

/**
 * Voice Synthesizer
 *
 * The complete voice synthesis pipeline combining the glottal flow derivative
 * (voice source) with the vocal tract model (formant filtering). This implements
 * the full source-filter model described in the paper.
 *
 * Signal flow:
 *
 *   ┌─────────────────────────────────────────────────────────────────────────┐
 *   │ Glottal Flow Derivative (Source)                                        │
 *   │                                                                         │
 *   │   PulseTrain(f0) → GlottalFormant(Fg,Bg,Ag) → SpectralTilt(Tl1,Tl2) ─┬─┤
 *   │                                                          ↓ (mod)     │ │
 *   │   NoiseSource(An) ──────────────────────────────────→ [×] ───────────┘ │
 *   └─────────────────────────────────────────────────────────────────────────┘
 *                                        │
 *                                        ↓
 *   ┌─────────────────────────────────────────────────────────────────────────┐
 *   │ Vocal Tract (Filter)                                                    │
 *   │                                                                         │
 *   │            ┌─→ R1(F1, B1, A1) ─┐                                        │
 *   │            ├─→ R2(F2, B2, A2) ─┤                                        │
 *   │   Input ───┼─→ R3(F3, B3, A3) ─┼───→ BQ(F_BQ, Q_BQ) ───→ Output        │
 *   │            ├─→ ...            ─┤                                        │
 *   │            └─→ Rn(Fn, Bn, An) ─┘                                        │
 *   └─────────────────────────────────────────────────────────────────────────┘
 *                                        │
 *                                        ↓
 *                                   OutputGain ───→ Output
 *
 * Paper reference: Section 3.1 (overall model), Section 3.2 (voice source),
 *                  Section 3.3 (vocal tract)
 *
 * Input parameters:
 *   - source: GlottalFlowDerivativeParams (f0, Fg, Bg, Ag, Tl1, Tl2, An)
 *   - tract: VocalTractParams (formants array, F_BQ, Q_BQ)
 *   - outputGain: Overall output level (optional, defaults to 1)
 */
export class Voice implements Node<SynthParams> {
  private glottalFlowDerivative: GlottalFlowDerivative;
  private vocalTract: VocalTract;
  private outputGainNode: Gain;

  public in: AudioNode | null = null; // Source node has no input
  public out: AudioNode;

  private constructor(
    glottalFlowDerivative: GlottalFlowDerivative,
    vocalTract: VocalTract,
    outputGainNode: Gain
  ) {
    this.glottalFlowDerivative = glottalFlowDerivative;
    this.vocalTract = vocalTract;
    this.outputGainNode = outputGainNode;
    this.out = outputGainNode.out;
  }

  /**
   * Creates a new Voice synthesizer node.
   *
   * Sets up the complete source-filter synthesis pipeline.
   */
  static async create(
    ctx: AudioContext,
    params: SynthParams
  ): Promise<Voice> {
    // Create all sub-nodes in parallel
    const [glottalFlowDerivative, vocalTract, outputGainNode] = await Promise.all([
      GlottalFlowDerivative.create(ctx, params),
      VocalTract.create(ctx, params),
      Gain.create(ctx, { gain: params.outputGain ?? 1 }),
    ]);

    // Connect the pipeline: GFD → VocalTract → OutputGain
    glottalFlowDerivative.out.connect(vocalTract.in);
    vocalTract.out.connect(outputGainNode.in);

    return new Voice(glottalFlowDerivative, vocalTract, outputGainNode);
  }

  /**
   * Updates all voice parameters.
   *
   * @throws Error if the formants array length doesn't match the original
   */
  update(params: SynthParams): void {
    this.glottalFlowDerivative.update(params);
    this.vocalTract.update(params);
    if (params.outputGain !== undefined) {
      this.outputGainNode.update({ gain: params.outputGain });
    }
  }

  /**
   * Starts the voice (begins voiced excitation).
   */
  start(): void {
    this.glottalFlowDerivative.start();
  }

  /**
   * Stops the voice (stops voiced excitation).
   * Note: Noise component continues based on An parameter.
   */
  stop(): void {
    this.glottalFlowDerivative.stop();
  }

  /**
   * Returns the number of formant resonators in the vocal tract.
   */
  get formantCount(): number {
    return this.vocalTract.formantCount;
  }

  /**
   * Returns the glottal flow derivative node for direct AudioParam access.
   *
   * Example usage:
   *   voice.source.pulseTrainNode.f0.setValueAtTime(440, ctx.currentTime);
   *   voice.source.glottalFormantNode.Ag.setTargetAtTime(0.5, ctx.currentTime, 0.1);
   */
  get source(): GlottalFlowDerivative {
    return this.glottalFlowDerivative;
  }

  /**
   * Returns the vocal tract node for direct AudioParam access.
   *
   * Example usage:
   *   voice.tract.formants[0].F.linearRampToValueAtTime(800, ctx.currentTime + 0.1);
   *   voice.tract.antiResonanceNode.F.setValueAtTime(4500, ctx.currentTime);
   */
  get tract(): VocalTract {
    return this.vocalTract;
  }

  /**
   * Returns the output gain node for direct AudioParam access.
   *
   * Example usage:
   *   voice.outputGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1);
   */
  get outputGain(): Gain {
    return this.outputGainNode;
  }

  destroy(): void {
    this.glottalFlowDerivative.destroy();
    this.vocalTract.destroy();
    this.outputGainNode.destroy();
  }
}
