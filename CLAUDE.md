# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lock-in Amplifier Simulator - an interactive educational tool that simulates digital signal processing in real-time. Visualizes the complete signal chain from sensor input through phase-sensitive detection to demodulated output.

## Commands

```bash
npm run dev      # Start Vite dev server with HMR
npm run build    # TypeScript compilation + Vite production build
npm run lint     # ESLint validation
npm run preview  # Preview production build
```

## Tech Stack

- React 19 with TypeScript (strict mode)
- Vite for build tooling
- Zustand for state management
- uPlot for efficient signal graphing
- Web Worker for off-thread DSP simulation

## Architecture

### Data Flow

```
Zustand Stores → useSimulation Hook → Web Worker (DSP) → Circular Buffers → SignalGraph (uPlot)
```

The simulation runs in a Web Worker at 50 kHz sample rate, posts updates at 30 FPS to the main thread, where React components render the signal data.

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `/src/store` | Zustand stores (simulationStore, signalSourceStore, filterStore, mixerStore) |
| `/src/simulation/worker` | Web Worker running the DSP loop (simulation.worker.ts) |
| `/src/simulation/dsp` | DSP algorithms: oscillator, filters, mixer, noise, modulation |
| `/src/simulation/buffers` | CircularBuffer with decimation for display (50K→2.5K points) |
| `/src/components/layout` | Three-panel layout (Left: inputs, Center: block diagram, Right: outputs) |
| `/src/components/graphs` | SignalGraph (uPlot wrapper), FrequencySpectrum |
| `/src/hooks` | useSimulation (worker communication), useAnimationFrame |
| `/src/types` | TypeScript interfaces for all domains |

### DSP Signal Chain (in worker)

1. Oscillators (reference + modulating signals)
2. AM Modulation (sensor signal generation)
3. Noise injection (white noise + interferers)
4. BandPass Filter (optional, configurable order 1/2/4)
5. Phase-Sensitive Detector (analog or digital mixer mode)
6. LowPass Filters (separate I and Q channels)
7. Output computation (I, Q, signed output, phase)

## Code Patterns

- **DSP components**: Class-based with mutable state, Biquad filter cascading for higher orders
- **React components**: Functional with hooks, Zustand for state (not Context)
- **Worker communication**: Typed message passing with discriminated unions
- **Performance**: Circular buffers with decimation, 30 FPS update limit, Float64Array for numerical data
- **Styling**: Dark theme, modular CSS co-located with components
