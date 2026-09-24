/// <reference types="node" />
/**
 * TRANG QUẢN TRỊ của chủ dự án (congapro60@gmail.com): ai đã dùng web, lớp của từng giáo viên,
 * token AI + tiền theo giáo viên, tỷ giá. CHỈ ĐỌC dữ liệu người khác — không sửa lớp/bài của ai.
 *
 * Quyền kiểm Ở MÁY CHỦ: token Google đã xác minh email + email thuộc ADMIN_EMAILS. Giao diện ẩn/hiện
 * tab chỉ là tiện lợi, không phải hàng rào.
 */
import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { isAdminEmail, METERING_START_DAY } from '../src/lib/admin/adminConfig.js';
import { aggregateUsage, type OwnerMaps, type UsageRecord } from '../src/lib/admin/billing.js';
import { AI_USAGE_COL } from './_ai-usage.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

export const ADMIN_SETTINGS_DOC = 'adminSettings/billing';

export interface AdminBillingSettings {
  usdVnd: number;
  usdVndNote: string;
  /** Tổng Google thực thu (VNĐ) cho giai đoạn TRƯỚC bộ đếm — chủ dự án nhập từ AI Studio. */
  preMeteringVnd: number;
  preMeteringNote: string;
  updatedAt?: string;
}

const DEFAULT_SETTINGS: AdminBillingSettings = {
  usdVnd: 26_190,
  usdVndNote: 'Vietcombank bán ra 24/09/2026',
  preMeteringVnd: 0,
  preMeteringNote: '',
};

const requireAdmin = async (body: Body, res: VercelResponse): Promise<{ uid: string; email: string } | null> => {
  try {
    const decoded = await getAuth().verifyIdToken(String(body.idToken || ''));
    const email = typeof decoded.email === 'string' ? decoded.email : '';
    if (decoded.email_verified === true && decoded.firebase?.sign_in_provider !== 'anonymous' && isAdminEmail(email)) {
      return { uid: decoded.uid, email };
    }
  } catch {
    // rơi xuống 403
  }
  res.status(403).json({ error: 'Chỉ tài khoản quản trị mới xem được trang này.' });
  return null;
};

/** Ngày (giờ VN) từ ISO — để chia trước/sau bộ đếm. */
const vnDay = (iso: unknown): string | null => {
  const time = Date.parse(String(iso ?? ''));
  if (!Number.isFinite(time)) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(time));
};

const bump = (target: Record<string, number>, key: string) => { target[key] = (target[key] ?? 0) + 1; };

const readSettings = async (db: Db): Promise<AdminBillingSettings> => {
  const snap = await db.doc(ADMIN_SETTINGS_DOC).get();
  return { ...DEFAULT_SETTINGS, ...(snap.exists ? snap.data() as Partial<AdminBillingSettings> : {}) };
};

