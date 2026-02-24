/**
 * Plosive /d/ Example — "dah", "deh", "dee", "doh", "doo"
 *
 * Demonstrates precise AudioParam automation for consonant-vowel synthesis.
 * Each button plays a voiced alveolar plosive /d/ followed by a different vowel.
 *
 * Signal chain:
 *   Voice.out → LP filter (×2, 24 dB/oct) → master gain → destination
 */

import {
  Voice,
  generateSynthParams,
  PerceptualParams,
  SynthParams,
} from "cantor-digitalis";
import { englishVowelTable } from "./vowels";

// ============================================================================
// Constants
// ============================================================================

// Timing (seconds)
const LOOKAHEAD = 0.005;
const CLOSURE_DURATION = 0.05;
const BURST_DURATION = 0.015;
const BURST_RAMP_TIME = 0.1;
const TRANSITION_DURATION = 0.1;
const VOWEL_DURATION = 0.2;
const RELEASE_DURATION = 0.2;

// Closure gate filter (Hz)
const CLOSURE_CUTOFF = 200;
const OPEN_CUTOFF = 20000;

// Source amplitudes
const AG_VOICED = 0.7;
const AN_BURST = 0.2;
const AN_VOWEL = 0.03;

// Formant loci for /d/ (alveolar)
const F2_LOCUS = 1800;
const F3_LOCUS = 2800;

// Master gain
const MASTER_GAIN = 0.7;

// Base parameters shared across all vowels
const BASE_PARAMS: Omit<PerceptualParams, "vowelHeight" | "vowelBackness"> = {
  pitch: 0,
  pitchOffset: 48,
  vocalEffort: 0.6,
  tenseness: 0.5,
  breathiness: 0.02,
  roughness: 0.05,
  vocalTractSize: 0.29,
  isFalsetto: false,
};

// Vowel targets: height and backness for each vowel
// Coordinates match the english vowel table entries
const VOWELS: Record<string, Partial<PerceptualParams>> = {
  eh: { pitchOffset: 48, vowelHeight: 0.75, vowelBackness: 0.55 },   // e  — mid, front
  ee: { pitchOffset: 50, vowelHeight: 0.2, vowelBackness: 0.95 },    // ɪ  — close, front
  ah: { pitchOffset: 52, vowelHeight: 0.95, vowelBackness: 0.2 },   // ɑː — open, back
  oh: { pitchOffset: 53, vowelHeight: 0.4, vowelBackness: 0.1 },     // ʊ  — close-mid, back
  oo: { pitchOffset: 55, vowelHeight: 0.0, vowelBackness: 0.25 },    // uː — close, back
};

// ============================================================================
// Audio State
// ============================================================================

let ctx: AudioContext | null = null;
let voice: Voice | null = null;
let closureFilter1: BiquadFilterNode | null = null;
let closureFilter2: BiquadFilterNode | null = null;
let masterGain: GainNode | null = null;

// ============================================================================
// Initialisation
// ============================================================================

async function init(): Promise<void> {
  ctx = new AudioContext();

  // Two cascaded lowpass filters for 24 dB/oct closure
  closureFilter1 = ctx.createBiquadFilter();
  closureFilter1.type = "lowpass";
  closureFilter1.frequency.value = OPEN_CUTOFF;
  closureFilter1.Q.value = 0.707;

  closureFilter2 = ctx.createBiquadFilter();
  closureFilter2.type = "lowpass";
  closureFilter2.frequency.value = OPEN_CUTOFF;
  closureFilter2.Q.value = 0.707;

  // Master gain
  masterGain = ctx.createGain();
  masterGain.gain.value = MASTER_GAIN;

  // Create voice with Ag=0 (silent until triggered)
  const synthParams = generateSynthParams(
    { ...BASE_PARAMS, ...VOWELS["ah"] } as PerceptualParams,
    { vowelTable: englishVowelTable },
  );
  synthParams.Ag = 0;
  synthParams.An = 0;
  voice = await Voice.create(ctx, synthParams);

  // Connect: Voice → LP1 → LP2 → master → destination
  voice.out.connect(closureFilter1);
  closureFilter1.connect(closureFilter2);
  closureFilter2.connect(masterGain);
  masterGain.connect(ctx.destination);

  // Start the pulse train permanently (Ag=0 keeps it silent)
  voice.start();
}

