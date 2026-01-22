# Cantor Digitalis: Chironomic Parametric Synthesis of Singing

**Authors:** Lionel Feugère, Christophe d'Alessandro, Boris Doval, Olivier Perrotin

**Published:** EURASIP Journal on Audio, Speech, and Music Processing (2017) 2017:2

**DOI:** 10.1186/s13636-016-0098-5

---

## Abstract

Cantor Digitalis is a performative singing synthesizer that is composed of two main parts: a chironomic control interface and a parametric voice synthesizer. The control interface is based on a pen/touch graphic tablet equipped with a template representing vocalic and melodic spaces. Hand and pen positions, pen pressure, and a graphical user interface are assigned to specific vocal controls. This interface allows for real-time accurate control over high-level singing synthesis parameters. The sound generation system is based on a parametric synthesizer that features a spectral voice source model, a vocal tract model consisting of parallel filters for vocalic formants and cascaded with anti-resonance for the spectral effect of hypo-pharynx cavities, and rules for parameter settings and source/filter dependencies between fundamental frequency, vocal effort, and formants. Because Cantor Digitalis is a parametric system, every aspect of voice quality can be controlled (e.g., vocal tract size, aperiodicities in the voice source, vowels, and so forth). It offers several presets for different voice types. Cantor Digitalis has been played on stage in several public concerts, and it has also been proven to be useful as a tool for voice pedagogy.

---

## 1. Introduction

Cantor Digitalis is a singing instrument, i.e., a performative singing synthesis system. It allows for expressive musical control of high-quality vocal sounds. Expressive musical control is provided by an effective human-computer interface that captures the player's gestures and converts them into synthesis control parameters. High-quality vocal sounds are produced by the synthesis engine, which features a specially designed formant synthesizer and an elaborate set of singing rules.

Cantor Digitalis is a musical instrument, and it is regularly played on stage by Chorus Digitalis, the choir of Cantor Digitalis. The expressiveness and sound quality of this innovative musical instrument have been recognized, as it was awarded the first prize of the 2015 International Margaret Guthman Musical Instrument Competition (Georgia Institute of Technology). Cantor Digitalis is distributed as a free software, accompanied by a detailed documentation.

The sound synthesis components of Cantor Digitalis are in the tradition of formant synthesis. Apart from tape-based music using recorded voices and vocoders, synthetic voices first appeared in contemporary music pieces thanks to the "Chant" program. "Chant" was based on a formant voice synthesizer and synthesis by rules, i.e., a parametric model of voice production. The main advantage of parametric synthesis is its flexibility and economy in terms of memory and computational load. A formant synthesizer is preferred for Cantor Digitalis because flexibility and real time are the main issues for performative singing synthesis.

The graphic tablet has been proposed for approximately a decade for controlling intonation and voice source variation. This interface appeared as a very effective choice. It has been extensively tested for intonation control in speech and singing synthesis. Additionally, this interface allows much expressiveness because it takes advantage of the accuracy and precision acquired through writing/drawing gestures.

---

## 2. Chironomic Control of the Singing Voice

The Cantor Digitalis architecture is composed of three layers: the interface, the synthesis/mapping rules, and the parametric synthesizer. This architecture follows the path of music production, from the player to sound. Initially, the musician plans to produce a given musical phrase, with a given vowel, given dynamics, given voice quality, and so forth. The planned musical task is then expressed through hand gestures related to the interface, i.e., through motions of a stylus and fingers on the graphic tablet. The interface captures high-level parameters that are perceptually relevant to the player, such as the vowel quality or pitch. These high-level parameters are then converted into low-level synthesis parameters through a layer of synthesis/mapping rules. Low-level synthesis parameters drive the parametric voice synthesizer for sound sample production.

### 2.1 Singing Voice Parameters

Cantor Digitalis is restricted to vocalic sounds. The corresponding parameters are pitch, voice force (or vocal effort), voice quality, and vowel label. The main perceived dimensions of voice quality are voice tension (lax/tense voice), noise (aspiration noise in the voice resulting in breathiness and structural aperiodicities such as vocal jitter or shimmer resulting in roughness or hoarseness), and vocal tract size (or larynx height). All high-level parameters are listed below:

