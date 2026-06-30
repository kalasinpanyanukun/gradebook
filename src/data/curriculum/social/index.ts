import { m3CurriculumData } from '../../m3CurriculumData';
import { standardsData } from '../../standards';
import type { CurriculumIndicatorRecord } from '../types';
import {
  convertLegacyIndicators,
  convertStandardsDataIndicators,
  dedupeIndicatorRecords,
  socialStrandFromStandard,
} from '../utils';
import { SOCIAL_LEARNING_AREA, SOCIAL_STANDARD_DESCRIPTIONS } from './standards';
import rawParsed from './socialData.json';

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

function socialSubjectFromStrand(row: RawRow): string {
  switch (row.strandNo) {
    case 1:
      return 'ศาสนา ศีลธรรม จริยธรรม';
    case 2:
      return 'หน้าที่พลเมือง วัฒนธรรม และการดำเนินชีวิตในสังคม';
    case 3:
      return 'เศรษฐศาสตร์';
    case 4:
      return 'ประวัติศาสตร์';
    case 5:
      return 'ภูมิศาสตร์';
    default:
      return row.strandName || SOCIAL_LEARNING_AREA;
  }
}

function mapRawRow(row: RawRow): CurriculumIndicatorRecord {
  return {
    id: row.id,
    learningArea: SOCIAL_LEARNING_AREA,
    subject: socialSubjectFromStrand(row),
    gradeLevel: row.gradeLevel as CurriculumIndicatorRecord['gradeLevel'],
    strandNo: row.strandNo,
    strandName: row.strandName,
    standardCode: row.standardCode,
    standardDescription: SOCIAL_STANDARD_DESCRIPTIONS[row.standardCode] ?? row.standardDescription,
    midwayIndicator: cleanIndicatorText(row.midwayIndicator),
    exitIndicator: cleanIndicatorText(row.exitIndicator),
    learningAreaNote: cleanIndicatorText(row.learningAreaNote),
  };
}

const parsedRows = (rawParsed as RawRow[]).map(mapRawRow);

const secondarySocial = standardsData.find((item) => item.name === SOCIAL_LEARNING_AREA);
const m3Social = m3CurriculumData
  .filter((item) => item.learningArea === SOCIAL_LEARNING_AREA)
  .map((item) => ({ ...item, learningArea: SOCIAL_LEARNING_AREA }));

const secondaryRows = secondarySocial
  ? convertStandardsDataIndicators(
      secondarySocial,
      SOCIAL_LEARNING_AREA,
      'social-secondary',
      socialStrandFromStandard,
      SOCIAL_STANDARD_DESCRIPTIONS,
    )
  : [];
const m3Rows = convertLegacyIndicators(m3Social, 'social-m3', socialStrandFromStandard);

const fallbackRows = [
  ...secondaryRows,
  ...m3Rows,
];

/** รวมข้อมูลสังคมศึกษา ศาสนา และวัฒนธรรมทุกระดับชั้นที่มีในระบบ (จาก PDF หลักสูตรสถานศึกษาและข้อมูลเดิม) */
export const socialCurriculum: CurriculumIndicatorRecord[] = dedupeIndicatorRecords(
  parsedRows.length > 0 ? parsedRows : fallbackRows,
);

export { SOCIAL_LEARNING_AREA, SOCIAL_STANDARD_DESCRIPTIONS } from './standards';
