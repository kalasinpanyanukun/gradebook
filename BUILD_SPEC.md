# KSP GradeBook — Build Specification for Cursor (Composer 2.5)

> **ระบบบันทึกผลการพัฒนาคุณภาพผู้เรียนดิจิทัล (KSP GradeBook)**
> เอกสารฉบับนี้คือ "สเปกสั่งงาน" สำหรับให้ Cursor / Composer 2.5 พัฒนาระบบต่อจาก prototype เดิม
> โดยขยายจากโปรแกรม ปพ.5 รายวิชาเดียว → ระบบทั้งโรงเรียน ทุกวิชา พร้อม deploy บน Vercel + Supabase

---

## วิธีใช้เอกสารนี้ใน Cursor (อ่านก่อนเริ่ม)

1. เปิดโปรเจกต์เดิม (`โปรแกรม-ปพ_5-v_2_0`) ใน Cursor แล้ววางไฟล์นี้ไว้ที่ root ในชื่อ `BUILD_SPEC.md`
2. ใช้ **Composer 2.5** และทำงาน **ทีละ Phase ตามลำดับใน §12** — อย่าทำข้ามเฟส
3. ทุกครั้งที่เริ่มงานใหม่ ให้แนบ context: `BUILD_SPEC.md` + ไฟล์ที่เกี่ยวข้องในเฟสนั้น
4. โค้ด/SQL/ชื่อไฟล์/ชื่อตาราง ทั้งหมดเป็นภาษาอังกฤษ — คำอธิบายเชิง domain เป็นภาษาไทย
5. **ห้ามลบหรือรื้อ** ไฟล์ใน `src/components/*Form.tsx` และ `src/utils/excelExport.ts` — ให้ "ต่อท่อข้อมูล" เข้าไปแทน (ดู §8)
6. หลังจบแต่ละเฟส ให้รัน `npm run lint` (tsc --noEmit) และแก้ type error ให้หมดก่อนไปต่อ

---

## สารบัญ

- §1 ภาพรวมโครงการ & สิ่งที่มีอยู่แล้ว
- §2 สถาปัตยกรรมเป้าหมาย & บทบาทผู้ใช้
- §3 กฎทางธุรกิจ: ปฏิทินการศึกษาไทย & การเลื่อนชั้น
- §4 Database Schema (SQL เต็ม)
- §5 Row Level Security (RLS)
- §6 Database Functions (เลื่อนชั้น / คัดลอก workspace)
- §7 การ Seed ข้อมูลหลักสูตรแกนกลาง 2560
- §8 การเชื่อม Frontend กับ Supabase (migrate โค้ดเดิม)
- §9 โมดูลฟีเจอร์ & เกณฑ์ความสำเร็จ (acceptance criteria)
- §10 โครงสร้างไฟล์โปรเจกต์เป้าหมาย
- §11 ไฟล์ตั้งค่า (env, vercel.json, .gitignore ฯลฯ)
- §12 ลำดับงานสำหรับ Composer (Build Phases — ทำตามนี้)
- §13 การ Deploy (Supabase + GitHub + Vercel)
- §14 Testing Checklist

---

## §1 ภาพรวมโครงการ & สิ่งที่มีอยู่แล้ว

### 1.1 เป้าหมาย
เปลี่ยนสมุดบันทึกผลการเรียน **ปพ.5** จากกระดาษ/Excel เป็นเว็บแอปที่ครูทั้งโรงเรียน (50+ คน) ใช้พร้อมกันได้ โดย:
- ครูแต่ละคนเห็นเฉพาะข้อมูลของตน
- ฝ่ายวิชาการ (admin) จัดการ ครู / นักเรียน / ห้องเรียน / ตารางสอน / การเลื่อนชั้น
- ส่งออก ปพ.5 เป็น Excel ได้ครบ 9 sheet เหมือนเดิม
- รองรับการคัดลอก workspace ข้ามปี (ครูประจำชั้นตามเด็กกลุ่มเดิมจนจบช่วงชั้น)

### 1.2 Stack เดิม (คงไว้)
- **React 19 + TypeScript + Vite 6**
- **Tailwind CSS 4** (`@tailwindcss/vite`)
- **motion** (animation), **lucide-react** (icons)
- **exceljs** + **file-saver** (export ปพ.5)

### 1.3 สิ่งที่ "ใช้ต่อได้เลย" (reuse — ห้ามรื้อ)
| ไฟล์ | บทบาท | สถานะ |
|------|-------|-------|
| `src/components/GeneralInfoForm.tsx` | ฟอร์มหน้าปก | reuse |
| `src/components/StudentsForm.tsx` | รายชื่อ + เวลาเรียน | reuse |
| `src/components/ScoresForm.tsx` | คะแนนรายตัวชี้วัด | reuse |
| `src/components/AttributesForm.tsx`, `Attributes5_8Form.tsx` | คุณลักษณะ 1-8 | reuse |
| `src/components/AnalyticalForm.tsx` | การอ่าน คิดวิเคราะห์ เขียน | reuse |
| `src/components/IndicatorsForm.tsx` | ตัวชี้วัด | reuse |
| `src/components/Instructions1Form.tsx`, `Instructions2Form.tsx` | คำชี้แจง | reuse |
| `src/components/ScoreConfigModal.tsx`, `StandardIndicatorFilter.tsx` | ตั้งค่าคะแนน/เลือกตัวชี้วัด | reuse |
| `src/utils/excelExport.ts` | export 9 sheets | reuse (ดู §8.5) |
| `src/data/curriculumData.ts` (+ `m3CurriculumData.ts`, `computingScienceData.ts`, `standards.ts`) | ข้อมูลหลักสูตร | ใช้เป็น **แหล่ง seed** ลง DB (§7) |
| `src/types.ts` | type หลัก (`AppData`, `Dataset`, `Student`, `ScoreConfig`…) | ขยาย ไม่ลบ |

### 1.4 สิ่งที่ "ต้องแทนที่" (replace)
| เดิม | ปัญหา | แทนด้วย |
|------|-------|---------|
| `Code.gs` (Google Apps Script: `doGet/doPost/doOptions`) | เก็บ JSON ทั้งก้อนใน Google Sheet, ครูเห็นข้อมูลกัน | **Supabase (PostgreSQL + RLS)** |
| `Login.tsx` + `User.password` plain text ใน array | ไม่ปลอดภัย | **Supabase Auth** |
| ข้อมูลวิชา hardcode | เพิ่มวิชาต้องแก้โค้ด | ตาราง `subjects` + `curriculum_*` ใน DB |
| `GOOGLE_SHEET_URL` + sync logic ใน `App.tsx` | single source = Google Sheet | Supabase client (`src/lib/supabase.ts`) |
| `express`, `better-sqlite3`, server bits | ไม่ใช้บน Vercel static SPA | ลบออกจาก `package.json` |

---

## §2 สถาปัตยกรรมเป้าหมาย & บทบาทผู้ใช้

ใช้รูปแบบ **B+ (Hybrid)** ตามที่ตัดสินใจแล้ว:
- ฝ่ายวิชาการ (admin) เตรียมโครงสร้าง (ครู/นักเรียน/ห้อง/ตารางสอน) ต้นปี
- ครู login แล้วเห็นวิชาที่ตนสอนพร้อมกรอกได้เลย
- ครูยังสร้าง gradebook เองได้เป็น fallback (สถานะ `pending` รอ admin approve)

### 2.1 บทบาท (roles)
| Role | ใครคือ | สิทธิ์หลัก |
|------|--------|-----------|
| `admin` | ฝ่ายวิชาการ / ผู้ดูแลระบบ | จัดการครู, นักเรียน, ห้องเรียน, ปีการศึกษา, ตารางสอน, เลื่อนชั้น, ดูภาพรวมทั้งโรงเรียน + เข้าถึง dashboard ผู้บริหารได้ทุกหน้า |
| `executive` | ผู้บริหาร (ผอ. / รอง ผอ.) | **อ่านอย่างเดียว (read-only)** ทั้งโรงเรียน: ดู dashboard ค่าเฉลี่ย/สถิติ, ดู % การกรอกเกรดของครู, อ่านเอกสาร ปพ.5/รายงานแบบ PDF/ebook ของทุกห้อง — แต่แก้ไขข้อมูลไม่ได้ |
| `teacher` | ครูผู้สอน / ครูประจำชั้น | กรอก ปพ.5 เฉพาะวิชาที่ได้รับมอบหมาย, คัดลอก workspace, export |

> หมายเหตุ:
> - ครูประจำชั้น (homeroom) = teacher ที่ถูกผูกกับ `classrooms.homeroom_teacher_id` ไม่ต้องมี role แยก
> - `executive` เห็นทุกอย่างแบบอ่านอย่างเดียว; dashboard เชิงวิเคราะห์/รายงาน (§9.8–§9.10) เปิดให้ทั้ง `admin` และ `executive`

