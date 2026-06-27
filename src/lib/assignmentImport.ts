import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import type { Classroom, Profile, Subject, UserRole } from '../types';

export interface AssignmentImportRow {
  teacherName: string;
  coTeacherName?: string;
  subjectCode: string;
  subjectName: string;
  classroomName: string;
  hoursPerWeek: number | null;
  hoursPerSemester: number | null;
}

export interface AssignmentReviewRow {
  key: string;
  line: number;
  teacherName: string;
  teacherId: string | null;
  teacherMatchConfidence?: 'exact' | 'compact' | 'fuzzy' | 'manual' | null;
  coTeacherName: string;
  subjectCode: string;
  subjectName: string;
  subjectId: string | null;
  classroomName: string;
  classroomId: string | null;
  hoursPerWeek: number | null;
  hoursPerSemester: number | null;
  issues: string[];
  warnings: string[];
}

const HEADER_ALIASES: Record<Exclude<keyof AssignmentImportRow, 'coTeacherName'>, string[]> = {
  teacherName: ['ครู', 'ชื่อครู', 'ครูผู้สอน', 'ผู้สอน', 'teacher', 'teacher_name'],
  subjectCode: ['รหัสวิชา', 'รหัส', 'subject_code', 'code'],
  subjectName: ['ชื่อวิชา', 'วิชา', 'รายวิชา', 'subject_name', 'subject'],
  classroomName: ['ห้อง', 'ห้องเรียน', 'ชั้น', 'ชั้นเรียน', 'ระดับชั้น', 'classroom', 'class'],
  hoursPerWeek: ['ชม./สัปดาห์', 'ชม/สัปดาห์', 'ชั่วโมง/สัปดาห์', 'hours_per_week'],
  hoursPerSemester: ['ชม./ภาค', 'ชม/ภาค', 'ชั่วโมง/ภาค', 'ชั่วโมง/ภาคเรียน', 'hours_per_semester'],
};

const XML_ELEMENT_NODE = 1;

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeName(value: string): string {
  return value.trim().replace(/\u200b/g, '').replace(/\s+/g, ' ').toLowerCase();
}

function findColumnIndex(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.some((alias) => header === alias.toLowerCase()));
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

const THAI_DIGIT_MAP: Record<string, string> = {
  '๐': '0',
  '๑': '1',
  '๒': '2',
  '๓': '3',
  '๔': '4',
  '๕': '5',
  '๖': '6',
  '๗': '7',
  '๘': '8',
  '๙': '9',
};

const TIMETABLE_SKIP_WORDS = [
  'กิจกรรม',
  'พักรับประทาน',
  'แนะแนว',
  'ชุมนุม',
  'ลูกเสือ',
  'เนตรนารี',
  'PLC',
  'หน้าเสาธง',
  'อบรมคุณธรรม',
  'คุณธรรมจริยธรรม',
  'กิจกรรมส่งเสริม',
  'กิจกรรมชุมชน',
];

const WEEKDAYS = new Set(['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์']);

const TEACHER_MARKER_PATTERN = /(?:ครู|รองฯ|ว่าที่ร้อยตรีหญิง|ว่าที่ร้อยตรี|นางสาว|นาง|นาย)\s*/;
const TEACHER_SPLIT_PATTERN = /(?=(?:ครู|รองฯ|ว่าที่ร้อยตรีหญิง|ว่าที่ร้อยตรี|นางสาว|นาง|นาย)\s*)/g;
const MANAGEMENT_TEACHER_PREFIX = /^(?:รองฯ|ผู้อำนวยการ|หัวหน้า)/u;

function normalizeThaiDigits(value: string): string {
  return value.replace(/[๐-๙]/g, (digit) => THAI_DIGIT_MAP[digit] ?? digit);
}

function normalizeTimetableText(value: string): string {
  return normalizeThaiDigits(value).replace(/\u200b/g, '').replace(/\s+/g, ' ').trim();
}

function stripTeacherPrefix(value: string): string {
  let next = normalizeTimetableText(value);
  let changed = true;
  while (changed) {
    const before = next;
    next = next.replace(/^(?:ครู|รองฯ|ว่าที่ร้อยตรีหญิง|ว่าที่ร้อยตรี|นางสาว|นาง|นาย)\s*/u, '').trim();
    changed = next !== before;
  }
  return next;
}

