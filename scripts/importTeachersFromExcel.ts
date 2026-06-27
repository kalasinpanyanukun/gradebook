import { readFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import { createClient } from '@supabase/supabase-js';

const AUTH_EMAIL_DOMAIN = 'ksp.gradebook';
const DEFAULT_EXCEL_PATH = 'Teacher-list/รายชื่อบุคลากร_9_6_2569.xlsx';

type AppRole = 'admin' | 'teacher';

interface RawTeacherRow {
  rowNumber: number;
  sourceId: string;
  title: string | null;
  fullName: string;
  position: string;
  cid: string;
}

interface ImportTeacherRow extends RawTeacherRow {
  role: AppRole;
  email: string;
  password: string;
  recoveredFromExisting?: boolean;
}

interface ExistingProfile {
  id: string;
  username: string | null;
  title: string | null;
  full_name: string;
  role: string;
  is_active: boolean;
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

function norm(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function digits(value: unknown): string {
  return norm(value).replace(/\D/g, '');
}

function maskCid(value: string): string {
  return value.length >= 5 ? `${value.slice(0, 3)}********${value.slice(-2)}` : '[masked]';
}

function normalizePersonKey(title: string | null, fullName: string): string {
  const compact = `${title ?? ''}${fullName}`.replace(/\s+/g, '').trim();
  return compact.replace(/^(.+?)\1/, '$1');
}

function cleanFullName(title: string | null, fullName: string): string {
  const clean = norm(fullName);
  if (title && clean.startsWith(title)) {
    return norm(clean.slice(title.length));
  }
  return clean;
}

function roleFor(position: string): AppRole {
  return position.includes('ผู้อำนวยการ') ? 'admin' : 'teacher';
}

function parseArgs() {
  return {
    dryRun: process.argv.includes('--dry-run'),
    excelPath: process.env.TEACHERS_XLSX_PATH || DEFAULT_EXCEL_PATH,
  };
}

async function readWorkbookRows(path: string): Promise<RawTeacherRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('ไม่พบ worksheet ในไฟล์ Excel');

  const headers = worksheet.getRow(1).values.slice(1).map(norm);
  const index = Object.fromEntries(headers.map((header, i) => [header, i + 1]));
  for (const required of ['คำนำหน้า', 'ชื่อ-นามสกุล', 'ตำแหน่ง', 'เลขบัตรประชาชน']) {
    if (!index[required]) throw new Error(`ไม่พบคอลัมน์ ${required}`);
  }

  const rows: RawTeacherRow[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const title = norm(row.getCell(index['คำนำหน้า']).text || row.getCell(index['คำนำหน้า']).value) || null;
    const fullName = cleanFullName(
      title,
      norm(row.getCell(index['ชื่อ-นามสกุล']).text || row.getCell(index['ชื่อ-นามสกุล']).value),
    );
    const position = norm(row.getCell(index['ตำแหน่ง']).text || row.getCell(index['ตำแหน่ง']).value);
    const cid = digits(row.getCell(index['เลขบัตรประชาชน']).text || row.getCell(index['เลขบัตรประชาชน']).value);
    const sourceId = norm(row.getCell(index.ID).text || row.getCell(index.ID).value);

    if (!fullName && !cid) continue;
    rows.push({ rowNumber, sourceId, title, fullName, position, cid });
  }

  return rows;
}

async function loadExistingProfiles(
  supabase: ReturnType<typeof createClient> | null,
): Promise<ExistingProfile[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, title, full_name, role, is_active');
  if (error) throw error;
  return data ?? [];
}

function existingProfileMap(profiles: ExistingProfile[]): Map<string, ExistingProfile> {
  const map = new Map<string, ExistingProfile>();
  profiles.forEach((profile) => {
    map.set(normalizePersonKey(profile.title, profile.full_name), profile);
  });
  return map;
}

function resolveRows(
  rows: RawTeacherRow[],
  profiles: ExistingProfile[],
): {
  importable: ImportTeacherRow[];
  skippedDuplicates: RawTeacherRow[];
  unresolved: Array<{ row: RawTeacherRow; reason: string }>;
  recoveredCount: number;
} {
  const existingByName = existingProfileMap(profiles);
  const usedCids = new Set<string>();
  const resolved: ImportTeacherRow[] = [];
  const unresolved: Array<{ row: RawTeacherRow; reason: string }> = [];
  let recoveredCount = 0;

  const rowsByOriginalCid = new Map<string, RawTeacherRow[]>();
  rows.forEach((row) => {
    if (!row.cid) return;
    rowsByOriginalCid.set(row.cid, [...(rowsByOriginalCid.get(row.cid) ?? []), row]);
  });

  for (const row of rows) {
    let cid = row.cid;
    const existing = existingByName.get(normalizePersonKey(row.title, row.fullName));
    const existingCid = digits(existing?.username);
    const hasInvalidCid = !/^\d{13}$/.test(cid);
    const duplicateGroup = rowsByOriginalCid.get(cid) ?? [];
    const duplicateDifferentPeople = duplicateGroup.some(
      (other) => normalizePersonKey(other.title, other.fullName) !== normalizePersonKey(row.title, row.fullName),
    );

    if ((hasInvalidCid || duplicateDifferentPeople) && /^\d{13}$/.test(existingCid)) {
      cid = existingCid;
      recoveredCount += 1;
    }

    if (!/^\d{13}$/.test(cid)) {
      unresolved.push({ row, reason: 'เลขบัตรประชาชนไม่ครบ 13 หลัก' });
      continue;
    }

    if (usedCids.has(cid)) {
      const first = resolved.find((item) => item.cid === cid);
      const samePerson = first && normalizePersonKey(first.title, first.fullName) === normalizePersonKey(row.title, row.fullName);
      if (samePerson) continue;
      unresolved.push({ row: { ...row, cid }, reason: 'เลขบัตรประชาชนซ้ำกับคนละรายชื่อ' });
      continue;
    }

    usedCids.add(cid);
    resolved.push({
      ...row,
      cid,
      role: roleFor(row.position),
      email: `${cid}@${AUTH_EMAIL_DOMAIN}`,
      password: cid,
      recoveredFromExisting: cid !== row.cid,
    });
  }

  const skippedDuplicates = rows.filter((row) => !resolved.some((item) => item.rowNumber === row.rowNumber))
    .filter((row) => !unresolved.some((item) => item.row.rowNumber === row.rowNumber));

  return { importable: resolved, skippedDuplicates, unresolved, recoveredCount };
}

async function listAuthUsersByEmail(
  supabase: ReturnType<typeof createClient>,
): Promise<Map<string, string>> {
  const users = new Map<string, string>();
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const user of data.users ?? []) {
      if (user.email) users.set(user.email.toLowerCase(), user.id);
    }
    if (!data.users || data.users.length < perPage) break;
    page += 1;
  }
  return users;
}

