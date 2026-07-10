'use client';

import React, { useEffect, useRef, useState } from 'react';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  name?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  error?: boolean;
  /** Set to '' to hide the leading "Rp" prefix. */
  prefix?: string;
}

function formatDigits(n: number): string {
  if (!n || n <= 0) return '';
  return Math.trunc(n).toLocaleString('id-ID');
}

/**
 * Rupiah input that masks thousands separators as the user types and only
 * ever accepts digit characters — so a pasted/typed value like
 * "202.020.000" can never be silently mis-parsed the way native
 * <input type="number"> mis-parses multi-dot text (see: Customer PO
 * "Selisih" bug, Q.SYN-26.0152). `onChange` always receives the raw
 * integer Rupiah value, never the formatted display string.
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(function CurrencyInput(
  { value, onChange, onBlur, name, id, placeholder = '0', className = '', disabled, required, autoFocus, error, prefix = 'Rp' },
  ref,
) {
  const [display, setDisplay] = useState(() => formatDigits(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDisplay(formatDigits(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    const numeric = digitsOnly === '' ? 0 : Number(digitsOnly);
    setDisplay(digitsOnly === '' ? '' : Number(digitsOnly).toLocaleString('id-ID'));
    onChange(numeric);
  };

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        name={name}
        id={id}
        value={display}
        onChange={handleChange}
        onFocus={() => { focused.current = true; }}
        onBlur={() => { focused.current = false; setDisplay(formatDigits(value)); onBlur?.(); }}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        className={`erp-input font-tabular text-right ${prefix ? 'pl-8' : ''} ${error ? 'border-red-400' : ''} ${className}`}
      />
    </div>
  );
});

export default CurrencyInput;
