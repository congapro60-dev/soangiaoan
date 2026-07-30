/**
 * Đọc nhiều biên bản dự giờ trong CÙNG một sheet, và ghép với nhiều giáo án.
 *
 * Vì sao không đọc theo số dòng cố định như docFileExcel: khi nhiều buổi dự nằm
 * chung một sheet thì vị trí mỗi khối phụ thuộc số dòng ghi chép của buổi trước.
 * Dò theo HÀNG TIÊU ĐỀ lặp lại ("Thời gian | Hoạt động | …") thì đúng bất kể
 * khối dài ngắn thế nào.
 *
 * Ghép giáo án dùng ba tín hiệu người dùng đã nêu: ngày, tên bài, và thứ tự xuất
 * hiện. Ghép sai thì chấm Phần I sai toàn bộ mà file vẫn trông hợp lệ, nên hàm
 * này KHÔNG tự quyết — nó trả về độ tin cậy để giao diện bắt người xác nhận.
 */
import * as XLSX from 'xlsx';
import type { BienBanDuGio, DongQuanSat } from './types';
import { bienBanRong } from './types';

const chuoi = (v: unknown): string =>
  v == null ? '' : String(v).normalize('NFC').replace(/\s+/g, ' ').trim();

/** Bỏ dấu và hạ chữ thường để so khớp tên bài chịu được sai khác nhỏ. */
export function khongDau(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Hàng tiêu đề bảng quan sát — mốc để cắt khối. */
function laHangTieuDe(o: string[]): boolean {
  const t = o.map(khongDau);
  return t.some(x => x === 'thoi gian') && t.some(x => x === 'hoat dong');
}

/** Nhãn hành chính nằm phía trên mỗi hàng tiêu đề. */
const NHAN = [
  { khoa: 'lop', nhan: 'lop' },
  { khoa: 'tuan', nhan: 'tuan' },
  { khoa: 'bai', nhan: 'ten bai day' },
] as const;

/** Bỏ nhãn ở đầu ô kiểu "Người dự giờ: Mr. Cường" → "Mr. Cường". */
const boNhan = (v: string): string => v.replace(/^[^:]{0,40}:\s*/, '').trim();

export interface KetQuaDocNhieu {
  bienBan: BienBanDuGio[];
  /** Cảnh báo để hiện cho người dùng, không phải lỗi chặn. */
  canhBao: string[];
}

/**
 * Tách mọi biên bản trong sheet đầu tiên của file.
 *
 * Trả về mảng rỗng kèm cảnh báo khi không tìm thấy hàng tiêu đề nào — tốt hơn là
 * đoán bừa rồi nạp ra biên bản rỗng mà người dùng không biết vì sao.
 */
export function docNhieuBienBan(data: ArrayBuffer, userId: string): KetQuaDocNhieu {
  const wb = XLSX.read(data, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const canhBao: string[] = [];
  if (!ws) return { bienBan: [], canhBao: ['File không có sheet nào đọc được.'] };

  const rows: string[][] = XLSX.utils
    .sheet_to_json(ws, { header: 1, defval: '', raw: false })
    .map(r => (r as unknown[]).map(chuoi));

  const mocTieuDe = rows.map((r, i) => (laHangTieuDe(r) ? i : -1)).filter(i => i >= 0);
  if (!mocTieuDe.length) {
    return {
      bienBan: [],
      canhBao: [
        'Không tìm thấy hàng tiêu đề nào có "Thời gian" và "Hoạt động". Kiểm tra lại xem đúng file biên bản dự giờ chưa.',
      ],
    };
  }

  const ra: BienBanDuGio[] = [];

  mocTieuDe.forEach((moc, k) => {
    const bb = bienBanRong(userId);
    bb.gvHoTen = chuoi(wb.SheetNames[0]);

    // Phần hành chính nằm ngay phía trên hàng tiêu đề. Quét ngược tới hàng tiêu
    // đề của khối trước — không lùi một số dòng cố định, vì số dòng trống giữa
    // các khối không cố định.
    const dauQuet = k === 0 ? 0 : mocTieuDe[k - 1] + 1;
    for (let r = moc - 1; r >= dauQuet; r--) {
      const o = rows[r] || [];
      o.forEach((giaTri, c) => {
        const nhan = khongDau(giaTri).replace(/:$/, '');
        // Nhãn ở một ô, giá trị ở ô kế bên.
        const m = NHAN.find(x => nhan === x.nhan);
        if (m && !bb[m.khoa]) bb[m.khoa] = chuoi(o[c + 1]);
        // Dạng gộp "Người dự giờ: Mr. Cường" trong cùng một ô.
        if (/^ngay va thoi gian du gio/.test(nhan)) bb.ngay = boNhan(giaTri) || bb.ngay;
        if (/^nguoi du gio/.test(nhan)) bb.nguoiDu = boNhan(giaTri);
        if (/^nam hoc/.test(nhan)) bb.namHocKy = boNhan(giaTri);
      });
    }

    // Dòng dữ liệu: từ ngay dưới hàng tiêu đề cho tới khi gặp ĐẦU KHỐI SAU.
    // Dấu hiệu đầu khối sau: hàng tiêu đề mới, hàng có nhãn hành chính, hoặc
    // hàng tiêu đề văn bản "BIÊN BẢN DỰ GIỜ…".
    const hetKhoi = k + 1 < mocTieuDe.length ? mocTieuDe[k + 1] : rows.length;
    const dong: DongQuanSat[] = [];
    for (let r = moc + 1; r < hetKhoi; r++) {
      const o = rows[r] || [];
      if (laHangTieuDe(o)) break;
      const nhanDau = khongDau(chuoi(o[0])).replace(/:$/, '');
      if (NHAN.some(x => nhanDau === x.nhan)) break;
      if (o.some(x => /bien ban du gio/.test(khongDau(x)))) break;

      const d: DongQuanSat = {
        thoiGian: chuoi(o[0]),
        hoatDong: chuoi(o[1]),
        cuaGiaoVien: chuoi(o[2]),
        cuaHocSinh: chuoi(o[3]),
        ghiChu: chuoi(o[4]),
      };
      if (d.thoiGian || d.hoatDong || d.cuaGiaoVien || d.cuaHocSinh || d.ghiChu) dong.push(d);
    }

    bb.dongQuanSat = dong;
    if (!dong.length) canhBao.push(`Biên bản thứ ${k + 1} không có dòng ghi chép nào.`);
    if (!bb.bai) canhBao.push(`Biên bản thứ ${k + 1} thiếu tên bài dạy — sẽ khó ghép với giáo án.`);
    ra.push(bb);
  });

  return { bienBan: ra, canhBao };
}

/* ─────────────────────── ghép giáo án ─────────────────────── */

/**
 * Tách một tài liệu chứa nhiều giáo án thành từng bản.
 * Cắt tại các mốc tiêu đề thường gặp; không thấy mốc nào thì trả về một bản.
 */
export function tachGiaoAn(vanBan: string): string[] {
  const chu = vanBan.normalize('NFC');
  const moc: number[] = [];
  const re =
    /^[^\S\n]*(?:k[eế]\s*ho[aạ]ch\s*b[aà]i\s*d[aạ]y|gi[aá]o\s*[aá]n|ti[eế]t\s*\d+|b[aà]i\s*\d+)\b/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(chu))) moc.push(m.index);

  if (moc.length < 2) return chu.trim() ? [chu.trim()] : [];
  return moc
    .map((v, i) => chu.slice(v, moc[i + 1] ?? chu.length).trim())
    .filter(x => x.length > 80);
}

