/**
 * Butterworth filter design module
 * Calculates biquad coefficients for cascaded filter sections
 */

import type { BiquadCoefficients, FilterOrder } from '../../types';

/**
 * Design a 2nd-order Butterworth low-pass filter section
 * Uses bilinear transform with frequency pre-warping
 */
export function designLowPass2ndOrder(
  cutoffFreq: number,
  sampleRate: number,
  Q: number = Math.SQRT1_2 // 0.7071 for Butterworth
): BiquadCoefficients {
  // Pre-warp the cutoff frequency
  const omega = (2 * Math.PI * cutoffFreq) / sampleRate;
  const warpedOmega = 2 * Math.tan(omega / 2);

  // Analog prototype coefficients
  const K = warpedOmega;
  const K2 = K * K;
  const norm = 1 / (1 + K / Q + K2);

  // Digital filter coefficients (Direct Form I)
  const b0 = K2 * norm;
  const b1 = 2 * b0;
  const b2 = b0;
  const a1 = 2 * (K2 - 1) * norm;
  const a2 = (1 - K / Q + K2) * norm;

  return { b0, b1, b2, a1, a2 };
}

/**
 * Design a 2nd-order Butterworth high-pass filter section
 */
export function designHighPass2ndOrder(
  cutoffFreq: number,
  sampleRate: number,
  Q: number = Math.SQRT1_2
): BiquadCoefficients {
  const omega = (2 * Math.PI * cutoffFreq) / sampleRate;
  const warpedOmega = 2 * Math.tan(omega / 2);

  const K = warpedOmega;
  const K2 = K * K;
  const norm = 1 / (1 + K / Q + K2);

  const b0 = norm;
  const b1 = -2 * norm;
  const b2 = norm;
  const a1 = 2 * (K2 - 1) * norm;
  const a2 = (1 - K / Q + K2) * norm;

  return { b0, b1, b2, a1, a2 };
}

/**
 * Design a 2nd-order band-pass filter section with unity gain at center frequency
 * Uses the RBJ Audio EQ Cookbook formulation
 */