- **Pitch P**: corresponds to the perceived melodic dimension of voice sounds. It is often the most important musical dimension.
- **Vocal effort E**: corresponds to the dynamics, i.e., perceived force of vocal sounds. It is also an essential musical dimension.
- **Vowel height H**: defines the openness or closeness of the vowel and corresponds to the vertical axis in the vocalic triangle. This dimension is related to the vertical position of the tongue.
- **Vowel backness V**: defines the front-back position of the vowel and corresponds to the horizontal axis of the vocalic triangle.
- **Roughness R**: due to structural aperiodicities, i.e., random pitch period or amplitude perturbations. It defines the hoarse or rough quality of the voice.
- **Breathiness B**: leakage at the glottis produces aspiration or breath noise in the voice.
- **Tenseness T**: defines the tense/lax quality of the voice, i.e., the degree of adduction/abduction of the vocal folds.
- **Vocal tract size S**: defines the apparent vocal tract size of the singer.
- **Pitch offset P₀**: to play either low (e.g., bass) or high (e.g., soprano) voices.
- **Laryngeal vibration mechanism M**: defines the vibration mode of the vocal folds (chest M=1 or falsetto M=2).

All these dimensions are expressed in normalized units (between 0 and 1), except P₀ and M.

### 2.2 Chironomic Control: An Augmented Graphic-Touch Tablet

A Wacom Intuos 5M-touch tablet has been chosen as the interface, allowing for bi-manual chironomic control. The tablet detects the position of the pen pressure over the 2D plan, as well as the finger position over the surface. This interface is preferred for two main reasons:

1. It is reactive, with no noticeable latency (5 ms with pen, 20 ms with finger)
2. It provides fine spatial resolution (5080 lines per inch, 0.005 mm)

For increased intonation accuracy, the tablet is equipped with visual references. A printed template is superimposed on the active zone with pitch and vowel targets.

### 2.3 Voice Source Control

Melody and dynamics are associated with the tablet's pen handled by the preferred hand. **Pitch P** is controlled by the X-stylus position in a left-right organization similar to a keyboard. The exact pitch corresponds to the printed key center line. A dynamic intonation correction algorithm is available to help less experienced users.

**Vocal effort E** is the second main voice source parameter. It controls musical dynamics and is mapped to pen pressure. A vocal effort threshold $E_{thr}$ is introduced under which no voiced sound is produced, analogous to the phonation threshold in natural voice.

### 2.4 Control of the Vocalic Space

Vowel label control is assigned to the non-preferred hand. The vocalic space is represented by a two-dimensional vocalic triangle or trapezium. The two dimensions of the vocalic space H and V can be controlled by the two-dimensional positions of a finger (y and x, respectively).

### 2.5 Control of the Voice Quality

Voice quality dimensions are controlled using a GUI on the computer screen. Each parameter (roughness R, tension T, breathiness B, vocal tract size S, and laryngeal vibratory mechanism M) corresponds to a slider.

**Table 1: High-level parameter control**

| Parameter | Voice dimension | Control |
|-----------|----------------|---------|
| **Chironomic control** | | |
| P | Pitch | stylus x |
| E | Vocal effort | stylus pressure |
| H | Vowel height | finger y |
| V | Vowel backness | finger x |
| **Graphical user interface** | | |
| R | Roughness | preset, GUI |
| T | Tension | preset, GUI |
| B | Breathiness | preset, GUI |
| S | Vocal tract size | preset, GUI |
| P₀ | Pitch offset | preset, GUI |
| M | Voice mechanism | preset, GUI |

---

## 3. Parametric Formant Synthesizer

### 3.1 Formant Synthesizer Architecture

The sound of Cantor Digitalis is computed by a formant synthesizer, based on the linear model of speech production. A new parallel/series formant synthesizer has been designed. According to the source-filter theory of speech production, the vocal sound S in the spectral domain is the product of a glottal flow derivative model G and a vocal tract model V:

$$S(f) = G(f) \cdot V(f) = \left[ \sum_n \delta(f - nf_0) \cdot GF(f) \cdot ST(f) + A_n \sum_n \delta(f - nf_0) \cdot GF(f) \cdot ST(f) \otimes N(f) \cdot NS(f) \right] \times BQ(f) \sum_{i=1}^5 R_i(f)$$

The glottal flow derivative model G is composed of:
- Periodic pulses weighted by a factor $A_g$
- Filtered by the glottal formant response GF and spectral tilt response ST
- A Gaussian white-noise N, filtered by a bandpass filter NS and pondered by factor $A_n$

