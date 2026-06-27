-- unique indexes สำหรับ seed หลักสูตรแบบ idempotent
create unique index if not exists idx_curr_std_unique
  on curriculum_standards(learning_area, class_level_code, standard_code);

create unique index if not exists idx_curr_ind_unique
  on curriculum_indicators(standard_id, indicator_code);

-- view สำหรับ dashboard ผู้บริหาร (§6.3)
create or replace view v_gradebook_overview
with (security_invoker = true) as
select
  g.id                                   as gradebook_id,
  g.teacher_id,
  p.full_name                            as teacher_name,
  p.school_id,
  ta.semester_id,
  sem.semester_number,
  ay.id                                  as academic_year_id,
  ay.year_be,
  c.id                                   as classroom_id,
  c.name                                 as classroom_name,
  c.class_level_code,
  cl.stage,
  s.learning_area,
  s.subject_code,
  s.subject_name,
  g.status,
  (g.stats->>'completionPercent')::numeric as completion_percent,
  (g.stats->>'studentCount')::int          as student_count,
  (g.stats->>'avgScore')::numeric          as avg_score,
  (g.stats->>'passRate')::numeric          as pass_rate,
  (g.stats->>'attendanceRate')::numeric    as attendance_rate,
  (g.stats->>'behaviorAvg')::numeric       as behavior_avg,
  (g.stats->>'analyticalAvg')::numeric     as analytical_avg
from gradebooks g
join teaching_assignments ta on ta.id = g.teaching_assignment_id
join profiles p on p.id = g.teacher_id
join semesters sem on sem.id = ta.semester_id
join academic_years ay on ay.id = sem.academic_year_id
join classrooms c on c.id = ta.classroom_id
join class_levels cl on cl.code = c.class_level_code
join subjects s on s.id = ta.subject_id
where g.deleted_at is null;

grant select on v_gradebook_overview to authenticated;
