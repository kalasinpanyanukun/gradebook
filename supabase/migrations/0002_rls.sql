-- ========== HELPER FUNCTIONS ==========
create or replace function current_role_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

create or replace function is_admin_or_exec() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and role in ('admin','executive') and is_active = true
  );
$$;

create or replace function current_school_id() returns uuid
language sql stable security definer set search_path = public as $$
  select school_id from profiles where id = auth.uid();
$$;

create or replace function semester_in_current_school(p_semester_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1
    from semesters s
    join academic_years ay on ay.id = s.academic_year_id
    where s.id = p_semester_id
      and ay.school_id = current_school_id()
  );
$$;

-- ========== ENABLE RLS ==========
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

-- ========== PROFILES ==========
create policy profiles_self_read on profiles for select
  using (id = auth.uid() or is_admin_or_exec());

create policy profiles_admin_write on profiles for all
  using (current_role_is_admin()) with check (current_role_is_admin());

create policy profiles_self_update on profiles for update
  using (id = auth.uid());

-- ========== SCHOOLS ==========
create policy schools_admin_all on schools for all
  using (current_role_is_admin() and id = current_school_id())
  with check (current_role_is_admin() and id = current_school_id());

create policy schools_school_read on schools for select
  using (id = current_school_id());

-- ========== ACADEMIC YEARS ==========
create policy academic_years_admin_all on academic_years for all
  using (current_role_is_admin() and school_id = current_school_id())
  with check (current_role_is_admin() and school_id = current_school_id());

create policy academic_years_school_read on academic_years for select
  using (school_id = current_school_id());

-- ========== SEMESTERS ==========
create policy semesters_admin_all on semesters for all
  using (
    current_role_is_admin()
    and exists (
      select 1 from academic_years ay
      where ay.id = academic_year_id and ay.school_id = current_school_id()
    )
  )
  with check (
    current_role_is_admin()
    and exists (
      select 1 from academic_years ay
      where ay.id = academic_year_id and ay.school_id = current_school_id()
    )
  );

create policy semesters_school_read on semesters for select
  using (
    exists (
      select 1 from academic_years ay
      where ay.id = academic_year_id and ay.school_id = current_school_id()
    )
  );

-- ========== CLASSROOMS ==========
create policy classrooms_admin_all on classrooms for all
  using (current_role_is_admin() and school_id = current_school_id())
  with check (current_role_is_admin() and school_id = current_school_id());

create policy classrooms_school_read on classrooms for select
  using (school_id = current_school_id());

-- ========== STUDENTS ==========
create policy students_admin_all on students for all
  using (current_role_is_admin() and school_id = current_school_id())
  with check (current_role_is_admin() and school_id = current_school_id());

create policy students_teacher_read on students for select
  using (school_id = current_school_id());

-- ========== STUDENT ENROLLMENTS ==========
create policy student_enrollments_admin_all on student_enrollments for all
  using (
    current_role_is_admin()
    and exists (
      select 1 from academic_years ay
      where ay.id = academic_year_id and ay.school_id = current_school_id()
    )
  )
  with check (
    current_role_is_admin()
    and exists (
      select 1 from academic_years ay
      where ay.id = academic_year_id and ay.school_id = current_school_id()
    )
  );

create policy student_enrollments_school_read on student_enrollments for select
  using (
    exists (
      select 1 from academic_years ay
      where ay.id = academic_year_id and ay.school_id = current_school_id()
    )
  );

-- ========== SUBJECTS ==========
create policy subjects_admin_all on subjects for all
  using (current_role_is_admin() and school_id = current_school_id())
  with check (current_role_is_admin() and school_id = current_school_id());

create policy subjects_school_read on subjects for select
  using (school_id = current_school_id());

-- ========== CURRICULUM ==========
create policy curr_std_read on curriculum_standards for select
  using (auth.uid() is not null);

create policy curr_std_admin on curriculum_standards for all
  using (current_role_is_admin()) with check (current_role_is_admin());

create policy curr_ind_read on curriculum_indicators for select
  using (auth.uid() is not null);

create policy curr_ind_admin on curriculum_indicators for all
  using (current_role_is_admin()) with check (current_role_is_admin());

-- ========== TEACHING ASSIGNMENTS ==========
create policy ta_teacher_read on teaching_assignments for select
  using (teacher_id = auth.uid() or is_admin_or_exec());

create policy ta_admin_write on teaching_assignments for all
  using (current_role_is_admin()) with check (current_role_is_admin());

create policy ta_teacher_create on teaching_assignments for insert
  with check (teacher_id = auth.uid() and status = 'pending');

-- ========== GRADEBOOKS ==========
create policy gb_teacher_all on gradebooks for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy gb_admin_exec_read on gradebooks for select
  using (is_admin_or_exec());

-- ========== ACTIVITY LOGS ==========
create policy logs_insert on activity_logs for insert
  with check (user_id = auth.uid());

create policy logs_admin_read on activity_logs for select
  using (current_role_is_admin());

create policy logs_exec_read on activity_logs for select
  using (is_admin_or_exec() and school_id = current_school_id());