The vocal tract model V is the sum of resonant filter responses $R_i$ pondered by an anti-resonance filter response BQ.

### 3.2 Voice Source Model

A parametric model of the glottal flow derivative, equivalent to the LF model, is used for the voiced source. The model is described in the spectral domain with five parameters: fundamental frequency $f_0$, glottal formant frequency $F_g$ and bandwidth $B_g$, maximum excitation $A_g$, and high frequency attenuations $Tl_1$ and $Tl_2$ (spectral tilt).

#### 3.2.1 Glottal Formant

The glottal formant represents the main source-related spectral peak. The transfer function is computed using a 2-pole 1-zero digital resonant filter in series with a 1-zero derivation filter ($T_s$ is the sampling period, 1/96000 sec):

$$GF(z) = -A_g z^{-1} (1 - z^{-1}) \frac{1}{1 - 2e^{-\pi B_g T_s}\cos(2\pi F_g T_s)z^{-1} + e^{-2\pi B_g T_s}z^{-2}}$$

#### 3.2.2 Spectral Tilt

A 2-pole 2-zero low-pass filter accounts for the spectral slope in high frequencies:

$$ST(z) = ST_1(z) \times ST_2(z)$$

where

$$ST_i(z) = \frac{1 - (\nu_i - \sqrt{\nu_i^2 - 1})}{1 - (\nu_i - \sqrt{\nu_i^2 - 1})z^{-1}}, \quad i = 1, 2$$

$$\nu_i = \frac{1 - \cos(2\pi \cdot 3000 \cdot T_s) - 1}{10^{Tl_i/10} - 1}$$

with $Tl_i$ (i = 1, 2) corresponding to attenuation in dB at 3000 Hz.

#### 3.2.3 Unvoiced Source Component

The unvoiced source component is computed using Gaussian white noise N filtered by a wide band-pass second-order filter NS (Butterworth filter with 1000 and 6000 Hz cutoff frequencies). This noise, with amplitude $A_n$, is modulated by the glottal flow derivative for mixed voice source qualities.

### 3.3 Vocal Tract Model

The vocal tract is computed with a cascade/parallel formant synthesizer allowing fine adjustment of voice spectrum and control of vowel quality, vocal tract size, and singer individuality.

#### 3.3.1 Vocal Tract Resonances

The parallel components are composed of six band-pass filters, each corresponding to one formant. Each formant is a 2-pole 2-zero digital resonator filter $R_i$ with transfer function:

$$R_i(z) = A_i (1 - e^{-\pi B_i T_s}) \frac{1 - e^{-\pi B_i T_s}z^{-2}}{1 - 2e^{-\pi B_i T_s}\cos(2\pi F_i T_s)z^{-1} + e^{-2\pi B_i T_s}z^{-2}}$$

where $F_i$ is formant central frequency, $B_i$ is formant bandwidth, and $A_i$ is gain, for i ∈ [1, 6].

The first three formants contribute to vowel identification. The remaining three formants contribute to voice timbre. The "singing formant" can be produced by grouping the third, fourth, and fifth formants.

#### 3.3.2 Hypo-pharynx Anti-resonances

The presence of the hypo-pharynx creates anti-resonances at approximately 2.5–3.5 kHz and 4–5 kHz. An anti-formant is disposed in cascade after the parallel formant filters. A second-order fixed anti-resonance is computed by a notch filter (bi-quadratic second-order filter):

$$BQ(z) = \frac{1 + \beta_{BQ}z^{-1} + z^{-2}}{1 + \alpha_{BQ} + \beta_{BQ}z^{-1} + (1 - \alpha_{BQ})z^{-2}}$$

where

$$\alpha_{BQ} = \frac{\sin(2\pi F_{BQ}T_s)}{2Q_{BQ}}$$

$$\beta_{BQ} = -2\cos(2\pi F_{BQ}T_s)$$

**Table 4: Low-level synthesis parameters**

