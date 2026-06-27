import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEARNING_AREAS } from '../src/lib/learningAreas';

type SubjectType = 'พื้นฐาน' | 'เพิ่มเติม';
type LearningArea = (typeof LEARNING_AREAS)[number];

interface SubjectRow {
  subject_code: string;
  subject_name: string;
  learning_area: LearningArea;
  subject_type: SubjectType;
  class_level: string;
  semester: 1 | 2 | null;
  credits: number | null;
  hours_total: number;
  hours_per_week: number;
  is_active: boolean;
  flag: '' | 'ตรวจสอบ';
  group: 'primary' | 'lower' | 'm4' | 'm5' | 'm6';
}

interface SemesterPairSpec {
  letter: keyof typeof AREA_BY_LETTER;
  subjectName: string;
  subjectType: SubjectType;
  semester1Seq: number;
  semester2Seq: number;
  credits: number;
  hoursTotal: number;
  hoursPerWeek: number;
  flag?: SubjectRow['flag'];
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = join(repoRoot, 'supabase', 'seed_source', 'subjects_catalog.csv');
const sqlPath = join(repoRoot, 'supabase', 'migrations', '0015_seed_subjects.sql');
const tsPath = join(repoRoot, 'src', 'data', 'subjectsCatalog.ts');

const AREA_BY_LETTER = {
  'ท': 'ภาษาไทย',
  'ค': 'คณิตศาสตร์',
  'ว': 'วิทยาศาสตร์และเทคโนโลยี',
  'ส': 'สังคมศึกษา ศาสนา และวัฒนธรรม',
  'พ': 'สุขศึกษาและพลศึกษา',
  'ศ': 'ศิลปะ',
  'ง': 'การงานอาชีพ',
  'อ': 'ภาษาต่างประเทศ',
} as const;

const SOURCE_LINKS = [
  'ภาษาไทย: https://drive.google.com/file/d/16afGdyueyYW2IV4Lf7mom0zcUI2WPDYY/view',
  'คณิตศาสตร์: https://drive.google.com/file/d/1hfyi1y0rpilqPOIR5TBS_dFw2hAYz-k6/view',
  'วิทยาศาสตร์และเทคโนโลยี: https://drive.google.com/file/d/1lZnnuSlvw1zWl-1KUEezja0L1AE62KjM/view',
  'สังคมศึกษา ศาสนา และวัฒนธรรม: https://drive.google.com/file/d/1XBqy5g3QRHdaAx4AvXeaIzkIU6dzOlc6/view',
  'สุขศึกษาและพลศึกษา: https://drive.google.com/file/d/1_FxZI-zVWlhAo0-rpQEYE5pUQu0ZKkIH/view',
  'ศิลปะ: https://drive.google.com/file/d/18v-4cE4ZsRC6VgCrRSWoI3vfSvAuxDBr/view',
  'การงานอาชีพ: https://drive.google.com/file/d/1JfLkLNJsVpzkP54lo8w3_E7vGsw7Xk7w/view',
  'ภาษาต่างประเทศ: https://drive.google.com/file/d/1u49w7VN0bSTwptylb0paO4dAjhxd0u7i/view',
];

const lowerSecondarySpecs: SemesterPairSpec[] = [
  spec('ท', 'ภาษาไทย', 'พื้นฐาน', 1, 2, 1.5, 60, 3),
  spec('ค', 'คณิตศาสตร์', 'พื้นฐาน', 1, 2, 1.5, 60, 3),
  spec('ว', 'วิทยาศาสตร์', 'พื้นฐาน', 1, 3, 1.0, 40, 2),
  spec('ว', 'วิทยาการคำนวณ', 'พื้นฐาน', 2, 4, 0.5, 20, 1),
  spec('ส', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'พื้นฐาน', 1, 4, 1.0, 40, 2),
  spec('ส', 'ประวัติศาสตร์', 'พื้นฐาน', 2, 5, 0.5, 20, 1),
  spec('ส', 'หน้าที่พลเมือง วัฒนธรรมและการดำเนินชีวิตในสังคม', 'พื้นฐาน', 3, 6, 0.5, 20, 1),
  spec('อ', 'ภาษาอังกฤษ', 'พื้นฐาน', 1, 2, 1.5, 60, 3),
  spec('พ', 'สุขศึกษาและพลศึกษา', 'พื้นฐาน', 1, 2, 1.0, 40, 2),
  spec('ศ', 'ศิลปะ', 'พื้นฐาน', 1, 2, 1.0, 40, 2),
  spec('ง', 'การงานอาชีพ', 'พื้นฐาน', 1, 2, 1.0, 40, 2),
  spec('ง', 'พื้นฐานอาชีพ', 'เพิ่มเติม', 1, 2, 1.0, 40, 2),
  spec('พ', 'กีฬาและนันทนาการ', 'เพิ่มเติม', 1, 2, 1.0, 40, 2),
  spec('ว', 'สวนพฤกษศาสตร์ในโรงเรียน', 'เพิ่มเติม', 1, 2, 0.5, 20, 1),
];

const upperBasicBaseSpecs: SemesterPairSpec[] = [
  spec('ท', 'ภาษาไทย', 'พื้นฐาน', 1, 2, 1.0, 40, 2),
  spec('ค', 'คณิตศาสตร์', 'พื้นฐาน', 1, 2, 1.0, 40, 2),
  spec('ว', 'วิทยาศาสตร์', 'พื้นฐาน', 1, 3, 0.5, 20, 1),
  spec('ว', 'วิทยาการคำนวณ', 'พื้นฐาน', 2, 4, 0.5, 20, 1),
  spec('ส', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'พื้นฐาน', 1, 4, 0.5, 20, 1),
  spec('ส', 'ประวัติศาสตร์', 'พื้นฐาน', 2, 5, 0.5, 20, 1),
  spec('ส', 'หน้าที่พลเมือง วัฒนธรรมและการดำเนินชีวิตในสังคม', 'พื้นฐาน', 3, 6, 0.5, 20, 1),
  spec('อ', 'ภาษาอังกฤษ', 'พื้นฐาน', 1, 2, 1.0, 40, 2),
  spec('พ', 'สุขศึกษาและพลศึกษา', 'พื้นฐาน', 1, 2, 0.5, 20, 1),
  spec('ศ', 'ศิลปะ', 'พื้นฐาน', 1, 2, 0.5, 20, 1),
  spec('ง', 'การงานอาชีพ', 'พื้นฐาน', 1, 2, 0.5, 20, 1),
];

const m4AdditionalSpecs: SemesterPairSpec[] = [
  spec('ง', 'พื้นฐานอาชีพ', 'เพิ่มเติม', 1, 2, 6.0, 240, 12, 'ตรวจสอบ'),
  spec('ว', 'สวนพฤกษศาสตร์ในโรงเรียน', 'เพิ่มเติม', 1, 2, 0.5, 20, 1),
];

const m5AdditionalSpecs: SemesterPairSpec[] = [
  spec('ค', 'คณิตศาสตร์', 'เพิ่มเติม', 1, 2, 0.5, 20, 1),
  spec('ท', 'ภาษาไทย', 'เพิ่มเติม', 1, 2, 0.5, 20, 1),
  spec('อ', 'ภาษาอังกฤษ', 'เพิ่มเติม', 1, 2, 0.5, 20, 1),
  spec('ว', 'สวนพฤกษศาสตร์ในโรงเรียน', 'เพิ่มเติม', 1, 2, 0.5, 20, 1),
  spec('ส', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'เพิ่มเติม', 1, 2, 0.5, 20, 1),
  spec('ง', 'อาชีพ', 'เพิ่มเติม', 1, 2, 2.0, 80, 4),
  spec('พ', 'กีฬาและนันทนาการ', 'เพิ่มเติม', 1, 2, 1.0, 40, 2),
  spec('ศ', 'ศิลปะ ดนตรี นาฏศิลป์', 'เพิ่มเติม', 1, 2, 1.0, 40, 2),
];

const m6AdditionalSpecs: SemesterPairSpec[] = [
  spec('ค', 'คณิตศาสตร์', 'เพิ่มเติม', 1, 2, 0.5, 20, 1),
  spec('ท', 'ภาษาไทย', 'เพิ่มเติม', 1, 2, 0.5, 20, 1),
  spec('อ', 'ภาษาอังกฤษ', 'เพิ่มเติม', 1, 2, 0.5, 20, 1),
  spec('ว', 'สวนพฤกษศาสตร์ในโรงเรียน', 'เพิ่มเติม', 1, 2, 0.5, 20, 1),
  spec('ส', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'เพิ่มเติม', 1, 2, 0.5, 20, 1),
  spec('ง', 'อาชีพ', 'เพิ่มเติม', 1, 2, 1.5, 60, 3),
  spec('พ', 'กีฬาและนันทนาการ', 'เพิ่มเติม', 1, 2, 1.5, 60, 3),
  spec('ศ', 'ศิลปะ ดนตรี นาฏศิลป์', 'เพิ่มเติม', 1, 2, 1.5, 60, 3),
];

const m6BasicSpecs: SemesterPairSpec[] = [
  spec('ท', 'ภาษาไทย', 'พื้นฐาน', 1, 2, 1.0, 40, 2),
  spec('ค', 'คณิตศาสตร์', 'พื้นฐาน', 1, 2, 1.0, 40, 2),
  spec('ว', 'วิทยาศาสตร์', 'พื้นฐาน', 1, 3, 0.5, 20, 1),
  spec('ว', 'วิทยาการคำนวณ', 'พื้นฐาน', 2, 4, 0.5, 20, 1),
  spec('ส', 'สังคมศึกษา ศาสนา และวัฒนธรรม', 'พื้นฐาน', 1, 3, 0.5, 20, 1, 'ตรวจสอบ'),
  spec('ส', 'หน้าที่พลเมือง วัฒนธรรมและการดำเนินชีวิตในสังคม', 'พื้นฐาน', 2, 4, 0.5, 20, 1, 'ตรวจสอบ'),
  spec('อ', 'ภาษาอังกฤษ', 'พื้นฐาน', 1, 2, 1.0, 40, 2),
  spec('พ', 'สุขศึกษาและพลศึกษา', 'พื้นฐาน', 1, 2, 0.5, 20, 1),
  spec('ศ', 'ศิลปะ', 'พื้นฐาน', 1, 2, 0.5, 20, 1),
];

function spec(
  letter: keyof typeof AREA_BY_LETTER,
  subjectName: string,
  subjectType: SubjectType,
  semester1Seq: number,
  semester2Seq: number,
  credits: number,
  hoursTotal: number,
  hoursPerWeek: number,
  flag: SubjectRow['flag'] = '',
): SemesterPairSpec {
  return { letter, subjectName, subjectType, semester1Seq, semester2Seq, credits, hoursTotal, hoursPerWeek, flag };
}

function subjectCode(letter: keyof typeof AREA_BY_LETTER, levelDigit: 1 | 2 | 3, yearDigit: number, typeDigit: 1 | 2, seq: number): string {
  return `${letter}${levelDigit}${yearDigit}${typeDigit}${String(seq).padStart(2, '0')}`;
}

function classLevel(stage: 'ป' | 'ม', year: number): string {
  return `${stage}.${year}`;
}

function fromSemesterPair(levelDigit: 2 | 3, yearDigit: number, group: SubjectRow['group'], pair: SemesterPairSpec): SubjectRow[] {
  const typeDigit = pair.subjectType === 'พื้นฐาน' ? 1 : 2;
  const level = classLevel('ม', levelDigit === 2 ? yearDigit : yearDigit + 3);
  return [
    {
      subject_code: subjectCode(pair.letter, levelDigit, yearDigit, typeDigit, pair.semester1Seq),
      subject_name: pair.subjectName,
      learning_area: AREA_BY_LETTER[pair.letter],
      subject_type: pair.subjectType,
      class_level: level,
      semester: 1,
      credits: pair.credits,
      hours_total: pair.hoursTotal,
      hours_per_week: pair.hoursPerWeek,
      is_active: true,
      flag: pair.flag ?? '',
      group,
    },
    {
      subject_code: subjectCode(pair.letter, levelDigit, yearDigit, typeDigit, pair.semester2Seq),
      subject_name: pair.subjectName,
      learning_area: AREA_BY_LETTER[pair.letter],
      subject_type: pair.subjectType,
      class_level: level,
      semester: 2,
      credits: pair.credits,
      hours_total: pair.hoursTotal,
      hours_per_week: pair.hoursPerWeek,
      is_active: true,
      flag: pair.flag ?? '',
      group,
    },
  ];
}

function buildPrimaryRows(): SubjectRow[] {
  const rows: SubjectRow[] = [];
  for (let year = 1; year <= 6; year += 1) {
    const earlyPrimary = year <= 3;
    const baseHours = (early: number, late: number) => (earlyPrimary ? early : late);
    const primarySpecs: Array<{
      letter: keyof typeof AREA_BY_LETTER;
      subjectName: string;
      subjectType: SubjectType;
      seq: number;
      hours13: number;
      hours46: number;
      periods13: number;
      periods46: number;
    }> = [
      { letter: 'ท', subjectName: 'ภาษาไทย', subjectType: 'พื้นฐาน', seq: 1, hours13: 200, hours46: 160, periods13: 5, periods46: 4 },
      { letter: 'ค', subjectName: 'คณิตศาสตร์', subjectType: 'พื้นฐาน', seq: 1, hours13: 200, hours46: 160, periods13: 5, periods46: 4 },
      { letter: 'ว', subjectName: 'วิทยาศาสตร์', subjectType: 'พื้นฐาน', seq: 1, hours13: 40, hours46: 40, periods13: 1, periods46: 1 },
      { letter: 'ว', subjectName: 'วิทยาการคำนวณ', subjectType: 'พื้นฐาน', seq: 2, hours13: 40, hours46: 40, periods13: 1, periods46: 1 },
      { letter: 'ส', subjectName: 'สังคมศึกษา ศาสนา และวัฒนธรรม', subjectType: 'พื้นฐาน', seq: 1, hours13: 40, hours46: 40, periods13: 1, periods46: 1 },
      { letter: 'ส', subjectName: 'ประวัติศาสตร์', subjectType: 'พื้นฐาน', seq: 2, hours13: 40, hours46: 40, periods13: 1, periods46: 1 },
      { letter: 'ส', subjectName: 'หน้าที่พลเมือง วัฒนธรรมและการดำเนินชีวิตในสังคม', subjectType: 'พื้นฐาน', seq: 3, hours13: 40, hours46: 40, periods13: 1, periods46: 1 },
      { letter: 'อ', subjectName: 'ภาษาอังกฤษ', subjectType: 'พื้นฐาน', seq: 1, hours13: 40, hours46: 80, periods13: 1, periods46: 2 },
      { letter: 'พ', subjectName: 'สุขศึกษาและพลศึกษา', subjectType: 'พื้นฐาน', seq: 1, hours13: 80, hours46: 80, periods13: 2, periods46: 2 },
      { letter: 'ศ', subjectName: 'ศิลปะ', subjectType: 'พื้นฐาน', seq: 1, hours13: 80, hours46: 80, periods13: 2, periods46: 2 },
      { letter: 'ง', subjectName: 'การงานอาชีพ', subjectType: 'พื้นฐาน', seq: 1, hours13: 40, hours46: 80, periods13: 1, periods46: 2 },
      {
        letter: 'ท',
        subjectName: earlyPrimary ? 'ภาษาและการสื่อสาร' : 'ทักษะสังคมและการดำรงชีวิต',
        subjectType: 'เพิ่มเติม',
        seq: 1,
        hours13: 200,
        hours46: 200,
        periods13: 5,
        periods46: 5,
      },
      { letter: 'ว', subjectName: 'สวนพฤกษศาสตร์ในโรงเรียน', subjectType: 'เพิ่มเติม', seq: 1, hours13: 40, hours46: 40, periods13: 1, periods46: 1 },
    ];

    primarySpecs.forEach((item) => {
      rows.push({
        subject_code: subjectCode(item.letter, 1, year, item.subjectType === 'พื้นฐาน' ? 1 : 2, item.seq),
        subject_name: item.subjectName,
        learning_area: AREA_BY_LETTER[item.letter],
        subject_type: item.subjectType,
        class_level: classLevel('ป', year),
        semester: null,
        credits: null,
        hours_total: baseHours(item.hours13, item.hours46),
        hours_per_week: baseHours(item.periods13, item.periods46),
        is_active: false,
        flag: '',
        group: 'primary',
      });
    });
  }
  return rows;
}

function buildRows(): SubjectRow[] {
  const rows: SubjectRow[] = [];

  rows.push(...buildPrimaryRows());

  for (let year = 1; year <= 3; year += 1) {
    lowerSecondarySpecs.forEach((item) => {
      rows.push(...fromSemesterPair(2, year, 'lower', item));
    });
  }

  upperBasicBaseSpecs.forEach((item) => {
    rows.push(...fromSemesterPair(3, 1, 'm4', item));
  });
  m4AdditionalSpecs.forEach((item) => {
    rows.push(...fromSemesterPair(3, 1, 'm4', item));
  });

  upperBasicBaseSpecs.forEach((item) => {
    rows.push(...fromSemesterPair(3, 2, 'm5', item));
  });
  m5AdditionalSpecs.forEach((item) => {
    rows.push(...fromSemesterPair(3, 2, 'm5', item));
  });

  m6BasicSpecs.forEach((item) => {
    rows.push(...fromSemesterPair(3, 3, 'm6', item));
  });
  m6AdditionalSpecs.forEach((item) => {
    const flagged = item.letter === 'ส' ? { ...item, flag: 'ตรวจสอบ' as const } : item;
    rows.push(...fromSemesterPair(3, 3, 'm6', flagged));
  });

  return rows;
}

function csvEscape(value: string | number | boolean | null): string {
  if (value === null) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function sqlString(value: string | null): string {
  if (value === null) return 'null';
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlNumber(value: number | null): string {
  return value === null ? 'null' : String(value);
}

function sqlBoolean(value: boolean): string {
  return value ? 'true' : 'false';
}

function buildCsv(rows: SubjectRow[]): string {
  const headers = [
    'subject_code',
    'subject_name',
    'learning_area',
    'subject_type',
    'class_level',
    'semester',
    'credits',
    'hours_total',
    'hours_per_week',
    'is_active',
    'flag',
  ];
  const lines = rows.map((row) => [
    row.subject_code,
    row.subject_name,
    row.learning_area,
    row.subject_type,
    row.class_level,
    row.semester,
    row.credits,
    row.hours_total,
    row.hours_per_week,
    row.is_active,
    row.flag,
  ].map(csvEscape).join(','));
  return `${headers.join(',')}\n${lines.join('\n')}\n`;
}

function buildSql(rows: SubjectRow[]): string {
  const sourceComment = SOURCE_LINKS.map((item) => `-- - ${item}`).join('\n');
  const values = rows.map((row) => `  (
    (select id from schools where name like 'โรงเรียนกาฬสินธุ์ปัญญานุกูล%' order by created_at limit 1),
    ${sqlString(row.subject_code)},
    ${sqlString(row.subject_name)},
    ${sqlString(row.learning_area)},
    ${sqlString(row.class_level)},
    ${sqlString(row.subject_type)},
    ${sqlNumber(row.credits)},
    ${sqlNumber(row.hours_total)},
    ${sqlNumber(row.hours_per_week)},
    ${sqlNumber(row.semester)},
    ${sqlBoolean(row.is_active)}
  )`).join(',\n');

  return `-- =========================================================
-- 0015: seed subjects catalog from curriculum structure
-- Generated by scripts/generateSubjectsCatalog.ts
-- Curriculum source links:
${sourceComment}
-- =========================================================

insert into subjects (
  school_id,
  subject_code,
  subject_name,
  learning_area,
  default_class_level,
  subject_type,
  credits,
  hours_total,
  hours_per_week,
  semester_number,
  is_active
)
values
${values}
on conflict (school_id, subject_code) do update set
  subject_name = excluded.subject_name,
  learning_area = excluded.learning_area,
  default_class_level = excluded.default_class_level,
  subject_type = excluded.subject_type,
  credits = excluded.credits,
  hours_total = excluded.hours_total,
  hours_per_week = excluded.hours_per_week,
  semester_number = excluded.semester_number,
  is_active = excluded.is_active;
`;
}

function buildTs(rows: SubjectRow[]): string {
  const items = rows.map((row) => ({
    subject_code: row.subject_code,
    subject_name: row.subject_name,
    learning_area: row.learning_area,
    subject_type: row.subject_type,
    default_class_level: row.class_level,
    semester_number: row.semester,
    credits: row.credits,
    hours_total: row.hours_total,
    hours_per_week: row.hours_per_week,
    is_active: row.is_active,
    flag: row.flag,
  }));

  return `// Generated by scripts/generateSubjectsCatalog.ts. Do not edit manually.

export interface SubjectCatalogItem {
  subject_code: string;
  subject_name: string;
  learning_area: string;
  subject_type: 'พื้นฐาน' | 'เพิ่มเติม';
  default_class_level: string;
  semester_number: 1 | 2 | null;
  credits: number | null;
  hours_total: number;
  hours_per_week: number;
  is_active: boolean;
  flag: '' | 'ตรวจสอบ';
}

export const SUBJECTS_CATALOG = ${JSON.stringify(items, null, 2)} as const satisfies readonly SubjectCatalogItem[];
`;
}

function assertRows(rows: SubjectRow[]): void {
  const expected = {
    primary: 78,
    lower: 84,
    m4: 26,
    m5: 38,
    m6: 34,
  };
  const allowedAreas = new Set<string>(LEARNING_AREAS);
  const byGroup = rows.reduce<Record<SubjectRow['group'], number>>((acc, row) => {
    acc[row.group] += 1;
    if (!allowedAreas.has(row.learning_area)) {
      throw new Error(`Invalid learning area "${row.learning_area}" in ${row.subject_code}`);
    }
    return acc;
  }, { primary: 0, lower: 0, m4: 0, m5: 0, m6: 0 });

  Object.entries(expected).forEach(([group, count]) => {
    const actual = byGroup[group as SubjectRow['group']];
    if (actual !== count) {
      throw new Error(`Expected ${count} rows for ${group}, got ${actual}`);
    }
  });

  const total = rows.length;
  if (total !== 260) throw new Error(`Expected total 260 rows, got ${total}`);

  const duplicate = rows.find((row, index) => rows.findIndex((item) => item.subject_code === row.subject_code) !== index);
  if (duplicate) throw new Error(`Duplicate subject_code: ${duplicate.subject_code}`);
}

async function main(): Promise<void> {
  const rows = buildRows().sort((a, b) => a.class_level.localeCompare(b.class_level, 'th') || a.subject_code.localeCompare(b.subject_code, 'th'));
  assertRows(rows);

  await mkdir(dirname(csvPath), { recursive: true });
  await writeFile(csvPath, buildCsv(rows), 'utf8');
  await writeFile(sqlPath, buildSql(rows), 'utf8');
  await writeFile(tsPath, buildTs(rows), 'utf8');

  const byClass = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.class_level] = (acc[row.class_level] ?? 0) + 1;
    return acc;
  }, {});
  const byGroup = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.group] = (acc[row.group] ?? 0) + 1;
    return acc;
  }, {});
  const flagged = rows.filter((row) => row.flag === 'ตรวจสอบ').length;

  console.log('Generated subjects catalog');
  console.table(byGroup);
  console.table(byClass);
  console.log(`Rows: ${rows.length}`);
  console.log(`Flagged rows: ${flagged}`);
  console.log(`CSV: ${csvPath}`);
  console.log(`SQL: ${sqlPath}`);
  console.log(`TS: ${tsPath}`);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