function classroomNameFromHeading(text: string): string | null {
  const normalized = normalizeTimetableText(text);

  const secondary = normalized.match(/มัธยมศึกษาปีที่\s*(\d+)\s*\/\s*(\d+)/);
  if (secondary) return `ม.${secondary[1]}/${secondary[2]}`;

  const primary = normalized.match(/(?:ชั้น)?ประถมศึกษาปีที่\s*(\d+)(?:\s*\/\s*(\d+))?/);
  if (primary) return `ป.${primary[1]}/${primary[2] ?? '1'}`;

  const shortSecondary = normalized.match(/ม\.?\s*(\d+)\s*\/\s*(\d+)/);
  if (shortSecondary) return `ม.${shortSecondary[1]}/${shortSecondary[2]}`;

  const shortPrimary = normalized.match(/ป\.?\s*(\d+)\s*\/\s*(\d+)/);
  if (shortPrimary) return `ป.${shortPrimary[1]}/${shortPrimary[2]}`;

  return null;
}

function classroomNameFromTable(table: Element): string | null {
  const rows = childElementsByLocalName(table, 'tr').slice(0, 5);
  for (const row of rows) {
    for (const cell of childElementsByLocalName(row, 'tc')) {
      const name = classroomNameFromHeading(docxText(cell));
      if (name) return name;
    }
    const rowText = rowTextContent(row);
    const name = classroomNameFromHeading(rowText);
    if (name) return name;
  }
  return null;
}

function rowTextContent(row: Element): string {
  return normalizeTimetableText(
    childElementsByLocalName(row, 'tc')
      .map((cell) => docxText(cell))
      .filter(Boolean)
      .join(' '),
  );
}

function elementsByLocalName(parent: Document | Element, localName: string): Element[] {
  return Array.from(parent.getElementsByTagNameNS('*', localName));
}

function childElementsByLocalName(parent: ParentNode, localName: string): Element[] {
  return Array.from(parent.childNodes).filter(
    (node): node is Element => node.nodeType === XML_ELEMENT_NODE && (node as Element).localName === localName,
  );
}

function docxText(element: Element): string {
  return normalizeTimetableText(elementsByLocalName(element, 't').map((node) => node.textContent ?? '').join(''));
}

interface DocxTableCell {
  text: string;
  span: number;
}

function docxCellGridSpan(cell: Element): number {
  const gridSpan = elementsByLocalName(cell, 'gridSpan')[0];
  const raw = gridSpan?.getAttribute('w:val') ?? gridSpan?.getAttribute('val');
  const span = Number(raw);
  return Number.isFinite(span) && span > 0 ? span : 1;
}

function parseDocxTable(table: Element): DocxTableCell[][] {
  return childElementsByLocalName(table, 'tr').map((row) =>
    childElementsByLocalName(row, 'tc').map((cell) => ({
      text: docxText(cell),
      span: docxCellGridSpan(cell),
    })),
  );
}

function splitTeachersFromCell(rest: string, teacherMatchIndex: number): string[] {
  return rest
    .slice(teacherMatchIndex)
    .split(TEACHER_SPLIT_PATTERN)
    .map((part) => ({
      raw: normalizeTimetableText(part),
      name: stripTeacherPrefix(part),
    }))
    .filter(({ raw, name }) => {
      if (!name) return false;
      if (MANAGEMENT_TEACHER_PREFIX.test(raw)) return false;
      return true;
    })
    .map(({ name }) => name);
}

function parseTimetableCell(value: string): { code: string; subjectName: string; teachers: string[] } | null {
  const text = normalizeTimetableText(value);
  if (!text || TIMETABLE_SKIP_WORDS.some((word) => text.includes(word))) return null;

  const subjectMatch = text.match(/([A-Za-zก-ฮ]\s*\d{5})\s*(.+)/u);
  if (!subjectMatch) return null;

  const code = subjectMatch[1].replace(/\s+/g, '');
  const rest = subjectMatch[2].trim();
  const teacherMatch = rest.match(TEACHER_MARKER_PATTERN);
  if (!teacherMatch || teacherMatch.index === undefined) return null;

  const subjectName = rest.slice(0, teacherMatch.index).trim();
  const teachers = splitTeachersFromCell(rest, teacherMatch.index);

  if (!subjectName || teachers.length === 0) return null;
  return { code, subjectName, teachers };
}

interface TimetableAggregate {
  classroomName: string;
  subjectCode: string;
  subjectName: string;
  periods: number;
  firstTeacherIndex: Map<string, number>;
  teacherPeriods: Map<string, number>;
}

