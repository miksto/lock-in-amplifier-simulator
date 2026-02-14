import { forwardRef } from 'react';
import { BaseBlock } from './BaseBlock';
import { NumberInput } from '../controls/NumberInput';
import { useSignalSourceStore, useSimulationStore } from '../../../store';

export const DUTModulatorBlock = forwardRef<HTMLDivElement>(
  function DUTModulatorBlock(_props, ref) {
  const modulatingFrequency = useSignalSourceStore((s) => s.modulatingFrequency);
  const modulationIndex = useSignalSourceStore((s) => s.modulationIndex);
  const phaseShift = useSignalSourceStore((s) => s.phaseShift);
  const sensorOutputAmplitude = useSignalSourceStore((s) => s.sensorOutputAmplitude);
  const setModulatingFrequency = useSignalSourceStore((s) => s.setModulatingFrequency);
  const setModulationIndex = useSignalSourceStore((s) => s.setModulationIndex);
  const setPhaseShift = useSignalSourceStore((s) => s.setPhaseShift);
  const setSensorOutputAmplitude = useSignalSourceStore((s) => s.setSensorOutputAmplitude);

  const selectedFftBlock = useSimulationStore((s) => s.selectedFftBlock);

  return (
    <BaseBlock
      ref={ref}
      title="DUT Modulator"
      color="green"
      selectable
      isSelected={selectedFftBlock === 'modulator'}
    >
      <div className="block-row">
        <NumberInput
          label="Mod Freq"
          value={modulatingFrequency}
          onChange={setModulatingFrequency}
          min={0.1}
          step={1}
          unit="Hz"
          width={45}
        />
        <NumberInput
          label="Mod Index"
          value={modulationIndex}
          onChange={setModulationIndex}
          min={0}
          max={1}
          step={0.1}
          unit=""
          width={45}
        />
      </div>
      <div className="block-row">
        <NumberInput
          label="Sensor Out"
          value={sensorOutputAmplitude}
          onChange={setSensorOutputAmplitude}
          min={0}
          step={0.1}
          unit="V"
          width={45}
        />
        <NumberInput
          label="Phase"
          value={phaseShift}
          onChange={setPhaseShift}
          min={0}
          max={360}
          step={5}
          unit="°"
          width={45}
        />
      </div>
    </BaseBlock>
  );
});
