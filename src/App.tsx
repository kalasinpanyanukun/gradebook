import React, { lazy, Suspense, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppUser } from './types';
import { supabase, supabaseConfigError } from './lib/supabase';
import {
  resolveAppUser,
  signOut,
  canAccessAdminDashboard,
  canAccessTeacherDashboard,
  isAdmin,
} from './lib/auth';
import { logActivity } from './lib/activityLog';
import type { GradebookSession, TeacherAssignmentView } from './lib/teacherGradebooks';
import {
  CheckCircle2, AlertCircle, Loader2, LogOut,
} from 'lucide-react';
import { isAdminTabUrl } from './lib/adminNavigation';

type AppView = 'teacher' | 'admin';

const AdminWorkspace = lazy(() =>
  import('./pages/admin/AdminWorkspace').then((module) => ({ default: module.AdminWorkspace })),
);
const TeacherDashboard = lazy(() =>
  import('./pages/teacher/TeacherDashboard').then((module) => ({ default: module.TeacherDashboard })),
);
const GradebookEditor = lazy(() =>
  import('./pages/teacher/GradebookEditor').then((module) => ({ default: module.GradebookEditor })),
);
const Login = lazy(() =>
  import('./components/Login').then((module) => ({ default: module.Login })),
);
const CurriculumPreviewPage = lazy(() =>
  import('./pages/admin/CurriculumPreviewPage').then((module) => ({ default: module.CurriculumPreviewPage })),
);

function readPreviewMode(): string | null {
  return new URLSearchParams(window.location.search).get('preview');
}

function shouldOpenAdminFromUrl(): boolean {
  return isAdminTabUrl();
}

function readInitialAppView(): AppView {
  if (readPreviewMode() === 'curriculum') return 'teacher';
  return shouldOpenAdminFromUrl() ? 'admin' : 'teacher';
}

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );
}

