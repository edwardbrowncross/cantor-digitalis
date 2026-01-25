We are writing an open-source web implementation of a voice synthesiser called cantor digitalis. It uses a physically informed source-filter model to generate singing voices. The research paper describing the full implementation of the synthesis pipeline is in cantor_digitalis.md. The paper also covers the user interface design for their instrument. We are not concerned with that. This project will be a generic sung vowel synthesiser, which could be used for a variety of applications. We will be testing it as we go with a simple web page. 

## Tools Used

- Typescript for type-safe JavaScript development
- Vite for build tooling and development server
- Web Audio API for audio synthesis and processing
- npm for package management and scripts

## Philosophy

- We will use the Web Audio API directly, avoiding large frameworks to keep control over performance and implementation details.
- We will prioritise code clarity and modularity to facilitate future enhancements and maintenance.
- The modules in the code will map closely to the components described in the research paper.
- We will focus on real-time performance to ensure low latency and high responsiveness in audio synthesis.
- We will follow the research paper as closely as possible, but will make pragmatic decisions where necessary for web implementation.
- Wherever possible, parameters will be live-adjustable (So we will avoid IIR filters if another approach is feasible.)

## Code Structure

Audio processing components live in `src/nodes/`. Some nodes are low level utilities (e.g. gain). Others are higher level, building on these primitives. Each node follows a consistent pattern:

- **Interface**: All nodes implement `Node<T>` from `types.ts`, providing `update(params)`, `destroy()`, and `in`/`out` AudioNode connection points.
- **Factory**: Nodes use an async static `create(ctx, params)` method rather than direct construction, allowing for async setup of Web Audio resources.
- **AudioParams**: All AudioWorklet-based nodes expose their parameters as `AudioParam` properties for sample-accurate automation. The `update()` method uses `setTargetAtTime()` internally
- **Starting and Stopping**: Nodes that generate sound (e.g., oscillators or nodes that are built on top of oscillators) start automatically on creation and can be started and stopped via their own methods.

### AudioParam Automation Rates

Parameters use either a-rate (sample-accurate, per-sample values) or k-rate (per-render-quantum, ~128 samples):

| Rate | Use Case | Parameters |
|------|----------|------------|
| **a-rate** | Pitch/amplitude modulation needing sample accuracy | `f0`, `Ag`, `An` |
| **k-rate** | Filter parameters that change smoothly | `Fg`, `Bg`, `Tl1`, `Tl2`, `F`, `B`, `A`, `Q`, `jitterDepth`, `shimmerDepth` |

## Node Hierarchy

The voice synthesizer is built from a hierarchy of nodes. Leaf nodes are AudioWorklet-based processors, while composite nodes combine multiple children.

```
Voice
├── source: GlottalFlowDerivative
│   ├── pulseTrainNode: PulseTrain
│   │   └── AudioParams: f0, jitterDepth, shimmerDepth
│   ├── glottalFormantNode: GlottalFormant
│   │   └── AudioParams: Fg, Bg, Ag
│   ├── spectralTiltNode: SpectralTilt
│   │   └── AudioParams: Tl1, Tl2
│   └── noiseSourceNode: NoiseSource
│       └── AudioParams: An
├── tract: VocalTract
│   ├── formants[0..5]: FormantResonator
│   │   └── AudioParams: F, B, A
│   └── antiResonanceNode: AntiResonance
│       └── AudioParams: F, Q
└── outputGain: Gain
    └── AudioParams: gain
```

### Accessing AudioParams

Composite nodes expose their children via getters, allowing hierarchical access to any AudioParam:

```typescript
// Access pulse train frequency
voice.source.pulseTrainNode.f0

// Access first formant frequency
voice.tract.formants[0].F

// Access anti-resonance Q factor
voice.tract.antiResonanceNode.Q
```

## Instantiation and Control Examples

### Creating a Voice

