import { forwardRef } from 'react';
import { BaseBlock } from './BaseBlock';
import { NumberInput } from '../controls/NumberInput';
import { SelectInput } from '../controls/SelectInput';
import { useFilterStore, useSimulationStore, type FftBlockId } from '../../../store';
import type { FilterOrder } from '../../../types';

const orderOptions = [
  { value: 1, label: '1st (6dB/oct)' },
  { value: 2, label: '2nd (12dB/oct)' },
  { value: 4, label: '4th (24dB/oct)' },
];

interface LowPassFilterBlockProps {
  channel: 'I' | 'Q';
  showControls?: boolean;
}

export const LowPassFilterBlock = forwardRef<HTMLDivElement, LowPassFilterBlockProps>(
  function LowPassFilterBlock({ channel, showControls = false }, ref) {
    const lpf = useFilterStore((s) => s.lowPassFilter);
    const setLpfCutoffFrequency = useFilterStore((s) => s.setLpfCutoffFrequency);
    const setLpfOrder = useFilterStore((s) => s.setLpfOrder);

    const selectedFftBlock = useSimulationStore((s) => s.selectedFftBlock);

    const fftBlockId: FftBlockId = channel === 'I' ? 'lpfI' : 'lpfQ';

    return (
      <BaseBlock
        ref={ref}
        title={`LPF (${channel})`}
        color="orange"
        selectable
        isSelected={selectedFftBlock === fftBlockId}
      >
        {showControls ? (
          <>
            <NumberInput
              label="Cutoff Freq"
              value={lpf.cutoffFrequency}
              onChange={setLpfCutoffFrequency}
              min={0.1}
              step={1}
              unit="Hz"
              width={55}
            />
            <SelectInput
              label="Order"
              value={lpf.order}
              onChange={(v) => setLpfOrder(v as FilterOrder)}
              options={orderOptions}
              width={100}
            />
          </>
        ) : (
          <div style={{ fontSize: '9px', color: '#8892b0', textAlign: 'center' }}>
            {lpf.cutoffFrequency} Hz
          </div>
        )}
      </BaseBlock>
    );
  }
);