### 2.2 ภาพ flow ระดับสูง
```
admin → สร้างปีการศึกษา + ภาคเรียน
      → จัดการ master: ครู, นักเรียน, ห้องเรียน, วิชา
      → import/กำหนดตารางสอน (teaching_assignments)
      → กด "เปิดภาคเรียน" (activate)
teacher → login → Dashboard (ปีปัจจุบันเด่น + ปีเก่าพับได้)
       → เลือกวิชา → กรอก ปพ.5 (9 tabs เดิม) → export Excel
       → ต้นปีถัดไป: "คัดลอกจากปีที่แล้ว" (roster มาจากการเลื่อนชั้น)
executive → login → Executive Dashboard (read-only)
         → ดูค่าเฉลี่ยทั้งโรงเรียน (เวลาเรียน/เกรด/คุณลักษณะ/คิดวิเคราะห์)
         → ดู % การกรอกเกรดของครูแต่ละคน (progress bar)
         → เปิดอ่านรายงาน/ปพ.5 ทุกห้องแบบ PDF/ebook + ดาวน์โหลด PDF
```

---

## §3 กฎทางธุรกิจ: ปฏิทินการศึกษาไทย & การเลื่อนชั้น

### 3.1 ปีการศึกษา (สำคัญมาก — ใส่ใน logic)
- ปีการศึกษาไทยใช้ **พ.ศ. (Buddhist Era)** เก็บเป็น `year_be` (เช่น 2568)
- ช่วงปี: **1 พ.ค. – 30 เม.ย. ของปีถัดไป** → `start_date = YYYY-05-01`, `end_date = (YYYY+1)-04-30`
- **เปิดเทอมจริง ≈ 16 พ.ค.** → เก็บ `term_open_date`
- การแปลง: `year_ce = year_be - 543` (เช่น 2568 → 2025)
- ภาคเรียน (semester): 1 และ 2 — วันที่ default แก้ได้
  - ภาคเรียนที่ 1: ~16 พ.ค. – ~11 ต.ค.
  - ภาคเรียนที่ 2: ~1 พ.ย. – ~31 มี.ค.
- มีได้ปีละ "active" หนึ่งปี + หนึ่งภาคเรียน (admin เป็นคน activate)

### 3.2 ระดับชั้น & ลำดับการเลื่อน (`class_levels`)
ใช้ `sequence` เป็นตัวกำหนดลำดับเลื่อนชั้น:
| code | name | sequence | stage |
|------|------|----------|-------|
| ป.1…ป.6 | ประถมศึกษาปีที่ 1…6 | 1…6 | ประถมศึกษา |
| ม.1…ม.3 | มัธยมศึกษาปีที่ 1…3 | 7…9 | มัธยมศึกษาตอนต้น |
| ม.4…ม.6 | มัธยมศึกษาปีที่ 4…6 | 10…12 | มัธยมศึกษาตอนปลาย |

- การเลื่อนชั้น = `sequence + 1` (ป.6 seq=6 → ม.1 seq=7 อัตโนมัติ)
- โรงเรียนกำหนด "ชั้นสูงสุด" ได้ที่ `schools.max_level_sequence` (เช่น ร.ร.ขยายโอกาสจบ ม.3 → 9; ถ้าเกินถือว่า **จบการศึกษา**)

### 3.3 การเลื่อนชั้นอัตโนมัติ (ข้อกำหนด)
- นักเรียนเป็น record เดียว (`students`) ที่คงอยู่ข้ามปี
- การอยู่ห้อง/ชั้นในแต่ละปี = `student_enrollments` (1 แถวต่อ นักเรียน/ปี)
- เมื่อ admin สร้างปีใหม่แล้วสั่ง **"เลื่อนชั้น"**: ระบบสร้าง enrollment ปีใหม่ให้ทุกคนที่ `status='active'` โดย:
  - คงเลขห้องเดิม (ม.1/1 → ม.2/1), คง `student_number` เดิม (admin แก้ได้)
  - ถ้าเกินชั้นสูงสุด → set `students.status='graduated'` ไม่สร้าง enrollment ใหม่
- ทุกอย่าง **แก้ไขได้** หลังเลื่อน (ย้ายห้อง, เปลี่ยนเลขที่, เพิ่ม/ลบเด็กย้ายเข้า-ออก)
- ฟังก์ชัน SQL: ดู §6.1 — ออกแบบให้ **idempotent** (กดซ้ำไม่สร้างซ้ำ)

---

## §4 Database Schema (SQL เต็ม)

> วางไฟล์เป็น `supabase/migrations/0001_init.sql` แล้วรันผ่าน Supabase SQL Editor หรือ CLI
> ใช้ `uuid` เป็น PK ทุกตาราง, `created_at timestamptz default now()`

```sql
-- ========== EXTENSIONS ==========
create extension if not exists "pgcrypto";

-- ========== SCHOOLS ==========
create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text,
  max_level_sequence int not null default 12, -- ชั้นสูงสุด (ม.3=9, ม.6=12)
  created_at timestamptz not null default now()
);

-- ========== PROFILES (ครู / admin) ==========
-- ผูกกับ auth.users ของ Supabase
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references schools(id) on delete set null,
  title text,                       -- นาย / นาง / นางสาว
  full_name text not null,
  role text not null default 'teacher' check (role in ('admin','teacher','executive')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ========== ACADEMIC YEARS (ปีการศึกษา พ.ศ.) ==========
create table academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  year_be int not null,             -- 2568
  start_date date not null,         -- 2025-05-01
  end_date date not null,           -- 2026-04-30
  term_open_date date,              -- 2025-05-16
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (school_id, year_be)
);

-- ========== SEMESTERS (ภาคเรียน) ==========
create table semesters (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  semester_number int not null check (semester_number in (1,2)),
  start_date date,
  end_date date,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (academic_year_id, semester_number)
);

-- ========== CLASS LEVELS (ระดับชั้น master / reference) ==========
create table class_levels (
  code text primary key,            -- 'ป.1','ม.3'
  name text not null,
  sequence int not null unique,     -- 1..12
  stage text not null               -- 'ประถมศึกษา' | 'มัธยมศึกษาตอนต้น' | 'มัธยมศึกษาตอนปลาย'
);

-- ========== CLASSROOMS (ห้องเรียนในแต่ละปี) ==========
create table classrooms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  class_level_code text not null references class_levels(code),
  room_number int not null,         -- 1,2,3
  name text not null,               -- 'ม.1/1'
  homeroom_teacher_id uuid references profiles(id) on delete set null,
  homeroom_teacher_2_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (academic_year_id, class_level_code, room_number)
);

-- ========== STUDENTS (identity คงที่ข้ามปี) ==========
create table students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_code text not null,       -- เลขประจำตัวนักเรียน
  citizen_id text,                  -- เลขบัตรประชาชน 13 หลัก
  title text,
  first_name text not null,
  last_name text not null,
  gender text check (gender in ('ชาย','หญิง')),
  status text not null default 'active'
    check (status in ('active','graduated','transferred_out','inactive')),
  created_at timestamptz not null default now(),
  unique (school_id, student_code)
);

-- ========== STUDENT ENROLLMENTS (นักเรียน x ปี x ห้อง) ==========
create table student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  classroom_id uuid not null references classrooms(id) on delete cascade,
  class_level_code text not null references class_levels(code),
  student_number int,               -- เลขที่ในห้อง
  status text not null default 'active'
    check (status in ('active','transferred_out','inactive')),
  created_at timestamptz not null default now(),
  unique (student_id, academic_year_id)  -- 1 คน 1 ปี = 1 ห้อง
);

-- ========== SUBJECTS (รายวิชา master ของโรงเรียน) ==========
create table subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  subject_code text not null,       -- 'ว32102'
  subject_name text not null,       -- 'วิทยาการคำนวณ'
  learning_area text not null,      -- กลุ่มสาระ
  default_class_level text references class_levels(code),
  created_at timestamptz not null default now(),
  unique (school_id, subject_code, default_class_level)
);

-- ========== CURRICULUM (หลักสูตรแกนกลาง 2560) ==========
create table curriculum_standards (
  id uuid primary key default gen_random_uuid(),
  learning_area text not null,      -- กลุ่มสาระ
  class_level_code text not null references class_levels(code),
  standard_code text not null,      -- 'ว 4.2'
  description text not null,
  created_at timestamptz not null default now()
);

create table curriculum_indicators (
  id uuid primary key default gen_random_uuid(),
  standard_id uuid not null references curriculum_standards(id) on delete cascade,
  indicator_code text not null,     -- 'ว 4.2 ม.3/1'
  description text not null,
  created_at timestamptz not null default now()
);

-- ========== TEACHING ASSIGNMENTS (มอบหมายการสอน) ==========
-- หัวใจของแนวทาง B: admin กำหนดว่า ครู X สอนวิชา Y ห้อง Z ในภาคเรียนใด
create table teaching_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  semester_id uuid not null references semesters(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  classroom_id uuid not null references classrooms(id) on delete cascade,
  hours_per_week int,
  hours_per_semester int,
  status text not null default 'active'
    check (status in ('pending','active')),  -- pending = ครูสร้างเอง รอ approve
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (semester_id, teacher_id, subject_id, classroom_id)
);

-- ========== GRADEBOOKS (สมุด ปพ.5 ต่อ 1 teaching assignment) ==========
-- เก็บข้อมูลการกรอกแบบ JSONB ให้ map ตรงกับ AppData เดิม (ดู §8.3)
create table gradebooks (
  id uuid primary key default gen_random_uuid(),
  teaching_assignment_id uuid not null references teaching_assignments(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  semester_id uuid not null references semesters(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started','in_progress','completed')),
  general_info jsonb not null default '{}'::jsonb,  -- AppData.generalInfo
  students    jsonb not null default '[]'::jsonb,    -- AppData.students (snapshot, แก้ได้)
  attendance  jsonb not null default '{}'::jsonb,    -- AppData.attendance
  scores      jsonb not null default '{}'::jsonb,    -- AppData.scores
  score_config jsonb,                                -- AppData.scoreConfig
  attributes  jsonb not null default '{}'::jsonb,    -- AppData.attributes
  analytical  jsonb not null default '{}'::jsonb,    -- AppData.analytical
  indicators  jsonb not null default '[]'::jsonb,    -- AppData.indicators
  stats       jsonb not null default '{}'::jsonb,    -- สรุปสถิติ (คำนวณตอน save, §6.3/§8.7) ใช้โดย dashboard ผู้บริหาร
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (teaching_assignment_id)
);

-- ========== ACTIVITY LOGS ==========
create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  user_name text,
  action text not null,
  timestamp timestamptz not null default now()
);

-- ========== INDEXES ==========
create index idx_enrollments_year on student_enrollments(academic_year_id);
create index idx_enrollments_classroom on student_enrollments(classroom_id);
create index idx_assignments_teacher on teaching_assignments(teacher_id);
create index idx_assignments_semester on teaching_assignments(semester_id);
create index idx_gradebooks_teacher on gradebooks(teacher_id);
create index idx_indicators_standard on curriculum_indicators(standard_id);
create index idx_standards_area_level on curriculum_standards(learning_area, class_level_code);

-- ========== updated_at trigger for gradebooks ==========
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger trg_gradebooks_updated
  before update on gradebooks
  for each row execute function set_updated_at();
```

