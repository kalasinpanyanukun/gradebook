import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2, Save, UserCheck } from 'lucide-react';
import { SearchableTeacherSelect } from '../../components/SearchableTeacherSelect';
import { LEARNING_AREAS } from '../../lib/learningAreas';
import { getErrorMessage } from '../../lib/dbErrors';
import { logActivity } from '../../lib/activityLog';
import {
  buildDefaultPap5Officials,
  loadPap5Officials,
  PAP5_OFFICIALS_MIGRATION_HINT,
  savePap5Officials,
  teacherDisplayName,
  type Pap5OfficialsSettings,
} from '../../lib/pap5Officials';
import { supabase } from '../../lib/supabase';
import type { AppUser, Profile } from '../../types';

interface LearningAreaHeadsPageProps {
  currentUser: AppUser;
  readOnly?: boolean;
}

function hasAnySavedOfficials(settings: Pap5OfficialsSettings): boolean {
  const hasAreaHead = Object.values(settings.learningAreaHeads).some(Boolean);
  return hasAreaHead || Boolean(settings.headOfEvaluationId) || Boolean(settings.deputyDirectorId);
}

export const LearningAreaHeadsPage: React.FC<LearningAreaHeadsPageProps> = ({
  currentUser,
  readOnly = false,
}) => {
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [settings, setSettings] = useState<Pap5OfficialsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const initDefaultsRef = useRef(false);

  const activeTeachers = useMemo(
    () => teachers.filter((teacher) => teacher.is_active),
    [teachers],
  );

  const loadPageData = useCallback(async () => {
    if (!currentUser.schoolId) return;

    setLoading(true);
    setError(null);

    try {
      const { data: teacherRows, error: teacherError } = await supabase
        .from('profiles')
        .select('id, school_id, username, title, full_name, role, is_active, created_at')
        .eq('school_id', currentUser.schoolId)
        .eq('is_active', true)
        .in('role', ['teacher', 'admin', 'super_admin', 'executive'])
        .order('full_name');

      if (teacherError) throw teacherError;

      const loadedTeachers = (teacherRows ?? []) as Profile[];
      setTeachers(loadedTeachers);

      let loadedSettings = await loadPap5Officials(currentUser.schoolId);

      if (!hasAnySavedOfficials(loadedSettings) && !readOnly && !initDefaultsRef.current) {
        initDefaultsRef.current = true;
        loadedSettings = buildDefaultPap5Officials(loadedTeachers);
        await savePap5Officials(currentUser.schoolId, loadedSettings);
      }

      setSettings(loadedSettings);
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'โหลดการตั้งค่าไม่สำเร็จ'));
    } finally {
      setLoading(false);
    }
  }, [currentUser.schoolId, readOnly]);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = window.setTimeout(() => setSuccess(null), 3000);
    return () => window.clearTimeout(timer);
  }, [success]);

  const updateLearningAreaHead = (learningArea: string, teacherId: string) => {
    setSettings((current) =>
      current
        ? {
            ...current,
            learningAreaHeads: {
              ...current.learningAreaHeads,
              [learningArea]: teacherId || null,
            },
          }
        : current,
    );
  };

  const handleSave = async () => {
    if (!currentUser.schoolId || !settings || readOnly) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await savePap5Officials(currentUser.schoolId, settings);
      void logActivity(
        currentUser.schoolId,
        currentUser.id,
        currentUser.name,
        'บันทึกการตั้งค่าผู้ลงนามหน้าปก ปพ.5',
        currentUser.role,
      );
      setSuccess('บันทึกการตั้งค่าเรียบร้อยแล้ว');
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'บันทึกการตั้งค่าไม่สำเร็จ'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        กำลังโหลดการตั้งค่า...
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        ไม่สามารถโหลดการตั้งค่าได้
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">หัวหน้ากลุ่มสาระ</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            กำหนดผู้ลงนามในหน้าปกสรุปผล ปพ.5 — แสดงอัตโนมัติตามกลุ่มสาระของรายวิชา
          </p>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            บันทึกการตั้งค่า
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div>{error}</div>
            {error.includes('0025_school_pap5_officials') && (
              <pre className="mt-2 overflow-x-auto rounded-lg bg-white/70 p-3 text-xs text-slate-700">
                {PAP5_OFFICIALS_MIGRATION_HINT}
              </pre>
            )}
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">หัวหน้ากลุ่มสาระการเรียนรู้</h2>
        <p className="mt-1 text-sm text-slate-500">
          เลือกครูหัวหน้ากลุ่มสาระทั้ง 8 กลุ่ม — จะแสดงในหน้าปก ปพ.5 ตามกลุ่มสาระของวิชานั้น
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {LEARNING_AREAS.map((learningArea) => (
            <label key={learningArea} className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">{learningArea}</span>
              <SearchableTeacherSelect
                value={settings.learningAreaHeads[learningArea] ?? ''}
                teachers={activeTeachers}
                onChange={(teacherId) => updateLearningAreaHead(learningArea, teacherId)}
                disabled={readOnly}
                getLabel={teacherDisplayName}
                placeholder="— เลือกครู —"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">หัวหน้างานวัดผลและประเมินผล</h2>
        <p className="mt-1 text-sm text-slate-500">แสดงในส่วนการอนุมัติผลการเรียนของหน้าปก ปพ.5</p>

        <div className="mt-4 max-w-xl">
          <SearchableTeacherSelect
            value={settings.headOfEvaluationId ?? ''}
            teachers={activeTeachers}
            onChange={(teacherId) =>
              setSettings((current) =>
                current ? { ...current, headOfEvaluationId: teacherId || null } : current,
              )
            }
            disabled={readOnly}
            getLabel={teacherDisplayName}
            placeholder="— เลือกครู —"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">รองผู้อำนวยการฝ่ายวิชาการ</h2>
        <p className="mt-1 text-sm text-slate-500">แสดงในส่วนเรียนเสนอเพื่อพิจารณาของหน้าปก ปพ.5</p>

        <div className="mt-4 max-w-xl">
          <SearchableTeacherSelect
            value={settings.deputyDirectorId ?? ''}
            teachers={activeTeachers}
            onChange={(teacherId) =>
              setSettings((current) =>
                current ? { ...current, deputyDirectorId: teacherId || null } : current,
              )
            }
            disabled={readOnly}
            getLabel={teacherDisplayName}
            placeholder="— เลือกครู —"
          />
        </div>
      </section>
    </div>
  );
};
