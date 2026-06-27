alter table public.semesters
  add column if not exists grade_entry_enabled boolean not null default true,
  add column if not exists entry_start_date date,
  add column if not exists entry_end_date date;

comment on column public.semesters.grade_entry_enabled is 'เปิด/ปิดการบันทึกคะแนนในภาคเรียนนี้';
comment on column public.semesters.entry_start_date is 'วันเริ่มกรอก ปพ.5 ของภาคเรียน';
comment on column public.semesters.entry_end_date is 'วันสิ้นสุดกรอก ปพ.5 ของภาคเรียน';

create or replace function public.admin_create_teacher_account(
  p_username text,
  p_password text,
  p_full_name text,
  p_title text default null,
  p_role text default 'teacher'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_caller record;
  v_user_id uuid := gen_random_uuid();
  v_email text;
  v_instance_id uuid;
  v_normalized_username text;
begin
  select role, school_id into v_caller from public.profiles where id = auth.uid();
  if v_caller.role not in ('super_admin', 'admin') then
    raise exception 'Forbidden';
  end if;

  if p_role = 'super_admin' and v_caller.role <> 'super_admin' then
    raise exception 'Only Super Admin can create Super Admin';
  end if;

  if p_role not in ('super_admin', 'admin', 'teacher', 'executive') then
    raise exception 'Invalid role';
  end if;

  v_normalized_username := lower(trim(p_username));
  if v_normalized_username = '' or trim(p_full_name) = '' then
    raise exception 'กรอกข้อมูลไม่ครบ';
  end if;

  if length(trim(p_password)) < 6 then
    raise exception 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
  end if;

  v_email := v_normalized_username || '@ksp.gradebook';

  select id into v_instance_id from auth.instances limit 1;
  if v_instance_id is null then
    raise exception 'ไม่พบ auth instance';
  end if;

  insert into auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_instance_id,
    v_email,
    crypt(trim(p_password), gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', trim(p_full_name)),
    'authenticated',
    'authenticated',
    now(),
    now()
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  insert into public.profiles (id, school_id, username, full_name, title, role, is_active)
  values (
    v_user_id,
    v_caller.school_id,
    v_normalized_username,
    trim(p_full_name),
    nullif(trim(p_title), ''),
    p_role,
    true
  );

  return jsonb_build_object('ok', true, 'id', v_user_id, 'username', v_normalized_username);
exception
  when unique_violation then
    raise exception 'username นี้มีอยู่แล้ว';
end;
$$;

grant execute on function public.admin_create_teacher_account(text, text, text, text, text) to authenticated;