---

## §5 Row Level Security (RLS)

> วางเป็น `supabase/migrations/0002_rls.sql` — เปิด RLS ทุกตารางที่มีข้อมูลผู้ใช้

```sql
-- helper: คืน role ของผู้ใช้ปัจจุบัน
create or replace function current_role_is_admin() returns boolean
language sql stable security definer as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

-- helper: admin หรือ executive (ใช้กับ policy "อ่านอย่างเดียวทั้งโรงเรียน")
create or replace function is_admin_or_exec() returns boolean
language sql stable security definer as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and role in ('admin','executive') and is_active = true
  );
$$;

-- helper: school_id ของผู้ใช้ปัจจุบัน
create or replace function current_school_id() returns uuid
language sql stable security definer as $$
  select school_id from profiles where id = auth.uid();
$$;

-- เปิด RLS
alter table profiles enable row level security;
alter table schools enable row level security;
alter table academic_years enable row level security;
alter table semesters enable row level security;
alter table classrooms enable row level security;
alter table students enable row level security;
alter table student_enrollments enable row level security;
alter table subjects enable row level security;
alter table curriculum_standards enable row level security;
alter table curriculum_indicators enable row level security;
alter table teaching_assignments enable row level security;
alter table gradebooks enable row level security;
alter table activity_logs enable row level security;

-- PROFILES: อ่านตัวเองได้; admin จัดการได้ทั้งโรงเรียน; executive อ่านได้ทั้งโรงเรียน
create policy profiles_self_read on profiles for select
  using (id = auth.uid() or is_admin_or_exec());
create policy profiles_admin_write on profiles for all
  using (current_role_is_admin()) with check (current_role_is_admin());
create policy profiles_self_update on profiles for update
  using (id = auth.uid());

-- ตาราง reference (curriculum, class_levels): authenticated อ่านได้ทั้งหมด, admin เขียน
create policy curr_std_read on curriculum_standards for select using (auth.uid() is not null);
create policy curr_std_admin on curriculum_standards for all
  using (current_role_is_admin()) with check (current_role_is_admin());
create policy curr_ind_read on curriculum_indicators for select using (auth.uid() is not null);
create policy curr_ind_admin on curriculum_indicators for all
  using (current_role_is_admin()) with check (current_role_is_admin());

-- ADMIN จัดการ master ทั้งหมดในโรงเรียนตัวเอง / teacher อ่านได้
-- (ทำ pattern เดียวกันกับ: schools, academic_years, semesters, classrooms,
--  students, student_enrollments, subjects)
-- ตัวอย่าง students:
create policy students_admin_all on students for all
  using (current_role_is_admin() and school_id = current_school_id())
  with check (current_role_is_admin() and school_id = current_school_id());
create policy students_teacher_read on students for select
  using (school_id = current_school_id());

-- *** ทำซ้ำ pattern ข้างบนให้: academic_years, semesters, classrooms,
--     student_enrollments, subjects (admin = all in school, teacher = read) ***
-- *** executive: ทุกตาราง master + teaching_assignments ให้เพิ่ม SELECT policy
--     using (is_admin_or_exec()) เพื่อให้ผู้บริหารอ่านได้ทั้งโรงเรียน (read-only) ***
-- ตัวอย่าง teaching_assignments สำหรับ executive (เพิ่มจากของครู/admin ด้านล่าง):
--   create policy ta_exec_read on teaching_assignments for select using (is_admin_or_exec());

-- TEACHING ASSIGNMENTS: ครูเห็นของตัวเอง / admin + executive อ่านได้ทั้งหมด
create policy ta_teacher_read on teaching_assignments for select
  using (teacher_id = auth.uid() or is_admin_or_exec());
create policy ta_admin_write on teaching_assignments for all
  using (current_role_is_admin()) with check (current_role_is_admin());
-- ครูสร้าง assignment เอง (fallback แบบ A) สถานะต้องเป็น 'pending'
create policy ta_teacher_create on teaching_assignments for insert
  with check (teacher_id = auth.uid() and status = 'pending');

-- GRADEBOOKS: ครู CRUD เฉพาะของตัวเอง / admin + executive อ่านได้ทั้งหมด
create policy gb_teacher_all on gradebooks for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());
create policy gb_admin_exec_read on gradebooks for select
  using (is_admin_or_exec());

-- ACTIVITY LOGS: เขียนได้ทุกคน (ของตัวเอง), admin อ่านทั้งหมด
create policy logs_insert on activity_logs for insert with check (user_id = auth.uid());
create policy logs_admin_read on activity_logs for select using (current_role_is_admin());
```

> **TODO (Composer):** เติม policy ที่ระบุว่า "ทำซ้ำ pattern" ให้ครบทุกตาราง master ตามคอมเมนต์

---

## §6 Database Functions

### 6.1 เลื่อนชั้นอัตโนมัติ (`promote_students`)
> วางเป็น `supabase/migrations/0003_functions.sql`

```sql
create or replace function promote_students(
  p_from_year_id uuid,
  p_to_year_id uuid
) returns table (promoted int, graduated int)
language plpgsql security definer as $$
declare
  r record;
  v_next_seq int;
  v_next_level text;
  v_target_classroom uuid;
  v_school_max int;
  v_promoted int := 0;
  v_graduated int := 0;
begin
  -- ดึงชั้นสูงสุดของโรงเรียน
  select s.max_level_sequence into v_school_max
  from academic_years ay join schools s on s.id = ay.school_id
  where ay.id = p_from_year_id;

  for r in
    select e.*, cl.sequence as cur_seq, c.room_number, c.school_id
    from student_enrollments e
    join classrooms c   on c.id = e.classroom_id
    join class_levels cl on cl.code = e.class_level_code
    where e.academic_year_id = p_from_year_id
      and e.status = 'active'
  loop
    v_next_seq := r.cur_seq + 1;

    -- เกินชั้นสูงสุด => จบการศึกษา
    if v_next_seq > v_school_max then
      update students set status = 'graduated' where id = r.student_id;
      v_graduated := v_graduated + 1;
      continue;
    end if;

    select code into v_next_level from class_levels where sequence = v_next_seq;
    if v_next_level is null then
      update students set status = 'graduated' where id = r.student_id;
      v_graduated := v_graduated + 1;
      continue;
    end if;

    -- หา/สร้างห้องปลายทาง (คงเลขห้องเดิม)
    select id into v_target_classroom from classrooms
    where academic_year_id = p_to_year_id
      and class_level_code = v_next_level
      and room_number = r.room_number;

    if v_target_classroom is null then
      insert into classrooms (school_id, academic_year_id, class_level_code, room_number, name)
      values (r.school_id, p_to_year_id, v_next_level, r.room_number,
              v_next_level || '/' || r.room_number)
      returning id into v_target_classroom;
    end if;

    -- สร้าง enrollment ปีใหม่ (idempotent: ถ้ามีแล้วข้าม)
    if not exists (
      select 1 from student_enrollments
      where student_id = r.student_id and academic_year_id = p_to_year_id
    ) then
      insert into student_enrollments
        (student_id, academic_year_id, classroom_id, class_level_code, student_number, status)
      values
        (r.student_id, p_to_year_id, v_target_classroom, v_next_level, r.student_number, 'active');
      v_promoted := v_promoted + 1;
    end if;
  end loop;

  return query select v_promoted, v_graduated;
end; $$;
```

