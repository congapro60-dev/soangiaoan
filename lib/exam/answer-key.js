// Reads an answer key that the teacher types or pastes, in the formats Vietnamese teachers actually use:
//   Phần I:   1.C 2.B 3.B 4.B ...      or   1C 2B 3B ...      or   Câu 1: C
//   Phần II:  Câu 1: Đ Đ Đ S           or   1. ĐĐĐS           or   1: a-Đ b-Đ c-Đ d-S
//   Phần III: Câu 1: 1,5               (short answers; several spellings may be separated by "|" or ";")
// Numbers refer to the order inside each kind of question (the 3rd multiple-choice question, the 2nd true/false ...),
// which is how answer keys are written, so the same key works whatever the questions are called.
import { sectionType, examLine } from './parse.js';

const clean = (text) => String(text ?? '').normalize('NFC').replace(/[  -​]/g, ' ');

function guideSection(line) {
  line=examLine(line).replace(/^[A-Z]\s*[.)]\s*(?=PH[ẦẢẠÀÁÃ]N)/iu,'');
  const match = /^(?:PH[ẦẢẠÀÁÃ]N\s+)?([IVX]+|\d+)\b\s*[.:)]?\s*(.*)$/iu.exec(line);
  if (!match || (!/^PH/iu.test(line) && !/^[IVX]+[.:)]/iu.test(line))) return null;
  return { roman: match[1].toUpperCase(), type: sectionType(match[2]) || ({ I: 'mc', II: 'tf', III: 'short' }[match[1].toUpperCase()] ?? null) };
}

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
  let roman = null;
  let columns = null;
  let tableKind = null;
  const numberedQuestion = (type, number) => {
    const list = byType[type] || [];
    const scoped = roman && list.some((q) => q.section) ? list.filter((q) => String(q.section).toUpperCase() === roman) : list;
    const named = scoped.filter((q) => Number(/(?:Câu|Bài)\s*(\d+)/iu.exec(q.label)?.[1]) === number);
    return named.length === 1 ? named[0] : named.length > 1 ? null : scoped[number - 1];
  };
  const put = (type, number, key, raw) => {
    const q = numberedQuestion(type, number);
    if (!q) return problems.push('Không có câu ' + number + ' kiểu "' + (type === 'mc' ? 'chọn một đáp án' : type === 'tf' ? 'đúng/sai' : 'trả lời ngắn') + '" để gắn "' + raw.trim().slice(0, 30) + '".');
    if (q.id in keys && JSON.stringify(keys[q.id]) !== JSON.stringify(key)) problems.push('Có nhiều đáp án khác nhau cho ' + q.label + '; cần kiểm tra lại.');
    keys[q.id] = key;
  };

  for (const rawLine of clean(text).split(/\r?\n/)) {
    let line = examLine(rawLine);
    if (!line) continue;
    const section = guideSection(line);
    if (section) {
      context = section.type;
      roman = section.roman;
      columns = null;
      tableKind = null;
      continue;
    }
    if (context === 'essay') continue;

    // Word converter emits Markdown tables. Only the recognised key table schema is interpreted.
    if(/^\|.*\|$/.test(line)) {
      const cells=line.slice(1,-1).split('|').map(s=>s.trim());
      if(cells.every(s=>/^:?-+:?$/.test(s))) continue;
      if(/^Câu$/iu.test(cells[0])) {
        if(cells.slice(1).every(s=>/^\d+$/.test(s))) { columns=cells.slice(1).map(Number); tableKind='mc'; }
        else tableKind=/Kết quả đúng|Đáp số|Trả lời/iu.test(cells[1]||'')?'short':/^Ý\s*a$/iu.test(cells[1]||'')?'tf':null;
        continue;
      }
      if(tableKind==='mc' && /^Đáp án$/iu.test(cells[0])) line=cells.join(' ');
      else if(tableKind==='tf' && /^\d+$/.test(cells[0])) line=cells.join(' ');
      else if(tableKind==='short' && /^\d+$/.test(cells[0])) {
        const value=/^([+−–-]?\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)(?:\s*\([^)]*\))?$/.exec(cells[1]||'');
        if(value) put('short',Number(cells[0]),{accept:[value[1]]},line);
        else problems.push('Bảng trả lời ngắn cần kiểm tra: '+line);
        continue;
      } else continue;
    }

    // PDF/Word tables: a row of question numbers, followed by its answer row.
    const columnRow = /^Câu\s+((?:\d+\s*)+)$/iu.exec(line);
    if (columnRow) { columns = columnRow[1].trim().split(/\s+/).map(Number); continue; }
    const answerRow = /^Đáp án\s+([A-D](?:\s+[A-D])*)$/iu.exec(line);
    if (answerRow && columns && (context === 'mc' || context === null)) {
      const letters = answerRow[1].toUpperCase().split(/\s+/);
      if (letters.length !== columns.length) problems.push('Bảng đáp án thiếu cột; cần kiểm tra lại.');
      else columns.forEach((n, i) => put('mc', n, letters[i], line));
      columns = null;
      continue;
    }
    const tfRow = /^(\d{1,3})\s+([ĐđSs](?:\s+[ĐđSs]){1,5})$/u.exec(line);
    if (tfRow && (context === 'tf' || context === null)) {
      const values = tfTokens(tfRow[2]);
      const question = numberedQuestion('tf', Number(tfRow[1]));
      if (question && values?.length === (question.statements?.length || 4)) put('tf', Number(tfRow[1]), values, line);
      else problems.push('Bảng đúng/sai thiếu câu hoặc ý: ' + line);
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
      const q = numberedQuestion('tf', number);
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

/** Marking guides contain prose and repeated numbering. Only explicit answer rows become keys. */
// ponytail: explicit headings/tables only; nonstandard or scanned guides need teacher edits until format support/OCR is added.
export function parseMarkingGuide(text, questions) {
  const rows = clean(text).split(/\r?\n/);
  const keyLines = [];
  const solutions = {}, rubrics = {}, spans = {}, problems = [];
  let section = null, block = null, quick = false, nextQuick = 1;
  const finish = (endIndex) => {
    if (!block) return;
    const value = rows.slice(block.startIndex, endIndex).join('\n');
    if (block.qid in solutions) problems.push('Có nhiều lời giải cho ' + block.label + '; cần kiểm tra lại.');
    solutions[block.qid] = value;
    spans[block.qid] = { startIndex: block.startIndex, endIndex };
    if (block.type === 'essay') rubrics[block.qid] = value;
    block = null;
  };
  for (const [index, raw] of rows.entries()) {
    const line = examLine(raw);
    const heading = guideSection(line);
    if (heading) {
      finish(index);
      section = heading;
      const matches = questions.filter((q) => q.section === heading.roman);
      if (matches.length && matches.every((q) => q.type === matches[0].type)) section.type = matches[0].type;
      quick = false; nextQuick = 1;
      keyLines.push('PHẦN ' + section.roman + '. ' + ({mc:'Trắc nghiệm nhiều phương án',tf:'Đúng/Sai',short:'Trả lời ngắn',essay:'Tự luận'}[section.type] || ''));
      continue;
    }
    if(/^[A-Z]\.\s+(?:BẢNG|CẤU TRÚC|NGUYÊN TẮC)/u.test(line)) { finish(index); section=null; quick=false; continue; }
    if(section && /^\|.*\|$/.test(line)) { keyLines.push(line); continue; }
    if (section?.type === 'mc' && /Cơ sở đối chiếu|Câu\s+Cách kiểm tra/iu.test(line)) quick = true;
    let head = /^(Câu|Bài)\s*(\d+)(?:\s*\([^)]*\))?\s*(?:[.:)–—-]\s*(.*)|$)/iu.exec(line);
    if (!head && quick) {
      const numbered = /^(\d{1,3})\s+(.+)$/u.exec(line);
      if (numbered && /[\p{L}=∈]/u.test(numbered[2]) && Number(numbered[1]) === nextQuick) {
        head = [line, 'Câu', numbered[1], numbered[2]];
        nextQuick++;
      }
    }
    if (head) {
      finish(index);
      const candidates = questions.filter((q) => Number(/(?:Câu|Bài)\s*(\d+)/iu.exec(q.label)?.[1]) === Number(head[2]) && (!section || (q.section === section.roman || (!q.section && q.type === section.type))));
      if (candidates.length !== 1) problems.push('Không xác định được ' + head[1] + ' ' + head[2] + ' (trùng số ở nhiều phần hoặc thiếu câu).');
      else block = { ...candidates[0], qid: candidates[0].id, startIndex: index };
      const rest = head[3]?.trim() || '';
      const choice=/^([A-D])(?:[.]\s|$)/iu.exec(rest);
      if (block?.type === 'mc' && choice) keyLines.push('Câu ' + head[2] + ': ' + choice[1]);
      if (block?.type === 'tf' && tfTokens(rest)) keyLines.push('Câu ' + head[2] + ': ' + rest);
      if (block?.type === 'short' && /^[+−–-]?[\d.,/\s|;]+$/u.test(rest)) keyLines.push('Câu ' + head[2] + ': ' + rest);
      continue;
    }
    if (/^Câu\s+(?:\d+\s*)+$/iu.test(line) || /^Đáp án\s+[A-D](?:\s+[A-D])*$/iu.test(line) || (section?.type === 'tf' && /^\d+\s+[ĐđSs](?:\s+[ĐđSs]){1,5}$/u.test(line))) keyLines.push(line);
    else if (section?.type === 'mc' && /^(?:\d+\s*[.:)]?\s*[A-D]\s*)+$/iu.test(line)) keyLines.push(line);
    else if (block && block.type !== 'essay') {
      const explicit = /^(?:Đáp án|Đáp số|Kết quả)\s*:\s*(.+)$/iu.exec(line);
      if (explicit) keyLines.push('Câu ' + /(?:Câu|Bài)\s*(\d+)/iu.exec(block.label)[1] + ': ' + explicit[1]);
    }
  }
  finish(rows.length);
  const result = parseAnswerKey(keyLines.join('\n'), questions);
  problems.push(...result.problems);
  for(const q of questions) if(solutions[q.id] && /hai lối hiểu|hai cách hiểu|đáp án\s*9\/10|xử lý đáp án\s*9\/10|quy ước mốc thời gian/iu.test(solutions[q.id])) problems.push((q.section?'Phần '+q.section+' · ':'')+q.label+': hướng dẫn có nhiều cách hiểu về mốc thời gian/đáp án; giáo viên phải kiểm tra.');
  for (const q of questions) if (q.type !== 'essay' && !(q.id in result.keys)) problems.push((q.section ? 'Phần ' + q.section + ' · ' : '') + q.label + ': chưa có đáp án nhận diện; giáo viên cần điền.');
  return { ...result, solutions, rubrics, spans, problems };
}
