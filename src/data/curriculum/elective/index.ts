import type { CurriculumIndicatorRecord } from '../types';
import {
  BOTANICAL_GRADES,
  BOTANICAL_STANDARDS,
  OCCUPATION_BASIC_GRADES,
  OCCUPATION_BASIC_STANDARDS,
  type ElectiveStandardDef,
} from './electiveSource';
import {
  BOTANICAL_SUBJECT,
  ELECTIVE_LEARNING_AREA,
  OCCUPATION_BASIC_SUBJECT,
} from './standards';

function formatIndicator(code: string, text: string): string {
  return `${code} ${text}`.replace(/\s+/g, ' ').trim();
}

function resolveIndicatorCode(
  standardCode: string,
  gradeLevel: string,
  indicator: ElectiveStandardDef['indicators'][number],
): string {
  if ('code' in indicator) return indicator.code;
  return `${standardCode} ${gradeLevel}/${indicator.seq}`;
}

function expandElective(
  subject: string,
  grades: typeof BOTANICAL_GRADES,
  standards: ElectiveStandardDef[],
  idPrefix: string,
): CurriculumIndicatorRecord[] {
  const rows: CurriculumIndicatorRecord[] = [];
  let seq = 0;

  for (const gradeLevel of grades) {
    for (const standard of standards) {
      for (const indicator of standard.indicators) {
        seq += 1;
        const indicatorCode = resolveIndicatorCode(standard.code, gradeLevel, indicator);
        rows.push({
          id: `${idPrefix}-${gradeLevel}-${seq}`,
          learningArea: ELECTIVE_LEARNING_AREA,
          subject,
          gradeLevel,
          strandNo: standard.strandNo,
          strandName: standard.strandName,
          standardCode: standard.code,
          standardDescription: standard.description,
          midwayIndicator: null,
          exitIndicator: formatIndicator(indicatorCode, indicator.text),
          learningAreaNote: null,
        });
      }
    }
  }

  return rows;
}

export const botanicalElectiveCurriculum = expandElective(
  BOTANICAL_SUBJECT,
  BOTANICAL_GRADES,
  BOTANICAL_STANDARDS,
  'elec-bot',
);

export const occupationBasicElectiveCurriculum = expandElective(
  OCCUPATION_BASIC_SUBJECT,
  OCCUPATION_BASIC_GRADES,
  OCCUPATION_BASIC_STANDARDS,
  'elec-occ',
);

export const electiveCurriculum: CurriculumIndicatorRecord[] = [
  ...botanicalElectiveCurriculum,
  ...occupationBasicElectiveCurriculum,
];

export {
  BOTANICAL_SUBJECT,
  ELECTIVE_LEARNING_AREA,
  OCCUPATION_BASIC_SUBJECT,
} from './standards';
