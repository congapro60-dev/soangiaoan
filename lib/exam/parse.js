// Turns the lines of an exam file (PDF, Word or plain text) into a list of questions.
//
// It only recognises the structure that Vietnamese exams share:
//   PHẦN I. (12 câu/3 điểm) Trắc nghiệm nhiều phương án lựa chọn ...   -> type mc
//   PHẦN II. (4 câu/4 điểm) Trắc nghiệm Đúng - Sai ...                 -> type tf   (statements a) b) c) d))
//   PHẦN III. (3 điểm) Tự luận. / Trả lời ngắn                         -> type essay / short
//   Câu 1. ...   Bài 2. (0,5 điểm) ...                                 -> one question each
// It never invents an answer: answer keys come from the teacher (typed, pasted or taken from the file).
//
// Lines may carry a position (page, top, bottom, in points from the top of the page). When they do, every question also
// gets `regions`: the strips of the pages that hold it, so the pages can be cut into one picture per question (formulas
// and figures cannot be read reliably from the text of a PDF).

const SECTION = /^PH[ẦẢẠÀÁÃ]N\s+([IVX]+|\d+)\b\s*[.:)]?\s*(.*)$/iu;
const QUESTION = /^(Câu|Bài)\s*(\d+)\s*[.:)]\s*(.*)$/iu;
const NUMBER = '(\\d+(?:[.,]\\d+)?)';

const clean = (text) => String(text ?? '').replace(/[  -​]/g, ' ').replace(/\s+/g, ' ').trim();
const toNumber = (text) => Number(String(text).replace(',', '.'));
const round2 = (n) => Math.round(n * 100) / 100;

/** Remove Word-to-Markdown structure, keeping all teaching content and math. */
export const examLine = (text) => String(text ?? '').replace(/^\s*#{1,6}\s+/, '').replace(/^\s*[-*+]\s+/, '').replace(/\[UNSUPPORTED_WORD_CONTENT: <(?:\w+:)?(?:bookmarkStart|bookmarkEnd|proofErr|lastRenderedPageBreak|commentRangeStart|commentRangeEnd)>\]/g, '').replace(/\[UNSUPPORTED_DRAWING\]/g, '').trim();

function separateItems(text, type) {
  const pattern = type === 'mc' ? /(?:^|\s)([A-F])[.)]\s+/g : /(?:^|\s)([a-f])\)\s+/g;
  // Labels inside a formula cannot be item boundaries.
  const math=[...text.matchAll(/\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g)].map(m=>[m.index,m.index+m[0].length]);
  const markers = [...text.matchAll(pattern)].filter(m=>!math.some(([start,end])=>m.index>=start && m.index<end));
  const wanted = type === 'mc' ? ['A','B','C','D'] : ['a','b','c','d'];
  if (markers.length !== wanted.length || markers.some((m,i) => m[1] !== wanted[i])) return { noShuffle: true };
  const items = {};
  let shared = '';
  markers.forEach((mark,i) => {
    let value = text.slice(mark.index + mark[0].length, markers[i+1]?.index ?? text.length).trim();
    if (i === markers.length-1) {
      const tail = /\n\s*((?:Với|Trong đó|Cho mọi)\b[^\n]+)\s*$/iu.exec(value);
      if (tail) { shared = tail[1]; value = value.slice(0,tail.index).trim(); }
    }
    items[mark[1]] = value;
  });
  if (Object.values(items).some(v => !v)) return { noShuffle: true };
  const noShuffle = /cả\s+[A-F]\s+và\s+[A-F]|tất cả|không có|[A-F]\s+và\s+[A-F]\s+đều|ý\s*[a-f]\b|câu trên|ý trên/iu.test(Object.values(items).join(' '));
  return { text: [text.slice(0,markers[0].index).trim(), shared].filter(Boolean).join('\n'), [type==='mc'?'choiceText':'statementText']: items, noShuffle };
}

