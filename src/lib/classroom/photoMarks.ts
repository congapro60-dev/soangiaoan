import type { PhotoMark, PhotoStep } from './types.js';
import { isBlankAnswer } from './questionRescore.js';

type MarkedQuestion = { status?: unknown; studentAnswer?: unknown; ignoredByTeacherInstruction?: unknown; photoMarks?: unknown; photoMarksCleared?: unknown; readingRegions?: unknown; photoSteps?: unknown };

const canMark = (question: MarkedQuestion): boolean => {
  const answer = String(question.studentAnswer ?? '').trim();
  return ['correct', 'incorrect', 'partially_correct'].includes(String(question.status))
    && question.ignoredByTeacherInstruction !== true && question.photoMarksCleared !== true && !isBlankAnswer(answer)
    && !/^[\s[(]*(?:bỏ trống|để trống|không (?:đọc rõ|làm|trả lời)|chưa (?:làm|trả lời)|unreadable|blank|not attempted)(?:$|[\s\]):,.])/iu.test(answer);
};

/** Optional AI geometry is best-effort; never trust model URLs or coerce coordinates. */
export const sanitizePhotoMarks = (value: unknown, question: MarkedQuestion, imageCount = Infinity): PhotoMark[] => {
  if (!canMark(question)) return [];
  return sanitizeGeometry(value, imageCount);
};

const sanitizeGeometry = (value: unknown, imageCount: number): PhotoMark[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((raw): raw is PhotoMark => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    const m = raw as PhotoMark;
    return [m.imageIndex, m.x, m.y, m.width, m.height, m.confidence].every(n => typeof n === 'number' && Number.isFinite(n))
      && Number.isInteger(m.imageIndex) && m.imageIndex >= 1 && m.imageIndex <= imageCount
      && m.x >= 0 && m.y >= 0 && m.width > 0 && m.height > 0
      && m.x + m.width <= 1 && m.y + m.height <= 1 && m.confidence >= .85 && m.confidence <= 1;
  }).slice(0, 3).map(({ imageIndex, x, y, width, height, confidence }) => ({ imageIndex, x, y, width, height, confidence }));
};

const VERDICTS = new Set(['correct', 'partial', 'wrong']);
const shortText = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Bước bút đỏ của câu tự luận: 2..8 bước, mỗi bước Đ/S + điểm ≥ 0; vị trí dòng tuỳ chọn, qua cùng luật hình học với photoMarks. */
export const sanitizePhotoSteps = (value: unknown, question: MarkedQuestion, imageCount = Infinity): PhotoStep[] => {
  if (!canMark(question) || !Array.isArray(value)) return [];
  const steps = value.slice(0, 8).flatMap((raw): PhotoStep[] => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
    const step = raw as Record<string, unknown>;
    const text = shortText(step.text, 120), note = shortText(step.note, 160);
    const score = Number(step.score), maxScore = Number(step.maxScore);
    if (!text || !VERDICTS.has(String(step.verdict)) || !Number.isFinite(score) || !Number.isFinite(maxScore) || score < 0 || maxScore < 0 || score > maxScore) return [];
    const mark = sanitizeGeometry([step.mark], imageCount)[0];
    const imageUrl = step.mark && typeof step.mark === 'object' ? (step.mark as PhotoMark).imageUrl : undefined;
    return [{ text, verdict: step.verdict as PhotoStep['verdict'], score, maxScore, ...(note ? { note } : {}), ...(mark ? { mark: typeof imageUrl === 'string' ? { ...mark, imageUrl } : mark } : {}) }];
  });
  return steps.length >= 2 ? steps : [];
};

/** Bước chỉ hiện khi tổng điểm/thang các bước khớp đúng điểm câu HIỆN TẠI — GV sửa điểm câu thì bước cũ tự ẩn. */
export const validPhotoSteps = (question: { score: number; maxScore: number; photoSteps?: PhotoStep[] }): PhotoStep[] => {
  const steps = Array.isArray(question.photoSteps) ? question.photoSteps : [];
  const sum = (key: 'score' | 'maxScore') => steps.reduce((total, step) => total + step[key], 0);
  return steps.length >= 2 && Math.abs(sum('score') - question.score) < 0.001 && Math.abs(sum('maxScore') - question.maxScore) < 0.001 ? steps : [];
};

