/**
 * VÍ AI TRẢ TRƯỚC: số dư, mã nạp tiền, mã giảm giá, webhook SePay, điều chỉnh tay của chủ dự án.
 * Mọi collection ở đây CHỈ máy chủ đọc/ghi (rules mặc định chặn client).
 *
 *  aiWallets/{uid}                 { balanceVnd, topupCode }
 *  aiTopups/{sepayId}              khoản nạp đã cộng ví (id giao dịch SePay → không bao giờ cộng hai lần)
 *  aiTopupsUnmatched/{sepayId}     tiền vào nhưng không đọc được mã nạp → chủ dự án gán tay
 *  aiAdjustments/{autoId}          chủ dự án cộng/trừ tay (bắt buộc ghi lý do, hiện trên sao kê)
 *  aiVouchers/{CODE}               mã giảm giá
 *  aiVoucherRedemptions/{uid}_{CODE}
 *  adminSettings/payment           { accounts[], activeId } — các tài khoản nhận tiền (+ ảnh QR tự tải) và tài khoản đang dùng
 *  Storage payment-qr/…            ảnh QR tài khoản do chủ dự án tải lên (link tải có token, máy chủ ghi)
 */
import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { vnDate } from './_ai-usage.js';
import { getAdminStorage } from './_exam-core.js';
import {
  activePaymentAccount,
  bestActiveVoucher,
  canAffordUsage,
  canRedeemVoucher,
  extractTopupCode,
  makeTopupCode,
  normalizePaymentSettings,
  normalizeVoucherCode,
  validatePaymentAccount,
  validateVoucherInput,
  type PaymentAccount,
  type PaymentSettings,
  type VoucherDef,
  type VoucherRedemption,
} from '../src/lib/admin/aiWallet.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

export const AI_WALLETS_COL = 'aiWallets';
export const AI_TOPUPS_COL = 'aiTopups';
export const AI_TOPUPS_UNMATCHED_COL = 'aiTopupsUnmatched';
export const AI_ADJUSTMENTS_COL = 'aiAdjustments';
export const AI_VOUCHERS_COL = 'aiVouchers';
export const AI_REDEMPTIONS_COL = 'aiVoucherRedemptions';
const PAYMENT_REF = (db: Db) => db.collection('adminSettings').doc('payment');

const DEFAULT_USD_VND = 26_190;
const today = (): string => vnDate(new Date()).day;
const nowIso = (): string => new Date().toISOString();

/** Tỷ giá chủ dự án đặt trong Quản trị (VCB bán ra) — dùng quy giá từng lượt ra VNĐ lúc dùng. */
export const loadUsdVnd = async (db: Db): Promise<number> => {
  const snap = await db.collection('adminSettings').doc('billing').get().catch(() => null);
  const rate = Number(snap?.exists ? snap.data()?.usdVnd : NaN);
  return Number.isFinite(rate) && rate > 1000 ? rate : DEFAULT_USD_VND;
};

export const loadPaymentSettings = async (db: Db): Promise<PaymentSettings> => {
  const snap = await PAYMENT_REF(db).get();
  return normalizePaymentSettings(snap.exists ? snap.data() : undefined);
};

/** Tài khoản giáo viên thấy khi nạp tiền (tài khoản chủ dự án đang chọn dùng). */
export const loadPaymentAccount = async (db: Db): Promise<PaymentAccount | null> => activePaymentAccount(await loadPaymentSettings(db));

const PAYMENT_QR_MAX_BYTES = 1_500_000;
const MAX_PAYMENT_ACCOUNTS = 20;