```typescript
import { Voice } from "./nodes/voice";

const ctx = new AudioContext();

const voice = await Voice.create(ctx, {
  source: {
    f0: 220,
    Fg: 110,
    Bg: 50,
    Ag: 1,
    Tl1: 10,
    Tl2: 5,
    An: 0,
    jitterDepth: 0,
    shimmerDepth: 0,
  },
  tract: {
    formants: [
      { F: 800, B: 80, A: 1 },
      { F: 1200, B: 90, A: 0.5 },
      { F: 2500, B: 120, A: 0.3 },
      { F: 3500, B: 150, A: 0.2 },
      { F: 4500, B: 200, A: 0.1 },
      { F: 5500, B: 250, A: 0.05 },
    ],
    F_BQ: 4700,
    Q_BQ: 2.5,
  },
  outputGain: 0.5,
});

voice.out.connect(ctx.destination);
voice.start();
```

### Using update() for Simple Control

The `update()` method provides a simple way to change all parameters at once:

```typescript
voice.update({
  source: { f0: 440, Fg: 220, Bg: 50, Ag: 1, Tl1: 8, Tl2: 4, An: 0.1, jitterDepth: 0.02, shimmerDepth: 0.05 },
  tract: {
    formants: [
      { F: 300, B: 60, A: 1 },
      { F: 2300, B: 100, A: 0.4 },
      // ... remaining formants
    ],
    F_BQ: 4700,
    Q_BQ: 2.5,
  },
});
```

### Direct AudioParam Access for Automation

For sample-accurate control, access AudioParams directly:

```typescript
const now = ctx.currentTime;

// Instant change
voice.source.pulseTrainNode.f0.setValueAtTime(440, now);

// Linear ramp (pitch glide over 1 second)
voice.source.pulseTrainNode.f0.setValueAtTime(440, now);
voice.source.pulseTrainNode.f0.linearRampToValueAtTime(880, now + 1);

// Exponential ramp (more natural for pitch)
voice.source.pulseTrainNode.f0.setValueAtTime(440, now);
voice.source.pulseTrainNode.f0.exponentialRampToValueAtTime(880, now + 1);

// Smooth decay (amplitude fade-out with time constant 0.1s)
voice.source.glottalFormantNode.Ag.setTargetAtTime(0, now, 0.1);

// Formant sweep
voice.tract.formants[0].F.setValueAtTime(300, now);
voice.tract.formants[0].F.linearRampToValueAtTime(800, now + 0.5);
```

### Connecting LFOs for Modulation

AudioParams can be modulated by connecting audio-rate signals:

```typescript
// Create vibrato LFO (6 Hz, ±10 Hz depth)
const vibrato = ctx.createOscillator();
vibrato.frequency.value = 6;
const vibratoGain = ctx.createGain();
vibratoGain.gain.value = 10; // ±10 Hz

vibrato.connect(vibratoGain);
vibratoGain.connect(voice.source.pulseTrainNode.f0);
vibrato.start();

// The f0 AudioParam now has vibrato applied on top of its base value
voice.source.pulseTrainNode.f0.setValueAtTime(440, ctx.currentTime);
```

### Creating Individual Nodes

Lower-level nodes can be created and used independently:

```typescript
import { PulseTrain } from "./nodes/pulse-train";
import { FormantResonator } from "./nodes/formant-resonator";

// Create a pulse train
const pulseTrain = await PulseTrain.create(ctx, {
  f0: 220,
  jitterDepth: 0.01,
  shimmerDepth: 0.02,
});

// Create a formant filter
const formant = await FormantResonator.create(ctx, {
  F: 500,
  B: 100,
  A: 1,
});

// Connect them
pulseTrain.out.connect(formant.in);
formant.out.connect(ctx.destination);

pulseTrain.start();
```

## Key voice parameters

The synthesiser will expose the following key parameters for voice synthesis. They will be fed into all relevant modules.

