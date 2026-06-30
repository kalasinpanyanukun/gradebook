import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  FileSpreadsheet,
  LayoutDashboard,
  Loader2,
  LogOut,
  UserRound,
  Users,
} from "lucide-react";
import { GeneralInfoForm } from "../../components/GeneralInfoForm";
import { StudentsForm } from "../../components/StudentsForm";
import { ScoresForm } from "../../components/ScoresForm";
import { AttributesForm } from "../../components/AttributesForm";
import { Attributes5_8Form } from "../../components/Attributes5_8Form";
import { AnalyticalForm } from "../../components/AnalyticalForm";
import { IndicatorsForm } from "../../components/IndicatorsForm";
import { Instructions1Form } from "../../components/Instructions1Form";
import { Instructions2Form } from "../../components/Instructions2Form";
import { FolderTabs } from "../../components/FolderTabs";
import { isAdmin } from "../../lib/auth";
import { appDataToRow } from "../../lib/gradebookAdapter";
import { applyPap5OfficialDisplayDefaults } from "../../lib/pap5Officials";
import {
  computeGradebookStats,
  isGradebookFullyComplete,
  statsToGradebookStatus,
} from "../../lib/gradebookStats";
import { supabase } from "../../lib/supabase";
import type { GradebookSession } from "../../lib/teacherGradebooks";
import type { AppData, AppUser, Student } from "../../types";

const menuItems = [
  { id: "general", label: "ปก", surface: "document" },
  { id: "students", label: "เวลาเรียน" },
  { id: "scores", label: "คะแนนตามตัวชี้วัด" },
  { id: "attributes1_4", label: "คุณลักษณะ 1-4" },
  { id: "attributes5_8", label: "คุณลักษณะ 5-8" },
  { id: "analytical", label: "คิดวิเคราะห์" },
  { id: "indicators", label: "ตัวชี้วัด" },
  { id: "instructions1", label: "คำชี้แจง", surface: "document" },
  { id: "instructions2", label: "คำชี้แจงต่อ", surface: "document" },
];

const STUDENT_NAME_TITLES = [
  "เด็กชาย",
  "เด็กหญิง",
  "ด.ช.",
  "ด.ญ.",
  "นาย",
  "นางสาว",
  "น.ส.",
  "นาง",
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function splitStudentNameForAcademicRecord(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const title = parts.length > 0 && STUDENT_NAME_TITLES.includes(parts[0]) ? parts.shift() ?? null : null;
  const firstName = parts.shift() ?? "";
  const lastName = parts.join(" ");

  return {
    title,
    firstName: firstName || fullName.trim(),
    lastName,
  };
}

function getSupabaseErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Unknown error";
}

function isMissingStudentUpdateRpcError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: unknown; message?: unknown };
  const code = typeof candidate.code === "string" ? candidate.code : "";
  const message =
    typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";

  return (
    code === "PGRST202" ||
    message.includes("teacher_update_assigned_student") ||
    message.includes("schema cache") ||
    message.includes("could not find the function")
  );
}

interface GradebookEditorProps {
  session: GradebookSession;
  currentUser: AppUser;
  onBack: () => void;
  onLogout: () => void;
  onSettings: () => void;
  onSyncStatusChange?: (status: "idle" | "saving" | "saved" | "error") => void;
}

