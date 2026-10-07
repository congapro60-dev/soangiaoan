/**
 * Cổng phụ huynh (/ph): giáo viên cấp PIN riêng cho phụ huynh và CÔNG BỐ báo cáo; phụ huynh chọn tên con + PIN để xem.
 *
 * - `classes/{classId}/parentSecrets/{studentId}`: PIN phụ huynh (băm + bản hiển thị cho giáo viên phát lại). KHÔNG khoá khi nhập sai (chủ dự án chốt 06/10).
 *   `pinSetBy`: 'teacher' (giáo viên cấp/cấp lại → phụ huynh PHẢI tự đặt PIN mới ở lần vào kế tiếp) | 'parent' (phụ huynh đã tự đặt;
 *   bản hiển thị `pinPlain` cập nhật theo để giáo viên xem được và cấp lại/đặt lại bất cứ lúc nào).
 * - `classes/{classId}/parentReports/{id}`: bản chụp `ParentReportPrintInput` (JSON) đã công bố — phụ huynh xem đúng như bản PDF,
 *   không cần giáo viên tải file. Công bố lại cùng kì thì ghi đè.
 * Chỉ đi qua API (rules mặc định chặn client). Phụ huynh KHÔNG có phiên Firebase: mỗi lượt xem gửi lại PIN để máy chủ kiểm.
 */
import type { VercelResponse } from '@vercel/node';
import { teacherContext } from './_classroom-teacher.js';
import { createPin, hashPin } from './_classroom-core.js';
import { resolveParentStudent, verifyParentPin } from './_parent-auth.js';
import { handleParentActivityAction, recordParentActivity } from './_parent-activity.js';
import { handleParentCustomReport } from './_parent-self-report.js';
import { REPORT_KINDS } from '../src/lib/classroom/reportKinds.js';
import { isRealDay } from '../src/lib/classroom/reportPeriod.js';
import {
  PARENT_BRANDING_DOC, PARENT_CONFIG_SUB, PARENT_INPUT_MAX_CHARS, PARENT_PIN_RULE, PARENT_REPORTS_SUB, PARENT_SECRETS_SUB, PARENT_STATS_SUB,
  compareParentReports, isSafeDocId, isValidParentPin, normalizeParentPin, parentReportDocId, sanitizeBranding, type ParentPinSetBy,
} from '../src/lib/classroom/parentAccess.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

const KINDS: readonly string[] = REPORT_KINDS.map(item => item.kind);
const MAX_PER_CALL = 40;

const periodOf = (body: Body): { kind: string; from: string; to: string } | null => {
  const kind = String(body.kind || '');
  const from = String(body.from || '');
  const to = String(body.to || '');
  return KINDS.includes(kind) && isRealDay(from) && isRealDay(to) && from <= to ? { kind, from, to } : null;
};

const studentRows = async (classRef: FirebaseFirestore.DocumentReference) => {
  const snap = await classRef.collection('students').get();
  return snap.docs
    .map(d => ({ studentId: d.id, name: String(d.data()?.name || '') }))
    .filter(s => s.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
};

/** Cấp PIN phụ huynh cho em CHƯA có (hoặc cấp lại cả lớp nếu `regenerate`), trả bảng đủ cả lớp để giáo viên phát. */
const handleIssueParentPins = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const students = await studentRows(context.classRef);
  const secrets = context.classRef.collection(PARENT_SECRETS_SUB);
  const regenerate = body.regenerate === true;
  const now = new Date().toISOString();
  const rows: Array<{ studentId: string; name: string; pin: string; parentSet: boolean }> = [];
  let batch = db.batch();
  let pending = 0;
  for (const student of students) {
    const ref = secrets.doc(student.studentId);
    const existing = regenerate ? null : await ref.get();
    const existingPin = existing?.exists ? String(existing.data()?.pinPlain || '') : '';
    if (existingPin) {
      rows.push({ ...student, pin: existingPin, parentSet: existing?.data()?.pinSetBy === 'parent' });
      continue;
    }
    const pin = createPin();
    batch.set(ref, { studentId: student.studentId, classId: context.classId, pinHash: hashPin(pin), pinPlain: pin, pinSetBy: 'teacher' satisfies ParentPinSetBy, updatedAt: now });
    rows.push({ ...student, pin, parentSet: false });
    pending += 1;
    if (pending >= 400) { await batch.commit(); batch = db.batch(); pending = 0; }
  }
  if (pending > 0) await batch.commit();
  res.status(200).json({ joinCode: String(context.classData?.joinCode || ''), className: String(context.classData?.name || ''), rows });
};