| Parameter | Symbol | Range | Description | Affects |
|-----------|--------|-------|-------------|---------|
| **Pitch** | P | 0–1 | Normalised melodic position across the pitch range | Combined with P₀ to compute f₀. Affects glottal formant (Fg, Bg), larynx position adaptation (formant scaling factor K), and first/second formant tuning. |
| **Vocal Effort** | E | 0–1 | Perceived force/dynamics of the voice, analogous to loudness | Voice source amplitude (Ag), spectral tilt (Tl₁, Tl₂), open quotient (Oq), first formant tuning, noise amplitude (when unvoiced), and long-term perturbation scaling. |
| **Vowel Height** | H | 0–1 | Vertical tongue position: 0 = close (e.g., /i/, /u/), 1 = open (e.g., /a/) | Formant frequencies (F1–F6), bandwidths (B1–B6), and amplitudes (A1–A6) via vowel table interpolation. |
| **Vowel Backness** | V | 0–1 | Horizontal tongue position: 0 = back (e.g., /u/), 1 = front (e.g., /i/) | Formant frequencies, bandwidths, and amplitudes via vowel table interpolation. |
| **Tenseness** | T | 0–1 | Degree of vocal fold adduction: 0 = lax, 1 = tense | Open quotient (Oq) and asymmetry coefficient (αm), which determine glottal formant frequency (Fg) and bandwidth (Bg). |
| **Breathiness** | B | 0–1 | Amount of aspiration noise from glottal leakage | Noise source amplitude (An) in the voice source model. |
| **Roughness** | R | 0–1 | Structural aperiodicities causing hoarse/rough voice quality | Jitter (random f₀ perturbation, up to 30%) and shimmer (random amplitude perturbation, up to 100%). |
| **Vocal Tract Size** | S | 0–1 | Apparent size of the vocal tract (0 = small/child, 1 = large/giant) | Scale factor αS (0.5–2.2) applied to all formant centre frequencies (F1–F6) and anti-formant frequency (F_BQ). |
| **Laryngeal Mechanism** | M | 1 or 2 | Vocal fold vibration mode: M=1 chest voice, M=2 falsetto | Baseline values for Oq and αm, and spectral tilt coefficients (Tl₁, Tl₂). |

## Internal voice parameters

These intermediate and low-level parameters are computed from the key voice parameters above and fed directly into the synthesis modules. They are not exposed to the user but are essential for understanding the signal flow.

### Intermediate Parameters

| Parameter | Symbol | Unit | Description | Derived From |
|-----------|--------|------|-------------|--------------|
| **Open Quotient** | Oq | — | Fraction of glottal cycle during which glottis is open | T, E, M |
| **Asymmetry Coefficient** | αm | — | Ratio of opening phase to open phase duration | T, M |
| **Vocal Tract Scale** | αS | — | Multiplier for formant frequencies (0.5–2.2) | S |
| **Larynx Position Factor** | K | — | f₀-dependent formant scaling (~0.975–1.1) | f₀ |
| **Perturbed Effort** | Ep | — | Vocal effort with heartbeat and slow perturbations applied | E, perturbations |

### Voice Source Parameters

| Parameter | Symbol | Unit | Description | Derived From |
|-----------|--------|------|-------------|--------------|
| **Fundamental Frequency** | f₀ | Hz | Pitch of the voice, with perturbations | P, P₀, R (jitter), perturbations |
| **Glottal Formant Frequency** | Fg | Hz | Centre frequency of glottal resonance: f₀/(2·Oq) | f₀, Oq |
| **Glottal Formant Bandwidth** | Bg | Hz | Bandwidth of glottal resonance | f₀, Oq, αm |
| **Source Amplitude** | Ag | — | Amplitude of voiced excitation, with shimmer | E, Oq, R |
| **Spectral Tilt 1** | Tl₁ | dB | First stage high-frequency attenuation at 3 kHz | E, M |
| **Spectral Tilt 2** | Tl₂ | dB | Second stage high-frequency attenuation at 3 kHz | E, M |
| **Noise Amplitude** | An | — | Amplitude of aspiration noise | B, E |

### Vocal Tract Parameters

| Parameter | Symbol | Unit | Description | Derived From |
|-----------|--------|------|-------------|--------------|
| **Formant Frequencies** | F1–F6 | Hz | Centre frequencies of vocal tract resonances | H, V, αS, K, f₀, E |
| **Formant Bandwidths** | B1–B6 | Hz | Bandwidths of vocal tract resonances | H, V |
| **Formant Amplitudes** | A1–A6 | dB | Gains of vocal tract resonances | H, V, f₀ (for correction) |
| **Anti-Formant Frequency** | F_BQ | Hz | Centre frequency of hypo-pharynx notch (nom. 4700 Hz) | αS |
| **Anti-Formant Q** | Q_BQ | — | Quality factor of hypo-pharynx notch (fixed 2.5) | — |

