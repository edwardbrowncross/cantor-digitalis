/**
 * Cantor Digitalis Voice Synthesizer Example
 *
 * This example demonstrates how to:
 * 1. Define voice parameters using PerceptualParams
 * 2. Create a Voice instance with generateSynthParams
 * 3. Update parameters in real-time
 * 4. Control voice playback (start/stop)
 */

import {
  Voice,
  generateSynthParams,
  PerceptualParams,
  SynthOptions,
  VowelTable,
  defaultVowelTable,
} from "cantor-digitalis";

import {
  createControlPanel,
  midiToNoteName,
  SpectrumAnalyzer,
  SliderConfig,
  CheckboxConfig,
  VowelButtonConfig,
  DropdownConfig,
} from "./ui";
import { englishVowelTable } from "./vowels";

// ============================================================================
// Voice Parameters
// ============================================================================

/** Map of vowel table names to tables */
const vowelTables: Record<string, VowelTable> = {
  french: defaultVowelTable,
  english: englishVowelTable,
};

/**
 * Perceptual voice parameters - the high-level controls for the synthesizer.
 * These map to the key voice parameters described in the research paper.
 */
const params: PerceptualParams = {
  pitch: 0, // Normalized melodic position (0-1)
  pitchOffset: 45, // Base MIDI note number
  vocalEffort: 0.5, // Perceived force/dynamics (0-1)
  vowelHeight: 0.85, // Tongue height: 0=close, 1=open
  vowelBackness: 0.1, // Tongue position: 0=back, 1=front
  tenseness: 0.5, // Vocal fold adduction (0-1)
  breathiness: 0.02, // Aspiration noise amount (0-1)
  roughness: 0.02, // Jitter/shimmer amount (0-1)
  vocalTractSize: 0.29, // Tract size: 0=large, 1=small
  isFalsetto: false, // Laryngeal mechanism: false=M1, true=M2
};

/**
 * Options to enable/disable various synthesis behaviors.
 */
const options: SynthOptions = {
  harmonicCoincidenceAttenuation: true,
  formantFrequencyScaling: true,
  f1Tuning: true,
  f2Tuning: true,
  antiResonanceScaling: true,
};

// ============================================================================
// Audio Context and Voice Instance
// ============================================================================

let audioCtx: AudioContext | null = null;
let voice: Voice | null = null;
let masterGain: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let spectrumAnalyzer: SpectrumAnalyzer | null = null;

let masterGainValue = 1.0;

// ============================================================================
// Core Synthesizer Functions
// ============================================================================

/**
 * Update the voice with current parameters.
 * Call this whenever params or features change.
 */
function updateVoice(): void {
  if (voice) {
    const synthParams = generateSynthParams(params, options);
    voice.update(synthParams);
  }
}

/**
 * Initialize and start the audio engine.
 */
