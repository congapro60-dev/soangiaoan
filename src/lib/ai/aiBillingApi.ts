/** Client cho khoá AI riêng, ví trả trước, mã giảm giá, sao kê (giáo viên) + phần quản trị tương ứng. */
import { auth } from '../firebase';
import type { AiKeyBlockReason } from '../admin/aiKeyPolicy';
import type { PaymentAccount, PaymentSettings, VoucherDef, VoucherRedemption } from '../admin/aiWallet';

const call = async <T>(payload: Record<string, unknown>): Promise<T> => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Cần đăng nhập tài khoản giáo viên.');
  const res = await fetch('/api/classroom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, idToken: await user.getIdToken() }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : `Máy chủ trả lỗi ${res.status}.`);
  return data as T;
};

export type { PaymentAccount };

export interface AiKeyStatus {
  month: string;
  charged: boolean;
  exempt: boolean;
  spentVnd: number;
  grossVnd: number;
  spentCalls: number;
  usdVnd: number;
  capVnd: number | null;
  gateEnabled: boolean;
  shared: boolean;
  hasKey: boolean;
  last4: string;
  keyStatus: 'ok' | 'exhausted' | 'invalid' | null;
  keyStatusAt: string | null;
  consent: boolean;
  consentAt: string | null;
  blockedSubmissionIds: string[];
  balanceVnd: number;
  topupCode: string;
  paymentAccount: PaymentAccount | null;
  vouchers: VoucherRedemption[];
  activeVoucher: VoucherRedemption | null;
}

export const getAiKeyStatus = () => call<AiKeyStatus>({ action: 'aiKeyStatus' });
export const saveAiKey = (key: string) => call<AiKeyStatus>({ action: 'saveAiKey', key });
export const deleteAiKey = () => call<AiKeyStatus>({ action: 'deleteAiKey' });
export const setAiConsent = (accepted: boolean) => call<AiKeyStatus>({ action: 'setAiConsent', accepted });
export const setAiSpendCap = (capVnd: number | null) => call<AiKeyStatus>({ action: 'setAiSpendCap', capVnd });
export const redeemAiVoucher = (code: string) => call<AiKeyStatus>({ action: 'redeemVoucher', code });

export interface StatementItem {
  id: string;
  at: string;
  feature: string;
  model: string;
  refs: Record<string, string>;
  inputTokens: number;
  outputTokens: number;
  thoughtsTokens: number;
  cachedTokens: number;
  costUsd: number;
  usdVnd: number;
  grossVnd: number;
  discountPct: number;
  voucherCode: string | null;
  chargeVnd: number;
  className?: string;
  assignmentTitle?: string;
  studentName?: string;
}

export interface StatementTopup {
  sepayId: string;
  amountVnd: number;
  at: string;
  gateway: string;
  referenceCode: string;
  transactionDate: string;
  content: string;
}

export interface StatementAdjustment {
  amountVnd: number;
  reason: string;
  at: string;
}

export interface AiStatement {
  uid: string;
  month: string;
  currentMonth: string;
  months: string[];
  openingVnd: number;
  topupVnd: number;
  adjustVnd: number;
  chargeVnd: number;
  closingVnd: number;
  grossVnd: number;
  discountVnd: number;
  walletBalanceVnd: number;
  topups: StatementTopup[];
  adjustments: StatementAdjustment[];
  items: StatementItem[];
  ownKeyCalls: number;
}

export const getAiStatement = (month?: string) => call<AiStatement>({ action: 'aiStatement', ...(month ? { month } : {}) });

// ── Quản trị ──

export interface AdminAiAccess {
  enabled: boolean;
  sharedEmails: string[];
  sharedUids: string[];
  exemptUids: string[];
  teachers: Array<{ uid: string; email: string; hasKey: boolean; last4: string; keyStatus: string | null; consent: boolean; consentAt: string | null }>;
}

export const adminGetAiAccess = () => call<AdminAiAccess>({ action: 'adminAiAccess' });
export const adminSaveAiAccess = (enabled: boolean, sharedEmails: string[]) => call<AdminAiAccess>({ action: 'adminSaveAiAccess', enabled, sharedEmails });

export const adminGetVouchers = () => call<{ vouchers: Array<VoucherDef & { createdAt?: string }> }>({ action: 'adminVouchers' });
export const adminSaveVoucher = (voucher: Partial<VoucherDef>) => call<{ voucher: VoucherDef }>({ action: 'adminSaveVoucher', voucher });
export const adminAssignVoucher = (email: string, code: string) => call<{ redemption: VoucherRedemption }>({ action: 'adminAssignVoucher', email, code });

export interface AdminWalletRow {
  uid: string;
  email: string;
  balanceVnd: number;
  topupCode: string;
}

export interface UnmatchedTopup extends Omit<StatementTopup, 'at'> {
  id: string;
  receivedAt: string;
}

export const adminGetWallets = () => call<{ wallets: AdminWalletRow[]; unmatched: UnmatchedTopup[] }>({ action: 'adminWallets' });
export const adminAdjustWallet = (uid: string, amountVnd: number, reason: string) => call<{ wallet: { balanceVnd: number } }>({ action: 'adminAdjustWallet', uid, amountVnd, reason });
export const adminAssignUnmatchedTopup = (id: string, uid: string) => call<{ credited: boolean }>({ action: 'adminAssignUnmatchedTopup', id, uid });
export interface AdminPaymentSettings extends PaymentSettings {
  /** Máy chủ đã có biến SEPAY_WEBHOOK_KEY (tiền nạp tự cộng ví). */
  webhookReady: boolean;
}

export const adminGetPaymentAccounts = () => call<AdminPaymentSettings>({ action: 'adminPaymentAccount' });
/** Thêm/sửa tài khoản (có `id` là sửa). `qrDataUrl` = ảnh QR mới; `removeQr` = bỏ ảnh đang có. */
export const adminSavePaymentAccount = (account: Partial<PaymentAccount>, qr: { dataUrl?: string; remove?: boolean } = {}) =>
  call<AdminPaymentSettings>({ action: 'adminPaymentAccount', op: 'save', account, ...(qr.dataUrl ? { qrDataUrl: qr.dataUrl } : {}), ...(qr.remove ? { removeQr: true } : {}) });
export const adminActivatePaymentAccount = (id: string) => call<AdminPaymentSettings>({ action: 'adminPaymentAccount', op: 'activate', id });
export const adminDeletePaymentAccount = (id: string) => call<AdminPaymentSettings>({ action: 'adminPaymentAccount', op: 'delete', id });

export interface MonthOverviewRow {
  uid: string;
  email: string;
  calls: number;
  grossVnd: number;
  chargeVnd: number;
  topupVnd: number;
  adjustVnd: number;
}

export const adminMonthOverview = (month: string) => call<{ month: string; rows: MonthOverviewRow[] }>({ action: 'adminMonthOverview', month });
export const adminGetStatement = (uid: string, month: string) => call<AiStatement>({ action: 'adminStatement', uid, month });

export type { AiKeyBlockReason };
