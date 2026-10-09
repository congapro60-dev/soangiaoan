// Reads an answer key that the teacher types or pastes, in the formats Vietnamese teachers actually use:
//   Phần I:   1.C 2.B 3.B 4.B ...      or   1C 2B 3B ...      or   Câu 1: C
//   Phần II:  Câu 1: Đ Đ Đ S           or   1. ĐĐĐS           or   1: a-Đ b-Đ c-Đ d-S
//   Phần III: Câu 1: 1,5               (short answers; several spellings may be separated by "|" or ";")
// Numbers refer to the order inside each kind of question (the 3rd multiple-choice question, the 2nd true/false ...),
// which is how answer keys are written, so the same key works whatever the questions are called.
import { sectionType } from './parse.js';

const clean = (text) => String(text ?? '').normalize('NFC').replace(/[  -​]/g, ' ');

/** One true/false token to true / false / null. */
function tfValue(token) {
  const t = token.normalize('NFC').toLowerCase();
  if (t === 'đ' || t === 'đúng' || t === 'dung' || t === 't' || t === 'true') return true;
  if (t === 's' || t === 'sai' || t === 'f' || t === 'false') return false;
  return null;
}

function tfTokens(rest) {
  // "a-Đ b-Đ" / "a) Đ" / "ĐĐĐS" / "Đ Đ Đ S" / "Đúng Đúng Sai Đúng"
  const stripped = rest.replace(/(?:^|\s)[a-f]\s*[-–:.)]\s*/gi, ' ');
  const compact = stripped.replace(/\s+/g, '');
  if (/^[ĐđSs]{2,6}$/.test(compact)) return [...compact].map(tfValue);
  const words = stripped.split(/[\s,;]+/).filter(Boolean);
  const values = words.map(tfValue);
  return values.length >= 2 && values.every((v) => v !== null) ? values : null;
}

/**
 * @param {string} text what the teacher pasted
 * @param {Array<{id:string,type:string,statements?:string[]}>} questions
 * @returns {{ keys: Record<string, any>, applied: number, problems: string[] }}
 */
export function parseAnswerKey(text, questions) {
  const byType = { mc: [], tf: [], short: [] };
  for (const q of questions) if (byType[q.type]) byType[q.type].push(q);
  const keys = {};
  const problems = [];
  let context = null;
  const put = (type, number, key, raw) => {
    const q = byType[type]?.[number - 1];
    if (!q) return problems.push('Không có câu ' + number + ' kiểu "' + (type === 'mc' ? 'chọn một đáp án' : type === 'tf' ? 'đúng/sai' : 'trả lời ngắn') + '" để gắn "' + raw.trim().slice(0, 30) + '".');
    keys[q.id] = key;
  };

  for (const rawLine of clean(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const section = /^PH[ẦẢẠÀÁÃ]N\s+([IVX]+|\d+)\b(.*)$/iu.exec(line);
    if (section) {
      context = sectionType(line) || (/^I$/i.test(section[1]) ? 'mc' : /^II$/i.test(section[1]) ? 'tf' : /^III$/i.test(section[1]) ? 'short' : null);
      const rest = section[2].replace(/^[\s.:)-]+/, '');
      if (!rest || sectionType(rest) !== null) continue;
      continue;
    }

    // several "number letter" pairs on one line: 1.C 2.B 3.B
    const pairs = [...line.matchAll(/(?:^|[\s,;])(?:Câu\s*)?(\d{1,3})\s*[.:)\-–]?\s*([A-Da-d])(?=$|[\s,;.])/giu)];
    const looksMc = pairs.length >= 1 && !/[ĐđSs]{2}/.test(line.replace(/\s/g, '')) && (context === 'mc' || context === null || pairs.length >= 2);
    if (looksMc && context !== 'tf' && context !== 'short') {
      for (const m of pairs) put('mc', Number(m[1]), m[2].toUpperCase(), m[0]);
      continue;
    }

    // "Câu 1: ..." / "1. ..." with the rest of the line as the answer
    const head = /^(?:Câu|Bài)?\s*(\d{1,3})\s*[.:)\-–]\s*(.+)$/iu.exec(line);
    if (!head) {
      problems.push('Không đọc được dòng: "' + line.slice(0, 40) + '"');
      continue;
    }
    const number = Number(head[1]);
    const rest = head[2].trim();
    const tf = tfTokens(rest);
    if (tf && context !== 'short') {
      const q = byType.tf[number - 1];
      const count = q?.statements?.length || 4;
      if (q && tf.length !== count) problems.push('Câu đúng/sai số ' + number + ' có ' + count + ' ý nhưng đáp án ghi ' + tf.length + ' ý.');
      else put('tf', number, tf, rest);
    } else if (/^[A-Da-d]$/.test(rest) && context !== 'short') {
      put('mc', number, rest.toUpperCase(), rest);
    } else {
      const accept = rest.split(/\s*[|;]\s*/).map((s) => s.trim()).filter(Boolean);
      put('short', number, { accept }, rest);
    }
  }
  return { keys, applied: Object.keys(keys).length, problems };
}
