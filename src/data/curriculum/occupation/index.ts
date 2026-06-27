import type { CurriculumGradeLevel, CurriculumIndicatorRecord } from '../types';
import { OCCUPATION_CORE_EXTENDED_M3, OCCUPATION_CORE_INDICATORS, type CoreIndicatorEntry } from './occupationCoreData';
import { OCCUPATION_LEARNING_AREA, OCCUPATION_STANDARD_DESCRIPTIONS } from './standards';
import rawParsed from './occupationData.json';

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

function stripCodePrefix(text: string, code: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.startsWith(code)) {
    return normalized.slice(code.length).trim();
  }
  return normalized;
}

function descFromField(field: string | null, code: string): string | null {
  if (!field) return null;
  const stripped = stripCodePrefix(field, code);
  return stripped.length >= 3 ? stripped : null;
}

function formatIndicator(code: string, text: string | null): string | null {
  if (!text) return null;
  return `${code} ${text}`.replace(/\s+/g, ' ').trim();
}

function expandM46Grades(grade: CoreIndicatorEntry['gradeLevel']): CurriculumGradeLevel[] {
  if (grade === 'ม.4-6') return ['ม.4', 'ม.5', 'ม.6'];
  return [grade as CurriculumGradeLevel];
}

function schoolKey(gradeLevel: string, code: string): string {
  return `${gradeLevel}|${code}`;
}

function buildSchoolMap(rows: RawRow[]): Map<string, RawRow> {
  const map = new Map<string, RawRow>();
  for (const row of rows) {
    map.set(schoolKey(row.gradeLevel, row.indicatorCode), row);
  }
  return map;
}

function mergeWithCore(parsed: RawRow[], core: CoreIndicatorEntry[]): CurriculumIndicatorRecord[] {
  const schoolMap = buildSchoolMap(parsed);
  const merged: CurriculumIndicatorRecord[] = [];
  let seq = 0;

  for (const entry of core) {
    for (const gradeLevel of expandM46Grades(entry.gradeLevel)) {
      const code = entry.indicatorCode;
      const school = schoolMap.get(schoolKey(gradeLevel, code));
      seq += 1;

      const schoolMid = descFromField(school?.midwayIndicator ?? null, code);
      const schoolExit = descFromField(school?.exitIndicator ?? null, code);

      const midwayText = schoolMid ?? entry.midwayText;
      const exitText = schoolExit ?? entry.exitText;

      const midwayIndicator = formatIndicator(code, midwayText);
      const exitIndicator = formatIndicator(code, exitText);

      merged.push({
        id: school?.id ?? `occp-core-${gradeLevel}-${seq}`,
        learningArea: OCCUPATION_LEARNING_AREA,
        subject: 'การงานอาชีพ',
        gradeLevel,
        strandNo: entry.strandNo,
        strandName: entry.strandName,
        standardCode: entry.standardCode,
        standardDescription: OCCUPATION_STANDARD_DESCRIPTIONS[entry.standardCode] ?? entry.standardCode,
        midwayIndicator: cleanIndicatorText(midwayIndicator),
        exitIndicator: cleanIndicatorText(exitIndicator),
        learningAreaNote: cleanIndicatorText(school?.learningAreaNote),
      });
    }
  }

  return merged;
}

const INDICATOR_CODE_RE = /^ง\s+\d+\.\d+\s+(?:ป|ม)\.\d+(?:-\d+)?\/\d+/;

function indicatorCodeFromRecord(row: CurriculumIndicatorRecord): string | null {
  const source = row.midwayIndicator ?? row.exitIndicator ?? '';
  const match = source.match(INDICATOR_CODE_RE);
  return match ? match[0].replace(/\s+/g, ' ') : null;
}

function appendExtendedOnly(
  rows: CurriculumIndicatorRecord[],
  extended: CoreIndicatorEntry[],
): CurriculumIndicatorRecord[] {
  const seen = new Set(
    rows
      .map((r) => {
        const code = indicatorCodeFromRecord(r);
        return code ? `${r.gradeLevel}|${code}` : null;
      })
      .filter((key): key is string => Boolean(key)),
  );
  let seq = rows.length;

  for (const entry of extended) {
    const code = entry.indicatorCode;
    const dedupeKey = `${entry.gradeLevel}|${code}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    seq += 1;
    rows.push({
      id: `occp-ext-m3-${seq}`,
      learningArea: OCCUPATION_LEARNING_AREA,
      subject: 'การงานอาชีพ',
      gradeLevel: entry.gradeLevel as CurriculumGradeLevel,
      strandNo: entry.strandNo,
      strandName: entry.strandName,
      standardCode: entry.standardCode,
      standardDescription: OCCUPATION_STANDARD_DESCRIPTIONS[entry.standardCode] ?? entry.standardCode,
      midwayIndicator: cleanIndicatorText(formatIndicator(code, entry.midwayText)),
      exitIndicator: cleanIndicatorText(formatIndicator(code, entry.exitText)),
      learningAreaNote: null,
    });
  }

  return rows;
}

const parsedRows = rawParsed as RawRow[];
const fromCore = mergeWithCore(parsedRows, OCCUPATION_CORE_INDICATORS);

/** รวมข้อมูลการงานอาชีพ — หลักสูตรสถานศึกษา + แกนกลาง (midway/exit + มาตรฐานเสริม) */
export const occupationCurriculum: CurriculumIndicatorRecord[] = appendExtendedOnly(
  fromCore,
  OCCUPATION_CORE_EXTENDED_M3,
);

export { OCCUPATION_LEARNING_AREA, OCCUPATION_STANDARD_DESCRIPTIONS } from './standards';
