import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, Database, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LEARNING_AREAS } from '../../lib/learningAreas';
import { SUBJECTS_CATALOG, type SubjectCatalogItem } from '../../data/subjectsCatalog';
import { FilterBar, FilterClearButton, FilterSearch, FilterSelect } from '../../components/FilterBar';
import type { AppUser, Subject } from '../../types';

interface SubjectsPageProps {
  currentUser: AppUser;
}

interface SubjectForm {
  subject_code: string;
  subject_name: string;
  learning_area: string;
  default_class_level: string;
  subject_type: Subject['subject_type'];
  credits: number | null;
  hours_total: number | null;
  hours_per_week: number | null;
  semester_number: 1 | 2 | null;
  is_active: boolean;
}

const emptyForm = (): SubjectForm => ({
  subject_code: '',
  subject_name: '',
  learning_area: LEARNING_AREAS[0],
  default_class_level: '',
  subject_type: 'พื้นฐาน',
  credits: null,
  hours_total: null,
  hours_per_week: null,
  semester_number: null,
  is_active: true,
});

const catalogByCode = new Map<string, SubjectCatalogItem>(
  SUBJECTS_CATALOG.map((item) => [item.subject_code, item]),
);

function levelLabel(item: Pick<SubjectCatalogItem, 'default_class_level' | 'semester_number'>): string {
  return item.semester_number
    ? `${item.default_class_level} ภาค ${item.semester_number}`
    : `${item.default_class_level} รายปี`;
}

function formFromCatalog(item: SubjectCatalogItem): SubjectForm {
  return {
    subject_code: item.subject_code,
    subject_name: item.subject_name,
    learning_area: item.learning_area,
    default_class_level: item.default_class_level,
    subject_type: item.subject_type,
    credits: item.credits,
    hours_total: item.hours_total,
    hours_per_week: item.hours_per_week,
    semester_number: item.semester_number,
    is_active: item.is_active,
  };
}

function isSchemaMismatch(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String((err as { message?: unknown } | null)?.message ?? err ?? '');
  return (
    message.includes('schema cache') ||
    message.includes('Could not find') ||
    message.includes('column') ||
    message.includes('unique or exclusion constraint') ||
    message.includes('PGRST204')
  );
}

function baseSubjectPayload(item: SubjectCatalogItem, schoolId: string) {
  return {
    school_id: schoolId,
    subject_code: item.subject_code,
    subject_name: item.subject_name,
    learning_area: item.learning_area,
    default_class_level: item.default_class_level,
  };
}

function fullSubjectPayload(item: SubjectCatalogItem, schoolId: string) {
  return {
    ...baseSubjectPayload(item, schoolId),
    subject_type: item.subject_type,
    credits: item.credits,
    hours_total: item.hours_total,
    hours_per_week: item.hours_per_week,
    semester_number: item.semester_number,
    is_active: item.is_active,
  };
}

function baseFormPayload(form: SubjectForm) {
  return {
    subject_code: form.subject_code.trim(),
    subject_name: form.subject_name.trim(),
    learning_area: form.learning_area,
    default_class_level: form.default_class_level || null,
  };
}

function fullFormPayload(form: SubjectForm) {
  return {
    ...baseFormPayload(form),
    subject_type: form.subject_type,
    credits: form.credits,
    hours_total: form.hours_total,
    hours_per_week: form.hours_per_week,
    semester_number: form.semester_number,
    is_active: form.is_active,
  };
}

