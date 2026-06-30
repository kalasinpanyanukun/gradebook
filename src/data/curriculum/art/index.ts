import { m3CurriculumData } from '../../m3CurriculumData';
import type { CurriculumIndicatorRecord } from '../types';
import { convertLegacyIndicators, dedupeIndicatorRecords } from '../utils';
import { ART_LEARNING_AREA, ART_STANDARD_DESCRIPTIONS } from './standards';
import rawParsed from './artData.json';

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

function artSubjectFromStrand(row: RawRow): string {
  switch (row.strandNo) {
    case 1:
      return 'ทัศนศิลป์';
    case 2:
      return 'ดนตรี';
    case 3:
      return 'นาฏศิลป์';
    default:
      return row.strandName || ART_LEARNING_AREA;
  }
}

function mapRawRow(row: RawRow): CurriculumIndicatorRecord {
  return {
    id: row.id,
    learningArea: ART_LEARNING_AREA,
    subject: artSubjectFromStrand(row),
    gradeLevel: row.gradeLevel as CurriculumIndicatorRecord['gradeLevel'],
    strandNo: row.strandNo,
    strandName: row.strandName,
    standardCode: row.standardCode,
    standardDescription: ART_STANDARD_DESCRIPTIONS[row.standardCode] ?? row.standardDescription,
    midwayIndicator: cleanIndicatorText(row.midwayIndicator),
    exitIndicator: cleanIndicatorText(row.exitIndicator),
    learningAreaNote: cleanIndicatorText(row.learningAreaNote),
  };
}

function artStrandFromStandard(standardCode: string): { strandNo: number; strandName: string } {
  const major = Number(standardCode.replace(/[^\d.]/g, '').split('.')[0]);
  if (major === 1) return { strandNo: 1, strandName: 'ทัศนศิลป์' };
  if (major === 2) return { strandNo: 2, strandName: 'ดนตรี' };
  if (major === 3) return { strandNo: 3, strandName: 'นาฏศิลป์' };
  return { strandNo: major, strandName: `สาระที่ ${major}` };
}

const parsedRows = (rawParsed as RawRow[]).map(mapRawRow);
const m3Art = m3CurriculumData
  .filter((item) => item.learningArea === ART_LEARNING_AREA)
  .map((item) => ({ ...item, learningArea: ART_LEARNING_AREA }));
const m3Rows = convertLegacyIndicators(m3Art, 'art-m3', artStrandFromStandard);

/** รวมข้อมูลศิลปะทุกระดับชั้นที่มีในระบบ (จาก PDF หลักสูตรสถานศึกษาและข้อมูลเดิม) */
export const artCurriculum: CurriculumIndicatorRecord[] = dedupeIndicatorRecords(
  parsedRows.length > 0 ? parsedRows : m3Rows,
);

export { ART_LEARNING_AREA, ART_STANDARD_DESCRIPTIONS } from './standards';
