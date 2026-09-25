/**
 * SAO KÊ VÍ AI theo tháng + minh chứng từng lượt — cho giáo viên (của chính mình) và chủ dự án (mọi người).
 *
 * Nguyên tắc minh bạch:
 *  - Sao kê tính lại từ sổ gốc, không phải số chép tay: khoản nạp (`aiTopups`, kèm mã giao dịch ngân hàng),
 *    điều chỉnh của chủ dự án (`aiAdjustments`, kèm lý do), từng lượt bị trừ (`aiUsage.chargeVnd`, kèm giá gốc,
 *    tỷ giá, % giảm, mã giảm giá). Đầu kỳ + nạp + điều chỉnh − trừ = cuối kỳ.
 *  - Sao kê tháng đã qua có sẵn từ ngày 1 tháng sau (không cần ai bấm phát hành) và không đổi nữa vì sổ chỉ ghi thêm.
 *  - Giáo viên thấy lớp / bài / học sinh của từng lượt để tự đối chiếu.
 */
import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { AI_USAGE_COL, vnDate } from './_ai-usage.js';
import { AI_ADJUSTMENTS_COL, AI_TOPUPS_COL, loadWallet } from './_ai-wallet.js';
import { monthsBetween, statementForMonth } from '../src/lib/admin/aiWallet.js';
import type { OwnerMaps, UsageRecord } from '../src/lib/admin/billing.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

const MONTH_RE = /^\d{4}-\d{2}$/;
export const isStatementMonth = (value: unknown): value is string => typeof value === 'string' && MONTH_RE.test(value);

// ── Đọc lượt dùng + quy về giáo viên (dùng chung với bảng kê trong Quản trị) ──

export const usageRecordFromDoc = (id: string, d: FirebaseFirestore.DocumentData): UsageRecord => {
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    id,
    at: typeof d.at === 'string' ? d.at : undefined,
    day: String(d.day || ''),
    model: String(d.model || ''),
    feature: String(d.feature || ''),
    uid: typeof d.uid === 'string' ? d.uid : null,
    anonymous: d.anonymous === true,
    refs: d.refs && typeof d.refs === 'object' ? d.refs as Record<string, string> : {},
    ...(typeof d.keySource === 'string' ? { keySource: d.keySource } : {}),
    ...(typeof d.keyOwnerUid === 'string' ? { keyOwnerUid: d.keyOwnerUid } : {}),
    inputTokens: n(d.inputTokens), outputTokens: n(d.outputTokens), thoughtsTokens: n(d.thoughtsTokens), cachedTokens: n(d.cachedTokens),
  };
};

/** Đọc nhiều doc theo id, trả map id → teacherId (ownerId ưu tiên cho lớp). */
const ownersOf = async (db: Db, collection: string, ids: Iterable<string | undefined>): Promise<Map<string, string>> => {
  const map = new Map<string, string>();
  const unique = [...new Set(ids)].filter((id): id is string => Boolean(id));
  for (let i = 0; i < unique.length; i += 100) {
    const snaps = await db.getAll(...unique.slice(i, i + 100).map(id => db.collection(collection).doc(id)));
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const data = snap.data() || {};
      const owner = data.ownerId || data.teacherId;
      if (typeof owner === 'string' && owner) map.set(snap.id, owner);
    }
  }
  return map;
};

export const ownerMapsFor = async (db: Db, records: readonly UsageRecord[]): Promise<OwnerMaps> => ({
  submissionOwner: await ownersOf(db, 'submissions', records.map(r => r.refs.submissionId)),
  assignmentOwner: await ownersOf(db, 'assignments', records.map(r => r.refs.assignmentId)),
  classOwner: await ownersOf(db, 'classes', records.map(r => r.refs.classId)),
  studentLinkOwner: await ownersOf(db, 'studentLinks', records.filter(r => r.anonymous && r.uid).map(r => r.uid as string)),
});

// ── Tỷ giá Vietcombank ───────────────────────────────────────────────────────

/** Tỷ giá USD BÁN RA của Vietcombank (feed XML công khai). */
export const parseVcbUsdSell = (xml: string): { sell: number; dateTime: string } | null => {
  const sell = /CurrencyCode="USD"[^>]*?Sell="([\d.,]+)"/.exec(xml)?.[1];
  if (!sell) return null;
  const value = Number(sell.replace(/,/g, ''));
  if (!Number.isFinite(value) || value <= 0) return null;
  return { sell: value, dateTime: /<DateTime>([^<]+)<\/DateTime>/.exec(xml)?.[1]?.trim() ?? '' };
};

