import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { AppUser, Profile, UserRole } from '../types';

/** โดเมนภายในสำหรับ map username → Supabase Auth email */
export const AUTH_EMAIL_DOMAIN = 'ksp.gradebook';

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function usernameToAuthEmail(username: string): string {
  return `${normalizeUsername(username)}@${AUTH_EMAIL_DOMAIN}`;
}

export function authEmailToUsername(email: string): string | null {
  const suffix = `@${AUTH_EMAIL_DOMAIN}`;
  if (!email.toLowerCase().endsWith(suffix)) return null;
  return email.slice(0, -suffix.length).toLowerCase();
}

export function isValidCitizenId(value: string): boolean {
  return /^\d{13}$/.test(value.trim());
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, school_id, username, title, full_name, role, is_active, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function profileToAppUser(profile: Profile, sessionEmail: string): AppUser {
  const username =
    profile.username ??
    authEmailToUsername(sessionEmail) ??
    sessionEmail;

  return {
    id: profile.id,
    username,
    name: profile.full_name,
    role: profile.role,
    schoolId: profile.school_id,
    isActive: profile.is_active,
    title: profile.title,
  };
}

export async function resolveAppUser(session: Session): Promise<AppUser | null> {
  const profile = await fetchProfile(session.user.id);
  if (!profile) return null;
  return profileToAppUser(profile, session.user.email ?? '');
}

export function resolveAuthEmail(usernameOrEmail: string): string {
  const trimmed = usernameOrEmail.trim();
  // ถ้าใส่อีเมลจริง (admin คนแรก) ใช้ตรง ๆ — ไม่ต่อ @ksp.gradebook
  if (trimmed.includes('@')) return trimmed;
  return usernameToAuthEmail(trimmed);
}

export async function signInWithUsername(usernameOrEmail: string, password: string) {
  const email = resolveAuthEmail(usernameOrEmail);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error('ไม่พบ session หลังเข้าสู่ระบบ');
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function isAdmin(user: AppUser | null): boolean {
  return !!user?.isActive && (user.role === 'super_admin' || user.role === 'admin');
}

export function isSuperAdmin(user: AppUser | null): boolean {
  return user?.role === 'super_admin' && user.isActive;
}

export function isTeacher(user: AppUser | null): boolean {
  return user?.role === 'teacher' && user.isActive;
}

export function canManageAdminData(user: AppUser | null): boolean {
  return !!user?.isActive && (user.role === 'super_admin' || user.role === 'admin');
}

export function canAccessAdminDashboard(user: AppUser | null): boolean {
  return !!user?.isActive && (
    user.role === 'super_admin' ||
    user.role === 'admin' ||
    user.role === 'executive'
  );
}

export function isAdminReadOnly(user: AppUser | null): boolean {
  return user?.role === 'executive' && user.isActive;
}

export function canAccessTeacherDashboard(user: AppUser | null): boolean {
  return !!user?.isActive && (
    user.role === 'super_admin' ||
    user.role === 'admin' ||
    user.role === 'teacher'
  );
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'ผู้พัฒนาระบบ',
  admin: 'ผู้ดูแลระบบ (admin)',
  teacher: 'ครู',
  executive: 'ผู้บริหาร',
};
