import { forwardRef } from 'react';
import { BaseBlock } from './BaseBlock';
import { NumberInput } from '../controls/NumberInput';
import { useSignalSourceStore, useSimulationStore } from '../../../store';

export const ReferenceOscillatorBlock = forwardRef<HTMLDivElement>(
  function ReferenceOscillatorBlock(_props, ref) {
  const referenceFrequency = useSignalSourceStore((s) => s.referenceFrequency);
  const referenceAmplitude = useSignalSourceStore((s) => s.referenceAmplitude);
  const setReferenceFrequency = useSignalSourceStore((s) => s.setReferenceFrequency);
  const setReferenceAmplitude = useSignalSourceStore((s) => s.setReferenceAmplitude);

  const selectedFftBlock = useSimulationStore((s) => s.selectedFftBlock);

  return (
    <BaseBlock
      ref={ref}
      title="Reference Oscillator"
      color="blue"
      selectable
      isSelected={selectedFftBlock === 'reference'}
    >
      <NumberInput
        label="Frequency"
        value={referenceFrequency}
        onChange={setReferenceFrequency}
        min={1}
        max={1000}
        step={1}
        unit="Hz"
        width={55}
      />
      <NumberInput
        label="Amplitude"
        value={referenceAmplitude}
        onChange={setReferenceAmplitude}
        min={0}
        step={0.1}
        unit="V"
        width={55}
      />
    </BaseBlock>
  );
});
