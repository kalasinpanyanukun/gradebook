import { m3CurriculumData } from '../../m3CurriculumData';
import type { CurriculumIndicatorRecord } from '../types';
import { convertLegacyIndicators, dedupeIndicatorRecords } from '../utils';
import { FOREIGN_LEARNING_AREA, FOREIGN_STANDARD_DESCRIPTIONS } from './standards';
import rawParsed from './foreignData.json';

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
    learningArea: FOREIGN_LEARNING_AREA,
    subject: row.subject,
    gradeLevel: row.gradeLevel as CurriculumIndicatorRecord['gradeLevel'],
    strandNo: row.strandNo,
    strandName: row.strandName,
    standardCode: row.standardCode,
    standardDescription: FOREIGN_STANDARD_DESCRIPTIONS[row.standardCode] ?? row.standardDescription,
    midwayIndicator: cleanIndicatorText(row.midwayIndicator),
    exitIndicator: cleanIndicatorText(row.exitIndicator),
    learningAreaNote: cleanIndicatorText(row.learningAreaNote),
  };
}

function foreignStrandFromStandard(standardCode: string): { strandNo: number; strandName: string } {
  const major = Number(standardCode.replace(/[^\d.]/g, '').split('.')[0]);
  if (major === 1) return { strandNo: 1, strandName: 'ภาษาเพื่อการสื่อสาร' };
  if (major === 2) return { strandNo: 2, strandName: 'ภาษาและวัฒนธรรม' };
  if (major === 3) return { strandNo: 3, strandName: 'ภาษากับความสัมพันธ์กับกลุ่มสาระการเรียนรู้อื่น' };
  if (major === 4) return { strandNo: 4, strandName: 'ภาษากับความสัมพันธ์กับชุมชนและโลก' };
  return { strandNo: major, strandName: `สาระที่ ${major}` };
}

const parsedRows = (rawParsed as RawRow[]).map(mapRawRow);
const m3Foreign = m3CurriculumData
  .filter((item) => item.learningArea === FOREIGN_LEARNING_AREA)
  .map((item) => ({ ...item, learningArea: FOREIGN_LEARNING_AREA }));
const m3Rows = convertLegacyIndicators(m3Foreign, 'foreign-m3', foreignStrandFromStandard);

/** รวมข้อมูลภาษาต่างประเทศทุกระดับชั้นที่มีในระบบ (จาก PDF หลักสูตรสถานศึกษาและข้อมูลเดิม) */
export const foreignCurriculum: CurriculumIndicatorRecord[] = dedupeIndicatorRecords(
  parsedRows.length > 0 ? parsedRows : m3Rows,
);

export { FOREIGN_LEARNING_AREA, FOREIGN_STANDARD_DESCRIPTIONS } from './standards';
