import type { Node } from "./types";
import { FormantResonator, FormantResonatorParams } from "./formant-resonator";

export type FormantBankParams = {
  /** Array of formant parameters, one per resonator */
  formants: FormantResonatorParams[];
};

/**
 * Formant Bank
 *
 * A parallel bank of formant resonators representing the vocal tract resonances.
 * Each resonator is a 2-pole 2-zero bandpass filter (see FormantResonator).
 *
 * The input signal is fed to all resonators in parallel, and their outputs
 * are summed to produce a single output.
 *
 * Signal flow:
 *
 *              ┌─→ R1(F1, B1, A1) ─┐
 *              ├─→ R2(F2, B2, A2) ─┤
 *   Input ─────┼─→ R3(F3, B3, A3) ─┼─────→ Output (sum)
 *              ├─→ ...            ─┤
 *              └─→ Rn(Fn, Bn, An) ─┘
 *
 * The paper uses six formants (R1-R6):
 *   - F1-F3: Primary formants that determine vowel identity
 *   - F4-F6: Higher formants that contribute to voice timbre
 *
 * This implementation accepts any number of formants, allowing flexibility
 * for experimentation or simplified models.
 *
 * Paper reference: Section 3.3.1 (parallel formant structure)
 *
 * Input parameters:
 *   - formants: Array of {F, B, A} objects defining each resonator
 *
 * Note: The number of formants is fixed at creation time. Calling update()
 * with a different array length will throw an error. To change the number
 * of formants, destroy this node and create a new one.
 */
export class FormantBank implements Node<FormantBankParams> {
  private resonators: FormantResonator[];
  private inputGain: GainNode;
  private outputGain: GainNode;

  public in: AudioNode;
  public out: AudioNode;

  private constructor(
    resonators: FormantResonator[],
    inputGain: GainNode,
    outputGain: GainNode
  ) {
    this.resonators = resonators;
    this.inputGain = inputGain;
    this.outputGain = outputGain;
    this.in = inputGain;
    this.out = outputGain;
  }

  /**
   * Creates a new FormantBank node with the specified formants.
   *
   * All formant resonators are created in parallel for efficiency.
   */
  static async create(
    ctx: AudioContext,
    params: FormantBankParams
  ): Promise<FormantBank> {
    // Create input and output gain nodes for routing
    const inputGain = ctx.createGain();
    inputGain.gain.setValueAtTime(1, ctx.currentTime);

    const outputGain = ctx.createGain();
    outputGain.gain.setValueAtTime(1, ctx.currentTime);

    // Create all formant resonators in parallel
    const resonators = await Promise.all(
      params.formants.map((formant) => FormantResonator.create(ctx, formant))
    );

    // Wire up parallel structure: input → each resonator → output
    for (const resonator of resonators) {
      inputGain.connect(resonator.in);
      resonator.out.connect(outputGain);
    }

    return new FormantBank(resonators, inputGain, outputGain);
  }

  /**
   * Updates all formant parameters.
   *
   * The formants array must have the same length as the original.
   * Each resonator receives its corresponding parameters.
   *
   * @throws Error if the formants array length doesn't match
   */
  update(params: FormantBankParams): void {
    if (params.formants.length !== this.resonators.length) {
      throw new Error(
        `FormantBank: Cannot change number of formants. ` +
          `Expected ${this.resonators.length}, got ${params.formants.length}. ` +
          `Destroy and recreate the node to change formant count.`
      );
    }

    for (let i = 0; i < this.resonators.length; i++) {
      this.resonators[i].update(params.formants[i]);
    }
  }

  /**
   * Returns the number of formant resonators in this bank.
   */
  get count(): number {
    return this.resonators.length;
  }

  /**
   * Returns the array of formant resonators for direct AudioParam access.
   *
   * Example usage:
   *   formantBank.formants[0].F.setValueAtTime(800, ctx.currentTime);
   *   formantBank.formants[1].B.linearRampToValueAtTime(100, ctx.currentTime + 0.1);
   */
  get formants(): readonly FormantResonator[] {
    return this.resonators;
  }

  destroy(): void {
    // Disconnect routing nodes
    this.inputGain.disconnect();
    this.outputGain.disconnect();

    // Destroy all resonators
    for (const resonator of this.resonators) {
      resonator.destroy();
    }

    this.resonators = [];
  }
}