export const bindQuestionPhotoMarks = <Q extends MarkedQuestion>(question: Q, studentUrls: readonly string[]): Q => {
  const { photoMarks: _marks, readingRegions: _regions, photoSteps: _steps, ...rest } = question;
  const photoMarks = sanitizePhotoMarks(question.photoMarks, question, studentUrls.length)
    .map(mark => ({ ...mark, imageUrl: studentUrls[mark.imageIndex - 1] }));
  const readingRegions = sanitizeReadingRegions(question.readingRegions, question, studentUrls.length)
    .map(mark => ({ ...mark, imageUrl: studentUrls[mark.imageIndex - 1] }));
  const photoSteps = sanitizePhotoSteps(stripUrls(question.photoSteps), question, studentUrls.length)
    .map(step => (step.mark ? { ...step, mark: { ...step.mark, imageUrl: studentUrls[step.mark.imageIndex - 1] } } : step));
  return { ...rest, ...(photoMarks.length ? { photoMarks } : {}), ...(readingRegions.length ? { readingRegions } : {}), ...(photoSteps.length ? { photoSteps } : {}) } as Q;
};

/** URL do AI tự viết không bao giờ được tin: bỏ trước khi máy chủ gắn URL theo imageIndex. */
const stripUrls = (value: unknown): unknown => (Array.isArray(value)
  ? value.map(step => (step && typeof step === 'object' && (step as PhotoStep).mark ? { ...step, mark: { ...(step as PhotoStep).mark, imageUrl: undefined } } : step))
  : value);

/** Chỉ vị trí dòng có URL thuộc bài này mới rời máy chủ; bước không có vị trí vẫn giữ (hiện trong danh sách). */
export const projectPhotoSteps = (question: MarkedQuestion, allowedUrls: readonly string[]): PhotoStep[] =>
  sanitizePhotoSteps(question.photoSteps, question).map(step => {
    if (!step.mark) return step;
    const { mark, ...rest } = step;
    return mark.imageUrl && allowedUrls.includes(mark.imageUrl) ? step : rest;
  });

/** Only server-bound URLs belonging to this submission may leave the server. */
export const projectPhotoMarks = (question: MarkedQuestion, allowedUrls: readonly string[]): PhotoMark[] => {
  if (!Array.isArray(question.photoMarks)) return [];
  return question.photoMarks.flatMap(raw => {
    const marks = sanitizePhotoMarks([raw], question);
    const imageUrl = raw && typeof raw === 'object' ? (raw as PhotoMark).imageUrl : undefined;
    return marks.length && typeof imageUrl === 'string' && allowedUrls.includes(imageUrl)
      ? [{ ...marks[0], imageUrl }] : [];
  }).slice(0, 3);
};

/** Reading location does not assert the answer is correct or confidently transcribed. */
export const sanitizeReadingRegions = (value: unknown, question: MarkedQuestion, imageCount = Infinity): PhotoMark[] => {
  if (question.ignoredByTeacherInstruction === true || question.status === 'not_attempted'
    || isBlankAnswer(String(question.studentAnswer ?? ''))) return [];
  return sanitizeGeometry(value, imageCount);
};

export const projectReadingRegions = (question: MarkedQuestion, allowedUrls: readonly string[]): PhotoMark[] => {
  if (!Array.isArray(question.readingRegions)) return [];
  return question.readingRegions.flatMap(raw => {
    const marks = sanitizeReadingRegions([raw], question);
    const imageUrl = raw && typeof raw === 'object' ? (raw as PhotoMark).imageUrl : undefined;
    return marks.length && typeof imageUrl === 'string' && allowedUrls.includes(imageUrl)
      ? [{ ...marks[0], imageUrl }] : [];
  }).slice(0, 3);
};
