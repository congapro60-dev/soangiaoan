// Phân tích markdown giáo án Toán (do AI sinh NHƯ HIỆN TẠI) thành mô hình có cấu trúc để
// đổ vào template trường. KHÔNG đổi khâu sinh nội dung — chỉ đọc lại nội dung đã sinh.
//
// Bám hợp đồng cấu trúc của TOAN_COMMON_FORMAT: tiêu đề → bảng hành chính → I. THÔNG TIN
// CHUNG (năng lực / mục tiêu / phân hóa / tài liệu) → II. TIẾN TRÌNH (các hoạt động, mỗi
// hoạt động 1 bảng 3 cột) → BTVN → SƠ KẾT. Parser TOLERANT: thiếu phần nào thì để trống,
// mọi bảng 3 cột dưới một heading hoạt động đều được gom.

import { marked } from 'marked';
import type { Token, Tokens } from 'marked';

export interface ActivityRow {
  thoiGian: string;
  gvHs: string;
  noiDung: string;
}

export interface ToanActivity {
  title: string;
  thoiLuong: string;
  rows: ActivityRow[];
}

/** Một khối nội dung trong phiếu. Giữ nguyên loại để dựng lại đúng ở file Word. */
export type PhieuBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'para'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] };

/**
 * Một phiếu học tập trong phụ lục — in ra phát cho học sinh, mỗi phiếu MỘT TRANG riêng.
 * Trước đây parser không có mục cho phụ lục nên toàn bộ phần này bị mất khi xuất Word:
 * tiêu đề phiếu biến mất, bảng nhiệm vụ mất sạch, mấy dòng lẻ rơi nhầm sang mục Sơ kết.
 */
export interface ToanPhieu {
  so: string;
  ten: string;
  /** Dòng phụ dưới tiêu đề: tên bài, tiết, dùng ở hoạt động nào. */
  phuDe: string;
  hoatDong: string;
  khoGiay: 'doc' | 'ngang';
  khoi: PhieuBlock[];
}

export interface ToanLessonModel {
  title: string;
  header: {
    lop: string;
    tenBai: string;
    mon: string;
    giaoVien: string;
    tuan: string;
    namHoc: string;
  };
  nangLuc: string[];
  mucTieu: { muc: string; noiDung: string }[];
  phanHoa: string[];
  taiLieu: string[];
  activities: ToanActivity[];
  btvn: string[];
  soKet: string[];
  /** Phụ lục phiếu học tập, đặt sau BTVN. */
  phuLuc: ToanPhieu[];
}

const clean = (s: string): string => (s || '').replace(/\s+/g, ' ').trim();

/**
 * Ô bảng markdown không xuống dòng được nên AI (và cả `cleanMarkdownOutput` khi vá bảng vỡ)
 * dùng `<br/>` làm dấu ngắt dòng. `clean()` gộp mọi khoảng trắng nên nếu để nguyên thì chuỗi
 * `<br/>` đi thẳng vào file Word và hiện ra như chữ. Đổi sang `\n` thật, giữ lại ngắt dòng —
 * `buildSchoolFormDocx` dịch tiếp `\n` thành ngắt dòng OOXML.
 */
