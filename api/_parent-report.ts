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
import { sanitizeReportOverrides, type ReportOverrides } from '../src/lib/classroom/reportOverrides.js';
import { PARENT_REPORTS_SUB, parentReportDocId } from '../src/lib/classroom/parentAccess.js';
import { asProgram, stageForPeriod } from '../src/lib/classroom/reportStage.js';
import {
  aggregateRequirementLines, applyRequirementNotes, mapRequirementQuestions, sanitizeRequirementLines, yccdOptionsForPrompt,
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
const callWithinTime = async (call: () => Promise<string>, timeoutMs = AI_TIMEOUT_MS): Promise<string | null> => {
  const startedAt = Date.now();
  try {
    return await call();
  } catch (error) {
    if (Date.now() - startedAt >= timeoutMs - 1000) return null;
    throw error;
  }
};

/** Báo cáo "Tổng hợp từ đầu năm" không có kì cụ thể: dùng khoá giả để vẫn lưu được bản chỉnh (loại này không công bố lên cổng). */
export const ALL_PERIOD_KIND = 'all';

interface NoteKey {
  studentId: string;
  kind: ReportKind | typeof ALL_PERIOD_KIND;
  from: string;
  to: string;
}

const readKey = (body: Body): NoteKey | { error: string } => {
  const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  const kind = String(body.kind || '') as ReportKind | typeof ALL_PERIOD_KIND;
  const from = String(body.from || '');
  const to = String(body.to || '');
  if (!studentId || studentId.includes('/')) return { error: 'Thiếu học sinh.' };
  if (kind !== ALL_PERIOD_KIND && !REPORT_KINDS.some(item => item.kind === kind)) return { error: 'Loại báo cáo không hợp lệ.' };
  if (!DAY_RE.test(from) || !DAY_RE.test(to) || from > to) return { error: 'Khoảng thời gian không hợp lệ.' };
  return { studentId, kind, from, to };
};

export const noteDocId = (classId: string, key: NoteKey): string => `${classId}_${key.studentId}_${key.kind}_${key.from}_${key.to}`;

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
  '- Nếu dữ liệu có "kiDangDienRa" (kì chưa kết thúc): nói "từ đầu kì đến nay"/"tính đến thời điểm này", KHÔNG viết như kì đã qua ("vừa qua", "cả năm học").',
  '- Chỉ trả về đoạn văn thuần: không tiêu đề, không gạch đầu dòng, không markdown, không lời chào/ký tên.',
].join('\n');

/**
 * Bước 1 — ghép câu → YCCĐ cho MỘT nhóm bài (các nhóm chạy song song). Chỉ ghép, không viết ghi chú: ghi chú viết ở
 * bước 2 khi đã thấy MỌI câu của một YCCĐ (ghép từ nhiều nhóm thì ghi chú từng nhóm hay mâu thuẫn nhau).
 */
export const buildRequirementMappingPrompt = (evidenceJson: string, yccdOptions: string): string => [
  'Bạn là giáo viên môn Toán THPT ở Việt Nam, đối chiếu bài làm đã chấm của một học sinh với YÊU CẦU CẦN ĐẠT.',
  'Bài đã duyệt (JSON) — mỗi câu có: mã câu, điểm/tối đa, kết quả, loại lỗi, giải thích của lượt chấm, đáp án/mốc chấm, trích bài làm:',
  evidenceJson,
  '',
  'Danh sách YÊU CẦU CẦN ĐẠT của khối (Chương trình GDPT 2018 môn Toán) — mỗi dòng "mã | chủ đề: yêu cầu":',
  yccdOptions,
  '',
  'Trả về DUY NHẤT một JSON đúng dạng: {"yccd": [{"ma": "T10.05", "cau": ["b1q2", "b3q1"]}]}',
  'Mỗi yêu cầu cần đạt mà các câu trên kiểm tra là MỘT mục; "cau" là mọi câu trực tiếp kiểm tra yêu cầu đó.',
  '- Ghép cả câu làm ĐÚNG/đạt điểm tối đa, không chỉ câu sai: bỏ sót câu đúng làm mức của em bị thấp oan.',
  '  Câu đúng thường có giải thích ngắn — dựa vào đáp án, bài làm và tên bài để biết nó kiểm tra gì.',
  '- Chọn đúng MỨC của yêu cầu: câu phải giải/tính/biểu diễn/vận dụng thì ghép vào yêu cầu "giải được/biểu diễn được/vận dụng được",',
  '  KHÔNG ghép vào yêu cầu "nhận biết được" chỉ vì cùng chủ đề. Một câu thường thuộc 1 yêu cầu, tối đa 2.',
  '- Câu thật sự không biết kiểm tra gì thì bỏ qua. Chỉ dùng mã có trong danh sách; không tạo mã mới.',
].join('\n');