| Parameter | System | Description | Unit |
|-----------|--------|-------------|------|
| $f_0$ | Voice source GF | Voice fundamental frequency | Hz |
| $F_g$ | Voice source GF | Glottal formant center frequency | Hz |
| $B_g$ | Voice source GF | Glottal formant bandwidth | Hz |
| $A_g$ | Voice source GF | Voice source amplitude | 1 |
| $Tl_1, Tl_2$ | Voice source ST | Voice source spectral tilt | dB |
| $A_n$ | Noise source NS | Aspiration noise amplitude | 1 |
| $F_1$–$F_6$ | Vocal tract R1-R6 | Formant center frequency | Hz |
| $B_1$–$B_6$ | Vocal tract R1-R6 | Formant bandwidth | Hz |
| $A_1$–$A_6$ | Vocal tract R1-R6 | Formant amplitude | dB |
| $F_{BQ}$ | Vocal tract BQ | Anti-formant center frequency | Hz |
| $Q_{BQ}$ | Vocal tract BQ | Anti-formant quality factor | 1 |

---

## 4. Voice Dimensions to Parameter Mapping

This section details the mapping between voice dimensions and synthesis parameters. Voice dimensions are managed by actions on the chironomic interface and GUI. The interplay between voice dimensions is intricate for some parameters, incorporating knowledge from singing voice analysis literature including formant tuning, vocal effort modeling, periodicity perturbations, voice mechanism modeling, and voice type settings.

### 4.1 Fundamental Frequency

The fundamental frequency $f_0$ is mainly driven by pitch dimension P, pitch offset $P_0$, and several perturbations.

#### 4.1.1 Pitch Control

Pitch perception is very accurate, with thresholds around 5 to 9 cents. The mapping of approximately 3 octaves (35 semitones) to the X-axis provides pitch resolution of 0.08 cents for the smallest spatial step (0.005 mm). The absolute pitch is:

$$P_{abs} = P_0 + 35P$$

#### 4.1.2 Jitter

Jitter (random perturbation of $f_0$) is useful for hoarse voice quality. It is computed as a percentage of $f_0$ and controlled by roughness R. A maximum of 30% jitter is allowed. Jitter is computed with centered random Gaussian noise generator $N_R$ with unity variance.

#### 4.1.3 Long-term f₀ Perturbations

Slow and small amplitude random perturbations contribute to more lively sound quality. These include heartbeat perturbations and other muscular instabilities. The perturbation due to heartbeat is modeled as:

$$p_{heart} = A_{heart}e^{-\beta t} \begin{cases} \cos(8\pi f_c t - \pi/2) & \text{for } t \in [0; 1/(4f_c)] \\ \cos(4\pi f_c t + \pi/2) & \text{for } t \in [1/(4f_c); 1/f_c] \end{cases}$$

where $\beta = 0.001$ ms⁻¹ is damping coefficient, $A_{heart}$ depends on vocal effort, and $f_c$ is heartbeat frequency (typically 1 Hz).

Other perturbations ($p_{slow}$) are added as pink noise low-passed at 5 Hz, limited to 0.2 semitone for low vocal effort and 0.01 semitone for high vocal effort.

In summary, $f_0$ is computed as:

$$f_0 = 440 \cdot 2^{(P_0 + 35P + p_{heart} + p_{slow} - 69)/12}(1 + 0.3RN_R)$$

### 4.2 Voice Source

Voice source parameters are computed as functions of voice parameters P, T, E, B, and R.

#### 4.2.1 Long-term Voice Amplitude Perturbations

Similar to $f_0$, perturbations affect sound level. They are applied at the output of control parameter E:

$$E_p = E + p_{heart} + p_{slow}$$

#### 4.2.2 Glottal Formant Central Frequency and Bandwidth

The glottal formant characteristics depend on open quotient $O_q$ and asymmetry coefficient $\alpha_m$:

$$F_g = \frac{f_0}{2O_q}$$

$$B_g = \frac{f_0}{O_q \tan(\pi(1 - \alpha_m))}$$

$O_q$ and $\alpha_m$ are expressed from tension T and perturbed vocal effort $E_p$. For different laryngeal mechanisms:

$$O_q = \begin{cases} 10^{-2(1-O_{q0})T} & \text{if } T \leq 0.5 \\ 10^{2O_{q0}(1-T)-1} & \text{if } T > 0.5 \end{cases}$$

where $O_{q0} = 0.903 - 0.426E_p$ for M=1 and $O_{q0} = 0.978 - 0.279E_p$ for M=2.

$$\alpha_m = \begin{cases} 0.5 + 2(\alpha_{m0} - 0.5)T & \text{if } T \leq 0.5 \\ 0.9 - 2(0.9 - \alpha_{m0})(1-T) & \text{if } T > 0.5 \end{cases}$$

