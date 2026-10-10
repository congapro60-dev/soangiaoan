import { cleanAnswer } from './scoring.js';

export const readExamCodes = (data) => Array.isArray(data) ? [{ code: null, questions: data }] : Array.isArray(data?.codes) ? data.codes : [];

function randomFrom(seed) {
  let state = 2166136261;
  for (const character of String(seed)) state = Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const shuffled = (list, random) => {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export function buildView(questions, settings = {}, seed = '') {
  const random = randomFrom(seed);
  const view = { order: [], options: {}, statements: {}, labels: {} };
  for (const section of [...new Set(questions.map((q) => q.section))]) {
    const original = questions.filter((q) => q.section === section);
    const group = settings.shuffleQuestions ? shuffled(original, random) : original;
    group.forEach((q, index) => {
      view.order.push(q.id);
      view.labels[q.id] = settings.shuffleQuestions ? (q.type === 'essay' ? 'Bài ' : 'Câu ') + (index + 1) : q.label;
    });
  }
  for (const q of questions) {
    const field = q.type === 'mc' ? 'options' : q.type === 'tf' ? 'statements' : null;
    if (!field) continue;
    const textField = field === 'options' ? 'choiceText' : 'statementText';
    const images = field === 'options' ? q.choiceImages : q.statementImages;
    const complete = q[field].every((letter) => q[textField]?.[letter]?.trim() || images?.[letter]);
    view[field][q.id] = settings.shuffleOptions && !q.noShuffle && complete ? shuffled(q[field], random) : [...q[field]];
  }
  if (!settings.shuffleQuestions) view.order = questions.map((q) => q.id);
  return view;
}

export function toCanonicalAnswer(q, value, view) {
  const clean = cleanAnswer(q, value);
  if (clean === null) return null;
  if (q.type === 'mc') return (view?.options?.[q.id] || q.options)[q.options.indexOf(clean)] ?? null;
  if (q.type === 'tf') {
    const order = view?.statements?.[q.id] || q.statements;
    return q.statements.map((letter) => clean[order.indexOf(letter)] ?? null);
  }
  return clean;
}

export function toDisplayAnswer(q, value, view) {
  const clean = cleanAnswer(q, value);
  if (clean === null) return null;
  if (q.type === 'mc') return q.options[(view?.options?.[q.id] || q.options).indexOf(clean)] ?? null;
  if (q.type === 'tf') return (view?.statements?.[q.id] || q.statements).map((letter) => clean[q.statements.indexOf(letter)] ?? null);
  return clean;
}

export function viewQuestion(q, view, review = false) {
  const { key, rubric, solution, solutionImages, ...display } = q;
  delete display.noShuffle;
  display.label = view?.labels?.[q.id] || q.label;
  if (display.label !== q.label && typeof display.text === 'string') display.text = display.text.replace(/^(?:Câu|Bài)\s*\d+\s*[.:)]\s*/iu, '');
  const letters = q.type === 'mc' ? q.options : q.type === 'tf' ? q.statements : [];
  const order = q.type === 'mc' ? view?.options?.[q.id] || letters : view?.statements?.[q.id] || letters;
  for (const field of ['choiceText', 'statementText', 'choiceImages', 'statementImages']) {
    if (q[field]) display[field] = Object.fromEntries(letters.map((letter, index) => [letter, q[field][order[index]]]).filter(([, value]) => value !== undefined));
  }
  if (review) Object.assign(display, { key: q.type === 'mc' || q.type === 'tf' ? toDisplayAnswer(q, key, view) : key, ...(rubric !== undefined ? { rubric } : {}), ...(solution !== undefined ? { solution } : {}), ...(solutionImages !== undefined ? { solutionImages } : {}) });
  return display;
}