const cleanCell = (s: string): string =>
  (s || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const cellText = (cell: Tokens.TableCell | { text?: string }): string =>
  cleanCell((cell as any).text || '');

/** Bảng hành chính: quét mọi ô, ghép cặp nhãn→giá trị theo từ khóa. */
const parseHeaderTable = (table: Tokens.Table): Partial<ToanLessonModel['header']> => {
  const cells: string[] = [];
  for (const th of table.header) cells.push(cellText(th));
  for (const row of table.rows) for (const c of row) cells.push(cellText(c));
  const out: Partial<ToanLessonModel['header']> = {};
  const grab = (re: RegExp): string => {
    const i = cells.findIndex((c) => re.test(c));
    return i >= 0 && i + 1 < cells.length ? cells[i + 1] : '';
  };
  out.lop = grab(/^lớp$/i);
  out.tenBai = grab(/tên\s*bài/i);
  out.mon = grab(/môn\s*học/i) || 'Toán';
  out.giaoVien = grab(/giáo\s*viên/i);
  out.tuan = grab(/tuần/i);
  out.namHoc = grab(/năm\s*học/i);
  return out;
};

const SECTION = {
  ttc: /thông\s*tin\s*chung/i,
  tienTrinh: /tiến\s*trình/i,
  btvn: /btvn|về\s*nhà/i,
  soKet: /sơ\s*kết|rút\s*kinh\s*nghiệm/i,
  phuLuc: /phụ\s*lục/i,
};

/** Heading mở một phiếu mới: "PHIẾU 1 – KHẢO SÁT HÀM SỐ", "Phiếu số 2: Luyện tập". */
const PHIEU_HEADING = /^phiếu\s*(?:số\s*)?(\d+)\s*[–—:.-]?\s*(.*)$/i;
/** AI khai khổ giấy ngay dưới tên phiếu. */
const KHO_GIAY = /^khổ\s*(?:giấy)?\s*[:：]\s*(dọc|ngang)/i;
/** Dòng họ tên do bộ dựng Word tự phát sinh — bỏ ở đây để khỏi in hai lần. */
const DONG_HO_TEN = /^họ\s*(?:và\s*)?tên\s*[:：]/i;

const tableBlock = (table: Tokens.Table): PhieuBlock => ({
  kind: 'table',
  header: table.header.map(cellText),
  rows: table.rows.map((r) => r.map(cellText)),
});

/**
 * Khổ giấy khi AI quên khai: bảng rộng thì để ngang, còn lại để dọc. Đoán sai chỉ hơi xấu,
 * còn không có luật dự phòng thì phiếu bảng 5 cột bị bóp chật vào khổ dọc.
 */
const suyRaKhoGiay = (khoi: PhieuBlock[]): 'doc' | 'ngang' => {
  const rong = khoi.some((b) => b.kind === 'table' && b.header.length >= 4);
  return rong ? 'ngang' : 'doc';
};

/** "Hàm số bậc hai (Tiết 1 – dùng ở Hoạt động 2)" → "Hoạt động 2". */
const trichHoatDong = (phuDe: string): string =>
  phuDe.match(/dùng\s*(?:ở|cho|trong|khi)\s*([^)（）]+)/i)?.[1]?.trim() ?? '';

// Heading con trong THÔNG TIN CHUNG.
const TTC_SUB = {
  nangLuc: /năng\s*lực\s*cốt\s*lõi/i,
  mucTieu: /mục\s*tiêu\s*học\s*tập/i,
  phanHoa: /phân\s*hóa|phân\s*hoá/i,
  taiLieu: /tài\s*liệu/i,
};

// Heading là một HOẠT ĐỘNG trong tiến trình.
const isActivityHeading = (t: string): boolean =>
  /(hoạt\s*động|hđ)\s*\d|khởi\s*động|ôn\s*(cái\s*đã\s*biết|tập)|hình\s*thành|luyện\s*tập|rèn\s*luyện|củng\s*cố|vận\s*dụng|mở\s*rộng|xác\s*định\s*mục\s*tiêu/i.test(t);

const headingText = (h: Tokens.Heading): string => clean(h.text);

const listItems = (tok: Token): string[] => {
  if (tok.type === 'list') return (tok as Tokens.List).items.map((i) => clean(i.text)).filter(Boolean);
  if (tok.type === 'paragraph') return clean((tok as Tokens.Paragraph).text).split(/\n|<br\s*\/?>/).map(clean).filter(Boolean);
  return [];
};

