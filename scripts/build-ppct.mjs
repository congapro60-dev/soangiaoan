/**
 * Chuyển phân phối chương trình thành JSON đóng sẵn trong app.
 *
 *   node scripts/build-ppct.mjs
 *
 * Hai nguồn, hai định dạng:
 *   TDS  — "PPCT THCS-THPT 26-27.xlsx", hệ Discover, khối 6→12 (mỗi khối một sheet).
 *   MOET — "Moet/26-27 Phân phối chương trình toán <lớp>.pdf", khối 10→12 (bảng 4 cột).
 *
 * Cả hai gộp về CÙNG một hình dạng, đơn vị là BÀI (không phải tiết): một giáo án ứng với
 * một bài dạy trong 1–3 tiết. Gộp theo bài còn né được chỗ dữ liệu yếu nhất của bản PDF —
 * ô "Yêu cầu cần đạt" là ô gộp trải trên nhiều tiết, cắt theo tiết thì đứt giữa câu.
 *
 * Mỗi khối một file để Vite tách chunk, app chỉ tải khối đang soạn.
 * Chạy lại khi trường phát hành PPCT năm mới.
 */
import XLSX from 'xlsx';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'Phan phoi va unit plan');
const OUT_DIR = join(ROOT, 'src', 'data', 'ppct');

const clean = v => (v === null || v === undefined ? '' : String(v).replace(/\r/g, '').trim());

/** "Mệnh đề (tiết 2)", "Tập hợp (tiếp)" → "Mệnh đề", "Tập hợp" */
const baseName = t => clean(t)
  .replace(/\s*\(\s*ti[êế]p\s*(theo)?\s*\d*\s*\)/gi, '')
  .replace(/\s*\(\s*ti[êế]t\s*\d+\s*\)/gi, '')
  .replace(/\s*\(\s*ti[êế]p\s*\d+\s*\)/gi, '')
  .replace(/\s+/g, ' ')
  .trim();

/** Gộp các tiết liên tiếp cùng một bài thành một mục để soạn. */
const groupLessons = (rows, source, grade) => {
  const groups = [];
  for (const row of rows) {
    const name = baseName(row.title) || groups.at(-1)?.title;
    if (!name) continue;
    const last = groups.at(-1);
    const continues = last
      && last.title === name
      && (row.subject ? last.subject === row.subject : true)
      && (row.periodNo === null || last.periods.at(-1) === null || row.periodNo === last.periods.at(-1) + 1);

    if (continues) {
      last.periods.push(row.periodNo);
      last.weeks.add(row.week);
      if (row.detail) last.details.push(row.detail);
      if (row.objectives) last.objectiveParts.push(row.objectives);
      if (row.notes && !last.notes.includes(row.notes)) last.notes.push(row.notes);
    } else {
      groups.push({
        title: name,
        subject: row.subject ?? '',
        periods: [row.periodNo],
        weeks: new Set([row.week]),
        details: row.detail ? [row.detail] : [],
        objectiveParts: row.objectives ? [row.objectives] : [],
        notes: row.notes ? [row.notes] : [],
      });
    }
  }

  return groups.map((g, i) => {
    const weeks = [...g.weeks].filter(w => w !== null && w !== undefined).sort((a, b) => a - b);
    return {
      id: `${source.toLowerCase()}-g${grade}-${i + 1}`,
      title: g.title,
      subject: g.subject,
      weeks,
      week: weeks[0] ?? null,
      periods: g.periods.filter(p => p !== null),
      periodCount: g.periods.length,
      detail: g.details.join('\n'),
      objectives: g.objectiveParts.join(' ').replace(/\s+/g, ' ').trim(),
      notes: g.notes.join(' · '),
    };
  });
};

// ───────────────────────────── TDS (xlsx) ─────────────────────────────

const TDS_SHEETS = { 6: 'G6_DisAdvDGS', 7: 'G7_DisAdvDGS', 8: 'G8_DisAdvDGS', 9: 'G9_DisDGS', 10: 'G10', 11: 'G11', 12: 'G12' };

