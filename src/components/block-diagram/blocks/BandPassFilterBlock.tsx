import { forwardRef } from 'react';
import { BaseBlock } from './BaseBlock';
import { NumberInput } from '../controls/NumberInput';
import { SelectInput } from '../controls/SelectInput';
import { useFilterStore, useSimulationStore } from '../../../store';
import type { FilterOrder } from '../../../types';
import './BandPassFilterBlock.css';

const orderOptions = [
  { value: 1, label: '1st (6dB/oct)' },
  { value: 2, label: '2nd (12dB/oct)' },
  { value: 4, label: '4th (24dB/oct)' },
];

export const BandPassFilterBlock = forwardRef<HTMLDivElement>(
  function BandPassFilterBlock(_props, ref) {
  const bpf = useFilterStore((s) => s.bandPassFilter);
  const setBpfEnabled = useFilterStore((s) => s.setBpfEnabled);
  const setBpfCenterFrequency = useFilterStore((s) => s.setBpfCenterFrequency);
  const setBpfBandwidth = useFilterStore((s) => s.setBpfBandwidth);
  const setBpfOrder = useFilterStore((s) => s.setBpfOrder);

  const selectedFftBlock = useSimulationStore((s) => s.selectedFftBlock);

  return (
    <BaseBlock
      ref={ref}
      title="Band-Pass Filter"
      color="orange"
      selectable
      isSelected={selectedFftBlock === 'bpf'}
    >
      <label className="bpf-toggle">
        <input
          type="checkbox"
          checked={bpf.enabled}
          onChange={(e) => setBpfEnabled(e.target.checked)}
        />
        <span className="toggle-label">{bpf.enabled ? 'Enabled' : 'Bypassed'}</span>
      </label>
      <div className={bpf.enabled ? '' : 'bpf-disabled'}>
        <NumberInput
          label="Center Freq"
          value={bpf.centerFrequency}
          onChange={setBpfCenterFrequency}
          min={1}
          step={10}
          unit="Hz"
          width={55}
        />
        <NumberInput
          label="Bandwidth"
          value={bpf.bandwidth}
          onChange={setBpfBandwidth}
          min={1}
          step={5}
          unit="Hz"
          width={55}
        />
        <SelectInput
          label="Order"
          value={bpf.order}
          onChange={(v) => setBpfOrder(v as FilterOrder)}
          options={orderOptions}
          width={100}
        />
      </div>
    </BaseBlock>
  );
});