const handleOverview = async (db: Db, res: VercelResponse) => {
  // Người dùng: giáo viên (đăng nhập thật) liệt kê chi tiết; học sinh ẩn danh chỉ đếm.
  const users: Array<Record<string, unknown>> = [];
  let anonymousCount = 0;
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const list = await getAuth().listUsers(1000, pageToken);
    for (const user of list.users) {
      if (user.providerData.length === 0) { anonymousCount += 1; continue; }
      users.push({
        uid: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        disabled: user.disabled,
        createdAt: user.metadata.creationTime ?? null,
        lastSignInAt: user.metadata.lastSignInTime ?? null,
        lastActiveAt: user.metadata.lastRefreshTime ?? null,
      });
    }
    pageToken = list.pageToken;
    if (!pageToken) break;
  }

  const [classSnap, assignmentSnap, submissionSnap, historySnap, settings] = await Promise.all([
    db.collection('classes').get(),
    db.collection('assignments').select('classId', 'teacherId').get(),
    db.collection('submissions').select('classId', 'teacherId', 'grade.gradedAt').get(),
    db.collection('submissionGradeHistory').select('teacherId', 'action', 'createdAt').get(),
    readSettings(db),
  ]);

  const assignmentsByClass: Record<string, number> = {};
  for (const doc of assignmentSnap.docs) bump(assignmentsByClass, String(doc.get('classId') ?? ''));

  const submissionsByClass: Record<string, number> = {};
  const gradedByClass: Record<string, number> = {};
  // Lượt AI chấm theo giáo viên, chia trước/sau ngày có bộ đếm — cơ sở phân bổ ước tính.
  const aiEventsBefore: Record<string, number> = {};
  const aiEventsAfter: Record<string, number> = {};
  for (const doc of submissionSnap.docs) {
    const classId = String(doc.get('classId') ?? '');
    bump(submissionsByClass, classId);
    const day = vnDay(doc.get('grade.gradedAt'));
    if (!day) continue;
    bump(gradedByClass, classId);
    bump(day < METERING_START_DAY ? aiEventsBefore : aiEventsAfter, String(doc.get('teacherId') ?? 'unknown'));
  }
  for (const doc of historySnap.docs) {
    const action = doc.get('action');
    if (action !== 'ai_regrade' && action !== 'automatic_regrade') continue;
    const day = vnDay(doc.get('createdAt'));
    if (!day) continue;
    bump(day < METERING_START_DAY ? aiEventsBefore : aiEventsAfter, String(doc.get('teacherId') ?? 'unknown'));
  }

  const classes = classSnap.docs.map(doc => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      name: data.name ?? '',
      grade: data.grade ?? '',
      teacherId: data.ownerId || data.teacherId || '',
      teacherIds: Array.isArray(data.teacherIds) ? data.teacherIds : [],
      studentCount: Number(data.studentCount || 0),
      createdAt: data.createdAt ?? null,
      hasExamSheet: Boolean(data.examSheet?.spreadsheetId),
      hasSheetSync: Boolean(data.sheetSync?.spreadsheetId),
      assignmentCount: assignmentsByClass[doc.id] ?? 0,
      submissionCount: submissionsByClass[doc.id] ?? 0,
      gradedCount: gradedByClass[doc.id] ?? 0,
    };
  });

  return res.status(200).json({
    users, anonymousCount, classes, aiEventsBefore, aiEventsAfter, settings, meteringStartDay: METERING_START_DAY,
  });
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Đọc nhiều doc theo id, trả map id → teacherId (ownerId ưu tiên cho lớp). */
const ownersOf = async (db: Db, collection: string, ids: Iterable<string>): Promise<Map<string, string>> => {
  const map = new Map<string, string>();
  const unique = [...new Set(ids)].filter(Boolean);
  for (let i = 0; i < unique.length; i += 100) {
    const refs = unique.slice(i, i + 100).map(id => db.collection(collection).doc(id));
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const data = snap.data() || {};
      const owner = data.ownerId || data.teacherId;
      if (typeof owner === 'string' && owner) map.set(snap.id, owner);
    }
  }
  return map;
};

const handleUsage = async (db: Db, body: Body, res: VercelResponse) => {
  const fromDay = String(body.fromDay || '');
  const toDay = String(body.toDay || '');
  if (!DAY_RE.test(fromDay) || !DAY_RE.test(toDay) || fromDay > toDay) {
    return res.status(422).json({ error: 'Khoảng ngày không hợp lệ.' });
  }
  const snap = await db.collection(AI_USAGE_COL).where('day', '>=', fromDay).where('day', '<=', toDay).get();
  const records: UsageRecord[] = snap.docs.map(doc => {
    const d = doc.data() || {};
    const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
    return {
      day: String(d.day || ''),
      model: String(d.model || ''),
      feature: String(d.feature || ''),
      uid: typeof d.uid === 'string' ? d.uid : null,
      anonymous: d.anonymous === true,
      refs: d.refs && typeof d.refs === 'object' ? d.refs as Record<string, string> : {},
      inputTokens: n(d.inputTokens), outputTokens: n(d.outputTokens), thoughtsTokens: n(d.thoughtsTokens), cachedTokens: n(d.cachedTokens),
    };
  });

  const maps: OwnerMaps = {
    submissionOwner: await ownersOf(db, 'submissions', records.map(r => r.refs.submissionId)),
    assignmentOwner: await ownersOf(db, 'assignments', records.map(r => r.refs.assignmentId)),
    classOwner: await ownersOf(db, 'classes', records.map(r => r.refs.classId)),
    studentLinkOwner: await ownersOf(db, 'studentLinks', records.filter(r => r.anonymous && r.uid).map(r => r.uid as string)),
  };
  return res.status(200).json({ rows: aggregateUsage(records, maps), recordCount: records.length, fromDay, toDay });
};

