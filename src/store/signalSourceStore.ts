import { create } from 'zustand';
import type { SignalSourceParams, Interferer } from '../types';

interface SignalSourceState extends SignalSourceParams {
  // Actions
  setReferenceFrequency: (freq: number) => void;
  setReferenceAmplitude: (amp: number) => void;
  setModulatingFrequency: (freq: number) => void;
  setModulationIndex: (index: number) => void;
  setPhaseShift: (phase: number) => void;
  setSensorOutputAmplitude: (amp: number) => void;
  setWhiteNoiseAmplitude: (amp: number) => void;
  addInterferer: (interferer: Omit<Interferer, 'id'>) => void;
  removeInterferer: (id: string) => void;
  updateInterferer: (id: string, updates: Partial<Omit<Interferer, 'id'>>) => void;
  reset: () => void;
}

const defaultState: SignalSourceParams = {
  referenceFrequency: 100, // 100 Hz
  referenceAmplitude: 1.0, // 1 V
  modulatingFrequency: 10, // 10 Hz
  modulationIndex: 0.5, // 50% modulation depth
  phaseShift: 0, // 0 degrees
  sensorOutputAmplitude: 1.0, // 1 V
  whiteNoiseAmplitude: 0.1, // 0.1 V std dev
  interferers: [],
};

let interfererIdCounter = 0;

export const useSignalSourceStore = create<SignalSourceState>((set) => ({
  ...defaultState,

  setReferenceFrequency: (freq) =>
    set({ referenceFrequency: Math.max(1, Math.min(1000, freq)) }),

  setReferenceAmplitude: (amp) =>
    set({ referenceAmplitude: Math.max(0, amp) }),

  setModulatingFrequency: (freq) =>
    set({ modulatingFrequency: Math.max(0.1, freq) }),

  setModulationIndex: (index) =>
    set({ modulationIndex: Math.max(0, Math.min(1, index)) }),

  setPhaseShift: (phase) =>
    set({ phaseShift: ((phase % 360) + 360) % 360 }),

  setSensorOutputAmplitude: (amp) =>
    set({ sensorOutputAmplitude: Math.max(0, amp) }),

  setWhiteNoiseAmplitude: (amp) =>
    set({ whiteNoiseAmplitude: Math.max(0, amp) }),

  addInterferer: (interferer) =>
    set((state) => ({
      interferers: [
        ...state.interferers,
        { ...interferer, id: `int-${++interfererIdCounter}` },
      ],
    })),

  removeInterferer: (id) =>
    set((state) => ({
      interferers: state.interferers.filter((i) => i.id !== id),
    })),

  updateInterferer: (id, updates) =>
    set((state) => ({
      interferers: state.interferers.map((i) =>
        i.id === id ? { ...i, ...updates } : i
      ),
    })),

  reset: () => set(defaultState),
}));
