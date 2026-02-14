import { useEffect, useRef, useCallback } from 'react';
import { useSignalSourceStore } from '../store/signalSourceStore';
import { useFilterStore } from '../store/filterStore';
import { useMixerStore } from '../store/mixerStore';
import { useSimulationStore } from '../store/simulationStore';
import type { SimulationParams, WorkerOutboundMessage, WorkerInboundMessage, SignalBuffers } from '../types';
import {
  calculateSharedBufferSize,
  createSharedBufferViews,
  getActiveBuffer,
  type SharedBufferViews,
} from '../simulation/sharedBufferLayout';

const MAX_DISPLAY_POINTS = 10000;

export function useSimulation() {
  const workerRef = useRef<Worker | null>(null);
  const sharedBufferRef = useRef<SharedArrayBuffer | null>(null);
  const sharedViewsRef = useRef<SharedBufferViews | null>(null);
  const isInitialized = useRef(false);

  // Get store states
  const signalSource = useSignalSourceStore();
  const filterState = useFilterStore();
  const mixerState = useMixerStore();
  const simulationState = useSimulationStore();

  // Build simulation params from stores
  const buildParams = useCallback((): SimulationParams => {
    return {
      signalSource: {
        referenceFrequency: signalSource.referenceFrequency,
        referenceAmplitude: signalSource.referenceAmplitude,
        modulatingFrequency: signalSource.modulatingFrequency,
        modulationIndex: signalSource.modulationIndex,
        phaseShift: signalSource.phaseShift,
        sensorOutputAmplitude: signalSource.sensorOutputAmplitude,
        whiteNoiseAmplitude: signalSource.whiteNoiseAmplitude,
        interferers: signalSource.interferers,
      },
      bandPassFilter: filterState.bandPassFilter,
      lowPassFilter: filterState.lowPassFilter,
      mixer: { mode: mixerState.mode },
      sampleRate: simulationState.sampleRate,
      bufferSize: simulationState.bufferSize,
    };
  }, [
    signalSource.referenceFrequency,
    signalSource.referenceAmplitude,
    signalSource.modulatingFrequency,
    signalSource.modulationIndex,
    signalSource.phaseShift,
    signalSource.sensorOutputAmplitude,
    signalSource.whiteNoiseAmplitude,
    signalSource.interferers,
    filterState.bandPassFilter,
    filterState.lowPassFilter,
    mixerState.mode,
    simulationState.sampleRate,
    simulationState.bufferSize,
  ]);

  // Initialize worker and shared buffer
  useEffect(() => {
    if (isInitialized.current) return;

    // Create shared buffer
    const bufferSize = calculateSharedBufferSize(MAX_DISPLAY_POINTS);
    const sharedBuffer = new SharedArrayBuffer(bufferSize);
    sharedBufferRef.current = sharedBuffer;
    sharedViewsRef.current = createSharedBufferViews(sharedBuffer, MAX_DISPLAY_POINTS);

    // Create worker
    const worker = new Worker(
      new URL('../simulation/worker/simulation.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>) => {
      const message = event.data;

      if (message.type === 'frameReady' && sharedViewsRef.current) {
        // Read from the active buffer (worker just swapped, so this has fresh data)
        const activeBuffer = getActiveBuffer(sharedViewsRef.current);
        const dataLength = message.dataLength;

        // Create subarray views for the valid data range
        // Note: subarray() creates lightweight view objects (~32 bytes each), not data copies
        const buffers: SignalBuffers = {
          reference: activeBuffer.reference.subarray(0, dataLength),
          modulating: activeBuffer.modulating.subarray(0, dataLength),
          modulatingPlusNoise: activeBuffer.modulatingPlusNoise.subarray(0, dataLength),
          sensorClean: activeBuffer.sensorClean.subarray(0, dataLength),
          noise: activeBuffer.noise.subarray(0, dataLength),
          sensor: activeBuffer.sensor.subarray(0, dataLength),
          afterBpf: activeBuffer.afterBpf.subarray(0, dataLength),
          mixerI: activeBuffer.mixerI.subarray(0, dataLength),
          mixerQ: activeBuffer.mixerQ.subarray(0, dataLength),
          iOutput: activeBuffer.iOutput.subarray(0, dataLength),
          qOutput: activeBuffer.qOutput.subarray(0, dataLength),
          signedOutput: activeBuffer.signedOutput.subarray(0, dataLength),
          time: activeBuffer.time.subarray(0, dataLength),
        };

        simulationState.updateBuffers(buffers, message.effectiveSampleRate);
        simulationState.updateOutputs(message.outputs);
      }
    };

    worker.onerror = (error) => {
      console.error('Simulation worker error:', error);
    };

    workerRef.current = worker;
    isInitialized.current = true;

    // Initialize worker with shared buffer
    worker.postMessage({
      type: 'init',
      sharedBuffer,
      maxDisplayPoints: MAX_DISPLAY_POINTS,
    } as WorkerInboundMessage);

    // Start simulation if it should be running
    if (simulationState.isRunning) {
      const params = buildParams();
      worker.postMessage({ type: 'start', params } as WorkerInboundMessage);
    }

    return () => {
      worker.postMessage({ type: 'stop' } as WorkerInboundMessage);
      worker.terminate();
      workerRef.current = null;
      sharedBufferRef.current = null;
      sharedViewsRef.current = null;
      isInitialized.current = false;
    };
  }, []); // Only run once on mount

  // Handle start/stop
  useEffect(() => {
    if (!workerRef.current || !isInitialized.current) return;

    if (simulationState.isRunning) {
      const params = buildParams();
      workerRef.current.postMessage({ type: 'start', params } as WorkerInboundMessage);
    } else {
      workerRef.current.postMessage({ type: 'stop' } as WorkerInboundMessage);
    }
  }, [simulationState.isRunning, buildParams]);

  // Send parameter updates to worker
  useEffect(() => {
    if (!workerRef.current || !simulationState.isRunning) return;

    const params = buildParams();
    workerRef.current.postMessage({
      type: 'updateParams',
      params,
    } as WorkerInboundMessage);
  }, [
    signalSource.referenceFrequency,
    signalSource.referenceAmplitude,
    signalSource.modulatingFrequency,
    signalSource.modulationIndex,
    signalSource.phaseShift,
    signalSource.sensorOutputAmplitude,
    signalSource.whiteNoiseAmplitude,
    signalSource.interferers,
    filterState.bandPassFilter,
    filterState.lowPassFilter,
    mixerState.mode,
    buildParams,
    simulationState.isRunning,
  ]);

  // Control functions
  const start = useCallback(() => {
    simulationState.setIsRunning(true);
  }, [simulationState]);

  const stop = useCallback(() => {
    simulationState.setIsRunning(false);
  }, [simulationState]);

  const toggle = useCallback(() => {
    simulationState.setIsRunning(!simulationState.isRunning);
  }, [simulationState]);

  return {
    isRunning: simulationState.isRunning,
    outputs: simulationState.outputs,
    buffers: simulationState.buffers,
    start,
    stop,
    toggle,
  };
}
