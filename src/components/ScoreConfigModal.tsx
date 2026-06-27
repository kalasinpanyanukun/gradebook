import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { AppData, ScoreConfig, ScoreUnit } from '../types';
import { StandardIndicatorFilter } from './StandardIndicatorFilter';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  generalInfo: AppData['generalInfo'];
  initialConfig?: ScoreConfig;
  onSave: (config: ScoreConfig) => void;
}

export const ScoreConfigModal: React.FC<Props> = ({ isOpen, onClose, generalInfo, initialConfig, onSave }) => {
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(initialConfig?.selectedIndicators || []);
  const [numUnits, setNumUnits] = useState<number>(initialConfig?.units.length || 1);
  const [units, setUnits] = useState<ScoreUnit[]>(initialConfig?.units || [{ name: '', indicators: [{ code: '', fullScore: 70, passingScore: 35 }] }]);
  const [error, setError] = useState<string | null>(null);
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [mainStandard, setMainStandard] = useState<string>(initialConfig?.standard || '');

  const learningArea = generalInfo.learningArea;
  const subjectName = generalInfo.subjectName;
  const gradeLevel = generalInfo.gradeLevel;

  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (isOpen && !initialConfig) {
      setSelectedIndicators([]);
      setNumUnits(1);
      setUnits([{ name: '', indicators: [{ code: '', fullScore: 70, passingScore: 35 }] }]);
      setError(null);
      setShowConfirm(false);
      setShowClearConfirm(false);
      setMainStandard('');
      setResetKey(prev => prev + 1);
    }
  }, [isOpen, initialConfig]);

  const recalculateLastScore = (currentUnits: ScoreUnit[]) => {
    if (currentUnits.length === 0) return currentUnits;
    
    const newUnits = JSON.parse(JSON.stringify(currentUnits)); // Deep copy
    let totalExceptLast = 0;
    const lastUIdx = newUnits.length - 1;
    if (newUnits[lastUIdx].indicators.length === 0) return newUnits;
    const lastIIdx = newUnits[lastUIdx].indicators.length - 1;

    newUnits.forEach((u: any, uIdx: number) => {
      u.indicators.forEach((ind: any, iIdx: number) => {
        if (!(uIdx === lastUIdx && iIdx === lastIIdx)) {
          totalExceptLast += ind.fullScore || 0;
        }
      });
    });

    const remaining = Math.max(0, 70 - totalExceptLast);
    newUnits[lastUIdx].indicators[lastIIdx].fullScore = remaining;
    newUnits[lastUIdx].indicators[lastIIdx].passingScore = Math.floor(remaining / 2);

    return newUnits;
  };

  const handleNumUnitsChange = (num: number) => {
    setNumUnits(num);
    setUnits(prev => {
      const newUnits = [...prev];
      if (num > prev.length) {
        for (let i = prev.length; i < num; i++) {
          newUnits.push({ name: '', indicators: [{ code: '', fullScore: 0, passingScore: 0 }] });
        }
      } else if (num < prev.length) {
        newUnits.splice(num);
      }
      return recalculateLastScore(newUnits);
    });
  };

  const handleUnitNameChange = (index: number, name: string) => {
    setUnits(prev => {
      const newUnits = [...prev];
      newUnits[index] = { ...newUnits[index], name };
      return newUnits;
    });
  };

  const handleNumIndicatorsChange = (unitIndex: number, num: number) => {
    setUnits(prev => {
      const newUnits = [...prev];
      const unit = { ...newUnits[unitIndex] };
      const currentIndicators = [...unit.indicators];
      if (num > currentIndicators.length) {
        for (let i = currentIndicators.length; i < num; i++) {
          currentIndicators.push({ code: '', fullScore: 0, passingScore: 0 });
        }
      } else if (num < currentIndicators.length) {
        currentIndicators.splice(num);
      }
      unit.indicators = currentIndicators;
      newUnits[unitIndex] = unit;
      return recalculateLastScore(newUnits);
    });
  };

  const handleIndicatorCodeChange = (unitIndex: number, indIndex: number, code: string) => {
    setUnits(prev => {
      const newUnits = [...prev];
      const unit = { ...newUnits[unitIndex] };
      const indicators = [...unit.indicators];
      indicators[indIndex] = { ...indicators[indIndex], code };
      unit.indicators = indicators;
      newUnits[unitIndex] = unit;
      return newUnits;
    });
  };

  const handleFullScoreChange = (unitIndex: number, indIndex: number, scoreStr: string) => {
    const score = parseInt(scoreStr) || 0;
    setUnits(prev => {
      const newUnits = [...prev];
      const unit = { ...newUnits[unitIndex] };
      const indicators = [...unit.indicators];
      indicators[indIndex] = { ...indicators[indIndex], fullScore: score, passingScore: Math.floor(score / 2) };
      unit.indicators = indicators;
      newUnits[unitIndex] = unit;
      return recalculateLastScore(newUnits);
    });
  };

  const calculateTotalScore = () => {
    let total = 0;
    units.forEach(u => {
      u.indicators.forEach(ind => {
        total += ind.fullScore;
      });
    });
    return total;
  };

  const handleSelectIndicators = (standardCode: string, indicators: string[]) => {
    setMainStandard(standardCode);
    setSelectedIndicators(indicators);
  };

  const handleSaveClick = () => {
    // Validation
    if (selectedIndicators.length === 0) {
      setError('กรุณาเลือกตัวชี้วัดอย่างน้อย 1 ข้อ');
      return;
    }
    for (let i = 0; i < units.length; i++) {
      if (!units[i].name) {
        setError(`กรุณากรอกชื่อหน่วยการเรียนรู้ที่ ${i + 1}`);
        return;
      }
      for (let j = 0; j < units[i].indicators.length; j++) {
        if (!units[i].indicators[j].code) {
          setError(`กรุณาเลือกตัวชี้วัดในหน่วยการเรียนรู้ที่ ${i + 1}`);
          return;
        }
      }
    }

    const total = calculateTotalScore();
    if (total !== 70) {
      setError(`ผลรวมคะแนนเต็มต้องเท่ากับ 70 คะแนน (ปัจจุบันรวมได้ ${total} คะแนน)`);
      return;
    }

    setShowConfirm(true);
  };

  const confirmSave = () => {
    onSave({
      learningArea,
      subjectName,
      standard: mainStandard,
      selectedIndicators,
      units
    });
    setShowConfirm(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-100 overflow-hidden relative">
        
        {/* Confirmation Overlay */}
        {showConfirm && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">ยืนยันการบันทึก</h3>
              <p className="text-slate-600 mb-6">คุณต้องการบันทึกการตั้งค่าโครงสร้างคะแนนและตัวชี้วัดนี้ใช่หรือไม่?</p>
              <div className="flex justify-center gap-3">
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={confirmSave}
                  className="btn btn-primary"
                >
                  ยืนยันการบันทึก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clear Confirmation Overlay */}
        {showClearConfirm && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">ยืนยันการล้างข้อมูล</h3>
              <p className="text-slate-600 mb-6">คุณแน่ใจหรือไม่ที่จะล้างข้อมูลการตั้งค่าทั้งหมดในหน้านี้? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
              <div className="flex justify-center gap-3">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={() => {
                    setSelectedIndicators([]);
                    setNumUnits(1);
                    setUnits([{ name: '', indicators: [{ code: '', fullScore: 70, passingScore: 35 }] }]);
                    setError(null);
                    setMainStandard('');
                    setResetKey(prev => prev + 1);
                    setShowClearConfirm(false);
                  }}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-md"
                >
                  ยืนยันการล้างข้อมูล
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center p-5 border-b bg-slate-50/50">
          <h3 className="text-xl font-bold text-slate-800">บันทึกคะแนน (ตั้งค่าตัวชี้วัด)</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md flex items-start shadow-sm">
              <AlertCircle className="text-red-500 mr-3 mt-0.5 flex-shrink-0" size={20} />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">กลุ่มสาระการเรียนรู้</label>
              <input type="text" value={learningArea} readOnly className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-600 shadow-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">รายวิชา</label>
              <input type="text" value={subjectName} readOnly className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-600 shadow-sm focus:outline-none" />
            </div>
          </div>

          <StandardIndicatorFilter 
            key={resetKey}
            subjectName={subjectName} 
            learningArea={learningArea}
            gradeLevel={gradeLevel} 
            onSelectIndicators={handleSelectIndicators} 
          />

          <div className="border-t border-slate-100 pt-6">
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">จำนวนหน่วยการเรียนรู้</label>
              <select 
                value={numUnits} 
                onChange={(e) => handleNumUnitsChange(parseInt(e.target.value))}
                className="w-32 border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
              >
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{n} หน่วย</option>
                ))}
              </select>
            </div>

            <div className="space-y-5">
              {units.map((unit, uIndex) => (
                <div key={uIndex} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4 flex items-center">
                    <span className="bg-blue-100 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-sm mr-2">{uIndex + 1}</span>
                    หน่วยการเรียนรู้ที่ {uIndex + 1}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">ชื่อหน่วยการเรียนรู้</label>
                      <input 
                        type="text" 
                        value={unit.name}
                        onChange={(e) => handleUnitNameChange(uIndex, e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                        placeholder="กรอกชื่อหน่วยการเรียนรู้"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">จำนวนตัวชี้วัด</label>
                      <select 
                        value={unit.indicators.length}
                        onChange={(e) => handleNumIndicatorsChange(uIndex, parseInt(e.target.value))}
                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
                      >
                        {[1, 2, 3, 4, 5].map(n => (
                          <option key={n} value={n}>{n} ตัวชี้วัด</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {unit.indicators.map((ind, iIndex) => {
                      const isLast = uIndex === units.length - 1 && iIndex === unit.indicators.length - 1;
                      return (
                        <div key={iIndex} className={`flex items-center space-x-3 p-3 rounded-lg border ${isLast ? 'bg-blue-50/30 border-blue-100' : 'bg-white border-slate-200'} shadow-sm transition-colors`}>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-500 mb-1">ตัวชี้วัดที่ {iIndex + 1}</label>
                            <select 
                              value={ind.code}
                              onChange={(e) => handleIndicatorCodeChange(uIndex, iIndex, e.target.value)}
                              className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">-- เลือกตัวชี้วัด --</option>
                              {selectedIndicators.map(code => (
                                <option key={code} value={code}>{code}</option>
                              ))}
                            </select>
                          </div>
                          <div className="w-24">
                            <label className="block text-xs font-medium text-slate-500 mb-1">คะแนนเต็ม</label>
                            <input 
                              type="number" 
                              value={ind.fullScore || ''}
                              onChange={(e) => handleFullScoreChange(uIndex, iIndex, e.target.value)}
                              readOnly={isLast}
                              className={`w-full border rounded-md p-2 text-sm text-center font-medium ${isLast ? 'bg-blue-100 text-blue-700 border-blue-200 cursor-not-allowed' : 'border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                              min="0"
                            />
                          </div>
                          <div className="w-24">
                            <label className="block text-xs font-medium text-slate-500 mb-1">ผ่านเกณฑ์</label>
                            <input 
                              type="number" 
                              value={ind.passingScore || ''}
                              readOnly
                              className="w-full border border-slate-200 rounded-md p-2 text-sm text-center bg-slate-50 text-slate-500 cursor-not-allowed"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-between items-center bg-gradient-to-r from-blue-50 to-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm">
              <div className="text-sm text-blue-700 flex items-center">
                <Sparkles size={16} className="mr-2" />
                ระบบคำนวณคะแนนช่องสุดท้ายให้อัตโนมัติ เพื่อให้รวมได้ 70 คะแนนพอดี
              </div>
              <div className="font-bold text-xl flex items-center">
                <span className="text-slate-600 mr-3">รวมคะแนนเต็ม:</span>
                <span className={`px-3 py-1 rounded-lg ${calculateTotalScore() === 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {calculateTotalScore()} / 70
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button 
            onClick={() => setShowClearConfirm(true)} 
            className="px-5 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium mr-auto"
          >
            ล้างข้อมูล
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium">ยกเลิก</button>
          <button onClick={handleSaveClick} className="btn btn-primary">บันทึกข้อมูล</button>
        </div>
      </div>
    </div>
  );
};
