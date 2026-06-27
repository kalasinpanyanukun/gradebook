export type GradebookStatus = 'not_started' | 'in_progress' | 'completed';

export function resolveGradebookStatus(
  status: GradebookStatus | null | undefined,
  completionPercent: number,
): GradebookStatus {
  if (status === 'completed' || completionPercent >= 100) return 'completed';
  if (status === 'in_progress' || completionPercent > 0) return 'in_progress';
  return 'not_started';
}

export function gradebookStatusLabel(
  status: GradebookStatus | null | undefined,
  completionPercent: number,
): string {
  const resolved = resolveGradebookStatus(status, completionPercent);
  if (resolved === 'completed') return 'เรียบร้อยแล้ว';
  if (resolved === 'in_progress') return 'กำลังลงข้อมูล';
  return 'ยังไม่ลงข้อมูล';
}

export function gradebookStatusClassName(status: GradebookStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'in_progress':
      return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';
    default:
      return 'bg-slate-100 text-slate-500 ring-1 ring-slate-200';
  }
}
