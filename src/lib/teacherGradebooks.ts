import { supabase } from "./supabase";
import { rowToAppData } from "./gradebookAdapter";
import {
  computeGradebookStats,
  hasTeacherEnteredData,
  isGradebookFullyComplete,
  statsToGradebookStatus,
} from "./gradebookStats";
import { STUDENT_HOMEROOMS } from "../data/studentHomerooms";
import { isSchemaCacheErrorFor } from "./dbErrors";
import { isWithinEntryWindow } from "./thaiDate";
import { mergePap5OfficialsIntoGeneralInfo } from "./pap5Officials";
import type { AppData, AppUser, Student } from "../types";

const DEFAULT_AGENCY_NAME = "สำนักบริหารงานการศึกษาพิเศษ";
const DEFAULT_SCHOOL_NAME = "โรงเรียนกาฬสินธุ์ปัญญานุกูล จังหวัดกาฬสินธุ์";
const DEFAULT_LOGO_URL = "/logo3.png";
const LEGACY_LOGO_URL = "/logo1.png";

const PRIMARY_LEVEL_CODES = new Set(["ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6"]);

function isPrimaryClassLevel(classLevelCode: string): boolean {
  return PRIMARY_LEVEL_CODES.has(classLevelCode) || classLevelCode.startsWith("ป.");
}

const TEACHER_ASSIGNMENT_SELECT_BASE = `
  id,
  school_id,
  subject_id,
  semester_id,
  hours_per_week,
  hours_per_semester,
  entry_start_date,
  entry_end_date,
  schools:school_id(name),
  subjects:subject_id(subject_code, subject_name, learning_area),
  classrooms:classroom_id(
    id,
    name,
    class_level_code,
    room_number,
    homeroom_teacher_1:homeroom_teacher_id(title, full_name),
    homeroom_teacher_2:homeroom_teacher_2_id(title, full_name)
  ),
  semesters:semester_id(
    semester_number,
    grade_entry_enabled,
    entry_start_date,
    entry_end_date,
    academic_years:academic_year_id(
      id,
      year_be,
      is_active,
      primary_grade_entry_enabled,
      primary_entry_start_date,
      primary_entry_end_date,
      study_start_date,
      study_end_date
    )
  )
`;

const TEACHER_ASSIGNMENT_SELECT_WITH_THIRD = `
  id,
  school_id,
  subject_id,
  semester_id,
  hours_per_week,
  hours_per_semester,
  entry_start_date,
  entry_end_date,
  schools:school_id(name),
  subjects:subject_id(subject_code, subject_name, learning_area),
  classrooms:classroom_id(
    id,
    name,
    class_level_code,
    room_number,
    homeroom_teacher_1:homeroom_teacher_id(title, full_name),
    homeroom_teacher_2:homeroom_teacher_2_id(title, full_name),
    homeroom_teacher_3:homeroom_teacher_3_id(title, full_name)
  ),
  semesters:semester_id(
    semester_number,
    grade_entry_enabled,
    entry_start_date,
    entry_end_date,
    academic_years:academic_year_id(
      id,
      year_be,
      is_active,
      primary_grade_entry_enabled,
      primary_entry_start_date,
      primary_entry_end_date,
      study_start_date,
      study_end_date
    )
  )
`;

function withoutEntryWindowColumns(select: string): string {
  return select
    .replace(/\s+entry_start_date,\n/g, "\n")
    .replace(/\s+entry_end_date,\n/g, "\n");
}

function withoutSemesterSettingsColumns(select: string): string {
  return select
    .replace(/\s+grade_entry_enabled,\n/g, "\n")
    .replace(/\s+entry_start_date,\n/g, "\n")
    .replace(/\s+entry_end_date,\n/g, "\n");
}

function withoutStudyPeriodColumns(select: string): string {
  return select
    .replace(
      /\s+primary_entry_end_date,\n\s+study_start_date,\n\s+study_end_date/g,
      "\n      primary_entry_end_date",
    )
    .replace(/\s+study_start_date,\n/g, "\n")
    .replace(/\s+study_end_date\n/g, "\n");
}

function isMissingEntryWindowColumn(error: unknown): boolean {
  return (
    isSchemaCacheErrorFor(error, "entry_start_date") ||
    isSchemaCacheErrorFor(error, "entry_end_date")
  );
}

function isMissingSemesterSettingsColumn(error: unknown): boolean {
  return isSchemaCacheErrorFor(error, "grade_entry_enabled");
}

