import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, FileText, Loader2, Search } from 'lucide-react';
import { ROLE_LABELS } from '../../lib/auth';
import { fetchTeacherAssignments, type TeacherAssignmentView } from '../../lib/teacherGradebooks';
import { progressTone } from '../../lib/progressTone';
import { supabase } from '../../lib/supabase';
import type { AppUser, Profile } from '../../types';

interface AdminGradebookEntryPageProps {
  currentUser: AppUser;
  initialYearId?: string;
  readOnly?: boolean;
  onOpenGradebook: (
    assignment: TeacherAssignmentView,
    gradebookId: string,
    options?: { readOnly?: boolean },
  ) => void;
}

interface TeacherGradebookRow extends Profile {
  assignments: TeacherAssignmentView[];
}

function formatCount(value: number): string {
  return value.toLocaleString('th-TH');
}

function averageProgress(assignments: TeacherAssignmentView[]): number {
  if (assignments.length === 0) return 0;
  const total = assignments.reduce((sum, assignment) => sum + assignment.completion_percent, 0);
  return Math.round(total / assignments.length);
}

function gradebookStatusLabel(status: TeacherAssignmentView['gradebook_status']): string {
  if (status === 'completed') return 'เสร็จสมบูรณ์';
  if (status === 'in_progress') return 'กำลังกรอก';
  if (status === 'not_started') return 'ยังไม่เริ่ม';
  return 'ยังไม่มีสมุด';
}

export const AdminGradebookEntryPage: React.FC<AdminGradebookEntryPageProps> = ({
  currentUser,
  initialYearId,
  readOnly = false,
  onOpenGradebook,
}) => {
  const [rows, setRows] = useState<TeacherGradebookRow[]>([]);
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadRows = useCallback(async () => {
    if (!currentUser.schoolId) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: teacherData, error: teacherError } = await supabase
        .from('profiles')
        .select('id, school_id, username, title, full_name, role, is_active, created_at')
        .eq('school_id', currentUser.schoolId)
        .eq('is_active', true)
        .in('role', ['teacher', 'admin', 'super_admin'])
        .order('full_name');

      if (teacherError) throw teacherError;

      const teacherRows = (teacherData ?? []) as Profile[];
      const rowsWithAssignments = await Promise.all(
        teacherRows.map(async (teacher) => {
          const assignments = await fetchTeacherAssignments(teacher.id);
          return {
            ...teacher,
            assignments: initialYearId
              ? assignments.filter((assignment) => assignment.academic_year_id === initialYearId)
              : assignments,
          };
        }),
      );

      setRows(rowsWithAssignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลสถานะงานของครูไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [currentUser.schoolId, initialYearId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return rows;

    return rows.filter((row) => {
      const name = `${row.title ?? ''} ${row.full_name}`.toLowerCase();
      const username = row.username?.toLowerCase() ?? '';
      return name.includes(keyword) || username.includes(keyword);
    });
  }, [rows, searchTerm]);

  const totals = useMemo(() => {
    const assignments = filteredRows.flatMap((row) => row.assignments);
    return {
      teachers: filteredRows.length,
      assignments: assignments.length,
      gradebooks: assignments.filter((assignment) => assignment.gradebook_id).length,
      completed: assignments.filter((assignment) => assignment.gradebook_status === 'completed').length,
    };
  }, [filteredRows]);

  const handleOpenGradebook = async (assignment: TeacherAssignmentView) => {
    if (!assignment.gradebook_id) {
      setError('ยังไม่มีสมุด ปพ.5 สำหรับรายการนี้ ให้ครูเปิดสร้างจากหน้าครูก่อน');
      return;
    }

    setOpeningId(assignment.id);
    setError('');
    try {
      onOpenGradebook(assignment, assignment.gradebook_id, { readOnly });
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold text-blue-900">สถานะงานของครู</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">ดูหน้ากรอกเกรดของครู</h2>
          <p className="mt-2 text-sm text-slate-500">
            เลือกครูเพื่อดูรายการมอบหมายและเปิดสมุด ปพ.5 ที่ครูสร้างไว้แล้ว
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadRows()}
          className="inline-flex w-fit items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm hover:bg-blue-50"
        >
          รีเฟรชข้อมูล
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative w-full max-w-md">
            <span className="sr-only">ค้นหาครู</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="ค้นหาชื่อครู หรือ username"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 sm:flex sm:items-center sm:gap-4">
            <span>ครู {formatCount(totals.teachers)} คน</span>
            <span>งาน {formatCount(totals.assignments)} รายการ</span>
            <span>มีสมุด {formatCount(totals.gradebooks)} รายการ</span>
            <span>เสร็จแล้ว {formatCount(totals.completed)} รายการ</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            กำลังโหลดข้อมูล...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">ไม่พบครูตามคำค้นหา</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRows.map((teacher) => {
              const expanded = expandedTeacherId === teacher.id;
              const progress = averageProgress(teacher.assignments);
              const progressMeta = progressTone(progress);
              const completed = teacher.assignments.filter((assignment) => assignment.gradebook_status === 'completed').length;

              return (
                <div key={teacher.id} className="bg-white">
                  <button
                    type="button"
                    onClick={() => setExpandedTeacherId(expanded ? null : teacher.id)}
                    className="grid w-full gap-3 px-5 py-4 text-left transition hover:bg-blue-50/40 lg:grid-cols-[minmax(220px,1fr)_140px_180px_160px_32px] lg:items-center"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-bold text-slate-900">
                        {teacher.title ? `${teacher.title} ` : ''}{teacher.full_name}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono">{teacher.username ?? '-'}</span>
                        <span className="rounded-lg bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                          {ROLE_LABELS[teacher.role]}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-slate-600">
                      {formatCount(teacher.assignments.length)} งานสอน
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${progressMeta.barClassName}`}
                          style={{ width: `${progressMeta.displayWidth}%` }}
                        />
                      </div>
                      <span className={`w-20 text-right text-xs font-bold ${progressMeta.textClassName}`}>
                        {progressMeta.label}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500">
                      เสร็จแล้ว {formatCount(completed)} / {formatCount(teacher.assignments.length)}
                    </div>
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition ${expanded ? 'rotate-180' : ''}`} />
                  </button>

                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
                      {teacher.assignments.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
                          ไม่มีงานสอนในปีการศึกษานี้
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {teacher.assignments.map((assignment) => {
                            const assignmentProgressMeta = progressTone(assignment.completion_percent);
                            return (
                            <div
                              key={assignment.id}
                              className="grid gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:grid-cols-[minmax(260px,1fr)_130px_180px_120px] lg:items-center"
                            >
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-slate-900">
                                  {assignment.subject_code} {assignment.subject_name}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {assignment.classroom_name} · ภาคเรียนที่ {assignment.semester_number} · ปี {assignment.year_be}
                                </div>
                              </div>
                              <div className="text-sm font-semibold text-slate-600">
                                {gradebookStatusLabel(assignment.gradebook_status)}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className={`h-full rounded-full ${assignmentProgressMeta.barClassName}`}
                                    style={{
                                      width: `${assignmentProgressMeta.value}%`,
                                    }}
                                  />
                                </div>
                                <span className={`w-20 text-right text-xs font-bold ${assignmentProgressMeta.textClassName}`}>
                                  {assignmentProgressMeta.label}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => void handleOpenGradebook(assignment)}
                                disabled={!assignment.gradebook_id || openingId === assignment.id}
                                className="btn btn-primary"
                              >
                                {openingId === assignment.id ? (
                                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                                )}
                                เปิด ปพ.5
                              </button>
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
