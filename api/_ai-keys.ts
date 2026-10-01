/**
 * KHOÁ AI của giáo viên + quyền dùng khoá chung của chủ dự án.
 *
 * - `adminSettings/aiAccess` { enabled, sharedUids, sharedEmails }: chủ dự án bật kiểm soát + nhóm được dùng
 *   thẳng khoá chung. Chưa có document hoặc `enabled=false` → ai cũng dùng khoá chung (hành vi cũ).
 * - `teacherAiKeys/{uid}` { geminiKey, last4, keyStatus, keyStatusAt, consent }: CHỈ máy chủ đọc/ghi (rules
 *   mặc định chặn). Khoá không bao giờ trả về client — chỉ 4 ký tự cuối.
 *
 * Mỗi request chọn khoá MỘT lần (cache trong ngữ cảnh `_ai-usage`), mọi lượt gọi Gemini lồng bên trong
 * dùng chung; nguồn khoá được ghi vào `aiUsage.keySource` để bảng kê chỉ tính phần dùng khoá chung.
 */
import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from './_exam-core.js';
import { AI_SPEND_COL, aiSpendDocId, currentAiUsageContext, vnDate, type AiKeyChoice } from './_ai-usage.js';
import { billingPlanFor, loadUsdVnd, redeemVoucher, walletView } from './_ai-wallet.js';
import {
  AI_KEY_MODES,
  blockReasonText,
  capReached,
  decideAiKey,
  effectiveAiMode,
  looksLikeGeminiKey,
  maskKey,
  usdToVndRounded,
  type AiKeyBlockReason,
  type AiKeyMode,
  type AiKeyStatus,
} from '../src/lib/admin/aiKeyPolicy.js';
import { ADMIN_EMAILS } from '../src/lib/admin/adminConfig.js';
import { enabledRelayVendors } from './_ai-relay-core.js';
import { resolveGatewayApiKey } from './_ai-gateway-core.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

export const TEACHER_AI_KEYS_COL = 'teacherAiKeys';
const ACCESS_REF = (db: Db) => db.collection('adminSettings').doc('aiAccess');

export class AiKeyRequiredError extends Error {
  constructor(readonly reason: AiKeyBlockReason, readonly teacherUid: string | null) {
    super(blockReasonText(reason));
    this.name = 'AiKeyRequiredError';
  }
}

export interface AiAccessSettings {
  enabled: boolean;
  sharedUids: string[];
  sharedEmails: string[];
  /** Chủ dự án: dùng khoá chung không bị trừ ví (khoá của chính mình). */
  exemptUids: string[];
}

interface TeacherKeyDoc {
  geminiKey?: string;
  last4?: string;
  keyStatus?: AiKeyStatus;
  keyStatusAt?: string;
  keyStatusMessage?: string;
  consent?: { accepted?: boolean; acceptedAt?: string; email?: string };
  /** Nguồn khoá giáo viên chọn (xem `aiKeyPolicy.ts`); vắng = suy từ nhóm/đồng ý như trước. */
  mode?: AiKeyMode;
  /** Trần chi tiêu khoá chung mỗi tháng (VNĐ) do giáo viên tự đặt; vắng/0 = không giới hạn. */
  monthlyCapVnd?: number | null;
  /** Chỉ chủ dự án: bật để bị tính tiền như giáo viên thường (kiểm thử ví bằng chính tài khoản của mình). */
  testCharge?: boolean;
}

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);

export const loadAiAccess = async (db: Db): Promise<AiAccessSettings> => {
  const snap = await ACCESS_REF(db).get();
  const data = snap.exists ? snap.data() ?? {} : {};
  return { enabled: data.enabled === true, sharedUids: strings(data.sharedUids), sharedEmails: strings(data.sharedEmails), exemptUids: strings(data.exemptUids) };
};

