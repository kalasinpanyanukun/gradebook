import React, { useEffect, useState } from 'react';
import { AppData } from '../types';
import { Sparkles, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  students: AppData['students'];
  onFill: (minScore: number, maxScore: number, studentIds?: string[]) => void;
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

export const AutoFillAttributesModal: React.FC<Props> = ({ isOpen, onClose, students, onFill }) => {
  const [minScore, setMinScore] = useState<number>(1);
  const [maxScore, setMaxScore] = useState<number>(3);
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

  if (!isOpen) return null;

  const handleFill = () => {
    const targetStudentIds = fillMode === 'individual'
      ? normalizedSelection(selectedStudentIds, selectedCount, students)
      : undefined;

    onFill(minScore, maxScore, targetStudentIds);
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

  const scores = [0, 1, 2, 3];
  const studentCountOptions = Array.from({ length: students.length }, (_, index) => index + 1);
  const canFill = fillMode === 'all' || students.length > 0;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <Sparkles size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">ระบบช่วยลงคะแนนอัตโนมัติ</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <p className="text-slate-600 mb-6">
            เลือกคะแนนต่ำสุดและสูงสุดที่ต้องการ (0-3) ระบบจะช่วยลงคะแนนให้อัตโนมัติ
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">รูปแบบการลงคะแนน</label>
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
                  ทั้งหมด
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
                  รายบุคคล
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">คะแนนต่ำสุด</label>
                <select
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                  value={minScore}
                  onChange={(e) => setMinScore(parseInt(e.target.value))}
                >
                  {scores.map(score => (
                    <option key={`min-${score}`} value={score} disabled={score > maxScore}>{score}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">คะแนนสูงสุด</label>
                <select
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                  value={maxScore}
                  onChange={(e) => setMaxScore(parseInt(e.target.value))}
                >
                  {scores.map(score => (
                    <option key={`max-${score}`} value={score} disabled={score < minScore}>{score}</option>
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
                        <div key={`attribute-student-select-${index}`}>
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
            ลงคะแนน
          </button>
        </div>
      </div>
    </div>
  );
};
