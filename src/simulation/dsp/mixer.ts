/**
 * Phase-Sensitive Detector (Mixer) module
 * Implements both analog (sine × sine) and digital (square wave switching) modes
 */

import type { MixerMode } from '../../types';

export class PhaseSensitiveDetector {
  private mode: MixerMode;

  constructor(mode: MixerMode = 'analog') {
    this.mode = mode;
  }

  /**
   * Mix signal with reference (in-phase)
   * @param signal Input signal sample
   * @param referencePhase Current phase of reference oscillator
   * @param referenceAmplitude Amplitude of reference (for normalization)
   */
  mixI(signal: number, referencePhase: number, referenceAmplitude: number): number {
    if (this.mode === 'analog') {
      // Analog mode: multiply by sine wave
      const reference = Math.sin(referencePhase);
      return signal * reference;
    } else {
      // Digital mode: multiply by square wave (+1 or -1)
      const reference = Math.sin(referencePhase) >= 0 ? 1 : -1;
      // Scale to match analog amplitude behavior
      return signal * reference * (2 / Math.PI) * (referenceAmplitude > 0 ? 1 : 0);
    }
  }

  /**
   * Mix signal with reference (quadrature, 90° phase shift)
   */
  mixQ(signal: number, referencePhase: number, referenceAmplitude: number): number {
    const quadraturePhase = referencePhase + Math.PI / 2;

    if (this.mode === 'analog') {
      const reference = Math.sin(quadraturePhase);
      return signal * reference;
    } else {
      const reference = Math.sin(quadraturePhase) >= 0 ? 1 : -1;
      return signal * reference * (2 / Math.PI) * (referenceAmplitude > 0 ? 1 : 0);
    }
  }

  /**
   * Get both I and Q outputs in a single call (more efficient)
   */
  mix(signal: number, referencePhase: number, referenceAmplitude: number): { i: number; q: number } {
    return {
      i: this.mixI(signal, referencePhase, referenceAmplitude),
      q: this.mixQ(signal, referencePhase, referenceAmplitude),
    };
  }

  /**
   * Set mixer mode
   */
  setMode(mode: MixerMode): void {
    this.mode = mode;
  }

  /**
   * Get current mode
   */
  getMode(): MixerMode {
    return this.mode;
  }
}

/**
 * Calculate magnitude from I and Q
 */
export function calculateMagnitude(i: number, q: number): number {
  return Math.sqrt(i * i + q * q);
}

/**
 * Calculate phase from I and Q (in degrees)
 */
export function calculatePhase(i: number, q: number): number {
  return (Math.atan2(q, i) * 180) / Math.PI;
}

/**
 * Calculate RMS value from a signal buffer
 * Used for averaging the mixer output
 */
export function calculateRMS(buffer: Float32Array, length?: number): number {
  const n = length ?? buffer.length;
  let sumSquares = 0;

  for (let i = 0; i < n; i++) {
    sumSquares += buffer[i] * buffer[i];
  }

  return Math.sqrt(sumSquares / n);
}

/**
 * Calculate DC component (average) of a signal
 * The lock-in output after low-pass filtering approximates the DC component
 */
export function calculateDC(buffer: Float32Array, length?: number): number {
  const n = length ?? buffer.length;
  let sum = 0;

  for (let i = 0; i < n; i++) {
    sum += buffer[i];
  }

  return sum / n;
}
