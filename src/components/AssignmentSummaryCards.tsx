import type { ElementType } from 'react';
import { BarChart3, BookOpen, Layers, School } from 'lucide-react';
import { progressTone } from '../lib/progressTone';

interface AssignmentSummaryCardsProps {
  subjectCount: number;
  classLevelNames: string[];
  classroomNames: string[];
  progress: number;
  className?: string;
}

function compactList(items: string[], fallback = '-'): string {
  if (items.length === 0) return fallback;
  if (items.length <= 4) return items.join(', ');
  return `${items.slice(0, 4).join(', ')} +${items.length - 4}`;
}

const cardClass = 'min-h-[68px] rounded-xl border px-3 py-2.5';
const labelClass = 'text-[11px] font-bold leading-tight text-slate-600';
const valueClass = 'text-xl font-extrabold leading-none tracking-tight text-slate-950 sm:text-2xl';

function MetricCard({
  label,
  value,
  toneClass,
  icon: Icon,
  title,
}: {
  label: string;
  value: string | number;
  toneClass: string;
  icon: ElementType;
  title?: string;
}) {
  return (
    <div className={cardClass}>
      <div className="flex h-full items-center justify-between gap-2">
        <p className={`${labelClass} ${toneClass} min-w-0 flex-1`}>{label}</p>
        <p className={`${valueClass} shrink-0 tabular-nums`} title={title}>
          {value}
        </p>
        <Icon className={`h-7 w-7 shrink-0 ${toneClass}`} />
      </div>
    </div>
  );
}

export function AssignmentSummaryCards({
  subjectCount,
  classLevelNames,
  classroomNames,
  progress,
  className = '',
}: AssignmentSummaryCardsProps) {
  const progressMeta = progressTone(progress);
  const classLevelText = compactList(classLevelNames);
  const classroomText = compactList(classroomNames);

  return (
    <section className={`ui-card p-2.5 ${className}`}>
      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="จำนวนวิชา"
          value={subjectCount}
          toneClass="text-blue-700"
          icon={BookOpen}
        />

        <div className={`${cardClass} border-emerald-100 bg-emerald-50/60`}>
          <div className="flex h-full items-center justify-between gap-2">
            <p className={`${labelClass} min-w-0 flex-1 text-emerald-700`}>ชั้นเรียนที่สอน</p>
            <p className={`${valueClass} max-w-[58%] truncate text-right text-emerald-950`} title={classLevelText}>
              {classLevelText}
            </p>
            <Layers className="h-7 w-7 shrink-0 text-emerald-700" />
          </div>
        </div>

        <div className={`${cardClass} border-amber-100 bg-amber-50/60`}>
          <div className="flex h-full items-center justify-between gap-2">
            <p className={`${labelClass} min-w-0 flex-1 text-amber-700`}>ห้องที่รับผิดชอบ</p>
            <p className={`${valueClass} max-w-[58%] truncate text-right text-amber-950`} title={classroomText}>
              {classroomText}
            </p>
            <School className="h-7 w-7 shrink-0 text-amber-700" />
          </div>
        </div>

        <MetricCard
          label="สถานะการลงข้อมูล"
          value={progressMeta.label}
          toneClass={progressMeta.textClassName}
          icon={BarChart3}
        />
      </div>
    </section>
  );
}
