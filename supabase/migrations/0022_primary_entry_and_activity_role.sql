alter table public.academic_years
  add column if not exists primary_grade_entry_enabled boolean not null default true;

comment on column public.academic_years.primary_grade_entry_enabled
  is 'เปิด/ปิดการกรอก ปพ.5 ระดับประถมศึกษาในปีการศึกษานี้';

alter table public.activity_logs
  add column if not exists user_role text;

create or replace function public.get_system_health(p_school_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_db_size bigint;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role not in ('super_admin', 'admin', 'executive') then
    raise exception 'forbidden';
  end if;

  select pg_database_size(current_database()) into v_db_size;

  return jsonb_build_object(
    'database_bytes', v_db_size,
    'database_limit_bytes', 524288000,
    'generated_at', now(),
    'counts', jsonb_build_object(
      'profiles', (select count(*) from profiles p where p_school_id is null or p.school_id = p_school_id),
      'students', (select count(*) from students s where p_school_id is null or s.school_id = p_school_id),
      'classrooms', (
        select count(*) from classrooms c
        where p_school_id is null or c.school_id = p_school_id
      ),
      'subjects', (
        select count(*) from subjects sub
        where p_school_id is null or sub.school_id = p_school_id
      ),
      'teaching_assignments', (
        select count(*) from teaching_assignments ta
        where p_school_id is null or ta.school_id = p_school_id
      ),
      'gradebooks', (
        select count(*) from gradebooks g
        join teaching_assignments ta on ta.id = g.teaching_assignment_id
        where p_school_id is null or ta.school_id = p_school_id
      ),
      'activity_logs', (
        select count(*) from activity_logs al
        where p_school_id is null or al.school_id = p_school_id
      )
    )
  );
end;
$$;

grant execute on function public.get_system_health(uuid) to authenticated;
