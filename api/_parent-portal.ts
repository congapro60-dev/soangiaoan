/**
 * Cổng phụ huynh (/ph): giáo viên cấp PIN riêng cho phụ huynh và CÔNG BỐ báo cáo; phụ huynh chọn tên con + PIN để xem.
 *
 * - `classes/{classId}/parentSecrets/{studentId}`: PIN phụ huynh (băm + bản hiển thị cho giáo viên phát lại), cùng cơ chế khoá như PIN học sinh.
 *   `pinSetBy`: 'teacher' (giáo viên cấp/cấp lại → phụ huynh PHẢI tự đặt PIN mới ở lần vào kế tiếp) | 'parent' (phụ huynh đã tự đặt;
 *   bản hiển thị `pinPlain` cập nhật theo để giáo viên xem được và cấp lại/đặt lại bất cứ lúc nào).
 * - `classes/{classId}/parentReports/{id}`: bản chụp `ParentReportPrintInput` (JSON) đã công bố — phụ huynh xem đúng như bản PDF,
 *   không cần giáo viên tải file. Công bố lại cùng kì thì ghi đè.
 * Chỉ đi qua API (rules mặc định chặn client). Phụ huynh KHÔNG có phiên Firebase: mỗi lượt xem gửi lại PIN để máy chủ kiểm.
 */
import type { VercelResponse } from '@vercel/node';
import { teacherContext } from './_classroom-teacher.js';
import {
  EMPTY_LOCK, attemptPin, createPin, hashPin, isValidPinShape, normalizeJoinCode,
} from './_classroom-core.js';
import { REPORT_KINDS } from '../src/lib/classroom/reportKinds.js';
import {
  PARENT_INPUT_MAX_CHARS, PARENT_REPORTS_SUB, PARENT_SECRETS_SUB, parentReportDocId, weakParentPinReason,
} from '../src/lib/classroom/parentAccess.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS: readonly string[] = REPORT_KINDS.map(item => item.kind);
const MAX_PER_CALL = 40;

const periodOf = (body: Body): { kind: string; from: string; to: string } | null => {
  const kind = String(body.kind || '');
  const from = String(body.from || '');
  const to = String(body.to || '');
  return KINDS.includes(kind) && DAY_RE.test(from) && DAY_RE.test(to) ? { kind, from, to } : null;
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
    batch.set(ref, { studentId: student.studentId, classId: context.classId, pinHash: hashPin(pin), pinPlain: pin, pinSetBy: 'teacher', ...EMPTY_LOCK, updatedAt: now });
    rows.push({ ...student, pin, parentSet: false });
    pending += 1;
    if (pending >= 400) { await batch.commit(); batch = db.batch(); pending = 0; }
  }
  if (pending > 0) await batch.commit();
  res.status(200).json({ joinCode: String(context.classData?.joinCode || ''), className: String(context.classData?.name || ''), rows });
};