## Synthesis Modules

### Glottal Flow Derivative Modules

The glottal flow derivative model represents the sound source produced by the vibrating vocal folds. It consists of a voiced component (periodic pulses shaped by the glottal formant and spectral tilt) and an unvoiced component (filtered noise for breathiness). The overall structure is described in Section 3.2 of the paper.

#### Pulse Train

The voiced excitation source is a periodic impulse train at the fundamental frequency f₀. In the paper's spectral formulation (Section 3.1), this appears as a Dirac comb: Σδ(f − n·f₀), representing energy at each harmonic frequency. In the time domain, this corresponds to unit impulses occurring once per pitch period (1/f₀ seconds). The impulse train is the input to the glottal formant filter, which shapes each impulse into the characteristic glottal pulse waveform.

**Paper reference:** Section 3.1 (spectral equation showing the Dirac comb term)

**Input parameters:**
- **f₀** (fundamental frequency) — derived from P, P₀, with perturbations from jitter, heartbeat, and slow drift applied

#### Glottal Formant (GF)

The glottal formant represents the main spectral peak of the voice source, corresponding to the resonance characteristics of the glottal pulse. It is implemented as a 2-pole 1-zero digital resonant filter in series with a 1-zero differentiation filter. The filter shapes the periodic impulse train (at frequency f₀) to produce the characteristic spectrum of the glottal flow derivative.

**Paper reference:** Section 3.2.1 (filter structure), Section 4.2.2 (parameter mapping)

**Input parameters:**
- **f₀** (fundamental frequency) — derived from P, P₀, and perturbations (jitter, heartbeat, slow drift)
- **Fg** (glottal formant centre frequency) — computed as f₀ / (2·Oq)
- **Bg** (glottal formant bandwidth) — computed from f₀, Oq, and αm
- **Ag** (source amplitude) — derived from E, Oq, and R (shimmer)

The intermediate parameters Oq (open quotient) and αm (asymmetry coefficient) are computed from T (tenseness), E (vocal effort), and M (laryngeal mechanism).

#### Spectral Tilt (ST)

The spectral tilt filter models the high-frequency roll-off of the glottal source spectrum. Louder, more pressed phonation has less spectral tilt (brighter sound), while softer or breathier phonation has more tilt (darker sound). It is implemented as a cascade of two 1-pole 1-zero low-pass filters, each providing attenuation specified in dB at 3000 Hz.

**Paper reference:** Section 3.2.2 (filter structure), Section 4.2.3 (parameter mapping)

**Input parameters:**
- **Tl₁** (first tilt stage attenuation in dB at 3 kHz) — derived from E and M
- **Tl₂** (second tilt stage attenuation in dB at 3 kHz) — derived from E and M

#### Noise Source (NS)

The noise source provides the aspiration component for breathy voice qualities. It consists of Gaussian white noise filtered through a bandpass filter (Butterworth, 1000–6000 Hz cutoff frequencies) and scaled by an amplitude factor. The noise can be modulated by the glottal flow derivative for mixed voice qualities.

**Paper reference:** Section 3.2.3 (filter structure), Section 4.2.5 (parameter mapping)

**Input parameters:**
- **An** (noise amplitude) — derived directly from B (breathiness), with scaling by E when voicing is off

#### Perturbation Generators

Natural voices exhibit small random variations in pitch and amplitude. These perturbations add liveliness and can simulate roughness or hoarseness. The perturbations are applied to f₀ (affecting the pulse train period) and to Ag (affecting pulse amplitudes).

**Paper reference:** Section 4.1.2 (jitter), Section 4.1.3 (long-term f₀ perturbations), Section 4.2.1 (amplitude perturbations), Section 4.2.4 (shimmer)

**Input parameters:**
- **R** (roughness) — controls jitter magnitude (up to 30% of f₀) and shimmer magnitude (up to 100% of Ag)
- **E** (vocal effort) — scales heartbeat and slow perturbation amplitudes (less perturbation at high effort)

