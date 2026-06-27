-- ตั้งค่าผู้ลงนามในหน้าปก ปพ.5 (หัวหน้ากลุ่มสาระ / หัวหน้างานวัดผล / รองผู้อำนวยการฝ่ายวิชาการ)

create table if not exists public.school_pap5_officials (
  school_id uuid primary key references public.schools(id) on delete cascade,
  head_of_evaluation_id uuid references public.profiles(id) on delete set null,
  deputy_director_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.school_pap5_officials is 'ผู้ลงนามหน้าปก ปพ.5 ระดับโรงเรียน (ยกเว้นหัวหน้ากลุ่มสาระที่แยกตามสาระ)';
comment on column public.school_pap5_officials.head_of_evaluation_id is 'หัวหน้างานวัดผลและประเมินผล';
comment on column public.school_pap5_officials.deputy_director_id is 'รองผู้อำนวยการฝ่ายวิชาการ';

create table if not exists public.school_learning_area_heads (
  school_id uuid not null references public.schools(id) on delete cascade,
  learning_area text not null,
  teacher_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (school_id, learning_area)
);

comment on table public.school_learning_area_heads is 'หัวหน้ากลุ่มสาระการเรียนรู้ แยกตามกลุ่มสาระ (8 กลุ่ม)';

alter table public.school_pap5_officials enable row level security;
alter table public.school_learning_area_heads enable row level security;

create policy school_pap5_officials_admin_all on public.school_pap5_officials
  for all
  using (current_role_is_admin() and school_id = current_school_id())
  with check (current_role_is_admin() and school_id = current_school_id());

create policy school_pap5_officials_school_read on public.school_pap5_officials
  for select
  using (school_id = current_school_id());

create policy school_learning_area_heads_admin_all on public.school_learning_area_heads
  for all
  using (current_role_is_admin() and school_id = current_school_id())
  with check (current_role_is_admin() and school_id = current_school_id());

create policy school_learning_area_heads_school_read on public.school_learning_area_heads
  for select
  using (school_id = current_school_id());
