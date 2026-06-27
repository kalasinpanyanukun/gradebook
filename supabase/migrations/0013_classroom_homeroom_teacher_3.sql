alter table public.classrooms
  add column if not exists homeroom_teacher_3_id uuid references public.profiles(id) on delete set null;

comment on column public.classrooms.homeroom_teacher_3_id
  is 'ครูประจำชั้นคนที่ 3';
