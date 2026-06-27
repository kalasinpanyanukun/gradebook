import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, LayoutDashboard, Loader2, LogOut } from "lucide-react";
import { GeneralInfoForm } from "../../components/GeneralInfoForm";
import { StudentsForm } from "../../components/StudentsForm";
import { ScoresForm } from "../../components/ScoresForm";
import { AttributesForm } from "../../components/AttributesForm";
import { Attributes5_8Form } from "../../components/Attributes5_8Form";
import { AnalyticalForm } from "../../components/AnalyticalForm";
import { IndicatorsForm } from "../../components/IndicatorsForm";
import { Instructions1Form } from "../../components/Instructions1Form";
import { Instructions2Form } from "../../components/Instructions2Form";
import { isAdmin } from "../../lib/auth";
import { appDataToRow } from "../../lib/gradebookAdapter";
import {
  computeGradebookStats,
  isGradebookFullyComplete,
  statsToGradebookStatus,
} from "../../lib/gradebookStats";
import { supabase } from "../../lib/supabase";
import type { GradebookSession } from "../../lib/teacherGradebooks";
import type { AppData, AppUser } from "../../types";

const tabs = [
  { id: "general", label: "ปก" },
  { id: "students", label: "ชื่อ+เวลา1+เวลา2" },
  { id: "scores", label: "คะแนนรายตัวชี้วัด1+2" },
  { id: "attributes1_4", label: "คุณลักษณะ1-4" },
  { id: "attributes5_8", label: "คุณลักษณะ5-8" },
  { id: "analytical", label: "คิดวิเคราะห์" },
  { id: "indicators", label: "ตัวชี้วัด" },
  { id: "instructions1", label: "คำชี้แจง1" },
  { id: "instructions2", label: "คำชี้แจง2" },
];

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
      await exportToExcel(latestData.current);
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
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center">
            <button
              type="button"
              onClick={() => void handleBack()}
              className="mr-3 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              title="กลับ"
            >
              <ArrowLeft className="h-[18px] w-[18px]" />
            </button>
            <img
              src="/logo3.png"
              alt=""
              className="mr-3 h-9 w-9 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-900">
                {session.label}
              </h1>
              <p className="text-xs text-slate-500">
                ปี {session.year_be} ภาค {session.semester_number}
                {session.readOnly && (
                  <span className="ml-1.5 font-semibold text-amber-600">· โหมดอ่านอย่างเดียว</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void handleExportExcel()}
              disabled={exportingExcel}
              className="btn !py-2 border border-emerald-600 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700"
            >
              {exportingExcel ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Excel</span>
            </button>
            <div className="flex items-center rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 shadow-sm">
              <div className="mr-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white">
                {currentUser.name.charAt(0)}
              </div>
              <span className="mr-2 hidden text-sm font-semibold text-slate-700 sm:inline">
                {currentUser.name}
              </span>
              {isAdmin(currentUser) && (
                <button
                  type="button"
                  onClick={() => void handleSettings()}
                  className="mr-2 text-slate-400 transition hover:text-blue-600"
                  title="เปิดหน้า Admin"
                >
                  <LayoutDashboard className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="text-slate-400 transition hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 px-4 sm:px-6 lg:px-8">
          <nav className="hide-scrollbar -mb-px flex flex-1 gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="ui-card overflow-hidden animate-fade-up">
          <div className="overflow-x-auto p-4 sm:p-6">
            {session.readOnly ? (
              <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800">
                ปีการศึกษาเก่า — ดูและดาวน์โหลด Excel ได้ แต่แก้ไขไม่ได้
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Loader2 className="h-3 w-3" /> บันทึกอัตโนมัติเมื่อแก้ไข
              </div>
            )}

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
                rosterLocked
                onChange={(students) =>
                  !session.readOnly && handleUpdate({ ...data, students })
                }
                onAttendanceChange={(attendance) =>
                  !session.readOnly && handleUpdate({ ...data, attendance })
                }
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
              />
            )}
            {activeTab === "attributes1_4" && (
              <AttributesForm
                students={data.students}
                data={data.attributes}
                onChange={(attributes) =>
                  !session.readOnly && handleUpdate({ ...data, attributes })
                }
              />
            )}
            {activeTab === "attributes5_8" && (
              <Attributes5_8Form
                students={data.students}
                data={data.attributes}
                onChange={(attributes) =>
                  !session.readOnly && handleUpdate({ ...data, attributes })
                }
              />
            )}
            {activeTab === "analytical" && (
              <AnalyticalForm
                students={data.students}
                data={data.analytical}
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
      </main>
    </div>
  );
};
// redesigned 2026