export function designBandPass2ndOrder(
  centerFreq: number,
  bandwidth: number,
  sampleRate: number
): BiquadCoefficients {
  const omega = (2 * Math.PI * centerFreq) / sampleRate;
  const sinOmega = Math.sin(omega);
  const cosOmega = Math.cos(omega);

  // Q = centerFreq / bandwidth
  const Q = centerFreq / bandwidth;
  const alpha = sinOmega / (2 * Q);

  // BPF with 0 dB peak gain (from RBJ Audio EQ Cookbook)
  const b0 = alpha;
  const b1 = 0;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * cosOmega;
  const a2 = 1 - alpha;

  // Normalize
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

/**
 * Design cascaded band-pass filter sections for higher orders
 * Each section is a 2nd-order BPF, cascaded for 4th order etc.
 */
export function designBandPassFilterSections(
  centerFreq: number,
  bandwidth: number,
  sampleRate: number,
  order: FilterOrder
): BiquadCoefficients[] {
  // For a true BPF, order 1 doesn't make sense (minimum is 2nd order)
  // We'll treat order 1 as a single wide BPF section
  // Order 2 = one BPF section
  // Order 4 = two cascaded BPF sections (each slightly wider to achieve target BW)

  if (order === 1 || order === 2) {
    return [designBandPass2ndOrder(centerFreq, bandwidth, sampleRate)];
  }

  // For 4th order, use two cascaded sections
  // Each section needs wider bandwidth so combined response has target bandwidth
  // For Butterworth response, multiply bandwidth by ~1.55 for each section
  const sectionBandwidth = bandwidth * 1.55;
  return [
    designBandPass2ndOrder(centerFreq, sectionBandwidth, sampleRate),
    designBandPass2ndOrder(centerFreq, sectionBandwidth, sampleRate),
  ];
}

/**
 * Get Q values for cascaded Butterworth filter sections
 * For orders 1, 2, 4 (as specified in the requirements)
 */
function getButterworthQValues(order: FilterOrder): number[] {
  switch (order) {
    case 1:
      return []; // 1st order doesn't use biquads the same way
    case 2:
      return [Math.SQRT1_2]; // Single section, Q = 0.7071
    case 4:
      // Two cascaded sections with specific Q values
      return [0.5412, 1.3066]; // Butterworth Q values for 4th order
    default:
      return [Math.SQRT1_2];
  }
}

/**
 * Design a cascaded Butterworth low-pass filter
 * Returns array of biquad coefficients for each section
 */
export function designLowPassFilter(
  cutoffFreq: number,
  sampleRate: number,
  order: FilterOrder
): BiquadCoefficients[] {
  if (order === 1) {
    // First-order filter implemented as a special biquad
    const omega = (2 * Math.PI * cutoffFreq) / sampleRate;
    const warpedOmega = 2 * Math.tan(omega / 2);
    const K = warpedOmega;
    const norm = 1 / (1 + K);

    return [
      {
        b0: K * norm,
        b1: K * norm,
        b2: 0,
        a1: (K - 1) * norm,
        a2: 0,
      },
    ];
  }

  const qValues = getButterworthQValues(order);
  return qValues.map((Q) => designLowPass2ndOrder(cutoffFreq, sampleRate, Q));
}

/**
 * Design a cascaded Butterworth high-pass filter
 */
export function designHighPassFilter(
  cutoffFreq: number,
  sampleRate: number,
  order: FilterOrder
): BiquadCoefficients[] {
  if (order === 1) {
    const omega = (2 * Math.PI * cutoffFreq) / sampleRate;
    const warpedOmega = 2 * Math.tan(omega / 2);
    const K = warpedOmega;
    const norm = 1 / (1 + K);

    return [
      {
        b0: norm,
        b1: -norm,
        b2: 0,
        a1: (K - 1) * norm,
        a2: 0,
      },
    ];
  }

  const qValues = getButterworthQValues(order);
  return qValues.map((Q) => designHighPass2ndOrder(cutoffFreq, sampleRate, Q));
}

/**
 * Design a Butterworth band-pass filter
 * Implemented as cascaded high-pass and low-pass filters
 */
export function designBandPassFilter(
  centerFreq: number,
  bandwidth: number,
  sampleRate: number,
  order: FilterOrder
): { highPass: BiquadCoefficients[]; lowPass: BiquadCoefficients[] } {
  const lowCutoff = centerFreq - bandwidth / 2;
  const highCutoff = centerFreq + bandwidth / 2;

  // Ensure valid frequency range
  const validLowCutoff = Math.max(1, lowCutoff);
  const validHighCutoff = Math.min(sampleRate / 2 - 1, highCutoff);

  return {
    highPass: designHighPassFilter(validLowCutoff, sampleRate, order),
    lowPass: designLowPassFilter(validHighCutoff, sampleRate, order),
  };
}

/**
 * Calculate the phase response of a biquad filter at a specific frequency
 * Returns phase in radians
 */
export function biquadPhaseResponse(
  coeffs: BiquadCoefficients,
  frequency: number,
  sampleRate: number
): number {
  const omega = (2 * Math.PI * frequency) / sampleRate;
  const cosW = Math.cos(omega);
  const sinW = Math.sin(omega);
  const cos2W = Math.cos(2 * omega);
  const sin2W = Math.sin(2 * omega);

  // Numerator: b0 + b1*e^-jω + b2*e^-2jω
  const numReal = coeffs.b0 + coeffs.b1 * cosW + coeffs.b2 * cos2W;
  const numImag = -coeffs.b1 * sinW - coeffs.b2 * sin2W;

  // Denominator: 1 + a1*e^-jω + a2*e^-2jω
  const denReal = 1 + coeffs.a1 * cosW + coeffs.a2 * cos2W;
  const denImag = -coeffs.a1 * sinW - coeffs.a2 * sin2W;

  // H = num / den, phase = arg(num) - arg(den)
  const numPhase = Math.atan2(numImag, numReal);
  const denPhase = Math.atan2(denImag, denReal);

  return numPhase - denPhase;
}

/**
 * Calculate the total phase response of cascaded biquad filters
 * Returns phase in radians
 */
export function cascadedPhaseResponse(
  coeffsList: BiquadCoefficients[],
  frequency: number,
  sampleRate: number
): number {
  let totalPhase = 0;
  for (const coeffs of coeffsList) {
    totalPhase += biquadPhaseResponse(coeffs, frequency, sampleRate);
  }
  return totalPhase;
}

/**
 * Calculate the phase response of our band-pass filter implementation
 * at a specific frequency
 * Returns phase in radians
 */
export function bandPassPhaseResponse(
  centerFreq: number,
  bandwidth: number,
  sampleRate: number,
  order: FilterOrder,
  atFrequency: number
): number {
  const coeffs = designBandPassFilterSections(
    centerFreq,
    bandwidth,
    sampleRate,
    order
  );

  return cascadedPhaseResponse(coeffs, atFrequency, sampleRate);
}
