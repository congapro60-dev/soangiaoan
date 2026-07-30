/**
 * Tính điểm biên bản dự giờ + kiểm tra tính hợp lệ của điểm lẻ.
 *
 * Hàm thuần, không phụ thuộc React/Firestore để test được thẳng.
 */
import { COMPONENTS, BO_DU_GIO, TRONG_SO, type MaThanhTo, type SoPhan } from '../../data/khungDanielson';
import { laDiemChamNguong } from '../../data/nguyenTacChamDiem';
import { THANH_TO_TRONG_TAM_2627 } from '../../data/phanHoa';
import { tieuChiConCua } from '../../data/tieuChiCon';
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

/**
 * Điểm thành tố ĐỀ XUẤT từ trung bình các tiêu chí con, làm tròn tới 0,5.
 * null khi chưa chấm tiêu chí con nào của thành tố đó.
 */
export function diemDeXuatTuTieuChiCon(
  bb: BienBanDuGio,
  ma: MaThanhTo,
): { diem: number | null; soDaCham: number; tong: number } {
  const con = tieuChiConCua(ma);
  const co = con
    .map(t => bb.diemTieuChiCon[t.ma])
    .filter((v): v is number => typeof v === 'number');
  return {
    diem: co.length ? Math.round((co.reduce((a, b) => a + b, 0) / co.length) * 2) / 2 : null,
    soDaCham: co.length,
    tong: con.length,
  };
}

export interface ThanhToCanGopY {
  ma: MaThanhTo;
  ten: string;
  diem: number;
  /** Vì sao mục này được chọn — hiện cho người dùng để họ tin hoặc bỏ. */
  lyDo: string[];
}

/**
 * Chọn thành tố cần góp ý.
 *
 * Bản đầu dùng ngưỡng tuyệt đối `điểm < 3` và ĐÃ SAI NẶNG: bảng điểm thật của
 * trường thấp nhất là 3, nên không mục nào thoả điều kiện → không sinh góp ý
 * nào → nhận xét rỗng. Tài liệu tổ Toán ghi rõ "Mức 3 là kì vọng bình thường,
 * KHÔNG phải thành tích" — mức 3 là sàn, không phải đích.
 *
 * Nay dùng xếp hạng tương đối, gộp ba nguồn:
 *  - 3 thành tố điểm thấp nhất, bất kể điểm bao nhiêu
 *  - mọi thành tố ≤ 3 (vì 3 mới là sàn)
 *  - mọi thành tố thuộc trọng tâm 26-27 mà chưa đạt 3,5
 */
export function chonThanhToGopY(bb: BienBanDuGio, soThapNhat = 3): ThanhToCanGopY[] {
  const trongBo = new Set(thanhToTheoBo(bb.boTieuChi));
  const daCham = COMPONENTS.filter(
    c => trongBo.has(c.ma) && typeof bb.diemChot[c.ma] === 'number',
  ).map(c => ({ ma: c.ma, ten: c.ten, diem: bb.diemChot[c.ma] as number }));

  const lyDo = new Map<MaThanhTo, string[]>();
  const them = (ma: MaThanhTo, v: string) => {
    if (!lyDo.has(ma)) lyDo.set(ma, []);
    const ds = lyDo.get(ma)!;
    if (!ds.includes(v)) ds.push(v);
  };

  [...daCham]
    .sort((a, b) => a.diem - b.diem)
    .slice(0, soThapNhat)
    .forEach(x => them(x.ma, 'thuộc nhóm điểm thấp nhất'));

  daCham.filter(x => x.diem <= 3).forEach(x => them(x.ma, 'mức 3 là sàn, chưa phải đích'));

  daCham
    .filter(x => x.diem < 3.5 && THANH_TO_TRONG_TAM_2627.includes(x.ma))
    .forEach(x => them(x.ma, 'trọng tâm quan sát năm 26-27'));

  return daCham
    .filter(x => lyDo.has(x.ma))
    .sort((a, b) => a.diem - b.diem)
    .map(x => ({ ...x, lyDo: lyDo.get(x.ma)! }));
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
