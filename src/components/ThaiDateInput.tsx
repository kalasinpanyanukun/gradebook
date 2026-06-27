import React, { useEffect, useState } from 'react';
import { displayToIsoDate, isoDateToDisplay } from '../lib/thaiDate';

interface ThaiDateInputProps {
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ThaiDateInput({
  value,
  onChange,
  disabled = false,
  className = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400',
}: ThaiDateInputProps) {
  const [text, setText] = useState(() => isoDateToDisplay(value));

  useEffect(() => {
    setText(isoDateToDisplay(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="วว/ดด/ปปปป"
      value={text}
      disabled={disabled}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        if (!next.trim()) {
          onChange('');
          return;
        }
        const iso = displayToIsoDate(next);
        if (iso) onChange(iso);
      }}
      onBlur={() => {
        if (!text.trim()) {
          onChange('');
          setText('');
          return;
        }
        const iso = displayToIsoDate(text);
        if (iso) {
          onChange(iso);
          setText(isoDateToDisplay(iso));
          return;
        }
        setText(isoDateToDisplay(value));
      }}
      className={className}
    />
  );
}
