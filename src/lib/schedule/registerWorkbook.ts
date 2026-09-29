/**
 * Xuất sổ "Lịch báo giảng" ra Excel: mỗi tuần một trang theo khuôn chung
 * (Thứ/ngày | Buổi | Tiết | Tiết PPCT | Môn | Lớp | Tên bài giảng | Đồ dùng dạy học), cuối trang chỗ tổ trưởng ký.
 */
import * as XLSX from 'xlsx';
import { addDays } from './lessonCalendar';
import { registerDateLabel, type RegisterRow } from './scheduleFormat';

export interface RegisterWeek {
  week: number;
  monday: string;
  rows: RegisterRow[];
}

export const REGISTER_HEADER = ['Thứ/ngày', 'Buổi', 'Tiết', 'Tiết PPCT', 'Môn học', 'Lớp', 'Tên bài giảng', 'Đồ dùng dạy học'];

/** Các dòng của một trang tuần (mảng 2 chiều, dễ kiểm). */
export const registerSheetRows = (w: RegisterWeek, teacherName: string, lastDay: number): (string | number)[][] => {
  const out: (string | number)[][] = [
    ['LỊCH BÁO GIẢNG'],
    [`Giáo viên: ${teacherName}`],
    [`Tuần học thứ ${w.week}`, 'Từ ngày', registerDateLabel(w.monday), 'đến ngày', registerDateLabel(addDays(w.monday, lastDay - 1))],
    REGISTER_HEADER,
  ];
  let prevDate = '';
  let prevSession = '';
  let dayRow = 0;
  for (const r of w.rows) {
    const newDay = r.date !== prevDate;
    dayRow = newDay ? 0 : dayRow + 1;
    // Cột đầu: dòng 1 của ngày ghi thứ, dòng 2 ghi ngày.
    const first = dayRow === 0 ? r.dayLabel : dayRow === 1 ? registerDateLabel(r.date) : '';
    const session = newDay || r.session !== prevSession ? r.session : '';
    out.push([first, session, r.periodNo, r.ppctNo ?? '', r.subject, r.className, r.title, '']);
    prevDate = r.date;
    prevSession = r.session;
  }
  out.push([], ['', '', '', '', '', '', 'Ngày …… tháng …… năm 20……'], ['', '', '', '', '', '', 'TỔ TRƯỞNG']);
  return out;
};

/** Tạo file .xlsx (mảng byte) gồm các tuần đã chọn. */
export const buildRegisterWorkbook = (weeks: readonly RegisterWeek[], teacherName: string, lastDay: number): Uint8Array => {
  const wb = XLSX.utils.book_new();
  for (const w of weeks) {
    const ws = XLSX.utils.aoa_to_sheet(registerSheetRows(w, teacherName, lastDay));
    ws['!cols'] = [{ wch: 11 }, { wch: 11 }, { wch: 6 }, { wch: 9 }, { wch: 12 }, { wch: 14 }, { wch: 60 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws, `Tuần ${w.week}`);
  }
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
};