const extractTimeMarker = (title: string): string => {
  const m = title.match(/\(([^)]*(?:phút|p\d|\d+\s*['h:])[^)]*)\)/i);
  return m ? clean(m[1]) : '';
};

export const parseToanLesson = (markdown: string): ToanLessonModel => {
  const model: ToanLessonModel = {
    title: '',
    header: { lop: '', tenBai: '', mon: 'Toán', giaoVien: '', tuan: '', namHoc: '' },
    nangLuc: [], mucTieu: [], phanHoa: [], taiLieu: [], activities: [], btvn: [], soKet: [], phuLuc: [],
  };

  const tokens = marked.lexer(markdown || '');
  let section: 'none' | 'ttc' | 'tienTrinh' | 'btvn' | 'soKet' | 'phuLuc' = 'none';
  let ttcSub: keyof typeof TTC_SUB | null = null;
  let headerTableTaken = false;
  let current: ToanActivity | null = null;

  const pushActivity = () => {
    if (current) model.activities.push(current);
    current = null;
  };

  let phieu: ToanPhieu | null = null;
  /** `khaiKho` nhớ AI có tự khai khổ giấy không, để chỉ suy ra khi thật sự thiếu. */
  let khaiKho = false;
  const pushPhieu = () => {
    if (phieu) {
      if (!khaiKho) phieu.khoGiay = suyRaKhoGiay(phieu.khoi);
      if (!phieu.hoatDong) phieu.hoatDong = trichHoatDong(phieu.phuDe);
      model.phuLuc.push(phieu);
    }
    phieu = null;
    khaiKho = false;
  };

  for (const tok of tokens) {
    if (tok.type === 'heading') {
      const h = tok as Tokens.Heading;
      const txt = headingText(h);
      if (h.depth === 1 && !model.title) { model.title = txt; continue; }
      if (SECTION.ttc.test(txt)) { pushActivity(); section = 'ttc'; ttcSub = null; continue; }
      if (SECTION.tienTrinh.test(txt)) { pushActivity(); section = 'tienTrinh'; continue; }
      if (SECTION.btvn.test(txt)) { pushActivity(); pushPhieu(); section = 'btvn'; continue; }
      if (SECTION.soKet.test(txt)) { pushActivity(); pushPhieu(); section = 'soKet'; continue; }
      if (SECTION.phuLuc.test(txt)) { pushActivity(); pushPhieu(); section = 'phuLuc'; continue; }

      if (section === 'phuLuc') {
        const m = txt.match(PHIEU_HEADING);
        if (m) {
          pushPhieu();
          phieu = { so: m[1], ten: clean(m[2]), phuDe: '', hoatDong: '', khoGiay: 'doc', khoi: [] };
        } else if (phieu) {
          phieu.khoi.push({ kind: 'heading', text: txt });
        }
        continue;
      }

      if (section === 'ttc') {
        ttcSub = (Object.keys(TTC_SUB) as (keyof typeof TTC_SUB)[]).find((k) => TTC_SUB[k].test(txt)) || ttcSub;
        continue;
      }
      if (section === 'tienTrinh' && isActivityHeading(txt)) {
        pushActivity();
        current = { title: txt.replace(/\s*\([^)]*\)\s*$/, '').trim(), thoiLuong: extractTimeMarker(txt), rows: [] };
        continue;
      }
      continue;
    }

    // Bảng hành chính đầu tiên (trước THÔNG TIN CHUNG)
    if (tok.type === 'table' && section === 'none' && !headerTableTaken) {
      Object.assign(model.header, parseHeaderTable(tok as Tokens.Table));
      headerTableTaken = true;
      continue;
    }

    if (section === 'ttc') {
      // Nhãn tiểu mục thường ở dạng đoạn IN ĐẬM "**1. Tiêu chuẩn năng lực...**", KHÔNG phải heading.
      if (tok.type === 'paragraph') {
        const ptxt = clean((tok as Tokens.Paragraph).text);
        const sub = (Object.keys(TTC_SUB) as (keyof typeof TTC_SUB)[]).find((k) => TTC_SUB[k].test(ptxt));
        // Chỉ coi là nhãn khi đoạn ngắn (dòng tiêu đề), tránh nuốt nội dung dài có chứa từ khóa.
        if (sub && ptxt.length <= 60) { ttcSub = sub; continue; }
      }
      // Bảng mục tiêu (Mức | Mục tiêu) hoặc phân hóa (TB|Khá|Giỏi). Ưu tiên ttcSub;
      // chỉ đoán theo nội dung khi chưa xác định được tiểu mục.
      if (tok.type === 'table') {
        const table = tok as Tokens.Table;
        const bodyText = table.rows.map(r => r.map(cellText).join(' ')).join(' ');
        if (ttcSub === 'phanHoa') {
          for (const row of table.rows) model.phanHoa.push(row.map(cellText).filter(Boolean).join(' — '));
        } else if (ttcSub === 'mucTieu' || (!ttcSub && /cơ\s*bản|trọng\s*tâm/i.test(bodyText))) {
          for (const row of table.rows) {
            if (row.length >= 2) model.mucTieu.push({ muc: cellText(row[0]), noiDung: cellText(row[1]) });
            else if (row.length === 1) model.mucTieu.push({ muc: '', noiDung: cellText(row[0]) });
          }
        }
        continue;
      }
      if (ttcSub === 'nangLuc') model.nangLuc.push(...listItems(tok));
      else if (ttcSub === 'taiLieu') model.taiLieu.push(...listItems(tok));
      else if (ttcSub === 'phanHoa') model.phanHoa.push(...listItems(tok));
      continue;
    }

    if (section === 'tienTrinh') {
      if (tok.type === 'table' && current) {
        const table = tok as Tokens.Table;
        for (const row of table.rows) {
          model && current.rows.push({
            thoiGian: cellText(row[0] || { text: '' }),
            gvHs: cellText(row[1] || { text: '' }),
            noiDung: cellText(row[2] || { text: '' }),
          });
        }
      } else if ((tok.type === 'paragraph') && current) {
        const p = clean((tok as Tokens.Paragraph).text);
        const m = p.match(/thời\s*lượng\s*[:：]?\s*(.+)/i);
        if (m && !current.thoiLuong) current.thoiLuong = clean(m[1]);
      }
      continue;
    }

    if (section === 'phuLuc') {
      if (!phieu) continue; // nội dung trước phiếu đầu tiên (lời dẫn phụ lục) — bỏ qua
      if (tok.type === 'table') { phieu.khoi.push(tableBlock(tok as Tokens.Table)); continue; }
      if (tok.type === 'list') {
        const items = listItems(tok);
        if (items.length) phieu.khoi.push({ kind: 'bullets', items });
        continue;
      }
      if (tok.type === 'paragraph') {
        const p = cleanCell((tok as Tokens.Paragraph).text);
        if (!p) continue;
        const kho = p.match(KHO_GIAY);
        if (kho) { phieu.khoGiay = /ngang/i.test(kho[1]) ? 'ngang' : 'doc'; khaiKho = true; continue; }
        if (DONG_HO_TEN.test(p)) continue;
        // Đoạn đầu tiên ngay dưới tên phiếu là dòng phụ đề (tên bài, tiết, dùng ở hoạt động nào).
        if (!phieu.phuDe && phieu.khoi.length === 0) { phieu.phuDe = p; continue; }
        phieu.khoi.push({ kind: 'para', text: p });
      }
      continue;
    }

    if (section === 'btvn') model.btvn.push(...listItems(tok));
    if (section === 'soKet') model.soKet.push(...listItems(tok));
  }
  pushActivity();
  pushPhieu();

  if (!model.header.tenBai && model.title) {
    model.header.tenBai = model.title.replace(/^kế\s*hoạch\s*dạy\s*học\s*[—-]\s*/i, '').trim();
  }
  return model;
};
