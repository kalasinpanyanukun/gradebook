#!/usr/bin/env node
/**
 * Apply seed batches 3-12 by reading full SQL from disk.
 * Prints one JSON line per batch: { batch, project_id, queryLength, query }
 * Agent should call execute_sql sequentially with each query.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, '../supabase/seed_batches');
const projectId = 'ukzdgjkhwwhxomucfrsf';
const start = Number(process.argv[2] ?? '3');
const end = Number(process.argv[3] ?? '12');

for (let i = start; i <= end; i++) {
  const name = `batch_${String(i).padStart(2, '0')}.sql`;
  const query = fs.readFileSync(path.join(dir, name), 'utf8');
  const payload = { batch: name, project_id: projectId, queryLength: query.length, query };
  fs.writeFileSync(path.join(dir, `_pending_${name}.json`), JSON.stringify(payload));
  console.log(JSON.stringify({ batch: name, queryLength: query.length, pending: `_pending_${name}.json` }));
}