### 6.2 คัดลอก workspace / gradebook ข้ามภาคเรียน (`clone_gradebook_structure`)
คัดลอก **โครงสร้าง** (general_info, score_config, indicators) ไป gradebook ใหม่ โดย **ไม่** คัดลอกคะแนน/เวลาเรียน/คุณลักษณะ; roster ดึงจาก enrollment ปัจจุบันของห้อง

```sql
create or replace function clone_gradebook_structure(
  p_source_gradebook_id uuid,
  p_target_assignment_id uuid
) returns uuid
language plpgsql security definer as $$
declare
  v_new_id uuid;
  v_teacher uuid;
  v_semester uuid;
  v_classroom uuid;
  v_roster jsonb;
begin
  select teacher_id, semester_id, classroom_id
    into v_teacher, v_semester, v_classroom
  from teaching_assignments where id = p_target_assignment_id;

  -- สร้าง roster snapshot จาก enrollment ปัจจุบันของห้องปลายทาง
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', st.id,
           'studentId', st.student_code,
           'citizenId', st.citizen_id,
           'name', concat_ws(' ', st.title, st.first_name, st.last_name)
         ) order by e.student_number), '[]'::jsonb)
    into v_roster
  from student_enrollments e
  join students st on st.id = e.student_id
  join teaching_assignments ta on ta.id = p_target_assignment_id
  where e.classroom_id = ta.classroom_id;

  insert into gradebooks (
    teaching_assignment_id, teacher_id, semester_id, status,
    general_info, students, score_config, indicators
  )
  select
    p_target_assignment_id, v_teacher, v_semester, 'not_started',
    g.general_info, v_roster, g.score_config, g.indicators
  from gradebooks g where g.id = p_source_gradebook_id
  returning id into v_new_id;

  return v_new_id;
end; $$;
```

> **หมายเหตุ:** ฟังก์ชันนี้ตอบโจทย์ "ครูประจำชั้นตามเด็กกลุ่มเดิม" — roster มาจากการเลื่อนชั้น (§6.1) อยู่แล้ว ส่วนโครงสร้างคะแนน copy จากปีก่อนได้ทันที

### 6.3 View สำหรับ Dashboard ผู้บริหาร (`v_gradebook_overview`)
ดึงสถิติที่ "คำนวณไว้แล้ว" จาก `gradebooks.stats` (เขียนตอน save ฝั่ง client — ดู §8.7) ออกมาเป็นคอลัมน์ตัวเลข เพื่อให้ dashboard query/aggregate ได้เร็ว
> ใช้ `security_invoker = on` (PostgreSQL 15+ / Supabase) เพื่อให้ RLS ของตารางต้นทางมีผล — executive/admin จึงเห็นทั้งโรงเรียน ส่วนครูเห็นเฉพาะของตน

```sql
create view v_gradebook_overview
with (security_invoker = on) as
select
  g.id                                   as gradebook_id,
  g.teacher_id,
  p.full_name                            as teacher_name,
  ta.semester_id,
  sem.semester_number,
  ay.id                                  as academic_year_id,
  ay.year_be,
  c.id                                   as classroom_id,
  c.name                                 as classroom_name,
  c.class_level_code,
  cl.stage,
  s.learning_area,
  s.subject_name,
  g.status,
  (g.stats->>'completionPercent')::numeric as completion_percent,
  (g.stats->>'studentCount')::int          as student_count,
  (g.stats->>'avgScore')::numeric          as avg_score,
  (g.stats->>'passRate')::numeric          as pass_rate,
  (g.stats->>'attendanceRate')::numeric    as attendance_rate,
  (g.stats->>'behaviorAvg')::numeric       as behavior_avg,
  (g.stats->>'analyticalAvg')::numeric     as analytical_avg
from gradebooks g
join teaching_assignments ta on ta.id = g.teaching_assignment_id
join profiles p   on p.id = g.teacher_id
join semesters sem on sem.id = ta.semester_id
join academic_years ay on ay.id = sem.academic_year_id
join classrooms c on c.id = ta.classroom_id
join class_levels cl on cl.code = c.class_level_code
join subjects s   on s.id = ta.subject_id
where g.deleted_at is null;
```

ตัวอย่าง query ที่ dashboard ใช้ (ค่าเฉลี่ยรายกลุ่มสาระของภาคเรียนหนึ่ง):
```sql
select learning_area,
       round(avg(avg_score),2)       as avg_score,
       round(avg(attendance_rate),2) as attendance_rate,
       round(avg(behavior_avg),2)    as behavior_avg,
       round(avg(completion_percent),1) as completion_percent
from v_gradebook_overview
where semester_id = $1
group by learning_area
order by learning_area;
```

---

## §7 การ Seed ข้อมูลหลักสูตรแกนกลาง 2560

ข้อมูลทั้งหมด ≈ 0.3 MB (เล็กมากเทียบ free tier 500 MB) → เก็บใน DB ได้สบาย

**กลยุทธ์:** เขียนสคริปต์ `scripts/seedCurriculum.ts` ที่อ่าน `src/data/curriculumData.ts` (ซึ่ง export `SubjectCurriculum[]` ที่มี `standards[].indicators[]`) แล้ว insert ลง `curriculum_standards` + `curriculum_indicators`

```ts
// scripts/seedCurriculum.ts (รันด้วย: npx tsx scripts/seedCurriculum.ts)
import { createClient } from '@supabase/supabase-js';
import { curriculumData } from '../src/data/curriculumData'; // export ตัวนี้เพิ่มถ้ายังไม่มี

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ใช้ service role สำหรับ seed เท่านั้น (ห้าม commit)
);

async function main() {
  for (const subj of curriculumData) {
    for (const std of subj.standards) {
      const { data: stdRow, error: e1 } = await supabase
        .from('curriculum_standards')
        .insert({
          learning_area: subj.learningArea,
          class_level_code: subj.gradeLevel,
          standard_code: std.code,
          description: std.description,
        })
        .select('id')
        .single();
      if (e1) throw e1;

      const inds = std.indicators.map(i => ({
        standard_id: stdRow!.id,
        indicator_code: i.code,
        description: i.description,
      }));
      if (inds.length) {
        const { error: e2 } = await supabase.from('curriculum_indicators').insert(inds);
        if (e2) throw e2;
      }
    }
  }
  console.log('Curriculum seeded.');
}
main();
```

> **TODO (Composer):**
> 1. ตรวจว่า `src/data/curriculumData.ts` `export const curriculumData` (ถ้าเป็น default หรือชื่ออื่น ให้ปรับ import)
> 2. เพิ่มข้อมูลหลักสูตรที่ยังขาด (จากเล่มหลักสูตรแกนกลาง 2560) ลงในไฟล์ data เดิม ในรูปแบบ `SubjectCurriculum` เดียวกัน แล้ว seed ซ้ำได้
> 3. ทำ seed ให้ idempotent (เช็คก่อน insert หรือ truncate ก่อน) เพื่อรันซ้ำได้

---

## §8 การเชื่อม Frontend กับ Supabase (migrate โค้ดเดิม)

### 8.1 ติดตั้ง & สร้าง client
```bash
npm i @supabase/supabase-js
npm i recharts                       # กราฟใน dashboard ผู้บริหาร (§9.9)
npm i @react-pdf/renderer            # สร้าง PDF รายงาน (§9.10)
npm rm express better-sqlite3 @types/express   # ลบ server เดิมที่ไม่ใช้
# @google/genai: เก็บไว้เฉพาะถ้า AutoFillModal/AutoFillAttributesModal ใช้งานจริง
```

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### 8.2 แทนที่ Auth (`Login.tsx`)
- ใช้ `supabase.auth.signInWithPassword({ email, password })`
- หลัง login: ดึง `profiles` ของ `auth.uid()` มาเก็บใน state (`role`, `full_name`, `school_id`)
- เลิกใช้ `users` array + `localStorage('currentUser')` แบบเดิม → ใช้ `supabase.auth.getSession()` / `onAuthStateChange`
- การสมัคร/เพิ่มครู: ทำในฝั่ง admin (§9.1) ผ่าน `supabase.auth.admin` (เรียกจาก Edge Function หรือหน้า admin ที่ใช้ service role อย่างปลอดภัย) — **อย่าใส่ service role key ใน client**; ถ้าต้องการง่ายในเฟสแรก ให้ admin สร้างผู้ใช้ผ่าน Supabase Dashboard แล้วเติมแถวใน `profiles`

### 8.3 แทนที่ Data Layer ใน `App.tsx`
เดิม `App.tsx` โหลด/เซฟทั้งหมดไป Google Sheet ผ่าน `GOOGLE_SHEET_URL` → เปลี่ยนเป็น:

