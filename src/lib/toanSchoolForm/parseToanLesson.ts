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
}

const clean = (s: string): string => (s || '').replace(/\s+/g, ' ').trim();

const cellText = (cell: Tokens.TableCell | { text?: string }): string =>
  clean((cell as any).text || '');

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
};

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
    nangLuc: [], mucTieu: [], phanHoa: [], taiLieu: [], activities: [], btvn: [], soKet: [],
  };

  const tokens = marked.lexer(markdown || '');
  let section: 'none' | 'ttc' | 'tienTrinh' | 'btvn' | 'soKet' = 'none';
  let ttcSub: keyof typeof TTC_SUB | null = null;
  let headerTableTaken = false;
  let current: ToanActivity | null = null;

  const pushActivity = () => {
    if (current) model.activities.push(current);
    current = null;
  };

  for (const tok of tokens) {
    if (tok.type === 'heading') {
      const h = tok as Tokens.Heading;
      const txt = headingText(h);
      if (h.depth === 1 && !model.title) { model.title = txt; continue; }
      if (SECTION.ttc.test(txt)) { pushActivity(); section = 'ttc'; ttcSub = null; continue; }
      if (SECTION.tienTrinh.test(txt)) { pushActivity(); section = 'tienTrinh'; continue; }
      if (SECTION.btvn.test(txt)) { pushActivity(); section = 'btvn'; continue; }
      if (SECTION.soKet.test(txt)) { pushActivity(); section = 'soKet'; continue; }

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

    if (section === 'btvn') model.btvn.push(...listItems(tok));
    if (section === 'soKet') model.soKet.push(...listItems(tok));
  }
  pushActivity();

  if (!model.header.tenBai && model.title) {
    model.header.tenBai = model.title.replace(/^kế\s*hoạch\s*dạy\s*học\s*[—-]\s*/i, '').trim();
  }
  return model;
};