/** Cấp lại PIN phụ huynh cho ĐÚNG một em (quên PIN): PIN ngẫu nhiên 4 số, phụ huynh phải tự đặt PIN riêng ở lần vào kế tiếp. */
const handleResetParentPin = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  if (!isSafeDocId(studentId) || !(await context.classRef.collection('students').doc(studentId).get()).exists) {
    return void res.status(404).json({ error: 'Không tìm thấy học sinh trong lớp.' });
  }
  const pin = createPin();
  await context.classRef.collection(PARENT_SECRETS_SUB).doc(studentId).set({
    studentId, classId: context.classId, pinHash: hashPin(pin), pinPlain: pin, pinSetBy: 'teacher' satisfies ParentPinSetBy, updatedAt: new Date().toISOString(),
  });
  res.status(200).json({ studentId, pin });
};

/** Công bố (hoặc ghi đè) báo cáo một kì cho nhiều em: `reports: [{ studentId, input }]`, cùng `kind/from/to`. */
const handlePublishParentReports = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const period = periodOf(body);
  if (!period) return void res.status(400).json({ error: 'Loại báo cáo hoặc ngày không hợp lệ.' });
  const reports = Array.isArray(body.reports) ? body.reports : [];
  if (reports.length === 0 || reports.length > MAX_PER_CALL) return void res.status(400).json({ error: `Mỗi lượt công bố 1–${MAX_PER_CALL} báo cáo.` });

  const valid = new Set((await studentRows(context.classRef)).map(s => s.studentId));
  const now = new Date().toISOString();
  const batch = db.batch();
  let saved = 0;
  const skipped: string[] = [];
  for (const item of reports) {
    const entry = (item && typeof item === 'object' ? item : {}) as { studentId?: unknown; input?: unknown };
    const studentId = typeof entry.studentId === 'string' ? entry.studentId : '';
    const input = entry.input as { period?: { title?: unknown; range?: unknown } } | undefined;
    const json = input && typeof input === 'object' ? JSON.stringify(input) : '';
    if (!valid.has(studentId) || !json || json.length > PARENT_INPUT_MAX_CHARS) { skipped.push(studentId); continue; }
    batch.set(context.classRef.collection(PARENT_REPORTS_SUB).doc(parentReportDocId(studentId, period.kind, period.from, period.to)), {
      studentId, ...period,
      title: String(input?.period?.title || '').slice(0, 200),
      range: String(input?.period?.range || '').slice(0, 100),
      inputJson: json,
      publishedAt: now,
      publishedBy: context.uid,
    });
    saved += 1;
  }
  if (saved > 0) {
    await batch.commit();
    // Lưu nhận diện trường/GV một lần ở tài liệu nhỏ để báo cáo tự chọn của phụ huynh khỏi phải đọc mọi báo cáo đã công bố chỉ để lấy logo.
    const branding = reports.map(item => sanitizeBranding((item as { input?: { branding?: unknown } })?.input?.branding)).find(Boolean);
    if (branding) await context.classRef.collection(PARENT_CONFIG_SUB).doc(PARENT_BRANDING_DOC).set({ ...branding, updatedAt: now });
  }
  res.status(200).json({ saved, skipped });
};

/** Giáo viên xem các kì đã công bố (gộp theo kì) để biết đã gửi gì và gỡ khi cần. */
const handleListParentPublished = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const snap = await context.classRef.collection(PARENT_REPORTS_SUB).get();
  const groups = new Map<string, { kind: string; from: string; to: string; title: string; range: string; count: number; publishedAt: string }>();
  for (const d of snap.docs) {
    const data = d.data();
    const key = `${data.kind}|${data.from}|${data.to}`;
    const group = groups.get(key) ?? { kind: String(data.kind), from: String(data.from), to: String(data.to), title: String(data.title || ''), range: String(data.range || ''), count: 0, publishedAt: '' };
    group.count += 1;
    if (String(data.publishedAt || '') > group.publishedAt) group.publishedAt = String(data.publishedAt);
    groups.set(key, group);
  }
  res.status(200).json({ groups: [...groups.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)) });
};