- **โหลดรายการวิชาของครู** (Dashboard): query `teaching_assignments` + join `subjects`, `classrooms`, `gradebooks`, `semesters`, `academic_years` ที่ `teacher_id = auth.uid()`
- **เปิด gradebook ตัวหนึ่ง** → map เป็น `AppData` (ดู §8.4) ส่งเข้า component เดิม
- **บันทึก** → debounce แล้ว `supabase.from('gradebooks').update({...})` (เขียนเฉพาะ field jsonb ที่เปลี่ยน) แทน sync ก้อนใหญ่
- ลบ `latestDatasets/lastSavedDatasets/...refs` ที่ผูกกับ Google Sheet ออก, คง autosave UX (`syncStatus`) ไว้ได้แต่ชี้ไป Supabase

### 8.4 Mapping `gradebook` (DB) ⇄ `AppData` (โค้ดเดิม)
> ทำ adapter ใน `src/lib/gradebookAdapter.ts` เพื่อ **ไม่ต้องแก้ component**

```ts
import type { AppData } from '../types';

export function rowToAppData(row: any): AppData {
  return {
    generalInfo: row.general_info,
    students: row.students ?? [],
    attendance: row.attendance ?? {},
    scores: row.scores ?? {},
    scoreConfig: row.score_config ?? undefined,
    attributes: row.attributes ?? {},
    analytical: row.analytical ?? {},
    indicators: row.indicators ?? [],
  };
}

export function appDataToRow(d: AppData) {
  return {
    general_info: d.generalInfo,
    students: d.students,
    attendance: d.attendance,
    scores: d.scores,
    score_config: d.scoreConfig ?? null,
    attributes: d.attributes,
    analytical: d.analytical,
    indicators: d.indicators,
  };
}
```

### 8.5 Export Excel (`excelExport.ts`) — คงไว้
- `exportToExcel(appData)` ใช้ได้เหมือนเดิม เพราะรับ `AppData`
- เพียงเรียกหลังแปลง `rowToAppData(gradebookRow)` → ไม่ต้องแก้ไฟล์ export เลย

### 8.6 ตัวเลือกตัวชี้วัด (ScoreConfigModal / StandardIndicatorFilter) — เปลี่ยนแหล่งข้อมูล
- เดิมอ่านจาก `curriculumData.ts` (hardcoded)
- เปลี่ยนเป็น query `curriculum_standards` + `curriculum_indicators` ตาม `learning_area` + `class_level_code` ของวิชานั้น
- เก็บ interface เดิม (`Standard`, `Indicator`) ไว้ เพื่อลด diff — แค่เปลี่ยน data source เป็น async fetch

### 8.7 คำนวณสถิติตอนบันทึก (`computeGradebookStats`) — ป้อน dashboard ผู้บริหาร
ตรรกะการคำนวณเกรด/ผ่านเกณฑ์อยู่ฝั่ง client อยู่แล้ว จึงให้คำนวณ "สรุปสถิติ" ตอน save แล้วเขียนลง `gradebooks.stats` (view §6.3 อ่านค่านี้) — dashboard จึงไม่ต้องดึง gradebook ทั้งก้อนมาคำนวณใหม่

```ts
// src/lib/gradebookStats.ts
import type { AppData } from '../types';

export interface GradebookStats {
  completionPercent: number;   // 0-100 % ของช่องคะแนนที่กรอกแล้ว
  studentCount: number;
  avgScore: number;            // คะแนนรวมเฉลี่ย 0-100
  passRate: number;            // % นักเรียนที่ผ่านเกณฑ์
  gradeDistribution: Record<string, number>; // {'4':n,'3.5':n,...}
  attendanceRate: number;      // % เวลามาเรียนเฉลี่ย
  behaviorAvg: number;         // ค่าเฉลี่ยคุณลักษณะ (สเกลตามระบบ เช่น 0-3)
  analyticalAvg: number;       // ค่าเฉลี่ยอ่าน/คิดวิเคราะห์/เขียน
}

export function computeGradebookStats(d: AppData): GradebookStats {
  // TODO (Composer): ใช้ "สูตรเดียวกับที่ ScoresForm/excelExport ใช้คำนวณเกรด"
  // - completionPercent = (จำนวนช่องคะแนนที่กรอก / ช่องทั้งหมดตาม scoreConfig.units) * 100
  // - avgScore = ค่าเฉลี่ยคะแนนรวมของนักเรียนทุกคน
  // - passRate = % ของนักเรียนที่คะแนนรวม >= เกณฑ์ผ่าน
  // - attendanceRate = ค่าเฉลี่ย (มาเรียน / คาบทั้งหมด) จาก attendance
  // - behaviorAvg = ค่าเฉลี่ยคะแนนคุณลักษณะ 1-8 จาก attributes
  // - analyticalAvg = ค่าเฉลี่ยจาก analytical
  // คืนค่าเป็น number ที่ปัดทศนิยม 2 ตำแหน่ง; ถ้าไม่มีข้อมูลให้คืน 0
  return {
    completionPercent: 0, studentCount: d.students.length, avgScore: 0,
    passRate: 0, gradeDistribution: {}, attendanceRate: 0,
    behaviorAvg: 0, analyticalAvg: 0,
  };
}
```

- เรียก `computeGradebookStats(appData)` ใน flow autosave แล้วส่ง `stats` ไปพร้อม `appDataToRow(...)`:
  ```ts
  await supabase.from('gradebooks')
    .update({ ...appDataToRow(appData), stats: computeGradebookStats(appData) })
    .eq('id', gradebookId);
  ```
- อัปเดต `gradebooks.status` ตาม `completionPercent` (0 → not_started, 1-99 → in_progress, 100 → completed) เพื่อให้ Dashboard/Progress ตรงกัน

---

## §9 โมดูลฟีเจอร์ & เกณฑ์ความสำเร็จ

### 9.1 Admin — จัดการครู (profiles)
- [ ] หน้า `admin/teachers`: ตาราง ครูทั้งหมดในโรงเรียน (ชื่อ, role, สถานะ)
- [ ] เพิ่ม / แก้ไข / ปิดการใช้งาน (soft `is_active=false`) ครู
- [ ] กำหนด role (`admin`/`teacher`)
- **สำเร็จเมื่อ:** admin เพิ่มครูใหม่แล้วครูคนนั้น login ได้และเห็นเฉพาะข้อมูลตัวเอง

### 9.2 Admin — ปีการศึกษา & ภาคเรียน
- [ ] สร้างปีการศึกษา (`year_be`, auto-คำนวณ `start/end/term_open` จากปี)
- [ ] สร้าง 2 ภาคเรียน, activate ทีละภาค
- [ ] มีปี/ภาค active ได้อย่างละ 1
- **สำเร็จเมื่อ:** สร้างปี 2569 ต่อจาก 2568 และ activate ได้

### 9.3 Admin — ห้องเรียน & เลื่อนชั้น
- [ ] สร้างห้องเรียนของปี (ม.1/1, ม.1/2, …) กำหนดครูประจำชั้น
- [ ] ปุ่ม **"เลื่อนชั้นจากปีที่แล้ว"** → เรียก `promote_students(from, to)` → แสดงผล (เลื่อนกี่คน/จบกี่คน)
- [ ] หน้าทบทวนหลังเลื่อน: ย้ายห้อง/แก้เลขที่/เพิ่ม-ลบนักเรียนได้
- **สำเร็จเมื่อ:** เลื่อน ม.1/1 ปี 2568 → ม.2/1 ปี 2569 คงรายชื่อเดิม และแก้ไขได้

### 9.4 Admin — นักเรียน & import Excel
- [ ] import รายชื่อนักเรียนจาก Excel (กำหนด template column: เลขประจำตัว, ชื่อ, สกุล, เลขที่, ห้อง)
- [ ] สร้าง `students` + `student_enrollments` ให้ปี/ห้องที่เลือก
- [ ] รองรับ import ซ้ำแบบ merge (อัปเดตตาม `student_code`)
- **สำเร็จเมื่อ:** upload Excel 1 ห้องแล้วได้รายชื่อครบใน enrollment

### 9.5 Admin — วิชา & ตารางสอน (teaching_assignments)
- [ ] จัดการ `subjects` (เพิ่มวิชา/รหัส/กลุ่มสาระ)
- [ ] กำหนด/นำเข้าตารางสอน: ครู → วิชา → ห้อง → ภาคเรียน (+ ชม./สัปดาห์, ชม./ภาค)
- [ ] รองรับ import ตารางสอนจาก Excel (map ชื่อครู↔profile, รหัสวิชา↔subject, ชื่อห้อง↔classroom)
- [ ] หน้า review แก้ไขก่อน activate; แถวที่ map ไม่ได้ flag เตือน
- **สำเร็จเมื่อ:** admin สร้าง assignment แล้วครูเห็นวิชานั้นใน Dashboard ทันที

