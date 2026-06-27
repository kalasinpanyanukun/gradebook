alter table teaching_assignments
  add column if not exists entry_start_date date,
  add column if not exists entry_end_date date;

comment on column teaching_assignments.entry_start_date is 'วันที่เริ่มเปิดให้ครูลงข้อมูล ปพ.5';
comment on column teaching_assignments.entry_end_date is 'วันที่สิ้นสุดการลงข้อมูล ปพ.5';
