import type { Node } from "./types";
import { Gain } from "./gain";
import { registerWorkletOnce } from "./worklet-utils";

export type PulseTrainParams = {
  /** Fundamental frequency in Hz (derived from P, P₀) */
  f0: number;
  /** Jitter depth: maximum f₀ perturbation as a fraction (0-0.3 for ±30%) */
  jitterDepth: number;
  /** Shimmer depth: maximum amplitude perturbation as a fraction (0-1 for ±100%) */
  shimmerDepth: number;
};

/**
 * Pulse Train AudioWorklet Processor code.
 *
 * Generates a band-limited impulse train at the fundamental frequency f₀,
 * with per-period jitter (frequency perturbation) and shimmer (amplitude
 * perturbation) for roughness simulation.
 *
 * The processor tracks phase internally and generates new random perturbation
 * values at each period boundary, ensuring jitter and shimmer are synchronized
 * to the glottal cycle.
 *
 * Band-limiting is achieved by summing harmonics up to the Nyquist frequency,
 * which avoids aliasing artifacts.
 *
 * Paper reference: Section 3.1 (Dirac comb), Section 4.1.2 (jitter),
 *                  Section 4.2.4 (shimmer)
 */
const processorCode = `
class PulseTrainProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "f0", defaultValue: 220, minValue: 20, maxValue: 20000, automationRate: "a-rate" },
      { name: "jitterDepth", defaultValue: 0, minValue: 0, maxValue: 0.3, automationRate: "k-rate" },
      { name: "shimmerDepth", defaultValue: 0, minValue: 0, maxValue: 1, automationRate: "k-rate" }
    ];
  }

  constructor() {
    super();
    // Phase accumulator (0 to 1)
    this.phase = 0;

    // Current perturbation values (updated each period)
    this.currentJitter = 1;   // Multiplier for f0 (1 = no jitter)
    this.currentShimmer = 1;  // Multiplier for amplitude (1 = no shimmer)

    // Box-Muller spare for Gaussian random
    this.hasSpare = false;
    this.spare = 0;

    // Cached harmonic count for band-limiting
    this.harmonicCount = 0;
    this.lastF0ForHarmonics = 220;
    this.updateHarmonicCount(220);
  }

  /**
   * Update the number of harmonics to sum for band-limited impulse.
   * We include harmonics up to Nyquist to avoid aliasing.
   */
  updateHarmonicCount(f0) {
    const nyquist = sampleRate / 2;
    this.harmonicCount = Math.max(1, Math.floor(nyquist / f0));
    this.lastF0ForHarmonics = f0;
  }

  /**
   * Generate a Gaussian-distributed random number using Box-Muller transform.
   * Returns values with mean 0 and standard deviation 1.
   */
  gaussianRandom() {
    if (this.hasSpare) {
      this.hasSpare = false;
      return this.spare;
    }

    let u, v, s;
    do {
      u = Math.random() * 2 - 1;
      v = Math.random() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);

    const mul = Math.sqrt(-2 * Math.log(s) / s);
    this.spare = v * mul;
    this.hasSpare = true;
    return u * mul;
  }

  /**
   * Generate new perturbation values at a period boundary.
   * Jitter affects the next period's frequency.
   * Shimmer affects the current pulse's amplitude.
   */
  generatePerturbations(jitterDepth, shimmerDepth) {
    // Jitter: Gaussian perturbation of f0, clipped to ±jitterDepth
    // Using Gaussian makes small perturbations more likely than large ones
    const jitterRaw = this.gaussianRandom() * jitterDepth * 0.5;
    const jitterClamped = Math.max(-jitterDepth, Math.min(jitterDepth, jitterRaw));
    this.currentJitter = 1 + jitterClamped;

    // Shimmer: Gaussian perturbation of amplitude, clipped to [0, 2]
    // At shimmerDepth=1, amplitude can vary from 0 to 2 (±100%)
    const shimmerRaw = this.gaussianRandom() * shimmerDepth * 0.5;
    const shimmerClamped = Math.max(-shimmerDepth, Math.min(shimmerDepth, shimmerRaw));
    this.currentShimmer = 1 + shimmerClamped;

    // Clamp shimmer to non-negative (amplitude can't be negative)
    this.currentShimmer = Math.max(0, this.currentShimmer);
  }

  /**
   * Compute a band-limited impulse using additive synthesis.
   * Sums cosines at all harmonic frequencies up to Nyquist.
   *
   * The impulse is normalized so that its peak amplitude is approximately 1.
   */
  computeBandLimitedImpulse(phase) {
    // Sum all harmonics: Σ cos(2π * k * phase) for k = 1 to harmonicCount
    // This produces a Dirac comb approximation
    let sum = 0;
    const twoPiPhase = 2 * Math.PI * phase;
    for (let k = 1; k <= this.harmonicCount; k++) {
      sum += Math.cos(k * twoPiPhase);
    }
    // Normalize by harmonic count to keep amplitude reasonable
    return sum / this.harmonicCount;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0]?.[0];
    if (!output) {
      return true;
    }

    const dt = 1 / sampleRate;
    // k-rate parameters (single value per block)
    const jitterDepth = parameters.jitterDepth[0];
    const shimmerDepth = parameters.shimmerDepth[0];

    for (let i = 0; i < output.length; i++) {
      // a-rate: per-sample value for f0
      const f0 = parameters.f0.length > 1 ? parameters.f0[i] : parameters.f0[0];

      // Compute effective f0 with current jitter
      const f0Effective = f0 * this.currentJitter;

      // Advance phase
      this.phase += f0Effective * dt;

      // Check for period boundary (phase wrapped)
      if (this.phase >= 1) {
        this.phase -= 1;
        // Generate new perturbations for the next period
        this.generatePerturbations(jitterDepth, shimmerDepth);
        // Update harmonic count if f0 changed significantly (>10%)
        if (Math.abs(f0 - this.lastF0ForHarmonics) / this.lastF0ForHarmonics > 0.1) {
          this.updateHarmonicCount(f0);
        }
      }

      // Generate band-limited impulse and apply shimmer
      output[i] = this.currentShimmer * this.computeBandLimitedImpulse(this.phase);
    }

    return true;
  }
}

registerProcessor('pulse-train-processor', PulseTrainProcessor);
`;

