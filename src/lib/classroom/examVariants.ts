/**
 * Bài kiểm tra định kì nhiều MÃ ĐỀ — phần thuần, máy chủ (api/) và trình duyệt dùng chung.
 *
 * Chủ dự án (06/10/2026): khối 12 có 4–8 mã, người ra đề gửi MỘT file gộp hết các mã; khối khác 1–4 mã,
 * MỖI mã MỘT file. Giáo viên chấm tay trước, học sinh chụp bài đã chấm nộp lên như BTVN; AI tự đọc mã đề trên ảnh.
 *
 * Việc của module:
 *  - đọc Word GIỮ CẤU TRÚC BẢNG (bảng đáp án các mã thường là bảng; đọc phẳng từng ô là mất cột nào của mã nào),
 *  - nhận mã đề từ tên file hoặc dòng "Mã đề …" trong file, tách đề của từng mã,
 *  - gom mọi phần "ĐÁP ÁN / HƯỚNG DẪN CHẤM" thành một khối tư liệu cho AI rút đáp án từng mã,
 *  - câu lệnh + đọc kết quả của AI (rút đáp án, đọc mã đề trên ảnh bài làm).
 */
import type { StudentExamScores } from './examScores.js';
import type { ExamScoreCheck } from './types.js';

/** Một mã đề của bài kiểm tra định kì: đề + đáp án riêng của mã đó. Chỉ giáo viên và máy chủ đọc. */
export interface ExamVariant {
  /** Mã in trên đề, vd "1201". */
  code: string;
  /** Chữ của đề mã này — ngữ cảnh chấm, để giải thích từng câu nói đúng câu đó hỏi gì. */
  sourceText: string;
  /** Đáp án / hướng dẫn chấm của mã này, mỗi câu một dòng. */
  answerKey: string;
}

export interface VariantSourceFile {
  name: string;
  text: string;
}

export interface VariantDraft {
  code: string;
  sourceText: string;
  files: string[];
}

export interface VariantPlan {
  variants: VariantDraft[];
  /** Mọi phần đáp án tìm được, có nhãn nguồn — gửi AI một lượt để rút đáp án cho TẤT CẢ các mã. */
  answerMaterial: string;
  warnings: string[];
}

export const MAX_EXAM_VARIANTS = 12;
/** Mã đặt cho bài chỉ có MỘT đề và đề đó không ghi mã. */
export const SINGLE_VARIANT_CODE = '1';
export const MAX_VARIANT_SOURCE_CHARS = 40_000;
export const MAX_VARIANT_KEY_CHARS = 12_000;
export const MAX_ANSWER_MATERIAL_CHARS = 60_000;

const nfc = (value: string): string => value.normalize('NFC');

// ── Đọc Word giữ bảng ─────────────────────────────────────────────────────────

