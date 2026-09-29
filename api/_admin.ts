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
import { aggregateUsage, type UsageRecord } from '../src/lib/admin/billing.js';
import { fetchVcbUsdSell, isStatementMonth, monthOverview, ownerMapsFor, statementFor, usageRecordFromDoc } from './_ai-billing.js';
import { adminWalletAction } from './_ai-wallet.js';

/** Giữ export cũ cho test/nơi gọi trước đây. */
export { parseVcbUsdSell } from './_ai-billing.js';
import { adminAiAccessView, adminSaveAiAccess } from './_ai-keys.js';
import { classKey } from '../src/lib/admin/classSetup.js';
import { createJoinCode } from '../src/lib/classroom/joinCode.js';
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
      examSheetId: data.examSheet?.spreadsheetId ?? null,
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

const handleUsage = async (db: Db, body: Body, res: VercelResponse) => {
  const fromDay = String(body.fromDay || '');
  const toDay = String(body.toDay || '');
  if (!DAY_RE.test(fromDay) || !DAY_RE.test(toDay) || fromDay > toDay) {
    return res.status(422).json({ error: 'Khoảng ngày không hợp lệ.' });
  }
  const snap = await db.collection(AI_USAGE_COL).where('day', '>=', fromDay).where('day', '<=', toDay).get();
  const records: UsageRecord[] = snap.docs.map(doc => usageRecordFromDoc(doc.id, doc.data() || {}));
  const maps = await ownerMapsFor(db, records);
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

const handleFetchVcbRate = async (res: VercelResponse) => {
  const parsed = await fetchVcbUsdSell();
  if (!parsed) return res.status(502).json({ error: 'Không đọc được tỷ giá Vietcombank. Nhập tay giúp.' });
  return res.status(200).json(parsed);
};

const readExamSheet = (raw: unknown): { spreadsheetId: string; spreadsheetTitle: string } | null => {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const spreadsheetId = typeof value.spreadsheetId === 'string' ? value.spreadsheetId.trim() : '';
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(spreadsheetId)) return null;
  return { spreadsheetId, spreadsheetTitle: String(value.spreadsheetTitle || '').slice(0, 200) };
};

const uniqueJoinCode = async (db: Db): Promise<string> => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = createJoinCode();
    const taken = await db.collection('classes').where('joinCode', '==', code).limit(1).get();
    if (taken.size === 0) return code;
  }
  throw new Error('Không tạo được mã lớp không trùng. Thử lại.');
};

/**
 * Tạo lớp MỚI cho một giáo viên (uid của giáo viên đó) kèm danh sách học sinh + file điểm.
 * KHÔNG BAO GIỜ ghi đè: giáo viên đã có lớp trùng tên (khoá lớp) hoặc lớp đã nối file này → 409.
 */