const loadKeyDoc = async (db: Db, uid: string): Promise<TeacherKeyDoc | null> => {
  const snap = await db.collection(TEACHER_AI_KEYS_COL).doc(uid).get();
  return snap.exists ? (snap.data() as TeacherKeyDoc) : null;
};

interface SpendTotals { costUsd: number; calls: number; chargeVnd: number }

const spendTotals = (raw: unknown): SpendTotals => {
  const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return { costUsd: Number(data.costUsd) || 0, calls: Number(data.calls) || 0, chargeVnd: Number(data.chargeVnd) || 0 };
};

/**
 * Chi tiêu khoá chung của giáo viên trong tháng (theo sổ `aiSpend`), kèm phần của ngày `day` (giờ Việt Nam).
 * Phần "hôm nay" chỉ có từ lúc sổ bắt đầu ghi `days` — lượt trước đó không bù.
 */
export const monthSpend = async (db: Db, uid: string, month: string, day: string = vnDate(new Date()).day): Promise<SpendTotals & { today: SpendTotals }> => {
  const snap = await db.collection(AI_SPEND_COL).doc(aiSpendDocId(uid, month)).get();
  const data = snap.exists ? snap.data() ?? {} : {};
  return { ...spendTotals(data), today: spendTotals(data.days?.[day]) };
};

/**
 * Chạm trần tháng do giáo viên tự đặt thì dừng (kiểm TRƯỚC lượt gọi, nên có thể vượt nhẹ đúng một lượt).
 * Đang trừ ví → so với số tiền THẬT đã trừ (sau giảm giá); chưa trừ ví → so với giá gốc quy đổi.
 */
const assertUnderCap = async (db: Db, uid: string, keyDoc: TeacherKeyDoc | null, charged: boolean): Promise<void> => {
  const cap = keyDoc?.monthlyCapVnd;
  if (!(typeof cap === 'number' && cap > 0)) return;
  const [spend, rate] = await Promise.all([monthSpend(db, uid, vnDate(new Date()).month), loadUsdVnd(db)]);
  const spent = charged ? spend.chargeVnd : usdToVndRounded(spend.costUsd, rate);
  if (capReached(spent, cap)) throw new AiKeyRequiredError('cap_reached', uid);
};

/** Gắn trần tháng của giáo viên vào kế hoạch tính tiền để `acquireCallHold` kiểm cùng lúc với số dư. */
const withCap = (billing: AiKeyChoice['billing'], keyDoc: TeacherKeyDoc | null): AiKeyChoice['billing'] =>
  (billing ? { ...billing, capVnd: typeof keyDoc?.monthlyCapVnd === 'number' && keyDoc.monthlyCapVnd > 0 ? keyDoc.monthlyCapVnd : null } : billing);

/**
 * uid các tài khoản admin (chủ dự án, `ADMIN_EMAILS`) — tra theo email một lần mỗi phiên máy chủ.
 * Chủ dự án có nhiều tài khoản thì tài khoản nào cũng dùng khoá chung và miễn trừ ví, khỏi nhập uid tay.
 */
let adminUidsCache: Promise<Set<string>> | null = null;
const adminUids = (): Promise<Set<string>> => {
  // Bọc trong `then` để lỗi ném đồng bộ (vd môi trường không có getUserByEmail) cũng thành "không có admin".
  adminUidsCache ??= Promise.resolve()
    .then(() => Promise.all(ADMIN_EMAILS.map(email => getAuth().getUserByEmail(email).then(u => u.uid).catch(() => null))))
    .then(uids => new Set(uids.filter((uid): uid is string => Boolean(uid))))
    .catch(() => new Set<string>());
  return adminUidsCache;
};

/** Tài khoản chủ dự án (miễn trừ ví): nằm trong `exemptUids` hoặc là một trong các `ADMIN_EMAILS`. */
const isExemptUid = async (access: AiAccessSettings, uid: string): Promise<boolean> =>
  access.exemptUids.includes(uid) || (await adminUids()).has(uid);

