-- โรงเรียนมีข้อมูลถึง ม.6 จึงต้องให้การเลื่อนชั้นรองรับครบ 12 ระดับ
update schools
set max_level_sequence = 12
where name = 'โรงเรียนกาฬสินธุ์ปัญญานุกูล'
  and max_level_sequence < 12;
