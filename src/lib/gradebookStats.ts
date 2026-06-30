import type { AppData } from '../types';

export interface GradebookStats {
  completionPercent: number;
  hasTeacherInput: boolean;
  studentCount: number;
  avgScore: number;
  passRate: number;
  gradeDistribution: Record<string, number>;
  attendanceRate: number;
  behaviorAvg: number;
  analyticalAvg: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function getAvg(keys: string[], obj: Record<string, unknown>): number {
  let sum = 0;
  let count = 0;
  keys.forEach((k) => {
    const v = Number(obj[k]);
    if (!Number.isNaN(v) && obj[k] !== '' && obj[k] != null) {
      sum += v;
      count++;
    }
  });
  return count > 0 ? sum / count : 0;
}

function hasFilledValue(value: unknown): boolean {
  if (value == null || value === '') return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasFilledValue);
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(hasFilledValue);
  return false;
}

export function hasTeacherEnteredData(
  data: Partial<Pick<AppData, 'attendance' | 'scores' | 'scoreConfig' | 'attributes' | 'analytical' | 'indicators'>>,
): boolean {
  return (
    hasFilledValue(data.attendance) ||
    hasFilledValue(data.scores) ||
    hasFilledValue(data.scoreConfig) ||
    hasFilledValue(data.attributes) ||
    hasFilledValue(data.analytical) ||
    hasFilledValue(data.indicators)
  );
}

/** ตรงกับ StudentsForm — ช่วง "1-3" หรือคาบเดียว */
function getHoursFromText(text: string): number {
  if (!text) return 0;
  if (text.includes('-')) {
    const [start, end] = text.split('-').map(Number);
    if (Number.isFinite(start) && Number.isFinite(end)) return end - start + 1;
    return 0;
  }
  return 1;
}

function studentTotalScore(score: Record<string, unknown>, d: AppData): number {
  let totalBetweenTerm = 0;
  if (d.scoreConfig?.units) {
    d.scoreConfig.units.forEach((u, uIdx) => {
      u.indicators.forEach((_ind, iIdx) => {
        totalBetweenTerm += Number(score[`u${uIdx}_i${iIdx}`]) || 0;
      });
    });
  } else {
    Object.keys(score).forEach((key) => {
      if (key.startsWith('u') && key.includes('_i')) {
        totalBetweenTerm += Number(score[key]) || 0;
      }
    });
  }
  return totalBetweenTerm + (Number(score.midterm) || 0) + (Number(score.final) || 0);
}

/** สูตรเกรดเดียวกับ GeneralInfoForm / excelExport */
function scoreToGrade(totalScore: number): string {
  if (totalScore >= 80) return '4';
  if (totalScore >= 75) return '3.5';
  if (totalScore >= 70) return '3';
  if (totalScore >= 65) return '2.5';
  if (totalScore >= 60) return '2';
  if (totalScore >= 55) return '1.5';
  if (totalScore >= 50) return '1';
  return '0';
}

/** % เวลามาเรียนต่อคน — ใช้ hoursMap + records เหมือน StudentsForm */
function studentAttendancePercent(
  studentId: string,
  attendance: AppData['attendance']
): number {
  const hoursMap = (attendance?.hoursMap ?? {}) as Record<string, string>;
  const records = (attendance?.records?.[studentId] ?? {}) as Record<string, string>;

  let totalScheduled = 0;
  let attended = 0;

  Object.entries(hoursMap).forEach(([dateKey, hourText]) => {
    const hours = getHoursFromText(hourText);
    if (hours <= 0) return;
    totalScheduled += hours;
    const record = records[dateKey];
    if (record != null && String(record).trim() !== '') {
      attended += hours;
    }
  });

  return totalScheduled > 0 ? (attended / totalScheduled) * 100 : 0;
}

function isCellFilled(value: unknown): boolean {
  return value !== '' && value != null && value !== undefined;
}

