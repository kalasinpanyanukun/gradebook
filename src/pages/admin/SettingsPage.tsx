import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarRange,
  Database,
  HardDrive,
  Loader2,
  Server,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { ThaiDateCalendarInput } from '../../components/ThaiDateCalendarInput';
import { fetchActivityLogs, logActivity, resolveActivityLogCategory, type ActivityLogRow } from '../../lib/activityLog';
import { getErrorMessage, isSchemaCacheErrorFor } from '../../lib/dbErrors';
import { supabase } from '../../lib/supabase';
import type { AcademicYear, AppUser, Semester } from '../../types';

type SettingsSection = 'general' | 'activity' | 'system';

interface SettingsPageProps {
  currentUser: AppUser;
  initialYearId?: string;
  readOnly?: boolean;
  section: SettingsSection;
}

export type { SettingsSection };

interface SemesterSettings extends Semester {
  draftEntryStart: string;
  draftEntryEnd: string;
  draftEnabled: boolean;
  saving: boolean;
}

interface SystemHealth {
  database_bytes?: number;
  database_limit_bytes?: number;
  generated_at?: string;
  counts?: Record<string, number>;
}

const COUNT_LABELS: Record<string, string> = {
  profiles: 'ผู้ใช้งาน',
  students: 'นักเรียน',
  classrooms: 'ห้องเรียน',
  subjects: 'รายวิชา',
  teaching_assignments: 'มอบหมายครู',
  gradebooks: 'สมุด ปพ.5',
  activity_logs: 'บันทึกกิจกรรม',
};

const SECTION_TITLES: Record<SettingsSection, { title: string; subtitle: string }> = {
  general: {
    title: 'การตั้งค่า',
    subtitle: 'เปิด/ปิดการกรอก ปพ.5 แยกตามภาคเรียน และกำหนดช่วงวันที่',
  },
  activity: {
    title: 'กิจกรรม',
    subtitle: 'บันทึกการเข้าสู่ระบบและการตั้งค่า แยกตามผู้ดูแลระบบและผู้บริหาร',
  },
  system: {
    title: 'ข้อมูลระบบ',
    subtitle: 'สถานะฐานข้อมูล พื้นที่ใช้งาน และข้อมูลทางเทคนิค',
  },
};

const SEMESTER_SETTINGS_MIGRATION_HINT =
  'ฐานข้อมูลยังไม่มีคอลัมน์ตั้งค่าภาคเรียน กรุณารัน migration `supabase/migrations/0019_semester_entry_settings.sql` ใน Supabase SQL Editor';

const ENTRY_WINDOW_MIGRATION_HINT =
  'ฐานข้อมูลยังไม่มีคอลัมน์ช่วงเวลากรอก ปพ.5 กรุณารัน migration `supabase/migrations/0018_assignment_entry_window.sql`';

const PRIMARY_SETTINGS_MIGRATION_HINT =
  'ฐานข้อมูลยังไม่มีคอลัมน์ตั้งค่าระดับประถม กรุณารัน migration `supabase/migrations/0022_primary_entry_and_activity_role.sql` และ `0023_primary_entry_dates.sql` ใน Supabase SQL Editor';

const PRIMARY_LEVEL_CODES = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'] as const;

const SYSTEM_HEALTH_MIGRATION_HINT =
  'ยังไม่มีฟังก์ชันวัดขนาดฐานข้อมูลจริง กรุณารัน migration `supabase/migrations/0020_system_health_rpc.sql` หรือ `0022_primary_entry_and_activity_role.sql`';

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatLogTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function parseSystemHealth(data: unknown): SystemHealth {
  const raw = (data ?? {}) as Record<string, unknown>;
  const databaseBytesRaw = raw.database_bytes;
  let database_bytes: number | undefined;

  if (typeof databaseBytesRaw === 'number' && Number.isFinite(databaseBytesRaw)) {
    database_bytes = databaseBytesRaw;
  } else if (typeof databaseBytesRaw === 'string' && databaseBytesRaw.trim()) {
    const parsed = Number(databaseBytesRaw);
    if (Number.isFinite(parsed)) database_bytes = parsed;
  }

  const limitRaw = raw.database_limit_bytes;
  let database_limit_bytes = 524_288_000;
  if (typeof limitRaw === 'number' && Number.isFinite(limitRaw)) {
    database_limit_bytes = limitRaw;
  } else if (typeof limitRaw === 'string' && limitRaw.trim()) {
    const parsed = Number(limitRaw);
    if (Number.isFinite(parsed)) database_limit_bytes = parsed;
  }

  return {
    database_bytes,
    database_limit_bytes,
    generated_at: typeof raw.generated_at === 'string' ? raw.generated_at : undefined,
    counts: raw.counts as Record<string, number> | undefined,
  };
}

