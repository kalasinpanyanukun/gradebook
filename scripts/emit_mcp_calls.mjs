#!/usr/bin/env node
/**
 * Apply all pending half/chunk SQL files via Supabase MCP execute_sql pattern.
 * Outputs one JSON line per file for agent to feed to CallMcpTool.
 * Usage: node scripts/emit_mcp_calls.mjs [start] [end]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../supabase/seed_batches');
const queue = JSON.parse(fs.readFileSync(path.join(dir, '_apply_queue.json'), 'utf8'));
const start = Number(process.argv[2] ?? 0);
const end = Number(process.argv[3] ?? queue.length - 1);

for (let i = start; i <= end && i < queue.length; i++) {
  const { file } = queue[i];
  const query = fs.readFileSync(path.join(dir, file), 'utf8');
  const payload = { index: i, file, project_id: 'ukzdgjkhwwhxomucfrsf', query };
  fs.writeFileSync(path.join(dir, `_emit_${String(i).padStart(2, '0')}.json`), JSON.stringify(payload));
  console.log(JSON.stringify({ index: i, file, bytes: query.length, emit: `_emit_${String(i).padStart(2, '0')}.json` }));
}
