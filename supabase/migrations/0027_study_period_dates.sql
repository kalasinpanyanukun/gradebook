alter table public.academic_years
  add column if not exists study_start_date date,
  add column if not exists study_end_date date;

comment on column public.academic_years.study_start_date is 'Global study period start date shown in teacher attendance pages.';
comment on column public.academic_years.study_end_date is 'Global study period end date shown in teacher attendance pages.';