const handleCreateClassForTeacher = async (db: Db, body: Body, adminUid: string, res: VercelResponse) => {
  const teacherUid = String(body.teacherUid || '').trim();
  const name = String(body.name || '').normalize('NFC').trim();
  const examSheet = readExamSheet(body.examSheet);
  const rawStudents = Array.isArray(body.students) ? body.students : [];
  if (!teacherUid || !name || name.length > 80 || !examSheet) return res.status(422).json({ error: 'Thiếu giáo viên, tên lớp hoặc file điểm.' });
  if (rawStudents.length === 0 || rawStudents.length > 80) return res.status(422).json({ error: 'Danh sách học sinh phải có 1–80 em.' });
  const students: Array<{ code: string; name: string }> = [];
  const codes = new Set<string>();
  for (const raw of rawStudents) {
    const item = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const code = String(item.code || '').trim().toUpperCase();
    const studentName = String(item.name || '').normalize('NFC').trim();
    if (!/^[A-Z0-9_-]{2,40}$/.test(code) || !studentName || studentName.length > 100 || codes.has(code)) {
      return res.status(422).json({ error: `Học sinh không hợp lệ hoặc trùng mã: ${code || '(trống)'}.` });
    }
    codes.add(code);
    students.push({ code, name: studentName });
  }

  let teacher;
  try { teacher = await getAuth().getUser(teacherUid); } catch { teacher = null; }
  if (!teacher || teacher.providerData.length === 0) return res.status(404).json({ error: 'Không tìm thấy tài khoản giáo viên này.' });

  const owned = await db.collection('classes').where('teacherId', '==', teacherUid).get();
  const key = classKey(name);
  const clash = owned.docs.find(doc => classKey(String(doc.get('name') ?? '')) === key || doc.get('examSheet.spreadsheetId') === examSheet.spreadsheetId);
  if (clash) return res.status(409).json({ error: `Giáo viên đã có lớp "${clash.get('name')}" — không tạo trùng. Hãy nối file điểm vào lớp đó.`, existingClassId: clash.id });

  const now = nowIsoAdmin();
  const classId = `lop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const grade = /\d+/.exec(name)?.[0] ?? '';
  const classRef = db.collection('classes').doc(classId);
  // Ghi lớp TRƯỚC rồi mới ghi học sinh (giống luồng chuyển lớp cũ) — nếu học sinh hỏng giữa chừng,
  // gọi lại sẽ bị chặn trùng; khi đó thêm học sinh bằng giao diện lớp như thường.
  await classRef.set({
    id: classId, teacherId: teacherUid, name, track: String(body.track || '').slice(0, 80), grade,
    joinCode: await uniqueJoinCode(db), studentCount: students.length,
    examSheet: { ...examSheet, linkedAt: now, linkedBy: adminUid },
    createdAt: now, updatedAt: now, createdBy: adminUid,
  });
  const batch = db.batch();
  for (const student of students) {
    const studentId = `hs_${student.code.toLowerCase()}`;
    batch.set(classRef.collection('students').doc(studentId), {
      id: studentId, classId, teacherId: teacherUid, name: student.name, code: student.code,
      status: 'active', progress: 0, createdAt: now,
    });
  }
  await batch.commit();
  return res.status(200).json({ created: true, classId, studentCount: students.length });
};

/** Nối file điểm vào lớp ĐÃ CÓ — chỉ thêm liên kết, không đụng học sinh/bài/tên lớp. */
const handleLinkExamSheet = async (db: Db, body: Body, adminUid: string, res: VercelResponse) => {
  const classId = String(body.classId || '').trim();
  const examSheet = readExamSheet(body.examSheet);
  if (!classId || !examSheet) return res.status(422).json({ error: 'Thiếu lớp hoặc file điểm.' });
  const ref = db.collection('classes').doc(classId);
  const snap = await ref.get();
  if (!snap.exists) return res.status(404).json({ error: 'Không tìm thấy lớp.' });
  const current = snap.get('examSheet.spreadsheetId');
  if (current === examSheet.spreadsheetId) return res.status(200).json({ linked: true, unchanged: true });
  if (current) return res.status(409).json({ error: 'Lớp đã nối một file điểm khác — giáo viên tự đổi trong báo cáo lớp.' });
  const now = nowIsoAdmin();
  await ref.update({ examSheet: { ...examSheet, linkedAt: now, linkedBy: adminUid }, updatedAt: now });
  return res.status(200).json({ linked: true });
};

const nowIsoAdmin = () => new Date().toISOString();

/** Trả true nếu đã xử lý (action của trang quản trị). */
export const handleAdminAction = async (db: Db, body: Body, res: VercelResponse): Promise<boolean> => {
  const action = String(body.action || '');
  if (!action.startsWith('admin')) return false;
  const admin = await requireAdmin(body, res);
  if (!admin) return true;
  if (action === 'adminOverview') { await handleOverview(db, res); return true; }
  if (action === 'adminUsage') { await handleUsage(db, body, res); return true; }
  if (action === 'adminSaveSettings') { await handleSaveSettings(db, body, res); return true; }
  if (action === 'adminFetchVcbRate') { await handleFetchVcbRate(res); return true; }
  if (action === 'adminCreateClassForTeacher') { await handleCreateClassForTeacher(db, body, admin.uid, res); return true; }
  if (action === 'adminLinkExamSheet') { await handleLinkExamSheet(db, body, admin.uid, res); return true; }
  if (action === 'adminMonthOverview') {
    if (!isStatementMonth(body.month)) { res.status(422).json({ error: 'Tháng không hợp lệ.' }); return true; }
    res.status(200).json(await monthOverview(db, body.month));
    return true;
  }
  if (action === 'adminStatement') {
    if (!isStatementMonth(body.month) || typeof body.uid !== 'string' || !body.uid) { res.status(422).json({ error: 'Thiếu giáo viên hoặc tháng.' }); return true; }
    res.status(200).json(await statementFor(db, body.uid, body.month));
    return true;
  }
  const walletResult = await adminWalletAction(db, action, body, admin.uid);
  if (walletResult) { res.status(walletResult.status).json(walletResult.payload); return true; }
  if (action === 'adminAiAccess') { res.status(200).json(await adminAiAccessView(db)); return true; }
  if (action === 'adminSaveAiAccess') {
    const { status, payload } = await adminSaveAiAccess(db, body, admin.uid);
    res.status(status).json(payload);
    return true;
  }
  res.status(400).json({ error: `Hành động quản trị không hợp lệ: ${action}` });
  return true;
};