where $\alpha_{m0} = 0.66$ for M=1 and $\alpha_{m0} = 0.55$ for M=2.

#### 4.2.3 Voice Spectral Tilt

Spectral tilt is controlled by two parameters $Tl_1$ and $Tl_2$:

For M=1:
$$Tl_1 = 27 - 21E_p \text{ dB}$$
$$Tl_2 = 11 - 11E_p \text{ dB}$$

For M=2:
$$Tl_1 = 45 - 36E_p \text{ dB}$$
$$Tl_2 = 20 - 18.5E_p \text{ dB}$$

#### 4.2.4 Voicing Amplitude and Shimmer

Voice sound production occurs when airflow exceeds a phonation threshold ($E_{thr} = 0.2$). Shimmer (random perturbation of $A_g$) is controlled by roughness R (maximum 100%). $A_g$ is computed as:

$$A_g = \begin{cases} 0 & \text{if } E_p \leq E_{thr} - 0.05 \cdot phon \\ \frac{(1-C_{A_g})\frac{E_p - E_{thr}}{1 - E_{thr}} + C_{A_g}}{O_q}(1 + RN_R) & \text{if } E_p > E_{thr} - 0.05 \cdot phon \end{cases}$$

where $C_{A_g} = 0.2$ represents signal amplitude at phonation threshold.

#### 4.2.5 Noise Amplitude

Breathiness dimension B directly controls $A_n$ parameter:

$$A_n = \begin{cases} B & \text{if voicing is on} \\ 1.5E_pB & \text{if voicing is off} \end{cases}$$

### 4.3 Vocal Tract Formants

#### 4.3.1 Generic Formant Values

Almost all control parameters affect vocal tract formants. Generic formant center frequencies $F_{iG}$, bandwidths $B_{iG}$, and amplitudes $A_{iG}$ (i ∈ [1,6]) are defined for canonical vowels. Ten vowels are used: /i,y,u,e,ø,o,ɛ,œ,ɔ,a/. Other vowels are computed using 2-D interpolation.

**Table 3: Base vocalic formant center frequencies, bandwidths, and amplitudes**

| Vowel | V | H | F₁G | F₂G | F₃G | F₄G | F₅G | A₁G | A₂G | A₃G | A₄G | A₅G | B₁G | B₂G | B₃G | B₄G | B₅G |
|-------|---|---|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| /i/ | 1 | 0 | 215 | 1900 | 2630 | 3170 | 3710 | -10 | -10 | -8 | -4 | -15 | 10 | 18 | 20 | 30 | 40 |
| /e/ | 1 | 1/3 | 410 | 2000 | 2570 | 2980 | 3900 | -1 | -3 | -2 | -2 | -5 | 10 | 15 | 20 | 30 | 40 |
| /ɛ/ | 1 | 2/3 | 590 | 1700 | 2540 | 2800 | 3900 | 0 | -4 | -5 | -12 | -24 | 10 | 15 | 30 | 50 | 40 |
| /y/ | 1/2 | 0 | 250 | 1750 | 2160 | 3060 | 3900 | -12 | -9 | -14 | -11 | -11 | 10 | 10 | 20 | 30 | 40 |
| /œ/ | 1/2 | 1/3 | 350 | 1350 | 2250 | 3170 | 3900 | -6 | -3 | -8 | -8 | -10 | 10 | 10 | 20 | 30 | 40 |
| /ø/ | 1/2 | 2/3 | 620 | 1300 | 2520 | 3310 | 3900 | -3 | -3 | -3 | -7 | -14 | 10 | 10 | 20 | 30 | 40 |
| /u/ | 0 | 0 | 290 | 750 | 2300 | 3080 | 3900 | -6 | -8 | -13 | -8 | -9 | 10 | 10 | 20 | 30 | 40 |
| /o/ | 0 | 1/3 | 440 | 750 | 2160 | 2860 | 3900 | -6 | -1 | -10 | -6 | -28 | 10 | 12 | 20 | 30 | 40 |
| /ɔ/ | 0 | 2/3 | 610 | 950 | 2510 | 2830 | 3900 | -3 | 0 | -12 | -15 | -20 | 10 | 12 | 20 | 30 | 40 |
| /a/ | – | 1 | 700 | 1200 | 2500 | 2800 | 3600 | 0 | 0 | -5 | -7 | -24 | 13 | 13 | 40 | 60 | 40 |

