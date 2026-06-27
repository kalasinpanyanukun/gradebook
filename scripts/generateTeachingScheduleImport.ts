import fs from 'fs';
import path from 'path';
import { DOMParser as XmlDomParser } from '@xmldom/xmldom';
import { parseAssignmentWordBuffer } from '../src/lib/assignmentImport';

if (typeof globalThis.DOMParser === 'undefined') {
  (globalThis as typeof globalThis & { DOMParser: typeof XmlDomParser }).DOMParser = XmlDomParser;
}

const dir = path.join(process.cwd(), 'teach-table');
const outPath = path.join(process.cwd(), 'src', 'data', 'teachingScheduleImport.ts');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.docx')).sort();

const manifest: Array<{
  fileName: string;
  rowCount: number;
  classrooms: string[];
}> = [];

const allRows: Awaited<ReturnType<typeof parseAssignmentWordBuffer>> = [];

for (const fileName of files) {
  const buffer = fs.readFileSync(path.join(dir, fileName));
  const rows = await parseAssignmentWordBuffer(buffer);
  const classrooms = [...new Set(rows.map((row) => row.classroomName))].sort();
  manifest.push({ fileName, rowCount: rows.length, classrooms });
  allRows.push(...rows);
}

const payload = {
  generatedAt: new Date().toISOString(),
  sourceFiles: manifest,
  rows: allRows,
};

const fileBody = `import type { AssignmentImportRow } from '../lib/assignmentImport';

export interface TeachingScheduleImportPayload {
  generatedAt: string;
  sourceFiles: Array<{
    fileName: string;
    rowCount: number;
    classrooms: string[];
  }>;
  rows: AssignmentImportRow[];
}

export const TEACHING_SCHEDULE_IMPORT: TeachingScheduleImportPayload = ${JSON.stringify(payload, null, 2)} as const;
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, fileBody, 'utf8');

console.log('Parsed', files.length, 'file(s),', allRows.length, 'assignment row(s)');
for (const item of manifest) {
  console.log(`- ${item.fileName}: ${item.rowCount} rows, classrooms: ${item.classrooms.join(', ')}`);
}