function isMissingStudyPeriodColumn(error: unknown): boolean {
  return (
    isSchemaCacheErrorFor(error, "study_start_date") ||
    isSchemaCacheErrorFor(error, "study_end_date")
  );
}

export interface TeacherAssignmentView {
  id: string;
  school_id: string;
  school_name: string;
  subject_id: string;
  semester_id: string;
  hours_per_week: number | null;
  hours_per_semester: number | null;
  entry_start_date?: string | null;
  entry_end_date?: string | null;
  subject_code: string;
  subject_name: string;
  learning_area: string;
  classroom_id: string;
  classroom_name: string;
  class_level_code: string;
  room_number: number;
  homeroom_teacher_1_name: string;
  homeroom_teacher_2_name: string;
  homeroom_teacher_3_name: string;
  semester_number: number;
  academic_year_id: string;
  year_be: number;
  year_is_active: boolean;
  study_start_date?: string | null;
  study_end_date?: string | null;
  semester_grade_entry_enabled: boolean;
  student_count: number;
  gradebook_id: string | null;
  gradebook_status: "not_started" | "in_progress" | "completed" | null;
  completion_percent: number;
}

export interface GradebookSession {
  id: string;
  teaching_assignment_id: string;
  readOnly: boolean;
  label: string;
  year_be: number;
  semester_number: number;
  data: AppData;
}

type RawGradebook = {
  id: string;
  teaching_assignment_id: string;
  status: string;
  stats: { completionPercent?: number; hasTeacherInput?: boolean } | null;
  students: AppData["students"] | null;
  attendance: AppData["attendance"] | null;
  scores: AppData["scores"] | null;
  score_config: AppData["scoreConfig"] | null;
  attributes: AppData["attributes"] | null;
  analytical: AppData["analytical"] | null;
  indicators: AppData["indicators"] | null;
};

type RawAssignment = {
  id: string;
  school_id: string;
  subject_id: string;
  semester_id: string;
  hours_per_week: number | null;
  hours_per_semester: number | null;
  entry_start_date: string | null;
  entry_end_date: string | null;
  schools: { name: string } | null;
  subjects: {
    subject_code: string;
    subject_name: string;
    learning_area: string;
  } | null;
  classrooms: {
    id: string;
    name: string;
    class_level_code: string;
    room_number: number;
    homeroom_teacher_1: { title: string | null; full_name: string } | null;
    homeroom_teacher_2: { title: string | null; full_name: string } | null;
    homeroom_teacher_3: { title: string | null; full_name: string } | null;
  } | null;
  semesters: {
    semester_number: number;
    grade_entry_enabled?: boolean | null;
    entry_start_date?: string | null;
    entry_end_date?: string | null;
    academic_years: {
      id: string;
      year_be: number;
      is_active: boolean;
      primary_grade_entry_enabled?: boolean | null;
      primary_entry_start_date?: string | null;
      primary_entry_end_date?: string | null;
      study_start_date?: string | null;
      study_end_date?: string | null;
    } | null;
  } | null;
};

const GRADEBOOK_STATUS_SELECT = `
  id,
  teaching_assignment_id,
  status,
  stats,
  students,
  attendance,
  scores,
  score_config,
  attributes,
  analytical,
  indicators
`;

