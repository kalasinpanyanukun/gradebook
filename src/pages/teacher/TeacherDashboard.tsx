import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Loader2,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { isAdmin } from '../../lib/auth';
import {
  gradebookStatusClassName,
  gradebookStatusLabel,
  resolveGradebookStatus,
} from '../../lib/gradebookStatusDisplay';
import {
  ensureGradebook,
  fetchTeacherAssignments,
  groupAssignmentsByYear,
  type TeacherAssignmentView,
} from '../../lib/teacherGradebooks';
import type { AppUser } from '../../types';

interface TeacherDashboardProps {
  currentUser: AppUser;
  onOpenGradebook: (assignment: TeacherAssignmentView, gradebookId: string) => void;
  onLogout: () => void;
  onSettings: () => void;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function countdownParts(window: { start: string | null; end: string | null }, now: Date) {
  const targetStart = window.start ? localDate(window.start) : null;
  const targetEnd = window.end ? localDate(window.end, true) : null;
  const nowMs = now.getTime();
  const target =
    targetStart && nowMs < targetStart.getTime()
      ? { label: 'เริ่มใน', date: targetStart }
      : targetEnd
        ? { label: 'เหลือ', date: targetEnd }
        : null;

  if (!target) return { type: 'text' as const, label: 'กำหนดเวลา', value: 'ยังไม่กำหนด' };

  const diff = target.date.getTime() - nowMs;
  if (diff <= 0) return { type: 'text' as const, label: 'สถานะ', value: 'ครบกำหนดแล้ว' };

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    type: 'countdown' as const,
    label: target.label,
    days,
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
}
function teacherGreetingName(user: AppUser): string {
  const name = user.name.trim();
  if (user.role === 'teacher') return name.startsWith('ครู') ? name : `ครู${name}`;
  const title = user.title?.trim();
  if (!title || name.startsWith(title)) return name;
  return `${title} ${name}`;
}

function formatThaiDate(date: string | null | undefined): string {
  if (!date) return '';
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function localDate(date: string, endOfDay = false): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0);
}

function assignmentEntryWindow(items: TeacherAssignmentView[]) {
  const starts = items.map((item) => item.entry_start_date).filter((date): date is string => Boolean(date)).sort();
  const ends = items.map((item) => item.entry_end_date).filter((date): date is string => Boolean(date)).sort();
  return {
    start: starts[0] ?? null,
    end: ends[ends.length - 1] ?? null,
  };
}

function semesterText(items: TeacherAssignmentView[]): string {
  const semesters = uniqueStrings(items.map((item) => String(item.semester_number))).sort((a, b) => Number(a) - Number(b));
  if (semesters.length === 0) return 'ภาคเรียน -';
  return `ภาคเรียนที่ ${semesters.join(', ')}`;
}

