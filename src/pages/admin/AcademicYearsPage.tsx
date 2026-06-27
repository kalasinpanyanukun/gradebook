import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, Check, Loader2, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatThaiDate, yearBeToDates } from '../../lib/academicYear';
import type { AcademicYear, AppUser, Semester } from '../../types';

interface AcademicYearsPageProps {
  currentUser: AppUser;
}

interface YearWithSemesters extends AcademicYear {
  semesters: Semester[];
}

export const AcademicYearsPage: React.FC<AcademicYearsPageProps> = ({ currentUser }) => {
  const [years, setYears] = useState<YearWithSemesters[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newYearBe, setNewYearBe] = useState(String(new Date().getFullYear() + 543));
  const [creating, setCreating] = useState(false);

  const loadYears = useCallback(async () => {
    if (!currentUser.schoolId) return;
    setLoading(true);
    setError('');
    try {
      const { data: yearData, error: yearError } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', currentUser.schoolId)
        .order('year_be', { ascending: false });

      if (yearError) throw yearError;

      const withSemesters: YearWithSemesters[] = [];
      for (const year of yearData ?? []) {
        const { data: semesters } = await supabase
          .from('semesters')
          .select('*')
          .eq('academic_year_id', year.id)
          .order('semester_number');
        withSemesters.push({ ...year, semesters: semesters ?? [] });
      }
      setYears(withSemesters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดปีการศึกษาไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [currentUser.schoolId]);

  useEffect(() => {
    void loadYears();
  }, [loadYears]);

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.schoolId) return;

    const yearBe = parseInt(newYearBe, 10);
    if (!Number.isFinite(yearBe) || yearBe < 2500 || yearBe > 2700) {
      setError('กรุณาใส่ปี พ.ศ. ที่ถูกต้อง');
      return;
    }

    setCreating(true);
    setError('');
    const dates = yearBeToDates(yearBe);

    try {
      const { data: year, error: yearError } = await supabase
        .from('academic_years')
        .insert({
          school_id: currentUser.schoolId,
          year_be: yearBe,
          start_date: dates.start_date,
          end_date: dates.end_date,
          term_open_date: dates.term_open_date,
          is_active: false,
        })
        .select()
        .single();

      if (yearError) throw yearError;

      const { error: semError } = await supabase.from('semesters').insert([
        {
          academic_year_id: year.id,
          semester_number: 1,
          start_date: dates.semester1_start,
          end_date: dates.semester1_end,
          is_active: false,
        },
        {
          academic_year_id: year.id,
          semester_number: 2,
          start_date: dates.semester2_start,
          end_date: dates.semester2_end,
          is_active: false,
        },
      ]);

      if (semError) throw semError;
      await loadYears();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สร้างปีการศึกษาไม่สำเร็จ');
    } finally {
      setCreating(false);
    }
  };

  const activateYear = async (yearId: string) => {
    if (!currentUser.schoolId) return;
    setError('');
    const { error: deactivateError } = await supabase
      .from('academic_years')
      .update({ is_active: false })
      .eq('school_id', currentUser.schoolId);

    if (deactivateError) {
      setError(deactivateError.message);
      return;
    }

    const { error } = await supabase
      .from('academic_years')
      .update({ is_active: true })
      .eq('id', yearId);

    if (error) setError(error.message);
    else await loadYears();
  };

  const activateSemester = async (semesterId: string, yearId: string) => {
    setError('');
    await supabase
      .from('semesters')
      .update({ is_active: false })
      .eq('academic_year_id', yearId);

    const { error } = await supabase
      .from('semesters')
      .update({ is_active: true })
      .eq('id', semesterId);

    if (error) setError(error.message);
    else await loadYears();
  };

  const previewDates = yearBeToDates(parseInt(newYearBe, 10) || 2568);

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-[22px] font-extrabold tracking-tight text-slate-900">ปีการศึกษา & ภาคเรียน</h4>
        <p className="text-sm text-slate-500 mt-1">สร้างปีการศึกษา พ.ศ. และเปิดใช้งานปี/ภาคเรียนปัจจุบัน</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm">{error}</div>
      )}

      <form onSubmit={handleCreateYear} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        <h5 className="font-bold text-slate-800 flex items-center gap-2">
          <Plus className="w-4 h-4" /> สร้างปีการศึกษาใหม่
        </h5>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">ปีการศึกษา (พ.ศ.)</label>
            <input
              type="number"
              value={newYearBe}
              onChange={(e) => setNewYearBe(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              min={2500}
              max={2700}
              required
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="btn btn-primary"
          >
            {creating ? 'กำลังสร้าง...' : 'สร้างปี + 2 ภาคเรียน'}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          วันที่อัตโนมัติ: เปิดปี {formatThaiDate(previewDates.start_date)} – {formatThaiDate(previewDates.end_date)}
          {' · '}เปิดเทอม {formatThaiDate(previewDates.term_open_date)}
        </p>
      </form>

      <div className="ui-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="w-6 h-6 mr-2 animate-spin" /> กำลังโหลด...
          </div>
        ) : years.length === 0 ? (
          <div className="text-center py-16 text-slate-400">ยังไม่มีปีการศึกษา — สร้างปีแรกด้านบน</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {years.map((year) => (
              <div key={year.id} className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="font-bold text-slate-900 text-lg">
                        ปีการศึกษา {year.year_be}
                        {year.is_active && (
                          <span className="ml-2 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg">
                            ปีปัจจุบัน
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {formatThaiDate(year.start_date)} – {formatThaiDate(year.end_date)}
                        {year.term_open_date && ` · เปิดเทอม ${formatThaiDate(year.term_open_date)}`}
                      </div>
                    </div>
                  </div>
                  {!year.is_active && (
                    <button
                      type="button"
                      onClick={() => void activateYear(year.id)}
                      className="inline-flex items-center px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl"
                    >
                      <Check className="w-4 h-4 mr-1.5" /> ตั้งเป็นปีปัจจุบัน
                    </button>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {year.semesters.map((sem) => (
                    <div
                      key={sem.id}
                      className={`rounded-xl border p-4 ${sem.is_active ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-800">ภาคเรียนที่ {sem.semester_number}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {formatThaiDate(sem.start_date)} – {formatThaiDate(sem.end_date)}
                          </div>
                        </div>
                        {sem.is_active ? (
                          <span className="text-xs font-bold text-emerald-700">เปิดอยู่</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void activateSemester(sem.id, year.id)}
                            className="text-xs font-bold text-blue-600 hover:underline"
                          >
                            เปิดภาคนี้
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
