import React, { useState } from 'react';
import { AppData } from '../types';
import { AutoFillAttributesModal } from './AutoFillAttributesModal';
import { AlertCircle, Sparkles } from 'lucide-react';
import { ModalPortal } from './ModalPortal';

interface Props {
  students: AppData['students'];
  data: AppData['attributes'];
  generalInfo: AppData['generalInfo'];
  onChange: (data: AppData['attributes']) => void;
}

function buildReportTitle(generalInfo: AppData['generalInfo']) {
  return [
    'ผลการประเมินคุณลักษณะอันพึงประสงค์',
    generalInfo.gradeLevel ? `ชั้น ${generalInfo.gradeLevel}` : '',
    generalInfo.semester ? `ภาคเรียนที่ ${generalInfo.semester}` : '',
    generalInfo.academicYear ? `ปีการศึกษา ${generalInfo.academicYear}` : '',
  ].filter(Boolean).join(' ');
}

export const AttributesForm: React.FC<Props> = ({ students, data, generalInfo, onChange }) => {
  const [showAutoFillModal, setShowAutoFillModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const reportTitle = buildReportTitle(generalInfo);
  const fields = ['attr1_1', 'attr1_2', 'attr1_3', 'attr1_4', 'attr2_1', 'attr2_2', 'attr3_1', 'attr4_1', 'attr4_2'];

  const handleChange = (studentId: string, field: string, value: string) => {
    const numValue = value === '' ? '' : parseInt(value);
    onChange({
      ...data,
      [studentId]: {
        ...data[studentId],
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
      if (!newData[student.id]) {
        newData[student.id] = {};
      }
      
      fields.forEach(field => {
        const randomScore = Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore;
        newData[student.id][field] = randomScore;
      });
    });
    
    onChange(newData);
  };

  const confirmClearData = () => {
    const newData = { ...data };

    students.forEach(student => {
      const nextStudentData = { ...(newData[student.id] || {}) };
      fields.forEach(field => {
        nextStudentData[field] = '';
      });
      newData[student.id] = nextStudentData;
    });

    onChange(newData);
    setShowClearConfirm(false);
  };

  const getAvg = (keys: string[], attrs: any) => {
    let sum = 0;
    let count = 0;
    keys.forEach(k => {
      if (attrs[k] !== undefined && attrs[k] !== '') {
        sum += Number(attrs[k]);
        count++;
      }
    });
    return count > 0 ? Math.round(sum / count) : 0;
  };

  const rowsToRender = students.length;

  return (
    <div className="w-full overflow-auto">
      {showClearConfirm && (
        <ModalPortal>
          <div className="fixed inset-0 z-[120] grid min-h-dvh place-items-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl animate-in zoom-in-95 duration-200">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertCircle size={32} />
            </div>
            <h3 className="mb-2 text-2xl font-bold text-slate-800">ยืนยันการล้างค่า</h3>
            <p className="mb-6 text-slate-600">
              คุณแน่ใจหรือไม่ที่จะล้างค่าคุณลักษณะ 1-4 ทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="rounded-lg border border-slate-300 px-6 py-2.5 font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmClearData}
                className="rounded-lg bg-red-600 px-6 py-2.5 font-medium text-white shadow-md transition-colors hover:bg-red-700"
              >
                ยืนยันการล้างค่า
              </button>
            </div>
            </div>
          </div>
        </ModalPortal>
      )}

      <div className="w-full min-w-0 bg-white p-4" style={{ minHeight: 'calc(100vh - 240px)', fontFamily: 'Sarabun' }}>
        <div className="mb-3 grid gap-2 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
          <h2 className="text-xl font-bold">คุณลักษณะ1-4</h2>
          <div className="text-center text-lg font-bold leading-7 text-slate-900 lg:max-w-[760px]">
            {reportTitle}
          </div>
          <div aria-hidden="true" />
        </div>
        
        <div className="excel-scroll-area overflow-auto max-w-full">
          <div className="excel-scroll-content">
          <table className="excel-table attributes-table min-w-max whitespace-nowrap">
            <thead>
              <tr>
                <th rowSpan={4} className="bg-orange-excel sticky left-0 z-20" style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}>เลขที่</th>
                <th rowSpan={4} className="bg-orange-excel sticky z-20" style={{ left: '48px', width: '128px', minWidth: '128px', maxWidth: '128px' }}>เลขประจำตัว</th>
                <th rowSpan={4} className="bg-orange-excel sticky z-20" style={{ left: '176px', width: '180px', minWidth: '180px', maxWidth: '180px' }}>เลขประจำตัวประชาชน</th>
                <th rowSpan={4} className="bg-orange-excel sticky z-20 border-r-2 border-r-slate-400" style={{ left: '356px', width: '292px', minWidth: '292px', maxWidth: '292px' }}>ชื่อ - สกุล</th>
                <th colSpan={17} className="bg-orange-excel">แบบบันทึกผลการประเมินคุณลักษณะอันพึงประสงค์</th>
              </tr>
              <tr>
                <th colSpan={6} className="bg-orange-excel">1. รักชาติ ศาสน์ กษัตริย์</th>
                <th colSpan={4} className="bg-orange-excel">2. ซื่อสัตย์สุจริต</th>
                <th colSpan={3} className="bg-orange-excel">3. มีวินัย</th>
                <th colSpan={4} className="bg-orange-excel">4. ใฝ่เรียนรู้</th>
              </tr>
              <tr>
                <th className="bg-orange-excel writing-vertical">1.1 เป็นพลเมืองดีของชาติ</th>
                <th className="bg-orange-excel writing-vertical">1.2 ธำรงไว้ซึ่งความเข้มแข็งของชาติ</th>
                <th className="bg-orange-excel writing-vertical">1.3 ศรัทธา ยึดมั่นและปฏิบัติตนตามหลักศาสนา</th>
                <th className="bg-orange-excel writing-vertical">1.4 เคารพเทิดทูนสถาบันพระมหากษัตริย์</th>
                <th className="bg-orange-excel writing-vertical">ผลการประเมิน</th>
                <th className="bg-orange-excel writing-vertical">รายคุณลักษณะ</th>
                <th className="bg-orange-excel writing-vertical">2.1 ประพฤติตรงตามความเป็นจริงต่อตนเองทั้งทางกาย วาจา ใจ</th>
                <th className="bg-orange-excel writing-vertical">2.2 ประพฤติตรงตามความเป็นจริงต่อผู้อื่นทั้งทางกาย วาจา ใจ</th>
                <th className="bg-orange-excel writing-vertical">ผลการประเมิน</th>
                <th className="bg-orange-excel writing-vertical">รายคุณลักษณะ</th>
                <th className="bg-orange-excel writing-vertical">3.1 ปฏิบัติตามข้อตกลง กฎเกณฑ์ ระเบียบ ข้อบังคับของครอบครัว โรงเรียนและสังคม</th>
                <th className="bg-orange-excel writing-vertical">ผลการประเมิน</th>
                <th className="bg-orange-excel writing-vertical">รายคุณลักษณะ</th>
                <th className="bg-orange-excel writing-vertical">4.1 ตั้งใจ เพียรพยายามในการเรียนและเข้าร่วมกิจกรรมการเรียนรู้</th>
                <th className="bg-orange-excel writing-vertical">4.2 แสวงหาความรู้จากแหล่งเรียนรู้ต่างๆ ทั้งภายในและภายนอกโรงเรียนด้วยการเลือกใช้สื่ออย่างเหมาะสมสรุปเป็นองค์ความรู้และสามารถนำไปใช้ในชีวิตประจำวันได้</th>
                <th className="bg-orange-excel writing-vertical">ผลการประเมิน</th>
                <th className="bg-orange-excel writing-vertical">รายคุณลักษณะ</th>
              </tr>
              <tr>
                <th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">ส</th>
                <th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">ส</th>
                <th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">ส</th>
                <th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">ส</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rowsToRender }).map((_, index) => {
                const student = students[index];
                const attrs = student ? (data[student.id] || {}) : {};
                
                const avg1 = getAvg(['attr1_1', 'attr1_2', 'attr1_3', 'attr1_4'], attrs);
                const avg2 = getAvg(['attr2_1', 'attr2_2'], attrs);
                const avg3 = getAvg(['attr3_1'], attrs);
                const avg4 = getAvg(['attr4_1', 'attr4_2'], attrs);

                return (
                  <tr key={student ? student.id : `empty-${index}`}>
                    <td className="text-center sticky left-0 z-10 bg-white" style={{ width: '48px', minWidth: '48px', maxWidth: '48px' }}>{index + 1}</td>
                    <td className="text-center sticky z-10 bg-white" style={{ left: '48px', width: '128px', minWidth: '128px', maxWidth: '128px' }}>{student?.studentId ?? ''}</td>
                    <td className="text-center sticky z-10 bg-white" style={{ left: '176px', width: '180px', minWidth: '180px', maxWidth: '180px' }}>{student?.citizenId ?? ''}</td>
                    <td className="text-left px-2 sticky z-10 bg-white border-r-2 border-r-slate-400" style={{ left: '356px', width: '292px', minWidth: '292px', maxWidth: '292px' }}>{student?.name ?? ''}</td>
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr1_1'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr1_1', e.target.value)} disabled={!student} /></td>
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr1_2'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr1_2', e.target.value)} disabled={!student} /></td>
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr1_3'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr1_3', e.target.value)} disabled={!student} /></td>
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr1_4'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr1_4', e.target.value)} disabled={!student} /></td>
                    <td className="bg-orange-100 text-center">{avg1}</td>
                    <td className="bg-orange-100 text-center">{avg1}</td>
                    
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr2_1'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr2_1', e.target.value)} disabled={!student} /></td>
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr2_2'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr2_2', e.target.value)} disabled={!student} /></td>
                    <td className="bg-orange-100 text-center">{avg2}</td>
                    <td className="bg-orange-100 text-center">{avg2}</td>
                    
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr3_1'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr3_1', e.target.value)} disabled={!student} /></td>
                    <td className="bg-orange-100 text-center">{avg3}</td>
                    <td className="bg-orange-100 text-center">{avg3}</td>
                    
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr4_1'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr4_1', e.target.value)} disabled={!student} /></td>
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr4_2'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr4_2', e.target.value)} disabled={!student} /></td>
                    <td className="bg-orange-100 text-center">{avg4}</td>
                    <td className="bg-orange-100 text-center">{avg4}</td>
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
            onClick={() => setShowClearConfirm(true)}
            className="rounded-lg bg-red-50 px-6 py-2 font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            ล้างค่า
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
