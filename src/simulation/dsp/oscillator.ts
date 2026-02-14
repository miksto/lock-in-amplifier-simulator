/**
 * Oscillator module for generating sine and square waves
 */

export class Oscillator {
  private phase: number = 0;
  private sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  /**
   * Generate a sine wave sample at the given frequency and amplitude
   */
  sine(frequency: number, amplitude: number): number {
    const value = amplitude * Math.sin(this.phase);
    this.advancePhase(frequency);
    return value;
  }

  /**
   * Generate a sine wave sample with a phase offset (in radians)
   */
  sineWithPhase(frequency: number, amplitude: number, phaseOffset: number): number {
    const value = amplitude * Math.sin(this.phase + phaseOffset);
    this.advancePhase(frequency);
    return value;
  }

  /**
   * Generate a square wave sample (-1 or 1) at the given frequency
   */
  square(frequency: number, amplitude: number): number {
    const value = amplitude * (Math.sin(this.phase) >= 0 ? 1 : -1);
    this.advancePhase(frequency);
    return value;
  }

  /**
   * Generate a square wave sample with a phase offset
   */
  squareWithPhase(frequency: number, amplitude: number, phaseOffset: number): number {
    const value = amplitude * (Math.sin(this.phase + phaseOffset) >= 0 ? 1 : -1);
    this.advancePhase(frequency);
    return value;
  }

  /**
   * Get current phase value without advancing
   */
  getPhase(): number {
    return this.phase;
  }

  /**
   * Get sine value at current phase without advancing
   */
  getSineAtPhase(amplitude: number, phaseOffset: number = 0): number {
    return amplitude * Math.sin(this.phase + phaseOffset);
  }

  /**
   * Get square value at current phase without advancing
   */
  getSquareAtPhase(amplitude: number, phaseOffset: number = 0): number {
    return amplitude * (Math.sin(this.phase + phaseOffset) >= 0 ? 1 : -1);
  }

  /**
   * Advance phase by one sample
   */
  advancePhase(frequency: number): void {
    this.phase += (2 * Math.PI * frequency) / this.sampleRate;
    // Wrap phase to prevent numerical overflow
    if (this.phase >= 2 * Math.PI) {
      this.phase -= 2 * Math.PI;
    }
  }

  /**
   * Reset oscillator phase
   */
  reset(): void {
    this.phase = 0;
  }

  /**
   * Set sample rate (use when sample rate changes)
   */
  setSampleRate(sampleRate: number): void {
    this.sampleRate = sampleRate;
  }
}

/**
 * Stateless sine generation for when phase tracking isn't needed
 */
export function generateSineWave(
  frequency: number,
  amplitude: number,
  sampleRate: number,
  numSamples: number,
  startPhase: number = 0
): Float32Array {
  const buffer = new Float32Array(numSamples);
  const phaseIncrement = (2 * Math.PI * frequency) / sampleRate;

  for (let i = 0; i < numSamples; i++) {
    buffer[i] = amplitude * Math.sin(startPhase + i * phaseIncrement);
  }

  return buffer;
}

/**
 * Stateless square wave generation
 */
export function generateSquareWave(
  frequency: number,
  amplitude: number,
  sampleRate: number,
  numSamples: number,
  startPhase: number = 0
): Float32Array {
  const buffer = new Float32Array(numSamples);
  const phaseIncrement = (2 * Math.PI * frequency) / sampleRate;

  for (let i = 0; i < numSamples; i++) {
    const phase = startPhase + i * phaseIncrement;
    buffer[i] = amplitude * (Math.sin(phase) >= 0 ? 1 : -1);
  }

  return buffer;
}