const decodeXml = (value: string): string => value
  .replace(/&#x([0-9a-f]+);/giu, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#(\d+);/gu, (_, dec: string) => String.fromCodePoint(Number(dec)))
  .replace(/&lt;/gu, '<').replace(/&gt;/gu, '>').replace(/&quot;/gu, '"').replace(/&apos;/gu, "'")
  .replace(/&amp;/gu, '&');

/** Tên thẻ phải khớp ĐÚNG: `w:p` không được bắt nhầm `w:pPr`, `w:tc` không bắt nhầm `w:tcPr` (bài học OMML). */
const TAG = /<(\/?)(w:tbl|w:tr|w:tc|w:p|w:t|m:t|w:tab|w:br|w:cr)(?=[\s/>])[^>]*?(\/?)>/gu;

interface TableLevel { cells: string[]; cellLines: string[] | null }

/**
 * `word/document.xml` → chữ: mỗi đoạn một dòng; mỗi HÀNG bảng một dòng, các ô cách nhau " | ".
 * Lấy cả chữ trong công thức Word (`m:t`) — mammoth bỏ mất phần này. Bỏ nhánh `mc:Fallback`
 * (Word lưu hộp chữ hai lần, đọc cả hai là chữ bị lặp).
 */
export const docxXmlToText = (xml: string): string => {
  const body = xml.replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/gu, '');
  TAG.lastIndex = 0;
  const out: string[] = [];
  const tables: TableLevel[] = [];
  let paragraph = '';
  const sink = (line: string) => {
    const top = tables.at(-1);
    if (top?.cellLines) top.cellLines.push(line);
    else if (top) top.cells.push(line);
    else out.push(line);
  };
  for (let match = TAG.exec(body); match; match = TAG.exec(body)) {
    const [, closing, name, selfClosing] = match;
    if (name === 'w:t' || name === 'm:t') {
      if (closing || selfClosing) continue;
      const end = body.indexOf(`</${name}>`, TAG.lastIndex);
      if (end < 0) continue;
      paragraph += decodeXml(body.slice(TAG.lastIndex, end));
      TAG.lastIndex = end + name.length + 3;
    } else if (name === 'w:tab') {
      paragraph += ' ';
    } else if (name === 'w:br' || name === 'w:cr') {
      paragraph += '\n';
    } else if (name === 'w:p') {
      if (closing) {
        const line = paragraph.replace(/[ \t]+/gu, ' ').trim();
        if (line) sink(line);
        paragraph = '';
      }
    } else if (name === 'w:tbl') {
      if (closing) {
        tables.pop();
      } else if (!selfClosing) {
        tables.push({ cells: [], cellLines: null });
      }
    } else if (name === 'w:tr') {
      const top = tables.at(-1);
      if (!top) continue;
      if (closing) {
        const row = top.cells.join(' | ').trim();
        top.cells = [];
        if (row.replace(/[|\s]/gu, '')) {
          // Hàng của bảng con đi vào ô đang mở của bảng cha (hoặc thẳng ra tài liệu).
          tables.pop();
          sink(row);
          tables.push(top);
        }
      } else {
        top.cells = [];
      }
    } else if (name === 'w:tc') {
      const top = tables.at(-1);
      if (!top) continue;
      if (closing) {
        top.cells.push((top.cellLines ?? []).join(' ').trim());
        top.cellLines = null;
      } else if (!selfClosing) {
        top.cellLines = [];
      }
    }
  }
  return nfc(out.join('\n'));
};

/** Một mẩu chữ pdf.js (`getTextContent().items`): chuỗi, ma trận vị trí (y ở phần tử 5), cờ hết dòng. */
export interface PdfTextItem { str?: string; transform?: number[]; hasEOL?: boolean }

/**
 * Mẩu chữ một trang PDF → các dòng: xuống dòng khi pdf.js báo hết dòng hoặc chữ nhảy sang hàng khác (y lệch > 2).
 * Nối cả trang thành một dòng (như `extractTextFromPDF`) thì không còn thấy dòng "Mã đề …" hay "ĐÁP ÁN" riêng rẽ.
 */
export const pdfItemsToText = (items: readonly PdfTextItem[]): string => {
  const lines: string[] = [];
  let line = '';
  let lineY: number | null = null;
  for (const item of items) {
    const y = Array.isArray(item.transform) && Number.isFinite(item.transform[5]) ? item.transform[5] : null;
    if (line && y !== null && lineY !== null && Math.abs(y - lineY) > 2) {
      lines.push(line);
      line = '';
    }
    if (y !== null && !line) lineY = y;
    line += item.str ?? '';
    if (item.hasEOL) {
      lines.push(line);
      line = '';
      lineY = null;
    }
  }
  if (line) lines.push(line);
  return nfc(lines.map(text => text.replace(/[ \t]+/gu, ' ').trim()).filter(Boolean).join('\n'));
};

// ── Nhận mã đề ────────────────────────────────────────────────────────────────

