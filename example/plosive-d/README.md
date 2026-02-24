# Plosive /d/ Example

Demonstrates consonant-vowel (CV) synthesis using precise AudioParam automation to produce the syllables "deh", "dee", "dah", "doh", and "doo".

## Features

- **Five CV syllable buttons** — each triggers a voiced alveolar plosive /d/ followed by a different vowel target
- **Multi-phase consonant synthesis** — sequences four distinct phases with precise timing:
  1. **Closure** — vocal tract sealed via cascaded lowpass filters (200 Hz cutoff), producing only a low-frequency voice bar
  2. **Burst** — rapid filter opening with a noise burst simulating the plosive release
  3. **Transition** — F2 and F3 sweep from alveolar locus values (1800 Hz, 2800 Hz) to the vowel targets
  4. **Steady vowel** — target formants held, then amplitude fades out
- **Cascaded lowpass gate** — two BiquadFilter nodes in series (24 dB/oct) simulate vocal tract closure and opening
- **Formant locus transitions** — F2 and F3 start at place-of-articulation values and ramp to vowel-specific targets using `linearRampToValueAtTime()`

## What it demonstrates

- Direct AudioParam scheduling (`setValueAtTime`, `linearRampToValueAtTime`, `cancelScheduledValues`) for sample-accurate event sequencing
- Using `voice.update()` for bulk parameter changes combined with direct AudioParam access for time-critical automation
- Modelling consonant articulation by combining external filter nodes with the voice synthesizer
- Keeping the voice running continuously (with Ag=0 for silence) and triggering sounds by automating amplitude and filter parameters
