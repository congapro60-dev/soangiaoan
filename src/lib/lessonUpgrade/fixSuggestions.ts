// Nối KẾT QUẢ RÀ SOÁT với CÔNG CỤ SỬA.
//
// Panel rà soát báo "thiếu đánh giá thường xuyên" nhưng giáo viên phải tự đoán bấm mục nào
// trong 17 mục của menu. Bảng dưới đây trả lời đúng câu đó: tiêu chí này thì mục nào vá được.
//
// Bảng cũng là THƯỚC ĐO ĐỘ PHỦ: tiêu chí không có mặt ở đây nghĩa là app đang báo lỗi mà
// không giúp sửa được gì — xem `hasAutoFix` và ghi chú ở cuối file.

import type { StandardsFinding } from './standardsTypes';
import type { UpgradeMenuItemId } from '../../types';

/**
 * Tiêu chí → các mục menu sinh được nội dung vá nó. Thứ tự trong mảng là thứ tự ưu tiên gợi ý.
 * Chỉ ánh xạ khi mục menu THẬT SỰ sinh ra thứ vá được lỗi, không map cho đủ.
 */
export const FIX_FOR_FINDING: Partial<Record<string, UpgradeMenuItemId[]>> = {
  // ── Tầng toàn trường (checklist) ───────────────────────────────────────────
  'activity-format-variety': ['I', 'J'],
  'differentiation-dimensions': ['Q'],
  'reflection-prompt': ['D'],
  'global-citizenship': ['D'],
  'digital-citizenship': ['G', 'H'],
  'formative-assessment': ['F', 'L'],
  'resources-listed': ['P'],

  // ── Tầng Toán TDS ─────────────────────────────────────────────────────────
  'four-phases': ['A', 'B', 'C', 'D'],
  'differentiated-objectives': ['Q', 'M'],
  'guiding-questions': ['B'],
  'practice-min-three': ['C'],
  'math-competencies': ['M'],
  'success-criteria': ['M'],
  'teacher-script': ['A', 'B', 'C', 'D'],
  'worksheet-appendix': ['E'],

  // ── Bộ kiểm tiết luyện tập ────────────────────────────────────────────────
  'polya-4-steps': ['C'],
  'dual-hint-routes': ['Q'],
  'method-mastery': ['C'],
  'concrete-differentiation': ['Q'],
};

// Cố ý KHÔNG ánh xạ, và lý do:
//  - plan-metadata, student-profile — app không được bịa tên người soạn, ngày, sĩ số lớp thật.
//  - safe-environment, homework-present, expected-products, time-coverage, time-continuity,
//    board-content-filled, term-introduced, no-duplicate-block, no-internal-instructions,
//    self-selection-fallback, group-model-coherence — đây là lỗi BIÊN TẬP, phải sửa tại chỗ
//    trong chính giáo án chứ không phải sinh thêm nội dung mới. Menu hiện tại không có mục
//    nào làm việc đó; UI hiển thị ghi chú "sửa tay theo hướng dẫn" thay vì im lặng.

/** Các mục menu vá được tiêu chí này. Rỗng nghĩa là chưa có công cụ tự động. */
export const getFixMenuIds = (findingId: string): UpgradeMenuItemId[] =>
  FIX_FOR_FINDING[findingId] ?? [];

export const hasAutoFix = (findingId: string): boolean => getFixMenuIds(findingId).length > 0;

/**
 * Đếm số tiêu chí CHƯA ĐẠT mà một mục menu vá được — dùng để nổi các mục cần làm lên đầu
 * và gắn nhãn "Vá N lỗi".
 */
export const countFixableFailures = (
  findings: StandardsFinding[],
  menuId: UpgradeMenuItemId,
): number =>
  findings.filter((f) => f.status !== 'pass' && getFixMenuIds(f.id).includes(menuId)).length;
