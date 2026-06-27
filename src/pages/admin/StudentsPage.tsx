import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Download,
  Edit3,
  FileSpreadsheet,
  FileUp,
  Info,
  Loader2,
  Plus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  downloadStudentImportTemplate,
  importStudents,
  parseStudentExcel,
} from '../../lib/studentImport';
import { getErrorMessage, isSchemaCacheErrorFor } from '../../lib/dbErrors';
import { STUDENT_HOMEROOMS } from '../../data/studentHomerooms';
import { FilterBar, FilterBarActions, FilterClearButton, FilterSearch, FilterSelect } from '../../components/FilterBar';
import type { AcademicYear, AppUser, Classroom, DbStudent } from '../../types';

interface StudentsPageProps {
  currentUser: AppUser;
  initialYearId?: string;
}

interface HomeroomProfile {
  title: string | null;
  full_name: string;
}

interface ClassroomWithHomeroom extends Classroom {
  homeroom_teacher_1?: HomeroomProfile | HomeroomProfile[] | null;
  homeroom_teacher_2?: HomeroomProfile | HomeroomProfile[] | null;
  homeroom_teacher_3?: HomeroomProfile | HomeroomProfile[] | null;
}

interface EnrollmentRow {
  id: string;
  student_number: number | null;
  classroom_id: string;
  class_level_code: string;
  students: DbStudent;
  classrooms: ClassroomWithHomeroom | ClassroomWithHomeroom[] | null;
}

const CLASSROOM_SELECT_BASE = `
  id,
  school_id,
  academic_year_id,
  class_level_code,
  room_number,
  name,
  homeroom_teacher_id,
  homeroom_teacher_2_id,
  created_at,
  homeroom_teacher_1:homeroom_teacher_id(title, full_name),
  homeroom_teacher_2:homeroom_teacher_2_id(title, full_name)
`;

const CLASSROOM_SELECT_WITH_THIRD = `
  id,
  school_id,
  academic_year_id,
  class_level_code,
  room_number,
  name,
  homeroom_teacher_id,
  homeroom_teacher_2_id,
  homeroom_teacher_3_id,
  created_at,
  homeroom_teacher_1:homeroom_teacher_id(title, full_name),
  homeroom_teacher_2:homeroom_teacher_2_id(title, full_name),
  homeroom_teacher_3:homeroom_teacher_3_id(title, full_name)
`;

const ENROLLMENT_SELECT_BASE = `
  id,
  student_number,
  classroom_id,
  class_level_code,
  students(*),
  classrooms:classroom_id(${CLASSROOM_SELECT_BASE})
`;

const ENROLLMENT_SELECT_WITH_THIRD = `
  id,
  student_number,
  classroom_id,
  class_level_code,
  students(*),
  classrooms:classroom_id(${CLASSROOM_SELECT_WITH_THIRD})
`;

type AddMode = 'menu' | 'single' | 'bulk';
type GenderInput = '' | 'ชาย' | 'หญิง';

interface SingleStudentForm {
  studentCode: string;
  citizenId: string;
  title: string;
  firstName: string;
  lastName: string;
  gender: GenderInput;
  classroomId: string;
  studentNumber: string;
}

interface StudentEditForm {
  studentCode: string;
  citizenId: string;
  title: string;
  firstName: string;
  lastName: string;
  gender: GenderInput;
  studentNumber: string;
  classroomId: string;
}

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
}

const GRADE_ORDER = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];

const emptySingleForm = (classroomId = ''): SingleStudentForm => ({
  studentCode: '',
  citizenId: '',
  title: '',
  firstName: '',
  lastName: '',
  gender: '',
  classroomId,
  studentNumber: '',
});

const emptyStudentEditForm = (): StudentEditForm => ({
  studentCode: '',
  citizenId: '',
  title: '',
  firstName: '',
  lastName: '',
  gender: '',
  studentNumber: '',
  classroomId: '',
});

function studentStatusLabel(status: string): string {
  if (status === 'active') return 'ใช้งาน';
  if (status === 'inactive') return 'ไม่ใช้งาน';
  return status;
}

