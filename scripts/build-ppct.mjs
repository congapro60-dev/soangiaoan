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

/**
 * Gom các tiết liên tiếp cùng một bài thành nhóm, RỒI trải lại thành từng tiết.
 *
 * Đơn vị chọn phải là TIẾT vì giáo án soạn theo từng tiết. Nhưng vẫn phải gom nhóm trước, vì
 * hai thứ chỉ đúng ở mức bài: tên bài (ô gộp trong Excel) và ô "Yêu cầu cần đạt" của bản PDF
 * MOET (ô gộp trải nhiều tiết, cắt theo tiết thì đứt giữa câu).
 */
const buildLessons = (rows, source, grade) => {
  const groups = [];
  for (const row of rows) {
    const name = baseName(row.title) || groups.at(-1)?.title;
    if (!name) continue;
    const last = groups.at(-1);
    const continues = last
      && last.title === name
      && (row.subject ? last.subject === row.subject : true)
      && (row.periodNo === null || last.rows.at(-1).periodNo === null || row.periodNo === last.rows.at(-1).periodNo + 1);

    if (continues) last.rows.push(row);
    else groups.push({ title: name, subject: row.subject ?? '', rows: [row] });
  }

  const lessons = [];
  let counter = 0;
  for (const group of groups) {
    const periods = group.rows.map(r => r.periodNo).filter(p => p !== null);
    const weeks = [...new Set(group.rows.map(r => r.week).filter(Boolean))].sort((a, b) => a - b);
    // Mục tiêu mức bài: MOET luôn dùng bản gộp; TDS THCS ghi mục tiêu riêng từng tiết nên giữ nguyên.
    const groupObjectives = group.rows.map(r => r.objectives).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

    group.rows.forEach((row, index) => {
      counter += 1;
      lessons.push({
        id: `${source.toLowerCase()}-g${grade}-${counter}`,
        title: group.title,
        subject: group.subject,
        isElective: Boolean(row.isElective),
        week: row.week ?? weeks[0] ?? null,
        weeks,
        periodNo: row.periodNo,
        periodIndex: index + 1,
        periodCount: group.rows.length,
        lessonPeriods: periods,
        detail: row.detail ?? '',
        objectives: source === 'MOET' ? groupObjectives : (row.objectives || groupObjectives),
        notes: row.notes ?? '',
      });
    });
  }
  return lessons;
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

    // Dòng "Tự chọn / Teacher's choice" có số tiết nhưng không ghi tên bài — trường để giáo viên
    // tự quyết dạy gì. Vẫn phải đưa vào danh sách, đánh dấu riêng để giáo viên tự điền nội dung.
    const { title, detail } = splitTitle(row[cols.title]);
    const rawPeriod = clean(row[cols.period]);
    const isElective = !title && /tự chọn|teacher/i.test(subject) && /^\d+$/.test(rawPeriod);
    if (!title && !isElective) continue;

    // Ô số tiết trống phải ra null, không phải 0 — Number('') là 0 nên các bài không đánh
    // số tiết (hoạt động dự án, bài tập hè) sẽ cùng mang số 0 và nhìn như bị trùng.
    out.push({
      week,
      periodNo: /^\d+$/.test(rawPeriod) ? Number(rawPeriod) : null,
      subject: isElective ? '' : subject,
      title: isElective ? 'Tiết tự chọn' : title,
      isElective,
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

/**
 * Số trang in ở chân trang cũng là số và cũng nằm trong dải cột Tuần, nếu không loại thì nó bị
 * đọc thành nhãn tuần. Nhưng KHÔNG được cắt theo chiều dọc cho mọi cột: hàng cuối của bảng nằm
 * đúng y=76, cùng độ cao với số trang (tiết 80, 122, 135 của khối 10). Tách bằng chiều ngang —
 * chỉ bỏ ô ở chân trang khi nó nằm trong dải cột Tuần.
 */
const MOET_FOOTER_Y = 82;

const parseMoetPdf = async (file) => {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(file)), useSystemFonts: true }).promise;
  const out = [];
  const weekLabels = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const items = (await page.getTextContent()).items.filter(i => i.str.trim());

    // Trang bìa có bảng thiết bị và phòng học, cột "Số lượng" chứa số 01 nằm đúng dải toạ độ
    // của cột Tiết. Bỏ qua mọi thứ nằm TRÊN dòng tiêu đề "Bài học", nếu không cả trang bìa bị
    // nuốt thành một bài học khổng lồ.
    const tableHeader = items.find(i => i.str.trim() === 'Bài học');
    const headerY = tableHeader ? tableHeader.transform[5] : Infinity;

    // Chặn đầu dưới: ngay sau bảng phân phối là mục "2. Kiểm tra, đánh giá định kỳ".
    // Không chặn thì hàng tiết cuối cùng nuốt trọn bảng đó (tiết 175 từng dài 579 ký tự).
    const endMarker = items.find(i => /^2\.\s*Ki[eể]m tra|^Th[oờ]i gian$/i.test(i.str.trim()));
    const floorY = endMarker ? endMarker.transform[5] : -Infinity;

    const cells = items
      .filter(i => !MOET_HEADER_NOISE.test(i.str.trim()) && i.transform[5] < headerY && i.transform[5] > floorY)
      .map(i => ({ band: bandOf(i.transform[4]), x: i.transform[4], y: i.transform[5], s: i.str }))
      .filter(c => !(c.band === 'week' && c.y <= MOET_FOOTER_Y));

    // Mỗi số tiết neo một hàng của bảng; ranh giới hàng là trung điểm giữa hai số tiết liền nhau.
    const periods = cells.filter(c => c.band === 'period' && /^\d+$/.test(c.s.trim())).sort((a, b) => b.y - a.y);
    if (!periods.length) continue;
    // Nhãn tuần chỉ dùng để ĐỐI CHIẾU, không dùng để gán: nó được căn giữa ô gộp nên rơi vào
    // giữa nhóm tiết chứ không nằm ở tiết đầu, đọc theo vị trí là tuần nhảy lung tung.
    for (const c of cells.filter(c => c.band === 'week' && /^\d+$/.test(c.s.trim()))) {
      weekLabels.push({ n: Number(c.s.trim()), y: c.y, page: p });
    }

    for (let i = 0; i < periods.length; i++) {
      const top = i === 0 ? Infinity : (periods[i - 1].y + periods[i].y) / 2;
      const bottom = i === periods.length - 1 ? -Infinity : (periods[i].y + periods[i + 1].y) / 2;
      const inRow = c => c.y < top && c.y >= bottom;

      const pick = band => cells.filter(c => c.band === band && inRow(c))
        .sort((a, b) => (Math.abs(a.y - b.y) > 2 ? b.y - a.y : a.x - b.x))
        .map(c => c.s).join(' ').replace(/\s+/g, ' ').trim();

      out.push({
        page: p,
        y: periods[i].y,
        week: null,
        periodNo: Number(periods[i].s.trim()),
        subject: '',
        title: pick('title'),
        detail: '',
        objectives: pick('req'),
        notes: '',
      });
    }
  }

  // Gán tuần bằng công thức, KHÔNG bằng vị trí nhãn. Định mức suy ra từ chính tài liệu:
  // tổng số tiết chia cho số tuần lớn nhất mà tài liệu ghi.
  const maxWeek = Math.max(...weekLabels.map(l => l.n));
  const perWeek = Math.round(out.length / maxWeek);

  // Đối chiếu: mỗi nhãn tuần phải nằm trong khoảng dọc của nhóm tiết mà công thức gán cho nó.
  // Năm sau trường đổi định mức tiết/tuần thì phép kiểm này gãy ngay, thay vì sai âm thầm.
  const lech = [];
  let boQua = 0;
  for (const label of weekLabels) {
    const nhom = out.filter(r => r.page === label.page && Math.ceil(r.periodNo / perWeek) === label.n);
    // Nhãn của tuần vắt qua hai trang: nhóm tiết của nó nằm hết ở trang sau, không đối chiếu được.
    if (!nhom.length) { boQua += 1; continue; }
    const top = Math.max(...nhom.map(r => r.y));
    const bottom = Math.min(...nhom.map(r => r.y));
    // Nhóm bị cắt ngang trang: nhãn căn giữa cho cả nhóm nên lệch khỏi phần còn thấy được.
    const dungSai = nhom.length < perWeek ? 30 : 6;
    if (label.y > top + dungSai || label.y < bottom - dungSai) {
      lech.push(`tuần ${label.n} (trang ${label.page}, y=${Math.round(label.y)}, nhóm tiết y=${Math.round(bottom)}..${Math.round(top)})`);
    }
  }
  if (lech.length) {
    throw new Error(
      `${file}: ${lech.length}/${weekLabels.length} nhãn tuần không khớp công thức tuần = ceil(tiết/${perWeek}): ` +
      `${lech.join('; ')}. Cấu trúc PPCT đã đổi — đọc lại tài liệu trước khi sửa script.`,
    );
  }
  if (boQua > 3) {
    throw new Error(`${file}: ${boQua} nhãn tuần không đối chiếu được — bố cục file đã khác, kiểm lại.`);
  }

  // Kết quả phải chia đều: mỗi tuần đúng `perWeek` tiết, trừ tuần cuối có thể thiếu.
  const soTiet = {};
  for (const row of out) {
    const w = Math.ceil(row.periodNo / perWeek);
    soTiet[w] = (soTiet[w] ?? 0) + 1;
  }
  const tuanLe = Object.entries(soTiet).filter(([w, n]) => n !== perWeek && Number(w) !== maxWeek);
  if (tuanLe.length) {
    const coTiet = new Set(out.map(r => r.periodNo));
    const thieu = [];
    for (let n = 1; n <= perWeek * maxWeek; n++) if (!coTiet.has(n)) thieu.push(n);
    throw new Error(
      `${file}: tuần ${tuanLe.map(([w, n]) => `${w} có ${n} tiết`).join(', ')} — không đúng ${perWeek} tiết/tuần. ` +
      `Thiếu tiết: ${thieu.join(', ') || 'không'} (đọc được ${out.length} hàng).`,
    );
  }

  return out.map(({ page: _page, y: _y, ...row }) => ({ ...row, week: Math.ceil(row.periodNo / perWeek) }));
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
  const weeks = new Set(lessons.map(l => l.week).filter(Boolean));
  summary.push({
    nguồn: source,
    khối: grade,
    tiết: lessons.length,
    bài: new Set(lessons.map(l => `${l.title}|${l.lessonPeriods[0]}`)).size,
    tuần: `1→${Math.max(...weeks)}`,
    'thiếu mục tiêu': lessons.filter(l => !l.objectives).length,
  });
};

const tdsBook = XLSX.readFile(join(SRC_DIR, 'PPCT THCS-THPT 26-27.xlsx'));
for (const [grade, sheetName] of Object.entries(TDS_SHEETS)) {
  const sheet = tdsBook.Sheets[sheetName];
  if (!sheet) throw new Error(`Thiếu sheet "${sheetName}"`);
  write('TDS', grade, buildLessons(parseTdsSheet(sheet, grade), 'TDS', grade), 'Discover');
}

for (const grade of [10, 11, 12]) {
  const rows = await parseMoetPdf(join(SRC_DIR, 'Moet', `26-27 Phân phối chương trình toán ${grade}.pdf`));
  const lessons = buildLessons(rows, 'MOET', grade).map(l => ({ ...l, objectives: trimLeadingFragment(l.objectives) }));
  write('MOET', grade, lessons, 'Chuẩn Bộ GD&ĐT');
}

console.table(summary);
