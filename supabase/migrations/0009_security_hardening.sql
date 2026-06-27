-- Security hardening after initial prototype migration.
-- - prevent users from escalating their own profile role
-- - enforce active-year gradebook writes at the database layer
-- - add explicit auth/school checks inside SECURITY DEFINER RPCs

-- Profiles: admin manages profiles. Users do not update their own role/profile
-- directly; add a dedicated RPC later if self-service profile editing is needed.
drop policy if exists profiles_self_update on profiles;

-- Gradebooks: split the broad teacher FOR ALL policy so old-year gradebooks are
-- readable/exportable but not writable.
drop policy if exists gb_teacher_all on gradebooks;

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
      and ta.status = 'active'
      and ay.is_active = true
      and ay.school_id = current_school_id()
  );
$$;

create policy gb_teacher_select on gradebooks for select
  using (teacher_id = auth.uid());

create policy gb_teacher_insert_active on gradebooks for insert
  with check (
    teacher_id = auth.uid()
    and gradebook_assignment_is_active_for_teacher(teaching_assignment_id, semester_id, teacher_id)
  );

create policy gb_teacher_update_active on gradebooks for update
  using (
    teacher_id = auth.uid()
    and gradebook_assignment_is_active_for_teacher(teaching_assignment_id, semester_id, teacher_id)
  )
  with check (
    teacher_id = auth.uid()
    and gradebook_assignment_is_active_for_teacher(teaching_assignment_id, semester_id, teacher_id)
  );

-- Recreate promote_students with explicit admin + same-school checks.
create or replace function promote_students(
  p_from_year_id uuid,
  p_to_year_id uuid
) returns table (promoted int, graduated int)
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_next_seq int;
  v_next_level text;
  v_target_classroom uuid;
  v_school_max int;
  v_from_school uuid;
  v_to_school uuid;
  v_promoted int := 0;
  v_graduated int := 0;
begin
  if not current_role_is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select ay.school_id, s.max_level_sequence
    into v_from_school, v_school_max
  from academic_years ay
  join schools s on s.id = ay.school_id
  where ay.id = p_from_year_id;

  select school_id into v_to_school
  from academic_years
  where id = p_to_year_id;

  if v_from_school is null
    or v_to_school is null
    or v_from_school <> v_to_school
    or v_from_school <> current_school_id()
  then
    raise exception 'Invalid academic year scope' using errcode = '42501';
  end if;

  for r in
    select e.*, cl.sequence as cur_seq, c.room_number, c.school_id
    from student_enrollments e
    join students st on st.id = e.student_id
    join classrooms c on c.id = e.classroom_id
    join class_levels cl on cl.code = e.class_level_code
    where e.academic_year_id = p_from_year_id
      and e.status = 'active'
      and st.status = 'active'
      and c.school_id = v_from_school
  loop
    v_next_seq := r.cur_seq + 1;

    if v_next_seq > v_school_max then
      update students
      set status = 'graduated'
      where id = r.student_id
        and school_id = v_from_school
        and status = 'active';
      v_graduated := v_graduated + 1;
      continue;
    end if;

    select code into v_next_level
    from class_levels
    where sequence = v_next_seq;

    if v_next_level is null then
      update students
      set status = 'graduated'
      where id = r.student_id
        and school_id = v_from_school
        and status = 'active';
      v_graduated := v_graduated + 1;
      continue;
    end if;

    select id into v_target_classroom
    from classrooms
    where academic_year_id = p_to_year_id
      and class_level_code = v_next_level
      and room_number = r.room_number
      and school_id = v_from_school;

    if v_target_classroom is null then
      insert into classrooms (school_id, academic_year_id, class_level_code, room_number, name)
      values (
        v_from_school,
        p_to_year_id,
        v_next_level,
        r.room_number,
        v_next_level || '/' || r.room_number
      )
      returning id into v_target_classroom;
    end if;

    if not exists (
      select 1
      from student_enrollments
      where student_id = r.student_id
        and academic_year_id = p_to_year_id
    ) then
      insert into student_enrollments
        (student_id, academic_year_id, classroom_id, class_level_code, student_number, status)
      values
        (r.student_id, p_to_year_id, v_target_classroom, v_next_level, r.student_number, 'active');
      v_promoted := v_promoted + 1;
    end if;
  end loop;

  return query select v_promoted, v_graduated;