/**
 * Bước 2 — viết ghi chú cho từng YCCĐ, nhìn TẤT CẢ câu căn cứ của yêu cầu đó (kèm tỉ lệ điểm đã tính sẵn).
 */
export const buildRequirementNotesPrompt = (groupsJson: string): string => [
  'Bạn là giáo viên môn Toán THPT ở Việt Nam. Dưới đây là từng YÊU CẦU CẦN ĐẠT kèm MỌI câu (đã chấm, đã duyệt) của một học sinh',
  'dùng làm căn cứ cho yêu cầu đó, và tỉ lệ điểm đạt trên các câu ấy:',
  groupsJson,
  '',
  'Trả về DUY NHẤT một JSON đúng dạng: {"ghiChu": [{"ma": "T10.05", "ghiChu": "..."}]} — mỗi yêu cầu trên một mục.',
  '"ghiChu": một câu (≤ 30 chữ) chỉ ra CHÍNH XÁC em làm tốt hoặc sai ở đâu, dùng thuật ngữ Toán học chuẩn để gia sư/giáo viên khác',
  'đọc là biết cần dạy lại gì. Ví dụ: "Nhầm chiều khi áp dụng quy tắc hiệu: viết vectơ AB − vectơ AC = vectơ BC thay vì vectơ CB."',
  'hoặc "Lập đúng bảng biến thiên, xác định đúng đỉnh và trục đối xứng của parabol."',
  '- PHẢI KHỚP tỉ lệ điểm: dưới 50% → nêu lỗi cụ thể, không khen; từ 80% → nêu điều làm tốt (có thể thêm lỗi nhỏ còn lại);',
  '  ở giữa → nêu cả hai, lỗi trước. Một câu nhất quán, không tự mâu thuẫn.',
  '- Chỉ khen kĩ năng/định lí có câu làm ĐÚNG chứng minh. Không khen chung chung ("áp dụng tốt các định lí…"), và không khen',
  '  một kĩ năng mà có câu căn cứ bị mất điểm chính vì kĩ năng đó (vd. câu bị trừ vì chưa dùng định lí sin thì không được khen định lí sin).',
  '- Không nhắc số câu/số bài, không nêu đáp án đầy đủ, không dùng LaTeX hay markdown (viết kí hiệu bằng chữ hoặc Unicode: √, ², ≤, ∈, °).',
  '- Chỉ viết điều có trong dữ liệu; không có gì cụ thể thì để chuỗi rỗng.',
].join('\n');

/** Mỗi lượt ghép tối đa chừng này câu — ~90 câu một lượt mất ~25–50s, chia nhỏ chạy song song còn ~15s. */
const QUESTIONS_PER_MAPPING_CALL = 30;