/** "Mã đề 101", "MÃ ĐỀ THI: 1201", "Mã đề kiểm tra – 102", "Ma de 103". */
const CODE_HEADER = /m(?:ã|a)\s*(?:đề|de)(?:\s*(?:thi|kiểm\s*tra|kt))?(?:\s*số)?\s*[:：.\-–—]?\s*(\d{3,4})(?!\d)/giu;
const isYear = (digits: string): boolean => digits.length === 4 && Number(digits) >= 1990 && Number(digits) <= 2100;

/** Mã đề trong tên file: "Mã đề 101.docx", "MD102.pdf", "De_103.docx", "Toan10 GK1 2026 - 104.docx". */
export const codeFromFileName = (fileName: string): string | null => {
  const name = nfc(fileName).replace(/\.[a-z0-9]{2,5}$/iu, '');
  const header = [...name.matchAll(CODE_HEADER)].map(match => match[1]);
  if (header.length === 1) return header[0];
  const prefixed = [...name.matchAll(/(?:^|[^a-zà-ỹ])(?:m(?:ã|a)(?:\s*(?:đề|de))?|md|đề|de)[\s_\-.]*(\d{3,4})(?!\d)/giu)].map(match => match[1]);
  if (new Set(prefixed).size === 1) return prefixed[0];
  const bare = [...new Set([...name.matchAll(/(?<!\d)(\d{3,4})(?!\d)/gu)].map(match => match[1]).filter(digits => !isYear(digits)))];
  return bare.length === 1 ? bare[0] : null;
};

/**
 * Dòng mở đầu phần đáp án: cả dòng chỉ là tiêu đề ("BẢNG ĐÁP ÁN", "ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM", "ĐÁP ÁN MÃ ĐỀ 102").
 * "Đáp án: B" ngay dưới một câu hỏi KHÔNG phải tiêu đề — nếu không, đề bị cắt cụt sau câu đầu tiên.
 */