/**
 * Lượt dùng khoá chung có bị trừ ví không: chỉ khi đã bật kiểm soát và người chịu phí không phải chủ dự án.
 * Chủ dự án bật `testCharge` (công tắc "Thử trừ ví") thì bị tính như giáo viên thường để tự kiểm thử ví.
 */
const billingFor = async (db: Db, access: AiAccessSettings, uid: string, keyDoc: TeacherKeyDoc | null): Promise<AiKeyChoice['billing']> => {
  if (!access.enabled || (await isExemptUid(access, uid) && keyDoc?.testCharge !== true)) return null;
  const plan = await billingPlanFor(db, uid);
  if (!plan) throw new AiKeyRequiredError('no_balance', uid);
  return plan;
};

/** Giáo viên chịu khoá của request: handler đặt sẵn, không thì suy từ người gọi (học sinh → chủ lớp). */
const resolveKeyOwner = async (db: Db): Promise<string | null> => {
  const context = currentAiUsageContext();
  if (!context) return null;
  if (context.keyOwnerUid !== undefined) return context.keyOwnerUid;
  const who = await context.identity();
  if (!who.uid) return null;
  if (!who.anonymous) return who.uid;
  const link = await db.collection('studentLinks').doc(who.uid).get();
  const teacherId = link.exists ? String(link.data()?.teacherId || '') : '';
  return teacherId || null;
};

/**
 * Khoá Gemini cho lượt gọi hiện tại. Không có ngữ cảnh request (test, script) → khoá truyền vào.
 * Bị chặn thì ném `AiKeyRequiredError` — handler trả 402 cho giáo viên, hoặc để bài học sinh nằm chờ.
 * `vendor`: hãng KHÁC Gemini (Claude/ChatGPT qua relay) — khoá Gemini riêng lưu trên máy chủ không dùng được cho hãng đó, nên
 * coi như không có khoá riêng; còn lại cùng luật nhóm/đồng ý/chế độ/ví/trần.
 */
export const ensureGeminiKey = async (fallbackKey: string, options: { vendor?: boolean } = {}): Promise<AiKeyChoice> => {
  const context = currentAiUsageContext();
  if (!context) return { key: fallbackKey, source: 'shared', ownerUid: null };
  if (context.keyChoice) return context.keyChoice;

  const db = getAdminDb();
  const access = await loadAiAccess(db);
  // Người chịu phí cần biết cả khi CHƯA bật kiểm soát: để cộng sổ chi tiêu và giữ trần tự đặt.
  const ownerUid = await resolveKeyOwner(db).catch(() => null);
  // Đã bật kiểm soát thì hồ sơ khoá đọc hỏng phải làm hỏng lượt gọi (đóng cửa). Nuốt lỗi thành `null` khiến người chọn
  // "chỉ khoá riêng" bị coi như chưa chọn gì → suy ra "cả hai" → trừ ví trái ý (QA F1). Chưa bật kiểm soát thì giữ cách cũ.
  const keyDoc = ownerUid
    ? await (access.enabled ? loadKeyDoc(db, ownerUid) : loadKeyDoc(db, ownerUid).catch(() => null))
    : null;
  if (!access.enabled) {
    if (ownerUid) await assertUnderCap(db, ownerUid, keyDoc, false);
    return (context.keyChoice = { key: fallbackKey, source: 'shared', ownerUid, billing: null });
  }
  if (!ownerUid) throw new AiKeyRequiredError('no_key', null);

  const decision = decideAiKey({
    gateEnabled: true,
    isShared: access.sharedUids.includes(ownerUid) || (await adminUids()).has(ownerUid),
    ownKey: !options.vendor && keyDoc?.geminiKey ? { status: keyDoc.keyStatus ?? 'ok', statusAt: keyDoc.keyStatusAt } : null,
    consent: keyDoc?.consent?.accepted === true,
    mode: keyDoc?.mode,
  });
  if (decision.use === 'blocked') throw new AiKeyRequiredError(decision.reason, ownerUid);
  if (decision.use === 'own') return (context.keyChoice = { key: String(keyDoc?.geminiKey), source: 'own', ownerUid, billing: null });
  const billing = withCap(await billingFor(db, access, ownerUid, keyDoc), keyDoc);
  await assertUnderCap(db, ownerUid, keyDoc, Boolean(billing));
  return (context.keyChoice = { key: fallbackKey, source: decision.use, ownerUid, billing });
};

