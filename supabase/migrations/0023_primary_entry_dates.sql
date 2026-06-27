alter table public.academic_years
  add column if not exists primary_entry_start_date date,
  add column if not exists primary_entry_end_date date;

comment on column public.academic_years.primary_entry_start_date
  is 'วันเริ่มกรอก ปพ.5 ระดับประถมศึกษาในปีการศึกษานี้';

comment on column public.academic_years.primary_entry_end_date
  is 'วันสิ้นสุดกรอก ปพ.5 ระดับประถมศึกษาในปีการศึกษานี้';
