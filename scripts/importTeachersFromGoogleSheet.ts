import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const AUTH_EMAIL_DOMAIN = 'ksp.gradebook';
const DEFAULT_MEMBERS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1ys8zilK0vAOSMGswIvuIoIILKFPZZaEc47Ft0n7Zf7g/gviz/tq?tqx=out:csv&gid=321080920';

interface TeacherImportRow {
  cid: string;
  username: string;
  email: string;
  password: string;
  sourceName: string;
  title: string | null;
  fullName: string;
  position: string;
  department: string;
  role: 'teacher' | 'executive';
}

interface ExistingAuthUser {
  id: string;
  email?: string;
}

function parseArgs() {
  return {
    dryRun: process.argv.includes('--dry-run'),
    csvUrl: process.env.TEACHERS_CSV_URL || DEFAULT_MEMBERS_CSV_URL,
  };
}

function readEnvFile(path = '.env.local'): Record<string, string> {
  try {
    const text = readFileSync(path, 'utf8');
    return Object.fromEntries(
      text
        .split(/\n/)
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => line.split(/=(.*)/s).slice(0, 2)),
    );
  } catch {
    return {};
  }
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function norm(value: unknown): string {
  return String(value ?? '').trim();
}

function digits(value: unknown): string {
  return norm(value).replace(/\D/g, '');
}

function maskCid(value: string): string {
  return value.length >= 5 ? `${value.slice(0, 3)}********${value.slice(-2)}` : '[masked]';
}

function isAllowed(position: string, department: string): boolean {
  if (position.includes('จ้างเหมาบริการ') || department.includes('จ้างเหมาบริการ')) return false;
  if (position.includes('ลูกจ้างประจำ') || department.includes('ลูกจ้างประจำ')) return false;
  if (position.includes('ธุรการ') || department.includes('ธุรการ')) return false;

  return (
    position.includes('ผู้อำนวยการ') ||
    department.includes('ผู้อำนวยการ') ||
    position.includes('ครู') ||
    department.includes('ครู') ||
    position.includes('พนักงานราชการ') ||
    department.includes('พนักงานราชการ')
  );
}

function parseThaiTitle(name: string): Pick<TeacherImportRow, 'title' | 'fullName'> {
  const match = name.match(/^(ว่าที่ร้อยตรีหญิง|ว่าที่ร้อยตรี|นางสาว|นาย|นาง)\s*(.+)$/);
  if (!match) return { title: null, fullName: name };
  return { title: match[1], fullName: match[2].trim() };
}

function roleFor(position: string, department: string): TeacherImportRow['role'] {
  return position.includes('ผู้อำนวยการ') || department.includes('ผู้อำนวยการ')
    ? 'executive'
    : 'teacher';
}

async function loadRows(csvUrl: string): Promise<{
  importable: TeacherImportRow[];
  duplicateSkipped: TeacherImportRow[];
  invalidCid: TeacherImportRow[];
  excludedCount: number;
  eligibleCount: number;
  totalNamedRows: number;
}> {
  const response = await fetch(csvUrl);
  if (!response.ok) throw new Error(`โหลด CSV ไม่สำเร็จ: ${response.status}`);

  const text = await response.text();
  const [headers, ...rows] = parseCSV(text);
  const index = Object.fromEntries(headers.map((header, i) => [header, i]));

  const namedRows = rows.filter((row) => norm(row[index.Name]));
  const candidates: TeacherImportRow[] = [];
  let excludedCount = 0;

  for (const row of namedRows) {
    const position = norm(row[index.Position]);
    const department = norm(row[index.Department]);
    if (!isAllowed(position, department)) {
      excludedCount += 1;
      continue;
    }

    const sourceName = norm(row[index.Name]);
    const cid = digits(row[index['User CID']]);
    const { title, fullName } = parseThaiTitle(sourceName);

    candidates.push({
      cid,
      username: cid,
      email: `${cid}@${AUTH_EMAIL_DOMAIN}`,
      password: cid,
      sourceName,
      title,
      fullName,
      position,
      department,
      role: roleFor(position, department),
    });
  }

  const invalidCid: TeacherImportRow[] = [];
  const valid: TeacherImportRow[] = [];
  for (const candidate of candidates) {
    if (/^\d{13}$/.test(candidate.cid)) valid.push(candidate);
    else invalidCid.push(candidate);
  }

  const seen = new Set<string>();
  const importable: TeacherImportRow[] = [];
  const duplicateSkipped: TeacherImportRow[] = [];
  for (const candidate of valid) {
    if (seen.has(candidate.cid)) duplicateSkipped.push(candidate);
    else {
      seen.add(candidate.cid);
      importable.push(candidate);
    }
  }

  return {
    importable,
    duplicateSkipped,
    invalidCid,
    excludedCount,
    eligibleCount: candidates.length,
    totalNamedRows: namedRows.length,
  };
}

