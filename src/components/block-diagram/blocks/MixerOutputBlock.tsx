import { forwardRef } from 'react';
import { BaseBlock } from './BaseBlock';
import { SelectInput } from '../controls/SelectInput';
import { useSimulationStore, useMixerStore, type FftBlockId } from '../../../store';
import type { MixerMode } from '../../../types';

const modeOptions = [
  { value: 'analog' as MixerMode, label: 'Analog (sine)' },
  { value: 'digital' as MixerMode, label: 'Digital (square)' },
];

interface MixerOutputBlockProps {
  channel: 'I' | 'Q';
  showControls?: boolean;
}

export const MixerOutputBlock = forwardRef<HTMLDivElement, MixerOutputBlockProps>(
  function MixerOutputBlock({ channel, showControls = false }, ref) {
    const selectedFftBlock = useSimulationStore((s) => s.selectedFftBlock);

    const mode = useMixerStore((s) => s.mode);
    const setMode = useMixerStore((s) => s.setMode);

    const fftBlockId: FftBlockId = channel === 'I' ? 'mixerI' : 'mixerQ';

    return (
      <BaseBlock
        ref={ref}
        title={`Mixer (${channel})`}
        color="purple"
        selectable
        isSelected={selectedFftBlock === fftBlockId}
      >
        {showControls ? (
          <>
            <SelectInput
              label="Mode"
              value={mode}
              onChange={(v) => setMode(v as MixerMode)}
              options={modeOptions}
              width={110}
            />
            <div style={{ fontSize: '9px', color: '#8892b0', marginTop: '4px' }}>
              {mode === 'analog' ? 'I: sig × sin(ref)' : 'I: sig × sign(ref)'}
              <br />
              {mode === 'analog' ? 'Q: sig × cos(ref)' : 'Q: sig × sign(ref+90°)'}
            </div>
          </>
        ) : (
          <div style={{ fontSize: '9px', color: '#8892b0', textAlign: 'center' }}>
            {channel === 'I' ? 'In-phase' : 'Quadrature'}
          </div>
        )}
      </BaseBlock>
    );
  }
);
