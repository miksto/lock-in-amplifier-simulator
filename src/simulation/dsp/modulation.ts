/**
 * AM Modulation module for DUT simulation
 * Implements: output = carrier × (1 + m × modulating_signal)
 */

import { Oscillator } from './oscillator';

export class AMModulator {
  private modulatingOscillator: Oscillator;

  constructor(sampleRate: number) {
    this.modulatingOscillator = new Oscillator(sampleRate);
  }

  /**
   * Apply AM modulation to a carrier signal
   * @param carrier The carrier signal sample (from reference oscillator)
   * @param modulatingFreq Frequency of the modulating signal
   * @param modulatingAmplitude Amplitude of the modulating signal (for display)
   * @param modulationIndex Modulation depth (0-1)
   * @returns Modulated signal
   */
  modulate(
    carrier: number,
    modulatingFreq: number,
    modulatingAmplitude: number,
    modulationIndex: number
  ): number {
    // Generate modulating signal (normalized to ±1)
    const modulatingSignal = modulatingAmplitude > 0
      ? this.modulatingOscillator.sine(modulatingFreq, 1)
      : 0;

    // Apply AM: output = carrier × (1 + m × modulating)
    return carrier * (1 + modulationIndex * modulatingSignal);
  }

  /**
   * Get the current modulating signal value (for display purposes)
   */
  getModulatingSignal(modulatingAmplitude: number): number {
    // Don't advance phase, just read current value
    return modulatingAmplitude * Math.sin(this.modulatingOscillator.getPhase());
  }

  /**
   * Apply phase shift to a signal
   * @param signal Input signal
   * @param phaseShiftDegrees Phase shift in degrees
   * @param referencePhase Current reference phase (for computing shifted signal)
   * @param amplitude Signal amplitude
   */
  applyPhaseShift(
    _signal: number,
    phaseShiftDegrees: number,
    referencePhase: number,
    amplitude: number
  ): number {
    const phaseShiftRadians = (phaseShiftDegrees * Math.PI) / 180;
    return amplitude * Math.sin(referencePhase + phaseShiftRadians);
  }

  /**
   * Reset modulator state
   */
  reset(): void {
    this.modulatingOscillator.reset();
  }

  /**
   * Set sample rate
   */
  setSampleRate(sampleRate: number): void {
    this.modulatingOscillator.setSampleRate(sampleRate);
  }
}

/**
 * Complete DUT signal chain:
 * Reference → AM Modulation → Phase Shift → Sensor Amplitude Scaling
 */
export class DUTSimulator {
  private referenceOscillator: Oscillator;
  private modulatingOscillator: Oscillator;
  private currentReferencePhase: number = 0;

  constructor(sampleRate: number) {
    this.referenceOscillator = new Oscillator(sampleRate);
    this.modulatingOscillator = new Oscillator(sampleRate);
  }

  /**
   * Generate one sample of the complete DUT output
   */
  generate(
    referenceFreq: number,
    referenceAmplitude: number,
    modulatingFreq: number,
    modulatingAmplitude: number,
    modulationIndex: number,
    phaseShiftDegrees: number,
    sensorOutputAmplitude: number
  ): {
    reference: number;
    sensorOutput: number;
    referencePhase: number;
  } {
    // Store reference phase before advancing
    this.currentReferencePhase = this.referenceOscillator.getPhase();

    // Generate reference signal
    const reference = this.referenceOscillator.sine(referenceFreq, referenceAmplitude);

    // Generate modulating signal (normalized)
    const modulating = modulatingAmplitude > 0
      ? this.modulatingOscillator.sine(modulatingFreq, 1)
      : 0;

    // Apply AM modulation: carrier × (1 + m × modulating)
    // Use sensorOutputAmplitude as the carrier amplitude for the output
    const phaseShiftRadians = (phaseShiftDegrees * Math.PI) / 180;
    const shiftedPhase = this.currentReferencePhase + phaseShiftRadians;

    // Sensor output with phase shift and AM modulation
    const carrier = Math.sin(shiftedPhase);
    const sensorOutput = sensorOutputAmplitude * carrier * (1 + modulationIndex * modulating);

    return {
      reference,
      sensorOutput,
      referencePhase: this.currentReferencePhase,
    };
  }

  /**
   * Get current reference phase (for mixer synchronization)
   */
  getReferencePhase(): number {
    return this.currentReferencePhase;
  }

  /**
   * Reset all oscillators
   */
  reset(): void {
    this.referenceOscillator.reset();
    this.modulatingOscillator.reset();
    this.currentReferencePhase = 0;
  }

  /**
   * Set sample rate
   */
  setSampleRate(sampleRate: number): void {
    this.referenceOscillator.setSampleRate(sampleRate);
    this.modulatingOscillator.setSampleRate(sampleRate);
  }
}
