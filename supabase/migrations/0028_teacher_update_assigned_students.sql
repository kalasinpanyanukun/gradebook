-- Allow assigned teachers to update the academic identity fields used by the
-- gradebook roster editor for active students in their assigned classroom.
drop policy if exists students_teacher_update_assigned_roster on public.students;

create policy students_teacher_update_assigned_roster
  on public.students
  for update
  using (
    school_id = public.current_school_id()
    and exists (
      select 1
      from public.student_enrollments se
      join public.teaching_assignments ta
        on ta.classroom_id = se.classroom_id
      join public.semesters sem
        on sem.id = ta.semester_id
       and sem.academic_year_id = se.academic_year_id
      join public.academic_years ay
        on ay.id = se.academic_year_id
      where se.student_id = students.id
        and se.status = 'active'
        and ta.teacher_id = auth.uid()
        and ta.status = 'active'
        and ay.school_id = students.school_id
        and ay.is_active = true
    )
  )
  with check (school_id = public.current_school_id());

create or replace function public.teacher_update_assigned_student(
  p_student_id uuid,
  p_previous_student_code text,
  p_student_code text,
  p_citizen_id text,
  p_title text,
  p_first_name text,
  p_last_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid := public.current_school_id();
  v_student_id uuid;
begin
  if auth.uid() is null or v_school_id is null then
    raise exception 'ไม่พบสิทธิ์ผู้ใช้งานสำหรับอัปเดตข้อมูลนักเรียน';
  end if;

  select s.id
    into v_student_id
  from public.students s
  where s.school_id = v_school_id
    and (
      (p_student_id is not null and s.id = p_student_id)
      or (
        nullif(trim(coalesce(p_previous_student_code, '')), '') is not null
        and s.student_code = trim(p_previous_student_code)
      )
    )
    and exists (
      select 1
      from public.student_enrollments se
      join public.teaching_assignments ta
        on ta.classroom_id = se.classroom_id
      join public.semesters sem
        on sem.id = ta.semester_id
       and sem.academic_year_id = se.academic_year_id
      join public.academic_years ay
        on ay.id = se.academic_year_id
      where se.student_id = s.id
        and se.status = 'active'
        and ta.teacher_id = auth.uid()
        and ta.status = 'active'
        and ay.school_id = s.school_id
        and ay.is_active = true
    )
  limit 1;

  if v_student_id is null then
    raise exception 'ไม่พบข้อมูลนักเรียนในฐานข้อมูลกลางที่ครูคนนี้สามารถอัปเดตได้';
  end if;

  if exists (
    select 1
    from public.students duplicate
    where duplicate.school_id = v_school_id
      and duplicate.student_code = trim(p_student_code)
      and duplicate.id <> v_student_id
  ) then
    raise exception 'รหัสนักเรียนนี้ถูกใช้งานแล้ว';
  end if;

  update public.students
  set
    student_code = trim(p_student_code),
    citizen_id = nullif(trim(coalesce(p_citizen_id, '')), ''),
    title = nullif(trim(coalesce(p_title, '')), ''),
    first_name = trim(p_first_name),
    last_name = trim(coalesce(p_last_name, ''))
  where id = v_student_id
  returning id into v_student_id;

  return v_student_id;
end;
$$;

grant execute on function public.teacher_update_assigned_student(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated;