function activityCategoryLabel(log: ActivityLogRow): string {
  const category = resolveActivityLogCategory(log);
  if (category === 'admin') return 'ผู้ดูแลระบบ';
  if (category === 'executive') return 'ผู้บริหาร';
  return '—';
}

function ActivityLogTable({ logs, emptyMessage }: { logs: ActivityLogRow[]; emptyMessage: string }) {
  if (logs.length === 0) {
    return <div className="py-12 text-center text-sm text-slate-400">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3 text-center font-semibold">เวลา</th>
            <th className="px-4 py-3 text-center font-semibold">กลุ่มผู้ใช้</th>
            <th className="px-4 py-3 text-center font-semibold">ผู้ใช้</th>
            <th className="px-4 py-3 text-center font-semibold">รายละเอียด</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3 text-center font-mono text-xs text-slate-500">
                {formatLogTime(log.timestamp)}
              </td>
              <td className="px-4 py-3 text-center text-xs font-bold text-slate-600">
                {activityCategoryLabel(log)}
              </td>
              <td className="px-4 py-3 text-center font-semibold text-slate-800">
                {log.user_name ?? '—'}
              </td>
              <td className="px-4 py-3 text-center text-slate-700">{log.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  currentUser,
  initialYearId,
  readOnly = false,
  section,
}) => {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState(initialYearId ?? '');
  const [semesters, setSemesters] = useState<SemesterSettings[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [loadingSystem, setLoadingSystem] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [gradeEntryToggleSupported, setGradeEntryToggleSupported] = useState(true);
  const [semesterDateColumnsSupported, setSemesterDateColumnsSupported] = useState(true);
  const [entryWindowSupported, setEntryWindowSupported] = useState(true);
  const [primaryEntryEnabled, setPrimaryEntryEnabled] = useState(true);
  const [primaryDraftEntryStart, setPrimaryDraftEntryStart] = useState('');
  const [primaryDraftEntryEnd, setPrimaryDraftEntryEnd] = useState('');
  const [primaryToggleSupported, setPrimaryToggleSupported] = useState(true);
  const [primaryDateColumnsSupported, setPrimaryDateColumnsSupported] = useState(true);
  const [savingPrimary, setSavingPrimary] = useState(false);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);

  const canWrite = !readOnly && (currentUser.role === 'super_admin' || currentUser.role === 'admin');

  const selectedYear = years.find((year) => year.id === selectedYearId);

  useEffect(() => {
    setPrimaryEntryEnabled(selectedYear?.primary_grade_entry_enabled !== false);
    setPrimaryDraftEntryStart(selectedYear?.primary_entry_start_date ?? '');
    setPrimaryDraftEntryEnd(selectedYear?.primary_entry_end_date ?? '');
  }, [
    selectedYear?.id,
    selectedYear?.primary_grade_entry_enabled,
    selectedYear?.primary_entry_start_date,
    selectedYear?.primary_entry_end_date,
  ]);

  const loadYears = useCallback(async () => {
    if (!currentUser.schoolId) return;
    const { data, error: queryError } = await supabase
      .from('academic_years')
      .select('*')
      .eq('school_id', currentUser.schoolId)
      .order('year_be', { ascending: false });
    if (queryError) throw queryError;
    setYears(data ?? []);
    const preferred = initialYearId ? data?.find((year) => year.id === initialYearId) : undefined;
    const active = preferred ?? data?.find((year) => year.is_active) ?? data?.[0];
    if (active) {
      setSelectedYearId((prev) => prev || active.id);
    }
  }, [currentUser.schoolId, initialYearId]);

  const loadSemesters = useCallback(async () => {
    if (!selectedYearId) {
      setSemesters([]);
      return;
    }
    const { data, error: queryError } = await supabase
      .from('semesters')
      .select('*')
      .eq('academic_year_id', selectedYearId)
      .order('semester_number');

    if (queryError) {
      const isSchemaMismatch =
        isSchemaCacheErrorFor(queryError, 'grade_entry_enabled') ||
        isSchemaCacheErrorFor(queryError, 'entry_start_date') ||
        isSchemaCacheErrorFor(queryError, 'entry_end_date');
      if (!isSchemaMismatch) throw queryError;

      if (isSchemaCacheErrorFor(queryError, 'grade_entry_enabled')) {
        setGradeEntryToggleSupported(false);
      }
      const fallback = await supabase
        .from('semesters')
        .select('id, academic_year_id, semester_number, start_date, end_date, is_active, created_at, grade_entry_enabled, entry_start_date, entry_end_date')
        .eq('academic_year_id', selectedYearId)
        .order('semester_number');
      if (fallback.error) {
        const basic = await supabase
          .from('semesters')
          .select('id, academic_year_id, semester_number, start_date, end_date, is_active, created_at')
          .eq('academic_year_id', selectedYearId)
          .order('semester_number');
        if (basic.error) throw basic.error;
        setSemesters(
          (basic.data ?? []).map((semester) => ({
            ...semester,
            semester_number: semester.semester_number as 1 | 2,
            draftEntryStart: '',
            draftEntryEnd: '',
            draftEnabled: true,
            saving: false,
          })),
        );
        return;
      }
      setSemesters(
        (fallback.data ?? []).map((semester) => ({
          ...semester,
          semester_number: semester.semester_number as 1 | 2,
          draftEntryStart: semester.entry_start_date ?? '',
          draftEntryEnd: semester.entry_end_date ?? '',
          draftEnabled: semester.grade_entry_enabled ?? true,
          saving: false,
        })),
      );
      return;
    }

    setGradeEntryToggleSupported(true);
    setSemesterDateColumnsSupported(true);
    setSemesters(
      (data ?? []).map((semester) => ({
        ...semester,
        semester_number: semester.semester_number as 1 | 2,
        draftEntryStart: semester.entry_start_date ?? '',
        draftEntryEnd: semester.entry_end_date ?? '',
        draftEnabled: semester.grade_entry_enabled ?? true,
        saving: false,
      })),
    );
  }, [selectedYearId]);

  const loadActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const rows = await fetchActivityLogs(currentUser.schoolId, 120);
      setActivityLogs(rows);
    } catch (err) {
      setError(getErrorMessage(err, 'โหลดกิจกรรมไม่สำเร็จ'));
    } finally {
      setLoadingActivity(false);
    }
  }, [currentUser.schoolId]);

  const loadSystemHealth = useCallback(async () => {
    setLoadingSystem(true);
    try {
      const ping = await supabase.from('schools').select('id', { count: 'exact', head: true });
      setDbConnected(!ping.error);

      const { data, error: rpcError } = await supabase.rpc('get_system_health', {
        p_school_id: currentUser.schoolId,
      });

      if (!rpcError && data) {
        setSystemHealth(parseSystemHealth(data));
        return;
      }

      const [profiles, students, classrooms, subjects, assignments, gradebooks, logs] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('school_id', currentUser.schoolId ?? ''),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_id', currentUser.schoolId ?? ''),
        supabase.from('classrooms').select('id', { count: 'exact', head: true }).eq('school_id', currentUser.schoolId ?? ''),
        supabase.from('subjects').select('id', { count: 'exact', head: true }).eq('school_id', currentUser.schoolId ?? ''),
        supabase.from('teaching_assignments').select('id', { count: 'exact', head: true }).eq('school_id', currentUser.schoolId ?? ''),
        supabase.from('gradebooks').select('id', { count: 'exact', head: true }),
        supabase.from('activity_logs').select('id', { count: 'exact', head: true }).eq('school_id', currentUser.schoolId ?? ''),
      ]);

      setSystemHealth({
        database_limit_bytes: 524_288_000,
        counts: {
          profiles: profiles.count ?? 0,
          students: students.count ?? 0,
          classrooms: classrooms.count ?? 0,
          subjects: subjects.count ?? 0,
          teaching_assignments: assignments.count ?? 0,
          gradebooks: gradebooks.count ?? 0,
          activity_logs: logs.count ?? 0,
        },
      });
    } catch (err) {
      setError(getErrorMessage(err, 'โหลดข้อมูลระบบไม่สำเร็จ'));
      setDbConnected(false);
    } finally {
      setLoadingSystem(false);
    }
  }, [currentUser.schoolId]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError('');
      try {
        await loadYears();
      } catch (err) {
        setError(getErrorMessage(err, 'โหลดปีการศึกษาไม่สำเร็จ'));
      } finally {
        setLoading(false);
      }
    };
    void init();
  }, [loadYears]);

  useEffect(() => {
    if (section !== 'general') return;
    void loadSemesters().catch((err) => {
      setError(getErrorMessage(err, 'โหลดการตั้งค่าภาคเรียนไม่สำเร็จ'));
    });
  }, [loadSemesters, section]);

  useEffect(() => {
    if (section === 'activity') void loadActivity();
  }, [loadActivity, section]);

  useEffect(() => {
    if (section === 'system') void loadSystemHealth();
  }, [loadSystemHealth, section]);

  const syncPrimaryAssignmentsEntryWindow = async (
    academicYearId: string,
    startDate: string | null,
    endDate: string | null,
  ) => {
    if (!currentUser.schoolId || !entryWindowSupported) return;

    const { data: classrooms, error: classroomError } = await supabase
      .from('classrooms')
      .select('id')
      .eq('academic_year_id', academicYearId)
      .in('class_level_code', [...PRIMARY_LEVEL_CODES]);

    if (classroomError) throw classroomError;

    const classroomIds = (classrooms ?? []).map((classroom) => classroom.id);
    if (classroomIds.length === 0) return;

    const { data: semesterRows, error: semesterError } = await supabase
      .from('semesters')
      .select('id')
      .eq('academic_year_id', academicYearId);

    if (semesterError) throw semesterError;

    const semesterIds = (semesterRows ?? []).map((semester) => semester.id);
    if (semesterIds.length === 0) return;

    const { error: updateError } = await supabase
      .from('teaching_assignments')
      .update({
        entry_start_date: startDate,
        entry_end_date: endDate,
      })
      .eq('school_id', currentUser.schoolId)
      .in('classroom_id', classroomIds)
      .in('semester_id', semesterIds);

    if (updateError && isSchemaCacheErrorFor(updateError, 'entry_start_date')) {
      setEntryWindowSupported(false);
      return;
    }
    if (updateError) throw updateError;
  };

  const syncAssignmentsEntryWindow = async (
    semesterId: string,
    startDate: string | null,
    endDate: string | null,
  ) => {
    if (!currentUser.schoolId || !entryWindowSupported) return;
    const { error: updateError } = await supabase
      .from('teaching_assignments')
      .update({
        entry_start_date: startDate,
        entry_end_date: endDate,
      })
      .eq('school_id', currentUser.schoolId)
      .eq('semester_id', semesterId);

    if (updateError && isSchemaCacheErrorFor(updateError, 'entry_start_date')) {
      setEntryWindowSupported(false);
      return;
    }
    if (updateError) throw updateError;
  };

  const saveSemesterGradeEntryEnabled = async (semester: SemesterSettings) => {
    if (!gradeEntryToggleSupported) {
      throw new Error(SEMESTER_SETTINGS_MIGRATION_HINT);
    }
    const { error: updateError } = await supabase
      .from('semesters')
      .update({ grade_entry_enabled: semester.draftEnabled })
      .eq('id', semester.id);
    if (updateError) {
      if (isSchemaCacheErrorFor(updateError, 'grade_entry_enabled')) {
        setGradeEntryToggleSupported(false);
        throw new Error(SEMESTER_SETTINGS_MIGRATION_HINT);
      }
      throw updateError;
    }
  };

  const saveSemesterSettings = async (semester: SemesterSettings) => {
    if (!canWrite) return;
    if (semester.draftEntryStart && semester.draftEntryEnd && semester.draftEntryEnd < semester.draftEntryStart) {
      setError('วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น');
      return;
    }

    setSemesters((items) =>
      items.map((item) => (item.id === semester.id ? { ...item, saving: true } : item)),
    );
    setError('');
    setMessage('');

    try {
      await saveSemesterGradeEntryEnabled(semester);

      if (semesterDateColumnsSupported) {
        const { error: dateError } = await supabase
          .from('semesters')
          .update({
            entry_start_date: semester.draftEntryStart || null,
            entry_end_date: semester.draftEntryEnd || null,
          })
          .eq('id', semester.id);

        if (dateError && isSchemaCacheErrorFor(dateError, 'entry_end_date')) {
          setSemesterDateColumnsSupported(false);
        } else if (dateError) {
          throw dateError;
        }
      }

      await syncAssignmentsEntryWindow(
        semester.id,
        semester.draftEntryStart || null,
        semester.draftEntryEnd || null,
      );

      await logActivity(
        currentUser.schoolId,
        currentUser.id,
        currentUser.name,
        `บันทึกการตั้งค่าภาคเรียนที่ ${semester.semester_number} (${semester.draftEnabled ? 'เปิด' : 'ปิด'}การกรอก ปพ.5)`,
        currentUser.role,
      );

      setMessage(`บันทึกการตั้งค่าภาคเรียนที่ ${semester.semester_number} แล้ว`);
      await loadSemesters();
      if (section === 'activity') await loadActivity();
    } catch (err) {
      setError(getErrorMessage(err, 'บันทึกการตั้งค่าไม่สำเร็จ'));
    } finally {
      setSemesters((items) =>
        items.map((item) => (item.id === semester.id ? { ...item, saving: false } : item)),
      );
    }
  };

  const toggleSemesterEnabled = async (semester: SemesterSettings) => {
    if (!canWrite) return;
    const nextEnabled = !semester.draftEnabled;
    const updated = { ...semester, draftEnabled: nextEnabled, saving: true };
    setSemesters((items) => items.map((item) => (item.id === semester.id ? updated : item)));
    setError('');
    setMessage('');

    try {
      await saveSemesterGradeEntryEnabled(updated);
      await logActivity(
        currentUser.schoolId,
        currentUser.id,
        currentUser.name,
        `${nextEnabled ? 'เปิด' : 'ปิด'}การกรอก ปพ.5 ภาคเรียนที่ ${semester.semester_number}`,
        currentUser.role,
      );
      setMessage(
        nextEnabled
          ? `เปิดการกรอก ปพ.5 ภาคเรียนที่ ${semester.semester_number} แล้ว`
          : `ปิดการกรอก ปพ.5 ภาคเรียนที่ ${semester.semester_number} แล้ว`,
      );
      await loadSemesters();
    } catch (err) {
      setSemesters((items) =>
        items.map((item) => (item.id === semester.id ? { ...item, draftEnabled: semester.draftEnabled } : item)),
      );
      setError(getErrorMessage(err, 'เปลี่ยนสถานะภาคเรียนไม่สำเร็จ'));
    } finally {
      setSemesters((items) =>
        items.map((item) => (item.id === semester.id ? { ...item, saving: false } : item)),
      );
    }
  };

  const savePrimarySettings = async () => {
    if (!canWrite || !selectedYearId) return;

    if (
      primaryDraftEntryStart &&
      primaryDraftEntryEnd &&
      primaryDraftEntryEnd < primaryDraftEntryStart
    ) {
      setError('วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น');
      return;
    }

    setSavingPrimary(true);
    setError('');
    setMessage('');

    try {
      if (primaryDateColumnsSupported) {
        const { error: dateError } = await supabase
          .from('academic_years')
          .update({
            primary_entry_start_date: primaryDraftEntryStart || null,
            primary_entry_end_date: primaryDraftEntryEnd || null,
          })
          .eq('id', selectedYearId);

        if (dateError) {
          if (
            isSchemaCacheErrorFor(dateError, 'primary_entry_start_date') ||
            isSchemaCacheErrorFor(dateError, 'primary_entry_end_date')
          ) {
            setPrimaryDateColumnsSupported(false);
            throw new Error(PRIMARY_SETTINGS_MIGRATION_HINT);
          }
          throw dateError;
        }
      }

      await syncPrimaryAssignmentsEntryWindow(
        selectedYearId,
        primaryDraftEntryStart || null,
        primaryDraftEntryEnd || null,
      );

      setYears((items) =>
        items.map((year) =>
          year.id === selectedYearId
            ? {
                ...year,
                primary_entry_start_date: primaryDraftEntryStart || null,
                primary_entry_end_date: primaryDraftEntryEnd || null,
              }
            : year,
        ),
      );

      await logActivity(
        currentUser.schoolId,
        currentUser.id,
        currentUser.name,
        `บันทึกช่วงวันที่กรอก ปพ.5 ระดับประถมศึกษา (${primaryDraftEntryStart || '—'} ถึง ${primaryDraftEntryEnd || '—'})`,
        currentUser.role,
      );

      setMessage('บันทึกการตั้งค่าระดับประถมศึกษาแล้ว');
      if (section === 'activity') await loadActivity();
    } catch (err) {
      setError(getErrorMessage(err, 'บันทึกการตั้งค่าระดับประถมไม่สำเร็จ'));
    } finally {
      setSavingPrimary(false);
    }
  };

  const togglePrimaryEntry = async () => {
    if (!canWrite || !selectedYearId || !primaryToggleSupported) return;

    const nextEnabled = !primaryEntryEnabled;
    setSavingPrimary(true);
    setError('');
    setMessage('');

    try {
      const { error: updateError } = await supabase
        .from('academic_years')
        .update({ primary_grade_entry_enabled: nextEnabled })
        .eq('id', selectedYearId);

      if (updateError) {
        if (isSchemaCacheErrorFor(updateError, 'primary_grade_entry_enabled')) {
          setPrimaryToggleSupported(false);
          throw new Error(PRIMARY_SETTINGS_MIGRATION_HINT);
        }
        throw updateError;
      }

      setPrimaryEntryEnabled(nextEnabled);
      setYears((items) =>
        items.map((year) =>
          year.id === selectedYearId ? { ...year, primary_grade_entry_enabled: nextEnabled } : year,
        ),
      );

      await logActivity(
        currentUser.schoolId,
        currentUser.id,
        currentUser.name,
        `${nextEnabled ? 'เปิด' : 'ปิด'}การกรอก ปพ.5 ระดับประถมศึกษา`,
        currentUser.role,
      );

      setMessage(
        nextEnabled
          ? 'เปิดการกรอก ปพ.5 ระดับประถมศึกษาแล้ว'
          : 'ปิดการกรอก ปพ.5 ระดับประถมศึกษาแล้ว',
      );
      if (section === 'activity') await loadActivity();
    } catch (err) {
      setError(getErrorMessage(err, 'เปลี่ยนสถานะระดับประถมไม่สำเร็จ'));
    } finally {
      setSavingPrimary(false);
    }
  };

  const storageMeta = useMemo(() => {
    const used = systemHealth?.database_bytes ?? 0;
    const limit = systemHealth?.database_limit_bytes ?? 524_288_000;
    const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 1000) / 10) : 0;
    return { used, limit, percent, hasRealBytes: systemHealth?.database_bytes != null };
  }, [systemHealth]);

  const visibleActivityLogs = useMemo(
    () => activityLogs.filter((log) => {
      const category = resolveActivityLogCategory(log);
      return category === 'admin' || category === 'executive';
    }),
    [activityLogs],
  );

  const sectionMeta = SECTION_TITLES[section];

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-[22px] font-extrabold tracking-tight text-slate-900">{sectionMeta.title}</h4>
        <p className="mt-1 text-sm text-slate-500">{sectionMeta.subtitle}</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
      {message && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>
      )}

      {section === 'general' && (
        <div className="space-y-4">
          <div className="ui-card grid gap-3 p-4 md:grid-cols-[220px_1fr] md:items-end">
            <label className="flex min-w-0 flex-col">
              <span className="text-[11px] font-semibold text-slate-500">ปีการศึกษา</span>
              <select
                value={selectedYearId}
                onChange={(event) => setSelectedYearId(event.target.value)}
                className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year_be}
                    {year.is_active ? ' (ปัจจุบัน)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-sm text-slate-500">
              ตั้งค่าสำหรับปีการศึกษา <span className="font-bold text-slate-800">{selectedYear?.year_be ?? '—'}</span>
              {' '}— ครูจะกรอกคะแนนได้เฉพาะภาคที่เปิดใช้งานและอยู่ในช่วงวันที่กำหนด
            </p>
          </div>

          {!gradeEntryToggleSupported && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {SEMESTER_SETTINGS_MIGRATION_HINT}
            </div>
          )}
          {!semesterDateColumnsSupported && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              ยังไม่มีคอลัมน์วันที่บนตารางภาคเรียน — ระบบจะบันทึกช่วงวันที่ผ่านรายการมอบหมายแทน กรุณารัน migration `0019_semester_entry_settings.sql`
            </div>
          )}
          {!entryWindowSupported && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {ENTRY_WINDOW_MIGRATION_HINT}
            </div>
          )}
          {!primaryToggleSupported && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              {PRIMARY_SETTINGS_MIGRATION_HINT}
            </div>
          )}
          {!primaryDateColumnsSupported && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              ยังไม่มีคอลัมน์วันที่ระดับประถม — กรุณารัน migration `0023_primary_entry_dates.sql`
            </div>
          )}

          <section className="ui-card p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h5 className="text-lg font-extrabold text-slate-900">ระดับประถมศึกษา</h5>
                <p className="mt-1 text-sm text-slate-500">
                  เปิด/ปิดการแสดงและกรอก ปพ.5 ระดับประถมศึกษาในปีการศึกษา {selectedYear?.year_be ?? '—'}
                </p>
                <button
                  type="button"
                  disabled={!canWrite || savingPrimary || !primaryToggleSupported}
                  onClick={() => void togglePrimaryEntry()}
                  className={`mt-3 inline-flex items-center rounded-xl px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    primaryEntryEnabled
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                  }`}
                >
                  {savingPrimary ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : primaryEntryEnabled ? (
                    <ToggleRight className="mr-2 h-5 w-5" />
                  ) : (
                    <ToggleLeft className="mr-2 h-5 w-5" />
                  )}
                  {primaryEntryEnabled ? 'เปิดการกรอก ปพ.5 ระดับประถมแล้ว' : 'ปิดการกรอก ปพ.5 ระดับประถม'}
                </button>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-[1fr_1fr_auto] lg:max-w-3xl">
                <label className="flex min-w-0 flex-col">
                  <span className="text-[11px] font-bold text-slate-500">วันที่เริ่มลงข้อมูล</span>
                  <ThaiDateCalendarInput
                    value={primaryDraftEntryStart}
                    onChange={setPrimaryDraftEntryStart}
                    disabled={!canWrite || !primaryDateColumnsSupported}
                  />
                </label>
                <label className="flex min-w-0 flex-col">
                  <span className="text-[11px] font-bold text-slate-500">วันที่สิ้นสุด</span>
                  <ThaiDateCalendarInput
                    value={primaryDraftEntryEnd}
                    onChange={setPrimaryDraftEntryEnd}
                    disabled={!canWrite || !primaryDateColumnsSupported}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void savePrimarySettings()}
                  disabled={!canWrite || savingPrimary || !primaryDateColumnsSupported}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
                >
                  {savingPrimary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarRange className="mr-2 h-4 w-4" />}
                  บันทึก
                </button>
              </div>
            </div>
          </section>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" /> กำลังโหลด...
            </div>
          ) : (
            semesters.map((semester) => (
              <section key={semester.id} className="ui-card p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h5 className="text-lg font-extrabold text-slate-900">
                      ภาคเรียนที่ {semester.semester_number}
                    </h5>
                    <p className="mt-1 text-sm text-slate-500">
                      เปิด/ปิดให้ครูกรอก ปพ.5 ในภาคนี้ และกำหนดช่วงวันที่ได้รับอนุญาต
                    </p>
                    <button
                      type="button"
                      disabled={!canWrite || semester.saving || !gradeEntryToggleSupported}
                      onClick={() => void toggleSemesterEnabled(semester)}
                      className={`mt-3 inline-flex items-center rounded-xl px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        semester.draftEnabled
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                          : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                      }`}
                    >
                      {semester.draftEnabled ? (
                        <ToggleRight className="mr-2 h-5 w-5" />
                      ) : (
                        <ToggleLeft className="mr-2 h-5 w-5" />
                      )}
                      {semester.draftEnabled ? 'เปิดการกรอก ปพ.5 แล้ว' : 'ปิดการกรอก ปพ.5'}
                    </button>
                  </div>

                  <div className="grid w-full gap-3 sm:grid-cols-[1fr_1fr_auto] lg:max-w-3xl">
                    <label className="flex min-w-0 flex-col">
                      <span className="text-[11px] font-bold text-slate-500">วันที่เริ่มลงข้อมูล</span>
                      <ThaiDateCalendarInput
                        value={semester.draftEntryStart}
                        onChange={(value) =>
                          setSemesters((items) =>
                            items.map((item) =>
                              item.id === semester.id ? { ...item, draftEntryStart: value } : item,
                            ),
                          )
                        }
                        disabled={!canWrite}
                      />
                    </label>
                    <label className="flex min-w-0 flex-col">
                      <span className="text-[11px] font-bold text-slate-500">วันที่สิ้นสุด</span>
                      <ThaiDateCalendarInput
                        value={semester.draftEntryEnd}
                        onChange={(value) =>
                          setSemesters((items) =>
                            items.map((item) =>
                              item.id === semester.id ? { ...item, draftEntryEnd: value } : item,
                            ),
                          )
                        }
                        disabled={!canWrite}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void saveSemesterSettings(semester)}
                      disabled={!canWrite || semester.saving}
                      className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
                    >
                      {semester.saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarRange className="mr-2 h-4 w-4" />}
                      บันทึก
                    </button>
                  </div>
                </div>
              </section>
            ))
          )}
        </div>
      )}

      {section === 'activity' && (
        <div className="space-y-4">
          <div className="flex items-center justify-end">
            <button type="button" onClick={() => void loadActivity()} className="btn btn-secondary text-xs">
              รีเฟรช
            </button>
          </div>

          {loadingActivity ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" /> กำลังโหลด...
            </div>
          ) : (
            <div className="ui-card overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h5 className="font-bold text-slate-900">บันทึกกิจกรรม</h5>
                <p className="mt-0.5 text-xs text-slate-500">รวมกิจกรรมของผู้ดูแลระบบและผู้บริหาร</p>
              </div>
              <ActivityLogTable
                logs={visibleActivityLogs}
                emptyMessage="ยังไม่มีบันทึกกิจกรรม"
              />
            </div>
          )}
        </div>
      )}

      {section === 'system' && (
        <div className="space-y-4">
          {loadingSystem ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" /> กำลังโหลดข้อมูลระบบ...
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="ui-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-slate-500">
                    <Database className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">ฐานข้อมูล Supabase</span>
                  </div>
                  <p className={`text-lg font-extrabold ${dbConnected ? 'text-emerald-700' : 'text-red-600'}`}>
                    {dbConnected ? 'เชื่อมต่อปกติ' : 'เชื่อมต่อไม่สำเร็จ'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">สถานะการเชื่อมต่อจากแอปไปยัง Supabase</p>
                </div>

                <div className="ui-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-slate-500">
                    <HardDrive className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">พื้นที่ฐานข้อมูล</span>
                  </div>
                  <p className="text-lg font-extrabold text-slate-900">
                    {storageMeta.hasRealBytes
                      ? `${formatBytes(storageMeta.used)} / ${formatBytes(storageMeta.limit)}`
                      : 'ยังไม่มีข้อมูลขนาดจริง'}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {storageMeta.hasRealBytes
                      ? `ใช้ไป ${storageMeta.percent}% ของโควต้า 500 MB`
                      : 'รอการเชื่อมต่อฟังก์ชันวัดขนาดฐานข้อมูล'}
                  </p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${storageMeta.percent >= 85 ? 'bg-red-500' : storageMeta.percent >= 60 ? 'bg-amber-400' : 'bg-blue-600'}`}
                      style={{ width: `${storageMeta.hasRealBytes ? storageMeta.percent : 0}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {storageMeta.hasRealBytes
                      ? `ขนาดจริงจาก Supabase · อัปเดต ${systemHealth?.generated_at ? formatLogTime(systemHealth.generated_at) : 'ล่าสุด'}`
                      : SYSTEM_HEALTH_MIGRATION_HINT}
                  </p>
                </div>

                <div className="ui-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-slate-500">
                    <Server className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">เวอร์ชันแอป</span>
                  </div>
                  <p className="text-lg font-extrabold text-slate-900">v0.1.0</p>
                  <p className="mt-1 text-xs text-slate-500">React + Vite + Supabase</p>
                </div>
              </div>

              <div className="ui-card overflow-hidden">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h5 className="font-bold text-slate-900">สถานะทางเทคนิค</h5>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold text-slate-500">Deployment (Vercel)</p>
                    <p className="mt-1 text-sm font-bold text-slate-600">ยังไม่ได้ตั้งค่า</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold text-slate-500">สภาพแวดล้อม</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">{import.meta.env.MODE}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold text-slate-500">อัปเดตข้อมูลล่าสุด</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {systemHealth?.generated_at
                        ? formatLogTime(systemHealth.generated_at)
                        : new Date().toLocaleString('th-TH')}
                    </p>
                  </div>
                </div>
              </div>

              {systemHealth?.counts && (
                <div className="ui-card overflow-hidden">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <h5 className="font-bold text-slate-900">จำนวนข้อมูลในโรงเรียน</h5>
                  </div>
                  <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(systemHealth.counts).map(([key, value]) => (
                      <div key={key} className="rounded-xl border border-slate-200 px-3 py-2 text-center">
                        <p className="text-[11px] font-semibold text-slate-500">{COUNT_LABELS[key] ?? key}</p>
                        <p className="mt-1 text-xl font-extrabold text-slate-900">
                          {Number(value).toLocaleString('th-TH')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
