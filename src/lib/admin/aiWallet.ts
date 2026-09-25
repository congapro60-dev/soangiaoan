/**
 * VÍ AI TRẢ TRƯỚC + MÃ GIẢM GIÁ — thuần, dùng chung máy chủ + giao diện.
 *
 * Chủ dự án chốt (2026-09-24): giáo viên dùng khoá chung phải NẠP TRƯỚC (chuyển khoản QR qua SePay), mỗi lượt AI
 * trừ dần; hết số dư thì AI dừng. Mọi người nhập được mã giảm giá 10%–100% có thời hạn (vd các cô trong nhóm
 * được 100% tháng 10/2026). Chủ dự án không bị trừ (khoá của chính mình).
 *
 * Minh bạch: mỗi lượt lưu giá gốc (token × giá niêm yết ngày đó × tỷ giá lúc dùng), % giảm, mã, số tiền trừ;
 * sao kê = đầu kỳ + tiền nạp + điều chỉnh − tiền trừ = cuối kỳ, cộng tay lại khớp từng đồng.
 */

export const VOUCHER_MIN_PERCENT = 10;
export const VOUCHER_MAX_PERCENT = 100;
/** Tiền tố nội dung chuyển khoản để máy chủ nhận ra khoản nạp của ai (vd "SPAI7K2QX9"). */
export const TOPUP_CODE_PREFIX = 'SPAI';
export const TOPUP_PRESETS_VND: readonly number[] = [50_000, 100_000, 200_000, 500_000];
export const TOPUP_MIN_VND = 10_000;

export interface VoucherDef {
  code: string;
  percent: number;
  /** Ngày bắt đầu / kết thúc hiệu lực (YYYY-MM-DD, giờ VN, gồm cả hai đầu). */
  validFrom: string;
  validTo: string;
  active: boolean;
  /** Số lượt đổi tối đa (0 = không giới hạn). */
  maxUses: number;
  usedCount: number;
  /** Chỉ những email này được dùng; rỗng = ai cũng dùng được. */
  allowedEmails: string[];
  note?: string;
}

export interface VoucherRedemption {
  code: string;
  percent: number;
  validFrom: string;
  validTo: string;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const normalizeVoucherCode = (value: string): string => value.trim().toUpperCase().replace(/\s+/g, '');

/** Kiểm dữ liệu khi chủ dự án tạo mã. */
export const validateVoucherInput = (raw: Partial<VoucherDef>): { ok: true; voucher: VoucherDef } | { ok: false; error: string } => {
  const code = normalizeVoucherCode(String(raw.code || ''));
  if (!/^[A-Z0-9_-]{4,32}$/.test(code)) return { ok: false, error: 'Mã chỉ gồm chữ/số/-/_, dài 4–32 ký tự.' };
  const percent = Math.round(Number(raw.percent));
  if (!(percent >= VOUCHER_MIN_PERCENT && percent <= VOUCHER_MAX_PERCENT)) {
    return { ok: false, error: `Mức giảm phải từ ${VOUCHER_MIN_PERCENT}% đến ${VOUCHER_MAX_PERCENT}%.` };
  }
  const validFrom = String(raw.validFrom || '');
  const validTo = String(raw.validTo || '');
  if (!DAY_RE.test(validFrom) || !DAY_RE.test(validTo) || validFrom > validTo) return { ok: false, error: 'Thời hạn mã không hợp lệ.' };
  const maxUses = Math.max(0, Math.round(Number(raw.maxUses) || 0));
  const allowedEmails = [...new Set((raw.allowedEmails ?? []).map(e => String(e).trim().toLowerCase()).filter(Boolean))];
  return {
    ok: true,
    voucher: { code, percent, validFrom, validTo, active: raw.active !== false, maxUses, usedCount: Number(raw.usedCount) || 0, allowedEmails, note: String(raw.note || '').slice(0, 200) },
  };
};

/** Giáo viên có đổi được mã này không (lý do cụ thể nếu không). */
export const canRedeemVoucher = (voucher: VoucherDef | null, email: string, today: string, alreadyRedeemed: boolean): string | null => {
  if (!voucher || !voucher.active) return 'Mã không tồn tại hoặc đã bị tắt.';
  if (alreadyRedeemed) return 'Thầy/cô đã dùng mã này rồi.';
  if (today > voucher.validTo) return 'Mã đã hết hạn.';
  if (voucher.maxUses > 0 && voucher.usedCount >= voucher.maxUses) return 'Mã đã hết lượt sử dụng.';
  if (voucher.allowedEmails.length > 0 && !voucher.allowedEmails.includes(email.trim().toLowerCase())) return 'Mã này không dành cho tài khoản của thầy/cô.';
  return null;
};

/** Mã đang có hiệu lực hôm nay có mức giảm CAO NHẤT (không cộng dồn nhiều mã). */
export const bestActiveVoucher = (redemptions: readonly VoucherRedemption[], today: string): VoucherRedemption | null =>
  redemptions
    .filter(r => r.validFrom <= today && today <= r.validTo)
    .sort((a, b) => b.percent - a.percent)[0] ?? null;

export interface UsageCharge {
  /** Giá gốc của lượt (VNĐ, làm tròn). */
  grossVnd: number;
  discountPct: number;
  voucherCode: string | null;
  /** Số tiền thật sự trừ ví (VNĐ, làm tròn). */
  chargeVnd: number;
}

/** Tiền một lượt: gốc = USD × tỷ giá (làm tròn đồng); trừ ví = gốc × (100 − %giảm)/100 (làm tròn đồng). */
export const chargeForCall = (costUsd: number, usdVnd: number, voucher: VoucherRedemption | null): UsageCharge => {
  const grossVnd = Math.round(Math.max(0, costUsd) * usdVnd);
  const discountPct = voucher ? Math.min(100, Math.max(0, voucher.percent)) : 0;
  return {
    grossVnd,
    discountPct,
    voucherCode: voucher?.code ?? null,
    chargeVnd: Math.round((grossVnd * (100 - discountPct)) / 100),
  };
};

/** Có được dùng khoá chung lượt này không, xét số dư + mã 100%. */
export const canAffordUsage = (balanceVnd: number, voucher: VoucherRedemption | null): boolean =>
  balanceVnd > 0 || (voucher?.percent ?? 0) >= 100;

/** Mã nạp tiền riêng mỗi giáo viên, không có ký tự dễ nhầm (0/O, 1/I). */
export const makeTopupCode = (random: () => number = Math.random): string => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let tail = '';
  for (let i = 0; i < 6; i += 1) tail += alphabet[Math.floor(random() * alphabet.length)];
  return `${TOPUP_CODE_PREFIX}${tail}`;
};

