/**
 * External Voice Parameters
 *
 * These are the high-level, user-controllable parameters for the voice synthesiser.
 * They map to the perceptually meaningful dimensions described in Section 2.1 of the paper.
 *
 * All normalised parameters range from 0 to 1 unless otherwise noted.
 */

import { VoiceParams } from "./nodes/voice";
import { interpolateFormants, Formant } from "./vowels";

export type ExternalVoiceParams = {
  /** (P) Normalised melodic position across the pitch range (0-1) */
  pitch: number;
  /** (P₀) Base MIDI note number (e.g., 48 for C3, 60 for C4) */
  pitchOffset: number;
  /** (E) Perceived force/dynamics of the voice (0-1) */
  vocalEffort: number;
  /** (H) Vertical tongue position: 0 = close (e.g., /i/, /u/), 1 = open (e.g., /a/) */
  vowelHeight: number;
  /** (V) Horizontal tongue position: 0 = back (e.g., /u/), 1 = front (e.g., /i/) */
  vowelBackness: number;
  /** (T) Degree of vocal fold adduction: 0 = lax, 1 = tense */
  tenseness: number;
  /** (B) Amount of aspiration noise (0-1) */
  breathiness: number;
  /** (R) Structural aperiodicities causing jitter/shimmer (0-1) */
  roughness: number;
  /** (S) Apparent size of the vocal tract: 0 = small/child, 1 = large/giant */
  vocalTractSize: number;
  /** (M) Vocal fold vibration mode: false = chest voice (M1), true = falsetto (M2) */
  isFalsetto: boolean;
};

/**
 * Feature flags for the voice parameter conversion.
 * All features are enabled by default (true). Set to false to disable.
 */
export type VoiceFeatures = {
  /**
   * Attenuate formant amplitudes when harmonics coincide with formant frequencies.
   * Paper reference: Section 4.3.7
   */
  harmonicCoincidenceAttenuation?: boolean;
  /**
   * Scale formant frequencies by larynx position factor (K) and vocal tract size (αS).
   * Paper reference: Sections 4.3.2, 4.3.3
   */
  formantFrequencyScaling?: boolean;
  /**
   * Raise F1 with vocal effort and constrain it above f₀ + 50 Hz.
   * Paper reference: Section 4.3.4
   */
  f1Tuning?: boolean;
  /**
   * Constrain F2 above 2·f₀ + 50 Hz.
   * Paper reference: Section 4.3.5
   */
  f2Tuning?: boolean;
  /**
   * Scale the anti-resonance frequency (F_BQ) by vocal tract size (αS).
   * When disabled, uses nominal 4700 Hz.
   */
  antiResonanceScaling?: boolean;
};

const DEFAULT_FEATURES: Required<VoiceFeatures> = {
  harmonicCoincidenceAttenuation: true,
  formantFrequencyScaling: true,
  f1Tuning: true,
  f2Tuning: true,
  antiResonanceScaling: true,
};

/** Phonation threshold - below this vocal effort, no voiced sound is produced */
const E_THR = 0.2;

/** Signal amplitude at phonation threshold */
const C_AG = 0.2;

/** Nominal anti-formant frequency in Hz */
const F_BQ_BASE = 4700;

/** Fixed anti-formant quality factor */
const Q_BQ = 2.5;

/**
 * Converts MIDI note number to frequency in Hz.
 */
function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Converts dB to linear amplitude.
 */
function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Computes the open quotient (Oq) from tenseness, vocal effort, and mechanism.
 *
 * Paper reference: Section 4.2.2
 */
function computeOq(T: number, E: number, M: 1 | 2): number {
  // Oq0 depends on mechanism and vocal effort
  const Oq0 = M === 1 ? 0.903 - 0.426 * E : 0.978 - 0.279 * E;

  // Oq varies with tenseness
  if (T <= 0.5) {
    return Math.pow(10, -2 * (1 - Oq0) * T);
  } else {
    return Math.pow(10, 2 * Oq0 * (1 - T) - 1);
  }
}

/**
 * Computes the asymmetry coefficient (αm) from tenseness and mechanism.
 *
 * Paper reference: Section 4.2.2
 */
function computeAlphaM(T: number, M: 1 | 2): number {
  const alphaM0 = M === 1 ? 0.66 : 0.55;

  if (T <= 0.5) {
    return 0.5 + 2 * (alphaM0 - 0.5) * T;
  } else {
    return 0.9 - 2 * (0.9 - alphaM0) * (1 - T);
  }
}

/**
 * Computes the glottal formant bandwidth (Bg) from f0, Oq, and αm.
 *
 * Paper reference: Section 4.2.2
 */
function computeBg(f0: number, Oq: number, alphaM: number): number {
  // Avoid division by zero for extreme αm values
  const tanArg = Math.PI * (1 - alphaM);
  const tanValue = Math.tan(Math.max(0.01, Math.min(Math.PI - 0.01, tanArg)));
  return f0 / (Oq * Math.abs(tanValue));
}

/**
 * Computes the spectral tilt parameters (Tl1, Tl2) from vocal effort and mechanism.
 *
 * Paper reference: Section 4.2.3
 */
function computeSpectralTilt(E: number, M: 1 | 2): { Tl1: number; Tl2: number } {
  if (M === 1) {
    return {
      Tl1: 27 - 21 * E,
      Tl2: 11 - 11 * E,
    };
  } else {
    return {
      Tl1: 45 - 36 * E,
      Tl2: 20 - 18.5 * E,
    };
  }
}

/**
 * Computes the source amplitude (Ag) from vocal effort and open quotient.
 *
 * Paper reference: Section 4.2.4
 */
