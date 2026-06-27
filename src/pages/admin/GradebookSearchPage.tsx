import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpenCheck, ChevronRight, Download, Eye, Loader2, Search } from 'lucide-react';
import { FilterDropdown } from '../../components/FilterBar';
import { rowToAppData, type GradebookRow } from '../../lib/gradebookAdapter';
import { getStudentReportSummary } from '../../lib/gradebookStats';
import { supabase } from '../../lib/supabase';
import { SUBJECTS_CATALOG } from '../../data/subjectsCatalog';
import type { AppData, AppUser, Semester } from '../../types';

interface GradebookSearchPageProps {
  currentUser: AppUser;
  initialYearId?: string;
}

type GradebookStatus = 'not_started' | 'in_progress' | 'completed';

interface CompletedGradebook {
  id: string;
  teaching_assignment_id: string;
  status: GradebookStatus;
  students: unknown;
  stats: Record<string, unknown> | null;
  attendance?: unknown;
  scores?: unknown;
  score_config?: unknown;
  attributes?: unknown;
  analytical?: unknown;
  updated_at: string | null;
  created_at: string | null;
}

interface AssignmentReportRow {
  id: string;
  teacher_id: string;
  semester_id: string;
  hours_per_week: number | null;
  hours_per_semester: number | null;
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
    default_class_level: string | null;
    hours_total: number | null;
    hours_per_week: number | null;
  } | null;
  classrooms?: {
    id: string;
    name: string;
    class_level_code: string;
  } | null;
}

interface CompletedReport {
  assignmentId: string;
  gradebook: CompletedGradebook;
  teacherName: string;
  teacherUsername: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  studentNames: string;
  learningArea: string;
  classLevel: string;
  classroomName: string;
  semesterNumber: number | null;
  studentCount: number;
  completionPercent: number;
  completedAt: string | null;
  hoursTotal: number | null;
  isPrimaryLevel: boolean;
}