function parseCompletionPercent(stats: RawGradebook["stats"]): number {
  const raw = stats?.completionPercent;
  const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function resolveGradebookStatus(gb: RawGradebook) {
  const savedCompletion = parseCompletionPercent(gb.stats);
  const savedHasInput = gb.stats?.hasTeacherInput === true;

  const students = Array.isArray(gb.students) ? gb.students : [];
  const gradebookData = {
    generalInfo: {} as AppData["generalInfo"],
    students,
    attendance: gb.attendance ?? {},
    scores: gb.scores ?? {},
    scoreConfig: gb.score_config ?? null,
    attributes: gb.attributes ?? {},
    analytical: gb.analytical ?? {},
    indicators: gb.indicators ?? [],
  };
  const liveStats = computeGradebookStats(gradebookData);
  const fullyComplete = isGradebookFullyComplete(gradebookData);
  const liveCompletion = Math.max(0, Math.min(100, Math.round(liveStats.completionPercent)));
  const hasTeacherInput =
    savedHasInput ||
    liveStats.hasTeacherInput ||
    hasTeacherEnteredData({
      attendance: gb.attendance ?? undefined,
      scores: gb.scores ?? undefined,
      scoreConfig: gb.score_config ?? undefined,
      attributes: gb.attributes ?? undefined,
      analytical: gb.analytical ?? undefined,
      indicators: gb.indicators ?? undefined,
    });
  const completionPercent = Math.max(savedCompletion, liveCompletion);
  const computedStatus = statsToGradebookStatus(completionPercent, hasTeacherInput, fullyComplete);
  const gradebookStatus: TeacherAssignmentView["gradebook_status"] = computedStatus;

  return { completionPercent, gradebookStatus };
}

async function fetchGradebooksByAssignmentIds(
  teacherId: string,
  assignmentIds: string[],
): Promise<Map<string, RawGradebook>> {
  const map = new Map<string, RawGradebook>();
  if (assignmentIds.length === 0) return map;

  const chunkSize = 40;
  for (let index = 0; index < assignmentIds.length; index += chunkSize) {
    const chunk = assignmentIds.slice(index, index + chunkSize);
    const { data, error } = await supabase
      .from("gradebooks")
      .select(GRADEBOOK_STATUS_SELECT)
      .eq("teacher_id", teacherId)
      .in("teaching_assignment_id", chunk)
      .is("deleted_at", null);

    if (error) throw error;

    for (const row of (data ?? []) as unknown as RawGradebook[]) {
      map.set(row.teaching_assignment_id, row);
    }
  }

  return map;
}

export async function fetchTeacherAssignments(
  teacherId: string,
): Promise<TeacherAssignmentView[]> {
  const runQuery = (select: string) =>
    supabase
      .from("teaching_assignments")
      .select(select)
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

  let result = await runQuery(TEACHER_ASSIGNMENT_SELECT_WITH_THIRD);
  if (result.error && isSchemaCacheErrorFor(result.error, "homeroom_teacher_3_id")) {
    result = await runQuery(TEACHER_ASSIGNMENT_SELECT_BASE);
  }
  if (result.error && isMissingStudyPeriodColumn(result.error)) {
    result = await runQuery(withoutStudyPeriodColumns(TEACHER_ASSIGNMENT_SELECT_WITH_THIRD));
  }
  if (result.error && isSchemaCacheErrorFor(result.error, "homeroom_teacher_3_id")) {
    result = await runQuery(withoutStudyPeriodColumns(TEACHER_ASSIGNMENT_SELECT_BASE));
  }
  if (result.error && isMissingEntryWindowColumn(result.error)) {
    result = await runQuery(withoutEntryWindowColumns(TEACHER_ASSIGNMENT_SELECT_WITH_THIRD));
  }
  if (result.error && isMissingSemesterSettingsColumn(result.error)) {
    result = await runQuery(withoutSemesterSettingsColumns(TEACHER_ASSIGNMENT_SELECT_WITH_THIRD));
  }
  if (result.error && isSchemaCacheErrorFor(result.error, "homeroom_teacher_3_id")) {
    result = await runQuery(withoutEntryWindowColumns(TEACHER_ASSIGNMENT_SELECT_BASE));
  }
  if (result.error && isMissingStudyPeriodColumn(result.error)) {
    result = await runQuery(withoutStudyPeriodColumns(withoutEntryWindowColumns(TEACHER_ASSIGNMENT_SELECT_WITH_THIRD)));
  }
  if (result.error && isSchemaCacheErrorFor(result.error, "homeroom_teacher_3_id")) {
    result = await runQuery(withoutStudyPeriodColumns(withoutEntryWindowColumns(TEACHER_ASSIGNMENT_SELECT_BASE)));
  }
  if (result.error && isMissingSemesterSettingsColumn(result.error)) {
    result = await runQuery(withoutSemesterSettingsColumns(TEACHER_ASSIGNMENT_SELECT_BASE));
  }

  if (result.error) throw result.error;

  const rows = (result.data ?? []) as unknown as RawAssignment[];
  const validRows = rows.filter((row) => {
    const classroom = row.classrooms;
    const subject = row.subjects;
    const semester = row.semesters;
    const year = semester?.academic_years;
    return Boolean(classroom && subject && semester && year);
  });
  const gradebookByAssignmentId = await fetchGradebooksByAssignmentIds(
    teacherId,
    validRows.map((row) => row.id),
  );
  const views: TeacherAssignmentView[] = [];

  for (const row of validRows) {
    const classroom = row.classrooms!;
    const school = row.schools;
    const subject = row.subjects!;
    const semester = row.semesters!;
    const year = semester.academic_years!;
    const excelHomerooms = getExcelHomeroomNames(classroom);

    const { count } = await supabase
      .from("student_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("classroom_id", classroom.id)
      .eq("academic_year_id", year.id)
      .eq("status", "active");

    const gb = gradebookByAssignmentId.get(row.id) ?? null;
    const { completionPercent, gradebookStatus } = gb
      ? resolveGradebookStatus(gb)
      : { completionPercent: 0, gradebookStatus: null as TeacherAssignmentView["gradebook_status"] | null };

    const isPrimary = isPrimaryClassLevel(classroom.class_level_code);
    const entryStartDate = isPrimary
      ? year.primary_entry_start_date ?? row.entry_start_date ?? semester.entry_start_date ?? null
      : row.entry_start_date ?? semester.entry_start_date ?? null;
    const entryEndDate = isPrimary
      ? year.primary_entry_end_date ?? row.entry_end_date ?? semester.entry_end_date ?? null
      : row.entry_end_date ?? semester.entry_end_date ?? null;
    const semesterGradeEntryEnabled = isPrimary
      ? year.primary_grade_entry_enabled !== false
      : semester.grade_entry_enabled ?? true;

    views.push({
      id: row.id,
      school_id: row.school_id,
      school_name: school?.name ?? DEFAULT_SCHOOL_NAME,
      subject_id: row.subject_id,
      semester_id: row.semester_id,
      hours_per_week: row.hours_per_week,
      hours_per_semester: row.hours_per_semester,
      entry_start_date: entryStartDate,
      entry_end_date: entryEndDate,
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      learning_area: subject.learning_area,
      classroom_id: classroom.id,
      classroom_name: classroom.name,
      class_level_code: classroom.class_level_code,
      room_number: classroom.room_number,
      homeroom_teacher_1_name: formatProfileName(classroom.homeroom_teacher_1) || excelHomerooms[0] || "",
      homeroom_teacher_2_name: formatProfileName(classroom.homeroom_teacher_2) || excelHomerooms[1] || "",
      homeroom_teacher_3_name: formatProfileName(classroom.homeroom_teacher_3) || excelHomerooms[2] || "",
      semester_number: semester.semester_number,
      academic_year_id: year.id,
      year_be: year.year_be,
      year_is_active: year.is_active,
      study_start_date: year.study_start_date ?? null,
      study_end_date: year.study_end_date ?? null,
      semester_grade_entry_enabled: semesterGradeEntryEnabled,
      student_count: count ?? 0,
      gradebook_id: gb?.id ?? null,
      gradebook_status: gb ? gradebookStatus : null,
      completion_percent: completionPercent,
    });
  }

  return views;
}

export function groupAssignmentsByYear(
  assignments: TeacherAssignmentView[],
): Map<number, TeacherAssignmentView[]> {
  const map = new Map<number, TeacherAssignmentView[]>();
  for (const a of assignments) {
    const list = map.get(a.year_be) ?? [];
    list.push(a);
    map.set(a.year_be, list);
  }
  return map;
}

async function buildStudentRoster(
  classroomId: string,
  academicYearId: string,
): Promise<Student[]> {
  const { data, error } = await supabase
    .from("student_enrollments")
    .select(
      "student_number, students(id, student_code, citizen_id, title, first_name, last_name)",
    )
    .eq("classroom_id", classroomId)
    .eq("academic_year_id", academicYearId)
    .eq("status", "active")
    .order("student_number");

  if (error) throw error;

  return (data ?? []).flatMap((row) => {
    const rawStudent = row.students;
    const st = (Array.isArray(rawStudent) ? rawStudent[0] : rawStudent) as {
      id: string;
      student_code: string;
      citizen_id: string | null;
      title: string | null;
      first_name: string;
      last_name: string;
    } | null;

    if (!st) return [];

    const name = [st.title, st.first_name, st.last_name]
      .filter(Boolean)
      .join(" ");
    return [
      {
        id: st.id,
        studentId: st.student_code,
        citizenId: st.citizen_id ?? undefined,
        name,
      },
    ];
  });
}

function mergeRosterWithSavedState(
  roster: Student[],
  savedStudents: Student[],
  hasSavedRoster = true,
): Student[] {
  if (hasSavedRoster) {
    const rosterByStudentId = new Map(roster.map((student) => [student.id, student]));

    return savedStudents.map((savedStudent) => {
      const latestStudent = rosterByStudentId.get(savedStudent.id);
      if (!latestStudent) return savedStudent;

      return {
        ...savedStudent,
        studentId: latestStudent.studentId,
        citizenId: latestStudent.citizenId,
        name: latestStudent.name,
      };
    });
  }

  const targetByStudentId = new Map(
    savedStudents.map((student) => [student.id, student.targetPercentage]),
  );

  return roster.map((student) => {
    const targetPercentage = targetByStudentId.get(student.id);
    return targetPercentage === undefined
      ? student
      : { ...student, targetPercentage };
  });
}

function formatProfileName(profile: { title: string | null; full_name: string } | null): string {
  if (!profile) return "";
  return [profile.title, profile.full_name].filter(Boolean).join(" ");
}

function getExcelHomeroomNames(classroom: {
  name: string;
  class_level_code: string;
  room_number: number;
}): string[] {
  return (
    STUDENT_HOMEROOMS[classroom.name] ??
    STUDENT_HOMEROOMS[`${classroom.class_level_code}/${classroom.room_number}`] ??
    []
  );
}

function buildHomeroomTeachersText(
  homeroomTeacher1: string,
  homeroomTeacher2: string,
  homeroomTeacher3 = "",
): string {
  return [homeroomTeacher1, homeroomTeacher2, homeroomTeacher3]
    .map((name, index) => (name ? `${index + 1}. ${name}` : ""))
    .filter(Boolean)
    .join(" ");
}

function buildGeneralInfo(
  assignment: TeacherAssignmentView,
  teacher: AppUser,
  hoursPerWeek: string,
  hoursPerSemester: string,
): AppData["generalInfo"] {
  const homeroomTeacher1 = assignment.homeroom_teacher_1_name;
  const homeroomTeacher2 = assignment.homeroom_teacher_2_name;
  const homeroomTeacher3 = assignment.homeroom_teacher_3_name;

  return {
    schoolName: assignment.school_name,
    agencyName: DEFAULT_AGENCY_NAME,
    logoUrl: DEFAULT_LOGO_URL,
    gradeLevel: assignment.classroom_name,
    semester: String(assignment.semester_number),
    academicYear: String(assignment.year_be),
    subjectCode: assignment.subject_code,
    subjectName: assignment.subject_name,
    learningArea: assignment.learning_area,
    totalHours: hoursPerWeek || "1",
    hoursPerWeek,
    hoursPerSemester,
    teacherName: teacher.name,
    teacherName2: "",
    homeroomTeacher1,
    homeroomTeacher2,
    homeroomTeacher3,
    homeroomTeachers: buildHomeroomTeachersText(homeroomTeacher1, homeroomTeacher2, homeroomTeacher3),
    headOfLearningArea: "",
    headOfEvaluation: "",
    deputyDirector: "",
    schoolDirector: "",
    approvalDate: new Date().toISOString().split("T")[0],
    studyStartDate: assignment.study_start_date ?? "",
    studyEndDate: assignment.study_end_date ?? "",
  };
}

export async function ensureGradebook(
  assignment: TeacherAssignmentView,
  teacher: AppUser,
): Promise<string> {
  if (assignment.gradebook_id) return assignment.gradebook_id;

  const students = await buildStudentRoster(
    assignment.classroom_id,
    assignment.academic_year_id,
  );
  const hoursPerWeek = String(assignment.hours_per_week ?? "");
  const hoursPerSemester = String(assignment.hours_per_semester ?? "");
  const baseGeneralInfo = buildGeneralInfo(
    assignment,
    teacher,
    hoursPerWeek,
    hoursPerSemester,
  );
  const general_info = await mergePap5OfficialsIntoGeneralInfo(
    assignment.school_id,
    assignment.learning_area,
    baseGeneralInfo,
  );

  const { data, error } = await supabase
    .from("gradebooks")
    .insert({
      teaching_assignment_id: assignment.id,
      teacher_id: teacher.id,
      semester_id: assignment.semester_id,
      status: "not_started",
      general_info,
      students,
    })
    .select("id")
    .single();

  if (error) {
    const { data: existing } = await supabase
      .from("gradebooks")
      .select("id")
      .eq("teaching_assignment_id", assignment.id)
      .eq("teacher_id", teacher.id)
      .maybeSingle();

    if (existing?.id) return existing.id;
    throw error;
  }
  return data.id;
}

export async function loadGradebookSession(
  gradebookId: string,
  assignment: TeacherAssignmentView,
): Promise<GradebookSession> {
  const { data, error } = await supabase
    .from("gradebooks")
    .select("*")
    .eq("id", gradebookId)
    .single();

  if (error) throw error;

  const appData = rowToAppData(data);
  const roster = await buildStudentRoster(
    assignment.classroom_id,
    assignment.academic_year_id,
  );
  const savedGeneralInfo =
    (data.general_info as Partial<AppData["generalInfo"]> | null) ?? {};
  const hasSavedRoster = Array.isArray(data.students);
  const homeroomTeacher1 =
    savedGeneralInfo.homeroomTeacher1 || assignment.homeroom_teacher_1_name;
  const homeroomTeacher2 =
    savedGeneralInfo.homeroomTeacher2 || assignment.homeroom_teacher_2_name;
  const homeroomTeacher3 =
    savedGeneralInfo.homeroomTeacher3 || assignment.homeroom_teacher_3_name;
  const homeroomTeachers =
    savedGeneralInfo.homeroomTeachers ||
    buildHomeroomTeachersText(homeroomTeacher1, homeroomTeacher2, homeroomTeacher3);

  const mergedGeneralInfo = await mergePap5OfficialsIntoGeneralInfo(
    assignment.school_id,
    assignment.learning_area,
    {
      ...appData.generalInfo,
      schoolName: savedGeneralInfo.schoolName || assignment.school_name,
      logoUrl:
        savedGeneralInfo.logoUrl &&
        savedGeneralInfo.logoUrl !== LEGACY_LOGO_URL
          ? savedGeneralInfo.logoUrl
          : DEFAULT_LOGO_URL,
      homeroomTeacher1,
      homeroomTeacher2,
      homeroomTeacher3,
      homeroomTeachers,
      studyStartDate: assignment.study_start_date ?? "",
      studyEndDate: assignment.study_end_date ?? "",
    },
  );

  return {
    id: data.id,
    teaching_assignment_id: data.teaching_assignment_id,
    readOnly:
      !assignment.year_is_active ||
      !assignment.semester_grade_entry_enabled ||
      !isWithinEntryWindow(assignment.entry_start_date, assignment.entry_end_date),
    label: `${assignment.subject_name} ${assignment.classroom_name}`,
    year_be: assignment.year_be,
    semester_number: assignment.semester_number,
    data: {
      ...appData,
      generalInfo: mergedGeneralInfo,
      students: mergeRosterWithSavedState(roster, appData.students, hasSavedRoster),
    },
  };
}

export async function findPreviousYearGradebook(
  assignment: TeacherAssignmentView,
  teacherId: string,
): Promise<string | null> {
  const prevYearBe = assignment.year_be - 1;

  const { data: currentYear } = await supabase
    .from("academic_years")
    .select("school_id")
    .eq("id", assignment.academic_year_id)
    .single();

  const { data: prevYear } = await supabase
    .from("academic_years")
    .select("id")
    .eq("year_be", prevYearBe)
    .eq("school_id", currentYear?.school_id ?? "")
    .maybeSingle();

  if (!prevYear) return null;

  const { data: prevSemester } = await supabase
    .from("semesters")
    .select("id")
    .eq("academic_year_id", prevYear.id)
    .eq("semester_number", assignment.semester_number)
    .maybeSingle();

  if (!prevSemester) return null;

  const { data: prevAssignments } = await supabase
    .from("teaching_assignments")
    .select(
      `
      id,
      gradebooks(id),
      classrooms:classroom_id(room_number)
    `,
    )
    .eq("teacher_id", teacherId)
    .eq("semester_id", prevSemester.id)
    .eq("subject_id", assignment.subject_id);

  const prevAssignment = (prevAssignments ?? []).find((row) => {
    const raw = row.classrooms;
    const classroom = (Array.isArray(raw) ? raw[0] : raw) as {
      room_number: number;
    } | null;
    return classroom?.room_number === assignment.room_number;
  });

  if (!prevAssignment) return null;

  const gbs = prevAssignment.gradebooks as { id: string }[] | null;
  return gbs?.[0]?.id ?? null;
}

export async function cloneFromPreviousYear(
  assignment: TeacherAssignmentView,
  teacherId: string,
): Promise<string> {
  if (assignment.gradebook_id) {
    throw new Error("มีสมุดบันทึกอยู่แล้ว — เปิดเพื่อแก้ไขแทน");
  }

  const sourceId = await findPreviousYearGradebook(assignment, teacherId);
  if (!sourceId) {
    throw new Error("ไม่พบข้อมูลปีที่แล้วสำหรับวิชาและห้องนี้");
  }

  const { data, error } = await supabase.rpc("clone_gradebook_structure", {
    p_source_gradebook_id: sourceId,
    p_target_assignment_id: assignment.id,
  });

  if (error) throw error;
  return data as string;
}
