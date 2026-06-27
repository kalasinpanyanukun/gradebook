alter table academic_years
  add column if not exists workspace_status text not null default 'in_progress'
  check (workspace_status in ('not_started', 'in_progress', 'completed'));

update academic_years
set
  start_date = make_date(year_be - 543, 5, 16),
  end_date = make_date(year_be - 543 + 1, 3, 31),
  term_open_date = make_date(year_be - 543, 5, 16);

update semesters s
set
  start_date = make_date(ay.year_be - 543, 5, 16),
  end_date = make_date(ay.year_be - 543, 10, 11)
from academic_years ay
where s.academic_year_id = ay.id
  and s.semester_number = 1;

update semesters s
set
  start_date = make_date(ay.year_be - 543, 11, 1),
  end_date = make_date(ay.year_be - 543 + 1, 3, 31)
from academic_years ay
where s.academic_year_id = ay.id
  and s.semester_number = 2;
