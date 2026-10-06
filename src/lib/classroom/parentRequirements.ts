/**
 * "Điểm mạnh & phần cần rèn" của báo cáo phụ huynh, viết theo YÊU CẦU CẦN ĐẠT (Chương trình GDPT 2018).
 *
 * Bằng chứng là TỪNG CÂU của các bài đã duyệt trong kì (điểm, loại lỗi, giải thích của lượt chấm).
 * AI chỉ làm hai việc: ghép câu → YCCĐ và viết ghi chú bằng thuật ngữ Toán học. MỨC do máy tính từ điểm các câu
 * làm căn cứ — để cùng một bằng chứng luôn ra cùng một mức, và giáo viên kiểm lại được.
 * Module thuần — máy chủ (api/) và trình duyệt dùng chung.
 */
import { yccdById, yccdForGrade, type YccdItem, type YccdStrand } from '../curriculum/yccdToan.js';
import { inStage, termsOfSgk, type ReportStage } from './reportStage.js';

export type RequirementLevel = 'vung' | 'dang' | 'chua';

export const REQUIREMENT_LEVELS: readonly { level: RequirementLevel; label: string }[] = [
  { level: 'vung', label: 'Vững' },
  { level: 'dang', label: 'Đang hình thành' },
  { level: 'chua', label: 'Chưa đạt' },
];

export const requirementLevelLabel = (level: RequirementLevel): string =>
  REQUIREMENT_LEVELS.find(item => item.level === level)?.label ?? level;

/** Một câu làm bằng chứng. `ma` dạng "b2q3" (bài 2, câu 3); bài không có chi tiết câu thì `ma` = mã bài. */
export interface EvidenceQuestion {
  ma: string;
  diem: number;
  toiDa: number;
  ketQua: string;
  loi?: string;
  giaiThich?: string;
  dapAn?: string;
  /** Trích ngắn bài làm của em — để biết câu làm ĐÚNG kiểm tra gì (giải thích của câu đúng thường rất ngắn). */
  baiLam?: string;
}

export interface EvidenceSubmission {
  ma: string;
  ten: string;
  ngay: string;
  cau: EvidenceQuestion[];
}

/** Một câu làm căn cứ của dòng YCCĐ — giữ lại để gom theo bài SGK mà không đếm trùng câu ghép vào nhiều yêu cầu. */
export interface RequirementQuestionRef {
  /** Mã câu của lượt soạn báo cáo ("b2q3"); chỉ có nghĩa trong cùng một bản ghi. */
  code: string;
  score: number;
  max: number;
}

export interface ParentRequirementLine {
  id: string;
  level: RequirementLevel;
  /** Số câu làm căn cứ. */
  evidence: number;
  /** Tỉ lệ điểm trên các câu căn cứ, 0..100. */
  percent: number;
  /** Chỉ ra chính xác em làm tốt/sai ở đâu, bằng thuật ngữ Toán học; không nhắc số câu. */
  note: string;
  /** Các câu căn cứ. Bản ghi soạn trước 06/10/2026 không có — khi đó số câu theo bài chỉ ước lượng được. */
  questions?: RequirementQuestionRef[];
}

/** Một yêu cầu (hoặc một bài SGK) dựa trên ít hơn ngần này câu thì không gắn mức — ghi "Chưa đủ căn cứ". */
export const MIN_REQUIREMENT_EVIDENCE = 3;

/**
 * Kết quả AI: mỗi YCCĐ một mục, câu căn cứ và ghi chú đi CÙNG nhau — để ghi chú viết đúng theo kết quả chính
 * những câu đó (tách rời hai danh sách thì AI hay khen một yêu cầu mà các câu căn cứ đa số sai).
 */
export interface AiRequirementDraft {
  yccd?: unknown;
}

export const MAX_REQUIREMENT_NOTE_CHARS = 300;

export const levelOf = (percent: number): RequirementLevel => (percent >= 80 ? 'vung' : percent >= 50 ? 'dang' : 'chua');

