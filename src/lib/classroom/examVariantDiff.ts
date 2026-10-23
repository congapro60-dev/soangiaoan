import { QUESTION_LINE, type ExamVariant } from './examVariants';
import { currentSubmissionsForAssignment } from './submissionSelection';
import type { SubmissionDoc } from './types';

/**
 * So từng mã đề giữa bản đã lưu và bản vừa sửa — để gợi ý chấm lại THEO MÃ (không chấm tất cả).
 * Chỉ phần thuần: không gọi mạng, không ghi dữ liệu.
 */
export type VariantChangeKind = 'same' | 'changed' | 'added' | 'removed';

export interface VariantChange {
  code: string;
  kind: VariantChangeKind;
  /** Số câu đổi đáp án / thêm mới / bị bớt (đếm theo nhãn câu). */
  changed: number;
  added: number;
  removed: number;
  sourceChanged: boolean;
  rubricChanged: boolean;
}

const squash = (value: string): string => value.normalize('NFC').replace(/\s+/gu, ' ').trim();

/** Đáp án → Map nhãn câu → nội dung (dòng nối của câu tự luận gộp vào câu đó). */
const answersByLabel = (answerKey: string): Map<string, string> => {
  const entries = new Map<string, string>();
  let label = '';
  for (const raw of answerKey.split(/\r?\n/u)) {
    if (!raw.trim()) continue;
    if (QUESTION_LINE.test(raw) || !label) {
      const cut = raw.indexOf(':');
      const base = squash(cut < 0 ? raw : raw.slice(0, cut)).toLocaleLowerCase('vi-VN');
      label = base;
      for (let n = 2; entries.has(label); n += 1) label = `${base}#${n}`;
      entries.set(label, squash(cut < 0 ? '' : raw.slice(cut + 1)));
    } else {
      entries.set(label, `${entries.get(label)} ${squash(raw)}`.trim());
    }
  }
  return entries;
};

export const diffVariants = (before: readonly ExamVariant[], after: readonly ExamVariant[], rubricChanged = false): VariantChange[] => {
  const old = new Map(before.map(variant => [variant.code.trim(), variant]));
  const next = new Map(after.map(variant => [variant.code.trim(), variant]));
  const none = { changed: 0, added: 0, removed: 0, sourceChanged: false, rubricChanged };
  const rows: VariantChange[] = [];
  for (const [code, variant] of next) {
    const prev = old.get(code);
    if (!prev) {
      rows.push({ code, kind: 'added', ...none, added: answersByLabel(variant.answerKey).size });
      continue;
    }
    const was = answersByLabel(prev.answerKey);
    const now = answersByLabel(variant.answerKey);
    const changed = [...now].filter(([label, value]) => was.has(label) && was.get(label) !== value).length;
    const added = [...now.keys()].filter(label => !was.has(label)).length;
    const removed = [...was.keys()].filter(label => !now.has(label)).length;
    const sourceChanged = squash(prev.sourceText || '') !== squash(variant.sourceText || '');
    const same = changed + added + removed === 0 && !sourceChanged && !rubricChanged;
    rows.push({ code, kind: same ? 'same' : 'changed', changed, added, removed, sourceChanged, rubricChanged });
  }
  for (const [code, variant] of old) {
    if (!next.has(code)) rows.push({ code, kind: 'removed', ...none, removed: answersByLabel(variant.answerKey).size });
  }
  return rows;
};

export const describeChange = (change: VariantChange): string => {
  if (change.kind === 'added') return 'mã mới';
  if (change.kind === 'removed') return 'mã bị bỏ';
  if (change.kind === 'same') return 'không đổi';
  const parts = [
    change.changed ? `đổi ${change.changed} câu đáp án` : '',
    change.added ? `thêm ${change.added} câu` : '',
    change.removed ? `bớt ${change.removed} câu` : '',
    change.sourceChanged ? 'đổi nội dung đề' : '',
    change.rubricChanged ? 'đổi hướng dẫn chấm' : '',
  ].filter(Boolean);
  return parts.join(', ');
};

export interface CodeGraded {
  /** Bài hiện hành đã chấm bằng AI (thầy chưa sửa tay) — chấm lại theo mã được. */
  ai: SubmissionDoc[];
  /** Bài đã chấm nhưng thầy sửa tay — chấm lại loạt luôn bỏ qua. */
  edited: number;
}

export const gradedByCode = (submissions: readonly SubmissionDoc[], code: string): CodeGraded => {
  const graded = currentSubmissionsForAssignment(submissions)
    .filter(item => item.examCode === code && item.status === 'graded' && Boolean(item.grade));
  const ai = graded.filter(item => item.grade?.editedByTeacher !== true);
  return { ai, edited: graded.length - ai.length };
};

/** Chạy AI lần lượt từng mã; mã lỗi không làm hỏng mã sau, mỗi lỗi thành một câu sạch có tên mã. */
export const solveEach = async (
  codes: readonly string[],
  solveOne: (code: string) => Promise<void>,
  onProgress?: (code: string, index: number, total: number) => void,
): Promise<{ failed: string[]; errors: string[] }> => {
  const failed: string[] = [];
  const errors: string[] = [];
  for (let index = 0; index < codes.length; index += 1) {
    onProgress?.(codes[index], index, codes.length);
    try {
      await solveOne(codes[index]);
    } catch (reason) {
      failed.push(codes[index]);
      errors.push(aiErrorText(reason, codes[index]));
    }
  }
  return { failed, errors };
};

/** Lỗi AI → một câu tiếng Việt sạch, không lộ object/stack. */
export const aiErrorText = (reason: unknown, code?: string): string => {
  const raw = reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : '';
  const text = raw.trim().split('\n')[0].slice(0, 200) || 'AI chưa trả lời được. Thử lại sau ít phút.';
  return code ? `Mã ${code}: ${text}` : text;
};
