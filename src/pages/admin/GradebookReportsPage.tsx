import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, ChevronRight, Loader2, RefreshCw, School, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AppUser, Classroom, StudentEnrollment } from '../../types';

interface GradebookReportsPageProps {
  currentUser: AppUser;
  initialYearId?: string;
}

interface ClassLevelRow {
  code: string;
  name: string;
  sequence: number;
  stage: string;
}

interface ClassReportCard {
  code: string;
  name: string;
  classroomCount: number;
  studentCount: number;
}

const LEVEL_GROUPS: Array<{
  title: string;
  subtitle: string;
  codes: string[];
  tone: 'primary' | 'lower' | 'upper';
}> = [
  {
    title: 'ประถมศึกษา',
    subtitle: 'ป.1 - ป.6',
    codes: ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'],
    tone: 'primary',
  },
  {
    title: 'มัธยมศึกษาตอนต้น',
    subtitle: 'ม.1 - ม.3',
    codes: ['ม.1', 'ม.2', 'ม.3'],
    tone: 'lower',
  },
  {
    title: 'มัธยมศึกษาตอนปลาย',
    subtitle: 'ม.4 - ม.6',
    codes: ['ม.4', 'ม.5', 'ม.6'],
    tone: 'upper',
  },
];

const toneClasses = {
  primary: {
    tile: 'bg-blue-50/80 text-blue-700 ring-1 ring-blue-100/80',
  },
  lower: {
    tile: 'bg-emerald-50/80 text-emerald-700 ring-1 ring-emerald-100/80',
  },
  upper: {
    tile: 'bg-amber-50/80 text-amber-700 ring-1 ring-amber-100/80',
  },
};

function formatCount(value: number): string {
  return value.toLocaleString('th-TH');
}

