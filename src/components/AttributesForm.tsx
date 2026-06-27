import React, { useState } from 'react';
import { AppData } from '../types';
import { AutoFillAttributesModal } from './AutoFillAttributesModal';
import { Sparkles } from 'lucide-react';

interface Props {
  students: AppData['students'];
  data: AppData['attributes'];
  onChange: (data: AppData['attributes']) => void;
}

export const AttributesForm: React.FC<Props> = ({ students, data, onChange }) => {
  const [showAutoFillModal, setShowAutoFillModal] = useState(false);

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

  const handleAutoFill = (minScore: number, maxScore: number) => {
    const newData = { ...data };
    const fields = ['attr1_1', 'attr1_2', 'attr1_3', 'attr1_4', 'attr2_1', 'attr2_2', 'attr3_1', 'attr4_1', 'attr4_2'];
    
    students.forEach(student => {
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
    <div className="flex justify-center rounded-2xl bg-slate-100/90 p-4 sm:p-6 overflow-auto">
      <div className="bg-white p-4 rounded-lg ring-1 ring-slate-200/80 shadow-[0_12px_32px_-8px_rgb(15,23,42,0.12)]" style={{ width: '1123px', minHeight: '794px', fontFamily: 'Sarabun' }}>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">คุณลักษณะ1-4</h2>
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
                <th rowSpan={4} className="bg-orange-excel w-10 writing-vertical">เลขที่/ภาคเรียนที่/ระดับคุณภาพ/ตัวชี้วัดคุณลักษณะ</th>
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
                    <td className="text-center">{index + 1}</td>
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
      
      <AutoFillAttributesModal
        isOpen={showAutoFillModal}
        onClose={() => setShowAutoFillModal(false)}
        onFill={handleAutoFill}
      />
    </div>
  );
};
