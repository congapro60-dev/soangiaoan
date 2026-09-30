/**
 * AI soạn NHÁP hồ sơ năng lực cho GV: mức chốt + ý kiến GV cho mọi năng lực, và gợi ý kế hoạch cho
 * ô HS còn trống. GV soát/sửa rồi mới lưu. THUẦN: dựng prompt + đọc kết quả + gộp nháp.
 */
import { COMPETENCY_LEVELS, type Competency, type CompetencyGrade, type CompetencyLevel } from './framework.js';
import { levelDescriptions } from './levelDescriptions.js';
import {
  PORTFOLIO_PROGRESS,
  STUDENT_FIELDS,
  sanitizePortfolioPatch,
  type PortfolioEntry,
} from './studentPortfolio.js';

export interface DraftRow {
  competency: Competency;
  /** Mức app đề xuất từ bài đã duyệt (null = chưa có bài). */
  suggestedLevel: CompetencyLevel | null;
  scoreOutOf10?: number;
  evidence: string[];
  entry: PortfolioEntry;
}

export const buildPortfolioDraftPrompt = (input: {
  grade: CompetencyGrade;
  studentName: string;
  rows: readonly DraftRow[];
  months: readonly string[];
}): string => {
  const rows = input.rows.map(row => {
    const desc = levelDescriptions(row.competency);
    return [
      `### ${row.competency.id} — ${row.competency.topic}: ${row.competency.competency}`,
      desc ? `Mô tả mức: ${COMPETENCY_LEVELS.map((l, i) => `${l} = ${desc[i]}`).join(' | ')}` : '',
      `Mức app tính từ bài đã duyệt: ${row.suggestedLevel ?? 'chưa có bài'}${row.scoreOutOf10 !== undefined ? ` (điểm đại diện ${row.scoreOutOf10}/10)` : ''}`,
      row.evidence.length ? `Bài minh chứng: ${row.evidence.join('; ')}` : '',
      `HS đã điền: ${JSON.stringify(row.entry)}`,
    ].filter(Boolean).join('\n');
  }).join('\n\n');
  return [
    `Bạn là giáo viên Toán lớp ${input.grade} hướng dẫn học sinh ${input.studentName} làm hồ sơ năng lực.`,
    'Với MỖI năng lực dưới đây, soạn NHÁP để giáo viên soát lại:',
    `- teacherLevel: một trong ${COMPETENCY_LEVELS.map(l => `"${l}"`).join(', ')}. Bám mức app tính từ bài đã duyệt; chưa có bài thì null.`,
    '- teacherComment: ý kiến của giáo viên hướng dẫn, 1–2 câu, cụ thể, động viên, nêu việc cần làm tiếp; so sánh với mức HS tự đánh giá nếu có.',
    '- Chỉ với ô HS CÒN TRỐNG: goal (mục tiêu SMART nâng lên mức kế tiếp, có hạn), plan (hành động cụ thể hằng tuần),',
    `  difficulty (khó khăn dễ gặp ở chủ đề này), timeframe (một trong: ${input.months.join(', ')}), progress (một trong: ${PORTFOLIO_PROGRESS.join(', ')}).`,
    'Viết tiếng Việt, xưng "em" với học sinh. Không bịa bài hay điểm không có ở trên.',
    '',
    'Trả về DUY NHẤT một JSON, khoá là id năng lực: {"g10-ham-so-bac-hai": {"teacherLevel": "Tốt", "teacherComment": "...", "goal": "..."}}',
    '',
    rows,
  ].join('\n');
};

/** Đọc JSON AI trả; lọc như GV gửi lên (đúng khối, đúng ô, giá trị hợp lệ). */
export const parsePortfolioDraft = (text: string, grade: CompetencyGrade): Record<string, PortfolioEntry> => {
  const json = text.match(/\{[\s\S]*\}/);
  if (!json) return {};
  try {
    return sanitizePortfolioPatch(JSON.parse(json[0]), grade, 'teacher');
  } catch {
    return {};
  }
};

const isBlank = (value: unknown): boolean => value === undefined || value === null || (typeof value === 'string' && !value.trim());

/** Gộp nháp AI: mức/ý kiến GV luôn lấy nháp; ô của HS chỉ điền khi đang trống (không đè chữ HS viết). */
export const applyPortfolioDraft = (
  current: Record<string, PortfolioEntry>,
  draft: Record<string, PortfolioEntry>,
): Record<string, PortfolioEntry> => {
  const next: Record<string, PortfolioEntry> = { ...current };
  for (const [id, suggestion] of Object.entries(draft)) {
    const entry: PortfolioEntry = { ...(next[id] ?? {}) };
    if (suggestion.teacherLevel !== undefined) entry.teacherLevel = suggestion.teacherLevel;
    if (suggestion.teacherComment !== undefined) entry.teacherComment = suggestion.teacherComment;
    for (const field of STUDENT_FIELDS) {
      if (field === 'selfLevel') continue;
      const value = suggestion[field];
      if (value !== undefined && isBlank(entry[field])) (entry as Record<string, unknown>)[field] = value;
    }
    next[id] = entry;
  }
  return next;
};
