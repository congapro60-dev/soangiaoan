// Cổng chất lượng cho luồng tạo "Giáo án ban Toán": sau khi AI sinh giáo án, chấm bằng bộ
// kiểm định deterministic (mathStandards). Nếu thiếu tiêu chí quan trọng thì dựng một brief
// sửa CHỈ những phần thiếu để gọi AI sửa 1 lượt — không viết lại từ đầu.

import type { ToanKeHoach } from '../types';
import {
  auditMathStandards,
  type StandardsFinding,
  type LessonType,
} from './lessonUpgrade/mathStandards';

const keHoachToLessonType = (keHoach?: ToanKeHoach): LessonType | undefined => {
  if (keHoach === 'luyen_tap') return 'practice';
  if (keHoach === 'kien_thuc') return 'knowledge';
  if (keHoach === 'dao_nguoc') return 'flipped';
  return undefined;
};

export interface ToanQualityResult {
  passed: boolean;
  /** Các tiêu chí severity 'high' đang FAIL — cần sửa trước khi giao. */
  failures: StandardsFinding[];
  allFindings: StandardsFinding[];
}

/**
 * Chấm giáo án Toán do AI sinh. `passed` khi không còn tiêu chí quan trọng (high) bị fail.
 * Với kế hoạch luyện tập, bộ kiểm mục C (Polya, 2 lộ trình gợi ý) được bật.
 */
export const validateToanLesson = (content: string, keHoach?: ToanKeHoach): ToanQualityResult => {
  const { findings } = auditMathStandards(content, keHoachToLessonType(keHoach));
  const failures = findings.filter((f) => f.severity === 'high' && f.status === 'fail');
  return { passed: failures.length === 0, failures, allFindings: findings };
};

/**
 * Brief sửa tập trung: liệt kê ĐÚNG các tiêu chí còn thiếu + hướng sửa, yêu cầu AI bổ sung
 * tại chỗ mà giữ nguyên phần đã đạt. Trả về '' nếu không có lỗi.
 */
export const buildToanRepairBrief = (content: string, failures: StandardsFinding[]): string => {
  if (failures.length === 0) return '';
  const items = failures
    .map((f, i) => `${i + 1}. ${f.title}\n   - Vấn đề: ${f.evidence}\n   - Cần sửa: ${f.suggestion}`)
    .join('\n');
  return `BẠN LÀ TỔ TRƯỞNG CHUYÊN MÔN TOÁN. Giáo án dưới đây CÒN THIẾU một số tiêu chí bắt buộc.
Hãy SỬA và BỔ SUNG ĐÚNG những điểm còn thiếu, GIỮ NGUYÊN các phần đã đạt, KHÔNG rút gọn nội dung cũ, KHÔNG đổi chủ đề/lớp/thời lượng.

CÁC ĐIỂM CẦN SỬA:
${items}

GIÁO ÁN HIỆN TẠI:
---
${content}
---

TRẢ VỀ TOÀN BỘ giáo án đã sửa hoàn chỉnh dưới dạng Markdown (giữ cấu trúc bảng 3 cột và công thức LaTeX), KHÔNG kèm lời giải thích ngoài giáo án.`;
};