export function sectionType(text) {
  const t = clean(text).toLowerCase();
  if (/đúng\s*[-–—]?\s*sai/.test(t) || (t.includes('đúng') && t.includes('sai'))) return 'tf';
  if (t.includes('trả lời ngắn')) return 'short';
  if (t.includes('tự luận')) return 'essay';
  if (t.includes('nhiều phương án') || t.includes('trắc nghiệm')) return 'mc';
  return null;
}

function sectionPoints(text) {
  const t = clean(text);
  const both = new RegExp('(\\d+)\\s*câu\\s*/\\s*' + NUMBER + '\\s*điểm', 'i').exec(t);
  if (both) return { count: Number(both[1]), total: toNumber(both[2]) };
  const only = new RegExp(NUMBER + '\\s*điểm', 'i').exec(t);
  return only ? { count: null, total: toNumber(only[1]) } : { count: null, total: null };
}

function detectLetters(text, pattern) {
  const found = [];
  for (const m of text.matchAll(pattern)) if (!found.includes(m[1])) found.push(m[1]);
  return found;
}

/** Letters A, B, C, D that start an option inside the question's text. */
export function detectOptions(text) {
  const letters = detectLetters(text, /(?:^|\s)([A-F])[.)]\s/g);
  const wanted = ['A', 'B', 'C', 'D'];
  return wanted.every((l) => letters.includes(l)) ? letters.filter((l) => 'ABCDEF'.includes(l)).sort() : wanted;
}

/** Letters a), b), c), d) that start a statement. */
export function detectStatements(text) {
  const letters = detectLetters(text, /(?:^|\s)([a-f])\)\s/g);
  const wanted = ['a', 'b', 'c', 'd'];
  return wanted.every((l) => letters.includes(l)) ? letters.sort() : wanted;
}

/**
 * Groups the items pdf.js reports for one page into lines.
 * @param {Array<{str:string, transform:number[], width:number, height:number}>} items
 * @param {number} pageHeight
 * @param {number} page 1-based
 */
export function groupPdfLines(items, pageHeight, page) {
  const rows = [];
  for (const item of items) {
    if (!item.str || !item.str.trim()) continue;
    const size = Math.abs(item.height) || Math.abs(item.transform[3]) || 10;
    const baseline = pageHeight - item.transform[5];
    const row = rows.find((r) => Math.abs(r.baseline - baseline) <= 2.2);
    const part = { x: item.transform[4], w: item.width || 0, s: item.str, size };
    if (row) {
      row.parts.push(part);
      row.size = Math.max(row.size, size);
    } else rows.push({ baseline, size, parts: [part] });
  }
  rows.sort((a, b) => a.baseline - b.baseline);
  return rows.map((row) => {
    row.parts.sort((a, b) => a.x - b.x);
    const [label,content]=row.parts;
    const labelEnd=label.x+label.w;
    const itemContentX=/^(?:[A-F][.)]|[a-f]\))$/.test(label.s.trim()) && content && Number.isFinite(labelEnd) && label.w>0 && Number.isFinite(content.x) && content.x-labelEnd>=4 ? (labelEnd+content.x)/2 : null;
    return {
      page,
      x: row.parts[0].x,
      top: row.baseline - row.size * 0.85,
      bottom: row.baseline + row.size * 0.28,
      text: clean(row.parts.map((p) => p.s).join(' ')),
      ...(itemContentX===null?{}:{itemContentX}),
    };
  });
}

