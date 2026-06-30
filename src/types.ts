export interface Student {
  id: string;
  studentId: string;
  citizenId?: string;
  name: string;
  targetPercentage?: number;
}

export interface Indicator {
  id: string;
  description: string;
}

export interface ScoreIndicator {
  code: string;
  fullScore: number;
  passingScore: number;
}

export interface ScoreUnit {
  name: string;
  indicators: ScoreIndicator[];
}

export interface ScoreConfig {
  learningArea: string;
  subjectName: string;
  subjectCode?: string;
  standard: string;
  selectedIndicators: string[];
  storedScore?: number;
  units: ScoreUnit[];
}

export type UserRole = "super_admin" | "admin" | "teacher" | "executive";

export interface Profile {
  id: string;
  school_id: string | null;
  username: string | null;
  title: string | null;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

/** ผู้ใช้ที่ล็อกอินแล้ว (จาก Supabase Auth + profiles) */
export interface AppUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  schoolId: string | null;
  isActive: boolean;
  title: string | null;
}

/** @deprecated ใช้ AppUser แทน — คงไว้ชั่วคราวสำหรับส่วนที่ยังไม่ย้าย */
export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  status: "pending" | "approved" | "rejected";
  role: "admin" | "user";
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
}

export interface Dataset {
  id: string;
  name: string;
  academicYear: string;
  semester: string;
  subjectName: string;
  learningArea: string;
  gradeLevel: string;
  status: "not_started" | "in_progress" | "completed";
  deletedAt?: string | null;
  userId?: string;
  data: AppData;
}

export type AcademicYearWorkspaceStatus =
  | "not_started"
  | "in_progress"
  | "completed";

export interface AcademicYear {
  id: string;
  school_id: string;
  year_be: number;
  start_date: string;
  end_date: string;
  term_open_date: string | null;
  is_active: boolean;
  primary_grade_entry_enabled?: boolean;
  primary_entry_start_date?: string | null;
  primary_entry_end_date?: string | null;
  study_start_date?: string | null;
  study_end_date?: string | null;
  workspace_status?: AcademicYearWorkspaceStatus | null;
  created_at: string;
}

export interface Semester {
  id: string;
  academic_year_id: string;
  semester_number: 1 | 2;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  grade_entry_enabled?: boolean;
  entry_start_date?: string | null;
  entry_end_date?: string | null;
  created_at: string;
}

export interface ClassLevel {
  code: string;
  name: string;
  sequence: number;
  stage: string;
}

export interface Classroom {
  id: string;
  school_id: string;
  academic_year_id: string;
  class_level_code: string;
  room_number: number;
  name: string;
  homeroom_teacher_id: string | null;
  homeroom_teacher_2_id: string | null;
  homeroom_teacher_3_id: string | null;
  created_at: string;
}

export interface DbStudent {
  id: string;
  school_id: string;
  student_code: string;
  citizen_id: string | null;
  title: string | null;
  first_name: string;
  last_name: string;
  gender: "ชาย" | "หญิง" | null;
  status: "active" | "graduated" | "transferred_out" | "inactive";
  created_at: string;
}

export interface StudentEnrollment {
  id: string;
  student_id: string;
  academic_year_id: string;
  classroom_id: string;
  class_level_code: string;
  student_number: number | null;
  status: "active" | "transferred_out" | "inactive";
  created_at: string;
}

export type SubjectType = "พื้นฐาน" | "เพิ่มเติม";

export interface Subject {
  id: string;
  school_id: string;
  subject_code: string;
  subject_name: string;
  learning_area: string;
  default_class_level: string | null;
  subject_type: SubjectType;
  credits: number | null;
  hours_total: number | null;
  hours_per_week: number | null;
  semester_number: 1 | 2 | null;
  is_active: boolean;
  created_at: string;
}

export type AssignmentStatus = "pending" | "active";

export interface TeachingAssignment {
  id: string;
  school_id: string;
  semester_id: string;
  teacher_id: string;
  subject_id: string;
  classroom_id: string;
  hours_per_week: number | null;
  hours_per_semester: number | null;
  entry_start_date: string | null;
  entry_end_date: string | null;
  status: AssignmentStatus;
  co_teacher_name: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AssignmentRow extends TeachingAssignment {
  teacher?: Pick<Profile, "id" | "full_name" | "title" | "username">;
  subject?: Pick<
    Subject,
    | "id"
    | "subject_code"
    | "subject_name"
    | "learning_area"
    | "default_class_level"
    | "hours_per_week"
    | "hours_total"
    | "semester_number"
  >;
  classroom?: Pick<Classroom, "id" | "name" | "class_level_code">;
}

export interface AppData {
  generalInfo: {
    schoolName?: string;
    agencyName?: string;
    logoUrl?: string;
    gradeLevel: string;
    semester: string;
    academicYear: string;
    subjectCode: string;
    subjectName: string;
    learningArea: string;
    totalHours: string;
    hoursPerWeek: string;
    hoursPerSemester: string;
    teacherName: string;
    teacherName2: string;
    homeroomTeacher1: string;
    homeroomTeacher2: string;
    homeroomTeacher3: string;
    homeroomTeachers: string;
    headOfLearningArea: string;
    headOfEvaluation: string;
    deputyDirector: string;
    schoolDirector: string;
    approvalDate: string;
    studyStartDate?: string;
    studyEndDate?: string;
  };
  students: Student[];
  attendance: Record<string, any>;
  scores: Record<string, any>;
  scoreConfig?: ScoreConfig;
  attributes: Record<string, any>;
  analytical: Record<string, Record<string, any>>;
  indicators: Indicator[];
}
