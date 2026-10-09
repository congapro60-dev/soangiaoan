// Scoring for exams (bài kiểm tra). Pure functions, no I/O.
//
// Question types:
//   mc     one letter ("A".."D")                        all or nothing
//   tf     one true/false per statement (a..d)          partial credit, THPT 2025 scale
//   short  a number or a short text                     all or nothing, several accepted spellings
//   essay  written on paper and photographed            scored by the teacher
//
// THPT 2025 "đúng/sai" scale: 1 correct statement = 10 % of the question's points, 2 = 25 %, 3 = 50 %, 4 = 100 %.

export const QUESTION_TYPES = Object.freeze(['mc', 'tf', 'short', 'essay']);

export const TF_RATIO = Object.freeze([0, 0.1, 0.25, 0.5, 1]);

const round2 = (value) => Math.round(value * 100) / 100;

export function tfRatio(correct, total) {
  if (total === 4) return TF_RATIO[Math.max(0, Math.min(4, correct))];
  return total > 0 ? correct / total : 0;
}

/** "1,5" "−3" " 3 / 2 " -> a number, or null when it is not a number. */
export function parseNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.normalize('NFC').trim().replace(/[−–—]/g, '-').replace(/\s+/g, '');
  if (/^[+-]?\d+\/[+-]?\d+$/.test(text)) {
    const [a, b] = text.split('/').map(Number);
    return b === 0 ? null : a / b;
  }
  const dot = text.replace(/^([+-]?\d+),(\d+)$/, '$1.$2');
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(dot)) return Number(dot);
  return null;
}

const normalizeText = (value) => String(value ?? '').normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');

export function shortMatches(answer, accepted) {
  const list = Array.isArray(accepted) ? accepted : [];
  const given = parseNumber(answer);
  for (const item of list) {
    const want = parseNumber(item);
    if (given !== null && want !== null) {
      if (Math.abs(given - want) <= 1e-9 * Math.max(1, Math.abs(want))) return true;
    } else if (given === null && want === null && normalizeText(answer) !== '' && normalizeText(answer) === normalizeText(item)) return true;
  }
  return false;
}

/** Normalizes any stored/submitted answer to the shape for the question's type, or null when it is empty. */
export function cleanAnswer(question, raw) {
  if (raw === null || raw === undefined) return null;
  if (question.type === 'mc') {
    const letter = String(raw).trim().toUpperCase();
    const options = question.options?.length ? question.options : ['A', 'B', 'C', 'D'];
    return options.includes(letter) ? letter : null;
  }
  if (question.type === 'tf') {
    const count = question.statements?.length || 4;
    if (!Array.isArray(raw)) return null;
    const out = Array.from({ length: count }, (_, i) => (raw[i] === true ? true : raw[i] === false ? false : null));
    return out.every((v) => v === null) ? null : out;
  }
  if (question.type === 'short') {
    const text = String(typeof raw === 'object' ? raw.text ?? '' : raw).slice(0, 80).trim();
    return text === '' ? null : text;
  }
  if (question.type === 'essay') {
    const text = String(typeof raw === 'object' ? raw.text ?? '' : raw).slice(0, 4000);
    return text.trim() === '' ? null : { text };
  }
  return null;
}

/** True when the pupil has put anything at all into the answer. */
export function isAnswered(question, raw) {
  return cleanAnswer(question, raw) !== null;
}

/**
 * @returns {{ points: number, max: number, pending: boolean, correct: boolean|null, detail?: object }}
 * `pending` is true for an essay the teacher has not scored yet.
 */
export function scoreQuestion(question, raw, manualScore = null) {
  const max = Number(question.points) || 0;
  const answer = cleanAnswer(question, raw);
  if (question.type === 'mc') {
    const ok = answer !== null && answer === question.key;
    return { points: ok ? max : 0, max, pending: false, correct: answer === null ? null : ok };
  }
  if (question.type === 'tf') {
    const key = Array.isArray(question.key) ? question.key : [];
    const total = question.statements?.length || key.length || 4;
    let correct = 0;
    const marks = [];
    for (let i = 0; i < total; i++) {
      const ok = answer !== null && answer[i] !== null && answer[i] === key[i];
      marks.push(answer === null || answer[i] === null ? null : ok);
      if (ok) correct++;
    }
    return { points: round2(max * tfRatio(correct, total)), max, pending: false, correct: answer === null ? null : correct === total, detail: { correct, total, marks } };
  }
  if (question.type === 'short') {
    const ok = answer !== null && shortMatches(answer, question.key?.accept ?? question.key);
    return { points: ok ? max : 0, max, pending: false, correct: answer === null ? null : ok };
  }
  // essay: the teacher gives the points
  if (manualScore === null || manualScore === undefined) return { points: 0, max, pending: true, correct: null };
  const given = Math.max(0, Math.min(max, Number(manualScore) || 0));
  return { points: round2(given), max, pending: false, correct: given >= max ? true : given > 0 ? null : false };
}

/**
 * @param {object[]} questions
 * @param {Record<string, unknown>} answers qid -> answer
 * @param {Record<string, number|null>} manual qid -> teacher score
 */
export function scoreAttempt(questions, answers = {}, manual = {}) {
  let total = 0;
  let max = 0;
  let pending = 0;
  let answered = 0;
  const perQuestion = {};
  const sections = {};
  for (const q of questions) {
    const s = scoreQuestion(q, answers[q.id], manual[q.id]);
    perQuestion[q.id] = s;
    total += s.points;
    max += s.max;
    if (s.pending) pending++;
    if (isAnswered(q, answers[q.id])) answered++;
    const key = q.section || '';
    sections[key] ||= { points: 0, max: 0 };
    sections[key].points = round2(sections[key].points + s.points);
    sections[key].max = round2(sections[key].max + s.max);
  }
  return { total: round2(total), max: round2(max), answered, count: questions.length, pendingEssays: pending, perQuestion, sections };
}

/** Teacher view of a question's answer key as short text, e.g. "C", "Đ Đ Đ S", "1,5". */
export function describeKey(question) {
  if (question.type === 'mc') return question.key || '';
  if (question.type === 'tf') return Array.isArray(question.key) ? question.key.map((v) => (v === true ? 'Đ' : v === false ? 'S' : '?')).join(' ') : '';
  if (question.type === 'short') return (question.key?.accept ?? []).join(' | ');
  return '';
}