/** THCS ghi "Phân môn" bằng mã tiết (SH21, HH9, ĐS3) chứ không phải tên phân môn. */
const SUBJECT_BY_CODE = { SH: 'Số học', HH: 'Hình học', ĐS: 'Đại số', DS: 'Đại số', TK: 'Thống kê - Xác suất' };
const subjectFromCode = code => {
  const prefix = clean(code).match(/^([A-ZĐ]+)/i)?.[1]?.toUpperCase();
  return (prefix && SUBJECT_BY_CODE[prefix]) || '';
};

/** Ô "Tên bài" của THPT gộp tên bài và nội dung từng tiết, tách bằng xuống dòng. */
const splitTitle = raw => {
  const lines = clean(raw).split('\n').map(l => l.trim()).filter(Boolean);
  return { title: lines[0] ?? '', detail: lines.slice(1).join('\n') };
};

const parseTdsSheet = (sheet, grade) => {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  const headerIdx = rows.findIndex(r => r.some(c => typeof c === 'string' && c.includes('Tuần')));
  if (headerIdx < 0) throw new Error(`TDS khối ${grade}: không tìm thấy dòng tiêu đề`);

  const discoverCol = rows[headerIdx].findIndex(c => typeof c === 'string' && /Discover/i.test(c));
  if (discoverCol < 0) throw new Error(`TDS khối ${grade}: không tìm thấy cột hệ Discover`);

  // THCS có thêm dòng tiêu đề phụ: Số tiết | Phân môn | Tên bài | Mục tiêu bài học
  const isThcs = (rows[headerIdx + 1] ?? []).some(c => typeof c === 'string' && c.trim() === 'Số tiết');
  const cols = isThcs
    ? { period: discoverCol, code: discoverCol + 1, title: discoverCol + 2, objectives: discoverCol + 3, notes: 2 }
    : { period: discoverCol, subject: 2, title: discoverCol + 1, objectives: -1, notes: 7 };

  const out = [];
  let week = null;
  let subject = '';

  for (const row of rows.slice(headerIdx + (isThcs ? 2 : 1))) {
    // Cột Tuần và Môn dùng ô gộp — chỉ ghi ở dòng đầu của nhóm, phải kéo xuống.
    const rawWeek = Number(clean(row[1]).match(/^(\d+)/)?.[1] ?? NaN);
    if (Number.isInteger(rawWeek) && rawWeek > 0 && rawWeek <= 45) week = rawWeek;

    const code = isThcs ? clean(row[cols.code]) : '';
    if (isThcs) {
      subject = subjectFromCode(code) || subject;
    } else {
      const rawSubject = clean(row[cols.subject]);
      if (rawSubject) subject = rawSubject.split('\n')[0].trim();
    }

    // Dòng "Tự chọn / Teacher's choice" có số tiết nhưng không có tên bài — không phải bài để soạn.
    const { title, detail } = splitTitle(row[cols.title]);
    if (!title) continue;

    // Ô số tiết trống phải ra null, không phải 0 — Number('') là 0 nên các bài không đánh
    // số tiết (hoạt động dự án, bài tập hè) sẽ cùng mang số 0 và nhìn như bị trùng.
    const rawPeriod = clean(row[cols.period]);
    out.push({
      week,
      periodNo: /^\d+$/.test(rawPeriod) ? Number(rawPeriod) : null,
      subject,
      title,
      detail,
      objectives: cols.objectives >= 0 ? clean(row[cols.objectives]) : '',
      notes: clean(row[cols.notes]),
    });
  }
  return out;
};

// ───────────────────────────── MOET (pdf) ─────────────────────────────

// Bốn cột của bảng nằm ở các dải toạ độ x ổn định trên mọi trang.
const MOET_BAND = { week: [0, 170], period: [170, 195], title: [195, 390], req: [390, Infinity] };
const bandOf = x => Object.keys(MOET_BAND).find(k => x >= MOET_BAND[k][0] && x < MOET_BAND[k][1]);
const MOET_HEADER_NOISE = /^(Tuần|Tiết|Bài học|Yêu cầu cần đạt|\(\d\))$/;

