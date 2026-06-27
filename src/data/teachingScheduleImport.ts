import type { AssignmentImportRow } from '../lib/assignmentImport';

export interface TeachingScheduleImportPayload {
  generatedAt: string;
  sourceFiles: Array<{
    fileName: string;
    rowCount: number;
    classrooms: string[];
  }>;
  rows: AssignmentImportRow[];
}

export const TEACHING_SCHEDULE_IMPORT: TeachingScheduleImportPayload = {
  "generatedAt": "2026-06-17T08:12:54.146Z",
  "sourceFiles": [
    {
      "fileName": "ตารางรวม ม.1.1.2569 เพิ่มครูธีราพร.docx",
      "rowCount": 89,
      "classrooms": [
        "ม.1/1",
        "ม.1/2",
        "ม.1/3",
        "ม.1/4",
        "ม.1/5"
      ]
    }
  ],
  "rows": [
    {
      "teacherName": "ชินวัตร แก้วกาหนัน",
      "coTeacherName": "",
      "subjectCode": "ท21101",
      "subjectName": "ภาษาไทย",
      "classroomName": "ม.1/1",
      "hoursPerWeek": 3,
      "hoursPerSemester": 60
    },
    {
      "teacherName": "ชินวัตร แก้วกาหนัน",
      "coTeacherName": "",
      "subjectCode": "ค21101",
      "subjectName": "คณิตศาสตร์",
      "classroomName": "ม.1/1",
      "hoursPerWeek": 3,
      "hoursPerSemester": 60
    },
    {
      "teacherName": "ภัทราวดี พิณะเวศน์",
      "coTeacherName": "",
      "subjectCode": "ง21101",
      "subjectName": "การงานอาชีพ",
      "classroomName": "ม.1/1",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ภัทราวดี พิณะเวศน์",
      "coTeacherName": "",
      "subjectCode": "ว21102",
      "subjectName": "วิทยาการคำนวณ",
      "classroomName": "ม.1/1",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ภัทราวดี พิณะเวศน์",
      "coTeacherName": "",
      "subjectCode": "ศ21101",
      "subjectName": "ศิลปะ",
      "classroomName": "ม.1/1",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ภัทราวดี พิณะเวศน์",
      "coTeacherName": "",
      "subjectCode": "ส21103",
      "subjectName": "หน้าที่พลเมือง",
      "classroomName": "ม.1/1",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ชินวัตร แก้วกาหนัน",
      "coTeacherName": "ธีราพร เจริญยิ่ง, ทนงเดช วงษ์ประจันต์",
      "subjectCode": "อ21101",
      "subjectName": "ภาษาอังกฤษ",
      "classroomName": "ม.1/1",
      "hoursPerWeek": 3,
      "hoursPerSemester": 60
    },
    {
      "teacherName": "ธีราพร เจริญยิ่ง",
      "coTeacherName": "ชินวัตร แก้วกาหนัน, ทนงเดช วงษ์ประจันต์",
      "subjectCode": "อ21101",
      "subjectName": "ภาษาอังกฤษ",
      "classroomName": "ม.1/1",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ทนงเดช วงษ์ประจันต์",
      "coTeacherName": "ชินวัตร แก้วกาหนัน, ธีราพร เจริญยิ่ง",
      "subjectCode": "อ21101",
      "subjectName": "ภาษาอังกฤษ",
      "classroomName": "ม.1/1",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ชินวัตร แก้วกาหนัน",
      "coTeacherName": "ทนงเดช วงษ์ประจันต์, ธีราพร เจริญยิ่ง",
      "subjectCode": "ส21101",
      "subjectName": "สังคมฯ",
      "classroomName": "ม.1/1",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ทนงเดช วงษ์ประจันต์",
      "coTeacherName": "ชินวัตร แก้วกาหนัน, ธีราพร เจริญยิ่ง",
      "subjectCode": "ส21101",
      "subjectName": "สังคมฯ",
      "classroomName": "ม.1/1",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ธีราพร เจริญยิ่ง",
      "coTeacherName": "ชินวัตร แก้วกาหนัน, ทนงเดช วงษ์ประจันต์",
      "subjectCode": "ส21101",
      "subjectName": "สังคมฯ",
      "classroomName": "ม.1/1",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ชินวัตร แก้วกาหนัน",
      "coTeacherName": "ทนงเดช วงษ์ประจันต์",
      "subjectCode": "ว21101",
      "subjectName": "วิทยาศาสตร์",
      "classroomName": "ม.1/1",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ทนงเดช วงษ์ประจันต์",
      "coTeacherName": "ชินวัตร แก้วกาหนัน",
      "subjectCode": "ว21101",
      "subjectName": "วิทยาศาสตร์",
      "classroomName": "ม.1/1",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ชินวัตร แก้วกาหนัน",
      "coTeacherName": "",
      "subjectCode": "ส21102",
      "subjectName": "ประวัติศาสตร์",
      "classroomName": "ม.1/1",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ชินวัตร แก้วกาหนัน",
      "coTeacherName": "",
      "subjectCode": "ว21201",
      "subjectName": "สวนพฤกษศาสตร์",
      "classroomName": "ม.1/1",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ภัทราวดี พิณะเวศน์",
      "coTeacherName": "",
      "subjectCode": "พ21101",
      "subjectName": "สุขศึกษาและพลศึกษา",
      "classroomName": "ม.1/1",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ภัทราวดี พิณะเวศน์",
      "coTeacherName": "",
      "subjectCode": "ง21201",
      "subjectName": "พื้นฐานอาชีพ",
      "classroomName": "ม.1/1",
      "hoursPerWeek": 4,
      "hoursPerSemester": 80
    },
    {
      "teacherName": "พรนิภา สว่างศรี",
      "coTeacherName": "ธีราพร เจริญยิ่ง",
      "subjectCode": "ค21101",
      "subjectName": "คณิตศาสตร์",
      "classroomName": "ม.1/2",
      "hoursPerWeek": 3,
      "hoursPerSemester": 60
    },
    {
      "teacherName": "ธีราพร เจริญยิ่ง",
      "coTeacherName": "พรนิภา สว่างศรี",
      "subjectCode": "ค21101",
      "subjectName": "คณิตศาสตร์",
      "classroomName": "ม.1/2",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "พรนิภา สว่างศรี",
      "coTeacherName": "ธีราพร เจริญยิ่ง",
      "subjectCode": "ท21101",
      "subjectName": "ภาษาไทย",
      "classroomName": "ม.1/2",
      "hoursPerWeek": 3,
      "hoursPerSemester": 60
    },
    {
      "teacherName": "ธีราพร เจริญยิ่ง",
      "coTeacherName": "พรนิภา สว่างศรี",
      "subjectCode": "ท21101",
      "subjectName": "ภาษาไทย",
      "classroomName": "ม.1/2",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ศักดิ์ชัย ศรีวิชัย",
      "coTeacherName": "",
      "subjectCode": "ศ21101",
      "subjectName": "ศิลปะ",
      "classroomName": "ม.1/2",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ศักดิ์ชัย ศรีวิชัย",
      "coTeacherName": "",
      "subjectCode": "ส21103",
      "subjectName": "หน้าที่พลเมือง",
      "classroomName": "ม.1/2",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ศักดิ์ชัย ศรีวิชัย",
      "coTeacherName": "",
      "subjectCode": "ง21101",
      "subjectName": "การงานอาชีพ",
      "classroomName": "ม.1/2",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ศักดิ์ชัย ศรีวิชัย",
      "coTeacherName": "",
      "subjectCode": "ว21102",
      "subjectName": "วิทยาการคำนวณ",
      "classroomName": "ม.1/2",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "พรนิภา สว่างศรี",
      "coTeacherName": "",
      "subjectCode": "ว21101",
      "subjectName": "วิทยาศาสตร์",
      "classroomName": "ม.1/2",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "พรนิภา สว่างศรี",
      "coTeacherName": "ศักดิ์ชัย ศรีวิชัย",
      "subjectCode": "ส21101",
      "subjectName": "สังคมฯ",
      "classroomName": "ม.1/2",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ศักดิ์ชัย ศรีวิชัย",
      "coTeacherName": "พรนิภา สว่างศรี",
      "subjectCode": "ส21101",
      "subjectName": "สังคมฯ",
      "classroomName": "ม.1/2",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "พรนิภา สว่างศรี",
      "coTeacherName": "",
      "subjectCode": "ว21201",
      "subjectName": "สวนพฤกษศาสตร์",
      "classroomName": "ม.1/2",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "พรนิภา สว่างศรี",
      "coTeacherName": "",
      "subjectCode": "อ21101",
      "subjectName": "ภาษาอังกฤษ",
      "classroomName": "ม.1/2",
      "hoursPerWeek": 3,
      "hoursPerSemester": 60
    },
    {
      "teacherName": "ศักดิ์ชัย ศรีวิชัย",
      "coTeacherName": "",
      "subjectCode": "ง21201",
      "subjectName": "พื้นฐานอาชีพ",
      "classroomName": "ม.1/2",
      "hoursPerWeek": 4,
      "hoursPerSemester": 80
    },
    {
      "teacherName": "พรนิภา สว่างศรี",
      "coTeacherName": "ศักดิ์ชัย ศรีวิชัย",
      "subjectCode": "ส21102",
      "subjectName": "ประวัติศาสตร์",
      "classroomName": "ม.1/2",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ศักดิ์ชัย ศรีวิชัย",
      "coTeacherName": "พรนิภา สว่างศรี",
      "subjectCode": "ส21102",
      "subjectName": "ประวัติศาสตร์",
      "classroomName": "ม.1/2",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ศักดิ์ชัย ศรีวิชัย",
      "coTeacherName": "",
      "subjectCode": "พ21101",
      "subjectName": "สุขศึกษาและพลศึกษา",
      "classroomName": "ม.1/2",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ธนัชกร มูลมี",
      "coTeacherName": "",
      "subjectCode": "ส21101",
      "subjectName": "สังคมฯ",
      "classroomName": "ม.1/3",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ธนัชกร มูลมี",
      "coTeacherName": "",
      "subjectCode": "ว21101",
      "subjectName": "วิทยาศาสตร์",
      "classroomName": "ม.1/3",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ทนงเดช วงษ์ประจันต์",
      "coTeacherName": "",
      "subjectCode": "ง21201",
      "subjectName": "พื้นฐานอาชีพ",
      "classroomName": "ม.1/3",
      "hoursPerWeek": 4,
      "hoursPerSemester": 80
    },
    {
      "teacherName": "ธนัชกร มูลมี",
      "coTeacherName": "",
      "subjectCode": "ส21102",
      "subjectName": "ประวัติศาสตร์",
      "classroomName": "ม.1/3",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ธนัชกร มูลมี",
      "coTeacherName": "ธีราพร เจริญยิ่ง",
      "subjectCode": "อ21101",
      "subjectName": "ภาษาอังกฤษ",
      "classroomName": "ม.1/3",
      "hoursPerWeek": 3,
      "hoursPerSemester": 60
    },
    {
      "teacherName": "ธีราพร เจริญยิ่ง",
      "coTeacherName": "ธนัชกร มูลมี",
      "subjectCode": "อ21101",
      "subjectName": "ภาษาอังกฤษ",
      "classroomName": "ม.1/3",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ทนงเดช วงษ์ประจันต์",
      "coTeacherName": "",
      "subjectCode": "ศ21101",
      "subjectName": "ศิลปะ",
      "classroomName": "ม.1/3",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ธนัชกร มูลมี",
      "coTeacherName": "ธีราพร เจริญยิ่ง",
      "subjectCode": "ท21101",
      "subjectName": "ภาษาไทย",
      "classroomName": "ม.1/3",
      "hoursPerWeek": 3,
      "hoursPerSemester": 60
    },
    {
      "teacherName": "ธีราพร เจริญยิ่ง",
      "coTeacherName": "ธนัชกร มูลมี",
      "subjectCode": "ท21101",
      "subjectName": "ภาษาไทย",
      "classroomName": "ม.1/3",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ธนัชกร มูลมี",
      "coTeacherName": "ธีราพร เจริญยิ่ง",
      "subjectCode": "ค21101",
      "subjectName": "คณิตศาสตร์",
      "classroomName": "ม.1/3",
      "hoursPerWeek": 3,
      "hoursPerSemester": 60
    },
    {
      "teacherName": "ธีราพร เจริญยิ่ง",
      "coTeacherName": "ธนัชกร มูลมี",
      "subjectCode": "ค21101",
      "subjectName": "คณิตศาสตร์",
      "classroomName": "ม.1/3",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ทนงเดช วงษ์ประจันต์",
      "coTeacherName": "",
      "subjectCode": "ง21101",
      "subjectName": "การงานอาชีพ",
      "classroomName": "ม.1/3",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ทนงเดช วงษ์ประจันต์",
      "coTeacherName": "",
      "subjectCode": "ส21103",
      "subjectName": "หน้าที่พลเมือง",
      "classroomName": "ม.1/3",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ธนัชกร มูลมี",
      "coTeacherName": "",
      "subjectCode": "ว21201",
      "subjectName": "สวนพฤกษศาสตร์",
      "classroomName": "ม.1/3",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ทนงเดช วงษ์ประจันต์",
      "coTeacherName": "ธนัชกร มูลมี",
      "subjectCode": "พ21101",
      "subjectName": "สุขศึกษาและพลศึกษา",
      "classroomName": "ม.1/3",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ธนัชกร มูลมี",
      "coTeacherName": "ทนงเดช วงษ์ประจันต์",
      "subjectCode": "พ21101",
      "subjectName": "สุขศึกษาและพลศึกษา",
      "classroomName": "ม.1/3",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ทนงเดช วงษ์ประจันต์",
      "coTeacherName": "",
      "subjectCode": "ว21102",
      "subjectName": "วิทยาการคำนวณ",
      "classroomName": "ม.1/3",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ประนอมจิตร หอมบุญ",
      "coTeacherName": "ธีราพร เจริญยิ่ง",
      "subjectCode": "อ21101",
      "subjectName": "ภาษาอังกฤษ",
      "classroomName": "ม.1/4",
      "hoursPerWeek": 3,
      "hoursPerSemester": 60
    },
    {
      "teacherName": "ธีราพร เจริญยิ่ง",
      "coTeacherName": "ประนอมจิตร หอมบุญ",
      "subjectCode": "อ21101",
      "subjectName": "ภาษาอังกฤษ",
      "classroomName": "ม.1/4",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ประนอมจิตร หอมบุญ",
      "coTeacherName": "ธีราพร เจริญยิ่ง, ธนิท ธนพัฒนิรัชกุล",
      "subjectCode": "ส21101",
      "subjectName": "สังคมฯ",
      "classroomName": "ม.1/4",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ธีราพร เจริญยิ่ง",
      "coTeacherName": "ประนอมจิตร หอมบุญ, ธนิท ธนพัฒนิรัชกุล",
      "subjectCode": "ส21101",
      "subjectName": "สังคมฯ",
      "classroomName": "ม.1/4",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ธนิท ธนพัฒนิรัชกุล",
      "coTeacherName": "ประนอมจิตร หอมบุญ, ธีราพร เจริญยิ่ง",
      "subjectCode": "ส21101",
      "subjectName": "สังคมฯ",
      "classroomName": "ม.1/4",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ธีราพร เจริญยิ่ง",
      "coTeacherName": "ประนอมจิตร หอมบุญ",
      "subjectCode": "ส21102",
      "subjectName": "ประวัติศาสตร์",
      "classroomName": "ม.1/4",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ประนอมจิตร หอมบุญ",
      "coTeacherName": "ธีราพร เจริญยิ่ง",
      "subjectCode": "ส21102",
      "subjectName": "ประวัติศาสตร์",
      "classroomName": "ม.1/4",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ธนิท ธนพัฒนิรัชกุล",
      "coTeacherName": "",
      "subjectCode": "ศ21101",
      "subjectName": "ศิลปะ",
      "classroomName": "ม.1/4",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ธนิท ธนพัฒนิรัชกุล",
      "coTeacherName": "",
      "subjectCode": "ง21201",
      "subjectName": "พื้นฐานอาชีพ",
      "classroomName": "ม.1/4",
      "hoursPerWeek": 4,
      "hoursPerSemester": 80
    },
    {
      "teacherName": "ประนอมจิตร หอมบุญ",
      "coTeacherName": "",
      "subjectCode": "ว21101",
      "subjectName": "วิทยาศาสตร์",
      "classroomName": "ม.1/4",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ประนอมจิตร หอมบุญ",
      "coTeacherName": "ธนิท ธนพัฒนิรัชกุล",
      "subjectCode": "ท21101",
      "subjectName": "ภาษาไทย",
      "classroomName": "ม.1/4",
      "hoursPerWeek": 3,
      "hoursPerSemester": 60
    },
    {
      "teacherName": "ธนิท ธนพัฒนิรัชกุล",
      "coTeacherName": "ประนอมจิตร หอมบุญ",
      "subjectCode": "ท21101",
      "subjectName": "ภาษาไทย",
      "classroomName": "ม.1/4",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ประนอมจิตร หอมบุญ",
      "coTeacherName": "",
      "subjectCode": "ค21101",
      "subjectName": "คณิตศาสตร์",
      "classroomName": "ม.1/4",
      "hoursPerWeek": 3,
      "hoursPerSemester": 60
    },
    {
      "teacherName": "ธนิท ธนพัฒนิรัชกุล",
      "coTeacherName": "",
      "subjectCode": "พ21101",
      "subjectName": "สุขศึกษาและพลศึกษา",
      "classroomName": "ม.1/4",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ธนิท ธนพัฒนิรัชกุล",
      "coTeacherName": "",
      "subjectCode": "ส21103",
      "subjectName": "หน้าที่พลเมือง",
      "classroomName": "ม.1/4",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ประนอมจิตร หอมบุญ",
      "coTeacherName": "",
      "subjectCode": "ว21201",
      "subjectName": "สวนพฤกษศาสตร์",
      "classroomName": "ม.1/4",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "ธนิท ธนพัฒนิรัชกุล",
      "coTeacherName": "",
      "subjectCode": "ง21101",
      "subjectName": "การงานอาชีพ",
      "classroomName": "ม.1/4",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "ธนิท ธนพัฒนิรัชกุล",
      "coTeacherName": "",
      "subjectCode": "ว21102",
      "subjectName": "วิทยาการคำนวณ",
      "classroomName": "ม.1/4",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "อารียา แสงดี",
      "coTeacherName": "",
      "subjectCode": "ว21101",
      "subjectName": "วิทยาศาสตร์",
      "classroomName": "ม.1/5",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "อารียา แสงดี",
      "coTeacherName": "ธีราพร เจริญยิ่ง",
      "subjectCode": "อ21101",
      "subjectName": "ภาษาอังกฤษ",
      "classroomName": "ม.1/5",
      "hoursPerWeek": 3,
      "hoursPerSemester": 60
    },
    {
      "teacherName": "ธีราพร เจริญยิ่ง",
      "coTeacherName": "อารียา แสงดี",
      "subjectCode": "อ21101",
      "subjectName": "ภาษาอังกฤษ",
      "classroomName": "ม.1/5",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "วสันต์ วอแพง",
      "coTeacherName": "",
      "subjectCode": "พ21101",
      "subjectName": "สุขศึกษาและพลศึกษา",
      "classroomName": "ม.1/5",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "วสันต์ วอแพง",
      "coTeacherName": "",
      "subjectCode": "ง21101",
      "subjectName": "การงานอาชีพ",
      "classroomName": "ม.1/5",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "อารียา แสงดี",
      "coTeacherName": "ธีราพร เจริญยิ่ง",
      "subjectCode": "ค21101",
      "subjectName": "คณิตศาสตร์",
      "classroomName": "ม.1/5",
      "hoursPerWeek": 3,
      "hoursPerSemester": 60
    },
    {
      "teacherName": "ธีราพร เจริญยิ่ง",
      "coTeacherName": "อารียา แสงดี",
      "subjectCode": "ค21101",
      "subjectName": "คณิตศาสตร์",
      "classroomName": "ม.1/5",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "วสันต์ วอแพง",
      "coTeacherName": "",
      "subjectCode": "ง21201",
      "subjectName": "พื้นฐานอาชีพ",
      "classroomName": "ม.1/5",
      "hoursPerWeek": 4,
      "hoursPerSemester": 80
    },
    {
      "teacherName": "อารียา แสงดี",
      "coTeacherName": "วสันต์ วอแพง",
      "subjectCode": "ส21101",
      "subjectName": "สังคมฯ",
      "classroomName": "ม.1/5",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "วสันต์ วอแพง",
      "coTeacherName": "อารียา แสงดี",
      "subjectCode": "ส21101",
      "subjectName": "สังคมฯ",
      "classroomName": "ม.1/5",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "อารียา แสงดี",
      "coTeacherName": "วสันต์ วอแพง",
      "subjectCode": "ส21102",
      "subjectName": "ประวัติศาสตร์",
      "classroomName": "ม.1/5",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "วสันต์ วอแพง",
      "coTeacherName": "อารียา แสงดี",
      "subjectCode": "ส21102",
      "subjectName": "ประวัติศาสตร์",
      "classroomName": "ม.1/5",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "อารียา แสงดี",
      "coTeacherName": "ธีราพร เจริญยิ่ง",
      "subjectCode": "ท21101",
      "subjectName": "ภาษาไทย",
      "classroomName": "ม.1/5",
      "hoursPerWeek": 3,
      "hoursPerSemester": 60
    },
    {
      "teacherName": "ธีราพร เจริญยิ่ง",
      "coTeacherName": "อารียา แสงดี",
      "subjectCode": "ท21101",
      "subjectName": "ภาษาไทย",
      "classroomName": "ม.1/5",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "วสันต์ วอแพง",
      "coTeacherName": "",
      "subjectCode": "ว21102",
      "subjectName": "วิทยาการคำนวณ",
      "classroomName": "ม.1/5",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "อารียา แสงดี",
      "coTeacherName": "",
      "subjectCode": "ว21201",
      "subjectName": "สวนพฤกษศาสตร์",
      "classroomName": "ม.1/5",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    },
    {
      "teacherName": "วสันต์ วอแพง",
      "coTeacherName": "อารียา แสงดี",
      "subjectCode": "ศ21101",
      "subjectName": "ศิลปะ",
      "classroomName": "ม.1/5",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "อารียา แสงดี",
      "coTeacherName": "วสันต์ วอแพง",
      "subjectCode": "ศ21101",
      "subjectName": "ศิลปะ",
      "classroomName": "ม.1/5",
      "hoursPerWeek": 2,
      "hoursPerSemester": 40
    },
    {
      "teacherName": "วสันต์ วอแพง",
      "coTeacherName": "",
      "subjectCode": "ส21103",
      "subjectName": "หน้าที่พลเมือง",
      "classroomName": "ม.1/5",
      "hoursPerWeek": 1,
      "hoursPerSemester": 20
    }
  ]
} as const;