export const GradebookReportsPage: React.FC<GradebookReportsPageProps> = ({ currentUser, initialYearId }) => {
  const [classLevels, setClassLevels] = useState<ClassLevelRow[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [yearLabel, setYearLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!currentUser.schoolId) return;

    setLoading(true);
    setError('');

    try {
      let targetYearId = initialYearId;
      let targetYearLabel = '';

      if (!targetYearId) {
        const { data: yearRows, error: yearError } = await supabase
          .from('academic_years')
          .select('id, year_be, is_active')
          .eq('school_id', currentUser.schoolId)
          .order('year_be', { ascending: false });
        if (yearError) throw yearError;
        const activeYear = yearRows?.find((year) => year.is_active) ?? yearRows?.[0];
        targetYearId = activeYear?.id;
        targetYearLabel = activeYear?.year_be ? String(activeYear.year_be) : '';
      } else {
        const { data: yearRow } = await supabase
          .from('academic_years')
          .select('year_be')
          .eq('id', targetYearId)
          .maybeSingle();
        targetYearLabel = yearRow?.year_be ? String(yearRow.year_be) : '';
      }

      if (!targetYearId) {
        setClassLevels([]);
        setClassrooms([]);
        setEnrollments([]);
        setYearLabel('');
        return;
      }

      const [{ data: levelData, error: levelError }, { data: classroomData, error: classroomError }, { data: enrollmentData, error: enrollmentError }] = await Promise.all([
        supabase.from('class_levels').select('code, name, sequence, stage').order('sequence'),
        supabase
          .from('classrooms')
          .select('*')
          .eq('academic_year_id', targetYearId)
          .order('class_level_code')
          .order('room_number'),
        supabase
          .from('student_enrollments')
          .select('*')
          .eq('academic_year_id', targetYearId)
          .eq('status', 'active'),
      ]);

      if (levelError) throw levelError;
      if (classroomError) throw classroomError;
      if (enrollmentError) throw enrollmentError;

      setClassLevels((levelData ?? []) as ClassLevelRow[]);
      setClassrooms((classroomData ?? []) as Classroom[]);
      setEnrollments((enrollmentData ?? []) as StudentEnrollment[]);
      setYearLabel(targetYearLabel);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดรายงานผล ปพ.5 ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [currentUser.schoolId, initialYearId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const cardsByCode = useMemo(() => {
    const classroomCount = new Map<string, number>();
    const studentCount = new Map<string, number>();

    classrooms.forEach((classroom) => {
      classroomCount.set(classroom.class_level_code, (classroomCount.get(classroom.class_level_code) ?? 0) + 1);
    });

    enrollments.forEach((enrollment) => {
      studentCount.set(enrollment.class_level_code, (studentCount.get(enrollment.class_level_code) ?? 0) + 1);
    });

    return classLevels.reduce((map, level) => {
      map.set(level.code, {
        code: level.code,
        name: level.name,
        classroomCount: classroomCount.get(level.code) ?? 0,
        studentCount: studentCount.get(level.code) ?? 0,
      });
      return map;
    }, new Map<string, ClassReportCard>());
  }, [classLevels, classrooms, enrollments]);

  const totals = useMemo(() => ({
    classrooms: classrooms.length,
    students: enrollments.length,
    levels: [...cardsByCode.values()].filter((card) => card.classroomCount > 0).length,
  }), [classrooms.length, enrollments.length, cardsByCode]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">รายงานผล ปพ.5</p>
          <h2 className="mt-1.5 text-[26px] font-extrabold tracking-tight text-slate-900">
            ภาพรวมรายงานผลตามระดับชั้น{yearLabel ? ` · ปีการศึกษา ${yearLabel}` : ''}
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            ตรวจดูจำนวนห้องเรียนและจำนวนนักเรียนของแต่ละระดับชั้นก่อนเปิดดูรายงาน ปพ.5 ที่ส่งแล้ว
          </p>
        </div>
        <button type="button" onClick={() => void loadData()} className="btn btn-secondary w-fit">
          <RefreshCw className="h-4 w-4" />
          รีเฟรช
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="ui-card flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          กำลังโหลดรายงาน...
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="ui-card flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <School className="h-[22px] w-[22px]" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">ห้องเรียนทั้งหมด</p>
                <p className="mt-0.5 text-[28px] font-extrabold leading-8 tracking-tight text-slate-900 tabular-nums">
                  {formatCount(totals.classrooms)}
                </p>
              </div>
            </div>
            <div className="ui-card flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                <Users className="h-[22px] w-[22px]" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">นักเรียนทั้งหมด</p>
                <p className="mt-0.5 text-[28px] font-extrabold leading-8 tracking-tight text-slate-900 tabular-nums">
                  {formatCount(totals.students)}
                </p>
              </div>
            </div>
            <div className="ui-card flex items-center gap-4 p-5 sm:col-span-2 xl:col-span-1">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <BookOpenCheck className="h-[22px] w-[22px]" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">ระดับชั้นที่เปิดสอน</p>
                <p className="mt-0.5 text-[28px] font-extrabold leading-8 tracking-tight text-slate-900 tabular-nums">
                  {formatCount(totals.levels)}
                </p>
              </div>
            </div>
          </div>

          {LEVEL_GROUPS.map((group) => {
            const tone = toneClasses[group.tone];
            return (
              <section key={group.title} className="ui-card overflow-hidden">
                <div className="relative flex items-center justify-center bg-[#0f172a] px-6 py-3.5">
                  <div className="text-center">
                    <h3 className="text-[15px] font-bold tracking-tight text-white">{group.title}</h3>
                    <p className="text-[11px] font-medium text-slate-400">{group.subtitle}</p>
                  </div>
                  <span className="ui-badge absolute right-6 top-1/2 -translate-y-1/2 bg-white/10 text-slate-200 ring-1 ring-white/15">
                    {group.codes.length} ระดับชั้น
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {group.codes.map((code) => {
                    const card = cardsByCode.get(code) ?? {
                      code,
                      name: code,
                      classroomCount: 0,
                      studentCount: 0,
                    };
                    const empty = card.classroomCount === 0 && card.studentCount === 0;
                    return (
                      <article
                        key={code}
                        className={`group flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-slate-50/70 ${empty ? 'opacity-50' : ''}`}
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold tracking-tight ${tone.tile}`}>
                            {card.code}
                          </div>
                          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                            <h4 className="text-[15px] font-semibold tracking-tight text-slate-900">{card.name}</h4>
                            <span className="hidden truncate text-xs font-medium text-slate-400 md:inline">
                              ระดับชั้น {card.code} · สมุดบันทึกผลการเรียน ปพ.5
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-4 sm:gap-8">
                          <p className="hidden w-28 items-baseline justify-end gap-1.5 text-right sm:flex">
                            <span className="text-lg font-semibold tracking-tight text-slate-900 tabular-nums">
                              {formatCount(card.classroomCount)}
                            </span>
                            <span className="text-xs font-medium text-slate-400">ห้องเรียน</span>
                          </p>
                          <p className="flex w-28 items-baseline justify-end gap-1.5 text-right">
                            <span className="text-lg font-semibold tracking-tight text-slate-900 tabular-nums">
                              {formatCount(card.studentCount)}
                            </span>
                            <span className="text-xs font-medium text-slate-400">นักเรียน</span>
                          </p>
                          <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-400" />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
};