Note: The sixth formant is defined by $F_{6G} = 2F_{4G}$, $A_{6G} = -15$ dB, and $B_{6G} = 150$ Hz.

#### 4.3.2 Vocal Tract Length

Vocal tract length influences vocal identity. The vocal tract size parameter S is mapped to a scale factor:

$$\alpha_S = 1.7S + 0.5$$

ranging from 0.5 to 2.2.

#### 4.3.3 Larynx Position Adaptation to f₀

A modification of approximately 10% of formant positions occurs between $f_0 = 200$ Hz and $f_0 = 1000$ Hz. This is achieved by multiplying formant central frequencies by factor K:

$$K = 1.25 \times 10^{-4}f_0 + 0.975$$

Formant center frequencies are:

$$F_i = K\alpha_S F_{iG}(V, H) \quad \text{for } i \in [1,6]$$

#### 4.3.4 First Formant Tuning

The first formant depends on vowel height H, vocal effort E, and $f_0$. In speech, increased vocal effort results in higher F₁ (approximately 3.5 Hz/dB). For singing:

$$F_1 = \max\left(f_0 + 50 \text{ Hz}, K\alpha_S F_{1G}(V,H) + \frac{140}{1-E_{thr}}E - 70 \text{ Hz}\right)$$

Singers can adjust their first formant to $f_0$ above a pitch threshold: $F_1 = f_0 + 50$ Hz.

#### 4.3.5 Second Formant Tuning

For high pitched voices, $2f_0$ and $F_2$ can come close together. The second formant can be tuned to the second harmonic:

$$F_2 = \max(2f_0 + 50 \text{ Hz}, K\alpha_S F_{2G}(V,H))$$

#### 4.3.6 Formant Bandwidths

Formant bandwidths are obtained from generic values $B_{iG}$ interpolated using vowel height H and vowel backness V.

#### 4.3.7 Formant Amplitudes

Formant amplitudes $A_i$ (i ∈ [1,6]) are obtained by interpolation of values in Table 3. These must be corrected depending on $f_0$ to avoid artifacts when harmonics coincide with formants. The first three resonant filter amplitudes are decreased automatically when the closest kth harmonic of $f_0$ is near central frequency $F_i$:

$$\text{if } |(k+1)f_0 - F_i| < \Delta F_i: \quad A_i = A_{iG} - \left(1 - \frac{|(k+1)f_0 - F_i|}{\Delta F_i}\right)Att_{maxi}$$
$$\text{else: } A_i = A_{iG}$$

where $\Delta F_i$ is the frequency interval around formant (15 to 100 Hz for $f_0$ from 50 to 1500 Hz) and $Att_{maxi}$ is the attenuation amplitude (10 to 25 dB).

#### 4.3.8 Anti-formants

A quality factor of 2.5 and central frequency of 4700 Hz are used for the generic voice. The central frequency is also multiplied by vocal tract size scale factor $\alpha_S$.

---

## 5. Results and Discussion

### 5.1 Evaluation of Melodic Accuracy and Precision

Assessment of melodic precision and accuracy using Cantor Digitalis compared to natural singing has been reported. The task was to sing ascending/descending intervals and short melodies. Three conditions were tested: chironomy (Cantor Digitalis), mute chironomy (without audio feedback), and natural singing.

All subjects showed comparable proficiency in natural and Cantor Digitalis singing, with some performing significantly better in chironomic singing. For a majority of subjects, this was their first contact with Cantor Digitalis. Trained players are likely to obtain even better results.

Surprisingly, subjects performed equally well with or without audio feedback, showing high visuo-motor ability and dominance of vision on audition in targeting. This is similar to keyboard playing, where musicians can play with comparable precision on a mute keyboard.

### 5.2 Playing with Cantor Digitalis

The 2D tablet surface provides expressive melodic control. Pitch vibrato corresponds to circles around notes, while pitch transitions correspond to larger curves linking notes.

As a parametric synthesizer, Cantor Digitalis is not limited to specific voices. All voice types or sounds close to the vocal model can be designed. Vocal individuality results from specific combinations of formants, pitch range, and voice qualities.

Base formant values measured for tenor voice are extrapolated to produce different vocal tract sizes. Voices can be built with different characteristics:

