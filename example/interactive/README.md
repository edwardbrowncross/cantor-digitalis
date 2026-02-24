# Interactive Voice Synthesizer

A full-featured control panel for exploring the cantor-digitalis voice synthesizer in real time.

## Features

- **Perceptual parameter sliders** — adjust pitch (MIDI note), vocal effort, vowel height, vowel backness, tenseness, breathiness, roughness, and vocal tract size
- **Vowel space buttons** — click IPA vowel symbols to jump to preset vowel positions (height and backness)
- **Vowel table switching** — choose between the default French vowel table and an English vowel table
- **Formant editor** — directly edit the frequency and bandwidth of the five closest-vowel formants
- **Synthesis option toggles** — enable/disable individual synthesis behaviours:
  - Harmonic coincidence attenuation
  - Formant frequency scaling (larynx position K and vocal tract size αS)
  - F1 tuning (effort-based raise + f0 floor constraint)
  - F2 tuning (2*f0 floor constraint)
  - Anti-resonance scaling
- **Falsetto toggle** — switch between chest voice (M=1) and falsetto (M=2) laryngeal mechanism
- **Master gain control** — adjust output volume independently of vocal effort
- **Real-time spectrum visualization** — FFT-based spectrum display overlaid with the synthesizer's computed frequency response curve
- **Start/stop controls** — start and stop the voice with browser audio context user-gesture handling

## What it demonstrates

- Using `generateSynthParams()` to convert perceptual parameters into low-level synthesis parameters
- Calling `voice.update()` for real-time parameter changes
- Using `voice.getFrequencyResponse()` for live spectrum overlay
- Supplying a custom vowel table via `SynthOptions`
- Direct manipulation of vowel table formant entries for fine-tuning
