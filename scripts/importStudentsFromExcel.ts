import { readFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_EXCEL_PATH = 'Student-list/รายชื่อนักเรียนปี 2569 จิง.xlsx';
const DEFAULT_ACADEMIC_YEAR_BE = 2569;
const MAX_LEVEL_SEQUENCE = 12;
const EXCLUDED_HOMEROOM_PERSON_KEYS = new Set(['นางสาวพรพิมลภูหาด']);

type SupabaseClient = ReturnType<typeof createClient>;

interface RawStudentRow {
  sourceSheet: string;
  rowNumber: number;
  classroomName: string;
  classLevelCode: string;
  roomNumber: number;
  studentNumber: number | null;
  studentCode: string;
  sourceStudentCode: string;
  citizenId: string | null;
  fullNameRaw: string;
  title: string | null;
  firstName: string;
  lastName: string;
  gender: 'ชาย' | 'หญิง' | null;
  adjustedDuplicateCode?: boolean;
}

interface ClassroomImport {
  sourceSheet: string;
  startRow: number;
  title: string;
  name: string;
  classLevelCode: string;
  roomNumber: number;
  homeroomNames: string[];
  studentCount: number;
}

interface ExistingProfile {
  id: string;
  title: string | null;
  full_name: string;
  username: string | null;
  role: string;
  is_active: boolean;
}

interface ExistingClassroom {
  id: string;
  class_level_code: string;
  room_number: number;
}

interface ExistingStudent {
  id: string;
  student_code: string;
}

interface ExistingEnrollment {
  id: string;
  student_id: string;
}

interface HomeroomResolution {
  classroomName: string;
  rawNames: string[];
  assignedIds: string[];
  assignedNames: string[];
  unmatchedNames: string[];
  overflowNames: string[];
}

function readEnvFile(path = '.env.local'): Record<string, string> {
  try {
    const text = readFileSync(path, 'utf8');
    return Object.fromEntries(
      text
        .split(/\n/)
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => line.split(/=(.*)/s).slice(0, 2)),
    );
  } catch {
    return {};
  }
}

