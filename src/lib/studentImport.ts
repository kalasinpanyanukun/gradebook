import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Classroom, DbStudent } from '../types';

type StudentGender = DbStudent['gender'];

export interface ImportRow {
  studentCode: string;
  citizenId?: string;
  title?: string;
  firstName: string;
  lastName: string;
  gender?: StudentGender;
  studentNumber: number | null;
  classroomName: string;
  sourceLine?: number;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

const HEADER_ALIASES = {
  studentCode: ['เลขประจำตัว', 'รหัสนักเรียน', 'รหัส', 'student_code', 'student code'],
  citizenId: ['เลขบัตรประชาชน', 'เลขประจำตัวประชาชน', 'citizen_id', 'citizen id'],
  title: ['คำนำหน้า', 'title'],
  firstName: ['ชื่อ', 'first_name', 'firstname'],
  lastName: ['สกุล', 'นามสกุล', 'last_name', 'lastname'],
  fullName: ['ชื่อ-สกุล', 'ชื่อ - สกุล', 'ชื่อ-นามสกุล', 'fullname', 'full name'],
  gender: ['เพศ', 'gender'],
  studentNumber: ['ลำดับ', 'ลำดับที่', 'เลขที่', 'เลขที่นั่ง', 'student_number', 'no'],
  classroomName: ['ห้อง', 'ห้องเรียน', 'ชั้น', 'classroom', 'class'],
  classLevel: ['ชั้นเรียน', 'ระดับชั้น', 'class_level'],
} as const;

const TITLE_PREFIXES = [
  'เด็กชาย',
  'เด็กหญิง',
  'นาย',
  'นางสาว',
  'นาง',
  'ด.ช.',
  'ด.ญ.',
];

function cleanText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') {
    const v = value as { text?: string; richText?: Array<{ text?: string }>; result?: unknown };
    if (v.text) return cleanText(v.text);
    if (v.richText) return v.richText.map((item) => item.text ?? '').join('').replace(/\u00a0/g, ' ').trim();
    if (v.result != null) return cleanText(v.result);
    return '';
  }
  return String(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeHeader(value: unknown): string {
  return cleanText(value).toLowerCase();
}

function normalizeLookup(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function findColumnIndex(headers: string[], aliases: readonly string[]): number {
  return headers.findIndex((h) => aliases.some((a) => normalizeLookup(h) === normalizeLookup(a)));
}

function parseNumber(value: unknown): number | null {
  const raw = cleanText(value);
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

function inferGender(title?: string, explicitGender?: string): StudentGender | undefined {
  const explicit = cleanText(explicitGender);
  if (explicit === 'ชาย' || explicit === 'หญิง') return explicit;
  if (title === 'เด็กชาย' || title === 'นาย' || title === 'ด.ช.') return 'ชาย';
  if (title === 'เด็กหญิง' || title === 'นางสาว' || title === 'นาง' || title === 'ด.ญ.') return 'หญิง';
  return undefined;
}

function splitThaiFullName(fullName: string): Pick<ImportRow, 'title' | 'firstName' | 'lastName' | 'gender'> {
  let name = cleanText(fullName);
  let title = '';

  for (const prefix of TITLE_PREFIXES) {
    if (name.startsWith(prefix)) {
      title = prefix;
      name = name.slice(prefix.length).trim();
      break;
    }
  }

  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? name;
  const lastName = parts.join(' ');

  return {
    title: title || undefined,
    firstName,
    lastName,
    gender: inferGender(title),
  };
}

function formatClassroomName(classLevel: string, room: string): string {
  const normalizedRoom = cleanText(room).replace(/^.*\//, '');
  return `${cleanText(classLevel)}/${normalizedRoom}`;
}

function extractRoomNumber(text: string): string {
  const match = text.match(/(\d+)\s*\/\s*(\d+)/);
  return match?.[2] ?? '';
}

function rowText(row: ExcelJS.Row, maxColumns = 10): string {
  const values: string[] = [];
  for (let col = 1; col <= maxColumns; col++) {
    values.push(cleanText(row.getCell(col).value));
  }
  return values.join(' ').replace(/\s+/g, ' ').trim();
}

function parseFlatWorksheet(sheet: ExcelJS.Worksheet): ImportRow[] {
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = normalizeHeader(cell.value);
  });

  const colStudentCode = findColumnIndex(headers, HEADER_ALIASES.studentCode);
  const colCitizenId = findColumnIndex(headers, HEADER_ALIASES.citizenId);
  const colTitle = findColumnIndex(headers, HEADER_ALIASES.title);
  const colFirstName = findColumnIndex(headers, HEADER_ALIASES.firstName);
  const colLastName = findColumnIndex(headers, HEADER_ALIASES.lastName);
  const colFullName = findColumnIndex(headers, HEADER_ALIASES.fullName);
  const colGender = findColumnIndex(headers, HEADER_ALIASES.gender);
  const colStudentNumber = findColumnIndex(headers, HEADER_ALIASES.studentNumber);
  const colClassroom = findColumnIndex(headers, HEADER_ALIASES.classroomName);
  const colClassLevel = findColumnIndex(headers, HEADER_ALIASES.classLevel);

  const hasNameColumns = colFullName >= 0 || (colFirstName >= 0 && colLastName >= 0);
  if (colStudentCode < 0 || !hasNameColumns) return [];

  const rows: ImportRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const studentCode = cleanText(row.getCell(colStudentCode + 1).value);
    if (!studentCode) return;

    const fullName = colFullName >= 0 ? cleanText(row.getCell(colFullName + 1).value) : '';
    const parsedName = fullName ? splitThaiFullName(fullName) : null;
    const title = colTitle >= 0 ? cleanText(row.getCell(colTitle + 1).value) : parsedName?.title;
    const firstName = colFirstName >= 0
      ? cleanText(row.getCell(colFirstName + 1).value)
      : parsedName?.firstName ?? '';
    const lastName = colLastName >= 0
      ? cleanText(row.getCell(colLastName + 1).value)
      : parsedName?.lastName ?? '';
    if (!firstName && !lastName) return;

    const classroomName = colClassroom >= 0
      ? cleanText(row.getCell(colClassroom + 1).value)
      : formatClassroomName(
          colClassLevel >= 0 ? cleanText(row.getCell(colClassLevel + 1).value) : '',
          '',
        );

    rows.push({
      studentCode,
      citizenId: colCitizenId >= 0 ? cleanText(row.getCell(colCitizenId + 1).value) || undefined : undefined,
      title: title || undefined,
      firstName,
      lastName,
      gender: inferGender(title, colGender >= 0 ? cleanText(row.getCell(colGender + 1).value) : undefined),
      studentNumber: colStudentNumber >= 0 ? parseNumber(row.getCell(colStudentNumber + 1).value) : null,
      classroomName,
      sourceLine: rowNumber,
    });
  });

  return rows;
}

