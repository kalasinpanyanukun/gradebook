-- seed มาตรฐานการเรียนรู้ (idempotent)



insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ป.1', 'ค 1.1', 'เข้าใจความหลากหลายของการแสดงจำนวน ระบบจำนวน การดำเนินการของจำนวน ผลที่เกิดขึ้นจากการดำเนินการ สมบัติของการดำเนินการ และนำไปใช้')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ป.1', 'ค 1.2', 'เข้าใจและวิเคราะห์แบบรูป ความสัมพันธ์ ฟังก์ชัน ลำดับและอนุกรม และนำไปใช้')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ป.1', 'ค 2.1', 'เข้าใจพื้นฐานเกี่ยวกับการวัด วัดและคาดคะเนขนาดของสิ่งที่ต้องการวัด และนำไปใช้')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ป.1', 'ค 2.2', 'เข้าใจและวิเคราะห์รูปเรขาคณิต สมบัติของรูปเรขาคณิต ความสัมพันธ์ระหว่างรูปเรขาคณิต และทฤษฎีบททางเรขาคณิต และนำไปใช้')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ป.1', 'ค 3.1', 'เข้าใจกระบวนการทางสถิติ และใช้ความรู้ทางสถิติในการแก้ปัญหา')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ป.2', 'ค 1.1', 'เข้าใจความหลากหลายของการแสดงจำนวน ระบบจำนวน การดำเนินการของจำนวน ผลที่เกิดขึ้นจากการดำเนินการ สมบัติของการดำเนินการ และนำไปใช้')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ป.2', 'ค 2.1', 'เข้าใจพื้นฐานเกี่ยวกับการวัด วัดและคาดคะเนขนาดของสิ่งที่ต้องการวัด และนำไปใช้')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ป.2', 'ค 2.2', 'เข้าใจและวิเคราะห์รูปเรขาคณิต สมบัติของรูปเรขาคณิต ความสัมพันธ์ระหว่างรูปเรขาคณิต และทฤษฎีบททางเรขาคณิต และนำไปใช้')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ป.2', 'ค 3.1', 'เข้าใจกระบวนการทางสถิติ และใช้ความรู้ทางสถิติในการแก้ปัญหา')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ป.3', 'ค 1.1', 'เข้าใจความหลากหลายของการแสดงจำนวน ระบบจำนวน การดำเนินการของจำนวน ผลที่เกิดขึ้นจากการดำเนินการ สมบัติของการดำเนินการ และนำไปใช้')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ป.3', 'ค 1.2', 'เข้าใจและวิเคราะห์แบบรูป ความสัมพันธ์ ฟังก์ชัน ลำดับและอนุกรม และนำไปใช้')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ป.3', 'ค 2.1', 'เข้าใจพื้นฐานเกี่ยวกับการวัด วัดและคาดคะเนขนาดของสิ่งที่ต้องการวัด และนำไปใช้')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ป.3', 'ค 2.2', 'เข้าใจและวิเคราะห์รูปเรขาคณิต สมบัติของรูปเรขาคณิต ความสัมพันธ์ระหว่างรูปเรขาคณิต และทฤษฎีบททางเรขาคณิต และนำไปใช้')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ป.3', 'ค 3.1', 'เข้าใจกระบวนการทางสถิติ และใช้ความรู้ทางสถิติในการแก้ปัญหา')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์และเทคโนโลยี', 'ป.1', 'ว 1.1', 'เข้าใจความหลากหลายของระบบนิเวศ ความสัมพันธ์ระหว่างสิ่งไม่มีชีวิตกับสิ่งมีชีวิต และความสัมพันธ์ระหว่างสิ่งมีชีวิตกับสิ่งมีชีวิตต่างๆ ในระบบนิเวศ การถ่ายทอดพลังงาน การเปลี่ยนแปลงแทนที่ในระบบนิเวศ ความหมายของประชากร ปัญหาและผลกระทบที่มีต่อทรัพยากรธรรมชาติและสิ่งแวดล้อม แนวทางในการอนุรักษ์ทรัพยากรธรรมชาติและการแก้ไขปัญหาสิ่งแวดล้อม รวมทั้งนำความรู้ไปใช้ประโยชน์')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์และเทคโนโลยี', 'ป.1', 'ว 1.2', 'เข้าใจสมบัติของสิ่งมีชีวิต หน่วยพื้นฐานของสิ่งมีชีวิต การลำเลียงสารเข้าและออกจากเซลล์ ความสัมพันธ์ของโครงสร้างและหน้าที่ของระบบต่างๆ ของสัตว์และมนุษย์ที่ทำงานสัมพันธ์กัน ความสัมพันธ์ของโครงสร้างและหน้าที่ของอวัยวะต่างๆ ของพืชที่ทำงานสัมพันธ์กัน รวมทั้งนำความรู้ไปใช้ประโยชน์')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์และเทคโนโลยี', 'ป.1', 'ว 4.2', 'เข้าใจและใช้แนวคิดเชิงคำนวณในการแก้ปัญหาที่พบในชีวิตจริงอย่างเป็นขั้นตอนและเป็นระบบ ใช้เทคโนโลยีสารสนเทศและการสื่อสารในการเรียนรู้ การทำงาน และการแก้ปัญหาได้อย่างมีประสิทธิภาพ รู้เท่าทัน และมีจริยธรรม')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์และเทคโนโลยี', 'ป.2', 'ว 4.2', 'เข้าใจและใช้แนวคิดเชิงคำนวณในการแก้ปัญหาที่พบในชีวิตจริงอย่างเป็นขั้นตอนและเป็นระบบ ใช้เทคโนโลยีสารสนเทศและการสื่อสารในการเรียนรู้ การทำงาน และการแก้ปัญหาได้อย่างมีประสิทธิภาพ รู้เท่าทัน และมีจริยธรรม')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์และเทคโนโลยี', 'ป.3', 'ว 4.2', 'เข้าใจและใช้แนวคิดเชิงคำนวณในการแก้ปัญหาที่พบในชีวิตจริงอย่างเป็นขั้นตอนและเป็นระบบ ใช้เทคโนโลยีสารสนเทศและการสื่อสารในการเรียนรู้ การทำงาน และการแก้ปัญหาได้อย่างมีประสิทธิภาพ รู้เท่าทัน และมีจริยธรรม')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์และเทคโนโลยี', 'ป.4', 'ว 4.2', 'เข้าใจและใช้แนวคิดเชิงคำนวณในการแก้ปัญหาที่พบในชีวิตจริงอย่างเป็นขั้นตอนและเป็นระบบ ใช้เทคโนโลยีสารสนเทศและการสื่อสารในการเรียนรู้ การทำงาน และการแก้ปัญหาได้อย่างมีประสิทธิภาพ รู้เท่าทัน และมีจริยธรรม')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์และเทคโนโลยี', 'ป.5', 'ว 4.2', 'เข้าใจและใช้แนวคิดเชิงคำนวณในการแก้ปัญหาที่พบในชีวิตจริงอย่างเป็นขั้นตอนและเป็นระบบ ใช้เทคโนโลยีสารสนเทศและการสื่อสารในการเรียนรู้ การทำงาน และการแก้ปัญหาได้อย่างมีประสิทธิภาพ รู้เท่าทัน และมีจริยธรรม')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์และเทคโนโลยี', 'ป.6', 'ว 4.2', 'เข้าใจและใช้แนวคิดเชิงคำนวณในการแก้ปัญหาที่พบในชีวิตจริงอย่างเป็นขั้นตอนและเป็นระบบ ใช้เทคโนโลยีสารสนเทศและการสื่อสารในการเรียนรู้ การทำงาน และการแก้ปัญหาได้อย่างมีประสิทธิภาพ รู้เท่าทัน และมีจริยธรรม')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์และเทคโนโลยี', 'ม.1', 'ว 4.2', 'เข้าใจและใช้แนวคิดเชิงคำนวณในการแก้ปัญหาที่พบในชีวิตจริงอย่างเป็นขั้นตอนและเป็นระบบ ใช้เทคโนโลยีสารสนเทศและการสื่อสารในการเรียนรู้ การทำงาน และการแก้ปัญหาได้อย่างมีประสิทธิภาพ รู้เท่าทัน และมีจริยธรรม')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์และเทคโนโลยี', 'ม.2', 'ว 4.2', 'เข้าใจและใช้แนวคิดเชิงคำนวณในการแก้ปัญหาที่พบในชีวิตจริงอย่างเป็นขั้นตอนและเป็นระบบ ใช้เทคโนโลยีสารสนเทศและการสื่อสารในการเรียนรู้ การทำงาน และการแก้ปัญหาได้อย่างมีประสิทธิภาพ รู้เท่าทัน และมีจริยธรรม')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์และเทคโนโลยี', 'ม.3', 'ว 4.2', 'เข้าใจและใช้แนวคิดเชิงคำนวณในการแก้ปัญหาที่พบในชีวิตจริงอย่างเป็นขั้นตอนและเป็นระบบ ใช้เทคโนโลยีสารสนเทศและการสื่อสารในการเรียนรู้ การทำงาน และการแก้ปัญหาได้อย่างมีประสิทธิภาพ รู้เท่าทัน และมีจริยธรรม')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์และเทคโนโลยี', 'ม.4', 'ว 4.2', 'เข้าใจและใช้แนวคิดเชิงคำนวณในการแก้ปัญหาที่พบในชีวิตจริงอย่างเป็นขั้นตอนและเป็นระบบ ใช้เทคโนโลยีสารสนเทศและการสื่อสารในการเรียนรู้ การทำงาน และการแก้ปัญหาได้อย่างมีประสิทธิภาพ รู้เท่าทัน และมีจริยธรรม')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์และเทคโนโลยี', 'ม.5', 'ว 4.2', 'เข้าใจและใช้แนวคิดเชิงคำนวณในการแก้ปัญหาที่พบในชีวิตจริงอย่างเป็นขั้นตอนและเป็นระบบ ใช้เทคโนโลยีสารสนเทศและการสื่อสารในการเรียนรู้ การทำงาน และการแก้ปัญหาได้อย่างมีประสิทธิภาพ รู้เท่าทัน และมีจริยธรรม')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์และเทคโนโลยี', 'ม.6', 'ว 4.2', 'เข้าใจและใช้แนวคิดเชิงคำนวณในการแก้ปัญหาที่พบในชีวิตจริงอย่างเป็นขั้นตอนและเป็นระบบ ใช้เทคโนโลยีสารสนเทศและการสื่อสารในการเรียนรู้ การทำงาน และการแก้ปัญหาได้อย่างมีประสิทธิภาพ รู้เท่าทัน และมีจริยธรรม')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('ภาษาไทย', 'ม.3', 'ท 1.1', 'ใช้กระบวนการอ่านสร้างความรู้และความคิดเพื่อนำไปใช้ตัดสินใจ แก้ปัญหาในการดำเนินชีวิตและมีนิสัยรักการอ่าน')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('ภาษาไทย', 'ม.3', 'ท 2.1', 'ใช้กระบวนการเขียนเขียนสื่อสาร เขียนเรียงความ ย่อความ และเขียนเรื่องราวในรูปแบบต่างๆ เขียนรายงานข้อมูลสารสนเทศและรายงานการศึกษาค้นคว้าอย่างมีประสิทธิภาพ')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('ภาษาไทย', 'ม.3', 'ท 3.1', 'สามารถเลือกฟังและดูอย่างมีวิจารณญาณ และพูดแสดงความรู้ ความคิด และความรู้สึกในโอกาสต่างๆ อย่างมีวิจารณญาณและสร้างสรรค์')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('ภาษาไทย', 'ม.3', 'ท 4.1', 'เข้าใจธรรมชาติของภาษาและหลักภาษาไทย การเปลี่ยนแปลงของภาษาและพลังของภาษา ภูมิปัญญาทางภาษา และรักษาภาษาไทยไว้เป็นสมบัติของชาติ')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('ภาษาไทย', 'ม.3', 'ท 5.1', 'เข้าใจและแสดงความคิดเห็น วิจารณ์วรรณคดีและวรรณกรรมไทยอย่างเห็นคุณค่าและนำมาประยุกต์ใช้ในชีวิตจริง')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ม.3', 'ค 1.2', 'เข้าใจและวิเคราะห์แบบรูป ความสัมพันธ์ ฟังก์ชัน ลำดับและอนุกรม และนำไปใช้')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ม.3', 'ค 1.3', 'ใช้นิพจน์ สมการ และอสมการ อธิบายความสัมพันธ์หรือช่วยแก้ปัญหาที่กำหนดให้')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ม.3', 'ค 2.1', 'เข้าใจพื้นฐานเกี่ยวกับการวัด วัดและคาดคะเนขนาดของสิ่งที่ต้องการวัด และนำไปใช้')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ม.3', 'ค 2.2', 'เข้าใจและวิเคราะห์รูปเรขาคณิต สมบัติของรูปเรขาคณิต ความสัมพันธ์ระหว่างรูปเรขาคณิต และทฤษฎีบททางเรขาคณิต และนำไปใช้')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ม.3', 'ค 3.1', 'เข้าใจกระบวนการทางสถิติ และใช้ความรู้ทางสถิติในการแก้ปัญหา')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('คณิตศาสตร์', 'ม.3', 'ค 3.2', 'เข้าใจหลักการนับเบื้องต้น ความน่าจะเป็น และนำไปใช้')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์', 'ม.3', 'ว 1.1', 'เข้าใจความหลากหลายของระบบนิเวศ ความสัมพันธ์ระหว่างสิ่งไม่มีชีวิตกับสิ่งมีชีวิต และความสัมพันธ์ระหว่างสิ่งมีชีวิตกับสิ่งมีชีวิตต่างๆ ในระบบนิเวศ การถ่ายทอดพลังงาน การเปลี่ยนแปลงแทนที่ในระบบนิเวศ ความหมายของประชากร ปัญหาและผลกระทบที่มีต่อทรัพยากรธรรมชาติและสิ่งแวดล้อม แนวทางในการอนุรักษ์ทรัพยากรธรรมชาติและการแก้ไขปัญหสิ่งแวดล้อม รวมทั้งนำความรู้ไปใช้ประโยชน์')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์', 'ม.3', 'ว 1.3', 'เข้าใจกระบวนการและความสำคัญของการถ่ายทอดลักษณะทางพันธุกรรม สารพันธุกรรม การเปลี่ยนแปลงทางพันธุกรรมที่มีผลต่อสิ่งมีชีวิต ความหลากหลายทางชีวภาพและวิวัฒนาการของสิ่งมีชีวิต รวมทั้งนำความรู้ไปใช้ประโยชน์')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์', 'ม.3', 'ว 2.1', 'เข้าใจสมบัติของสสาร องค์ประกอบของสสาร ความสัมพันธ์ระหว่างสมบัติของสสารกับโครงสร้างและแรงยึดเหนี่ยวระหว่างอนุภาค หลักและธรรมชาติของการเปลี่ยนแปลงสถานะของสสาร การเกิดสารละลาย และการเกิดปฏิกิริยาเคมี')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์', 'ม.3', 'ว 2.3', 'เข้าใจความหมายของพลังงาน การเปลี่ยนแปลงและการถ่ายโอนพลังงาน ปฏิสัมพันธ์ระหว่างสสารและพลังงาน พลังงานในชีวิตประจำวัน ธรรมชาติของคลื่น ปรากฏการณ์ที่เกี่ยวข้องกับเสียง แสง และคลื่นแม่เหล็กไฟฟ้า รวมทั้งนำความรู้ไปใช้ประโยชน์')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์', 'ม.3', 'ว 3.1', 'เข้าใจองค์ประกอบ ลักษณะ กระบวนการเกิด และวิวัฒนาการของเอกภพ กาแล็กซี ดาวฤกษ์ และระบบสุริยะ รวมทั้งปฏิสัมพันธ์ภายในระบบสุริยะที่ส่งผลต่อสิ่งมีชีวิต และการประยุกต์ใช้เทคโนโลยีอวกาศ')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('สังคมศึกษา ศาสนา และวัฒนธรรม', 'ม.3', 'ส 1.1', 'รู้ และเข้าใจประวัติ ความสำคัญ ศาสดา หลักธรรมของพระพุทธศาสนาหรือศาสนาที่ตนนับถือและศาสนาอื่น มีศรัทธาที่ถูกต้อง ยึดมั่น และปฏิบัติตามหลักธรรม เพื่ออยู่ร่วมกันอย่างสันติสุข')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('สังคมศึกษา ศาสนา และวัฒนธรรม', 'ม.3', 'ส 1.2', 'เข้าใจ ตระหนักและปฏิบัติตนเป็นศาสนิกชนที่ดี และธำรงรักษาพระพุทธศาสนาหรือศาสนาที่ตนนับถือ')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('สังคมศึกษา ศาสนา และวัฒนธรรม', 'ม.3', 'ส 2.1', 'เข้าใจและปฏิบัติตนตามหน้าที่ของการเป็นพลเมืองดี มีค่านิยมที่ดีงาม และธำรงรักษาประเพณีและวัฒนธรรมไทย ดำรงชีวิตอยู่ร่วมกันในสังคมไทยและสังคมโลกอย่างสันติสุข')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('สังคมศึกษา ศาสนา และวัฒนธรรม', 'ม.3', 'ส 2.2', 'เข้าใจระบบการเมืองการปกครองในสังคมปัจจุบัน ยึดมั่น ศรัทธา และธำรงรักษาไว้ซึ่งการปกครองระบอบประชาธิปไตยอันมีพระมหากษัตริย์ทรงเป็นประมุข')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('สังคมศึกษา ศาสนา และวัฒนธรรม', 'ม.3', 'ส 3.1', 'เข้าใจและสามารถบริหารจัดการทรัพยากรในการผลิตและการบริโภค การใช้ทรัพยากรที่มีอยู่จำกัดได้อย่างมีประสิทธิภาพและคุ้มค่า รวมทั้งเข้าใจหลักการของเศรษฐกิจพอเพียง เพื่อการดำรงชีวิตอย่างมีดุลยภาพ')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('สังคมศึกษา ศาสนา และวัฒนธรรม', 'ม.3', 'ส 3.2', 'เข้าใจระบบและสถาบันทางเศรษฐกิจต่างๆ ความสัมพันธ์ทางเศรษฐกิจและความจำเป็นของการร่วมมือกันทางเศรษฐกิจในสังคมโลก')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('สังคมศึกษา ศาสนา และวัฒนธรรม', 'ม.3', 'ส 4.1', 'เข้าใจความหมาย ความสำคัญของเวลาและยุคสมัยทางประวัติศาสตร์ สามารถใช้วิธีการทางประวัติศาสตร์มาวิเคราะห์เหตุการณ์ต่างๆ อย่างเป็นระบบ')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('สังคมศึกษา ศาสนา และวัฒนธรรม', 'ม.3', 'ส 4.2', 'เข้าใจพัฒนาการของมนุษยชาติจากอดีตจนถึงปัจจุบัน ในด้านความสัมพันธ์และการเปลี่ยนแปลงของเหตุการณ์อย่างต่อเนื่อง ตระหนักถึงความสำคัญและสามารถวิเคราะห์ผลกระทบที่เกิดขึ้น')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('สังคมศึกษา ศาสนา และวัฒนธรรม', 'ม.3', 'ส 4.3', 'เข้าใจความเป็นมาของชาติไทย วัฒนธรรม ภูมิปัญญาไทย มีความรัก ความภูมิใจและธำรงความเป็นไทย')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('สังคมศึกษา ศาสนา และวัฒนธรรม', 'ม.3', 'ส 5.1', 'เข้าใจลักษณะทางกายภาพของโลกและความสัมพันธ์ของสรรพสิ่งซึ่งมีผลต่อกัน ใช้แผนที่และเครื่องมือทางภูมิศาสตร์ในการค้นหา วิเคราะห์ และสรุปข้อมูลตามกระบวนการทางภูมิศาสตร์ ตลอดจนใช้ภูมิสารสนเทศอย่างมีประสิทธิภาพ')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('สังคมศึกษา ศาสนา และวัฒนธรรม', 'ม.3', 'ส 5.2', 'เข้าใจปฏิสัมพันธ์ระหว่างมนุษย์กับสิ่งแวดล้อมทางกายภาพที่ก่อให้เกิดการสร้างสรรค์วิถีการดำเนินชีวิต มีจิตสำนึกและมีส่วนร่วมในการจัดการทรัพยากร และสิ่งแวดล้อมเพื่อการพัฒนาที่ยั่งยืน')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('สุขศึกษาและพลศึกษา', 'ม.3', 'พ 1.1', 'เข้าใจธรรมชาติของการเจริญเติบโตและพัฒนาการของมนุษย์')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('สุขศึกษาและพลศึกษา', 'ม.3', 'พ 2.1', 'เข้าใจและเห็นคุณค่าตนเอง ครอบครัว เพศศึกษา และมีทักษะในการดำเนินชีวิต')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('สุขศึกษาและพลศึกษา', 'ม.3', 'พ 3.1', 'เข้าใจ มีทักษะในการเคลื่อนไหว กิจกรรมทางกาย การเล่นเกม และกีฬา')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('สุขศึกษาและพลศึกษา', 'ม.3', 'พ 3.2', 'รักการออกกำลังกาย การเล่นเกม และการเล่นกีฬา ปฏิบัติเป็นประจำอย่างสม่ำเสมอ มีวินัย เคารพสิทธิ กฎ กติกา มีน้ำใจนักกีฬา มีจิตวิญญาณในการแข่งขัน และชื่นชมในสุนทรียภาพของการกีฬา')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('สุขศึกษาและพลศึกษา', 'ม.3', 'พ 4.1', 'เห็นคุณค่าและมีทักษะในการสร้างเสริมสุขภาพ การดำรงสุขภาพ การป้องกันโรค และการสร้างเสริมสมรรถภาพเพื่อสุขภาพ')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('สุขศึกษาและพลศึกษา', 'ม.3', 'พ 5.1', 'ป้องกันและหลีกเลี่ยงปัจจัยเสี่ยง พฤติกรรมเสี่ยงต่อสุขภาพ อุบัติเหตุ การใช้ยา สารเสพติด และความรุนแรง')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('ศิลปะ', 'ม.3', 'ศ 1.1', 'สร้างสรรค์งานทัศนศิลป์ตามจินตนาการ และความคิดสร้างสรรค์ วิเคราะห์ วิพากษ์ วิจารณ์คุณค่างานทัศนศิลป์ ถ่ายทอดความรู้สึก ความคิดต่องานศิลปะอย่างอิสระ ชื่นชม และประยุกต์ใช้ในชีวิตประจำวัน')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('ศิลปะ', 'ม.3', 'ศ 1.2', 'เข้าใจความสัมพันธ์ระหว่างทัศนศิลป์ ประวัติศาสตร์ และวัฒนธรรม เห็นคุณค่างานทัศนศิลป์ที่เป็นมรดกทางวัฒนธรรม ภูมิปัญญาท้องถิ่น ภูมิปัญญาไทย และสากล')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('ศิลปะ', 'ม.3', 'ศ 2.1', 'เข้าใจและแสดงออกทางดนตรีอย่างสร้างสรรค์ วิเคราะห์ วิพากษ์วิจารณ์คุณค่าดนตรี ถ่ายทอดความรู้สึก ความคิดต่อดนตรีอย่างอิสระ ชื่นชม และประยุกต์ใช้ในชีวิตประจำวัน')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('ศิลปะ', 'ม.3', 'ศ 2.2', 'เข้าใจความสัมพันธ์ระหว่างดนตรี ประวัติศาสตร์ และวัฒนธรรม เห็นคุณค่าของดนตรีที่เป็นมรดกทางวัฒนธรรม ภูมิปัญญาท้องถิ่น ภูมิปัญญาไทยและสากล')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('ศิลปะ', 'ม.3', 'ศ 3.1', 'เข้าใจ และแสดงออกทางนาฏศิลป์อย่างสร้างสรรค์ วิเคราะห์ วิพากษ์วิจารณ์คุณค่านาฏศิลป์ ถ่ายทอดความรู้สึก ความคิดอย่างอิสระ ชื่นชม และประยุกต์ใช้ในชีวิตประจำวัน')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('ศิลปะ', 'ม.3', 'ศ 3.2', 'เข้าใจความสัมพันธ์ระหว่างนาฏศิลป์ ประวัติศาสตร์และวัฒนธรรม เห็นคุณค่าของนาฏศิลป์ที่เป็นมรดกทางวัฒนธรรม ภูมิปัญญาท้องถิ่น ภูมิปัญญาไทยและสากล')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('ภาษาต่างประเทศ', 'ม.3', 'ต 1.1', 'เข้าใจและตีความเรื่องที่ฟังและอ่านจากสื่อประเภทต่างๆ และแสดงความคิดเห็นอย่างมีเหตุผล')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('ภาษาต่างประเทศ', 'ม.3', 'ต 1.2', 'มีทักษะการสื่อสารทางภาษาในการแลกเปลี่ยนข้อมูลข่าวสาร แสดงความรู้สึกและความคิดเห็นอย่างมีประสิทธิภาพ')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('ภาษาต่างประเทศ', 'ม.3', 'ต 1.3', 'นำเสนอข้อมูลข่าวสาร ความคิดรวบยอด และความคิดเห็นในเรื่องต่างๆ โดยการพูดและการเขียน')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('ภาษาต่างประเทศ', 'ม.3', 'ต 2.1', 'เข้าใจความสัมพันธ์ระหว่างภาษากับวัฒนธรรมของเจ้าของภาษา และนำไปใช้ได้อย่างเหมาะสมกับกาลเทศะ')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('ภาษาต่างประเทศ', 'ม.3', 'ต 2.2', 'เข้าใจความเหมือนและความแตกต่างระหว่างภาษาและวัฒนธรรมของเจ้าของภาษากับภาษาและวัฒนธรรมไทย และนำมาใช้อย่างถูกต้องและเหมาะสม')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('ภาษาต่างประเทศ', 'ม.3', 'ต 3.1', 'ใช้ภาษาต่างประเทศในการเชื่อมโยงความรู้กับกลุ่มสาระการเรียนรู้อื่น และเป็นพื้นฐานในการพัฒนา แสวงหาความรู้ และเปิดโลกทัศน์ของตน')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('ภาษาต่างประเทศ', 'ม.3', 'ต 4.1', 'ใช้ภาษาต่างประเทศในสถานการณ์ต่างๆ ทั้งในสถานศึกษา ชุมชน และสังคม')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('ภาษาต่างประเทศ', 'ม.3', 'ต 4.2', 'ใช้ภาษาต่างประเทศเป็นเครื่องมือพื้นฐานในการศึกษาต่อ การประกอบอาชีพ และการแลกเปลี่ยนเรียนรู้กับสังคมโลก')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('การงานอาชีพ', 'ม.3', 'ง 1.1', 'เข้าใจการทำงาน มีความคิดสร้างสรรค์ มีทักษะกระบวนการทำงาน ทักษะการจัดการ ทักษะกระบวนการแก้ปัญหา ทักษะการทำงานร่วมกัน และทักษะการแสวงหาความรู้ มีคุณธรรม และลักษณะนิสัยในการทำงาน มีจิตสำนึกในการใช้พลังงาน ทรัพยากร และสิ่งแวดล้อม เพื่อการดำรงชีวิตและครอบครัว')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('การงานอาชีพ', 'ม.3', 'ง 1.2', 'มีทักษะกระบวนการทำงานและการจัดการในการทำงาน')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('การงานอาชีพ', 'ม.3', 'ง 2.1', 'เข้าใจเทคโนโลยีและกระบวนการเทคโนโลยี ออกแบบและสร้างสิ่งของเครื่องใช้ หรือวิธีการ ตามกระบวนการเทคโนโลยีอย่างมีความคิดสร้างสรรค์ เลือกใช้เทคโนโลยีในทางสร้างสรรค์ต่อชีวิต สังคม สิ่งแวดล้อม และมีส่วนร่วมในการจัดการเทคโนโลยีที่ยั่งยืน')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('การงานอาชีพ', 'ม.3', 'ง 3.1', 'เข้าใจ เห็นคุณค่า และใช้กระบวนการเทคโนโลยีสารสนเทศในการสืบค้นข้อมูล การเรียนรู้ การสื่อสาร การแก้ปัญหา การทำงาน และอาชีพอย่างมีประสิทธิภาพ ประสิทธิผล และมีคุณธรรม')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('การงานอาชีพ', 'ม.3', 'ง 4.1', 'เข้าใจ มีทักษะที่จำเป็น มีประสบการณ์ เห็นแนวทางในงานอาชีพ ใช้เทคโนโลยีเพื่อพัฒนาอาชีพ มีคุณธรรม และมีเจตคติที่ดีต่ออาชีพ')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('การงานอาชีพ', 'ม.3', 'ง.01', 'การเลี้ยงไส้เดือนดิน')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('การงานอาชีพ', 'ม.3', 'ง.02', 'การเสริมสวย')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('การงานอาชีพ', 'ม.3', 'ง.03', 'การปลูกผักไร้ดิน')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('การงานอาชีพ', 'ม.3', 'ง.04', 'การทำเครื่องดื่ม')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('การงานอาชีพ', 'ม.3', 'ง.05', 'การทำเบเกอรี่')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('การงานอาชีพ', 'ม.3', 'ง.06', 'การประกอบอาหาร')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์', 'ม.3', 'อพ.สธ. 1', 'การจัดทำป้ายชื่อพรรณไม้')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์', 'ม.3', 'อพ.สธ. 2', 'การรวบรวมพรรณไม้เข้าปลูก')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์', 'ม.3', 'อพ.สธ. 3', 'การศึกษาข้อมูลด้านต่างๆ')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์', 'ม.3', 'อพ.สธ. 4', 'การรายงานผลการเรียนรู้')
on conflict (learning_area, class_level_code, standard_code) do nothing;

insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('วิทยาศาสตร์', 'ม.3', 'อพ.สธ. 5', 'การนำไปใช้ประโยชน์')
on conflict (learning_area, class_level_code, standard_code) do nothing;
