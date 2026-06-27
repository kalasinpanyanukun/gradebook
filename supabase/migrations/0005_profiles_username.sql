-- Username สำหรับ login (รหัสผ่าน = เลขบัตรประชาชน เก็บใน auth.users)
alter table profiles
  add column if not exists username text;

create unique index if not exists profiles_username_unique
  on profiles (lower(username))
  where username is not null;