const ANSWER_HEADING = /^[\s\-–•*#]*(?:phần\s+)?(?:bảng\s+)?(?:đáp\s*án|hướng\s*dẫn\s*chấm)(?:\s+(?:và\s+)?(?:hướng\s*dẫn\s*chấm|thang\s*điểm|biểu\s*điểm|chi\s*tiết|tham\s*khảo|chính\s*thức|các\s*mã\s*đề|đề\s*kiểm\s*tra.*|đề\s*thi.*|mã\s*đề.*|phần.*|môn.*|toán.*))*\s*[:.]?\s*$/iu;

interface Block { code: string | null; text: string; answerOnly: boolean }

/** Câu hỏi đầu tiên của một đề ("Câu 1.", "Câu 1:", "PHẦN I") — không tính hàng bảng ("Câu 1 | A | C"). */
const EXAM_START = /^\s*(?:(?:câu|bài)\s*1\s*[.:)(]|phần\s+(?:i|1)\b)/iu;

/** Hàng bảng đáp án ("Mã đề 1201 | A | C | B | D …"): nhiều ô, đa số ô rất ngắn. Hàng đầu đề 2 cột thì không. */
const isAnswerRow = (line: string): boolean => {
  const cells = line.split('|').map(cell => cell.trim()).filter(Boolean);
  return cells.length >= 4 && cells.filter(cell => cell.length <= 4).length >= cells.length * 0.6;
};

/** Sau một tiêu đề đáp án, dòng "Mã đề X" chỉ mở đề MỚI khi ngay sau nó là câu hỏi; nếu không, đó là một hàng đáp án. */
const opensExam = (lines: readonly string[], index: number): boolean =>
  lines.slice(index + 1, index + 26).some(line => !line.includes('|') && EXAM_START.test(line));

/**
 * Cắt chữ của MỘT file thành các khối theo dòng "Mã đề …"; khối liền nhau cùng mã được gộp (mã in lại đầu mỗi trang).
 * Phần đầu trang trước dòng mã đầu tiên (tên trường, tên kì kiểm tra) thuộc về đề đầu tiên.
 */
const blocksOf = (text: string, fileCode: string | null): Block[] => {
  const lines = nfc(text).split(/\r?\n/u);
  const blocks: Block[] = [];
  let current: Block = { code: fileCode, text: '', answerOnly: false };
  const open = (next: Block) => {
    // Phần mở đầu chưa có mã → nhập vào đề đầu tiên thay vì đứng riêng.
    if (current.code === null && !current.answerOnly && !next.answerOnly) next.text = current.text;
    else if (current.text.trim()) blocks.push(current);
    current = next;
  };
  lines.forEach((line, index) => {
    const codes = [...new Set([...line.matchAll(CODE_HEADER)].map(match => match[1]))];
    // Một dòng nêu ≥ 2 mã là hàng tiêu đề của bảng đáp án, không phải chỗ bắt đầu một đề.
    const lineCode = codes.length === 1 && !isAnswerRow(line) ? codes[0] : null;
    const heading = ANSWER_HEADING.test(line.trim());
    if (heading && (!current.answerOnly || (lineCode && lineCode !== current.code))) {
      open({ code: lineCode ?? current.code, text: '', answerOnly: true });
    } else if (lineCode && !heading && (lineCode !== current.code || current.answerOnly)) {
      if (!current.answerOnly || opensExam(lines, index)) open({ code: lineCode, text: '', answerOnly: false });
    }
    current.text += `${line}\n`;
  });
  if (current.text.trim()) blocks.push(current);
  return blocks;
};

/** Tên file cho biết đây là file đáp án ("Đáp án mã 101.docx", "HDC.pdf") → cả file là tư liệu đáp án. */
const ANSWER_FILE = /(?:đáp\s*án|dap\s*an|hướng\s*dẫn\s*chấm|huong\s*dan\s*cham|(?:^|[^a-z])hdc(?:[^a-z]|$))/iu;

const clip = (value: string, max: number): string => (value.length > max ? value.slice(0, max) : value);

/**
 * Các file giáo viên thả vào → đề của từng mã + tư liệu đáp án.
 * File gộp: tách theo dòng "Mã đề …". File rời: mã lấy từ tên file, không có thì từ dòng "Mã đề" duy nhất trong file.
 * File không có mã nào (vd "Đáp án.docx") → cả file là tư liệu đáp án.
 */
export const splitVariantSources = (files: readonly VariantSourceFile[]): VariantPlan => {
  const warnings: string[] = [];
  const byCode = new Map<string, VariantDraft>();
  const material: string[] = [];
  const loose: { file: string; text: string }[] = [];
  for (const file of files) {
    const text = nfc(file.text || '').trim();
    if (!text) {
      warnings.push(`${file.name}: không có chữ (bản scan hoặc ảnh) — dùng file Word/PDF gốc của người ra đề.`);
      continue;
    }
    const inText = [...new Set([...text.matchAll(CODE_HEADER)].map(match => match[1]))];
    const fileCode = codeFromFileName(file.name) ?? (inText.length === 1 ? inText[0] : null);
    const blocks = ANSWER_FILE.test(nfc(file.name))
      ? [{ code: fileCode, text, answerOnly: true }]
      : blocksOf(text, fileCode);
    for (const block of blocks) {
      if (!block.answerOnly && !block.code) {
        // Đề không ghi mã: giữ riêng — nếu cả đợt chỉ có MỘT đề như vậy thì đó là đề duy nhất (xem bên dưới).
        loose.push({ file: file.name, text: block.text.trim() });
        continue;
      }
      if (block.answerOnly || !block.code) {
        material.push(`--- ${block.code ? `Phần đáp án nằm sau đề mã ${block.code}` : 'Phần không ghi mã đề'} (file "${file.name}") ---\n${block.text.trim()}`);
        continue;
      }
      const draft = byCode.get(block.code) ?? { code: block.code, sourceText: '', files: [] };
      draft.sourceText = `${draft.sourceText}${draft.sourceText ? '\n' : ''}${block.text.trim()}`;
      if (!draft.files.includes(file.name)) draft.files.push(file.name);
      byCode.set(block.code, draft);
    }
  }
  // Một đề duy nhất, không có mã đề: không bắt giáo viên đặt mã — coi là đề số 1 (chỉ một mã nên chấm khỏi đọc mã trên ảnh).
  if (byCode.size === 0 && loose.length === 1) {
    byCode.set(SINGLE_VARIANT_CODE, { code: SINGLE_VARIANT_CODE, sourceText: loose[0].text, files: [loose[0].file] });
  } else {
    for (const item of loose) material.push(`--- Phần không ghi mã đề (file "${item.file}") ---\n${item.text}`);
  }
  const variants = [...byCode.values()]
    .sort((left, right) => left.code.localeCompare(right.code, 'vi', { numeric: true }))
    .map(variant => {
      if (variant.sourceText.length > MAX_VARIANT_SOURCE_CHARS) warnings.push(`Đề mã ${variant.code} quá dài, chỉ giữ ${MAX_VARIANT_SOURCE_CHARS.toLocaleString('vi-VN')} ký tự đầu.`);
      return { ...variant, sourceText: clip(variant.sourceText, MAX_VARIANT_SOURCE_CHARS) };
    });
  if (variants.length === 0 && files.length > 0) {
    warnings.push('Không nhận ra mã đề nào. Đặt tên file theo mã (vd "Mã đề 101.docx") hoặc kiểm tra file có dòng "Mã đề …".');
  }
  if (variants.length > MAX_EXAM_VARIANTS) warnings.push(`Chỉ nhận tối đa ${MAX_EXAM_VARIANTS} mã đề.`);
  const answerMaterial = material.join('\n\n');
  if (!answerMaterial.trim() && variants.length > 0) warnings.push('Không thấy phần ĐÁP ÁN trong các file — dán đáp án vào từng mã trước khi giao.');
  return { variants: variants.slice(0, MAX_EXAM_VARIANTS), answerMaterial: clip(answerMaterial, MAX_ANSWER_MATERIAL_CHARS), warnings };
};

// ── Đáp án ────────────────────────────────────────────────────────────────────

const QUESTION_LINE = /^\s*(?:phần\s+[ivx\d]+\s*[-–—.:]\s*)?(?:câu|bài)\s*\d+/iu;

/** Số câu trong một đáp án chuẩn hoá (mỗi câu một dòng "Câu N: …" / "Phần II – Câu N: …"). */
export const countKeyQuestions = (answerKey: string): number =>
  answerKey.split(/\r?\n/u).filter(line => QUESTION_LINE.test(line)).length;

/**
 * Đáp án đã soạn sẵn đúng khuôn (mỗi câu một dòng "Phần I – Câu 1: A") thì dùng thẳng, khỏi nhờ AI chép lại — AI chép là
 * cơ hội để một câu bị đổi chữ. Phần mở đầu (tên, thang điểm) bỏ; dòng nối của một câu tự luận ghép vào câu đó.
 * Chưa đủ `MIN_DIRECT_KEY_QUESTIONS` câu → null (tư liệu là bảng/văn xuôi, để AI đọc).
 */
export const MIN_DIRECT_KEY_QUESTIONS = 5;
export const keyFromMaterial = (material: string): string | null => {
  const entries: string[] = [];
  for (const raw of material.split(/\r?\n/u)) {
    const line = raw.trim();
    if (!line || line.startsWith('---')) continue;
    if (QUESTION_LINE.test(line)) entries.push(line);
    else if (entries.length > 0 && !line.includes('|')) entries[entries.length - 1] += `\n${line}`;
  }
  return entries.length >= MIN_DIRECT_KEY_QUESTIONS ? clip(entries.join('\n'), MAX_VARIANT_KEY_CHARS) : null;
};

const CODE_ID = /^[0-9A-Za-z]{1,8}$/u;

/** Máy chủ kiểm danh sách mã đề giáo viên gửi lên: mã hợp lệ, không trùng, độ dài chặn trên. */
export const sanitizeExamVariants = (raw: unknown): ExamVariant[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const variants: ExamVariant[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const code = String(record.code ?? '').trim();
    if (!CODE_ID.test(code) || seen.has(code)) continue;
    const answerKey = typeof record.answerKey === 'string' ? clip(record.answerKey.trim(), MAX_VARIANT_KEY_CHARS) : '';
    const sourceText = typeof record.sourceText === 'string' ? clip(record.sourceText.trim(), MAX_VARIANT_SOURCE_CHARS) : '';
    if (!answerKey && !sourceText) continue;
    seen.add(code);
    variants.push({ code, sourceText, answerKey });
    if (variants.length >= MAX_EXAM_VARIANTS) break;
  }
  return variants;
};

/** Câu lệnh rút đáp án của TỪNG mã từ tư liệu đáp án (bảng các mã, đáp án sau mỗi đề, hướng dẫn chấm). */
export const buildExtractVariantKeysPrompt = (codes: readonly string[], answerMaterial: string, questionHints: Readonly<Record<string, string>> = {}): string => [
  'Bạn đọc TƯ LIỆU ĐÁP ÁN của một bài kiểm tra Toán có nhiều mã đề (người ra đề soạn sẵn). Chép lại đáp án của TỪNG mã.',
  `Các mã đề: ${codes.join(', ')}.`,
  '',
  'Cách đọc:',
  '- Bảng đáp án có các cột là mã đề (hàng tiêu đề kiểu "Câu | 101 | 102 | …"): mỗi hàng là một câu, đọc đúng CỘT của từng mã.',
  '- Tư liệu được cắt theo nguồn, mỗi đoạn có nhãn "--- … ---". Đoạn "nằm sau đề mã X" thường là đáp án của mã X, trừ khi nó là bảng nhiều mã.',
  '- Chỉ chép, KHÔNG tự giải. Mã nào không tìm thấy đáp án thì để chuỗi rỗng. Không bịa câu.',
  '',
  'Định dạng mỗi mã — mỗi câu MỘT dòng, giữ đúng nhãn câu như trong đề:',
  '- Đề chia Phần I/II/III mà số câu đánh lại từ đầu mỗi phần: ghi "Phần I – Câu 1: A", "Phần II – Câu 1: a) Đ; b) S; c) Đ; d) S", "Phần III – Câu 1: -1,5".',
  '- Trắc nghiệm: một chữ cái in hoa. Đúng/Sai: "a) Đ; b) S; c) Đ; d) S". Trả lời ngắn: chỉ con số (dấu phẩy thập phân).',
  '- Tự luận: "Câu 1 (tự luận, 1 điểm): <các bước và điểm từng bước, ngắn gọn>". Giữ công thức bằng LaTeX trong $...$.',
  '',
  'Trả về DUY NHẤT JSON: {"maDe": [{"ma": "101", "dapAn": "Phần I – Câu 1: A\\nPhần I – Câu 2: C\\n…"}]}',
  'Trong chuỗi JSON nhân đôi mọi dấu gạch chéo ngược.',
  ...(Object.keys(questionHints).length > 0
    ? ['', 'Dòng đầu đề của từng mã (để đối chiếu nhãn câu):', ...Object.entries(questionHints).map(([code, hint]) => `- ${code}: ${hint}`)]
    : []),
  '',
  'TƯ LIỆU ĐÁP ÁN:',
  answerMaterial,
].join('\n');

/** Đọc kết quả AI rút đáp án; chỉ nhận mã có trong danh sách. */
export const parseExtractedVariantKeys = (raw: string, codes: readonly string[]): Record<string, string> => {
  const known = new Set(codes);
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return {};
  }
  const rows = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>).maDe : null;
  const keys: Record<string, string> = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== 'object') continue;
    const code = String((row as Record<string, unknown>).ma ?? '').trim();
    const answer = (row as Record<string, unknown>).dapAn;
    if (known.has(code) && typeof answer === 'string' && answer.trim()) keys[code] = clip(answer.trim(), MAX_VARIANT_KEY_CHARS);
  }
  return keys;
};