async function listAuthUsersByEmail(
  supabase: ReturnType<typeof createClient>,
): Promise<Map<string, ExistingAuthUser>> {
  const users = new Map<string, ExistingAuthUser>();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    for (const user of data.users ?? []) {
      if (user.email) users.set(user.email.toLowerCase(), { id: user.id, email: user.email });
    }

    if (!data.users || data.users.length < perPage) break;
    page += 1;
  }

  return users;
}

async function resolveSchoolId(supabase: ReturnType<typeof createClient>): Promise<string> {
  if (process.env.KSP_SCHOOL_ID) return process.env.KSP_SCHOOL_ID;

  const { data, error } = await supabase.from('schools').select('id, name').order('created_at').limit(2);
  if (error) throw error;
  if (!data?.length) throw new Error('ไม่พบ school ใน Supabase');
  if (data.length > 1) throw new Error('พบมากกว่า 1 school กรุณาตั้ง KSP_SCHOOL_ID ก่อนนำเข้า');
  return data[0].id;
}

async function main() {
  const args = parseArgs();
  const env = { ...readEnvFile(), ...process.env };
  const url = env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  const loaded = await loadRows(args.csvUrl);
  const summaryBase = {
    totalNamedRows: loaded.totalNamedRows,
    eligible: loaded.eligibleCount,
    importable: loaded.importable.length,
    invalidCid: loaded.invalidCid.length,
    duplicateSkipped: loaded.duplicateSkipped.length,
    excluded: loaded.excludedCount,
    duplicateSkippedNames: loaded.duplicateSkipped.map((row) => row.sourceName),
  };

  if (args.dryRun) {
    console.log(JSON.stringify(summaryBase, null, 2));
    return;
  }

  if (!url || !serviceKey) {
    throw new Error('ต้องตั้ง VITE_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ก่อนรันนำเข้าจริง');
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const schoolId = await resolveSchoolId(supabase);
  const authUsersByEmail = await listAuthUsersByEmail(supabase);
  const created: string[] = [];
  const updatedAuth: string[] = [];
  const upsertedProfiles: string[] = [];
  const failed: Array<{ name: string; username: string; error: string }> = [];

  for (const person of loaded.importable) {
    try {
      let userId = authUsersByEmail.get(person.email.toLowerCase())?.id;
      if (userId) {
        const { error } = await supabase.auth.admin.updateUserById(userId, {
          password: person.password,
          email_confirm: true,
          user_metadata: { full_name: person.sourceName },
        });
        if (error) throw error;
        updatedAuth.push(person.sourceName);
      } else {
        const { data, error } = await supabase.auth.admin.createUser({
          email: person.email,
          password: person.password,
          email_confirm: true,
          user_metadata: { full_name: person.sourceName },
        });
        if (error || !data.user) throw error ?? new Error('สร้าง auth user ไม่สำเร็จ');
        userId = data.user.id;
        authUsersByEmail.set(person.email.toLowerCase(), { id: userId, email: person.email });
        created.push(person.sourceName);
      }

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        school_id: schoolId,
        username: person.username,
        title: person.title,
        full_name: person.fullName,
        role: person.role,
        is_active: true,
      });
      if (profileError) throw profileError;
      upsertedProfiles.push(person.sourceName);
    } catch (err) {
      failed.push({
        name: person.sourceName,
        username: maskCid(person.username),
        error: err instanceof Error ? err.message.replace(/\d{13}/g, maskCid) : 'unknown',
      });
    }
  }

  console.log(JSON.stringify({
    ...summaryBase,
    createdAuthUsers: created.length,
    updatedAuthUsers: updatedAuth.length,
    upsertedProfiles: upsertedProfiles.length,
    failed,
  }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
