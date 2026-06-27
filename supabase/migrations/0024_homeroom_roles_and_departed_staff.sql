-- ล้างครูประจำชั้นที่มอบให้ผู้บริหาร/แอดมิน (ไม่ใช่ครู)
update public.classrooms
set
  homeroom_teacher_id = case
    when homeroom_teacher_id in (
      select id from public.profiles where role in ('super_admin', 'admin', 'executive')
    ) then null
    else homeroom_teacher_id
  end,
  homeroom_teacher_2_id = case
    when homeroom_teacher_2_id in (
      select id from public.profiles where role in ('super_admin', 'admin', 'executive')
    ) then null
    else homeroom_teacher_2_id
  end,
  homeroom_teacher_3_id = case
    when homeroom_teacher_3_id in (
      select id from public.profiles where role in ('super_admin', 'admin', 'executive')
    ) then null
    else homeroom_teacher_3_id
  end;

-- ปิดบัญชีครูที่ลาออกแล้ว (ไม่มีตัวตนในโรงเรียน)
update public.profiles
set is_active = false
where is_active = true
  and (
    full_name ilike '%นงเยาวลักษณ์%เมฆโชติ%'
    or full_name ilike '%วุฒิพร%สุขใจ%'
    or full_name ilike '%อภิญญา%พัฒนโพธิ์%'
    or full_name ilike '%ดาราลักษณ์%เอกโชติ%'
  );

-- ล้างตำแหน่งครูประจำชั้นของบัญชีที่ปิดแล้ว
update public.classrooms
set
  homeroom_teacher_id = case
    when homeroom_teacher_id in (select id from public.profiles where is_active = false) then null
    else homeroom_teacher_id
  end,
  homeroom_teacher_2_id = case
    when homeroom_teacher_2_id in (select id from public.profiles where is_active = false) then null
    else homeroom_teacher_2_id
  end,
  homeroom_teacher_3_id = case
    when homeroom_teacher_3_id in (
      select id from public.profiles where is_active = false
    ) then null
    else homeroom_teacher_3_id
  end;
