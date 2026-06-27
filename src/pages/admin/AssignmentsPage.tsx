import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  CheckCircle2,
  Edit3,
  Eye,
  FileUp,
  FileText,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { AssignmentSummaryCards } from '../../components/AssignmentSummaryCards';
import { SearchableTeacherSelect } from '../../components/SearchableTeacherSelect';
import { FilterBar, FilterClearButton, FilterSearch, FilterSelect } from '../../components/FilterBar';
import { isSchemaCacheErrorFor } from '../../lib/dbErrors';
import {
  gradebookStatusClassName,
  gradebookStatusLabel,
  resolveGradebookStatus,
} from '../../lib/gradebookStatusDisplay';
import { progressTone } from '../../lib/progressTone';
import { supabase } from '../../lib/supabase';
import {
  parseAssignmentExcel,
  parseAssignmentWord,
  resolveAssignmentRows,
  validateReviewRow,
  type AssignmentReviewRow,
} from '../../lib/assignmentImport';
import { SUBJECTS_CATALOG } from '../../data/subjectsCatalog';
import type {
  AcademicYear,
  AppUser,
  AssignmentRow,
  AssignmentStatus,
  Classroom,
  Profile,
  Semester,
  Subject,
} from '../../types';

interface AssignmentsPageProps {
  currentUser: AppUser;
  initialYearId?: string;
  initialClassLevelCode?: string;
  initialSemesterNumber?: number;
  drilldownLabel?: string;
  onDrilldownBack?: () => void;
}

interface AddForm {
  teacher_id: string;
  subject_id: string;
  classroom_id: string;
  hours_per_week: string;
  hours_per_semester: string;
  status: AssignmentStatus;
}

type GradebookStatus = 'not_started' | 'in_progress' | 'completed';

const ENTRY_WINDOW_MIGRATION_HINT =
  'ฐานข้อมูลยังไม่มีคอลัมน์กำหนดช่วงเวลา กรุณารัน migration `supabase/migrations/0018_assignment_entry_window.sql` ใน Supabase SQL Editor แล้วลองใหม่';

interface AssignmentGradebook {
  id: string;
  status: GradebookStatus;
  stats: Record<string, unknown> | null;
}

interface AssignmentWithProgress extends AssignmentRow {
  gradebooks?: AssignmentGradebook[] | AssignmentGradebook | null;
  gradebook_status: GradebookStatus | null;
  completion_percent: number;
}

interface TeacherAssignmentSummary {
  teacherId: string;
  teacher?: AssignmentRow['teacher'];
  assignments: AssignmentWithProgress[];
  subjectCount: number;
  classroomNames: string[];
  classLevelNames: string[];
  completedCount: number;
  progress: number;
}

const emptyAddForm = (): AddForm => ({
  teacher_id: '',
  subject_id: '',
  classroom_id: '',
  hours_per_week: '',
  hours_per_semester: '',
  status: 'active',
});

function isSubjectSchemaMismatch(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String((err as { message?: unknown } | null)?.message ?? err ?? '');
  return (
    message.includes('schema cache') ||
    message.includes('Could not find') ||
    message.includes('column') ||
    message.includes('PGRST204')
  );
}

function normalizeGradebook(
  relation: AssignmentGradebook[] | AssignmentGradebook | null | undefined,
): AssignmentGradebook | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation ?? null;
}

function completionFromStats(stats: Record<string, unknown> | null | undefined): number {
  const raw = stats?.completionPercent;
  return typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 0;
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function averageProgress(assignments: AssignmentWithProgress[]): number {
  if (assignments.length === 0) return 0;
  const total = assignments.reduce((sum, assignment) => sum + assignment.completion_percent, 0);
  return Math.round(total / assignments.length);
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const message = String((err as { message?: unknown }).message ?? '');
    if (message) return message;
  }
  return fallback;
}

function isMissingEntryWindowColumn(err: unknown): boolean {
  return (
    isSchemaCacheErrorFor(err, 'entry_start_date') ||
    isSchemaCacheErrorFor(err, 'entry_end_date')
  );
}