/** Conservative PDF L3: a complete row per item; inline or fragmented rows require teacher repair. */
// ponytail: vertical text items only; arbitrary layouts need reviewed manual crops or reliable drawing geometry.
export function detectPdfItemRegions(question, lines, pages = []) {
  const regions=question.regions || [];
  const fail=reason=>({stemRegions:regions,itemRegions:{},reason});
  if(!['mc','tf'].includes(question.type) || !regions.length) return fail('Chưa có vùng câu hỏi để tách phương án/ý.');
  const letters=question.type==='mc'?(question.options||['A','B','C','D']):(question.statements||['a','b','c','d']);
  if(letters.length!==4) return fail('Chỉ tự tách khi nhận diện đủ 4 phương án/ý.');
  const rows=lines.filter(l=>regions.some(r=>l.page===r.page&&l.top>=r.top&&l.bottom<=r.bottom)).sort((a,b)=>a.page-b.page||a.top-b.top);
  const pattern=question.type==='mc'?/(?:^|\s)([A-F])[.)]\s+/g:/(?:^|\s)([a-f])\)\s+/g;
  const marks=[];
  for(const [index,row] of rows.entries()) {
    const found=[...row.text.matchAll(pattern)];
    if(!found.length) continue;
    if(found.length!==1 || found[0].index!==0) return fail('Phương án/ý nằm chung dòng hoặc không có nhãn riêng; giáo viên cần tách bằng tay.');
    marks.push({index,row,letter:found[0][1]});
  }
  if(marks.length!==4 || marks.some((m,i)=>m.letter!==letters[i])) return fail('Không nhận diện duy nhất đủ 4 nhãn theo thứ tự.');
  if(rows.length-marks[0].index!==4) return fail('Có công thức vỡ dòng hoặc nội dung chung dưới phương án; giữ nguyên hình câu hỏi.');
  const itemRegions={};
  for(const {row,letter} of marks) {
    const page=pages[row.page-1],before=rows.filter(l=>l.page===row.page&&l.bottom<=row.top).at(-1),after=rows.find(l=>l.page===row.page&&l.top>=row.bottom);
    if(row.bottom<=row.top || (before&&row.top-before.bottom<4) || (after&&after.top-row.bottom<4)) return fail('Các vùng phương án quá sát nhau; cần kiểm tra và tách bằng tay.');
    if(!Number.isFinite(row.itemContentX) || row.itemContentX<=row.x || (page?.width&&row.itemContentX>=page.width)) return fail('Không tách riêng được nhãn cũ A–D/a–d khỏi nội dung ảnh; giữ nguyên thứ tự phương án/ý.');
    itemRegions[letter]=[{page:row.page,top:Math.max(0,row.top-1.5),bottom:Math.min(page?.height??Infinity,row.bottom+1.5),left:row.itemContentX}];
  }
  const first=marks[0].row;
  const stemRegions=regions.filter(r=>r.page<=first.page).map(r=>r.page===first.page?{...r,bottom:first.top-2}:r).filter(r=>r.bottom>r.top);
  if(!stemRegions.length || !rows.slice(0,marks[0].index).length) return fail('Chưa xác định riêng được phần đề bài.');
  return {stemRegions,itemRegions};
}

function isSmallFragment(text) {
  return text.replace(/\s/g, '').length <= 6;
}

function looksLikeOptions(text) {
  return /(?:^|\s)A[.)]\s/.test(text) && /\sD[.)](?:\s|$)/.test(text);
}

/**
 * @param {Array<{text:string, page?:number, top?:number, bottom?:number, x?:number}>} lines in reading order
 * @param {{ pages?: Array<{ height:number }> }} [options]
 */
