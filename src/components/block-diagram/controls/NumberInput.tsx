import { useState, useCallback, type ChangeEvent, type KeyboardEvent } from 'react';
import './controls.css';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  width?: number;
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  unit,
  width = 60,
}: NumberInputProps) {
  const [localValue, setLocalValue] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  }, []);

  const commitValue = useCallback(() => {
    let numValue = parseFloat(localValue);
    if (isNaN(numValue)) {
      numValue = value;
    }
    if (min !== undefined) numValue = Math.max(min, numValue);
    if (max !== undefined) numValue = Math.min(max, numValue);
    setLocalValue(String(numValue));
    onChange(numValue);
  }, [localValue, value, min, max, onChange]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    commitValue();
  }, [commitValue]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setLocalValue(String(value));
  }, [value]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        commitValue();
        (e.target as HTMLInputElement).blur();
      } else if (e.key === 'Escape') {
        setLocalValue(String(value));
        (e.target as HTMLInputElement).blur();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        let newValue = value + step;
        if (max !== undefined) newValue = Math.min(max, newValue);
        onChange(newValue);
        setLocalValue(String(newValue));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        let newValue = value - step;
        if (min !== undefined) newValue = Math.max(min, newValue);
        onChange(newValue);
        setLocalValue(String(newValue));
      }
    },
    [commitValue, value, step, min, max, onChange]
  );

  // Update local value when external value changes (if not focused)
  if (!isFocused && String(value) !== localValue) {
    setLocalValue(String(value));
  }

  return (
    <div className="number-input-container">
      {label && <span className="input-label">{label}</span>}
      <div className="input-wrapper">
        <input
          type="text"
          className="number-input"
          value={isFocused ? localValue : value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          style={{ width }}
        />
        {unit && <span className="input-unit">{unit}</span>}
      </div>
    </div>
  );
}