/** Lưu ảnh QR (data URL) vào Storage của web → link tải có token, trang giáo viên hiện thẳng được. */
const savePaymentQrImage = async (dataUrl: string): Promise<string | { error: string }> => {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return { error: 'Ảnh QR phải là ảnh PNG, JPG hoặc WEBP.' };
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0 || bytes.length > PAYMENT_QR_MAX_BYTES) return { error: 'Ảnh QR tối đa 1,5MB.' };
  const bucket = getAdminStorage();
  const token = randomUUID();
  const path = `payment-qr/${randomUUID()}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`;
  await bucket.file(path).save(bytes, {
    resumable: false,
    metadata: { contentType: `image/${match[1]}`, metadata: { firebaseStorageDownloadTokens: token } },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
};

/** Dọn ảnh QR cũ (thay ảnh / xoá tài khoản). Hỏng thì bỏ qua — chỉ là file mồ côi. */
const deletePaymentQrImage = async (url: string): Promise<void> => {
  const match = /\/o\/(payment-qr%2F[^?]+)\?/.exec(url);
  if (!match) return;
  await getAdminStorage().file(decodeURIComponent(match[1])).delete().catch(() => undefined);
};

/** Chủ dự án quản lý tài khoản nhận tiền: xem / lưu (kèm ảnh QR) / chọn tài khoản đang dùng / xoá. */
const paymentAccountAction = async (db: Db, body: Body, adminUid: string): Promise<{ status: number; payload: Record<string, unknown> }> => {
  const op = String(body.op || 'get');
  const settings = await loadPaymentSettings(db);
  const write = (accounts: PaymentAccount[], activeId: string) =>
    PAYMENT_REF(db).set({ accounts, activeId, updatedAt: nowIso(), updatedBy: adminUid });

  if (op === 'save') {
    const raw = (body.account && typeof body.account === 'object' ? body.account : {}) as Record<string, unknown>;
    const previous = settings.accounts.find(a => a.id === String(raw.id || ''));
    const checked = validatePaymentAccount({ ...raw, qrImageUrl: '' });
    if (!checked.ok) return { status: 422, payload: { error: checked.error } };
    const duplicate = settings.accounts.some(a => a.id !== previous?.id && a.bank === checked.account.bank && a.accountNumber === checked.account.accountNumber);
    if (duplicate) return { status: 422, payload: { error: 'Tài khoản này đã có trong danh sách.' } };
    if (!previous && settings.accounts.length >= MAX_PAYMENT_ACCOUNTS) return { status: 422, payload: { error: `Tối đa ${MAX_PAYMENT_ACCOUNTS} tài khoản.` } };
    let qrImageUrl = body.removeQr === true ? '' : previous?.qrImageUrl ?? '';
    if (typeof body.qrDataUrl === 'string' && body.qrDataUrl) {
      const saved = await savePaymentQrImage(body.qrDataUrl);
      if (typeof saved !== 'string') return { status: 422, payload: saved };
      qrImageUrl = saved;
    }
    const account: PaymentAccount = { ...checked.account, id: previous?.id ?? randomUUID().slice(0, 8), qrImageUrl };
    const accounts = previous ? settings.accounts.map(a => (a.id === account.id ? account : a)) : [...settings.accounts, account];
    await write(accounts, settings.activeId || account.id);
    if (previous?.qrImageUrl && previous.qrImageUrl !== qrImageUrl) await deletePaymentQrImage(previous.qrImageUrl);
  } else if (op === 'activate' || op === 'delete') {
    const target = settings.accounts.find(a => a.id === String(body.id || ''));
    if (!target) return { status: 404, payload: { error: 'Không tìm thấy tài khoản.' } };
    if (op === 'activate') {
      await write(settings.accounts, target.id);
    } else {
      const accounts = settings.accounts.filter(a => a.id !== target.id);
      await write(accounts, settings.activeId === target.id ? accounts[0]?.id ?? '' : settings.activeId);
      if (target.qrImageUrl) await deletePaymentQrImage(target.qrImageUrl);
    }
  }
  const current = op === 'get' ? settings : await loadPaymentSettings(db);
  return { status: 200, payload: { ...current, webhookReady: Boolean((process.env.SEPAY_WEBHOOK_KEY || '').trim()) } };
};

export const loadRedemptions = async (db: Db, uid: string): Promise<VoucherRedemption[]> =>
  (await db.collection(AI_REDEMPTIONS_COL).where('uid', '==', uid).get()).docs.map(d => {
    const data = d.data();
    return { code: String(data.code), percent: Number(data.percent) || 0, validFrom: String(data.validFrom), validTo: String(data.validTo) };
  });

export const loadWallet = async (db: Db, uid: string): Promise<{ balanceVnd: number; topupCode: string | null }> => {
  const snap = await db.collection(AI_WALLETS_COL).doc(uid).get();
  const data = snap.exists ? snap.data() ?? {} : {};
  return { balanceVnd: Number(data.balanceVnd) || 0, topupCode: typeof data.topupCode === 'string' ? data.topupCode : null };
};

/** Ví + mã nạp tiền riêng (tạo lần đầu, không trùng người khác). */
export const ensureWallet = async (db: Db, uid: string, email: string): Promise<{ balanceVnd: number; topupCode: string }> => {
  const wallet = await loadWallet(db, uid);
  if (wallet.topupCode) return { balanceVnd: wallet.balanceVnd, topupCode: wallet.topupCode };
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = makeTopupCode();
    const clash = await db.collection(AI_WALLETS_COL).where('topupCode', '==', code).get();
    if (!clash.empty) continue;
    await db.collection(AI_WALLETS_COL).doc(uid).set({ uid, email, topupCode: code, createdAt: nowIso(), updatedAt: nowIso() }, { merge: true });
    return { balanceVnd: wallet.balanceVnd, topupCode: code };
  }
  throw new Error('Chưa tạo được mã nạp tiền, thử lại.');
};

