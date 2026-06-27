-- ========== EXTENSIONS ==========
create extension if not exists "pgcrypto";

-- ========== SCHOOLS ==========
create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text,
  max_level_sequence int not null default 12,
  created_at timestamptz not null default now()
);

-- ========== PROFILES (ครู / admin) ==========
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references schools(id) on delete set null,
  title text,
  full_name text not null,
  role text not null default 'teacher' check (role in ('admin','teacher','executive')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ========== ACADEMIC YEARS ==========
create table academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  year_be int not null,
  start_date date not null,
  end_date date not null,
  term_open_date date,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (school_id, year_be)
);

-- ========== SEMESTERS ==========
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

-- ========== CLASS LEVELS ==========
create table class_levels (
  code text primary key,
  name text not null,
  sequence int not null unique,
  stage text not null
);

-- ========== CLASSROOMS ==========
create table classrooms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  class_level_code text not null references class_levels(code),
  room_number int not null,
  name text not null,
  homeroom_teacher_id uuid references profiles(id) on delete set null,
  homeroom_teacher_2_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (academic_year_id, class_level_code, room_number)
);

-- ========== STUDENTS ==========
create table students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  student_code text not null,
  citizen_id text,
  title text,
  first_name text not null,
  last_name text not null,
  gender text check (gender in ('ชาย','หญิง')),
  status text not null default 'active'
    check (status in ('active','graduated','transferred_out','inactive')),
  created_at timestamptz not null default now(),
  unique (school_id, student_code)
);

-- ========== STUDENT ENROLLMENTS ==========
create table student_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  classroom_id uuid not null references classrooms(id) on delete cascade,
  class_level_code text not null references class_levels(code),
  student_number int,
  status text not null default 'active'
    check (status in ('active','transferred_out','inactive')),
  created_at timestamptz not null default now(),
  unique (student_id, academic_year_id)
);

-- ========== SUBJECTS ==========
create table subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  subject_code text not null,
  subject_name text not null,
  learning_area text not null,
  default_class_level text references class_levels(code),
  created_at timestamptz not null default now(),
  unique (school_id, subject_code, default_class_level)
);

-- ========== CURRICULUM ==========
create table curriculum_standards (
  id uuid primary key default gen_random_uuid(),
  learning_area text not null,
  class_level_code text not null references class_levels(code),
  standard_code text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table curriculum_indicators (
  id uuid primary key default gen_random_uuid(),
  standard_id uuid not null references curriculum_standards(id) on delete cascade,
  indicator_code text not null,
  description text not null,
  created_at timestamptz not null default now()
);

-- ========== TEACHING ASSIGNMENTS ==========
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
    check (status in ('pending','active')),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (semester_id, teacher_id, subject_id, classroom_id)
);

-- ========== GRADEBOOKS ==========
create table gradebooks (
  id uuid primary key default gen_random_uuid(),
  teaching_assignment_id uuid not null references teaching_assignments(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  semester_id uuid not null references semesters(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started','in_progress','completed')),
  general_info jsonb not null default '{}'::jsonb,
  students jsonb not null default '[]'::jsonb,
  attendance jsonb not null default '{}'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  score_config jsonb,
  attributes jsonb not null default '{}'::jsonb,
  analytical jsonb not null default '{}'::jsonb,
  indicators jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
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