export function parseExamLines(lines, options = {}) {
  const warnings = [];
  const rows = lines.map((l) => ({ ...l, text: clean(examLine(l.text)) })).filter((l) => l.text !== '' && (typeof l.page === 'number' || !/^HẾT$/iu.test(l.text.replace(/[-–—_\s]/g,''))));
  const geometry = rows.length > 0 && rows.every((l) => typeof l.page === 'number' && typeof l.top === 'number');

  // 1. find the headers
  const marks = [];
  rows.forEach((row, index) => {
    const section = SECTION.exec(row.text);
    if (section) return marks.push({ kind: 'section', index, roman: section[1].toUpperCase(), rest: section[2] });
    const q = QUESTION.exec(row.text);
    if (q) marks.push({ kind: 'question', index, word: q[1], number: Number(q[2]), rest: q[3] });
  });
  const firstMark = marks.length ? marks[0].index : rows.length;
  const head = rows.slice(0, firstMark).map((r) => r.text);
  const title = head.filter((t) => !/^thời gian/i.test(t)).slice(0, 3).join(' · ');
  const durationMatch = /thời gian(?: làm bài)?\s*:?\s*(\d+)\s*phút/i.exec(head.join(' ')) || /(\d+)\s*phút/i.exec(head.join(' '));
  const durationMin = durationMatch ? Number(durationMatch[1]) : null;

  // 2. sections: header text plus the lines up to the first question
  const sections = [];
  let current = null;
  const questions = [];
  marks.forEach((mark, m) => {
    const next = marks[m + 1];
    const endIndex = next ? next.index : rows.length;
    if (mark.kind === 'section') {
      const description = rows.slice(mark.index, mark.index + 1).map((r) => r.text).join(' ');
      // following description lines, until the first question header
      let k = mark.index + 1;
      const extra = [];
      while (k < endIndex && !(marks.find((x) => x.index === k))) extra.push(rows[k++].text);
      const fullText = [description, ...extra].join(' ');
      const points = sectionPoints(fullText);
      current = { id: 'S' + (sections.length + 1), roman: mark.roman, label: 'Phần ' + mark.roman, type: sectionType(fullText), count: points.count, total: points.total, text: fullText.slice(0, 400) };
      sections.push(current);
      return;
    }
    const bodyRows = rows.slice(mark.index, endIndex);
    const text = bodyRows.map((r) => r.text).join('\n');
    const header = bodyRows[0].text;
    const own = new RegExp('\\(\\s*' + NUMBER + '\\s*điểm\\s*\\)', 'i').exec(header);
    const optionsFound = detectLetters(text, /(?:^|\s)([A-F])[.)]\s/g);
    const statementsFound = detectLetters(text, /(?:^|\s)([a-f])\)\s/g);
    let type = current?.type || null;
    if (!type) type = statementsFound.length >= 2 ? 'tf' : optionsFound.length >= 3 ? 'mc' : 'essay';
    const q = {
      id: 'q' + (questions.length + 1),
      section: current ? current.roman : '',
      sectionId: current ? current.id : '',
      label: mark.word + ' ' + mark.number,
      type,
      points: own ? toNumber(own[1]) : null,
      text,
      startIndex: mark.index,
      endIndex,
    };
    if (type === 'mc') q.options = detectOptions(text);
    if (type === 'tf') q.statements = detectStatements(text);
    if (!geometry && (type === 'mc' || type === 'tf')) Object.assign(q, separateItems(text,type));
    // Word image adapter maps paragraphs through these indexes before returning the public result.
    if (bodyRows.some(r => r.segmentId)) q.segmentIds = [...new Set(bodyRows.map(r => r.segmentId).filter(Boolean))];
    questions.push(q);
  });

  // 3. points: from the question header, else the section total shared by its questions
  for (const section of sections) {
    const inSection = questions.filter((q) => q.sectionId === section.id);
    const fixed = inSection.filter((q) => q.points !== null).reduce((sum, q) => sum + q.points, 0);
    const open = inSection.filter((q) => q.points === null);
    if (section.total !== null && open.length) {
      const each = (section.total - fixed) / (section.count && !inSection.some((q) => q.points !== null) ? section.count : open.length);
      for (const q of open) q.points = round2(each);
    }
    if (section.total !== null && inSection.length && Math.abs(inSection.reduce((s, q) => s + (q.points || 0), 0) - section.total) > 0.01) {
      warnings.push(section.label + ': tổng điểm các câu (' + round2(inSection.reduce((s, q) => s + (q.points || 0), 0)) + ') khác ' + section.total + ' điểm ghi ở đầu phần.');
    }
    if (section.count !== null && section.count !== inSection.length) {
      warnings.push(section.label + ': đầu phần ghi ' + section.count + ' câu nhưng tìm thấy ' + inSection.length + ' câu.');
    }
  }
  for (const q of questions) if (q.points === null) q.points = 1;

  // 4. regions of the pages
  if (geometry) addRegions(rows, marks, questions, options.pages || [], warnings);
  for (const q of questions) {
    delete q.startIndex;
    delete q.endIndex;
  }
  if (questions.length === 0) warnings.push('Không tìm thấy dòng nào bắt đầu bằng "Câu 1." hoặc "Bài 1.". Em kiểm tra lại file hoặc thêm câu hỏi bằng tay.');
  return { title, durationMin, sections: sections.map(({ text, ...rest }) => ({ ...rest, text })), questions, warnings };
}

