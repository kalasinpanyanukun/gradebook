import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Plus, Trash2, X } from 'lucide-react';
import {
  CURRICULUM_GRADE_LEVELS,
  CURRICULUM_SUBJECT_CATALOG,
  getCurriculumLearningAreas,
  getCurriculumRecords,
  getCurriculumSubjectOptions,
  type CurriculumGradeLevel,
  type CurriculumIndicatorRecord,
} from '../../data/curriculum';
import { FilterBar, FilterClearButton, FilterSearch, FilterSelect } from '../../components/FilterBar';
import { CurriculumIndicatorTable } from '../../components/curriculum/CurriculumIndicatorTable';
import {
  applyCurriculumStoreToBase,
  createCurriculumIndicatorId,
  deleteCurriculumIndicator,
  getVisibleCustomCurriculumRecords,
  hideCurriculumIndicatorIds,
  saveCurriculumIndicator,
} from '../../lib/curriculumIndicatorStore';

function readInitialLearningArea(): string {
  const area = new URLSearchParams(window.location.search).get('area');
  if (!area) return 'ภาษาไทย';

  const exact = CURRICULUM_SUBJECT_CATALOG.find(
    (item) => item.learningArea === area || item.id === area,
  );
  if (exact) return exact.learningArea;

  const normalized = decodeURIComponent(area).trim();
  const fuzzy = CURRICULUM_SUBJECT_CATALOG.find(
    (item) =>
      item.learningArea.includes(normalized) ||
      item.id === normalized ||
      normalized.includes(item.learningArea),
  );
  return fuzzy?.learningArea ?? 'ภาษาไทย';
}

interface IndicatorFormState {
  gradeLevel: CurriculumGradeLevel;
  strandNo: string;
  strandName: string;
  standardCode: string;
  standardDescription: string;
  midwayIndicator: string;
  exitIndicator: string;
}

function emptyForm(gradeLevel: CurriculumGradeLevel = 'ป.1'): IndicatorFormState {
  return {
    gradeLevel,
    strandNo: '',
    strandName: '',
    standardCode: '',
    standardDescription: '',
    midwayIndicator: '',
    exitIndicator: '',
  };
}

function formFromRecord(record: CurriculumIndicatorRecord): IndicatorFormState {
  return {
    gradeLevel: record.gradeLevel,
    strandNo: String(record.strandNo),
    strandName: record.strandName,
    standardCode: record.standardCode,
    standardDescription: record.standardDescription,
    midwayIndicator: record.midwayIndicator ?? '',
    exitIndicator: record.exitIndicator ?? '',
  };
}

function resolveSubjectName(
  filterArea: string,
  filterSubject: string,
  subjectOptions: string[],
): string {
  if (filterSubject !== 'all') return filterSubject;
  if (subjectOptions.length === 1) return subjectOptions[0];
  return filterArea;
}

function recordFromForm(
  form: IndicatorFormState,
  context: {
    id: string;
    learningArea: string;
    subject: string;
  },
): CurriculumIndicatorRecord | null {
  const strandNo = Number.parseInt(form.strandNo.trim(), 10);
  if (!Number.isFinite(strandNo) || strandNo <= 0) return null;
  if (!form.strandName.trim() || !form.standardCode.trim() || !form.standardDescription.trim()) return null;

  return {
    id: context.id,
    learningArea: context.learningArea,
    subject: context.subject,
    gradeLevel: form.gradeLevel,
    strandNo,
    strandName: form.strandName.trim(),
    standardCode: form.standardCode.trim(),
    standardDescription: form.standardDescription.trim(),
    midwayIndicator: form.midwayIndicator.trim() || null,
    exitIndicator: form.exitIndicator.trim() || null,
  };
}

