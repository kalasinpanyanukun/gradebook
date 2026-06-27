export interface ProgressTone {
  value: number;
  /** ความกว้างแท่งที่แสดงจริง (ตรงกับเปอร์เซ็นต์) */
  displayWidth: number;
  barClassName: string;
  textClassName: string;
  label: string;
  isCompleted: boolean;
}

export function clampProgress(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function progressDisplayWidth(value: number): number {
  return clampProgress(value);
}

export function progressTone(value: number | null | undefined): ProgressTone {
  const safeValue = clampProgress(value);
  const displayWidth = progressDisplayWidth(safeValue);

  if (safeValue >= 100) {
    return {
      value: 100,
      displayWidth: 100,
      barClassName: 'bg-emerald-600',
      textClassName: 'text-emerald-700',
      label: 'เรียบร้อยแล้ว',
      isCompleted: true,
    };
  }

  if (safeValue <= 25) {
    return {
      value: safeValue,
      displayWidth,
      barClassName: 'bg-red-500',
      textClassName: 'text-red-600',
      label: `${safeValue}%`,
      isCompleted: false,
    };
  }

  if (safeValue <= 50) {
    return {
      value: safeValue,
      displayWidth,
      barClassName: 'bg-yellow-400',
      textClassName: 'text-yellow-700',
      label: `${safeValue}%`,
      isCompleted: false,
    };
  }

  if (safeValue <= 75) {
    return {
      value: safeValue,
      displayWidth,
      barClassName: 'bg-blue-600',
      textClassName: 'text-blue-700',
      label: `${safeValue}%`,
      isCompleted: false,
    };
  }

  return {
    value: safeValue,
    displayWidth,
    barClassName: 'bg-emerald-500',
    textClassName: 'text-emerald-700',
    label: `${safeValue}%`,
    isCompleted: false,
  };
}
