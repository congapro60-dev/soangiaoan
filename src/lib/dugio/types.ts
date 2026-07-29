/**
 * Kiểu dữ liệu module dự giờ.
 *
 * Đặt cạnh module (giống src/lib/adaptive/types.ts) thay vì nhồi vào
 * src/types.ts để phần dự giờ tự chứa, dễ gỡ nếu sau này tách ra.
 */
import type { MaThanhTo } from '../../data/khungDanielson';

/** Một dòng trong bảng quan sát — khớp 5 cột của mẫu biên bản trường đang dùng. */
export interface DongQuanSat {
  thoiGian: string;
  hoatDong: string;
  cuaGiaoVien: string;
  cuaHocSinh: string;
  ghiChu: string;
}

export type DoTinCay = 'cao' | 'vua' | 'thap';

/** Đề xuất của AI cho một thành tố. Người dự giờ vẫn là người chốt điểm. */
export interface KetQuaThanhTo {
  diem: number | null;
  tinCay: DoTinCay;
  bangChung: string[];
  lyDo: string;
  cauHoi: string[];
  /**
   * Hành động của mức trên đã quan sát được, làm căn cứ cho điểm lẻ 0,5.
   * Theo nguyên tắc chạm ngưỡng của tổ Toán, điểm lẻ KHÔNG hợp lệ nếu thiếu ô này.
   */
  chamNguong?: string;
}

export interface GopYThanhTo {
  hanChe: string;
  cauHoiPhanTu: string;
  coTheLam: string[];
}

export interface DiemManh {
  tieuDe: string;
  bangChung: string;
  yNghia: string;
}

export interface TrongTamCaiThien {
  tieuDe: string;
  bangChung: string;
  hanhDong: string[];
  doThanhCong: string;
}

/**
 * Một lượt huấn luyện dựa trên minh chứng, theo khuôn trong tài liệu tập huấn:
 * nêu quan sát trung tính → hỏi giáo viên tự nhận ra → hỏi về tác động tới HS.
 * `tranhNoi` giữ lại câu phán xét ĐỪNG nói, để người dự giờ thấy rõ khác biệt.
 */
export interface LuotHuanLuyen {
  ma: string;
  quanSat: string;
  cauHoiNhanThuc: string;
  cauHoiTacDong: string;
  tranhNoi: string;
}

/** Kịch bản 5 bước: Tập trung → Khám phá → Phản tư → Lập kế hoạch → Theo dõi. */
export interface KichBanTroChuyen {
  tapTrung: string;
  khamPha: string;
  phanTu: string;
  lapKeHoach: string;
  theoDoi: string;
}

export interface NhanXetTraoDoi {
  diemManh: DiemManh[];
  trongTam: TrongTamCaiThien | null;
  cauHoiHuanLuyen: string[];
  canLamRo: string[];
  /** Kịch bản mở/dẫn/chốt cuộc trò chuyện theo 5 bước của trường. */
  kichBan?: KichBanTroChuyen | null;
  /** Lượt huấn luyện cho từng trọng tâm đã chọn. */
  luotHuanLuyen?: LuotHuanLuyen[];
}

/** 15 cấu phần như mẫu Excel của trường, hoặc đủ 22 thành tố của khung. */
export type BoTieuChi = 'dugio' | 'daydu';

export interface BienBanDuGio {
  id: string;
  userId: string;

  // Phần hành chính — đúng các ô ở đầu mẫu biên bản của trường.
  gvHoTen: string;
  lop: string;
  tuan: string;
  bai: string;
  ngay: string;
  nguoiDu: string;
  namHocKy: string;

  /** Bảng quan sát theo dòng. Nguồn chính để AI gán bằng chứng. */
  dongQuanSat: DongQuanSat[];
  /** Ghi chép tự do, dùng khi không muốn nhập theo bảng. */
  bienBan: string;
  /** Dán vào nếu chấm cả Phần I (căn cứ giáo án). */
  giaoAn: string;
  /** Tự phản tư + hồ sơ, nếu chấm cả Phần IV. */
  hoSo: string;

  boTieuChi: BoTieuChi;
  ketQua: Partial<Record<MaThanhTo, KetQuaThanhTo>>;
  diemChot: Partial<Record<MaThanhTo, number | null>>;
  /** Đánh dấu chỗ người chốt khác đề xuất của AI — để sau còn truy được. */
  daSua: Partial<Record<MaThanhTo, boolean>>;
  /** Minh chứng chạm ngưỡng cho điểm lẻ NGƯỜI DỰ GIỜ tự chốt (tách khỏi đề xuất AI). */
  chamNguong: Partial<Record<MaThanhTo, string>>;
  gopY: Partial<Record<MaThanhTo, GopYThanhTo>>;
  /** Góp ý được chọn đưa vào buổi trao đổi. */
  trongTam: Partial<Record<MaThanhTo, boolean>>;
  nhanXet: NhanXetTraoDoi | null;

  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export const bienBanRong = (userId: string): BienBanDuGio => ({
  id: '',
  userId,
  gvHoTen: '',
  lop: '',
  tuan: '',
  bai: '',
  ngay: new Date().toISOString().slice(0, 10),
  nguoiDu: '',
  namHocKy: '',
  dongQuanSat: [],
  bienBan: '',
  giaoAn: '',
  hoSo: '',
  boTieuChi: 'dugio',
  ketQua: {},
  diemChot: {},
  daSua: {},
  chamNguong: {},
  gopY: {},
  trongTam: {},
  nhanXet: null,
  isPublic: false,
  createdAt: '',
  updatedAt: '',
});
