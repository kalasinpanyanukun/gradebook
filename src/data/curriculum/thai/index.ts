import type { CurriculumIndicatorRecord } from '../types';
import { THAI_STANDARD_DESCRIPTIONS } from './standards';
import { thaiLanguageP1 } from './p1';
import rawParsed from './thaiLanguageData.json';

type RawRow = {
  id: string;
  subject: string;
  learningArea: string;
  gradeLevel: string;
  strandNo: number;
  strandName: string;
  standardCode: string;
  standardDescription: string;
  indicatorCode: string;
  midwayIndicator: string | null;
  exitIndicator: string | null;
  learningAreaNote?: string | null;
};

function cleanIndicatorText(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/\uF098/g, '').replace(/\s+/g, ' ').trim();
}

function mapRawRow(row: RawRow): CurriculumIndicatorRecord {
  return {
    id: row.id,
    learningArea: row.learningArea,
    subject: row.subject,
    gradeLevel: row.gradeLevel as CurriculumIndicatorRecord['gradeLevel'],
    strandNo: row.strandNo,
    strandName: row.strandName,
    standardCode: row.standardCode,
    standardDescription: THAI_STANDARD_DESCRIPTIONS[row.standardCode] ?? row.standardDescription,
    midwayIndicator: cleanIndicatorText(row.midwayIndicator),
    exitIndicator: cleanIndicatorText(row.exitIndicator),
    learningAreaNote: cleanIndicatorText(row.learningAreaNote),
  };
}

const parsedOtherGrades = (rawParsed as RawRow[])
  .filter((row) => row.gradeLevel !== 'ป.1')
  .map(mapRawRow);

function normalizeRecord(row: CurriculumIndicatorRecord): CurriculumIndicatorRecord {
  return {
    ...row,
    midwayIndicator: cleanIndicatorText(row.midwayIndicator),
    exitIndicator: cleanIndicatorText(row.exitIndicator),
    learningAreaNote: cleanIndicatorText(row.learningAreaNote),
  };
}

/** รวมข้อมูลภาษาไทยทุกระดับชั้นที่มีในระบบ */
export const thaiLanguageCurriculum: CurriculumIndicatorRecord[] = [
  ...thaiLanguageP1.map(normalizeRecord),
  ...parsedOtherGrades,
];

export { thaiLanguageP1 } from './p1';
export { THAI_STANDARD_DESCRIPTIONS } from './standards';
