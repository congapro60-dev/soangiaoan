/**
 * Tính điểm biên bản dự giờ + kiểm tra tính hợp lệ của điểm lẻ.
 *
 * Hàm thuần, không phụ thuộc React/Firestore để test được thẳng.
 */
import { COMPONENTS, BO_DU_GIO, TRONG_SO, type MaThanhTo, type SoPhan } from '../../data/khungDanielson';
import { laDiemChamNguong } from '../../data/nguyenTacChamDiem';
import type { BienBanDuGio, BoTieuChi } from './types';

/** Danh sách thành tố phải chấm theo bộ tiêu chí đang chọn. */
export function thanhToTheoBo(bo: BoTieuChi): MaThanhTo[] {
  return bo === 'daydu'
    ? COMPONENTS.map(c => c.ma)
    : COMPONENTS.filter(c => BO_DU_GIO.includes(c.ma)).map(c => c.ma);
}

export interface KetQuaTinhDiem {
  /** Trung bình từng phần; null khi phần đó chưa chấm thành tố nào. */
  trungBinhPhan: Record<SoPhan, number | null>;
  /** Trung bình có trọng số của Phần I–III (Phần IV trọng số 0). */
  trungBinh: number | null;
  /** Quy đổi thang 10, làm tròn tới 0,5. */
  thang10: number | null;
  xepLoai: string | null;
  soDaCham: number;
  tongThanhTo: number;
}

function xepLoaiTheo(tb: number): string {
  if (tb >= 3.5) return 'Xuất sắc';
  if (tb >= 2.5) return 'Tốt';
  if (tb >= 1.5) return 'Cơ bản';
  return 'Chưa đạt';
}

export function tinhDiem(bb: BienBanDuGio): KetQuaTinhDiem {
  const trongBo = new Set(thanhToTheoBo(bb.boTieuChi));
  const trungBinhPhan = {} as Record<SoPhan, number | null>;

  ([1, 2, 3, 4] as SoPhan[]).forEach(phan => {
    const diem = COMPONENTS.filter(c => c.phan === phan && trongBo.has(c.ma))
      .map(c => bb.diemChot[c.ma])
      .filter((v): v is number => typeof v === 'number');
    trungBinhPhan[phan] = diem.length ? diem.reduce((a, b) => a + b, 0) / diem.length : null;
  });

  // Chỉ những phần ĐÃ chấm mới vào mẫu số — chấm thiếu Phần I không kéo tụt
  // điểm chung, nó chỉ làm điểm chung dựa trên phần còn lại.
  let tu = 0;
  let mau = 0;
  ([1, 2, 3] as SoPhan[]).forEach(phan => {
    const tb = trungBinhPhan[phan];
    if (tb !== null) {
      tu += tb * TRONG_SO[phan];
      mau += TRONG_SO[phan];
    }
  });

  const trungBinh = mau ? tu / mau : null;
  const soDaCham = COMPONENTS.filter(
    c => trongBo.has(c.ma) && typeof bb.diemChot[c.ma] === 'number',
  ).length;

  return {
    trungBinhPhan,
    trungBinh,
    thang10: trungBinh === null ? null : Math.round((trungBinh / 4) * 10 * 2) / 2,
    xepLoai: trungBinh === null ? null : xepLoaiTheo(trungBinh),
    soDaCham,
    tongThanhTo: trongBo.size,
  };
}

export interface ThieuChamNguong {
  ma: MaThanhTo;
  ten: string;
  diem: number;
}

/**
 * Điểm lẻ 0,5 nào chưa ghi minh chứng chạm ngưỡng.
 *
 * Đây là chỗ nguyên tắc của tổ Toán được thực thi thật thay vì chỉ nằm trong
 * tài liệu: "tuyệt đối không cho điểm lẻ dựa trên cảm giác".
 */
export function thieuMinhChungChamNguong(bb: BienBanDuGio): ThieuChamNguong[] {
  const trongBo = new Set(thanhToTheoBo(bb.boTieuChi));
  return COMPONENTS.filter(c => trongBo.has(c.ma))
    .filter(c => laDiemChamNguong(bb.diemChot[c.ma]))
    .filter(c => !(bb.chamNguong[c.ma] || '').trim())
    .map(c => ({ ma: c.ma, ten: c.ten, diem: bb.diemChot[c.ma] as number }));
}

export interface DongSoSanh {
  ma: MaThanhTo;
  ten: string;
  nguoiDu: number | null;
  giaoVien: number | null;
  /** giaoVien − nguoiDu. null khi thiếu một trong hai. */
  chenh: number | null;
  ghiChu: string;
}

/**
 * Đối chiếu bảng điểm của người dự giờ với bảng tự đánh giá của giáo viên.
 *
 * Chỗ hai bên chấm lệch nhau chính là chỗ đáng nói nhất trong buổi trao đổi:
 * hoặc giáo viên chưa thấy điều người dự thấy, hoặc người dự bỏ sót ngữ cảnh
 * mà chỉ giáo viên biết. Cả hai đều đáng hỏi, không phải để phân xử ai đúng.
 */
export function soSanhTuDanhGia(bb: BienBanDuGio): {
  dong: DongSoSanh[];
  lechLon: DongSoSanh[];
  daTuDanhGia: boolean;
} {
  const trongBo = new Set(thanhToTheoBo(bb.boTieuChi));
  const dong: DongSoSanh[] = COMPONENTS.filter(c => trongBo.has(c.ma))
    .map(c => {
      const nguoiDu = typeof bb.diemChot[c.ma] === 'number' ? (bb.diemChot[c.ma] as number) : null;
      const giaoVien =
        typeof bb.tuDanhGia.diem[c.ma] === 'number' ? (bb.tuDanhGia.diem[c.ma] as number) : null;
      return {
        ma: c.ma,
        ten: c.ten,
        nguoiDu,
        giaoVien,
        chenh: nguoiDu !== null && giaoVien !== null ? giaoVien - nguoiDu : null,
        ghiChu: bb.tuDanhGia.ghiChu[c.ma] || '',
      };
    })
    .filter(d => d.nguoiDu !== null || d.giaoVien !== null);

  return {
    dong,
    // Lệch từ 1 mức trở lên mới đáng mang ra bàn; lệch 0,5 là sai số bình thường.
    lechLon: dong
      .filter(d => d.chenh !== null && Math.abs(d.chenh) >= 1)
      .sort((a, b) => Math.abs(b.chenh as number) - Math.abs(a.chenh as number)),
    daTuDanhGia: !!bb.tuDanhGia.hoanThanhLuc,
  };
}

/** Số thập phân kiểu Việt Nam: 3.25 → "3,25". */
export function soVN(n: number | null, le = 2): string {
  if (n === null || Number.isNaN(n)) return '—';
  return n.toFixed(le).replace(/\.?0+$/, '').replace('.', ',') || '0';
}
