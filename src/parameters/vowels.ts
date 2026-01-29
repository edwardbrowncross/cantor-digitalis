/**
 * Vowel formant data and interpolation
 *
 * Default vowel data from Cantor Digitalis Table 3
 * Reference: Section 4.3.1 "Generic Formant Values"
 *
 * The sixth formant is derived: F6 = 2*F4, A6 = -15 dB, B6 = 150 Hz
 */

export interface Formant {
  frequency: number; // Hz
  amplitude: number; // dB
  bandwidth: number; // Hz
}

export interface VowelData {
  /** IPA symbol or identifier for this vowel */
  ipa: string;
  /** Horizontal position (backness): 0 = back, 1 = front */
  h: number;
  /** Vertical position (height): 0 = close, 1 = open */
  v: number;
  /** Formant data (frequency, amplitude, bandwidth) for each resonator */
  formants: Formant[];
  /** Optional dB adjustment applied to all formant amplitudes for volume normalization */
  volumeAdjustment?: number;
}

/**
 * A vowel table containing vowel data points for interpolation.
 * Vowels can be placed at arbitrary (h, v) coordinates.
 */
export interface VowelTable {
  /** Array of vowel data points */
  vowels: VowelData[];
  /** Power parameter for inverse distance weighting (default: 2) */
  idwPower?: number;
}

/** Default IDW power (inverse square weighting) */
const DEFAULT_IDW_POWER = 2;

/** Small epsilon to handle exact matches and avoid division issues */
const EPSILON = 1e-10;

/**
 * Interpolate formants for arbitrary vowel coordinates using inverse distance weighting.
 *
 * Each vowel in the table contributes to the result weighted by the inverse of its
 * distance from the query point, raised to the specified power.
 *
 * @param h - Vowel backness (0 = back, 1 = front) - horizontal position
 * @param v - Vowel height (0 = close, 1 = open) - vertical position
 * @param table - Vowel table to interpolate from (defaults to defaultVowelTable)
 * @returns Interpolated formant array
 */
export function interpolateFormants(
  h: number,
  v: number,
  table: VowelTable = defaultVowelTable
): Formant[] {
  const { vowels, idwPower = DEFAULT_IDW_POWER } = table;

  if (vowels.length === 0) {
    throw new Error("Vowel table must contain at least one vowel");
  }

  // Verify all vowels have the same number of formants
  const expectedFormantCount = vowels[0].formants.length;
  for (let i = 1; i < vowels.length; i++) {
    const actualCount = vowels[i].formants.length;
    if (actualCount !== expectedFormantCount) {
      throw new Error(
        `Vowel table formant count mismatch: vowel "${vowels[0].ipa}" has ${expectedFormantCount} formants, ` +
          `but vowel "${vowels[i].ipa}" has ${actualCount} formants. All vowels must have the same number of formants.`
      );
    }
  }

  // Clamp inputs to valid range
  h = Math.max(0, Math.min(1, h));
  v = Math.max(0, Math.min(1, v));

  // Compute distances and check for exact matches
  const distances = vowels.map((vowel) => Math.hypot(vowel.h - h, vowel.v - v));

  // If we're very close to an existing vowel, return its formants directly
  const minDist = Math.min(...distances);
  if (minDist < EPSILON) {
    const exactMatch = vowels[distances.indexOf(minDist)];
    const volAdj = exactMatch.volumeAdjustment ?? 0;
    return exactMatch.formants.map((f) => ({
      ...f,
      amplitude: f.amplitude + volAdj,
    }));
  }

  // Compute inverse distance weights
  const weights = distances.map((dist) => 1 / Math.pow(dist, idwPower));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Determine number of formants from first vowel
  const numFormants = vowels[0].formants.length;

  // Weighted average of all formants
  const result: Formant[] = [];
  for (let i = 0; i < numFormants; i++) {
    let frequency = 0;
    let amplitude = 0;
    let bandwidth = 0;

    for (let j = 0; j < vowels.length; j++) {
      const w = weights[j] / totalWeight;
      const f = vowels[j].formants[i];
      if (f) {
        frequency += w * f.frequency;
        amplitude += w * (f.amplitude + (vowels[j].volumeAdjustment ?? 0));
        bandwidth += w * f.bandwidth;
      }
    }

    // Apply interpolated volume adjustment to amplitude
    result.push({ frequency, amplitude: amplitude, bandwidth });
  }

  return result;
}

