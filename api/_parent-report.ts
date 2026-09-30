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
import {
  aggregateRequirementLines, sanitizeRequirementLines, yccdOptionsForPrompt,
  type EvidenceSubmission, type ParentRequirementLine,
} from '../src/lib/classroom/parentRequirements.js';

type Db = FirebaseFirestore.Firestore;
type Body = Record<string, unknown>;

export const PARENT_REPORT_NOTES_COL = 'parentReportNotes';
const MAX_NOTE_CHARS = 3000;
// Có từng câu của các bài đã duyệt (căn cứ ghép yêu cầu cần đạt) nên dài hơn bản chỉ có số tổng.
const MAX_FACTS_CHARS = 60000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
// Hàm `classroom` bị Vercel dừng ở 60s (vercel.json); chừa ~10s để trả lời rõ ràng thay vì lỗi 504 trần.
const AI_TIMEOUT_MS = 50_000;
const AI_SLOW_MESSAGE = 'AI soạn báo cáo quá lâu nên máy chủ đã dừng. Bấm "AI soạn nháp" lại một lần nữa.';

/** Gọi AI; hết giờ chờ thì trả null (để báo lỗi rõ), lỗi khác (khoá, ví, Gemini) vẫn ném lên như mọi action. */
const callWithinTime = async (call: () => Promise<string>): Promise<string | null> => {
  const startedAt = Date.now();
  try {
    return await call();
  } catch (error) {
    if (Date.now() - startedAt >= AI_TIMEOUT_MS - 1000) return null;
    throw error;
  }
};

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

/**
 * Bản có yêu cầu cần đạt: một lượt AI trả JSON gồm nhận xét + mỗi YCCĐ một mục (các câu căn cứ và ghi chú đi cùng nhau).
 * Mức không do AI quyết: máy tính từ điểm các câu làm căn cứ (`aggregateRequirementLines`).
 */
export const buildParentReportDraftPrompt = (factsJson: string, yccdOptions: string): string => [
  'Bạn là giáo viên môn Toán THPT ở Việt Nam, soạn báo cáo học tập gửi phụ huynh của một học sinh.',
  'Dữ liệu (JSON, chỉ gồm kết quả đã được giáo viên duyệt). "baiDaDuyet" liệt kê từng câu: mã câu, điểm/tối đa, kết quả, loại lỗi,',
  'giải thích của lượt chấm, đáp án/mốc chấm, trích bài làm của em:',
  factsJson,
  '',
  'Danh sách YÊU CẦU CẦN ĐẠT của khối (Chương trình GDPT 2018 môn Toán) — mỗi dòng "mã | chủ đề: yêu cầu":',
  yccdOptions,
  '',
  'Trả về DUY NHẤT một JSON đúng dạng:',
  '{"nhanXet": "...", "yccd": [{"ma": "T10.05", "cau": ["b1q2", "b3q1"], "ghiChu": "..."}]}',
  '',
  '1) "yccd": mỗi yêu cầu cần đạt mà các câu trong baiDaDuyet kiểm tra là MỘT mục; "cau" là mọi câu trực tiếp kiểm tra yêu cầu đó.',
  '   - Ghép cả câu làm ĐÚNG/đạt điểm tối đa, không chỉ câu sai: bỏ sót câu đúng làm mức của em bị thấp oan.',
  '     Câu đúng thường có giải thích ngắn — dựa vào đáp án, bài làm và tên bài để biết nó kiểm tra gì.',
  '   - Chọn đúng MỨC của yêu cầu: câu phải giải/tính/biểu diễn/vận dụng thì ghép vào yêu cầu "giải được/biểu diễn được/vận dụng được",',
  '     KHÔNG ghép vào yêu cầu "nhận biết được" chỉ vì cùng chủ đề. Một câu thường thuộc 1 yêu cầu, tối đa 2.',
  '   - Câu thật sự không biết kiểm tra gì thì bỏ qua. Chỉ dùng mã có trong danh sách; không tạo mã mới.',
  '   - Làm xong, rà lại từng mục: còn câu nào (nhất là câu làm đúng) cùng nội dung mà chưa có trong "cau" không.',
  '2) "ghiChu" của mỗi mục: một câu (≤ 30 chữ) chỉ ra CHÍNH XÁC em làm tốt hoặc sai ở đâu, dùng thuật ngữ Toán học chuẩn để',
  '   gia sư/giáo viên khác đọc là biết cần dạy lại gì. Ví dụ: "Nhầm chiều khi áp dụng quy tắc hiệu: viết vectơ AB − vectơ AC = vectơ BC',
  '   thay vì vectơ CB." hoặc "Lập đúng bảng biến thiên, xác định đúng đỉnh và trục đối xứng của parabol."',
  '   Ghi chú PHẢI KHỚP kết quả chính các câu trong "cau" của mục đó: phần lớn điểm bị mất → nêu lỗi cụ thể (không khen);',
  '   phần lớn đạt điểm → nêu điều làm tốt; lẫn lộn → nêu cả hai, lỗi trước. Không viết "tốt" khi các câu đó đa số sai.',
  '   Không nhắc số câu/số bài, không nêu đáp án đầy đủ, không dùng LaTeX hay markdown (viết kí hiệu bằng chữ hoặc Unicode: √, ², ≤, ∈, °).',
  '   Chỉ viết điều có trong dữ liệu; không có gì cụ thể thì để chuỗi rỗng.',
  '3) "nhanXet": 3–5 câu gửi phụ huynh, giọng ấm áp, dễ hiểu với người không rành Toán; gọi học sinh là "con", phụ huynh là "gia đình";',
  '   nêu 1 điểm tích cực cụ thể, 1–2 điều con cần cố gắng, 1 việc gia đình có thể làm ở nhà. Bám đúng số liệu, không bịa.',
  '   Dữ liệu quá ít thì nói thẳng là chưa đủ bài để nhận xét sâu và nhắc con nộp bài đầy đủ. Văn xuôi thuần, không tiêu đề, không lời chào.',
].join('\n');

