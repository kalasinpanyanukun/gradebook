import React, { useEffect } from 'react';
import { AppData, Indicator } from '../types';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { curriculumData } from '../data/curriculumData';

interface Props {
  data: AppData['indicators'];
  scoreConfig?: AppData['scoreConfig'];
  generalInfo?: AppData['generalInfo'];
  onChange: (data: AppData['indicators']) => void;
}

export const IndicatorsForm: React.FC<Props> = ({ data, scoreConfig, generalInfo, onChange }) => {
  
  const handleAutoFill = () => {
    if (!scoreConfig) return;
    
    const uniqueCodes = new Set<string>();
    scoreConfig.units.forEach(u => {
      u.indicators.forEach(ind => {
        if (ind.code) uniqueCodes.add(ind.code.trim());
      });
    });
    
    const newIndicators: Indicator[] = Array.from(uniqueCodes).map(code => {
      let description = '';
      for (const curriculum of curriculumData) {
        for (const standard of curriculum.standards) {
          for (const ind of standard.indicators) {
            if (ind.code === code) {
              description = ind.description;
              break;
            }
          }
          if (description) break;
        }
        if (description) break;
      }
      return { id: code, description };
    });
    
    onChange(newIndicators);
  };

  // Auto-fill on mount if empty and config exists
  useEffect(() => {
    if (data.length === 0 && scoreConfig && scoreConfig.units.length > 0) {
      handleAutoFill();
    }
  }, []);

  const handleAdd = () => {
    const newIndicator: Indicator = {
      id: '',
      description: ''
    };
    onChange([...data, newIndicator]);
  };

  const handleRemove = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof Indicator, value: string) => {
    onChange(data.map((ind, i) => i === index ? { ...ind, [field]: value } : ind));
  };

  return (
    <div className="flex justify-center rounded-2xl bg-slate-100/90 p-4 sm:p-6 overflow-auto">
      <div className="bg-white p-4 rounded-lg ring-1 ring-slate-200/80 shadow-[0_12px_32px_-8px_rgb(15,23,42,0.12)]" style={{ width: '1123px', minHeight: '794px', fontFamily: 'Sarabun' }}>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">ตัวชี้วัด</h2>
          <div className="flex gap-2">
            <button 
              onClick={handleAutoFill} 
              className="flex items-center gap-1 px-4 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm font-medium transition-colors"
              title="ดึงข้อมูลจากเมนูคะแนนรายตัวชี้วัด"
            >
              <RefreshCw size={16} />
              ดึงข้อมูลอัตโนมัติ
            </button>
            <button onClick={handleAdd} className="flex items-center gap-1 px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium transition-colors">
              <Plus size={16} />
              เพิ่มตัวชี้วัด
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto border-4 border-slate-500 p-1">
          <table className="excel-table w-full border-collapse">
            <thead>
              <tr>
                <th colSpan={6} className="bg-orange-excel text-center py-2 font-bold border border-slate-300">
                  ตัวชี้วัด/ผลการเรียนรู้ ตามสาระและมาตรฐานการเรียนรู้
                </th>
              </tr>
              <tr>
                <th className="text-left px-2 py-1 font-bold border border-slate-300 w-1/6">กลุ่มสาระการเรียนรู้</th>
                <th className="text-left px-2 py-1 font-normal border border-slate-300 w-1/6">{generalInfo?.learningArea || 'วิทยาศาสตร์และเทคโนโลยี'}</th>
                <th className="bg-orange-excel text-right px-2 py-1 font-bold border border-slate-300 w-1/6">รายวิชา</th>
                <th className="text-left px-2 py-1 font-normal border border-slate-300 w-1/6">{generalInfo?.subjectName || 'วิทยาการคำนวณ'}</th>
                <th className="bg-orange-excel text-right px-2 py-1 font-bold border border-slate-300 w-1/6">รหัสวิชา</th>
                <th className="text-left px-2 py-1 font-normal border border-slate-300 w-1/6">{generalInfo?.subjectCode || 'ว32102'}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((ind, index) => (
                <tr key={index}>
                  <td className="border border-slate-300 align-top">
                    <input 
                      type="text" 
                      className="w-full p-2 outline-none" 
                      value={ind.id} 
                      onChange={(e) => handleChange(index, 'id', e.target.value)} 
                      placeholder="รหัสตัวชี้วัด" 
                    />
                  </td>
                  <td colSpan={4} className="border border-slate-300 align-top">
                    <textarea 
                      className="w-full p-2 outline-none resize-none overflow-hidden" 
                      value={ind.description} 
                      onChange={(e) => handleChange(index, 'description', e.target.value)} 
                      placeholder="รายละเอียดตัวชี้วัด" 
                      rows={2}
                    />
                  </td>
                  <td className="border border-slate-300 text-center align-middle">
                    <button 
                      onClick={() => handleRemove(index)}
                      className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors"
                      title="ลบตัวชี้วัด"
                    >
                      <Trash2 size={20} className="mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={6} className="text-left font-bold py-4 px-2 border border-slate-300">
                  ตัวชี้วัดรวม.........{data.length}.........ตัวชี้วัด
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