### 9.6 Teacher — Dashboard
- [ ] หน้าแรกหลัง login: **ปีปัจจุบันเด่น** (แสดงทุกวิชาพร้อม progress %), **ปีเก่าพับได้** (collapsible, ยิ่งเก่ายิ่งพับ)
- [ ] แต่ละการ์ดวิชาแสดง: ชื่อวิชา, รหัส, ห้อง, จำนวนนักเรียน, สถานะ (not_started/in_progress/completed)
- [ ] ปีเก่า: เปิดดู + export ได้ แต่แก้ไขเฉพาะปีปัจจุบัน (อิง `is_active` ของปี)
- [ ] ปุ่ม **"คัดลอกจากปีที่แล้ว"** → `clone_gradebook_structure` (ดู §6.2) — คง UI duplicate เดิมใน `Dashboard.tsx` แต่ต่อ logic ใหม่
- **สำเร็จเมื่อ:** ครูเห็นวิชาปีปัจจุบันเด่น และเปิด/พับปีเก่าได้

### 9.7 Teacher — กรอก ปพ.5 (9 tabs เดิม)
- [ ] เปิด gradebook → map เป็น AppData → แสดง 9 tabs เดิม (`general, students, scores, attributes1_4, attributes5_8, analytical, indicators, instructions1, instructions2`)
- [ ] autosave ลง Supabase (debounce ~1-2s) + แสดง `syncStatus`
- [ ] ตัวเลือกตัวชี้วัดดึงจาก DB (§8.6)
- [ ] export Excel ครบ 9 sheet (§8.5)
- **สำเร็จเมื่อ:** กรอกคะแนน → refresh แล้วข้อมูลยังอยู่ → export Excel ได้ถูกต้อง

### 9.8 Admin + Executive — Dashboard % การกรอกเกรด (Grade-entry Progress)
> เปิดให้ `admin` และ `executive` (อ่านอย่างเดียว) — ใช้ข้อมูลจาก `v_gradebook_overview`
- [ ] **ภาพรวมทั้งโรงเรียน**: progress bar รวม "กรอกเกรดไปแล้วกี่ %" (เฉลี่ย `completion_percent` ของทุก gradebook ในภาคเรียน active)
- [ ] **รายครู**: ตาราง/การ์ดของครูแต่ละคน แสดง progress bar ต่อคน + "เหลืออีกกี่ %" + จำนวนวิชาที่ยังไม่เสร็จ (เรียงครูที่ค้างมากขึ้นก่อนได้)
- [ ] **เจาะลึกรายวิชา**: คลิกครู → เห็นแต่ละวิชา/ห้อง สถานะ (not_started/in_progress/completed) + %
- [ ] ตัวกรอง: ปีการศึกษา, ภาคเรียน, กลุ่มสาระ, ระดับชั้น
- [ ] สี progress: <50% แดง, 50-99% เหลือง, 100% เขียว (ใช้ token สีของ design system)
- **สำเร็จเมื่อ:** ผู้บริหารเปิดหน้านี้แล้วเห็นทันทีว่าทั้งโรงเรียนกรอกไปกี่ % และครูคนไหนยังค้าง

### 9.9 Executive — Dashboard ค่าเฉลี่ย/สถิติ (Analytics)
> เปิดให้ `admin` และ `executive` — query/aggregate จาก `v_gradebook_overview`; ใช้กราฟด้วย **recharts**
- [ ] **การ์ดสรุปด้านบน (KPI)**: เวลามาเรียนเฉลี่ย (%), ผลการเรียนเฉลี่ย, อัตราผ่านเกณฑ์ (%), ค่าเฉลี่ยคุณลักษณะ, ค่าเฉลี่ยอ่าน-คิดวิเคราะห์-เขียน — ระดับทั้งโรงเรียน
- [ ] **กราฟแท่ง: ค่าเฉลี่ยรายกลุ่มสาระ** (8 กลุ่มสาระ) — เลือกเมตริกได้ (เกรด/เวลาเรียน/คุณลักษณะ)
- [ ] **กราฟแท่ง/ตาราง: เปรียบเทียบรายระดับชั้น** (ป.1…ม.6) และ **รายห้อง** (drill-down)
- [ ] **กราฟวงกลม/แท่ง: การกระจายของเกรด** (4, 3.5, 3, … , 0, ร, มส) รวมทั้งโรงเรียนหรือรายวิชา
- [ ] ตัวกรองเหมือน §9.8 (ปี/ภาค/กลุ่มสาระ/ชั้น/ห้อง) — ทุกกราฟ react ตามตัวกรอง
- [ ] ปุ่ม "ส่งออกรายงานสรุป" → ไปหน้า Report Reader (§9.10) เพื่ออ่าน/ดาวน์โหลด PDF
- **สำเร็จเมื่อ:** ผู้บริหารเห็นค่าเฉลี่ยทุกหัวข้อ และ drill-down จากโรงเรียน → กลุ่มสาระ → ชั้น → ห้องได้

### 9.10 Executive — ตัวอ่านเอกสาร PDF / ebook (Report Reader)
ผู้บริหารอ่านผลการเรียน "ทุกห้อง" ในรูปเอกสารแบบเปิดอ่านเป็นหน้า ๆ (ebook) และดาวน์โหลดเป็น PDF ได้
> ใช้ **`@react-pdf/renderer`** สร้าง PDF (รองรับฟอนต์ไทยด้วยการ `Font.register` ฟอนต์ Sarabun) + ตัวอ่านบนจอแบบเปิดทีละหน้า

**ส่วนที่ 1 — เลือกเอกสาร**
- [ ] เลือกขอบเขต: ทั้งโรงเรียน / กลุ่มสาระ / ระดับชั้น / ห้องเรียน / ครู / รายวิชา
- [ ] เลือกชนิดรายงาน: (ก) **รายงานสรุปผลการเรียน** (สถิติ ค่าเฉลี่ย ตาราง), (ข) **ปพ.5 รายวิชา** (สรุปแบบอ่าน — ไม่ใช่ Excel)

**ส่วนที่ 2 — ตัวอ่านแบบ ebook (บนจอ)**
- [ ] แสดงเอกสารเป็น "หน้า" ขนาดสัดส่วน A4 เรียงต่อกัน
- [ ] แถบควบคุม: หน้าก่อน/ถัดไป, กระโดดไปหน้า, ตัวเลขหน้า (เช่น 3/12), zoom in/out
- [ ] แถบ thumbnail ด้านข้างสำหรับกระโดดข้ามหน้า
- [ ] ใช้ฟอนต์ไทยอ่านง่าย (Sarabun) — โหลดจาก `public/fonts/`

**ส่วนที่ 3 — ดาวน์โหลด PDF**
- [ ] ปุ่ม "ดาวน์โหลด PDF" → สร้างไฟล์ด้วย `@react-pdf/renderer` (เนื้อหาเดียวกับตัวอ่าน)
- [ ] ตั้งชื่อไฟล์อัตโนมัติ เช่น `รายงานสรุป_ม.3-1_ภาค1_2568.pdf`
- [ ] รองรับดาวน์โหลด "รวมทั้งห้อง/ทั้งระดับชั้น" เป็นไฟล์เดียวหลายหน้า

**ข้อกำหนดเชิงเทคนิค**
- [ ] เนื้อหา PDF ดึงจาก `v_gradebook_overview` (สถิติ) + `gradebooks` (รายละเอียดรายคน เมื่อเลือกระดับห้อง/วิชา)
- [ ] แยก "report model" (โครงข้อมูลรายงาน) ออกจาก renderer เพื่อใช้ซ้ำได้ทั้งตัวอ่านบนจอและตัว PDF
- [ ] ฟอนต์ไทยใน `@react-pdf/renderer`:
  ```ts
  import { Font } from '@react-pdf/renderer';
  Font.register({ family: 'Sarabun', fonts: [
    { src: '/fonts/Sarabun-Regular.ttf' },
    { src: '/fonts/Sarabun-Bold.ttf', fontWeight: 'bold' },
  ]});
  ```
- **สำเร็จเมื่อ:** ผู้บริหารเลือกห้อง → เปิดอ่านรายงานทีละหน้าได้ → กดดาวน์โหลดได้ไฟล์ PDF ภาษาไทยที่อ่านออกถูกต้อง

### 9.11 Admin — Dashboard ภาพรวม (เดิม)
- [ ] รวมเข้ากับ §9.8/§9.9 (admin เข้าถึง dashboard ผู้บริหารทั้งหมดได้) — ไม่ต้องทำหน้าซ้ำ

---

## §10 โครงสร้างไฟล์โปรเจกต์เป้าหมาย

