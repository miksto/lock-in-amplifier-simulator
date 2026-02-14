import { useEffect, useRef, useMemo } from 'react';
import uPlot from 'uplot';
import './FrequencySpectrum.css';

// FFT size (power of 2)
const FFT_SIZE = 1024;
const NUM_BINS = FFT_SIZE / 2;

interface FrequencySpectrumProps {
  data: Float32Array | null;
  sampleRate: number;
  title?: string;
}

// Pre-allocated FFT buffers (shared across all instances - single FFT display)
let fftReal: Float64Array | null = null;
let fftImag: Float64Array | null = null;
let fftFrequencies: Float64Array | null = null;
let fftMagnitudes: Float64Array | null = null;

function ensureFftBuffers(): void {
  if (!fftReal) {
    fftReal = new Float64Array(FFT_SIZE);
    fftImag = new Float64Array(FFT_SIZE);
    fftFrequencies = new Float64Array(NUM_BINS);
    fftMagnitudes = new Float64Array(NUM_BINS);
  }
}

// Simple FFT implementation (Cooley-Tukey radix-2)
function fft(real: Float64Array, imag: Float64Array): void {
  const n = real.length;
  if (n <= 1) return;

  // Bit reversal permutation
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // Cooley-Tukey iterative FFT
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (2 * Math.PI) / len;
    const wReal = Math.cos(angle);
    const wImag = -Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let curReal = 1;
      let curImag = 0;

      for (let k = 0; k < halfLen; k++) {
        const evenIdx = i + k;
        const oddIdx = evenIdx + halfLen;

        const tReal = curReal * real[oddIdx] - curImag * imag[oddIdx];
        const tImag = curReal * imag[oddIdx] + curImag * real[oddIdx];

        real[oddIdx] = real[evenIdx] - tReal;
        imag[oddIdx] = imag[evenIdx] - tImag;
        real[evenIdx] = real[evenIdx] + tReal;
        imag[evenIdx] = imag[evenIdx] + tImag;

        const nextReal = curReal * wReal - curImag * wImag;
        const nextImag = curReal * wImag + curImag * wReal;
        curReal = nextReal;
        curImag = nextImag;
      }
    }
  }
}

/**
 * Compute spectrum using pre-allocated buffers.
 * Returns the number of bins computed.
 */
function computeSpectrumInPlace(
  data: Float32Array,
  sampleRate: number,
  real: Float64Array,
  imag: Float64Array,
  frequencies: Float64Array,
  magnitudes: Float64Array
): number {
  // Use power of 2 for FFT
  const n = Math.min(FFT_SIZE, Math.pow(2, Math.floor(Math.log2(data.length))));
  const numBins = n / 2;

  // Copy data and apply Hanning window
  const startIdx = Math.max(0, data.length - n);
  for (let i = 0; i < n; i++) {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    real[i] = data[startIdx + i] * window;
    imag[i] = 0;
  }

  // Perform FFT
  fft(real, imag);

  // Compute magnitudes (only positive frequencies)
  const freqResolution = sampleRate / n;
  for (let i = 0; i < numBins; i++) {
    frequencies[i] = i * freqResolution;
    const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / n;
    magnitudes[i] = 20 * Math.log10(Math.max(mag, 1e-10)); // dB scale
  }

  return numBins;
}

export function FrequencySpectrum({
  data,
  sampleRate,
  title = 'Frequency Spectrum',
}: FrequencySpectrumProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);

  const options = useMemo((): uPlot.Options => {
    return {
      width: 400,
      height: 150,
      cursor: {
        show: false,
      },
      legend: {
        show: false,
      },
      scales: {
        x: {
          time: false,
        },
        y: {
          auto: true,
          range: (_u, min, max) => [Math.min(min, 0), Math.max(max, 0)],
        },
      },
      axes: [
        {
          stroke: '#4a5568',
          grid: {
            stroke: '#2d3748',
            width: 1,
          },
          ticks: {
            stroke: '#4a5568',
          },
          font: '9px sans-serif',
          size: 30,
          label: 'Frequency (Hz)',
          labelSize: 14,
          labelFont: '9px sans-serif',
        },
        {
          stroke: '#4a5568',
          grid: {
            stroke: '#2d3748',
            width: 1,
          },
          ticks: {
            stroke: '#4a5568',
          },
          font: '9px sans-serif',
          size: 40,
          label: 'Magnitude (dB)',
          labelSize: 14,
          labelFont: '9px sans-serif',
        },
      ],
      series: [
        {},
        {
          stroke: '#ff88ff',
          width: 1.5,
          fill: 'rgba(255, 136, 255, 0.1)',
          points: {
            show: false,
          },
        },
      ],
    };
  }, []);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const emptyData: uPlot.AlignedData = [[0], [0]];
    const chart = new uPlot(options, emptyData, containerRef.current);
    chartRef.current = chart;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && chart) {
        chart.setSize({
          width: entry.contentRect.width,
          height: 150,
        });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.destroy();
      chartRef.current = null;
    };
  }, [options]);

  // Update spectrum data
  useEffect(() => {
    if (!chartRef.current || !data || data.length < 64) return;

    // Ensure FFT buffers are allocated
    ensureFftBuffers();
    if (!fftReal || !fftImag || !fftFrequencies || !fftMagnitudes) return;

    const numBins = computeSpectrumInPlace(
      data,
      sampleRate,
      fftReal,
      fftImag,
      fftFrequencies,
      fftMagnitudes
    );

    // Pass subarray views to uPlot
    chartRef.current.setData([
      fftFrequencies.subarray(0, numBins),
      fftMagnitudes.subarray(0, numBins),
    ]);
  }, [data, sampleRate]);

  return (
    <div className="frequency-spectrum">
      <div className="spectrum-title">{title}</div>
      <div className="spectrum-container" ref={containerRef} />
    </div>
  );
}
