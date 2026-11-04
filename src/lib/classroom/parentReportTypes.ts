/** Kiểu dữ liệu thuần của báo cáo phụ huynh — tách khỏi `parentReportPrintDoc` (dính thư viện PDF/DOM) để máy chủ dùng được. */
import type { ParentSafeReport } from './parentSafeReport.js';
import type { CompetencyLevel } from './competency/framework.js';
import type { StudentExamScores } from './examScores.js';
import type { Hs1Mark } from './scoreBook.js';
import type { MonthPoint, PeriodComparison, ReportKind } from './reportPeriod.js';
import type { ParentRequirementLine } from './parentRequirements.js';
import type { WeekPlan } from './reportWeeks.js';

/** Một năng lực Toán đã được đánh giá (đã có bài duyệt), rút từ hồ sơ năng lực cho bản phụ huynh. */
export interface ParentCompetencyItem {
  area: string;
  topic: string;
  level: CompetencyLevel;
}

/** Tóm tắt hồ sơ năng lực an toàn để gửi phụ huynh — chỉ tên năng lực + mức, không đáp án/ghi chú. */
export interface ParentCompetencySummary {
  /** Khối lớp của khung năng lực ("10"/"11"/"12"). */
  grade: string;
  assessed: number;
  total: number;
  items: ParentCompetencyItem[];
}

export interface ParentReportPrintInput {
  report: ParentSafeReport;
  studentName: string;
  className: string;
  studentCode?: string;
  /** Ngày lập báo cáo dạng dd/mm/yyyy; mặc định là hôm nay. */
  generatedOn?: string;
  /** Hồ sơ năng lực rút gọn; vắng thì bỏ mục "Năng lực Toán học". */
  competency?: ParentCompetencySummary | null;
  /** Điểm thi định kì (MOET + TDS) từ sổ điểm lớp. */
  exams?: StudentExamScores | null;
  /** Điểm hệ số 1 giáo viên nhập trên lớp. Vắng cả hai thì bỏ mục điểm kiểm tra/thi. */
  hs1?: Hs1Mark[] | null;
  /** Báo cáo theo tháng/kì/năm; vắng = báo cáo chung từ đầu năm như trước. */
  period?: { title: string; range: string; kind: ReportKind } | null;
  /** So sánh tháng trước / hai nửa kì / hai học kì. */
  comparison?: PeriodComparison | null;
  /** Điểm trung bình theo từng tháng (báo cáo kì/năm). */
  monthly?: MonthPoint[] | null;
  /** Nhận xét riêng của giáo viên (AI soạn nháp, giáo viên đã sửa). */
  teacherComment?: string;
  /** Kết quả theo yêu cầu cần đạt (giáo viên đã soát). Có thì thay cho danh sách "Điểm mạnh / Cần rèn thêm". */
  requirements?: ParentRequirementLine[] | null;
  /** Lịch dạy của giáo viên (tuần 1, tuần nghỉ) để chia "Kết quả theo bài" thành tuần học; vắng thì chia theo khoảng ngày. */
  weekPlan?: WeekPlan | null;
  /** Nhận diện trường/giáo viên ở đầu báo cáo; vắng thì chỉ hiện tiêu đề báo cáo. */
  branding?: { schoolName?: string; teacherName?: string; /** data URL png/jpeg/webp của logo trường */ logoDataUrl?: string } | null;
}
