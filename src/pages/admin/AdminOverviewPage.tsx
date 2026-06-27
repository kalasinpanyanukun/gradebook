import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
  School,
  UserCheck,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { progressTone } from '../../lib/progressTone';
import type { AcademicYear, AppUser, ScoreConfig, Semester, Student } from '../../types';

type GradebookStatus = 'not_started' | 'in_progress' | 'completed';

interface DashboardGradebook {
  id: string;
  status: GradebookStatus;
  stats: Record<string, unknown> | null;
  students: unknown;
  scores: Record<string, unknown> | null;
  score_config: ScoreConfig | null;
}

interface DashboardAssignment {
  id: string;
  status: 'pending' | 'active';
  teacher_id: string;
  profiles?: {
    id: string;
    full_name: string;
    title: string | null;
    username: string | null;
  } | null;
  subjects?: {
    id: string;
    subject_code: string;
    subject_name: string;
    learning_area: string;
  } | null;
  classrooms?: {
    id: string;
    name: string;
    class_level_code: string;
  } | null;
  gradebooks?: DashboardGradebook[] | DashboardGradebook | null;
}

interface ProgressItem {
  id: string;
  name: string;
  detail?: string;
  total: number;
  started: number;
  completed: number;
  avgCompletion: number;
  studentCount: number;
}

interface StudentProgressItem {
  id: string;
  name: string;
  detail: string;
  total: number;
  completed: number;
  avgCompletion: number;
}

const percentFormatter = new Intl.NumberFormat('th-TH', {
  maximumFractionDigits: 1,
});

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatPercent(value: number): string {
  return percentFormatter.format(round1(value));
}

function teacherName(row: DashboardAssignment): string {
  const profile = row.profiles;
  if (!profile) return 'ไม่พบชื่อครู';
  return `${profile.title ? `${profile.title} ` : ''}${profile.full_name}`;
}

