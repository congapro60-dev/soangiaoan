/**
 * Báo cáo phụ huynh theo tháng/kì/năm — NHẬN XÉT CỦA GIÁO VIÊN.
 *
 * AI soạn nháp từ số liệu bản phụ huynh (đã lọc an toàn ở client: điểm đã duyệt, chủ đề mạnh/cần rèn, so sánh),
 * giáo viên sửa rồi lưu. `parentReportNotes/{classId}_{studentId}_{kind}_{from}_{to}` chỉ đi qua đây
 * (rules mặc định chặn client). Chỉ giáo viên thuộc lớp; lượt AI tính cho giáo viên chủ lớp.
 */
import type { VercelResponse } from '@vercel/node';
import { teacherContext } from './_classroom-teacher.js';
import { setAiKeyOwner } from './_ai-usage.js';
import { callGeminiVision, getGradingApiKey, GRADING_MODEL } from './_grading-core.js';
import { REPORT_KINDS, type ReportKind } from '../src/lib/classroom/reportKinds.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

export const PARENT_REPORT_NOTES_COL = 'parentReportNotes';
const MAX_NOTE_CHARS = 3000;
const MAX_FACTS_CHARS = 5000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

interface NoteKey {
  studentId: string;
  kind: ReportKind;
  from: string;
  to: string;
}

const readKey = (body: Body): NoteKey | { error: string } => {
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  const kind = String(body.kind || '') as ReportKind;
  const from = String(body.from || '');
  const to = String(body.to || '');
  if (!studentId || studentId.includes('/')) return { error: 'Thiếu học sinh.' };
  if (!REPORT_KINDS.some(item => item.kind === kind)) return { error: 'Loại báo cáo không hợp lệ.' };
  if (!DAY_RE.test(from) || !DAY_RE.test(to) || from > to) return { error: 'Khoảng thời gian không hợp lệ.' };
  return { studentId, kind, from, to };
};

const noteDocId = (classId: string, key: NoteKey): string => `${classId}_${key.studentId}_${key.kind}_${key.from}_${key.to}`;

export const buildParentCommentPrompt = (factsJson: string): string => [
  'Bạn là giáo viên môn Toán THPT ở Việt Nam, viết NHẬN XÉT gửi phụ huynh trong báo cáo học tập của một học sinh.',
  'Dữ liệu (JSON, chỉ gồm kết quả đã được giáo viên duyệt):',
  factsJson,
  '',
  'Yêu cầu:',
  '- 3–5 câu, giọng ấm áp, tôn trọng, dễ hiểu với phụ huynh không rành Toán. Gọi học sinh là "con", gọi phụ huynh là "gia đình".',
  '- Bám ĐÚNG số liệu: không bịa bài, điểm hay sự việc không có trong dữ liệu. Không nêu đáp án hay lời giải.',
  '- Nêu 1 điểm tích cực cụ thể, 1–2 điều con cần cố gắng (dùng tên chủ đề trong dữ liệu nếu có), và 1 việc gia đình có thể làm ở nhà.',
  '- Nếu dữ liệu quá ít (ít hoặc không có bài đã chấm), nói thẳng là chưa đủ bài để nhận xét sâu và nhắc con nộp bài đầy đủ.',
  '- Chỉ trả về đoạn văn thuần: không tiêu đề, không gạch đầu dòng, không markdown, không lời chào/ký tên.',
].join('\n');

const handleGetNote = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const key = readKey(body);
  if ('error' in key) return void res.status(422).json({ error: key.error });
  const snap = await db.collection(PARENT_REPORT_NOTES_COL).doc(noteDocId(context.classId, key)).get();
  const data = snap.exists ? snap.data() ?? {} : {};
  res.status(200).json({ text: typeof data.text === 'string' ? data.text : '', updatedAt: data.updatedAt ?? null });
};

const handleSaveNote = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const key = readKey(body);
  if ('error' in key) return void res.status(422).json({ error: key.error });
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, MAX_NOTE_CHARS) : '';
  const updatedAt = new Date().toISOString();
  await db.collection(PARENT_REPORT_NOTES_COL).doc(noteDocId(context.classId, key)).set({
    classId: context.classId, ...key, text, updatedAt, updatedBy: context.uid,
  });
  res.status(200).json({ text, updatedAt });
};

const handleDraft = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const key = readKey(body);
  if ('error' in key) return void res.status(422).json({ error: key.error });
  const factsJson = JSON.stringify(body.facts ?? {});
  if (factsJson.length > MAX_FACTS_CHARS) return void res.status(422).json({ error: 'Dữ liệu báo cáo quá dài.' });
  // Lượt AI tính cho giáo viên chủ lớp (như chấm bài), không phải người bấm.
  setAiKeyOwner(String(context.classData.teacherId || context.uid));
  const raw = await callGeminiVision(buildParentCommentPrompt(factsJson), [], getGradingApiKey(), GRADING_MODEL, {
    temperature: 0.4,
    maxOutputTokens: 'model-max',
  });
  const text = raw.replace(/^#+\s.*$/gm, '').replace(/\*\*/g, '').trim().slice(0, MAX_NOTE_CHARS);
  if (!text) return void res.status(502).json({ error: 'AI chưa soạn được nhận xét, thử lại.' });
  res.status(200).json({ text });
};

export const handleParentReportAction = async (db: Db, body: Body, res: VercelResponse): Promise<boolean> => {
  const action = String(body.action || '');
  if (action === 'parentReportNote') { await handleGetNote(db, body, res); return true; }
  if (action === 'saveParentReportNote') { await handleSaveNote(db, body, res); return true; }
  if (action === 'draftParentReportComment') { await handleDraft(db, body, res); return true; }
  return false;
};
