import React from 'react';
import { BookMarked } from 'lucide-react';
import { CurriculumIndicatorsPage } from './CurriculumIndicatorsPage';

/** หน้าพรีวิวหลักสูตร (ไม่ต้องล็อกอิน) — ใช้กับ ?preview=curriculum */
export const CurriculumPreviewPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f5f5f7] font-sans text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3.5 sm:px-6">
          <img src="/logo3.png" alt="KSP GradeBook" className="h-10 w-10 shrink-0 object-contain" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <BookMarked className="h-4 w-4 shrink-0 text-blue-600" />
              <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-900">
                พรีวิวหลักสูตรและตัวชี้วัด
              </h1>
            </div>
            <p className="text-xs text-slate-500">โหมดพรีวิว — ข้อมูลจากหลักสูตรสถานศึกษา (ไม่ต้องล็อกอิน)</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-3 py-2 sm:px-4 sm:py-2.5 lg:px-5 lg:py-3">
        <CurriculumIndicatorsPage />
      </main>
    </div>
  );
};