function computeAg(E: number, Oq: number): number {
  if (E <= E_THR) {
    return 0;
  }
  return ((1 - C_AG) * ((E - E_THR) / (1 - E_THR)) + C_AG) / Oq;
}

/**
 * Computes the noise amplitude (An) from breathiness and vocal effort.
 *
 * Paper reference: Section 4.2.5
 */
function computeAn(B: number, E: number): number {
  const isVoiced = E > E_THR;
  return isVoiced ? B : 1.5 * E * B;
}

/**
 * Computes the vocal tract scale factor (αS) from the size parameter.
 *
 * Paper reference: Section 4.3.2
 */
function computeAlphaS(S: number): number {
  return 1.7 * S + 0.5; // Ranges from 0.5 to 2.2
}

/**
 * Computes the larynx position factor (K) from fundamental frequency.
 *
 * Paper reference: Section 4.3.3
 */
function computeK(f0: number): number {
  return 1.25e-4 * f0 + 0.975;
}

/**
 * Computes the formant amplitude attenuation when a harmonic coincides with a formant.
 *
 * Paper reference: Section 4.3.7
 */
function computeFormantAttenuation(
  f0: number,
  formantFreq: number,
  formantIndex: number
): number {
  // Only apply to first three formants
  if (formantIndex >= 3) {
    return 0;
  }

  // ΔF varies with f0 (15 Hz at f0=50, 100 Hz at f0=1500)
  const deltaF = 15 + (100 - 15) * ((f0 - 50) / (1500 - 50));

  // Maximum attenuation varies by formant (10-25 dB)
  const attMax = [10, 15, 25][formantIndex];

  // Find the closest harmonic
  const harmonic = Math.round(formantFreq / f0);
  const harmonicFreq = harmonic * f0;
  const distance = Math.abs(harmonicFreq - formantFreq);

  if (distance < deltaF) {
    return (1 - distance / deltaF) * attMax;
  }
  return 0;
}

/**
 * Converts external voice parameters to internal VoiceParams.
 *
 * This implements the parameter mapping rules from Section 4 of the paper,
 * converting perceptually meaningful high-level parameters to the low-level
 * synthesis parameters needed by the voice engine.
 *
 * @param params - The external voice parameters
 * @param features - Optional feature flags to enable/disable specific behaviours (all enabled by default)
 */
export function convertToVoiceParams(
  params: ExternalVoiceParams,
  features: VoiceFeatures = {}
): VoiceParams {
  const opts = { ...DEFAULT_FEATURES, ...features };
  const {
    pitch: P,
    pitchOffset: P0,
    vocalEffort: E,
    vowelHeight: H,
    vowelBackness: V,
    tenseness: T,
    breathiness: B,
    roughness: R,
    vocalTractSize: S,
    isFalsetto,
  } = params;
  const M: 1 | 2 = isFalsetto ? 2 : 1;

  // Compute fundamental frequency
  const pitchMidi = P0 + 35 * P;
  const f0 = midiToFrequency(pitchMidi);

  // Compute intermediate voice source parameters
  const Oq = computeOq(T, E, M);
  const alphaM = computeAlphaM(T, M);

  // Compute glottal formant parameters
  const Fg = f0 / (2 * Oq);
  const Bg = computeBg(f0, Oq, alphaM);
  const Ag = computeAg(E, Oq);

  // Compute spectral tilt
  const { Tl1, Tl2 } = computeSpectralTilt(E, M);

  // Compute noise amplitude
  const An = computeAn(B, E);

  // Compute roughness parameters (jitter and shimmer)
  // Jitter: up to ±30% f₀ perturbation at max roughness
  const jitterDepth = R * 0.3;
  // Shimmer: up to ±100% amplitude perturbation at max roughness
  const shimmerDepth = R * 1.0;

  // Compute vocal tract scaling factors
  const alphaS = computeAlphaS(S);
  const K = computeK(f0);

  // Interpolate base formant values from vowel table
  const baseFormants = interpolateFormants(V, H);

  // Apply formant tuning rules and scaling
  const formants = baseFormants.map((formant: Formant, i: number) => {
    // Base frequency, optionally scaled by K and alphaS
    const scaleFactor = opts.formantFrequencyScaling ? K * alphaS : 1;
    let F = scaleFactor * formant.frequency;

    // F1 tuning (Section 4.3.4): raised with effort, constrained above f0
    if (i === 0 && opts.f1Tuning) {
      const F1Raised = scaleFactor * formant.frequency + (140 / (1 - E_THR)) * E - 70;
      F = Math.max(f0 + 50, F1Raised);
    }

    // F2 tuning (Section 4.3.5): constrained above 2*f0
    if (i === 1 && opts.f2Tuning) {
      F = Math.max(2 * f0 + 50, scaleFactor * formant.frequency);
    }

    // Amplitude correction for harmonic coincidence
    const attenuation = opts.harmonicCoincidenceAttenuation
      ? computeFormantAttenuation(f0, F, i)
      : 0;
    const A = dbToLinear(formant.amplitude - attenuation);

    return {
      F,
      B: formant.bandwidth,
      A,
    };
  });

  // Compute anti-formant frequency (optionally scaled by vocal tract size)
  const F_BQ = opts.antiResonanceScaling ? F_BQ_BASE * alphaS : F_BQ_BASE;

  return {
    source: {
      f0,
      Fg,
      Bg,
      Ag,
      Tl1,
      Tl2,
      An,
      jitterDepth,
      shimmerDepth,
    },
    tract: {
      formants,
      F_BQ,
      Q_BQ,
    },
  };
}
