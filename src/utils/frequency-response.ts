/**
 * Frequency Response Utilities
 *
 * Pure mathematical functions for computing the magnitude response of digital filters.
 * These functions evaluate H(e^{jω}) at specified frequencies, returning linear amplitude.
 *
 * The frequency response is computed analytically from filter coefficients - no audio
 * processing is required. This allows frequency response calculation on the main thread
 * independent of AudioWorklet processors.
 */

/**
 * Evaluates a biquad filter (2-pole 2-zero) at the given frequencies.
 *
 * Transfer function: H(z) = (b0 + b1*z^{-1} + b2*z^{-2}) / (a0 + a1*z^{-1} + a2*z^{-2})
 *
 * @param b Numerator coefficients [b0, b1, b2]
 * @param a Denominator coefficients [a0, a1, a2]
 * @param frequencies Array of frequencies in Hz
 * @param sampleRate Sample rate in Hz
 * @returns Array of linear amplitude values (not dB)
 */
export function evaluateBiquad(
  b: [number, number, number],
  a: [number, number, number],
  frequencies: number[],
  sampleRate: number
): number[] {
  return frequencies.map((f) => {
    const omega = (2 * Math.PI * f) / sampleRate;
    const cos1 = Math.cos(omega);
    const cos2 = Math.cos(2 * omega);
    const sin1 = Math.sin(omega);
    const sin2 = Math.sin(2 * omega);

    // Numerator: b0 + b1*e^{-jω} + b2*e^{-2jω}
    const numReal = b[0] + b[1] * cos1 + b[2] * cos2;
    const numImag = -b[1] * sin1 - b[2] * sin2;

    // Denominator: a0 + a1*e^{-jω} + a2*e^{-2jω}
    const denReal = a[0] + a[1] * cos1 + a[2] * cos2;
    const denImag = -a[1] * sin1 - a[2] * sin2;

    const numMag = Math.sqrt(numReal * numReal + numImag * numImag);
    const denMag = Math.sqrt(denReal * denReal + denImag * denImag);

    return denMag === 0 ? 0 : numMag / denMag;
  });
}

/**
 * Evaluates a first-order filter (1-pole 1-zero) at the given frequencies.
 *
 * Transfer function: H(z) = (b0 + b1*z^{-1}) / (a0 + a1*z^{-1})
 *
 * @param b Numerator coefficients [b0, b1]
 * @param a Denominator coefficients [a0, a1]
 * @param frequencies Array of frequencies in Hz
 * @param sampleRate Sample rate in Hz
 * @returns Array of linear amplitude values (not dB)
 */
export function evaluateFirstOrder(
  b: [number, number],
  a: [number, number],
  frequencies: number[],
  sampleRate: number
): number[] {
  return frequencies.map((f) => {
    const omega = (2 * Math.PI * f) / sampleRate;
    const cosW = Math.cos(omega);
    const sinW = Math.sin(omega);

    // Numerator: b0 + b1*e^{-jω}
    const numReal = b[0] + b[1] * cosW;
    const numImag = -b[1] * sinW;

    // Denominator: a0 + a1*e^{-jω}
    const denReal = a[0] + a[1] * cosW;
    const denImag = -a[1] * sinW;

    const numMag = Math.sqrt(numReal * numReal + numImag * numImag);
    const denMag = Math.sqrt(denReal * denReal + denImag * denImag);

    return denMag === 0 ? 0 : numMag / denMag;
  });
}

/**
 * Converts linear amplitude values to decibels.
 *
 * @param amplitudes Array of linear amplitude values
 * @returns Array of dB values (20 * log10(amplitude))
 */
export function linearToDb(amplitudes: number[]): number[] {
  return amplitudes.map((a) => (a <= 0 ? -Infinity : 20 * Math.log10(a)));
}

/**
 * Combines frequency responses in series (cascade).
 * Multiplies the linear amplitudes at each frequency.
 *
 * @param responses Array of frequency response arrays (all same length)
 * @returns Combined frequency response array
 */
export function combineSeries(...responses: number[][]): number[] {
  if (responses.length === 0) return [];
  const length = responses[0].length;
  const result = new Array(length).fill(1);
  for (const response of responses) {
    for (let i = 0; i < length; i++) {
      result[i] *= response[i];
    }
  }
  return result;
}

/**
 * Combines frequency responses in parallel.
 * Sums the linear amplitudes at each frequency.
 *
 * @param responses Array of frequency response arrays (all same length)
 * @returns Combined frequency response array
 */
export function combineParallel(...responses: number[][]): number[] {
  if (responses.length === 0) return [];
  const length = responses[0].length;
  const result = new Array(length).fill(0);
  for (const response of responses) {
    for (let i = 0; i < length; i++) {
      result[i] += response[i];
    }
  }
  return result;
}