const PROCESSOR_NAME = "pulse-train-processor";

/**
 * Pulse Train (Voiced Excitation Source)
 *
 * Generates a periodic impulse train at the fundamental frequency f₀,
 * with integrated jitter (f₀ perturbation) and shimmer (amplitude perturbation)
 * for roughness simulation.
 *
 * In the spectral domain, the unperturbed output is a Dirac comb: Σδ(f − n·f₀),
 * representing energy at each harmonic frequency. Jitter spreads energy around
 * harmonics, and shimmer modulates the overall amplitude cycle-to-cycle.
 *
 * The impulse train is the input to the glottal formant filter, which shapes
 * each impulse into the characteristic glottal pulse waveform.
 *
 * Paper reference: Section 3.1 (spectral equation showing the Dirac comb term),
 *                  Section 4.1.2 (jitter), Section 4.2.4 (shimmer)
 *
 * Input parameters:
 *   - f0: Fundamental frequency in Hz
 *   - jitterDepth: Maximum f₀ perturbation (0-0.3 for up to ±30%)
 *   - shimmerDepth: Maximum amplitude perturbation (0-1 for up to ±100%)
 */
export class PulseTrain implements Node<PulseTrainParams> {
  private ctx: AudioContext;
  private workletNode: AudioWorkletNode;
  private gain: Gain;

  public in: null;
  public out: AudioNode;

  private constructor(ctx: AudioContext, workletNode: AudioWorkletNode, gain: Gain) {
    this.ctx = ctx;
    this.workletNode = workletNode;
    this.gain = gain;
    this.out = gain.out;
    this.in = null;
  }

  /** Fundamental frequency AudioParam (a-rate, 20-20000 Hz) */
  get f0(): AudioParam {
    return this.workletNode.parameters.get("f0")!;
  }

  /** Jitter depth AudioParam (k-rate, 0-0.3) */
  get jitterDepth(): AudioParam {
    return this.workletNode.parameters.get("jitterDepth")!;
  }

  /** Shimmer depth AudioParam (k-rate, 0-1) */
  get shimmerDepth(): AudioParam {
    return this.workletNode.parameters.get("shimmerDepth")!;
  }

  static async create(ctx: AudioContext, params: PulseTrainParams): Promise<PulseTrain> {
    await registerWorkletOnce(ctx, PROCESSOR_NAME, processorCode);

    const workletNode = new AudioWorkletNode(ctx, PROCESSOR_NAME);
    const gain = await Gain.create(ctx, { gain: 0 });

    workletNode.connect(gain.in);

    const pulseTrain = new PulseTrain(ctx, workletNode, gain);
    pulseTrain.update(params);

    return pulseTrain;
  }

  update(params: PulseTrainParams) {
    this.f0.setTargetAtTime(params.f0, this.ctx.currentTime, 0.02);
    this.jitterDepth.setTargetAtTime(params.jitterDepth, this.ctx.currentTime, 0.02);
    this.shimmerDepth.setTargetAtTime(params.shimmerDepth, this.ctx.currentTime, 0.02);
  }

  destroy() {
    this.workletNode.disconnect();
    this.gain.destroy();
  }

  start() {
    this.gain.update({ gain: 1 });
  }

  stop() {
    this.gain.update({ gain: 0 });
  }
}
