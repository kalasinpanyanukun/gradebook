import React from "react";

const sections = [
  {
    title: "การสรุปผลการเรียน",
    items: [
      "ตรวจสอบคะแนนระหว่างเรียน คะแนนกลางภาค คะแนนปลายภาค และเวลาเรียนให้ครบก่อนสรุปผล",
      "กรณีผู้เรียนมีเวลาเรียนไม่ถึงเกณฑ์ ให้บันทึกผลตามระเบียบวัดผลของสถานศึกษา",
      "ผู้เรียนที่ต้องปรับปรุงหรือแก้ไขผลการเรียน ให้บันทึกหมายเหตุและติดตามผลการแก้ไขให้ครบถ้วน",
    ],
  },
  {
    title: "การประเมินคุณลักษณะและการอ่าน คิด วิเคราะห์ เขียน",
    items: [
      "บันทึกระดับคุณภาพตามตัวชี้วัดที่สถานศึกษากำหนด",
      "สรุปผลรายภาคและรายปีให้สอดคล้องกับข้อมูลรายบุคคล",
      "ตรวจทานชื่อครูผู้สอน ครูประจำชั้น และผู้ลงนามก่อนพิมพ์เอกสาร ปพ.5",
    ],
  },
  {
    title: "การตรวจสอบก่อนส่ง",
    items: [
      "ตรวจความครบถ้วนของรายชื่อนักเรียน เลขประจำตัว และเลขประจำตัวประชาชน",
      "ตรวจคะแนนรวม ร้อยละ ผลการตัดสิน และช่องหมายเหตุ",
      "ส่งข้อมูลภายในช่วงวันที่โรงเรียนเปิดให้บันทึกผล",
    ],
  },
];

export const Instructions2Form: React.FC = () => {
  return (
    <div className="flex justify-center rounded-2xl bg-slate-100/90 p-4 sm:p-6 overflow-auto">
      <div
        className="bg-white p-10 rounded-lg ring-1 ring-slate-200/80 shadow-[0_12px_32px_-8px_rgb(15,23,42,0.12)]"
        style={{ width: "1123px", minHeight: "794px", fontFamily: "Sarabun" }}
      >
        <div className="text-base leading-relaxed text-slate-800">
          <h2 className="mb-6 text-center text-2xl font-bold">คำชี้แจงการบันทึกผล ปพ.5</h2>
          <div className="space-y-6">
            {sections.map((section, sectionIndex) => (
              <section key={section.title}>
                <h3 className="mb-2 text-lg font-bold">
                  {sectionIndex + 1}. {section.title}
                </h3>
                <ol className="list-decimal space-y-1 pl-8">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            หน้านี้ถูกสร้างใหม่จากไฟล์ต้นฉบับที่อ่านไม่ได้ เพื่อคงการทำงานของแท็บคำชี้แจงในระบบ
          </div>
        </div>
      </div>
    </div>
  );
};
