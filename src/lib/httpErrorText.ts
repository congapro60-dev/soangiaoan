/**
 * Câu báo lỗi cho người dùng khi chỉ có mã HTTP (máy chủ không gửi kèm lời giải thích).
 * Mã trần như "409" hay "503" không ai hiểu: luôn nói lí do + việc cần làm, mã chỉ để cuối câu cho người sửa lỗi.
 */

/** Lỗi do máy chủ của web trả về. */
const SERVER_REASONS: Record<number, string> = {
  400: 'yêu cầu gửi lên chưa hợp lệ (thiếu thông tin hoặc sai định dạng). Kiểm tra lại dữ liệu rồi thử lại',
  401: 'phiên đăng nhập đã hết hạn. Tải lại trang và đăng nhập lại',
  402: 'cần khoá AI riêng hoặc số dư ví web để dùng tính năng này. Mở mục "AI của tôi" để nhập khoá hoặc nạp thêm',
  403: 'tài khoản này không có quyền làm thao tác này. Kiểm tra đúng tài khoản đang đăng nhập',
  404: 'không tìm thấy dữ liệu, có thể đã bị xoá hoặc đường dẫn sai',
  405: 'thao tác không được hỗ trợ. Tải lại trang để dùng bản mới nhất',
  408: 'chờ quá lâu nên bị ngắt. Kiểm tra mạng rồi thử lại',
  409: 'dữ liệu đang được một thao tác khác xử lý hoặc vừa bị thay đổi. Đợi một chút, tải lại trang rồi thử lại',
  413: 'file hoặc dữ liệu gửi lên quá lớn. Gửi ít file hơn hoặc nén nhỏ ảnh',
  422: 'dữ liệu chưa đủ hoặc chưa đúng để xử lý. Kiểm tra lại nội dung đã nhập',
  429: 'đã dùng hết số lượt cho phép (hết hạn mức hoặc gửi quá nhiều lần liên tục). Đợi vài phút rồi thử lại',
  500: 'máy chủ gặp lỗi bất ngờ. Thử lại; nếu vẫn lỗi, báo cho người quản trị',
  502: 'dịch vụ máy chủ đang gọi tới (AI, Google…) trả lỗi. Thử lại sau ít phút',
  503: 'dịch vụ đang quá tải hoặc tạm ngừng. Thử lại sau ít phút',
  504: 'xử lý quá lâu nên bị ngắt. Thử lại, hoặc gửi ít dữ liệu hơn',
};

/** Lỗi do dịch vụ bên ngoài (Gemini, Google Sheets/Drive, Kroki…) trả về. */
const PROVIDER_REASONS: Record<number, string> = {
  400: 'yêu cầu gửi đi bị từ chối (ảnh/file hỏng, quá lớn, hoặc nội dung sai định dạng)',
  401: 'khoá truy cập sai hoặc đã hết hạn',
  403: 'không có quyền: khoá bị khoá, chưa bật thanh toán, hoặc tài khoản chưa được cấp quyền',
  404: 'không tìm thấy tài nguyên (file đã bị xoá, link sai, hoặc model AI không còn)',
  408: 'chờ quá lâu nên bị ngắt',
  413: 'dữ liệu gửi đi quá lớn',
  429: 'đã hết hạn mức của khoá hoặc đang gọi quá nhanh. Đợi vài phút, hoặc đổi khoá khác',
  500: 'dịch vụ gặp lỗi nội bộ. Thử lại sau ít phút',
  502: 'dịch vụ tạm thời không phản hồi đúng. Thử lại sau ít phút',
  503: 'dịch vụ đang quá tải. Thử lại sau ít phút',
  504: 'dịch vụ xử lý quá lâu. Thử lại, hoặc gửi ít dữ liệu hơn',
};

const fallbackReason = (status: number): string => (status >= 500
  ? 'đang gặp sự cố. Thử lại sau ít phút'
  : 'từ chối yêu cầu. Kiểm tra lại dữ liệu rồi thử lại');

/** "Máy chủ báo lỗi: phiên đăng nhập đã hết hạn… (mã 401)." */
export const moTaLoiHttp = (status: number, source = 'Máy chủ'): string =>
  `${source} báo lỗi: ${SERVER_REASONS[status] ?? fallbackReason(status)} (mã ${status}).`;

/** "Gemini báo lỗi: đã hết hạn mức của khoá… (mã 429)." */
export const moTaLoiDichVu = (status: number, source: string): string =>
  `${source} báo lỗi: ${PROVIDER_REASONS[status] ?? fallbackReason(status)} (mã ${status}).`;
