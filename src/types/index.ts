// Signal Source (DUT Simulation) Types
export interface SignalSourceParams {
  referenceFrequency: number; // 1 Hz - 1 kHz
  referenceAmplitude: number; // 0+ V
  modulatingFrequency: number; // Hz
  modulationIndex: number; // 0 - 1 (modulation depth)
  phaseShift: number; // 0 - 360 degrees
  sensorOutputAmplitude: number; // 0+ V (carrier amplitude)
  whiteNoiseAmplitude: number; // 0+ V (Gaussian std dev)
  interferers: Interferer[];
}

export interface Interferer {
  id: string;
  frequency: number; // Hz
  amplitude: number; // V
}

// Filter Types
export type FilterOrder = 1 | 2 | 4;

export interface BandPassFilterParams {
  enabled: boolean; // Whether the filter is active
  centerFrequency: number; // Hz
  bandwidth: number; // Hz
  order: FilterOrder;
}

export interface LowPassFilterParams {
  cutoffFrequency: number; // Hz
  order: FilterOrder;
}

// Mixer Types
export type MixerMode = 'analog' | 'digital';

export interface MixerParams {
  mode: MixerMode;
}

// Simulation Output Types
export interface SimulationOutputs {
  i: number; // In-phase output
  q: number; // Quadrature output
  signedOutput: number; // I*cos(θ) + Q*sin(θ) - signed amplitude accounting for phase
  phase: number; // arctan(Q/I) in degrees
}

// Buffer Data for Graphs
export interface SignalBuffers {
  reference: Float32Array;
  modulating: Float32Array; // The low-frequency modulating signal (e.g., 10 Hz)
  modulatingPlusNoise: Float32Array; // Modulating signal + noise (what lock-in recovers)
  sensorClean: Float32Array; // Raw sensor signal with AM but before noise
  noise: Float32Array;
  sensor: Float32Array; // Sensor signal with noise
  afterBpf: Float32Array;
  mixerI: Float32Array; // Raw mixer I output (before LPF)
  mixerQ: Float32Array; // Raw mixer Q output (before LPF)
  iOutput: Float32Array;
  qOutput: Float32Array;
  signedOutput: Float32Array; // I*cos(θ) + Q*sin(θ) - signed amplitude
  time: Float32Array;
}

// Simulation State
export interface SimulationState {
  isRunning: boolean;
  sampleRate: number;
  bufferSize: number;
  timeScale: number; // ms per division
  outputs: SimulationOutputs;
  buffers: SignalBuffers | null;
  effectiveSampleRate: number; // Sample rate after decimation for FFT display
}

// Worker Message Types
export type WorkerMessageType =
  | 'init'
  | 'start'
  | 'stop'
  | 'updateParams'
  | 'frameReady';

// Inbound messages (main -> worker)
export interface WorkerInitMessage {
  type: 'init';
  sharedBuffer: SharedArrayBuffer;
  maxDisplayPoints: number;
}

export interface WorkerStartMessage {
  type: 'start';
  params: SimulationParams;
}

export interface WorkerStopMessage {
  type: 'stop';
}

export interface WorkerUpdateParamsMessage {
  type: 'updateParams';
  params: Partial<SimulationParams>;
}

// Outbound messages (worker -> main)
export interface WorkerFrameReadyMessage {
  type: 'frameReady';
  outputs: SimulationOutputs;
  effectiveSampleRate: number;
  dataLength: number; // Actual number of valid samples in buffer
}

export type WorkerInboundMessage =
  | WorkerInitMessage
  | WorkerStartMessage
  | WorkerStopMessage
  | WorkerUpdateParamsMessage;

export type WorkerOutboundMessage = WorkerFrameReadyMessage;

// Combined Simulation Parameters
export interface SimulationParams {
  signalSource: SignalSourceParams;
  bandPassFilter: BandPassFilterParams;
  lowPassFilter: LowPassFilterParams;
  mixer: MixerParams;
  sampleRate: number;
  bufferSize: number;
}

// DSP Types
export interface BiquadCoefficients {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

export interface BiquadState {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

// Frequency Spectrum Data (for digital mode visualization)
export interface FrequencyBin {
  frequency: number;
  magnitude: number;
}