function addTimetableEntry(
  aggregates: Map<string, TimetableAggregate>,
  classroomName: string,
  entry: { code: string; subjectName: string; teachers: string[] },
  periods: number,
) {
  const key = `${classroomName}|${entry.code}`;
  const current = aggregates.get(key) ?? {
    classroomName,
    subjectCode: entry.code,
    subjectName: entry.subjectName,
    periods: 0,
    firstTeacherIndex: new Map<string, number>(),
    teacherPeriods: new Map<string, number>(),
  };

  current.periods += periods;
  if (entry.subjectName.length > current.subjectName.length) current.subjectName = entry.subjectName;

  for (const teacher of entry.teachers) {
    if (!current.firstTeacherIndex.has(teacher)) {
      current.firstTeacherIndex.set(teacher, current.firstTeacherIndex.size);
    }
    current.teacherPeriods.set(teacher, (current.teacherPeriods.get(teacher) ?? 0) + periods);
  }
  aggregates.set(key, current);
}

function aggregateToImportRows(row: TimetableAggregate): AssignmentImportRow[] {
  const teachers = Array.from(row.teacherPeriods.entries())
    .sort((a, b) => {
      const periodDiff = b[1] - a[1];
      if (periodDiff !== 0) return periodDiff;
      return (row.firstTeacherIndex.get(a[0]) ?? 0) - (row.firstTeacherIndex.get(b[0]) ?? 0);
    })
    .map(([teacher]) => teacher);

  return teachers.map((teacherName) => ({
    teacherName,
    coTeacherName: teachers.filter((teacher) => teacher !== teacherName).join(', '),
    subjectCode: row.subjectCode,
    subjectName: row.subjectName,
    classroomName: row.classroomName,
    hoursPerWeek: row.teacherPeriods.get(teacherName) ?? row.periods,
    hoursPerSemester: (row.teacherPeriods.get(teacherName) ?? row.periods) * 20,
  }));
}

export async function parseAssignmentExcel(file: File): Promise<AssignmentImportRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('ไม่พบชีตในไฟล์ Excel');

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = normalizeHeader(cell.value);
  });

  const cols = {
    teacher: findColumnIndex(headers, HEADER_ALIASES.teacherName),
    code: findColumnIndex(headers, HEADER_ALIASES.subjectCode),
    name: findColumnIndex(headers, HEADER_ALIASES.subjectName),
    classroom: findColumnIndex(headers, HEADER_ALIASES.classroomName),
    hpw: findColumnIndex(headers, HEADER_ALIASES.hoursPerWeek),
    hps: findColumnIndex(headers, HEADER_ALIASES.hoursPerSemester),
  };

  if (cols.teacher < 0 || cols.classroom < 0) {
    throw new Error('ต้องมีคอลัมน์: ครู และ ห้อง (อย่างน้อย)');
  }
  if (cols.code < 0 && cols.name < 0) {
    throw new Error('ต้องมีคอลัมน์รหัสวิชา หรือ ชื่อวิชา');
  }

  const rows: AssignmentImportRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const teacherName = String(row.getCell(cols.teacher + 1).value ?? '').trim();
    const subjectCode = cols.code >= 0 ? String(row.getCell(cols.code + 1).value ?? '').trim() : '';
    const subjectName = cols.name >= 0 ? String(row.getCell(cols.name + 1).value ?? '').trim() : '';
    const classroomName = String(row.getCell(cols.classroom + 1).value ?? '').trim();

    if (!teacherName && !subjectCode && !subjectName && !classroomName) return;
    if (!teacherName || !classroomName) return;
    if (!subjectCode && !subjectName) return;

    rows.push({
      teacherName,
      coTeacherName: '',
      subjectCode,
      subjectName,
      classroomName,
      hoursPerWeek: cols.hpw >= 0 ? parseNumber(row.getCell(cols.hpw + 1).value) : null,
      hoursPerSemester: cols.hps >= 0 ? parseNumber(row.getCell(cols.hps + 1).value) : null,
    });
  });

  return rows;
}

