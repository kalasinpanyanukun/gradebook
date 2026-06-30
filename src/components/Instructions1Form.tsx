import React from 'react';

export const Instructions1Form: React.FC = () => {
  return (
    <div className="flex justify-center rounded-2xl bg-slate-100/90 p-4 sm:p-6 overflow-auto">
      <div className="bg-white p-10 rounded-lg ring-1 ring-slate-200/80 shadow-[0_12px_32px_-8px_rgb(15,23,42,0.12)]" style={{ width: '1123px', minHeight: '794px', fontFamily: 'Sarabun' }}>
        <div className="text-base leading-relaxed">
          <p className="font-bold text-lg mb-2">การบันทึกเวลาเรียน</p>
          <div className="pl-4 mb-4">
            <p>1. เลขประจำตัวนักเรียน ให้กรอกเลขประจำตัวนักเรียนเรียงจากน้อยไปหามาก โดยเริ่มจากนักเรียนชายทั้งหมด</p>
            <p className="pl-4">แล้วต่อด้วยนักเรียนหญิง ให้ยึดตามข้อมูล 10 มิถุนายนของทุกปี กรณีที่นักเรียนย้ายมาระหว่างปีการศึกษา</p>
            <p className="pl-4">ให้เพิ่มชื่อต่อจากคนสุดท้ายตามลำดับก่อนหลังวันที่ย้ายเข้ามาเรียน</p>
            <p>2. กรอกเลขประจำตัวประชาชน 13 หลัก ให้ถูกต้อง</p>
            <p>3. ชื่อ - ชื่อสกุล ให้กรอกชื่อและนามสกุลให้ชัดเจน</p>
            <p>4. ชั่วโมง สัปดาห์หนึ่งกำหนดไว้ 6 ช่อง คือ 6 วัน</p>
            <p>5. การบันทึกเวลาเรียน ให้บันทึกรายละเอียดดังนี้</p>
            <div className="pl-4">
              <p>5.1 จำนวนชั่วโมงที่......... ให้เขียน 1,2,3 ........ ถ้าสอนมากกว่า 1 ชั่วโมงในเวลาเดียวกันให้เขียน</p>
              <p className="pl-6">1-2,3-4 หรือ 1 - 3, 4 - 6 ฯลฯ หรืออาจบันทึกแยกแต่ละชั่วโมงก็ได้</p>
              <p>5.2 ให้เขียนเครื่องหมาย <span className="inline-block w-4 h-4 border border-slate-500 mx-1"></span> ด้วยสีแดง สำหรับผู้ไม่มาเรียน เมื่อภายหลังผู้มาเรียนนำใบลาป่วยหรือ</p>
              <p className="pl-6">ใบลากิจมาแสดง ให้เขียน "ป" หรือ "ล" ลงใน แล้วแต่กรณี ส่วนผู้ที่มาเรียนให้ใส่เครื่องหมายใด / ลงในช่อง</p>
              <p>5.3 ถ้าผู้เรียนลาพักการเรียน ย้ายหรือลาออกระหว่างปี/ภาค ให้ขีดเส้นด้วยหมึกแดง ตั้งแต่ วันพักการเรียน</p>
              <p className="pl-6">ถึงวันสุดท้ายที่ถูกพักการเรียน หรือ ขีดตั้งแต่ลาออกจนถึงวันสิ้นปี/ภาคเรียน</p>
              <p className="pl-6">แล้วเขียนคำว่า "พักการเรียน" หรือ "ย้ายสถานศึกษา" แล้วแต่กรณี</p>
              <p>5.4 รวมจำนวนชั่วโมงเรียน เมื่อสิ้นปี/ภาค ให้รวมเวลามาเรียนจริงของผู้เรียนลงในช่องรวมเวลาเรียน</p>
              <p className="pl-6">แล้วกรอกเวลาเรียนเต็มและเวลาเรียน 80 เปอร์เซ็นต์ ของวิชานั้น ๆ นักเรียนที่มีเวลาเรียน</p>
              <p className="pl-6">ไม่ถึง 80 เปอร์เซ็นต์ของรายวิชานั้นให้เขียนด้วยหมึกสีแดงในช่องสรุปผลการประเมิน <span className="text-red-500 font-bold">"มส"</span></p>
            </div>
          </div>

          <p className="font-bold text-lg mb-2 mt-6">การบันทึกการประเมินผลการเรียน</p>
          <div className="pl-4">
            <p>1. ให้เขียนตัวชี้วัดจากข้อ1 ถึงข้อสุดท้าย</p>
            <p>2. เขียนอัตราส่วนคะแนนระหว่างเรียนและปลายปี/ภาค</p>
            <p>3. การบันทึกผลการเรียนระหว่างเรียน มีรายละเอียดดังนี้</p>
            <div className="pl-4">
              <p>3.1 ให้เขียนเลขข้อของตัวชี้วัด และน้ำหนักคะแนนของแต่ละข้อลงใต้ช่อง</p>
              <p>ตัวชี้วัด/คะแนน เพื่อให้ทราบว่าการประเมินแต่ละครั้งจะประเมินข้อใด ดังตัวอย่าง</p>
              
              <div className="my-4 w-3/4">
                <table className="instruction-table w-full border-collapse border border-slate-500 text-center text-sm">
                  <tbody>
                    <tr>
                      <td colSpan={10} className="border border-slate-500 font-bold py-1">คะแนนวัดผลระหว่างเรียน</td>
                      <td className="border border-slate-500 border-b-0"></td>
                    </tr>
                    <tr>
                      <td colSpan={10} className="border border-slate-500 font-bold py-1">ตัวชี้วัด/คะแนน</td>
                      <td className="border border-slate-500 font-bold py-1">รวมคะแนน</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-500 w-8 py-1">1</td>
                      <td className="border border-slate-500 w-8 py-1">2</td>
                      <td className="border border-slate-500 w-8 py-1">3</td>
                      <td className="border border-slate-500 w-8 py-1">4</td>
                      <td className="border border-slate-500 w-8 py-1">5</td>
                      <td className="border border-slate-500 w-8 py-1">6</td>
                      <td className="border border-slate-500 w-8 py-1">7</td>
                      <td className="border border-slate-500 w-8 py-1">8</td>
                      <td className="border border-slate-500 w-8 py-1">9</td>
                      <td className="border border-slate-500 w-8 py-1">10</td>
                      <td className="border border-slate-500 py-1">ระหว่างเรียน</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-500 py-1">10</td>
                      <td className="border border-slate-500 py-1">10</td>
                      <td className="border border-slate-500 py-1">10</td>
                      <td className="border border-slate-500 py-1">10</td>
                      <td className="border border-slate-500 py-1">10</td>
                      <td className="border border-slate-500 py-1">10</td>
                      <td className="border border-slate-500 py-1">10</td>
                      <td className="border border-slate-500 py-1">10</td>
                      <td className="border border-slate-500 py-1">10</td>
                      <td className="border border-slate-500 py-1">10</td>
                      <td className="border border-slate-500 py-1">80</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p>3.2 วิธีการกรอกคะแนนตามที่นักเรียนได้จริงเมื่อประเมินแล้วผู้เรียนไม่ผ่านในแต่ละข้อ</p>
              <p className="pl-6">ต้องสอนซ่อมเสริมให้ (เจตนารมณ์ของการสอนซ่อมเสริม คือให้ผู้เรียนมีความรู้ความสามารถตาม</p>
              <p className="pl-6">เกณฑ์ของแต่ละข้อในตัวชี้วัด เมื่อประเมินแก้ตัวแล้วผู้เรียนได้คะแนนเกินครึ่ง)</p>
              <p className="pl-6">ของคะแนนเดิมให้ปรับเหลือเท่าครึ่งหนึ่งของคะแนนในแต่ละข้อ ดังตัวอย่าง</p>

              <div className="my-4 w-3/4">
                <table className="instruction-table w-full border-collapse border border-slate-500 text-center text-sm">
                  <tbody>
                    <tr>
                      <td colSpan={10} className="border border-slate-500 font-bold py-1">คะแนนวัดผลระหว่างเรียน</td>
                      <td className="border border-slate-500 border-b-0"></td>
                    </tr>
                    <tr>
                      <td colSpan={10} className="border border-slate-500 font-bold py-1">ตัวชี้วัด/คะแนน</td>
                      <td className="border border-slate-500 font-bold py-1">รวมคะแนน</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-500 w-8 py-1">1</td>
                      <td className="border border-slate-500 w-8 py-1">3</td>
                      <td className="border border-slate-500 w-8 py-1">4</td>
                      <td className="border border-slate-500 w-8 py-1">5</td>
                      <td className="border border-slate-500 w-8 py-1">6</td>
                      <td className="border border-slate-500 w-8 py-1"></td>
                      <td className="border border-slate-500 w-8 py-1"></td>
                      <td className="border border-slate-500 w-8 py-1"></td>
                      <td className="border border-slate-500 w-8 py-1"></td>
                      <td className="border border-slate-500 w-8 py-1"></td>
                      <td className="border border-slate-500 py-1">ระหว่างเรียน</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-500 py-1">4</td>
                      <td className="border border-slate-500 py-1">6</td>
                      <td className="border border-slate-500 py-1">5</td>
                      <td className="border border-slate-500 py-1">5</td>
                      <td className="border border-slate-500 py-1">10</td>
                      <td className="border border-slate-500 py-1"></td>
                      <td className="border border-slate-500 py-1"></td>
                      <td className="border border-slate-500 py-1"></td>
                      <td className="border border-slate-500 py-1"></td>
                      <td className="border border-slate-500 py-1"></td>
                      <td className="border border-slate-500 py-1">80</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-500 py-1">2</td>
                      <td className="border border-slate-500 py-1">2/3</td>
                      <td className="border border-slate-500 py-1">3</td>
                      <td className="border border-slate-500 py-1">4</td>
                      <td className="border border-slate-500 py-1">6</td>
                      <td className="border border-slate-500 py-1"></td>
                      <td className="border border-slate-500 py-1"></td>
                      <td className="border border-slate-500 py-1"></td>
                      <td className="border border-slate-500 py-1"></td>
                      <td className="border border-slate-500 py-1"></td>
                      <td className="border border-slate-500 py-1">18</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-500 py-1">3</td>
                      <td className="border border-slate-500 py-1">4</td>
                      <td className="border border-slate-500 py-1">4</td>
                      <td className="border border-slate-500 py-1">2/3</td>
                      <td className="border border-slate-500 py-1">4/5</td>
                      <td className="border border-slate-500 py-1"></td>
                      <td className="border border-slate-500 py-1"></td>
                      <td className="border border-slate-500 py-1"></td>
                      <td className="border border-slate-500 py-1"></td>
                      <td className="border border-slate-500 py-1"></td>
                      <td className="border border-slate-500 py-1">19</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
