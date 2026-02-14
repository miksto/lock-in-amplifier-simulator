/**
 * Noise generator module
 * Implements Gaussian (white) noise using Box-Muller transform
 */

export class NoiseGenerator {
  private spareGaussian: number | null = null;

  /**
   * Generate a Gaussian (white) noise sample
   * Uses Box-Muller transform for normal distribution
   * @param stdDev Standard deviation of the noise
   */
  gaussian(stdDev: number): number {
    if (stdDev === 0) return 0;

    // Use spare value from previous iteration if available
    if (this.spareGaussian !== null) {
      const value = stdDev * this.spareGaussian;
      this.spareGaussian = null;
      return value;
    }

    // Box-Muller transform
    let u1: number, u2: number;
    do {
      u1 = Math.random();
      u2 = Math.random();
    } while (u1 === 0); // Avoid log(0)

    const magnitude = Math.sqrt(-2.0 * Math.log(u1));
    const angle = 2.0 * Math.PI * u2;

    // Generate two independent standard normal values
    const z0 = magnitude * Math.cos(angle);
    const z1 = magnitude * Math.sin(angle);

    // Store spare for next call
    this.spareGaussian = z1;

    return stdDev * z0;
  }

  /**
   * Generate uniform noise between -amplitude and +amplitude
   */
  uniform(amplitude: number): number {
    return amplitude * (2 * Math.random() - 1);
  }

  /**
   * Reset the generator state
   */
  reset(): void {
    this.spareGaussian = null;
  }
}

/**
 * Interferer signal generator
 * Generates multiple sine waves at specified frequencies
 */
export interface InterfererConfig {
  frequency: number;
  amplitude: number;
  phase: number;
}

export class InterfererGenerator {
  private interferers: InterfererConfig[] = [];
  private phases: number[] = [];
  private sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  /**
   * Set the list of interferers
   * Optimized to avoid rebuilding arrays when configuration hasn't changed
   */
  setInterferers(interferers: Array<{ frequency: number; amplitude: number }>): void {
    // Check if the configuration has changed
    if (interferers.length === this.interferers.length) {
      let configChanged = false;
      for (let i = 0; i < interferers.length; i++) {
        if (interferers[i].frequency !== this.interferers[i].frequency) {
          configChanged = true;
          break;
        }
      }

      if (!configChanged) {
        // Only update amplitudes in-place, preserve phases
        for (let i = 0; i < interferers.length; i++) {
          this.interferers[i].amplitude = interferers[i].amplitude;
        }
        return;
      }
    }

    // Configuration changed (different length or frequencies), rebuild arrays
    this.interferers = interferers.map((int) => ({
      ...int,
      phase: Math.random() * 2 * Math.PI, // Random initial phase
    }));
    this.phases = this.interferers.map((int) => int.phase);
  }

  /**
   * Generate the combined interferer signal for one sample
   */
  generate(): number {
    let sum = 0;

    for (let i = 0; i < this.interferers.length; i++) {
      const int = this.interferers[i];
      sum += int.amplitude * Math.sin(this.phases[i]);

      // Advance phase
      this.phases[i] += (2 * Math.PI * int.frequency) / this.sampleRate;
      if (this.phases[i] >= 2 * Math.PI) {
        this.phases[i] -= 2 * Math.PI;
      }
    }

    return sum;
  }

  /**
   * Set sample rate
   */
  setSampleRate(sampleRate: number): void {
    this.sampleRate = sampleRate;
  }

  /**
   * Reset all phases
   */
  reset(): void {
    this.phases = this.interferers.map((int) => int.phase);
  }
}