async function resolveSchoolId(supabase: ReturnType<typeof createClient>): Promise<string> {
  if (process.env.KSP_SCHOOL_ID) return process.env.KSP_SCHOOL_ID;
  const { data, error } = await supabase.from('schools').select('id').order('created_at').limit(2);
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
  const serviceClient = url && serviceKey
    ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

  const rows = await readWorkbookRows(args.excelPath);
  const profiles = await loadExistingProfiles(serviceClient);
  const resolved = resolveRows(rows, profiles);
  const adminCount = resolved.importable.filter((row) => row.role === 'admin').length;

  const summary = {
    sourceRows: rows.length,
    importable: resolved.importable.length,
    adminFromFile: adminCount,
    teacherFromFile: resolved.importable.length - adminCount,
    recoveredFromExisting: resolved.recoveredCount,
    skippedSamePersonDuplicates: resolved.skippedDuplicates.length,
    unresolved: resolved.unresolved.map(({ row, reason }) => ({
      rowNumber: row.rowNumber,
      name: `${row.title ? `${row.title} ` : ''}${row.fullName}`,
      position: row.position,
      cid: maskCid(row.cid),
      reason,
    })),
  };

  if (args.dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  if (!serviceClient || !url || !serviceKey) {
    throw new Error('ต้องตั้ง VITE_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ก่อนนำเข้าจริง');
  }

  const schoolId = await resolveSchoolId(serviceClient);
  const authUsersByEmail = await listAuthUsersByEmail(serviceClient);
  const createdAuthUsers: string[] = [];
  const updatedAuthUsers: string[] = [];
  const upsertedProfiles: string[] = [];
  const failed: Array<{ rowNumber: number; name: string; username: string; error: string }> = [];

  for (const person of resolved.importable) {
    try {
      const email = person.email.toLowerCase();
      let userId = authUsersByEmail.get(email);
      if (userId) {
        const { error } = await serviceClient.auth.admin.updateUserById(userId, {
          password: person.password,
          email_confirm: true,
          user_metadata: { full_name: `${person.title ? `${person.title} ` : ''}${person.fullName}` },
        });
        if (error) throw error;
        updatedAuthUsers.push(person.fullName);
      } else {
        const { data, error } = await serviceClient.auth.admin.createUser({
          email,
          password: person.password,
          email_confirm: true,
          user_metadata: { full_name: `${person.title ? `${person.title} ` : ''}${person.fullName}` },
        });
        if (error || !data.user) throw error ?? new Error('สร้าง auth user ไม่สำเร็จ');
        userId = data.user.id;
        authUsersByEmail.set(email, userId);
        createdAuthUsers.push(person.fullName);
      }

      const { error: profileError } = await serviceClient.from('profiles').upsert({
        id: userId,
        school_id: schoolId,
        username: person.cid,
        title: person.title,
        full_name: person.fullName,
        role: person.role,
        is_active: true,
      });
      if (profileError) throw profileError;
      upsertedProfiles.push(person.fullName);
    } catch (err) {
      failed.push({
        rowNumber: person.rowNumber,
        name: person.fullName,
        username: maskCid(person.cid),
        error: err instanceof Error ? err.message.replace(/\d{13}/g, maskCid) : 'unknown',
      });
    }
  }

  const activeCids = new Set(resolved.importable.map((row) => row.cid));
  const staleProfileIds = profiles
    .filter((profile) => /^\d{13}$/.test(profile.username ?? ''))
    .filter((profile) => !activeCids.has(profile.username ?? ''))
    .map((profile) => profile.id);

  let deactivatedProfiles = 0;
  if (staleProfileIds.length > 0) {
    const { error } = await serviceClient
      .from('profiles')
      .update({ is_active: false })
      .in('id', staleProfileIds);
    if (error) throw error;
    deactivatedProfiles = staleProfileIds.length;
  }

  console.log(JSON.stringify({
    ...summary,
    createdAuthUsers: createdAuthUsers.length,
    updatedAuthUsers: updatedAuthUsers.length,
    upsertedProfiles: upsertedProfiles.length,
    deactivatedOldProfiles: deactivatedProfiles,
    failed,
  }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