function normalizeStudents(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function profileName(profile: AssignmentReportRow['profiles']): string {
  if (!profile) return 'ไม่พบชื่อครู';
  return [profile.title, profile.full_name].filter(Boolean).join(' ');
}

function statNumber(stats: Record<string, unknown> | null | undefined, key: string): number {
  const value = Number(stats?.[key]);
  return Number.isFinite(value) ? value : 0;
}

function isSubjectSchemaMismatch(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String((err as { message?: unknown } | null)?.message ?? err ?? '');
  return (
    message.includes('schema cache')
    || message.includes('Could not find')
    || message.includes('column')
    || message.includes('PGRST204')
  );
}

function isCompletedGradebook(gradebook: Pick<CompletedGradebook, 'status' | 'stats'>): boolean {
  if (gradebook.status === 'completed') return true;
  return statNumber(gradebook.stats, 'completionPercent') >= 100;
}

const GRADEBOOK_LIST_SELECT = 'id, teaching_assignment_id, status, students, stats, updated_at, created_at';
const GRADEBOOK_DETAIL_SELECT = `${GRADEBOOK_LIST_SELECT}, attendance, scores, score_config, attributes, analytical, general_info`;

function parseHours(value: unknown): number | null {
  if (value == null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function catalogStudyHours(
  subjectCode: string,
  classLevel: string,
  semesterNumber: number | null,
): number | null {
  const code = subjectCode.trim();
  if (!code) return null;

  const matches = SUBJECTS_CATALOG.filter((item) => item.subject_code === code);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0].hours_total;

  const byLevelAndSemester = matches.find(
    (item) => item.default_class_level === classLevel && item.semester_number === semesterNumber,
  );
  if (byLevelAndSemester) return byLevelAndSemester.hours_total;

  const byLevel = matches.find((item) => item.default_class_level === classLevel);
  if (byLevel) return byLevel.hours_total;

  if (semesterNumber != null) {
    const bySemester = matches.find((item) => item.semester_number === semesterNumber);
    if (bySemester) return bySemester.hours_total;
  }

  return matches[0].hours_total;
}

function resolveStudyHours(row: AssignmentReportRow, semesterNumber: number | null, classLevel: string): number | null {
  const fromAssignment = parseHours(row.hours_per_semester);
  if (fromAssignment != null) return fromAssignment;

  const subject = row.subjects;
  const fromSubject = parseHours(subject?.hours_total);
  if (fromSubject != null) return fromSubject;

  return catalogStudyHours(subject?.subject_code ?? '', classLevel, semesterNumber);
}

function hoursFromGradebookGeneralInfo(gradebook: CompletedGradebook): number | null {
  const generalInfo = (gradebook as GradebookRow).general_info as Record<string, unknown> | undefined;
  const raw = generalInfo?.hoursPerSemester ?? generalInfo?.hours_per_semester ?? generalInfo?.totalHours;
  return parseHours(raw);
}

function effectiveStudyHours(report: CompletedReport): number | null {
  const fromReport = parseHours(report.hoursTotal);
  if (fromReport != null) return fromReport;

  const fromGradebook = hoursFromGradebookGeneralInfo(report.gradebook);
  if (fromGradebook != null) return fromGradebook;

  return catalogStudyHours(report.subjectCode, report.classLevel, report.semesterNumber);
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
    .sort((a, b) => a.localeCompare(b, 'th'));
}

function formatCompletedDate(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatStudentNames(students: unknown[]): string {
  return normalizeStudents(students)
    .map((student, index) => studentName(student, index).name)
    .filter(Boolean)
    .join(', ');
}

function studentSearchText(students: unknown[]): string {
  return normalizeStudents(students)
    .map((student, index) => {
      const row = studentName(student, index);
      return [row.name, row.code].join(' ');
    })
    .join(' ');
}

function matchingStudentNames(students: unknown[], query: string): string[] {
  const term = query.trim().toLowerCase();
  if (!term) return [];

  return normalizeStudents(students)
    .map((student, index) => studentName(student, index))
    .filter((row) => row.name.toLowerCase().includes(term) || row.code.toLowerCase().includes(term))
    .map((row) => row.name);
}

function studentName(student: unknown, index: number): { id: string; code: string; name: string } {
  const row = (student ?? {}) as Record<string, unknown>;
  const id = String(row.id ?? row.studentId ?? row.student_id ?? index);
  const code = String(
    row.studentCode ??
    row.student_code ??
    row.code ??
    row.studentId ??
    row.id ??
    index + 1,
  );
  const composedName = [
    row.title,
    row.firstName ?? row.first_name,
    row.lastName ?? row.last_name,
  ].filter(Boolean).join(' ');
  const name = String((row.fullName ?? row.full_name ?? row.name ?? composedName) || `นักเรียนคนที่ ${index + 1}`);
  return { id, code, name };
}

function studentCitizenId(student: unknown): string {
  const row = (student ?? {}) as Record<string, unknown>;
  const value = String(row.citizenId ?? row.citizen_id ?? '').trim();
  return value || '—';
}

function isPrimaryClassLevel(classLevel: string): boolean {
  return classLevel.trim().startsWith('ป.');
}

function formatStudyHoursLabel(hoursTotal: number | null, isPrimaryLevel: boolean): string {
  if (hoursTotal == null) return isPrimaryLevel ? '— ชม./ปี' : '— ชม./ภาค';
  return isPrimaryLevel
    ? `${hoursTotal.toLocaleString('th-TH')} ชม./ปี`
    : `${hoursTotal.toLocaleString('th-TH')} ชม./ภาค`;
}

function reportDetailMetaLine(report: CompletedReport): string {
  return [
    report.subjectCode,
    report.classroomName,
    `ภาคเรียนที่ ${report.semesterNumber ?? '-'}`,
    `ครูผู้สอน ${report.teacherName}`,
    formatStudyHoursLabel(effectiveStudyHours(report), report.isPrimaryLevel),
  ].join(' · ');
}

function gradebookAppData(gradebook: CompletedGradebook): Pick<AppData, 'scores' | 'scoreConfig' | 'attributes' | 'analytical' | 'attendance'> {
  const data = rowToAppData(gradebook as GradebookRow);
  return {
    scores: data.scores,
    scoreConfig: data.scoreConfig,
    attributes: data.attributes,
    analytical: data.analytical,
    attendance: data.attendance,
  };
}

function reportMetaLine(report: CompletedReport): string {
  return [
    `${report.classroomName} · ${report.classLevel}`,
    `ภาค ${report.semesterNumber ?? '-'}`,
    report.teacherName,
    report.learningArea,
    `${report.studentCount.toLocaleString('th-TH')} คน`,
    `ครบเมื่อ ${formatCompletedDate(report.completedAt)}`,
  ].join(' | ');
}

interface SearchFilterContext {
  searchTerm: string;
  classLevelFilter: string;
  learningAreaFilter: string;
  subjectFilter: string;
  subjectFilterLabel: string;
  semesterFilter: string;
}

const LEVEL_GROUPS: Array<{
  title: string;
  codes: string[];
}> = [
  {
    title: 'ประถมศึกษา',
    codes: ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'],
  },
  {
    title: 'มัธยมศึกษา',
    codes: ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'],
  },
];

function hasActiveSearchOrFilter(ctx: SearchFilterContext): boolean {
  return Boolean(
    ctx.searchTerm.trim()
    || ctx.classLevelFilter
    || ctx.learningAreaFilter
    || ctx.subjectFilter
    || ctx.semesterFilter,
  );
}

function ClassLevelBrowseMenu({
  selectedLevel,
  onSelectLevel,
}: {
  selectedLevel: string;
  onSelectLevel: (code: string) => void;
}) {
  return (
    <div className="space-y-5">
      {LEVEL_GROUPS.map((group) => (
        <section
          key={group.title}
          className="overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white to-slate-50/40 shadow-sm shadow-slate-200/60"
        >
          <div className="relative overflow-hidden border-b border-slate-200/60 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 px-5 py-2.5">
            <div
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{ background: 'radial-gradient(ellipse 80% 120% at 50% -20%, rgba(96,165,250,0.22), transparent)' }}
            />
            <h3 className="relative text-center text-[15px] font-extrabold tracking-wide text-white">
              {group.title}
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2 p-2.5 sm:grid-cols-6">
            {group.codes.map((code) => {
              const isActive = selectedLevel === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => onSelectLevel(code)}
                  className={`flex min-h-[44px] items-center justify-center rounded-xl border px-2 py-2 text-center transition-all duration-200 ${
                    isActive
                      ? 'border-blue-400 bg-white shadow-md shadow-blue-100/80 ring-2 ring-blue-200/70'
                      : 'border-slate-200/80 bg-white/90 hover:-translate-y-px hover:border-slate-300 hover:bg-white hover:shadow-md hover:shadow-slate-200/70'
                  }`}
                >
                  <span
                    className={`text-[28px] font-extrabold leading-none tracking-tight ${
                      isActive ? 'text-blue-700' : 'text-slate-800'
                    }`}
                  >
                    {code}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function buildActiveFilterHighlights(ctx: SearchFilterContext): string[] {
  const highlights: string[] = [];
  const keyword = ctx.searchTerm.trim();
  if (keyword) highlights.push(keyword);
  if (ctx.classLevelFilter) highlights.push(ctx.classLevelFilter);
  if (ctx.learningAreaFilter) highlights.push(ctx.learningAreaFilter);
  if (ctx.subjectFilter && ctx.subjectFilterLabel) highlights.push(ctx.subjectFilterLabel);
  if (ctx.semesterFilter) highlights.push(`ภาคเรียนที่ ${ctx.semesterFilter}`);
  return highlights;
}

function teacherMatchesSearch(report: CompletedReport, searchTerm: string): boolean {
  const keyword = searchTerm.trim().toLowerCase();
  if (!keyword) return false;
  return (
    report.teacherName.toLowerCase().includes(keyword)
    || report.teacherUsername.toLowerCase().includes(keyword)
  );
}

function CompletedReportCard({
  report,
  filterContext,
  onOpen,
}: {
  report: CompletedReport;
  filterContext: SearchFilterContext;
  onOpen: (report: CompletedReport) => void;
}) {
  const activeFilter = hasActiveSearchOrFilter(filterContext);
  const matchedStudentNames = matchingStudentNames(
    normalizeStudents(report.gradebook.students),
    filterContext.searchTerm,
  );
  const teacherHighlighted = teacherMatchesSearch(report, filterContext.searchTerm);
  const filterHighlights = buildActiveFilterHighlights(filterContext);

  return (
    <button
      type="button"
      onClick={() => onOpen(report)}
      className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/20"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-blue-50 ring-1 ring-blue-100">
        <img src="/logo1.png" alt="" className="h-8 w-8 object-contain" />
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
        <div className="flex min-w-0 shrink items-center gap-2">
          <h3 className="truncate text-sm font-extrabold text-slate-950 sm:text-base">
            {report.subjectCode} · {report.subjectName}
          </h3>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100">
            เสร็จสมบูรณ์
          </span>
        </div>

        <div className="ml-auto min-w-0 flex-1 text-right text-[11px] font-semibold leading-snug text-slate-500 sm:text-xs">
          {activeFilter ? (
            <span className="inline-flex max-w-full flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5">
              {filterHighlights.length > 0 ? (
                <span className="font-extrabold text-orange-600">
                  {filterHighlights.join(' · ')}
                </span>
              ) : null}
              {matchedStudentNames.length > 0 ? (
                <>
                  {filterHighlights.length > 0 ? <span className="text-slate-300">|</span> : null}
                  <span className="font-extrabold text-orange-600">
                    {matchedStudentNames.join(', ')}
                  </span>
                </>
              ) : null}
              {(filterHighlights.length > 0 || matchedStudentNames.length > 0) ? (
                <span className="text-slate-300">|</span>
              ) : null}
              <span className={teacherHighlighted ? 'font-extrabold text-orange-600' : 'text-slate-500'}>
                {report.teacherName}
              </span>
            </span>
          ) : (
            reportMetaLine(report)
          )}
        </div>
      </div>

      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
    </button>
  );
}

export const GradebookSearchPage: React.FC<GradebookSearchPageProps> = ({ currentUser, initialYearId }) => {
  const [yearLabel, setYearLabel] = useState('');
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [reports, setReports] = useState<CompletedReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<CompletedReport | null>(null);
  const [selectedStudentIndex, setSelectedStudentIndex] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classLevelFilter, setClassLevelFilter] = useState('');
  const [learningAreaFilter, setLearningAreaFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
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
        setReports([]);
        setSemesters([]);
        setYearLabel('');
        return;
      }

      setYearLabel(targetYearLabel);

      const { data: semesterRows, error: semesterError } = await supabase
        .from('semesters')
        .select('*')
        .eq('academic_year_id', targetYearId)
        .order('semester_number');

      if (semesterError) throw semesterError;
      const semesterList = (semesterRows ?? []) as Semester[];
      const semesterIds = semesterList.map((semester) => semester.id);

      if (semesterIds.length === 0) {
        setReports([]);
        setSemesters([]);
        setYearLabel(targetYearLabel);
        return;
      }

      const assignmentSelect = (subjectColumns: string, includeAssignmentHours = true) => {
        const assignmentFields = includeAssignmentHours
          ? `
          id,
          teacher_id,
          semester_id,
          hours_per_week,
          hours_per_semester,`
          : `
          id,
          teacher_id,
          semester_id,`;

        return supabase
          .from('teaching_assignments')
          .select(`
            ${assignmentFields}
            profiles:teacher_id(id, full_name, title, username),
            subjects:subject_id(${subjectColumns}),
            classrooms:classroom_id(id, name, class_level_code)
          `)
          .eq('school_id', currentUser.schoolId)
          .in('semester_id', semesterIds)
          .order('created_at', { ascending: false });
      };

      let { data, error: reportError } = await assignmentSelect(
        'id, subject_code, subject_name, learning_area, default_class_level, hours_per_week, hours_total',
      );

      if (reportError && isSubjectSchemaMismatch(reportError)) {
        const fallback = await assignmentSelect('id, subject_code, subject_name, learning_area, default_class_level', false);
        data = fallback.data;
        reportError = fallback.error;
      }

      if (reportError && isSubjectSchemaMismatch(reportError)) {
        const fallback = await assignmentSelect('id, subject_code, subject_name, learning_area, default_class_level');
        data = fallback.data;
        reportError = fallback.error;
      }

      if (reportError) throw reportError;

      const assignmentRows = ((data ?? []) as unknown as AssignmentReportRow[]);
      const assignmentIds = assignmentRows.map((row) => row.id);

      if (assignmentIds.length === 0) {
        setYearLabel(targetYearLabel);
        setSemesters(semesterList);
        setReports([]);
        setError('');
        return;
      }

      const { data: gradebookRows, error: gradebookError } = await supabase
        .from('gradebooks')
        .select(GRADEBOOK_LIST_SELECT)
        .in('teaching_assignment_id', assignmentIds)
        .order('created_at', { ascending: false });

      if (gradebookError) throw gradebookError;

      const completedGradebookByAssignmentId = new Map(
        ((gradebookRows ?? []) as CompletedGradebook[])
          .filter(isCompletedGradebook)
          .map((gradebook) => [gradebook.teaching_assignment_id, gradebook]),
      );

      const mapped = ((data ?? []) as unknown as AssignmentReportRow[])
        .map((row) => {
          const gradebook = completedGradebookByAssignmentId.get(row.id);
          if (!gradebook) return null;
          const students = normalizeStudents(gradebook.students);
          const semester = semesterList.find((item) => item.id === row.semester_id);
          const semesterNumber: number | null = semester?.semester_number ?? null;
          const classLevel = row.subjects?.default_class_level ?? row.classrooms?.class_level_code ?? 'ไม่ระบุระดับชั้น';
          return {
            assignmentId: row.id,
            gradebook,
            teacherName: profileName(row.profiles),
            teacherUsername: row.profiles?.username ?? '',
            subjectId: row.subjects?.id ?? '',
            subjectCode: row.subjects?.subject_code ?? '',
            subjectName: row.subjects?.subject_name ?? 'ไม่พบรายวิชา',
            studentNames: formatStudentNames(students),
            learningArea: row.subjects?.learning_area ?? 'ไม่ระบุกลุ่มสาระ',
            classLevel,
            classroomName: row.classrooms?.name ?? 'ไม่พบห้องเรียน',
            semesterNumber,
            studentCount: students.length,
            completionPercent: Math.min(100, statNumber(gradebook.stats, 'completionPercent')),
            completedAt: gradebook.updated_at ?? gradebook.created_at,
            hoursTotal: resolveStudyHours(row, semesterNumber, classLevel),
            isPrimaryLevel: isPrimaryClassLevel(classLevel),
          } satisfies CompletedReport;
        })
        .filter((row): row is CompletedReport => Boolean(row));

      setYearLabel(targetYearLabel);
      setSemesters(semesterList);
      setReports(mapped);
      setError('');
    } catch (err) {
      console.warn('Unable to load gradebook search data; showing an empty report list.', err);
      setReports([]);
      setError('โหลดรายการ ปพ.5 ไม่สำเร็จ กรุณารีเฟรชหน้าเว็บแล้วลองใหม่');
    } finally {
      setLoading(false);
    }
  }, [currentUser.schoolId, initialYearId]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const openReport = useCallback(async (report: CompletedReport) => {
    setSelectedStudentIndex(null);
    setSelectedReport(report);
    setDetailLoading(true);

    try {
      const { data, error } = await supabase
        .from('gradebooks')
        .select(GRADEBOOK_DETAIL_SELECT)
        .eq('id', report.gradebook.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const gradebook = data as CompletedGradebook;
        const enrichedReport: CompletedReport = {
          ...report,
          gradebook,
          hoursTotal: effectiveStudyHours({ ...report, gradebook }),
        };
        setSelectedReport(enrichedReport);
      }
    } catch (err) {
      console.warn('Unable to load gradebook detail; showing summary data only.', err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const classLevelOptions = useMemo(() => unique(reports.map((report) => report.classLevel)), [reports]);
  const learningAreaOptions = useMemo(() => unique(reports.map((report) => report.learningArea)), [reports]);
  const subjectOptions = useMemo(
    () => [...reports]
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'th'))
      .filter((report, index, rows) => rows.findIndex((item) => item.subjectId === report.subjectId) === index),
    [reports],
  );

  const subjectFilterLabel = useMemo(
    () => subjectOptions.find((subject) => subject.subjectId === subjectFilter)?.subjectName ?? '',
    [subjectFilter, subjectOptions],
  );

  const filterContext = useMemo<SearchFilterContext>(() => ({
    searchTerm,
    classLevelFilter,
    learningAreaFilter,
    subjectFilter,
    subjectFilterLabel,
    semesterFilter,
  }), [classLevelFilter, learningAreaFilter, searchTerm, semesterFilter, subjectFilter, subjectFilterLabel]);

  const filteredReports = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return reports.filter((report) => {
      const searchText = [
        report.subjectCode,
        report.subjectName,
        report.teacherName,
        report.teacherUsername,
        report.classroomName,
        report.learningArea,
        report.studentNames,
        studentSearchText(normalizeStudents(report.gradebook.students)),
      ].join(' ').toLowerCase();
      const matchesKeyword = !keyword || searchText.includes(keyword);
      const matchesLevel = !classLevelFilter || report.classLevel === classLevelFilter;
      const matchesArea = !learningAreaFilter || report.learningArea === learningAreaFilter;
      const matchesSubject = !subjectFilter || report.subjectId === subjectFilter;
      const matchesSemester = !semesterFilter || String(report.semesterNumber ?? '') === semesterFilter;
      return matchesKeyword && matchesLevel && matchesArea && matchesSubject && matchesSemester;
    });
  }, [classLevelFilter, learningAreaFilter, reports, searchTerm, semesterFilter, subjectFilter]);

  const showBrowseMenu = !hasActiveSearchOrFilter(filterContext);

  if (selectedReport) {
    const students = normalizeStudents(selectedReport.gradebook.students);
    const appData = gradebookAppData(selectedReport.gradebook);

    if (selectedStudentIndex != null && students[selectedStudentIndex]) {
      const student = students[selectedStudentIndex];
      const row = studentName(student, selectedStudentIndex);
      const summary = getStudentReportSummary(row.id, appData);

      return (
        <div className="space-y-5">
          <button
            type="button"
            onClick={() => setSelectedStudentIndex(null)}
            className="btn btn-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับรายชื่อนักเรียน
          </button>

          <section className="ui-card overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">คะแนนรายบุคคล</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">{row.name}</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                รหัส {row.code} · {selectedReport.subjectName} · {selectedReport.classroomName}
              </p>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold text-slate-500">เวลาเรียน (ทั้งภาค)</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-950">
                  {summary.attendedHours > 0 ? summary.attendedHours.toLocaleString('th-TH') : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold text-slate-500">คะแนนรวม</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-950">
                  {summary.totalScore != null ? summary.totalScore.toLocaleString('th-TH') : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold text-slate-500">ระดับผลการเรียน</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-950">{summary.gradeLevel}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold text-slate-500">คุณลักษณะ / คิดวิเคราะห์</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {summary.attributeRating} · {summary.analyticalRating}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 px-5 py-8 text-center">
              <p className="text-sm font-medium text-slate-500">
                หน้ารายละเอียดคะแนนรายบุคคลจะพร้อมใช้งานในเร็วๆ นี้
              </p>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => {
            setSelectedReport(null);
            setSelectedStudentIndex(null);
          }}
          className="btn btn-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับผลการค้นหา
        </button>

        {detailLoading && (
          <div className="ui-card flex items-center justify-center py-6 text-sm text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            กำลังโหลดรายละเอียด ปพ.5...
          </div>
        )}

        <section className={`ui-card overflow-hidden${detailLoading ? ' opacity-60' : ''}`}>
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">รายละเอียด ปพ.5</p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
                  {selectedReport.subjectName}
                </h2>
              </div>
              <p className="shrink-0 text-right text-sm font-medium leading-relaxed text-slate-500 lg:max-w-[55%] lg:pt-6">
                {reportDetailMetaLine(selectedReport)}
              </p>
            </div>
          </div>

          <div className="px-5 py-5">
            <table className="w-full table-auto text-sm">
              <thead className="bg-[#0f172a] text-white">
                <tr>
                  <th className="px-3 py-3 text-center font-bold">ลำดับ</th>
                  <th className="px-3 py-3 text-center font-bold">รหัสนักเรียน</th>
                  <th className="px-3 py-3 text-center font-bold">เลขบัตร ปชช.</th>
                  <th className="px-3 py-3 text-center font-bold">ชื่อ-นามสกุล</th>
                  <th className="px-3 py-3 text-center font-bold">เวลาเรียน</th>
                  <th className="px-3 py-3 text-center font-bold">คะแนนรวม</th>
                  <th className="px-3 py-3 text-center font-bold">ระดับผลการเรียน</th>
                  <th className="px-3 py-3 text-center font-bold">คุณลักษณะ 1-8</th>
                  <th className="px-3 py-3 text-center font-bold">การคิดวิเคราะห์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                      ยังไม่มีข้อมูลรายชื่อนักเรียนใน ปพ.5 รายการนี้
                    </td>
                  </tr>
                ) : (
                  students.map((student, index) => {
                    const row = studentName(student, index);
                    const summary = getStudentReportSummary(row.id, appData);
                    return (
                      <tr
                        key={`${row.id}-${index}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedStudentIndex(index)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedStudentIndex(index);
                          }
                        }}
                        className="cursor-pointer transition hover:bg-blue-50/70 focus-visible:bg-blue-50/70 focus-visible:outline-none"
                      >
                        <td className="px-3 py-3 text-center font-semibold text-slate-500">{index + 1}</td>
                        <td className="px-3 py-3 text-center font-mono text-slate-700">{row.code}</td>
                        <td className="px-3 py-3 text-center font-mono text-slate-600">{studentCitizenId(student)}</td>
                        <td className="px-3 py-3 font-semibold text-slate-950">{row.name}</td>
                        <td className="px-3 py-3 text-center font-semibold text-slate-700">
                          {summary.attendedHours > 0 ? summary.attendedHours.toLocaleString('th-TH') : '—'}
                        </td>
                        <td className="px-3 py-3 text-center font-semibold text-slate-800">
                          {summary.totalScore != null ? summary.totalScore.toLocaleString('th-TH') : '—'}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-slate-800">{summary.gradeLevel}</td>
                        <td className="px-3 py-3 text-center font-semibold text-slate-700">{summary.attributeRating}</td>
                        <td className="px-3 py-3 text-center font-semibold text-slate-700">{summary.analyticalRating}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap justify-center gap-3 border-t border-slate-100 px-5 py-4">
            <button
              type="button"
              className="btn btn-grey-3d"
              onClick={() => {
                window.alert('ฟังก์ชันดูรายละเอียดเล่ม ปพ.5 จะพร้อมใช้งานในเร็วๆ นี้');
              }}
            >
              <Eye className="h-4 w-4" />
              ดูรายละเอียด
            </button>
            <button
              type="button"
              className="btn btn-grey-3d"
              onClick={() => {
                window.alert('ฟังก์ชันดาวน์โหลด PDF เล่ม ปพ.5 จะพร้อมใช้งานในเร็วๆ นี้');
              }}
            >
              <Download className="h-4 w-4" />
              ดาวน์โหลด PDF
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="mx-auto max-w-5xl text-center">
        <img src="/logo1.png" alt="ปพ.5" className="mx-auto h-24 w-24 object-contain" />
        <p className="mt-4 text-base font-medium text-slate-700">โรงเรียนกาฬสินธุ์ปัญญานุกูล จังหวัดกาฬสินธุ์</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
          ค้นหาบันทึกผลการพัฒนาคุณภาพผู้เรียน (ปพ.5)
        </h1>
        <p className="mt-8 text-2xl font-semibold text-slate-700">
          สวัสดี {currentUser.name}
        </p>

        <label className="mx-auto mt-5 flex max-w-4xl items-center rounded-xl border border-slate-300 bg-white px-5 py-4 shadow-sm focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
          <Search className="mr-3 h-5 w-5 shrink-0 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="ค้นหาด้วย รหัสวิชา ชื่อวิชา ชื่อครูผู้สอน ชื่อนักเรียน"
            className="w-full min-w-0 bg-transparent text-left text-base font-semibold leading-relaxed text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400"
          />
        </label>

        <div className="mx-auto mt-7 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterDropdown value={classLevelFilter} onChange={setClassLevelFilter}>
            <option value="">ระดับชั้น</option>
            {classLevelOptions.map((level) => <option key={level} value={level}>{level}</option>)}
          </FilterDropdown>
          <FilterDropdown value={learningAreaFilter} onChange={setLearningAreaFilter}>
            <option value="">กลุ่มสาระการเรียนรู้</option>
            {learningAreaOptions.map((area) => <option key={area} value={area}>{area}</option>)}
          </FilterDropdown>
          <FilterDropdown value={subjectFilter} onChange={setSubjectFilter}>
            <option value="">วิชา</option>
            {subjectOptions.map((subject) => (
              <option key={subject.subjectId} value={subject.subjectId}>{subject.subjectName}</option>
            ))}
          </FilterDropdown>
          <FilterDropdown value={semesterFilter} onChange={setSemesterFilter}>
            <option value="">ภาคเรียน</option>
            {semesters.map((semester) => (
              <option key={semester.id} value={String(semester.semester_number)}>
                ภาคเรียนที่ {semester.semester_number}
              </option>
            ))}
          </FilterDropdown>
        </div>
      </section>

      {error && (
        <div className="mx-auto max-w-5xl rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="mx-auto max-w-5xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <h2 className="text-lg font-extrabold text-slate-900">รายการ ปพ.5 ที่เสร็จสมบูรณ์แล้ว</h2>
            {!showBrowseMenu && classLevelFilter && !searchTerm.trim() ? (
              <button
                type="button"
                onClick={() => setClassLevelFilter('')}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                กลับเลือกระดับชั้น
              </button>
            ) : null}
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            ปีการศึกษา {yearLabel || '-'} · {filteredReports.length.toLocaleString('th-TH')} รายการ
          </span>
        </div>

        {loading ? (
          <div className="ui-card flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            กำลังโหลดรายการ ปพ.5...
          </div>
        ) : showBrowseMenu ? (
          <ClassLevelBrowseMenu
            selectedLevel={classLevelFilter}
            onSelectLevel={setClassLevelFilter}
          />
        ) : filteredReports.length === 0 ? (
          <div className="ui-card py-16 text-center text-slate-400">
            <BookOpenCheck className="mx-auto mb-3 h-10 w-10 opacity-40" />
            ไม่พบ ปพ.5 ที่เสร็จสมบูรณ์ตามเงื่อนไขที่เลือก
          </div>
        ) : (
          <div className="space-y-2">
            {filteredReports.map((report) => (
              <div key={report.gradebook.id}>
                <CompletedReportCard
                  report={report}
                  filterContext={filterContext}
                  onOpen={(report) => {
                    void openReport(report);
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