function norm(value: unknown): string {
  return String(value ?? '')
    .replace(/[\u00a0\u200b]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cellText(cell: ExcelJS.Cell): string {
  let text = '';
  try {
    text = cell.text;
  } catch {
    text = '';
  }

  const cleanText = norm(text);
  if (cleanText && cleanText !== '[object Object]') return cleanText;

  const value = cell.value;
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value !== 'object') return norm(value);
  if ('richText' in value && Array.isArray(value.richText)) {
    return norm(value.richText.map((part) => part.text).join(''));
  }
  if ('text' in value) return norm(value.text);
  if ('result' in value) return norm(value.result);
  return '';
}

function digits(value: unknown): string {
  return norm(value).replace(/\D/g, '');
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function rowTexts(worksheet: ExcelJS.Worksheet, rowNumber: number): string[] {
  const row = worksheet.getRow(rowNumber);
  const values: string[] = [];
  for (let col = 1; col <= worksheet.columnCount; col += 1) {
    const value = cellText(row.getCell(col));
    if (value) values.push(value);
  }
  return unique(values);
}

function classroomKey(classLevelCode: string, roomNumber: number): string {
  return `${classLevelCode}/${roomNumber}`;
}

function parseClassroomTitle(title: string): { classLevelCode: string; roomNumber: number; name: string } | null {
  const compact = norm(title);
  const match = compact.match(/รายชื่อนักเรียนชั้น(ประถมศึกษา|มัธยมศึกษา)ปีที่\s*(\d+)\/(\d+)/);
  if (!match) return null;
  const prefix = match[1] === 'ประถมศึกษา' ? 'ป.' : 'ม.';
  const classLevelCode = `${prefix}${Number(match[2])}`;
  const roomNumber = Number(match[3]);
  return {
    classLevelCode,
    roomNumber,
    name: classroomKey(classLevelCode, roomNumber),
  };
}

function parseStudentName(rawName: string): Pick<RawStudentRow, 'title' | 'firstName' | 'lastName' | 'gender'> | null {
  const clean = norm(rawName);
  const match = clean.match(/^(เด็กชาย|เด็กหญิง|นาย|นางสาว|นาง)\s*(.+)$/);
  if (!match) return null;

  const title = match[1];
  const rest = norm(match[2]);
  const parts = rest.split(' ').filter(Boolean);
  if (parts.length < 2) return null;

  return {
    title,
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts.at(-1) ?? '',
    gender: title === 'เด็กชาย' || title === 'นาย' ? 'ชาย' : 'หญิง',
  };
}

function isStudentDataRow(worksheet: ExcelJS.Worksheet, rowNumber: number): boolean {
  const row = worksheet.getRow(rowNumber);
  const order = cellText(row.getCell(1));
  const studentCode = cellText(row.getCell(2));
  const fullName = cellText(row.getCell(4));
  return /^\d+$/.test(order) && Boolean(studentCode) && Boolean(fullName);
}

function findBlockStarts(worksheet: ExcelJS.Worksheet): Array<{ rowNumber: number; title: string }> {
  const starts: Array<{ rowNumber: number; title: string }> = [];
  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const title = rowTexts(worksheet, rowNumber).find((value) => value.includes('รายชื่อนักเรียนชั้น'));
    if (title) starts.push({ rowNumber, title });
  }
  return starts;
}

function findHeaderRow(worksheet: ExcelJS.Worksheet, startRow: number, endRow: number): number | null {
  for (let rowNumber = startRow; rowNumber <= Math.min(endRow, startRow + 12); rowNumber += 1) {
    const text = rowTexts(worksheet, rowNumber).join('|');
    if (text.includes('ลำดับ') && text.includes('รหัส') && text.includes('ชื่อ-สกุล')) {
      return rowNumber;
    }
  }
  return null;
}

function parseTeacherNamesFromText(value: string): string[] {
  const clean = norm(value);
  if (!clean) return [];

  const candidates = clean
    .split(/ครูประจำชั้น/g)
    .map((part) => norm(part))
    .filter((part) => /^(นาย|นางสาว|นาง)\s*/.test(part));

  if (candidates.length > 0) return candidates;
  return /^(นาย|นางสาว|นาง)\s*/.test(clean) ? [clean] : [];
}

function extractHomeroomNames(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  headerRow: number,
): string[] {
  const names: string[] = [];
  for (let rowNumber = startRow; rowNumber < headerRow; rowNumber += 1) {
    const values = rowTexts(worksheet, rowNumber);
    if (!values.some((value) => value.includes('ครูประจำชั้น'))) continue;

    for (const value of values) {
      names.push(...parseTeacherNamesFromText(value));
    }
  }
  return unique(names);
}

async function readWorkbookRows(path: string): Promise<{
  classrooms: ClassroomImport[];
  students: RawStudentRow[];
  skippedRows: Array<{ sheet: string; rowNumber: number; reason: string; value: string }>;
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);

  const classrooms: ClassroomImport[] = [];
  const students: RawStudentRow[] = [];
  const skippedRows: Array<{ sheet: string; rowNumber: number; reason: string; value: string }> = [];
  const seenStudentCodeCounts = new Map<string, number>();

  for (const worksheet of workbook.worksheets) {
    const starts = findBlockStarts(worksheet);
    for (let index = 0; index < starts.length; index += 1) {
      const start = starts[index];
      const endRow = (starts[index + 1]?.rowNumber ?? worksheet.rowCount + 1) - 1;
      const classroom = parseClassroomTitle(start.title);
      if (!classroom) {
        skippedRows.push({
          sheet: worksheet.name,
          rowNumber: start.rowNumber,
          reason: 'อ่านชื่อชั้น/ห้องไม่ได้',
          value: start.title,
        });
        continue;
      }

      const headerRow = findHeaderRow(worksheet, start.rowNumber, endRow);
      if (!headerRow) {
        skippedRows.push({
          sheet: worksheet.name,
          rowNumber: start.rowNumber,
          reason: 'ไม่พบหัวตารางรายชื่อนักเรียน',
          value: start.title,
        });
        continue;
      }

      const blockStudents: RawStudentRow[] = [];
      for (let rowNumber = headerRow + 1; rowNumber <= endRow; rowNumber += 1) {
        if (!isStudentDataRow(worksheet, rowNumber)) continue;

        const row = worksheet.getRow(rowNumber);
        const fullNameRaw = cellText(row.getCell(4));
        const parsedName = parseStudentName(fullNameRaw);
        const sourceStudentCode = cellText(row.getCell(2));
        const seenCount = seenStudentCodeCounts.get(sourceStudentCode) ?? 0;
        const studentCode = seenCount === 0 ? sourceStudentCode : `${sourceStudentCode}-${seenCount + 1}`;
        const studentNumber = Number(cellText(row.getCell(1)));
        const citizenDigits = digits(row.getCell(3).text || row.getCell(3).value);
        const citizenId = citizenDigits.length === 13 ? citizenDigits : null;

        if (!parsedName) {
          skippedRows.push({
            sheet: worksheet.name,
            rowNumber,
            reason: 'แยกคำนำหน้า/ชื่อ/นามสกุลไม่ได้',
            value: fullNameRaw,
          });
          continue;
        }

        if (!sourceStudentCode) {
          skippedRows.push({
            sheet: worksheet.name,
            rowNumber,
            reason: 'ไม่พบรหัสนักเรียน',
            value: fullNameRaw,
          });
          continue;
        }

        const parsed: RawStudentRow = {
          sourceSheet: worksheet.name,
          rowNumber,
          classroomName: classroom.name,
          classLevelCode: classroom.classLevelCode,
          roomNumber: classroom.roomNumber,
          studentNumber: Number.isFinite(studentNumber) ? studentNumber : null,
          studentCode,
          sourceStudentCode,
          citizenId,
          fullNameRaw,
          adjustedDuplicateCode: seenCount > 0,
          ...parsedName,
        };
        seenStudentCodeCounts.set(sourceStudentCode, seenCount + 1);
        blockStudents.push(parsed);
      }

      classrooms.push({
        sourceSheet: worksheet.name,
        startRow: start.rowNumber,
        title: start.title,
        name: classroom.name,
        classLevelCode: classroom.classLevelCode,
        roomNumber: classroom.roomNumber,
        homeroomNames: extractHomeroomNames(worksheet, start.rowNumber, headerRow),
        studentCount: blockStudents.length,
      });
      students.push(...blockStudents);
    }
  }

  return { classrooms, students, skippedRows };
}