/** Rút mã nạp tiền từ nội dung chuyển khoản (ngân hàng hay chèn thêm chữ/dấu cách). */
export const extractTopupCode = (...texts: Array<string | null | undefined>): string | null => {
  for (const text of texts) {
    const match = new RegExp(`${TOPUP_CODE_PREFIX}[A-Z2-9]{6}`).exec(String(text || '').toUpperCase().replace(/\s+/g, ''));
    if (match) return match[0];
  }
  return null;
};

export interface StatementTotals {
  openingVnd: number;
  topupVnd: number;
  adjustVnd: number;
  chargeVnd: number;
  closingVnd: number;
}

/** Đầu kỳ + nạp + điều chỉnh − trừ = cuối kỳ. */
export const statementTotals = (openingVnd: number, topupVnd: number, adjustVnd: number, chargeVnd: number): StatementTotals => ({
  openingVnd, topupVnd, adjustVnd, chargeVnd, closingVnd: openingVnd + topupVnd + adjustVnd - chargeVnd,
});

/** Một dòng tiền trong sổ: nạp (+), điều chỉnh (±), trừ theo lượt dùng (ghi SỐ DƯƠNG ở `charges`). */
export interface LedgerAmount {
  month: string;
  amountVnd: number;
}

const sumOf = (list: readonly LedgerAmount[], pick: (entry: LedgerAmount) => boolean): number =>
  list.filter(pick).reduce((sum, entry) => sum + entry.amountVnd, 0);

/** Sao kê tháng M tính lại từ TOÀN BỘ sổ: đầu kỳ = mọi dòng trước tháng M. */
export const statementForMonth = (
  month: string,
  topups: readonly LedgerAmount[],
  adjustments: readonly LedgerAmount[],
  charges: readonly LedgerAmount[],
): StatementTotals => {
  const before = (e: LedgerAmount) => e.month < month;
  const within = (e: LedgerAmount) => e.month === month;
  const opening = sumOf(topups, before) + sumOf(adjustments, before) - sumOf(charges, before);
  return statementTotals(opening, sumOf(topups, within), sumOf(adjustments, within), sumOf(charges, within));
};

