import { create } from 'zustand';
import type { BandPassFilterParams, LowPassFilterParams, FilterOrder } from '../types';

interface FilterState {
  bandPassFilter: BandPassFilterParams;
  lowPassFilter: LowPassFilterParams;

  // Band-pass filter actions
  setBpfEnabled: (enabled: boolean) => void;
  setBpfCenterFrequency: (freq: number) => void;
  setBpfBandwidth: (bw: number) => void;
  setBpfOrder: (order: FilterOrder) => void;

  // Low-pass filter actions
  setLpfCutoffFrequency: (freq: number) => void;
  setLpfOrder: (order: FilterOrder) => void;

  reset: () => void;
}

const defaultState = {
  bandPassFilter: {
    enabled: true,
    centerFrequency: 100, // Hz (matches default reference frequency)
    bandwidth: 50, // Hz
    order: 2 as FilterOrder,
  },
  lowPassFilter: {
    cutoffFrequency: 10, // Hz
    order: 2 as FilterOrder,
  },
};

export const useFilterStore = create<FilterState>((set) => ({
  ...defaultState,

  setBpfEnabled: (enabled) =>
    set((state) => ({
      bandPassFilter: {
        ...state.bandPassFilter,
        enabled,
      },
    })),

  setBpfCenterFrequency: (freq) =>
    set((state) => ({
      bandPassFilter: {
        ...state.bandPassFilter,
        centerFrequency: Math.max(1, freq),
      },
    })),

  setBpfBandwidth: (bw) =>
    set((state) => ({
      bandPassFilter: {
        ...state.bandPassFilter,
        bandwidth: Math.max(1, bw),
      },
    })),

  setBpfOrder: (order) =>
    set((state) => ({
      bandPassFilter: {
        ...state.bandPassFilter,
        order,
      },
    })),

  setLpfCutoffFrequency: (freq) =>
    set((state) => ({
      lowPassFilter: {
        ...state.lowPassFilter,
        cutoffFrequency: Math.max(0.1, freq),
      },
    })),

  setLpfOrder: (order) =>
    set((state) => ({
      lowPassFilter: {
        ...state.lowPassFilter,
        order,
      },
    })),

  reset: () => set(defaultState),
}));
