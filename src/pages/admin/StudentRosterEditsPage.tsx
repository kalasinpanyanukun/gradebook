import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AppUser, Semester } from '../../types';

interface StudentRosterEditsPageProps {
  currentUser: AppUser;
  initialYearId?: string;
}

interface GradebookRosterRow {
  id: string;
  teaching_assignment_id: string;
  teacher_id: string;
  students: unknown;
  updated_at: string | null;
  created_at: string | null;
}

interface AssignmentRosterRow {
  id: string;
  teacher_id: string;
  semester_id: string;
  profiles?: {
    full_name: string;
    title: string | null;
    username: string | null;
  } | null;
  subjects?: {
    subject_code: string;
    subject_name: string;
    learning_area: string;
  } | null;
  classrooms?: {
    name: string;
    class_level_code: string;
  } | null;
}

interface RosterStudent {
  id: string;
  studentId: string;
  citizenId: string;
  name: string;
  targetPercentage: number | null;
}

interface RosterReport {
  gradebookId: string;
  teacherName: string;
  subjectCode: string;
  subjectName: string;
  learningArea: string;
  classroomName: string;
  semesterNumber: number | null;
  updatedAt: string | null;
  students: RosterStudent[];
}

function normalizeStudents(value: unknown): RosterStudent[] {
  if (!Array.isArray(value)) return [];

  return value.map((student, index) => {
    const row = (student ?? {}) as Record<string, unknown>;
    const composedName = [
      row.title,
      row.firstName ?? row.first_name,
      row.lastName ?? row.last_name,
    ]
      .filter(Boolean)
      .join(' ');

    return {
      id: String(row.id ?? index),
      studentId: String(row.studentId ?? row.student_code ?? row.code ?? ''),
      citizenId: String(row.citizenId ?? row.citizen_id ?? ''),
      name: String(row.name ?? row.fullName ?? row.full_name ?? composedName ?? ''),
      targetPercentage:
        typeof row.targetPercentage === 'number'
          ? row.targetPercentage
          : typeof row.target_percentage === 'number'
            ? row.target_percentage
            : null,
    };
  });
}

