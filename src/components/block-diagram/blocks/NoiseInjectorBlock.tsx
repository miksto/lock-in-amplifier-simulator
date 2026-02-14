import { forwardRef } from 'react';
import { BaseBlock } from './BaseBlock';
import { NumberInput } from '../controls/NumberInput';
import { useSignalSourceStore, useSimulationStore } from '../../../store';

export const NoiseInjectorBlock = forwardRef<HTMLDivElement>(
  function NoiseInjectorBlock(_props, ref) {
  const whiteNoiseAmplitude = useSignalSourceStore((s) => s.whiteNoiseAmplitude);
  const interferers = useSignalSourceStore((s) => s.interferers);
  const setWhiteNoiseAmplitude = useSignalSourceStore((s) => s.setWhiteNoiseAmplitude);
  const addInterferer = useSignalSourceStore((s) => s.addInterferer);
  const removeInterferer = useSignalSourceStore((s) => s.removeInterferer);
  const updateInterferer = useSignalSourceStore((s) => s.updateInterferer);

  const selectedFftBlock = useSimulationStore((s) => s.selectedFftBlock);

  const handleAddInterferer = () => {
    addInterferer({ frequency: 50, amplitude: 0.1 });
  };

  return (
    <BaseBlock
      ref={ref}
      title="Noise Injector"
      color="red"
      selectable
      isSelected={selectedFftBlock === 'noise'}
    >
      <NumberInput
        label="White Noise σ"
        value={whiteNoiseAmplitude}
        onChange={setWhiteNoiseAmplitude}
        min={0}
        step={0.01}
        unit="V"
        width={55}
      />
      <div className="interferer-list">
        {interferers.map((int) => (
          <div key={int.id} className="interferer-item">
            <NumberInput
              value={int.frequency}
              onChange={(f) => updateInterferer(int.id, { frequency: f })}
              min={1}
              step={10}
              unit="Hz"
              width={40}
            />
            <NumberInput
              value={int.amplitude}
              onChange={(a) => updateInterferer(int.id, { amplitude: a })}
              min={0}
              step={0.1}
              unit="V"
              width={35}
            />
            <button
              className="interferer-remove"
              onClick={() => removeInterferer(int.id)}
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button className="add-interferer-btn" onClick={handleAddInterferer}>
        + Add Interferer
      </button>
    </BaseBlock>
  );
});
