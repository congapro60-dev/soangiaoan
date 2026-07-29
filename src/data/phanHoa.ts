/**
 * Dạy học phân hóa — ánh xạ sang khung Danielson.
 *
 * NGUỒN: "các yêu cầu về Toán cần đạt/GVHT Dạy học phân hóa SY26-27.pdf",
 * trang 11 "Look fors: Biểu hiện cụ thể của Dạy học Phân hóa tại TDS".
 *
 * VÌ SAO CẦN: quy định của trường ghi trong file kế hoạch tự thúc đẩy —
 * "trong 3 tiêu chí phải có tiêu chí liên quan tới dạy học phân hóa". Không có
 * danh sách này thì không tự kiểm được ràng buộc đó.
 *
 * MỨC ĐỘ CHẮC CHẮN của từng phần dữ liệu dưới đây:
 *  - `thanhTo` và THANH_TO_TRONG_TAM_2627: NGUYÊN VĂN từ trang 11. Sáu thành tố
 *    tô đỏ trong slide là trọng tâm quan sát năm học 26-27 — chỉ đọc được khi
 *    render trang ra ảnh, trích văn bản thuần không thấy màu.
 *  - `tieuChiCon`: SUY RA từ mô tả biểu hiện đối chiếu với định nghĩa tiêu chí
 *    con. Trường chưa ban hành ánh xạ tới tầng này. Đối chiếu ngược với kế
 *    hoạch 2024-25 có thật của một giáo viên (chọn 1e.1, 1e.3, 3c.2 và được
 *    duyệt) thì khớp — nhưng vẫn nên coi là bản đề xuất, không phải quy định.
 */
import type { MaThanhTo } from './khungDanielson';

/**
 * Sáu thành tố được TÔ ĐỎ ở trang 11 — trọng tâm quan sát năm học 26-27.
 *
 * Đánh dấu ở tầng THÀNH TỐ chứ không phải tầng biểu hiện: trong cùng một dòng
 * "Hỗ trợ cho học sinh đa dạng (2c, 3e)" thì 3e đỏ còn 2c đen.
 */
export const THANH_TO_TRONG_TAM_2627: readonly MaThanhTo[] = ['1d', '1e', '1f', '3c', '3d', '3e'];

export interface BieuHienPhanHoa {
  ten: string;
  moTa: string;
  /** Thành tố Danielson trường nêu đích danh ở trang 11. */
  thanhTo: readonly MaThanhTo[];
  /** Tiêu chí con khớp nhất — phần suy ra, xem ghi chú đầu file. */
  tieuChiCon: readonly string[];
}

export const BIEU_HIEN_PHAN_HOA: readonly BieuHienPhanHoa[] = [
  {
    ten: 'Mục tiêu học tập rõ ràng',
    moTa: 'Mục tiêu được xây dựng theo từng cấp độ để phù hợp với các trình độ học tập khác nhau.',
    thanhTo: ['1c'],
    tieuChiCon: ['1c.1', '1c.3'],
  },
  {
    ten: 'Chiến lược giảng dạy đa dạng',
    moTa: 'Kết hợp nhiều phương pháp dạy học phù hợp với các phong cách học tập khác nhau.',
    thanhTo: ['1e'],
    tieuChiCon: ['1e.1', '1e.2'],
  },
  {
    ten: 'Ghép nhóm linh hoạt và có chủ đích',
    moTa: 'Nhóm học tập linh hoạt được lập kế hoạch và triển khai hiệu quả để phục vụ việc phân hóa: học cả lớp, học theo nhóm, ghép cặp, làm việc cá nhân.',
    thanhTo: ['3c'],
    tieuChiCon: ['1e.3', '3c.2'],
  },
  {
    ten: 'Nhiệm vụ phân tầng',
    moTa: 'Nhiệm vụ có các mức độ phức tạp khác nhau và hỗ trợ phù hợp.',
    thanhTo: ['3c'],
    tieuChiCon: ['3c.1'],
  },
  {
    ten: 'Lựa chọn và tiếng nói của học sinh',
    moTa: 'Học sinh có cơ hội lựa chọn hình thức hoạt động và loại hình sản phẩm học tập được tạo ra.',
    thanhTo: ['2b'],
    tieuChiCon: ['2b.3'],
  },
  {
    ten: 'Đánh giá phân hóa',
    moTa: 'Sử dụng nhiều phương pháp đánh giá khác nhau.',
    thanhTo: ['1f', '3d'],
    tieuChiCon: ['1f.3', '1f.4', '3d.2'],
  },
  {
    ten: 'Hỗ trợ cho học sinh đa dạng',
    moTa: 'Linh hoạt điều chỉnh cho phù hợp với nhu cầu học tập của học sinh, ví dụ học sinh có nhu cầu đặc biệt và học sinh năng khiếu.',
    thanhTo: ['2c', '3e'],
    tieuChiCon: ['2c.3', '3e.1', '3e.2'],
  },
  {
    ten: 'Sử dụng tài liệu phân hóa',
    moTa: 'Văn bản, phiếu bài tập và công cụ được điều chỉnh theo trình độ của học sinh.',
    thanhTo: ['1d', '3c'],
    tieuChiCon: ['1d.1', '1d.3', '3c.3'],
  },
];

