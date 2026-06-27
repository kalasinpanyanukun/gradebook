-- Teachers should be able to open every assignment that has been assigned to them.
-- The previous policy helper only allowed gradebook writes when teaching_assignments.status = 'active',
-- which hid/imported pending rows from the teacher workflow and caused first-open failures.
create or replace function gradebook_assignment_is_active_for_teacher(
  p_assignment_id uuid,
  p_semester_id uuid,
  p_teacher_id uuid
) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from teaching_assignments ta
    join semesters sem on sem.id = ta.semester_id
    join academic_years ay on ay.id = sem.academic_year_id
    where ta.id = p_assignment_id
      and ta.semester_id = p_semester_id
      and ta.teacher_id = p_teacher_id
      and ay.is_active = true
      and ay.school_id = current_school_id()
  );
$$;
