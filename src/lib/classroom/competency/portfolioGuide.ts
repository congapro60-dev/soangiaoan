/**
 * Hướng dẫn + gợi ý điền hồ sơ năng lực (không cần AI) — cho HS tự đánh giá và GV soát.
 * Bám lưu ý của file mẫu trường: mục tiêu SMART, hành động cụ thể, cập nhật kết quả cuối tháng.
 */
import { COMPETENCY_LEVELS, type Competency, type CompetencyLevel } from './framework.js';
import { levelDescriptions } from './levelDescriptions.js';
import type { PortfolioEntry } from './studentPortfolio.js';

export type PortfolioTextField = 'goal' | 'plan' | 'difficulty';

export const FIELD_GUIDE: Record<PortfolioTextField | 'timeframe' | 'progress' | 'selfLevel', { label: string; hint: string; placeholder?: string }> = {
  selfLevel: {
    label: 'Em tự đánh giá',
    hint: 'Đọc mô tả 4 mức bên dưới, chọn mức ĐÚNG với em lúc này (không phải mức em muốn). Thầy cô sẽ đối chiếu với bài em đã làm.',
  },
  goal: {
    label: 'Mục tiêu',
    hint: 'Viết theo SMART: cụ thể, đo được, vừa sức, gắn với môn Toán, có hạn. Ví dụ: "Đạt mức Tốt: giải đúng 4/5 bài bất phương trình trong BTVN trước cuối tháng 11".',
    placeholder: 'Em muốn đạt mức nào, đo bằng gì, trước khi nào?',
  },
  plan: {
    label: 'Phương án tự đề xuất',
    hint: 'Hành động cụ thể, làm được mỗi tuần. Ví dụ: "Mỗi tối thứ 3, thứ 5 làm lại 2 bài sai trong BTVN; hỏi thầy cô khi kẹt quá 15 phút".',
    placeholder: 'Em sẽ làm gì, bao lâu một lần?',
  },
  timeframe: {
    label: 'Thời gian thực hiện',
    hint: 'Chọn tháng em hẹn sẽ đạt mục tiêu.',
  },
  difficulty: {
    label: 'Khó khăn',
    hint: 'Em đang vướng ở đâu? Ví dụ: "Hay quên đổi chiều bất phương trình khi nhân số âm".',
    placeholder: 'Chỗ nào em hay sai / chưa hiểu?',
  },
  progress: {
    label: 'Tiến độ',
    hint: 'Cập nhật cuối mỗi tháng: đã làm tới đâu so với kế hoạch.',
  },
};

export const STUDENT_INTRO = [
  'Chọn một năng lực, đọc mô tả 4 mức và tự chọn mức của em.',
  'Đặt mục tiêu nâng lên mức kế tiếp — bấm "Gợi ý" để có câu mẫu rồi sửa theo ý em.',
  'Ghi phương án và khó khăn, chọn tháng, bấm Lưu. Cuối tháng quay lại cập nhật Tiến độ.',
  'Thầy cô xem được, có thể sửa và ghi ý kiến; mức thầy cô chốt hiện ngay bên cạnh.',
];

export const TEACHER_INTRO = [
  'Mức app đề xuất tính từ bài đã duyệt; thầy cô chốt lại ở ô "Mức GV" (để trống = dùng mức đề xuất).',
  'Bấm "AI soạn nháp" để AI điền mức chốt, ý kiến và gợi ý kế hoạch cho ô HS còn trống — soát, sửa rồi Lưu.',
  'Khi xuất file trường: mức HS tự đánh giá bôi vàng, mức GV chốt bôi xanh.',
];

/** Mức ngay trên mức hiện tại (Chưa đạt → Đạt → Tốt → Xuất sắc); đã Xuất sắc thì giữ nguyên. */
export const nextLevel = (level: CompetencyLevel | null | undefined): CompetencyLevel => {
  if (!level) return 'Đạt yêu cầu';
  const index = COMPETENCY_LEVELS.indexOf(level);
  return COMPETENCY_LEVELS[Math.max(0, index - 1)];
};

/** Câu mẫu cho các ô chữ của HS, dựa trên mức em tự chọn và mô tả mức kế tiếp. */
export const suggestEntryText = (
  competency: Competency,
  entry: PortfolioEntry,
  timeframe: string,
): Record<PortfolioTextField, string> => {
  const target = nextLevel(entry.selfLevel);
  const descriptions = levelDescriptions(competency);
  const targetText = descriptions ? descriptions[COMPETENCY_LEVELS.indexOf(target)] : competency.competency;
  const keep = entry.selfLevel === 'Xuất sắc';
  return {
    goal: keep
      ? `Giữ mức Xuất sắc ở "${competency.topic}": ${targetText.charAt(0).toLowerCase()}${targetText.slice(1)}${timeframe ? `, duy trì tới ${timeframe}` : ''}.`
      : `Đạt mức ${target} ở "${competency.topic}": ${targetText.charAt(0).toLowerCase()}${targetText.slice(1)}${timeframe ? ` trước ${timeframe}` : ''}.`,
    plan: `Mỗi tuần làm lại 2–3 bài về ${competency.topic.toLowerCase()} trong BTVN đã chữa, tự kiểm tra bằng đáp án; ghi lại lỗi hay gặp và hỏi thầy cô khi chưa hiểu.`,
    difficulty: `Em còn lúng túng khi ${competency.competency.charAt(0).toLowerCase()}${competency.competency.slice(1)}.`,
  };
};
