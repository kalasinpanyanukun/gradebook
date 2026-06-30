import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BookMarked,
  BookOpen,
  ClipboardList,
  Home,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  School,
  Server,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { AdminHomePage, type AdminTabNavigateOptions } from './AdminHomePage';
import { AcademicYearsPage } from './AcademicYearsPage';
import { AssignmentsPage } from './AssignmentsPage';
import { ClassroomsPage } from './ClassroomsPage';
import { StudentsPage } from './StudentsPage';
import { SubjectsPage } from './SubjectsPage';
import { CurriculumIndicatorsPage } from './CurriculumIndicatorsPage';
import { TeachersPage } from './TeachersPage';
import { GradebookSearchPage } from './GradebookSearchPage';
import { SettingsPage, type SettingsSection } from './SettingsPage';
import { LearningAreaHeadsPage } from './LearningAreaHeadsPage';
import { StudentRosterEditsPage } from './StudentRosterEditsPage';
import { canAccessAdminDashboard, isAdminReadOnly, ROLE_LABELS } from '../../lib/auth';
import {
  clearAdminTabFromUrl,
  persistWorkspaceYear,
  readAdminTabFromUrl,
  readStoredWorkspaceYear,
  shouldEnterAdminWorkspace,
  syncAdminTabToUrl,
} from '../../lib/adminNavigation';
import { supabase } from '../../lib/supabase';
import type { TeacherAssignmentView } from '../../lib/teacherGradebooks';
import type { AppUser } from '../../types';

type AdminTab =
  | 'main'
  | 'home'
  | 'assignments'
  | 'academic-admins'
  | 'academic-years'
  | 'classrooms'
  | 'students'
  | 'subjects'
  | 'curriculum'
  | 'settings-general'
  | 'settings-activity'
  | 'settings-system'
  | 'learning-area-heads'
  | 'student-roster-edits';

interface AdminWorkspaceProps {
  currentUser: AppUser;
  onOpenTeacherView: () => void;
  onOpenGradebook: (
    assignment: TeacherAssignmentView,
    gradebookId: string,
    options?: { readOnly?: boolean },
  ) => void;
  onLogout: () => void;
}

const adminTabs: Array<{
  id: AdminTab;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  { id: 'main', label: 'หน้าหลัก', description: 'ค้นหา ปพ.5 ที่เสร็จสมบูรณ์', icon: Search },
  { id: 'home', label: 'ภาพรวม', description: 'ภาพรวมปีการศึกษา', icon: Home },
  { id: 'assignments', label: 'จัดการ ปพ.5', description: 'ครู × วิชา × ห้อง', icon: ClipboardList },
  { id: 'classrooms', label: 'ห้องเรียน', description: 'ห้องและครูประจำชั้น', icon: School },
  { id: 'students', label: 'นักเรียน', description: 'รายชื่อและการย้ายห้อง', icon: Users },
  { id: 'learning-area-heads', label: 'หัวหน้ากลุ่มสาระ', description: 'ผู้ลงนามหน้าปก ปพ.5', icon: UserCheck },
  { id: 'student-roster-edits', label: 'การแก้ไขข้อมูลนักเรียน', description: 'รายชื่อที่ครูแก้ในสมุด ปพ.5', icon: Users },
  { id: 'academic-admins', label: 'บทบาทและผู้ใช้งาน', description: 'บัญชีและสิทธิ์ใช้งาน', icon: ShieldCheck },
  { id: 'subjects', label: 'รายวิชา', description: 'รหัสวิชาและกลุ่มสาระ', icon: BookOpen },
  { id: 'curriculum', label: 'หลักสูตรและตัวชี้วัด', description: 'มาตรฐานและตัวชี้วัดรายวิชา', icon: BookMarked },
  { id: 'settings-general', label: 'การตั้งค่า', description: 'เปิดปิดภาคเรียนและช่วงเวลา', icon: Settings },
  { id: 'settings-activity', label: 'กิจกรรม', description: 'บันทึกการใช้งานระบบ', icon: Activity },
  { id: 'settings-system', label: 'ข้อมูลระบบ', description: 'สุขภาพระบบและฐานข้อมูล', icon: Server },
];