/**
 * Khoá RIÊNG vừa bị Google từ chối (hết hạn mức / hỏng): ghi trạng thái để lần sau khỏi thử. Người trong nhóm
 * hoặc đã đồng ý thì chuyển request này sang khoá chung (trừ ví), còn lại thì chặn.
 */
export const onOwnKeyFailure = async (choice: AiKeyChoice, status: AiKeyStatus, detail: string, fallbackKey: string): Promise<AiKeyChoice> => {
  const uid = choice.ownerUid;
  if (!uid) throw new AiKeyRequiredError(status === 'invalid' ? 'invalid' : 'exhausted', null);
  const db = getAdminDb();
  await db.collection(TEACHER_AI_KEYS_COL).doc(uid).set({
    keyStatus: status,
    keyStatusAt: new Date().toISOString(),
    keyStatusMessage: detail.slice(0, 300),
  }, { merge: true });
  const [keyDoc, access] = await Promise.all([loadKeyDoc(db, uid), loadAiAccess(db)]);
  const isShared = access.sharedUids.includes(uid);
  // Chỉ chế độ "cả hai" mới được chuyển sang ví khi khoá riêng hỏng; "chỉ khoá riêng" thì chặn dù đã đồng ý tính phí.
  if (effectiveAiMode({ mode: keyDoc?.mode, isShared, consent: keyDoc?.consent?.accepted === true }) !== 'both') {
    throw new AiKeyRequiredError(status === 'invalid' ? 'invalid' : 'exhausted', uid);
  }
  const billing = withCap(await billingFor(db, access, uid, keyDoc), keyDoc);
  await assertUnderCap(db, uid, keyDoc, Boolean(billing));
  const next: AiKeyChoice = { key: fallbackKey, source: isShared ? 'shared' : 'owner_consent', ownerUid: uid, billing };
  const context = currentAiUsageContext();
  if (context) context.keyChoice = next;
  return next;
};

/**
 * Tính năng CHỈ chạy bằng khoá chung (cổng GLM): ngoài nhóm thì phải đồng ý tính phí. Trả nguồn để ghi bảng kê.
 */
export const assertSharedAiAllowed = async (uid: string): Promise<'shared' | 'owner_consent'> => {
  const db = getAdminDb();
  const access = await loadAiAccess(db);
  // Cùng nguyên tắc đóng cửa như `ensureGeminiKey`: đã bật kiểm soát mà không đọc được hồ sơ khoá thì không chạy.
  const keyDoc = await (access.enabled ? loadKeyDoc(db, uid) : loadKeyDoc(db, uid).catch(() => null));
  let source: 'shared' | 'owner_consent' = 'shared';
  if (access.enabled) {
    const isShared = access.sharedUids.includes(uid);
    // "Chỉ khoá riêng" (kể cả người trong nhóm đã chọn vậy) thì tính năng chỉ-khoá-chung này không được chạy.
    if (effectiveAiMode({ mode: keyDoc?.mode, isShared, consent: keyDoc?.consent?.accepted === true }) === 'own') {
      throw new AiKeyRequiredError('consent_required', uid);
    }
    if (!isShared) source = 'owner_consent';
  }
  const billing = await billingFor(db, access, uid, keyDoc);
  await assertUnderCap(db, uid, keyDoc, Boolean(billing));
  // Ghi nguồn vào ngữ cảnh để lượt dùng GLM vào bảng kê/trừ ví đúng người (khoá GLM nằm ở biến môi trường riêng).
  const context = currentAiUsageContext();
  if (context) context.keyChoice = { key: '', source, ownerUid: uid, billing };
  return source;
};

