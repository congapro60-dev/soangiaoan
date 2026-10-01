import * as XLSX from 'xlsx';

/**
 * File "Mail merge" cho SSM Edufit (Truyền thông → Thông tin → Mail merge): GV tải file lên SSM, soạn MỘT tin có
 * chỗ trống {…}, SSM gửi tin riêng tới phụ huynh từng em qua app Edufit Parents (và email/SMS nếu chọn).
 *
 * Bố cục theo file mẫu SSM (Codex tải 01/10/2026 từ màn Mail merge): 3 sheet, sheet 1 "Kangatang" ẩn và trống,
 * "Dữ liệu Import" dòng 1 là tiêu đề — cột A BẮT BUỘC tên `Ma_Hocsinh` (mã học sinh), từ cột B GV tự thêm, tên cột
 * không dấu, nối bằng "_", chỉ dùng định dạng Text, dữ liệu từ dòng 2; sheet "Hướng dẫn nhập liệu " (có dấu cách cuối tên).
 * Cú pháp ghi cột trong {} trên SSM chưa kiểm bằng lần gửi thật → gợi ý dùng đúng tên cột; xem bản demo của SSM trước khi gửi.
 */
export const SSM_MERGE_HEADERS = ['Ma_Hocsinh', 'Ho_ten_Hoc_sinh', 'PIN_phu_huynh', 'Link_bao_cao'] as const;

/** Nội dung tin gợi ý để dán vào ô nội dung của SSM (tên trong {} = tên cột ở file). */
export const SSM_MERGE_MESSAGE = [
  'Kính gửi phụ huynh em {Ho_ten_Hoc_sinh},',
  'Thầy cô gửi phụ huynh đường dẫn xem báo cáo học tập môn Toán của em: {Link_bao_cao}',
  'Cách vào: chọn tên con → nhập mã PIN: {PIN_phu_huynh}',
  'Mã PIN dành riêng cho phụ huynh, xin đừng chia sẻ. Các báo cáo mới sẽ được cập nhật tại cùng đường dẫn này.',
  'Trân trọng.',
].join('\n');

export interface SsmMergeInput {
  /** Mã học sinh của trường (khớp mã trên SSM). */
  code: string;
  name: string;
  pin: string;
}

const GUIDE_SHEET = 'Hướng dẫn nhập liệu ';
const DATA_SHEET = 'Dữ liệu Import';
const GUIDE_LINES = [
  'HƯỚNG DẪN NHẬP LIỆU',
  '1. Nhập liệu tại sheet "Dữ liệu Import" để import dữ liệu theo hình thức Mail merge. ',
  '- Cột A: Ma_Hocsinh là bắt buộc, giữ nguyên tên cột và vị trí của cột này',
  '- Từ cột B trở đi: Người dùng chủ động thêm vào file, tên cột không bao gồm các dấu của Tiếng Việt ( sắc, huyền, hỏi, ngã, nặng), nên để dưới dạng viết liền không dấu, nếu có nhiều từ có thể ngăn cách bởi dấu "_"',
  'Chú ý: Khi nhập dữ liệu vào file Excel, vui lòng chỉ sử dụng định dạng văn bản thông thường (Text). Không sử dụng các định dạng đặc biệt của Excel.',
  '- Nhập từ dòng 2 trở đi',
  '2. Không nhập liệu tại sheet "Hướng dẫn nhập liệu "',
];

/** Dòng dữ liệu theo thứ tự lớp; em chưa có mã HS vẫn có dòng (mã trống) để GV thấy và bổ sung. Mọi ô là chữ (không số). */
export const ssmMergeRows = (students: readonly SsmMergeInput[], link: string): string[][] =>
  students.map(s => [s.code.trim(), s.name.trim(), s.pin, link]);

export const buildSsmMergeWorkbook = (students: readonly SsmMergeInput[], link: string): XLSX.WorkBook => {
  const data = XLSX.utils.aoa_to_sheet([[...SSM_MERGE_HEADERS], ...ssmMergeRows(students, link)]);
  data['!cols'] = [{ wch: 16 }, { wch: 28 }, { wch: 16 }, { wch: 44 }];
  const guide = XLSX.utils.aoa_to_sheet(GUIDE_LINES.map(line => [line]));
  guide['!cols'] = [{ wch: 120 }];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([]), 'Kangatang');
  XLSX.utils.book_append_sheet(book, data, DATA_SHEET);
  XLSX.utils.book_append_sheet(book, guide, GUIDE_SHEET);
  book.Workbook = { Sheets: [{ Hidden: 1 }, { Hidden: 0 }, { Hidden: 0 }] };
  return book;
};

/** Học sinh chưa có mã HS — SSM sẽ tô đỏ dòng đó nên cần báo trước. */
export const missingCodeCount = (students: readonly SsmMergeInput[]): number => students.filter(s => !s.code.trim()).length;