const ATTRIBUTE_FIELDS = [
  'attr1_1', 'attr1_2', 'attr1_3', 'attr1_4',
  'attr2_1', 'attr2_2',
  'attr3_1',
  'attr4_1', 'attr4_2',
  'attr5_1', 'attr5_2',
  'attr6_1', 'attr6_2',
  'attr7_1', 'attr7_2', 'attr7_3',
  'attr8_1', 'attr8_2',
] as const;

const ANALYTICAL_FIELDS = ['attr1', 'attr2', 'attr3', 'attr4', 'attr5', 'attr6', 'attr7'] as const;

function countStudentGridFields(
  students: AppData['students'],
  data: Record<string, Record<string, unknown> | undefined>,
  fields: readonly string[],
): { filled: number; total: number } {
  if (students.length === 0 || fields.length === 0) return { filled: 0, total: 0 };

  const total = students.length * fields.length;
  let filled = 0;

  students.forEach((student) => {
    const row = data[student.id] || {};
    fields.forEach((field) => {
      if (isCellFilled(row[field])) filled += 1;
    });
  });

  return { filled, total };
}

function countAttendanceFields(d: AppData): { filled: number; total: number } {
  const students = d.students;
  const hoursMap = (d.attendance?.hoursMap ?? {}) as Record<string, string>;
  const records = (d.attendance?.records ?? {}) as Record<string, Record<string, string>>;
  const dateKeys = Object.keys(hoursMap);

  if (students.length === 0 || dateKeys.length === 0) return { filled: 0, total: 0 };

  let total = dateKeys.length;
  let filled = 0;

  dateKeys.forEach((dateKey) => {
    const hourText = hoursMap[dateKey];
    if (hourText != null && String(hourText).trim() !== '') filled += 1;
  });

  students.forEach((student) => {
    dateKeys.forEach((dateKey) => {
      total += 1;
      const record = records[student.id]?.[dateKey];
      if (record != null && String(record).trim() !== '') filled += 1;
    });
  });

  return { filled, total };
}

function expectedIndicatorCount(scoreConfig: AppData['scoreConfig']): number {
  if (!scoreConfig?.units?.length) return 0;

  const codes = new Set<string>();
  scoreConfig.units.forEach((unit) => {
    unit.indicators.forEach((indicator) => {
      const code = indicator.code?.trim();
      if (code) codes.add(code);
    });
  });

  return codes.size;
}

function countIndicatorFields(d: AppData): { filled: number; total: number } {
  const total = expectedIndicatorCount(d.scoreConfig);
  if (total === 0) return { filled: 0, total: 0 };

  let filled = 0;
  d.indicators.forEach((indicator) => {
    if (indicator.id?.trim() && indicator.description?.trim()) filled += 1;
  });

  return { filled: Math.min(filled, total), total };
}

const COMPLETION_SECTION_WEIGHTS = {
  scores: 35,
  attendance: 25,
  attributes: 15,
  analytical: 15,
  indicators: 10,
} as const;

function weightedCompletion(
  section: { filled: number; total: number },
  weight: number,
): { filled: number; total: number } {
  if (section.total <= 0) return { filled: 0, total: weight };
  return {
    filled: Math.min(1, section.filled / section.total) * weight,
    total: weight,
  };
}

function countGradebookCompletionFields(d: AppData): { filled: number; total: number } {
  if (d.students.length === 0) return { filled: 0, total: 100 };

  const sections = [
    weightedCompletion(countScoreFields(d), COMPLETION_SECTION_WEIGHTS.scores),
    weightedCompletion(countAttendanceFields(d), COMPLETION_SECTION_WEIGHTS.attendance),
    weightedCompletion(
      countStudentGridFields(d.students, d.attributes, ATTRIBUTE_FIELDS),
      COMPLETION_SECTION_WEIGHTS.attributes,
    ),
    weightedCompletion(
      countStudentGridFields(d.students, d.analytical, ANALYTICAL_FIELDS),
      COMPLETION_SECTION_WEIGHTS.analytical,
    ),
    weightedCompletion(countIndicatorFields(d), COMPLETION_SECTION_WEIGHTS.indicators),
  ];

  return sections.reduce(
    (acc, section) => ({
      filled: acc.filled + section.filled,
      total: acc.total + section.total,
    }),
    { filled: 0, total: 0 },
  );
}

