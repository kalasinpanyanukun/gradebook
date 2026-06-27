import React, { useState } from 'react';
import { ScoreConfig } from '../types';
import { Sparkles, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  scoreConfig?: ScoreConfig;
  onFill: (minGrade: number, maxGrade: number) => void;
}

export const AutoFillModal: React.FC<Props> = ({ isOpen, onClose, scoreConfig, onFill }) => {
  const [minGrade, setMinGrade] = useState<number>(2);
  const [maxGrade, setMaxGrade] = useState<number>(4);

  if (!isOpen || !scoreConfig) return null;

  const handleFill = () => {
    onFill(minGrade, maxGrade);
    onClose();
  };

  const grades = [0, 1, 1.5, 2, 2.5, 3, 3.5, 4];

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <Sparkles size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">กรอกคะแนนอัตโนมัติ (สุ่ม)</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-slate-600 mb-6">
            เลือกระดับผลการเรียน (เกรด) ต่ำสุดและสูงสุดที่ต้องการ ระบบจะทำการสุ่มคะแนนรวมและกระจายคะแนนไปยังตัวชี้วัดต่างๆ ให้อัตโนมัติ
          </p>

          <div className="space-y-6">
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
            className="btn btn-primary"
          >
            <Sparkles size={18} />
            สุ่มคะแนน
          </button>
        </div>
      </div>
    </div>
  );
};
