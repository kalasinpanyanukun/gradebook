export const CURRICULUM_GRADE_LEVELS = [
  'ป.1',
  'ป.2',
  'ป.3',
  'ป.4',
  'ป.5',
  'ป.6',
  'ม.1',
  'ม.2',
  'ม.3',
  'ม.4',
  'ม.5',
  'ม.6',
] as const;

export type CurriculumGradeLevel = (typeof CURRICULUM_GRADE_LEVELS)[number];

export interface CurriculumIndicatorRecord {
  id: string;
  learningArea: string;
  subject: string;
  gradeLevel: CurriculumGradeLevel;
  strandNo: number;
  strandName: string;
  standardCode: string;
  standardDescription: string;
  /** ตัวชี้วัดระหว่างทาง */
  midwayIndicator: string | null;
  /** ตัวชี้วัดปลายทาง */
  exitIndicator: string | null;
  learningAreaNote?: string | null;
}

export interface CurriculumSubjectCatalogItem {
  id: string;
  learningArea: string;
  subject: string;
  description: string;
  availableGrades: CurriculumGradeLevel[];
  recordCount: number;
}