function AssignmentProgressBar({
  progress,
  showSubLabel,
  completedCount,
  totalCount,
}: {
  progress: number;
  showSubLabel?: boolean;
  completedCount?: number;
  totalCount?: number;
}) {
  const meta = progressTone(progress);
  const percentLabel = meta.isCompleted ? '100%' : meta.label;

  return (
    <div className="w-full">
      <div className="grid w-full grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-2">
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${meta.barClassName}`}
            style={{ width: `${meta.displayWidth}%` }}
          />
        </div>
        <span className={`text-right text-xs font-extrabold tabular-nums ${meta.textClassName}`}>
          {percentLabel}
        </span>
      </div>
      {showSubLabel && (
        <p className="mt-1 text-center text-[11px] font-semibold text-slate-500">
          เสร็จแล้ว {completedCount ?? 0} / {totalCount ?? 0}
        </p>
      )}
    </div>
  );
}

function isMissingCoTeacherNameColumn(err: unknown): boolean {
  const message = getErrorMessage(err, '');
  return message.includes('co_teacher_name') && (
    message.includes('schema cache') ||
    message.includes('Could not find') ||
    message.includes('column')
  );
}

export const AssignmentsPage: React.FC<AssignmentsPageProps> = ({
  currentUser,
  initialYearId,
  initialClassLevelCode,
  initialSemesterNumber,
  drilldownLabel,
  onDrilldownBack,
}) => {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedYearId, setSelectedYearId] = useState(initialYearId ?? '');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(emptyAddForm());
  const [editingAssignment, setEditingAssignment] = useState<AssignmentRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [reviewRows, setReviewRows] = useState<AssignmentReviewRow[] | null>(null);
  const [showTeachTableUpload, setShowTeachTableUpload] = useState(false);
  const [reviewImportMeta, setReviewImportMeta] = useState<{
    fileName: string;
    rowCount: number;
    classrooms: string[];
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | AssignmentStatus>('all');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [classroomFilter, setClassroomFilter] = useState('all');
  const [classLevelCodeFilter] = useState(initialClassLevelCode ?? '');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<Set<string>>(new Set());
  const [selectedTeacherSummaryIds, setSelectedTeacherSummaryIds] = useState<Set<string>>(new Set());
  const [entryWindowSupported, setEntryWindowSupported] = useState(true);
  const [modalLevelFilter, setModalLevelFilter] = useState('');

  const probeEntryWindowSupport = useCallback(async () => {
    const { error: probeError } = await supabase
      .from('teaching_assignments')
      .select('entry_start_date, entry_end_date')
      .limit(1);

    if (probeError && isMissingEntryWindowColumn(probeError)) {
      setEntryWindowSupported(false);
      return;
    }
    setEntryWindowSupported(true);
  }, []);

  const loadYears = useCallback(async () => {
    if (!currentUser.schoolId) return;
    const { data } = await supabase
      .from('academic_years')
      .select('*')
      .eq('school_id', currentUser.schoolId)
      .order('year_be', { ascending: false });
    setYears(data ?? []);
    const preferred = initialYearId ? data?.find((y) => y.id === initialYearId) : undefined;
    const active = preferred ?? data?.find((y) => y.is_active) ?? data?.[0];
    if (active) {
      setSelectedYearId((prev) => {
        if (preferred && prev !== preferred.id) return preferred.id;
        return prev || active.id;
      });
    }
  }, [currentUser.schoolId, initialYearId]);

  const loadSemesters = useCallback(async () => {
    if (!selectedYearId) return;
    const { data } = await supabase
      .from('semesters')
      .select('*')
      .eq('academic_year_id', selectedYearId)
      .order('semester_number');
    setSemesters(data ?? []);
    const active = data?.find((s) => s.is_active) ?? data?.[0];
    if (active) setSelectedSemesterId((prev) => (prev && data?.some((s) => s.id === prev) ? prev : active.id));
  }, [selectedYearId]);

  const loadLookups = useCallback(async () => {
    if (!currentUser.schoolId || !selectedYearId) return;
    const [{ data: teacherData }, { data: subjectData }, { data: classroomData }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, school_id, username, title, full_name, role, is_active, created_at')
        .eq('school_id', currentUser.schoolId)
        .eq('is_active', true)
        .in('role', ['teacher', 'admin', 'super_admin', 'executive'])
        .order('full_name'),
      supabase
        .from('subjects')
        .select('*')
        .eq('school_id', currentUser.schoolId)
        .order('subject_code'),
      supabase
        .from('classrooms')
        .select('*')
        .eq('academic_year_id', selectedYearId)
        .order('class_level_code')
        .order('room_number'),
    ]);
    setTeachers(teacherData ?? []);
    setSubjects(subjectData ?? []);
    setClassrooms(classroomData ?? []);
  }, [currentUser.schoolId, selectedYearId]);

  const loadAssignments = useCallback(async () => {
    if (!selectedSemesterId || !currentUser.schoolId) return;
    setLoading(true);
    setError('');
    try {
      const queryAssignments = (subjectColumns: string) =>
        supabase
          .from('teaching_assignments')
          .select(`
            *,
            profiles:teacher_id(id, full_name, title, username),
            subjects:subject_id(${subjectColumns}),
            classrooms:classroom_id(id, name, class_level_code),
            gradebooks(id, status, stats)
          `)
          .eq('school_id', currentUser.schoolId)
          .eq('semester_id', selectedSemesterId)
          .order('created_at', { ascending: false });

      let { data, error: queryError } = await queryAssignments(
        'id, subject_code, subject_name, learning_area, default_class_level, hours_per_week, hours_total, semester_number',
      );

      if (queryError && isSubjectSchemaMismatch(queryError)) {
        const fallback = await queryAssignments('id, subject_code, subject_name, learning_area, default_class_level');
        data = fallback.data;
        queryError = fallback.error;
      }

      if (queryError) throw queryError;

      const rows = (data ?? []) as unknown as Array<AssignmentRow & {
        profiles?: AssignmentRow['teacher'];
        subjects?: AssignmentRow['subject'];
        classrooms?: AssignmentRow['classroom'];
        gradebooks?: AssignmentGradebook[] | AssignmentGradebook | null;
      }>;

      const mapped: AssignmentWithProgress[] = rows.map((r) => {
        const gradebook = normalizeGradebook(r.gradebooks);
        return {
          ...r,
          teacher: r.profiles,
          subject: r.subjects,
          classroom: r.classrooms,
          gradebooks: r.gradebooks,
          gradebook_status: gradebook?.status ?? null,
          completion_percent: completionFromStats(gradebook?.stats),
        };
      });
      setAssignments(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดรายการมอบหมายไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [selectedSemesterId, currentUser.schoolId]);

  useEffect(() => { void loadYears(); }, [loadYears]);
  useEffect(() => { void loadSemesters(); }, [loadSemesters]);
  useEffect(() => { void loadLookups(); }, [loadLookups]);
  useEffect(() => { void loadAssignments(); }, [loadAssignments]);

  useEffect(() => {
    if (!showTeachTableUpload && !reviewRows) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showTeachTableUpload, reviewRows]);
  useEffect(() => { void probeEntryWindowSupport(); }, [probeEntryWindowSupport]);
  useEffect(() => {
    if (!initialSemesterNumber || semesters.length === 0) return;
    const target = semesters.find((semester) => semester.semester_number === initialSemesterNumber);
    if (target) setSelectedSemesterId(target.id);
  }, [initialSemesterNumber, semesters]);
  useEffect(() => { setSelectedAssignmentIds(new Set()); }, [selectedTeacherId, selectedSemesterId]);
  useEffect(() => { setSelectedTeacherSummaryIds(new Set()); }, [selectedSemesterId, statusFilter, teacherSearch, subjectFilter, classroomFilter]);

  const pendingCount = assignments.filter((a) => a.status === 'pending').length;

  const filtered = assignments.filter((assignment) => {
    const teacherQuery = teacherSearch.trim().toLowerCase();
    if (statusFilter !== 'all' && assignment.status !== statusFilter) return false;
    if (teacherQuery) {
      const teacherName = assignment.teacher?.full_name?.toLowerCase() ?? '';
      if (!teacherName.includes(teacherQuery)) return false;
    }
    if (subjectFilter !== 'all' && assignment.subject_id !== subjectFilter) return false;
    if (classLevelCodeFilter && assignment.classroom?.class_level_code !== classLevelCodeFilter) return false;
    if (classroomFilter !== 'all' && assignment.classroom_id !== classroomFilter) return false;
    return true;
  });

  const teacherSummaryMap = filtered.reduce<Map<string, TeacherAssignmentSummary>>((map, assignment) => {
      const existing = map.get(assignment.teacher_id) ?? {
        teacherId: assignment.teacher_id,
        teacher: assignment.teacher,
        assignments: [],
        subjectCount: 0,
        classroomNames: [],
        classLevelNames: [],
        completedCount: 0,
        progress: 0,
      };
      existing.assignments.push(assignment);
      existing.teacher = existing.teacher ?? assignment.teacher;
      map.set(assignment.teacher_id, existing);
      return map;
    }, new Map<string, TeacherAssignmentSummary>());

  const teacherSummaryRows = Array.from(teacherSummaryMap.values()) as TeacherAssignmentSummary[];

  const teacherSummaries: TeacherAssignmentSummary[] = teacherSummaryRows.map((summary) => {
    const subjectIds = unique(summary.assignments.map((assignment) => assignment.subject_id));
    const classroomNames = unique(summary.assignments.map((assignment) => assignment.classroom?.name));
    const classLevelNames = unique(summary.assignments.map((assignment) => assignment.classroom?.class_level_code));
    const completedCount = summary.assignments.filter(
      (assignment) => assignment.gradebook_status === 'completed' || assignment.completion_percent >= 100,
    ).length;
    return {
      ...summary,
      subjectCount: subjectIds.length,
      classroomNames,
      classLevelNames,
      completedCount,
      progress: averageProgress(summary.assignments),
    };
  }).sort((a, b) => (a.teacher?.full_name ?? '').localeCompare(b.teacher?.full_name ?? '', 'th'));
  const selectedTeacherSummaryCount = selectedTeacherSummaryIds.size;
  const allTeacherSummariesChecked =
    teacherSummaries.length > 0 &&
    teacherSummaries.every((summary) => selectedTeacherSummaryIds.has(summary.teacherId));
  const selectedTeacherSummaryAssignmentIds = teacherSummaries
    .filter((summary) => selectedTeacherSummaryIds.has(summary.teacherId))
    .flatMap((summary) => summary.assignments.map((assignment) => assignment.id));
  const allTeacherSummaryAssignmentIds = teacherSummaries
    .flatMap((summary) => summary.assignments.map((assignment) => assignment.id));

  const selectedSummary = selectedTeacherId
    ? teacherSummaries.find((summary) => summary.teacherId === selectedTeacherId)
    : null;
  const selectedTeacher = selectedSummary?.teacher ?? teachers.find((teacher) => teacher.id === selectedTeacherId);
  const selectedAssignments = selectedSummary?.assignments ?? [];
  const selectedAssignmentIdsInView = selectedAssignments
    .filter((assignment) => selectedAssignmentIds.has(assignment.id))
    .map((assignment) => assignment.id);
  const selectedAssignmentCount = selectedAssignmentIdsInView.length;
  const allSelectedAssignmentsChecked =
    selectedAssignments.length > 0 &&
    selectedAssignments.every((assignment) => selectedAssignmentIds.has(assignment.id));
  const selectedSemester = semesters.find((semester) => semester.id === selectedSemesterId);
  const defaultSemesterId = semesters.find((semester) => semester.is_active)?.id ?? semesters[0]?.id ?? '';

  const hasActiveAssignmentFilters = Boolean(
    statusFilter !== 'all'
    || teacherSearch.trim()
    || subjectFilter !== 'all'
    || classroomFilter !== 'all'
    || (defaultSemesterId && selectedSemesterId !== defaultSemesterId),
  );

  const clearAssignmentFilters = () => {
    setStatusFilter('all');
    setTeacherSearch('');
    setSubjectFilter('all');
    setClassroomFilter('all');
    if (defaultSemesterId) setSelectedSemesterId(defaultSemesterId);
  };

  const classroomTeacherIds = (classroom: Classroom) => [
    classroom.homeroom_teacher_id,
    classroom.homeroom_teacher_2_id,
    classroom.homeroom_teacher_3_id,
  ].filter((teacherId): teacherId is string => Boolean(teacherId));

  const teacherHomeroomLevelCodes = (teacherId: string) => unique(
    classrooms
      .filter((classroom) => classroomTeacherIds(classroom).includes(teacherId))
      .map((classroom) => classroom.class_level_code),
  ).sort((a, b) => a.localeCompare(b, 'th'));

  const teacherIdsForClassLevel = (level: string) => new Set([
    ...classrooms
      .filter((classroom) => classroom.class_level_code === level)
      .flatMap((classroom) => classroomTeacherIds(classroom)),
    ...assignments
      .filter((assignment) => assignment.classroom?.class_level_code === level)
      .map((assignment) => assignment.teacher_id),
  ]);

  const selectedTeacherLevelOptions = addForm.teacher_id ? teacherHomeroomLevelCodes(addForm.teacher_id) : [];
  const selectedTeacherLevelSet = new Set(selectedTeacherLevelOptions);
  const allModalClassLevelOptions = unique([
    ...classrooms.map((classroom) => classroom.class_level_code),
    ...subjects.map((subject) => subject.default_class_level),
  ]).sort((a, b) => a.localeCompare(b, 'th'));
  const modalClassLevelOptions = selectedTeacherLevelSet.size > 0
    ? allModalClassLevelOptions.filter((level) => selectedTeacherLevelSet.has(level))
    : allModalClassLevelOptions;
  const effectiveModalLevelFilter = modalLevelFilter || (selectedTeacherLevelOptions.length === 1 ? selectedTeacherLevelOptions[0] : '');
  const modalClassrooms = classrooms.filter((classroom) => {
    const levelMatch = !effectiveModalLevelFilter || classroom.class_level_code === effectiveModalLevelFilter;
    const teacherMatch = selectedTeacherLevelSet.size === 0 || selectedTeacherLevelSet.has(classroom.class_level_code);
    return levelMatch && teacherMatch;
  });
  const modalSubjects = subjects.filter((subject) => {
    const levelMatch = !effectiveModalLevelFilter || !subject.default_class_level || subject.default_class_level === effectiveModalLevelFilter;
    const semesterMatch = !selectedSemester?.semester_number || subject.semester_number == null || subject.semester_number === selectedSemester.semester_number;
    return levelMatch && semesterMatch;
  });
  const modalTeacherIdsForLevel = effectiveModalLevelFilter
    ? teacherIdsForClassLevel(effectiveModalLevelFilter)
    : null;
  const modalTeachers = modalTeacherIdsForLevel && modalTeacherIdsForLevel.size > 0
    ? teachers.filter((teacher) => modalTeacherIdsForLevel.has(teacher.id) || teacher.id === addForm.teacher_id)
    : teachers;

  const subjectHours = (subject: Subject | undefined) => {
    if (!subject) return { hoursPerWeek: '', hoursPerSemester: '' };
    const catalog = SUBJECTS_CATALOG.find((item) => item.subject_code === subject.subject_code);
    const hoursPerWeek = subject.hours_per_week ?? catalog?.hours_per_week ?? null;
    const hoursPerSemester = subject.hours_total ?? catalog?.hours_total ?? null;
    return {
      hoursPerWeek: hoursPerWeek == null ? '' : String(hoursPerWeek),
      hoursPerSemester: hoursPerSemester == null ? '' : String(hoursPerSemester),
    };
  };

  const setSubjectAndHours = (subjectId: string) => {
    const subject = subjects.find((item) => item.id === subjectId);
    const hours = subjectHours(subject);
    setAddForm((current) => ({
      ...current,
      subject_id: subjectId,
      hours_per_week: hours.hoursPerWeek,
      hours_per_semester: hours.hoursPerSemester,
    }));
  };

  const openAddModal = (teacherId?: string) => {
    const presetTeacherId = teacherId ?? selectedTeacherId ?? '';
    const presetLevels = presetTeacherId ? teacherHomeroomLevelCodes(presetTeacherId) : [];
    setEditingAssignment(null);
    setModalLevelFilter(presetLevels.length === 1 ? presetLevels[0] : '');
    setAddForm({
      ...emptyAddForm(),
      teacher_id: presetTeacherId,
    });
    setShowAddModal(true);
  };

  const openEditModal = (assignment: AssignmentRow) => {
    setEditingAssignment(assignment);
    const classroomLevel = assignment.classroom?.class_level_code ?? classrooms.find((item) => item.id === assignment.classroom_id)?.class_level_code ?? '';
    setModalLevelFilter(classroomLevel);
    setAddForm({
      teacher_id: assignment.teacher_id,
      subject_id: assignment.subject_id,
      classroom_id: assignment.classroom_id,
      hours_per_week: assignment.hours_per_week == null ? '' : String(assignment.hours_per_week),
      hours_per_semester: assignment.hours_per_semester == null ? '' : String(assignment.hours_per_semester),
      status: assignment.status,
    });
    setShowAddModal(true);
  };

  const closeAssignmentModal = () => {
    setShowAddModal(false);
    setEditingAssignment(null);
    setAddForm(emptyAddForm());
    setModalLevelFilter('');
  };

  const handleModalLevelChange = (level: string) => {
    const teacherIds = level ? teacherIdsForClassLevel(level) : null;
    setModalLevelFilter(level);
    setAddForm((current) => ({
      ...current,
      teacher_id: current.teacher_id && (!teacherIds || teacherIds.size === 0 || teacherIds.has(current.teacher_id)) ? current.teacher_id : '',
      subject_id: '',
      classroom_id: '',
      hours_per_week: '',
      hours_per_semester: '',
    }));
  };

  const handleModalTeacherChange = (teacherId: string) => {
    const teacherLevels = teacherId ? teacherHomeroomLevelCodes(teacherId) : [];
    setModalLevelFilter((currentLevel) => {
      if (!teacherId) return currentLevel;
      if (currentLevel && teacherLevels.length > 0 && !teacherLevels.includes(currentLevel)) {
        return teacherLevels.length === 1 ? teacherLevels[0] : '';
      }
      if (!currentLevel && teacherLevels.length === 1) return teacherLevels[0];
      return currentLevel;
    });
    setAddForm((current) => ({
      ...current,
      teacher_id: teacherId,
      subject_id: '',
      classroom_id: '',
      hours_per_week: '',
      hours_per_semester: '',
    }));
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.schoolId || !selectedSemesterId) return;

    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        school_id: currentUser.schoolId,
        semester_id: selectedSemesterId,
        teacher_id: addForm.teacher_id,
        subject_id: addForm.subject_id,
        classroom_id: addForm.classroom_id,
        hours_per_week: addForm.hours_per_week ? parseInt(addForm.hours_per_week, 10) : null,
        hours_per_semester: addForm.hours_per_semester ? parseInt(addForm.hours_per_semester, 10) : null,
        status: addForm.status,
        created_by: currentUser.id,
      };
      if (entryWindowSupported) {
        const semesterEntryStart = selectedSemester?.entry_start_date ?? null;
        const semesterEntryEnd = selectedSemester?.entry_end_date ?? null;
        payload.entry_start_date = semesterEntryStart;
        payload.entry_end_date = semesterEntryEnd;
      }

      const { error: saveError } = editingAssignment
        ? await supabase
            .from('teaching_assignments')
            .update({
              teacher_id: payload.teacher_id,
              subject_id: payload.subject_id,
              classroom_id: payload.classroom_id,
              hours_per_week: payload.hours_per_week,
              hours_per_semester: payload.hours_per_semester,
              ...(entryWindowSupported
                ? {
                    entry_start_date: payload.entry_start_date,
                    entry_end_date: payload.entry_end_date,
                  }
                : {}),
              status: payload.status,
            })
            .eq('id', editingAssignment.id)
        : await supabase.from('teaching_assignments').insert(payload);

      if (saveError) {
        if (isMissingEntryWindowColumn(saveError)) {
          setEntryWindowSupported(false);
          throw new Error(ENTRY_WINDOW_MIGRATION_HINT);
        }
        throw saveError;
      }
      closeAssignmentModal();
      setMessage(editingAssignment ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มรายการมอบหมายแล้ว');
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('ลบรายการมอบหมายครูกรอก ปพ.5 นี้?')) return;
    const { error: delError } = await supabase.from('teaching_assignments').delete().eq('id', id);
    if (delError) setError(delError.message);
    else {
      setSelectedAssignmentIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      await loadAssignments();
    }
  };

  const toggleAssignmentSelection = (id: string, checked: boolean) => {
    setSelectedAssignmentIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAllSelectedTeacherAssignments = (checked: boolean) => {
    setSelectedAssignmentIds(checked ? new Set(selectedAssignments.map((assignment) => assignment.id)) : new Set());
  };

  const toggleTeacherSummarySelection = (teacherId: string, checked: boolean) => {
    setSelectedTeacherSummaryIds((current) => {
      const next = new Set(current);
      if (checked) next.add(teacherId);
      else next.delete(teacherId);
      return next;
    });
  };

  const toggleAllTeacherSummaries = (checked: boolean) => {
    setSelectedTeacherSummaryIds(checked ? new Set(teacherSummaries.map((summary) => summary.teacherId)) : new Set());
  };

  const deleteAssignmentsByIds = async (ids: string[], confirmText: string) => {
    if (ids.length === 0) return;
    if (!window.confirm(confirmText)) return;
    setSaving(true);
    setError('');
    const { error: delError } = await supabase
      .from('teaching_assignments')
      .delete()
      .in('id', ids);
    if (delError) setError(delError.message);
    else {
      setSelectedAssignmentIds(new Set());
      setSelectedTeacherSummaryIds(new Set());
      await loadAssignments();
    }
    setSaving(false);
  };

  const deleteSelectedAssignments = async () => {
    await deleteAssignmentsByIds(
      selectedAssignmentIdsInView,
      `ลบรายการที่เลือก ${selectedAssignmentCount} รายการ?`,
    );
  };

  const deleteAllSelectedTeacherAssignments = async () => {
    await deleteAssignmentsByIds(
      selectedAssignments.map((assignment) => assignment.id),
      `ลบรายการมอบหมายทั้งหมดของครูคนนี้ ${selectedAssignments.length} รายการ?`,
    );
  };

  const deleteSelectedTeacherSummaries = async () => {
    await deleteAssignmentsByIds(
      selectedTeacherSummaryAssignmentIds,
      `ลบรายการมอบหมายของครูที่เลือก ${selectedTeacherSummaryCount} คน รวม ${selectedTeacherSummaryAssignmentIds.length} รายการ?`,
    );
  };

  const deleteAllTeacherSummaries = async () => {
    await deleteAssignmentsByIds(
      allTeacherSummaryAssignmentIds,
      `ลบรายการมอบหมายทั้งหมดในตารางนี้ ${allTeacherSummaryAssignmentIds.length} รายการ?`,
    );
  };

  const toggleAssignmentStatus = async (assignment: AssignmentRow) => {
    const nextStatus: AssignmentStatus = assignment.status === 'active' ? 'pending' : 'active';
    const { error: updateError } = await supabase
      .from('teaching_assignments')
      .update({ status: nextStatus })
      .eq('id', assignment.id);
    if (updateError) setError(updateError.message);
    else await loadAssignments();
  };

  const activateAllPending = async () => {
    const pending = assignments.filter((a) => a.status === 'pending');
    if (pending.length === 0) return;
    if (!window.confirm(`เปิดใช้งานรายการที่ปิดอยู่ ${pending.length} รายการ?`)) return;

    setSaving(true);
    setError('');
    const { error: updateError } = await supabase
      .from('teaching_assignments')
      .update({ status: 'active' })
      .in('id', pending.map((p) => p.id));
    if (updateError) setError(updateError.message);
    else {
      setMessage(`เปิดใช้งาน ${pending.length} รายการแล้ว`);
      await loadAssignments();
    }
    setSaving(false);
  };

  const assignAllFromExistingPatterns = async () => {
    if (!currentUser.schoolId || !selectedSemesterId) return;
    if (assignments.length === 0) {
      setMessage('');
      setError('ยังไม่มีรายการอ้างอิง ให้เพิ่มอย่างน้อย 1 รายการก่อน แล้วระบบจะใช้ครู/รายวิชา/ระดับชั้นนั้นสร้างรายการที่เหลือ');
      return;
    }

    if (!window.confirm('ให้ระบบสร้างรายการมอบหมายทั้งหมดจากรายการอ้างอิงที่มีอยู่ และข้ามรายการที่ซ้ำ ใช่หรือไม่?')) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const teacherByLevelSubject = new Map<string, string>();
      assignments.forEach((assignment) => {
        const level = assignment.classroom?.class_level_code ?? classrooms.find((item) => item.id === assignment.classroom_id)?.class_level_code;
        if (!level) return;
        const key = `${level}|${assignment.subject_id}`;
        if (!teacherByLevelSubject.has(key)) teacherByLevelSubject.set(key, assignment.teacher_id);
      });

      const existingKeys = new Set(
        assignments.map((assignment) => `${assignment.teacher_id}|${assignment.subject_id}|${assignment.classroom_id}`),
      );
      const semesterNumber = selectedSemester?.semester_number;
      const payload: Array<{
        school_id: string;
        semester_id: string;
        teacher_id: string;
        subject_id: string;
        classroom_id: string;
        hours_per_week: number | null;
        hours_per_semester: number | null;
        status: AssignmentStatus;
        created_by: string;
      }> = [];

      classrooms.forEach((classroom) => {
        subjects.forEach((subject) => {
          if (subject.default_class_level && subject.default_class_level !== classroom.class_level_code) return;
          if (semesterNumber && subject.semester_number != null && subject.semester_number !== semesterNumber) return;

          const teacherId = teacherByLevelSubject.get(`${classroom.class_level_code}|${subject.id}`);
          if (!teacherId) return;

          const duplicateKey = `${teacherId}|${subject.id}|${classroom.id}`;
          if (existingKeys.has(duplicateKey)) return;

          const hours = subjectHours(subject);
          payload.push({
            school_id: currentUser.schoolId as string,
            semester_id: selectedSemesterId,
            teacher_id: teacherId,
            subject_id: subject.id,
            classroom_id: classroom.id,
            hours_per_week: hours.hoursPerWeek ? parseInt(hours.hoursPerWeek, 10) : null,
            hours_per_semester: hours.hoursPerSemester ? parseInt(hours.hoursPerSemester, 10) : null,
            status: 'active',
            created_by: currentUser.id,
          });
          existingKeys.add(duplicateKey);
        });
      });

      if (payload.length === 0) {
        setMessage('ไม่มีรายการใหม่ที่ต้องสร้าง ระบบข้ามรายการที่มีอยู่แล้วทั้งหมด');
        return;
      }

      const { error: insertError } = await supabase.from('teaching_assignments').insert(payload);
      if (insertError) throw insertError;

      setMessage(`มอบหมายทั้งหมดเพิ่มใหม่ ${payload.length.toLocaleString('th-TH')} รายการแล้ว`);
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'มอบหมายทั้งหมดไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const applyReviewValidation = (rows: AssignmentReviewRow[]): AssignmentReviewRow[] => {
    const existingAssignmentKeys = new Set(
      assignments.map((assignment) => `${assignment.teacher_id}|${assignment.subject_id}|${assignment.classroom_id}`),
    );
    const seenAssignmentKeys = new Set<string>();

    return rows.map((row) => {
      const base = validateReviewRow(row);
      const issues = new Set(base.issues);

      if (base.teacherId && base.subjectId && base.classroomId) {
        const key = `${base.teacherId}|${base.subjectId}|${base.classroomId}`;
        if (existingAssignmentKeys.has(key)) {
          issues.add('มีรายการมอบหมายนี้แล้ว');
        }
        if (seenAssignmentKeys.has(key)) {
          issues.add('ซ้ำในไฟล์');
        }
        seenAssignmentKeys.add(key);
      }

      return { ...base, issues: Array.from(issues) };
    });
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImporting(true);
    setError('');
    setMessage('');
    try {
      const rows = await parseAssignmentExcel(file);
      if (rows.length === 0) {
        setError('ไม่พบข้อมูลในไฟล์');
        return;
      }
      const resolved = applyReviewValidation(resolveAssignmentRows(rows, teachers, subjects, classrooms));
      setReviewRows(resolved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อ่านไฟล์ไม่สำเร็จ');
    } finally {
      setImporting(false);
    }
  };

  const processTeachTableFile = async (file: File) => {
    setImporting(true);
    setError('');
    setMessage('');
    try {
      const rows = await parseAssignmentWord(file);
      const resolved = applyReviewValidation(
        resolveAssignmentRows(rows, teachers, subjects, classrooms, { teacherRoles: ['teacher'] }),
      );
      setReviewImportMeta({
        fileName: file.name,
        rowCount: rows.length,
        classrooms: [...new Set(rows.map((row) => row.classroomName))].sort((a, b) => a.localeCompare(b, 'th')),
      });
      setReviewRows(resolved);
      setShowTeachTableUpload(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อ่านไฟล์ตารางสอนไม่สำเร็จ');
    } finally {
      setImporting(false);
    }
  };

  const handleTeachTableFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await processTeachTableFile(file);
  };

  const updateReviewRow = (key: string, patch: Partial<AssignmentReviewRow>) => {
    setReviewRows((prev) =>
      applyReviewValidation(prev?.map((row) => {
        if (row.key !== key) return row;
        const next: AssignmentReviewRow = { ...row, ...patch };
        if (patch.teacherId !== undefined) {
          next.teacherMatchConfidence = patch.teacherId ? 'manual' : null;
          if (patch.teacherId) {
            next.warnings = (next.warnings ?? []).filter((warning) => warning !== 'กรุณาตรวจสอบ');
          }
        }
        return validateReviewRow(next);
      }) ?? []) || null
    );
  };

  const confirmImport = async () => {
    if (!reviewRows || !currentUser.schoolId || !selectedSemesterId) return;

    const validRows = reviewRows.filter((r) => r.issues.length === 0);
    if (validRows.length === 0) {
      setError('ไม่มีแถวที่พร้อมนำเข้า — แก้ไขรายการที่มีปัญหาก่อน');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = validRows.map((row) => ({
        school_id: currentUser.schoolId!,
        semester_id: selectedSemesterId,
        teacher_id: row.teacherId!,
        subject_id: row.subjectId!,
        classroom_id: row.classroomId!,
        hours_per_week: row.hoursPerWeek,
        hours_per_semester: row.hoursPerSemester,
        co_teacher_name: row.coTeacherName || null,
        status: 'pending' as const,
        created_by: currentUser.id,
      }));

      const { error: insertError } = await supabase
        .from('teaching_assignments')
        .upsert(payload, {
          onConflict: 'semester_id,teacher_id,subject_id,classroom_id',
          ignoreDuplicates: true,
        });

      let importedWithoutCoTeacherName = false;
      if (insertError && isMissingCoTeacherNameColumn(insertError)) {
        const payloadWithoutCoTeacherName = payload.map(({ co_teacher_name: _coTeacherName, ...row }) => row);
        const { error: retryError } = await supabase
          .from('teaching_assignments')
          .upsert(payloadWithoutCoTeacherName, {
            onConflict: 'semester_id,teacher_id,subject_id,classroom_id',
            ignoreDuplicates: true,
          });
        if (retryError) throw retryError;
        importedWithoutCoTeacherName = true;
      } else if (insertError) {
        throw insertError;
      }

      const skipped = reviewRows.length - validRows.length;
      setMessage(
        `นำเข้า ${validRows.length} รายการ (สถานะ: ปิดไว้ก่อน)` +
          (skipped > 0 ? ` · ข้าม ${skipped} แถวที่มีปัญหา` : '') +
          (importedWithoutCoTeacherName ? ' · ฐานยังไม่มีคอลัมน์ครูร่วม จึงนำเข้าโดยไม่บันทึกชื่อครูร่วม' : '')
      );
      setReviewRows(null);
      setReviewImportMeta(null);
      await loadAssignments();
    } catch (err) {
      setError(getErrorMessage(err, 'นำเข้าไม่สำเร็จ'));
    } finally {
      setSaving(false);
    }
  };

  const teacherLabel = (t: Profile) => `${t.title ? t.title + ' ' : ''}${t.full_name}`;

  const subjectSemesterLabel = (assignment: AssignmentWithProgress) => {
    const semester = assignment.subject?.semester_number ?? semesters.find((item) => item.id === assignment.semester_id)?.semester_number;
    return semester ? `ภาค ${semester}` : 'รายปี';
  };

  const subjectLevelLabel = (assignment: AssignmentWithProgress) =>
    assignment.classroom?.name ??
    assignment.subject?.default_class_level ??
    assignment.classroom?.class_level_code ??
    '—';

  const hoursLabel = (assignment: AssignmentWithProgress) => {
    const week = assignment.hours_per_week ?? '-';
    const semester = assignment.hours_per_semester ?? '-';
    return `${week}/${semester}`;
  };

  const compactList = (items: string[], fallback = '—') => {
    if (items.length === 0) return fallback;
    if (items.length <= 4) return items.join(', ');
    return `${items.slice(0, 4).join(', ')} +${items.length - 4}`;
  };

  return (
    <div className="space-y-6">
      {drilldownLabel && onDrilldownBack ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">กรอก ปพ.5 ตามระดับชั้น</p>
            <p className="mt-1 text-lg font-extrabold text-slate-900">{drilldownLabel}</p>
          </div>
          <button type="button" onClick={onDrilldownBack} className="btn btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            กลับข้อมูล ปพ.5
          </button>
        </div>
      ) : null}

      {!selectedTeacherId && (
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h4 className="text-[22px] font-extrabold tracking-tight text-slate-900">จัดการ ปพ.5</h4>
          <p className="text-sm text-slate-500 mt-1">
            กำหนดครูแต่ละคนให้กรอกเกรดตามชั้นเรียน รายวิชา และภาคเรียนที่เปิดใช้งาน
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setError('');
              setShowTeachTableUpload(true);
            }}
            disabled={importing}
            className="btn btn-secondary"
          >
            {importing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            เพิ่มจากตารางสอน
          </button>
          <button
            type="button"
            onClick={() => openAddModal()}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" /> เพิ่มรายการ
          </button>
        </div>
      </div>
      )}

      {selectedTeacherId && (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h4 className="text-[22px] font-extrabold tracking-tight text-slate-900">
              {selectedTeacher ? `${selectedTeacher.title ? selectedTeacher.title + ' ' : ''}${selectedTeacher.full_name}` : 'รายละเอียดครู'}
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedTeacherId(null)}
              className="btn btn-secondary"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              กลับไปรายชื่อครู
            </button>
            <button
              type="button"
              onClick={() => openAddModal(selectedTeacherId)}
              className="btn btn-primary"
            >
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มรายการให้ครูคนนี้
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm whitespace-pre-line">{error}</div>
      )}
      {message && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3 rounded-xl text-sm">{message}</div>
      )}

      {!selectedTeacherId && (
      <FilterBar fill>
        <FilterSearch
          label="ครูผู้สอน"
          value={teacherSearch}
          onChange={setTeacherSearch}
          placeholder="ค้นหาชื่อครู"
        />
        <FilterSelect
          label="ภาคเรียน"
          value={selectedSemesterId}
          onChange={setSelectedSemesterId}
        >
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>
              ภาค {s.semester_number}{s.is_active ? ' (เปิดอยู่)' : ''}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="สถานะ"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as 'all' | AssignmentStatus)}
        >
          <option value="all">ทั้งหมด</option>
          <option value="active">เปิดใช้งาน</option>
          <option value="pending">ปิดอยู่</option>
        </FilterSelect>
        <FilterSelect
          label="วิชา"
          value={subjectFilter}
          onChange={setSubjectFilter}
        >
          <option value="all">ทุกวิชา</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.subject_code} — {subject.subject_name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="ชั้น/ห้อง"
          value={classroomFilter}
          onChange={setClassroomFilter}
        >
          <option value="all">ทุกชั้น/ห้อง</option>
          {classrooms.map((classroom) => (
            <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
          ))}
        </FilterSelect>
        <FilterClearButton onClick={clearAssignmentFilters} disabled={!hasActiveAssignmentFilters} />
      </FilterBar>
      )}

      {selectedTeacherId && selectedSummary && (
        <AssignmentSummaryCards
          subjectCount={selectedSummary.subjectCount}
          classLevelNames={selectedSummary.classLevelNames}
          classroomNames={selectedSummary.classroomNames}
          progress={selectedSummary.progress}
        />
      )}

      <div className="ui-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="w-6 h-6 mr-2 animate-spin" /> กำลังโหลด...
          </div>
        ) : selectedTeacherId && selectedAssignments.length === 0 ? (
          <div className="text-center py-16 text-slate-400">ยังไม่มีรายการมอบหมายของครูคนนี้ตามเงื่อนไขที่เลือก</div>
        ) : !selectedTeacherId && teacherSummaries.length === 0 ? (
          <div className="text-center py-16 text-slate-400">ยังไม่มีรายการมอบหมายในภาคนี้</div>
        ) : selectedTeacherId ? (
          <div className="space-y-3">
            {selectedAssignmentCount > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3">
              <p className="text-xs font-semibold text-slate-500">
                เลือกแล้ว {selectedAssignmentCount} / {selectedAssignments.length} รายการ
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void deleteSelectedAssignments()}
                  disabled={saving || selectedAssignmentCount === 0}
                  className="inline-flex items-center rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  ลบที่เลือก
                </button>
                <button
                  type="button"
                  onClick={() => void deleteAllSelectedTeacherAssignments()}
                  disabled={saving || selectedAssignments.length === 0}
                  className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  ลบทั้งหมด
                </button>
              </div>
            </div>
            ) : null}
            <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-center font-semibold">
                    <input
                      type="checkbox"
                      checked={allSelectedAssignmentsChecked}
                      onChange={(event) => toggleAllSelectedTeacherAssignments(event.target.checked)}
                      aria-label="เลือกรายการทั้งหมด"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">ลำดับ</th>
                  <th className="px-4 py-3 text-center font-semibold">รหัสวิชา</th>
                  <th className="px-4 py-3 text-center font-semibold">ภาคเรียนที่</th>
                  <th className="px-4 py-3 text-center font-semibold">ชื่อวิชา</th>
                  <th className="px-4 py-3 text-center font-semibold">กลุ่มสาระ</th>
                  <th className="px-4 py-3 text-center font-semibold">ระดับชั้น/ห้อง</th>
                  <th className="px-4 py-3 text-center font-semibold">ชม.เรียน/สัปดาห์/ภาค</th>
                  <th className="px-4 py-3 text-center font-semibold">สถานะ</th>
                  <th className="px-4 py-3 text-center font-semibold">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedAssignments.map((assignment, index) => {
                  const displayStatus = resolveGradebookStatus(
                    assignment.gradebook_status,
                    assignment.completion_percent,
                  );
                  return (
                  <tr key={assignment.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedAssignmentIds.has(assignment.id)}
                        onChange={(event) => toggleAssignmentSelection(assignment.id, event.target.checked)}
                        aria-label={`เลือกรายการที่ ${index + 1}`}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4 text-center font-semibold text-slate-500">{index + 1}</td>
                    <td className="px-4 py-4 text-center font-mono font-semibold text-slate-800">{assignment.subject?.subject_code ?? '—'}</td>
                    <td className="px-4 py-4 text-center text-slate-600">{subjectSemesterLabel(assignment)}</td>
                    <td className="px-4 py-4 text-center font-semibold text-slate-900">{assignment.subject?.subject_name ?? '—'}</td>
                    <td className="px-4 py-4 text-center text-slate-600">{assignment.subject?.learning_area ?? '—'}</td>
                    <td className="px-4 py-4 text-center font-semibold text-slate-700">{subjectLevelLabel(assignment)}</td>
                    <td className="px-4 py-4 text-center font-mono font-semibold text-slate-700">{hoursLabel(assignment)}</td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex min-w-[108px] items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-bold ${gradebookStatusClassName(displayStatus)}`}
                      >
                        {gradebookStatusLabel(displayStatus, assignment.completion_percent)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(assignment)}
                          className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                        >
                          <Edit3 className="mr-1 h-3.5 w-3.5" />
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(assignment.id)}
                          className="inline-flex items-center rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          ลบ
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
        ) : (
          <div className="space-y-3">
            {selectedTeacherSummaryCount > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3">
              <p className="text-xs font-semibold text-slate-500">
                เลือกแล้ว {selectedTeacherSummaryCount} / {teacherSummaries.length} รายการ
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void deleteSelectedTeacherSummaries()}
                  disabled={saving || selectedTeacherSummaryAssignmentIds.length === 0}
                  className="inline-flex items-center rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  ลบที่เลือก
                </button>
                <button
                  type="button"
                  onClick={() => void deleteAllTeacherSummaries()}
                  disabled={saving || allTeacherSummaryAssignmentIds.length === 0}
                  className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  ลบทั้งหมด
                </button>
              </div>
            </div>
            ) : null}
            <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-center font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={allTeacherSummariesChecked}
                      onChange={(event) => toggleAllTeacherSummaries(event.target.checked)}
                      aria-label="เลือกรายการครูทั้งหมด"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="text-center px-5 py-3 font-semibold text-slate-600">ลำดับ</th>
                  <th className="text-center px-5 py-3 font-semibold text-slate-600">ครูผู้สอน</th>
                  <th className="text-center px-5 py-3 font-semibold text-slate-600">จำนวนวิชา</th>
                  <th className="text-center px-5 py-3 font-semibold text-slate-600">ชั้นเรียนที่สอน</th>
                  <th className="text-center px-5 py-3 font-semibold text-slate-600">สถานะ</th>
                  <th className="text-center px-5 py-3 font-semibold text-slate-600">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {teacherSummaries.map((summary, index) => (
                  <tr
                    key={summary.teacherId}
                    className="cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50/70"
                    onClick={() => setSelectedTeacherId(summary.teacherId)}
                  >
                    <td className="px-5 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedTeacherSummaryIds.has(summary.teacherId)}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => toggleTeacherSummarySelection(summary.teacherId, event.target.checked)}
                        aria-label={`เลือกครูแถวที่ ${index + 1}`}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-5 py-4 text-center font-semibold text-slate-500">{index + 1}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {summary.teacher ? `${summary.teacher.title ? summary.teacher.title + ' ' : ''}${summary.teacher.full_name}` : '—'}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-800">
                        {summary.subjectCount} วิชา
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center text-slate-700">{compactList(summary.classLevelNames)}</td>
                    <td className="px-5 py-4">
                      <div className="mx-auto w-[280px] max-w-full">
                        <AssignmentProgressBar
                          progress={summary.progress}
                          showSubLabel
                          completedCount={summary.completedCount}
                          totalCount={summary.assignments.length}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedTeacherId(summary.teacherId);
                          }}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1" />
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void deleteAssignmentsByIds(
                              summary.assignments.map((assignment) => assignment.id),
                              `ลบรายการมอบหมายของ ${summary.teacher?.full_name ?? 'ครูคนนี้'} ทั้งหมด ${summary.assignments.length} รายการ?`,
                            );
                          }}
                          className="inline-flex items-center rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        )}
      </div>

      {showAddModal && createPortal((
        <div className="fixed inset-0 z-[260] grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                {editingAssignment ? 'แก้ไขรายการมอบหมาย' : 'เพิ่มรายการมอบหมาย'}
              </h3>
              <button type="button" onClick={closeAssignmentModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ระดับชั้นเรียน</label>
                <select
                  value={modalLevelFilter}
                  onChange={(e) => handleModalLevelChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                >
                  <option value="">— ทุกระดับชั้น —</option>
                  {modalClassLevelOptions.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ห้องเรียน</label>
                <select
                  value={addForm.classroom_id}
                  onChange={(e) => setAddForm((f) => ({ ...f, classroom_id: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                  required
                >
                  <option value="">— เลือก —</option>
                  {modalClassrooms.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ครูผู้สอน</label>
                <select
                  value={addForm.teacher_id}
                  onChange={(e) => handleModalTeacherChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                  required
                >
                  <option value="">— เลือก —</option>
                  {modalTeachers.map((t) => (
                    <option key={t.id} value={t.id}>{teacherLabel(t)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">วิชา</label>
                <select
                  value={addForm.subject_id}
                  onChange={(e) => setSubjectAndHours(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                  required
                >
                  <option value="">— เลือก —</option>
                  {modalSubjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.subject_code} — {s.subject_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ชม./สัปดาห์</label>
                  <input
                    type="number"
                    min={0}
                    value={addForm.hours_per_week}
                    onChange={(e) => setAddForm((f) => ({ ...f, hours_per_week: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ชม./ภาค</label>
                  <input
                    type="number"
                    min={0}
                    value={addForm.hours_per_semester}
                    onChange={(e) => setAddForm((f) => ({ ...f, hours_per_semester: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">สถานะ</label>
                <select
                  value={addForm.status}
                  onChange={(e) => setAddForm((f) => ({ ...f, status: e.target.value as AssignmentStatus }))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                >
                  <option value="active">เปิดใช้งานให้ครูเห็น</option>
                  <option value="pending">ปิดไว้ก่อน</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAssignmentModal}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold disabled:opacity-50"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}

      {showTeachTableUpload &&
        createPortal(
          <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-900/50 backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
              <div className="my-8 w-full max-w-lg rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">อัปโหลดตารางสอน</h3>
                    <p className="mt-1 text-sm text-slate-500">เลือกไฟล์ Word (.docx) ก่อนตรวจสอบและนำเข้า</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTeachTableUpload(false)}
                    className="text-slate-400 hover:text-slate-600"
                    disabled={importing}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4 px-6 py-5">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-600">
                    <p className="font-semibold text-slate-800">รองรับไฟล์ตารางสอน Word</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>อ่านเฉพาะวิชาหลัก (มีรหัสวิชา 5 หลัก)</li>
                      <li>ไม่นำเข้ากิจกรรม เช่น ลูกเสือ, ชุมนุม, แนะแนว, หน้าเสาธง, อบรมคุณธรรม</li>
                      <li>ไม่มอบหมายให้รองผู้อำนวยการ / คณะบริหาร — เฉพาะครูผู้สอน</li>
                    </ul>
                  </div>

                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 transition hover:border-blue-300 hover:bg-blue-50/40">
                    {importing ? (
                      <>
                        <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-600" />
                        <span className="text-sm font-semibold text-slate-700">กำลังอ่านไฟล์ตารางสอน...</span>
                      </>
                    ) : (
                      <>
                        <FileUp className="mb-3 h-8 w-8 text-blue-600" />
                        <span className="text-sm font-semibold text-slate-800">คลิกเพื่อเลือกไฟล์ .docx</span>
                        <span className="mt-1 text-xs text-slate-500">เช่น ตารางรวม ม.1, ป.1-3 หรือแยกรายชั้น</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      disabled={importing}
                      onChange={(e) => void handleTeachTableFileChange(e)}
                    />
                  </label>
                </div>

                <div className="border-t border-slate-100 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setShowTeachTableUpload(false)}
                    disabled={importing}
                    className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {reviewRows &&
        createPortal(
          <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-900/50 backdrop-blur-sm">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
              <div className="my-8 flex w-full max-w-5xl max-h-[min(90vh,calc(100vh-3rem))] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">ตรวจสอบก่อนนำเข้า</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {reviewImportMeta
                        ? `ไฟล์ ${reviewImportMeta.fileName} · อ่านได้ ${reviewImportMeta.rowCount.toLocaleString('th-TH')} รายการ · ห้อง ${reviewImportMeta.classrooms.join(', ')}`
                        : 'แก้ไขรายการที่ map ไม่ได้ แล้วกดยืนยัน'}
                      {' — '}จะบันทึกเป็นสถานะ &quot;ปิดไว้ก่อน&quot;
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewRows(null);
                      setReviewImportMeta(null);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="sticky top-0 z-20 w-12 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left font-semibold text-slate-600 shadow-[inset_0_-1px_0_0_rgb(226,232,240)]">แถว</th>
                        <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left font-semibold text-slate-600 shadow-[inset_0_-1px_0_0_rgb(226,232,240)]">ครูหลัก</th>
                        <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left font-semibold text-slate-600 shadow-[inset_0_-1px_0_0_rgb(226,232,240)]">ครูร่วม</th>
                        <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left font-semibold text-slate-600 shadow-[inset_0_-1px_0_0_rgb(226,232,240)]">วิชา</th>
                        <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left font-semibold text-slate-600 shadow-[inset_0_-1px_0_0_rgb(226,232,240)]">ห้อง</th>
                        <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left font-semibold text-slate-600 shadow-[inset_0_-1px_0_0_rgb(226,232,240)]">ปัญหา</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewRows.map((row) => (
                        <tr
                          key={row.key}
                          className={`border-b border-slate-50 ${
                            row.issues.length
                              ? 'bg-red-50/40'
                              : (row.warnings?.length ?? 0) > 0
                                ? 'bg-amber-50/40'
                                : ''
                          }`}
                        >
                          <td className="px-3 py-3 text-slate-500">{row.line}</td>
                          <td className="px-3 py-3">
                            <div className="mb-1 text-xs text-slate-500">{row.teacherName}</div>
                            <SearchableTeacherSelect
                              value={row.teacherId ?? ''}
                              teachers={teachers}
                              getLabel={teacherLabel}
                              placeholder="— เลือกครู —"
                              onChange={(teacherId) =>
                                updateReviewRow(row.key, { teacherId: teacherId || null })
                              }
                            />
                          </td>
                          <td className="px-3 py-3 text-xs font-medium text-slate-600">
                            {row.coTeacherName || '—'}
                          </td>
                          <td className="px-3 py-3">
                            <div className="mb-1 text-xs text-slate-500">
                              {row.subjectCode} {row.subjectName}
                            </div>
                            <select
                              value={row.subjectId ?? ''}
                              onChange={(e) => updateReviewRow(row.key, { subjectId: e.target.value || null })}
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            >
                              <option value="">— เลือกวิชา —</option>
                              {subjects.map((s) => (
                                <option key={s.id} value={s.id}>{s.subject_code} — {s.subject_name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <div className="mb-1 text-xs text-slate-500">{row.classroomName}</div>
                            <select
                              value={row.classroomId ?? ''}
                              onChange={(e) => updateReviewRow(row.key, { classroomId: e.target.value || null })}
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                            >
                              <option value="">— เลือกห้อง —</option>
                              {classrooms.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            {row.issues.length > 0 ? (
                              <span className="inline-flex items-center text-xs font-medium text-red-600">
                                <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                                {row.issues.join(', ')}
                              </span>
                            ) : (row.warnings?.length ?? 0) > 0 ? (
                              <span className="inline-flex items-center text-xs font-medium text-amber-700">
                                <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                                {row.warnings.join(', ')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-xs font-medium text-emerald-600">
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                พร้อมนำเข้า
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex shrink-0 flex-col items-center justify-between gap-3 border-t border-slate-100 bg-white p-4 sm:flex-row">
                  <p className="text-sm text-slate-500">
                    พร้อมนำเข้า{' '}
                    {reviewRows.filter((r) => r.issues.length === 0 && (r.warnings?.length ?? 0) === 0).length}
                    {' · '}
                    กรุณาตรวจสอบ{' '}
                    {reviewRows.filter((r) => r.issues.length === 0 && (r.warnings?.length ?? 0) > 0).length}
                    {' · '}
                    มีปัญหา {reviewRows.filter((r) => r.issues.length > 0).length} (จาก {reviewRows.length} แถว)
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewRows(null);
                        setReviewImportMeta(null);
                      }}
                      className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="button"
                      onClick={() => void confirmImport()}
                      disabled={saving || reviewRows.every((r) => r.issues.length > 0)}
                      className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {saving ? 'กำลังนำเข้า...' : 'ยืนยันนำเข้า'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