```
ksp-gradebook/
├─ BUILD_SPEC.md                  ← ไฟล์นี้
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ vercel.json                    ← ใหม่ (SPA rewrite)
├─ .env.example                   ← ใหม่
├─ .gitignore
├─ supabase/
│  └─ migrations/
│     ├─ 0001_init.sql            ← §4
│     ├─ 0002_rls.sql             ← §5
│     ├─ 0003_functions.sql       ← §6
│     └─ 0004_seed_reference.sql  ← class_levels + schools เริ่มต้น
├─ scripts/
│  └─ seedCurriculum.ts           ← §7
└─ src/
   ├─ main.tsx
   ├─ App.tsx                      ← แก้ data layer (§8.3)
   ├─ index.css
   ├─ types.ts                     ← ขยาย type ใหม่
   ├─ pages/                       ← ใหม่
   │  ├─ admin/
   │  │  ├─ TeachersPage.tsx
   │  │  ├─ AcademicYearsPage.tsx
   │  │  ├─ ClassroomsPage.tsx     ← + ปุ่มเลื่อนชั้น
   │  │  ├─ StudentsPage.tsx       ← + import Excel
   │  │  ├─ SubjectsPage.tsx
   │  │  └─ AssignmentsPage.tsx    ← ตารางสอน + import
   │  ├─ executive/                ← ใหม่ (เปิดให้ admin + executive)
   │  │  ├─ ExecutiveLayout.tsx        ← เมนู/route guard (admin|executive)
   │  │  ├─ ProgressDashboard.tsx      ← §9.8 % การกรอกเกรด
   │  │  ├─ AnalyticsDashboard.tsx     ← §9.9 ค่าเฉลี่ย/สถิติ (recharts)
   │  │  └─ ReportReaderPage.tsx       ← §9.10 ตัวอ่าน PDF/ebook
   │  └─ teacher/
   │     ├─ TeacherDashboard.tsx   ← ปีปัจจุบัน/ปีเก่า (§9.6)
   │     └─ GradebookEditor.tsx    ← ครอบ 9 tabs เดิม
   ├─ reports/                     ← ใหม่ (report model + renderer ใช้ซ้ำ)
   │  ├─ reportModel.ts            ← สร้างโครงข้อมูลรายงานจาก view/gradebooks
   │  ├─ ReportPdf.tsx             ← @react-pdf/renderer Document (ดาวน์โหลด)
   │  └─ EbookReader.tsx           ← ตัวอ่านบนจอแบบเปิดทีละหน้า + thumbnail
   ├─ components/                  ← ของเดิม "ห้ามรื้อ"
   │  ├─ GeneralInfoForm.tsx … Instructions2Form.tsx (reuse ทั้งหมด)
   │  ├─ charts/                   ← ใหม่: KpiCard, BarByArea, GradeDistribution ฯลฯ (recharts)
   │  ├─ Login.tsx                 ← เปลี่ยนเป็น Supabase Auth
   │  └─ Dashboard.tsx             ← ใช้ logic เดิมบางส่วน หรือ refactor เป็น TeacherDashboard
   ├─ lib/
   │  ├─ supabase.ts               ← §8.1
   │  ├─ gradebookAdapter.ts       ← §8.4
   │  ├─ gradebookStats.ts         ← §8.7 คำนวณสถิติตอน save
   │  └─ curriculum.ts             ← fetch standards/indicators (§8.6)
   ├─ data/                        ← ใช้เป็นแหล่ง seed (ยังเก็บไว้)
   │  └─ curriculumData.ts …
   └─ utils/
      └─ excelExport.ts            ← reuse (ห้ามแก้ logic)

public/
└─ fonts/
   ├─ Sarabun-Regular.ttf          ← ใหม่: ฟอนต์ไทยสำหรับ PDF/ebook
   └─ Sarabun-Bold.ttf
```

---

## §11 ไฟล์ตั้งค่า

### `.env.example`
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
# ใช้เฉพาะตอน seed (อย่า commit ค่าจริง, อย่าใส่ใน client)
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

### `vercel.json`
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### `.gitignore` (เพิ่มถ้ายังไม่มี)
```
node_modules
dist
.env
.env.local
.DS_Store
*.log
```

### `package.json` — scripts ที่ควรมี
```json
{
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "tsc --noEmit",
    "seed:curriculum": "tsx scripts/seedCurriculum.ts"
  }
}
```
> ลบ dependency: `express`, `better-sqlite3`, `@types/express` (และ server entry ถ้ามี) — โปรเจกต์เป็น static SPA + Supabase
> เพิ่ม dependency: `@supabase/supabase-js`, `recharts` (กราฟ), `@react-pdf/renderer` (PDF)

### ฟอนต์ไทยสำหรับ PDF/ebook
- ดาวน์โหลด **Sarabun** (Google Fonts, OFL) วางไว้ที่ `public/fonts/Sarabun-Regular.ttf` และ `public/fonts/Sarabun-Bold.ttf`
- `@react-pdf/renderer` ต้อง `Font.register` ฟอนต์นี้ มิฉะนั้นภาษาไทยจะไม่แสดง (ดู §9.10)
- ตัวอ่าน ebook บนจอใช้ฟอนต์เดียวกันผ่าน CSS `@font-face`

### `0004_seed_reference.sql` (ข้อมูลตั้งต้น)
```sql
-- class_levels ป.1–ม.6
insert into class_levels (code, name, sequence, stage) values
 ('ป.1','ประถมศึกษาปีที่ 1',1,'ประถมศึกษา'),
 ('ป.2','ประถมศึกษาปีที่ 2',2,'ประถมศึกษา'),
 ('ป.3','ประถมศึกษาปีที่ 3',3,'ประถมศึกษา'),
 ('ป.4','ประถมศึกษาปีที่ 4',4,'ประถมศึกษา'),
 ('ป.5','ประถมศึกษาปีที่ 5',5,'ประถมศึกษา'),
 ('ป.6','ประถมศึกษาปีที่ 6',6,'ประถมศึกษา'),
 ('ม.1','มัธยมศึกษาปีที่ 1',7,'มัธยมศึกษาตอนต้น'),
 ('ม.2','มัธยมศึกษาปีที่ 2',8,'มัธยมศึกษาตอนต้น'),
 ('ม.3','มัธยมศึกษาปีที่ 3',9,'มัธยมศึกษาตอนต้น'),
 ('ม.4','มัธยมศึกษาปีที่ 4',10,'มัธยมศึกษาตอนปลาย'),
 ('ม.5','มัธยมศึกษาปีที่ 5',11,'มัธยมศึกษาตอนปลาย'),
 ('ม.6','มัธยมศึกษาปีที่ 6',12,'มัธยมศึกษาตอนปลาย')
on conflict (code) do nothing;

-- โรงเรียนเริ่มต้น (แก้ชื่อ/ชั้นสูงสุดตามจริง; ขยายโอกาสจบ ม.3 ใช้ 9)
insert into schools (name, max_level_sequence)
values ('โรงเรียนตัวอย่าง', 9);
```

---

## §12 ลำดับงานสำหรับ Composer (Build Phases — ทำตามนี้)

> ทำทีละเฟส, จบเฟสแล้ว `npm run lint` ต้องผ่าน, แล้ว commit

### Phase 0 — เตรียมโปรเจกต์
- [ ] เพิ่ม `@supabase/supabase-js`, ลบ `express/better-sqlite3/@types/express`
- [ ] สร้าง `.env.example`, `vercel.json`, แก้ `.gitignore`, ปรับ `package.json` scripts
- [ ] สร้าง `src/lib/supabase.ts`
- [ ] ลบ `Code.gs` และ logic Google Sheet ใน `App.tsx` (คง UI ไว้ก่อน, mock data ชั่วคราวได้)

### Phase 1 — Database
- [ ] สร้าง `supabase/migrations/0001_init.sql` (§4)
- [ ] `0002_rls.sql` (§5) — เติม policy ที่ "ทำซ้ำ pattern" ให้ครบ
- [ ] `0003_functions.sql` (§6)
- [ ] `0004_seed_reference.sql` (§11)
- [ ] รัน migration ทั้งหมดบน Supabase, ยืนยันตารางครบ

### Phase 2 — Auth + Profiles
- [ ] เปลี่ยน `Login.tsx` เป็น Supabase Auth (signInWithPassword)
- [ ] โหลด profile + role หลัง login, ทำ route guard (admin vs teacher)
- [ ] หน้า `admin/TeachersPage` (เพิ่ม/แก้/ปิดครู, set role)

### Phase 3 — Master data (admin)
- [ ] `AcademicYearsPage` (auto date จาก พ.ศ.) + activate
- [ ] `ClassroomsPage` (สร้างห้อง + ครูประจำชั้น) + ปุ่ม **เลื่อนชั้น** (`promote_students`)
- [ ] `StudentsPage` + **import Excel** (ใช้ exceljs อ่านไฟล์)
- [ ] `SubjectsPage`

### Phase 4 — ตารางสอน
- [ ] `AssignmentsPage`: สร้าง teaching_assignments (ครู×วิชา×ห้อง×ภาค)
- [ ] import ตารางสอนจาก Excel + หน้า review/flag + activate

### Phase 5 — Teacher Dashboard + Gradebook
- [ ] `TeacherDashboard`: ปีปัจจุบันเด่น + ปีเก่าพับได้ (query teaching_assignments + gradebooks)
- [ ] `GradebookEditor`: เปิด gradebook → `rowToAppData` → 9 tabs เดิม → autosave → export
- [ ] ต่อ `curriculum.ts` ให้ ScoreConfigModal/StandardIndicatorFilter อ่านจาก DB
- [ ] ปุ่ม "คัดลอกจากปีที่แล้ว" → `clone_gradebook_structure`