const parseMoetPdf = async (file) => {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(file)), useSystemFonts: true }).promise;
  const out = [];
  let week = null;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const cells = (await page.getTextContent()).items
      .filter(i => i.str.trim() && !MOET_HEADER_NOISE.test(i.str.trim()))
      .map(i => ({ band: bandOf(i.transform[4]), x: i.transform[4], y: i.transform[5], s: i.str }));

    // Mỗi số tiết neo một hàng của bảng; ranh giới hàng là trung điểm giữa hai số tiết liền nhau.
    const periods = cells.filter(c => c.band === 'period' && /^\d+$/.test(c.s.trim())).sort((a, b) => b.y - a.y);
    if (!periods.length) continue;
    const weeks = cells.filter(c => c.band === 'week' && /^\d+$/.test(c.s.trim())).sort((a, b) => b.y - a.y);

    for (let i = 0; i < periods.length; i++) {
      const top = i === 0 ? Infinity : (periods[i - 1].y + periods[i].y) / 2;
      const bottom = i === periods.length - 1 ? -Infinity : (periods[i].y + periods[i + 1].y) / 2;
      const inRow = c => c.y < top && c.y >= bottom;

      const weekCell = weeks.find(inRow);
      if (weekCell) week = Number(weekCell.s.trim());

      const pick = band => cells.filter(c => c.band === band && inRow(c))
        .sort((a, b) => (Math.abs(a.y - b.y) > 2 ? b.y - a.y : a.x - b.x))
        .map(c => c.s).join(' ').replace(/\s+/g, ' ').trim();

      out.push({
        week: week ?? 1,
        periodNo: Number(periods[i].s.trim()),
        subject: '',
        title: pick('title'),
        detail: '',
        objectives: pick('req'),
        notes: '',
      });
    }
  }
  return out;
};

/** Ô yêu cầu gộp nhiều tiết nên đoạn đầu có thể là đuôi của bài trước — cắt tới gạch đầu dòng đầu tiên. */
const trimLeadingFragment = text => {
  if (!text || /^[-•]/.test(text)) return text;
  const idx = text.indexOf('- ');
  return idx > 0 ? text.slice(idx).trim() : text;
};

// ───────────────────────────── chạy ─────────────────────────────

mkdirSync(OUT_DIR, { recursive: true });
const summary = [];

const write = (source, grade, lessons, stream) => {
  writeFileSync(
    join(OUT_DIR, `${source.toLowerCase()}-g${grade}.json`),
    JSON.stringify({ source, grade: Number(grade), stream, lessons }),
    'utf8',
  );
  const weeks = new Set(lessons.flatMap(l => l.weeks));
  summary.push({
    nguồn: source,
    khối: grade,
    bài: lessons.length,
    tiết: lessons.reduce((n, l) => n + l.periodCount, 0),
    tuần: `1→${Math.max(...weeks)}`,
    'thiếu mục tiêu': lessons.filter(l => !l.objectives).length,
  });
};

const tdsBook = XLSX.readFile(join(SRC_DIR, 'PPCT THCS-THPT 26-27.xlsx'));
for (const [grade, sheetName] of Object.entries(TDS_SHEETS)) {
  const sheet = tdsBook.Sheets[sheetName];
  if (!sheet) throw new Error(`Thiếu sheet "${sheetName}"`);
  write('TDS', grade, groupLessons(parseTdsSheet(sheet, grade), 'TDS', grade), 'Discover');
}

for (const grade of [10, 11, 12]) {
  const rows = await parseMoetPdf(join(SRC_DIR, 'Moet', `26-27 Phân phối chương trình toán ${grade}.pdf`));
  const lessons = groupLessons(rows, 'MOET', grade).map(l => ({ ...l, objectives: trimLeadingFragment(l.objectives) }));
  write('MOET', grade, lessons, 'Chuẩn Bộ GD&ĐT');
}

console.table(summary);
