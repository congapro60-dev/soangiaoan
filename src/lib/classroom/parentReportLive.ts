/**
 * Báo cáo đã công bố cho phụ huynh vẫn đúng với dữ liệu MỚI NHẤT: số liệu (điểm, số bài, điểm thi, năng lực, so sánh…)
 * dựng lại từ dữ liệu hiện tại; phần do giáo viên viết hoặc đã duyệt (nhận xét, dòng yêu cầu cần đạt, nhận diện trường, ngày lập)
 * giữ nguyên như bản đã công bố. Chỗ giáo viên chỉnh tay áp lên SAU cùng (xem `reportOverrides`).
 * Module thuần — máy chủ (api/) dùng.
 */
import type { ParentReportPrintInput } from './parentReportTypes.js';

export const mergeLiveInput = (snapshot: ParentReportPrintInput, fresh: Omit<ParentReportPrintInput, 'teacherComment'>): ParentReportPrintInput => ({
  ...snapshot,
  report: fresh.report,
  studentName: fresh.studentName,
  className: fresh.className,
  ...(fresh.studentCode !== undefined ? { studentCode: fresh.studentCode } : {}),
  competency: fresh.competency,
  exams: fresh.exams,
  hs1: fresh.hs1,
  comparison: fresh.comparison,
  monthly: fresh.monthly,
  period: fresh.period ?? snapshot.period,
});
