import { supabase } from './supabase';
import {
  curriculumData,
  type Standard,
  getAllSubjects,
  getGradeLevels,
} from '../data/curriculumData';
import {
  getCurriculumRecords,
  getCurriculumSubjectOptions,
  type CurriculumIndicatorRecord,
} from '../data/curriculum';
import { extractIndicatorCode } from '../data/curriculum/utils';
import { standardsData } from '../data/standards';
import {
  applyCurriculumStoreToBase,
  getVisibleCustomCurriculumRecords,
} from './curriculumIndicatorStore';

export type { Standard };

export { getAllSubjects, getGradeLevels };

interface CurriculumFetchOptions {
  subjectCode?: string;
}

/** ดึงระดับชั้นจาก "ม.3/1" → "ม.3" */
export function parseClassLevelCode(gradeLevel: string): string {
  const part = gradeLevel.split('/')[0]?.trim();
  return part || gradeLevel;
}

export async function fetchCurriculumStandards(
  learningArea: string,
  gradeLevel: string,
  subjectName?: string,
  options: CurriculumFetchOptions = {},
): Promise<Standard[]> {
  const classLevelCode = parseClassLevelCode(gradeLevel);

  const curriculumRows = getAdminCurriculumRows(learningArea, classLevelCode);
  const curriculumStandards = buildStandardsFromCurriculumRows(
    resolveCurriculumRowsForSubject(curriculumRows, {
      learningArea,
      subjectName,
      subjectCode: options.subjectCode,
    }),
  );
  if (curriculumStandards.length > 0) return curriculumStandards;

  const { data, error } = await supabase
    .from('curriculum_standards')
    .select('standard_code, description, curriculum_indicators(indicator_code, description)')
    .eq('learning_area', learningArea)
    .eq('class_level_code', classLevelCode);

  if (error || !data?.length) {
    return fallbackStandards(learningArea, classLevelCode, subjectName);
  }

  const rows = data.map((row) => ({
    code: row.standard_code,
    description: row.description,
    indicators: (row.curriculum_indicators ?? []).map(
      (ind: { indicator_code: string; description: string }) => ({
        code: ind.indicator_code,
        description: ind.description,
      })
    ),
  }));

  const filtered = filterStandardsForSubject(rows, learningArea, subjectName);
  return filtered.length > 0 ? filtered : rows;
}

function getAdminCurriculumRows(learningArea: string, classLevelCode: string): CurriculumIndicatorRecord[] {
  const baseRows = applyCurriculumStoreToBase(
    getCurriculumRecords({
      learningArea,
      gradeLevel: classLevelCode,
    }),
  );
  const customRows = getVisibleCustomCurriculumRecords().filter(
    (row) => row.learningArea === learningArea && row.gradeLevel === classLevelCode,
  );
  return [...baseRows, ...customRows];
}

function resolveCurriculumRowsForSubject(
  rows: CurriculumIndicatorRecord[],
  context: {
    learningArea: string;
    subjectName?: string;
    subjectCode?: string;
  },
): CurriculumIndicatorRecord[] {
  if (rows.length === 0) return [];

  const subject = normalizeText(context.subjectName);
  const area = normalizeText(context.learningArea);

  if (subject) {
    const exactSubjectRows = rows.filter((row) => normalizeText(row.subject) === subject);
    if (exactSubjectRows.length > 0) return exactSubjectRows;

    const subjectRows = rows.filter((row) => {
      const rowSubject = normalizeText(row.subject);
      return rowSubject.includes(subject) || subject.includes(rowSubject);
    });
    if (subjectRows.length > 0 && subject !== area) return subjectRows;
  }

  const preferredStrands = inferStrandNos(context.learningArea, context.subjectName, context.subjectCode);
  if (preferredStrands.length > 0) {
    const strandRows = rows.filter((row) => preferredStrands.includes(row.strandNo));
    if (strandRows.length > 0) return strandRows;
  }

  const subjectOptions = getCurriculumSubjectOptions(context.learningArea, rows[0]?.gradeLevel);
  if (subjectOptions.length === 1) {
    const onlySubject = normalizeText(subjectOptions[0]);
    const onlySubjectRows = rows.filter((row) => normalizeText(row.subject) === onlySubject);
    if (onlySubjectRows.length > 0) return onlySubjectRows;
  }

  return rows;
}

function buildStandardsFromCurriculumRows(rows: CurriculumIndicatorRecord[]): Standard[] {
  const standardMap = new Map<string, Standard>();

  for (const row of rows) {
    const standard = standardMap.get(row.standardCode) ?? {
      code: row.standardCode,
      description: row.standardDescription,
      indicators: [],
    };

    for (const value of [row.midwayIndicator, row.exitIndicator]) {
      const indicator = indicatorFromCurriculumText(value, row.standardCode, standard.indicators.length + 1);
      if (!indicator) continue;
      if (!standard.indicators.some((item) => item.code === indicator.code)) {
        standard.indicators.push(indicator);
      }
    }

    if (standard.indicators.length > 0) {
      standardMap.set(row.standardCode, standard);
    }
  }

  return Array.from(standardMap.values()).sort((a, b) => a.code.localeCompare(b.code, 'th'));
}

function indicatorFromCurriculumText(
  value: string | null | undefined,
  standardCode: string,
  fallbackIndex: number,
): Standard['indicators'][number] | null {
  const text = value?.trim();
  if (!text || text === '-') return null;

  const extractedCode = extractIndicatorCode(text);
  const code = extractedCode ?? `${standardCode} #${fallbackIndex}`;
  const description = extractedCode
    ? text.replace(extractedCode, '').trim()
    : text;

  return {
    code,
    description,
  };
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, '').replace(/ฯ/g, '').toLowerCase();
}

