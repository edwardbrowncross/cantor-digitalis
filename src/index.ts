/**
 * Cantor Digitalis - Web Voice Synthesizer
 *
 * A physically-informed source-filter model for singing voice synthesis
 * using the Web Audio API.
 *
 * @packageDocumentation
 */

// Main voice synthesizer
export { Voice } from "./nodes/voice";

// Parameter conversion (perceptual → synthesis)
export { generateSynthParams, defaultVowelTable } from "./parameters";
export type {
  PerceptualParams,
  SynthParams,
  SynthFormant,
  SynthOptions,
  SynthFeatures,
  VowelTable,
  VowelData,
  Formant,
} from "./parameters";

// Vowel interpolation (also available via parameters module)
export { interpolateFormants } from "./parameters/vowels";

// Node interface for advanced usage
export type { Node } from "./nodes/types";

// Individual nodes for custom pipelines
export { GlottalFlowDerivative } from "./nodes/glottal-flow-derivative";
export type { GlottalFlowDerivativeParams } from "./nodes/glottal-flow-derivative";

export { VocalTract } from "./nodes/vocal-tract";
export type { VocalTractParams } from "./nodes/vocal-tract";

export { PulseTrain } from "./nodes/pulse-train";
export type { PulseTrainParams } from "./nodes/pulse-train";

export { GlottalFormant } from "./nodes/glottal-formant";
export type { GlottalFormantParams } from "./nodes/glottal-formant";

export { SpectralTilt } from "./nodes/spectral-tilt";
export type { SpectralTiltParams } from "./nodes/spectral-tilt";

export { NoiseSource } from "./nodes/noise-source";
export type { NoiseSourceParams } from "./nodes/noise-source";

export { FormantBank } from "./nodes/formant-bank";
export type { FormantBankParams } from "./nodes/formant-bank";

export { FormantResonator } from "./nodes/formant-resonator";
export type { FormantResonatorParams } from "./nodes/formant-resonator";

export { AntiResonance } from "./nodes/anti-resonance";
export type { AntiResonanceParams } from "./nodes/anti-resonance";

export { Gain } from "./nodes/gain";
export type { GainParams } from "./nodes/gain";
