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
  /**
   * 'inline' (default): prefix floats absolutely inside the same bordered box as every other
   * existing usage of this component — unchanged.
   * 'chip': prefix renders as its own bordered/shaded box to the left of the input, matching the
   * RAB/BQ mockup's boxed "Rp" chip (Main.dc.html / Kosong.dc.html) — only used there so far.
   */
  prefixVariant?: 'inline' | 'chip';
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
  {
    value,
    onChange,
    onBlur,
    name,
    id,
    placeholder = '0',
    className = '',
    disabled,
    required,
    autoFocus,
    error,
    prefix = 'Rp',
    prefixVariant = 'inline',
  },
  ref
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

  const sharedInputProps = {
    ref,
    type: 'text' as const,
    inputMode: 'numeric' as const,
    autoComplete: 'off',
    name,
    id,
    value: display,
    onChange: handleChange,
    onFocus: () => {
      focused.current = true;
    },
    onBlur: () => {
      focused.current = false;
      setDisplay(formatDigits(value));
      onBlur?.();
    },
    placeholder,
    disabled,
    required,
    autoFocus,
  };

  if (prefixVariant === 'chip' && prefix) {
    return (
      <div
        className={`flex items-center h-10 box-border border border-[#c9ced6] rounded-lg bg-white overflow-hidden ${error ? 'border-red-400' : ''} ${className}`}
      >
        <span className="px-2 h-full inline-flex items-center bg-[#f4f5f7] text-[#5b6472] text-sm border-r border-[#e3e6eb] flex-shrink-0">
          {prefix}
        </span>
        <input
          {...sharedInputProps}
          className="flex-1 min-w-0 h-full border-0 outline-none px-2 text-right font-tabular bg-transparent"
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        {...sharedInputProps}
        className={`erp-input font-tabular text-right ${prefix ? 'pl-8' : ''} ${error ? 'border-red-400' : ''} ${className}`}
      />
    </div>
  );
});

export default CurrencyInput;
