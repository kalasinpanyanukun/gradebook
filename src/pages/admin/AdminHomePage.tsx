import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  AlertCircle,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Loader2,
  Plus,
  School,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatThaiDate, yearBeToDates } from '../../lib/academicYear';
import { progressTone } from '../../lib/progressTone';
import type { AcademicYear, AcademicYearWorkspaceStatus, AppUser, ClassLevel, ScoreConfig, Semester, Student } from '../../types';

type AdminHomeTargetTab =
  | 'main'
  | 'home'
  | 'assignments'
  | 'academic-years'
  | 'classrooms'
  | 'students';

export interface AdminTabNavigateOptions {
  classLevelCode?: string;
  semesterNumber?: number;
}

interface AdminHomePageProps {
  currentUser: AppUser;
  onOpenTab: (tab: AdminHomeTargetTab, yearId?: string, options?: AdminTabNavigateOptions) => void;
  onEnterWorkspace?: (yearId: string) => void;
  createYearRequestKey?: number;
  selectedYearId?: string;
  readOnly?: boolean;
  variant?: 'full' | 'entry';
}

interface WorkspaceAssignmentRow {
  id: string;
  status: 'pending' | 'active';
  teacher_id: string;
  classroom_id: string;
  subject_id: string;
}

interface WorkspaceGradebookRow {
  id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  teaching_assignment_id: string;
}

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

interface DashboardProgressItem {
  id: string;
  name: string;
  detail?: string;
  total: number;
  started: number;
  completed: number;
  avgCompletion: number;
  studentCount: number;
}

interface WorkspaceClassroomRow {
  id: string;
  class_level_code: string;
}

interface WorkspaceEnrollmentRow {
  id: string;
  class_level_code: string;
}

interface ClassLevelProgress {
  code: string;
  name: string;
  sequence: number;
  classroomCount: number;
  studentCount: number;
  teacherCount: number;
  assignmentCount: number;
  completedGradebookCount: number;
  progress: number;
}

interface EditableAcademicYear extends AcademicYear {
  workspace_status?: AcademicYearWorkspaceStatus | null;
}

interface YearWorkspace {
  year: EditableAcademicYear;
  status: AcademicYearWorkspaceStatus;
  semesters: Semester[];
  classroomCount: number;
  studentCount: number;
  assignmentCount: number;
  activeAssignmentCount: number;
  gradebookCount: number;
  completedGradebookCount: number;
  teacherCount: number;
  subjectCount: number;
  classLevelProgress: ClassLevelProgress[];
}

type YearModalState =
  | { mode: 'create'; yearBe: string }
  | { mode: 'edit'; row: YearWorkspace; yearBe: string };

interface SummaryTileProps {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
  tone: 'emerald' | 'sky' | 'amber' | 'slate';
  hideIcon?: boolean;
}

interface DashboardStatTileProps {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
}

interface TeacherStatusCardProps {
  title: string;
  count: number;
  tone: 'complete' | 'incomplete';
  onClick: () => void;
}

interface DashboardProgressTableProps {
  title: string;
  items: DashboardProgressItem[];
  emptyText: string;
}

const toneClass: Record<SummaryTileProps['tone'], string> = {
  emerald: 'text-emerald-600',
  sky: 'text-blue-700',
  amber: 'text-amber-600',
  slate: 'text-slate-700',
};

const ROWS_PER_PAGE = 100;
const percentFormatter = new Intl.NumberFormat('th-TH', {
  maximumFractionDigits: 1,
});

const statusOptions: Array<{
  value: AcademicYearWorkspaceStatus;
  label: string;
  className: string;
  dotClassName: string;
}> = [
  {
    value: 'not_started',
    label: 'ยังไม่เริ่มดำเนินการ',
    className: 'border-slate-200 bg-slate-50 text-slate-600',
    dotClassName: 'bg-slate-400',
  },
  {
    value: 'in_progress',
    label: 'อยู่ระหว่างดำเนินการ',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    dotClassName: 'bg-amber-500',
  },
  {
    value: 'completed',
    label: 'ดำเนินการเรียบร้อย',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dotClassName: 'bg-emerald-500',
  },
];

const reportLevelGroups: Array<{
  title: string;
  codes: string[];
}> = [
  {
    title: 'ประถมศึกษา',
    codes: ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'],
  },
  {
    title: 'มัธยมศึกษาตอนต้น',
    codes: ['ม.1', 'ม.2', 'ม.3'],
  },
  {
    title: 'มัธยมศึกษาตอนปลาย',
    codes: ['ม.4', 'ม.5', 'ม.6'],
  },
];

function formatCount(value: number): string {
  return value.toLocaleString('th-TH');
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatPercent(value: number): string {
  return percentFormatter.format(round1(value));
}

function statusMeta(status: AcademicYearWorkspaceStatus) {
  return statusOptions.find((item) => item.value === status) ?? statusOptions[1];
}

function normalizeStatus(value: unknown): AcademicYearWorkspaceStatus | null {
  return value === 'not_started' || value === 'in_progress' || value === 'completed'
    ? value
    : null;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message?: unknown }).message ?? '');
  }
  return String(err ?? '');
}

function isMissingWorkspaceStatusColumn(err: unknown): boolean {
  const message = getErrorMessage(err);
  return message.includes('workspace_status') && (
    message.includes('schema cache') ||
    message.includes('Could not find') ||
    message.includes('column')
  );
}

function workspaceStatusMigrationMessage(): string {
  return 'ฐานข้อมูลยังไม่มีคอลัมน์ workspace_status ในตาราง academic_years ให้รัน migration 0011_academic_year_workspace_status.sql ก่อน จึงจะบันทึกสถานะปีการศึกษาได้';
}

function inferStatus(assignmentCount: number, completedGradebookCount: number): AcademicYearWorkspaceStatus {
  if (assignmentCount > 0 && completedGradebookCount >= assignmentCount) return 'completed';
  if (assignmentCount > 0) return 'in_progress';
  return 'not_started';
}

function progressPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
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

