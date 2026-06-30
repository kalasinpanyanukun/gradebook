import React, { useEffect, useState } from 'react';
import { AppData, ScoreConfig } from '../types';
import { Sparkles, X } from 'lucide-react';
import { ModalPortal } from './ModalPortal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  scoreConfig?: ScoreConfig;
  students: AppData['students'];
  onFill: (minGrade: number, maxGrade: number, studentIds?: string[]) => void;
}

type FillMode = 'all' | 'individual';

function normalizedSelection(currentIds: string[], count: number, students: AppData['students']) {
  const availableIds = students.map(student => student.id);
  const selectedIds = currentIds
    .filter((id, index, ids) => availableIds.includes(id) && ids.indexOf(id) === index)
    .slice(0, count);

  for (const student of students) {
    if (selectedIds.length >= count) break;
    if (!selectedIds.includes(student.id)) selectedIds.push(student.id);
  }

  return selectedIds;
}

export const AutoFillModal: React.FC<Props> = ({ isOpen, onClose, scoreConfig, students, onFill }) => {
  const [minGrade, setMinGrade] = useState<number>(2);
  const [maxGrade, setMaxGrade] = useState<number>(4);
  const [fillMode, setFillMode] = useState<FillMode>('all');
  const [selectedCount, setSelectedCount] = useState<number>(1);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const nextCount = Math.min(Math.max(selectedCount, 1), Math.max(students.length, 1));
    if (nextCount !== selectedCount) {
      setSelectedCount(nextCount);
    }
    setSelectedStudentIds(prev => normalizedSelection(prev, nextCount, students));
  }, [isOpen, selectedCount, students]);

  if (!isOpen || !scoreConfig) return null;

  const handleFill = () => {
    const targetStudentIds = fillMode === 'individual'
      ? normalizedSelection(selectedStudentIds, selectedCount, students)
      : undefined;

    onFill(minGrade, maxGrade, targetStudentIds);
    onClose();
  };

  const handleSelectedCountChange = (count: number) => {
    setSelectedCount(count);
    setSelectedStudentIds(prev => normalizedSelection(prev, count, students));
  };

  const handleStudentChange = (index: number, studentId: string) => {
    setSelectedStudentIds(prev => {
      const next = normalizedSelection(prev, selectedCount, students);
      next[index] = studentId;
      return next;
    });
  };

  const grades = [0, 1, 1.5, 2, 2.5, 3, 3.5, 4];
  const studentCountOptions = Array.from({ length: students.length }, (_, index) => index + 1);
  const canFill = fillMode === 'all' || students.length > 0;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[120] grid min-h-dvh place-items-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
        <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <Sparkles size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">ระบบช่วยบันทึกคะแนน</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <p className="text-slate-600 mb-6">
            เลือกระดับผลการเรียน (เกรด) ต่ำสุดและสูงสุดที่ต้องการ ระบบจะทำการช่วยบันทึกคะแนนให้อัตโนมัติ
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">รูปแบบการบันทึก</label>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setFillMode('all')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    fillMode === 'all'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:bg-white/60'
                  }`}
                >
                  บันทึกทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => setFillMode('individual')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    fillMode === 'individual'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:bg-white/60'
                  }`}
                >
                  บันทึกรายบุคคล
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">เกรดต่ำสุด</label>
                <select
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                  value={minGrade}
                  onChange={(e) => setMinGrade(parseFloat(e.target.value))}
                >
                  {grades.map(g => (
                    <option key={`min-${g}`} value={g} disabled={g > maxGrade}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">เกรดสูงสุด</label>
                <select
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                  value={maxGrade}
                  onChange={(e) => setMaxGrade(parseFloat(e.target.value))}
                >
                  {grades.map(g => (
                    <option key={`max-${g}`} value={g} disabled={g < minGrade}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {fillMode === 'individual' && (
              <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">จำนวนคน</label>
                  <select
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                    value={selectedCount}
                    onChange={(e) => handleSelectedCountChange(parseInt(e.target.value))}
                    disabled={students.length === 0}
                  >
                    {students.length > 0 ? studentCountOptions.map(count => (
                      <option key={count} value={count}>{count} คน</option>
                    )) : (
                      <option value={1}>ไม่มีรายชื่อนักเรียน</option>
                    )}
                  </select>
                </div>

                {students.length > 0 ? (
                  <div className="space-y-3">
                    {Array.from({ length: selectedCount }, (_, index) => {
                      const currentId = selectedStudentIds[index] || students[index]?.id || '';
                      return (
                        <div key={`student-select-${index}`}>
                          <label className="block text-sm font-medium text-slate-700 mb-2">รายชื่อคนที่ {index + 1}</label>
                          <select
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                            value={currentId}
                            onChange={(e) => handleStudentChange(index, e.target.value)}
                          >
                            {students.map(student => {
                              const isSelectedElsewhere = selectedStudentIds.some((id, selectedIndex) => id === student.id && selectedIndex !== index);
                              return (
                                <option key={student.id} value={student.id} disabled={isSelectedElsewhere}>
                                  {student.studentId ? `${student.studentId} - ${student.name}` : student.name}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    ยังไม่มีรายชื่อนักเรียนให้เลือก
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 font-medium transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleFill}
            disabled={!canFill}
            className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles size={18} />
            บันทึกคะแนน
          </button>
        </div>
        </div>
      </div>
    </ModalPortal>
  );
};
