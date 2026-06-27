import type { CurriculumIndicatorRecord } from '../types';
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

function mapRawRow(row: RawRow): CurriculumIndicatorRecord {
  return {
    id: row.id,
    learningArea: ART_LEARNING_AREA,
    subject: row.subject,
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

/** รวมข้อมูลศิลปะทุกระดับชั้นที่มีในระบบ (จาก PDF หลักสูตรสถานศึกษา) */
export const artCurriculum: CurriculumIndicatorRecord[] = (rawParsed as RawRow[]).map(mapRawRow);

export { ART_LEARNING_AREA, ART_STANDARD_DESCRIPTIONS } from './standards';
