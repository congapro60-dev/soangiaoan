/**
 * Thống kê hoạt động của phụ huynh trên cổng /ph, để giáo viên biết ai đã vào, mấy lần, lúc nào, có đang xem không.
 *
 * - `classes/{classId}/parentStats/{studentId}`: bộ đếm + mốc thời gian (đọc nhanh cả lớp một lượt).
 * - `classes/{classId}/parentStats/{studentId}/events/{id}`: dòng thời gian chi tiết (vào, mở báo cáo, tải PDF, xem tự chọn, đổi PIN).
 *   "Còn đây" (ping) và lần nhập sai chỉ cập nhật bộ đếm/mốc, không tạo dòng sự kiện.
 * Không lưu IP hay tên máy — chỉ loại thiết bị thô (điện thoại / máy tính). Chỉ đi qua API; ghi hỏng không bao giờ làm hỏng lượt xem của phụ huynh.
 */
import type { VercelResponse } from '@vercel/node';
import { randomBytes } from 'node:crypto';
import { teacherContext } from './_classroom-teacher.js';
import {
  PARENT_EVENTS_SUB, PARENT_ONLINE_MS, PARENT_STATS_SUB, isSafeDocId, parentDeviceOf,
  type ParentActivityEvent, type ParentActivityRow, type ParentDevice, type ParentEventType,
} from '../src/lib/classroom/parentAccess.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

export type ParentActivityKind = ParentEventType | 'ping' | 'wrong';

const COUNTER: Partial<Record<ParentActivityKind, string>> = {
  login: 'loginCount', open: 'openCount', pdf: 'pdfCount', custom: 'customCount', wrong: 'wrongCount', pinChanged: 'pinChangeCount',
};
const MAX_EVENTS = 100;

const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const str = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Hai lần ghi "nhập sai" cho cùng một em phải cách nhau tối thiểu chừng này — đợt dò mã không làm nghẽn tài liệu thống kê. */
export const WRONG_WRITE_GAP_MS = 2_000;

export const recordParentActivity = async (
  db: Db,
  classRef: FirebaseFirestore.DocumentReference,
  studentId: string,
  kind: ParentActivityKind,
  options: { device?: unknown; detail?: string } = {},
): Promise<void> => {
  try {
    const now = new Date().toISOString();
    const device = parentDeviceOf(options.device);
    const statsRef = classRef.collection(PARENT_STATS_SUB).doc(studentId);
    if (kind === 'wrong') {
      // Không dùng giao dịch: nhiều lượt dò mã song song sẽ tranh khoá một tài liệu, làm chậm cả phụ huynh thật (đo được ~19 giây/lượt).
      // Đọc một lần; chưa quá WRONG_WRITE_GAP_MS kể từ lần ghi trước thì bỏ qua (số đếm là tín hiệu "có người dò mã", không cần chính xác từng lượt).
      const current = ((await statsRef.get()).data() || {}) as Record<string, unknown>;
      const last = Date.parse(str(current.lastWrongAt));
      if (Number.isFinite(last) && Date.now() - last < WRONG_WRITE_GAP_MS) return;
      await statsRef.set({ studentId, wrongCount: num(current.wrongCount) + 1, lastWrongAt: now, updatedAt: now }, { merge: true });
      return;
    }
    await db.runTransaction(async tx => {
      const current = ((await tx.get(statsRef)).data() || {}) as Record<string, unknown>;
      const next: Record<string, unknown> = { studentId, updatedAt: now, lastSeenAt: now, lastDevice: device };
      const counter = COUNTER[kind];
      if (counter) next[counter] = num(current[counter]) + 1;
      if (kind === 'login') {
        next.lastLoginAt = now;
        if (!str(current.firstLoginAt)) next.firstLoginAt = now;
      }
      tx.set(statsRef, next, { merge: true });
    });
    if (kind === 'ping') return;
    const id = `${now}_${randomBytes(3).toString('hex')}`;
    await statsRef.collection(PARENT_EVENTS_SUB).doc(id).set({ type: kind, at: now, device, detail: (options.detail || '').slice(0, 200) });
  } catch (error) {
    console.error('[parent-activity] không ghi được hoạt động phụ huynh:', error);
  }
};

/** Giáo viên: thống kê cả lớp (mọi em, kể cả em chưa vào lần nào). */
const handleParentActivity = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const [students, stats] = await Promise.all([
    context.classRef.collection('students').get(),
    context.classRef.collection(PARENT_STATS_SUB).get(),
  ]);
  const byId = new Map(stats.docs.map(d => [d.id, d.data() as Record<string, unknown>]));
  const now = Date.now();
  const rows: ParentActivityRow[] = students.docs
    .map(d => ({ id: d.id, name: str(d.data()?.name) }))
    .filter(s => s.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    .map(({ id, name }) => {
      const stat = byId.get(id) ?? {};
      const lastSeenAt = str(stat.lastSeenAt);
      return {
        studentId: id,
        name,
        loginCount: num(stat.loginCount),
        openCount: num(stat.openCount),
        pdfCount: num(stat.pdfCount),
        customCount: num(stat.customCount),
        wrongCount: num(stat.wrongCount),
        firstLoginAt: str(stat.firstLoginAt),
        lastLoginAt: str(stat.lastLoginAt),
        lastSeenAt,
        lastWrongAt: str(stat.lastWrongAt),
        lastDevice: (str(stat.lastDevice) as ParentDevice) || '',
        online: lastSeenAt !== '' && now - Date.parse(lastSeenAt) <= PARENT_ONLINE_MS,
      };
    });
  res.status(200).json({ rows });
};

/** Giáo viên: dòng thời gian chi tiết của một em (mới nhất trước, tối đa 100). */
const handleParentActivityDetail = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  if (!isSafeDocId(studentId)) return void res.status(400).json({ error: 'Thiếu mã học sinh.' });
  // Chỉ đọc MAX_EVENTS dòng mới nhất (không đọc cả lịch sử mỗi lần bấm hay làm mới 30 giây).
  const snap = await context.classRef.collection(PARENT_STATS_SUB).doc(studentId).collection(PARENT_EVENTS_SUB).orderBy('at', 'desc').limit(MAX_EVENTS).get();
  const events: ParentActivityEvent[] = snap.docs
    .map(d => {
      const data = d.data() as Record<string, unknown>;
      return { id: d.id, type: str(data.type) as ParentEventType, at: str(data.at), device: parentDeviceOf(data.device), detail: str(data.detail) };
    })
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_EVENTS);
  res.status(200).json({ events });
};

export const handleParentActivityAction = async (db: Db, body: Body, res: VercelResponse): Promise<boolean> => {
  switch (body.action) {
    case 'parentActivity': await handleParentActivity(db, body, res); return true;
    case 'parentActivityDetail': await handleParentActivityDetail(db, body, res); return true;
    default: return false;
  }
};
