/**
 * Web Worker for real-time lock-in amplifier simulation
 * Runs the complete signal chain in a separate thread
 * Uses SharedArrayBuffer for zero-copy data transfer to main thread
 */

import type {
  SimulationParams,
  WorkerInboundMessage,
  SimulationOutputs,
} from '../../types';
import { CircularBuffer } from '../buffers/CircularBuffer';
import { Oscillator } from '../dsp/oscillator';
import { NoiseGenerator, InterfererGenerator } from '../dsp/noise';
import { BandPassFilter, LowPassFilter } from '../dsp/filters';
import { bandPassPhaseResponse } from '../dsp/filterDesign';
import { PhaseSensitiveDetector, calculatePhase } from '../dsp/mixer';
import {
  createSharedBufferViews,
  getInactiveBuffer,
  swapBuffers,
  type SharedBufferViews,
  type SignalViews,
} from '../sharedBufferLayout';

// Simulation state
let isRunning = false;
let params: SimulationParams | null = null;
let simulationTimeoutId: ReturnType<typeof setTimeout> | null = null;

// Shared buffer for zero-copy transfer
let sharedViews: SharedBufferViews | null = null;
let maxDisplayPoints = 2500;

// DSP components
let referenceOsc: Oscillator | null = null;
let modulatingOsc: Oscillator | null = null;
let noiseGen: NoiseGenerator | null = null;
let interfererGen: InterfererGenerator | null = null;
let bandPassFilter: BandPassFilter | null = null;
let lowPassFilterI: LowPassFilter | null = null;
let lowPassFilterQ: LowPassFilter | null = null;
let mixer: PhaseSensitiveDetector | null = null;

// Circular buffers for output
let buffers: {
  reference: CircularBuffer;
  modulating: CircularBuffer;
  sensorClean: CircularBuffer;
  noise: CircularBuffer;
  sensor: CircularBuffer;
  afterBpf: CircularBuffer;
  modulatingPlusNoise: CircularBuffer;
  mixerI: CircularBuffer;
  mixerQ: CircularBuffer;
  iOutput: CircularBuffer;
  qOutput: CircularBuffer;
  signedOutput: CircularBuffer;
  time: CircularBuffer;
} | null = null;

// Timing
let sampleCounter = 0;
let lastSampleTime = 0;
let lastUpdateTime = 0;
const UPDATE_INTERVAL_MS = 1000 / 30; // 30 fps updates

// Running averages for output display
let iSum = 0;
let qSum = 0;
let avgCount = 0;

// Phase compensation for BPF
let bpfPhaseOffset = 0;

function initializeDSP(p: SimulationParams): void {
  const { sampleRate, bufferSize } = p;

  // Initialize oscillators
  referenceOsc = new Oscillator(sampleRate);
  modulatingOsc = new Oscillator(sampleRate);

  // Initialize noise generators
  noiseGen = new NoiseGenerator();
  interfererGen = new InterfererGenerator(sampleRate);
  interfererGen.setInterferers(p.signalSource.interferers);

  // Initialize filters
  bandPassFilter = new BandPassFilter(
    p.bandPassFilter.centerFrequency,
    p.bandPassFilter.bandwidth,
    sampleRate,
    p.bandPassFilter.order
  );

  lowPassFilterI = new LowPassFilter(
    p.lowPassFilter.cutoffFrequency,
    sampleRate,
    p.lowPassFilter.order
  );

  lowPassFilterQ = new LowPassFilter(
    p.lowPassFilter.cutoffFrequency,
    sampleRate,
    p.lowPassFilter.order
  );

  // Initialize mixer
  mixer = new PhaseSensitiveDetector(p.mixer.mode);

  // Calculate BPF phase offset at reference frequency for compensation
  bpfPhaseOffset = p.bandPassFilter.enabled
    ? bandPassPhaseResponse(
        p.bandPassFilter.centerFrequency,
        p.bandPassFilter.bandwidth,
        sampleRate,
        p.bandPassFilter.order,
        p.signalSource.referenceFrequency
      )
    : 0;

  // Initialize circular buffers
  buffers = {
    reference: new CircularBuffer(bufferSize),
    modulating: new CircularBuffer(bufferSize),
    sensorClean: new CircularBuffer(bufferSize),
    noise: new CircularBuffer(bufferSize),
    sensor: new CircularBuffer(bufferSize),
    afterBpf: new CircularBuffer(bufferSize),
    modulatingPlusNoise: new CircularBuffer(bufferSize),
    mixerI: new CircularBuffer(bufferSize),
    mixerQ: new CircularBuffer(bufferSize),
    iOutput: new CircularBuffer(bufferSize),
    qOutput: new CircularBuffer(bufferSize),
    signedOutput: new CircularBuffer(bufferSize),
    time: new CircularBuffer(bufferSize),
  };

  // Reset counters
  sampleCounter = 0;
  iSum = 0;
  qSum = 0;
  avgCount = 0;
}

