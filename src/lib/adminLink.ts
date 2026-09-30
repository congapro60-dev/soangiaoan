import { signInWithCustomToken, type User } from 'firebase/auth';
import { auth } from './firebase';
import { PRIMARY_ADMIN_EMAIL, isAdminEmail } from './admin/adminConfig';

/**
 * Chủ dự án có nhiều mail: đăng nhập Google bằng mail phụ thì máy chủ cấp phiên của tài khoản chính
 * (api/_admin-link.ts) → mọi dữ liệu dùng chung một uid. Mail Google thật đứng sau phiên nằm ở claim
 * `linkedEmail`; Drive/Sheets cần token của ĐÚNG mail đó (file của trường nằm ở mail trường).
 */
let linkedGoogleEmail: string | null = null;

export const getLinkedGoogleEmail = (): string | null => linkedGoogleEmail;

/** Nhớ mail Google thật của phiên đã gộp (đọc từ claim khi tải lại trang). */
export const rememberLinkedEmail = async (user: User | null): Promise<void> => {
  if (!user || user.isAnonymous) { linkedGoogleEmail = null; return; }
  try {
    const claim = (await user.getIdTokenResult()).claims.linkedEmail;
    linkedGoogleEmail = typeof claim === 'string' ? claim : null;
  } catch {
    linkedGoogleEmail = null;
  }
};

/** Phiên Google của một mail admin phụ, chưa được gộp vào tài khoản chính. */
export const needsAdminLink = (user: User | null): boolean =>
  !!user && !user.isAnonymous && isAdminEmail(user.email)
  && user.email!.trim().toLowerCase() !== PRIMARY_ADMIN_EMAIL
  && user.providerData.some(p => p.providerId === 'google.com');

export interface AdminLinkResult {
  linkedEmail: string;
  primaryEmail: string;
  /** Tài liệu còn nằm ở uid riêng của mail phụ (trước khi gộp), theo collection. */
  orphans: Record<string, number>;
}

/** Đổi phiên mail phụ sang phiên tài khoản chính. Ném lỗi nếu máy chủ từ chối. */
export const linkAdminSession = async (user: User): Promise<AdminLinkResult> => {
  const response = await fetch('/api/classroom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'linkAdminSession', idToken: await user.getIdToken() }),
  });
  const data = await response.json().catch(() => null) as (Partial<AdminLinkResult> & { customToken?: string; error?: string }) | null;
  if (!response.ok || !data?.customToken) throw new Error(data?.error || `Máy chủ trả lỗi ${response.status}.`);
  await signInWithCustomToken(auth, data.customToken);
  linkedGoogleEmail = data.linkedEmail ?? null;
  return { linkedEmail: data.linkedEmail ?? '', primaryEmail: data.primaryEmail ?? PRIMARY_ADMIN_EMAIL, orphans: data.orphans ?? {} };
};