function profileName(profile: AssignmentRosterRow['profiles']): string {
  if (!profile) return 'ไม่พบชื่อครู';
  return [profile.title, profile.full_name].filter(Boolean).join(' ');
}

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const StudentRosterEditsPage: React.FC<StudentRosterEditsPageProps> = ({
  currentUser,
  initialYearId,
}) => {
  const [reports, setReports] = useState<RosterReport[]>([]);
  const [yearLabel, setYearLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

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
        setYearLabel('');
        return;
      }

      const { data: semesterRows, error: semesterError } = await supabase
        .from('semesters')
        .select('*')
        .eq('academic_year_id', targetYearId)
        .order('semester_number');

      if (semesterError) throw semesterError;
      const semesters = (semesterRows ?? []) as Semester[];
      const semesterIds = semesters.map((semester) => semester.id);

      if (semesterIds.length === 0) {
        setReports([]);
        setYearLabel(targetYearLabel);
        return;
      }

      const { data: assignmentRows, error: assignmentError } = await supabase
        .from('teaching_assignments')
        .select(`
          id,
          teacher_id,
          semester_id,
          profiles:teacher_id(full_name, title, username),
          subjects:subject_id(subject_code, subject_name, learning_area),
          classrooms:classroom_id(name, class_level_code)
        `)
        .eq('school_id', currentUser.schoolId)
        .in('semester_id', semesterIds)
        .order('created_at', { ascending: false });

      if (assignmentError) throw assignmentError;

      const assignments = (assignmentRows ?? []) as unknown as AssignmentRosterRow[];
      const assignmentIds = assignments.map((assignment) => assignment.id);

      if (assignmentIds.length === 0) {
        setReports([]);
        setYearLabel(targetYearLabel);
        return;
      }

      const { data: gradebookRows, error: gradebookError } = await supabase
        .from('gradebooks')
        .select('id, teaching_assignment_id, teacher_id, students, updated_at, created_at')
        .in('teaching_assignment_id', assignmentIds)
        .order('updated_at', { ascending: false });

      if (gradebookError) throw gradebookError;

      const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]));
      const mapped = ((gradebookRows ?? []) as GradebookRosterRow[])
        .flatMap((gradebook): RosterReport[] => {
          const assignment = assignmentById.get(gradebook.teaching_assignment_id);
          if (!assignment) return [];
          const semester = semesters.find((item) => item.id === assignment.semester_id);
          return [
            {
              gradebookId: gradebook.id,
              teacherName: profileName(assignment.profiles),
              subjectCode: assignment.subjects?.subject_code ?? '',
              subjectName: assignment.subjects?.subject_name ?? 'ไม่พบรายวิชา',
              learningArea: assignment.subjects?.learning_area ?? 'ไม่ระบุกลุ่มสาระ',
              classroomName: assignment.classrooms?.name ?? 'ไม่พบห้องเรียน',
              semesterNumber: semester?.semester_number ?? null,
              updatedAt: gradebook.updated_at ?? gradebook.created_at,
              students: normalizeStudents(gradebook.students),
            },
          ];
        });

      setReports(mapped);
      setYearLabel(targetYearLabel);
    } catch (err) {
      console.warn('Unable to load student roster edits.', err);
      setReports([]);
      setError('โหลดข้อมูลการแก้ไขรายชื่อนักเรียนไม่สำเร็จ กรุณารีเฟรชหน้าเว็บแล้วลองใหม่');
    } finally {
      setLoading(false);
    }
  }, [currentUser.schoolId, initialYearId]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const visibleReports = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return reports;

    return reports.filter((report) => {
      const haystack = [
        report.teacherName,
        report.subjectCode,
        report.subjectName,
        report.learningArea,
        report.classroomName,
        ...report.students.flatMap((student) => [
          student.studentId,
          student.citizenId,
          student.name,
        ]),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [query, reports]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-blue-600">
            <Users className="h-5 w-5" />
            <span className="text-xs font-extrabold uppercase tracking-[0.16em]">
              รายชื่อนักเรียนในสมุด ปพ.5
            </span>
          </div>
          <h4 className="mt-2 text-[22px] font-extrabold tracking-tight text-slate-900">
            การแก้ไขข้อมูลนักเรียน
          </h4>
          <p className="mt-1 text-sm text-slate-500">
            แสดงรายชื่อนักเรียนที่ถูกบันทึกไว้ในสมุด ปพ.5 ของครู ปีการศึกษา {yearLabel || '—'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadReports()}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          รีเฟรช
        </button>
      </div>

      <div className="ui-card p-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาครู วิชา ห้องเรียน หรือชื่อนักเรียน"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          กำลังโหลด...
        </div>
      ) : visibleReports.length === 0 ? (
        <div className="ui-card p-10 text-center text-sm text-slate-500">
          ยังไม่พบข้อมูลรายชื่อนักเรียนในสมุด ปพ.5
        </div>
      ) : (
        <div className="space-y-4">
          {visibleReports.map((report) => (
            <section key={report.gradebookId} className="ui-card overflow-hidden">
              <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h5 className="text-base font-extrabold text-slate-900">
                    {report.subjectCode} {report.subjectName}
                  </h5>
                  <p className="mt-1 text-sm text-slate-500">
                    {report.classroomName} · ภาคเรียนที่ {report.semesterNumber ?? '—'} · ครูผู้สอน {report.teacherName}
                  </p>
                </div>
                <div className="text-sm font-semibold text-slate-600">
                  {report.students.length.toLocaleString('th-TH')} คน · แก้ไขล่าสุด {formatDateTime(report.updatedAt)}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-900 text-xs font-bold text-white">
                    <tr>
                      <th className="w-16 px-4 py-3 text-center">ลำดับ</th>
                      <th className="px-4 py-3">เลขประจำตัว</th>
                      <th className="px-4 py-3">เลขประจำตัวประชาชน</th>
                      <th className="px-4 py-3">ชื่อ-สกุล</th>
                      <th className="w-36 px-4 py-3 text-center">เป้าหมายเวลาเรียน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.students.map((student, index) => (
                      <tr key={`${report.gradebookId}-${student.id}-${index}`} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-4 py-3 text-center">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{student.studentId || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{student.citizenId || '—'}</td>
                        <td className="px-4 py-3 text-slate-800">{student.name || '—'}</td>
                        <td className="px-4 py-3 text-center text-slate-600">
                          {student.targetPercentage == null ? '—' : `${student.targetPercentage}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