const readEvidence = (facts: unknown): EvidenceSubmission[] => {
  const rows = facts && typeof facts === 'object' ? (facts as Record<string, unknown>).baiDaDuyet : null;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap(row => {
    if (!row || typeof row !== 'object' || !Array.isArray((row as EvidenceSubmission).cau)) return [];
    const submission = row as EvidenceSubmission;
    return [{
      ma: String(submission.ma ?? ''),
      ten: String(submission.ten ?? ''),
      ngay: String(submission.ngay ?? ''),
      cau: submission.cau.map(q => ({ ...q, ma: String(q?.ma ?? ''), diem: Number(q?.diem), toiDa: Number(q?.toiDa), ketQua: String(q?.ketQua ?? '') })),
    }];
  });
};

const parseDraftJson = (raw: string): Record<string, unknown> | null => {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
};

const cleanComment = (value: unknown): string => (
  typeof value === 'string' ? value.replace(/^#+\s.*$/gm, '').replace(/\*\*/g, '').trim().slice(0, MAX_NOTE_CHARS) : ''
);

const handleGetNote = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const key = readKey(body);
  if ('error' in key) return void res.status(422).json({ error: key.error });
  const snap = await db.collection(PARENT_REPORT_NOTES_COL).doc(noteDocId(context.classId, key)).get();
  const data = snap.exists ? snap.data() ?? {} : {};
  res.status(200).json({
    text: typeof data.text === 'string' ? data.text : '',
    requirements: sanitizeRequirementLines(context.classData.grade, data.requirements),
    updatedAt: data.updatedAt ?? null,
  });
};

const handleSaveNote = async (db: Db, body: Body, res: VercelResponse): Promise<void> => {
  const context = await teacherContext(db, body, res);
  if (!context) return;
  const key = readKey(body);
  if ('error' in key) return void res.status(422).json({ error: key.error });
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, MAX_NOTE_CHARS) : '';
  const requirements = sanitizeRequirementLines(context.classData.grade, body.requirements);
  const updatedAt = new Date().toISOString();
  await db.collection(PARENT_REPORT_NOTES_COL).doc(noteDocId(context.classId, key)).set({
    classId: context.classId, ...key, text, requirements, updatedAt, updatedBy: context.uid,
  });
  res.status(200).json({ text, requirements, updatedAt });
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
  const grade = context.classData.grade;
  const yccdOptions = yccdOptionsForPrompt(grade);
  const evidence = readEvidence(body.facts);
  // Khối chưa có bảng yêu cầu cần đạt hoặc kì không có bài đã duyệt → chỉ soạn nhận xét như cũ.
  if (!yccdOptions || evidence.length === 0) {
    const raw = await callWithinTime(() => callGeminiVision(buildParentCommentPrompt(factsJson), [], getGradingApiKey(), GRADING_MODEL, {
      temperature: 0.4,
      maxOutputTokens: 'model-max',
      timeoutMs: AI_TIMEOUT_MS,
    }));
    if (raw === null) return void res.status(504).json({ error: AI_SLOW_MESSAGE });
    const text = cleanComment(raw);
    if (!text) return void res.status(502).json({ error: 'AI chưa soạn được nhận xét, thử lại.' });
    return void res.status(200).json({ text, requirements: [] as ParentRequirementLine[] });
  }
  const raw = await callWithinTime(() => callGeminiVision(buildParentReportDraftPrompt(factsJson, yccdOptions), [], getGradingApiKey(), GRADING_MODEL, {
    temperature: 0.2,
    maxOutputTokens: 'model-max',
    jsonMode: true,
    timeoutMs: AI_TIMEOUT_MS,
  }));
  if (raw === null) return void res.status(504).json({ error: AI_SLOW_MESSAGE });
  const parsed = parseDraftJson(raw);
  const text = cleanComment(parsed?.nhanXet);
  if (!parsed || !text) return void res.status(502).json({ error: 'AI chưa soạn được báo cáo, thử lại.' });
  res.status(200).json({ text, requirements: aggregateRequirementLines(grade, evidence, parsed) });
};

export const handleParentReportAction = async (db: Db, body: Body, res: VercelResponse): Promise<boolean> => {
  const action = String(body.action || '');
  if (action === 'parentReportNote') { await handleGetNote(db, body, res); return true; }
  if (action === 'saveParentReportNote') { await handleSaveNote(db, body, res); return true; }
  if (action === 'draftParentReportComment') { await handleDraft(db, body, res); return true; }
  return false;
};
