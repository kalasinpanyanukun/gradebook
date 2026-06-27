-- ========== promote_students ==========
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
  v_promoted int := 0;
  v_graduated int := 0;
begin
  select s.max_level_sequence into v_school_max
  from academic_years ay join schools s on s.id = ay.school_id
  where ay.id = p_from_year_id;

  for r in
    select e.*, cl.sequence as cur_seq, c.room_number, c.school_id
    from student_enrollments e
    join classrooms c on c.id = e.classroom_id
    join class_levels cl on cl.code = e.class_level_code
    where e.academic_year_id = p_from_year_id
      and e.status = 'active'
  loop
    v_next_seq := r.cur_seq + 1;

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

-- ========== clone_gradebook_structure ==========
create or replace function clone_gradebook_structure(
  p_source_gradebook_id uuid,
  p_target_assignment_id uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_new_id uuid;
  v_teacher uuid;
  v_semester uuid;
  v_roster jsonb;
begin
  select teacher_id, semester_id
    into v_teacher, v_semester
  from teaching_assignments where id = p_target_assignment_id;

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
