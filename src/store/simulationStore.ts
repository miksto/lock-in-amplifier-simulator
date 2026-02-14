import { create } from 'zustand';
import type { SimulationState, SimulationOutputs, SignalBuffers } from '../types';

// Block identifiers for FFT selection
export type FftBlockId = 'reference' | 'modulator' | 'noise' | 'bpf' | 'mixerI' | 'mixerQ' | 'lpfI' | 'lpfQ' | 'output';

// Mapping from block ID to buffer key
export const blockToBuffer: Record<FftBlockId, keyof SignalBuffers> = {
  'reference': 'reference',
  'modulator': 'sensorClean',
  'noise': 'sensor',
  'bpf': 'afterBpf',
  'mixerI': 'mixerI',
  'mixerQ': 'mixerQ',
  'lpfI': 'iOutput',
  'lpfQ': 'qOutput',
  'output': 'signedOutput',
};

// Display names for FFT title
export const blockDisplayNames: Record<FftBlockId, string> = {
  'reference': 'Reference Oscillator',
  'modulator': 'DUT Modulator Output',
  'noise': 'After Noise Injection',
  'bpf': 'After Band-Pass Filter',
  'mixerI': 'Mixer Output (I)',
  'mixerQ': 'Mixer Output (Q)',
  'lpfI': 'After Low-Pass Filter (I)',
  'lpfQ': 'After Low-Pass Filter (Q)',
  'output': 'Signed Output',
};

interface SimulationStoreState extends SimulationState {
  // FFT selection
  selectedFftBlock: FftBlockId;
  // Oscilloscope mode
  oscilloscopeMode: boolean;
  triggerLevel: number;
  triggerIndex: number | null;
  triggerTime: number | null; // Simulation time when trigger occurred
  nextTriggerSearchTime: number; // Earliest time to search for next trigger
  // Actions
  setIsRunning: (running: boolean) => void;
  setTimeScale: (scale: number) => void;
  setSelectedFftBlock: (block: FftBlockId) => void;
  setOscilloscopeMode: (enabled: boolean) => void;
  setTriggerLevel: (level: number) => void;
  setTriggerIndex: (index: number | null) => void;
  setTriggerTime: (time: number | null) => void;
  setNextTriggerSearchTime: (time: number) => void;
  updateOutputs: (outputs: SimulationOutputs) => void;
  updateBuffers: (buffers: SignalBuffers, effectiveSampleRate: number) => void;
  clearBuffers: () => void;
  reset: () => void;
}

const defaultOutputs: SimulationOutputs = {
  i: 0,
  q: 0,
  signedOutput: 0,
  phase: 0,
};

const defaultState: SimulationState & { selectedFftBlock: FftBlockId; oscilloscopeMode: boolean; triggerLevel: number; triggerIndex: number | null; triggerTime: number | null; nextTriggerSearchTime: number } = {
  isRunning: true, // Start running by default
  sampleRate: 50000, // 50 kHz sample rate (50 samples/cycle at 1kHz)
  bufferSize: 100000, // Number of samples in display buffer (~2 seconds at 50kHz)
  timeScale: 50, // 50 ms per division
  outputs: defaultOutputs,
  buffers: null,
  effectiveSampleRate: 5000, // Sample rate after decimation (50000 / 10, where 10 = ceil(100000/10000))
  selectedFftBlock: 'bpf', // Default to showing BPF output (original behavior)
  oscilloscopeMode: false, // Rolling mode by default
  triggerLevel: 0, // Zero-crossing trigger
  triggerIndex: null, // No trigger detected initially
  triggerTime: null, // Simulation time of last trigger
  nextTriggerSearchTime: 0, // Can search for trigger immediately
};

export const useSimulationStore = create<SimulationStoreState>((set) => ({
  ...defaultState,

  setIsRunning: (running) => set({ isRunning: running }),

  setTimeScale: (scale) => set({ timeScale: Math.max(1, Math.min(200, scale)) }),

  setSelectedFftBlock: (block) => set({ selectedFftBlock: block }),

  setOscilloscopeMode: (enabled) => set({ oscilloscopeMode: enabled, triggerIndex: null, triggerTime: null, nextTriggerSearchTime: 0 }),

  setTriggerLevel: (level) => set({ triggerLevel: level, triggerIndex: null, triggerTime: null, nextTriggerSearchTime: 0 }),

  setTriggerIndex: (index) => set({ triggerIndex: index }),

  setTriggerTime: (time) => set({ triggerTime: time }),

  setNextTriggerSearchTime: (time) => set({ nextTriggerSearchTime: time }),

  updateOutputs: (outputs) => set({ outputs }),

  updateBuffers: (buffers, effectiveSampleRate) => set({ buffers, effectiveSampleRate }),

  clearBuffers: () => set({ buffers: null, outputs: defaultOutputs }),

  reset: () =>
    set({
      ...defaultState,
      buffers: null,
    }),
}));

// Selector for getting all parameters needed for simulation
export const useSimulationParams = () => {
  const { sampleRate, bufferSize } = useSimulationStore();
  return { sampleRate, bufferSize };
};