export async function parseAssignmentWordBuffer(buffer: ArrayBuffer): Promise<AssignmentImportRow[]> {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');
  if (!documentXml) throw new Error('ไม่พบเนื้อหาเอกสาร Word');

  const xml = new DOMParser().parseFromString(documentXml, 'application/xml');
  if (xml.getElementsByTagName('parsererror').length > 0) {
    throw new Error('อ่านโครงสร้างไฟล์ Word ไม่สำเร็จ');
  }

  const body = elementsByLocalName(xml, 'body')[0];
  if (!body) throw new Error('ไม่พบเนื้อหาเอกสาร Word');

  const aggregates = new Map<string, TimetableAggregate>();
  let currentClassroomName = '';

  for (const child of Array.from(body.childNodes)) {
    if (child.nodeType !== XML_ELEMENT_NODE) continue;
    const element = child as Element;

    if (element.localName === 'p') {
      const maybeClassroomName = classroomNameFromHeading(docxText(element));
      if (maybeClassroomName) currentClassroomName = maybeClassroomName;
      continue;
    }

    if (element.localName !== 'tbl') continue;

    const tableClassroomName = classroomNameFromTable(element);
    if (tableClassroomName) currentClassroomName = tableClassroomName;
    if (!currentClassroomName) continue;

    for (const tableRow of parseDocxTable(element)) {
      const day = tableRow[0] ? normalizeTimetableText(tableRow[0].text) : '';
      if (!WEEKDAYS.has(day)) continue;

      for (const cell of tableRow.slice(1)) {
        const entry = parseTimetableCell(cell.text);
        if (!entry) continue;
        addTimetableEntry(aggregates, currentClassroomName, entry, cell.span);
      }
    }
  }

  const rows = Array.from(aggregates.values()).flatMap(aggregateToImportRows);

  if (rows.length === 0) {
    throw new Error('ไม่พบรายการวิชาจากตารางสอน Word');
  }

  return rows;
}

export async function parseAssignmentWord(file: File): Promise<AssignmentImportRow[]> {
  return parseAssignmentWordBuffer(await file.arrayBuffer());
}

function compactName(value: string): string {
  return normalizeName(value).replace(/\s+/g, '');
}

function teacherLookupAliases(teacher: Profile): string[] {
  const labels = [
    teacher.full_name,
    [teacher.title, teacher.full_name].filter(Boolean).join(' '),
    stripTeacherPrefix(teacher.full_name),
    stripTeacherPrefix([teacher.title, teacher.full_name].filter(Boolean).join(' ')),
  ];
  const normalized = Array.from(new Set(labels.map(normalizeName).filter(Boolean)));
  const compact = normalized.map(compactName).filter(Boolean);
  return Array.from(new Set([...normalized, ...compact]));
}

interface TeacherLookupCandidate {
  id: string;
  alias: string;
  compactAlias: string;
  firstName: string;
}

interface TeacherLookup {
  exact: Map<string, string>;
  compactExact: Map<string, string>;
  candidates: TeacherLookupCandidate[];
}

type TeacherMatchConfidence = 'exact' | 'compact' | 'fuzzy';

interface TeacherMatchResult {
  teacherId: string | null;
  confidence: TeacherMatchConfidence | null;
}

function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function buildTeacherLookup(teachers: Profile[]): TeacherLookup {
  const exact = new Map<string, string>();
  const compactExact = new Map<string, string>();
  const compactOwner = new Map<string, string | 'ambiguous'>();
  const candidates: TeacherLookupCandidate[] = [];
  const seenCandidateKeys = new Set<string>();

  for (const teacher of teachers) {
    for (const alias of teacherLookupAliases(teacher)) {
      if (!exact.has(alias)) exact.set(alias, teacher.id);

      const compactAlias = compactName(alias);
      if (compactAlias) {
        const owner = compactOwner.get(compactAlias);
        if (!owner) compactOwner.set(compactAlias, teacher.id);
        else if (owner !== teacher.id) compactOwner.set(compactAlias, 'ambiguous');
      }

      const firstName = alias.split(' ')[0] ?? '';
      const candidateKey = `${teacher.id}|${compactAlias}`;
      if (firstName && compactAlias && !seenCandidateKeys.has(candidateKey)) {
        candidates.push({ id: teacher.id, alias, compactAlias, firstName });
        seenCandidateKeys.add(candidateKey);
      }
    }
    if (teacher.username) exact.set(normalizeName(teacher.username), teacher.id);
  }

  for (const [compactAlias, owner] of compactOwner.entries()) {
    if (owner !== 'ambiguous') compactExact.set(compactAlias, owner);
  }

  return { exact, compactExact, candidates };
}

function resolveTeacherMatch(value: string, lookup: TeacherLookup): TeacherMatchResult {
  const aliases = Array.from(
    new Set([normalizeName(value), normalizeName(stripTeacherPrefix(value))].filter(Boolean)),
  );
  for (const alias of aliases) {
    const exactMatch = lookup.exact.get(alias);
    if (exactMatch) return { teacherId: exactMatch, confidence: 'exact' };
  }

  const compactAliases = Array.from(
    new Set(aliases.map(compactName).filter(Boolean)),
  );
  for (const alias of compactAliases) {
    const compactMatch = lookup.compactExact.get(alias);
    if (compactMatch) return { teacherId: compactMatch, confidence: 'compact' };
  }

  const normalized = normalizeName(stripTeacherPrefix(value));
  const firstName = normalized.split(' ')[0] ?? '';
  const compact = compactName(normalized);
  if (!firstName || compact.length < 6) return { teacherId: null, confidence: null };

  const fuzzyMatches = lookup.candidates.filter((candidate) => {
    if (candidate.compactAlias === compact) return true;
    if (candidate.firstName !== firstName && !candidate.compactAlias.startsWith(firstName)) return false;
    if (Math.abs(candidate.compactAlias.length - compact.length) > 2) return false;
    return editDistance(candidate.compactAlias, compact) <= 2;
  });

  const uniqueIds = Array.from(new Set(fuzzyMatches.map((candidate) => candidate.id)));
  if (uniqueIds.length === 1) {
    return { teacherId: uniqueIds[0], confidence: 'fuzzy' };
  }

  return { teacherId: null, confidence: null };
}

