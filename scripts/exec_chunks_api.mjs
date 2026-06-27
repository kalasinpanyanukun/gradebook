#!/usr/bin/env node
/**
 * Apply seed batch chunks via Supabase Management API.
 * Requires SUPABASE_ACCESS_TOKEN env (from `supabase login` or dashboard).
 * Fallback: prints chunk index for manual MCP apply.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../supabase/seed_batches');
const projectId = 'ukzdgjkhwwhxomucfrsf';
const token = process.env.SUPABASE_ACCESS_TOKEN;
const start = Number(process.argv[2] ?? 0);
const end = Number(process.argv[3] ?? 999);

const list = JSON.parse(fs.readFileSync(path.join(dir, '_mcp_chunk_list.json'), 'utf8'));
const slice = list.slice(start, end + 1);
const results = [];

async function execSql(query) {
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN not set');
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text}`);
  return text;
}

for (const item of slice) {
  try {
    if (token) {
      await execSql(item.query);
      results.push({ chunk: item.chunkName, ok: true });
    } else {
      results.push({ chunk: item.chunkName, ok: false, error: 'no token' });
    }
  } catch (e) {
    results.push({ chunk: item.chunkName, ok: false, error: String(e.message || e) });
  }
}

console.log(JSON.stringify({ start, end, results }, null, 2));
