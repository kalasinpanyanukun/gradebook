#!/usr/bin/env node
/** Print one line: batch label + query length + query (for agent MCP apply) */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../supabase/seed_batches');
const batch = process.argv[2];
if (!batch) {
  console.error('Usage: node scripts/mcp_exec_from_json.mjs <05-11>');
  process.exit(1);
}
const file = path.join(dir, `_exec_args_${batch}.json`);
const { project_id, query } = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(JSON.stringify({ label: `batch_${batch}.sql`, project_id, bytes: query.length, query }));
