/**
 * "Điểm mạnh & phần cần rèn" của báo cáo phụ huynh, viết theo YÊU CẦU CẦN ĐẠT (Chương trình GDPT 2018).
 *
 * Bằng chứng là TỪNG CÂU của các bài đã duyệt trong kì (điểm, loại lỗi, giải thích của lượt chấm).
 * AI chỉ làm hai việc: ghép câu → YCCĐ và viết ghi chú bằng thuật ngữ Toán học. MỨC do máy tính từ điểm các câu
 * làm căn cứ — để cùng một bằng chứng luôn ra cùng một mức, và giáo viên kiểm lại được.
 * Module thuần — máy chủ (api/) và trình duyệt dùng chung.
 */
import { yccdById, yccdForGrade, type YccdItem, type YccdStrand } from '../curriculum/yccdToan.js';

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

export interface ParentRequirementLine {
  id: string;
  level: RequirementLevel;
  /** Số câu làm căn cứ. */
  evidence: number;
  /** Tỉ lệ điểm trên các câu căn cứ, 0..100. */
  percent: number;
  /** Chỉ ra chính xác em làm tốt/sai ở đâu, bằng thuật ngữ Toán học; không nhắc số câu. */
  note: string;
}

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
 * Gộp bản ghép của AI thành các dòng báo cáo. Bỏ mọi thứ không kiểm được: id YCCĐ ngoài khối, mã câu không có
 * trong bằng chứng, câu có thang điểm hỏng. YCCĐ không còn câu căn cứ nào thì không thành dòng.
 */
export const aggregateRequirementLines = (
  grade: unknown,
  evidence: readonly EvidenceSubmission[],
  draft: AiRequirementDraft,
): ParentRequirementLine[] => {
  const list = yccdForGrade(grade);
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
    // Cùng một YCCĐ có thể đến từ nhiều lượt ghép (mỗi lượt một nhóm bài) → nối các ghi chú khác nhau.
    const note = cleanNote(row.ghiChu);
    const before = notes.get(id);
    if (note && note !== before) notes.set(id, before ? cleanNote(`${before} ${note}`) : note);
  }
  const lines: ParentRequirementLine[] = [];
  for (const item of list) {
    const codes = byRequirement.get(item.id);
    if (!codes || codes.size === 0) continue;
    let got = 0;
    let max = 0;
    for (const code of codes) {
      const question = questions.get(code)!;
      got += Math.min(question.diem, question.toiDa);
      max += question.toiDa;
    }
    const percent = Math.round((got / max) * 1000) / 10;
    lines.push({ id: item.id, level: levelOf(percent), evidence: codes.size, percent, note: notes.get(item.id) ?? '' });
  }
  return lines;
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
    seen.add(id);
    lines.push({ id, level, evidence, percent, note: cleanNote(row.note) });
  }
  return lines.sort((left, right) => order.get(left.id)! - order.get(right.id)!);
};

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
    kept.splice(1, 0, 'Dành 15–20 phút mỗi tối cho con tự luyện lại đúng những yêu cầu thầy cô đánh dấu “Chưa đạt” hoặc “Đang hình thành” ở mục “Kết quả theo yêu cầu cần đạt”. Phụ huynh không cần dạy, chỉ cần nhắc con làm và tự kiểm tra.');
  }
  return kept;
};

/** Danh sách YCCĐ của khối, định dạng cho prompt: mỗi dòng "id | chủ đề: yêu cầu". */
export const yccdOptionsForPrompt = (grade: unknown): string =>
  yccdForGrade(grade).map(item => `${item.id} | ${item.topic}: ${item.text}`).join('\n');