export interface BillingPlan {
  usdVnd: number;
  voucher: VoucherRedemption | null;
}

/** Được dùng khoá chung lượt này không (còn số dư, hoặc mã 100% đang hiệu lực) + cách tính tiền. */
export const billingPlanFor = async (db: Db, uid: string): Promise<BillingPlan | null> => {
  const [wallet, redemptions, usdVnd] = await Promise.all([loadWallet(db, uid), loadRedemptions(db, uid), loadUsdVnd(db)]);
  const voucher = bestActiveVoucher(redemptions, today());
  return canAffordUsage(wallet.balanceVnd, voucher) ? { usdVnd, voucher } : null;
};

// ── Webhook SePay ─────────────────────────────────────────────────────────────

/**
 * SePay gọi khi tài khoản nhận tiền có giao dịch. Xác thực bằng header `Authorization: Apikey <SEPAY_WEBHOOK_KEY>`
 * (chủ dự án tự tạo chuỗi bí mật, dán vào SePay VÀ biến môi trường Vercel). Luôn trả `{success:true}` khi đã ghi
 * nhận để SePay khỏi gửi lại; id giao dịch làm khoá chống cộng trùng.
 */
export const handleSepayWebhook = async (db: Db, req: VercelRequest, res: VercelResponse): Promise<void> => {
  const secret = (process.env.SEPAY_WEBHOOK_KEY || '').trim();
  if (!secret) {
    res.status(503).json({ success: false, error: 'Máy chủ chưa cấu hình SEPAY_WEBHOOK_KEY.' });
    return;
  }
  const auth = String(req.headers?.authorization || '');
  if (!/^apikey\s+/i.test(auth) || auth.replace(/^apikey\s+/i, '').trim() !== secret) {
    res.status(401).json({ success: false, error: 'Sai khoá webhook.' });
    return;
  }
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
  const sepayId = String(body.id ?? '').trim();
  const amount = Math.round(Number(body.transferAmount));
  if (!/^\d{1,20}$/.test(sepayId) || body.transferType !== 'in' || !(amount > 0)) {
    // Tiền ra / dữ liệu lạ: không phải khoản nạp, báo nhận để SePay khỏi gửi lại.
    res.status(200).json({ success: true, ignored: true });
    return;
  }
  const code = extractTopupCode(String(body.code || ''), String(body.content || ''), String(body.description || ''));
  const bank = {
    sepayId,
    amountVnd: amount,
    gateway: String(body.gateway || ''),
    transactionDate: String(body.transactionDate || ''),
    referenceCode: String(body.referenceCode || ''),
    content: String(body.content || '').slice(0, 300),
    code: code ?? '',
    receivedAt: nowIso(),
  };
  const wallet = code ? (await db.collection(AI_WALLETS_COL).where('topupCode', '==', code).get()).docs[0] : undefined;
  if (!wallet) {
    await db.collection(AI_TOPUPS_UNMATCHED_COL).doc(sepayId).create(bank).catch(() => undefined);
    res.status(200).json({ success: true, matched: false });
    return;
  }
  await creditTopup(db, wallet.id, bank);
  res.status(200).json({ success: true, matched: true });
};