export interface CapGhep {
  chiSoBienBan: number;
  /** null = không ghép được với giáo án nào. */
  chiSoGiaoAn: number | null;
  /** Tín hiệu đã khớp, để người dùng tự thấy vì sao ghép như vậy. */
  tinHieu: string[];
  /** 'cao' khi khớp ngày hoặc tên bài; 'thap' khi chỉ dựa vào thứ tự. */
  tinCay: 'cao' | 'vua' | 'thap';
}

/** Ngày ở nhiều dạng — lấy về chuỗi số để so khớp thô. */
function chuoiNgay(s: string): string[] {
  const ra: string[] = [];
  const re = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})|(\d{4})-(\d{1,2})-(\d{1,2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m[1]) ra.push(`${+m[1]}-${+m[2]}-${m[3].slice(-2)}`);
    else ra.push(`${+m[6]}-${+m[5]}-${m[4].slice(-2)}`);
  }
  return ra;
}

/**
 * Ghép từng biên bản với một giáo án theo ba tín hiệu: ngày, tên bài, thứ tự.
 *
 * KHÔNG tự động chấp nhận kết quả — trả kèm `tinCay` để giao diện buộc người
 * dùng xác nhận. Ghép sai làm điểm Phần I sai toàn bộ mà không có dấu hiệu nào.
 */
export function ghepGiaoAn(bienBan: BienBanDuGio[], giaoAn: string[]): CapGhep[] {
  const conTrong = new Set(giaoAn.map((_, i) => i));
  const ra: CapGhep[] = [];

  // Vòng 1: khớp bằng tên bài hoặc ngày (tín hiệu mạnh).
  bienBan.forEach((bb, i) => {
    const tenBai = khongDau(bb.bai);
    const ngayBB = chuoiNgay(bb.ngay);
    let tot: { j: number; diem: number; tinHieu: string[] } | null = null;

    conTrong.forEach(j => {
      const ga = giaoAn[j];
      const gaKhongDau = khongDau(ga);
      const tinHieu: string[] = [];
      let diem = 0;
      if (tenBai.length >= 6 && gaKhongDau.includes(tenBai)) {
        diem += 3;
        tinHieu.push('trùng tên bài');
      }
      if (ngayBB.some(n => chuoiNgay(ga).includes(n))) {
        diem += 3;
        tinHieu.push('trùng ngày');
      }
      if (i === j) {
        diem += 1;
        tinHieu.push('cùng thứ tự');
      }
      if (diem > (tot?.diem ?? 0)) tot = { j, diem, tinHieu };
    });

    const t = tot as { j: number; diem: number; tinHieu: string[] } | null;
    if (t && t.diem >= 3) {
      conTrong.delete(t.j);
      ra.push({
        chiSoBienBan: i,
        chiSoGiaoAn: t.j,
        tinHieu: t.tinHieu,
        tinCay: t.diem >= 6 ? 'cao' : 'vua',
      });
    } else {
      ra.push({ chiSoBienBan: i, chiSoGiaoAn: null, tinHieu: [], tinCay: 'thap' });
    }
  });

  // Vòng 2: những biên bản chưa ghép thì gán theo thứ tự còn lại, tin cậy thấp.
  ra.forEach(cap => {
    if (cap.chiSoGiaoAn !== null) return;
    const j = [...conTrong].sort((a, b) => a - b)[0];
    if (j === undefined) return;
    conTrong.delete(j);
    cap.chiSoGiaoAn = j;
    cap.tinHieu = ['chỉ theo thứ tự còn lại'];
    cap.tinCay = 'thap';
  });

  return ra;
}
