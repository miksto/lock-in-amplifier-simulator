# Lock-in Amplifier Simulator

Interactive lock-in amplifier simulator built with React + TypeScript.
It demonstrates how weak modulated signals can be recovered from noise using
phase-sensitive detection, filtering, and I/Q demodulation.

## Features

- Real-time DSP simulation in a Web Worker (off the UI thread)
- Zero-copy worker-to-UI transfer via `SharedArrayBuffer` double buffering
- Interactive block diagram of the full signal chain
- Time-domain views for each major stage (reference, noisy input, BPF, mixer, LPF, output)
- FFT view selectable by clicking blocks in the diagram
- Configurable:
  - reference frequency and amplitude
  - DUT modulation frequency/index/phase/sensor amplitude
  - white noise level and multiple sinusoidal interferers
  - band-pass filter enable, center frequency, bandwidth, order
  - low-pass cutoff and order
  - mixer mode (`analog` sine/cosine or `digital` square-wave)
- Oscilloscope-style triggered mode and rolling mode

## Signal Chain

1. Reference oscillator
2. DUT modulation (simulated sensor signal)
3. Noise injection (Gaussian + interferers)
4. Optional band-pass filtering
5. Phase-sensitive detection (I/Q mixer)
6. Low-pass filtering (I and Q)
7. Output metrics: `I`, `Q`, signed output, phase

## Tech Stack

- React 19
- TypeScript
- Vite
- Zustand
- uPlot
- `@xyflow/react` (diagram UI)

## Requirements

- Node.js 24.x
- npm

## Getting Started

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Scripts

```bash
npm run dev      # Start local dev server
npm run build    # Type-check + production build
npm run lint     # ESLint
npm run preview  # Preview production build locally
```

## SharedArrayBuffer / Cross-Origin Isolation

This project uses `SharedArrayBuffer`, so COOP/COEP headers are required.
They are already configured for:

- Vite dev server (`vite.config.ts`)
- Vite preview (`vite.config.ts`)
- Firebase Hosting (`firebase.json`)

If you deploy elsewhere, ensure these headers are set:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

## Project Structure

```text
src/
  components/    UI panels, graphs, block diagram
  hooks/         Simulation lifecycle and worker integration
  simulation/
    dsp/         Oscillator, filters, mixer, noise generation
    worker/      Real-time simulation loop
    buffers/     Circular buffers and decimation
  store/         Zustand stores (signal, filters, mixer, simulation UI state)
  types/         Shared TypeScript types
```

## Deployment

GitHub Actions workflows deploy to Firebase Hosting:

- Pull requests: preview channel
- `main` branch: live channel

## License

MIT (see `LICENSE`)