/** Default vowel data (French vowels from Cantor Digitalis Table 3) */
const defaultVowels: VowelData[] = [
  {
    ipa: "i",
    h: 1,
    v: 0,
    formants: [
      { frequency: 215, amplitude: -10, bandwidth: 10 },
      { frequency: 1900, amplitude: -10, bandwidth: 18 },
      { frequency: 2630, amplitude: -8, bandwidth: 20 },
      { frequency: 3170, amplitude: -4, bandwidth: 30 },
      { frequency: 3710, amplitude: -15, bandwidth: 40 },
      { frequency: 6340, amplitude: -15, bandwidth: 150 },
    ],
  },
  {
    ipa: "e",
    h: 1,
    v: 1 / 3,
    formants: [
      { frequency: 410, amplitude: -1, bandwidth: 10 },
      { frequency: 2000, amplitude: -3, bandwidth: 15 },
      { frequency: 2570, amplitude: -2, bandwidth: 20 },
      { frequency: 2980, amplitude: -2, bandwidth: 30 },
      { frequency: 3900, amplitude: -5, bandwidth: 40 },
      { frequency: 5960, amplitude: -15, bandwidth: 150 },
    ],
  },
  {
    ipa: "ɛ",
    h: 1,
    v: 2 / 3,
    formants: [
      { frequency: 590, amplitude: 0, bandwidth: 10 },
      { frequency: 1700, amplitude: -4, bandwidth: 15 },
      { frequency: 2540, amplitude: -5, bandwidth: 30 },
      { frequency: 2800, amplitude: -12, bandwidth: 50 },
      { frequency: 3900, amplitude: -24, bandwidth: 40 },
      { frequency: 5600, amplitude: -15, bandwidth: 150 },
    ],
  },
  {
    ipa: "y",
    h: 0.5,
    v: 0,
    formants: [
      { frequency: 250, amplitude: -12, bandwidth: 10 },
      { frequency: 1750, amplitude: -9, bandwidth: 10 },
      { frequency: 2160, amplitude: -14, bandwidth: 20 },
      { frequency: 3060, amplitude: -11, bandwidth: 30 },
      { frequency: 3900, amplitude: -11, bandwidth: 40 },
      { frequency: 6120, amplitude: -15, bandwidth: 150 },
    ],
  },
  {
    ipa: "œ",
    h: 0.5,
    v: 1 / 3,
    formants: [
      { frequency: 350, amplitude: -6, bandwidth: 10 },
      { frequency: 1350, amplitude: -3, bandwidth: 10 },
      { frequency: 2250, amplitude: -8, bandwidth: 20 },
      { frequency: 3170, amplitude: -8, bandwidth: 30 },
      { frequency: 3900, amplitude: -10, bandwidth: 40 },
      { frequency: 6340, amplitude: -15, bandwidth: 150 },
    ],
  },
  {
    ipa: "ø",
    h: 0.5,
    v: 2 / 3,
    formants: [
      { frequency: 620, amplitude: -3, bandwidth: 10 },
      { frequency: 1300, amplitude: -3, bandwidth: 10 },
      { frequency: 2520, amplitude: -3, bandwidth: 20 },
      { frequency: 3310, amplitude: -7, bandwidth: 30 },
      { frequency: 3900, amplitude: -14, bandwidth: 40 },
      { frequency: 6620, amplitude: -15, bandwidth: 150 },
    ],
  },
  {
    ipa: "u",
    h: 0,
    v: 0,
    formants: [
      { frequency: 290, amplitude: -6, bandwidth: 10 },
      { frequency: 750, amplitude: -8, bandwidth: 10 },
      { frequency: 2300, amplitude: -13, bandwidth: 20 },
      { frequency: 3080, amplitude: -8, bandwidth: 30 },
      { frequency: 3900, amplitude: -9, bandwidth: 40 },
      { frequency: 6160, amplitude: -15, bandwidth: 150 },
    ],
  },
  {
    ipa: "o",
    h: 0,
    v: 1 / 3,
    formants: [
      { frequency: 440, amplitude: -6, bandwidth: 10 },
      { frequency: 750, amplitude: -1, bandwidth: 12 },
      { frequency: 2160, amplitude: -10, bandwidth: 20 },
      { frequency: 2860, amplitude: -6, bandwidth: 30 },
      { frequency: 3900, amplitude: -28, bandwidth: 40 },
      { frequency: 5720, amplitude: -15, bandwidth: 150 },
    ],
  },
  {
    ipa: "ɔ",
    h: 0,
    v: 2 / 3,
    formants: [
      { frequency: 610, amplitude: -3, bandwidth: 10 },
      { frequency: 950, amplitude: 0, bandwidth: 12 },
      { frequency: 2510, amplitude: -12, bandwidth: 20 },
      { frequency: 2830, amplitude: -15, bandwidth: 30 },
      { frequency: 3900, amplitude: -20, bandwidth: 40 },
      { frequency: 5660, amplitude: -15, bandwidth: 150 },
    ],
  },
  {
    ipa: "a",
    h: 0.5,
    v: 1,
    formants: [
      { frequency: 700, amplitude: 0, bandwidth: 13 },
      { frequency: 1200, amplitude: 0, bandwidth: 13 },
      { frequency: 2500, amplitude: -5, bandwidth: 40 },
      { frequency: 2800, amplitude: -7, bandwidth: 60 },
      { frequency: 3600, amplitude: -24, bandwidth: 40 },
      { frequency: 5600, amplitude: -15, bandwidth: 150 },
    ],
  },
];

/** Default vowel table (French vowels from Cantor Digitalis) */
export const defaultVowelTable: VowelTable = {
  vowels: defaultVowels,
};
