import { useMemo } from 'react';
import { SignalGraph } from '../graphs/SignalGraph';
import { useSimulationStore, useSignalSourceStore } from '../../store';

export function LeftPanel() {
  const buffers = useSimulationStore((state) => state.buffers);
  const timeScale = useSimulationStore((state) => state.timeScale);
  const sampleRate = useSimulationStore((state) => state.sampleRate);
  const oscilloscopeMode = useSimulationStore((state) => state.oscilloscopeMode);
  const triggerIndex = useSimulationStore((state) => state.triggerIndex);

  // Get signal source parameters for calculating stable Y range
  const referenceAmplitude = useSignalSourceStore((state) => state.referenceAmplitude);
  const sensorOutputAmplitude = useSignalSourceStore((state) => state.sensorOutputAmplitude);
  const modulationIndex = useSignalSourceStore((state) => state.modulationIndex);
  const whiteNoiseAmplitude = useSignalSourceStore((state) => state.whiteNoiseAmplitude);
  const interferers = useSignalSourceStore((state) => state.interferers);

  // Y range for reference signal (its own range)
  const referenceYRange = useMemo(() => {
    const maxAmp = Math.max(referenceAmplitude, 0.1);
    const padding = maxAmp * 0.1;
    return {
      yMin: -(maxAmp + padding),
      yMax: maxAmp + padding,
    };
  }, [referenceAmplitude]);

  // Stable Y range for modulating signal (centered at 0)
  // The modulating signal shows the actual modulation envelope: sensorOutputAmplitude * modulationIndex * sin(...)
  const modulatingYRange = useMemo(() => {
    const maxAmp = Math.max(sensorOutputAmplitude * modulationIndex, 0.1);
    const padding = maxAmp * 0.1;
    return {
      yMin: -(maxAmp + padding),
      yMax: maxAmp + padding,
    };
  }, [sensorOutputAmplitude, modulationIndex]);

  // Y range for sensor signals (DSB-SC: max = sensorOutput * modIndex + noise)
  const sensorYRange = useMemo(() => {
    // DSB-SC sensor signal max amplitude
    const maxSensorSignal = sensorOutputAmplitude * modulationIndex;

    // Max noise: white noise (3 sigma covers ~99.7%) + all interferers
    const interfererSum = interferers.reduce((sum, i) => sum + i.amplitude, 0);
    const maxNoise = whiteNoiseAmplitude * 3 + interfererSum;

    // Combined signal + noise
    const maxAmplitude = Math.max(maxSensorSignal + maxNoise, 0.1);
    const padding = maxAmplitude * 0.1;

    return {
      yMin: -(maxAmplitude + padding),
      yMax: maxAmplitude + padding,
    };
  }, [sensorOutputAmplitude, modulationIndex, whiteNoiseAmplitude, interferers]);

  return (
    <>
      <SignalGraph
        title="Reference Signal"
        data={buffers?.reference ?? null}
        timeData={buffers?.time ?? null}
        timeScale={timeScale}
        sampleRate={sampleRate}
        color="#00d4ff"
        height={100}
        yMin={referenceYRange.yMin}
        yMax={referenceYRange.yMax}
        oscilloscopeMode={oscilloscopeMode}
        triggerIndex={triggerIndex}
      />
      <SignalGraph
        title="Modulating Signal"
        data={buffers?.modulating ?? null}
        timeData={buffers?.time ?? null}
        timeScale={timeScale}
        sampleRate={sampleRate}
        color="#00ff88"
        height={100}
        yMin={modulatingYRange.yMin}
        yMax={modulatingYRange.yMax}
        oscilloscopeMode={oscilloscopeMode}
        triggerIndex={triggerIndex}
      />
      <SignalGraph
        title="Modulating + Noise"
        data={buffers?.modulatingPlusNoise ?? null}
        timeData={buffers?.time ?? null}
        timeScale={timeScale}
        sampleRate={sampleRate}
        color="#88ffaa"
        height={100}
        yMin={sensorYRange.yMin}
        yMax={sensorYRange.yMax}
        oscilloscopeMode={oscilloscopeMode}
        triggerIndex={triggerIndex}
      />
      <SignalGraph
        title="Injected Noise"
        data={buffers?.noise ?? null}
        timeData={buffers?.time ?? null}
        timeScale={timeScale}
        sampleRate={sampleRate}
        color="#ff6b6b"
        height={100}
        yMin={sensorYRange.yMin}
        yMax={sensorYRange.yMax}
        oscilloscopeMode={oscilloscopeMode}
        triggerIndex={triggerIndex}
      />
      <SignalGraph
        title="Sensor + Noise"
        data={buffers?.sensor ?? null}
        timeData={buffers?.time ?? null}
        timeScale={timeScale}
        sampleRate={sampleRate}
        color="#4ecdc4"
        height={100}
        yMin={sensorYRange.yMin}
        yMax={sensorYRange.yMax}
        oscilloscopeMode={oscilloscopeMode}
        triggerIndex={triggerIndex}
      />
      <SignalGraph
        title="After BPF"
        data={buffers?.afterBpf ?? null}
        timeData={buffers?.time ?? null}
        timeScale={timeScale}
        sampleRate={sampleRate}
        color="#ffe66d"
        height={100}
        yMin={sensorYRange.yMin}
        yMax={sensorYRange.yMax}
        oscilloscopeMode={oscilloscopeMode}
        triggerIndex={triggerIndex}
      />
    </>
  );
}
