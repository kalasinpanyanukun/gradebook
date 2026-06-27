import React from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';

function cn(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(' ');
}

const controlBoxClass =
  'relative flex min-h-[42px] items-stretch overflow-hidden rounded-lg border border-[#bcc4d0] bg-white shadow-[0_1px_0_rgba(255,255,255,0.9)] transition focus-within:border-[#5b8def] focus-within:ring-2 focus-within:ring-blue-100';

const inputControlClass =
  'h-full min-h-[42px] w-full rounded-lg bg-transparent pl-4 pr-3 text-left text-[15px] font-bold leading-snug text-[#0f2942] outline-none placeholder:font-medium placeholder:text-slate-400';

const selectControlClass =
  'h-full min-h-[42px] w-full cursor-pointer appearance-none rounded-lg border-0 bg-transparent bg-none pl-4 pr-10 text-left text-[15px] font-bold leading-snug text-[#0f2942] outline-none [-moz-appearance:none] [-webkit-appearance:none] [background-image:none]';

const chevronClass =
  'pointer-events-none absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#0f2942]';

const fieldShellClass = 'filter-bar-field flex shrink-0 flex-col';

export function FilterDropdown({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(controlBoxClass, className)}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={selectControlClass}
      >
        {children}
      </select>
      <ChevronDown className={chevronClass} strokeWidth={2.25} aria-hidden />
    </div>
  );
}

export function FilterBar({
  children,
  className,
  minWidth,
  fill = false,
}: {
  children: React.ReactNode;
  className?: string;
  minWidth?: string;
  fill?: boolean;
}) {
  return (
    <section
      className={cn(
        'rounded-xl border border-[#d5dbe3] bg-[#eef1f5] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]',
        fill && 'w-full',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-end gap-3',
          fill
            ? 'w-full [&_.filter-bar-field]:min-w-0 [&_.filter-bar-field]:flex-1 [&>button]:shrink-0'
            : 'flex-wrap gap-x-4 gap-y-3',
        )}
        style={minWidth ? { minWidth } : undefined}
      >
        {children}
      </div>
    </section>
  );
}

export function FilterField({
  label,
  children,
  className,
  style,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn(fieldShellClass, className)} style={style}>
      <span className="mb-1.5 block text-center text-[13px] font-medium leading-none text-slate-700">{label}</span>
      {children}
    </div>
  );
}

export function FilterSearch({
  label = 'ค้นหา',
  value,
  onChange,
  placeholder,
  className,
  style,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <FilterField label={label} className={className} style={style}>
      <div className={controlBoxClass}>
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={inputControlClass}
        />
      </div>
    </FilterField>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  children,
  className,
  style,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <FilterField label={label} className={className} style={style}>
      <FilterDropdown value={value} onChange={onChange}>
        {children}
      </FilterDropdown>
    </FilterField>
  );
}

export function FilterClearButton({
  onClick,
  disabled = false,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-[42px] shrink-0 items-center gap-1.5 rounded-lg border border-[#bcc4d0] bg-white px-4 text-sm font-bold text-[#0f2942] shadow-[0_1px_0_rgba(255,255,255,0.9)] transition hover:border-[#9aa8ba] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
    >
      <RotateCcw className="h-4 w-4" />
      ล้างค่า
    </button>
  );
}

export function FilterBarActions({ children }: { children: React.ReactNode }) {
  return <div className="ml-auto flex shrink-0 flex-wrap items-end gap-3 pl-2">{children}</div>;
}
