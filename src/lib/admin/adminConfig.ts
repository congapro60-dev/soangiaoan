/**
 * Quyền quản trị của CHỦ DỰ ÁN. Dùng chung cho giao diện (ẩn/hiện tab) và máy chủ (kiểm thật).
 * Giao diện chỉ để ẩn tab — quyền thật luôn được kiểm lại ở máy chủ bằng token Google đã xác minh.
 */
export const ADMIN_EMAILS: readonly string[] = ['congapro60@gmail.com'];

export const isAdminEmail = (email: string | null | undefined): boolean =>
  typeof email === 'string' && ADMIN_EMAILS.includes(email.trim().toLowerCase());

/**
 * Ngày bộ đếm token bắt đầu chạy trên production (commit 00ceefc, 24/09/2026, giờ VN).
 * Trước ngày này app KHÔNG có số token theo người — chỉ phân bổ ƯỚC TÍNH từ tổng Google thực thu.
 */
export const METERING_START_DAY = '2026-09-24';
