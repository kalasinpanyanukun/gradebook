#!/usr/bin/env node
/** Print remaining half-file indices for MCP apply (8-21). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../supabase/seed_batches');
const start = Number(process.argv[2] ?? 8);
const end = Number(process.argv[3] ?? 21);
for (let i = start; i <= end; i++) {
  const file = `_q_${i}.txt`;
  const query = fs.readFileSync(path.join(dir, file), 'utf8');
  console.log(JSON.stringify({ i, file, bytes: query.length, project_id: 'ukzdgjkhwwhxomucfrsf', query }));
}
