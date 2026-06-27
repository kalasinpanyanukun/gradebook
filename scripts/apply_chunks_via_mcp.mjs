#!/usr/bin/env node
/** List chunk files in order for batches 03-12 (for sequential MCP apply). */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../supabase/seed_batches');
const projectId = 'ukzdgjkhwwhxomucfrsf';
const out = [];

for (let batch = 3; batch <= 12; batch++) {
  let idx = 0;
  while (true) {
    const chunkName = `chunk_${String(batch).padStart(2, '0')}_${String(idx).padStart(2, '0')}.sql`;
    const filePath = path.join(dir, chunkName);
    if (!fs.existsSync(filePath)) break;
    const query = fs.readFileSync(filePath, 'utf8');
    out.push({ batch, chunkName, project_id: projectId, query, bytes: query.length });
    idx++;
  }
}

const listPath = path.join(dir, '_mcp_chunk_list.json');
fs.writeFileSync(listPath, JSON.stringify(out));
console.log(JSON.stringify({ total: out.length, listPath }));