function parseArgs() {
  return {
    dryRun: process.argv.includes('--dry-run'),
    excelPath: process.env.STUDENTS_XLSX_PATH || DEFAULT_EXCEL_PATH,
    academicYearBe: Number(process.env.KSP_ACADEMIC_YEAR_BE || DEFAULT_ACADEMIC_YEAR_BE),
  };
}

function normalizePersonKey(value: string): string {
  return norm(value)
    .replace(/\s+/g, '')
    .replace(/^ครูประจำชั้น/g, '')
    .trim();
}

function displayProfileName(profile: Pick<ExistingProfile, 'title' | 'full_name'>): string {
  return [profile.title, profile.full_name].filter(Boolean).join(' ');
}

function buildProfileMap(profiles: ExistingProfile[]): Map<string, ExistingProfile> {
  const map = new Map<string, ExistingProfile>();
  for (const profile of profiles) {
    const withTitle = normalizePersonKey(displayProfileName(profile));
    const withoutTitle = normalizePersonKey(profile.full_name);
    map.set(withTitle, profile);
    map.set(withoutTitle, profile);
  }
  return map;
}

function resolveHomeroomTeachers(
  classrooms: ClassroomImport[],
  profiles: ExistingProfile[],
): Map<string, HomeroomResolution> {
  const profileMap = buildProfileMap(profiles);
  const resolutions = new Map<string, HomeroomResolution>();

  for (const classroom of classrooms) {
    const matched: ExistingProfile[] = [];
    const matchedNames = new Set<string>();
    const unmatchedNames: string[] = [];

    for (const rawName of classroom.homeroomNames) {
      const personKey = normalizePersonKey(rawName);
      const profile = EXCLUDED_HOMEROOM_PERSON_KEYS.has(personKey)
        ? null
        : profileMap.get(personKey);
      if (!profile) {
        unmatchedNames.push(rawName);
        continue;
      }

      if (!matchedNames.has(profile.id)) {
        matched.push(profile);
        matchedNames.add(profile.id);
      }
    }

    const assignedProfiles = matched.slice(0, 3);
    resolutions.set(classroom.name, {
      classroomName: classroom.name,
      rawNames: classroom.homeroomNames,
      assignedIds: assignedProfiles.map((profile) => profile.id),
      assignedNames: assignedProfiles.map(displayProfileName),
      unmatchedNames,
      overflowNames: matched.slice(3).map(displayProfileName),
    });
  }

  return resolutions;
}

