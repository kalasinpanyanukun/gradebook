import { curriculumData } from '../../curriculumData';
import { m3CurriculumData } from '../../m3CurriculumData';
import { standardsData } from '../../standards';
import type { CurriculumIndicatorRecord } from '../types';
import {
  convertLegacyIndicators,
  convertStandardsDataIndicators,
  dedupeIndicatorRecords,
  scienceStrandFromStandard,
} from '../utils';
import { SCIENCE_LEARNING_AREA, SCIENCE_STANDARD_DESCRIPTIONS } from './standards';
import rawParsed from './scienceData.json';

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

function scienceSubjectFromStandard(standardCode: string): string {
  const standard = standardCode.replace(/\s+/g, ' ').trim();
  if (standard.startsWith('ว 1.')) return 'ชีววิทยา';
  if (standard === 'ว 2.1') return 'เคมี';
  if (standard === 'ว 2.2' || standard === 'ว 2.3') return 'ฟิสิกส์';
  if (standard.startsWith('ว 3.')) return 'โลกและอวกาศ';
  if (standard === 'ว 4.1') return 'ออกแบบและเทคโนโลยี';
  if (standard === 'ว 4.2') return 'วิทยาการคำนวณ';
  return SCIENCE_LEARNING_AREA;
}

function mapRawRow(row: RawRow): CurriculumIndicatorRecord {
  return {
    id: row.id,
    learningArea: SCIENCE_LEARNING_AREA,
    subject: scienceSubjectFromStandard(row.standardCode),
    gradeLevel: row.gradeLevel as CurriculumIndicatorRecord['gradeLevel'],
    strandNo: row.strandNo,
    strandName: row.strandName,
    standardCode: row.standardCode,
    standardDescription: SCIENCE_STANDARD_DESCRIPTIONS[row.standardCode] ?? row.standardDescription,
    midwayIndicator: cleanIndicatorText(row.midwayIndicator),
    exitIndicator: cleanIndicatorText(row.exitIndicator),
    learningAreaNote: cleanIndicatorText(row.learningAreaNote),
  };
}

const parsedRows = (rawParsed as RawRow[]).map(mapRawRow);

const primaryScience = curriculumData
  .filter((item) => item.learningArea === SCIENCE_LEARNING_AREA || item.subject === 'วิทยาศาสตร์')
  .map((item) => ({ ...item, learningArea: SCIENCE_LEARNING_AREA }));

const secondaryScience = standardsData.find((item) => item.name === SCIENCE_LEARNING_AREA);

const m3Science = m3CurriculumData
  .filter(
    (item) =>
      item.subject === SCIENCE_LEARNING_AREA ||
      (item.learningArea === 'วิทยาศาสตร์' && item.subject !== 'สวนพฤกษศาสตร์โรงเรียน'),
  )
  .map((item) => ({ ...item, learningArea: SCIENCE_LEARNING_AREA }));

const primaryRows = convertLegacyIndicators(primaryScience, 'science-primary', scienceStrandFromStandard);
const secondaryRows = secondaryScience
  ? convertStandardsDataIndicators(
      secondaryScience,
      SCIENCE_LEARNING_AREA,
      'science-secondary',
      scienceStrandFromStandard,
      SCIENCE_STANDARD_DESCRIPTIONS,
    )
  : [];
const m3Rows = convertLegacyIndicators(m3Science, 'science-m3', scienceStrandFromStandard);

const fallbackRows = [
  ...primaryRows,
  ...secondaryRows,
  ...m3Rows,
];

/** รวมข้อมูลวิทยาศาสตร์และเทคโนโลยีทุกระดับชั้นที่มีในระบบ (จาก PDF หลักสูตรสถานศึกษาและข้อมูลเดิม) */
export const scienceCurriculum: CurriculumIndicatorRecord[] = dedupeIndicatorRecords(
  parsedRows.length > 0 ? parsedRows : fallbackRows,
);

export { SCIENCE_LEARNING_AREA, SCIENCE_STANDARD_DESCRIPTIONS } from './standards';
