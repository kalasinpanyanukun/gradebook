import React, { useState } from 'react';
import { AppData } from '../types';
import { AutoFillAttributesModal } from './AutoFillAttributesModal';
import { Sparkles, AlertCircle } from 'lucide-react';

interface Props {
  students: AppData['students'];
  data: AppData['analytical'];
  onChange: (data: AppData['analytical']) => void;
}

export const AnalyticalForm: React.FC<Props> = ({ students, data, onChange }) => {
  const [showAutoFillModal, setShowAutoFillModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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

  const handleAutoFill = (minScore: number, maxScore: number) => {
    const newData = { ...data };
    
    students.forEach(student => {
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
    <div className="flex justify-center rounded-2xl bg-slate-100/90 p-4 sm:p-6 overflow-auto relative">
      {/* Clear Confirmation Overlay */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center animate-in zoom-in-95 duration-200">
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
      )}

      <div className="bg-white p-4 rounded-lg ring-1 ring-slate-200/80 shadow-[0_12px_32px_-8px_rgb(15,23,42,0.12)]" style={{ width: '1123px', minHeight: '794px', fontFamily: 'Sarabun' }}>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">คิดวิเคราะห์</h2>
          <button
            onClick={() => setShowAutoFillModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-colors"
          >
            <Sparkles size={18} />
            สุ่มคะแนน
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="excel-table whitespace-nowrap">
            <thead>
              <tr>
                <th className="bg-orange-excel w-32">ชั้นที่ประเมิน</th>
                <th colSpan={9} className="bg-orange-excel">ประเมินตัวชี้วัดชั้น ม.1-3</th>
              </tr>
              <tr>
                <th rowSpan={7} className="bg-orange-excel">ตัวชี้วัด</th>
                <th colSpan={9} className="!text-left px-2 bg-orange-excel font-normal">1. อ่านออกเสียงให้ถูกต้องตามหลักการอ่าน</th>
              </tr>
              <tr><th colSpan={9} className="!text-left px-2 bg-orange-excel font-normal">2. อ่านแล้วจับใจความได้</th></tr>
              <tr><th colSpan={9} className="!text-left px-2 bg-orange-excel font-normal">3. สรุป/แสดงความคิดเห็นในเรื่องที่เรียนได้</th></tr>
              <tr><th colSpan={9} className="!text-left px-2 bg-orange-excel font-normal">4. แยกข้อเท็จจริงและข้อคิดเห็นในเรื่องที่เรียนได้</th></tr>
              <tr><th colSpan={9} className="!text-left px-2 bg-orange-excel font-normal">5. เขียนสื่อความได้ตรงประเด็น</th></tr>
              <tr><th colSpan={9} className="!text-left px-2 bg-orange-excel font-normal">6. เขียนแสดงความคิดเห็นได้ถูกต้อง</th></tr>
              <tr><th colSpan={9} className="!text-left px-2 bg-orange-excel font-normal">7. เขียนสะกดคำได้ถูกต้องตามหลักภาษาไทย</th></tr>
              <tr>
                <th className="bg-orange-excel">ภาคเรียน</th>
                <th colSpan={7} className="bg-orange-excel">ภาคเรียนที่ 2</th>
                <th rowSpan={2} className="bg-orange-excel w-24">สรุปผลการ<br/>ประเมิน</th>
                <th rowSpan={2} className="bg-orange-excel w-32">สรุปผลการประเมิน<br/>ปลายปี</th>
              </tr>
              <tr>
                <th className="bg-orange-excel">ตัวชี้วัด</th>
                <th className="bg-orange-excel w-10">1</th><th className="bg-orange-excel w-10">2</th><th className="bg-orange-excel w-10">3</th><th className="bg-orange-excel w-10">4</th><th className="bg-orange-excel w-10">5</th><th className="bg-orange-excel w-10">6</th><th className="bg-orange-excel w-10">7</th>
              </tr>
              <tr>
                <th className="bg-orange-excel">ระดับคุณภาพ</th>
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
                    <td className="text-center">{index + 1}</td>
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

        <div className="mt-6 flex justify-center">
          <button
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
        onFill={handleAutoFill}
      />
    </div>
  );
};