function matchesCurriculumFilters(
  row: CurriculumIndicatorRecord,
  filters: {
    learningArea: string;
    subject?: string;
    gradeLevel?: string;
    search?: string;
  },
): boolean {
  if (row.learningArea !== filters.learningArea) return false;
  if (filters.subject && row.subject !== filters.subject) return false;
  if (filters.gradeLevel && filters.gradeLevel !== 'all' && row.gradeLevel !== filters.gradeLevel) return false;
  const keyword = filters.search?.trim().toLowerCase();
  if (!keyword) return true;
  return [
    row.subject,
    row.standardCode,
    row.standardDescription,
    row.strandName,
    row.midwayIndicator,
    row.exitIndicator,
    row.learningAreaNote,
    String(row.strandNo),
    row.gradeLevel,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(keyword);
}

interface CurriculumIndicatorsPageProps {
  readOnly?: boolean;
}

export const CurriculumIndicatorsPage: React.FC<CurriculumIndicatorsPageProps> = ({ readOnly = false }) => {
  const [filterArea, setFilterArea] = useState(readInitialLearningArea);
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [storeRevision, setStoreRevision] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleteMode, setBulkDeleteMode] = useState<'selected' | 'all-filtered' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CurriculumIndicatorRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<CurriculumIndicatorRecord | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [form, setForm] = useState<IndicatorFormState>(() => emptyForm());
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const bumpStore = () => setStoreRevision((value) => value + 1);

  const subjectOptions = useMemo(
    () => getCurriculumSubjectOptions(filterArea, filterGrade),
    [filterArea, filterGrade],
  );

  useEffect(() => {
    if (filterSubject !== 'all' && !subjectOptions.includes(filterSubject)) {
      setFilterSubject('all');
    }
  }, [filterSubject, subjectOptions]);

  const filteredRows = useMemo(() => {
    void storeRevision;
    const filterContext = {
      learningArea: filterArea,
      subject: filterSubject !== 'all' ? filterSubject : undefined,
      gradeLevel: filterGrade,
      search: filterSearch,
    };
    const base = applyCurriculumStoreToBase(getCurriculumRecords({
      learningArea: filterArea,
      subject: filterContext.subject,
      gradeLevel: filterGrade,
      search: filterSearch,
    }));
    const custom = getVisibleCustomCurriculumRecords().filter((row) => matchesCurriculumFilters(row, filterContext));
    return [...base, ...custom];
  }, [filterArea, filterSubject, filterGrade, filterSearch, storeRevision]);

  useEffect(() => {
    setSelectedIds((current) => {
      const visibleIds = new Set(filteredRows.map((row) => row.id));
      const next = new Set([...current].filter((id) => visibleIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [filteredRows]);

  const hasActiveFilters =
    filterSubject !== 'all' || filterGrade !== 'all' || filterSearch.trim().length > 0;

  const clearFilters = () => {
    setFilterSubject('all');
    setFilterGrade('all');
    setFilterSearch('');
  };

  const handleAreaChange = (area: string) => {
    setFilterArea(area);
    clearFilters();
  };

  const selectedCount = selectedIds.size;
  const allFilteredSelected = filteredRows.length > 0 && filteredRows.every((row) => selectedIds.has(row.id));

  const toggleRowSelection = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allFilteredSelected) {
        filteredRows.forEach((row) => next.delete(row.id));
      } else {
        filteredRows.forEach((row) => next.add(row.id));
      }
      return next;
    });
  };

  const deleteRowsByIds = async (ids: string[]) => {
    if (ids.length === 0) {
      setBulkDeleteMode(null);
      return;
    }

    setDeleting(true);
    setMessage('');
    try {
      hideCurriculumIndicatorIds(ids);
      bumpStore();
      setSelectedIds(new Set());
      setBulkDeleteMode(null);
      setMessage(`ลบมาตรฐาน/ตัวชี้วัด ${ids.length.toLocaleString('th-TH')} รายการเรียบร้อยแล้ว`);
    } finally {
      setDeleting(false);
    }
  };

  const confirmBulkDelete = async () => {
    const ids = bulkDeleteMode === 'all-filtered'
      ? filteredRows.map((row) => row.id)
      : Array.from(selectedIds);
    await deleteRowsByIds(ids);
  };

  const confirmSingleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setMessage('');
    try {
      deleteCurriculumIndicator(deleteTarget.id);
      bumpStore();
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(deleteTarget.id);
        return next;
      });
      setDeleteTarget(null);
      setMessage(`ลบมาตรฐาน ${deleteTarget.standardCode} เรียบร้อยแล้ว`);
    } finally {
      setDeleting(false);
    }
  };

  const openAdd = () => {
    const defaultGrade = filterGrade !== 'all' ? filterGrade as CurriculumGradeLevel : 'ป.1';
    setEditingRecord(null);
    setForm(emptyForm(defaultGrade));
    setFormError('');
    setShowFormModal(true);
  };

  const openEdit = (record: CurriculumIndicatorRecord) => {
    setEditingRecord(record);
    setForm(formFromRecord(record));
    setFormError('');
    setShowFormModal(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    const subject = resolveSubjectName(filterArea, filterSubject, subjectOptions);
    const record = recordFromForm(form, {
      id: editingRecord?.id ?? createCurriculumIndicatorId(),
      learningArea: filterArea,
      subject,
    });

    if (!record) {
      setFormError('กรุณากรอก สาระที่ ชื่อสาระ มาตรฐาน และมาตรฐานการเรียนรู้ให้ครบ');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      saveCurriculumIndicator(record);
      bumpStore();
      setShowFormModal(false);
      setEditingRecord(null);
      setMessage(editingRecord ? 'บันทึกการแก้ไขตัวชี้วัดเรียบร้อยแล้ว' : 'เพิ่มตัวชี้วัดเรียบร้อยแล้ว');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-[22px] font-extrabold tracking-tight text-slate-900">หลักสูตรและตัวชี้วัด</h4>
          <p className="mt-1 text-sm text-slate-500">มาตรฐานและตัวชี้วัดรายวิชา</p>
        </div>
        {!readOnly && (
          <button type="button" onClick={openAdd} className="btn btn-primary w-fit">
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มตัวชี้วัด
          </button>
        )}
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
          {message}
        </div>
      )}

      <FilterBar fill>
        <FilterSearch
          value={filterSearch}
          onChange={setFilterSearch}
          placeholder="ค้นหามาตรฐาน สาระ หรือตัวชี้วัด"
        />
        <FilterSelect label="กลุ่มสาระการเรียนรู้" value={filterArea} onChange={handleAreaChange}>
          {getCurriculumLearningAreas().map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="ชื่อรายวิชา" value={filterSubject} onChange={setFilterSubject}>
          <option value="all">ทั้งหมด</option>
          {subjectOptions.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect label="ระดับชั้น" value={filterGrade} onChange={setFilterGrade}>
          <option value="all">ทั้งหมด</option>
          {CURRICULUM_GRADE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </FilterSelect>
        <FilterClearButton onClick={clearFilters} disabled={!hasActiveFilters} />
      </FilterBar>

      <div className="min-h-[calc(100vh-148px)] ui-card overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 text-sm text-slate-500">
          <span>
            แสดง {filteredRows.length.toLocaleString('th-TH')} รายการ
            {filterGrade !== 'all' ? ` · ${filterGrade}` : ''}
          </span>
          {!readOnly && selectedCount > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">
                เลือกแล้ว {selectedCount.toLocaleString('th-TH')} / {filteredRows.length.toLocaleString('th-TH')} รายการ
              </span>
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
                disabled={deleting || filteredRows.length === 0}
                className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                ลบทั้งหมด
              </button>
            </div>
          ) : null}
        </div>
        <div className="max-h-[calc(100vh-118px)] overflow-auto">
          <CurriculumIndicatorTable
            rows={filteredRows}
            selectedIds={selectedIds}
            allSelected={allFilteredSelected}
            onToggleRow={toggleRowSelection}
            onToggleAll={toggleAllFiltered}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            readOnly={readOnly}
          />
        </div>
      </div>

      {showFormModal && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingRecord ? 'แก้ไขตัวชี้วัด' : 'เพิ่มตัวชี้วัด'}
              </h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 transition hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                {formError}
              </div>
            )}

            <form onSubmit={(event) => void handleSave(event)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">ระดับชั้น</label>
                  <select
                    value={form.gradeLevel}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      gradeLevel: event.target.value as CurriculumGradeLevel,
                    }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                    required
                  >
                    {CURRICULUM_GRADE_LEVELS.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">มาตรฐาน</label>
                  <input
                    type="text"
                    value={form.standardCode}
                    onChange={(event) => setForm((current) => ({ ...current, standardCode: event.target.value }))}
                    placeholder="เช่น ท 1.1"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">สาระที่ (ลำดับ)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.strandNo}
                    onChange={(event) => setForm((current) => ({ ...current, strandNo: event.target.value }))}
                    placeholder="เช่น 1"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">ชื่อสาระ</label>
                  <input
                    type="text"
                    value={form.strandName}
                    onChange={(event) => setForm((current) => ({ ...current, strandName: event.target.value }))}
                    placeholder="เช่น การอ่าน"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">มาตรฐานการเรียนรู้</label>
                <textarea
                  value={form.standardDescription}
                  onChange={(event) => setForm((current) => ({ ...current, standardDescription: event.target.value }))}
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">ตัวชี้วัดระหว่างทาง</label>
                <textarea
                  value={form.midwayIndicator}
                  onChange={(event) => setForm((current) => ({ ...current, midwayIndicator: event.target.value }))}
                  rows={3}
                  placeholder="เช่น ท 2.1 ป.1/1 ..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">ตัวชี้วัดปลายทาง</label>
                <textarea
                  value={form.exitIndicator}
                  onChange={(event) => setForm((current) => ({ ...current, exitIndicator: event.target.value }))}
                  rows={3}
                  placeholder="เช่น ท 1.1 ป.1/1 ..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary flex-1"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">ยืนยันการลบตัวชี้วัด</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              ต้องการลบมาตรฐาน {deleteTarget.standardCode} ({deleteTarget.gradeLevel}) ใช่หรือไม่
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => void confirmSingleDelete()}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteMode && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {bulkDeleteMode === 'all-filtered' ? 'ยืนยันการลบทั้งหมด' : 'ยืนยันการลบรายการที่เลือก'}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {bulkDeleteMode === 'all-filtered'
                ? `ต้องการลบมาตรฐาน/ตัวชี้วัดทั้งหมดในตารางนี้ ${filteredRows.length.toLocaleString('th-TH')} รายการ ใช่หรือไม่`
                : `ต้องการลบมาตรฐาน/ตัวชี้วัดที่เลือก ${selectedCount.toLocaleString('th-TH')} รายการ ใช่หรือไม่`}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setBulkDeleteMode(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => void confirmBulkDelete()}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
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