function enrollmentToStudentEditForm(enrollment: EnrollmentRow): StudentEditForm {
  const student = enrollment.students;
  return {
    studentCode: student.student_code,
    citizenId: student.citizen_id ?? '',
    title: student.title ?? '',
    firstName: student.first_name,
    lastName: student.last_name,
    gender: (student.gender ?? '') as GenderInput,
    studentNumber: enrollment.student_number?.toString() ?? '',
    classroomId: enrollment.classroom_id,
  };
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function classLevelRank(code: string): number {
  const index = GRADE_ORDER.indexOf(code);
  return index >= 0 ? index : 999;
}

function normalizeClassroom(value: EnrollmentRow['classrooms']): ClassroomWithHomeroom | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function normalizeProfile(value: HomeroomProfile | HomeroomProfile[] | null | undefined): HomeroomProfile | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function profileName(value: HomeroomProfile | HomeroomProfile[] | null | undefined): string {
  const profile = normalizeProfile(value);
  if (!profile) return '';
  return [profile.title, profile.full_name].filter(Boolean).join(' ');
}

function studentName(student: DbStudent): string {
  return [student.title, student.first_name, student.last_name].filter(Boolean).join(' ');
}

function homeroomText(classroom: ClassroomWithHomeroom | null): string {
  return homeroomNames(classroom).join(' / ');
}

function homeroomNames(classroom: ClassroomWithHomeroom | null): string[] {
  if (!classroom) return [];
  const excelNames =
    STUDENT_HOMEROOMS[classroom.name] ??
    STUDENT_HOMEROOMS[classroomLabel(classroom)];
  if (excelNames?.length) return excelNames.slice(0, 3);

  return [
    profileName(classroom.homeroom_teacher_1),
    profileName(classroom.homeroom_teacher_2),
    profileName(classroom.homeroom_teacher_3),
  ].filter(Boolean);
}

function classroomLabel(classroom: Classroom): string {
  return `${classroom.class_level_code}/${classroom.room_number}`;
}

function selectedClassroomSort(a: Classroom, b: Classroom): number {
  return (
    classLevelRank(a.class_level_code) - classLevelRank(b.class_level_code) ||
    a.room_number - b.room_number ||
    a.name.localeCompare(b.name, 'th')
  );
}

export const StudentsPage: React.FC<StudentsPageProps> = ({ currentUser, initialYearId }) => {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomWithHomeroom[]>([]);
  const [selectedYearId, setSelectedYearId] = useState(initialYearId ?? '');
  const [filterClassLevel, setFilterClassLevel] = useState('');
  const [filterClassroomId, setFilterClassroomId] = useState('');
  const [filterHomeroom, setFilterHomeroom] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [savingSingle, setSavingSingle] = useState(false);
  const [error, setError] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('menu');
  const [singleForm, setSingleForm] = useState<SingleStudentForm>(emptySingleForm());
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const [studentEditForm, setStudentEditForm] = useState<StudentEditForm>(emptyStudentEditForm());
  const [editingStudent, setEditingStudent] = useState(false);
  const [savingStudentEdit, setSavingStudentEdit] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

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

  const loadClassrooms = useCallback(async () => {
    if (!selectedYearId) {
      setClassrooms([]);
      return;
    }

    const runQuery = (select: string) =>
      supabase
        .from('classrooms')
        .select(select)
        .eq('academic_year_id', selectedYearId);

    let result = await runQuery(CLASSROOM_SELECT_WITH_THIRD);
    if (result.error && isSchemaCacheErrorFor(result.error, 'homeroom_teacher_3_id')) {
      result = await runQuery(CLASSROOM_SELECT_BASE);
    }

    if (result.error) {
      setError(getErrorMessage(result.error, 'โหลดข้อมูลห้องเรียนไม่สำเร็จ'));
      setClassrooms([]);
      return;
    }

    setClassrooms(((result.data ?? []) as unknown as ClassroomWithHomeroom[]).sort(selectedClassroomSort));
  }, [selectedYearId]);

  const loadEnrollments = useCallback(async () => {
    if (!selectedYearId) return;
    setLoading(true);
    setError('');
    try {
      const runQuery = (select: string) =>
        supabase
          .from('student_enrollments')
          .select(select)
          .eq('academic_year_id', selectedYearId)
          .eq('status', 'active');

      let result = await runQuery(ENROLLMENT_SELECT_WITH_THIRD);
      if (result.error && isSchemaCacheErrorFor(result.error, 'homeroom_teacher_3_id')) {
        result = await runQuery(ENROLLMENT_SELECT_BASE);
      }

      if (result.error) throw result.error;
      setEnrollments((result.data ?? []) as unknown as EnrollmentRow[]);
    } catch (err) {
      setError(getErrorMessage(err, 'โหลดรายชื่อไม่สำเร็จ'));
    } finally {
      setLoading(false);
    }
  }, [selectedYearId]);

  useEffect(() => {
    void loadYears();
  }, [loadYears]);

  useEffect(() => {
    void loadClassrooms();
  }, [loadClassrooms]);

  useEffect(() => {
    void loadEnrollments();
  }, [loadEnrollments]);

  const classroomMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const classroom of classrooms) {
      const labels = [
        classroom.name,
        classroomLabel(classroom),
        `${classroom.class_level_code}${classroom.room_number}`,
      ];
      labels.forEach((label) => map.set(normalizeText(label), classroom.id));
    }
    return map;
  }, [classrooms]);

  const classLevelOptions = useMemo(() => {
    return [...new Set<string>(classrooms.map((classroom) => classroom.class_level_code))]
      .sort((a, b) => classLevelRank(a) - classLevelRank(b));
  }, [classrooms]);

  const filteredClassrooms = useMemo(() => {
    return filterClassLevel
      ? classrooms.filter((classroom) => classroom.class_level_code === filterClassLevel)
      : classrooms;
  }, [classrooms, filterClassLevel]);

  const homeroomOptions = useMemo(() => {
    return [...new Set<string>(classrooms.map(homeroomText).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'th'));
  }, [classrooms]);

  const sortedEnrollments = useMemo(() => {
    return [...enrollments].sort((a, b) => {
      const aClassroom = normalizeClassroom(a.classrooms);
      const bClassroom = normalizeClassroom(b.classrooms);
      const aLevel = aClassroom?.class_level_code ?? a.class_level_code;
      const bLevel = bClassroom?.class_level_code ?? b.class_level_code;

      return (
        classLevelRank(aLevel) - classLevelRank(bLevel) ||
        (aClassroom?.room_number ?? 999) - (bClassroom?.room_number ?? 999) ||
        (a.student_number ?? 9999) - (b.student_number ?? 9999) ||
        studentName(a.students).localeCompare(studentName(b.students), 'th')
      );
    });
  }, [enrollments]);

  const filteredEnrollments = useMemo(() => {
    const search = normalizeText(searchTerm);
    const searchDigits = normalizeDigits(searchTerm);

    return sortedEnrollments.filter((row) => {
      const student = row.students;
      const classroom = normalizeClassroom(row.classrooms);
      const name = studentName(student);
      const citizenId = student.citizen_id ?? '';
      const homeroom = homeroomText(classroom);
      const matchesSearch =
        !search ||
        normalizeText(student.student_code).includes(search) ||
        normalizeText(name).includes(search) ||
        (searchDigits && normalizeDigits(citizenId).includes(searchDigits));
      const matchesLevel = !filterClassLevel || (classroom?.class_level_code ?? row.class_level_code) === filterClassLevel;
      const matchesClassroom = !filterClassroomId || row.classroom_id === filterClassroomId;
      const matchesHomeroom = !filterHomeroom || homeroom === filterHomeroom;

      return matchesSearch && matchesLevel && matchesClassroom && matchesHomeroom;
    });
  }, [filterClassLevel, filterClassroomId, filterHomeroom, searchTerm, sortedEnrollments]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() || filterClassLevel || filterClassroomId || filterHomeroom,
  );

  const clearFilters = () => {
    setSearchTerm('');
    setFilterClassLevel('');
    setFilterClassroomId('');
    setFilterHomeroom('');
  };

  const selectedEnrollment = useMemo(() => {
    if (!selectedEnrollmentId) return null;
    return enrollments.find((row) => row.id === selectedEnrollmentId) ?? null;
  }, [enrollments, selectedEnrollmentId]);

  useEffect(() => {
    if (!selectedEnrollment) {
      setStudentEditForm(emptyStudentEditForm());
      setEditingStudent(false);
      return;
    }

    setStudentEditForm(enrollmentToStudentEditForm(selectedEnrollment));
    setEditingStudent(false);
  }, [selectedEnrollment]);

  const resetAddModal = () => {
    setShowAddModal(false);
    setAddMode('menu');
    setSingleForm(emptySingleForm());
  };

  const openStudentDetails = (enrollmentId: string) => {
    setSelectedEnrollmentId(enrollmentId);
  };

  const closeStudentDetails = () => {
    setSelectedEnrollmentId(null);
    setEditingStudent(false);
    setStudentEditForm(emptyStudentEditForm());
  };

  const runConfirmDialog = async () => {
    if (!confirmDialog) return;
    setConfirmBusy(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } catch (err) {
      setError(getErrorMessage(err, 'ดำเนินการไม่สำเร็จ'));
    } finally {
      setConfirmBusy(false);
    }
  };

  const openSingleForm = () => {
    setSingleForm(emptySingleForm(filterClassroomId || filteredClassrooms[0]?.id || ''));
    setAddMode('single');
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !currentUser.schoolId || !selectedYearId) return;

    setImporting(true);
    setError('');
    setImportMessage('');

    try {
      const rows = await parseStudentExcel(file);
      const result = await importStudents(
        rows,
        currentUser.schoolId,
        selectedYearId,
        filterClassroomId || null,
        classroomMap
      );

      setImportMessage(
        `นำเข้าเสร็จ: สร้างใหม่ ${result.created}, อัปเดต ${result.updated}, ข้าม ${result.skipped}` +
          (result.errors.length ? `\nข้อผิดพลาด ${result.errors.length} รายการ` : '')
      );
      if (result.errors.length) {
        setError(result.errors.slice(0, 5).join('\n') + (result.errors.length > 5 ? '\n...' : ''));
      } else {
        resetAddModal();
      }
      await loadEnrollments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'นำเข้าไม่สำเร็จ');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadStudentImportTemplate(classrooms);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ดาวน์โหลดเทมเพลตไม่สำเร็จ');
    }
  };

  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.schoolId || !selectedYearId) return;

    const classroom = classrooms.find((item) => item.id === singleForm.classroomId);
    if (!classroom) {
      setError('กรุณาเลือกห้องเรียน');
      return;
    }

    setSavingSingle(true);
    setError('');
    setImportMessage('');

    try {
      const studentPayload = {
        first_name: singleForm.firstName.trim(),
        last_name: singleForm.lastName.trim(),
        citizen_id: singleForm.citizenId.trim() || null,
        title: singleForm.title.trim() || null,
        gender: singleForm.gender || null,
        status: 'active' as const,
      };

      const { data: existing } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', currentUser.schoolId)
        .eq('student_code', singleForm.studentCode.trim())
        .maybeSingle();

      let studentId = existing?.id;
      if (studentId) {
        const { error: updateError } = await supabase
          .from('students')
          .update(studentPayload)
          .eq('id', studentId);
        if (updateError) throw updateError;
      } else {
        const { data: created, error: insertError } = await supabase
          .from('students')
          .insert({
            school_id: currentUser.schoolId,
            student_code: singleForm.studentCode.trim(),
            ...studentPayload,
          })
          .select('id')
          .single();
        if (insertError || !created) throw insertError ?? new Error('สร้างนักเรียนไม่สำเร็จ');
        studentId = created.id;
      }

      const studentNumber = singleForm.studentNumber
        ? parseInt(singleForm.studentNumber, 10)
        : null;
      const enrollmentPayload = {
        classroom_id: classroom.id,
        class_level_code: classroom.class_level_code,
        student_number: Number.isFinite(studentNumber) ? studentNumber : null,
        status: 'active' as const,
      };

      const { data: existingEnrollment } = await supabase
        .from('student_enrollments')
        .select('id')
        .eq('student_id', studentId)
        .eq('academic_year_id', selectedYearId)
        .maybeSingle();

      if (existingEnrollment) {
        const { error: updateEnrollmentError } = await supabase
          .from('student_enrollments')
          .update(enrollmentPayload)
          .eq('id', existingEnrollment.id);
        if (updateEnrollmentError) throw updateEnrollmentError;
      } else {
        const { error: insertEnrollmentError } = await supabase
          .from('student_enrollments')
          .insert({
            student_id: studentId,
            academic_year_id: selectedYearId,
            ...enrollmentPayload,
          });
        if (insertEnrollmentError) throw insertEnrollmentError;
      }

      setImportMessage('เพิ่มนักเรียนเรียบร้อยแล้ว');
      resetAddModal();
      await loadEnrollments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เพิ่มนักเรียนไม่สำเร็จ');
    } finally {
      setSavingSingle(false);
    }
  };

  const handleSaveStudentDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEnrollment || !currentUser.schoolId) return;

    const studentCode = studentEditForm.studentCode.trim();
    const firstName = studentEditForm.firstName.trim();
    const lastName = studentEditForm.lastName.trim();
    const studentNumberText = studentEditForm.studentNumber.trim();
    const studentNumber = studentNumberText ? Number.parseInt(studentNumberText, 10) : null;

    if (!studentCode || !firstName || !lastName) {
      setError('กรุณากรอกรหัสนักเรียน ชื่อ และนามสกุลให้ครบ');
      return;
    }

    if (studentNumberText && (!Number.isFinite(studentNumber) || Number(studentNumber) < 1)) {
      setError('เลขที่ต้องเป็นตัวเลขตั้งแต่ 1 ขึ้นไป');
      return;
    }

    const enrollment = selectedEnrollment;
    const formSnapshot = { ...studentEditForm };
    const targetClassroom = classrooms.find((item) => item.id === formSnapshot.classroomId);
    if (!targetClassroom) {
      setError('กรุณาเลือกห้องเรียน');
      return;
    }
    const classroomChanged = formSnapshot.classroomId !== enrollment.classroom_id;
    const currentClassroom = normalizeClassroom(enrollment.classrooms);

    setConfirmDialog({
      title: 'ยืนยันการบันทึกข้อมูล',
      message: classroomChanged
        ? `ต้องการบันทึกการแก้ไขข้อมูลนักเรียน "${studentName(enrollment.students)}" และเปลี่ยนห้องเรียนจาก ${currentClassroom?.name ?? enrollment.class_level_code} เป็น ${targetClassroom.name} ใช่หรือไม่?`
        : `ต้องการบันทึกการแก้ไขข้อมูลนักเรียน "${studentName(enrollment.students)}" ใช่หรือไม่?`,
      confirmLabel: 'ยืนยันบันทึก',
      onConfirm: async () => {
        setSavingStudentEdit(true);
        setError('');
        setImportMessage('');

        try {
          const { data: duplicate, error: duplicateError } = await supabase
            .from('students')
            .select('id')
            .eq('school_id', currentUser.schoolId)
            .eq('student_code', studentCode)
            .neq('id', enrollment.students.id)
            .maybeSingle();

          if (duplicateError) throw duplicateError;
          if (duplicate) throw new Error('รหัสนักเรียนนี้ถูกใช้แล้ว');

          const { error: studentError } = await supabase
            .from('students')
            .update({
              student_code: studentCode,
              citizen_id: formSnapshot.citizenId.trim() || null,
              title: formSnapshot.title.trim() || null,
              first_name: firstName,
              last_name: lastName,
              gender: formSnapshot.gender || null,
            })
            .eq('id', enrollment.students.id);

          if (studentError) throw studentError;

          const { error: enrollmentError } = await supabase
            .from('student_enrollments')
            .update({
              student_number: studentNumber,
              classroom_id: formSnapshot.classroomId,
              class_level_code: targetClassroom.class_level_code,
            })
            .eq('id', enrollment.id);

          if (enrollmentError) throw enrollmentError;

          setEditingStudent(false);
          setImportMessage('บันทึกข้อมูลนักเรียนเรียบร้อยแล้ว');
          await loadEnrollments();
        } catch (err) {
          setError(getErrorMessage(err, 'บันทึกข้อมูลนักเรียนไม่สำเร็จ'));
        } finally {
          setSavingStudentEdit(false);
        }
      },
    });
  };

  return (
    <div className="space-y-4">
      <FilterBar>
        <FilterSearch
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="รหัสนักเรียน หรือ ชื่อนักเรียน"
          className="w-[min(100%,320px)]"
        />
        <FilterSelect
          label="ปีการศึกษา"
          value={selectedYearId}
          onChange={(value) => {
            setSelectedYearId(value);
            setFilterClassLevel('');
            setFilterClassroomId('');
            setFilterHomeroom('');
          }}
          className="w-[132px]"
        >
          {years.map((y) => (
            <option key={y.id} value={y.id}>{y.year_be}</option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="ชั้นเรียน"
          value={filterClassLevel}
          onChange={(value) => {
            setFilterClassLevel(value);
            setFilterClassroomId('');
          }}
          className="w-[132px]"
        >
          <option value="">ทุกชั้นเรียน</option>
          {classLevelOptions.map((level) => (
            <option key={level} value={level}>{level}</option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="ห้องเรียน"
          value={filterClassroomId}
          onChange={setFilterClassroomId}
          className="w-[148px]"
        >
          <option value="">ทุกห้องเรียน</option>
          {filteredClassrooms.map((classroom) => (
            <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="ครูประจำชั้น"
          value={filterHomeroom}
          onChange={setFilterHomeroom}
          className="w-[min(100%,240px)]"
        >
          <option value="">ทุกครูประจำชั้น</option>
          {homeroomOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </FilterSelect>
        <FilterClearButton onClick={clearFilters} disabled={!hasActiveFilters} />
        <FilterBarActions>
          <div className="flex h-[42px] items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 text-blue-900">
            <Users className="h-4 w-4 text-blue-700" />
            <span className="text-xs font-semibold text-blue-700">จำนวนนักเรียน</span>
            <span className="text-lg font-extrabold tabular-nums">
              {filteredEnrollments.length.toLocaleString('th-TH')}
            </span>
            <span className="text-xs font-semibold text-blue-700">คน</span>
          </div>
          <button
            type="button"
            onClick={() => { setAddMode('menu'); setShowAddModal(true); }}
            className="btn btn-primary h-[42px]"
          >
            <Plus className="w-4 h-4 mr-2" />
            เพิ่มนักเรียน
          </button>
        </FilterBarActions>
      </FilterBar>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm whitespace-pre-line">{error}</div>
      )}
      {importMessage && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3 rounded-xl text-sm whitespace-pre-line">{importMessage}</div>
      )}

      <div className="min-h-[calc(100vh-260px)] ui-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="w-6 h-6 mr-2 animate-spin" /> กำลังโหลด...
          </div>
        ) : filteredEnrollments.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            ไม่พบนักเรียนตามเงื่อนไขที่เลือก
          </div>
        ) : (
          <div className="max-h-[calc(100vh-230px)] overflow-auto">
            <table className="w-full min-w-[1180px] table-fixed border-collapse text-sm">
              <thead className="sticky top-0 z-30 bg-[#0f172a] text-slate-100 shadow-md">
                <tr>
                  <th className="w-16 bg-[#0f172a] px-4 py-3 text-center align-middle font-semibold">ลำดับ</th>
                  <th className="w-28 bg-[#0f172a] px-4 py-3 text-center align-middle font-semibold">รหัสนักเรียน</th>
                  <th className="w-36 bg-[#0f172a] px-4 py-3 text-center align-middle font-semibold">เลขบัตรประชาชน</th>
                  <th className="w-56 bg-[#0f172a] px-4 py-3 text-center align-middle font-semibold">ชื่อ-นามสกุล</th>
                  <th className="w-36 bg-[#0f172a] px-4 py-3 text-center align-middle font-semibold">ชั้นเรียน/ห้องเรียน</th>
                  <th className="w-52 bg-[#0f172a] px-4 py-3 text-center align-middle font-semibold">ครูประจำชั้น คนที่ 1</th>
                  <th className="w-52 bg-[#0f172a] px-4 py-3 text-center align-middle font-semibold">ครูประจำชั้น คนที่ 2</th>
                  <th className="w-52 bg-[#0f172a] px-4 py-3 text-center align-middle font-semibold">ครูประจำชั้น คนที่ 3</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEnrollments.map((row, index) => {
                  const st = row.students;
                  const classroom = normalizeClassroom(row.classrooms);
                  const teachers = homeroomNames(classroom);
                  return (
                    <tr
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openStudentDetails(row.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openStudentDetails(row.id);
                        }
                      }}
                      className="cursor-pointer hover:bg-blue-50/40 focus-within:bg-blue-50/60 focus:outline-none"
                    >
                      <td className="px-4 py-3 text-center font-semibold text-slate-500">
                        {(index + 1).toLocaleString('th-TH')}
                      </td>
                      <td className="truncate px-4 py-3 text-center font-mono text-slate-700">{st.student_code}</td>
                      <td className="truncate px-4 py-3 text-center font-mono text-slate-600">{st.citizen_id || '—'}</td>
                      <td className="truncate px-4 py-3 font-medium text-slate-950" title={studentName(st)}>
                        {studentName(st)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openStudentDetails(row.id);
                          }}
                          className="inline-flex items-center justify-center rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-900 transition hover:bg-blue-100"
                        >
                          <Info className="mr-1.5 h-3.5 w-3.5" />
                          {classroom?.name ?? `${row.class_level_code}/-`}
                        </button>
                      </td>
                      <td className="truncate px-4 py-3 text-center text-slate-700" title={teachers[0] ?? ''}>
                        {teachers[0] || '—'}
                      </td>
                      <td className="truncate px-4 py-3 text-center text-slate-700" title={teachers[1] ?? ''}>
                        {teachers[1] || '—'}
                      </td>
                      <td className="truncate px-4 py-3 text-center text-slate-700" title={teachers[2] ?? ''}>
                        {teachers[2] || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedEnrollment && (() => {
        const student = selectedEnrollment.students;
        const classroom = normalizeClassroom(selectedEnrollment.classrooms);
        const teachers = homeroomNames(classroom);
        const editClassroom = classrooms.find((item) => item.id === studentEditForm.classroomId) ?? null;
        const editTeachers = homeroomNames(editClassroom);

        return createPortal((
          <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-950">ข้อมูลนักเรียน</h3>
                  <p className="mt-1 text-sm text-slate-500">{studentName(student)}</p>
                </div>
                <button
                  type="button"
                  onClick={closeStudentDetails}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="ปิดหน้าต่าง"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveStudentDetails} className="rounded-xl border border-slate-200 p-4">
                {editingStudent ? (
                  <div className="grid gap-4 text-sm sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">รหัสนักเรียน</span>
                      <input
                        type="text"
                        value={studentEditForm.studentCode}
                        onChange={(event) => setStudentEditForm((form) => ({ ...form, studentCode: event.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">เลขบัตรประชาชน</span>
                      <input
                        type="text"
                        value={studentEditForm.citizenId}
                        onChange={(event) => setStudentEditForm((form) => ({ ...form, citizenId: event.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">คำนำหน้า</span>
                      <input
                        type="text"
                        value={studentEditForm.title}
                        onChange={(event) => setStudentEditForm((form) => ({ ...form, title: event.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">เพศ</span>
                      <select
                        value={studentEditForm.gender}
                        onChange={(event) => setStudentEditForm((form) => ({ ...form, gender: event.target.value as GenderInput }))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">ไม่ระบุ</option>
                        <option value="ชาย">ชาย</option>
                        <option value="หญิง">หญิง</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">ชื่อ</span>
                      <input
                        type="text"
                        value={studentEditForm.firstName}
                        onChange={(event) => setStudentEditForm((form) => ({ ...form, firstName: event.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">นามสกุล</span>
                      <input
                        type="text"
                        value={studentEditForm.lastName}
                        onChange={(event) => setStudentEditForm((form) => ({ ...form, lastName: event.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">เลขที่</span>
                      <input
                        type="number"
                        min="1"
                        value={studentEditForm.studentNumber}
                        onChange={(event) => setStudentEditForm((form) => ({ ...form, studentNumber: event.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">ชั้นเรียน/ห้องเรียน</span>
                      <select
                        value={studentEditForm.classroomId}
                        onChange={(event) => setStudentEditForm((form) => ({ ...form, classroomId: event.target.value }))}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        required
                      >
                        {classrooms.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </label>
                    <div className="sm:col-span-2">
                      <div className="text-xs font-semibold text-slate-600">ครูประจำชั้น</div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        {editTeachers.map((name, index) => (
                          <div key={index} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                            คนที่ {index + 1}: {name}
                          </div>
                        ))}
                        {editTeachers.length === 0 ? (
                          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-400 sm:col-span-3">ยังไม่มีครูประจำชั้น</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-500">รหัสนักเรียน</div>
                      <div className="mt-1 font-mono font-semibold text-slate-950">{student.student_code}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500">เลขบัตรประชาชน</div>
                      <div className="mt-1 font-mono font-semibold text-slate-950">{student.citizen_id || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500">คำนำหน้า</div>
                      <div className="mt-1 font-semibold text-slate-950">{student.title || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500">ชื่อ-นามสกุล</div>
                      <div className="mt-1 font-semibold text-slate-950">{student.first_name} {student.last_name}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500">เพศ</div>
                      <div className="mt-1 font-semibold text-slate-950">{student.gender || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500">สถานะ</div>
                      <div className="mt-1 font-semibold text-slate-950">{studentStatusLabel(student.status)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500">เลขที่</div>
                      <div className="mt-1 font-semibold text-slate-950">{selectedEnrollment.student_number ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500">ชั้นเรียน/ห้องเรียนปัจจุบัน</div>
                      <div className="mt-1 font-semibold text-slate-950">{classroom?.name ?? selectedEnrollment.class_level_code}</div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="text-xs font-semibold text-slate-500">ครูประจำชั้น</div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        {[0, 1, 2].map((index) => (
                          <div key={index} className="rounded-lg bg-slate-50 px-3 py-2">
                            <div className="text-[11px] font-semibold text-slate-500">คนที่ {index + 1}</div>
                            <div className="mt-1 font-semibold text-slate-900">{teachers[index] || '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  {editingStudent ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setStudentEditForm(enrollmentToStudentEditForm(selectedEnrollment));
                          setEditingStudent(false);
                        }}
                        className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        disabled={savingStudentEdit}
                        className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
                      >
                        {savingStudentEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        บันทึก
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={closeStudentDetails}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                      >
                        ปิด
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingStudent(true)}
                        className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
                      >
                        <Edit3 className="mr-2 h-4 w-4" />
                        แก้ไขข้อมูล
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>
        ), document.body);
      })()}

      {confirmDialog && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">{confirmDialog.title}</h3>
            <p className="mb-6 whitespace-pre-line text-sm leading-6 text-slate-500">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                disabled={confirmBusy}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-60"
              >
                {confirmDialog.cancelLabel ?? 'ยกเลิก'}
              </button>
              <button
                type="button"
                onClick={() => void runConfirmDialog()}
                disabled={confirmBusy}
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-700 py-2.5 font-bold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {confirmBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">เพิ่มนักเรียน</h3>
                <p className="text-sm text-slate-500 mt-1">เลือกวิธีเพิ่มข้อมูลนักเรียนเข้าสู่ปีการศึกษานี้</p>
              </div>
              <button type="button" onClick={resetAddModal} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {addMode === 'menu' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={openSingleForm}
                  className="text-left rounded-2xl border border-slate-200 p-5 hover:border-blue-200 hover:bg-blue-50/40 transition-colors"
                >
                  <UserPlus className="w-6 h-6 text-blue-700 mb-3" />
                  <div className="font-bold text-slate-900">เพิ่มทีละคน</div>
                  <div className="text-sm text-slate-500 mt-1">กรอกข้อมูลนักเรียนและเลือกห้องเรียนทันที</div>
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode('bulk')}
                  className="text-left rounded-2xl border border-slate-200 p-5 hover:border-blue-200 hover:bg-blue-50/40 transition-colors"
                >
                  <FileSpreadsheet className="w-6 h-6 text-blue-700 mb-3" />
                  <div className="font-bold text-slate-900">เพิ่มทีละหลายคน</div>
                  <div className="text-sm text-slate-500 mt-1">ดาวน์โหลดเทมเพลต หรืออัปโหลดไฟล์รายชื่อนักเรียน</div>
                </button>
              </div>
            )}

            {addMode === 'single' && (
              <form onSubmit={handleAddSingleStudent} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">รหัสนักเรียน</label>
                    <input
                      type="text"
                      value={singleForm.studentCode}
                      onChange={(e) => setSingleForm((form) => ({ ...form, studentCode: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">เลขบัตรประชาชน</label>
                    <input
                      type="text"
                      value={singleForm.citizenId}
                      onChange={(e) => setSingleForm((form) => ({ ...form, citizenId: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">คำนำหน้า</label>
                    <input
                      type="text"
                      value={singleForm.title}
                      onChange={(e) => setSingleForm((form) => ({ ...form, title: e.target.value }))}
                      placeholder="เด็กชาย / เด็กหญิง / นาย / นางสาว"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">เพศ</label>
                    <select
                      value={singleForm.gender}
                      onChange={(e) => setSingleForm((form) => ({ ...form, gender: e.target.value as GenderInput }))}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white"
                    >
                      <option value="">ไม่ระบุ</option>
                      <option value="ชาย">ชาย</option>
                      <option value="หญิง">หญิง</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ</label>
                    <input
                      type="text"
                      value={singleForm.firstName}
                      onChange={(e) => setSingleForm((form) => ({ ...form, firstName: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">นามสกุล</label>
                    <input
                      type="text"
                      value={singleForm.lastName}
                      onChange={(e) => setSingleForm((form) => ({ ...form, lastName: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ห้องเรียน</label>
                    <select
                      value={singleForm.classroomId}
                      onChange={(e) => setSingleForm((form) => ({ ...form, classroomId: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white"
                      required
                    >
                      <option value="">— เลือกห้อง —</option>
                      {classrooms.map((classroom) => (
                        <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">เลขที่</label>
                    <input
                      type="number"
                      min={1}
                      value={singleForm.studentNumber}
                      onChange={(e) => setSingleForm((form) => ({ ...form, studentNumber: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddMode('menu')}
                    className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    กลับ
                  </button>
                  <button
                    type="submit"
                    disabled={savingSingle}
                    className="btn btn-primary flex-1"
                  >
                    {savingSingle ? 'กำลังบันทึก...' : 'บันทึกนักเรียน'}
                  </button>
                </div>
              </form>
            )}

            {addMode === 'bulk' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 p-5">
                  <div className="font-bold text-slate-900">เพิ่มทีละหลายคน</div>
                  <p className="text-sm text-slate-500 mt-1">
                    รองรับไฟล์เทมเพลต และไฟล์รายชื่อปี 2569 แบบแยกชีตตามชั้นเรียน
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => void handleDownloadTemplate()}
                      className="inline-flex items-center justify-center px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      ดาวน์โหลดเทมเพลต
                    </button>
                    <label className="btn btn-primary cursor-pointer">
                      <FileUp className="w-4 h-4 mr-2" />
                      {importing ? 'กำลังนำเข้า...' : 'นำเข้า Excel'}
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        disabled={importing}
                        onChange={(e) => void handleFileImport(e)}
                      />
                    </label>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAddMode('menu')}
                  className="w-full py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  กลับ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
