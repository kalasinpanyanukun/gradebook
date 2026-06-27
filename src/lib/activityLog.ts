import { supabase } from './supabase';
import type { UserRole } from '../types';

export type ActivityLogRole = 'admin' | 'executive';

export function roleToActivityCategory(role: UserRole): ActivityLogRole | null {
  if (role === 'super_admin' || role === 'admin') return 'admin';
  if (role === 'executive') return 'executive';
  return null;
}

export function resolveActivityLogCategory(row: ActivityLogRow): ActivityLogRole | null {
  if (row.user_role === 'admin' || row.user_role === 'executive') {
    return row.user_role;
  }

  const profileRole = row.profile_role;
  if (profileRole === 'super_admin' || profileRole === 'admin') return 'admin';
  if (profileRole === 'executive') return 'executive';
  return null;
}

export async function logActivity(
  schoolId: string | null,
  userId: string,
  userName: string,
  action: string,
  userRole?: UserRole,
): Promise<void> {
  const category = userRole ? roleToActivityCategory(userRole) : null;
  const payload: Record<string, unknown> = {
    school_id: schoolId,
    user_id: userId,
    user_name: userName,
    action,
  };

  if (category) {
    payload.user_role = category;
  }

  try {
    const { error } = await supabase.from('activity_logs').insert(payload);
    if (!error) return;

    if (category && error.message?.includes('user_role')) {
      await supabase.from('activity_logs').insert({
        school_id: schoolId,
        user_id: userId,
        user_name: userName,
        action,
      });
    }
  } catch {
    // ไม่ให้การบันทึก log ขัดขวางการทำงานหลัก
  }
}

export interface ActivityLogRow {
  id: string;
  school_id: string | null;
  user_id: string | null;
  user_name: string | null;
  user_role?: ActivityLogRole | null;
  profile_role?: UserRole | null;
  action: string;
  timestamp: string;
}

export async function fetchActivityLogs(
  schoolId: string | null,
  limit = 100,
): Promise<ActivityLogRow[]> {
  const mapRow = (row: {
    id: string;
    school_id: string | null;
    user_id: string | null;
    user_name: string | null;
    user_role?: ActivityLogRole | null;
    action: string;
    timestamp: string;
    profiles?: { role?: UserRole } | { role?: UserRole }[] | null;
  }): ActivityLogRow => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      school_id: row.school_id,
      user_id: row.user_id,
      user_name: row.user_name,
      user_role: row.user_role,
      profile_role: profile?.role ?? null,
      action: row.action,
      timestamp: row.timestamp,
    };
  };

  let withRoleQuery = supabase
    .from('activity_logs')
    .select('id, school_id, user_id, user_name, user_role, action, timestamp, profiles:user_id(role)')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (schoolId) {
    withRoleQuery = withRoleQuery.eq('school_id', schoolId);
  }

  const withRole = await withRoleQuery;

  if (!withRole.error) {
    return (withRole.data ?? []).map((row) => mapRow(row));
  }

  let query = supabase
    .from('activity_logs')
    .select('id, school_id, user_id, user_name, action, timestamp, profiles:user_id(role)')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (schoolId) {
    query = query.eq('school_id', schoolId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => mapRow(row));
}
