import { forwardRef } from 'react';
import { BaseBlock } from './BaseBlock';
import { useSimulationStore } from '../../../store';

export const OutputBlock = forwardRef<HTMLDivElement>(
  function OutputBlock(_props, ref) {
  const outputs = useSimulationStore((s) => s.outputs);
  const selectedFftBlock = useSimulationStore((s) => s.selectedFftBlock);

  const formatValue = (val: number) => {
    if (Math.abs(val) < 0.001) {
      return val.toExponential(2);
    }
    return val.toFixed(4);
  };

  return (
    <BaseBlock
      ref={ref}
      title="Output"
      color="blue"
      selectable
      isSelected={selectedFftBlock === 'output'}
    >
      <div className="output-values">
        <div className="output-row">
          <span className="output-label">I:</span>
          <span className="output-value">{formatValue(outputs.i)} V</span>
        </div>
        <div className="output-row">
          <span className="output-label">Q:</span>
          <span className="output-value">{formatValue(outputs.q)} V</span>
        </div>
        <div className="output-row">
          <span className="output-label">Out:</span>
          <span className="output-value">{formatValue(outputs.signedOutput)} V</span>
        </div>
        <div className="output-row">
          <span className="output-label">θ:</span>
          <span className="output-value">{outputs.phase.toFixed(2)}°</span>
        </div>
      </div>
      <style>{`
        .output-values {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .output-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          font-family: 'Consolas', 'Monaco', monospace;
        }
        .output-label {
          color: #8892b0;
        }
        .output-value {
          color: #00d4ff;
        }
      `}</style>
    </BaseBlock>
  );
});
