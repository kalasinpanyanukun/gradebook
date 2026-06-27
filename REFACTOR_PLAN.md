# KSP GradeBook Refactor Plan

เอกสารนี้เป็นแผนแก้โค้ดต่อจาก `BUILD_SPEC.md` โดยจัดลำดับจากความเสี่ยงสูงสุดไปหาฟีเจอร์ที่ยังขาด เพื่อให้ระบบเดินไปตามสเปกจริง ไม่ใช่แค่ prototype ที่ต่อ Supabase แล้ว

## Phase A — Security and Data Safety

สถานะ: ทำในโค้ดแล้ว รอ apply migration และทดสอบบน Supabase staging/production

- เพิ่ม migration hardening สำหรับ RLS/RPC
  - ครูแก้ role/profile ตัวเองไม่ได้
  - ครูแก้ gradebook ได้เฉพาะปีการศึกษาที่ active
  - `promote_students` เรียกได้เฉพาะ admin ในโรงเรียนเดียวกัน
  - `clone_gradebook_structure` ตรวจ ownership/school/year ก่อน clone
- แก้ autosave ให้ flush ก่อนกดกลับหรือออกจากระบบ
- แก้ค่าเริ่มต้น `totalHours` ของ gradebook ใหม่ให้มาจาก assignment
- ต้องนำ `supabase/migrations/0009_security_hardening.sql` ไปรันใน Supabase ก่อนถือว่า security fix สมบูรณ์

Definition of done:
- ครูยิง update role ตัวเองผ่าน client ไม่ได้
- ครูเปิดปีเก่า export ได้ แต่ update DB ไม่ผ่าน
- admin เลื่อนชั้นซ้ำแล้วไม่สร้าง enrollment ซ้ำ
- กดแก้คะแนนแล้วกดกลับทันที ข้อมูลล่าสุดยังถูกบันทึก

## Phase B — Single Source of Truth

เป้าหมาย: เอาข้อมูล hardcode จาก prototype ออก แล้วให้ข้อมูลหลักมาจาก DB

สถานะ: เริ่มทำแล้ว

- `GeneralInfoForm`
  - ทำแล้ว: ชื่อโรงเรียนมาจาก assignment/schools และเก็บใน `generalInfo.schoolName`
  - ทำแล้ว: โลโก้หน้าปกใช้ `/logo3.png` จาก `image/logo3.png` หรือ `generalInfo.logoUrl` ไม่ดึง URL ภายนอก
  - ทำแล้ว: เอา array `TEACHERS` และ `SUBJECTS_MAP` ออกจากหน้าปก
  - พักไว้ก่อน: เพิ่ม settings table/หน้า admin สำหรับหัวหน้ากลุ่มสาระ ผู้บริหาร agency และ logo ต่อโรงเรียน รอข้อมูลจริงพร้อม
- Roster ใน gradebook
  - ทำแล้ว: ตอนเปิดสมุด ปพ.5 จะ refresh roster จาก `student_enrollments`
  - ทำแล้ว: ครูเพิ่ม/ลบ/แก้ตัวตนนักเรียนในหน้า ปพ.5 ไม่ได้
  - ทำแล้ว: ยังเก็บ `targetPercentage` รายคนจากข้อมูลเดิมไว้ได้
  - พักไว้ก่อน: เพิ่มปุ่ม/flow admin สำหรับ refresh roster และตรวจ diff นักเรียนเข้าออกแบบเห็นรายการ รอข้อมูลนักเรียนจริงพร้อม
- Export Excel
  - ทำแล้ว: ใช้โลโก้จาก local/generalInfo
  - ทำแล้ว: export หน้าปกใช้ชื่อโรงเรียน/agency จาก generalInfo
  - ทำแล้ว: ไม่เติมชื่อครู/วิชาตัวอย่างเมื่อข้อมูลว่าง
  - ทำแล้ว: เวลาเรียนในตารางยึด `totalHours` เหมือน UI

Definition of done:
- แก้ master data ใน admin แล้วหน้า ปพ.5/export เปลี่ยนตาม
- รายชื่อนักเรียนใน ปพ.5 ตรงกับ enrollment ของปี/ห้องนั้น

## Phase C — Admin Workflow Completion

เป้าหมาย: ทำ acceptance criteria ฝั่ง admin ให้ครบ

- Students
  - เพิ่ม/ลบ/ย้ายเข้า/ย้ายออก นักเรียนหลังเลื่อนชั้น
  - import แบบ transaction ผ่าน RPC หรือ Edge Function
  - รองรับคำนำหน้า เพศ เลขบัตรประชาชน และ error report เต็ม
- Classrooms
  - หน้าทบทวนหลัง promote
  - ตรวจ from year -> to year เป็นปีถัดไป
- Assignments
  - import แบบ upsert/review duplicate
  - active/pending workflow ชัด
  - สร้าง gradebook ให้ครูเห็นทันทีเมื่อ active

Definition of done:
- import ข้อมูลจริง 1 ห้องแล้วตรวจ roster/assignment ได้ครบ
- ข้อมูลไม่ครึ่ง ๆ กลาง ๆ เมื่อ import ล้มเหลว

## Phase D — Teacher Gradebook Hardening

เป้าหมาย: ทำให้หน้า 9 tabs เป็นระบบกรอกจริง ไม่ใช่แค่ฟอร์มเดิม

- ตัวชี้วัดใช้ DB เป็นหลัก ไม่มี fallback เงียบ ๆ ที่เลือกผิดชั้น
- validate คะแนนไม่เกินคะแนนเต็ม
- status/progress คำนวณตรงกับช่องที่ต้องกรอกจริง
- admin เปิดดู gradebook ของครูคนใดก็ได้แบบ read-only หรือ impersonated view ตามสเปก
- แยก `exceljs` เป็น dynamic import เพื่อลด bundle หลัก

Definition of done:
- กรอกคะแนน -> refresh -> export ได้ข้อมูลตรง
- ตัวชี้วัดถูกต้องตามกลุ่มสาระและระดับชั้น

## Phase E — Executive Dashboard and Reports

เป้าหมาย: ทำ Phase 7 ใน `BUILD_SPEC.md`

- route/layout สำหรับ `admin | executive`
- dashboard progress จาก `v_gradebook_overview`
- analytics ด้วย recharts
- report reader PDF/ebook
- executive read-only จริงทั้ง UI และ DB

Definition of done:
- executive เห็นภาพรวมทั้งโรงเรียน แต่แก้ข้อมูลไม่ได้
- teacher เข้า executive route ไม่ได้

## Phase F — Test and Deploy Readiness

เป้าหมาย: ก่อนเอาใช้กับครูจริง

- เพิ่ม smoke tests อย่างน้อยสำหรับ adapter/stats/import
- checklist manual ตาม `BUILD_SPEC.md §14`
- Supabase migration apply บน staging
- ตรวจ env/key exposure
- Vercel deploy preview

Definition of done:
- `npm run lint` ผ่าน
- `npm run build` ผ่าน
- test สิทธิ์ admin/teacher/executive ผ่านบน staging
