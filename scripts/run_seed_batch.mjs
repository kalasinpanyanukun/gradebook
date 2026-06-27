#!/usr/bin/env node
/** Print MCP execute_sql args JSON for batch N (1-12) to stdout */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const n = Number(process.argv[2]);
if (!Number.isInteger(n) || n < 1 || n > 12) {
  console.error('Usage: node scripts/run_seed_batch.mjs <1-12>');
  process.exit(1);
}
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../supabase/seed_batches');
const name = `batch_${String(n).padStart(2, '0')}.sql`;
const query = fs.readFileSync(path.join(dir, name), 'utf8');
console.log(JSON.stringify({ project_id: 'ukzdgjkhwwhxomucfrsf', query, _batch: name }));