export const GradebookEditor: React.FC<GradebookEditorProps> = ({
  session,
  currentUser,
  onBack,
  onLogout,
  onSettings,
  onSyncStatusChange,
}) => {
  const [data, setData] = useState<AppData>(session.data);
  const [activeTab, setActiveTab] = useState("general");
  const [exportingExcel, setExportingExcel] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestData = useRef(data);
  latestData.current = data;
  const gradebookStats = useMemo(() => computeGradebookStats(data), [data]);
  const completionPercent = Math.max(0, Math.min(100, Math.round(gradebookStats.completionPercent)));
  const subjectName = data.generalInfo.subjectName?.trim() || session.label;
  const subjectCode = data.generalInfo.subjectCode?.trim();
  const gradeLevel = data.generalInfo.gradeLevel?.trim();
  const learningArea = data.generalInfo.learningArea?.trim();
  const isDocumentPreviewTab =
    activeTab === "general" ||
    activeTab === "instructions1" ||
    activeTab === "instructions2";

  const persist = useCallback(
    async (appData: AppData) => {
      if (session.readOnly) return;
      onSyncStatusChange?.("saving");
      try {
        const stats = computeGradebookStats(appData);
        const fullyComplete = isGradebookFullyComplete(appData);
        const status = statsToGradebookStatus(stats.completionPercent, stats.hasTeacherInput, fullyComplete);
        const { error } = await supabase
          .from("gradebooks")
          .update({
            ...appDataToRow(appData),
            stats,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.id);

        if (error) throw error;
        onSyncStatusChange?.("saved");
      } catch {
        onSyncStatusChange?.("error");
      }
    },
    [session.id, session.readOnly, onSyncStatusChange],
  );

  const scheduleSave = useCallback(
    (appData: AppData) => {
      if (session.readOnly) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        void persist(appData);
      }, 1500);
    },
    [persist, session.readOnly],
  );

  const handleUpdate = (newData: AppData) => {
    setData(newData);
    scheduleSave(newData);
  };

  const handlePersistStudentEdit = useCallback(
    async (student: Student, previousStudent?: Student) => {
      if (session.readOnly) return;

      const studentCode = student.studentId.trim();
      const citizenId = student.citizenId?.trim() || null;
      const { title, firstName, lastName } = splitStudentNameForAcademicRecord(student.name);
      if (!studentCode || !firstName.trim()) {
        throw new Error("กรุณากรอกรหัสนักเรียนและชื่อนักเรียนก่อนบันทึก");
      }

      const payload = {
        student_code: studentCode,
        citizen_id: citizenId,
        title,
        first_name: firstName,
        last_name: lastName,
      };
      const previousStudentCode = previousStudent?.studentId.trim() || studentCode;
      const studentUuid = UUID_PATTERN.test(student.id) ? student.id : null;

      const { error: rpcError } = await supabase.rpc("teacher_update_assigned_student", {
        p_student_id: studentUuid,
        p_previous_student_code: previousStudentCode || null,
        p_student_code: studentCode,
        p_citizen_id: citizenId,
        p_title: title,
        p_first_name: firstName,
        p_last_name: lastName,
      });

      if (!rpcError) return;
      if (!isMissingStudentUpdateRpcError(rpcError)) {
        throw new Error(`ไม่สามารถอัปเดตข้อมูลนักเรียนในฐานข้อมูลกลางได้: ${getSupabaseErrorMessage(rpcError)}`);
      }

      const updateAttempts: Array<() => Promise<{ updated: boolean; error: unknown | null }>> = [];

      if (studentUuid) {
        updateAttempts.push(async () => {
          const { data: updatedRows, error } = await supabase
            .from("students")
            .update(payload)
            .eq("id", studentUuid)
            .select("id");

          return { updated: Boolean(updatedRows?.length), error };
        });
      }

      if (currentUser.schoolId && previousStudentCode) {
        updateAttempts.push(async () => {
          const { data: updatedRows, error } = await supabase
            .from("students")
            .update(payload)
            .eq("school_id", currentUser.schoolId)
            .eq("student_code", previousStudentCode)
            .select("id");

          return { updated: Boolean(updatedRows?.length), error };
        });
      }

      if (updateAttempts.length === 0) return;

      const errors: unknown[] = [];
      for (const attempt of updateAttempts) {
        const result = await attempt();
        if (result.error) {
          errors.push(result.error);
          continue;
        }
        if (result.updated) return;
      }

      const firstError = errors[0];
      throw new Error(
        firstError
          ? `ไม่สามารถอัปเดตข้อมูลนักเรียนในฐานข้อมูลกลางได้: ${getSupabaseErrorMessage(firstError)}`
          : "ไม่พบข้อมูลนักเรียนในฐานข้อมูลกลางที่สามารถอัปเดตได้",
      );
    },
    [currentUser.schoolId, session.readOnly],
  );

  const flushPendingSave = useCallback(async () => {
    if (session.readOnly) return;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    await persist(latestData.current);
  }, [persist, session.readOnly]);

  const handleBack = async () => {
    await flushPendingSave();
    onBack();
  };

  const handleLogout = async () => {
    await flushPendingSave();
    onLogout();
  };

  const handleSettings = async () => {
    await flushPendingSave();
    onSettings();
  };

  const handleExportExcel = useCallback(async () => {
    setExportingExcel(true);
    try {
      const { exportToExcel } = await import("../../utils/excelExport");
      await exportToExcel({
        ...latestData.current,
        generalInfo: applyPap5OfficialDisplayDefaults(latestData.current.generalInfo),
      });
    } finally {
      setExportingExcel(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        void persist(latestData.current);
      }
    };
  }, [persist]);

  return (
    <div className="h-screen overflow-y-auto bg-[#f5f5f7] font-sans">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 shadow-[0_12px_28px_-24px_rgb(15,23,42,0.45)] backdrop-blur-xl">
        <div className="px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src="/logo3.png"
                alt=""
                className="h-14 w-14 shrink-0 scale-110 object-contain"
              />

              <div className="min-w-0">
                <h1 className="truncate text-[17px] font-extrabold leading-6 tracking-tight text-slate-950 sm:text-xl">
                  {subjectName}
                </h1>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                  {subjectCode && (
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                      {subjectCode}
                    </span>
                  )}
                  {gradeLevel && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {gradeLevel}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    ปี {session.year_be} ภาคเรียนที่ {session.semester_number}
                  </span>
                  {learningArea && (
                    <span className="max-w-full truncate sm:max-w-[280px]">
                      {learningArea}
                    </span>
                  )}
                </div>
              </div>

            </div>

            <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
              <button
                type="button"
                onClick={() => void handleBack()}
                className="flex h-10 items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm font-bold text-white shadow-sm transition hover:border-slate-900 hover:bg-slate-800"
                title="กลับ"
              >
                <ArrowLeft className="h-[18px] w-[18px]" />
                <span className="hidden sm:inline">กลับ</span>
              </button>

              {session.readOnly ? (
                <div className="flex h-10 shrink-0 items-center rounded-lg border border-amber-100 bg-amber-50 px-3 text-xs font-semibold text-amber-800 shadow-sm">
                  ปีการศึกษาเก่า — ดูและดาวน์โหลด Excel ได้ แต่แก้ไขไม่ได้
                </div>
              ) : (
                <div className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 text-xs font-semibold text-blue-700 shadow-sm">
                  <Loader2 className="h-3.5 w-3.5" /> บันทึกอัตโนมัติเมื่อแก้ไข
                </div>
              )}

              <div className="flex h-10 min-w-[168px] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-slate-500">
                    <span>ความครบถ้วน</span>
                    <span className="text-slate-900">{completionPercent}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleExportExcel()}
                disabled={exportingExcel}
                className="btn !h-10 !rounded-lg !px-3 border border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
                title="ดาวน์โหลด Excel"
              >
                {exportingExcel ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Excel</span>
              </button>

              <div className="flex h-10 min-w-0 items-center rounded-lg border border-slate-200 bg-white pl-1 pr-2 shadow-sm">
                <div className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
                  <UserRound className="h-4 w-4" />
                </div>
                <span className="mr-2 hidden max-w-[180px] truncate text-sm font-semibold text-slate-700 sm:inline">
                  {currentUser.name}
                </span>
                {isAdmin(currentUser) && (
                  <button
                    type="button"
                    onClick={() => void handleSettings()}
                    className="mr-1 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                    title="เปิดหน้า Admin"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  title="ออกจากระบบ"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </header>

      <main className="px-4 pt-4 pb-6 sm:px-6 lg:px-8">
        <div className="ui-card overflow-hidden animate-fade-up">
          <div className="p-2 sm:p-3">
            <div className={`gradebook-folder-frame gradebook-folder-frame-${activeTab}`}>
              <FolderTabs
                menuItems={menuItems}
                activeId={activeTab}
                onChange={setActiveTab}
              />
              <div
                className={`gradebook-folder-content ${
                  isDocumentPreviewTab ? "gradebook-folder-content-document" : ""
                }`}
              >

            {activeTab === "general" && (
              <GeneralInfoForm
                data={data.generalInfo}
                appData={data}
                onChange={(generalInfo) =>
                  !session.readOnly && handleUpdate({ ...data, generalInfo })
                }
              />
            )}
            {activeTab === "students" && (
              <StudentsForm
                data={data.students}
                generalInfo={data.generalInfo}
                attendance={data.attendance}
                onChange={(students) =>
                  !session.readOnly && handleUpdate({ ...data, students })
                }
                onAttendanceChange={(attendance) =>
                  !session.readOnly && handleUpdate({ ...data, attendance })
                }
                onPersistStudentEdit={handlePersistStudentEdit}
              />
            )}
            {activeTab === "scores" && (
              <ScoresForm
                students={data.students}
                data={data.scores}
                generalInfo={data.generalInfo}
                scoreConfig={data.scoreConfig}
                onChange={(scores) =>
                  !session.readOnly && handleUpdate({ ...data, scores })
                }
                onConfigChange={(scoreConfig) =>
                  !session.readOnly && handleUpdate({ ...data, scoreConfig })
                }
                onClearScoresAndConfig={() =>
                  !session.readOnly && handleUpdate({ ...data, scores: {}, scoreConfig: undefined })
                }
              />
            )}
            {activeTab === "attributes1_4" && (
              <AttributesForm
                students={data.students}
                data={data.attributes}
                generalInfo={data.generalInfo}
                onChange={(attributes) =>
                  !session.readOnly && handleUpdate({ ...data, attributes })
                }
              />
            )}
            {activeTab === "attributes5_8" && (
              <Attributes5_8Form
                students={data.students}
                data={data.attributes}
                generalInfo={data.generalInfo}
                onChange={(attributes) =>
                  !session.readOnly && handleUpdate({ ...data, attributes })
                }
              />
            )}
            {activeTab === "analytical" && (
              <AnalyticalForm
                students={data.students}
                data={data.analytical}
                generalInfo={data.generalInfo}
                onChange={(analytical) =>
                  !session.readOnly && handleUpdate({ ...data, analytical })
                }
              />
            )}
            {activeTab === "indicators" && (
              <IndicatorsForm
                data={data.indicators}
                scoreConfig={data.scoreConfig}
                generalInfo={data.generalInfo}
                onChange={(indicators) =>
                  !session.readOnly && handleUpdate({ ...data, indicators })
                }
              />
            )}
            {activeTab === "instructions1" && <Instructions1Form />}
            {activeTab === "instructions2" && <Instructions2Form />}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
