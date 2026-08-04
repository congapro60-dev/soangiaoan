/**
 * TẦNG A — làm sạch MÁY MÓC biên bản dự giờ.
 *
 * Ranh giới của tầng này: chỉ sửa những thứ KHÔNG đẻ ra nghĩa mới. Bỏ ký tự rác,
 * gộp dòng bị Excel ngắt giữa câu, gỡ nhãn thừa. Tuyệt đối không đoán chữ, không
 * điền chỗ trống, không sửa chính tả — những thứ đó thuộc tầng B (phải có người duyệt)
 * và tầng C (không làm).
 *
 * Vì sao ranh giới này quan trọng: biên bản dự giờ là hồ sơ đánh giá một GIÁO VIÊN CỤ THỂ.
 * Ô trống là DỮ KIỆN ("người dự giờ không ghi nhận được"), không phải lỗi cần vá. Luật chấm
 * điểm trong phanTich.ts đã ghi rõ: "Không ghi nhận được KHÔNG đồng nghĩa với không có".
 * Tự điền vào là biến "chưa ghi nhận" thành "có xảy ra" — làm sai lệch bằng chứng chấm người.
 */

import type { DongQuanSat } from './types';

/** Cột chứa lời văn — khác cột mốc giờ và cột tên hoạt động. */
const COT_VAN: (keyof DongQuanSat)[] = ['cuaGiaoVien', 'cuaHocSinh', 'ghiChu'];

/**
 * Nhãn thừa ở ĐẦU ô. Danh sách đóng và khớp CHÍNH XÁC — cố ý không dùng regex
 * chung `^[^:]{0,40}:` như phần đầu biên bản, vì câu quan sát thật hay có dấu hai chấm
 * giữa chừng: "GV hỏi: tại sao em nghĩ vậy?" mà cắt theo dấu ':' là mất luôn "GV hỏi".
 */
const NHAN_THUA = /^\s*(GV|HS|Thầy|Cô|Giáo viên|Học sinh|Ghi chú)\s*[:：]\s*/i;

/** Ký tự vô hình: zero-width space/non-joiner/joiner, BOM, gạch nối mềm. */
const KY_TU_VO_HINH = /[\u200B-\u200D\uFEFF\u00AD]/g;
/** Ký tự điều khiển C0/C1 (xuống dòng và tab xử lý riêng ở dưới). */
const KY_TU_DIEU_KHIEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
/** Khoảng trắng lạ: NBSP, en/em space, narrow no-break, ideographic space, tab. */
const KHOANG_TRANG_LA = /[\u00A0\u2000-\u200A\u202F\u205F\u3000\t]/g;

/**
 * Dấu mở đầu cho biết dòng này là PHẦN NỐI TIẾP của câu ở dòng trên:
 * chữ thường (kể cả có dấu tiếng Việt) hoặc dấu câu nối.
 */
const DAU_NOI_TIEP = /^[a-zà-ỹ,;)\]…]/u;

/** Dọn một ô: bỏ ký tự rác, ép về một loại khoảng trắng, gỡ nhãn thừa. */
export function donO(v: string, laCotVan: boolean): string {
  let s = (v ?? '')
    .normalize('NFC')
    .replace(KY_TU_VO_HINH, '')
    .replace(KY_TU_DIEU_KHIEN, '')
    .replace(KHOANG_TRANG_LA, ' ')
    // Xuống dòng trong một ô Excel là ngắt dòng hiển thị, không phải hết câu.
    .replace(/\s*\r?\n\s*/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
  // Gỡ nhãn lặp: vanBanQuanSat() tự thêm "GV: " khi dựng văn bản cho AI, nên ô đã
  // ghi sẵn "GV:" sẽ thành "GV: GV: …". Gỡ nhiều lớp phòng khi người ghi lặp hai lần.
  if (laCotVan) {
    for (let i = 0; i < 3 && NHAN_THUA.test(s); i++) s = s.replace(NHAN_THUA, '');
  }
  return s.trim();
}

const rong = (d: DongQuanSat) =>
  !d.thoiGian && !d.hoatDong && !d.cuaGiaoVien && !d.cuaHocSinh && !d.ghiChu;

/**
 * Dòng nối tiếp = Excel ngắt một câu dài xuống hàng dưới.
 * Điều kiện CHẶT để không gộp nhầm hai quan sát riêng biệt:
 *  - không có mốc giờ và không có tên hoạt động, VÀ
 *  - MỌI ô có chữ đều bắt đầu bằng chữ thường / dấu câu nối.
 * Chỉ cần một ô mở đầu bằng chữ hoa hoặc chữ số là coi như quan sát mới, không gộp.
 */
function laDongNoiTiep(d: DongQuanSat): boolean {
  if (d.thoiGian || d.hoatDong) return false;
  const oCoChu = COT_VAN.map(c => d[c]).filter(Boolean);
  if (oCoChu.length === 0) return false;
  return oCoChu.every(t => DAU_NOI_TIEP.test(t));
}

export interface KetQuaLamSach {
  dong: DongQuanSat[];
  /** Số dòng bị Excel ngắt giữa câu đã được nối lại vào dòng trên. */
  soDongGop: number;
  /** Số ô có thay đổi sau khi dọn (để người dự giờ biết máy đã đụng vào đâu). */
  soODaDon: number;
  /** Số dòng trống bị bỏ. */
  soDongTrong: number;
}

/**
 * Làm sạch toàn bộ bảng quan sát. Thuần hàm, không đụng dữ liệu gốc.
 * Trả kèm số liệu để giao diện nói được "đã dọn X ô, gộp Y dòng" — làm sạch âm thầm
 * mà không ai kiểm chứng được cũng là một kiểu mất minh bạch.
 */
export function lamSachDongQuanSat(dauVao: DongQuanSat[]): KetQuaLamSach {
  let soODaDon = 0;

  const donDong = (d: DongQuanSat): DongQuanSat => {
    const ra: DongQuanSat = {
      thoiGian: donO(d.thoiGian, false),
      hoatDong: donO(d.hoatDong, false),
      cuaGiaoVien: donO(d.cuaGiaoVien, true),
      cuaHocSinh: donO(d.cuaHocSinh, true),
      ghiChu: donO(d.ghiChu, true),
    };
    (Object.keys(ra) as (keyof DongQuanSat)[]).forEach(k => {
      if (ra[k] !== d[k]) soODaDon++;
    });
    return ra;
  };

  const daDon = dauVao.map(donDong);
  const truocKhiBoTrong = daDon.length;
  const coChu = daDon.filter(d => !rong(d));
  const soDongTrong = truocKhiBoTrong - coChu.length;

  const ra: DongQuanSat[] = [];
  let soDongGop = 0;
  for (const d of coChu) {
    const truoc = ra[ra.length - 1];
    if (truoc && laDongNoiTiep(d)) {
      COT_VAN.forEach(c => {
        if (!d[c]) return;
        truoc[c] = truoc[c] ? `${truoc[c]} ${d[c]}` : d[c];
      });
      soDongGop++;
      continue;
    }
    ra.push({ ...d });
  }

  return { dong: ra, soDongGop, soODaDon, soDongTrong };
}
