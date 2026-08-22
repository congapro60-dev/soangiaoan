// Nhãn nộp đúng hạn / muộn tính ĐỘNG lúc hiển thị, KHÔNG lưu cờ vào dữ liệu:
// giáo viên đổi hạn là mọi bài nộp cũ tự phân loại lại theo hạn mới, không phải quét backfill.

/**
 * true khi bài nộp đến sau hạn. Nộp ĐÚNG bằng mốc hạn vẫn counted là đúng hạn
 * (dùng so sánh nghiêm `>`), vì đồng hồ máy học sinh lệch vài trăm ms là chuyện thường.
 */
export const laNopQuaHan = (thoiDiemNop: string, hanNop?: string): boolean => {
  if (!hanNop) return false;
  const han = new Date(hanNop).getTime();
  if (Number.isNaN(han)) return false;
  const nop = new Date(thoiDiemNop).getTime();
  if (Number.isNaN(nop)) return false;
  return nop > han;
};
