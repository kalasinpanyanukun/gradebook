#!/usr/bin/env node
/**
 * Apply remaining seed batches 04-11 via Supabase client inserts parsed from SQL.
 * Uses anon key; relies on RLS policies allowing public ALL on curriculum tables.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'supabase/seed_batches');

function loadEnv(file) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv('.env.local');

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing Supabase URL/key');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

function parseIndicatorInsert(sql) {
  const m = sql.match(/select cs\.id, '([^']+)', '([^']*(?:''[^']*)*)'/s);
  const wm = sql.match(/where cs\.learning_area = '([^']*)'\s+and cs\.class_level_code = '([^']*)'\s+and cs\.standard_code = '([^']*)'/s);
  if (!m || !wm) return null;
  return {
    indicator_code: m[1],
    description: m[2].replace(/''/g, "'"),
    learning_area: wm[1],
    class_level_code: wm[2],
    standard_code: wm[3],
  };
}

function parseStandardInsert(sql) {
  const m = sql.match(/values \('([^']*)', '([^']*)', '([^']*)', '([^']*(?:''[^']*)*)'\)/s);
  if (!m) return null;
  return {
    learning_area: m[1],
    class_level_code: m[2],
    standard_code: m[3],
    description: m[4].replace(/''/g, "'"),
  };
}

async function getStandardId(learning_area, class_level_code, standard_code) {
  const { data, error } = await supabase
    .from('curriculum_standards')
    .select('id')
    .eq('learning_area', learning_area)
    .eq('class_level_code', class_level_code)
    .eq('standard_code', standard_code)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function applyFile(file) {
  const sql = fs.readFileSync(path.join(dir, file), 'utf8');
  const stmts = sql.split(/;\s*\n(?=insert into)/i).map(s => s.trim()).filter(Boolean).map(s => (s.endsWith(';') ? s : s + ';'));
  let ok = 0, skip = 0, err = 0;
  for (const stmt of stmts) {
    try {
      if (/insert into curriculum_standards/i.test(stmt)) {
        const row = parseStandardInsert(stmt);
        if (!row) { err++; continue; }
        const existing = await getStandardId(row.learning_area, row.class_level_code, row.standard_code);
        if (existing) { skip++; continue; }
        const { error } = await supabase.from('curriculum_standards').insert(row);
        if (error) throw error;
        ok++;
      } else if (/insert into curriculum_indicators/i.test(stmt)) {
        const row = parseIndicatorInsert(stmt);
        if (!row) { err++; continue; }
        const standardId = await getStandardId(row.learning_area, row.class_level_code, row.standard_code);
        if (!standardId) { err++; continue; }
        const { data: existing } = await supabase
          .from('curriculum_indicators')
          .select('id')
          .eq('standard_id', standardId)
          .eq('indicator_code', row.indicator_code)
          .maybeSingle();
        if (existing) { skip++; continue; }
        const { error } = await supabase.from('curriculum_indicators').insert({
          standard_id: standardId,
          indicator_code: row.indicator_code,
          description: row.description,
        });
        if (error) throw error;
        ok++;
      }
    } catch (e) {
      console.error(file, e.message || e);
      err++;
    }
  }
  return { file, ok, skip, err, total: stmts.length };
}

const start = Number(process.argv[2] ?? 4);
const end = Number(process.argv[3] ?? 11);
const results = [];
for (let b = start; b <= end; b++) {
  const file = `batch_${String(b).padStart(2, '0')}.sql`;
  results.push(await applyFile(file));
}
console.log(JSON.stringify(results, null, 2));