export const fetchVcbUsdSell = async (): Promise<{ sell: number; dateTime: string } | null> => {
  try {
    const response = await fetch('https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx', { signal: AbortSignal.timeout(10_000) });
    return response.ok ? parseVcbUsdSell(await response.text()) : null;
  } catch {
    return null;
  }
};

// ── Minh chứng: gắn tên lớp / bài / học sinh vào từng lượt ────────────────────

export interface ChargeItem {
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

const fieldOf = async (db: Db, paths: Iterable<string>, field: string): Promise<Map<string, string>> => {
  const unique = [...new Set(paths)].filter(Boolean);
  const map = new Map<string, string>();
  for (let i = 0; i < unique.length; i += 100) {
    const snaps = await db.getAll(...unique.slice(i, i + 100).map(path => db.doc(path)));
    snaps.forEach((snap, index) => {
      const value = snap.exists ? snap.data()?.[field] : undefined;
      if (typeof value === 'string' && value) map.set(unique[i + index], value);
    });
  }
  return map;
};

const describeItems = async (db: Db, items: ChargeItem[]): Promise<ChargeItem[]> => {
  const submissionIds = [...new Set(items.map(i => i.refs.submissionId).filter((id): id is string => Boolean(id)))].slice(0, 500);
  const submissions = submissionIds.length > 0
    ? await db.getAll(...submissionIds.map(id => db.collection('submissions').doc(id))).catch(() => [])
    : [];
  const subInfo = new Map(submissions.filter(s => s.exists).map(s => [s.id, s.data() || {}]));
  const sub = (item: ChargeItem) => subInfo.get(item.refs.submissionId ?? '');
  const classIdOf = (item: ChargeItem) => item.refs.classId || String(sub(item)?.classId || '');
  const assignmentIdOf = (item: ChargeItem) => item.refs.assignmentId || String(sub(item)?.assignmentId || '');
  const studentPathOf = (item: ChargeItem) => {
    const classId = classIdOf(item);
    const studentId = item.refs.studentId || String(sub(item)?.studentId || '');
    return classId && studentId ? `classes/${classId}/students/${studentId}` : '';
  };
  const [classNames, titles, students] = await Promise.all([
    fieldOf(db, items.map(i => (classIdOf(i) ? `classes/${classIdOf(i)}` : '')), 'name'),
    fieldOf(db, items.map(i => (assignmentIdOf(i) ? `assignments/${assignmentIdOf(i)}` : '')), 'title'),
    fieldOf(db, items.map(studentPathOf), 'name'),
  ]);
  return items.map(item => {
    const className = classNames.get(`classes/${classIdOf(item)}`);
    const assignmentTitle = titles.get(`assignments/${assignmentIdOf(item)}`);
    const studentName = students.get(studentPathOf(item));
    return { ...item, ...(className ? { className } : {}), ...(assignmentTitle ? { assignmentTitle } : {}), ...(studentName ? { studentName } : {}) };
  });
};

// ── Sao kê ────────────────────────────────────────────────────────────────────

const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

/**
 * Sao kê tháng `month` của giáo viên `uid`. Đọc toàn bộ sổ của người đó (vài trăm dòng/tháng là cùng) để tính
 * đầu kỳ đúng tuyệt đối, không dựa vào số dư cache.
 */
export const statementFor = async (db: Db, uid: string, month: string): Promise<Record<string, unknown>> => {
  const [usageSnap, topupSnap, adjustSnap, wallet] = await Promise.all([
    db.collection(AI_USAGE_COL).where('keyOwnerUid', '==', uid).get(),
    db.collection(AI_TOPUPS_COL).where('uid', '==', uid).get(),
    db.collection(AI_ADJUSTMENTS_COL).where('uid', '==', uid).get(),
    loadWallet(db, uid),
  ]);
  const usage = usageSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Record<string, unknown> & { id: string });
  const charged = usage.filter(u => typeof u.chargeVnd === 'number');
  const topups = topupSnap.docs.map(d => d.data());
  const adjustments = adjustSnap.docs.map(d => d.data());

