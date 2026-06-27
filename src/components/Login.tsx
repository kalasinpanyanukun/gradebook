import React, { useState, useEffect } from 'react';
import { Lock, User as UserIcon, LogIn, Loader2 } from 'lucide-react';
import { signInWithUsername, resolveAppUser, signOut } from '../lib/auth';
import type { AppUser } from '../types';

interface LoginProps {
  onLogin: (user: AppUser) => void;
  isLoading?: boolean;
}

const REMEMBERED_USERNAME_KEY = 'rememberedUsername';

const DeveloperCredit = () => (
  <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-0.5 text-xs z-10">
    <span className="text-white font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">พัฒนาโดย ครูธนิท ธนพัตนิรัชกุล</span>
    <span className="text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">KSP GradeBook V 0.1.0</span>
  </div>
);

const LoginShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen font-sans relative overflow-hidden network-bg">
    <div className="relative z-10 min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 items-center">
      <div className="hidden lg:block" aria-hidden="true" />
      <div className="flex justify-center lg:justify-start items-center p-4 sm:p-6 lg:pl-14 xl:pl-20 lg:pr-10 xl:pr-14">
        <div className="w-full max-w-[27.66rem] shrink-0 lg:translate-x-[240px]">
          {children}
        </div>
      </div>
    </div>
    <DeveloperCredit />
  </div>
);

const CardHeader = () => (
  <div className="flex flex-col items-center mb-8 text-center">
    <img
      src="/logo3.png"
      alt="KSP GradeBook Logo"
      className="h-20 object-contain mb-4"
    />
    <h1 className="text-2xl sm:text-3xl font-bold text-blue-950 mb-2 tracking-tight">
      KSP GradeBook
    </h1>
    <p className="mt-1 whitespace-nowrap text-[14px] sm:text-[15px] font-bold text-blue-950 leading-snug">
      ระบบบันทึกผลการพัฒนาคุณภาพผู้เรียน (ปพ.5)
    </p>
    <p className="mt-2 text-[14px] sm:text-[15px] font-bold text-blue-950 leading-snug">
      ฝ่ายบริหารงานวิชาการ
    </p>
    <p className="text-gray-500 text-sm mt-1 leading-relaxed">
      โรงเรียนกาฬสินธุ์ปัญยานุกูล จังหวัดกาฬสินธุ์
    </p>
  </div>
);

export const Login: React.FC<LoginProps> = ({ onLogin, isLoading = false }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBERED_USERNAME_KEY);
    if (remembered) {
      setUsername(remembered);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const session = await signInWithUsername(username, password);
      const appUser = await resolveAppUser(session);

      if (!appUser) {
        await signOut();
        throw new Error('ไม่พบข้อมูลโปรไฟล์ในระบบ กรุณาติดต่อผู้ดูแลระบบ');
      }

      if (!appUser.isActive) {
        await signOut();
        setError('บัญชีของคุณถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
        return;
      }

      if (rememberMe) {
        localStorage.setItem(REMEMBERED_USERNAME_KEY, username.trim());
      } else {
        localStorage.removeItem(REMEMBERED_USERNAME_KEY);
      }

      onLogin(appUser);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ';
      if (message.toLowerCase().includes('invalid login credentials')) {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const busy = isLoading || submitting;

  return (
    <LoginShell>
      <div className="w-full max-w-[27.66rem] bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10">
        <CardHeader />

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-11 pr-4 py-3.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="ชื่อผู้ใช้ หรือ อีเมล"
                required
                autoComplete="username"
                disabled={busy}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-11 pr-4 py-3.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="รหัสผ่าน (Password)"
                required
                autoComplete="current-password"
                disabled={busy}
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={busy}
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600">
              จดจำชื่อผู้ใช้
            </label>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:-translate-y-0"
          >
            {busy ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                กำลังเข้าสู่ระบบ...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                เข้าสู่ระบบ
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} KSP GradeBook. All rights reserved.
          </p>
        </div>
      </div>
    </LoginShell>
  );
};
