import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { Profile } from '../types';

interface SearchableTeacherSelectProps {
  value: string;
  teachers: Profile[];
  onChange: (teacherId: string) => void;
  disabled?: boolean;
  getLabel: (teacher: Profile) => string;
  placeholder?: string;
}

export function SearchableTeacherSelect({
  value,
  teachers,
  onChange,
  disabled = false,
  getLabel,
  placeholder = '— เว้นว่าง —',
}: SearchableTeacherSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return undefined;
    }

    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const selectedTeacher = teachers.find((teacher) => teacher.id === value);
  const selectedLabel = selectedTeacher ? getLabel(selectedTeacher) : placeholder;

  const normalizedQuery = query.trim().toLowerCase();
  const compactQuery = normalizedQuery.replace(/\s+/g, '');
  const filteredTeachers = teachers.filter((teacher) => {
    if (!normalizedQuery) return true;
    const label = getLabel(teacher).toLowerCase();
    const compactLabel = label.replace(/\s+/g, '');
    const username = (teacher.username ?? '').toLowerCase();
    return (
      label.includes(normalizedQuery) ||
      compactLabel.includes(compactQuery) ||
      username.includes(normalizedQuery) ||
      username.replace(/\s+/g, '').includes(compactQuery)
    );
  });

  const pickTeacher = (teacherId: string) => {
    onChange(teacherId);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-left text-sm text-slate-800 outline-none transition hover:border-slate-300 hover:bg-white focus:border-blue-400 focus:bg-white focus:ring-[3px] focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className={`truncate ${value ? 'font-medium' : 'text-slate-400'}`}>{selectedLabel}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[240px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-100">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="พิมพ์ค้นหาชื่อครู..."
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => pickTeacher('')}
                className={`w-full px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${!value ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-500'}`}
              >
                {placeholder}
              </button>
            </li>
            {filteredTeachers.map((teacher) => (
              <li key={teacher.id}>
                <button
                  type="button"
                  onClick={() => pickTeacher(teacher.id)}
                  className={`w-full px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
                    teacher.id === value ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-800'
                  }`}
                >
                  {getLabel(teacher)}
                </button>
              </li>
            ))}
            {filteredTeachers.length === 0 && (
              <li className="px-3 py-3 text-center text-sm text-slate-400">ไม่พบครูที่ตรงกับคำค้นหา</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
