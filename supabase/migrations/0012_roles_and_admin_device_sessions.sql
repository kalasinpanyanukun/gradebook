-- Split elevated roles and track active admin account devices.

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'admin', 'teacher', 'executive'));

create or replace function public.current_role_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('super_admin', 'admin')
      and is_active = true
  );
$$;

create or replace function public.is_admin_or_exec() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('super_admin', 'admin', 'executive')
      and is_active = true
  );
$$;

create table if not exists public.admin_device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id text not null,
  user_agent text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create index if not exists admin_device_sessions_user_seen_idx
  on public.admin_device_sessions (user_id, last_seen_at desc);

alter table public.admin_device_sessions enable row level security;

drop policy if exists admin_device_sessions_select on public.admin_device_sessions;
drop policy if exists admin_device_sessions_insert on public.admin_device_sessions;
drop policy if exists admin_device_sessions_update on public.admin_device_sessions;
drop policy if exists admin_device_sessions_delete on public.admin_device_sessions;

create policy admin_device_sessions_select
  on public.admin_device_sessions
  for select
  using (
    public.is_admin_or_exec()
    and (
      user_id = auth.uid()
      or public.current_role_is_admin()
    )
  );

create policy admin_device_sessions_insert
  on public.admin_device_sessions
  for insert
  with check (
    public.is_admin_or_exec()
    and user_id = auth.uid()
  );

create policy admin_device_sessions_update
  on public.admin_device_sessions
  for update
  using (
    public.is_admin_or_exec()
    and user_id = auth.uid()
  )
  with check (
    public.is_admin_or_exec()
    and user_id = auth.uid()
  );

create policy admin_device_sessions_delete
  on public.admin_device_sessions
  for delete
  using (
    public.is_admin_or_exec()
    and user_id = auth.uid()
  );