function normalizeGradebook(value: DashboardAssignment['gradebooks']): DashboardGradebook | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function numberFromStats(stats: Record<string, unknown> | null, key: string): number {
  const raw = stats?.[key];
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function scoreKeys(scoreConfig: ScoreConfig | null): string[] {
  if (!scoreConfig?.units?.length) return [];
  const keys: string[] = [];
  scoreConfig.units.forEach((unit, unitIndex) => {
    unit.indicators.forEach((_indicator, indicatorIndex) => {
      keys.push(`u${unitIndex}_i${indicatorIndex}`);
    });
  });
  keys.push('midterm', 'final');
  return keys;
}

function normalizeStudents(value: unknown): Student[] {
  return Array.isArray(value) ? (value as Student[]) : [];
}

function gradebookCompletion(gradebook: DashboardGradebook | null): number {
  if (!gradebook) return 0;
  const completion = numberFromStats(gradebook.stats, 'completionPercent');
  if (completion > 0 || gradebook.status === 'completed') {
    return gradebook.status === 'completed' ? Math.max(100, completion) : completion;
  }

  const students = normalizeStudents(gradebook.students);
  const keys = scoreKeys(gradebook.score_config);
  if (students.length === 0 || keys.length === 0) return 0;

  let filled = 0;
  const scores = gradebook.scores ?? {};
  students.forEach((student) => {
    const row = (scores[student.id] ?? {}) as Record<string, unknown>;
    keys.forEach((key) => {
      const value = row[key];
      if (value !== '' && value != null) filled += 1;
    });
  });

  return round1((filled / (students.length * keys.length)) * 100);
}

function studentCompletion(
  student: Student,
  gradebook: DashboardGradebook,
  fallbackCompletion: number,
): number {
  const keys = scoreKeys(gradebook.score_config);
  if (keys.length === 0) return fallbackCompletion;

  const row = ((gradebook.scores ?? {})[student.id] ?? {}) as Record<string, unknown>;
  const filled = keys.filter((key) => {
    const value = row[key];
    return value !== '' && value != null;
  }).length;

  return round1((filled / keys.length) * 100);
}

function aggregateProgress(
  rows: DashboardAssignment[],
  keyFor: (row: DashboardAssignment) => string,
  nameFor: (row: DashboardAssignment) => string,
  detailFor?: (row: DashboardAssignment) => string,
): ProgressItem[] {
  const grouped = new Map<string, ProgressItem & { completionSum: number; studentSum: number }>();

  rows.forEach((row) => {
    const id = keyFor(row);
    const gradebook = normalizeGradebook(row.gradebooks);
    const completion = gradebookCompletion(gradebook);
    const students = normalizeStudents(gradebook?.students);
    const current = grouped.get(id) ?? {
      id,
      name: nameFor(row),
      detail: detailFor?.(row),
      total: 0,
      started: 0,
      completed: 0,
      avgCompletion: 0,
      studentCount: 0,
      completionSum: 0,
      studentSum: 0,
    };

    current.total += 1;
    current.started += gradebook ? 1 : 0;
    current.completed += completion >= 100 || gradebook?.status === 'completed' ? 1 : 0;
    current.completionSum += completion;
    current.studentSum += students.length;
    current.studentCount = current.studentSum;
    current.avgCompletion = round1(current.completionSum / current.total);
    grouped.set(id, current);
  });

  return [...grouped.values()]
    .map(({ completionSum: _completionSum, studentSum: _studentSum, ...item }) => item)
    .sort((a, b) => b.avgCompletion - a.avgCompletion || a.name.localeCompare(b.name, 'th'));
}

function aggregateStudents(rows: DashboardAssignment[]): StudentProgressItem[] {
  const grouped = new Map<string, StudentProgressItem & { completionSum: number }>();

  rows.forEach((row) => {
    const gradebook = normalizeGradebook(row.gradebooks);
    if (!gradebook) return;
    const fallbackCompletion = gradebookCompletion(gradebook);
    normalizeStudents(gradebook.students).forEach((student) => {
      const id = student.id || student.studentId || `${student.name}-${row.id}`;
      const completion = studentCompletion(student, gradebook, fallbackCompletion);
      const detailParts = [
        student.studentId ? `เลขประจำตัว ${student.studentId}` : '',
        row.classrooms?.name ? `ห้อง ${row.classrooms.name}` : '',
      ].filter(Boolean);

      const current = grouped.get(id) ?? {
        id,
        name: student.name || 'ไม่พบชื่อนักเรียน',
        detail: detailParts.join(' · '),
        total: 0,
        completed: 0,
        avgCompletion: 0,
        completionSum: 0,
      };

      current.total += 1;
      current.completed += completion >= 100 ? 1 : 0;
      current.completionSum += completion;
      current.avgCompletion = round1(current.completionSum / current.total);
      grouped.set(id, current);
    });
  });

  return [...grouped.values()]
    .map(({ completionSum: _completionSum, ...item }) => item)
    .sort((a, b) => a.avgCompletion - b.avgCompletion || a.name.localeCompare(b.name, 'th'));
}

interface StatTileProps {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
}

function StatTile({ icon: Icon, label, value, detail }: StatTileProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-950 mt-1">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-3">{detail}</p>
    </div>
  );
}

interface ProgressTableProps {
  title: string;
  items: ProgressItem[];
  emptyText: string;
}

