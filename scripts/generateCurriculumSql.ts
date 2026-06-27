/**
 * สร้างไฟล์ SQL seed หลักสูตร (รันครั้งเดียว: npx tsx scripts/generateCurriculumSql.ts)
 */
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { curriculumData } from '../src/data/curriculumData';

function esc(value: string): string {
  return value.replace(/'/g, "''");
}

const standards: string[] = [
  '-- seed มาตรฐานการเรียนรู้ (idempotent)',
  '',
];
const indicators: string[] = [
  '-- seed ตัวชี้วัด (รันหลังมาตรฐาน — idempotent)',
  '',
];

for (const subj of curriculumData) {
  for (const std of subj.standards) {
    standards.push(`
insert into curriculum_standards (learning_area, class_level_code, standard_code, description)
values ('${esc(subj.learningArea)}', '${esc(subj.gradeLevel)}', '${esc(std.code)}', '${esc(std.description)}')
on conflict (learning_area, class_level_code, standard_code) do nothing;`.trim());

    for (const ind of std.indicators) {
      indicators.push(`
insert into curriculum_indicators (standard_id, indicator_code, description)
select cs.id, '${esc(ind.code)}', '${esc(ind.description)}'
from curriculum_standards cs
where cs.learning_area = '${esc(subj.learningArea)}'
  and cs.class_level_code = '${esc(subj.gradeLevel)}'
  and cs.standard_code = '${esc(std.code)}'
on conflict (standard_id, indicator_code) do nothing;`.trim());
    }
  }
}

const dir = resolve(process.cwd(), 'supabase/migrations');
writeFileSync(resolve(dir, '0007_seed_curriculum_standards.sql'), standards.join('\n\n') + '\n');
writeFileSync(resolve(dir, '0008_seed_curriculum_indicators.sql'), indicators.join('\n\n') + '\n');
console.log(`Wrote standards (${standards.length - 2} stmts) + indicators (${indicators.length - 2} stmts)`);
