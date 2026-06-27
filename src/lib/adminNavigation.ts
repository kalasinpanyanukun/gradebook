export const ADMIN_TAB_IDS = [
  'main',
  'home',
  'assignments',
  'academic-admins',
  'academic-years',
  'classrooms',
  'students',
  'subjects',
  'curriculum',
  'settings-general',
  'settings-activity',
  'settings-system',
  'learning-area-heads',
] as const;

export type AdminTabId = (typeof ADMIN_TAB_IDS)[number];

const ADMIN_WORKSPACE_YEAR_KEY = 'ksp-admin-workspace-year';

function workspaceYearStorageKey(schoolId: string): string {
  return `${ADMIN_WORKSPACE_YEAR_KEY}:${schoolId}`;
}

export function readAdminTabFromUrl(): AdminTabId | null {
  const tab = new URLSearchParams(window.location.search).get('tab');
  if (!tab) return null;
  return ADMIN_TAB_IDS.includes(tab as AdminTabId) ? (tab as AdminTabId) : null;
}

export function isAdminTabUrl(): boolean {
  return readAdminTabFromUrl() !== null;
}

export function syncAdminTabToUrl(tab: AdminTabId): void {
  const url = new URL(window.location.href);
  url.searchParams.set('tab', tab);
  window.history.replaceState({}, '', url.toString());
}

export function clearAdminTabFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('tab');
  window.history.replaceState({}, '', url.toString());
}

export function readStoredWorkspaceYear(schoolId: string | null | undefined): string | undefined {
  if (!schoolId) return undefined;
  const value = window.localStorage.getItem(workspaceYearStorageKey(schoolId));
  return value || undefined;
}

export function persistWorkspaceYear(schoolId: string | null | undefined, yearId: string | undefined): void {
  if (!schoolId) return;
  const key = workspaceYearStorageKey(schoolId);
  if (yearId) {
    window.localStorage.setItem(key, yearId);
  } else {
    window.localStorage.removeItem(key);
  }
}

export function shouldEnterAdminWorkspace(
  tab: AdminTabId | null,
  schoolId: string | null | undefined,
): boolean {
  if (tab) return true;
  return Boolean(readStoredWorkspaceYear(schoolId));
}