/** Gỡ một kì đã công bố (cả lớp, hoặc một em nếu có `studentId`). */
const handleUnpublishParentReports = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const period = periodOf(body);
  if (!period) return void res.status(400).json({ error: 'Loại báo cáo hoặc ngày không hợp lệ.' });
  const only = typeof body.studentId === 'string' ? body.studentId : '';
  const snap = await context.classRef.collection(PARENT_REPORTS_SUB).get();
  const targets = snap.docs.filter(d => {
    const data = d.data();
    return data.kind === period.kind && data.from === period.from && data.to === period.to && (!only || data.studentId === only);
  });
  const batch = db.batch();
  targets.forEach(d => batch.delete(d.ref));
  if (targets.length > 0) await batch.commit();
  res.status(200).json({ removed: targets.length });
};

/**
 * Phụ huynh: mã lớp + em + PIN → các báo cáo đã công bố của em (mới nhất trước).
 * (Chưa cấp PIN trả 409, sai PIN trả 401 — phụ huynh cần biết "nhờ thầy cô cấp mã"; lớp/em không có trả 404.)
 * PIN còn là mã giáo viên cấp (`pinSetBy !== 'parent'`) → `mustChange: true` và CHƯA trả báo cáo nào, tới khi phụ huynh đặt PIN riêng.
 */
const handleParentReports = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const pin = body.pin;
  if (!isValidParentPin(pin)) return void res.status(400).json({ error: PARENT_PIN_RULE });
  const target = await resolveParentStudent(db, body, res);
  if (!target) return;
  const { classDoc, studentId, studentSnap, secretRef } = target;
  const device = body.device;
  if (!(await verifyParentPin(db, target, pin, res, { device }))) return;

  const studentName = String(studentSnap.data()?.name || '');
  const className = String(classDoc.data().name || '');
  if ((await secretRef.get()).data()?.pinSetBy !== 'parent') {
    // Mới gõ được mã tạm của thầy cô: chưa tính là "đã vào" (chưa xem gì); lượt vào thật được ghi sau khi đặt PIN riêng.
    return void res.status(200).json({ studentName, className, mustChange: true, reports: [] });
  }
  await recordParentActivity(db, classDoc.ref, studentId, 'login', { device });

  const reports = await classDoc.ref.collection(PARENT_REPORTS_SUB).where('studentId', '==', studentId).get();
  const items = reports.docs
    .map(d => {
      const data = d.data();
      let input: unknown = null;
      try { input = JSON.parse(String(data.inputJson || 'null')); } catch { /* bản hỏng → bỏ */ }
      return { id: d.id, kind: String(data.kind), from: String(data.from), to: String(data.to), title: String(data.title || ''), range: String(data.range || ''), publishedAt: String(data.publishedAt || ''), input };
    })
    .filter(item => item.input)
    .sort(compareParentReports);
  res.status(200).json({ studentName, className, mustChange: false, reports: items });
};

/**
 * Phụ huynh tự đặt PIN mới: gửi PIN hiện tại + PIN mới (4 ký tự bất kỳ).
 * Lưu băm để đăng nhập và bản hiển thị `pinPlain` để giáo viên xem/cấp lại (đồng bộ ngay lên bảng PIN của lớp).
 */
const handleChangeParentPin = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const pin = body.pin;
  const newPin = body.newPin;
  if (!isValidParentPin(pin) || !isValidParentPin(newPin)) return void res.status(400).json({ error: PARENT_PIN_RULE });
  const next = normalizeParentPin(newPin);
  if (next === normalizeParentPin(pin)) return void res.status(400).json({ error: 'Mã PIN mới phải khác mã PIN hiện tại.' });
  const target = await resolveParentStudent(db, body, res);
  if (!target) return;
  const device = body.device;
  if (!(await verifyParentPin(db, target, pin, res, { device }))) return;

  const now = new Date().toISOString();
  await target.secretRef.set({ pinHash: hashPin(next), pinPlain: next, pinSetBy: 'parent' satisfies ParentPinSetBy, pinChangedAt: now, updatedAt: now }, { merge: true });
  await recordParentActivity(db, target.classDoc.ref, target.studentId, 'pinChanged', { device });
  res.status(200).json({ ok: true });
};

