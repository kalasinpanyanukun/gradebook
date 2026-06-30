import React, { useCallback, useEffect, useState } from 'react';
import { AppData, Indicator } from '../types';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { curriculumData } from '../data/curriculumData';
import { fetchCurriculumStandards, type Standard } from '../lib/curriculum';

interface Props {
  data: AppData['indicators'];
  scoreConfig?: AppData['scoreConfig'];
  generalInfo?: AppData['generalInfo'];
  onChange: (data: AppData['indicators']) => void;
}

function normalizeIndicatorCode(code: string): string {
  return code.replace(/\s+/g, ' ').trim();
}

function addDescriptionsFromStandards(descriptions: Map<string, string>, standards: Standard[]) {
  standards.forEach(standard => {
    standard.indicators.forEach(indicator => {
      const code = normalizeIndicatorCode(indicator.code);
      if (code && indicator.description?.trim() && !descriptions.has(code)) {
        descriptions.set(code, indicator.description.trim());
      }
    });
  });
}

function findLegacyDescription(code: string): string {
  const normalizedCode = normalizeIndicatorCode(code);
  for (const curriculum of curriculumData) {
    for (const standard of curriculum.standards) {
      for (const indicator of standard.indicators) {
        if (normalizeIndicatorCode(indicator.code) === normalizedCode) {
          return indicator.description;
        }
      }
    }
  }
  return '';
}

export const IndicatorsForm: React.FC<Props> = ({ data, scoreConfig, generalInfo, onChange }) => {
  const [autoFilling, setAutoFilling] = useState(false);

  const handleAutoFill = useCallback(async () => {
    if (!scoreConfig) return;

    const uniqueCodes = new Set<string>();
    scoreConfig.units.forEach(u => {
      u.indicators.forEach(ind => {
        if (ind.code) uniqueCodes.add(ind.code.trim());
      });
    });

    const selectedCodes = Array.from(uniqueCodes);
    const existingDescriptions = new Map<string, string>(
      data.map(ind => [normalizeIndicatorCode(ind.id), ind.description] as const)
    );
    const descriptions = new Map<string, string>();

    setAutoFilling(true);
    try {
      if (generalInfo?.learningArea && generalInfo?.gradeLevel) {
        const standards = await fetchCurriculumStandards(
          generalInfo.learningArea,
          generalInfo.gradeLevel,
          generalInfo.subjectName,
          { subjectCode: generalInfo.subjectCode },
        );
        addDescriptionsFromStandards(descriptions, standards);

        const missingCodes = selectedCodes.filter(code => !descriptions.has(normalizeIndicatorCode(code)));
        if (missingCodes.length > 0) {
          const allStandards = await fetchCurriculumStandards(
            generalInfo.learningArea,
            generalInfo.gradeLevel,
            undefined,
            { subjectCode: generalInfo.subjectCode },
          );
          addDescriptionsFromStandards(descriptions, allStandards);
        }
      }

      const newIndicators: Indicator[] = selectedCodes.map(code => {
        const normalizedCode = normalizeIndicatorCode(code);
        return {
          id: code,
          description:
            descriptions.get(normalizedCode) ||
            findLegacyDescription(code) ||
            existingDescriptions.get(normalizedCode) ||
            ''
        };
      });

      onChange(newIndicators);
    } finally {
      setAutoFilling(false);
    }
  }, [data, generalInfo, onChange, scoreConfig]);

  // Auto-fill on mount if empty or if existing rows only have codes without details.
  useEffect(() => {
    if (scoreConfig && scoreConfig.units.length > 0 && (data.length === 0 || data.some(ind => ind.id && !ind.description.trim()))) {
      void handleAutoFill();
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
    <div className="w-full overflow-auto">
      <div className="w-full bg-white p-4" style={{ minHeight: 'calc(100vh - 240px)', fontFamily: 'Sarabun' }}>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">ตัวชี้วัด</h2>
          <div className="flex gap-2">
            <button
              onClick={handleAutoFill}
              disabled={autoFilling}
              className="flex items-center gap-1 px-4 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm font-medium transition-colors"
              title="ดึงข้อมูลจากเมนูคะแนนรายตัวชี้วัด"
            >
              <RefreshCw size={16} className={autoFilling ? 'animate-spin' : ''} />
              {autoFilling ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลอัตโนมัติ'}
            </button>
            <button onClick={handleAdd} className="flex items-center gap-1 px-4 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium transition-colors">
              <Plus size={16} />
              เพิ่มตัวชี้วัด
            </button>
          </div>
        </div>

        <div className="mx-auto w-[75%] min-w-[720px] overflow-x-auto border-4 border-slate-500 p-1">
          <table className="excel-table w-full border-collapse text-sm">
            <thead>
              <tr>
                <th colSpan={6} className="bg-orange-excel text-center py-1.5 font-bold border border-slate-300">
                  ตัวชี้วัด/ผลการเรียนรู้ ตามสาระและมาตรฐานการเรียนรู้
                </th>
              </tr>
              <tr>
                <th className="text-left px-1.5 py-0.5 font-bold border border-slate-300 w-1/6">กลุ่มสาระการเรียนรู้</th>
                <th className="text-left px-1.5 py-0.5 font-normal border border-slate-300 w-1/6">{generalInfo?.learningArea || 'วิทยาศาสตร์และเทคโนโลยี'}</th>
                <th className="bg-orange-excel text-right px-1.5 py-0.5 font-bold border border-slate-300 w-1/6">รายวิชา</th>
                <th className="text-left px-1.5 py-0.5 font-normal border border-slate-300 w-1/6">{generalInfo?.subjectName || 'วิทยาการคำนวณ'}</th>
                <th className="bg-orange-excel text-right px-1.5 py-0.5 font-bold border border-slate-300 w-1/6">รหัสวิชา</th>
                <th className="text-left px-1.5 py-0.5 font-normal border border-slate-300 w-1/6">{generalInfo?.subjectCode || 'ว32102'}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((ind, index) => (
                <tr key={index}>
                  <td className="border border-slate-300 align-top">
                    <input
                      type="text"
                      className="w-full p-1.5 outline-none"
                      value={ind.id}
                      onChange={(e) => handleChange(index, 'id', e.target.value)}
                      placeholder="รหัสตัวชี้วัด"
                    />
                  </td>
                  <td colSpan={4} className="border border-slate-300 align-top">
                    <textarea
                      className="w-full p-1.5 outline-none resize-none overflow-hidden"
                      value={ind.description}
                      onChange={(e) => handleChange(index, 'description', e.target.value)}
                      placeholder="รายละเอียดตัวชี้วัด"
                      rows={2}
                    />
                  </td>
                  <td className="border border-slate-300 text-center align-middle">
                    <button
                      onClick={() => handleRemove(index)}
                      className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 transition-colors"
                      title="ลบตัวชี้วัด"
                    >
                      <Trash2 size={16} className="mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={6} className="text-left font-bold py-2 px-1.5 border border-slate-300">
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