/** Body JSON chuẩn khi bị chặn — client nhận `code` để mở hộp chọn "nhập khoá / đồng ý dùng khoá chung". */
export const aiKeyRequiredPayload = (error: AiKeyRequiredError): Record<string, unknown> => ({
  error: error.message,
  code: 'AI_KEY_REQUIRED',
  reason: error.reason,
});

// ── API cho giáo viên ──────────────────────────────────────────────────────

const teacherIdentity = async (body: Body): Promise<{ uid: string; email: string } | null> => {
  if (typeof body.idToken !== 'string' || !body.idToken) return null;
  try {
    const decoded = await getAuth().verifyIdToken(body.idToken);
    if (decoded.firebase?.sign_in_provider === 'anonymous') return null;
    return { uid: decoded.uid, email: typeof decoded.email === 'string' ? decoded.email : '' };
  } catch {
    return null;
  }
};

/** Kiểm khoá bằng lượt liệt kê model — không tốn token. */
const probeGeminiKey = async (key: string): Promise<{ ok: true } | { ok: false; message: string }> => {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { ok: true };
    return { ok: false, message: `Google từ chối khoá này (mã ${res.status}). Kiểm tra lại khoá trong Google AI Studio.` };
  } catch {
    return { ok: false, message: 'Chưa kiểm tra được khoá với Google. Thử lại sau ít phút.' };
  }
};

const statusPayload = async (db: Db, uid: string, email: string): Promise<Record<string, unknown>> => {
  const { day, month } = vnDate(new Date());
  const [access, keyDoc, blocked, spend, usdVnd, wallet] = await Promise.all([
    loadAiAccess(db),
    loadKeyDoc(db, uid),
    db.collection('submissions').where('teacherId', '==', uid).where('aiBlocked', '==', true).get(),
    monthSpend(db, uid, month, day),
    loadUsdVnd(db),
    walletView(db, uid, email),
  ]);
  const exemptAccount = await isExemptUid(access, uid);
  const testing = exemptAccount && keyDoc?.testCharge === true;
  const charged = access.enabled && (!exemptAccount || testing);
  return {
    ...wallet,
    month,
    /** Đang trừ ví theo từng lượt (đã bật kiểm soát, không phải chủ dự án). */
    charged,
    exempt: exemptAccount && !testing,
    /** Chủ dự án mới có công tắc "Thử trừ ví"; `testCharge` = đang bật (bị tính tiền như giáo viên thường). */
    canTestCharge: exemptAccount,
    testCharge: testing,
    spentVnd: charged ? spend.chargeVnd : usdToVndRounded(spend.costUsd, usdVnd),
    grossVnd: usdToVndRounded(spend.costUsd, usdVnd),
    spentCalls: spend.calls,
    /** Ngày (giờ VN) của các số "hôm nay" bên dưới — cùng cách tính với `spentVnd`. */
    today: day,
    todayVnd: charged ? spend.today.chargeVnd : usdToVndRounded(spend.today.costUsd, usdVnd),
    todayCalls: spend.today.calls,
    usdVnd,
    capVnd: typeof keyDoc?.monthlyCapVnd === 'number' && keyDoc.monthlyCapVnd > 0 ? keyDoc.monthlyCapVnd : null,
    gateEnabled: access.enabled,
    shared: access.sharedUids.includes(uid),
    hasKey: Boolean(keyDoc?.geminiKey),
    last4: keyDoc?.last4 ?? '',
    keyStatus: keyDoc?.geminiKey ? keyDoc.keyStatus ?? 'ok' : null,
    keyStatusAt: keyDoc?.keyStatusAt ?? null,
    /** Hãng khác Gemini mà ví web trả được (đã cấu hình khoá trên máy chủ). */
    relayVendors: enabledRelayVendors(),
    /** GLM 5.2 (Vercel AI Gateway) đã có khoá trên máy chủ chưa — chưa có thì GLM trả lỗi "chưa được cấu hình". */
    gatewayReady: Boolean(resolveGatewayApiKey()),
    consent: keyDoc?.consent?.accepted === true,
    consentAt: keyDoc?.consent?.acceptedAt ?? null,
    /** Chế độ THỰC SỰ áp dụng (chọn ví mà chưa đồng ý tính phí thì vẫn là 'own'). */
    mode: effectiveAiMode({ mode: keyDoc?.mode, isShared: access.sharedUids.includes(uid), consent: keyDoc?.consent?.accepted === true }),
    blockedSubmissionIds: blocked.docs.map(d => d.id).slice(0, 100),
  };
};

