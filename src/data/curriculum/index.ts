import { CURRICULUM_GRADE_LEVELS, type CurriculumIndicatorRecord, type CurriculumSubjectCatalogItem } from './types';
import { artCurriculum } from './art';
import { foreignCurriculum } from './foreign';
import { healthCurriculum } from './health';
import { mathCurriculum } from './math';
import { scienceCurriculum } from './science';
import { socialCurriculum } from './social';
import { thaiLanguageCurriculum } from './thai';
import { occupationCurriculum } from './occupation';
import {
  botanicalElectiveCurriculum,
  electiveCurriculum,
  ELECTIVE_LEARNING_AREA,
  occupationBasicElectiveCurriculum,
} from './elective';

export * from './types';
export { CURRICULUM_GRADE_LEVELS };

const CURRICULUM_BY_AREA: Record<string, CurriculumIndicatorRecord[]> = {
  ภาษาไทย: thaiLanguageCurriculum,
  คณิตศาสตร์: mathCurriculum,
  วิทยาศาสตร์และเทคโนโลยี: scienceCurriculum,
  'สังคมศึกษา ศาสนา และวัฒนธรรม': socialCurriculum,
  สุขศึกษาและพลศึกษา: healthCurriculum,
  ศิลปะ: artCurriculum,
  ภาษาต่างประเทศ: foreignCurriculum,
  การงานอาชีพ: occupationCurriculum,
  [ELECTIVE_LEARNING_AREA]: electiveCurriculum,
};

export const CURRICULUM_SUBJECT_CATALOG: CurriculumSubjectCatalogItem[] = [
  {
    id: 'thai',
    learningArea: 'ภาษาไทย',
    subject: 'ภาษาไทย',
    description: 'มาตรฐานการเรียนรู้และตัวชี้วัด กลุ่มสาระภาษาไทย (ฉบับปรับปรุง พ.ศ. 2568)',
    availableGrades: Array.from(new Set(thaiLanguageCurriculum.map((r) => r.gradeLevel))).sort(
      (a, b) => CURRICULUM_GRADE_LEVELS.indexOf(a) - CURRICULUM_GRADE_LEVELS.indexOf(b),
    ) as CurriculumSubjectCatalogItem['availableGrades'],
    recordCount: thaiLanguageCurriculum.length,
  },
  {
    id: 'math',
    learningArea: 'คณิตศาสตร์',
    subject: 'คณิตศาสตร์',
    description: 'มาตรฐานการเรียนรู้และตัวชี้วัด กลุ่มสาระคณิตศาสตร์ (ฉบับปรับปรุง พ.ศ. 2568)',
    availableGrades: Array.from(new Set(mathCurriculum.map((r) => r.gradeLevel))).sort(
      (a, b) => CURRICULUM_GRADE_LEVELS.indexOf(a) - CURRICULUM_GRADE_LEVELS.indexOf(b),
    ) as CurriculumSubjectCatalogItem['availableGrades'],
    recordCount: mathCurriculum.length,
  },
  {
    id: 'science',
    learningArea: 'วิทยาศาสตร์และเทคโนโลยี',
    subject: 'วิทยาศาสตร์และเทคโนโลยี',
    description: 'มาตรฐานการเรียนรู้และตัวชี้วัด กลุ่มสาระวิทยาศาสตร์และเทคโนโลยี (ฉบับปรับปรุง พ.ศ. 2568)',
    availableGrades: Array.from(new Set(scienceCurriculum.map((r) => r.gradeLevel))).sort(
      (a, b) => CURRICULUM_GRADE_LEVELS.indexOf(a) - CURRICULUM_GRADE_LEVELS.indexOf(b),
    ) as CurriculumSubjectCatalogItem['availableGrades'],
    recordCount: scienceCurriculum.length,
  },
  {
    id: 'social',
    learningArea: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
    subject: 'สังคมศึกษา ศาสนา และวัฒนธรรม',
    description: 'มาตรฐานการเรียนรู้และตัวชี้วัด กลุ่มสาระสังคมศึกษา ศาสนา และวัฒนธรรม (ฉบับปรับปรุง พ.ศ. 2568)',
    availableGrades: Array.from(new Set(socialCurriculum.map((r) => r.gradeLevel))).sort(
      (a, b) => CURRICULUM_GRADE_LEVELS.indexOf(a) - CURRICULUM_GRADE_LEVELS.indexOf(b),
    ) as CurriculumSubjectCatalogItem['availableGrades'],
    recordCount: socialCurriculum.length,
  },
  {
    id: 'health',
    learningArea: 'สุขศึกษาและพลศึกษา',
    subject: 'สุขศึกษาและพลศึกษา',
    description: 'มาตรฐานการเรียนรู้และตัวชี้วัด กลุ่มสาระสุขศึกษาและพลศึกษา (ฉบับปรับปรุง พ.ศ. 2568)',
    availableGrades: Array.from(new Set(healthCurriculum.map((r) => r.gradeLevel))).sort(
      (a, b) => CURRICULUM_GRADE_LEVELS.indexOf(a) - CURRICULUM_GRADE_LEVELS.indexOf(b),
    ) as CurriculumSubjectCatalogItem['availableGrades'],
    recordCount: healthCurriculum.length,
  },
  {
    id: 'art',
    learningArea: 'ศิลปะ',
    subject: 'ศิลปะ',
    description: 'มาตรฐานการเรียนรู้และตัวชี้วัด กลุ่มสาระศิลปะ (ฉบับปรับปรุง พ.ศ. 2568)',
    availableGrades: Array.from(new Set(artCurriculum.map((r) => r.gradeLevel))).sort(
      (a, b) => CURRICULUM_GRADE_LEVELS.indexOf(a) - CURRICULUM_GRADE_LEVELS.indexOf(b),
    ) as CurriculumSubjectCatalogItem['availableGrades'],
    recordCount: artCurriculum.length,
  },
  {
    id: 'foreign',
    learningArea: 'ภาษาต่างประเทศ',
    subject: 'ภาษาต่างประเทศ',
    description: 'มาตรฐานการเรียนรู้และตัวชี้วัด กลุ่มสาระภาษาต่างประเทศ (ฉบับปรับปรุง พ.ศ. 2568)',
    availableGrades: Array.from(new Set(foreignCurriculum.map((r) => r.gradeLevel))).sort(
      (a, b) => CURRICULUM_GRADE_LEVELS.indexOf(a) - CURRICULUM_GRADE_LEVELS.indexOf(b),
    ) as CurriculumSubjectCatalogItem['availableGrades'],
    recordCount: foreignCurriculum.length,
  },
  {
    id: 'occupation',
    learningArea: 'การงานอาชีพ',
    subject: 'การงานอาชีพ',
    description: 'มาตรฐานการเรียนรู้และตัวชี้วัด กลุ่มสาระการงานอาชีพ (ฉบับปรับปรุง พ.ศ. 2568)',
    availableGrades: Array.from(new Set(occupationCurriculum.map((r) => r.gradeLevel))).sort(
      (a, b) => CURRICULUM_GRADE_LEVELS.indexOf(a) - CURRICULUM_GRADE_LEVELS.indexOf(b),
    ) as CurriculumSubjectCatalogItem['availableGrades'],
    recordCount: occupationCurriculum.length,
  },
  {
    id: 'elective-botanical',
    learningArea: ELECTIVE_LEARNING_AREA,
    subject: 'สวนพฤกษศาสตร์ในโรงเรียน',
    description: 'มาตรฐานการเรียนรู้และตัวชี้วัด รายวิชาเพิ่มเติม สวนพฤกษศาสตร์ในโรงเรียน (รหัส ว 5.x หลักสูตรสถานศึกษา)',
    availableGrades: Array.from(new Set(botanicalElectiveCurriculum.map((r) => r.gradeLevel))).sort(
      (a, b) => CURRICULUM_GRADE_LEVELS.indexOf(a) - CURRICULUM_GRADE_LEVELS.indexOf(b),
    ) as CurriculumSubjectCatalogItem['availableGrades'],
    recordCount: botanicalElectiveCurriculum.length,
  },
  {
    id: 'elective-occupation-basic',
    learningArea: ELECTIVE_LEARNING_AREA,
    subject: 'พื้นฐานอาชีพ',
    description: 'มาตรฐานการเรียนรู้และตัวชี้วัด รายวิชาเพิ่มเติม พื้นฐานอาชีพ (หลักสูตรสถานศึกษา)',
    availableGrades: Array.from(new Set(occupationBasicElectiveCurriculum.map((r) => r.gradeLevel))).sort(
      (a, b) => CURRICULUM_GRADE_LEVELS.indexOf(a) - CURRICULUM_GRADE_LEVELS.indexOf(b),
    ) as CurriculumSubjectCatalogItem['availableGrades'],
    recordCount: occupationBasicElectiveCurriculum.length,
  },
];