export function isGradebookFullyComplete(d: AppData): boolean {
  if (d.students.length === 0 || !d.scoreConfig?.units?.length) return false;

  const sections = [
    countScoreFields(d),
    countAttendanceFields(d),
    countStudentGridFields(d.students, d.attributes, ATTRIBUTE_FIELDS),
    countStudentGridFields(d.students, d.analytical, ANALYTICAL_FIELDS),
    countIndicatorFields(d),
  ];

  if (sections.some((section) => section.total <= 0)) return false;

  return sections.every((section) => section.filled >= section.total);
}

function countScoreFields(d: AppData): { filled: number; total: number } {
  const studentCount = d.students.length;
  if (studentCount === 0) return { filled: 0, total: 0 };

  if (!d.scoreConfig?.units?.length) {
    return { filled: 0, total: 0 };
  }

  let total = 0;
  let filled = 0;

  d.scoreConfig.units.forEach((u, uIdx) => {
    u.indicators.forEach((_ind, iIdx) => {
      total += studentCount;
      d.students.forEach((student) => {
        const score = d.scores[student.id] || {};
        const v = score[`u${uIdx}_i${iIdx}`];
        if (v !== '' && v != null && v !== undefined) filled++;
      });
    });
  });

  total += studentCount * 2;
  d.students.forEach((student) => {
    const score = d.scores[student.id] || {};
    if (score.midterm !== '' && score.midterm != null) filled++;
    if (score.final !== '' && score.final != null) filled++;
  });

  return { filled, total };
}

export function computeGradebookStats(d: AppData): GradebookStats {
  const studentCount = d.students.length;
  const gradeDistribution: Record<string, number> = {
    '4': 0, '3.5': 0, '3': 0, '2.5': 0, '2': 0, '1.5': 0, '1': 0, '0': 0,
  };

  let totalScoreSum = 0;
  let passCount = 0;
  let behaviorSum = 0;
  let analyticalSum = 0;
  let attendanceSum = 0;

  d.students.forEach((student) => {
    const score = (d.scores[student.id] || {}) as Record<string, unknown>;
    const total = studentTotalScore(score, d);
    totalScoreSum += total;
    if (total >= 50) passCount++;
    const grade = scoreToGrade(total);
    gradeDistribution[grade] = (gradeDistribution[grade] ?? 0) + 1;

    const attr = (d.attributes[student.id] || {}) as Record<string, unknown>;
    const avg1 = getAvg(['attr1_1', 'attr1_2', 'attr1_3', 'attr1_4'], attr);
    const avg2 = getAvg(['attr2_1', 'attr2_2'], attr);
    const avg3 = getAvg(['attr3_1', 'attr3_2'], attr);
    const avg4 = getAvg(['attr4_1', 'attr4_2'], attr);
    const avg5 = getAvg(['attr5_1', 'attr5_2'], attr);
    const avg6 = getAvg(['attr6_1', 'attr6_2'], attr);
    const avg7 = getAvg(['attr7_1', 'attr7_2', 'attr7_3'], attr);
    const avg8 = getAvg(['attr8_1', 'attr8_2'], attr);
    behaviorSum += (avg1 + avg2 + avg3 + avg4 + avg5 + avg6 + avg7 + avg8) / 8;

    const anal = (d.analytical[student.id] || {}) as Record<string, unknown>;
    analyticalSum += getAvg(['attr1', 'attr2', 'attr3', 'attr4', 'attr5', 'attr6', 'attr7'], anal);

    attendanceSum += studentAttendancePercent(student.id, d.attendance);
  });

  const { filled, total } = countGradebookCompletionFields(d);
  const completionPercent = total > 0 ? round2((filled / total) * 100) : 0;
  const hasTeacherInput = hasTeacherEnteredData(d);

  return {
    completionPercent,
    hasTeacherInput,
    studentCount,
    avgScore: studentCount > 0 ? round2(totalScoreSum / studentCount) : 0,
    passRate: studentCount > 0 ? round2((passCount / studentCount) * 100) : 0,
    gradeDistribution,
    attendanceRate: studentCount > 0 ? round2(attendanceSum / studentCount) : 0,
    behaviorAvg: studentCount > 0 ? round2(behaviorSum / studentCount) : 0,
    analyticalAvg: studentCount > 0 ? round2(analyticalSum / studentCount) : 0,
  };
}

