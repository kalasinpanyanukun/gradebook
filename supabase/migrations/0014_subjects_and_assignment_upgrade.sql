-- =========================================================
-- 0014: subjects upgrade + co-teacher + data integrity
-- =========================================================

-- 1) subjects: curriculum columns for ปพ.5 cover/general info
alter table subjects
  add column if not exists subject_type text not null default 'พื้นฐาน',
  add column if not exists credits numeric(3,1),
  add column if not exists hours_total int,
  add column if not exists hours_per_week int,
  add column if not exists semester_number int,
  add column if not exists is_active boolean not null default true;

do $$ begin
  alter table subjects add constraint subjects_type_chk
    check (subject_type in ('พื้นฐาน','เพิ่มเติม'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table subjects add constraint subjects_semester_chk
    check (semester_number is null or semester_number in (1,2));
exception when duplicate_object then null; end $$;

-- 2) Thai subject codes encode level/semester; one code per school is enough.
alter table subjects drop constraint if exists subjects_school_id_subject_code_default_class_level_key;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'subjects'
      and c.contype = 'u'
      and (
        select array_agg(a.attname order by a.attname)
        from unnest(c.conkey) key(attnum)
        join pg_attribute a on a.attrelid = t.oid and a.attnum = key.attnum
      ) = array['default_class_level','school_id','subject_code']
  loop
    execute format('alter table subjects drop constraint if exists %I', constraint_name);
  end loop;
end $$;

do $$ begin
  alter table subjects add constraint subjects_school_code_uniq
    unique (school_id, subject_code);
exception when duplicate_object then null; end $$;

-- 3) teaching_assignments: co-teacher display name (Decision D1)
alter table teaching_assignments
  add column if not exists co_teacher_name text;

-- 4) Decision D1: one active ปพ.5 owner per 1 subject x 1 classroom x 1 semester.
-- If the school later splits the same subject/classroom between teachers by student group,
-- remove this index in a new migration.
create unique index if not exists uniq_active_subject_room_per_semester
  on teaching_assignments (semester_id, subject_id, classroom_id)
  where status = 'active';

-- 5) unique keys for idempotent curriculum seed migrations.
do $$ begin
  alter table curriculum_standards add constraint curriculum_standards_uniq
    unique (learning_area, class_level_code, standard_code);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table curriculum_indicators add constraint curriculum_indicators_uniq
    unique (standard_id, indicator_code);
exception when duplicate_object then null; end $$;

-- 6) Decision D2 already exists in 0010_school_max_level_sequence.sql.
