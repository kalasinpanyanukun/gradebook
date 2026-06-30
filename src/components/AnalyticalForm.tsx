import React, { useState } from 'react';
import { AppData } from '../types';
import { AutoFillAttributesModal } from './AutoFillAttributesModal';
import { Sparkles, AlertCircle } from 'lucide-react';
import { ModalPortal } from './ModalPortal';

interface Props {
  students: AppData['students'];
  data: AppData['analytical'];
  generalInfo: AppData['generalInfo'];
  onChange: (data: AppData['analytical']) => void;
}

function buildReportTitle(generalInfo: AppData['generalInfo']) {
  return [
    'ผลการประเมินการอ่าน คิดวิเคราะห์ และเขียน',
    generalInfo.gradeLevel ? `ชั้น ${generalInfo.gradeLevel}` : '',
    generalInfo.semester ? `ภาคเรียนที่ ${generalInfo.semester}` : '',
    generalInfo.academicYear ? `ปีการศึกษา ${generalInfo.academicYear}` : '',
  ].filter(Boolean).join(' ');
}

export const AnalyticalForm: React.FC<Props> = ({ students, data, generalInfo, onChange }) => {
  const [showAutoFillModal, setShowAutoFillModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const reportTitle = buildReportTitle(generalInfo);

  const handleChange = (studentId: string, field: string, value: string) => {
    const numValue = value === '' ? '' : parseInt(value) || 0;
    onChange({
      ...data,
      [studentId]: {
        ...(data[studentId] || {}),
        [field]: numValue
      }
    });
  };

  const handleAutoFill = (minScore: number, maxScore: number, studentIds?: string[]) => {
    const newData = { ...data };
    const targetStudents = studentIds?.length
      ? students.filter(student => studentIds.includes(student.id))
      : students;
    
    targetStudents.forEach(student => {
      newData[student.id] = {
        attr1: Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore,
        attr2: Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore,
        attr3: Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore,
        attr4: Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore,
        attr5: Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore,
        attr6: Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore,
        attr7: Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore,
      };
    });
    
    onChange(newData);
  };

  const handleClear = () => {
    setShowClearConfirm(true);
  };

  const confirmClearData = () => {
    const emptyData: Record<string, any> = {};
    students.forEach(student => {
      emptyData[student.id] = {
        attr1: '',
        attr2: '',
        attr3: '',
        attr4: '',
        attr5: '',
        attr6: '',
        attr7: ''
      };
    });
    onChange(emptyData);
    setShowClearConfirm(false);
  };

  const getAvg = (attrs: Record<string, any> | undefined) => {
    if (!attrs) return 0;
    let sum = 0;
    let count = 0;
    for (let i = 1; i <= 7; i++) {
      const val = attrs[`attr${i}`];
      if (typeof val === 'number') {
        sum += val;
        count++;
      }
    }
    return count > 0 ? Math.round(sum / count) : 0;
  };

  const getGrade = (score: number) => {
    if (score === 3) return { text: 'ดีเยี่ยม', color: 'bg-green-excel text-green-800' };
    if (score === 2) return { text: 'ดี', color: 'bg-green-excel text-green-800' };
    if (score === 1) return { text: 'ผ่าน', color: 'bg-green-excel text-green-800' };
    return { text: 'ไม่ผ่าน', color: 'bg-yellow-200 text-red-600' };
  };

  const rowsToRender = students.length;

  return (
    <div className="relative w-full overflow-auto">
      {/* Clear Confirmation Overlay */}
      {showClearConfirm && (
        <ModalPortal>
          <div className="fixed inset-0 z-[120] grid min-h-dvh place-items-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">ยืนยันการล้างข้อมูล</h3>
            <p className="text-slate-600 mb-6">คุณแน่ใจหรือไม่ที่จะล้างคะแนนคิดวิเคราะห์ทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
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
        </ModalPortal>
      )}

      <div className="w-full min-w-0 bg-white p-4" style={{ minHeight: 'calc(100vh - 240px)', fontFamily: 'Sarabun' }}>
        <div className="mb-3 grid gap-2 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
          <h2 className="text-xl font-bold">คิดวิเคราะห์</h2>
          <div className="text-center text-lg font-bold leading-7 text-slate-900 lg:max-w-[760px]">
            {reportTitle}
          </div>
          <div aria-hidden="true" />
        </div>
        
        <div className="excel-scroll-area overflow-auto max-w-full">
          <div className="excel-scroll-content">
          <table className="excel-table min-w-max whitespace-nowrap">
            <thead>
              <tr>
                <th rowSpan={11} className="bg-orange-excel sticky left-0 z-20" style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}>เลขที่</th>
                <th rowSpan={11} className="bg-orange-excel sticky z-20" style={{ left: '48px', width: '112px', minWidth: '112px', maxWidth: '112px' }}>เลขประจำตัว</th>
                <th rowSpan={11} className="bg-orange-excel sticky z-20" style={{ left: '160px', width: '150px', minWidth: '150px', maxWidth: '150px' }}>เลขประจำตัวประชาชน</th>
                <th rowSpan={11} className="bg-orange-excel sticky z-20 border-r-2 border-r-slate-400" style={{ left: '310px', width: '292px', minWidth: '292px', maxWidth: '292px' }}>ชื่อ - สกุล</th>
                <th colSpan={9} className="bg-orange-excel">ประเมินตัวชี้วัดชั้น ม.1-3</th>
              </tr>
              <tr>
                <th colSpan={9} className="!text-left px-2 bg-orange-excel font-normal">1. อ่านออกเสียงให้ถูกต้องตามหลักการอ่าน</th>
              </tr>
              <tr><th colSpan={9} className="!text-left px-2 bg-orange-excel font-normal">2. อ่านแล้วจับใจความได้</th></tr>
              <tr><th colSpan={9} className="!text-left px-2 bg-orange-excel font-normal">3. สรุป/แสดงความคิดเห็นในเรื่องที่เรียนได้</th></tr>
              <tr><th colSpan={9} className="!text-left px-2 bg-orange-excel font-normal">4. แยกข้อเท็จจริงและข้อคิดเห็นในเรื่องที่เรียนได้</th></tr>
              <tr><th colSpan={9} className="!text-left px-2 bg-orange-excel font-normal">5. เขียนสื่อความได้ตรงประเด็น</th></tr>
              <tr><th colSpan={9} className="!text-left px-2 bg-orange-excel font-normal">6. เขียนแสดงความคิดเห็นได้ถูกต้อง</th></tr>
              <tr><th colSpan={9} className="!text-left px-2 bg-orange-excel font-normal">7. เขียนสะกดคำได้ถูกต้องตามหลักภาษาไทย</th></tr>
              <tr>
                <th colSpan={7} className="bg-orange-excel">ภาคเรียนที่ 2</th>
                <th rowSpan={2} className="bg-orange-excel w-24">สรุปผลการ<br/>ประเมิน</th>
                <th rowSpan={2} className="bg-orange-excel w-32">สรุปผลการประเมิน<br/>ปลายปี</th>
              </tr>
              <tr>
                <th className="bg-orange-excel w-10">1</th><th className="bg-orange-excel w-10">2</th><th className="bg-orange-excel w-10">3</th><th className="bg-orange-excel w-10">4</th><th className="bg-orange-excel w-10">5</th><th className="bg-orange-excel w-10">6</th><th className="bg-orange-excel w-10">7</th>
              </tr>
              <tr>
                <th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th>
                <th className="bg-orange-excel">3</th>
                <th className="bg-orange-excel font-normal">(ดีเยี่ยม ดี ผ่าน ไม่ผ่าน)</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowsToRender }).map((_, index) => {
                const student = students[index];
                const attrs = student ? (data[student.id] || {}) : {};
                
                const avg = getAvg(attrs);
                const grade = getGrade(avg);

                return (
                  <tr key={student ? student.id : `empty-${index}`}>
                    <td className="text-center sticky left-0 z-10 bg-white" style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}>{index + 1}</td>
                    <td className="text-center sticky z-10 bg-white" style={{ left: '48px', width: '112px', minWidth: '112px', maxWidth: '112px' }}>{student?.studentId ?? ''}</td>
                    <td className="text-center sticky z-10 bg-white" style={{ left: '160px', width: '150px', minWidth: '150px', maxWidth: '150px' }}>{student?.citizenId ?? ''}</td>
                    <td className="text-left px-2 sticky z-10 bg-white border-r-2 border-r-slate-400" style={{ left: '310px', width: '292px', minWidth: '292px', maxWidth: '292px' }}>{student?.name ?? ''}</td>
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr1'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr1', e.target.value)} disabled={!student} /></td>
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr2'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr2', e.target.value)} disabled={!student} /></td>
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr3'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr3', e.target.value)} disabled={!student} /></td>
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr4'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr4', e.target.value)} disabled={!student} /></td>
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr5'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr5', e.target.value)} disabled={!student} /></td>
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr6'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr6', e.target.value)} disabled={!student} /></td>
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr7'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr7', e.target.value)} disabled={!student} /></td>
                    <td className="text-center">{student && avg > 0 ? avg : ''}</td>
                    <td className={`text-center font-bold ${student && avg > 0 ? grade.color : ''}`}>{student && avg > 0 ? grade.text : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={() => setShowAutoFillModal(true)}
            className="flex items-center gap-2 rounded-md bg-emerald-600 px-6 py-2 font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            <Sparkles size={18} />
            ระบบช่วยลงคะแนนอัตโนมัติ
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-6 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors"
          >
            ล้างคะแนน
          </button>
        </div>
      </div>
      
      <AutoFillAttributesModal
        isOpen={showAutoFillModal}
        onClose={() => setShowAutoFillModal(false)}
        students={students}
        onFill={handleAutoFill}
      />
    </div>
  );
};