async function resolveSchoolId(supabase: SupabaseClient): Promise<string> {
  if (process.env.KSP_SCHOOL_ID) return process.env.KSP_SCHOOL_ID;
  const { data, error } = await supabase.from('schools').select('id').order('created_at').limit(2);
  if (error) throw error;
  if (!data?.length) throw new Error('ไม่พบ school ใน Supabase');
  if (data.length > 1) throw new Error('พบมากกว่า 1 school กรุณาตั้ง KSP_SCHOOL_ID ก่อนนำเข้า');
  return data[0].id;
}

function yearBeToDates(yearBe: number) {
  const yearCe = yearBe - 543;
  return {
    start_date: `${yearCe}-05-01`,
    end_date: `${yearCe + 1}-04-30`,
    term_open_date: `${yearCe}-05-16`,
    semester1_start: `${yearCe}-05-16`,
    semester1_end: `${yearCe}-10-11`,
    semester2_start: `${yearCe}-11-01`,
    semester2_end: `${yearCe + 1}-03-31`,
  };
}

async function ensureAcademicYear(
  supabase: SupabaseClient,
  schoolId: string,
  yearBe: number,
): Promise<string> {
  const dates = yearBeToDates(yearBe);

  const { error: deactivateError } = await supabase
    .from('academic_years')
    .update({ is_active: false })
    .eq('school_id', schoolId);
  if (deactivateError) throw deactivateError;

  const { data, error } = await supabase
    .from('academic_years')
    .upsert(
      {
        school_id: schoolId,
        year_be: yearBe,
        start_date: dates.start_date,
        end_date: dates.end_date,
        term_open_date: dates.term_open_date,
        is_active: true,
      },
      { onConflict: 'school_id,year_be' },
    )
    .select('id')
    .single();

  if (error || !data) throw error ?? new Error('สร้างปีการศึกษาไม่สำเร็จ');

  const semesters = [
    {
      academic_year_id: data.id,
      semester_number: 1,
      start_date: dates.semester1_start,
      end_date: dates.semester1_end,
      is_active: true,
    },
    {
      academic_year_id: data.id,
      semester_number: 2,
      start_date: dates.semester2_start,
      end_date: dates.semester2_end,
      is_active: false,
    },
  ];

  const { error: semesterError } = await supabase
    .from('semesters')
    .upsert(semesters, { onConflict: 'academic_year_id,semester_number' });
  if (semesterError) throw semesterError;

  return data.id;
}

async function loadExistingAcademicYearId(
  supabase: SupabaseClient,
  schoolId: string,
  yearBe: number,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('academic_years')
    .select('id')
    .eq('school_id', schoolId)
    .eq('year_be', yearBe)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function loadProfiles(supabase: SupabaseClient): Promise<ExistingProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, title, full_name, username, role, is_active')
    .eq('is_active', true);
  if (error) throw error;
  return data ?? [];
}

async function loadExistingClassrooms(
  supabase: SupabaseClient,
  academicYearId: string,
): Promise<ExistingClassroom[]> {
  const { data, error } = await supabase
    .from('classrooms')
    .select('id, class_level_code, room_number')
    .eq('academic_year_id', academicYearId);
  if (error) throw error;
  return data ?? [];
}

