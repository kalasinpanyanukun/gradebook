import React, { useState } from 'react';
import { AppData } from '../types';
import { AutoFillAttributesModal } from './AutoFillAttributesModal';
import { Sparkles } from 'lucide-react';

interface Props {
  students: AppData['students'];
  data: AppData['attributes'];
  onChange: (data: AppData['attributes']) => void;
}

export const Attributes5_8Form: React.FC<Props> = ({ students, data, onChange }) => {
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
    const fields = ['attr5_1', 'attr5_2', 'attr6_1', 'attr6_2', 'attr7_1', 'attr7_2', 'attr7_3', 'attr8_1', 'attr8_2'];
    
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
          <h2 className="text-xl font-bold">คุณลักษณะ5-8</h2>
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
                <th colSpan={19} className="bg-orange-excel">แบบบันทึกผลการประเมินคุณลักษณะอันพึงประสงค์</th>
              </tr>
              <tr>
                <th colSpan={4} className="bg-orange-excel">5. อยู่อย่างพอเพียง</th>
                <th colSpan={4} className="bg-orange-excel">6. มุ่งมั่นในการทำงาน</th>
                <th colSpan={5} className="bg-orange-excel">7. รักความเป็นไทย</th>
                <th colSpan={4} className="bg-orange-excel">8. มีจิตสาธารณะ</th>
                <th colSpan={2} className="bg-orange-excel">สรุประดับคุณภาพ</th>
              </tr>
              <tr>
                <th className="bg-orange-excel writing-vertical">5.1 ดำเนินชีวิตอย่างพอประมาณ มีเหตุผล รอบคอบ มีคุณธรรม</th>
                <th className="bg-orange-excel writing-vertical">5.2 มีภูมิคุ้มกันในตัวที่ดี ปรับตัวเพื่ออยู่ในสังคมได้อย่างมีความสุข</th>
                <th className="bg-orange-excel writing-vertical">ผลการประเมิน</th>
                <th className="bg-orange-excel writing-vertical">รายคุณลักษณะ</th>
                <th className="bg-orange-excel writing-vertical">6.1 ตั้งใจและรับผิดชอบในการปฏิบัติหน้าที่การงาน</th>
                <th className="bg-orange-excel writing-vertical">6.2 ทำงานด้วยความเพียรพยายามและอดทนเพื่อให้งานสำเร็จตามเป้าหมาย</th>
                <th className="bg-orange-excel writing-vertical">ผลการประเมิน</th>
                <th className="bg-orange-excel writing-vertical">รายคุณลักษณะ</th>
                <th className="bg-orange-excel writing-vertical">7.1 ภาคภูมิใจในขนบธรรมเนียมประเพณี ศิลปะ วัฒนธรรมไทยและมีความกตัญญูกตเวที</th>
                <th className="bg-orange-excel writing-vertical">7.2 เห็นคุณค่าและใช้ภาษาไทยในการสื่อสารได้อย่างถูกต้องเหมาะสม</th>
                <th className="bg-orange-excel writing-vertical">7.3 อนุรักษ์และสืบทอดภูมิปัญญาไทย</th>
                <th className="bg-orange-excel writing-vertical">ผลการประเมิน</th>
                <th className="bg-orange-excel writing-vertical">รายคุณลักษณะ</th>
                <th className="bg-orange-excel writing-vertical">8.1 ช่วยเหลือผู้อื่นด้วยความเต็มใจโดยไม่หวังผลตอบแทน</th>
                <th className="bg-orange-excel writing-vertical">8.2 เข้าร่วมกิจกรรมที่เป็นประโยชน์ต่อโรงเรียน ชุมชน และสังคม</th>
                <th className="bg-orange-excel writing-vertical">ผลการประเมิน</th>
                <th className="bg-orange-excel writing-vertical">รายคุณลักษณะ</th>
                <th className="bg-orange-excel writing-vertical">รวมทุกคุณลักษณะภาคเรียนที่ 2</th>
                <th className="bg-orange-excel writing-vertical">ผลการตัดสินคุณลักษณะรายปี<br/>(ดีเยี่ยม ดี ผ่าน ไม่ผ่าน)</th>
              </tr>
              <tr>
                <th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">ส</th>
                <th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">ส</th>
                <th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">ส</th>
                <th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">3</th><th className="bg-orange-excel">ส</th>
                <th className="bg-orange-excel">3,2,1,0</th><th className="bg-orange-excel"></th>
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
                const avg5 = getAvg(['attr5_1', 'attr5_2'], attrs);
                const avg6 = getAvg(['attr6_1', 'attr6_2'], attrs);
                const avg7 = getAvg(['attr7_1', 'attr7_2', 'attr7_3'], attrs);
                const avg8 = getAvg(['attr8_1', 'attr8_2'], attrs);

                const totalAvg = Math.round((avg1 + avg2 + avg3 + avg4 + avg5 + avg6 + avg7 + avg8) / 8);
                
                let gradeText = 'ไม่ผ่าน';
                let gradeClass = 'text-red-600 bg-yellow-200';
                if (totalAvg === 3) {
                  gradeText = 'ดีเยี่ยม';
                  gradeClass = 'text-green-800 bg-green-200';
                } else if (totalAvg === 2) {
                  gradeText = 'ดี';
                  gradeClass = 'text-green-800 bg-green-200';
                } else if (totalAvg === 1) {
                  gradeText = 'ผ่าน';
                  gradeClass = 'text-black bg-white';
                }

                return (
                  <tr key={student ? student.id : `empty-${index}`}>
                    <td className="text-center">{index + 1}</td>
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr5_1'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr5_1', e.target.value)} disabled={!student} /></td>
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr5_2'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr5_2', e.target.value)} disabled={!student} /></td>
                    <td className="bg-orange-100 text-center">{avg5}</td>
                    <td className="bg-orange-100 text-center">{avg5}</td>
                    
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr6_1'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr6_1', e.target.value)} disabled={!student} /></td>
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr6_2'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr6_2', e.target.value)} disabled={!student} /></td>
                    <td className="bg-orange-100 text-center">{avg6}</td>
                    <td className="bg-orange-100 text-center">{avg6}</td>
                    
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr7_1'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr7_1', e.target.value)} disabled={!student} /></td>
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr7_2'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr7_2', e.target.value)} disabled={!student} /></td>
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr7_3'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr7_3', e.target.value)} disabled={!student} /></td>
                    <td className="bg-orange-100 text-center">{avg7}</td>
                    <td className="bg-orange-100 text-center">{avg7}</td>
                    
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr8_1'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr8_1', e.target.value)} disabled={!student} /></td>
                    <td><input type="number" max={3} min={0} className="excel-input text-center" value={attrs['attr8_2'] ?? ''} onChange={(e) => student && handleChange(student.id, 'attr8_2', e.target.value)} disabled={!student} /></td>
                    <td className="bg-orange-100 text-center">{avg8}</td>
                    <td className="bg-orange-100 text-center">{avg8}</td>
                    
                    <td className="bg-orange-100 text-center">{totalAvg}</td>
                    <td className={`text-center font-bold ${gradeClass}`}>{gradeText}</td>
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
