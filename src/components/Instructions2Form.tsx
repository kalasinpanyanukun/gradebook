import React from "react";

const gradeRows = [
  ["0", "ผลการเรียนต่ำกว่าเกณฑ์", "0 - 49"],
  ["1", "ผลการเรียนขั้นต่ำ", "50 - 54"],
  ["1.5", "ผลการเรียนพอใช้", "55 - 59"],
  ["2", "ผลการเรียนน่าพอใจ", "60 - 64"],
  ["2.5", "ผลการเรียนค่อนข้างดี", "65 - 69"],
  ["3", "ผลการเรียนดี", "70 - 74"],
  ["3.5", "ผลการเรียนดีมาก", "75 - 79"],
  ["4", "ผลการเรียนดีเยี่ยม", "80 - 100"],
];

export const Instructions2Form: React.FC = () => {
  return (
    <div className="flex justify-center rounded-2xl bg-slate-100/90 p-4 sm:p-6 overflow-auto">
      <div
        className="bg-white p-10 rounded-lg ring-1 ring-slate-200/80 shadow-[0_12px_32px_-8px_rgb(15,23,42,0.12)]"
        style={{ width: "1123px", minHeight: "794px", fontFamily: "Sarabun" }}
      >
        <div className="text-[16px] leading-relaxed text-black">
          <h2 className="mb-3 text-lg font-bold">การบันทึกการวัดและประเมินผล</h2>

          <div className="pl-4">
            <p className="font-semibold">1) วิธีการกรอกคะแนน</p>
            <div className="pl-5">
              <p>
                1.1 สำหรับคะแนนวัดผลการเรียนรู้นักเรียนคนใดเมื่อทดสอบแล้วไม่ผ่านเกณฑ์ให้มีการสอนซ่อมเสริม
              </p>
              <p className="pl-6">
                ในจุดที่ไม่ผ่านเกณฑ์แล้วให้สอบแก้ตัว คะแนนเดิมที่ได้ใหม่ต้องไม่เกินครึ่งหนึ่งของคะแนนทั้งหมด
              </p>
              <p>1.2 ให้รวมคะแนนระหว่างภาคเรียนเข้าด้วยกันแล้วเขียนลงในช่องรวมคะแนนระหว่างเรียน</p>
              <p>1.3 เขียนคะแนนสอบปลายภาคเรียนลงในช่องรวมคะแนนสอบปลายภาค</p>
              <p>1.4 รวมคะแนนระหว่างเรียนและรวมคะแนนสอบปลายภาคแล้วนำมาเทียบกับเกณฑ์ที่กำหนดไว้</p>
              <p className="pl-6">เพื่อให้ระดับผลการเรียน</p>
              <p>1.5 นักเรียนที่มีเวลาเรียนไม่ครบ 80% ไม่มีสิทธิ์เข้าสอบปลายภาคให้ได้ "มส"</p>
              <p>
                1.6 นักเรียนที่มีเวลาเรียนครบ 80% แต่ไม่ได้เข้าสอบปลายภาคหรือผู้ที่ส่งงานไม่ครบให้ได้ผลการเรียนเป็น "ร"
              </p>
            </div>

            <p>
              2) การกรอกคะแนนผลการเรียนใช้หมึกสีน้ำเงินหรือสีดำ ยกเว้น "0", "ร", "มส", "มผ" ให้ใช้หมึกสีแดง
            </p>
            <p>
              3) หากมีการแก้ไขให้ใช้หมึกสีแดง ขีดฆ่าคำผิด และเขียนคำที่ถูกต้องพร้อมลงชื่อกำกับด้วยหมึกสีแดง
            </p>
            <p>และให้ใช้อักษรแสดงผลการเรียนที่มีเงื่อนไขในแต่ละรายวิชา ดังนี้</p>

            <div className="mt-4 grid max-w-[760px] grid-cols-[48px_92px_1fr] gap-y-1 pl-8">
              <div>ร</div>
              <div>หมายถึง</div>
              <div>รอการตัดสิน หรือยังตัดสินไม่ได้เนื่องจาก</div>
              <div></div>
              <div></div>
              <div className="pl-8">1. ไม่ส่งงาน</div>
              <div></div>
              <div></div>
              <div className="pl-8">2. ไม่ผ่านการทดสอบตัวชี้วัด/ผลการเรียนรู้</div>

              <div className="mt-2">มส</div>
              <div className="mt-2">หมายถึง</div>
              <div className="mt-2">เข้าเรียนไม่ครบร้อยละ 80</div>

              <div>ผ</div>
              <div>หมายถึง</div>
              <div>ผ่านเกณฑ์การประเมิน</div>

              <div>มผ</div>
              <div>หมายถึง</div>
              <div>ไม่ผ่านเกณฑ์การประเมิน</div>
            </div>

            <div className="mt-5 pl-8">
              <p className="font-bold">ระดับผลการเรียน</p>
              <table className="instruction-table mt-2 w-[640px] border-collapse border border-black text-center text-sm outline outline-1 outline-black">
                <thead>
                  <tr>
                    <th className="border border-black px-3 py-1 font-normal">ระดับผลการเรียน</th>
                    <th className="border border-black px-3 py-1 font-normal">ความหมาย</th>
                    <th className="border border-black px-3 py-1 font-normal">ช่วงคะแนนเป็นร้อยละ</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeRows.map(([level, meaning, range]) => (
                    <tr key={level}>
                      <td className="border border-black px-3 py-1">{level}</td>
                      <td className="border border-black px-3 py-1">{meaning}</td>
                      <td className="border border-black px-3 py-1">{range}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
