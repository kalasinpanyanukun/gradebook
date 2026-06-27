import React, { useState } from 'react';
import { AppData, ScoreConfig } from '../types';
import { ScoreConfigModal } from './ScoreConfigModal';
import { AutoFillModal } from './AutoFillModal';
import { AlertCircle, Sparkles } from 'lucide-react';

interface Props {
  students: AppData['students'];
  data: AppData['scores'];
  generalInfo: AppData['generalInfo'];
  scoreConfig?: AppData['scoreConfig'];
  onChange: (data: AppData['scores']) => void;
  onConfigChange: (config?: ScoreConfig) => void;
}

export const ScoresForm: React.FC<Props> = ({ students, data, generalInfo, scoreConfig, onChange, onConfigChange }) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showAutoFillModal, setShowAutoFillModal] = useState(false);

  const handleChange = (studentId: string, field: string, value: string) => {
    const numValue = value === '' ? '' : (parseFloat(value) || 0);
    onChange({
      ...data,
      [studentId]: {
        ...data[studentId],
        [field]: numValue
      }
    });
  };

  const handleAutoFill = (minGrade: number, maxGrade: number) => {
    if (!scoreConfig) return;
    
    const newData = { ...data };
    
    const getScoreRangeForGrade = (grade: number) => {
      switch (grade) {
        case 4: return { min: 80, max: 100 };
        case 3.5: return { min: 75, max: 79 };
        case 3: return { min: 70, max: 74 };
        case 2.5: return { min: 65, max: 69 };
        case 2: return { min: 60, max: 64 };
        case 1.5: return { min: 55, max: 59 };
        case 1: return { min: 50, max: 54 };
        case 0: return { min: 0, max: 49 };
        default: return { min: 50, max: 100 };
      }
    };

    const minScoreRange = getScoreRangeForGrade(minGrade);
    const maxScoreRange = getScoreRangeForGrade(maxGrade);
    
    const targetMinScore = minScoreRange.min;
    const targetMaxScore = maxScoreRange.max;

    const components: { key: string, max: number }[] = [];
    let totalMaxIndicators = 0;
    scoreConfig.units.forEach((u, uIdx) => {
      u.indicators.forEach((ind, iIdx) => {
        components.push({ key: `u${uIdx}_i${iIdx}`, max: ind.fullScore || 0 });
        totalMaxIndicators += ind.fullScore || 0;
      });
    });
    
    components.push({ key: 'midterm', max: 10 });
    components.push({ key: 'final', max: 20 });
    const totalMaxScore = totalMaxIndicators + 10 + 20;

    students.forEach(student => {
      if (!newData[student.id]) {
        newData[student.id] = {};
      }
      
      const targetTotal = Math.floor(Math.random() * (targetMaxScore - targetMinScore + 1)) + targetMinScore;
      
      let remainingScore = targetTotal;
      let remainingMax = totalMaxScore;
      
      // Shuffle components to distribute randomness
      const shuffledComponents = [...components].sort(() => Math.random() - 0.5);
      
      shuffledComponents.forEach((comp, index) => {
        if (index === shuffledComponents.length - 1) {
          newData[student.id][comp.key] = Math.min(comp.max, Math.max(0, remainingScore));
        } else {
          // Expected score for this component
          const expected = (remainingScore / remainingMax) * comp.max;
          
          // Add some variance (e.g., +/- 10% of max)
          const variance = comp.max * 0.1;
          let assigned = Math.round(expected + (Math.random() * variance * 2 - variance));
          
          // Clamp between 0 and max
          assigned = Math.max(0, Math.min(comp.max, assigned));
          
          // Ensure we don't assign so much that the rest can't reach the target,
          // or so little that the rest exceeds their max.
          const maxPossibleRest = remainingMax - comp.max;
          if (remainingScore - assigned > maxPossibleRest) {
            assigned = remainingScore - maxPossibleRest;
          }
          if (remainingScore - assigned < 0) {
            assigned = remainingScore;
          }
          
          newData[student.id][comp.key] = assigned;
          remainingScore -= assigned;
          remainingMax -= comp.max;
        }
      });
    });
    
    onChange(newData);
  };

  // Default empty structure if no config
  const defaultUnits = Array.from({ length: 5 }).map((_, i) => ({
    name: '',
    indicators: Array.from({ length: 3 }).map(() => ({ code: '', fullScore: 0, passingScore: 0 }))
  }));

  const units = scoreConfig?.units || defaultUnits;
  const totalIndicators = units.reduce((sum, u) => sum + u.indicators.length, 0);
  const totalCols = totalIndicators + units.length; // indicators + 1 'รวม' per unit

  const calculateStudentTotal = (studentId: string) => {
    const score = data[studentId] || {};
    let total = 0;
    units.forEach((u, uIdx) => {
      u.indicators.forEach((ind, iIdx) => {
        total += score[`u${uIdx}_i${iIdx}`] || 0;
      });
    });
    return total;
  };

  const calculateStudentUnitTotal = (studentId: string, uIdx: number) => {
    const score = data[studentId] || {};
    let total = 0;
    units[uIdx].indicators.forEach((ind, iIdx) => {
      total += score[`u${uIdx}_i${iIdx}`] || 0;
    });
    return total;
  };

  const handleClearData = () => {
    setShowClearConfirm(true);
  };

  const confirmClearData = () => {
    onChange({});
    onConfigChange(undefined);
    setShowClearConfirm(false);
  };

  return (
    <div className="flex flex-col items-center rounded-2xl bg-slate-100/90 p-4 sm:p-6 overflow-auto relative">
      {/* Clear Confirmation Overlay */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">ยืนยันการล้างข้อมูล</h3>
            <p className="text-slate-600 mb-6">คุณแน่ใจหรือไม่ที่จะล้างข้อมูลคะแนนและการตั้งค่าตัวชี้วัดทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmClearData}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors shadow-md"
              >
                ยืนยันการล้างข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-10 w-full rounded-lg ring-1 ring-slate-200/80 shadow-[0_12px_32px_-8px_rgb(15,23,42,0.12)]" style={{ fontFamily: 'Sarabun' }}>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold">บันทึกคะแนนวัดผลและประเมินผลการเรียนรู้ ชั้นมัธยมศึกษาปีที่ {generalInfo.gradeLevel} ภาคเรียนที่ {generalInfo.semester} ปีการศึกษา {generalInfo.academicYear}</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="excel-table whitespace-nowrap w-full">
            <thead>
              <tr>
                <th rowSpan={5} className="bg-orange-excel sticky left-0 z-20" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>เลขที่</th>
                <th rowSpan={5} className="bg-orange-excel sticky z-20" style={{ left: '40px', width: '96px', minWidth: '96px', maxWidth: '96px' }}>เลขประจำตัว</th>
                <th rowSpan={5} className="bg-orange-excel sticky z-20" style={{ left: '136px', width: '128px', minWidth: '128px', maxWidth: '128px' }}>เลขประจำตัวประชาชน</th>
                <th rowSpan={5} className="bg-orange-excel sticky z-20 border-r-2 border-r-slate-400" style={{ left: '264px', width: '250px', minWidth: '250px', maxWidth: '250px' }}>ชื่อ - สกุล</th>
                <th colSpan={totalCols} className="bg-orange-excel">บันทึกคะแนนวัดและประเมินผลการเรียนรู้</th>
                <th colSpan={8} className="bg-orange-excel">ภาคเรียนที่ {generalInfo.semester}</th>
              </tr>
              <tr>
                <th className="bg-orange-excel">หน่วยการเรียนรู้ที่</th>
                {units.map((u, i) => (
                  <React.Fragment key={`unit-${i}`}>
                    <th colSpan={u.indicators.length} className="bg-orange-excel whitespace-normal px-2 min-w-[100px]">{u.name}</th>
                    <th rowSpan={2} className="bg-orange-excel w-12"><span className="writing-vertical inline-block">รวม</span></th>
                  </React.Fragment>
                ))}
                <th rowSpan={2} className="bg-orange-excel w-12"><span className="writing-vertical inline-block">รวมคะแนนหน่วยการเรียนรู้ระหว่างภาคเรียน</span></th>
                <th rowSpan={2} className="bg-orange-excel w-12"><span className="writing-vertical inline-block">คะแนนสอบกลางภาค</span></th>
                <th rowSpan={2} className="bg-orange-excel w-12"><span className="writing-vertical inline-block">คะแนนสอบปลายภาค</span></th>
                <th rowSpan={2} className="bg-orange-excel w-12"><span className="writing-vertical inline-block">รวมคะแนนตลอดภาคเรียน</span></th>
                <th colSpan={2} className="bg-orange-excel">ระดับผลการเรียน</th>
                <th rowSpan={4} className="bg-orange-excel w-12"><span className="writing-vertical inline-block">ร้อยละ</span></th>
                <th rowSpan={4} className="bg-orange-excel w-12"><span className="writing-vertical inline-block">สรุปจำนวนตัวชี้วัด/ผลการเรียนรู้</span></th>
              </tr>
              <tr>
                <th className="bg-orange-excel">รหัสตัวชี้วัด/ผลการเรียนรู้</th>
                {units.map((u, uIdx) => (
                  <React.Fragment key={`ind-row-${uIdx}`}>
                    {u.indicators.map((ind, iIdx) => (
                      <th key={`ind-${uIdx}-${iIdx}`} className="bg-orange-excel w-12 min-w-[3rem]"><span className="writing-vertical inline-block">{ind.code}</span></th>
                    ))}
                  </React.Fragment>
                ))}
                <th className="bg-orange-excel">ปกติ</th>
                <th className="bg-orange-excel">แก้ไข</th>
              </tr>
              <tr>
                <th className="bg-orange-excel">คะแนนเต็ม</th>
                {units.map((u, uIdx) => (
                  <React.Fragment key={`full-row-${uIdx}`}>
                    {u.indicators.map((ind, iIdx) => (
                      <th key={`full-${uIdx}-${iIdx}`} className="bg-orange-excel">{ind.fullScore || ''}</th>
                    ))}
                    <th className="bg-orange-excel">{u.indicators.reduce((sum, ind) => sum + (ind.fullScore || 0), 0) || ''}</th>
                  </React.Fragment>
                ))}
                <th className="bg-orange-excel">70</th>
                <th className="bg-orange-excel">10</th>
                <th className="bg-orange-excel">20</th>
                <th className="bg-orange-excel">100</th>
                <th colSpan={2} className="bg-orange-excel"></th>
              </tr>
              <tr>
                <th className="bg-orange-excel">คะแนนตามเกณฑ์</th>
                {units.map((u, uIdx) => (
                  <React.Fragment key={`pass-row-${uIdx}`}>
                    {u.indicators.map((ind, iIdx) => (
                      <th key={`pass-${uIdx}-${iIdx}`} className="bg-orange-excel">{ind.passingScore || ''}</th>
                    ))}
                    <th className="bg-orange-excel">{u.indicators.reduce((sum, ind) => sum + (ind.passingScore || 0), 0) || ''}</th>
                  </React.Fragment>
                ))}
                <th className="bg-orange-excel">35</th>
                <th className="bg-orange-excel">5</th>
                <th className="bg-orange-excel">10</th>
                <th className="bg-orange-excel">50</th>
                <th colSpan={2} className="bg-orange-excel"></th>
              </tr>
            </thead>
            <tbody>
              {students.length > 0 ? students.map((student, index) => {
                const score = data[student.id] || {};
                const betweenTermTotal = calculateStudentTotal(student.id);
                const midterm = Number(score.midterm) || 0;
                const final = Number(score.final) || 0;
                const total = betweenTermTotal + midterm + final;
                
                return (
                  <tr key={student.id}>
                    <td className="text-center sticky left-0 z-10 bg-white" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}>{index + 1}</td>
                    <td className="text-center sticky z-10 bg-white" style={{ left: '40px', width: '96px', minWidth: '96px', maxWidth: '96px' }}>{student.studentId}</td>
                    <td className="text-center sticky z-10 bg-white" style={{ left: '136px', width: '128px', minWidth: '128px', maxWidth: '128px' }}>{student.citizenId}</td>
                    <td className="text-left px-2 sticky z-10 bg-white border-r-2 border-r-slate-400" style={{ left: '264px', width: '250px', minWidth: '250px', maxWidth: '250px' }}>{student.name}</td>
                    <td className="bg-slate-50"></td>
                    {units.map((u, uIdx) => (
                      <React.Fragment key={`score-cells-${uIdx}`}>
                        {u.indicators.map((ind, iIdx) => (
                          <td key={`cell-${uIdx}-${iIdx}`}>
                            <input 
                              type="number" 
                              className="excel-input text-center" 
                              value={score[`u${uIdx}_i${iIdx}`] || ''} 
                              onChange={(e) => handleChange(student.id, `u${uIdx}_i${iIdx}`, e.target.value)} 
                              disabled={!scoreConfig}
                            />
                          </td>
                        ))}
                        <td className="text-blue-600 text-center font-medium bg-slate-50">{calculateStudentUnitTotal(student.id, uIdx)}</td>
                      </React.Fragment>
                    ))}
                    <td className="text-blue-600 text-center font-medium bg-blue-50">{betweenTermTotal}</td>
                    <td>
                      <input 
                        type="number" 
                        className="excel-input text-center text-blue-600" 
                        value={score.midterm || ''} 
                        onChange={(e) => handleChange(student.id, 'midterm', e.target.value)} 
                        disabled={!scoreConfig}
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        className="excel-input text-center text-blue-600" 
                        value={score.final || ''} 
                        onChange={(e) => handleChange(student.id, 'final', e.target.value)} 
                        disabled={!scoreConfig}
                      />
                    </td>
                    <td className="text-blue-600 text-center font-bold bg-blue-50">{total}</td>
                    <td className="text-center">
                      {total >= 80 ? '4' : total >= 75 ? '3.5' : total >= 70 ? '3' : total >= 65 ? '2.5' : total >= 60 ? '2' : total >= 55 ? '1.5' : total >= 50 ? '1' : '0'}
                    </td>
                    <td className="text-red-600 text-center">{total < 50 ? '0' : ''}</td>
                    <td className="text-center">{total.toFixed(2)}</td>
                    <td className="text-center font-bold text-lg">
                      {Object.keys(score).length > 0 ? (total >= 50 ? <span className="text-green-600">ผ</span> : <span className="text-red-600">มผ</span>) : ''}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={totalCols + 12} className="text-center py-8 text-slate-500 bg-white">
                    ยังไม่มีข้อมูลนักเรียน กรุณาเพิ่มรายชื่อนักเรียนในเมนู "ข้อมูลนักเรียน"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-center gap-4">
          <button 
            onClick={() => setShowConfigModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            บันทึกคะแนน (ตั้งค่าตัวชี้วัด)
          </button>
          <button 
            onClick={() => setShowAutoFillModal(true)}
            disabled={!scoreConfig}
            className={`px-6 py-2 rounded-md transition-colors shadow-sm font-medium flex items-center gap-2 ${
              scoreConfig 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Sparkles size={18} />
            กรอกผลคะแนนอัตโนมัติ
          </button>
          <button 
            onClick={handleClearData}
            className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors shadow-sm font-medium"
          >
            ล้างข้อมูล
          </button>
        </div>
      </div>

      <ScoreConfigModal 
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        generalInfo={generalInfo}
        initialConfig={scoreConfig}
        onSave={onConfigChange}
      />

      <AutoFillModal
        isOpen={showAutoFillModal}
        onClose={() => setShowAutoFillModal(false)}
        scoreConfig={scoreConfig}
        onFill={handleAutoFill}
      />
    </div>
  );
};