export function getCurriculumLearningAreas(): string[] {
  return Object.keys(CURRICULUM_BY_AREA);
}

export function getCurriculumRecords(filters?: {
  learningArea?: string;
  subject?: string;
  gradeLevel?: string;
  strandNo?: number;
  search?: string;
}): CurriculumIndicatorRecord[] {
  const area = filters?.learningArea ?? 'ภาษาไทย';
  let rows = CURRICULUM_BY_AREA[area] ?? [];

  if (filters?.subject) {
    rows = rows.filter((row) => row.subject === filters.subject);
  }
  if (filters?.gradeLevel && filters.gradeLevel !== 'all') {
    rows = rows.filter((row) => row.gradeLevel === filters.gradeLevel);
  }
  if (filters?.strandNo) {
    rows = rows.filter((row) => row.strandNo === filters.strandNo);
  }
  if (filters?.search?.trim()) {
    const keyword = filters.search.trim().toLowerCase();
    rows = rows.filter((row) =>
      [
        row.subject,
        row.standardCode,
        row.standardDescription,
        row.strandName,
        row.midwayIndicator,
        row.exitIndicator,
        row.learningAreaNote,
        String(row.strandNo),
        row.gradeLevel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }

  return rows;
}

export function getCurriculumStrandOptions(learningArea: string, gradeLevel?: string) {
  const rows = getCurriculumRecords({
    learningArea,
    gradeLevel: gradeLevel && gradeLevel !== 'all' ? gradeLevel : undefined,
  });
  const map = new Map<number, string>();
  rows.forEach((row) => map.set(row.strandNo, row.strandName));
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([no, name]) => ({ no, name, label: `สาระที่ ${no} ${name}` }));
}

export function getCurriculumSubjectOptions(learningArea: string, gradeLevel?: string): string[] {
  const rows = getCurriculumRecords({
    learningArea,
    gradeLevel: gradeLevel && gradeLevel !== 'all' ? gradeLevel : undefined,
  });
  return Array.from(new Set(rows.map((row) => row.subject))).sort((a, b) => a.localeCompare(b, 'th'));
}
