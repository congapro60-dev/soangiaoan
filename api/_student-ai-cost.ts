/**
 * Chi phí AI của CHÍNH học sinh đang đăng nhập — để em thấy mỗi hoạt động tốn bao nhiêu tiền của thầy cô (xem
 * `src/lib/classroom/studentAiCost.ts`). Chỉ đọc, không có số liệu ví/khoá của thầy cô.
 *
 * Mã học sinh lấy từ `studentLinks` của PHIÊN (không nhận từ client — nhận từ client là mở đường cho em này xem em khác).
 * Một mã học sinh có thể trùng ở lớp của giáo viên khác nên chỉ nhận lượt thuộc đúng lớp hoặc đúng giáo viên của phiên.
 */
import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { AI_USAGE_COL, vnDate } from './_ai-usage.js';
import { loadUsdVnd } from './_ai-wallet.js';
import { summarizeStudentAiCost, type StudentAiCostRow } from '../src/lib/classroom/studentAiCost.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

/** Số lượt đọc tối đa mỗi lần (mới nhất trước không bảo đảm được khi lọc không sắp xếp, nên đọc đủ rộng rồi cắt trong bộ nhớ). */
const MAX_ROWS = 500;
const RECENT_LIMIT = 30;

const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const nonNeg = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0);

const handleStudentAiCost = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  let uid = '';
  try {
    uid = typeof body.idToken === 'string' && body.idToken ? (await getAuth().verifyIdToken(body.idToken)).uid : '';
  } catch {
    uid = '';
  }
  if (!uid) return void res.status(401).json({ error: 'Phiên đăng nhập học sinh không hợp lệ.' });

  const linkSnap = await db.collection('studentLinks').doc(uid).get();
  if (!linkSnap.exists) return void res.status(403).json({ error: 'Chỉ học sinh đã đăng nhập mới xem được mục này.' });
  const link = linkSnap.data() as { studentId?: unknown; classId?: unknown; teacherId?: unknown };
  const studentId = str(link.studentId);
  const classId = str(link.classId);
  const teacherId = str(link.teacherId);
  if (!studentId || !classId || !teacherId) return void res.status(403).json({ error: 'Phiên học sinh thiếu thông tin lớp.' });

  const [snap, usdVnd] = await Promise.all([
    db.collection(AI_USAGE_COL).where('refs.studentId', '==', studentId).limit(MAX_ROWS).get(),
    loadUsdVnd(db),
  ]);

  const rows: StudentAiCostRow[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const refs = (data.refs && typeof data.refs === 'object' ? data.refs : {}) as Record<string, unknown>;
    // Cùng mã học sinh ở lớp khác: chỉ nhận lượt của đúng lớp (hoặc đúng giáo viên chịu phí) của phiên này.
    if (str(refs.classId) !== classId && str(data.keyOwnerUid) !== teacherId) continue;
    rows.push({
      id: doc.id,
      at: str(data.at),
      day: str(data.day),
      model: str(data.model),
      feature: str(data.feature),
      inputTokens: nonNeg(data.inputTokens),
      outputTokens: nonNeg(data.outputTokens),
      thoughtsTokens: nonNeg(data.thoughtsTokens),
      cachedTokens: nonNeg(data.cachedTokens),
      images: nonNeg(data.images),
      usdVnd: nonNeg(data.usdVnd) || undefined,
      assignmentId: str(refs.assignmentId) || undefined,
    });
  }

  const view = summarizeStudentAiCost(rows, vnDate(new Date()).day, usdVnd, { recentLimit: RECENT_LIMIT, truncated: snap.size >= MAX_ROWS });

  // Tên bài tập cho các lượt gần đây (tối đa 30 bài, đọc song song; lỗi đọc thì bỏ qua — chỉ mất phần tên).
  const ids = [...new Set(view.recent.map(item => item.assignmentId).filter((id): id is string => Boolean(id)))];
  const titles = new Map<string, string>();
  await Promise.all(ids.map(async id => {
    const assignment = await db.collection('assignments').doc(id).get().catch(() => null);
    const data = assignment?.exists ? assignment.data() : null;
    if (data && str(data.classId) === classId && str(data.title)) titles.set(id, str(data.title).slice(0, 120));
  }));
  const recent = view.recent.map(({ assignmentId, ...item }) => {
    const title = assignmentId ? titles.get(assignmentId) : undefined;
    return title ? { ...item, assignmentTitle: title } : item;
  });

  res.status(200).json({ ...view, recent });
};

export const handleStudentAiCostAction = async (db: Db, body: Body, res: VercelResponse): Promise<boolean> => {
  if (body.action !== 'studentAiCost') return false;
  await handleStudentAiCost(db, body, res);
  return true;
};
