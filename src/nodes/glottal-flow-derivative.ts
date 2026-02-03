import type { Node } from "./types";
import { PulseTrain } from "./pulse-train";
import { GlottalFormant } from "./glottal-formant";
import { SpectralTilt } from "./spectral-tilt";
import { NoiseSource } from "./noise-source";
import { Gain } from "./gain";
import { combineSeries } from "../utils/frequency-response";

export type GlottalFlowDerivativeParams = {
  /** Fundamental frequency in Hz (derived from P, P₀) */
  f0: number;
  /** Glottal formant centre frequency in Hz, computed as f0 / (2 * Oq) */
  Fg: number;
  /** Glottal formant bandwidth in Hz, computed from f0, Oq, and αm */
  Bg: number;
  /** Source amplitude, derived from E and Oq */
  Ag: number;
  /** First stage spectral tilt attenuation in dB at 3 kHz, derived from E and M */
  Tl1: number;
  /** Second stage spectral tilt attenuation in dB at 3 kHz, derived from E and M */
  Tl2: number;
  /** Noise amplitude, derived from B (breathiness) */
  An: number;
  /** Jitter depth: maximum f₀ perturbation as a fraction (0-0.3 for ±30%), derived from R */
  jitterDepth: number;
  /** Shimmer depth: maximum amplitude perturbation as a fraction (0-1 for ±100%), derived from R */
  shimmerDepth: number;
};

/**
 * Glottal Flow Derivative (GFD)
 *
 * The glottal flow derivative model represents the sound source produced by
 * the vibrating vocal folds. It consists of a voiced component (periodic pulses
 * shaped by the glottal formant and spectral tilt) and an unvoiced component
 * (filtered noise for breathiness).
 *
 * The noise is modulated by the glottal flow derivative, so aspiration noise
 * follows the glottal cycle - loudest during the open phase, quiet when closed.
 *
 * Signal flow:
 *
 *   PulseTrain(f0) → GlottalFormant(Fg, Bg, Ag) → SpectralTilt(Tl1, Tl2) ──┬────→ Output
 *                                                                          │        ↑
 *                                                                          │ (mod)  │
 *                                                                          ↓        │
 *   NoiseSource(An) ─────────────────────────────────────────────────→ [Multiply] ──┘
 *
 * Paper reference: Section 3.2 (overall structure)
 *
 * Input parameters:
 *   - f0 (fundamental frequency) — controls the pulse train period
 *   - Fg (glottal formant centre frequency) — computed as f0 / (2·Oq)
 *   - Bg (glottal formant bandwidth) — computed from f0, Oq, and αm
 *   - Ag (source amplitude) — derived from E, Oq, and R (shimmer)
 *   - Tl1 (first tilt stage attenuation in dB at 3 kHz) — derived from E and M
 *   - Tl2 (second tilt stage attenuation in dB at 3 kHz) — derived from E and M
 *   - An (noise amplitude) — derived from B (breathiness)
 */
export class GlottalFlowDerivative implements Node<GlottalFlowDerivativeParams> {
  private pulseTrain: PulseTrain;
  private glottalFormant: GlottalFormant;
  private spectralTilt: SpectralTilt;
  private noiseSource: NoiseSource;
  private noiseModulator: GainNode; // Multiplies noise by GFD signal
  private outputGain: Gain;

  public in: AudioNode | null = null; // Source node has no input
  public out: AudioNode;

  private constructor(
    pulseTrain: PulseTrain,
    glottalFormant: GlottalFormant,
    spectralTilt: SpectralTilt,
    noiseSource: NoiseSource,
    noiseModulator: GainNode,
    outputGain: Gain
  ) {
    this.pulseTrain = pulseTrain;
    this.glottalFormant = glottalFormant;
    this.spectralTilt = spectralTilt;
    this.noiseSource = noiseSource;
    this.noiseModulator = noiseModulator;
    this.outputGain = outputGain;
    this.out = outputGain.out;
  }