async function loadExistingStudents(supabase: SupabaseClient, schoolId: string): Promise<ExistingStudent[]> {
  const { data, error } = await supabase
    .from('students')
    .select('id, student_code')
    .eq('school_id', schoolId);
  if (error) throw error;
  return data ?? [];
}

async function loadExistingEnrollments(
  supabase: SupabaseClient,
  academicYearId: string,
): Promise<ExistingEnrollment[]> {
  const { data, error } = await supabase
    .from('student_enrollments')
    .select('id, student_id')
    .eq('academic_year_id', academicYearId);
  if (error) throw error;
  return data ?? [];
}

function classroomSummary(
  classrooms: ClassroomImport[],
  resolutions: Map<string, HomeroomResolution>,
): Array<{
  classroom: string;
  students: number;
  homeroomTeachers: string[];
  unresolvedHomeroomTeachers: string[];
  extraHomeroomTeachers: string[];
}> {
  return classrooms.map((classroom) => {
    const resolution = resolutions.get(classroom.name);
    return {
      classroom: classroom.name,
      students: classroom.studentCount,
      homeroomTeachers: resolution?.assignedNames ?? [],
      unresolvedHomeroomTeachers: resolution?.unmatchedNames ?? [],
      extraHomeroomTeachers: resolution?.overflowNames ?? [],
    };
  });
}

async function upsertClassrooms(
  supabase: SupabaseClient,
  schoolId: string,
  academicYearId: string,
  classrooms: ClassroomImport[],
  resolutions: Map<string, HomeroomResolution>,
): Promise<Map<string, string>> {
  const payload = classrooms.map((classroom) => {
    const resolution = resolutions.get(classroom.name);
    return {
      school_id: schoolId,
      academic_year_id: academicYearId,
      class_level_code: classroom.classLevelCode,
      room_number: classroom.roomNumber,
      name: classroom.name,
      homeroom_teacher_id: resolution?.assignedIds[0] ?? null,
      homeroom_teacher_2_id: resolution?.assignedIds[1] ?? null,
      homeroom_teacher_3_id: resolution?.assignedIds[2] ?? null,
    };
  });

  const { data, error } = await supabase
    .from('classrooms')
    .upsert(payload, { onConflict: 'academic_year_id,class_level_code,room_number' })
    .select('id, class_level_code, room_number');

  if (error) throw error;

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(classroomKey(row.class_level_code, Number(row.room_number)), row.id);
  }
  return map;
}

async function upsertStudents(
  supabase: SupabaseClient,
  schoolId: string,
  students: RawStudentRow[],
): Promise<Map<string, string>> {
  const payload = students.map((student) => ({
    school_id: schoolId,
    student_code: student.studentCode,
    citizen_id: student.citizenId,
    title: student.title,
    first_name: student.firstName,
    last_name: student.lastName,
    gender: student.gender,
    status: 'active',
  }));

  const { data, error } = await supabase
    .from('students')
    .upsert(payload, { onConflict: 'school_id,student_code' })
    .select('id, student_code');

  if (error) throw error;

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.student_code, row.id);
  }
  return map;
}

async function upsertEnrollments(
  supabase: SupabaseClient,
  academicYearId: string,
  students: RawStudentRow[],
  studentIdByCode: Map<string, string>,
  classroomIdByName: Map<string, string>,
): Promise<Set<string>> {
  const payload = students.map((student) => {
    const studentId = studentIdByCode.get(student.studentCode);
    const classroomId = classroomIdByName.get(student.classroomName);
    if (!studentId) throw new Error(`ไม่พบ student id ของรหัส ${student.studentCode}`);
    if (!classroomId) throw new Error(`ไม่พบ classroom id ของห้อง ${student.classroomName}`);

    return {
      student_id: studentId,
      academic_year_id: academicYearId,
      classroom_id: classroomId,
      class_level_code: student.classLevelCode,
      student_number: student.studentNumber,
      status: 'active',
    };
  });

  const { error } = await supabase
    .from('student_enrollments')
    .upsert(payload, { onConflict: 'student_id,academic_year_id' });

  if (error) throw error;

  return new Set(payload.map((row) => row.student_id));
}