function cleanupDSP(): void {
  buffers = null;
  referenceOsc = null;
  modulatingOsc = null;
  noiseGen = null;
  interfererGen = null;
  bandPassFilter = null;
  lowPassFilterI = null;
  lowPassFilterQ = null;
  mixer = null;

  sampleCounter = 0;
  iSum = 0;
  qSum = 0;
  avgCount = 0;
  bpfPhaseOffset = 0;
  params = null;
}

function updateParams(newParams: Partial<SimulationParams>): void {
  if (!params || !interfererGen || !bandPassFilter || !lowPassFilterI || !lowPassFilterQ || !mixer) return;

  let needPhaseRecalc = false;
  let needAccumulatorReset = false;

  if (newParams.signalSource) {
    if (newParams.signalSource.referenceFrequency !== undefined) {
      needPhaseRecalc = true;
      needAccumulatorReset = true;
    }
    if (newParams.signalSource.modulatingFrequency !== undefined) {
      needAccumulatorReset = true;
    }
    Object.assign(params.signalSource, newParams.signalSource);
    if (newParams.signalSource.interferers) {
      interfererGen.setInterferers(newParams.signalSource.interferers);
    }
  }

  if (newParams.bandPassFilter) {
    needPhaseRecalc = true;
    needAccumulatorReset = true;
    Object.assign(params.bandPassFilter, newParams.bandPassFilter);
    bandPassFilter.setCenterFrequency(params.bandPassFilter.centerFrequency);
    bandPassFilter.setBandwidth(params.bandPassFilter.bandwidth);
    bandPassFilter.setOrder(params.bandPassFilter.order);
  }

  if (newParams.lowPassFilter) {
    needAccumulatorReset = true;
    Object.assign(params.lowPassFilter, newParams.lowPassFilter);
    lowPassFilterI.setCutoffFrequency(params.lowPassFilter.cutoffFrequency);
    lowPassFilterI.setOrder(params.lowPassFilter.order);
    lowPassFilterQ.setCutoffFrequency(params.lowPassFilter.cutoffFrequency);
    lowPassFilterQ.setOrder(params.lowPassFilter.order);
  }

  if (newParams.mixer) {
    needAccumulatorReset = true;
    Object.assign(params.mixer, newParams.mixer);
    mixer.setMode(params.mixer.mode);
  }

  if (needPhaseRecalc) {
    bpfPhaseOffset = params.bandPassFilter.enabled
      ? bandPassPhaseResponse(
          params.bandPassFilter.centerFrequency,
          params.bandPassFilter.bandwidth,
          params.sampleRate,
          params.bandPassFilter.order,
          params.signalSource.referenceFrequency
        )
      : 0;
  }

  if (needAccumulatorReset) {
    iSum = 0;
    qSum = 0;
    avgCount = 0;

    // Reset filter internal state
    bandPassFilter.reset();
    lowPassFilterI.reset();
    lowPassFilterQ.reset();

    // Clear all circular buffers so graphs only show data with new settings
    if (buffers) {
      buffers.reference.clear();
      buffers.modulating.clear();
      buffers.sensorClean.clear();
      buffers.noise.clear();
      buffers.sensor.clear();
      buffers.afterBpf.clear();
      buffers.modulatingPlusNoise.clear();
      buffers.mixerI.clear();
      buffers.mixerQ.clear();
      buffers.iOutput.clear();
      buffers.qOutput.clear();
      buffers.signedOutput.clear();
      buffers.time.clear();
    }
  }
}

