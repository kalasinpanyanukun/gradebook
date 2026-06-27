# KSP GradeBook

ระบบบันทึกผลการพัฒนาคุณภาพผู้เรียนดิจิทัล (ปพ.5) สำหรับโรงเรียนกาฬสินธุ์ปัญญานุกูล

## เริ่มต้นใช้งาน

```bash
npm install
npm run dev
```

เปิดใช้งานที่ `http://127.0.0.1:3000/`

## คำสั่งสำคัญ

```bash
npm run lint
npm run build
npm run import:teachers
npm run import:students
npm run seed:curriculum
```

หลัง Phase 2 สามารถสร้าง catalog รายวิชาได้ด้วย:

```bash
npm run gen:subjects
```

## Supabase

1. สร้างไฟล์ `.env.local` จาก `.env.example`
2. ใส่ `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY`
3. ใส่ `SUPABASE_SERVICE_ROLE_KEY` เฉพาะตอนรัน scripts ฝั่งเครื่องเท่านั้น
4. Apply migrations ตามลำดับใน `supabase/migrations/`

## เอกสารประกอบ

- `BUILD_SPEC.md`
- `REFACTOR_PLAN.md`
- `KSP_GradeBook_Codex_Plan.md` จากไฟล์แผนงานที่แนบในรอบพัฒนา
