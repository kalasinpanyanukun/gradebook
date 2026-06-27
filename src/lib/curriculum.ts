import { supabase } from './supabase';
import {
  curriculumData,
  type Standard,
  getAllSubjects,
  getGradeLevels,
} from '../data/curriculumData';

export type { Standard };

export { getAllSubjects, getGradeLevels };

/** ดึงระดับชั้นจาก "ม.3/1" → "ม.3" */
export function parseClassLevelCode(gradeLevel: string): string {
  const part = gradeLevel.split('/')[0]?.trim();
  return part || gradeLevel;
}

export async function fetchCurriculumStandards(
  learningArea: string,
  gradeLevel: string
): Promise<Standard[]> {
  const classLevelCode = parseClassLevelCode(gradeLevel);

  const { data, error } = await supabase
    .from('curriculum_standards')
    .select('standard_code, description, curriculum_indicators(indicator_code, description)')
    .eq('learning_area', learningArea)
    .eq('class_level_code', classLevelCode);

  if (error || !data?.length) {
    return fallbackStandards(learningArea, classLevelCode);
  }

  return data.map((row) => ({
    code: row.standard_code,
    description: row.description,
    indicators: (row.curriculum_indicators ?? []).map(
      (ind: { indicator_code: string; description: string }) => ({
        code: ind.indicator_code,
        description: ind.description,
      })
    ),
  }));
}

function fallbackStandards(learningArea: string, classLevelCode: string): Standard[] {
  const match = curriculumData.find(
    (c) =>
      (c.learningArea === learningArea || c.subject === learningArea) &&
      c.gradeLevel === classLevelCode
  );
  if (match) return match.standards;

  const byGrade = curriculumData.find((c) => c.gradeLevel === classLevelCode);
  return byGrade?.standards ?? [];
}