/** Cộng một khoản nạp vào ví — MỘT lần duy nhất theo id giao dịch. */
const creditTopup = async (db: Db, uid: string, bank: Record<string, unknown> & { sepayId: string; amountVnd: number; receivedAt: string }): Promise<boolean> => {
  const topupRef = db.collection(AI_TOPUPS_COL).doc(bank.sepayId);
  const walletRef = db.collection(AI_WALLETS_COL).doc(uid);
  return db.runTransaction(async tx => {
    if ((await tx.get(topupRef)).exists) return false;
    tx.set(topupRef, { ...bank, uid, at: bank.receivedAt, month: vnDate(new Date(bank.receivedAt)).month });
    tx.set(walletRef, { uid, balanceVnd: FieldValue.increment(bank.amountVnd), updatedAt: bank.receivedAt }, { merge: true });
    return true;
  });
};

// ── Mã giảm giá ───────────────────────────────────────────────────────────────

const voucherFromData = (code: string, data: FirebaseFirestore.DocumentData): VoucherDef => {
  return {
    code, percent: Number(data.percent) || 0, validFrom: String(data.validFrom), validTo: String(data.validTo),
    active: data.active !== false, maxUses: Number(data.maxUses) || 0, usedCount: Number(data.usedCount) || 0,
    allowedEmails: Array.isArray(data.allowedEmails) ? data.allowedEmails.map(String) : [], note: String(data.note || ''),
  };
};

/** Gắn mã cho một giáo viên (giáo viên tự nhập, hoặc chủ dự án gán hộ). */
export const redeemVoucher = async (db: Db, uid: string, email: string, rawCode: string, assignedBy?: string): Promise<{ ok: true; redemption: VoucherRedemption } | { ok: false; error: string }> => {
  const code = normalizeVoucherCode(rawCode);
  const voucherRef = db.collection(AI_VOUCHERS_COL).doc(code);
  const redemptionRef = db.collection(AI_REDEMPTIONS_COL).doc(`${uid}_${code}`);
  return db.runTransaction(async tx => {
    const [voucherSnap, redemptionSnap] = await Promise.all([tx.get(voucherRef), tx.get(redemptionRef)]);
    const voucher = voucherSnap.exists ? voucherFromData(code, voucherSnap.data() ?? {}) : null;
    const problem = canRedeemVoucher(voucher, email, today(), redemptionSnap.exists);
    if (problem || !voucher) return { ok: false as const, error: problem ?? 'Mã không hợp lệ.' };
    const redemption: VoucherRedemption = { code, percent: voucher.percent, validFrom: voucher.validFrom, validTo: voucher.validTo };
    tx.set(redemptionRef, { uid, email, ...redemption, redeemedAt: nowIso(), ...(assignedBy ? { assignedBy } : {}) });
    tx.update(voucherRef, { usedCount: FieldValue.increment(1) });
    return { ok: true as const, redemption };
  });
};

export const walletView = async (db: Db, uid: string, email: string): Promise<Record<string, unknown>> => {
  const [wallet, redemptions, account] = await Promise.all([ensureWallet(db, uid, email), loadRedemptions(db, uid), loadPaymentAccount(db)]);
  const day = today();
  return {
    balanceVnd: wallet.balanceVnd,
    topupCode: wallet.topupCode,
    paymentAccount: account,
    vouchers: redemptions.sort((a, b) => b.validTo.localeCompare(a.validTo)),
    activeVoucher: bestActiveVoucher(redemptions, day),
  };
};

// ── Quản trị (gọi từ `_admin.ts` sau khi đã kiểm quyền) ──────────────────────

