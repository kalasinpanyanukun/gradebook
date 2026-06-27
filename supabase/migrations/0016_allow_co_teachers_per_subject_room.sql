-- Allow multiple teachers to be assigned to the same subject/classroom/semester.
-- The exact duplicate guard remains:
-- unique (semester_id, teacher_id, subject_id, classroom_id)
drop index if exists uniq_active_subject_room_per_semester;
