import { create } from 'zustand';
import type { MixerParams, MixerMode } from '../types';

interface MixerState extends MixerParams {
  setMode: (mode: MixerMode) => void;
  reset: () => void;
}

const defaultState: MixerParams = {
  mode: 'analog',
};

export const useMixerStore = create<MixerState>((set) => ({
  ...defaultState,

  setMode: (mode) => set({ mode }),

  reset: () => set(defaultState),
}));