  /**
   * Creates a new GlottalFlowDerivative node.
   *
   * Sets up the voiced path (pulse train → glottal formant → spectral tilt)
   * and the noise modulation path where noise is multiplied by the GFD signal.
   */
  static async create(
    ctx: AudioContext,
    params: GlottalFlowDerivativeParams
  ): Promise<GlottalFlowDerivative> {
    // Create all sub-nodes in parallel
    const [pulseTrain, glottalFormant, spectralTilt, noiseSource, outputGain] =
      await Promise.all([
        PulseTrain.create(ctx, {
          f0: params.f0,
          jitterDepth: params.jitterDepth,
          shimmerDepth: params.shimmerDepth,
        }),
        GlottalFormant.create(ctx, { Fg: params.Fg, Bg: params.Bg, Ag: params.Ag }),
        SpectralTilt.create(ctx, { Tl1: params.Tl1, Tl2: params.Tl2 }),
        NoiseSource.create(ctx, { An: params.An }),
        Gain.create(ctx, { gain: 1 }),
      ]);

    // Create noise modulator - a GainNode whose gain is modulated by the GFD signal
    // This implements the multiplication: noise × GFD
    const noiseModulator = ctx.createGain();
    noiseModulator.gain.setValueAtTime(0, ctx.currentTime); // Base gain is 0, modulated by audio signal

    // Connect voiced path: PulseTrain → GlottalFormant → SpectralTilt → Output
    pulseTrain.out.connect(glottalFormant.in);
    glottalFormant.out.connect(spectralTilt.in);
    spectralTilt.out.connect(outputGain.in);

    // Connect GFD signal to modulate the noise gain (audio-rate modulation)
    spectralTilt.out.connect(noiseModulator.gain);

    // Connect noise through modulator to output: NoiseSource → [×GFD] → Output
    noiseSource.out.connect(noiseModulator);
    noiseModulator.connect(outputGain.in);

    return new GlottalFlowDerivative(
      pulseTrain,
      glottalFormant,
      spectralTilt,
      noiseSource,
      noiseModulator,
      outputGain
    );
  }

  /**
   * Updates all glottal flow derivative parameters.
   * Each sub-node receives its relevant parameters.
   */
  update(params: GlottalFlowDerivativeParams): void {
    this.pulseTrain.update({
      f0: params.f0,
      jitterDepth: params.jitterDepth,
      shimmerDepth: params.shimmerDepth,
    });
    this.glottalFormant.update({ Fg: params.Fg, Bg: params.Bg, Ag: params.Ag });
    this.spectralTilt.update({ Tl1: params.Tl1, Tl2: params.Tl2 });
    this.noiseSource.update({ An: params.An });
  }

  /**
   * Returns the pulse train node for direct AudioParam access.
   *
   * Example usage:
   *   gfd.pulseTrainNode.f0.setValueAtTime(440, ctx.currentTime);
   *   gfd.pulseTrainNode.jitterDepth.linearRampToValueAtTime(0.1, ctx.currentTime + 0.5);
   */
  get pulseTrainNode(): PulseTrain {
    return this.pulseTrain;
  }

  /**
   * Returns the glottal formant node for direct AudioParam access.
   *
   * Example usage:
   *   gfd.glottalFormantNode.Fg.setValueAtTime(220, ctx.currentTime);
   *   gfd.glottalFormantNode.Ag.setTargetAtTime(0.5, ctx.currentTime, 0.1);
   */
  get glottalFormantNode(): GlottalFormant {
    return this.glottalFormant;
  }

  /**
   * Returns the spectral tilt node for direct AudioParam access.
   *
   * Example usage:
   *   gfd.spectralTiltNode.Tl1.setValueAtTime(10, ctx.currentTime);
   */
  get spectralTiltNode(): SpectralTilt {
    return this.spectralTilt;
  }

  /**
   * Returns the noise source node for direct AudioParam access.
   *
   * Example usage:
   *   gfd.noiseSourceNode.An.setValueAtTime(0.3, ctx.currentTime);
   */
  get noiseSourceNode(): NoiseSource {
    return this.noiseSource;
  }

  /**
   * Starts the voiced excitation (pulse train).
   */
  start(): void {
    this.pulseTrain.start();
  }

  /**
   * Stops the voiced excitation (pulse train).
   * Note: Noise source continues to produce output based on An parameter.
   */
  stop(): void {
    this.pulseTrain.stop();
  }

  destroy(): void {
    this.pulseTrain.destroy();
    this.glottalFormant.destroy();
    this.spectralTilt.destroy();
    this.noiseSource.destroy();
    this.noiseModulator.disconnect();
    this.outputGain.destroy();
  }

  /**
   * Computes the frequency response of the glottal flow derivative filter chain.
   *
   * Returns the response of the voiced path: GlottalFormant → SpectralTilt.
   * The noise path has its own bandpass filtering but is mixed separately.
   */
  getFrequencyResponse(frequencies: number[], sampleRate: number): number[] {
    const gfResponse = this.glottalFormant.getFrequencyResponse(
      frequencies,
      sampleRate
    );
    const stResponse = this.spectralTilt.getFrequencyResponse(
      frequencies,
      sampleRate
    );
    return combineSeries(gfResponse, stResponse);
  }
}