function hoursLabel(assignment: TeacherAssignmentView): string {
  const week = assignment.hours_per_week ?? '-';
  const semester = assignment.hours_per_semester ?? '-';
  return `${week}/${semester}`;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentUser,
  onOpenGradebook,
  onLogout,
  onSettings,
}) => {
  const [assignments, setAssignments] = useState<TeacherAssignmentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(new Set());
  const [now, setNow] = useState(() => new Date());
  const displayUserName = teacherGreetingName(currentUser);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTeacherAssignments(currentUser.id);
      setAssignments(data);

      const activeYear = data.find((a) => a.year_is_active)?.year_be;
      const years = [...new Set(data.map((a) => a.year_be))].sort((a, b) => b - a);
      const collapsed = new Set<number>();
      years.forEach((y) => {
        if (activeYear != null && y < activeYear) collapsed.add(y);
      });
      setCollapsedYears(collapsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดรายวิชาไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void load();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const grouped = useMemo(() => groupAssignmentsByYear(assignments), [assignments]);
  const sortedYears = useMemo(
    () => [...grouped.keys()].sort((a, b) => b - a),
    [grouped]
  );
  const activeYearItems = useMemo(() => {
    const activeYear = sortedYears.find((year) => (grouped.get(year) ?? []).some((assignment) => assignment.year_is_active));
    return activeYear != null ? (grouped.get(activeYear) ?? []) : [];
  }, [grouped, sortedYears]);
  const activeEntryWindow = useMemo(() => assignmentEntryWindow(activeYearItems), [activeYearItems]);
  const activeCountdown = useMemo(() => countdownParts(activeEntryWindow, now), [activeEntryWindow, now]);
  const activeEntryWindowLabel =
    activeEntryWindow.start || activeEntryWindow.end
      ? `${formatThaiDate(activeEntryWindow.start) || 'ไม่กำหนด'} - ${formatThaiDate(activeEntryWindow.end) || 'ไม่กำหนด'}`
      : 'ยังไม่กำหนดช่วงวันที่ลงข้อมูล';

  const toggleYear = (year: number) => {
    setCollapsedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const handleOpen = async (assignment: TeacherAssignmentView) => {
    setOpeningId(assignment.id);
    setError('');
    try {
      const gradebookId = await ensureGradebook(assignment, currentUser);
      onOpenGradebook({ ...assignment, gradebook_id: gradebookId }, gradebookId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เปิดสมุดบันทึกไม่สำเร็จ');
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] font-sans">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="grid gap-3 px-4 py-3.5 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:px-8">
          <div className="flex items-center">
            <img src="/logo3.png" alt="KSP GradeBook" className="mr-3 h-11 w-11 object-contain" />
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">KSP GradeBook</h1>
              <p className="text-[11px] font-medium text-slate-500">ระบบบันทึกผลการพัฒนาคุณภาพผู้เรียน (ปพ.5)</p>
            </div>
          </div>
          {isAdmin(currentUser) ? (
            <nav
              aria-label="สลับพื้นที่ทำงาน"
              className="inline-flex items-center justify-self-start rounded-full border border-slate-200 bg-slate-100/80 p-1 lg:justify-self-center"
            >
              <button
                type="button"
                className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-900 shadow-sm ring-1 ring-slate-200/60 sm:px-4"
              >
                <BookOpen className="mr-2 h-4 w-4 text-blue-600" />
                หน้าครู
              </button>
              <button
                type="button"
                onClick={onSettings}
                className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900 sm:px-4"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Admin
              </button>
            </nav>
          ) : (
            <div className="hidden lg:block" />
          )}
          <div className="flex items-center justify-start gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
              title="รีเฟรช"
            >
              <RefreshCw className="h-[18px] w-[18px]" />
            </button>
            <div className="flex items-center rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 shadow-sm">
              <div className="mr-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white">
                {currentUser.name.charAt(0)}
              </div>
              <span className="mr-3 hidden text-sm font-semibold text-slate-700 sm:inline">{displayUserName}</span>
              <button type="button" onClick={onLogout} className="text-slate-400 transition hover:text-red-600" title="ออกจากระบบ">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 animate-fade-up">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">วิชาที่ได้รับมอบหมาย</p>
              <h2 className="mt-1.5 text-[28px] font-extrabold tracking-tight text-slate-900">
                สวัสดี, {displayUserName}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">เลือกรายวิชาเพื่อเปิดสมุดบันทึกผลการเรียน ปพ.5</p>
            </div>
            {activeYearItems.length > 0 && (
              <div className="text-right text-sm font-semibold text-slate-900 lg:mt-[1.375rem] lg:shrink-0">
                <p>กำหนดส่งข้อมูล {activeEntryWindowLabel}</p>
                <p className="mt-1 font-mono tabular-nums">
                  {activeCountdown.type === 'countdown' ? (
                    <>
                      {activeCountdown.days} วัน {activeCountdown.hours} ชม. {activeCountdown.minutes} นาที{' '}
                      <span className="text-red-600">{activeCountdown.seconds}</span> วินาที
                    </>
                  ) : (
                    <>
                      {activeCountdown.label}: {activeCountdown.value}
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm font-medium text-red-600">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" /> กำลังโหลดรายวิชา...
          </div>
        ) : assignments.length === 0 ? (
          <div className="ui-card py-24 text-center text-slate-400">
            <BookOpen className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p className="font-semibold text-slate-600">ยังไม่มีวิชาที่มอบหมาย</p>
            <p className="mt-1 text-sm">ติดต่อฝ่ายวิชาการเพื่อกำหนดรายการมอบหมาย ปพ.5</p>
          </div>
        ) : (
          <div className="space-y-10">
            {sortedYears.map((year) => {
              const items = grouped.get(year) ?? [];
              const isActiveYear = items.some((a) => a.year_is_active);
              const collapsed = collapsedYears.has(year);

              return (
                <section key={year} className="animate-fade-up">
                  <div className="mb-4 flex flex-col items-center gap-2 text-center">
                    {!isActiveYear && (
                      <button
                        type="button"
                        onClick={() => toggleYear(year)}
                        className="inline-flex items-center gap-2 rounded-lg px-1 text-slate-600 transition hover:text-slate-900"
                      >
                        {collapsed ? (
                          <ChevronRight className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        )}
                        <span className="text-sm font-semibold">ย่อ/ขยายรายการ</span>
                      </button>
                    )}

                    <p className="text-[28px] font-extrabold tracking-tight text-slate-900">
                      ปีการศึกษา {year}{' '}
                      <span className="text-blue-600">{semesterText(items)}</span>
                    </p>

                    <span className="text-sm font-medium text-slate-400">{items.length} วิชา</span>
                  </div>

                  {(!collapsed || isActiveYear) && (
                    <div className={`ui-card overflow-hidden ${isActiveYear ? '' : 'opacity-95'}`}>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1060px] text-sm">
                          <thead className="bg-slate-900 text-white">
                            <tr>
                              <th className="px-4 py-3 text-center font-semibold">ลำดับ</th>
                              <th className="px-4 py-3 text-left font-semibold">รหัสวิชา</th>
                              <th className="px-4 py-3 text-center font-semibold">ภาคเรียนที่</th>
                              <th className="px-4 py-3 text-left font-semibold">ชื่อวิชา</th>
                              <th className="px-4 py-3 text-left font-semibold">กลุ่มสาระ</th>
                              <th className="px-4 py-3 text-center font-semibold">ระดับชั้น</th>
                              <th className="px-4 py-3 text-center font-semibold">ห้องเรียน</th>
                              <th className="px-4 py-3 text-center font-semibold">ชม.เรียน/สัปดาห์/ภาค</th>
                              <th className="px-4 py-3 text-center font-semibold">สถานะ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {items.map((assignment, index) => {
                              const displayStatus = resolveGradebookStatus(
                                assignment.gradebook_status,
                                assignment.completion_percent,
                              );
                              return (
                                <tr
                                  key={assignment.id}
                                  onClick={() => void handleOpen(assignment)}
                                  className="cursor-pointer transition-colors hover:bg-slate-50/70"
                                >
                                  <td className="px-4 py-3 text-center font-semibold text-slate-500">{index + 1}</td>
                                  <td className="px-4 py-3 font-mono font-semibold text-slate-800">{assignment.subject_code}</td>
                                  <td className="px-4 py-3 text-center text-slate-600">ภาค {assignment.semester_number}</td>
                                  <td className="px-4 py-3 font-semibold text-slate-900">{assignment.subject_name}</td>
                                  <td className="px-4 py-3 text-slate-600">{assignment.learning_area}</td>
                                  <td className="px-4 py-3 text-center text-slate-600">{assignment.class_level_code}</td>
                                  <td className="px-4 py-3 text-center font-semibold text-slate-700">{assignment.classroom_name}</td>
                                  <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700">{hoursLabel(assignment)}</td>
                                  <td className="px-4 py-3 text-center">
                                    <div className="flex justify-center">
                                      <button
                                        type="button"
                                        disabled={openingId === assignment.id}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          void handleOpen(assignment);
                                        }}
                                        className={`inline-flex min-w-[108px] items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-60 ${gradebookStatusClassName(displayStatus)}`}
                                      >
                                        {openingId === assignment.id
                                          ? 'กำลังเปิด...'
                                          : gradebookStatusLabel(displayStatus, assignment.completion_percent)}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>

      <footer className="pb-10 pt-2 text-center">
        <p className="text-sm font-semibold text-slate-500">KSP GradeBook V 0.1.0</p>
        <p className="mt-0.5 text-xs text-slate-400">โรงเรียนกาฬสินธุ์ปัญญานุกูล จังหวัดกาฬสินธุ์</p>
      </footer>
    </div>
  );
};
