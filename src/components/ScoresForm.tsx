import React, { useState } from 'react';
import { AppData, ScoreConfig, ScoreUnit } from '../types';
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
  onClearScoresAndConfig?: () => void;
}

const MIN_INDICATOR_SLOTS_PER_UNIT = 4;
const DEFAULT_SCORE_UNIT_COUNT = 3;
const SCORE_STUDENT_NO_WIDTH = 41;
const SCORE_STUDENT_CODE_WIDTH = 109;
const SCORE_CITIZEN_ID_WIDTH = 153;
const SCORE_STUDENT_NAME_WIDTH = 248;
const SCORE_STUDENT_CODE_LEFT = SCORE_STUDENT_NO_WIDTH;
const SCORE_CITIZEN_ID_LEFT = SCORE_STUDENT_NO_WIDTH + SCORE_STUDENT_CODE_WIDTH;
const SCORE_STUDENT_NAME_LEFT = SCORE_CITIZEN_ID_LEFT + SCORE_CITIZEN_ID_WIDTH;

const scoreWidthStyle = (width: number, left?: number): React.CSSProperties => ({
  ...(typeof left === 'number' ? { left: `${left}px` } : {}),
  width: `${width}px`,
  minWidth: `${width}px`,
  maxWidth: `${width}px`,
});

const SCORE_LABEL_COLUMN_STYLE = scoreWidthStyle(136);
const SCORE_INDICATOR_COLUMN_STYLE = scoreWidthStyle(44);
const SCORE_NARROW_COLUMN_STYLE = scoreWidthStyle(44);

const getIndicatorSlotCount = (unit: ScoreUnit) =>
  Math.max(MIN_INDICATOR_SLOTS_PER_UNIT, unit.indicators.length);

const getIndicatorSlotIndexes = (unit: ScoreUnit) =>
  Array.from({ length: getIndicatorSlotCount(unit) }, (_, index) => index);

const getUnitDisplayName = (unit: ScoreUnit, index: number) => {
  const trimmedName = (unit.name || '').trim();
  return trimmedName ? `${index + 1}. ${trimmedName}` : '';
};

