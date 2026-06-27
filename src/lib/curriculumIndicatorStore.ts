import type { CurriculumIndicatorRecord } from '../data/curriculum/types';

const STORAGE_KEY = 'ksp-curriculum-indicator-store-v1';
const LEGACY_HIDDEN_KEY = 'ksp-hidden-curriculum-indicator-ids';

interface CurriculumIndicatorStoreData {
  hiddenIds: string[];
  customRecords: CurriculumIndicatorRecord[];
  overrides: Record<string, CurriculumIndicatorRecord>;
}

function readStore(): CurriculumIndicatorStoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base: CurriculumIndicatorStoreData = raw
      ? (() => {
          const parsed = JSON.parse(raw) as Partial<CurriculumIndicatorStoreData>;
          return {
            hiddenIds: Array.isArray(parsed.hiddenIds)
              ? parsed.hiddenIds.filter((id): id is string => typeof id === 'string')
              : [],
            customRecords: Array.isArray(parsed.customRecords) ? parsed.customRecords : [],
            overrides: parsed.overrides && typeof parsed.overrides === 'object' ? parsed.overrides : {},
          };
        })()
      : { hiddenIds: [], customRecords: [], overrides: {} };

    return migrateLegacyHiddenIds(base);
  } catch {
    return { hiddenIds: [], customRecords: [], overrides: {} };
  }
}

function migrateLegacyHiddenIds(store: CurriculumIndicatorStoreData): CurriculumIndicatorStoreData {
  try {
    const legacy = localStorage.getItem(LEGACY_HIDDEN_KEY);
    if (!legacy) return store;
    const parsed = JSON.parse(legacy) as unknown;
    if (!Array.isArray(parsed)) return store;
    const merged = new Set([
      ...store.hiddenIds,
      ...parsed.filter((id): id is string => typeof id === 'string'),
    ]);
    localStorage.removeItem(LEGACY_HIDDEN_KEY);
    return { ...store, hiddenIds: [...merged] };
  } catch {
    return store;
  }
}

function writeStore(data: CurriculumIndicatorStoreData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function isCustomCurriculumIndicatorId(id: string): boolean {
  return id.startsWith('custom-');
}

export function getHiddenCurriculumIndicatorIds(): Set<string> {
  return new Set(readStore().hiddenIds);
}

export function applyCurriculumStoreToBase(
  baseRecords: CurriculumIndicatorRecord[],
): CurriculumIndicatorRecord[] {
  const store = readStore();
  const hidden = new Set(store.hiddenIds);
  return baseRecords
    .filter((row) => !hidden.has(row.id))
    .map((row) => store.overrides[row.id] ?? row);
}

export function getVisibleCustomCurriculumRecords(): CurriculumIndicatorRecord[] {
  const store = readStore();
  const hidden = new Set(store.hiddenIds);
  return store.customRecords.filter((row) => !hidden.has(row.id));
}

/** @deprecated Use applyCurriculumStoreToBase instead */
export function mergeCurriculumRecords(baseRecords: CurriculumIndicatorRecord[]): CurriculumIndicatorRecord[] {
  return [
    ...applyCurriculumStoreToBase(baseRecords),
    ...getVisibleCustomCurriculumRecords(),
  ];
}

export function hideCurriculumIndicatorIds(ids: string[]): void {
  if (ids.length === 0) return;
  const store = readStore();
  const hidden = new Set(store.hiddenIds);
  ids.forEach((id) => hidden.add(id));
  writeStore({ ...store, hiddenIds: [...hidden] });
}

export function deleteCurriculumIndicator(id: string): void {
  const store = readStore();
  const hidden = new Set(store.hiddenIds);
  hidden.add(id);

  if (isCustomCurriculumIndicatorId(id)) {
    writeStore({
      ...store,
      hiddenIds: [...hidden],
      customRecords: store.customRecords.filter((row) => row.id !== id),
    });
    return;
  }

  const { [id]: _removed, ...overrides } = store.overrides;
  writeStore({
    ...store,
    hiddenIds: [...hidden],
    overrides,
  });
}

export function saveCurriculumIndicator(record: CurriculumIndicatorRecord): void {
  const store = readStore();

  if (isCustomCurriculumIndicatorId(record.id)) {
    const exists = store.customRecords.some((row) => row.id === record.id);
    const customRecords = exists
      ? store.customRecords.map((row) => (row.id === record.id ? record : row))
      : [...store.customRecords, record];
    writeStore({ ...store, customRecords });
    return;
  }

  writeStore({
    ...store,
    overrides: { ...store.overrides, [record.id]: record },
  });
}

export function createCurriculumIndicatorId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