### Vocal Tract Modules

The vocal tract model shapes the glottal source spectrum to produce recognisable vowels and voice timbres. It consists of parallel formant resonators (simulating the resonances of the oral cavity) followed by a cascaded anti-resonance filter (simulating the effect of the hypo-pharynx). The overall structure is described in Section 3.3 of the paper.

#### Formant Resonators (R1–R6)

Six parallel bandpass filters model the resonant frequencies of the vocal tract. Each formant is implemented as a 2-pole 2-zero digital resonator with controllable centre frequency (Fi), bandwidth (Bi), and amplitude (Ai). The first three formants (F1–F3) primarily determine vowel identity, while the higher formants (F4–F6) contribute to voice timbre and individual vocal character. Grouping F3, F4, and F5 closely together can produce the "singer's formant" characteristic of trained classical voices.

**Paper reference:** Section 3.3.1 (filter structure), Section 4.3.1 (generic formant values), Section 4.3.6 (bandwidths), Section 4.3.7 (amplitudes)

**Input parameters:**
- **F1–F6** (formant centre frequencies) — interpolated from vowel table using H and V, then scaled by αS (from S) and K (from f₀), with F1/F2 tuning rules applied
- **B1–B6** (formant bandwidths) — interpolated from vowel table using H and V
- **A1–A6** (formant amplitudes) — interpolated from vowel table, with attenuation applied when harmonics coincide with formant frequencies

#### Vowel Interpolation

The formant parameters for arbitrary vowels are computed by 2D interpolation across a table of canonical vowel values. The table (Table 3 in the paper) defines centre frequencies, bandwidths, and amplitudes for ten French vowels positioned in the vowel space by their height (H) and backness (V) coordinates.

**Paper reference:** Section 4.3.1 (vowel table and interpolation)

**Input parameters:**
- **H** (vowel height) — selects vertical position in vowel space
- **V** (vowel backness) — selects horizontal position in vowel space

#### Formant Tuning Rules

Singers adapt their formant frequencies to match or approach harmonic frequencies, particularly at high pitches. The first formant is tuned upward with vocal effort (approximately 3.5 Hz/dB equivalent) and constrained to stay above f₀ + 50 Hz. The second formant is similarly constrained to stay above 2·f₀ + 50 Hz. Additionally, all formants are scaled by a larynx position factor K that increases slightly with f₀ (about 10% shift between 200 Hz and 1000 Hz).

**Paper reference:** Section 4.3.3 (larynx position adaptation), Section 4.3.4 (F1 tuning), Section 4.3.5 (F2 tuning)

**Input parameters:**
- **f₀** (fundamental frequency) — determines K factor and minimum F1/F2 values
- **E** (vocal effort) — raises F1 (up to +70 Hz at maximum effort)

#### Formant Amplitude Correction

When a harmonic of f₀ falls close to a formant centre frequency, the resulting resonance can cause unnatural peaks. To prevent this, formant amplitudes are automatically attenuated when harmonics approach the formant frequencies. The attenuation is proportional to proximity, with maximum reduction of 10–25 dB.

**Paper reference:** Section 4.3.7 (amplitude attenuation rule)

**Input parameters:**
- **f₀** (fundamental frequency) — determines harmonic positions
- **F1–F3** (formant frequencies) — checked for proximity to harmonics

#### Anti-Resonance Filter (BQ)

A notch filter in cascade with the parallel formants models the anti-resonances caused by the hypo-pharynx cavity (the space between the larynx and the pharynx). This creates spectral dips at approximately 2.5–3.5 kHz and 4–5 kHz that contribute to natural voice timbre. The filter is implemented as a bi-quadratic (2-pole 2-zero) notch with controllable centre frequency and Q factor.

**Paper reference:** Section 3.3.2 (filter structure), Section 4.3.8 (parameter values)

**Input parameters:**
- **F_BQ** (anti-formant centre frequency) — nominally 4700 Hz, scaled by αS (from S)
- **Q_BQ** (anti-formant quality factor) — fixed at 2.5