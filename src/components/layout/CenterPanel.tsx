import { BlockDiagram } from '../block-diagram/BlockDiagram';
import { FrequencySpectrum } from '../graphs/FrequencySpectrum';
import { useSimulationStore, blockToBuffer, blockDisplayNames } from '../../store';

export function CenterPanel() {
  const buffers = useSimulationStore((state) => state.buffers);
  const effectiveSampleRate = useSimulationStore((state) => state.effectiveSampleRate);
  const selectedFftBlock = useSimulationStore((state) => state.selectedFftBlock);

  const bufferKey = blockToBuffer[selectedFftBlock];
  const fftData = buffers?.[bufferKey] ?? null;
  const fftTitle = `FFT: ${blockDisplayNames[selectedFftBlock]}`;

  return (
    <>
      <BlockDiagram />
      <FrequencySpectrum
        data={fftData}
        sampleRate={effectiveSampleRate}
        title={fftTitle}
      />
    </>
  );
}
