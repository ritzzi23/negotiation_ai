import React, { useState, useEffect } from 'react';
import clsx from 'clsx';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  error?: string;
  helpText?: string;
  onIncrement?: () => void;
  onDecrement?: () => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function NumberInput({
  label,
  error,
  helpText,
  className,
  id,
  value,
  onChange,
  onIncrement,
  onDecrement,
  min,
  step,
  ...props
}: NumberInputProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  // Track the display string separately so user can clear the field
  const [displayValue, setDisplayValue] = useState<string>(
    value !== undefined && value !== null ? String(value) : ''
  );

  // Sync external value changes (e.g. from sample data load)
  useEffect(() => {
    if (value !== undefined && value !== null) {
      setDisplayValue(String(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Allow empty string (user is clearing to retype)
    if (raw === '' || raw === '-') {
      setDisplayValue(raw);
      // Fire onChange with 0 so parent state doesn't break, but display stays empty
      if (onChange) {
        const syntheticEvent = {
          ...e,
          target: { ...e.target, value: '0' },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
      return;
    }

    // Allow valid numeric input (integers and decimals)
    if (/^-?\d*\.?\d*$/.test(raw)) {
      setDisplayValue(raw);
      if (onChange) {
        onChange(e);
      }
    }
  };

  const handleBlur = () => {
    // On blur, if empty, restore to min or 0
    if (displayValue === '' || displayValue === '-') {
      const fallback = min !== undefined ? String(min) : '0';
      setDisplayValue(fallback);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {onDecrement && (
          <button
            type="button"
            onClick={onDecrement}
            className="absolute left-2 p-1 text-neutral-500 hover:text-neutral-700 focus:outline-none"
            disabled={props.disabled}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        )}
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          className={clsx(
            'w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors',
            error
              ? 'border-danger-500 focus:ring-danger-500'
              : 'border-neutral-300',
            (onIncrement || onDecrement) && 'px-10 text-center',
            props.disabled && 'bg-neutral-100 cursor-not-allowed',
            className
          )}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          {...props}
        />
        {onIncrement && (
          <button
            type="button"
            onClick={onIncrement}
            className="absolute right-2 p-1 text-neutral-500 hover:text-neutral-700 focus:outline-none"
            disabled={props.disabled}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-danger-600">{error}</p>
      )}
      {helpText && !error && (
        <p className="mt-1 text-sm text-neutral-500">{helpText}</p>
      )}
    </div>
  );
}