export const ScoresForm: React.FC<Props> = ({ students, data, generalInfo, scoreConfig, onChange, onConfigChange, onClearScoresAndConfig }) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showAutoFillModal, setShowAutoFillModal] = useState(false);

  const notifyMissingScoreConfig = () => {
    window.alert('กรุณาตั้งค่าตัวชี้วัดก่อนกรอกคะแนน');
  };

  const handleChange = (studentId: string, field: string, value: string, maxScore?: number) => {
    const parsedValue = parseFloat(value);
    const upperLimit = typeof maxScore === 'number' ? Math.max(0, maxScore) : Number.POSITIVE_INFINITY;
    const numValue =
      value === ''
        ? ''
        : Number.isFinite(parsedValue)
          ? Math.max(0, Math.min(parsedValue, upperLimit))
          : 0;
    onChange({
      ...data,
      [studentId]: {
        ...data[studentId],
        [field]: numValue
      }
    });
  };

  const handleAutoFill = (minGrade: number, maxGrade: number, studentIds?: string[]) => {
    if (!scoreConfig) return;

    const newData = { ...data };
    const targetStudents = studentIds?.length
      ? students.filter(student => studentIds.includes(student.id))
      : students;

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

    targetStudents.forEach(student => {
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
  const defaultUnits = Array.from({ length: DEFAULT_SCORE_UNIT_COUNT }).map((_, i) => ({
    name: '',
    indicators: Array.from({ length: MIN_INDICATOR_SLOTS_PER_UNIT }).map(() => ({ code: '', fullScore: 0, passingScore: 0 }))
  }));

  const units = scoreConfig?.units || defaultUnits;
  const hasConfiguredIndicators = Boolean(
    scoreConfig?.units.some((unit) =>
      unit.indicators.some(
        (indicator) =>
          indicator.code.trim() ||
          indicator.fullScore > 0 ||
          indicator.passingScore > 0,
      ),
    ),
  );
  const canEnterScores = Boolean(scoreConfig && hasConfiguredIndicators);
  const storedScore = scoreConfig?.storedScore ?? 70;
  const storedPassingScore = Math.floor(storedScore / 2);
  const unitScoreCols = units.reduce((sum, u) => sum + getIndicatorSlotCount(u) + 1, 0);
  const scoreTableCols = unitScoreCols + 1; // left label column + unit indicator slots + unit totals

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
    if (onClearScoresAndConfig) {
      onClearScoresAndConfig();
    } else {
      onChange({});
      onConfigChange(undefined);
    }
    setShowClearConfirm(false);
  };

  return (
    <div className="relative flex w-full flex-col overflow-auto">
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

      <div className="w-full bg-white p-4 sm:p-6" style={{ fontFamily: 'Sarabun' }}>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold">บันทึกคะแนนวัดผลและประเมินผลการเรียนรู้ ชั้นมัธยมศึกษาปีที่ {generalInfo.gradeLevel} ภาคเรียนที่ {generalInfo.semester} ปีการศึกษา {generalInfo.academicYear}</h2>
        </div>

        <div className="excel-scroll-area overflow-x-auto">
          <div className="excel-scroll-content">
          <table className="excel-table whitespace-nowrap w-full">
            <thead>
              <tr>
                <th rowSpan={5} className="bg-orange-excel sticky left-0 z-20" style={scoreWidthStyle(SCORE_STUDENT_NO_WIDTH)}>เลขที่</th>
                <th rowSpan={5} className="bg-orange-excel sticky z-20" style={scoreWidthStyle(SCORE_STUDENT_CODE_WIDTH, SCORE_STUDENT_CODE_LEFT)}>เลขประจำตัว</th>
                <th rowSpan={5} className="bg-orange-excel sticky z-20" style={scoreWidthStyle(SCORE_CITIZEN_ID_WIDTH, SCORE_CITIZEN_ID_LEFT)}>เลขประจำตัวประชาชน</th>
                <th rowSpan={5} className="bg-orange-excel sticky z-20 border-r-2 border-r-slate-400" style={scoreWidthStyle(SCORE_STUDENT_NAME_WIDTH, SCORE_STUDENT_NAME_LEFT)}>ชื่อ - สกุล</th>
                <th colSpan={scoreTableCols} className="bg-orange-excel">บันทึกคะแนนวัดและประเมินผลการเรียนรู้</th>
                <th colSpan={8} className="bg-orange-excel">ภาคเรียนที่ {generalInfo.semester}</th>
              </tr>
              <tr>
                <th className="bg-orange-excel whitespace-normal px-2" style={SCORE_LABEL_COLUMN_STYLE}>หน่วยการเรียนรู้ที่</th>
                {units.map((u, i) => (
                  <React.Fragment key={`unit-${i}`}>
                    <th colSpan={getIndicatorSlotCount(u)} className="bg-orange-excel whitespace-normal break-words px-2">{getUnitDisplayName(u, i)}</th>
                    <th rowSpan={2} className="bg-orange-excel" style={SCORE_NARROW_COLUMN_STYLE}><span className="writing-vertical inline-block">รวม</span></th>
                  </React.Fragment>
                ))}
                <th rowSpan={2} className="bg-orange-excel" style={SCORE_NARROW_COLUMN_STYLE}><span className="writing-vertical inline-block">รวมคะแนนหน่วยการเรียนรู้ระหว่างภาคเรียน</span></th>
                <th rowSpan={2} className="bg-orange-excel" style={SCORE_NARROW_COLUMN_STYLE}><span className="writing-vertical inline-block">คะแนนสอบกลางภาค</span></th>
                <th rowSpan={2} className="bg-orange-excel" style={SCORE_NARROW_COLUMN_STYLE}><span className="writing-vertical inline-block">คะแนนสอบปลายภาค</span></th>
                <th rowSpan={2} className="bg-orange-excel" style={SCORE_NARROW_COLUMN_STYLE}><span className="writing-vertical inline-block">รวมคะแนนตลอดภาคเรียน</span></th>
                <th colSpan={2} className="bg-orange-excel">ระดับผลการเรียน</th>
                <th rowSpan={4} className="bg-orange-excel" style={SCORE_NARROW_COLUMN_STYLE}><span className="writing-vertical inline-block">ร้อยละ</span></th>
                <th rowSpan={4} className="bg-orange-excel" style={SCORE_NARROW_COLUMN_STYLE}><span className="writing-vertical inline-block">สรุปจำนวนตัวชี้วัด/ผลการเรียนรู้</span></th>
              </tr>
              <tr>
                <th className="bg-orange-excel whitespace-normal px-2" style={SCORE_LABEL_COLUMN_STYLE}>รหัสตัวชี้วัด/ผลการเรียนรู้</th>
                {units.map((u, uIdx) => (
                  <React.Fragment key={`ind-row-${uIdx}`}>
                    {getIndicatorSlotIndexes(u).map((iIdx) => (
                      <th key={`ind-${uIdx}-${iIdx}`} className="bg-orange-excel" style={SCORE_INDICATOR_COLUMN_STYLE}>
                        <span className="writing-vertical inline-block">{u.indicators[iIdx]?.code || ''}</span>
                      </th>
                    ))}
                  </React.Fragment>
                ))}
                <th className="bg-orange-excel">ปกติ</th>
                <th className="bg-orange-excel">แก้ไข</th>
              </tr>
              <tr>
                <th className="bg-orange-excel whitespace-normal px-2" style={SCORE_LABEL_COLUMN_STYLE}>คะแนนเต็ม</th>
                {units.map((u, uIdx) => (
                  <React.Fragment key={`full-row-${uIdx}`}>
                    {getIndicatorSlotIndexes(u).map((iIdx) => (
                      <th key={`full-${uIdx}-${iIdx}`} className="bg-orange-excel" style={SCORE_INDICATOR_COLUMN_STYLE}>
                        {u.indicators[iIdx]?.fullScore || ''}
                      </th>
                    ))}
                    <th className="bg-orange-excel">{u.indicators.reduce((sum, ind) => sum + (ind.fullScore || 0), 0) || ''}</th>
                  </React.Fragment>
                ))}
                <th className="bg-orange-excel">{storedScore}</th>
                <th className="bg-orange-excel">10</th>
                <th className="bg-orange-excel">20</th>
                <th className="bg-orange-excel">100</th>
                <th colSpan={2} className="bg-orange-excel"></th>
              </tr>
              <tr>
                <th className="bg-orange-excel whitespace-normal px-2" style={SCORE_LABEL_COLUMN_STYLE}>คะแนนตามเกณฑ์</th>
                {units.map((u, uIdx) => (
                  <React.Fragment key={`pass-row-${uIdx}`}>
                    {getIndicatorSlotIndexes(u).map((iIdx) => (
                      <th key={`pass-${uIdx}-${iIdx}`} className="bg-orange-excel" style={SCORE_INDICATOR_COLUMN_STYLE}>
                        {u.indicators[iIdx]?.passingScore || ''}
                      </th>
                    ))}
                    <th className="bg-orange-excel">{u.indicators.reduce((sum, ind) => sum + (ind.passingScore || 0), 0) || ''}</th>
                  </React.Fragment>
                ))}
                <th className="bg-orange-excel">{storedPassingScore}</th>
                <th className="bg-orange-excel">5</th>
                <th className="bg-orange-excel">10</th>
                <th className="bg-orange-excel">50</th>
                <th colSpan={2} className="bg-orange-excel"></th>
              </tr>
            </thead>
            <tbody>
              {students.length > 0 ? students.map((student, index) => {
                const score = data[student.id] || {};
                const hasScoreData = canEnterScores && Object.keys(score).length > 0;
                const betweenTermTotal = calculateStudentTotal(student.id);
                const midterm = Number(score.midterm) || 0;
                const final = Number(score.final) || 0;
                const total = betweenTermTotal + midterm + final;

                return (
                  <tr key={student.id}>
                    <td className="text-center sticky left-0 z-10 bg-white" style={scoreWidthStyle(SCORE_STUDENT_NO_WIDTH)}>{index + 1}</td>
                    <td className="text-center sticky z-10 bg-white" style={scoreWidthStyle(SCORE_STUDENT_CODE_WIDTH, SCORE_STUDENT_CODE_LEFT)}>{student.studentId}</td>
                    <td className="text-center sticky z-10 bg-white" style={scoreWidthStyle(SCORE_CITIZEN_ID_WIDTH, SCORE_CITIZEN_ID_LEFT)}>{student.citizenId}</td>
                    <td className="text-left px-2 sticky z-10 bg-white border-r-2 border-r-slate-400" style={scoreWidthStyle(SCORE_STUDENT_NAME_WIDTH, SCORE_STUDENT_NAME_LEFT)}>{student.name}</td>
                    <td className="bg-slate-50" style={SCORE_LABEL_COLUMN_STYLE}></td>
                    {units.map((u, uIdx) => (
                      <React.Fragment key={`score-cells-${uIdx}`}>
                        {getIndicatorSlotIndexes(u).map((iIdx) => (
                          <td key={`cell-${uIdx}-${iIdx}`} className="score-entry-cell" style={SCORE_INDICATOR_COLUMN_STYLE}>
                            {u.indicators[iIdx] ? (
                              <input
                                type="number"
                                min={0}
                                max={u.indicators[iIdx]?.fullScore || 0}
                                className="excel-input score-input text-center"
                                value={score[`u${uIdx}_i${iIdx}`] ?? ''}
                                onMouseDown={(e) => {
                                  if (!canEnterScores) {
                                    e.preventDefault();
                                    notifyMissingScoreConfig();
                                  }
                                }}
                                onChange={(e) =>
                                  handleChange(
                                    student.id,
                                    `u${uIdx}_i${iIdx}`,
                                    e.target.value,
                                    u.indicators[iIdx]?.fullScore || 0,
                                  )
                                }
                                readOnly={!canEnterScores}
                                aria-disabled={!canEnterScores}
                              />
                            ) : null}
                          </td>
                        ))}
                        <td className="text-blue-600 text-center font-medium bg-slate-50">{hasScoreData ? calculateStudentUnitTotal(student.id, uIdx) : ''}</td>
                      </React.Fragment>
                    ))}
                    <td className="text-blue-600 text-center font-medium bg-blue-50">{hasScoreData ? betweenTermTotal : ''}</td>
                    <td className="score-entry-cell">
                      <input
                        type="number"
                        min={0}
                        max={10}
                        className="excel-input score-input text-center text-blue-600"
                        value={score.midterm ?? ''}
                        onMouseDown={(e) => {
                          if (!canEnterScores) {
                            e.preventDefault();
                            notifyMissingScoreConfig();
                          }
                        }}
                        onChange={(e) => handleChange(student.id, 'midterm', e.target.value, 10)}
                        readOnly={!canEnterScores}
                        aria-disabled={!canEnterScores}
                      />
                    </td>
                    <td className="score-entry-cell">
                      <input
                        type="number"
                        min={0}
                        max={20}
                        className="excel-input score-input text-center text-blue-600"
                        value={score.final ?? ''}
                        onMouseDown={(e) => {
                          if (!canEnterScores) {
                            e.preventDefault();
                            notifyMissingScoreConfig();
                          }
                        }}
                        onChange={(e) => handleChange(student.id, 'final', e.target.value, 20)}
                        readOnly={!canEnterScores}
                        aria-disabled={!canEnterScores}
                      />
                    </td>
                    <td className="text-blue-600 text-center font-bold bg-blue-50">{hasScoreData ? total : ''}</td>
                    <td className="text-center">
                      {hasScoreData ? (total >= 80 ? '4' : total >= 75 ? '3.5' : total >= 70 ? '3' : total >= 65 ? '2.5' : total >= 60 ? '2' : total >= 55 ? '1.5' : total >= 50 ? '1' : '0') : ''}
                    </td>
                    <td className="text-red-600 text-center">{hasScoreData && total < 50 ? '0' : ''}</td>
                    <td className="text-center">{hasScoreData ? total.toFixed(2) : ''}</td>
                    <td className="text-center font-bold text-lg">
                      {hasScoreData ? (total >= 50 ? <span className="text-green-600">ผ</span> : <span className="text-red-600">มผ</span>) : ''}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={scoreTableCols + 12} className="text-center py-8 text-slate-500 bg-white">
                    ยังไม่มีข้อมูลนักเรียน กรุณาเพิ่มรายชื่อนักเรียนในเมนู "ข้อมูลนักเรียน"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>

        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            ตั้งค่าตัวชี้วัด
          </button>
          <button
            onClick={() => {
              if (!canEnterScores) {
                notifyMissingScoreConfig();
                return;
              }
              setShowAutoFillModal(true);
            }}
            className={`px-6 py-2 rounded-md transition-colors shadow-sm font-medium flex items-center gap-2 ${
              canEnterScores
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-slate-300 text-slate-500 hover:bg-slate-300'
            }`}
          >
            <Sparkles size={18} />
            ระบบช่วยบันทึกคะแนน
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
        students={students}
        onFill={handleAutoFill}
      />
    </div>
  );
};
