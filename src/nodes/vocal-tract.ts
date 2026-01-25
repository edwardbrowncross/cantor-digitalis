import type { Node } from "./types";
import { FormantBank } from "./formant-bank";
import { FormantResonator, FormantResonatorParams } from "./formant-resonator";
import { AntiResonance } from "./anti-resonance";

export type VocalTractParams = {
  /** Array of formant parameters (F, B, A) for each resonator */
  formants: FormantResonatorParams[];
  /** Anti-formant centre frequency in Hz (nominally 4700 Hz, scaled by αS) */
  F_BQ: number;
  /** Anti-formant quality factor (nominally 2.5) */
  Q_BQ: number;
};

/**
 * Vocal Tract Model
 *
 * The vocal tract model shapes the glottal source spectrum to produce
 * recognisable vowels and voice timbres. It consists of parallel formant
 * resonators (simulating the resonances of the oral cavity) followed by
 * a cascaded anti-resonance filter (simulating the effect of the hypo-pharynx).
 *
 * Signal flow:
 *
 *              ┌─→ R1(F1, B1, A1) ─┐
 *              ├─→ R2(F2, B2, A2) ─┤
 *   Input ─────┼─→ R3(F3, B3, A3) ─┼─────→ BQ(F_BQ, Q_BQ) ─────→ Output
 *              ├─→ ...            ─┤
 *              └─→ Rn(Fn, Bn, An) ─┘
 *
 * The paper uses six formants (R1-R6):
 *   - F1-F3: Primary formants that determine vowel identity
 *   - F4-F6: Higher formants that contribute to voice timbre
 *
 * The anti-resonance (BQ) models spectral dips caused by the hypo-pharynx
 * cavity at approximately 2.5–3.5 kHz and 4–5 kHz.
 *
 * Paper reference: Section 3.3 (overall structure), Section 3.3.1 (formants),
 *                  Section 3.3.2 (anti-resonance)
 *
 * Input parameters:
 *   - formants: Array of {F, B, A} objects for each resonator
 *   - F_BQ: Anti-formant centre frequency (nominally 4700 Hz, scaled by αS)
 *   - Q_BQ: Anti-formant quality factor (nominally 2.5)
 */
export class VocalTract implements Node<VocalTractParams> {
  private formantBank: FormantBank;
  private antiResonance: AntiResonance;

  public in: AudioNode;
  public out: AudioNode;

  private constructor(
    formantBank: FormantBank,
    antiResonance: AntiResonance
  ) {
    this.formantBank = formantBank;
    this.antiResonance = antiResonance;
    this.in = formantBank.in;
    this.out = antiResonance.out;
  }

  /**
   * Creates a new VocalTract node.
   *
   * Sets up the parallel formant bank followed by the anti-resonance filter.
   */
  static async create(
    ctx: AudioContext,
    params: VocalTractParams
  ): Promise<VocalTract> {
    // Create sub-nodes in parallel
    const [formantBank, antiResonance] = await Promise.all([
      FormantBank.create(ctx, { formants: params.formants }),
      AntiResonance.create(ctx, { F: params.F_BQ, Q: params.Q_BQ }),
    ]);

    // Connect in cascade: FormantBank → AntiResonance
    formantBank.out.connect(antiResonance.in);

    return new VocalTract(formantBank, antiResonance);
  }

  /**
   * Updates all vocal tract parameters.
   *
   * @throws Error if the formants array length doesn't match the original
   */
  update(params: VocalTractParams): void {
    this.formantBank.update({ formants: params.formants });
    this.antiResonance.update({ F: params.F_BQ, Q: params.Q_BQ });
  }

  /**
   * Returns the number of formant resonators in the vocal tract.
   */
  get formantCount(): number {
    return this.formantBank.count;
  }

  /**
   * Returns the array of formant resonators for direct AudioParam access.
   *
   * Example usage:
   *   vocalTract.formants[0].F.setValueAtTime(800, ctx.currentTime);
   *   vocalTract.formants[2].B.linearRampToValueAtTime(100, ctx.currentTime + 0.1);
   */
  get formants(): readonly FormantResonator[] {
    return this.formantBank.formants;
  }

  /**
   * Returns the anti-resonance node for direct AudioParam access.
   *
   * Example usage:
   *   vocalTract.antiResonanceNode.F.setValueAtTime(4500, ctx.currentTime);
   *   vocalTract.antiResonanceNode.Q.setValueAtTime(3, ctx.currentTime);
   */
  get antiResonanceNode(): AntiResonance {
    return this.antiResonance;
  }

  destroy(): void {
    this.formantBank.destroy();
    this.antiResonance.destroy();
  }
}