export const handleAiKeyAction = async (db: Db, body: Body, res: VercelResponse): Promise<boolean> => {
  const action = String(body.action || '');
  if (!['aiKeyStatus', 'saveAiKey', 'deleteAiKey', 'setAiConsent', 'setAiMode', 'setAiSpendCap', 'redeemVoucher', 'setAiTestCharge'].includes(action)) return false;
  const me = await teacherIdentity(body);
  if (!me) {
    res.status(401).json({ error: 'Cần đăng nhập tài khoản giáo viên.' });
    return true;
  }
  const ref = db.collection(TEACHER_AI_KEYS_COL).doc(me.uid);
  const now = new Date().toISOString();

  if (action === 'saveAiKey') {
    const key = typeof body.key === 'string' ? body.key.trim() : '';
    if (!looksLikeGeminiKey(key)) {
      res.status(422).json({ error: 'Khoá chưa đúng dạng. Khoá Gemini lấy ở aistudio.google.com, bắt đầu bằng "AIza".' });
      return true;
    }
    const probe = await probeGeminiKey(key);
    if (!probe.ok) {
      res.status(422).json({ error: probe.message });
      return true;
    }
    await ref.set({ uid: me.uid, email: me.email, geminiKey: key, last4: maskKey(key), keyStatus: 'ok', keyStatusAt: now, keyStatusMessage: '', updatedAt: now }, { merge: true });
  } else if (action === 'deleteAiKey') {
    await ref.set({ uid: me.uid, geminiKey: '', last4: '', keyStatus: 'ok', keyStatusAt: now, updatedAt: now }, { merge: true });
  } else if (action === 'setAiSpendCap') {
    // null / 0 = bỏ trần. Trần do CHÍNH giáo viên đặt — giống ngân sách của Google Cloud.
    const cap = body.capVnd === null ? 0 : Math.round(Number(body.capVnd));
    if (!Number.isFinite(cap) || cap < 0 || cap > 100_000_000) {
      res.status(422).json({ error: 'Trần chi tiêu không hợp lệ (0 – 100.000.000đ).' });
      return true;
    }
    await ref.set({ uid: me.uid, email: me.email, monthlyCapVnd: cap > 0 ? cap : null, capUpdatedAt: now, updatedAt: now }, { merge: true });
  } else if (action === 'redeemVoucher') {
    const result = await redeemVoucher(db, me.uid, me.email, String(body.code || ''));
    if (!result.ok) {
      res.status(422).json({ error: result.error });
      return true;
    }
  } else if (action === 'setAiTestCharge') {
    // Chỉ chủ dự án: người thường không được tự đổi cách tính tiền của mình.
    if (!(await isExemptUid(await loadAiAccess(db), me.uid))) {
      res.status(403).json({ error: 'Chỉ chủ dự án dùng được chế độ thử trừ ví.' });
      return true;
    }
    await ref.set({ uid: me.uid, email: me.email, testCharge: body.enabled === true, updatedAt: now }, { merge: true });
  } else if (action === 'setAiConsent') {
    // Đường cũ: đồng ý = "cả hai", thu hồi = "chỉ khoá riêng". Giao diện mới dùng setAiMode.
    const accepted = body.accepted === true;
    await ref.set({
      uid: me.uid,
      email: me.email,
      consent: accepted ? { accepted: true, acceptedAt: now, email: me.email } : { accepted: false, revokedAt: now },
      mode: accepted ? 'both' : 'own',
      updatedAt: now,
    }, { merge: true });
  } else if (action === 'setAiMode') {
    const mode = body.mode as AiKeyMode;
    if (!AI_KEY_MODES.includes(mode)) {
      res.status(422).json({ error: 'Chế độ không hợp lệ (own / wallet / both).' });
      return true;
    }
    const patch: Record<string, unknown> = { uid: me.uid, email: me.email, mode, modeUpdatedAt: now, updatedAt: now };
    if (mode !== 'own') {
      // Dùng ví = bị trừ tiền → phải đã đồng ý (hoặc thuộc nhóm dùng thẳng khoá chung). Chọn lần đầu thì ghi luôn sự đồng ý.
      const [access, keyDoc] = await Promise.all([loadAiAccess(db), loadKeyDoc(db, me.uid)]);
      const allowed = access.sharedUids.includes(me.uid) || keyDoc?.consent?.accepted === true;
      if (!allowed && body.accepted !== true) {
        res.status(422).json({ error: 'Cần đồng ý tính phí theo mức dùng trước khi dùng ví web.' });
        return true;
      }
      if (!allowed) patch.consent = { accepted: true, acceptedAt: now, email: me.email };
    }
    await ref.set(patch, { merge: true });
  }
  res.status(200).json(await statusPayload(db, me.uid, me.email));
  return true;
};

