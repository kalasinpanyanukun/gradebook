#!/usr/bin/env node
/**
 * Reads batch SQL files and writes per-batch MCP argument JSON files.
 * Agent calls execute_sql with each file's contents sequentially.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, '../supabase/seed_batches');
const projectId = 'ukzdgjkhwwhxomucfrsf';

const batches = [];
for (let i = 1; i <= 12; i++) {
  const name = `batch_${String(i).padStart(2, '0')}.sql`;
  const filePath = path.join(dir, name);
  const query = fs.readFileSync(filePath, 'utf8');
  const args = { project_id: projectId, query };
  const outPath = path.join(dir, `mcp_call_${name}.json`);
  fs.writeFileSync(outPath, JSON.stringify(args));
  batches.push({ name, bytes: query.length, outPath });
}

console.log(JSON.stringify(batches, null, 2));