export const SubjectsPage: React.FC<SubjectsPageProps> = ({ currentUser }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState<SubjectForm>(emptyForm());
  const [editing, setEditing] = useState<Subject | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importingCatalog, setImportingCatalog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [bulkDeleteMode, setBulkDeleteMode] = useState<'selected' | 'all-filtered' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [filterArea, setFilterArea] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterSemester, setFilterSemester] = useState('all');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(() => new Set());

  const loadData = useCallback(async () => {
    if (!currentUser.schoolId) return;
    setLoading(true);
    setError('');
    try {
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', currentUser.schoolId)
        .order('learning_area')
        .order('subject_code');

      if (subjectError) throw subjectError;
      setSubjects(subjectData ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดรายวิชาไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [currentUser.schoolId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setMessage('');
    setShowModal(true);
  };

  const openEdit = (subject: Subject) => {
    setEditing(subject);
    setForm({
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      learning_area: subject.learning_area,
      default_class_level: subject.default_class_level ?? '',
      subject_type: subject.subject_type ?? 'พื้นฐาน',
      credits: subject.credits ?? null,
      hours_total: subject.hours_total ?? null,
      hours_per_week: subject.hours_per_week ?? null,
      semester_number: subject.semester_number ?? null,
      is_active: subject.is_active ?? true,
    });
    setMessage('');
    setShowModal(true);
  };

  const selectCatalogSubject = (subjectCode: string) => {
    const item = catalogByCode.get(subjectCode);
    if (!item) {
      setForm((current) => ({ ...current, subject_code: subjectCode }));
      return;
    }
    setForm(formFromCatalog(item));
  };

  const updateFormLearningArea = (learningArea: string) => {
    setForm((current) => ({
      ...current,
      learning_area: learningArea,
      default_class_level: '',
      semester_number: null,
      subject_code: '',
      subject_name: '',
    }));
  };

  const updateFormLevel = (level: string) => {
    setForm((current) => ({
      ...current,
      default_class_level: level,
      subject_code: '',
      subject_name: '',
    }));
  };

  const updateFormSemester = (semester: string) => {
    setForm((current) => ({
      ...current,
      semester_number: semester === 'annual' ? null : Number(semester) as 1 | 2,
      subject_code: '',
      subject_name: '',
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.schoolId) return;

    setSaving(true);
    setError('');

    const basePayload = baseFormPayload(form);
    const fullPayload = fullFormPayload(form);

    try {
      if (editing) {
        const fullUpdate = await supabase
          .from('subjects')
          .update(fullPayload)
          .eq('id', editing.id);
        if (fullUpdate.error) {
          if (!isSchemaMismatch(fullUpdate.error)) throw fullUpdate.error;
          const { error: fallbackError } = await supabase
            .from('subjects')
            .update(basePayload)
            .eq('id', editing.id);
          if (fallbackError) throw fallbackError;
        }
      } else {
        const fullInsert = await supabase.from('subjects').insert({
          school_id: currentUser.schoolId,
          ...fullPayload,
        });
        if (fullInsert.error) {
          if (!isSchemaMismatch(fullInsert.error)) throw fullInsert.error;
          const { error: fallbackError } = await supabase.from('subjects').insert({
            school_id: currentUser.schoolId,
            ...basePayload,
          });
          if (fallbackError) throw fallbackError;
        }
      }

      setShowModal(false);
      setEditing(null);
      setMessage(editing ? 'แก้ไขรายวิชาเรียบร้อยแล้ว' : 'เพิ่มรายวิชาเรียบร้อยแล้ว');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const importAllSubjects = async () => {
    if (!currentUser.schoolId) return;
    setImportingCatalog(true);
    setError('');
    setMessage('');

    try {
      const fullRows = SUBJECTS_CATALOG.map((item) => fullSubjectPayload(item, currentUser.schoolId as string));
      const fullResult = await supabase
        .from('subjects')
        .upsert(fullRows, { onConflict: 'school_id,subject_code' });

      if (fullResult.error) {
        if (!isSchemaMismatch(fullResult.error)) throw fullResult.error;
        const baseRows = SUBJECTS_CATALOG.map((item) => baseSubjectPayload(item, currentUser.schoolId as string));
        const fallbackResult = await supabase
          .from('subjects')
          .upsert(baseRows, { onConflict: 'school_id,subject_code,default_class_level' });
        if (fallbackResult.error) throw fallbackResult.error;
      }

      setMessage(`เพิ่ม/อัปเดตรายวิชาตามหลักสูตรครบ ${SUBJECTS_CATALOG.length.toLocaleString('th-TH')} รายการแล้ว`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เพิ่มรายวิชาตามหลักสูตรไม่สำเร็จ');
    } finally {
      setImportingCatalog(false);
    }
  };

  const deleteSubject = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    setMessage('');

    try {
      const { error: deleteError } = await supabase
        .from('subjects')
        .delete()
        .eq('id', deleteTarget.id);
      if (deleteError) throw deleteError;
      setMessage(`ลบรายวิชา ${deleteTarget.subject_code} เรียบร้อยแล้ว`);
      setDeleteTarget(null);
      setSelectedSubjectIds((current) => {
        const next = new Set(current);
        next.delete(deleteTarget.id);
        return next;
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ลบรายวิชาไม่สำเร็จ');
    } finally {
      setDeleting(false);
    }
  };

  const subjectCatalog = (subject: Subject) => catalogByCode.get(subject.subject_code);

  const subjectSemesterValue = (subject: Subject) => {
    const semester = subject.semester_number ?? subjectCatalog(subject)?.semester_number ?? null;
    return semester === 1 || semester === 2 ? String(semester) : 'annual';
  };

  const subjectLevelValue = (subject: Subject) =>
    subject.default_class_level ?? subjectCatalog(subject)?.default_class_level ?? '';

  const filtered = subjects.filter((subject) => {
    const searchQuery = filterSearch.trim().toLowerCase();

    if (filterArea !== 'all' && subject.learning_area !== filterArea) return false;
    if (filterLevel !== 'all' && subjectLevelValue(subject) !== filterLevel) return false;
    if (filterSemester !== 'all' && subjectSemesterValue(subject) !== filterSemester) return false;
    if (searchQuery) {
      const haystack = `${subject.subject_code} ${subject.subject_name}`.toLowerCase();
      if (!haystack.includes(searchQuery)) return false;
    }
    return true;
  });

  const hasActiveFilters = filterSearch.trim() !== '' || filterArea !== 'all' || filterLevel !== 'all' || filterSemester !== 'all';

  const clearFilters = () => {
    setFilterSearch('');
    setFilterArea('all');
    setFilterLevel('all');
    setFilterSemester('all');
  };

  const filterLevelOptions = Array.from(
    new Set(
      subjects
        .map((subject) => subjectLevelValue(subject))
        .filter(Boolean),
    ),
  );

  const modalLevelOptions = Array.from(
    new Set(
      SUBJECTS_CATALOG
        .filter((item) => item.learning_area === form.learning_area)
        .map((item) => item.default_class_level),
    ),
  );

  const modalSubjectOptions = SUBJECTS_CATALOG.filter((item) => (
    item.learning_area === form.learning_area &&
    (!form.default_class_level || item.default_class_level === form.default_class_level) &&
    (form.semester_number == null ? item.semester_number == null : item.semester_number === form.semester_number)
  ));

  const selectedCount = selectedSubjectIds.size;
  const allFilteredSelected = filtered.length > 0 && filtered.every((subject) => selectedSubjectIds.has(subject.id));

  const toggleSubjectSelection = (subjectId: string) => {
    setSelectedSubjectIds((current) => {
      const next = new Set(current);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelectedSubjectIds((current) => {
      const next = new Set(current);
      if (allFilteredSelected) {
        filtered.forEach((subject) => next.delete(subject.id));
      } else {
        filtered.forEach((subject) => next.add(subject.id));
      }
      return next;
    });
  };

  const deleteSubjectsByIds = async (ids: string[]) => {
    if (ids.length === 0) {
      setBulkDeleteMode(null);
      return;
    }

    setDeleting(true);
    setError('');
    setMessage('');
    try {
      const { error: deleteError } = await supabase
        .from('subjects')
        .delete()
        .in('id', ids);
      if (deleteError) throw deleteError;
      setMessage(`ลบรายวิชา ${ids.length.toLocaleString('th-TH')} รายการเรียบร้อยแล้ว`);
      setSelectedSubjectIds(new Set());
      setBulkDeleteMode(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ลบรายวิชาไม่สำเร็จ');
    } finally {
      setDeleting(false);
    }
  };

  const deleteManySubjects = async () => {
    const ids = bulkDeleteMode === 'all-filtered'
      ? filtered.map((subject) => subject.id)
      : Array.from(selectedSubjectIds);
    await deleteSubjectsByIds(ids);
  };

  const semesterLabel = (subject: Subject) => {
    if (subject.semester_number === 1 || subject.semester_number === 2) return `ภาค ${subject.semester_number}`;
    const catalog = subjectCatalog(subject);
    if (catalog?.semester_number) return `ภาค ${catalog.semester_number}`;
    return 'รายปี';
  };

  const subjectHoursPerWeek = (subject: Subject) => {
    const catalog = subjectCatalog(subject);
    return subject.hours_per_week ?? catalog?.hours_per_week ?? null;
  };

  const subjectHoursTotal = (subject: Subject) => {
    const catalog = subjectCatalog(subject);
    return subject.hours_total ?? catalog?.hours_total ?? null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h4 className="text-[22px] font-extrabold tracking-tight text-slate-900">รายวิชา</h4>
          <p className="text-sm text-slate-500 mt-1">จัดการรหัสวิชา ชื่อวิชา และกลุ่มสาระการเรียนรู้</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => void importAllSubjects()}
            disabled={importingCatalog}
            className="btn btn-primary"
          >
            {importingCatalog ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
            เพิ่มทุกวิชาตามหลักสูตร
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" /> เพิ่มวิชา
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm">{error}</div>
      )}
      {message && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3 rounded-xl text-sm font-semibold">{message}</div>
      )}

      <FilterBar fill>
        <FilterSearch
          value={filterSearch}
          onChange={setFilterSearch}
          placeholder="ค้นหารหัสวิชา หรือ ชื่อวิชา"
        />
        <FilterSelect
          label="กลุ่มสาระ"
          value={filterArea}
          onChange={setFilterArea}
        >
          <option value="all">ทั้งหมด</option>
          {LEARNING_AREAS.map((area) => (
            <option key={area} value={area}>{area}</option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="ระดับชั้น"
          value={filterLevel}
          onChange={setFilterLevel}
        >
          <option value="all">ทั้งหมด</option>
          {filterLevelOptions.map((level) => (
            <option key={level} value={level}>{level}</option>
          ))}
        </FilterSelect>
        <FilterSelect
          label="ภาคเรียน"
          value={filterSemester}
          onChange={setFilterSemester}
        >
          <option value="all">ทั้งหมด</option>
          <option value="annual">รายปี</option>
          <option value="1">ภาค 1</option>
          <option value="2">ภาค 2</option>
        </FilterSelect>
        <FilterClearButton onClick={clearFilters} disabled={!hasActiveFilters} />
      </FilterBar>

      <div className="ui-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="w-6 h-6 mr-2 animate-spin" /> กำลังโหลด...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
            ยังไม่มีรายวิชา
          </div>
        ) : (
          <div className="space-y-3">
            {selectedCount > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3">
                <p className="text-xs font-semibold text-slate-500">
                  เลือกแล้ว {selectedCount.toLocaleString('th-TH')} / {filtered.length.toLocaleString('th-TH')} รายการ
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkDeleteMode('selected')}
                    disabled={deleting || selectedCount === 0}
                    className="inline-flex items-center rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    ลบที่เลือก
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkDeleteMode('all-filtered')}
                    disabled={deleting || filtered.length === 0}
                    className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    ลบทั้งหมด
                  </button>
                </div>
              </div>
            ) : null}
            <div className="overflow-x-auto">
            <table className="w-full min-w-[1320px] table-fixed border-collapse text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="w-14 px-3 py-3 text-center align-middle font-semibold">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAllFiltered}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      aria-label={allFilteredSelected ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
                    />
                  </th>
                  <th className="w-28 px-3 py-3 text-center align-middle font-semibold whitespace-nowrap">รหัสวิชา</th>
                  <th className="w-28 px-3 py-3 text-center align-middle font-semibold whitespace-nowrap">ภาคเรียนที่</th>
                  <th className="w-72 px-3 py-3 text-center align-middle font-semibold whitespace-nowrap">ชื่อวิชา</th>
                  <th className="w-64 px-3 py-3 text-center align-middle font-semibold whitespace-nowrap">กลุ่มสาระ</th>
                  <th className="w-28 px-3 py-3 text-center align-middle font-semibold whitespace-nowrap">ระดับชั้น</th>
                  <th className="w-32 px-3 py-3 text-center align-middle font-semibold whitespace-nowrap">ชม./สัปดาห์</th>
                  <th className="w-28 px-3 py-3 text-center align-middle font-semibold whitespace-nowrap">ชม./ภาค</th>
                  <th className="sticky right-0 z-40 w-40 bg-slate-50 px-3 py-3 text-center align-middle font-semibold whitespace-nowrap shadow-[-4px_0_8px_rgba(15,23,42,0.06)]">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="group transition-colors hover:bg-slate-50/70">
                    <td className="px-3 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedSubjectIds.has(s.id)}
                        onChange={() => toggleSubjectSelection(s.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        aria-label={`เลือกรายวิชา ${s.subject_code}`}
                      />
                    </td>
                    <td className="truncate px-3 py-3.5 text-center font-mono font-semibold text-slate-800">{s.subject_code}</td>
                    <td className="truncate px-3 py-3.5 text-center text-slate-600">{semesterLabel(s)}</td>
                    <td className="truncate px-3 py-3.5 text-center font-medium text-slate-900" title={s.subject_name}>{s.subject_name}</td>
                    <td className="truncate px-3 py-3.5 text-center text-slate-600" title={s.learning_area}>{s.learning_area}</td>
                    <td className="truncate px-3 py-3.5 text-center text-slate-600">{subjectLevelValue(s) || '—'}</td>
                    <td className="px-3 py-3.5 text-center text-slate-600">{subjectHoursPerWeek(s) ?? '—'}</td>
                    <td className="px-3 py-3.5 text-center text-slate-600">{subjectHoursTotal(s) ?? '—'}</td>
                    <td className="sticky right-0 z-20 bg-white px-3 py-4 text-center shadow-[-4px_0_8px_rgba(15,23,42,0.06)] group-hover:bg-slate-50/70">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" /> แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(s)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> ลบ
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

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                {editing ? 'แก้ไขวิชา' : 'เพิ่มวิชาใหม่'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">กลุ่มสาระการเรียนรู้</label>
                <select
                  value={form.learning_area}
                  onChange={(e) => updateFormLearningArea(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                >
                  {LEARNING_AREAS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ระดับชั้น</label>
                <select
                  value={form.default_class_level}
                  onChange={(e) => updateFormLevel(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                >
                  <option value="">— เลือกระดับชั้น —</option>
                  {modalLevelOptions.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ภาคเรียน</label>
                <select
                  value={form.semester_number == null ? 'annual' : String(form.semester_number)}
                  onChange={(e) => updateFormSemester(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl"
                >
                  <option value="annual">รายปี</option>
                  <option value="1">ภาค 1</option>
                  <option value="2">ภาค 2</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อและรหัสวิชา</label>
                <select
                  value={form.subject_code}
                  onChange={(e) => selectCatalogSubject(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white"
                  required
                >
                  <option value="">— เลือกชื่อ/รหัสวิชา —</option>
                  {form.subject_code && !catalogByCode.has(form.subject_code) && (
                    <option value={form.subject_code}>{form.subject_name || 'รายการเดิม'} · {form.subject_code}</option>
                  )}
                  {modalSubjectOptions.map((item) => (
                    <option key={item.subject_code} value={item.subject_code}>
                      {item.subject_name} · {item.subject_code} · {levelLabel(item)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[210] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">ยืนยันการลบรายวิชา</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              ต้องการลบรายวิชา {deleteTarget.subject_code} {deleteTarget.subject_name} ใช่หรือไม่
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => void deleteSubject()}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteMode && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[210] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {bulkDeleteMode === 'all-filtered' ? 'ยืนยันการลบทั้งหมด' : 'ยืนยันการลบรายการที่เลือก'}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {bulkDeleteMode === 'all-filtered'
                ? `ต้องการลบรายวิชาทั้งหมดในตารางนี้ ${filtered.length.toLocaleString('th-TH')} รายการ ใช่หรือไม่`
                : `ต้องการลบรายวิชาที่เลือก ${selectedCount.toLocaleString('th-TH')} รายการ ใช่หรือไม่`}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setBulkDeleteMode(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => void deleteManySubjects()}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