const cleanNote = (value: unknown): string => (
  typeof value === 'string'
    ? value.replace(/\*\*|__|`/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_REQUIREMENT_NOTE_CHARS)
    : ''
);

const asArray = (value: unknown): Record<string, unknown>[] => (
  Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object') : []
);

/**
 * Câu căn cứ của từng YCCĐ theo bản ghép của AI. Bỏ mọi thứ không kiểm được: id YCCĐ ngoài khối, mã câu không có
 * trong bằng chứng, câu có thang điểm hỏng. Cùng một YCCĐ đến từ nhiều lượt ghép (mỗi lượt một nhóm bài) thì gộp câu.
 * Trả theo thứ tự Chương trình; YCCĐ không còn câu căn cứ nào thì bỏ.
 */
export const mapRequirementQuestions = (
  grade: unknown,
  evidence: readonly EvidenceSubmission[],
  draft: AiRequirementDraft,
  stage?: ReportStage | null,
): { item: YccdItem; questions: EvidenceQuestion[]; note: string }[] => {
  const list = yccdInStage(grade, stage);
  const known = new Set(list.map(item => item.id));
  const questions = new Map<string, EvidenceQuestion>();
  for (const submission of evidence) {
    for (const question of submission.cau) {
      if (Number.isFinite(question.diem) && Number.isFinite(question.toiDa) && question.toiDa > 0 && question.diem >= 0) {
        questions.set(question.ma, question);
      }
    }
  }
  const byRequirement = new Map<string, Set<string>>();
  const notes = new Map<string, string>();
  for (const row of asArray(draft.yccd)) {
    const id = String(row.ma ?? '').trim();
    if (!known.has(id)) continue;
    const codes = byRequirement.get(id) ?? new Set<string>();
    for (const code of Array.isArray(row.cau) ? row.cau : []) {
      const ma = String(code ?? '').trim();
      if (questions.has(ma)) codes.add(ma);
    }
    byRequirement.set(id, codes);
    const note = cleanNote(row.ghiChu);
    if (note && !notes.has(id)) notes.set(id, note);
  }
  return list.flatMap(item => {
    const codes = byRequirement.get(item.id);
    return codes && codes.size > 0 ? [{ item, questions: [...codes].map(code => questions.get(code)!), note: notes.get(item.id) ?? '' }] : [];
  });
};

/** Gộp bản ghép của AI thành các dòng báo cáo; mức tính từ điểm các câu căn cứ. */
export const aggregateRequirementLines = (
  grade: unknown,
  evidence: readonly EvidenceSubmission[],
  draft: AiRequirementDraft,
  stage?: ReportStage | null,
): ParentRequirementLine[] => mapRequirementQuestions(grade, evidence, draft, stage).map(({ item, questions, note }) => {
  let got = 0;
  let max = 0;
  for (const question of questions) {
    got += Math.min(question.diem, question.toiDa);
    max += question.toiDa;
  }
  const percent = Math.round((got / max) * 1000) / 10;
  return {
    id: item.id, level: levelOf(percent), evidence: questions.length, percent, note,
    questions: questions.map(question => ({ code: question.ma, score: Math.min(question.diem, question.toiDa), max: question.toiDa })),
  };
});

/** Gắn ghi chú AI viết ở bước sau (`{"ghiChu": [{"ma", "ghiChu"}]}`) vào các dòng; mã lạ bị bỏ. */
export const applyRequirementNotes = (lines: readonly ParentRequirementLine[], raw: unknown): ParentRequirementLine[] => {
  const notes = new Map<string, string>();
  const rows = raw && typeof raw === 'object' ? (raw as Record<string, unknown>).ghiChu : null;
  for (const row of asArray(rows)) {
    const note = cleanNote(row.ghiChu);
    if (note) notes.set(String(row.ma ?? '').trim(), note);
  }
  return lines.map(line => ({ ...line, note: notes.get(line.id) ?? line.note }));
};

/** Kiểm các dòng giáo viên đã sửa trước khi lưu: đúng khối, đúng mức, số hợp lệ, ghi chú không quá dài. */
export const sanitizeRequirementLines = (grade: unknown, raw: unknown): ParentRequirementLine[] => {
  const order = new Map(yccdForGrade(grade).map((item, index) => [item.id, index]));
  const seen = new Set<string>();
  const lines: ParentRequirementLine[] = [];
  for (const row of asArray(raw)) {
    const id = String(row.id ?? '');
    const level = String(row.level ?? '') as RequirementLevel;
    if (!order.has(id) || seen.has(id) || !REQUIREMENT_LEVELS.some(item => item.level === level)) continue;
    const evidence = Math.max(0, Math.min(500, Math.round(Number(row.evidence) || 0)));
    const percent = Math.max(0, Math.min(100, Number(row.percent) || 0));
    const questions = sanitizeQuestionRefs(row.questions);
    seen.add(id);
    lines.push({ id, level, evidence, percent, note: cleanNote(row.note), ...(questions ? { questions } : {}) });
  }
  return lines.sort((left, right) => order.get(left.id)! - order.get(right.id)!);
};

const MAX_LINE_QUESTIONS = 120;
const QUESTION_CODE = /^b\d{1,3}(?:q\d{1,3})?$/;

/** Câu căn cứ đi qua máy chủ: mã đúng dạng, không trùng, điểm trong 0..tối đa. Không còn câu nào hợp lệ → bỏ hẳn trường. */
const sanitizeQuestionRefs = (raw: unknown): RequirementQuestionRef[] | undefined => {
  const seen = new Set<string>();
  const refs: RequirementQuestionRef[] = [];
  for (const row of asArray(raw)) {
    const code = String(row.code ?? '');
    const max = Number(row.max);
    const score = Number(row.score);
    if (!QUESTION_CODE.test(code) || seen.has(code) || !Number.isFinite(max) || max <= 0 || max > 1000 || !Number.isFinite(score)) continue;
    seen.add(code);
    refs.push({ code, score: Math.max(0, Math.min(max, score)), max });
    if (refs.length >= MAX_LINE_QUESTIONS) break;
  }
  return refs.length > 0 ? refs : undefined;
};

/** Một bài SGK trong "Bản đồ theo bài SGK" của báo cáo phụ huynh. */
export interface LessonSummary {
  /** Nhãn bài như cột `sgk` của YCCĐ: "Bài 2", "Bài 3–4", "Chương V". */
  lesson: string;
  /** Tên chủ đề của bài (theo mục YCCĐ đầu tiên của bài trong Chương trình). */
  title: string;
  /** null = chưa đủ căn cứ để gắn mức. */
  level: RequirementLevel | null;
  /** Tỉ lệ điểm, 0..100. */
  percent: number;
  /** Số câu căn cứ, đã bỏ câu trùng; null khi bản ghi cũ không lưu danh sách câu. */
  questions: number | null;
  /** Ghi chú của dòng YCCĐ tiêu biểu — xem `representativeNote`. */
  note: string;
}

const lessonNumbers = (lesson: string): number[] => [...lesson.matchAll(/\d+/g)].map(match => Number(match[0]));

/**
 * Gom các dòng YCCĐ (đã qua tay giáo viên — dòng nào bị bỏ thì không tính) theo bài SGK.
 *
 * Mức của bài TÍNH TỪ ĐIỂM như mức từng dòng: cùng bằng chứng luôn ra cùng mức, khớp chú thích in trên báo cáo.
 * Có danh sách câu thì cộng điểm trên các câu KHÁC NHAU (một câu ghép vào hai yêu cầu cùng bài chỉ tính một lần).
 * Bản ghi cũ không có danh sách câu: tỉ lệ = trung bình các dòng theo số câu, còn "đủ căn cứ" xét theo dòng nhiều câu
 * nhất — con số chắc chắn không vượt số câu thật, để không gắn mức cho bài thực ra mới có một hai câu.
 * Xếp theo thứ tự bài trong sách; bài gộp ("Bài 1–2") đứng sau bài cuối của nó.
 */
export const buildLessonMap = (lines: readonly ParentRequirementLine[]): LessonSummary[] => {
  const groups = new Map<string, { items: YccdItem[]; lines: ParentRequirementLine[] }>();
  for (const line of lines) {
    const item = yccdById(line.id);
    if (!item) continue;
    const group = groups.get(item.sgk) ?? { items: [], lines: [] };
    group.items.push(item);
    group.lines.push(line);
    groups.set(item.sgk, group);
  }
  const lessons: (LessonSummary & { sortMax: number; sortMin: number })[] = [];
  for (const [lesson, group] of groups) {
    const curriculum = yccdForGrade(group.items[0].id);
    const title = curriculum.find(item => item.sgk === lesson)?.topic ?? group.items[0].topic;
    let percent: number;
    let questions: number | null;
    if (group.lines.every(line => line.questions && line.questions.length > 0)) {
      const unique = new Map<string, RequirementQuestionRef>();
      for (const line of group.lines) for (const ref of line.questions!) unique.set(ref.code, ref);
      const got = [...unique.values()].reduce((sum, ref) => sum + ref.score, 0);
      const max = [...unique.values()].reduce((sum, ref) => sum + ref.max, 0);
      percent = Math.round((got / max) * 1000) / 10;
      questions = unique.size;
    } else {
      const weight = group.lines.reduce((sum, line) => sum + line.evidence, 0);
      percent = weight > 0
        ? Math.round((group.lines.reduce((sum, line) => sum + line.percent * line.evidence, 0) / weight) * 10) / 10
        : Math.round((group.lines.reduce((sum, line) => sum + line.percent, 0) / group.lines.length) * 10) / 10;
      questions = null;
    }
    const enough = (questions ?? Math.max(...group.lines.map(line => line.evidence))) >= MIN_REQUIREMENT_EVIDENCE;
    const level = enough ? levelOf(percent) : null;
    const note = representativeNote(group.lines, level);
    // Bài không mang số ("Chương V") đứng ngay sau bài có số gần nhất phía trước nó trong Chương trình.
    let numbers = lessonNumbers(lesson);
    if (numbers.length === 0) {
      const index = curriculum.findIndex(item => item.sgk === lesson);
      const before = curriculum.slice(0, Math.max(0, index)).reverse().find(item => lessonNumbers(item.sgk).length > 0);
      const anchor = before ? Math.max(...lessonNumbers(before.sgk)) + 0.5 : Number.MAX_SAFE_INTEGER;
      numbers = [anchor];
    }
    lessons.push({ lesson, title, level, percent, questions, note, sortMax: Math.max(...numbers), sortMin: Math.min(...numbers) });
  }
  return lessons
    .sort((left, right) => left.sortMax - right.sortMax || right.sortMin - left.sortMin)
    .map(({ sortMax: _max, sortMin: _min, ...lesson }) => lesson);
};

/**
 * Ghi chú in trên thẻ bài. Bài Vững: dòng nhiều câu nhất (ý chính của bài, không phải một ý phụ đạt 100%).
 * Bài chưa vững: dòng tỉ lệ thấp nhất, ưu tiên dòng đủ căn cứ — để phụ huynh thấy đúng lỗi đang kéo điểm.
 */
const representativeNote = (lines: readonly ParentRequirementLine[], level: RequirementLevel | null): string => {
  const withNotes = lines.filter(line => line.note);
  if (level === 'vung') {
    return [...withNotes].sort((left, right) => right.evidence - left.evidence || right.percent - left.percent)[0]?.note ?? '';
  }
  const enough = withNotes.filter(line => line.evidence >= MIN_REQUIREMENT_EVIDENCE);
  return [...(enough.length > 0 ? enough : withNotes)].sort((left, right) => left.percent - right.percent)[0]?.note ?? '';
};

/** "Ưu tiên ôn trước": các bài Chưa đạt rồi Đang hình thành, tỉ lệ thấp trước; tối đa `limit` bài. */
export const lessonPriorities = (lessons: readonly LessonSummary[], limit = 3): LessonSummary[] => lessons
  .filter(lesson => lesson.level === 'chua' || lesson.level === 'dang')
  .sort((left, right) => (left.level === right.level ? 0 : left.level === 'chua' ? -1 : 1) || left.percent - right.percent)
  .slice(0, limit);

export interface RequirementGroup {
  strand: YccdStrand;
  topic: string;
  rows: { line: ParentRequirementLine; item: YccdItem }[];
}

/** Nhóm theo chủ đề, giữ thứ tự Chương trình (mã YCCĐ đánh số theo thứ tự đó) — in và hiện màn hình giống nhau. */
export const groupRequirementLines = (lines: readonly ParentRequirementLine[]): RequirementGroup[] => {
  const groups: RequirementGroup[] = [];
  for (const line of [...lines].sort((left, right) => left.id.localeCompare(right.id))) {
    const item = yccdById(line.id);
    if (!item) continue;
    const last = groups.at(-1);
    if (last && last.topic === item.topic && last.strand === item.strand) last.rows.push({ line, item });
    else groups.push({ strand: item.strand, topic: item.topic, rows: [{ line, item }] });
  }
  return groups;
};

/**
 * Gợi ý "Phụ huynh có thể làm ở nhà" khi báo cáo dùng YCCĐ: bỏ câu trỏ tới mục "Cần rèn thêm" (không còn in),
 * thay bằng câu trỏ tới các dòng Chưa đạt / Đang hình thành. Không có dòng YCCĐ thì giữ nguyên.
 */
export const parentActionsForRequirements = (actions: readonly string[], lines: readonly ParentRequirementLine[] | null | undefined): string[] => {
  if (!lines || lines.length === 0) return [...actions];
  const kept = actions.filter(action => !action.includes('“Cần rèn thêm”'));
  if (lines.some(line => line.level !== 'vung')) {
    // Nhãn trong ngoặc dùng dấu cách không ngắt (\u00a0): xuống dòng giữa “Chưa / đạt” là khó đọc.
    kept.splice(1, 0, 'Dành 15–20 phút mỗi tối cho con tự luyện lại đúng những bài thầy cô đánh dấu “Chưa\u00a0đạt” hoặc “Đang\u00a0hình\u00a0thành” ở mục “Bản\u00a0đồ\u00a0theo\u00a0bài\u00a0SGK”. Phụ huynh không cần dạy, chỉ cần nhắc con làm và tự kiểm tra.');
  }
  return kept;
};

/** Danh sách YCCĐ của khối, định dạng cho prompt: mỗi dòng "id | chủ đề: yêu cầu". */
const gradeNumber = (grade: unknown): number => Number(String(grade ?? '').match(/\d+/)?.[0]);

/** YCCĐ của khối thuộc giai đoạn `stage` (học kì + chương trình); `stage` null = không lọc. Xem `reportStage.ts`. */
export const yccdInStage = (grade: unknown, stage?: ReportStage | null): readonly YccdItem[] => {
  const list = yccdForGrade(grade);
  return stage ? list.filter(item => inStage(termsOfSgk(gradeNumber(grade), item.sgk, stage.program), stage)) : list;
};

/** Bỏ các dòng yêu cầu cần đạt của giai đoạn khác (vd Hàm số bậc hai trong báo cáo tháng 9 lớp 10). */
export const requirementsInStage = (lines: readonly ParentRequirementLine[], grade: unknown, stage?: ReportStage | null): ParentRequirementLine[] => {
  if (!stage) return [...lines];
  return lines.filter(line => {
    const item = yccdById(line.id);
    return !item || inStage(termsOfSgk(gradeNumber(grade), item.sgk, stage.program), stage);
  });
};

export const yccdOptionsForPrompt = (grade: unknown, stage?: ReportStage | null): string =>
  yccdInStage(grade, stage).map(item => `${item.id} | ${item.topic}: ${item.text}`).join('\n');
