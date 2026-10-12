// Checks and cleans what the teacher sends when saving an exam. Anything that is not recognised is dropped, never kept.
import { QUESTION_TYPES } from './scoring.js';

export const LIMITS = Object.freeze({
  questions: 80,
  title: 120,
  text: 4000,
  solution: 6000,
  rubric: 2000,
  comment: 1000,
  label: 40,
  duration: [5, 300],
  points: 20,
  acceptItems: 8,
  acceptLength: 60,
  photosPerAttempt: 12,
  imageBase64: 700_000,
  photoBase64: 650_000,
});

const fail = (message) => {
  throw new Error('INVALID_EXAM');
};
const round2 = (n) => Math.round(n * 100) / 100;
const str = (value, max) => String(value ?? '').normalize('NFC').replace(/\u0000/g, '').slice(0, max);

function cleanKey(type, key, q) {
  if (key === null || key === undefined) return null;
  if (type === 'mc') {
    const letter = String(key).trim().toUpperCase();
    return q.options.includes(letter) ? letter : null;
  }
  if (type === 'tf') {
    if (!Array.isArray(key) || key.length !== q.statements.length) return null;
    return key.every((v) => v === true || v === false) ? key.map(Boolean) : null;
  }
  if (type === 'short') {
    const list = Array.isArray(key) ? key : Array.isArray(key?.accept) ? key.accept : typeof key === 'string' ? [key] : [];
    const accept = list.map((s) => str(s, LIMITS.acceptLength).trim()).filter(Boolean).slice(0, LIMITS.acceptItems);
    return accept.length ? { accept } : null;
  }
  return null;
}

export function normalizeQuestions(list, code = null) {
  if (!Array.isArray(list) || list.length === 0 || list.length > LIMITS.questions) fail('questions');
  return list.map((raw, index) => {
    if (!raw || typeof raw !== 'object') fail('question');
    const type = QUESTION_TYPES.includes(raw.type) ? raw.type : fail('type');
    const q = {
      id: (code ? code + '_' : '') + 'q' + (index + 1),
      section: str(raw.section, 8),
      label: str(raw.label, LIMITS.label) || 'Câu ' + (index + 1),
      type,
      points: round2(Math.min(LIMITS.points, Math.max(0, Number(raw.points) || 0))),
      text: str(raw.text, LIMITS.text),
    };
    if (type === 'mc') {
      const options = Array.isArray(raw.options) ? [...new Set(raw.options.map((o) => String(o).trim().toUpperCase()).filter((o) => /^[A-F]$/.test(o)))].sort() : [];
      q.options = options.length >= 2 ? options : ['A', 'B', 'C', 'D'];
    }
    if (type === 'tf') {
      const statements = Array.isArray(raw.statements) ? [...new Set(raw.statements.map((o) => String(o).trim().toLowerCase()).filter((o) => /^[a-f]$/.test(o)))].sort() : [];
      q.statements = statements.length >= 2 ? statements : ['a', 'b', 'c', 'd'];
    }
    const items = type === 'mc' ? q.options : type === 'tf' ? q.statements : [];
    const textField = type === 'mc' ? 'choiceText' : 'statementText';
    if (raw[textField] && typeof raw[textField] === 'object' && !Array.isArray(raw[textField])) {
      q[textField] = Object.fromEntries(items.filter((letter) => typeof raw[textField][letter] === 'string').map((letter) => [letter, str(raw[textField][letter], LIMITS.text)]));
    }
    if (raw.imageMode === 'figure') q.imageMode = 'figure';
    const references = /cả\s+[A-F]\s+và\s+[A-F]|tất cả|không có|[A-F]\s+và\s+[A-F]\s+đều|ý\s+[a-f]\b|câu trên/iu;
    q.noShuffle = typeof raw.noShuffle === 'boolean' ? raw.noShuffle : Object.values(q[textField] || {}).some((text) => references.test(text));
    q.key = cleanKey(type, raw.key, q);
    if (raw.solution !== undefined) q.solution = str(raw.solution, LIMITS.solution);
    if (type === 'essay') q.rubric = str(raw.rubric, LIMITS.rubric);
    return q;
  });
}

const SHOW = ['none', 'score'];

export function normalizeExamInput(input) {
  if (!input || typeof input !== 'object') fail('body');
  const title = str(input.title, LIMITS.title).trim();
  if (!title) fail('title');
  const duration = Math.round(Number(input.durationMin));
  if (!Number.isFinite(duration) || duration < LIMITS.duration[0] || duration > LIMITS.duration[1]) fail('duration');
  const s = input.settings && typeof input.settings === 'object' ? input.settings : {};
  const settings = {
    showResult: SHOW.includes(s.showResult) ? s.showResult : 'score',
    review: s.review === 'none' ? 'none' : 'after_close',
    allowLateJoin: s.allowLateJoin !== false,
    shuffleQuestions: s.shuffleQuestions === true,
    shuffleOptions: s.shuffleOptions === true,
    assignment: ['alternate', 'random', 'manual'].includes(s.assignment) ? s.assignment : 'alternate',
    showCode: s.showCode === true,
    integrityPolicyVersion: s.integrityPolicyVersion === 0 ? 0 : 1,
    graceSeconds: Math.min(120, Math.max(0, Math.round(Number(s.graceSeconds ?? 30)))),
  };
  if (input.codes !== undefined) {
    if (!Array.isArray(input.codes) || input.codes.length < 1 || input.codes.length > 8) fail('codes');
    const seen = new Set();
    const codes = input.codes.map((entry) => {
      if (!entry || typeof entry.code !== 'string' || !/^\d{3}$/.test(entry.code) || seen.has(entry.code)) fail('code');
      seen.add(entry.code);
      return { code: entry.code, ...(entry.label !== undefined ? { label: str(entry.label, LIMITS.label) } : {}), questions: normalizeQuestions(entry.questions, entry.code) };
    });
    return { title, durationMin: duration, settings, codes, questions: codes[0].questions };
  }
  return { title, durationMin: duration, settings, questions: normalizeQuestions(input.questions) };
}

/** Names the pupils type: NFC, collapsed spaces, 1 to 40 characters. */
export function normalizeName(value) {
  const name = String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!name || name.length > 40) throw new Error('INVALID_NAME');
  return name;
}

export const nameKey = (name) => name.normalize('NFC').toLowerCase();

const IMAGE_MIME = /^image\/(jpeg|png|webp)$/;

export function checkImage(mime, base64, max) {
  if (!IMAGE_MIME.test(String(mime))) throw new Error('INVALID_IMAGE');
  if (typeof base64 !== 'string' || base64.length < 100 || base64.length > max || base64.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) throw new Error('INVALID_IMAGE');
  let decoded;
  try {
    decoded = atob(base64);
  } catch {
    throw new Error('INVALID_IMAGE');
  }
  if (!decoded.length || btoa(decoded) !== base64) throw new Error('INVALID_IMAGE');
  return { mime, bytes: decoded.length };
}
