/**
 * TẦNG B — đề xuất sửa chính tả cho biên bản dự giờ. CÓ NGƯỜI DUYỆT, không tự áp.
 *
 * Vì sao không tự áp: biên bản là hồ sơ đánh giá một giáo viên cụ thể. Tiếng Việt sai
 * một dấu là đổi hẳn nghĩa ("chưa" ↔ "chứa", "hỏi" ↔ "hòi", "khong" → "không" hay "khổng"),
 * nên máy sửa thầm là sửa bằng chứng chấm người mà chính họ không biết.
 *
 * CHỖ QUYẾT ĐỊNH TÍNH ĐÚNG ĐẮN KHÔNG PHẢI PROMPT, MÀ LÀ BỘ LỌC Ở ĐÂY.
 * AI được yêu cầu chỉ sửa chính tả, nhưng nó vẫn có thể viết lại cả câu hoặc bịa đoạn
 * không tồn tại. Mọi đề xuất phải qua `locDeXuat()` — cái gì không chứng minh được là
 * sửa chính tả thì loại thẳng, không hiển thị cho người dùng duyệt. Đây là hàng rào
 * chặn tầng B trượt thành tầng C (đẻ nội dung mới) khi AI ảo giác.
 */

import type { DongQuanSat } from './types';

/** Cột được phép sửa — cột mốc giờ đứng ngoài, sai giờ là sai dữ kiện chứ không phải chính tả. */
export const COT_SUA_DUOC = ['hoatDong', 'cuaGiaoVien', 'cuaHocSinh', 'ghiChu'] as const;
export type CotSuaDuoc = (typeof COT_SUA_DUOC)[number];

export interface DeXuatSua {
  /** Chỉ số dòng trong bảng quan sát. */
  dong: number;
  cot: CotSuaDuoc;
  /** Đoạn nguyên văn đang sai — PHẢI có thật trong ô. */
  truoc: string;
  /** Đoạn thay thế. */
  sau: string;
  lyDo: string;
}

/** Khoảng cách Levenshtein, dùng để chặn "sửa chính tả" biến thành viết lại câu. */
export function khoangCach(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let truoc = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const hienTai = [i];
    for (let j = 1; j <= n; j++) {
      hienTai[j] = Math.min(
        truoc[j] + 1,
        hienTai[j - 1] + 1,
        truoc[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    truoc = hienTai;
  }
  return truoc[n];
}

/** Mỗi từ chỉ được lệch tối đa 2 ký tự — đủ cho lỗi gõ và lỗi dấu, không đủ để thay từ khác. */
const LECH_TOI_DA_MOI_TU = 2;

/**
 * Một đề xuất chỉ được coi là SỬA CHÍNH TẢ khi:
 *  1. `truoc` có thật trong ô (không thì AI đang bịa),
 *  2. `sau` khác `truoc` và không rỗng (không cho xoá nội dung),
 *  3. SỐ TỪ giữ nguyên (đổi số từ = thêm/bớt ý, không còn là chính tả),
 *  4. mỗi từ lệch tối đa 2 ký tự.
 */
export function laSuaChinhTa(truoc: string, sau: string): boolean {
  if (!truoc.trim() || !sau.trim() || truoc === sau) return false;
  const tuTruoc = truoc.trim().split(/\s+/);
  const tuSau = sau.trim().split(/\s+/);
  if (tuTruoc.length !== tuSau.length) return false;
  return tuTruoc.every((t, i) => khoangCach(t, tuSau[i]) <= LECH_TOI_DA_MOI_TU);
}

/**
 * Lọc danh sách AI trả về, chỉ giữ đề xuất chứng minh được là sửa chính tả.
 * Trả kèm số bị loại để giao diện nói thật với người dùng rằng AI có đề xuất vượt phép.
 */
export function locDeXuat(
  tho: unknown,
  dong: DongQuanSat[],
): { deXuat: DeXuatSua[]; soBiLoai: number } {
  if (!Array.isArray(tho)) return { deXuat: [], soBiLoai: 0 };
  const deXuat: DeXuatSua[] = [];
  let soBiLoai = 0;

  for (const r of tho) {
    const o = r as Record<string, unknown>;
    const chiSo = Number(o.dong);
    const cot = String(o.cot ?? '') as CotSuaDuoc;
    const truoc = typeof o.truoc === 'string' ? o.truoc.normalize('NFC') : '';
    const sau = typeof o.sau === 'string' ? o.sau.normalize('NFC') : '';
    const lyDo = typeof o.ly_do === 'string' ? o.ly_do : String(o.lyDo ?? '');

    const oHopLe =
      Number.isInteger(chiSo) &&
      chiSo >= 0 &&
      chiSo < dong.length &&
      (COT_SUA_DUOC as readonly string[]).includes(cot);
    // Phải tìm thấy nguyên văn trong ô — chặn AI bịa đoạn không tồn tại.
    const coThat = oHopLe && dong[chiSo][cot].includes(truoc);

    if (!oHopLe || !coThat || !laSuaChinhTa(truoc, sau)) {
      soBiLoai++;
      continue;
    }
    deXuat.push({ dong: chiSo, cot, truoc, sau, lyDo });
  }
  return { deXuat, soBiLoai };
}

/** Áp các đề xuất NGƯỜI DÙNG ĐÃ CHỌN. Thuần hàm, không đụng mảng gốc. */
export function apDungDeXuat(dong: DongQuanSat[], chon: DeXuatSua[]): DongQuanSat[] {
  const ra = dong.map(d => ({ ...d }));
  for (const dx of chon) {
    const o = ra[dx.dong];
    if (!o || !o[dx.cot].includes(dx.truoc)) continue;
    o[dx.cot] = o[dx.cot].replace(dx.truoc, dx.sau);
  }
  return ra;
}

/** Dựng prompt hỏi AI. Đánh số dòng để AI trỏ lại đúng ô. */
export function promptSuaLoi(dong: DongQuanSat[]): string {
  const bang = dong
    .map((d, i) =>
      COT_SUA_DUOC.filter(c => d[c])
        .map(c => `dòng ${i} | ${c} | ${d[c]}`)
        .join('\n'),
    )
    .filter(Boolean)
    .join('\n');

  return `Bạn là người soát chính tả tiếng Việt cho BIÊN BẢN DỰ GIỜ của một trường phổ thông.

CHỈ được sửa LỖI CHÍNH TẢ và LỖI GÕ DẤU. Đây là hồ sơ đánh giá một giáo viên cụ thể, nên:
- KHÔNG viết lại câu cho hay hơn, KHÔNG rút gọn, KHÔNG đổi cách diễn đạt.
- KHÔNG thêm chữ, KHÔNG bớt chữ. Số từ trước và sau phải BẰNG NHAU.
- KHÔNG điền vào chỗ người dự giờ bỏ trống. Ô trống là dữ kiện, không phải lỗi.
- KHÔNG đụng thuật ngữ toán học, tên riêng, tên học sinh, con số.
- Không chắc chắn thì BỎ QUA. Thà sót còn hơn sửa sai nghĩa.

"truoc" phải là đoạn TRÍCH NGUYÊN VĂN có thật trong ô, càng ngắn càng tốt (thường chỉ một từ).

NỘI DUNG CẦN SOÁT:
${bang}

CHỈ trả về JSON hợp lệ, không kèm văn bản nào khác:
{"de_xuat":[{"dong":0,"cot":"cuaGiaoVien","truoc":"khong","sau":"không","ly_do":"thiếu dấu"}]}

Không có lỗi nào thì trả {"de_xuat":[]}.`;
}