export function statsToGradebookStatus(
  completionPercent: number,
  hasTeacherInput = false,
  fullyComplete = false,
): 'not_started' | 'in_progress' | 'completed' {
  if (fullyComplete || (completionPercent >= 100 && hasTeacherInput)) return 'completed';
  if (completionPercent > 0 || hasTeacherInput) return 'in_progress';
  return 'not_started';
}

export function ratingTextFromScore(score: number): string {
  const rounded = Math.round(score);
  if (rounded >= 3) return 'ดีเยี่ยม';
  if (rounded === 2) return 'ดี';
  if (rounded === 1) return 'ผ่าน';
  return 'ไม่ผ่าน';
}

export function studentAttendedHours(
  studentId: string,
  attendance: AppData['attendance'],
): number {
  const hoursMap = (attendance?.hoursMap ?? {}) as Record<string, string>;
  const records = (attendance?.records?.[studentId] ?? {}) as Record<string, string>;
  let attendedHours = 0;

  Object.entries(hoursMap).forEach(([dateKey, hourText]) => {
    const record = records[dateKey];
    if (record != null && String(record).trim() !== '') {
      attendedHours += getHoursFromText(hourText);
    }
  });

  return attendedHours;
}

export interface StudentReportSummary {
  attendedHours: number;
  totalScore: number | null;
  gradeLevel: string;
  attributeRating: string;
  analyticalRating: string;
}

export function getStudentReportSummary(
  studentId: string,
  d: Pick<AppData, 'scores' | 'scoreConfig' | 'attributes' | 'analytical' | 'attendance'>,
): StudentReportSummary {
  const score = (d.scores[studentId] || {}) as Record<string, unknown>;
  const hasScore = Object.values(score).some(isCellFilled);
  const totalScore = hasScore ? studentTotalScore(score, d as AppData) : null;
  const gradeLevel = totalScore != null ? scoreToGrade(totalScore) : '—';

  const attr = (d.attributes[studentId] || {}) as Record<string, unknown>;
  const hasAttributes = ATTRIBUTE_FIELDS.some((field) => isCellFilled(attr[field]));
  let attributeRating = '—';
  if (hasAttributes) {
    const avg1 = getAvg(['attr1_1', 'attr1_2', 'attr1_3', 'attr1_4'], attr);
    const avg2 = getAvg(['attr2_1', 'attr2_2'], attr);
    const avg3 = getAvg(['attr3_1', 'attr3_2'], attr);
    const avg4 = getAvg(['attr4_1', 'attr4_2'], attr);
    const avg5 = getAvg(['attr5_1', 'attr5_2'], attr);
    const avg6 = getAvg(['attr6_1', 'attr6_2'], attr);
    const avg7 = getAvg(['attr7_1', 'attr7_2', 'attr7_3'], attr);
    const avg8 = getAvg(['attr8_1', 'attr8_2'], attr);
    const totalAvg = Math.round((avg1 + avg2 + avg3 + avg4 + avg5 + avg6 + avg7 + avg8) / 8);
    attributeRating = ratingTextFromScore(totalAvg);
  }

  const anal = (d.analytical[studentId] || {}) as Record<string, unknown>;
  const hasAnalytical = ANALYTICAL_FIELDS.some((field) => isCellFilled(anal[field]));
  let analyticalRating = '—';
  if (hasAnalytical) {
    const avgAnal = getAvg([...ANALYTICAL_FIELDS], anal);
    analyticalRating = ratingTextFromScore(Math.round(avgAnal));
  }

  return {
    attendedHours: studentAttendedHours(studentId, d.attendance),
    totalScore,
    gradeLevel,
    attributeRating,
    analyticalRating,
  };
}