### Phase 6 — Seed หลักสูตร + สถิติ
- [ ] `scripts/seedCurriculum.ts` (§7) + รัน `npm run seed:curriculum`
- [ ] `src/lib/gradebookStats.ts` (§8.7): ทำ `computeGradebookStats` ให้คำนวณจริงด้วยสูตรเดียวกับ ScoresForm/excelExport
- [ ] ต่อ autosave ให้เขียน `stats` + อัปเดต `status` ทุกครั้งที่บันทึก
- [ ] สร้าง view `v_gradebook_overview` (§6.3) บน Supabase

### Phase 7 — Dashboard ผู้บริหาร + ตัวอ่าน PDF/ebook
- [ ] route guard + `ExecutiveLayout` ให้เข้าได้เฉพาะ `admin`/`executive`
- [ ] `ProgressDashboard` (§9.8): progress bar รวม + รายครู + เจาะลึกรายวิชา + ตัวกรอง
- [ ] `AnalyticsDashboard` (§9.9): KPI cards + กราฟ recharts (รายกลุ่มสาระ/ระดับชั้น/การกระจายเกรด) + ตัวกรอง
- [ ] วางฟอนต์ Sarabun ใน `public/fonts/`
- [ ] `reports/reportModel.ts` (สร้างโครงรายงานจาก view/gradebooks)
- [ ] `reports/EbookReader.tsx` (อ่านบนจอทีละหน้า + thumbnail + zoom)
- [ ] `reports/ReportPdf.tsx` (`@react-pdf/renderer` + Font.register Sarabun) + ปุ่มดาวน์โหลด
- [ ] `ReportReaderPage` (§9.10): เลือกขอบเขต/ชนิดรายงาน → อ่าน → ดาวน์โหลด PDF

### Phase 8 — Deploy
- [ ] ทำตาม §13

---

## §13 การ Deploy (Supabase + GitHub + Vercel)

### 13.1 Supabase
1. สร้าง project ใหม่ที่ supabase.com (เลือก region ใกล้ไทย เช่น Singapore)
2. ไปที่ **SQL Editor** → รัน `0001` → `0002` → `0003` → `0004` ตามลำดับ
3. ไปที่ **Authentication → Providers** → เปิด Email (ปิด "Confirm email" ในช่วงทดสอบได้)
4. สร้าง admin คนแรก: **Authentication → Users → Add user** (กรอก email/password)
   จากนั้นใน **SQL Editor**:
   ```sql
   insert into profiles (id, school_id, full_name, role)
   select u.id, (select id from schools limit 1), 'ผู้ดูแลระบบ', 'admin'
   from auth.users u where u.email = 'ADMIN_EMAIL';
   ```
5. คัดลอก **Project URL** + **anon key** จาก **Settings → API**
6. (ถ้ามีผู้บริหาร) สร้างบัญชี executive แบบเดียวกับข้อ 4 แต่ตั้ง `role` เป็น `'executive'`:
   ```sql
   insert into profiles (id, school_id, full_name, role)
   select u.id, (select id from schools limit 1), 'ผู้อำนวยการ', 'executive'
   from auth.users u where u.email = 'DIRECTOR_EMAIL';
   ```

### 13.2 GitHub
```bash
git init
git add .
git commit -m "feat: KSP GradeBook initial system"
git branch -M main
git remote add origin https://github.com/USERNAME/ksp-gradebook.git
git push -u origin main
```
> ตรวจว่า `.env` ไม่ถูก commit (อยู่ใน .gitignore)

### 13.3 Vercel
1. vercel.com → **New Project** → Import repo `ksp-gradebook`
2. Framework Preset: **Vite** (ตรวจ build = `npm run build`, output = `dist`)
3. **Environment Variables** เพิ่ม:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. **Deploy** → ได้ URL ใช้งานจริง
5. กลับไป Supabase **Authentication → URL Configuration** ใส่ Vercel URL ใน Site URL / Redirect URLs

---

## §14 Testing Checklist (ก่อนส่งมอบ)

**Auth & สิทธิ์**
- [ ] ครู A login เห็นเฉพาะวิชาของ A (ลองดู gradebook ของ B ต้องไม่ได้)
- [ ] admin เห็น/จัดการได้ทั้งโรงเรียน
- [ ] ปิด `is_active` แล้วครูคนนั้น login ไม่ผ่าน

**Master & เลื่อนชั้น**
- [ ] สร้างปี 2568 → ห้อง ม.1/1 → import นักเรียน → ครบใน enrollment
- [ ] สร้างปี 2569 → "เลื่อนชั้น" → ม.1/1 กลายเป็น ม.2/1 รายชื่อเดิม
- [ ] นักเรียนชั้นสูงสุด (เช่น ม.3 เมื่อ max=9) → status `graduated`
- [ ] กดเลื่อนชั้นซ้ำ ไม่เกิด enrollment ซ้ำ (idempotent)

**ตารางสอน & Gradebook**
- [ ] admin สร้าง assignment → ครูเห็นใน Dashboard ทันที
- [ ] กรอกคะแนน → refresh → ข้อมูลคงอยู่
- [ ] ตัวเลือกตัวชี้วัดมาจาก DB ถูกต้องตามกลุ่มสาระ/ชั้น
- [ ] export Excel ครบ 9 sheet, รูปแบบตรงกับเดิม
- [ ] "คัดลอกจากปีที่แล้ว" copy โครงสร้าง+roster แต่คะแนนว่าง

**Dashboard UX**
- [ ] ปีปัจจุบันเด่น, ปีเก่าพับได้
- [ ] ปีเก่าเปิด/์export ได้ แต่แก้ไขไม่ได้

**ผู้บริหาร (executive) & รายงาน**
- [ ] executive login เห็น dashboard ได้ แต่ **แก้ไขข้อมูลไม่ได้** (ลองเปิด gradebook ของครูแล้วต้องเป็น read-only / ไม่มีปุ่มแก้)
- [ ] executive เปิดวิชาของครูคนใดก็ได้ทั้งโรงเรียน (RLS อนุญาต select)
- [ ] Progress dashboard: % รวมตรงกับค่าเฉลี่ย completion ของ gradebook, รายครูแสดง "เหลืออีกกี่ %" ถูกต้อง
- [ ] Analytics: เปลี่ยนตัวกรอง (ปี/ภาค/กลุ่มสาระ/ชั้น) แล้วกราฟอัปเดตถูกต้อง
- [ ] ค่าเฉลี่ยใน dashboard ตรงกับข้อมูลจริงในตัวอย่างที่ตรวจสอบ (สุ่ม 1 ห้อง)
- [ ] Report Reader: เปิดอ่านทีละหน้าได้, ปุ่มหน้า/thumbnail ทำงาน
- [ ] ดาวน์โหลด PDF ได้ไฟล์ที่ **ภาษาไทยแสดงถูกต้อง** (ฟอนต์ Sarabun ฝังถูก), ชื่อไฟล์ถูกต้อง
- [ ] teacher (ไม่ใช่ admin/exec) เข้าหน้า dashboard ผู้บริหารไม่ได้ (route guard เด้งออก)

**Deploy**
- [ ] เปิด Vercel URL ใช้งานได้, refresh หน้า deep link ไม่ 404 (SPA rewrite ทำงาน)
- [ ] ข้อมูล env ทำงาน, ไม่มี service role key หลุดใน client (เช็ค bundle)

---

## ภาคผนวก — type ที่ควรเพิ่มใน `src/types.ts`
```ts
export type Role = 'admin' | 'teacher' | 'executive';

export interface GradebookStats {
  completionPercent: number;
  studentCount: number;
  avgScore: number;
  passRate: number;
  gradeDistribution: Record<string, number>;
  attendanceRate: number;
  behaviorAvg: number;
  analyticalAvg: number;
}

export interface Profile {
  id: string;
  schoolId: string | null;
  title?: string;
  fullName: string;
  role: Role;
  isActive: boolean;
}

export interface AcademicYear {
  id: string;
  yearBE: number;          // 2568
  startDate: string;       // 2025-05-01
  endDate: string;         // 2026-04-30
  termOpenDate?: string;   // 2025-05-16
  isActive: boolean;
}

export interface ClassLevel { code: string; name: string; sequence: number; stage: string; }

export interface Classroom {
  id: string; academicYearId: string; classLevelCode: string;
  roomNumber: number; name: string;
  homeroomTeacherId?: string | null; homeroomTeacher2Id?: string | null;
}

export interface TeachingAssignment {
  id: string; semesterId: string; teacherId: string;
  subjectId: string; classroomId: string;
  hoursPerWeek?: number; hoursPerSemester?: number;
  status: 'pending' | 'active';
}
```
> `AppData`, `Dataset`, `Student`, `ScoreConfig`, `ScoreUnit`, `ScoreIndicator`, `Indicator` เดิม **คงไว้** (gradebook map กลับเป็น `AppData` ผ่าน adapter §8.4)

---

*จบสเปก — ส่งไฟล์นี้ให้ Cursor/Composer 2.5 และทำตาม §12 ทีละเฟส*