const TOP_MARGIN = 18;

function pageBounds(rows, pages) {
  const bounds = new Map();
  for (const page of new Set(rows.map((r) => r.page))) {
    const onPage = rows.filter((r) => r.page === page);
    const height = pages[page - 1]?.height || 842;
    const footer = onPage.filter((r) => /Trang\s*\d+\s*$/i.test(r.text) && r.top > height * 0.85).pop();
    const last = onPage[onPage.length - 1];
    const contentBottom = footer ? footer.top - 3 : Math.min(height - 24, last.bottom + 40);
    bounds.set(page, { height, contentBottom });
  }
  return bounds;
}

function addRegions(rows, marks, questions, pages, warnings) {
  const bounds = pageBounds(rows, pages);
  // where a header really starts: its own line, plus any small fragments just above it (numerators of fractions)
  const startOf = (index) => {
    const row = rows[index];
    let top = row.top;
    for (let k = index - 1; k >= 0; k--) {
      const prev = rows[k];
      if (prev.page !== row.page || !isSmallFragment(prev.text) || prev.bottom - top < 2 || SECTION.test(prev.text)) break;
      // the row of denominators right under the previous question's options (which has numerators above it) is not ours
      const above = rows[k - 1];
      const above2 = rows[k - 2];
      if (above && above.page === row.page && looksLikeOptions(above.text) && above2 && above2.page === row.page && isSmallFragment(above2.text)) break;
      top = Math.min(top, prev.top);
    }
    return { page: row.page, top: Math.max(0, top - 1.5) };
  };
  const endIndex = rows.findIndex((r) => /^HẾT$/i.test(r.text.replace(/[-–—_\s]/g, '')));
  for (const q of questions) {
    const from = startOf(q.startIndex);
    // the next header (question or section) ends this question; the end of the file or "HẾT" ends the last one
    const nextMark = marks.find((m) => m.index >= q.endIndex);
    let stop;
    if (nextMark) stop = startOf(nextMark.index);
    else if (endIndex > q.startIndex) stop = { page: rows[endIndex].page, top: rows[endIndex].top - 2 };
    else stop = { page: rows[rows.length - 1].page, top: Infinity };
    const regions = [];
    for (let page = from.page; page <= stop.page; page++) {
      const b = bounds.get(page);
      if (!b) continue;
      const top = page === from.page ? from.top : TOP_MARGIN;
      const bottom = page === stop.page ? Math.min(stop.top - 0.3, b.contentBottom) : b.contentBottom;
      const holdsText = rows.some((r) => r.page === page && r.top >= top - 1 && r.bottom <= bottom + 1);
      if (bottom - top < 16 || (page !== from.page && !holdsText && bottom - top < 40)) continue;
      regions.push({ page, top: Math.round(top * 10) / 10, bottom: Math.round(bottom * 10) / 10 });
    }
    q.regions = regions;
    if (regions.length === 0) warnings.push(q.label + ' (phần ' + q.section + '): chưa cắt được hình, cần thêm hình bằng tay.');
  }
}
