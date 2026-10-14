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

export interface DeadlineState {
  key: 'pending' | 'imminent' | 'overdue' | 'ontime' | 'late' | 'submitted';
  label: string;
  className: string;
  dueLabel: string;
}

const IMMINENT_MS = 24 * 60 * 60 * 1000;

export const submissionDeadlineState = (
  dueAt?: string,
  submittedAt?: string,
  now = Date.now()
): DeadlineState => {
  const hasDue = Boolean(dueAt && Number.isFinite(Date.parse(dueAt)));
  const dueLabel = hasDue
    ? new Date(dueAt!).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour12: false,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  if (submittedAt && Number.isFinite(Date.parse(submittedAt))) {
    if (!hasDue) {
      return { key: 'submitted', label: 'Đã nộp', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dueLabel };
    }
    const late = laNopQuaHan(submittedAt, dueAt);
    return late
      ? { key: 'late', label: 'Nộp muộn', className: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200', dueLabel }
      : { key: 'ontime', label: 'Đúng hạn', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dueLabel };
  }

  if (!hasDue) {
    return { key: 'pending', label: 'Chưa nộp', className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200', dueLabel };
  }

  const dueTime = new Date(dueAt!).getTime();
  if (now > dueTime) {
    return { key: 'overdue', label: 'Quá hạn chưa nộp', className: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200', dueLabel };
  }
  if (dueTime - now <= IMMINENT_MS) {
    return { key: 'imminent', label: 'Sắp đến hạn', className: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200', dueLabel };
  }
  return { key: 'pending', label: 'Chưa nộp', className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200', dueLabel };
};
