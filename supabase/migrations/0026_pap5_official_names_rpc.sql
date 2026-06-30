-- ดึงชื่อผู้ลงนามหน้าปก ปพ.5 สำหรับครู โดยไม่ต้องเปิดสิทธิ์อ่าน profiles ทั้งตาราง

create or replace function public.get_pap5_official_names(
  p_school_id uuid,
  p_learning_area text
)
returns table (
  head_of_learning_area text,
  head_of_evaluation text,
  deputy_director text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    concat_ws(' ', nullif(lah_profile.title, ''), nullif(lah_profile.full_name, '')) as head_of_learning_area,
    concat_ws(' ', nullif(evaluation_profile.title, ''), nullif(evaluation_profile.full_name, '')) as head_of_evaluation,
    concat_ws(' ', nullif(deputy_profile.title, ''), nullif(deputy_profile.full_name, '')) as deputy_director
  from (select p_school_id as school_id) requested
  left join public.school_learning_area_heads lah
    on lah.school_id = requested.school_id
    and regexp_replace(coalesce(lah.learning_area, ''), '[[:space:]]+', '', 'g')
      = regexp_replace(coalesce(p_learning_area, ''), '[[:space:]]+', '', 'g')
  left join public.profiles lah_profile
    on lah_profile.id = lah.teacher_id
  left join public.school_pap5_officials officials
    on officials.school_id = requested.school_id
  left join public.profiles evaluation_profile
    on evaluation_profile.id = officials.head_of_evaluation_id
  left join public.profiles deputy_profile
    on deputy_profile.id = officials.deputy_director_id
  where requested.school_id = public.current_school_id()
  limit 1;
$$;

grant execute on function public.get_pap5_official_names(uuid, text) to authenticated;

create or replace function public.sync_pap5_official_names_to_gradebooks(
  p_school_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_count integer := 0;
begin
  if not public.current_role_is_admin() or p_school_id <> public.current_school_id() then
    raise exception 'not authorized';
  end if;

  with assignment_officials as (
    select
      g.id as gradebook_id,
      concat_ws(' ', nullif(lah_profile.title, ''), nullif(lah_profile.full_name, '')) as head_of_learning_area,
      concat_ws(' ', nullif(evaluation_profile.title, ''), nullif(evaluation_profile.full_name, '')) as head_of_evaluation,
      concat_ws(' ', nullif(deputy_profile.title, ''), nullif(deputy_profile.full_name, '')) as deputy_director
    from public.gradebooks g
    join public.teaching_assignments ta
      on ta.id = g.teaching_assignment_id
    left join public.subjects subject
      on subject.id = ta.subject_id
    left join public.school_learning_area_heads lah
      on lah.school_id = ta.school_id
      and regexp_replace(coalesce(lah.learning_area, ''), '[[:space:]]+', '', 'g')
        = regexp_replace(coalesce(subject.learning_area, ''), '[[:space:]]+', '', 'g')
    left join public.profiles lah_profile
      on lah_profile.id = lah.teacher_id
    left join public.school_pap5_officials officials
      on officials.school_id = ta.school_id
    left join public.profiles evaluation_profile
      on evaluation_profile.id = officials.head_of_evaluation_id
    left join public.profiles deputy_profile
      on deputy_profile.id = officials.deputy_director_id
    where ta.school_id = p_school_id
      and g.deleted_at is null
  ),
  updated as (
    update public.gradebooks g
    set general_info =
      jsonb_set(
        jsonb_set(
          jsonb_set(
            coalesce(g.general_info, '{}'::jsonb),
            '{headOfLearningArea}',
            to_jsonb(assignment_officials.head_of_learning_area),
            true
          ),
          '{headOfEvaluation}',
          to_jsonb(assignment_officials.head_of_evaluation),
          true
        ),
        '{deputyDirector}',
        to_jsonb(assignment_officials.deputy_director),
        true
      )
    from assignment_officials
    where g.id = assignment_officials.gradebook_id
      and (
        g.general_info->>'headOfLearningArea' is distinct from assignment_officials.head_of_learning_area
        or g.general_info->>'headOfEvaluation' is distinct from assignment_officials.head_of_evaluation
        or g.general_info->>'deputyDirector' is distinct from assignment_officials.deputy_director
      )
    returning g.id
  )
  select count(*) into v_updated_count from updated;

  return v_updated_count;
end;
$$;

grant execute on function public.sync_pap5_official_names_to_gradebooks(uuid) to authenticated;
