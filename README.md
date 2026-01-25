# Cantor Digitalis

A Web Audio implementation of the Cantor Digitalis voice synthesizer, a physically-informed source-filter model for singing voice synthesis.

This library is an implementation of the synthesis pipeline described in [L Feugère et al., 2017](https://hal.sorbonne-universite.fr/hal-01461822v1/document). The research and signal processing design are the work of the original authors; this project provides a web-based implementation using the Web Audio API.

> Lionel Feugère, Christophe d’Alessandro, Boris Doval, Olivier Perrotin. Cantor Digitalis: chironomic
> parametric synthesis of singing. EURASIP Journal on Audio, Speech, and Music Processing, 2017,
> 22, pp.30. ff10.1186/s13636-016-0098-5ff. ffhal-01461822f

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

## Parameters

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

## Live Demo

[DEMO LINK]

## License

ISC
