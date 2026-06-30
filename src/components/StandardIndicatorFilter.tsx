import React, { useState, useEffect } from 'react';
import { fetchCurriculumStandards, parseClassLevelCode, type Standard } from '../lib/curriculum';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  subjectName: string;
  subjectCode?: string;
  learningArea?: string;
  gradeLevel: string;
  onSelectIndicators: (standardCode: string, indicators: string[]) => void;
}

export const StandardIndicatorFilter: React.FC<Props> = ({ subjectName, subjectCode, learningArea, gradeLevel, onSelectIndicators }) => {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedStandard, setSelectedStandard] = useState<string>('');
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [manualStandard, setManualStandard] = useState<string>('');
  const [manualIndicators, setManualIndicators] = useState<string[]>(['']);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loadingStandards, setLoadingStandards] = useState(false);

  const classLevel = parseClassLevelCode(gradeLevel);

  useEffect(() => {
    setSelectedSubject(subjectName || learningArea || '');
    setSelectedStandard('');
    setSelectedIndicators([]);
    setIsManualMode(false);
  }, [subjectName, learningArea, gradeLevel, classLevel]);

  useEffect(() => {
    const area = learningArea || subjectName;
    if (!area || !classLevel) return;
    let cancelled = false;
    setLoadingStandards(true);
    void fetchCurriculumStandards(area, classLevel, subjectName, { subjectCode }).then((data) => {
      if (!cancelled) {
        setStandards(data);
        setSelectedStandard((current) =>
          current && data.some((standard) => standard.code === current) ? current : '',
        );
        setSelectedIndicators([]);
        setLoadingStandards(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setStandards([]);
        setSelectedStandard('');
        setSelectedIndicators([]);
        setLoadingStandards(false);
      }
    });
    return () => { cancelled = true; };
  }, [learningArea, subjectName, subjectCode, classLevel]);

  const handleStandardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const stdCode = e.target.value;
    setSelectedStandard(stdCode);
    setSelectedIndicators([]); // Reset indicators when standard changes
  };

  const handleIndicatorToggle = (indCode: string) => {
    setSelectedIndicators(prev => {
      const newSelection = prev.includes(indCode)
        ? prev.filter(code => code !== indCode)
        : [...prev, indCode];
      return newSelection;
    });
  };

  const handleSelectAll = (standard: Standard) => {
    const allCodes = standard.indicators.map(ind => ind.code);
    setSelectedIndicators(allCodes);
  };

  const handleDeselectAll = () => {
    setSelectedIndicators([]);
  };

  const handleAddManualIndicator = () => {
    setManualIndicators(prev => [...prev, '']);
  };

  const handleRemoveManualIndicator = (index: number) => {
    setManualIndicators(prev => prev.filter((_, i) => i !== index));
  };

  const handleManualIndicatorChange = (index: number, value: string) => {
    setManualIndicators(prev => {
      const newInds = [...prev];
      newInds[index] = value;
      return newInds;
    });
  };

  useEffect(() => {
    if (isManualMode) {
      const validIndicators = manualIndicators.filter(i => i.trim() !== '');
      if (manualStandard && validIndicators.length > 0) {
        onSelectIndicators(manualStandard, validIndicators);
      }
    } else {
      if (selectedStandard && selectedIndicators.length > 0) {
        onSelectIndicators(selectedStandard, selectedIndicators);
      }
    }
  }, [selectedStandard, selectedIndicators, isManualMode, manualStandard, manualIndicators, onSelectIndicators]);

  const currentStandard = standards.find(s => s.code === selectedStandard);

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-800">มาตรฐานการเรียนรู้และตัวชี้วัด</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-500">โหมดการกรอก:</span>
          <button
            onClick={() => setIsManualMode(false)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${!isManualMode ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            เลือกจากฐานข้อมูล
          </button>
          <button
            onClick={() => setIsManualMode(true)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${isManualMode ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            กรอกเอง
          </button>
        </div>
      </div>
      
      {!isManualMode ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">ระดับชั้น</label>
              <input 
                type="text"
                value={classLevel}
                readOnly
                className="w-full border border-slate-300 rounded-md p-2 text-sm bg-slate-100 text-slate-600 cursor-not-allowed"
              />
            </div>
          </div>
          
          {loadingStandards ? (
            <p className="text-sm text-slate-500 py-4 text-center">กำลังโหลดหลักสูตร...</p>
          ) : standards.length > 0 ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">มาตรฐานการเรียนรู้</label>
                <select 
                  value={selectedStandard} 
                  onChange={handleStandardChange}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                >
                  <option value="">-- เลือกมาตรฐานการเรียนรู้ --</option>
                  {standards.map(std => (
                    <option key={std.code} value={std.code}>
                      {std.code} {std.description.substring(0, 80)}{std.description.length > 80 ? '...' : ''}
                    </option>
                  ))}
                </select>
                {currentStandard && (
                  <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded border border-slate-100">{currentStandard.description}</p>
                )}
              </div>

              {currentStandard && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-700">ตัวชี้วัดที่ต้องการประเมิน</label>
                    <div className="space-x-3">
                      <button 
                        onClick={() => handleSelectAll(currentStandard)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        เลือกทั้งหมด
                      </button>
                      <button 
                        onClick={handleDeselectAll}
                        className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                      >
                        ยกเลิกทั้งหมด
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 p-3 border border-slate-200 rounded-lg bg-white">
                    {currentStandard.indicators.map(ind => (
                      <label key={ind.code} className="flex items-start space-x-3 cursor-pointer p-2 hover:bg-blue-50/50 rounded-md transition-colors border border-transparent hover:border-blue-100">
                        <input 
                          type="checkbox" 
                          checked={selectedIndicators.includes(ind.code)}
                          onChange={() => handleIndicatorToggle(ind.code)}
                          className="mt-1 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className="text-sm text-slate-700 leading-relaxed">
                          <span className="font-bold text-blue-900">{ind.code}</span> {selectedSubject !== 'พื้นฐานอาชีพ' && ind.description}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm text-center">
              ไม่พบข้อมูลมาตรฐานการเรียนรู้สำหรับวิชาและระดับชั้นที่เลือก
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">รหัสมาตรฐานการเรียนรู้</label>
            <input 
              type="text" 
              value={manualStandard}
              onChange={(e) => setManualStandard(e.target.value)}
              placeholder="เช่น ค 1.1"
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-slate-700">รหัสตัวชี้วัด</label>
              <button 
                onClick={handleAddManualIndicator}
                className="text-xs flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus size={14} className="mr-1" /> เพิ่มตัวชี้วัด
              </button>
            </div>
            <div className="space-y-2">
              {manualIndicators.map((ind, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <input 
                    type="text" 
                    value={ind}
                    onChange={(e) => handleManualIndicatorChange(idx, e.target.value)}
                    placeholder={`ตัวชี้วัดที่ ${idx + 1} เช่น ค 1.1 ป.1/1`}
                    className="flex-1 border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {manualIndicators.length > 1 && (
                    <button 
                      onClick={() => handleRemoveManualIndicator(idx)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