// ── Đọc mã đề trên ảnh bài làm ───────────────────────────────────────────────

export const buildDetectExamCodePrompt = (codes: readonly string[]): string => [
  'Các ảnh là bài kiểm tra Toán của MỘT học sinh (có thể đã được giáo viên chấm bằng bút đỏ).',
  'Việc DUY NHẤT: đọc MÃ ĐỀ của bài — thường in ở đầu đề ("Mã đề 101"), hoặc học sinh ghi / tô ở ô "Mã đề" trên phiếu trả lời.',
  `Mã đề phải là MỘT trong các mã: ${codes.join(', ')}.`,
  'Không thấy rõ, hoặc thấy mã ngoài danh sách, hoặc thấy hai mã khác nhau → trả null. Tuyệt đối không đoán.',
  'Trả về DUY NHẤT JSON: {"maDe": "101"} hoặc {"maDe": null}',
].join('\n');

export const parseDetectedExamCode = (raw: string, codes: readonly string[]): string | null => {
  const match = raw.match(/"maDe"\s*:\s*"([^"]+)"/u);
  const code = match?.[1]?.trim() ?? '';
  return codes.includes(code) ? code : null;
};

// ── Đối chiếu với điểm giáo viên chấm tay (sổ điểm) ──────────────────────────

/** Tổng điểm AI chấm lại lệch điểm giáo viên quá ngần này (thang 10) thì không tự duyệt, giáo viên soát. */
export const EXAM_CHECK_TOLERANCE = 0.5;