/** Bốn trục phân hóa và ba căn cứ, theo trang 6-8 của tài liệu tập huấn. */
export const TRUC_PHAN_HOA = [
  { ten: 'Nội dung', hoi: 'Học sinh học gì?' },
  { ten: 'Quá trình', hoi: 'Học sinh học bằng cách nào?' },
  { ten: 'Sản phẩm', hoi: 'Học sinh thể hiện những gì đã học bằng cách nào?' },
  { ten: 'Môi trường', hoi: 'Không gian vật lý, tâm lý và xã hội có phù hợp cho việc học không?' },
] as const;

export const CAN_CU_PHAN_HOA = [
  { ten: 'Sự sẵn sàng', hoi: 'Học sinh đang ở đâu? Thử thách có phù hợp không?' },
  { ten: 'Sở thích', hoi: 'Học sinh thích hoặc quan tâm điều gì?' },
  { ten: 'Phong cách học tập', hoi: 'Học sinh thích được học như thế nào?' },
] as const;

/** Phân biệt ba khái niệm hay bị gộp — trang 4-5. */
export const PHAN_BIET = {
  phanHoa: 'Giáo viên giảng dạy cho CÁC NHÓM học sinh.',
  caNhanHoa: 'Giáo viên giảng dạy cho TỪNG HỌC SINH.',
  caTinhHoa: 'Học sinh THÚC ĐẨY việc học của chính mình.',
} as const;

/** Mọi tiêu chí con được coi là liên quan tới dạy học phân hóa. */
export const TIEU_CHI_CON_PHAN_HOA: readonly string[] = [
  ...new Set(BIEU_HIEN_PHAN_HOA.flatMap(b => b.tieuChiCon)),
].sort();

/**
 * Riêng nhóm trọng tâm 26-27. Lọc theo THÀNH TỐ CHA của tiêu chí con, vì màu đỏ
 * ở trang 11 đánh vào thành tố chứ không vào cả dòng biểu hiện.
 */
export const TIEU_CHI_CON_TRONG_TAM_2627: readonly string[] = TIEU_CHI_CON_PHAN_HOA.filter(ma =>
  (THANH_TO_TRONG_TAM_2627 as readonly string[]).includes(ma.split('.')[0]),
);

/** true khi tiêu chí con thuộc nhóm trọng tâm quan sát năm học 26-27. */
export function laTrongTam2627(maTieuChiCon: string): boolean {
  return TIEU_CHI_CON_TRONG_TAM_2627.includes(maTieuChiCon);
}

/** Thành tố Danielson trường nêu đích danh là liên quan phân hóa. */
export const THANH_TO_PHAN_HOA: readonly MaThanhTo[] = [
  ...new Set(BIEU_HIEN_PHAN_HOA.flatMap(b => b.thanhTo)),
].sort() as MaThanhTo[];

export function laTieuChiPhanHoa(maTieuChiCon: string): boolean {
  return TIEU_CHI_CON_PHAN_HOA.includes(maTieuChiCon);
}

/** Biểu hiện phân hóa mà một tiêu chí con thuộc về; rỗng nếu không liên quan. */
export function bieuHienCua(maTieuChiCon: string): BieuHienPhanHoa[] {
  return BIEU_HIEN_PHAN_HOA.filter(b => b.tieuChiCon.includes(maTieuChiCon));
}
