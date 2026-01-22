import type { Node } from "./types";
import { Gain } from "./gain";

/**
 * Calculates the maximum number of harmonics that fit below Nyquist frequency.
 * This ensures the impulse train has maximum spectral content without aliasing.
 */
function calculateHarmonicCount(sampleRate: number, f0: number): number {
  const nyquist = sampleRate / 2;
  return Math.max(1, Math.floor(nyquist / f0));
}

/**
 * Creates the Fourier coefficients for an impulse train (Dirac comb).
 * All harmonics have equal amplitude, producing Σδ(f − n·f₀) in the spectral domain.
 */
function createHarmonics(harmonics: number): { real: Float32Array; imag: Float32Array } {
  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);
  for (let i = 1; i <= harmonics; i++) {
    imag[i] = 0;
    real[i] = 1;
  }
  return { real, imag };
}

export type PulseTrainParams = {
  /** Fundamental frequency in Hz (derived from P, P₀, with perturbations applied) */
  f0: number;
}

/**
 * Pulse Train (Voiced Excitation Source)
 *
 * Generates a periodic impulse train at the fundamental frequency f₀.
 * In the spectral domain, this is a Dirac comb: Σδ(f − n·f₀), representing
 * energy at each harmonic frequency. In the time domain, this corresponds
 * to unit impulses occurring once per pitch period (1/f₀ seconds).
 *
 * The impulse train is the input to the glottal formant filter, which shapes
 * each impulse into the characteristic glottal pulse waveform.
 *
 * Paper reference: Section 3.1 (spectral equation showing the Dirac comb term)
 */
export class PulseTrain implements Node<PulseTrainParams> {
  private ctx: AudioContext;
  private oscillator: OscillatorNode;
  private gain: Gain;
  private currentHarmonicCount: number;
  public in: null;
  public out: AudioNode;

  private constructor(ctx: AudioContext, oscillator: OscillatorNode, gain: Gain, harmonicCount: number) {
    this.ctx = ctx;
    this.oscillator = oscillator;
    this.gain = gain;
    this.currentHarmonicCount = harmonicCount;
    this.out = gain.out;
    this.in = null;
  }

  static async create(ctx: AudioContext, params: PulseTrainParams): Promise<PulseTrain> {
    const harmonicCount = calculateHarmonicCount(ctx.sampleRate, params.f0);
    const { real, imag } = createHarmonics(harmonicCount);

    const oscillator = ctx.createOscillator();
    oscillator.setPeriodicWave(ctx.createPeriodicWave(real, imag));
    oscillator.frequency.setValueAtTime(params.f0, ctx.currentTime);

    const gain = await Gain.create(ctx, { gain: 0 });
    oscillator.connect(gain.in);
    oscillator.start();

    return new PulseTrain(ctx, oscillator, gain, harmonicCount);
  }

  update(params: PulseTrainParams) {
    const newHarmonicCount = calculateHarmonicCount(this.ctx.sampleRate, params.f0);

    // Regenerate periodic wave if harmonic count changes significantly (>10% difference)
    // to maintain optimal spectral content without excessive regeneration
    if (Math.abs(newHarmonicCount - this.currentHarmonicCount) / this.currentHarmonicCount > 0.1) {
      const { real, imag } = createHarmonics(newHarmonicCount);
      this.oscillator.setPeriodicWave(this.ctx.createPeriodicWave(real, imag));
      this.currentHarmonicCount = newHarmonicCount;
    }

    this.oscillator.frequency.setValueAtTime(params.f0, this.ctx.currentTime);
  }

  destroy() {
    this.oscillator.stop();
    this.oscillator.disconnect();
    this.gain.destroy();
  }

  start() {
    this.gain.update({ gain: 1 });
  }

  stop() {
    this.gain.update({ gain: 0 });
  }
}
  