const adminNavGroups: Array<{
  title: string;
  items: AdminTab[];
}> = [
  { title: 'ภาพรวม', items: ['main', 'home'] },
  { title: 'จัดการ ปพ.5', items: ['assignments', 'classrooms', 'students', 'learning-area-heads', 'student-roster-edits'] },
  { title: 'ข้อมูลหลัก', items: ['academic-admins', 'subjects', 'curriculum'] },
  { title: 'ระบบ', items: ['settings-general', 'settings-activity', 'settings-system'] },
];

function settingsSectionForTab(tab: AdminTab): SettingsSection | null {
  if (tab === 'settings-general') return 'general';
  if (tab === 'settings-activity') return 'activity';
  if (tab === 'settings-system') return 'system';
  return null;
}

function tabMeta(tabId: AdminTab) {
  return adminTabs.find((tab) => tab.id === tabId) ?? adminTabs[0];
}

type NetworkStatus = 'ready' | 'poor' | 'offline';

interface BrowserNetworkConnection extends EventTarget {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

function getNetworkConnection(): BrowserNetworkConnection | undefined {
  const browserNavigator = navigator as Navigator & {
    connection?: BrowserNetworkConnection;
    mozConnection?: BrowserNetworkConnection;
    webkitConnection?: BrowserNetworkConnection;
  };

  return browserNavigator.connection ?? browserNavigator.mozConnection ?? browserNavigator.webkitConnection;
}

function readNetworkStatus(): NetworkStatus {
  if (!navigator.onLine) return 'offline';

  const connection = getNetworkConnection();
  const effectiveType = connection?.effectiveType ?? '';
  const downlink = connection?.downlink ?? Number.POSITIVE_INFINITY;
  const rtt = connection?.rtt ?? 0;

  if (effectiveType.includes('2g') || downlink < 1.5 || rtt > 800) {
    return 'poor';
  }

  return 'ready';
}

function networkStatusMeta(status: NetworkStatus) {
  if (status === 'offline') {
    return {
      label: 'ไม่มีสัญญาณอินเตอร์เน็ต',
      dot: 'bg-slate-400',
      text: 'text-slate-600',
    };
  }

  if (status === 'poor') {
    return {
      label: 'อินเตอร์เน็ตไม่ดี',
      dot: 'bg-amber-400',
      text: 'text-amber-700',
    };
  }

  return {
    label: 'พร้อมใช้งาน',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
  };
}

const ADMIN_DEVICE_ID_KEY = 'ksp-gradebook-admin-device-id';
const ACTIVE_DEVICE_WINDOW_MS = 2 * 60 * 1000;

function readAdminDeviceId(): string {
  const existing = window.localStorage.getItem(ADMIN_DEVICE_ID_KEY);
  if (existing) return existing;

  const generated =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(ADMIN_DEVICE_ID_KEY, generated);
  return generated;
}

export const AdminWorkspace: React.FC<AdminWorkspaceProps> = ({
  currentUser,
  onOpenTeacherView,
  onOpenGradebook,
  onLogout,
}) => {
  const initialTab = readAdminTabFromUrl();
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab ?? 'main');
  const [workspaceYearId, setWorkspaceYearId] = useState<string | undefined>(() =>
    readStoredWorkspaceYear(currentUser.schoolId),
  );
  const [enteredWorkspace, setEnteredWorkspace] = useState(() =>
    shouldEnterAdminWorkspace(initialTab, currentUser.schoolId),
  );
  const [entryCreateYearRequest, setEntryCreateYearRequest] = useState(0);
  const [activeAdminDevices, setActiveAdminDevices] = useState<number | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => readNetworkStatus());
  const [now, setNow] = useState(() => new Date());
  const [workspaceYearLabel, setWorkspaceYearLabel] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<AdminTabNavigateOptions | null>(null);
  const readOnly = isAdminReadOnly(currentUser);
  const isDeveloperAccount = currentUser.role === 'super_admin' || currentUser.username.trim().toLowerCase() === 'admin';
  const currentUserDisplayName = isDeveloperAccount ? 'ผู้พัฒนาระบบ' : currentUser.name;
  const currentUserRoleLabel = isDeveloperAccount ? 'ผู้พัฒนาระบบ' : ROLE_LABELS[currentUser.role];
  void onOpenTeacherView;

  const contentMaxWidth =
    activeTab === 'students' || activeTab === 'curriculum' || activeTab === 'student-roster-edits'
      ? 'max-w-none'
      : activeTab === 'home' || activeTab === 'assignments' || activeTab === 'main'
        ? 'max-w-7xl'
        : 'max-w-6xl';

  const contentPaddingClass =
    activeTab === 'curriculum'
      ? 'px-3 py-2 pb-4 sm:px-4 sm:py-2.5 sm:pb-4 lg:px-5 lg:py-3 lg:pb-4'
      : 'p-4 pb-16 sm:p-6 sm:pb-16 lg:p-8 lg:pb-16';

  const network = networkStatusMeta(networkStatus);
  const currentDateTime = useMemo(() => {
    const dateText = now.toLocaleDateString('th-TH', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timeText = now.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    return { dateText, timeText };
  }, [now]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!workspaceYearId) {
      setWorkspaceYearLabel('');
      return;
    }

    let mounted = true;
    const loadWorkspaceYear = async () => {
      const { data } = await supabase
        .from('academic_years')
        .select('year_be')
        .eq('id', workspaceYearId)
        .maybeSingle();

      if (!mounted) return;
      setWorkspaceYearLabel(data?.year_be ? `ปีการศึกษา ${data.year_be}` : '');
    };

    void loadWorkspaceYear();
    return () => {
      mounted = false;
    };
  }, [workspaceYearId]);

  useEffect(() => {
    const syncNetworkStatus = () => setNetworkStatus(readNetworkStatus());
    const connection = getNetworkConnection();

    window.addEventListener('online', syncNetworkStatus);
    window.addEventListener('offline', syncNetworkStatus);
    connection?.addEventListener('change', syncNetworkStatus);
    syncNetworkStatus();

    return () => {
      window.removeEventListener('online', syncNetworkStatus);
      window.removeEventListener('offline', syncNetworkStatus);
      connection?.removeEventListener('change', syncNetworkStatus);
    };
  }, []);

  useEffect(() => {
    if (!canAccessAdminDashboard(currentUser)) return;

    let mounted = true;

    const syncDeviceSession = async () => {
      const deviceId = readAdminDeviceId();
      const lastSeenAt = new Date().toISOString();

      const { error: heartbeatError } = await supabase
        .from('admin_device_sessions')
        .upsert(
          {
            user_id: currentUser.id,
            device_id: deviceId,
            user_agent: navigator.userAgent,
            last_seen_at: lastSeenAt,
          },
          { onConflict: 'user_id,device_id' },
        );

      if (!mounted) return;

      if (heartbeatError) {
        setActiveAdminDevices(null);
        return;
      }

      const activeSince = new Date(Date.now() - ACTIVE_DEVICE_WINDOW_MS).toISOString();
      const { count, error: countError } = await supabase
        .from('admin_device_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .gte('last_seen_at', activeSince);

      if (!mounted) return;
      setActiveAdminDevices(countError ? null : Math.max(count ?? 1, 1));
    };

    void syncDeviceSession();
    const timer = window.setInterval(() => void syncDeviceSession(), 30000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [currentUser]);

  const openTab = (tab: AdminTab, yearId?: string, options?: AdminTabNavigateOptions) => {
    if (yearId) {
      setWorkspaceYearId(yearId);
      persistWorkspaceYear(currentUser.schoolId, yearId);
    }
    if (tab === 'assignments') {
      setAssignmentFilter(options ?? null);
    } else {
      setAssignmentFilter(null);
    }
    setEnteredWorkspace(true);
    setActiveTab(tab);
    syncAdminTabToUrl(tab);
  };

  const enterWorkspace = (yearId: string) => {
    persistWorkspaceYear(currentUser.schoolId, yearId);
    openTab('main', yearId);
  };

  const returnToYearSelector = () => {
    setEnteredWorkspace(false);
    setActiveTab('main');
    clearAdminTabFromUrl();
  };

  if (!enteredWorkspace) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] font-sans text-slate-950">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3.5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="flex items-center min-w-0">
              <img src="/logo3.png" alt="KSP GradeBook" className="mr-3 h-11 w-11 shrink-0 object-contain" />
              <div className="min-w-0">
                <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-900">KSP GradeBook</h1>
                <p className="text-[11px] font-medium text-slate-500">ระบบบันทึกผลการพัฒนาคุณภาพผู้เรียน (ปพ.5)</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex min-w-0 items-center rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3.5 shadow-sm">
                <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white">
                  {currentUserDisplayName.charAt(0)}
                </div>
                <span className="truncate text-sm font-semibold text-slate-700">{currentUserDisplayName}</span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                title="ออกจากระบบ"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between animate-fade-up">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">ผู้ดูแลระบบ</p>
              <h2 className="mt-1.5 text-[28px] font-extrabold tracking-tight text-slate-900">เลือกปีการศึกษา</h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                เลือก workspace ปีการศึกษาที่ต้องการจัดการก่อนเข้าสู่หน้าหลักของระบบ
              </p>
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setEntryCreateYearRequest((value) => value + 1)}
                className="btn btn-primary w-fit"
              >
                <Plus className="h-4 w-4" />
                เพิ่มปีการศึกษาใหม่
              </button>
            )}
          </div>
          <AdminHomePage
            currentUser={currentUser}
            onOpenTab={openTab}
            onEnterWorkspace={enterWorkspace}
            createYearRequestKey={entryCreateYearRequest}
            readOnly={readOnly}
            variant="entry"
          />
        </main>
      </div>
    );
  }

  const activeMeta = tabMeta(activeTab);

  return (
    <div className="min-h-screen bg-[#f5f5f7] font-sans text-slate-950">
      {/* ---------- Dark sidebar (desktop) ---------- */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[272px] flex-col bg-[#0a0f1d] lg:flex">
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-[18px]">
          <img src="/logo3.png" alt="KSP GradeBook" className="h-10 w-10 shrink-0 object-contain brightness-110 contrast-105 drop-shadow-[0_0_6px_rgba(255,255,255,0.25)]" />
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-extrabold tracking-tight text-white">KSP GradeBook</h1>
            <p className="truncate text-[10.5px] font-medium text-slate-200">ระบบบันทึกผล ปพ.5</p>
          </div>
        </div>

        <nav className="dark-scroll flex-1 space-y-6 overflow-y-auto px-3.5 py-5" aria-label="เมนูผู้ดูแลระบบ">
          {workspaceYearLabel && (
            <div className="w-full rounded-xl bg-white/[0.06] px-3 py-4 text-center text-[1.35rem] font-extrabold leading-tight tracking-wide text-white ring-1 ring-white/10">
              {workspaceYearLabel}
            </div>
          )}
          {adminNavGroups.map((group) => (
            <div key={group.title}>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map((tabId) => {
                  const tab = tabMeta(tabId);
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => openTab(tab.id)}
                      className={`side-nav-item ${active ? 'active' : ''}`}
                    >
                      <Icon className={`mr-3 h-4 w-4 shrink-0 ${active ? 'text-blue-300' : 'text-slate-300'}`} />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-3 border-t border-white/[0.06] px-4 py-4">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${network.dot}`} aria-hidden="true" />
              {network.label}
            </span>
            <span>
              {activeAdminDevices === null ? '' : `${activeAdminDevices.toLocaleString('th-TH')} อุปกรณ์`}
            </span>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] p-2.5 ring-1 ring-white/[0.06]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white">
              {currentUserDisplayName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">{currentUserDisplayName}</p>
              <p className="truncate text-[10.5px] text-slate-300">{currentUserRoleLabel}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-500/15 hover:text-red-400"
              title="ออกจากระบบ"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ---------- Main column ---------- */}
      <div className="flex min-h-screen flex-col lg:pl-[272px]">
        {/* Top bar */}
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/logo3.png" alt="KSP GradeBook" className="h-9 w-9 shrink-0 object-contain lg:hidden" />
              <div className="min-w-0">
                <h2 className="truncate text-[17px] font-bold tracking-tight text-slate-900">{activeMeta.label}</h2>
                <p className="hidden truncate text-xs text-slate-500 sm:block">{activeMeta.description}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="mr-1 hidden text-right xl:block">
                <p className="flex items-center justify-end gap-1.5 text-xs font-semibold text-slate-700">
                  <span>{currentDateTime.dateText}</span>
                  <span className="font-mono text-[11px] tabular-nums text-slate-400">{currentDateTime.timeText}</span>
                  <RefreshCw className="h-3.5 w-3.5 text-blue-500" aria-label="ซิงก์ข้อมูลอัตโนมัติ" />
                </p>
              </div>
              <button type="button" onClick={returnToYearSelector} className="btn btn-secondary !px-3 !py-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">กลับหน้าแรก</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 lg:hidden"
                title="ออกจากระบบ"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>

          {/* Mobile nav */}
          <div className="overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden">
            <nav className="flex min-w-max gap-1.5" aria-label="เมนูผู้ดูแลระบบบนมือถือ">
              {adminTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => openTab(tab.id)}
                    className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
                      active
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="mr-1.5 h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        <main className="flex-1 min-w-0">
          <div key={activeTab} className={`mx-auto ${contentMaxWidth} ${contentPaddingClass} animate-fade-up`}>
            {activeTab === 'main' && (
              <GradebookSearchPage currentUser={currentUser} initialYearId={workspaceYearId} />
            )}
            {activeTab === 'home' && (
              <AdminHomePage
                currentUser={currentUser}
                onOpenTab={openTab}
                selectedYearId={workspaceYearId}
                readOnly={readOnly}
              />
            )}
            {activeTab === 'assignments' && (
              <AssignmentsPage
                currentUser={currentUser}
                initialYearId={workspaceYearId}
                initialClassLevelCode={assignmentFilter?.classLevelCode}
                initialSemesterNumber={assignmentFilter?.semesterNumber}
                drilldownLabel={
                  assignmentFilter?.classLevelCode
                    ? `${assignmentFilter.classLevelCode}${
                        assignmentFilter.semesterNumber
                          ? ` · ภาคเรียนที่ ${assignmentFilter.semesterNumber}`
                          : ''
                      }`
                    : undefined
                }
                onDrilldownBack={
                  assignmentFilter?.classLevelCode
                    ? () => openTab('home', workspaceYearId)
                    : undefined
                }
              />
            )}
            {activeTab === 'academic-admins' && <TeachersPage currentUser={currentUser} readOnly={readOnly} />}
            {activeTab === 'academic-years' && <AcademicYearsPage currentUser={currentUser} />}
            {activeTab === 'classrooms' && <ClassroomsPage currentUser={currentUser} initialYearId={workspaceYearId} />}
            {activeTab === 'students' && <StudentsPage currentUser={currentUser} initialYearId={workspaceYearId} />}
            {activeTab === 'subjects' && <SubjectsPage currentUser={currentUser} />}
            {activeTab === 'curriculum' && <CurriculumIndicatorsPage />}
            {activeTab === 'learning-area-heads' && (
              <LearningAreaHeadsPage currentUser={currentUser} readOnly={readOnly} />
            )}
            {activeTab === 'student-roster-edits' && (
              <StudentRosterEditsPage currentUser={currentUser} initialYearId={workspaceYearId} />
            )}
            {activeTab === 'settings-general' || activeTab === 'settings-activity' || activeTab === 'settings-system' ? (
              <SettingsPage
                currentUser={currentUser}
                initialYearId={workspaceYearId}
                readOnly={readOnly}
                section={settingsSectionForTab(activeTab)!}
              />
            ) : null}
          </div>
        </main>

        {/* Mobile status footer */}
        <footer className="border-t border-slate-200 bg-white px-4 py-2.5 text-[11px] text-slate-500 lg:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`flex items-center gap-1.5 font-semibold ${network.text}`}>
              <span className={`h-2 w-2 rounded-full ${network.dot}`} aria-hidden="true" />
              {network.label}
            </span>
            <span className="font-medium">
              {currentDateTime.dateText} <span className="font-mono tabular-nums">{currentDateTime.timeText}</span>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};
// redesigned 2026
