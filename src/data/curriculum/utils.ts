import type { CurriculumGradeLevel, CurriculumIndicatorRecord } from './types';

export function cleanIndicatorText(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/\uF098/g, '').replace(/\s+/g, ' ').trim();
}

export function normalizeRecord(row: CurriculumIndicatorRecord): CurriculumIndicatorRecord {
  return {
    ...row,
    midwayIndicator: cleanIndicatorText(row.midwayIndicator),
    exitIndicator: cleanIndicatorText(row.exitIndicator),
    learningAreaNote: cleanIndicatorText(row.learningAreaNote),
  };
}

export function mathStrandFromStandard(standardCode: string): { strandNo: number; strandName: string } {
  const major = Number(standardCode.replace(/[^\d.]/g, '').split('.')[0]);
  if (major === 1) return { strandNo: 1, strandName: 'จำนวนและการดำเนินการ' };
  if (major === 2) return { strandNo: 2, strandName: 'การวัดและเรขาคณิต' };
  if (major === 3) return { strandNo: 3, strandName: 'ข้อมูลและสถิติ' };
  return { strandNo: major, strandName: `สาระที่ ${major}` };
}

export function scienceStrandFromStandard(standardCode: string): { strandNo: number; strandName: string } {
  const major = Number(standardCode.replace(/[^\d.]/g, '').split('.')[0]);
  if (major === 1) return { strandNo: 1, strandName: 'ชีววิทยา' };
  if (major === 2) return { strandNo: 2, strandName: 'เคมีและฟิสิกส์' };
  if (major === 3) return { strandNo: 3, strandName: 'โลกและอวกาศ' };
  if (major === 4) return { strandNo: 4, strandName: 'เทคโนโลยี' };
  return { strandNo: major, strandName: `สาระที่ ${major}` };
}

export function socialStrandFromStandard(standardCode: string): { strandNo: number; strandName: string } {
  const major = Number(standardCode.replace(/[^\d.]/g, '').split('.')[0]);
  if (major === 1) return { strandNo: 1, strandName: 'ศาสนา' };
  if (major === 2) return { strandNo: 2, strandName: 'หน้าที่พลเมืองและวัฒนธรรม' };
  if (major === 3) return { strandNo: 3, strandName: 'เศรษฐศาสตร์' };
  if (major === 4) return { strandNo: 4, strandName: 'ประวัติศาสตร์' };
  if (major === 5) return { strandNo: 5, strandName: 'ภูมิศาสตร์' };
  return { strandNo: major, strandName: `สาระที่ ${major}` };
}

export function healthStrandFromStandard(standardCode: string): { strandNo: number; strandName: string } {
  const major = Number(standardCode.replace(/[^\d.]/g, '').split('.')[0]);
  if (major === 1) return { strandNo: 1, strandName: 'การเจริญเติบโตและพัฒนาการ' };
  if (major === 2) return { strandNo: 2, strandName: 'ครอบครัวและเพศศึกษา' };
  if (major === 3) return { strandNo: 3, strandName: 'การเคลื่อนไหว กิจกรรมทางกาย และกีฬา' };
  if (major === 4) return { strandNo: 4, strandName: 'การสร้างเสริมสุขภาพ' };
  if (major === 5) return { strandNo: 5, strandName: 'การป้องกันปัจจัยเสี่ยง' };
  return { strandNo: major, strandName: `สาระที่ ${major}` };
}

const INDICATOR_CODE_RE = /([ก-ฮ]\s*\d+\.\d+\s*(?:ป|ม)\.\d+\/\d+)/;

export function extractIndicatorCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(INDICATOR_CODE_RE);
  return match ? match[1].replace(/\s+/g, ' ').trim() : null;
}

export function dedupeIndicatorRecords(rows: CurriculumIndicatorRecord[]): CurriculumIndicatorRecord[] {
  const seen = new Set<string>();
  const result: CurriculumIndicatorRecord[] = [];
  for (const row of rows) {
    const code = extractIndicatorCode(row.exitIndicator);
    const key = code ? `${row.gradeLevel}|${code}` : row.id;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }
  return result;
}

export function convertLegacyIndicators(
  items: LegacySubjectCurriculum[],
  idPrefix: string,
  strandResolver: (standardCode: string) => { strandNo: number; strandName: string },
): CurriculumIndicatorRecord[] {
  const rows: CurriculumIndicatorRecord[] = [];
  let seq = 0;

  for (const item of items) {
    for (const standard of item.standards) {
      const strand = strandResolver(standard.code);
      for (const indicator of standard.indicators) {
        seq += 1;
        rows.push(
          normalizeRecord({
            id: `${idPrefix}-${item.gradeLevel}-${seq}`,
            learningArea: item.learningArea,
            subject: item.subject,
            gradeLevel: item.gradeLevel as CurriculumGradeLevel,
            strandNo: strand.strandNo,
            strandName: strand.strandName,
            standardCode: standard.code,
            standardDescription: standard.description,
            midwayIndicator: null,
            exitIndicator: `${indicator.code} ${indicator.description}`.trim(),
            learningAreaNote: null,
          }),
        );
      }
    }
  }

  return rows;
}

interface LegacyIndicator {
  code: string;
  description: string;
}

interface LegacyStandard {
  code: string;
  description: string;
  indicators: LegacyIndicator[];
}

interface LegacySubjectCurriculum {
  subject: string;
  learningArea: string;
  gradeLevel: string;
  standards: LegacyStandard[];
}

interface StandardsDataIndicator {
  code: string;
  description: string;
}

interface StandardsDataSubject {
  name: string;
  standards: {
    code: string;
    description: string;
    indicators: Record<string, StandardsDataIndicator[]>;
  }[];
}

export function convertStandardsDataIndicators(
  subjectArea: StandardsDataSubject,
  learningArea: string,
  idPrefix: string,
  strandResolver: (standardCode: string) => { strandNo: number; strandName: string },
  standardDescriptions?: Record<string, string>,
): CurriculumIndicatorRecord[] {
  const rows: CurriculumIndicatorRecord[] = [];
  let seq = 0;

  for (const standard of subjectArea.standards) {
    const strand = strandResolver(standard.code);
    for (const [gradeLevel, indicators] of Object.entries(standard.indicators)) {
      for (const indicator of indicators) {
        seq += 1;
        rows.push(
          normalizeRecord({
            id: `${idPrefix}-${gradeLevel}-${seq}`,
            learningArea,
            subject: subjectArea.name,
            gradeLevel: gradeLevel as CurriculumGradeLevel,
            strandNo: strand.strandNo,
            strandName: strand.strandName,
            standardCode: standard.code,
            standardDescription: standardDescriptions?.[standard.code] ?? standard.description,
            midwayIndicator: null,
            exitIndicator: `${indicator.code} ${indicator.description}`.trim(),
            learningAreaNote: null,
          }),
        );
      }
    }
  }

  return rows;
}