function buildSubjectMaps(subjects: Subject[]) {
  const byCode = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const subject of subjects) {
    byCode.set(subject.subject_code.trim().toLowerCase(), subject.id);
    byName.set(normalizeName(subject.subject_name), subject.id);
  }
  return { byCode, byName };
}

function buildClassroomMap(classrooms: Classroom[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const classroom of classrooms) {
    map.set(normalizeName(classroom.name), classroom.id);
    map.set(normalizeName(`${classroom.class_level_code}/${classroom.room_number}`), classroom.id);
    map.set(normalizeName(`${classroom.class_level_code}${classroom.room_number}`), classroom.id);
  }
  return map;
}

export function resolveAssignmentRows(
  rows: AssignmentImportRow[],
  teachers: Profile[],
  subjects: Subject[],
  classrooms: Classroom[],
  options?: { teacherRoles?: UserRole[] },
): AssignmentReviewRow[] {
  const allowedRoles = options?.teacherRoles;
  const eligibleTeachers =
    allowedRoles && allowedRoles.length > 0
      ? teachers.filter((teacher) => allowedRoles.includes(teacher.role))
      : teachers;
  const teacherLookup = buildTeacherLookup(eligibleTeachers);
  const { byCode, byName } = buildSubjectMaps(subjects);
  const classroomMap = buildClassroomMap(classrooms);

  return rows.map((row, index) => {
    const issues: string[] = [];
    const warnings: string[] = [];
    const teacherMatch = resolveTeacherMatch(row.teacherName, teacherLookup);
    const teacherId = teacherMatch.teacherId;
    if (!teacherId) {
      issues.push(allowedRoles ? 'ไม่พบครูผู้สอน' : 'ไม่พบครู');
    } else if (teacherMatch.confidence === 'compact' || teacherMatch.confidence === 'fuzzy') {
      warnings.push('กรุณาตรวจสอบ');
    }

    let subjectId: string | null = null;
    if (row.subjectCode) {
      subjectId = byCode.get(row.subjectCode.toLowerCase()) ?? null;
    }
    if (!subjectId && row.subjectName) {
      subjectId = byName.get(normalizeName(row.subjectName)) ?? null;
    }
    if (!subjectId) issues.push('ไม่พบวิชา');

    const classroomId = classroomMap.get(normalizeName(row.classroomName)) ?? null;
    if (!classroomId) issues.push('ไม่พบห้อง');

    return {
      key: `row-${index}`,
      line: index + 2,
      teacherName: row.teacherName,
      teacherId,
      teacherMatchConfidence: teacherMatch.confidence,
      coTeacherName: row.coTeacherName ?? '',
      subjectCode: row.subjectCode,
      subjectName: row.subjectName,
      subjectId,
      classroomName: row.classroomName,
      classroomId,
      hoursPerWeek: row.hoursPerWeek,
      hoursPerSemester: row.hoursPerSemester,
      issues,
      warnings,
    };
  });
}

export function validateReviewRow(row: AssignmentReviewRow): AssignmentReviewRow {
  const issues: string[] = [];
  const warnings = [...(row.warnings ?? [])];

  if (!row.teacherId) issues.push('ไม่พบครู');
  if (!row.subjectId) issues.push('ไม่พบวิชา');
  if (!row.classroomId) issues.push('ไม่พบห้อง');

  if (row.teacherId && row.teacherMatchConfidence === 'manual') {
    return { ...row, issues, warnings: warnings.filter((warning) => warning !== 'กรุณาตรวจสอบ') };
  }

  if (
    row.teacherId &&
    (row.teacherMatchConfidence === 'compact' || row.teacherMatchConfidence === 'fuzzy') &&
    !warnings.includes('กรุณาตรวจสอบ')
  ) {
    warnings.push('กรุณาตรวจสอบ');
  }

  return { ...row, issues, warnings };
}