const sameLabel = (left: string, right: string): boolean =>
  nfc(left).replace(/\s+/gu, ' ').trim().toLocaleLowerCase('vi-VN') === nfc(right).replace(/\s+/gu, ' ').trim().toLocaleLowerCase('vi-VN');

/** Tên các cột điểm thi có trong sổ điểm của lớp (không trùng, theo thứ tự gặp) — để giáo viên chọn. */
export const examMarkLabels = (exams: Readonly<Record<string, StudentExamScores>>): string[] => {
  const labels: string[] = [];
  for (const scores of Object.values(exams)) {
    for (const mark of [...(scores?.moet ?? []), ...(scores?.tds ?? [])]) {
      if (mark?.label && !labels.some(label => sameLabel(label, mark.label))) labels.push(mark.label);
    }
  }
  return labels;
};

/**
 * So tổng điểm AI với điểm giáo viên ở cột `sheetLabel` của sổ điểm, quy cùng thang 10.
 * Chưa có điểm giáo viên, hoặc cột đó không theo thang 10 → không đối chiếu được (null), KHÔNG coi là lệch.
 */
export const examScoreCheck = (
  score: number,
  maxScore: number,
  sheetLabel: string | undefined,
  marks: StudentExamScores | null | undefined,
): ExamScoreCheck | null => {
  if (!sheetLabel || !marks || !(maxScore > 0) || !Number.isFinite(score)) return null;
  const mark = [...marks.moet, ...marks.tds].find(item => sameLabel(item.label, sheetLabel));
  if (!mark || !(mark.score >= 0 && mark.score <= 10)) return null;
  const diff = Math.round(Math.abs((score / maxScore) * 10 - mark.score) * 100) / 100;
  return { sheetLabel: mark.label, sheetScore: mark.score, diff, mismatch: diff > EXAM_CHECK_TOLERANCE };
};