function processSample(): void {
  if (!params || !referenceOsc || !modulatingOsc || !noiseGen || !interfererGen ||
      !bandPassFilter || !lowPassFilterI || !lowPassFilterQ || !mixer || !buffers) return;

  const {
    referenceFrequency,
    referenceAmplitude,
    modulatingFrequency,
    modulationIndex,
    phaseShift,
    sensorOutputAmplitude,
    whiteNoiseAmplitude,
  } = params.signalSource;

  const sampleRate = params.sampleRate;
  const time = sampleCounter / sampleRate;

  // 1. Generate reference signal
  const referencePhase = referenceOsc.getPhase();
  const reference = referenceOsc.sine(referenceFrequency, referenceAmplitude);

  // 2. Generate modulating signal
  const modulating = modulationIndex > 0
    ? modulatingOsc.sine(modulatingFrequency, 1)
    : 0;

  if (modulationIndex === 0) {
    modulatingOsc.advancePhase(modulatingFrequency);
  }

  // 3. Generate sensor output with AM modulation and phase shift
  const phaseShiftRadians = (phaseShift * Math.PI) / 180;
  const shiftedPhase = referencePhase + phaseShiftRadians;
  const carrier = Math.sin(shiftedPhase);

  const modulatingSignal = sensorOutputAmplitude * modulationIndex * modulating;
  const sensorClean = sensorOutputAmplitude * carrier * modulationIndex * modulating;

  // 4. Generate noise
  const whiteNoise = noiseGen.gaussian(whiteNoiseAmplitude);
  const interfererNoise = interfererGen.generate();
  const totalNoise = whiteNoise + interfererNoise;

  // 5. Combine sensor signal with noise
  const sensorWithNoise = sensorClean + totalNoise;

  // 6. Apply band-pass filter
  const afterBpf = params.bandPassFilter.enabled
    ? bandPassFilter.process(sensorWithNoise)
    : sensorWithNoise;

  // 7. Phase-sensitive detection
  const { i: mixedI, q: mixedQ } = mixer.mix(afterBpf, referencePhase, referenceAmplitude);

  // 8. Apply low-pass filter
  const iFiltered = lowPassFilterI.process(mixedI);
  const qFiltered = lowPassFilterQ.process(mixedQ);

  // 9. Calculate signed output
  const signedOut = iFiltered * Math.cos(phaseShiftRadians) + qFiltered * Math.sin(phaseShiftRadians);

  // Store in circular buffers
  buffers.reference.push(reference);
  buffers.modulating.push(modulatingSignal);
  buffers.modulatingPlusNoise.push(modulatingSignal + totalNoise);
  buffers.sensorClean.push(sensorClean);
  buffers.noise.push(totalNoise);
  buffers.sensor.push(sensorWithNoise);
  buffers.afterBpf.push(afterBpf);
  buffers.mixerI.push(mixedI);
  buffers.mixerQ.push(mixedQ);
  buffers.iOutput.push(iFiltered);
  buffers.qOutput.push(qFiltered);
  buffers.signedOutput.push(signedOut);
  buffers.time.push(time);

  // Accumulate for averaging
  iSum += iFiltered;
  qSum += qFiltered;
  avgCount++;

  sampleCounter++;
}

/**
 * Write decimated data from circular buffers to shared memory
 * Returns the number of samples written
 */