// ============================================================================
// Play /d/ + vowel
// ============================================================================

function playD(vowelKey: string): void {
  if (!ctx || !voice || !closureFilter1 || !closureFilter2) return;

  const vowel = VOWELS[vowelKey];
  if (!vowel) return;

  const t0 = ctx.currentTime + LOOKAHEAD;
  const tBurst = t0 + CLOSURE_DURATION;
  const tBurstEnd = tBurst + BURST_DURATION;
  const tTransEnd = tBurstEnd + TRANSITION_DURATION;
  const tVowelEnd = tTransEnd + VOWEL_DURATION;
  const tEnd = tVowelEnd + RELEASE_DURATION;

  // Generate synth params for the target vowel
  const synthParams: SynthParams = generateSynthParams(
    { ...BASE_PARAMS, ...vowel } as PerceptualParams,
    { vowelTable: englishVowelTable },
  );

  // Set all "static" parameters via update (Fg, Bg, Tl1, Tl2, formants, etc.)
  voice.update(synthParams);

  // --- Cancel previous automation on all directly-scheduled params ---
  const Ag = voice.source.glottalFormantNode.Ag;
  const An = voice.source.noiseSourceNode.An;
  const F2 = voice.tract.formants[1].F;
  const F3 = voice.tract.formants[2].F;
  const cf1 = closureFilter1.frequency;
  const cf2 = closureFilter2.frequency;

  Ag.cancelScheduledValues(t0);
  An.cancelScheduledValues(t0);
  F2.cancelScheduledValues(t0);
  F3.cancelScheduledValues(t0);
  cf1.cancelScheduledValues(t0);
  cf2.cancelScheduledValues(t0);

  // --- Closure phase: voice bar only (low rumble through closed tract) ---
  Ag.setValueAtTime(AG_VOICED, t0);
  An.setValueAtTime(0, t0);
  F2.setValueAtTime(F2_LOCUS, t0);
  F3.setValueAtTime(F3_LOCUS, t0);
  cf1.setValueAtTime(CLOSURE_CUTOFF, t0);
  cf2.setValueAtTime(CLOSURE_CUTOFF, t0);

  // --- Burst phase: tract opens rapidly, noise burst ---
  cf1.setValueAtTime(CLOSURE_CUTOFF, tBurst);
  cf1.linearRampToValueAtTime(OPEN_CUTOFF, tBurst + BURST_RAMP_TIME);
  cf2.setValueAtTime(CLOSURE_CUTOFF, tBurst);
  cf2.linearRampToValueAtTime(OPEN_CUTOFF, tBurst + BURST_RAMP_TIME);

  An.setValueAtTime(AN_BURST, tBurst);

  // --- Transition phase: formants sweep to vowel targets, noise decays ---
  An.linearRampToValueAtTime(AN_VOWEL, tBurstEnd);

  F2.setValueAtTime(F2_LOCUS, tBurstEnd);
  F2.linearRampToValueAtTime(synthParams.formants[1].F, tTransEnd);
  F3.setValueAtTime(F3_LOCUS, tBurstEnd);
  F3.linearRampToValueAtTime(synthParams.formants[2].F, tTransEnd);

  // --- Steady vowel: hold target values ---
  Ag.setValueAtTime(AG_VOICED, tTransEnd);
  An.setValueAtTime(AN_VOWEL, tTransEnd);

  // --- Fade-out ---
  Ag.setValueAtTime(AG_VOICED, tVowelEnd);
  Ag.linearRampToValueAtTime(0, tEnd);
  An.setValueAtTime(AN_VOWEL, tVowelEnd);
  An.linearRampToValueAtTime(0, tEnd);
}

// ============================================================================
// Button Handlers
// ============================================================================

document.querySelectorAll<HTMLButtonElement>("button[data-vowel]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    if (!ctx) {
      await init();
    }
    if (ctx && ctx.state === "suspended") {
      await ctx.resume();
    }
    playD(btn.dataset.vowel!);
  });
});
