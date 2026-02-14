import './NumericDisplay.css';

interface NumericDisplayProps {
  title: string;
  value: number;
  unit?: string;
  precision?: number;
}

export function NumericDisplay({
  title,
  value,
  unit = '',
  precision = 2,
}: NumericDisplayProps) {
  const formatValue = (val: number): string => {
    if (Math.abs(val) < 0.001 && val !== 0) {
      return val.toExponential(precision);
    }
    return val.toFixed(precision);
  };

  return (
    <div className="numeric-display">
      <div className="display-title">{title}</div>
      <div className="display-value">
        <span className="value-number">{formatValue(value)}</span>
        {unit && <span className="value-unit">{unit}</span>}
      </div>
    </div>
  );
}