function findKspSectionStarts(sheet: ExcelJS.Worksheet): Array<{ rowNumber: number; classroomName: string }> {
  const starts: Array<{ rowNumber: number; classroomName: string }> = [];
  const classLevelCode = sheet.name.trim();

  for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber++) {
    const text = rowText(sheet.getRow(rowNumber), 10);
    if (!text.includes('รายชื่อนักเรียนชั้น')) continue;

    const roomNumber = extractRoomNumber(text);
    if (!roomNumber) continue;
    starts.push({
      rowNumber,
      classroomName: `${classLevelCode}/${roomNumber}`,
    });
  }

  return starts;
}

function findKspHeader(sheet: ExcelJS.Worksheet, startRow: number, endRow: number) {
  for (let rowNumber = startRow; rowNumber <= Math.min(endRow, startRow + 12); rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const headers: string[] = [];
    for (let col = 1; col <= Math.min(sheet.columnCount, 10); col++) {
      headers[col - 1] = normalizeHeader(row.getCell(col).value);
    }

    const colStudentCode = findColumnIndex(headers, HEADER_ALIASES.studentCode);
    const colCitizenId = findColumnIndex(headers, HEADER_ALIASES.citizenId);
    const colFullName = findColumnIndex(headers, HEADER_ALIASES.fullName);
    const colStudentNumber = findColumnIndex(headers, HEADER_ALIASES.studentNumber);

    if (colStudentCode >= 0 && colFullName >= 0) {
      return {
        rowNumber,
        colStudentNumber,
        colStudentCode,
        colCitizenId,
        colFullName,
      };
    }
  }

  return null;
}

function parseKspRosterWorkbook(workbook: ExcelJS.Workbook): ImportRow[] {
  const rows: ImportRow[] = [];

  for (const sheet of workbook.worksheets) {
    const sections = findKspSectionStarts(sheet);
    sections.forEach((section, index) => {
      const nextStart = sections[index + 1]?.rowNumber ?? sheet.rowCount + 1;
      const header = findKspHeader(sheet, section.rowNumber, nextStart - 1);
      if (!header) return;

      for (let rowNumber = header.rowNumber + 1; rowNumber < nextStart; rowNumber++) {
        const row = sheet.getRow(rowNumber);
        const studentCode = cleanText(row.getCell(header.colStudentCode + 1).value);
        const fullName = cleanText(row.getCell(header.colFullName + 1).value);
        if (!studentCode && !fullName) continue;
        if (!studentCode || !fullName || fullName.includes('รวม')) continue;

        const parsedName = splitThaiFullName(fullName);
        rows.push({
          studentCode,
          citizenId: header.colCitizenId >= 0
            ? cleanText(row.getCell(header.colCitizenId + 1).value) || undefined
            : undefined,
          ...parsedName,
          studentNumber: header.colStudentNumber >= 0
            ? parseNumber(row.getCell(header.colStudentNumber + 1).value)
            : null,
          classroomName: section.classroomName,
          sourceLine: rowNumber,
        });
      }
    });
  }

  return rows;
}