export const adminWalletAction = async (db: Db, action: string, body: Body, adminUid: string): Promise<{ status: number; payload: Record<string, unknown> } | null> => {
  if (action === 'adminVouchers') {
    const snap = await db.collection(AI_VOUCHERS_COL).get();
    return { status: 200, payload: { vouchers: snap.docs.map(d => ({ code: d.id, ...d.data() })) } };
  }
  if (action === 'adminSaveVoucher') {
    const checked = validateVoucherInput((body.voucher ?? {}) as Partial<VoucherDef>);
    if (!checked.ok) return { status: 422, payload: { error: checked.error } };
    const ref = db.collection(AI_VOUCHERS_COL).doc(checked.voucher.code);
    const existing = await ref.get();
    const { usedCount: _ignore, ...rest } = checked.voucher;
    await ref.set({ ...rest, ...(existing.exists ? {} : { usedCount: 0, createdAt: nowIso(), createdBy: adminUid }), updatedAt: nowIso() }, { merge: true });
    return { status: 200, payload: { voucher: (await ref.get()).data() } };
  }
  if (action === 'adminAssignVoucher') {
    const email = String(body.email || '').trim().toLowerCase();
    const user = await getAuth().getUserByEmail(email).catch(() => null);
    if (!user) return { status: 404, payload: { error: `Chưa có tài khoản đăng nhập web với email ${email}.` } };
    const result = await redeemVoucher(db, user.uid, email, String(body.code || ''), adminUid);
    return result.ok ? { status: 200, payload: { redemption: result.redemption, uid: user.uid } } : { status: 422, payload: { error: result.error } };
  }
  if (action === 'adminAdjustWallet') {
    const uid = String(body.uid || '');
    const amount = Math.round(Number(body.amountVnd));
    const reason = String(body.reason || '').trim().slice(0, 300);
    if (!uid || !Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 100_000_000) return { status: 422, payload: { error: 'Số tiền điều chỉnh không hợp lệ.' } };
    if (reason.length < 5) return { status: 422, payload: { error: 'Ghi rõ lý do điều chỉnh (hiện trên sao kê của giáo viên).' } };
    const at = nowIso();
    await db.collection(AI_ADJUSTMENTS_COL).add({ uid, amountVnd: amount, reason, at, month: vnDate(new Date(at)).month, by: adminUid });
    await db.collection(AI_WALLETS_COL).doc(uid).set({ uid, balanceVnd: FieldValue.increment(amount), updatedAt: at }, { merge: true });
    return { status: 200, payload: { wallet: await loadWallet(db, uid) } };
  }
  if (action === 'adminPaymentAccount') return paymentAccountAction(db, body, adminUid);
  if (action === 'adminWallets') {
    const [wallets, unmatched] = await Promise.all([
      db.collection(AI_WALLETS_COL).get(),
      db.collection(AI_TOPUPS_UNMATCHED_COL).get(),
    ]);
    return {
      status: 200,
      payload: {
        wallets: wallets.docs.map(d => ({ uid: d.id, email: d.data().email ?? '', balanceVnd: Number(d.data().balanceVnd) || 0, topupCode: d.data().topupCode ?? '' })),
        unmatched: unmatched.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => !(t as { assignedTo?: string }).assignedTo),
      },
    };
  }
  if (action === 'adminAssignUnmatchedTopup') {
    const id = String(body.id || '');
    const uid = String(body.uid || '');
    const ref = db.collection(AI_TOPUPS_UNMATCHED_COL).doc(id);
    const snap = id && uid ? await ref.get() : null;
    if (!snap?.exists) return { status: 404, payload: { error: 'Không tìm thấy giao dịch.' } };
    const data = snap.data() as Record<string, unknown> & { sepayId: string; amountVnd: number; receivedAt: string };
    const credited = await creditTopup(db, uid, { ...data, manuallyAssignedBy: adminUid });
    await ref.update({ assignedTo: uid, assignedAt: nowIso(), assignedBy: adminUid });
    return { status: 200, payload: { credited } };
  }
  return null;
};