// ── API cho chủ dự án (gọi từ `_admin.ts` sau khi đã kiểm quyền) ──────────────

export const adminAiAccessView = async (db: Db): Promise<Record<string, unknown>> => {
  const [access, keys] = await Promise.all([loadAiAccess(db), db.collection(TEACHER_AI_KEYS_COL).get()]);
  return {
    ...access,
    teachers: keys.docs.map(d => {
      const data = d.data() as TeacherKeyDoc & { email?: string };
      return {
        uid: d.id,
        email: data.email ?? '',
        hasKey: Boolean(data.geminiKey),
        last4: data.last4 ?? '',
        keyStatus: data.geminiKey ? data.keyStatus ?? 'ok' : null,
        consent: data.consent?.accepted === true,
        consentAt: data.consent?.acceptedAt ?? null,
      };
    }),
  };
};

/** Lưu công tắc + nhóm dùng khoá chung; email được quy ra uid ngay lúc lưu (email lạ → báo lỗi, không lưu). */
export const adminSaveAiAccess = async (db: Db, body: Body, adminUid: string): Promise<{ status: number; payload: Record<string, unknown> }> => {
  const emails = [...new Set(strings(body.sharedEmails).map(e => e.trim().toLowerCase()).filter(Boolean))].slice(0, 100);
  const uids: string[] = [];
  const unknown: string[] = [];
  for (const email of emails) {
    try {
      uids.push((await getAuth().getUserByEmail(email)).uid);
    } catch {
      unknown.push(email);
    }
  }
  if (unknown.length > 0) return { status: 422, payload: { error: `Chưa có tài khoản đăng nhập web với email: ${unknown.join(', ')}` } };
  // Chủ dự án luôn thuộc nhóm dùng khoá chung và được miễn trừ ví.
  await ACCESS_REF(db).set({
    enabled: body.enabled === true,
    sharedEmails: emails,
    sharedUids: [...new Set([...uids, adminUid])],
    exemptUids: [adminUid],
    updatedAt: new Date().toISOString(),
    updatedBy: adminUid,
  });
  return { status: 200, payload: await adminAiAccessView(db) };
};
