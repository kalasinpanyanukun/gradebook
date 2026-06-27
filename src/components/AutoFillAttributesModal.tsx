import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onFill: (minScore: number, maxScore: number) => void;
}

export const AutoFillAttributesModal: React.FC<Props> = ({ isOpen, onClose, onFill }) => {
  const [minScore, setMinScore] = useState<number>(1);
  const [maxScore, setMaxScore] = useState<number>(3);

  if (!isOpen) return null;

  const handleFill = () => {
    onFill(minScore, maxScore);
    onClose();
  };

  const scores = [0, 1, 2, 3];

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
            เลือกคะแนนต่ำสุดและสูงสุดที่ต้องการ (0-3) ระบบจะทำการสุ่มคะแนนไปยังตัวชี้วัดต่างๆ ให้อัตโนมัติ
          </p>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">คะแนนต่ำสุด</label>
              <select
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                value={minScore}
                onChange={(e) => setMinScore(parseInt(e.target.value))}
              >
                {scores.map(s => (
                  <option key={`min-${s}`} value={s} disabled={s > maxScore}>{s}</option>
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
                {scores.map(s => (
                  <option key={`max-${s}`} value={s} disabled={s < minScore}>{s}</option>
                ))}
              </select>
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
