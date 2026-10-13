import type { PhotoMark } from './types.js';
import { isBlankAnswer } from './questionRescore.js';

type MarkedQuestion = { status?: unknown; studentAnswer?: unknown; ignoredByTeacherInstruction?: unknown; photoMarks?: unknown; photoMarksCleared?: unknown };

const canMark = (question: MarkedQuestion): boolean => {
  const answer = String(question.studentAnswer ?? '').trim();
  return (question.status === 'incorrect' || question.status === 'partially_correct')
    && question.ignoredByTeacherInstruction !== true && question.photoMarksCleared !== true && !isBlankAnswer(answer)
    && !/^[\s[(]*(?:bỏ trống|để trống|không (?:đọc rõ|làm|trả lời)|chưa (?:làm|trả lời)|unreadable|blank|not attempted)(?:$|[\s\]):,.])/iu.test(answer);
};

/** Optional AI geometry is best-effort; never trust model URLs or coerce coordinates. */
export const sanitizePhotoMarks = (value: unknown, question: MarkedQuestion, imageCount = Infinity): PhotoMark[] => {
  if (!canMark(question) || !Array.isArray(value)) return [];
  return value.filter((raw): raw is PhotoMark => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    const m = raw as PhotoMark;
    return [m.imageIndex, m.x, m.y, m.width, m.height, m.confidence].every(n => typeof n === 'number' && Number.isFinite(n))
      && Number.isInteger(m.imageIndex) && m.imageIndex >= 1 && m.imageIndex <= imageCount
      && m.x >= 0 && m.y >= 0 && m.width > 0 && m.height > 0
      && m.x + m.width <= 1 && m.y + m.height <= 1 && m.confidence >= .85 && m.confidence <= 1;
  }).slice(0, 3).map(({ imageIndex, x, y, width, height, confidence }) => ({ imageIndex, x, y, width, height, confidence }));
};

export const bindQuestionPhotoMarks = <Q extends MarkedQuestion>(question: Q, studentUrls: readonly string[]): Q => {
  const { photoMarks: _marks, ...rest } = question;
  const photoMarks = sanitizePhotoMarks(question.photoMarks, question, studentUrls.length)
    .map(mark => ({ ...mark, imageUrl: studentUrls[mark.imageIndex - 1] }));
  return { ...rest, ...(photoMarks.length ? { photoMarks } : {}) } as Q;
};

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