end;
$$;

-- Recreate clone_gradebook_structure with explicit ownership/school checks and
-- target-year metadata refresh.
create or replace function clone_gradebook_structure(
  p_source_gradebook_id uuid,
  p_target_assignment_id uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_existing_id uuid;
  v_new_id uuid;
  v_roster jsonb;
  v_general_info jsonb;
  v_source record;
  v_target record;
begin
  select
    g.id,
    g.teacher_id,
    p.school_id,
    g.general_info,
    g.score_config,
    g.indicators
    into v_source
  from gradebooks g
  join profiles p on p.id = g.teacher_id
  where g.id = p_source_gradebook_id
    and g.deleted_at is null;

  if v_source.id is null then
    raise exception 'Source gradebook not found' using errcode = 'P0002';
  end if;

  select
    ta.id,
    ta.teacher_id,
    ta.semester_id,
    ta.classroom_id,
    ta.status,
    ta.hours_per_week,
    ta.hours_per_semester,
    p.full_name as teacher_name,
    p.school_id,
    sem.semester_number,
    ay.id as academic_year_id,
    ay.year_be,
    ay.is_active as year_is_active,
    c.name as classroom_name,
    s.subject_code,
    s.subject_name,
    s.learning_area
    into v_target
  from teaching_assignments ta
  join profiles p on p.id = ta.teacher_id
  join semesters sem on sem.id = ta.semester_id
  join academic_years ay on ay.id = sem.academic_year_id
  join classrooms c on c.id = ta.classroom_id
  join subjects s on s.id = ta.subject_id
  where ta.id = p_target_assignment_id;

  if v_target.id is null then
    raise exception 'Target assignment not found' using errcode = 'P0002';
  end if;

  if v_target.school_id <> current_school_id()
    or v_source.school_id <> v_target.school_id
  then
    raise exception 'Invalid gradebook scope' using errcode = '42501';
  end if;

  if not current_role_is_admin() and v_target.teacher_id <> auth.uid() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if not current_role_is_admin() and v_source.teacher_id <> auth.uid() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if v_target.status <> 'active' or not v_target.year_is_active then
    raise exception 'Target assignment is not editable' using errcode = '42501';
  end if;

  select id into v_existing_id
  from gradebooks
  where teaching_assignment_id = p_target_assignment_id
    and deleted_at is null;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', st.id,
           'studentId', st.student_code,
           'citizenId', st.citizen_id,
           'name', concat_ws(' ', st.title, st.first_name, st.last_name)
         ) order by e.student_number), '[]'::jsonb)
    into v_roster
  from student_enrollments e
  join students st on st.id = e.student_id
  where e.classroom_id = v_target.classroom_id
    and e.academic_year_id = v_target.academic_year_id
    and e.status = 'active'
    and st.status = 'active';

  v_general_info := coalesce(v_source.general_info, '{}'::jsonb) || jsonb_build_object(
    'gradeLevel', v_target.classroom_name,
    'semester', v_target.semester_number::text,
    'academicYear', v_target.year_be::text,
    'subjectCode', v_target.subject_code,
    'subjectName', v_target.subject_name,
    'learningArea', v_target.learning_area,
    'totalHours', coalesce(v_target.hours_per_week::text, v_source.general_info->>'totalHours', ''),
    'hoursPerWeek', coalesce(v_target.hours_per_week::text, v_source.general_info->>'hoursPerWeek', ''),
    'hoursPerSemester', coalesce(v_target.hours_per_semester::text, v_source.general_info->>'hoursPerSemester', ''),
    'teacherName', v_target.teacher_name
  );

  insert into gradebooks (
    teaching_assignment_id,
    teacher_id,
    semester_id,
    status,
    general_info,
    students,
    score_config,
    indicators
  )
  values (
    p_target_assignment_id,
    v_target.teacher_id,
    v_target.semester_id,
    'not_started',
    v_general_info,
    v_roster,
    v_source.score_config,
    v_source.indicators
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

revoke all on function promote_students(uuid, uuid) from public;
revoke all on function clone_gradebook_structure(uuid, uuid) from public;
grant execute on function promote_students(uuid, uuid) to authenticated;
grant execute on function clone_gradebook_structure(uuid, uuid) to authenticated;
