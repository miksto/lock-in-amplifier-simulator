import { useCallback, type ChangeEvent } from 'react';
import './controls.css';

interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface SelectInputProps<T extends string | number> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  label?: string;
  width?: number;
}

export function SelectInput<T extends string | number>({
  value,
  onChange,
  options,
  label,
  width = 80,
}: SelectInputProps<T>) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const newValue = e.target.value;
      // Determine if we should parse as number
      const firstOption = options[0];
      if (typeof firstOption?.value === 'number') {
        onChange(Number(newValue) as T);
      } else {
        onChange(newValue as T);
      }
    },
    [onChange, options]
  );

  return (
    <div className="select-input-container">
      {label && <span className="input-label">{label}</span>}
      <select
        className="select-input"
        value={value}
        onChange={handleChange}
        style={{ width }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