function ProgressTable({ title, items, emptyText }: ProgressTableProps) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-slate-950">{title}</h3>
        <span className="text-xs text-slate-500">{items.length} รายการ</span>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-slate-400">{emptyText}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">รายการ</th>
                <th className="text-right px-4 py-3 font-semibold">งาน</th>
                <th className="text-right px-4 py-3 font-semibold">เสร็จ</th>
                <th className="text-left px-4 py-3 font-semibold min-w-44">ความคืบหน้า</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const progressMeta = progressTone(item.avgCompletion);
                return (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-950">{item.name}</div>
                    {item.detail && <div className="text-xs text-slate-500 mt-0.5">{item.detail}</div>}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{item.total}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{item.completed}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex-1">
                        <div
                          className={`h-full rounded-full ${progressMeta.barClassName}`}
                          style={{ width: `${progressMeta.displayWidth}%` }}
                        />
                      </div>
                      <span className={`w-20 text-right text-xs font-semibold ${progressMeta.textClassName}`}>
                        {progressMeta.isCompleted ? progressMeta.label : `${formatPercent(item.avgCompletion)}%`}
                      </span>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

interface TeacherListProps {
  title: string;
  items: ProgressItem[];
  tone: 'complete' | 'incomplete';
}

function TeacherList({ title, items, tone }: TeacherListProps) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        {tone === 'complete' ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        ) : (
          <AlertCircle className="w-4 h-4 text-amber-600" />
        )}
        <h3 className="font-bold text-slate-950">{title}</h3>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-8 text-sm text-slate-400 text-center">ไม่มีรายการ</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <div key={item.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-slate-950 truncate">{item.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    เสร็จ {item.completed}/{item.total} งาน
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-700 shrink-0">
                  {formatPercent(item.avgCompletion)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

interface StudentProgressTableProps {
  items: StudentProgressItem[];
}

function StudentProgressTable({ items }: StudentProgressTableProps) {
  return (
    <section className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-slate-950">ความคืบหน้ารายชื่อนักเรียน</h3>
        <span className="text-xs text-slate-500">{items.length} คน</span>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-slate-400">
          ยังไม่มีข้อมูลนักเรียนใน ปพ.5
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">นักเรียน</th>
                <th className="text-right px-4 py-3 font-semibold">วิชา</th>
                <th className="text-right px-4 py-3 font-semibold">ครบ</th>
                <th className="text-left px-4 py-3 font-semibold min-w-44">ความคืบหน้า</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const progressMeta = progressTone(item.avgCompletion);
                return (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-950">{item.name}</div>
                    {item.detail && <div className="text-xs text-slate-500 mt-0.5">{item.detail}</div>}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{item.total}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{item.completed}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex-1">
                        <div
                          className={`h-full rounded-full ${progressMeta.barClassName}`}
                          style={{ width: `${progressMeta.displayWidth}%` }}
                        />
                      </div>
                      <span className={`w-20 text-right text-xs font-semibold ${progressMeta.textClassName}`}>
                        {progressMeta.isCompleted ? progressMeta.label : `${formatPercent(item.avgCompletion)}%`}
                      </span>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

interface AdminOverviewPageProps {
  currentUser: AppUser;
  initialYearId?: string;
}

export const AdminOverviewPage: React.FC<AdminOverviewPageProps> = ({ currentUser, initialYearId }) => {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedYearId, setSelectedYearId] = useState(initialYearId ?? '');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [assignments, setAssignments] = useState<DashboardAssignment[]>([]);
  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [error, setError] = useState('');

  const loadYears = useCallback(async () => {
    if (!currentUser.schoolId) return;
    setLoadingYears(true);
    setError('');
    try {
      const { data, error: queryError } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', currentUser.schoolId)
        .order('year_be', { ascending: false });
      if (queryError) throw queryError;

      setYears(data ?? []);
      const preferred = initialYearId
        ? data?.find((year) => year.id === initialYearId)
        : undefined;
      const active = preferred ?? data?.find((year) => year.is_active) ?? data?.[0];
      setSelectedYearId((prev) => {
        if (preferred && prev !== preferred.id) return preferred.id;
        return prev && data?.some((year) => year.id === prev) ? prev : active?.id ?? '';
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดปีการศึกษาไม่สำเร็จ');
    } finally {
      setLoadingYears(false);
    }
  }, [currentUser.schoolId, initialYearId]);

  const loadSemesters = useCallback(async () => {
    if (!selectedYearId) {
      setSemesters([]);
      setSelectedSemesterId('');
      return;
    }

    const { data, error: queryError } = await supabase
      .from('semesters')
      .select('*')
      .eq('academic_year_id', selectedYearId)
      .order('semester_number');

    if (queryError) {
      setError(queryError.message);
      return;
    }

    setSemesters(data ?? []);
    const active = data?.find((semester) => semester.is_active) ?? data?.[0];
    setSelectedSemesterId((prev) => (
      prev && data?.some((semester) => semester.id === prev) ? prev : active?.id ?? ''
    ));
  }, [selectedYearId]);

  const loadDashboard = useCallback(async () => {
    if (!currentUser.schoolId || !selectedSemesterId) {
      setAssignments([]);
      return;
    }

    setLoadingDashboard(true);
    setError('');
    try {
      const { data, error: queryError } = await supabase
        .from('teaching_assignments')
        .select(`
          id,
          status,
          teacher_id,
          profiles:teacher_id(id, full_name, title, username),
          subjects:subject_id(id, subject_code, subject_name, learning_area),
          classrooms:classroom_id(id, name, class_level_code),
          gradebooks(id, status, stats, students, scores, score_config)
        `)
        .eq('school_id', currentUser.schoolId)
        .eq('semester_id', selectedSemesterId)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      setAssignments((data ?? []) as unknown as DashboardAssignment[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดแดชบอร์ดไม่สำเร็จ');
    } finally {
      setLoadingDashboard(false);
    }
  }, [currentUser.schoolId, selectedSemesterId]);

  useEffect(() => {
    void loadYears();
  }, [loadYears]);

  useEffect(() => {
    void loadSemesters();
  }, [loadSemesters]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const overview = useMemo(() => {
    const totalAssignments = assignments.length;
    const activeAssignments = assignments.filter((row) => row.status === 'active').length;
    const gradebookRows = assignments.map((row) => normalizeGradebook(row.gradebooks)).filter(Boolean);
    const started = gradebookRows.length;
    const completed = assignments.filter((row) => {
      const gradebook = normalizeGradebook(row.gradebooks);
      return gradebookCompletion(gradebook) >= 100 || gradebook?.status === 'completed';
    }).length;
    const completionSum = assignments.reduce(
      (sum, row) => sum + gradebookCompletion(normalizeGradebook(row.gradebooks)),
      0,
    );
    const totalStudents = assignments.reduce((sum, row) => {
      const gradebook = normalizeGradebook(row.gradebooks);
      return sum + normalizeStudents(gradebook?.students).length;
    }, 0);

    return {
      totalAssignments,
      activeAssignments,
      started,
      completed,
      totalStudents,
      avgCompletion: totalAssignments > 0 ? round1(completionSum / totalAssignments) : 0,
    };
  }, [assignments]);

  const byTeacher = useMemo(
    () => aggregateProgress(
      assignments,
      (row) => row.teacher_id,
      teacherName,
      (row) => row.profiles?.username ? `username: ${row.profiles.username}` : undefined,
    ),
    [assignments],
  );

  const byClassroom = useMemo(
    () => aggregateProgress(
      assignments,
      (row) => row.classrooms?.id ?? `classroom-${row.id}`,
      (row) => row.classrooms?.name ?? 'ไม่พบห้องเรียน',
      (row) => row.classrooms?.class_level_code,
    ),
    [assignments],
  );

  const bySubject = useMemo(
    () => aggregateProgress(
      assignments,
      (row) => row.subjects?.id ?? `subject-${row.id}`,
      (row) => row.subjects?.subject_name ?? 'ไม่พบรายวิชา',
      (row) => {
        const subject = row.subjects;
        return subject ? `${subject.subject_code} · ${subject.learning_area}` : undefined;
      },
    ),
    [assignments],
  );

  const byStudent = useMemo(() => aggregateStudents(assignments), [assignments]);
  const completeTeachers = byTeacher.filter((item) => item.total > 0 && item.completed === item.total);
  const incompleteTeachers = byTeacher.filter((item) => item.completed < item.total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">แดชบอร์ดติดตาม ปพ.5</h2>
          <p className="text-sm text-slate-500 mt-1">
            ภาพรวมการกรอก ปพ.5 ตามรายการมอบหมายที่ฝ่ายวิชาการกำหนด
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedYearId}
            onChange={(event) => setSelectedYearId(event.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loadingYears || years.length === 0}
          >
            {years.map((year) => (
              <option key={year.id} value={year.id}>ปีการศึกษา {year.year_be}</option>
            ))}
          </select>
          <select
            value={selectedSemesterId}
            onChange={(event) => setSelectedSemesterId(event.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            disabled={semesters.length === 0}
          >
            {semesters.map((semester) => (
              <option key={semester.id} value={semester.id}>ภาคเรียนที่ {semester.semester_number}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="inline-flex items-center justify-center px-3 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
            disabled={loadingDashboard}
          >
            {loadingDashboard ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            รีเฟรช
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loadingYears || loadingDashboard ? (
        <div className="bg-white border border-slate-200 rounded-lg py-20 flex items-center justify-center text-slate-500">
          <Loader2 className="w-6 h-6 mr-2 animate-spin" />
          กำลังโหลดข้อมูลแดชบอร์ด...
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg py-20 text-center text-slate-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-slate-600">ยังไม่มีรายการมอบหมายในภาคเรียนนี้</p>
          <p className="text-sm mt-1">เพิ่มรายการในเมนูมอบหมายครู กรอก ปพ.5 เพื่อเริ่มติดตามงาน</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              icon={ClipboardList}
              label="งานที่มอบหมาย"
              value={`${overview.totalAssignments}`}
              detail={`เปิดใช้งาน ${overview.activeAssignments} งาน`}
            />
            <StatTile
              icon={BarChart3}
              label="ความคืบหน้าเฉลี่ย"
              value={`${formatPercent(overview.avgCompletion)}%`}
              detail={`เริ่มกรอกแล้ว ${overview.started}/${overview.totalAssignments} งาน`}
            />
            <StatTile
              icon={CheckCircle2}
              label="กรอกสมบูรณ์"
              value={`${overview.completed}`}
              detail={`เหลือ ${Math.max(0, overview.totalAssignments - overview.completed)} งาน`}
            />
            <StatTile
              icon={Users}
              label="รายการนักเรียน"
              value={`${overview.totalStudents}`}
              detail="นับจากสมุด ปพ.5 ที่ถูกสร้างแล้ว"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <TeacherList title="ครูที่กรอกสมบูรณ์แล้ว" items={completeTeachers} tone="complete" />
            <TeacherList title="ครูที่ยังกรอกไม่สมบูรณ์" items={incompleteTeachers} tone="incomplete" />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <ProgressTable title="ตามครูผู้สอน" items={byTeacher} emptyText="ยังไม่มีข้อมูลครู" />
            <ProgressTable title="ตามชั้นเรียน" items={byClassroom} emptyText="ยังไม่มีข้อมูลชั้นเรียน" />
            <ProgressTable title="ตามรายวิชา" items={bySubject} emptyText="ยังไม่มีข้อมูลรายวิชา" />
          </div>

          <StudentProgressTable items={byStudent} />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
              <School className="w-5 h-5 text-blue-700" />
              <div>
                <div className="text-xs text-slate-500">ชั้นเรียนทั้งหมด</div>
                <div className="font-bold text-slate-950">{byClassroom.length}</div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-blue-700" />
              <div>
                <div className="text-xs text-slate-500">รายวิชาทั้งหมด</div>
                <div className="font-bold text-slate-950">{bySubject.length}</div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-blue-700" />
              <div>
                <div className="text-xs text-slate-500">ครูที่ต้องติดตาม</div>
                <div className="font-bold text-slate-950">{incompleteTeachers.length}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
