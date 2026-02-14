import { useMemo } from 'react';
import { SignalGraph } from '../graphs/SignalGraph';
import { NumericDisplay } from '../common/NumericDisplay';
import { useSimulationStore, useSignalSourceStore } from '../../store';

export function RightPanel() {
  const buffers = useSimulationStore((state) => state.buffers);
  const outputs = useSimulationStore((state) => state.outputs);
  const timeScale = useSimulationStore((state) => state.timeScale);
  const sampleRate = useSimulationStore((state) => state.sampleRate);
  const oscilloscopeMode = useSimulationStore((state) => state.oscilloscopeMode);
  const triggerIndex = useSimulationStore((state) => state.triggerIndex);

  // Get signal source parameters (same as modulating signal range)
  const sensorOutputAmplitude = useSignalSourceStore((state) => state.sensorOutputAmplitude);
  const modulationIndex = useSignalSourceStore((state) => state.modulationIndex);

  // Y range for demodulated outputs (based on modulating signal amplitude)
  const yRange = useMemo(() => {
    const maxAmp = Math.max(sensorOutputAmplitude * modulationIndex, 0.1);
    const padding = maxAmp * 0.1;
    return {
      yMin: -(maxAmp + padding),
      yMax: maxAmp + padding,
    };
  }, [sensorOutputAmplitude, modulationIndex]);

  // Y range for raw mixer outputs (larger, based on full signal amplitude)
  const mixerYRange = useMemo(() => {
    const maxAmp = Math.max(sensorOutputAmplitude, 0.1);
    const padding = maxAmp * 0.1;
    return {
      yMin: -(maxAmp + padding),
      yMax: maxAmp + padding,
    };
  }, [sensorOutputAmplitude]);

  return (
    <>
      <SignalGraph
        title="Mixer I (Raw)"
        data={buffers?.mixerI ?? null}
        timeData={buffers?.time ?? null}
        timeScale={timeScale}
        sampleRate={sampleRate}
        color="#66aaff"
        height={120}
        yMin={mixerYRange.yMin}
        yMax={mixerYRange.yMax}
        oscilloscopeMode={oscilloscopeMode}
        triggerIndex={triggerIndex}
      />
      <SignalGraph
        title="Mixer Q (Raw)"
        data={buffers?.mixerQ ?? null}
        timeData={buffers?.time ?? null}
        timeScale={timeScale}
        sampleRate={sampleRate}
        color="#ff66aa"
        height={120}
        yMin={mixerYRange.yMin}
        yMax={mixerYRange.yMax}
        oscilloscopeMode={oscilloscopeMode}
        triggerIndex={triggerIndex}
      />
      <SignalGraph
        title="I Output (In-phase)"
        data={buffers?.iOutput ?? null}
        timeData={buffers?.time ?? null}
        timeScale={timeScale}
        sampleRate={sampleRate}
        color="#00ff88"
        height={120}
        yMin={yRange.yMin}
        yMax={yRange.yMax}
        oscilloscopeMode={oscilloscopeMode}
        triggerIndex={triggerIndex}
      />
      <SignalGraph
        title="Q Output (Quadrature)"
        data={buffers?.qOutput ?? null}
        timeData={buffers?.time ?? null}
        timeScale={timeScale}
        sampleRate={sampleRate}
        color="#ff88ff"
        height={120}
        yMin={yRange.yMin}
        yMax={yRange.yMax}
        oscilloscopeMode={oscilloscopeMode}
        triggerIndex={triggerIndex}
      />
      <SignalGraph
        title="Signed Output"
        data={buffers?.signedOutput ?? null}
        timeData={buffers?.time ?? null}
        timeScale={timeScale}
        sampleRate={sampleRate}
        color="#ffaa00"
        height={120}
        yMin={yRange.yMin}
        yMax={yRange.yMax}
        oscilloscopeMode={oscilloscopeMode}
        triggerIndex={triggerIndex}
      />
      <NumericDisplay
        title="Phase θ"
        value={outputs.phase}
        unit="°"
        precision={2}
      />
    </>
  );
}