const handleSaveSettings = async (db: Db, body: Body, res: VercelResponse) => {
  const usdVnd = Number(body.usdVnd);
  const preMeteringVnd = Number(body.preMeteringVnd);
  if (!Number.isFinite(usdVnd) || usdVnd < 10_000 || usdVnd > 100_000) return res.status(422).json({ error: 'Tỷ giá không hợp lệ.' });
  if (!Number.isFinite(preMeteringVnd) || preMeteringVnd < 0 || preMeteringVnd > 1_000_000_000) {
    return res.status(422).json({ error: 'Tổng tiền trước bộ đếm không hợp lệ.' });
  }
  const settings: AdminBillingSettings = {
    usdVnd: Math.round(usdVnd * 100) / 100,
    usdVndNote: String(body.usdVndNote || '').slice(0, 200),
    preMeteringVnd: Math.round(preMeteringVnd),
    preMeteringNote: String(body.preMeteringNote || '').slice(0, 300),
    updatedAt: new Date().toISOString(),
  };
  await db.doc(ADMIN_SETTINGS_DOC).set(settings);
  return res.status(200).json({ settings });
};

/** Tỷ giá USD BÁN RA của Vietcombank (feed XML công khai). */
export const parseVcbUsdSell = (xml: string): { sell: number; dateTime: string } | null => {
  const sell = /CurrencyCode="USD"[^>]*?Sell="([\d.,]+)"/.exec(xml)?.[1];
  if (!sell) return null;
  const value = Number(sell.replace(/,/g, ''));
  if (!Number.isFinite(value) || value <= 0) return null;
  return { sell: value, dateTime: /<DateTime>([^<]+)<\/DateTime>/.exec(xml)?.[1]?.trim() ?? '' };
};

const handleFetchVcbRate = async (res: VercelResponse) => {
  try {
    const response = await fetch('https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx', { signal: AbortSignal.timeout(10_000) });
    const parsed = response.ok ? parseVcbUsdSell(await response.text()) : null;
    if (!parsed) return res.status(502).json({ error: 'Không đọc được tỷ giá Vietcombank. Nhập tay giúp.' });
    return res.status(200).json(parsed);
  } catch {
    return res.status(502).json({ error: 'Không kết nối được Vietcombank. Nhập tay giúp.' });
  }
};

/** Trả true nếu đã xử lý (action của trang quản trị). */
export const handleAdminAction = async (db: Db, body: Body, res: VercelResponse): Promise<boolean> => {
  const action = String(body.action || '');
  if (!action.startsWith('admin')) return false;
  if (!await requireAdmin(body, res)) return true;
  if (action === 'adminOverview') { await handleOverview(db, res); return true; }
  if (action === 'adminUsage') { await handleUsage(db, body, res); return true; }
  if (action === 'adminSaveSettings') { await handleSaveSettings(db, body, res); return true; }
  if (action === 'adminFetchVcbRate') { await handleFetchVcbRate(res); return true; }
  res.status(400).json({ error: `Hành động quản trị không hợp lệ: ${action}` });
  return true;
};