async function deactivateMissingEnrollments(
  supabase: SupabaseClient,
  academicYearId: string,
  importedStudentIds: Set<string>,
): Promise<number> {
  const existing = await loadExistingEnrollments(supabase, academicYearId);
  const staleEnrollmentIds = existing
    .filter((row) => !importedStudentIds.has(row.student_id))
    .map((row) => row.id);

  if (staleEnrollmentIds.length === 0) return 0;

  const { error } = await supabase
    .from('student_enrollments')
    .update({ status: 'inactive' })
    .in('id', staleEnrollmentIds);
  if (error) throw error;
  return staleEnrollmentIds.length;
}

async function main() {
  const args = parseArgs();
  const env = { ...readEnvFile(), ...process.env };
  const url = env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceClient = url && serviceKey
    ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

  const { classrooms, students, skippedRows } = await readWorkbookRows(args.excelPath);

  let databaseSummary:
    | {
        schoolId: string;
        academicYearId: string | null;
        classroomsToCreate: number;
        classroomsToUpdate: number;
        studentsToCreate: number;
        studentsToUpdate: number;
        enrollmentsToCreate: number;
        enrollmentsToUpdate: number;
      }
    | null = null;
  let homeroomResolutions = new Map<string, HomeroomResolution>();

  if (serviceClient) {
    const schoolId = await resolveSchoolId(serviceClient);
    const profiles = await loadProfiles(serviceClient);
    homeroomResolutions = resolveHomeroomTeachers(classrooms, profiles);

    const existingAcademicYearId = await loadExistingAcademicYearId(serviceClient, schoolId, args.academicYearBe);
    const existingClassrooms = existingAcademicYearId
      ? await loadExistingClassrooms(serviceClient, existingAcademicYearId)
      : [];
    const existingClassroomKeys = new Set(
      existingClassrooms.map((classroom) => classroomKey(classroom.class_level_code, classroom.room_number)),
    );
    const existingStudents = await loadExistingStudents(serviceClient, schoolId);
    const existingStudentCodes = new Set(existingStudents.map((student) => student.student_code));
    const existingEnrollments = existingAcademicYearId
      ? await loadExistingEnrollments(serviceClient, existingAcademicYearId)
      : [];
    const existingEnrollmentStudentIds = new Set(existingEnrollments.map((enrollment) => enrollment.student_id));
    const existingStudentIdByCode = new Map(existingStudents.map((student) => [student.student_code, student.id]));

    databaseSummary = {
      schoolId,
      academicYearId: existingAcademicYearId,
      classroomsToCreate: classrooms.filter(
        (classroom) => !existingClassroomKeys.has(classroomKey(classroom.classLevelCode, classroom.roomNumber)),
      ).length,
      classroomsToUpdate: classrooms.filter(
        (classroom) => existingClassroomKeys.has(classroomKey(classroom.classLevelCode, classroom.roomNumber)),
      ).length,
      studentsToCreate: students.filter((student) => !existingStudentCodes.has(student.studentCode)).length,
      studentsToUpdate: students.filter((student) => existingStudentCodes.has(student.studentCode)).length,
      enrollmentsToCreate: students.filter((student) => {
        const studentId = existingStudentIdByCode.get(student.studentCode);
        return !studentId || !existingEnrollmentStudentIds.has(studentId);
      }).length,
      enrollmentsToUpdate: students.filter((student) => {
        const studentId = existingStudentIdByCode.get(student.studentCode);
        return Boolean(studentId && existingEnrollmentStudentIds.has(studentId));
      }).length,
    };
  }

  const summary = {
    sourceFile: args.excelPath,
    academicYearBe: args.academicYearBe,
    parsedClassrooms: classrooms.length,
    parsedStudents: students.length,
    adjustedDuplicateStudentCodes: students
      .filter((student) => student.adjustedDuplicateCode)
      .map((student) => ({
        classroom: student.classroomName,
        rowNumber: student.rowNumber,
        originalCode: student.sourceStudentCode,
        importedCode: student.studentCode,
        name: student.fullNameRaw,
      })),
    skippedRows,
    databaseValidation: Boolean(serviceClient),
    databaseSummary,
    homeroomIssues: classroomSummary(classrooms, homeroomResolutions)
      .filter((item) => item.unresolvedHomeroomTeachers.length > 0 || item.extraHomeroomTeachers.length > 0),
    classroomSummary: classroomSummary(classrooms, homeroomResolutions),
  };

  if (args.dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  if (!serviceClient || !url || !serviceKey) {
    throw new Error('ต้องตั้ง VITE_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ก่อนนำเข้าจริง');
  }

  const schoolId = await resolveSchoolId(serviceClient);
  const profiles = await loadProfiles(serviceClient);
  homeroomResolutions = resolveHomeroomTeachers(classrooms, profiles);

  const existingAcademicYearId = await loadExistingAcademicYearId(serviceClient, schoolId, args.academicYearBe);
  const existingClassrooms = existingAcademicYearId
    ? await loadExistingClassrooms(serviceClient, existingAcademicYearId)
    : [];
  const existingStudents = await loadExistingStudents(serviceClient, schoolId);
  const existingEnrollments = existingAcademicYearId
    ? await loadExistingEnrollments(serviceClient, existingAcademicYearId)
    : [];

  const existingClassroomKeys = new Set(
    existingClassrooms.map((classroom) => classroomKey(classroom.class_level_code, classroom.room_number)),
  );
  const existingStudentCodes = new Set(existingStudents.map((student) => student.student_code));
  const existingEnrollmentStudentIds = new Set(existingEnrollments.map((enrollment) => enrollment.student_id));
  const existingStudentIdByCode = new Map(existingStudents.map((student) => [student.student_code, student.id]));

  const { error: schoolError } = await serviceClient
    .from('schools')
    .update({ max_level_sequence: MAX_LEVEL_SEQUENCE })
    .eq('id', schoolId);
  if (schoolError) throw schoolError;

  const academicYearId = await ensureAcademicYear(serviceClient, schoolId, args.academicYearBe);
  const classroomIdByName = await upsertClassrooms(
    serviceClient,
    schoolId,
    academicYearId,
    classrooms,
    homeroomResolutions,
  );
  const studentIdByCode = await upsertStudents(serviceClient, schoolId, students);
  const importedStudentIds = await upsertEnrollments(
    serviceClient,
    academicYearId,
    students,
    studentIdByCode,
    classroomIdByName,
  );
  const deactivatedEnrollments = await deactivateMissingEnrollments(
    serviceClient,
    academicYearId,
    importedStudentIds,
  );

  console.log(JSON.stringify({
    ...summary,
    academicYearId,
    upsertedClassrooms: classrooms.length,
    createdClassrooms: classrooms.filter(
      (classroom) => !existingClassroomKeys.has(classroomKey(classroom.classLevelCode, classroom.roomNumber)),
    ).length,
    updatedClassrooms: classrooms.filter(
      (classroom) => existingClassroomKeys.has(classroomKey(classroom.classLevelCode, classroom.roomNumber)),
    ).length,
    upsertedStudents: students.length,
    createdStudents: students.filter((student) => !existingStudentCodes.has(student.studentCode)).length,
    updatedStudents: students.filter((student) => existingStudentCodes.has(student.studentCode)).length,
    upsertedEnrollments: students.length,
    createdEnrollments: students.filter((student) => {
      const studentId = existingStudentIdByCode.get(student.studentCode);
      return !studentId || !existingEnrollmentStudentIds.has(studentId);
    }).length,
    updatedEnrollments: students.filter((student) => {
      const studentId = existingStudentIdByCode.get(student.studentCode);
      return Boolean(studentId && existingEnrollmentStudentIds.has(studentId));
    }).length,
    deactivatedMissingEnrollments: deactivatedEnrollments,
    updatedSchoolMaxLevelSequence: MAX_LEVEL_SEQUENCE,
  }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
