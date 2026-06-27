#!/usr/bin/env node
/**
 * Sequential batch executor helper.
 * Reads batch SQL via fs.readFileSync, writes one-line status per batch for agent MCP calls.
 * Usage: node scripts/execute_seed_batches_loop.mjs <batch_num 1-12>
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, '../supabase/seed_batches');
const projectId = 'ukzdgjkhwwhxomucfrsf';
const batchNum = Number(process.argv[2] ?? '1');

if (!Number.isInteger(batchNum) || batchNum < 1 || batchNum > 12) {
  console.error('Usage: node scripts/execute_seed_batches_loop.mjs <1-12>');
  process.exit(1);
}

const name = `batch_${String(batchNum).padStart(2, '0')}.sql`;
const filePath = path.join(dir, name);
const query = fs.readFileSync(filePath, 'utf8');

const payload = { project_id: projectId, query, batch: name, bytes: query.length };
const outPath = path.join(dir, '_current_batch.json');
fs.writeFileSync(outPath, JSON.stringify(payload));
console.log(JSON.stringify({ batch: name, project_id: projectId, bytes: query.length }));
