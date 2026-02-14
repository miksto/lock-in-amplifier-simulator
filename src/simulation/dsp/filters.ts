/**
 * Real-time filter implementation using biquad sections
 */

import type { BiquadCoefficients, BiquadState, FilterOrder } from '../../types';
import {
  designLowPassFilter,
  designBandPassFilterSections,
} from './filterDesign';

/**
 * Single biquad filter section (Direct Form II Transposed)
 */
export class BiquadFilter {
  private coeffs: BiquadCoefficients;
  private state: BiquadState;

  constructor(coefficients: BiquadCoefficients) {
    this.coeffs = coefficients;
    this.state = { x1: 0, x2: 0, y1: 0, y2: 0 };
  }

  /**
   * Process a single sample through the filter
   */
  process(input: number): number {
    const { b0, b1, b2, a1, a2 } = this.coeffs;
    const { x1, x2, y1, y2 } = this.state;

    // Direct Form I difference equation
    const output = b0 * input + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;

    // Update state
    this.state.x2 = x1;
    this.state.x1 = input;
    this.state.y2 = y1;
    this.state.y1 = output;

    return output;
  }

  /**
   * Reset filter state
   */
  reset(): void {
    this.state = { x1: 0, x2: 0, y1: 0, y2: 0 };
  }

  /**
   * Update filter coefficients (for parameter changes)
   */
  setCoefficients(coefficients: BiquadCoefficients): void {
    this.coeffs = coefficients;
  }
}

/**
 * Cascaded biquad filter (for higher-order filters)
 */
export class CascadedBiquadFilter {
  private sections: BiquadFilter[];

  constructor(coefficients: BiquadCoefficients[]) {
    this.sections = coefficients.map((c) => new BiquadFilter(c));
  }

  /**
   * Process a single sample through all cascaded sections
   */
  process(input: number): number {
    let output = input;
    for (const section of this.sections) {
      output = section.process(output);
    }
    return output;
  }

  /**
   * Reset all filter sections
   */
  reset(): void {
    for (const section of this.sections) {
      section.reset();
    }
  }

  /**
   * Update all coefficients
   */
  setCoefficients(coefficients: BiquadCoefficients[]): void {
    // Rebuild sections if count changed
    if (coefficients.length !== this.sections.length) {
      this.sections = coefficients.map((c) => new BiquadFilter(c));
    } else {
      coefficients.forEach((c, i) => this.sections[i].setCoefficients(c));
    }
  }
}

/**
 * Low-pass filter wrapper
 */
export class LowPassFilter {
  private filter: CascadedBiquadFilter;
  private cutoffFreq: number;
  private sampleRate: number;
  private order: FilterOrder;

  constructor(cutoffFreq: number, sampleRate: number, order: FilterOrder) {
    this.cutoffFreq = cutoffFreq;
    this.sampleRate = sampleRate;
    this.order = order;

    const coeffs = designLowPassFilter(cutoffFreq, sampleRate, order);
    this.filter = new CascadedBiquadFilter(coeffs);
  }

  process(input: number): number {
    return this.filter.process(input);
  }

  reset(): void {
    this.filter.reset();
  }

  setCutoffFrequency(freq: number): void {
    if (freq === this.cutoffFreq) return;
    this.cutoffFreq = freq;
    this.updateCoefficients();
  }

  setOrder(order: FilterOrder): void {
    if (order === this.order) return;
    this.order = order;
    this.updateCoefficients();
  }

  setSampleRate(sampleRate: number): void {
    if (sampleRate === this.sampleRate) return;
    this.sampleRate = sampleRate;
    this.updateCoefficients();
  }

  private updateCoefficients(): void {
    const coeffs = designLowPassFilter(this.cutoffFreq, this.sampleRate, this.order);
    this.filter.setCoefficients(coeffs);
  }
}

/**
 * Band-pass filter wrapper using true BPF biquad sections
 * This provides unity gain at center frequency (no passband attenuation)
 */
export class BandPassFilter {
  private filter: CascadedBiquadFilter;
  private centerFreq: number;
  private bandwidth: number;
  private sampleRate: number;
  private order: FilterOrder;

  constructor(
    centerFreq: number,
    bandwidth: number,
    sampleRate: number,
    order: FilterOrder
  ) {
    this.centerFreq = centerFreq;
    this.bandwidth = bandwidth;
    this.sampleRate = sampleRate;
    this.order = order;

    const coeffs = designBandPassFilterSections(
      centerFreq,
      bandwidth,
      sampleRate,
      order
    );
    this.filter = new CascadedBiquadFilter(coeffs);
  }

  process(input: number): number {
    return this.filter.process(input);
  }

  reset(): void {
    this.filter.reset();
  }

  setCenterFrequency(freq: number): void {
    if (freq === this.centerFreq) return;
    this.centerFreq = freq;
    this.updateCoefficients();
  }

  setBandwidth(bw: number): void {
    if (bw === this.bandwidth) return;
    this.bandwidth = bw;
    this.updateCoefficients();
  }

  setOrder(order: FilterOrder): void {
    if (order === this.order) return;
    this.order = order;
    this.updateCoefficients();
  }

  setSampleRate(sampleRate: number): void {
    if (sampleRate === this.sampleRate) return;
    this.sampleRate = sampleRate;
    this.updateCoefficients();
  }

  private updateCoefficients(): void {
    const coeffs = designBandPassFilterSections(
      this.centerFreq,
      this.bandwidth,
      this.sampleRate,
      this.order
    );
    this.filter.setCoefficients(coeffs);
  }
}