export const chunkEvidence = (evidence: readonly EvidenceSubmission[], maxQuestions = QUESTIONS_PER_MAPPING_CALL): EvidenceSubmission[][] => {
  const chunks: EvidenceSubmission[][] = [];
  let current: EvidenceSubmission[] = [];
  let count = 0;
  for (const submission of evidence) {
    if (current.length > 0 && count + submission.cau.length > maxQuestions) {
      chunks.push(current);
      current = [];
      count = 0;
    }
    current.push(submission);
    count += submission.cau.length;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
};

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

/** Bản chỉnh đi kèm báo cáo đã công bố: chỉnh tay + nhận xét + dòng yêu cầu cần đạt (cả khi rỗng, để xoá được phía cổng). */
export const publishedOverridesJson = (note: { text: string; requirements: ParentRequirementLine[]; overrides: ReportOverrides }): string =>
  JSON.stringify({ ...note.overrides, teacherComment: note.text, requirements: note.requirements });

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
    overrides: sanitizeReportOverrides(data.overrides, context.classData.grade),
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
  // Nơi lưu nhận xét mà không gửi `overrides` (vd. soạn hàng loạt) thì giữ nguyên chỗ thầy cô đã chỉnh tay, không xoá.
  const noteRef = db.collection(PARENT_REPORT_NOTES_COL).doc(noteDocId(context.classId, key));
  const overrides = sanitizeReportOverrides(body.overrides === undefined ? (await noteRef.get()).data()?.overrides : body.overrides, context.classData.grade);
  const updatedAt = new Date().toISOString();
  await noteRef.set({
    classId: context.classId, ...key, text, requirements, overrides, updatedAt, updatedBy: context.uid,
  });
  // Báo cáo kì này đã công bố cho phụ huynh rồi thì cập nhật luôn: phụ huynh mở lần sau là thấy bản đã sửa, khỏi công bố lại.
  if (key.kind !== ALL_PERIOD_KIND) {
    const published = context.classRef.collection(PARENT_REPORTS_SUB).doc(parentReportDocId(key.studentId, key.kind, key.from, key.to));
    if ((await published.get()).exists) await published.update({ overridesJson: publishedOverridesJson({ text, requirements, overrides }), overridesUpdatedAt: updatedAt });
  }
  res.status(200).json({ text, requirements, overrides, updatedAt });
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
  // Chỉ đưa cho AI các YCCĐ cùng giai đoạn (học kì) với kì báo cáo — AI không ghép nhầm sang bài của học kì khác.
  const stage = stageForPeriod(key, asProgram(body.program));
  const yccdOptions = yccdOptionsForPrompt(grade, stage);
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
  // Bước 1: nhận xét (lượt ngắn, không kèm từng câu) + ghép từng nhóm bài — tất cả chạy song song.
  const startedAt = Date.now();
  const overview = { ...(body.facts as Record<string, unknown>) };
  delete overview.baiDaDuyet;
  const [commentRaw, ...mappingRaws] = await Promise.all([
    callWithinTime(() => callGeminiVision(buildParentCommentPrompt(JSON.stringify(overview)), [], getGradingApiKey(), GRADING_MODEL, {
      temperature: 0.4,
      maxOutputTokens: 'model-max',
      timeoutMs: AI_TIMEOUT_MS,
    })),
    ...chunkEvidence(evidence).map(chunk => callWithinTime(() => callGeminiVision(
      buildRequirementMappingPrompt(JSON.stringify(chunk), yccdOptions), [], getGradingApiKey(), GRADING_MODEL, {
        temperature: 0.2,
        maxOutputTokens: 'model-max',
        jsonMode: true,
        timeoutMs: AI_TIMEOUT_MS,
      }))),
  ]);
  if (commentRaw === null || mappingRaws.some(raw => raw === null)) return void res.status(504).json({ error: AI_SLOW_MESSAGE });
  const text = cleanComment(commentRaw);
  const mappings = mappingRaws.map(raw => parseDraftJson(raw as string));
  // Một nhóm hỏng thì thiếu hẳn một phần bằng chứng → báo thử lại, không in báo cáo thiếu mà trông như đủ.
  if (!text || mappings.some(m => m === null)) return void res.status(502).json({ error: 'AI chưa soạn được báo cáo, thử lại.' });
  const merged = { yccd: mappings.flatMap(m => (Array.isArray(m!.yccd) ? m!.yccd : [])) };
  const grouped = mapRequirementQuestions(grade, evidence, merged, stage);
  let requirements = aggregateRequirementLines(grade, evidence, merged, stage);

  // Bước 2: ghi chú cho từng YCCĐ trong phần thời gian còn lại. Hết giờ → vẫn trả các dòng (mức đúng), ghi chú để trống.
  const remainingMs = startedAt + AI_TIMEOUT_MS - Date.now();
  if (grouped.length > 0 && remainingMs > 8000) {
    const groupsJson = JSON.stringify(grouped.map(({ item, questions }, index) => ({
      ma: item.id,
      yeuCau: item.text,
      tiLeDiem: `${Math.round(requirements[index].percent)}%`,
      cau: questions,
    })));
    const notesRaw = await callWithinTime(() => callGeminiVision(buildRequirementNotesPrompt(groupsJson), [], getGradingApiKey(), GRADING_MODEL, {
      temperature: 0.2,
      maxOutputTokens: 'model-max',
      jsonMode: true,
      timeoutMs: remainingMs,
    }), remainingMs);
    if (notesRaw !== null) requirements = applyRequirementNotes(requirements, parseDraftJson(notesRaw));
  }
  res.status(200).json({ text, requirements });
};

export const handleParentReportAction = async (db: Db, body: Body, res: VercelResponse): Promise<boolean> => {
  const action = String(body.action || '');
  if (action === 'parentReportNote') { await handleGetNote(db, body, res); return true; }
  if (action === 'saveParentReportNote') { await handleSaveNote(db, body, res); return true; }
  if (action === 'draftParentReportComment') { await handleDraft(db, body, res); return true; }
  return false;
};
