# Cantor Digitalis

A Web Audio implementation of the Cantor Digitalis voice synthesizer, a physically-informed source-filter model for synthesizing sung vowel sounds. It produces natural-sounding singing voices with high-level controls over pitch, vowel quality, vocal effort, and other perceptually relevant parameters.

This library is an implementation of that synthesis pipeline, as described in [L Feugère et al., 2017](https://hal.sorbonne-universite.fr/hal-01461822v1/document). The research and signal processing design are the work of the original authors; this project provides a web-based implementation using the Web Audio API.

> Lionel Feugère, Christophe d’Alessandro, Boris Doval, Olivier Perrotin. Cantor Digitalis: chironomic
> parametric synthesis of singing. EURASIP Journal on Audio, Speech, and Music Processing, 2017,
> 22, pp.30. ff10.1186/s13636-016-0098-5ff. ffhal-01461822f

The paper also describes a stylus-based interface for real-time control of the synthesizer, which is out of the scope of this library. See the original paper for details.

## Live Demo

To hear the synthesizer in action, see the [demo app](https://edwardbrowncross.github.io/cantor-digitalis/) (source code found in example directory).

## Installation

```bash
npm install cantor-digitalis
```

## Quick Start

```typescript
import { Voice, generateSynthParams } from "cantor-digitalis";

const ctx = new AudioContext();

// Define voice parameters
const params = {
  pitch: 0.5,
  pitchOffset: 60,        // MIDI note (C4)
  vocalEffort: 0.7,
  vowelHeight: 0.5,       // 0 = close (/i/, /u/), 1 = open (/a/)
  vowelBackness: 0.5,     // 0 = back (/u/), 1 = front (/i/)
  tenseness: 0.5,
  breathiness: 0.02,
  roughness: 0.01,
  vocalTractSize: 0.3,
  isFalsetto: false,
};

// Create and start the voice
const synthParams = generateSynthParams(params);
const voice = await Voice.create(ctx, synthParams);
voice.out.connect(ctx.destination);
voice.start();

// Update parameters in real-time
params.vowelHeight = 0.8;
const newSynthParams = generateSynthParams(params);
voice.update(newSynthParams);

// Stop when done
voice.stop();
```

## Parameter Architecture

The synthesizer uses two layers of parameters:

**Perceptual Parameters** (shown in the first table below) are high-level, intuitive controls like `pitch`, `vocalEffort`, and `vowelHeight`. These map to how we perceive and describe voices.

**Synth Parameters** are the low-level values that directly control the audio processing: fundamental frequency (`f0`), formant frequencies (`F1`–`F6`), glottal formant bandwidth (`Bg`), spectral tilt (`Tl1`, `Tl2`), etc. These correspond to the physical and acoustic properties described in the research paper.

The conversion from perceptual parameters to synth parameters is described in section 4 of the referenced paper. For most use cases, set perceptual parameters and convert these to synth parameters via `generateSynthParams()`. For lower-level control of the sound, access the synth-level parameters directly.

Additionally, the synthesizer exposes `AudioParam` objects for the synth-level parameters for sample-accurate automation. Theses can be used for sample-accurate automation (vibrato, pitch glides, amplitude envelopes etc.)

### Perceptual Parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| `pitch` | 0–1 | Normalized position within pitch range |
| `pitchOffset` | MIDI | Base pitch as MIDI note number |
| `vocalEffort` | 0–1 | Perceived loudness/force |
| `vowelHeight` | 0–1 | Tongue height: close to open |
| `vowelBackness` | 0–1 | Tongue position: back to front |
| `tenseness` | 0–1 | Vocal fold adduction |
| `breathiness` | 0–1 | Aspiration noise amount |
| `roughness` | 0–1 | Jitter and shimmer |
| `vocalTractSize` | 0–1 | Vocal tract scaling (child to giant) |
| `isFalsetto` | bool | Laryngeal mechanism (M1/M2) |

### Synth Parameters

These low-level parameters directly control the audio processing and correspond to the physical/acoustic properties in the research paper.

#### Voice Source

| Parameter | Symbol | Unit | Description |
|-----------|--------|------|-------------|
| `f0` | f₀ | Hz | Fundamental frequency (pitch) |
| `Fg` | Fg | Hz | Glottal formant centre frequency |
| `Bg` | Bg | Hz | Glottal formant bandwidth |
| `Ag` | Ag | — | Voice source amplitude |
| `Tl1` | Tl₁ | dB | Spectral tilt (1st stage attenuation at 3 kHz) |
| `Tl2` | Tl₂ | dB | Spectral tilt (2nd stage attenuation at 3 kHz) |
| `An` | An | — | Aspiration noise amplitude |
| `jitterDepth` | — | — | Pitch perturbation depth (0–0.3) |
| `shimmerDepth` | — | — | Amplitude perturbation depth (0–1) |

#### Vocal Tract

| Parameter | Symbol | Unit | Description |
|-----------|--------|------|-------------|
| `F` (formants[0–5]) | F1–F6 | Hz | Formant centre frequencies |
| `B` (formants[0–5]) | B1–B6 | Hz | Formant bandwidths |
| `A` (formants[0–5]) | A1–A6 | — | Formant amplitudes |
| `F_BQ` | F_BQ | Hz | Anti-resonance centre frequency (~4700 Hz) |
| `Q_BQ` | Q_BQ | — | Anti-resonance quality factor (fixed 2.5) |

## Direct AudioParam Control

For sample-accurate automation, access AudioParams directly:

```typescript
const now = ctx.currentTime;

// Pitch glide
voice.source.pulseTrainNode.f0.setValueAtTime(220, now);
voice.source.pulseTrainNode.f0.exponentialRampToValueAtTime(440, now + 0.5);

// Formant sweep
voice.tract.formants[0].F.linearRampToValueAtTime(800, now + 0.3);

// Amplitude envelope
voice.source.glottalFormantNode.Ag.setTargetAtTime(0, now, 0.1);
```

## Component Architecture

For advanced use cases, the individual components of the synthesis pipeline can be instantiated and connected independently. Each component corresponds to a module described in the research paper.

```
Voice
├── source: GlottalFlowDerivative          §3.2   Voice source model
│   ├── pulseTrainNode: PulseTrain         §3.1   Periodic impulse generator
│   ├── glottalFormantNode: GlottalFormant §3.2.1 Glottal pulse shaping filter
│   ├── spectralTiltNode: SpectralTilt     §3.2.2 High-frequency roll-off
│   └── noiseSourceNode: NoiseSource       §3.2.3 Aspiration noise
├── tract: VocalTract                      §3.3   Vocal tract model
│   ├── formants[0–5]: FormantResonator    §3.3.1 Parallel resonant filters
│   └── antiResonanceNode: AntiResonance   §3.3.2 Hypo-pharynx notch filter
└── outputGain: Gain
```

```typescript
import { PulseTrain, FormantResonator } from "cantor-digitalis";

// Create individual components
const pulseTrain = await PulseTrain.create(ctx, { f0: 220, jitterDepth: 0, shimmerDepth: 0 });
const formant = await FormantResonator.create(ctx, { F: 500, B: 100, A: 1 });

// Connect manually
pulseTrain.out.connect(formant.in);
formant.out.connect(ctx.destination);
pulseTrain.start();
```

## License

ISC
