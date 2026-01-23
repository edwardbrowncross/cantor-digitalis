/**
 * Vowel formant data from Cantor Digitalis Table 3
 *
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
  ipa: string;
  v: number; // backness: 0 = back, 1 = front
  h: number; // height: 0 = close, 1 = open
  formants: [Formant, Formant, Formant, Formant, Formant, Formant];
}

// Grid structure for interpolation
// V levels: 0 (back), 0.5 (central), 1 (front)
// H levels: 0 (close), 1/3, 2/3, 1 (open)
const V_LEVELS = [0, 0.5, 1];
const H_LEVELS = [0, 1 / 3, 2 / 3, 1];

// Vowel grid indexed by [h_index][v_index]
// At H=1, only /a/ exists (V=0.5), so we treat it as spanning the full width
const VOWEL_GRID: (string | null)[][] = [
  ["u", "y", "i"], // H = 0
  ["o", "œ", "e"], // H = 1/3
  ["ɔ", "ø", "ɛ"], // H = 2/3
  ["a", "a", "a"], // H = 1 (all map to /a/)
];

function findVowelByIpa(ipa: string): VowelData | undefined {
  return vowels.find((v) => v.ipa === ipa);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpFormant(a: Formant, b: Formant, t: number): Formant {
  return {
    frequency: lerp(a.frequency, b.frequency, t),
    amplitude: lerp(a.amplitude, b.amplitude, t),
    bandwidth: lerp(a.bandwidth, b.bandwidth, t),
  };
}

function lerpFormants(
  a: Formant[],
  b: Formant[],
  t: number
): [Formant, Formant, Formant, Formant, Formant, Formant] {
  return a.map((f, i) => lerpFormant(f, b[i], t)) as [
    Formant,
    Formant,
    Formant,
    Formant,
    Formant,
    Formant,
  ];
}

/**
 * Interpolate formants for arbitrary vowel coordinates using bilinear interpolation.
 *
 * @param v - Vowel backness (0 = back, 1 = front)
 * @param h - Vowel height (0 = close, 1 = open)
 * @returns Interpolated formant array
 */
export function interpolateFormants(
  v: number,
  h: number
): [Formant, Formant, Formant, Formant, Formant, Formant] {
  // Clamp inputs to valid range
  v = Math.max(0, Math.min(1, v));
  h = Math.max(0, Math.min(1, h));

  // Find surrounding grid indices
  let hLow = 0;
  let hHigh = 1;
  for (let i = 0; i < H_LEVELS.length - 1; i++) {
    if (h >= H_LEVELS[i] && h <= H_LEVELS[i + 1]) {
      hLow = i;
      hHigh = i + 1;
      break;
    }
  }

  let vLow = 0;
  let vHigh = 1;
  for (let i = 0; i < V_LEVELS.length - 1; i++) {
    if (v >= V_LEVELS[i] && v <= V_LEVELS[i + 1]) {
      vLow = i;
      vHigh = i + 1;
      break;
    }
  }

  // Get the four corner vowels
  const bottomLeft = findVowelByIpa(VOWEL_GRID[hLow][vLow]!)!;
  const bottomRight = findVowelByIpa(VOWEL_GRID[hLow][vHigh]!)!;
  const topLeft = findVowelByIpa(VOWEL_GRID[hHigh][vLow]!)!;
  const topRight = findVowelByIpa(VOWEL_GRID[hHigh][vHigh]!)!;

  // Calculate interpolation factors
  const hRange = H_LEVELS[hHigh] - H_LEVELS[hLow];
  const vRange = V_LEVELS[vHigh] - V_LEVELS[vLow];

  const tH = hRange > 0 ? (h - H_LEVELS[hLow]) / hRange : 0;
  const tV = vRange > 0 ? (v - V_LEVELS[vLow]) / vRange : 0;

  // Bilinear interpolation
  const bottom = lerpFormants(bottomLeft.formants, bottomRight.formants, tV);
  const top = lerpFormants(topLeft.formants, topRight.formants, tV);

  return lerpFormants(bottom, top, tH);
}

export const vowels: VowelData[] = [
  {
    ipa: "i",
    v: 1,
    h: 0,
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
    v: 1,
    h: 1 / 3,
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
    v: 1,
    h: 2 / 3,
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
    v: 0.5,
    h: 0,
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
    v: 0.5,
    h: 1 / 3,
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
    v: 0.5,
    h: 2 / 3,
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
    v: 0,
    h: 0,
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
    v: 0,
    h: 1 / 3,
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
    v: 0,
    h: 2 / 3,
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
    v: 0.5,
    h: 1,
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
