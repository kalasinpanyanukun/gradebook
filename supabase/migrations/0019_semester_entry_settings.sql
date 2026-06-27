alter table public.semesters
  add column if not exists grade_entry_enabled boolean not null default true,
  add column if not exists entry_start_date date,
  add column if not exists entry_end_date date;

comment on column public.semesters.grade_entry_enabled is 'เปิด/ปิดการบันทึกคะแนนในภาคเรียนนี้';
comment on column public.semesters.entry_start_date is 'วันเริ่มกรอก ปพ.5 ของภาคเรียน';
comment on column public.semesters.entry_end_date is 'วันสิ้นสุดกรอก ปพ.5 ของภาคเรียน';
