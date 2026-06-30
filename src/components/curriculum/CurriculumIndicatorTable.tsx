import React from 'react';
import { BookOpen, Pencil, Trash2 } from 'lucide-react';
import type { CurriculumIndicatorRecord } from '../../data/curriculum/types';

interface CurriculumIndicatorTableProps {
  rows: CurriculumIndicatorRecord[];
  loading?: boolean;
  selectedIds: Set<string>;
  allSelected: boolean;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  onEdit: (row: CurriculumIndicatorRecord) => void;
  onDelete: (row: CurriculumIndicatorRecord) => void;
  readOnly?: boolean;
}

function CellText({ value, title }: { value: string | null | undefined; title?: string }) {
  if (!value) return <span className="text-slate-300">—</span>;
  return (
    <span className="block whitespace-normal break-words text-slate-700" title={title ?? value}>
      {value}
    </span>
  );
}

const thClass =
  'bg-[#0f172a] px-3 py-3 text-center align-middle font-semibold text-slate-100';

const actionCellClass =
  'sticky right-0 z-20 bg-white px-3 py-3.5 text-center shadow-[-4px_0_8px_rgba(15,23,42,0.06)]';

const actionHeaderClass =
  'sticky right-0 z-40 bg-[#0f172a] px-3 py-3 text-center align-middle font-semibold text-slate-100 shadow-[-4px_0_8px_rgba(15,23,42,0.2)]';

export const CurriculumIndicatorTable: React.FC<CurriculumIndicatorTableProps> = ({
  rows,
  loading,
  selectedIds,
  allSelected,
  onToggleRow,
  onToggleAll,
  onEdit,
  onDelete,
  readOnly = false,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        กำลังโหลด...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
        ไม่พบมาตรฐานหรือตัวชี้วัดตามเงื่อนไขที่เลือก
      </div>
    );
  }

  return (
    <table className="w-full min-w-[1280px] table-fixed border-collapse text-sm">
      <colgroup>
        {!readOnly && <col className="w-[3%]" />}
        <col className={readOnly ? 'w-[6%]' : 'w-[5%]'} />
        <col className={readOnly ? 'w-[12%]' : 'w-[11%]'} />
        <col className={readOnly ? 'w-[8%]' : 'w-[7%]'} />
        <col className={readOnly ? 'w-[28%]' : 'w-[24%]'} />
        <col className={readOnly ? 'w-[22%]' : 'w-[20%]'} />
        <col className={readOnly ? 'w-[24%]' : 'w-[22%]'} />
        {!readOnly && <col className="w-[8%]" />}
      </colgroup>
      <thead className="sticky top-0 z-30 border-b border-slate-700 bg-[#0f172a] text-slate-100 shadow-md">
        <tr>
          {!readOnly && (
            <th className={`${thClass} whitespace-nowrap`}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                className="h-4 w-4 rounded border-slate-500 text-blue-500 focus:ring-blue-400"
                aria-label={allSelected ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
              />
            </th>
          )}
          <th className={`${thClass} whitespace-nowrap`}>ระดับชั้น</th>
          <th className={`${thClass} whitespace-nowrap`}>สาระที่</th>
          <th className={`${thClass} whitespace-nowrap`}>มาตรฐาน</th>
          <th className={thClass}>มาตรฐานการเรียนรู้</th>
          <th className={thClass}>ตัวชี้วัดระหว่างทาง</th>
          <th className={thClass}>ตัวชี้วัดปลายทาง</th>
          {!readOnly && <th className={`${actionHeaderClass} whitespace-nowrap`}>จัดการ</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((row) => (
          <tr key={row.id} className="group align-top transition-colors hover:bg-slate-50/70">
            {!readOnly && (
              <td className="px-3 py-3.5 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.has(row.id)}
                  onChange={() => onToggleRow(row.id)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  aria-label={`เลือกมาตรฐาน ${row.standardCode}`}
                />
              </td>
            )}
            <td className="px-3 py-3.5 text-center font-semibold text-slate-800 whitespace-nowrap">
              {row.gradeLevel}
            </td>
            <td className="px-3 py-3.5 text-center text-slate-700">
              <div className="font-medium leading-snug">สาระที่ {row.strandNo}</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-500">{row.strandName}</div>
            </td>
            <td className="px-3 py-3.5 text-center font-mono text-base font-semibold text-blue-700 whitespace-nowrap">
              {row.standardCode}
            </td>
            <td className="px-4 py-3.5 text-left text-slate-700 leading-relaxed">
              <CellText value={row.standardDescription} />
            </td>
            <td className="px-3 py-3.5 text-left text-slate-700">
              <CellText value={row.midwayIndicator} />
            </td>
            <td className="px-3 py-3.5 text-left text-slate-700">
              <CellText value={row.exitIndicator} />
            </td>
            {!readOnly && (
              <td className={`${actionCellClass} group-hover:bg-slate-50/70`}>
                <div className="flex justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onEdit(row)}
                    className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-600 transition hover:bg-blue-100"
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(row)}
                    className="inline-flex items-center rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700 transition hover:bg-red-100"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    ลบ
                  </button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