/** Cấp lại PIN phụ huynh cho ĐÚNG một em (quên PIN / bị khoá) — xoá luôn trạng thái khoá. */
const handleResetParentPin = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  if (!studentId || studentId.includes('/') || !(await context.classRef.collection('students').doc(studentId).get()).exists) {
    return void res.status(404).json({ error: 'Không tìm thấy học sinh trong lớp.' });
  }
  const pin = createPin();
  await context.classRef.collection(PARENT_SECRETS_SUB).doc(studentId).set({
    studentId, classId: context.classId, pinHash: hashPin(pin), pinPlain: pin, pinSetBy: 'teacher', ...EMPTY_LOCK, updatedAt: new Date().toISOString(),
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
  if (saved > 0) await batch.commit();
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

/** Mã lớp + em từ thân yêu cầu của phụ huynh; không có thì đã trả 404 và trả `null`. */
const resolveParentStudent = async (db: Db, body: Body, res: VercelResponse) => {
  const joinCode = normalizeJoinCode(body.joinCode);
  const studentId = typeof body.studentId === 'string' ? body.studentId : '';
  const classes = joinCode ? await db.collection('classes').where('joinCode', '==', joinCode).limit(1).get() : null;
  const classDoc = classes?.docs[0];
  if (!classDoc || !studentId || studentId.includes('/')) return void res.status(404).json({ error: 'Không tìm thấy lớp hoặc học sinh.' });
  const studentSnap = await classDoc.ref.collection('students').doc(studentId).get();
  if (!studentSnap.exists) return void res.status(404).json({ error: 'Không tìm thấy học sinh trong lớp này.' });
  return { classDoc, studentId, studentSnap, secretRef: classDoc.ref.collection(PARENT_SECRETS_SUB).doc(studentId) };
};

/** Kiểm PIN hiện tại (tính vào khoá sai 5 lần); không qua thì đã trả lỗi và trả `false`. */
const verifyParentPin = async (secretRef: FirebaseFirestore.DocumentReference, db: Db, pin: string, res: VercelResponse): Promise<boolean> => {
  // Đọc khoá + kiểm PIN + ghi khoá trong MỘT giao dịch: đoán PIN song song không né được khoá sai 5 lần.
  const attempt = await attemptPin(db, secretRef, pin, new Date());
  if (attempt.status === 'ok') return true;
  if (attempt.status === 'missing') res.status(409).json({ error: 'Thầy cô chưa cấp mã PIN phụ huynh cho em này. Nhờ thầy cô cấp mã.' });
  else if (attempt.status === 'locked') res.status(429).json({ error: `Nhập sai mã PIN nhiều lần. Thử lại sau ${attempt.minutes} phút, hoặc nhờ thầy cô cấp lại mã.` });
  else res.status(401).json({ error: 'Mã PIN không đúng.' });
  return false;
};

/**
 * Phụ huynh: mã lớp + em + PIN → các báo cáo đã công bố của em (mới nhất trước).
 * Sai PIN tính vào khoá riêng của PIN phụ huynh; thông báo lỗi không lộ em nào có PIN hay chưa.
 * PIN còn là mã giáo viên cấp (`pinSetBy !== 'parent'`) → `mustChange: true` và CHƯA trả báo cáo nào, tới khi phụ huynh đặt PIN riêng.
 */
const handleParentReports = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const pin = body.pin;
  if (!isValidPinShape(pin)) return void res.status(400).json({ error: 'Mã PIN phải là 4 chữ số.' });
  const target = await resolveParentStudent(db, body, res);
  if (!target) return;
  const { classDoc, studentId, studentSnap, secretRef } = target;
  if (!(await verifyParentPin(secretRef, db, pin, res))) return;

  const studentName = String(studentSnap.data()?.name || '');
  const className = String(classDoc.data().name || '');
  if ((await secretRef.get()).data()?.pinSetBy !== 'parent') {
    return void res.status(200).json({ studentName, className, mustChange: true, reports: [] });
  }

  const reports = await classDoc.ref.collection(PARENT_REPORTS_SUB).where('studentId', '==', studentId).get();
  const items = reports.docs
    .map(d => {
      const data = d.data();
      let input: unknown = null;
      try { input = JSON.parse(String(data.inputJson || 'null')); } catch { /* bản hỏng → bỏ */ }
      return { id: d.id, kind: String(data.kind), from: String(data.from), to: String(data.to), title: String(data.title || ''), range: String(data.range || ''), publishedAt: String(data.publishedAt || ''), input };
    })
    .filter(item => item.input)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  res.status(200).json({ studentName, className, mustChange: false, reports: items });
};

/**
 * Phụ huynh tự đặt PIN mới: gửi PIN hiện tại + PIN mới. PIN hiện tại đi qua cùng khoá sai 5 lần.
 * Lưu băm để đăng nhập và bản hiển thị `pinPlain` để giáo viên xem/cấp lại (đồng bộ ngay lên bảng PIN của lớp).
 */
const handleChangeParentPin = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const pin = body.pin;
  const newPin = body.newPin;
  if (!isValidPinShape(pin) || !isValidPinShape(newPin)) return void res.status(400).json({ error: 'Mã PIN phải là 4 chữ số.' });
  if (newPin === pin) return void res.status(400).json({ error: 'Mã PIN mới phải khác mã PIN hiện tại.' });
  const weak = weakParentPinReason(newPin);
  if (weak) return void res.status(400).json({ error: weak });
  const target = await resolveParentStudent(db, body, res);
  if (!target) return;
  if (!(await verifyParentPin(target.secretRef, db, pin, res))) return;

  const now = new Date().toISOString();
  await target.secretRef.set({ pinHash: hashPin(newPin), pinPlain: newPin, pinSetBy: 'parent', pinChangedAt: now, ...EMPTY_LOCK, updatedAt: now }, { merge: true });
  res.status(200).json({ ok: true });
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
    default: return false;
  }
};