function inferStrandNos(
  learningArea: string,
  subjectName?: string,
  subjectCode?: string,
): number[] {
  const area = normalizeText(learningArea);
  const subject = normalizeText(subjectName);
  const code = normalizeText(subjectCode);

  if (area.includes('สังคมศึกษา')) {
    if (subject.includes('ประวัติ')) return [4];
    if (subject.includes('เศรษฐ')) return [3];
    if (subject.includes('ภูมิ')) return [5];
    if (subject.includes('หน้าที่พลเมือง')) return [2];
    if (subject.includes('ศาสนา') || subject.includes('ศีลธรรม') || subject.includes('จริยธรรม')) return [1];

    if (code.startsWith('ส') && code.includes('ประวัติ')) return [4];
    if (subject === area || subject.includes('สังคมศึกษา')) return [1];
  }

  if (area.includes('วิทยาศาสตร์และเทคโนโลยี')) {
    if (subject.includes('วิทยาการคำนวณ') || subject.includes('คำนวณ')) return [4];
    if (subject.includes('ออกแบบ')) return [4];
    if (subject.includes('ชีว')) return [1];
    if (subject.includes('เคมี') || subject.includes('ฟิสิก')) return [2];
    if (subject.includes('โลก') || subject.includes('อวกาศ')) return [3];
  }

  if (area.includes('ศิลปะ')) {
    if (subject.includes('ทัศน')) return [1];
    if (subject.includes('ดนตรี')) return [2];
    if (subject.includes('นาฏ')) return [3];
  }

  if (area.includes('สุขศึกษาและพลศึกษา')) {
    if (subject.includes('พลศึกษา') || subject.includes('พละ')) return [3];
    if (subject.includes('สุขศึกษา')) return [1, 2, 4, 5];
  }

  return [];
}

function subjectStandardPrefixes(learningArea: string, subjectName?: string): string[] {
  const area = normalizeText(learningArea);
  const subject = normalizeText(subjectName);
  if (!subject) return [];

  if (area.includes('วิทยาศาสตร์และเทคโนโลยี')) {
    if (subject.includes('วิทยาการคำนวณ') || subject.includes('คำนวณ')) return ['ว 4.2'];
    if (subject.includes('ออกแบบ')) return ['ว 4.1'];
    if (subject.includes('ชีว')) return ['ว 1.'];
    if (subject.includes('เคมี')) return ['ว 2.1'];
    if (subject.includes('ฟิสิก')) return ['ว 2.2', 'ว 2.3'];
    if (subject.includes('โลก') || subject.includes('อวกาศ')) return ['ว 3.'];
  }

  if (area.includes('สังคมศึกษา')) {
    if (subject.includes('ประวัติ')) return ['ส 4.'];
    if (subject.includes('เศรษฐ')) return ['ส 3.'];
    if (subject.includes('ภูมิ')) return ['ส 5.'];
    if (subject.includes('หน้าที่พลเมือง')) return ['ส 2.'];
    if (subject.includes('ศาสนา') || subject.includes('ศีลธรรม') || subject.includes('จริยธรรม')) return ['ส 1.'];
    if (subject === area || subject.includes('สังคมศึกษา')) return ['ส 1.'];
  }

  if (area.includes('ศิลปะ')) {
    if (subject.includes('ทัศน')) return ['ศ 1.'];
    if (subject.includes('ดนตรี')) return ['ศ 2.'];
    if (subject.includes('นาฏ')) return ['ศ 3.'];
  }

  if (area.includes('สุขศึกษาและพลศึกษา')) {
    if (subject.includes('สุขศึกษา')) return ['พ 1.', 'พ 2.', 'พ 4.', 'พ 5.'];
    if (subject.includes('พลศึกษา') || subject.includes('พละ')) return ['พ 3.'];
  }

  return [];
}

function filterStandardsForSubject(
  standards: Standard[],
  learningArea: string,
  subjectName?: string,
): Standard[] {
  const prefixes = subjectStandardPrefixes(learningArea, subjectName);
  if (prefixes.length === 0) return standards;
  return standards.filter((standard) =>
    prefixes.some((prefix) => standard.code.trim().startsWith(prefix)),
  );
}

function fallbackStandards(learningArea: string, classLevelCode: string, subjectName?: string): Standard[] {
  const match = curriculumData.find(
    (c) =>
      (c.learningArea === learningArea || c.subject === learningArea) &&
      c.gradeLevel === classLevelCode &&
      (!subjectName || normalizeText(c.subject).includes(normalizeText(subjectName)) || normalizeText(subjectName).includes(normalizeText(c.subject)))
  );
  if (match) return filterStandardsForSubject(match.standards, learningArea, subjectName);

  const areaMatch = curriculumData.find(
    (c) =>
      (c.learningArea === learningArea || c.subject === learningArea) &&
      c.gradeLevel === classLevelCode,
  );
  if (areaMatch) return filterStandardsForSubject(areaMatch.standards, learningArea, subjectName);

  const standardsArea = standardsData.find((item) => item.name === learningArea);
  const standards = (standardsArea?.standards ?? [])
    .map((standard) => ({
      code: standard.code,
      description: standard.description,
      indicators: standard.indicators[classLevelCode] ?? [],
    }))
    .filter((standard) => standard.indicators.length > 0);

  return filterStandardsForSubject(standards, learningArea, subjectName);
}