function writeToSharedBuffer(target: SignalViews): number {
  if (!buffers) return 0;

  // Write each signal to the shared buffer
  const dataLength = buffers.reference.toDecimatedArrayInto(target.reference, maxDisplayPoints);
  buffers.modulating.toDecimatedArrayInto(target.modulating, maxDisplayPoints);
  buffers.modulatingPlusNoise.toDecimatedArrayInto(target.modulatingPlusNoise, maxDisplayPoints);
  buffers.sensorClean.toDecimatedArrayInto(target.sensorClean, maxDisplayPoints);
  buffers.noise.toDecimatedArrayInto(target.noise, maxDisplayPoints);
  buffers.sensor.toDecimatedArrayInto(target.sensor, maxDisplayPoints);
  buffers.afterBpf.toDecimatedArrayInto(target.afterBpf, maxDisplayPoints);
  buffers.mixerI.toDecimatedArrayInto(target.mixerI, maxDisplayPoints);
  buffers.mixerQ.toDecimatedArrayInto(target.mixerQ, maxDisplayPoints);
  buffers.iOutput.toDecimatedArrayInto(target.iOutput, maxDisplayPoints);
  buffers.qOutput.toDecimatedArrayInto(target.qOutput, maxDisplayPoints);
  buffers.signedOutput.toDecimatedArrayInto(target.signedOutput, maxDisplayPoints);
  buffers.time.toDecimatedArrayInto(target.time, maxDisplayPoints);

  return dataLength;
}

function getAveragedOutputs(): SimulationOutputs {
  if (!params || avgCount === 0) {
    return { i: 0, q: 0, signedOutput: 0, phase: 0 };
  }

  const iAvg = iSum / avgCount;
  const qAvg = qSum / avgCount;

  const phaseShiftRadians = (params.signalSource.phaseShift * Math.PI) / 180;
  const signedOutput = iAvg * Math.cos(phaseShiftRadians) + qAvg * Math.sin(phaseShiftRadians);

  let phase = calculatePhase(iAvg, qAvg);
  const bpfPhaseOffsetDegrees = (bpfPhaseOffset * 180) / Math.PI;
  phase -= bpfPhaseOffsetDegrees;

  while (phase > 180) phase -= 360;
  while (phase < -180) phase += 360;

  iSum = 0;
  qSum = 0;
  avgCount = 0;

  return { i: iAvg, q: qAvg, signedOutput, phase };
}

function simulationLoop(): void {
  if (!isRunning || !params || !sharedViews) return;

  const now = performance.now();

  // Calculate how many samples to process
  const deltaTime = now - lastSampleTime;
  const samplesToProcess = Math.floor((deltaTime / 1000) * params.sampleRate);

  if (samplesToProcess > 0) {
    const maxSamples = Math.min(samplesToProcess, 2000);
    for (let i = 0; i < maxSamples; i++) {
      processSample();
    }
    lastSampleTime = now;
  }

  // Check if it's time to send an update
  if (now - lastUpdateTime >= UPDATE_INTERVAL_MS) {
    lastUpdateTime = now;

    try {
      // Write to inactive buffer
      const writeBuffer = getInactiveBuffer(sharedViews);
      const dataLength = writeToSharedBuffer(writeBuffer);

      // Swap buffers atomically
      swapBuffers(sharedViews);

      // Get averaged outputs
      const outputs = getAveragedOutputs();

      // Calculate effective sample rate after decimation
      const decimationFactor = Math.ceil(params.bufferSize / maxDisplayPoints);
      const effectiveSampleRate = params.sampleRate / decimationFactor;

      // Send lightweight message (no buffer data, just signal)
      self.postMessage({
        type: 'frameReady',
        outputs,
        effectiveSampleRate,
        dataLength,
      });
    } catch (e) {
      console.error('Failed to send data:', e);
    }
  }

  simulationTimeoutId = setTimeout(simulationLoop, 1);
}

// Message handler
self.onmessage = (event: MessageEvent<WorkerInboundMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'init':
      // Initialize shared buffer views
      sharedViews = createSharedBufferViews(message.sharedBuffer, message.maxDisplayPoints);
      maxDisplayPoints = message.maxDisplayPoints;
      break;

    case 'start':
      params = message.params;
      initializeDSP(params);
      isRunning = true;
      lastSampleTime = performance.now();
      lastUpdateTime = performance.now();
      simulationLoop();
      break;

    case 'stop':
      isRunning = false;
      if (simulationTimeoutId !== null) {
        clearTimeout(simulationTimeoutId);
        simulationTimeoutId = null;
      }
      cleanupDSP();
      break;

    case 'updateParams':
      updateParams(message.params);
      break;
  }
};

export {};
