import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { isoDateToDisplay } from '../lib/thaiDate';

interface ThaiDateCalendarInputProps {
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  className?: string;
}

const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const WEEKDAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function parseIsoParts(iso: string): { year: number; month: number; day: number } | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day };
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function weekdayOf(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay();
}

function todayIso(): string {
  const now = new Date();
  return toIsoDate(now.getFullYear() + 543, now.getMonth() + 1, now.getDate());
}

export function ThaiDateCalendarInput({
  value,
  onChange,
  disabled = false,
  className,
}: ThaiDateCalendarInputProps) {
  const parsed = parseIsoParts(value);
  const initialView = parsed ?? parseIsoParts(todayIso()) ?? { year: 2569, month: 1, day: 1 };

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initialView.year);
  const [viewMonth, setViewMonth] = useState(initialView.month);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const parts = parseIsoParts(value);
    if (parts) {
      setViewYear(parts.year);
      setViewMonth(parts.month);
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open]);

  const calendarCells = useMemo(() => {
    const totalDays = daysInMonth(viewYear, viewMonth);
    const leadingBlanks = weekdayOf(viewYear, viewMonth, 1);
    const cells: Array<{ day: number | null; iso: string | null }> = [];

    for (let index = 0; index < leadingBlanks; index += 1) {
      cells.push({ day: null, iso: null });
    }

    for (let day = 1; day <= totalDays; day += 1) {
      cells.push({ day, iso: toIsoDate(viewYear, viewMonth, day) });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ day: null, iso: null });
    }

    return cells;
  }, [viewMonth, viewYear]);

  const shiftMonth = (delta: number) => {
    let nextMonth = viewMonth + delta;
    let nextYear = viewYear;

    while (nextMonth < 1) {
      nextMonth += 12;
      nextYear -= 1;
    }
    while (nextMonth > 12) {
      nextMonth -= 12;
      nextYear += 1;
    }

    setViewMonth(nextMonth);
    setViewYear(nextYear);
  };

  const pickDate = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

  const displayText = isoDateToDisplay(value) || 'เลือกวันที่';

  const triggerClassName =
    className ??
    'mt-1 flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

  const modal = open
    ? createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="เลือกวันที่"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-extrabold text-slate-900">เลือกวันที่</p>
                  <p className="text-xs font-medium text-slate-500">รูปแบบ วัน/เดือน/ปี (พ.ศ.)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
                aria-label="ปิด"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  aria-label="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <p className="text-lg font-extrabold text-slate-900">
                  {THAI_MONTHS[viewMonth - 1]} {viewYear}
                </p>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  aria-label="เดือนถัดไป"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="py-1 text-center text-xs font-bold uppercase tracking-wide text-slate-400"
                  >
                    {label}
                  </div>
                ))}

                {calendarCells.map((cell, index) => {
                  if (!cell.day || !cell.iso) {
                    return <div key={`blank-${index}`} className="aspect-square" />;
                  }

                  const selected = cell.iso === value;
                  const isToday = cell.iso === todayIso();

                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      onClick={() => pickDate(cell.iso!)}
                      className={`aspect-square rounded-xl text-base font-bold transition ${
                        selected
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                          : isToday
                            ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-200 hover:bg-blue-100'
                            : 'text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => pickDate(todayIso())}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  วันนี้
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onChange('');
                      setOpen(false);
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    ล้างวันที่
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-slate-800"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(true)}
        className={triggerClassName}
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>{displayText}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-blue-600" />
      </button>
      {modal}
    </>
  );
}