- **Bass**: Large vocal tract, low pitch
- **Tenor**: Medium vocal tract, medium pitch  
- **Alto**: Shorter vocal tract
- **Soprano**: Short vocal tract, high pitch, falsetto mechanism
- **Bulgarian soprano**: Short vocal tract, high pitch, chest mechanism, high tension
- **Baby**: Very short vocal tract, very high pitch
- **Giant**: Very large vocal tract, very low pitch

Voice source parameters (laryngeal mechanism, tension, hoarseness, breathiness) are adjusted for different voice types. Parameters can be pushed beyond natural boundaries for special effects.

### 5.3 Chorus Digitalis and Voice Factory

The effectiveness of Cantor Digitalis as a musical instrument has been demonstrated during several successful concerts by Chorus Digitalis, a choir of Cantor Digitalis. Each musician plays one Cantor Digitalis on their laptop with a dedicated loudspeaker behind each player.

Another application is the Voice Factory software, an educational tool included in Cantor Digitalis. It allows manipulation and real-time audition of main concepts in voice production. Voice source parameters, formants, and source/filter dependencies can be listened to separately or in combination. The most important feature is dynamic control through user gestures during construction and deconstruction of the voice model.

### 5.4 Software Implementation and Distribution

Cantor Digitalis is implemented in Max and distributed under an open-source CeCILL license (GPL-like license designed by CNRS). The code sources are given in Max 6, composed of a main patch calling Max abstractions. The main patch follows source-filter structure with several sub-patches addressing rules and parameter mappings.

**Table 5: List of Max patches**

| Max patch | Description | Text section |
|-----------|-------------|--------------|
| Control | Receive and normalize data from tablet or MIDI interfaces | 2.3, 2.4, 5.4 |
| Voice factory | GUI to set voice quality parameters; construct/deconstruct vocal model | 2.5, 5.3 |
| GlottisMapping_HL | Compute high-level parameters for source model (E, Ethr, phon, B, T, R); Compute pitch (P₀, P, f₀) | 2.1, 4.1.1 |
| heartPerturbations | Compute heart perturbations for f₀ and E | 4.1.3, 4.2.1 |
| otherPerturbations | Compute slow perturbations for f₀ and E | 4.1.3, 4.2.1 |
| GlottisMapping_LL | Compute low-level parameters for source model (Ag, Fg, Bg, Tl₁, Tl₂) | 4.2.2, 4.2.3, 4.2.4 |
| VowelMapping | Compute high-level parameters for vocal tract model (H, V, S); Compute vocal tract scale factor αS | 2.1, 4.3.2 |
| VowelRules | Compute generic formant values and interpolate; Apply vocal tract length on formants and anti-formants | 4.3.1, 4.3.3, 4.3.6, 4.3.7, 4.3.8 |
| SourceFilterDependencies | Compute larynx position adaptation to f₀; Compute first and second formant tuning; Compute formant amplitude attenuation | 4.3.3, 4.3.4, 4.3.5, 4.3.7 |
| Glottis | Compute jitter and shimmer; Compute amplitude of noise and noise source; Compute glottal flow derivative model | 3.2.2, 3.2.3, 3.2.4, 4.1.2, 4.2.4, 4.2.5 |
| VocalTract | Compute vocal tract model (Ri, BQ) | 3.3.1, 3.3.2 |

Although the continuous surface appears well adapted for Cantor Digitalis, any MIDI interface can be used. MIDI piano keyboards with pedal and wheel controls have been tested and allow playing music requiring fast phrases.

The robustness of software implementation has been assessed by a large number of downloads. The code has been ported by developers outside the research group to other musical interfaces including the Haken Continuum, Madrona Labs Soundplane, and ROLI Seaboard.

---

## 6. Conclusions

Cantor Digitalis is a successful chironomic parametric singing synthesis system. This article presents the scientific and technical design of this system. Cantor Digitalis is currently limited to vocalic synthesis. Consonant synthesis by rules in the same framework has been developed, and a bi-tablet version (Digitartic system) has been demonstrated with limited consonants. However, adding consonants on a single tablet proved difficult due to the large number of parameters requiring control.

The question of articulation for consonants in future real-time singing instruments remains open. Another important question is automatic learning of specific voices through statistical parametric learning or other machine learning techniques to incorporate specific voice characters with Cantor Digitalis.

---

## Software Availability

- Website: http://cantordigitalis.limsi.fr
- GitHub: https://github.com/CantorDigitalis/
- License: CeCILL (GPL-compatible open-source license)
- Platform: Max 6 (works on OS X and Windows)