async function startAudio(): Promise<void> {
  // Create audio context and routing on first start
  if (!audioCtx) {
    audioCtx = new AudioContext();

    // Master gain for volume control
    masterGain = audioCtx.createGain();
    masterGain.gain.value = masterGainValue;

    // Analyser for spectrum visualization
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.8;

    // Audio routing: masterGain -> analyser -> destination
    masterGain.connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  // Resume context if suspended (required for user gesture)
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  // Create voice instance if needed
  if (!voice) {
    const voiceParams = generateSynthParams(params, options);
    voice = await Voice.create(audioCtx, voiceParams);
    voice.out.connect(masterGain!);
  }

  // Start the voice
  voice.start();

  // Start spectrum visualization
  if (analyser && spectrumCanvas) {
    spectrumAnalyzer = new SpectrumAnalyzer(spectrumCanvas, analyser);
    spectrumAnalyzer.start();
  }
}

/**
 * Stop the voice and visualization.
 */
function stopAudio(): void {
  if (voice) {
    voice.stop();
  }
  if (spectrumAnalyzer) {
    spectrumAnalyzer.stop();
    spectrumAnalyzer = null;
  }
}

// ============================================================================
// UI Setup
// ============================================================================

const format01 = (v: number) => v.toFixed(2);

const paramSliders: SliderConfig[] = [
  {
    label: "Master Gain",
    min: 0,
    max: 3,
    step: 0.01,
    value: masterGainValue,
    formatValue: format01,
    onChange: (v) => {
      masterGainValue = v;
      if (masterGain) masterGain.gain.value = v;
    },
  },
  {
    label: "MIDI Note",
    min: 36,
    max: 72,
    step: 1,
    value: params.pitchOffset,
    formatValue: midiToNoteName,
    onChange: (v) => {
      params.pitchOffset = v;
      updateVoice();
    },
  },
  {
    label: "Vocal Effort (E)",
    min: 0,
    max: 1,
    step: 0.01,
    value: params.vocalEffort,
    formatValue: format01,
    onChange: (v) => {
      params.vocalEffort = v;
      updateVoice();
    },
  },
  {
    label: "Vowel Height (H)",
    min: 0,
    max: 1,
    step: 0.01,
    value: params.vowelHeight,
    formatValue: format01,
    onChange: (v) => {
      params.vowelHeight = v;
      updateVoice();
    },
  },
  {
    label: "Vowel Backness (V)",
    min: 0,
    max: 1,
    step: 0.01,
    value: params.vowelBackness,
    formatValue: format01,
    onChange: (v) => {
      params.vowelBackness = v;
      updateVoice();
    },
  },
  {
    label: "Tenseness (T)",
    min: 0,
    max: 1,
    step: 0.01,
    value: params.tenseness,
    formatValue: format01,
    onChange: (v) => {
      params.tenseness = v;
      updateVoice();
    },
  },
  {
    label: "Breathiness (B)",
    min: 0,
    max: 1,
    step: 0.01,
    value: params.breathiness,
    formatValue: format01,
    onChange: (v) => {
      params.breathiness = v;
      updateVoice();
    },
  },
  {
    label: "Roughness (R)",
    min: 0,
    max: 1,
    step: 0.01,
    value: params.roughness,
    formatValue: format01,
    onChange: (v) => {
      params.roughness = v;
      updateVoice();
    },
  },
  {
    label: "Tract Size (S)",
    min: 0,
    max: 1,
    step: 0.01,
    value: params.vocalTractSize,
    formatValue: format01,
    onChange: (v) => {
      params.vocalTractSize = v;
      updateVoice();
    },
  },
];

const featureCheckboxes: CheckboxConfig[] = [
  {
    id: "harmonicCoincidenceAttenuation",
    label: "Harmonic coincidence attenuation",
    checked: options.harmonicCoincidenceAttenuation ?? true,
    onChange: (checked) => {
      options.harmonicCoincidenceAttenuation = checked;
      updateVoice();
    },
  },
  {
    id: "formantFrequencyScaling",
    label: "Formant frequency scaling (K, αS)",
    checked: options.formantFrequencyScaling ?? true,
    onChange: (checked) => {
      options.formantFrequencyScaling = checked;
      updateVoice();
    },
  },
  {
    id: "f1Tuning",
    label: "F1 tuning (effort + f₀ constraint)",
    checked: options.f1Tuning ?? true,
    onChange: (checked) => {
      options.f1Tuning = checked;
      updateVoice();
    },
  },
  {
    id: "f2Tuning",
    label: "F2 tuning (2·f₀ constraint)",
    checked: options.f2Tuning ?? true,
    onChange: (checked) => {
      options.f2Tuning = checked;
      updateVoice();
    },
  },
  {
    id: "antiResonanceScaling",
    label: "Anti-resonance scaling (αS)",
    checked: options.antiResonanceScaling ?? true,
    onChange: (checked) => {
      options.antiResonanceScaling = checked;
      updateVoice();
    },
  },
];

const falsettoCheckbox: CheckboxConfig = {
  id: "falsetto",
  label: "Falsetto (M=2)",
  checked: params.isFalsetto,
  onChange: (checked) => {
    params.isFalsetto = checked;
    updateVoice();
  },
};

// Example words for vowels
const vowelTooltips: Record<string, string> = {
  // French vowels
  i: 'as in "feet"',
  e: 'as in "may"',
  ɛ: 'as in "bet"',
  y: 'as in "few" (rounded)',
  œ: 'as in "fur" (rounded)',
  ø: 'as in "bird" (rounded)',
  u: 'as in "boot"',
  o: 'as in "go"',
  ɔ: 'as in "caught"',
  a: 'as in "father"',
  // English vowels
  "iː": 'as in "fleece"',
  ɪ: 'as in "kit"',
  æ: 'as in "trap"',
  "ɑː": 'as in "heart"',
  ɒ: 'as in "lot"',
  "ɔː": 'as in "thought"',
  ʊ: 'as in "foot"',
  "uː": 'as in "goose"',
  "ɜː": 'as in "nurse"',
};

/** Current vowel table key */
let currentVowelTableKey = "french";

/** Get vowel button configs from a vowel table */
function getVowelButtonConfigs(table: VowelTable): VowelButtonConfig[] {
  return table.vowels.map((v) => ({
    ipa: v.ipa,
    h: v.h,
    v: v.v,
    tooltip: vowelTooltips[v.ipa] || v.ipa,
  }));
}

let vowelButtonConfigs = getVowelButtonConfigs(defaultVowelTable);

// Mutable handler for vowel table changes (set after UI creation)
let onVowelTableChange: (value: string) => void = () => {};

// Vowel table dropdown config
const vowelTableDropdown: DropdownConfig = {
  id: "vowelTable",
  label: "Vowel Table",
  options: [
    { value: "french", label: "Cantor Digitalis (French)" },
    { value: "english", label: "Author Recorded (British English) " },
  ],
  value: currentVowelTableKey,
  onChange: (value) => onVowelTableChange(value),
};

// Create the UI and mount it
const { container, spectrumCanvas, updateVowelButtons } = createControlPanel(
  paramSliders,
  featureCheckboxes,
  falsettoCheckbox,
  {
    onStart: startAudio,
    onStop: stopAudio,
  },
  vowelButtonConfigs,
  (h, v) => {
    params.vowelBackness = h;
    params.vowelHeight = v;
    updateVoice();
  },
  vowelTableDropdown
);

// Now set the actual handler
onVowelTableChange = (value: string) => {
  currentVowelTableKey = value;
  const newTable = vowelTables[value];
  options.vowelTable = newTable;
  updateVowelButtons(getVowelButtonConfigs(newTable));
  updateVoice();
};

document.getElementById("app")!.appendChild(container);