/** Các tháng (YYYY-MM) từ `from` tới `to`, gồm cả hai đầu, mới nhất trước. */
export const monthsBetween = (from: string, to: string): string[] => {
  const months: string[] = [];
  let [y, m] = from.split('-').map(Number);
  for (let guard = 0; guard < 240; guard += 1) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (key > to) break;
    months.push(key);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return months.reverse();
};

/** Link ảnh QR chuyển khoản của SePay (VietQR) — số tiền + nội dung điền sẵn. */
export const sepayQrUrl = (account: { bank: string; accountNumber: string }, amountVnd: number, description: string): string =>
  `https://qr.sepay.vn/img?acc=${encodeURIComponent(account.accountNumber)}&bank=${encodeURIComponent(account.bank)}&amount=${Math.round(amountVnd)}&des=${encodeURIComponent(description)}`;

// ── Tài khoản nhận tiền nạp (chủ dự án có nhiều tài khoản, chọn MỘT tài khoản đang dùng) ──────────

/**
 * Ngân hàng SePay liên kết được — tên viết tắt dùng để dựng QR (nguồn qr.sepay.vn/banks.json, supported=true).
 * Tài khoản nhận tiền PHẢI đã liên kết trong SePay thì SePay mới thấy tiền về để báo máy chủ cộng ví.
 */
export const SEPAY_BANKS: readonly string[] = [
  'MBBank', 'Vietcombank', 'VietinBank', 'BIDV', 'Techcombank', 'ACB', 'VPBank', 'TPBank', 'MSB', 'Sacombank', 'VIB',
  'HDBank', 'SeABank', 'OCB', 'LienVietPostBank', 'VietCapitalBank', 'ShinhanBank', 'Agribank', 'BacABank', 'ABBANK',
  'Eximbank', 'PublicBank', 'KienLongBank',
];

export interface PaymentAccount {
  id: string;
  bank: string;
  accountNumber: string;
  accountName: string;
  /** Ảnh QR của chính tài khoản do chủ dự án tải lên; '' = chưa có. */
  qrImageUrl: string;
}

export interface PaymentSettings {
  accounts: PaymentAccount[];
  activeId: string;
}

/** Ảnh QR chỉ được là file do máy chủ lưu trong Firebase Storage của web (thư mục payment-qr/). */
export const isPaymentQrUrl = (url: string): boolean =>
  /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/payment-qr%2F[^?]+\?alt=media&token=[\w-]+$/.test(url);

export const validatePaymentAccount = (raw: Record<string, unknown>): { ok: true; account: Omit<PaymentAccount, 'id'> } | { ok: false; error: string } => {
  const bank = String(raw.bank ?? '').trim();
  const accountNumber = String(raw.accountNumber ?? '').replace(/\s+/g, '');
  const accountName = String(raw.accountName ?? '').trim().slice(0, 80);
  const qrImageUrl = String(raw.qrImageUrl ?? '').trim();
  if (!bank || bank.length > 40) return { ok: false, error: 'Chọn ngân hàng (tên viết tắt như trong SePay, vd MBBank).' };
  if (!/^\d{6,20}$/.test(accountNumber)) return { ok: false, error: 'Số tài khoản chỉ gồm 6–20 chữ số.' };
  if (qrImageUrl && !isPaymentQrUrl(qrImageUrl)) return { ok: false, error: 'Ảnh QR không hợp lệ — tải ảnh lên lại.' };
  return { ok: true, account: { bank, accountNumber, accountName, qrImageUrl } };
};

/** Đọc document cài đặt thô → danh sách sạch + tài khoản đang dùng (mất tài khoản đang dùng thì lấy cái đầu). */
export const normalizePaymentSettings = (data: Record<string, unknown> | undefined): PaymentSettings => {
  const accounts = (Array.isArray(data?.accounts) ? data.accounts : [])
    .map(item => (item && typeof item === 'object' ? item as Record<string, unknown> : {}))
    .flatMap(item => {
      const checked = validatePaymentAccount(item);
      const id = String(item.id ?? '');
      return checked.ok && id ? [{ id, ...checked.account }] : [];
    });
  const wanted = String(data?.activeId ?? '');
  return { accounts, activeId: accounts.some(a => a.id === wanted) ? wanted : accounts[0]?.id ?? '' };
};

export const activePaymentAccount = (settings: PaymentSettings): PaymentAccount | null =>
  settings.accounts.find(a => a.id === settings.activeId) ?? null;