export async function parseStudentExcel(file: File): Promise<ImportRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  if (workbook.worksheets.length === 0) throw new Error('ไม่พบชีตในไฟล์ Excel');

  const flatRows = workbook.worksheets.flatMap(parseFlatWorksheet);
  if (flatRows.length > 0) return flatRows;

  const kspRows = parseKspRosterWorkbook(workbook);
  if (kspRows.length > 0) return kspRows;

  throw new Error('ไม่พบข้อมูลนักเรียนในไฟล์ Excel');
}

function studentPayload(row: ImportRow) {
  return {
    first_name: row.firstName,
    last_name: row.lastName,
    status: 'active' as const,
    citizen_id: row.citizenId || null,
    title: row.title || null,
    gender: row.gender ?? null,
  };
}

export async function importStudents(
  rows: ImportRow[],
  schoolId: string,
  academicYearId: string,
  defaultClassroomId: string | null,
  classroomMap: Map<string, string>
): Promise<ImportResult> {
  const { supabase } = await import('./supabase');
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const line = row.sourceLine ?? i + 2;
    const lookupKey = normalizeLookup(row.classroomName);
    const classroomId =
      (row.classroomName ? classroomMap.get(lookupKey) : null) ??
      defaultClassroomId;

    if (!classroomId) {
      result.errors.push(`แถว ${line}: ไม่พบห้อง "${row.classroomName || '—'}"`);
      result.skipped++;
      continue;
    }

    const { data: classroom } = await supabase
      .from('classrooms')
      .select('class_level_code')
      .eq('id', classroomId)
      .single();

    if (!classroom) {
      result.errors.push(`แถว ${line}: ห้องเรียนไม่ถูกต้อง`);
      result.skipped++;
      continue;
    }

    const { data: existing } = await supabase
      .from('students')
      .select('id')
      .eq('school_id', schoolId)
      .eq('student_code', row.studentCode)
      .maybeSingle();

    let studentId = existing?.id;

    if (studentId) {
      const { error } = await supabase
        .from('students')
        .update(studentPayload(row))
        .eq('id', studentId);
      if (error) {
        result.errors.push(`แถว ${line}: ${error.message}`);
        result.skipped++;
        continue;
      }
      result.updated++;
    } else {
      const { data: created, error } = await supabase
        .from('students')
        .insert({
          school_id: schoolId,
          student_code: row.studentCode,
          ...studentPayload(row),
        })
        .select('id')
        .single();
      if (error || !created) {
        result.errors.push(`แถว ${line}: ${error?.message ?? 'สร้างนักเรียนไม่สำเร็จ'}`);
        result.skipped++;
        continue;
      }
      studentId = created.id;
      result.created++;
    }

    const { data: existingEnrollment } = await supabase
      .from('student_enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('academic_year_id', academicYearId)
      .maybeSingle();

    const enrollmentPayload = {
      classroom_id: classroomId,
      class_level_code: classroom.class_level_code,
      student_number: row.studentNumber,
      status: 'active' as const,
    };

    if (existingEnrollment) {
      const { error } = await supabase
        .from('student_enrollments')
        .update(enrollmentPayload)
        .eq('id', existingEnrollment.id);
      if (error) result.errors.push(`แถว ${line}: ${error.message}`);
    } else {
      const { error } = await supabase.from('student_enrollments').insert({
        student_id: studentId,
        academic_year_id: academicYearId,
        ...enrollmentPayload,
      });
      if (error) result.errors.push(`แถว ${line}: ${error.message}`);
    }
  }

  return result;
}

export async function downloadStudentImportTemplate(classrooms: Classroom[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'KSP GradeBook';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('นำเข้านักเรียน');
  sheet.columns = [
    { header: 'รหัสนักเรียน', key: 'studentCode', width: 16 },
    { header: 'เลขบัตรประชาชน', key: 'citizenId', width: 22 },
    { header: 'คำนำหน้า', key: 'title', width: 14 },
    { header: 'ชื่อ', key: 'firstName', width: 20 },
    { header: 'นามสกุล', key: 'lastName', width: 22 },
    { header: 'เพศ', key: 'gender', width: 10 },
    { header: 'ชั้นเรียน', key: 'classLevel', width: 12 },
    { header: 'ห้องเรียน', key: 'classroomName', width: 14 },
    { header: 'เลขที่', key: 'studentNumber', width: 10 },
  ];
  sheet.addRow({
    studentCode: '6901',
    citizenId: '1 2345 67890 12 3',
    title: 'เด็กชาย',
    firstName: 'ตัวอย่าง',
    lastName: 'นักเรียน',
    gender: 'ชาย',
    classLevel: 'ป.1',
    classroomName: 'ป.1/1',
    studentNumber: 1,
  });
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF172554' },
  };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const classroomSheet = workbook.addWorksheet('ห้องเรียน');
  classroomSheet.columns = [
    { header: 'ห้องเรียน', key: 'name', width: 16 },
    { header: 'ชั้นเรียน', key: 'level', width: 12 },
  ];
  classrooms.forEach((classroom) => {
    classroomSheet.addRow({
      name: classroom.name,
      level: classroom.class_level_code,
    });
  });
  classroomSheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, 'student-import-template.xlsx');
}