function SupabaseConfigErrorScreen({ message }: { message: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Supabase ยังไม่ได้ตั้งค่า</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-left text-sm text-slate-700">
          <p className="font-semibold text-slate-900">ต้องเพิ่ม Environment Variables บน Vercel:</p>
          <ul className="mt-2 space-y-1">
            <li><code>VITE_SUPABASE_URL</code></li>
            <li><code>VITE_SUPABASE_ANON_KEY</code></li>
          </ul>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  if (supabaseConfigError) {
    return <SupabaseConfigErrorScreen message={supabaseConfigError} />;
  }

  return <ConfiguredApp />;
}

function ConfiguredApp() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeView, setActiveView] = useState<AppView>(readInitialAppView);
  const [gradebookSession, setGradebookSession] = useState<GradebookSession | null>(null);
  const [openingGradebook, setOpeningGradebook] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [teacherDashboardKey, setTeacherDashboardKey] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle');

  const applyResolvedUser = useCallback((user: AppUser | null, preferAdminView: boolean) => {
    const activeUser = user?.isActive ? user : null;
    setCurrentUser(activeUser);

    if (!activeUser) {
      setActiveView('teacher');
      setGradebookSession(null);
      return;
    }

    if (canAccessAdminDashboard(activeUser) && (preferAdminView || shouldOpenAdminFromUrl())) {
      setActiveView('admin');
      return;
    }

    if (!canAccessAdminDashboard(activeUser)) {
      setActiveView('teacher');
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const applySession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session) {
        const user = await resolveAppUser(session);
        if (!mounted) return;
        applyResolvedUser(user, true);
      } else {
        applyResolvedUser(null, false);
      }
      setAuthLoading(false);
    };

    void applySession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session) {
        const user = await resolveAppUser(session);
        if (!mounted) return;
        applyResolvedUser(user, event === 'SIGNED_IN');
        if (event === 'SIGNED_IN' && user?.isActive && canAccessAdminDashboard(user)) {
          const loginAction =
            user.role === 'executive'
              ? 'เข้าสู่ระบบ (ผู้บริหาร)'
              : 'เข้าสู่ระบบ (ผู้ดูแลระบบ)';
          void logActivity(user.schoolId, user.id, user.name, loginAction, user.role);
        }
      } else {
        applyResolvedUser(null, false);
      }
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applyResolvedUser]);

  useEffect(() => {
    if (syncStatus === 'saved') {
      const timer = setTimeout(() => setSyncStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);

  const renderSyncStatus = () => {
    if (syncStatus === 'idle' || syncStatus === 'saving') return null;

    let content: React.ReactNode = null;
    let bgColor = 'bg-white';
    let textColor = 'text-slate-600';

    switch (syncStatus) {
      case 'loading':
        content = <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> กำลังโหลดข้อมูล...</>;
        bgColor = 'bg-blue-50 border-blue-200';
        textColor = 'text-blue-700';
        break;
      case 'saved':
        content = <><CheckCircle2 className="w-4 h-4 mr-2" /> บันทึกแล้ว</>;
        bgColor = 'bg-green-50 border-green-200';
        textColor = 'text-green-700';
        break;
      case 'error':
        content = <><AlertCircle className="w-4 h-4 mr-2" /> บันทึกล้มเหลว</>;
        bgColor = 'bg-red-50 border-red-200';
        textColor = 'text-red-700';
        break;
      default:
        return null;
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={syncStatus}
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className={`fixed top-5 left-1/2 -translate-x-1/2 flex items-center px-4 py-2 rounded-full shadow-md border ${bgColor} ${textColor} text-sm font-medium z-[100]`}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    );
  };

  const handleLogin = (user: AppUser) => {
    setCurrentUser(user);
    setGradebookSession(null);
    setActiveView(canAccessAdminDashboard(user) ? 'admin' : 'teacher');
  };

  const handleLogout = () => setShowLogoutConfirm(true);

  const confirmLogout = async () => {
    await signOut();
    setCurrentUser(null);
    setGradebookSession(null);
    setActiveView('teacher');
    setShowLogoutConfirm(false);
  };

  const openAdminView = () => {
    if (!currentUser || !isAdmin(currentUser)) return;
    setGradebookSession(null);
    setActiveView('admin');
  };

  const openTeacherView = () => {
    setGradebookSession(null);
    setActiveView('teacher');
  };

  const handleOpenGradebook = async (
    assignment: TeacherAssignmentView,
    gradebookId: string,
    options?: { readOnly?: boolean }
  ) => {
    setOpeningGradebook(true);
    setSyncStatus('loading');
    try {
      const { loadGradebookSession } = await import('./lib/teacherGradebooks');
      const session = await loadGradebookSession(gradebookId, assignment);
      setActiveView('teacher');
      setGradebookSession(options?.readOnly ? { ...session, readOnly: true } : session);
    } catch {
      setSyncStatus('error');
    } finally {
      setOpeningGradebook(false);
      setSyncStatus('idle');
    }
  };

  const logoutModal = showLogoutConfirm && (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <LogOut className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">ยืนยันการออกจากระบบ</h3>
        <p className="text-slate-500 mb-6">คุณต้องการออกจากระบบใช่หรือไม่?</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(false)}
            className="flex-1 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => void confirmLogout()}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );

  if (readPreviewMode() === 'curriculum') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <CurriculumPreviewPage />
      </Suspense>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="w-6 h-6 mr-2 animate-spin" />
        กำลังตรวจสอบสิทธิ์...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Login onLogin={handleLogin} isLoading={false} />
      </Suspense>
    );
  }

  if (!canAccessTeacherDashboard(currentUser) && !(activeView === 'admin' && canAccessAdminDashboard(currentUser))) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-50">
        <h2 className="text-xl font-bold text-slate-900 mb-2">บัญชีผู้บริหาร</h2>
        <p className="text-slate-500 mb-6">หน้า Dashboard ผู้บริหารจะพร้อมใช้งานใน Phase 7</p>
        <button
          type="button"
          onClick={() => void confirmLogout()}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
        >
          ออกจากระบบ
        </button>
      </div>
    );
  }

  if (openingGradebook) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="w-6 h-6 mr-2 animate-spin" />
        กำลังเปิดสมุดบันทึก...
      </div>
    );
  }

  if (activeView === 'admin' && canAccessAdminDashboard(currentUser)) {
    return (
      <>
        {renderSyncStatus()}
        <Suspense fallback={<RouteFallback />}>
          <AdminWorkspace
            currentUser={currentUser}
            onOpenTeacherView={openTeacherView}
            onOpenGradebook={handleOpenGradebook}
            onLogout={handleLogout}
          />
        </Suspense>
        {logoutModal}
      </>
    );
  }

  if (gradebookSession) {
    return (
      <>
        {renderSyncStatus()}
        <Suspense fallback={<RouteFallback />}>
          <GradebookEditor
            session={gradebookSession}
            currentUser={currentUser}
            onBack={() => {
              setGradebookSession(null);
              setTeacherDashboardKey((key) => key + 1);
            }}
            onLogout={handleLogout}
            onSettings={openAdminView}
            onSyncStatusChange={setSyncStatus}
          />
        </Suspense>
        {logoutModal}
      </>
    );
  }

  return (
    <>
      {renderSyncStatus()}
      <Suspense fallback={<RouteFallback />}>
        <TeacherDashboard
          key={teacherDashboardKey}
          currentUser={currentUser}
          onOpenGradebook={handleOpenGradebook}
          onLogout={handleLogout}
          onSettings={openAdminView}
        />
      </Suspense>
      {logoutModal}
    </>
  );
}