/** Phụ huynh báo hiệu đang xem (`ping`), mở một báo cáo (`open`, kèm tên) hoặc tải PDF (`pdf`). Cần PIN do phụ huynh TỰ ĐẶT; PIN sai được đếm như mọi đường khác. */
const handleParentEvent = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const pin = body.pin;
  const type = body.type;
  if (!isValidParentPin(pin)) return void res.status(400).json({ error: PARENT_PIN_RULE });
  if (type !== 'ping' && type !== 'open' && type !== 'pdf') return void res.status(400).json({ error: 'Loại sự kiện không hợp lệ.' });
  const target = await resolveParentStudent(db, body, res);
  if (!target) return;
  if (!(await verifyParentPin(db, target, pin, res, { device: body.device, requireParentSet: true }))) return;
  await recordParentActivity(db, target.classDoc.ref, target.studentId, type, { device: body.device, detail: typeof body.detail === 'string' ? body.detail : '' });
  res.status(200).json({ ok: true });
};

/**
 * Gỡ dữ liệu cổng phụ huynh khi thu hồi một em (`studentId`) hoặc cả lớp: PIN (kể cả bản đọc được), thống kê + dòng thời gian,
 * báo cáo đã công bố, và (cả lớp) cấu hình nhận diện. Nếu không gỡ, tạo lại cùng mã học sinh sẽ "sống lại" PIN và báo cáo cũ.
 */
export const purgeParentData = async (db: Db, classRef: FirebaseFirestore.DocumentReference, studentId?: string): Promise<number> => {
  const refs: FirebaseFirestore.DocumentReference[] = [];
  const pick = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => docs.forEach(d => refs.push(d.ref));
  if (studentId) {
    refs.push(classRef.collection(PARENT_SECRETS_SUB).doc(studentId));
    refs.push(classRef.collection(PARENT_STATS_SUB).doc(studentId));
    pick((await classRef.collection(PARENT_STATS_SUB).doc(studentId).collection('events').get()).docs);
    pick((await classRef.collection(PARENT_REPORTS_SUB).where('studentId', '==', studentId).get()).docs);
  } else {
    pick((await classRef.collection(PARENT_SECRETS_SUB).get()).docs);
    pick((await classRef.collection(PARENT_REPORTS_SUB).get()).docs);
    pick((await classRef.collection(PARENT_CONFIG_SUB).get()).docs);
    const stats = await classRef.collection(PARENT_STATS_SUB).get();
    for (const stat of stats.docs) pick((await stat.ref.collection('events').get()).docs);
    pick(stats.docs);
  }
  let batch = db.batch();
  let pending = 0;
  for (const ref of refs) {
    batch.delete(ref);
    pending += 1;
    if (pending >= 400) { await batch.commit(); batch = db.batch(); pending = 0; }
  }
  if (pending > 0) await batch.commit();
  return refs.length;
};

export const handleParentPortalAction = async (db: Db, body: Body, res: VercelResponse): Promise<boolean> => {
  switch (body.action) {
    case 'issueParentPins': await handleIssueParentPins(db, body, res); return true;
    case 'resetParentPin': await handleResetParentPin(db, body, res); return true;
    case 'publishParentReports': await handlePublishParentReports(db, body, res); return true;
    case 'listParentPublished': await handleListParentPublished(db, body, res); return true;
    case 'unpublishParentReports': await handleUnpublishParentReports(db, body, res); return true;
    case 'parentReports': await handleParentReports(db, body, res); return true;
    case 'changeParentPin': await handleChangeParentPin(db, body, res); return true;
    case 'parentEvent': await handleParentEvent(db, body, res); return true;
    case 'parentCustomReport': await handleParentCustomReport(db, body, res); return true;
    default: return handleParentActivityAction(db, body, res);
  }
};