  const totals = statementForMonth(
    month,
    topups.map(t => ({ month: String(t.month), amountVnd: num(t.amountVnd) })),
    adjustments.map(a => ({ month: String(a.month), amountVnd: num(a.amountVnd) })),
    charged.map(c => ({ month: String(c.month), amountVnd: num(c.chargeVnd) })),
  );
  const items: ChargeItem[] = charged
    .filter(c => c.month === month)
    .sort((a, b) => String(a.at).localeCompare(String(b.at)))
    .map(c => ({
      id: c.id,
      at: String(c.at || ''),
      feature: String(c.feature || ''),
      model: String(c.model || ''),
      refs: (c.refs && typeof c.refs === 'object' ? c.refs : {}) as Record<string, string>,
      inputTokens: num(c.inputTokens), outputTokens: num(c.outputTokens), thoughtsTokens: num(c.thoughtsTokens), cachedTokens: num(c.cachedTokens),
      costUsd: num(c.costUsd), usdVnd: num(c.usdVnd), grossVnd: num(c.grossVnd), discountPct: num(c.discountPct),
      voucherCode: typeof c.voucherCode === 'string' ? c.voucherCode : null,
      chargeVnd: num(c.chargeVnd),
    }));
  const firstMonth = [...charged.map(c => String(c.month)), ...topups.map(t => String(t.month)), ...adjustments.map(a => String(a.month))]
    .filter(Boolean).sort()[0] ?? vnDate(new Date()).month;
  return {
    uid,
    month,
    currentMonth: vnDate(new Date()).month,
    months: monthsBetween(firstMonth, vnDate(new Date()).month),
    ...totals,
    grossVnd: items.reduce((sum, i) => sum + i.grossVnd, 0),
    discountVnd: items.reduce((sum, i) => sum + (i.grossVnd - i.chargeVnd), 0),
    walletBalanceVnd: wallet.balanceVnd,
    topups: topups.filter(t => t.month === month).sort((a, b) => String(a.at).localeCompare(String(b.at))),
    adjustments: adjustments.filter(a => a.month === month).sort((a, b) => String(a.at).localeCompare(String(b.at))),
    items: await describeItems(db, items),
    ownKeyCalls: usage.filter(u => u.keySource === 'own' && u.month === month).length,
  };
};

/** Tổng hợp tháng cho chủ dự án: mỗi giáo viên có phát sinh (trừ tiền / nạp / điều chỉnh) một dòng. */
export const monthOverview = async (db: Db, month: string): Promise<Record<string, unknown>> => {
  const [usageSnap, topupSnap, adjustSnap] = await Promise.all([
    db.collection(AI_USAGE_COL).where('month', '==', month).get(),
    db.collection(AI_TOPUPS_COL).where('month', '==', month).get(),
    db.collection(AI_ADJUSTMENTS_COL).where('month', '==', month).get(),
  ]);
  const rows = new Map<string, { uid: string; calls: number; grossVnd: number; chargeVnd: number; topupVnd: number; adjustVnd: number }>();
  const row = (uid: string) => rows.get(uid) ?? rows.set(uid, { uid, calls: 0, grossVnd: 0, chargeVnd: 0, topupVnd: 0, adjustVnd: 0 }).get(uid)!;
  for (const doc of usageSnap.docs) {
    const d = doc.data();
    if (typeof d.chargeVnd !== 'number' || typeof d.keyOwnerUid !== 'string') continue;
    const r = row(d.keyOwnerUid);
    r.calls += 1;
    r.grossVnd += num(d.grossVnd);
    r.chargeVnd += num(d.chargeVnd);
  }
  for (const doc of topupSnap.docs) row(String(doc.data().uid)).topupVnd += num(doc.data().amountVnd);
  for (const doc of adjustSnap.docs) row(String(doc.data().uid)).adjustVnd += num(doc.data().amountVnd);
  const list = [...rows.values()];
  const emails = await Promise.all(list.map(r => getAuth().getUser(r.uid).then(u => u.email ?? '').catch(() => '')));
  return { month, rows: list.map((r, i) => ({ ...r, email: emails[i] })).sort((a, b) => b.chargeVnd - a.chargeVnd) };
};

// ── API giáo viên ─────────────────────────────────────────────────────────────

export const handleAiBillingAction = async (db: Db, body: Body, res: VercelResponse): Promise<boolean> => {
  if (String(body.action || '') !== 'aiStatement') return false;
  let uid: string | null = null;
  if (typeof body.idToken === 'string' && body.idToken) {
    const decoded = await getAuth().verifyIdToken(body.idToken).catch(() => null);
    uid = decoded && decoded.firebase?.sign_in_provider !== 'anonymous' ? decoded.uid : null;
  }
  if (!uid) {
    res.status(401).json({ error: 'Cần đăng nhập tài khoản giáo viên.' });
    return true;
  }
  const month = isStatementMonth(body.month) ? body.month : vnDate(new Date()).month;
  res.status(200).json(await statementFor(db, uid, month));
  return true;
};
