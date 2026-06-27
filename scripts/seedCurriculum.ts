/**
 * Seed หลักสูตรแกนกลาง 2560 จาก src/data/curriculumData.ts
 * รัน: npm run seed:curriculum
 * ต้องมี VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY ใน .env.local
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { curriculumData } from '../src/data/curriculumData';

function loadEnvFile(filename: string) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  const content = readFileSync(path, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('ต้องตั้ง VITE_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  let standardsInserted = 0;
  let standardsSkipped = 0;
  let indicatorsInserted = 0;
  let indicatorsSkipped = 0;

  for (const subj of curriculumData) {
    for (const std of subj.standards) {
      const { data: existing } = await supabase
        .from('curriculum_standards')
        .select('id')
        .eq('learning_area', subj.learningArea)
        .eq('class_level_code', subj.gradeLevel)
        .eq('standard_code', std.code)
        .maybeSingle();

      let standardId = existing?.id;

      if (!standardId) {
        const { data: inserted, error } = await supabase
          .from('curriculum_standards')
          .insert({
            learning_area: subj.learningArea,
            class_level_code: subj.gradeLevel,
            standard_code: std.code,
            description: std.description,
          })
          .select('id')
          .single();

        if (error) {
          console.error('insert standard failed:', subj.learningArea, subj.gradeLevel, std.code, error.message);
          continue;
        }
        standardId = inserted.id;
        standardsInserted++;
      } else {
        standardsSkipped++;
      }

      for (const ind of std.indicators) {
        const { data: existingInd } = await supabase
          .from('curriculum_indicators')
          .select('id')
          .eq('standard_id', standardId)
          .eq('indicator_code', ind.code)
          .maybeSingle();

        if (existingInd) {
          indicatorsSkipped++;
          continue;
        }

        const { error: indError } = await supabase.from('curriculum_indicators').insert({
          standard_id: standardId,
          indicator_code: ind.code,
          description: ind.description,
        });

        if (indError) {
          console.error('insert indicator failed:', ind.code, indError.message);
          continue;
        }
        indicatorsInserted++;
      }
    }
  }

  const { count: stdCount } = await supabase
    .from('curriculum_standards')
    .select('id', { count: 'exact', head: true });
  const { count: indCount } = await supabase
    .from('curriculum_indicators')
    .select('id', { count: 'exact', head: true });

  console.log('Curriculum seed เสร็จแล้ว');
  console.log(`  มาตรฐาน: +${standardsInserted} ใหม่, ข้าม ${standardsSkipped} (มีอยู่แล้ว)`);
  console.log(`  ตัวชี้วัด: +${indicatorsInserted} ใหม่, ข้าม ${indicatorsSkipped} (มีอยู่แล้ว)`);
  console.log(`  รวมในฐานข้อมูล: ${stdCount ?? 0} มาตรฐาน, ${indCount ?? 0} ตัวชี้วัด`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