function aggregateDashboardProgress(
  rows: DashboardAssignment[],
  keyFor: (row: DashboardAssignment) => string,
  nameFor: (row: DashboardAssignment) => string,
  detailFor?: (row: DashboardAssignment) => string | undefined,
): DashboardProgressItem[] {
  const grouped = new Map<string, DashboardProgressItem & { completionSum: number; studentSum: number }>();

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

function buildClassLevelProgress(
  classLevels: ClassLevel[],
  classrooms: WorkspaceClassroomRow[],
  enrollments: WorkspaceEnrollmentRow[],
  assignments: WorkspaceAssignmentRow[],
  gradebooks: WorkspaceGradebookRow[],
): ClassLevelProgress[] {
  const fallbackLevels = Array.from(new Set(classrooms.map((classroom) => classroom.class_level_code)))
    .map((code, index) => ({
      code,
      name: code,
      sequence: 1000 + index,
      stage: '',
    }));
  const levels = classLevels.length > 0 ? classLevels : fallbackLevels;

  return levels.map((level) => {
    const classroomIds = new Set(
      classrooms
        .filter((classroom) => classroom.class_level_code === level.code)
        .map((classroom) => classroom.id),
    );
    const levelAssignments = assignments.filter((assignment) => classroomIds.has(assignment.classroom_id));
    const assignmentIds = new Set(levelAssignments.map((assignment) => assignment.id));
    const levelGradebooks = gradebooks.filter((gradebook) => assignmentIds.has(gradebook.teaching_assignment_id));
    const completedGradebookCount = levelGradebooks.filter((gradebook) => gradebook.status === 'completed').length;
    const teacherIds = new Set(levelAssignments.map((assignment) => assignment.teacher_id));
    const studentCount = enrollments.filter((enrollment) => enrollment.class_level_code === level.code).length;

    return {
      code: level.code,
      name: level.name,
      sequence: level.sequence,
      classroomCount: classroomIds.size,
      studentCount,
      teacherCount: teacherIds.size,
      assignmentCount: levelAssignments.length,
      completedGradebookCount,
      progress: progressPercent(completedGradebookCount, levelAssignments.length),
    };
  }).sort((a, b) => a.sequence - b.sequence);
}

function semesterLabel(semesters: Semester[]): string {
  if (semesters.length === 0) return 'ยังไม่มีภาคเรียน';
  const active = semesters.find((semester) => semester.is_active);
  if (active) return `เปิดภาคเรียนที่ ${active.semester_number}`;
  return `มี ${semesters.length} ภาคเรียน`;
}

function OverviewDashboardTile({
  label,
  value,
  detail,
  children,
}: {
  label: string;
  value: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-[108px] rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center shadow-sm">
      <p className="text-sm font-extrabold tracking-tight text-slate-700">{label}</p>
      {children ?? (
        <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 tabular-nums">{value}</p>
      )}
      {detail ? <p className="mt-2 text-xs font-medium text-slate-500">{detail}</p> : null}
    </div>
  );
}

function SemesterOverviewTile({ semesters }: { semesters: Semester[] }) {
  const sorted = [...semesters].sort((a, b) => a.semester_number - b.semester_number);
  return (
    <div className="min-h-[108px] rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center shadow-sm">
      <p className="text-sm font-extrabold tracking-tight text-slate-700">ภาคเรียน</p>
      <div className="mt-3 space-y-2">
        {sorted.length === 0 ? (
          <p className="text-sm font-semibold text-slate-400">ยังไม่มีภาคเรียน</p>
        ) : (
          sorted.map((semester) => {
            const isCurrent = semester.is_active;
            return (
            <div
              key={semester.id}
              className={`rounded-lg px-2.5 py-1.5 ${
                isCurrent ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-slate-100 ring-1 ring-slate-200'
              }`}
            >
              <span className={`text-sm font-extrabold ${isCurrent ? 'text-emerald-800' : 'text-slate-500'}`}>
                ภาคเรียนที่ {semester.semester_number}
                {isCurrent ? (
                  <span className="ml-1.5 text-[11px] font-semibold text-emerald-600">ปัจจุบัน</span>
                ) : null}
              </span>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value, detail, tone, hideIcon = false }: SummaryTileProps) {
  return (
    <div className="min-w-0 py-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
        </div>
        {!hideIcon && (
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center ${toneClass[tone]}`}>
            <Icon className="h-7 w-7" />
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function DashboardStatTile({ icon: Icon, label, value, detail }: DashboardStatTileProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function TeacherStatusCard({ title, count, tone, onClick }: TeacherStatusCardProps) {
  const isComplete = tone === 'complete';
  const Icon = isComplete ? CheckCircle2 : AlertCircle;
  const toneClasses = isComplete
    ? 'border-emerald-100 bg-emerald-50/60 text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50'
    : 'border-amber-100 bg-amber-50/60 text-amber-700 hover:border-amber-200 hover:bg-amber-50';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-100 ${toneClasses}`}
      aria-label={`${title} ${formatCount(count)} คน เปิดหน้าสถานะงานของครู`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate text-sm font-bold text-slate-900">{title}</span>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700" />
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-4xl font-extrabold leading-none text-slate-900">{formatCount(count)}</span>
        <span className="text-sm font-bold text-slate-500">คน</span>
      </div>
    </button>
  );
}

function DashboardProgressTable({ title, items, emptyText }: DashboardProgressTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
          {formatCount(items.length)} รายการ
        </span>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-slate-400">{emptyText}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-bold">รายการ</th>
                <th className="px-3 py-3 text-center font-bold">งาน</th>
                <th className="px-3 py-3 text-center font-bold">เสร็จ</th>
                <th className="min-w-36 px-4 py-3 text-center font-bold">ความคืบหน้า</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.slice(0, 5).map((item) => {
                const progressMeta = progressTone(item.avgCompletion);
                return (
                <tr key={item.id} className="hover:bg-blue-50/30">
                  <td className="px-4 py-3">
                    <div className="max-w-44 truncate font-bold text-slate-800">{item.name}</div>
                    {item.detail && <div className="mt-0.5 max-w-44 truncate text-xs text-slate-500">{item.detail}</div>}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-slate-700">{formatCount(item.total)}</td>
                  <td className="px-3 py-3 text-center font-semibold text-slate-700">{formatCount(item.completed)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${progressMeta.barClassName}`}
                          style={{ width: `${progressMeta.displayWidth}%` }}
                        />
                      </div>
                      <span className={`w-20 text-right text-xs font-bold ${progressMeta.textClassName}`}>
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

interface WorkspaceTableProps {
  workspaces: YearWorkspace[];
  totalRows: number;
  filteredRows: number;
  searchTerm: string;
  page: number;
  totalPages: number;
  onOpenTab: (tab: AdminHomeTargetTab, yearId?: string) => void;
  onEnterWorkspace?: (yearId: string) => void;
  onSearchTermChange: (value: string) => void;
  onAddYear: () => void;
  onEditYear: (row: YearWorkspace) => void;
  onDeleteYear: (row: YearWorkspace) => void;
  onStatusChange: (row: YearWorkspace, status: AcademicYearWorkspaceStatus) => void;
  onPageChange: (page: number) => void;
  statusPersistenceAvailable: boolean;
  readOnly: boolean;
  variant: 'full' | 'entry';
}

function WorkspaceTable({
  workspaces,
  totalRows,
  filteredRows,
  searchTerm,
  page,
  totalPages,
  onOpenTab,
  onEnterWorkspace,
  onSearchTermChange,
  onAddYear,
  onEditYear,
  onDeleteYear,
  onStatusChange,
  onPageChange,
  statusPersistenceAvailable,
  readOnly,
  variant,
}: WorkspaceTableProps) {
  const isEntry = variant === 'entry';

  const openWorkspace = (row: YearWorkspace) => {
    if (isEntry) {
      onEnterWorkspace?.(row.year.id);
      return;
    }
    onOpenTab('home', row.year.id);
  };

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, row: YearWorkspace) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, select, input, a')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openWorkspace(row);
    }
  };

  return (
    <section className="ui-card overflow-hidden shadow-slate-300/50">
      {!isEntry && (
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative w-full max-w-md">
            <span className="sr-only">ค้นหาปีการศึกษา</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="ค้นหาปีการศึกษา"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>
          {!readOnly && (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onAddYear}
              className="btn btn-primary"
            >
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มปีการศึกษาใหม่
            </button>
          </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
            <tr>
              <th className="h-11 px-5 py-3 text-center align-middle font-semibold">ปีการศึกษา</th>
              <th className="h-11 px-5 py-3 text-center align-middle font-semibold">ช่วงเวลา</th>
              <th className="h-11 px-5 py-3 text-center align-middle font-semibold">ข้อมูล ปพ.5</th>
              <th className="h-11 px-5 py-3 text-center align-middle font-semibold">การดำเนินการ</th>
              <th className="h-11 px-5 py-3 text-center align-middle font-semibold">สถานะ</th>
              <th className="h-11 px-5 py-3 text-center align-middle font-semibold">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {workspaces.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">
                  ไม่พบปีการศึกษาตามคำค้นหา
                </td>
              </tr>
            ) : (
              workspaces.map((row) => {
                const createdProgress = progressPercent(row.gradebookCount, row.assignmentCount);
                const createdProgressMeta = progressTone(createdProgress);
                const completedProgress = progressPercent(row.completedGradebookCount, row.assignmentCount);
                const displayDates = yearBeToDates(row.year.year_be);
                const status = statusMeta(row.status);

                return (
                  <tr
                    key={row.year.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openWorkspace(row)}
                    onKeyDown={(event) => handleRowKeyDown(event, row)}
                    className="cursor-pointer transition-colors hover:bg-blue-50/45 focus:bg-blue-50/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-100"
                    aria-label={`เปิด workspace ปีการศึกษา ${row.year.year_be}`}
                  >
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openWorkspace(row);
                      }}
                      className="flex items-center gap-3 rounded-xl text-left outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">
                        {String(row.year.year_be).slice(-2)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900">ปีการศึกษา {row.year.year_be}</span>
                          {row.year.is_active && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                              ปีปัจจุบัน
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{semesterLabel(row.semesters)}</p>
                      </div>
                    </button>
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    <div>{formatThaiDate(displayDates.start_date)}</div>
                    <div className="text-xs text-slate-400">ถึง {formatThaiDate(displayDates.end_date)}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                        {formatCount(row.classroomCount)} ห้อง
                      </span>
                      <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {formatCount(row.studentCount)} คน
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-slate-700">
                      {formatCount(row.activeAssignmentCount)} / {formatCount(row.assignmentCount)} งานเปิดใช้งาน
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${createdProgressMeta.barClassName}`}
                          style={{ width: `${createdProgressMeta.value}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold ${createdProgressMeta.textClassName}`}>
                        {createdProgressMeta.label}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      เสร็จสมบูรณ์ {completedProgress}% · ครู {formatCount(row.teacherCount)} คน
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <label className="sr-only" htmlFor={`status-${row.year.id}`}>สถานะปีการศึกษา {row.year.year_be}</label>
                    <div className="relative inline-flex items-center">
                      <span
                        className={`pointer-events-none absolute left-3 top-1/2 z-10 h-2 w-2 -translate-y-1/2 rounded-full shadow-sm ${status.dotClassName}`}
                        aria-hidden="true"
                      />
                      <select
                        id={`status-${row.year.id}`}
                        value={row.status}
                        disabled={!statusPersistenceAvailable || readOnly}
                        title={
                          readOnly
                            ? 'ผู้บริหารดูข้อมูลได้อย่างเดียว'
                            : !statusPersistenceAvailable
                              ? workspaceStatusMigrationMessage()
                              : undefined
                        }
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => onStatusChange(row, event.target.value as AcademicYearWorkspaceStatus)}
                        className={`min-w-[178px] appearance-none rounded-full border py-2 pl-7 pr-4 text-center text-xs font-bold shadow-sm outline-none ring-1 ring-white/70 transition hover:shadow-md focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 ${status.className}`}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {readOnly ? (
                      <div className="text-right text-xs font-semibold text-slate-400">ดูได้อย่างเดียว</div>
                    ) : (
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEditYear(row);
                        }}
                        className="inline-flex items-center rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100"
                      >
                        <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteYear(row);
                        }}
                        className="inline-flex items-center rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        ลบ
                      </button>
                    </div>
                    )}
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div>
          แถวข้อมูลทั้งหมด {formatCount(totalRows)}
          {filteredRows !== totalRows && ` · ตรงกับคำค้นหา ${formatCount(filteredRows)}`}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ก่อนหน้า
          </button>
          <span className="font-semibold text-slate-600">
            หน้า {formatCount(page)} / {formatCount(totalPages)}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-slate-200 px-2.5 py-1 font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ถัดไป
          </button>
        </div>
      </div>
    </section>
  );
}

export const AdminHomePage: React.FC<AdminHomePageProps> = ({
  currentUser,
  onOpenTab,
  onEnterWorkspace,
  createYearRequestKey = 0,
  selectedYearId,
  readOnly = false,
  variant = 'full',
}) => {
  const [workspaces, setWorkspaces] = useState<YearWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [yearModal, setYearModal] = useState<YearModalState | null>(null);
  const [savingYear, setSavingYear] = useState(false);
  const [statusPersistenceAvailable, setStatusPersistenceAvailable] = useState(true);
  const [dashboardAssignments, setDashboardAssignments] = useState<DashboardAssignment[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const loadWorkspaces = useCallback(async () => {
    if (!currentUser.schoolId) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data: yearData, error: yearError } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', currentUser.schoolId)
        .order('year_be', { ascending: false });

      if (yearError) throw yearError;

      const { data: classLevelData, error: classLevelError } = await supabase
        .from('class_levels')
        .select('code, name, sequence, stage')
        .order('sequence');

      if (classLevelError) throw classLevelError;
      const classLevels = (classLevelData ?? []) as ClassLevel[];

      const { error: statusColumnError } = await supabase
        .from('academic_years')
        .select('workspace_status')
        .eq('school_id', currentUser.schoolId)
        .limit(1);

      setStatusPersistenceAvailable(!isMissingWorkspaceStatusColumn(statusColumnError));

      const rows = await Promise.all(
        (yearData ?? []).map(async (year) => {
          const { data: semesters, error: semesterError } = await supabase
            .from('semesters')
            .select('*')
            .eq('academic_year_id', year.id)
            .order('semester_number');

          if (semesterError) throw semesterError;

          const semesterIds = (semesters ?? []).map((semester) => semester.id);
          const [{ data: classroomData, error: classroomError }, { data: studentData, error: studentError }] =
            await Promise.all([
              supabase
                .from('classrooms')
                .select('id, class_level_code')
                .eq('academic_year_id', year.id),
              supabase
                .from('student_enrollments')
                .select('id, class_level_code')
                .eq('academic_year_id', year.id)
                .eq('status', 'active'),
            ]);

          if (classroomError) throw classroomError;
          if (studentError) throw studentError;
          const classrooms = (classroomData ?? []) as WorkspaceClassroomRow[];
          const enrollments = (studentData ?? []) as WorkspaceEnrollmentRow[];

          let assignments: WorkspaceAssignmentRow[] = [];
          let gradebooks: WorkspaceGradebookRow[] = [];

          if (semesterIds.length > 0) {
            const { data: assignmentData, error: assignmentError } = await supabase
              .from('teaching_assignments')
              .select('id, status, teacher_id, classroom_id, subject_id')
              .in('semester_id', semesterIds);

            if (assignmentError) throw assignmentError;
            assignments = (assignmentData ?? []) as WorkspaceAssignmentRow[];

            const { data: gradebookData, error: gradebookError } = await supabase
              .from('gradebooks')
              .select('id, status, teaching_assignment_id')
              .in('semester_id', semesterIds);

            if (gradebookError) throw gradebookError;
            gradebooks = (gradebookData ?? []) as WorkspaceGradebookRow[];
          }

          const inferredStatus = inferStatus(assignments.length, gradebooks.filter((gradebook) => gradebook.status === 'completed').length);
          const workspaceStatus = normalizeStatus((year as EditableAcademicYear).workspace_status) ?? inferredStatus;
          const classLevelProgress = buildClassLevelProgress(classLevels, classrooms, enrollments, assignments, gradebooks);

          return {
            year,
            status: workspaceStatus,
            semesters: semesters ?? [],
            classroomCount: classrooms.length,
            studentCount: enrollments.length,
            assignmentCount: assignments.length,
            activeAssignmentCount: assignments.filter((assignment) => assignment.status === 'active').length,
            gradebookCount: gradebooks.length,
            completedGradebookCount: gradebooks.filter((gradebook) => gradebook.status === 'completed').length,
            teacherCount: new Set(assignments.map((assignment) => assignment.teacher_id)).size,
            subjectCount: new Set(assignments.map((assignment) => assignment.subject_id)).size,
            classLevelProgress,
          };
        }),
      );

      setWorkspaces(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลหน้าหลักไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [currentUser.schoolId]);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const activeWorkspace = useMemo(
    () => {
      const selectedWorkspace = selectedYearId
        ? workspaces.find((row) => row.year.id === selectedYearId)
        : undefined;

      return selectedWorkspace ?? workspaces.find((row) => row.year.is_active) ?? workspaces[0];
    },
    [selectedYearId, workspaces],
  );

  const activeSemester = useMemo(
    () => activeWorkspace?.semesters.find((semester) => semester.is_active) ?? activeWorkspace?.semesters[0],
    [activeWorkspace],
  );

  const openReportSemesterNumbers = useMemo(
    () =>
      (activeWorkspace?.semesters ?? [])
        .filter((semester) => semester.grade_entry_enabled !== false)
        .map((semester) => semester.semester_number)
        .sort((a, b) => a - b),
    [activeWorkspace?.semesters],
  );

  const loadDashboardInsights = useCallback(async () => {
    if (variant === 'entry' || !currentUser.schoolId || !activeSemester) {
      setDashboardAssignments([]);
      setLoadingDashboard(false);
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
        .eq('semester_id', activeSemester.id)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      setDashboardAssignments((data ?? []) as unknown as DashboardAssignment[]);
    } catch (err) {
      setDashboardAssignments([]);
      setError(err instanceof Error ? err.message : 'โหลดข้อมูลแดชบอร์ดไม่สำเร็จ');
    } finally {
      setLoadingDashboard(false);
    }
  }, [activeSemester, currentUser.schoolId, variant]);

  useEffect(() => {
    void loadDashboardInsights();
  }, [loadDashboardInsights]);

  useEffect(() => {
    if (variant === 'entry' || !currentUser.schoolId) return undefined;

    const syncHomeData = () => {
      void loadWorkspaces();
      void loadDashboardInsights();
    };

    const channel = supabase
      .channel(`admin-home-sync-${currentUser.schoolId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'academic_years', filter: `school_id=eq.${currentUser.schoolId}` }, syncHomeData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classrooms', filter: `school_id=eq.${currentUser.schoolId}` }, syncHomeData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teaching_assignments', filter: `school_id=eq.${currentUser.schoolId}` }, syncHomeData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_enrollments' }, syncHomeData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gradebooks' }, syncHomeData)
      .subscribe();

    const timer = window.setInterval(syncHomeData, 30000);

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [currentUser.schoolId, loadDashboardInsights, loadWorkspaces, variant]);

  const summary = useMemo(() => {
    if (variant === 'full' && activeWorkspace) {
      return {
        totalYears: 1,
        totalStudents: activeWorkspace.studentCount,
        totalAssignments: activeWorkspace.assignmentCount,
        totalClassrooms: activeWorkspace.classroomCount,
        totalCompleted: activeWorkspace.completedGradebookCount,
        totalTeachers: activeWorkspace.teacherCount,
      };
    }

    const totalStudents = workspaces.reduce((sum, row) => sum + row.studentCount, 0);
    const totalAssignments = workspaces.reduce((sum, row) => sum + row.assignmentCount, 0);
    const totalClassrooms = workspaces.reduce((sum, row) => sum + row.classroomCount, 0);
    const totalCompleted = workspaces.reduce((sum, row) => sum + row.completedGradebookCount, 0);
    const totalTeachers = workspaces.reduce((sum, row) => sum + row.teacherCount, 0);

    return {
      totalYears: workspaces.length,
      totalStudents,
      totalAssignments,
      totalClassrooms,
      totalCompleted,
      totalTeachers,
    };
  }, [activeWorkspace, variant, workspaces]);

  const workspaceProgress = activeWorkspace
    ? progressPercent(activeWorkspace.completedGradebookCount, activeWorkspace.assignmentCount)
    : 0;
  const workspaceProgressMeta = progressTone(workspaceProgress);

  const dashboardOverview = useMemo(() => {
    const totalAssignments = dashboardAssignments.length;
    const activeAssignments = dashboardAssignments.filter((row) => row.status === 'active').length;
    const gradebookRows = dashboardAssignments.map((row) => normalizeGradebook(row.gradebooks)).filter(Boolean);
    const completed = dashboardAssignments.filter((row) => {
      const gradebook = normalizeGradebook(row.gradebooks);
      return gradebookCompletion(gradebook) >= 100 || gradebook?.status === 'completed';
    }).length;
    const completionSum = dashboardAssignments.reduce(
      (sum, row) => sum + gradebookCompletion(normalizeGradebook(row.gradebooks)),
      0,
    );
    const totalStudents = dashboardAssignments.reduce((sum, row) => {
      const gradebook = normalizeGradebook(row.gradebooks);
      return sum + normalizeStudents(gradebook?.students).length;
    }, 0);

    return {
      totalAssignments,
      activeAssignments,
      started: gradebookRows.length,
      completed,
      totalStudents,
      avgCompletion: totalAssignments > 0 ? round1(completionSum / totalAssignments) : 0,
    };
  }, [dashboardAssignments]);

  const dashboardByTeacher = useMemo(
    () => aggregateDashboardProgress(
      dashboardAssignments,
      (row) => row.teacher_id,
      teacherName,
      (row) => row.profiles?.username ? `username: ${row.profiles.username}` : undefined,
    ),
    [dashboardAssignments],
  );

  const dashboardByClassroom = useMemo(
    () => aggregateDashboardProgress(
      dashboardAssignments,
      (row) => row.classrooms?.id ?? `classroom-${row.id}`,
      (row) => row.classrooms?.name ?? 'ไม่พบห้องเรียน',
      (row) => row.classrooms?.class_level_code,
    ),
    [dashboardAssignments],
  );

  const dashboardBySubject = useMemo(
    () => aggregateDashboardProgress(
      dashboardAssignments,
      (row) => row.subjects?.id ?? `subject-${row.id}`,
      (row) => row.subjects?.subject_name ?? 'ไม่พบรายวิชา',
      (row) => {
        const subject = row.subjects;
        return subject ? `${subject.subject_code} · ${subject.learning_area}` : undefined;
      },
    ),
    [dashboardAssignments],
  );

  const completeTeachers = useMemo(
    () => dashboardByTeacher.filter((item) => item.total > 0 && item.completed === item.total),
    [dashboardByTeacher],
  );

  const incompleteTeachers = useMemo(
    () => dashboardByTeacher.filter((item) => item.completed < item.total),
    [dashboardByTeacher],
  );

  const filteredWorkspaces = useMemo(() => {
    const keyword = searchTerm.trim();
    if (!keyword) return workspaces;
    return workspaces.filter((row) => String(row.year.year_be).includes(keyword));
  }, [searchTerm, workspaces]);

  const totalPages = Math.max(1, Math.ceil(filteredWorkspaces.length / ROWS_PER_PAGE));
  const pagedWorkspaces = filteredWorkspaces.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);
  const yearSelectOptions = useMemo(() => {
    const currentYearBe = new Date().getFullYear() + 543;
    const selectedYearBe = yearModal ? parseInt(yearModal.yearBe, 10) : currentYearBe;
    const years = new Set<number>();

    for (let year = currentYearBe + 5; year >= currentYearBe - 20; year -= 1) {
      years.add(year);
    }

    workspaces.forEach((row) => years.add(row.year.year_be));
    if (Number.isFinite(selectedYearBe)) years.add(selectedYearBe);

    return Array.from(years).sort((a, b) => b - a);
  }, [workspaces, yearModal?.yearBe]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const openCreateYear = () => {
    if (readOnly) return;
    setYearModal({ mode: 'create', yearBe: String(new Date().getFullYear() + 543) });
    setError('');
  };

  useEffect(() => {
    if (variant !== 'entry' || createYearRequestKey === 0) return;
    openCreateYear();
  }, [createYearRequestKey, variant]);

  const openEditYear = (row: YearWorkspace) => {
    if (readOnly) return;
    setYearModal({ mode: 'edit', row, yearBe: String(row.year.year_be) });
    setError('');
  };

  const saveYear = async (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly) return;
    if (!currentUser.schoolId || !yearModal) return;

    const yearBe = parseInt(yearModal.yearBe, 10);
    if (!Number.isFinite(yearBe) || yearBe < 2500 || yearBe > 2700) {
      setError('กรุณาใส่ปีการศึกษา พ.ศ. ระหว่าง 2500-2700');
      return;
    }

    setSavingYear(true);
    setError('');
    const dates = yearBeToDates(yearBe);

    try {
      if (yearModal.mode === 'create') {
        const yearPayload = {
          school_id: currentUser.schoolId,
          year_be: yearBe,
          start_date: dates.start_date,
          end_date: dates.end_date,
          term_open_date: dates.term_open_date,
          is_active: false,
        };

        let createdYearResult = await supabase
          .from('academic_years')
          .insert({
            ...yearPayload,
            workspace_status: 'in_progress',
          })
          .select()
          .single();

        if (createdYearResult.error && isMissingWorkspaceStatusColumn(createdYearResult.error)) {
          setStatusPersistenceAvailable(false);
          createdYearResult = await supabase
            .from('academic_years')
            .insert(yearPayload)
            .select()
            .single();
        }

        const { data: createdYear, error: yearError } = createdYearResult;
        if (yearError) throw yearError;
        if (!createdYear) throw new Error('บันทึกปีการศึกษาไม่สำเร็จ');

        const { error: semError } = await supabase.from('semesters').insert([
          {
            academic_year_id: createdYear.id,
            semester_number: 1,
            start_date: dates.semester1_start,
            end_date: dates.semester1_end,
            is_active: false,
          },
          {
            academic_year_id: createdYear.id,
            semester_number: 2,
            start_date: dates.semester2_start,
            end_date: dates.semester2_end,
            is_active: false,
          },
        ]);

        if (semError) throw semError;
      } else {
        const yearId = yearModal.row.year.id;
        const { error: yearError } = await supabase
          .from('academic_years')
          .update({
            year_be: yearBe,
            start_date: dates.start_date,
            end_date: dates.end_date,
            term_open_date: dates.term_open_date,
          })
          .eq('id', yearId);

        if (yearError) throw yearError;

        const [semester1, semester2] = await Promise.all([
          supabase
            .from('semesters')
            .update({
              start_date: dates.semester1_start,
              end_date: dates.semester1_end,
            })
            .eq('academic_year_id', yearId)
            .eq('semester_number', 1),
          supabase
            .from('semesters')
            .update({
              start_date: dates.semester2_start,
              end_date: dates.semester2_end,
            })
            .eq('academic_year_id', yearId)
            .eq('semester_number', 2),
        ]);

        if (semester1.error) throw semester1.error;
        if (semester2.error) throw semester2.error;
      }

      setYearModal(null);
      await loadWorkspaces();
    } catch (err) {
      setError(isMissingWorkspaceStatusColumn(err) ? workspaceStatusMigrationMessage() : getErrorMessage(err) || 'บันทึกปีการศึกษาไม่สำเร็จ');
    } finally {
      setSavingYear(false);
    }
  };

  const deleteYear = async (row: YearWorkspace) => {
    if (readOnly) return;
    const confirmed = window.confirm(
      `ลบปีการศึกษา ${row.year.year_be}?\nข้อมูลภาคเรียน ห้องเรียน รายชื่อนักเรียน รายการมอบหมาย ปพ.5 และ ปพ.5 ที่ผูกกับปีนี้จะถูกลบตามโครงสร้างฐานข้อมูล`
    );
    if (!confirmed) return;

    setError('');
    const { error: deleteError } = await supabase
      .from('academic_years')
      .delete()
      .eq('id', row.year.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadWorkspaces();
  };

  const updateWorkspaceStatus = async (row: YearWorkspace, status: AcademicYearWorkspaceStatus) => {
    if (readOnly) return;
    if (!statusPersistenceAvailable) {
      setError(workspaceStatusMigrationMessage());
      return;
    }

    const previousStatus = row.status;
    setWorkspaces((items) =>
      items.map((item) => item.year.id === row.year.id ? { ...item, status } : item)
    );
    setError('');

    const { error: updateError } = await supabase
      .from('academic_years')
      .update({ workspace_status: status })
      .eq('id', row.year.id);

    if (updateError) {
      setWorkspaces((items) =>
        items.map((item) => item.year.id === row.year.id ? { ...item, status: previousStatus } : item)
      );
      if (isMissingWorkspaceStatusColumn(updateError)) {
        setStatusPersistenceAvailable(false);
        setError(workspaceStatusMigrationMessage());
        return;
      }
      setError(updateError.message);
    }
  };

  const yearModalDates = yearModal
    ? yearBeToDates(parseInt(yearModal.yearBe, 10) || new Date().getFullYear() + 543)
    : null;

  const yearModalElement = yearModal && yearModalDates && (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {yearModal.mode === 'create' ? 'เพิ่มปีการศึกษาใหม่' : 'แก้ไขปีการศึกษา'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              ระบบจะตั้งช่วงปีเป็น 16 พ.ค. ถึง 31 มี.ค. ของปีถัดไป
            </p>
          </div>
          <button
            type="button"
            onClick={() => setYearModal(null)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={saveYear} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              ปีการศึกษา (พ.ศ.)
            </label>
            <div className="relative">
              <select
                value={yearModal.yearBe}
                onChange={(event) => setYearModal((current) => current ? { ...current, yearBe: event.target.value } : current)}
                required
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              >
                {yearSelectOptions.map((year) => (
                  <option key={year} value={year}>
                    ปีการศึกษา {year}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-slate-900">
            <div className="font-semibold">ช่วงปีการศึกษา</div>
            <div className="mt-1 text-blue-900">
              {formatThaiDate(yearModalDates.start_date)} - {formatThaiDate(yearModalDates.end_date)}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setYearModal(null)}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={savingYear}
              className="btn btn-primary flex-1"
            >
              {savingYear ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (variant === 'entry') {
    return (
      <div className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {!statusPersistenceAvailable && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
            {workspaceStatusMigrationMessage()}
          </div>
        )}

        {loading ? (
          <div className="ui-card flex items-center justify-center py-20 text-slate-500">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            กำลังโหลดปีการศึกษา...
          </div>
        ) : workspaces.length === 0 ? (
          <section className="ui-card py-20 text-center">
            <CalendarDays className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="font-semibold text-slate-700">ยังไม่มีปีการศึกษา</p>
            <p className="mt-1 text-sm text-slate-400">เริ่มจากสร้างปีการศึกษาแรกก่อน แล้วระบบจะมี workspace ให้ใช้งาน</p>
            <button
              type="button"
              onClick={openCreateYear}
              className="btn btn-primary mt-5"
            >
              สร้างปีการศึกษา
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </section>
        ) : (
          <WorkspaceTable
            workspaces={pagedWorkspaces}
            totalRows={workspaces.length}
            filteredRows={filteredWorkspaces.length}
            searchTerm={searchTerm}
            page={page}
            totalPages={totalPages}
            onOpenTab={onOpenTab}
            onEnterWorkspace={onEnterWorkspace}
            onSearchTermChange={handleSearchChange}
            onAddYear={openCreateYear}
            onEditYear={openEditYear}
            onDeleteYear={deleteYear}
            onStatusChange={(row, status) => void updateWorkspaceStatus(row, status)}
            onPageChange={setPage}
            statusPersistenceAvailable={statusPersistenceAvailable}
            readOnly={readOnly}
            variant="entry"
          />
        )}
        {yearModalElement}
      </div>
    );
  }

  const reportRowFallback = (code: string): ClassLevelProgress => ({
    code,
    name: code,
    sequence: 999,
    classroomCount: 0,
    studentCount: 0,
    teacherCount: 0,
    assignmentCount: 0,
    completedGradebookCount: 0,
    progress: 0,
  });

  const renderClassLevelReportRow = (
    item: ClassLevelProgress,
    key = item.code,
    semesterNumber?: number,
  ) => {
    const empty = item.classroomCount === 0 && item.studentCount === 0 && item.assignmentCount === 0;
    const progressMeta = progressTone(item.progress);
    return (
      <button
        key={key}
        type="button"
        onClick={() => {
          if (empty || !activeWorkspace) return;
          onOpenTab('assignments', activeWorkspace.year.id, {
            classLevelCode: item.code,
            semesterNumber,
          });
        }}
        className={`group flex w-full items-center justify-between gap-4 px-6 py-3.5 text-left transition-colors hover:bg-slate-50/70 ${empty ? 'opacity-50' : ''}`}
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50/80 text-sm font-extrabold tracking-tight text-blue-700 ring-1 ring-blue-100/80">
            {item.code}
          </div>
          <div className="min-w-0">
            <h5 className="truncate text-[15px] font-semibold tracking-tight text-slate-900">{item.name}</h5>
          </div>
        </div>

        <div className="flex min-w-0 shrink-0 items-center gap-5">
          <p className="hidden w-24 items-baseline justify-end gap-1.5 text-right md:flex">
            <span className="text-lg font-semibold tracking-tight text-slate-900 tabular-nums">
              {formatCount(item.classroomCount)}
            </span>
            <span className="text-xs font-medium text-slate-400">ห้องเรียน</span>
          </p>
          <p className="hidden w-24 items-baseline justify-end gap-1.5 text-right sm:flex">
            <span className="text-lg font-semibold tracking-tight text-slate-900 tabular-nums">
              {formatCount(item.studentCount)}
            </span>
            <span className="text-xs font-medium text-slate-400">นักเรียน</span>
          </p>
          <p className="hidden w-28 items-baseline justify-end gap-1.5 text-right lg:flex">
            <span className="text-lg font-semibold tracking-tight text-slate-900 tabular-nums">
              {formatCount(item.teacherCount)}
            </span>
            <span className="text-xs font-medium text-slate-400">ครูผู้สอน</span>
          </p>
          <div className="w-40">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-500">กรอก ปพ.5</span>
              <span className={`text-xs font-extrabold ${progressMeta.textClassName}`}>{progressMeta.label}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all ${progressMeta.barClassName}`}
                style={{ width: `${progressMeta.displayWidth}%` }}
              />
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-400" />
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <section className="text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
          ภาพรวม ปพ.5
        </h2>
        {activeWorkspace ? (
          <p className="mt-2 text-base font-semibold text-slate-500">
            ปีการศึกษา {activeWorkspace.year.year_be}
          </p>
        ) : null}
      </section>

      <section className="ui-card p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <OverviewDashboardTile
            label="ปีการศึกษา"
            value={activeWorkspace ? String(activeWorkspace.year.year_be) : '—'}
            detail={activeWorkspace ? 'ปีการศึกษาที่ใช้งานอยู่' : 'ยังไม่ได้ตั้งปีปัจจุบัน'}
          />
          <SemesterOverviewTile semesters={activeWorkspace?.semesters ?? []} />
          <OverviewDashboardTile
            label="ห้องเรียนทั้งหมด"
            value={formatCount(summary.totalClassrooms)}
            detail="รวมทุก workspace ปีการศึกษา"
          />
          <OverviewDashboardTile
            label="รายชื่อนักเรียน"
            value={formatCount(summary.totalStudents)}
            detail="นับเฉพาะ enrollment ที่ใช้งานอยู่"
          />
          <OverviewDashboardTile
            label="ครูทั้งหมด"
            value={formatCount(summary.totalTeachers)}
            detail="นับจากครูที่ผูกกับรายการมอบหมายในปีนี้"
          />
          <OverviewDashboardTile
            label="จำนวนวิชาทั้งหมด"
            value={formatCount(activeWorkspace?.subjectCount ?? 0)}
            detail="นับจากรายวิชาที่มอบหมายในปีนี้"
          />
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {!statusPersistenceAvailable && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
          {workspaceStatusMigrationMessage()}
        </div>
      )}

      {loading ? (
        <div className="ui-card flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          กำลังโหลด workspace...
        </div>
      ) : workspaces.length === 0 ? (
        <section className="ui-card py-20 text-center">
          <CalendarDays className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="font-semibold text-slate-700">ยังไม่มีปีการศึกษา</p>
          <p className="mt-1 text-sm text-slate-400">เริ่มจากสร้างปีการศึกษาแรกก่อน แล้วระบบจะมี workspace ให้ใช้งาน</p>
          <button
            type="button"
            onClick={openCreateYear}
            className="btn btn-primary mt-5"
          >
            สร้างปีการศึกษา
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </section>
      ) : (
        <>
          <section className="space-y-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">รายงานผล ปพ.5</p>
                <h3 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
                  ภาพรวมรายงานผลตามระดับชั้น
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  ดูจำนวนห้องเรียน นักเรียน ครูผู้สอน และความคืบหน้าการกรอก ปพ.5 ในปีการศึกษานี้
                </p>
              </div>
              <div className="flex min-w-[360px] flex-col gap-2 lg:min-w-[520px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-sm font-extrabold text-slate-800">
                    ความคืบหน้าการกรอก ปพ.5 ทั้งหมด
                  </span>
                  <span className={`text-sm font-extrabold tabular-nums ${workspaceProgressMeta.textClassName}`}>
                    {workspaceProgressMeta.label}
                  </span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-slate-200 ring-1 ring-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${workspaceProgressMeta.barClassName}`}
                    style={{ width: `${workspaceProgressMeta.displayWidth}%` }}
                  />
                </div>
              </div>
            </div>

            {(activeWorkspace?.classLevelProgress.length ?? 0) === 0 ? (
              <div className="ui-card px-5 py-12 text-center text-sm text-slate-400">
                ยังไม่มีข้อมูลชั้นเรียนในปีการศึกษานี้
              </div>
            ) : (
              reportLevelGroups.map((group) => {
                const rows = group.codes.map((code) => (
                  activeWorkspace?.classLevelProgress.find((item) => item.code === code) ?? reportRowFallback(code)
                ));
                const isPrimaryGroup = group.title === 'ประถมศึกษา';
                const primaryEntryEnabled = activeWorkspace?.year.primary_grade_entry_enabled !== false;
                const showSemesterRows = !isPrimaryGroup;

                if (isPrimaryGroup && !primaryEntryEnabled) {
                  return (
                    <section key={group.title} className="ui-card overflow-hidden">
                      <div className="relative flex items-center justify-center bg-[#0f172a] px-6 py-3.5">
                        <div className="text-center">
                          <h4 className="text-xl font-extrabold tracking-tight text-white">{group.title}</h4>
                        </div>
                        <span className="ui-badge absolute right-6 top-1/2 -translate-y-1/2 bg-white/10 text-slate-200 ring-1 ring-white/15">
                          {group.codes.length} ระดับชั้น
                        </span>
                      </div>
                      <div className="px-6 py-8 text-center text-sm font-semibold text-slate-500">
                        ปิดการกรอก ปพ.5 ระดับประถมศึกษา — เปิดได้ที่เมนู การตั้งค่า
                      </div>
                    </section>
                  );
                }

                return (
                  <section key={group.title} className="ui-card overflow-hidden">
                    <div className="relative flex items-center justify-center bg-[#0f172a] px-6 py-3.5">
                      <div className="text-center">
                        <h4 className="text-xl font-extrabold tracking-tight text-white">{group.title}</h4>
                      </div>
                      <span className="ui-badge absolute right-6 top-1/2 -translate-y-1/2 bg-white/10 text-slate-200 ring-1 ring-white/15">
                        {group.codes.length} ระดับชั้น
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {showSemesterRows && openReportSemesterNumbers.length > 0
                        ? openReportSemesterNumbers.map((semester) => (
                            <React.Fragment key={semester}>
                              <div className="bg-emerald-50 px-6 py-2 text-center text-sm font-extrabold text-emerald-800 ring-1 ring-inset ring-emerald-100">
                                ภาคเรียนที่ {semester}
                              </div>
                              {rows.map((item) => renderClassLevelReportRow(item, `${item.code}-semester-${semester}`, semester))}
                            </React.Fragment>
                          ))
                        : showSemesterRows && openReportSemesterNumbers.length === 0 ? (
                          <div className="px-6 py-8 text-center text-sm font-semibold text-slate-500">
                            ยังไม่มีภาคเรียนที่เปิดการกรอก ปพ.5 — เปิดได้ที่เมนู การตั้งค่า
                          </div>
                        ) : rows.map((item) => renderClassLevelReportRow(item))}
                    </div>
                  </section>
                );
              })
            )}
          </section>
        </>
      )}
      {yearModalElement}
    </div>
  );
};
