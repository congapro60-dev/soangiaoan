/** Gọi các action quản trị ở /api/classroom. Quyền được kiểm lại ở máy chủ. */
import { auth } from '../firebase';
import type { TeacherUsage } from './billing';

export interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  disabled: boolean;
  createdAt: string | null;
  lastSignInAt: string | null;
  lastActiveAt: string | null;
}

export interface AdminClass {
  id: string;
  name: string;
  grade: string;
  teacherId: string;
  teacherIds: string[];
  studentCount: number;
  createdAt: string | null;
  hasExamSheet: boolean;
  hasSheetSync: boolean;
  assignmentCount: number;
  submissionCount: number;
  gradedCount: number;
}

export interface AdminBillingSettings {
  usdVnd: number;
  usdVndNote: string;
  preMeteringVnd: number;
  preMeteringNote: string;
  updatedAt?: string;
}

export interface AdminOverview {
  users: AdminUser[];
  anonymousCount: number;
  classes: AdminClass[];
  aiEventsBefore: Record<string, number>;
  aiEventsAfter: Record<string, number>;
  settings: AdminBillingSettings;
  meteringStartDay: string;
}

export interface AdminUsage {
  rows: TeacherUsage[];
  recordCount: number;
  fromDay: string;
  toDay: string;
}

const callAdmin = async <T>(payload: Record<string, unknown>): Promise<T> => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Cần đăng nhập tài khoản quản trị.');
  const idToken = await user.getIdToken();
  const response = await fetch('/api/classroom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, idToken }),
  });
  const data = await response.json().catch(() => null) as { error?: unknown } | null;
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : `Máy chủ trả lỗi ${response.status}.`);
  return data as T;
};

export const loadAdminOverview = () => callAdmin<AdminOverview>({ action: 'adminOverview' });

export const loadAdminUsage = (fromDay: string, toDay: string) => callAdmin<AdminUsage>({ action: 'adminUsage', fromDay, toDay });

export const saveAdminSettings = (settings: AdminBillingSettings) =>
  callAdmin<{ settings: AdminBillingSettings }>({ action: 'adminSaveSettings', ...settings });

export const fetchVcbUsdRate = () => callAdmin<{ sell: number; dateTime: string }>({ action: 'adminFetchVcbRate' });

/** Ngày hôm nay theo giờ Việt Nam (YYYY-MM-DD). */
export const todayVn = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
