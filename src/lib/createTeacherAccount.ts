import { supabase } from './supabase';
import { normalizeUsername } from './auth';
import type { UserRole } from '../types';

export interface CreateTeacherAccountInput {
  username: string;
  fullName: string;
  title: string | null;
  role: UserRole;
  password?: string;
}

function isEdgeFunctionUnavailable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('Failed to send a request to the Edge Function') ||
    message.includes('non-2xx') ||
    message.includes('FunctionsFetchError') ||
    message.includes('Function not found')
  );
}

async function readFunctionErrorMessage(error: unknown): Promise<string | null> {
  const context = (error as { context?: unknown })?.context;
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as { error?: unknown; message?: unknown };
      return String(payload.error ?? payload.message ?? '').trim() || null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function createTeacherAccount(input: CreateTeacherAccountInput): Promise<void> {
  const username = normalizeUsername(input.username);
  const password = (input.password ?? username).trim();
  const body = {
    username,
    password,
    full_name: input.fullName.trim(),
    title: input.title?.trim() || null,
    role: input.role,
  };

  try {
    const { data, error } = await supabase.functions.invoke('create-teacher', { body });
    if (error) {
      const detail = await readFunctionErrorMessage(error);
      throw new Error(detail || error.message);
    }
    if (data?.error) throw new Error(String(data.error));
    return;
  } catch (err) {
    if (!isEdgeFunctionUnavailable(err)) {
      throw err instanceof Error ? err : new Error('เพิ่มผู้ใช้งานไม่สำเร็จ');
    }
  }

  const { data, error } = await supabase.rpc('admin_create_teacher_account', {
    p_username: username,
    p_password: password,
    p_full_name: body.full_name,
    p_title: body.title,
    p_role: body.role,
  });

  if (error) {
    if (error.message.includes('Could not find the function')) {
      throw new Error(
        'ไม่สามารถสร้างผู้ใช้ได้ — กรุณา deploy Edge Function create-teacher หรือรัน migration `0021_admin_create_teacher_rpc.sql` ใน Supabase',
      );
    }
    throw error;
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }
}
