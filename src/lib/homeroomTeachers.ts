import type { Profile, UserRole } from '../types';

/** บทบาทที่ไม่ต้องแสดงในรายการมอบหมายครูประจำชั้น */
const HOMEROOM_EXCLUDED_ROLES: UserRole[] = ['super_admin', 'admin', 'executive'];

export type HomeroomField = 'homeroom_teacher_id' | 'homeroom_teacher_2_id' | 'homeroom_teacher_3_id';

export const HOMEROOM_FIELD_ORDER: HomeroomField[] = [
  'homeroom_teacher_id',
  'homeroom_teacher_2_id',
  'homeroom_teacher_3_id',
];

export interface HomeroomSlotUpdate {
  classroomId: string;
  field: HomeroomField;
  teacherId: string | null;
}

export function isHomeroomEligibleTeacher(
  profile: Pick<Profile, 'role' | 'is_active'>,
): boolean {
  return profile.is_active && profile.role === 'teacher';
}

export function filterHomeroomEligibleTeachers<T extends Pick<Profile, 'role' | 'is_active'>>(
  profiles: T[],
): T[] {
  return profiles.filter(isHomeroomEligibleTeacher);
}

export function isHomeroomExcludedRole(role: UserRole): boolean {
  return HOMEROOM_EXCLUDED_ROLES.includes(role);
}

/** ครู 1 คน ใช้ได้แค่ 1 ช่องใน 1 ห้อง และ 1 ห้องเท่านั้น — คืนรายการช่องที่ต้องล้าง */
export function collectHomeroomDuplicateFixes(
  classrooms: Array<{ id: string } & Partial<Record<HomeroomField, string | null | undefined>>>,
): HomeroomSlotUpdate[] {
  const seenTeacherIds = new Set<string>();
  const updates: HomeroomSlotUpdate[] = [];

  for (const classroom of classrooms) {
    for (const field of HOMEROOM_FIELD_ORDER) {
      const teacherId = classroom[field] ?? null;
      if (!teacherId) continue;

      if (seenTeacherIds.has(teacherId)) {
        updates.push({ classroomId: classroom.id, field, teacherId: null });
      } else {
        seenTeacherIds.add(teacherId);
      }
    }
  }

  return updates;
}

/** ค่าที่แสดงต่อช่อง — ไม่ให้ชื่อซ้ำแม้ข้อมูล Excel/DB ยังซ้ำอยู่ */
export function buildUniqueHomeroomDisplayValues(
  classroom: { id: string } & Partial<Record<HomeroomField, string | null | undefined>>,
  resolveRawValue: (field: HomeroomField) => string,
  schoolWideSeen: Set<string>,
): Record<HomeroomField, string> {
  const values = {
    homeroom_teacher_id: '',
    homeroom_teacher_2_id: '',
    homeroom_teacher_3_id: '',
  } satisfies Record<HomeroomField, string>;

  for (const field of HOMEROOM_FIELD_ORDER) {
    const rawValue = resolveRawValue(field);
    if (!rawValue) continue;

    if (schoolWideSeen.has(rawValue)) {
      values[field] = '';
      continue;
    }

    schoolWideSeen.add(rawValue);
    values[field] = rawValue;
  }

  return values;
}
