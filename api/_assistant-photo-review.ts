import { parsePhotoReview } from '../src/lib/classroom/gradingPrompt.js';
import type { PhotoSubmissionReview } from '../src/lib/classroom/types.js';

export const normalizePhotoReview = (raw: unknown, hasReference: boolean, photoCount: number): PhotoSubmissionReview | undefined => {
  if (!Number.isInteger(photoCount) || photoCount < 1) return undefined;
  const review = parsePhotoReview(raw);
  if (!review) return undefined;
  return {
    assignmentMatch: hasReference ? review.assignmentMatch : 'uncertain',
    missingQuestionNumbers: hasReference ? review.missingQuestionNumbers : [],
    unreadablePhotoNumbers: review.unreadablePhotoNumbers.filter(n => n <= photoCount),
  };
};

/** Chỉ trạng thái ảnh; an toàn gửi trước duyệt, không dùng feedback/đáp án của AI. */
export const buildPhotoReviewReply = (raw: PhotoSubmissionReview | undefined): string => {
  const review = normalizePhotoReview(raw, true, 12);
  if (!review) return '';
  const issues = [
    review.assignmentMatch === 'possibly_wrong' ? 'Nội dung ảnh có vẻ chưa khớp bài đang chọn. Em kiểm tra lại tên bài và ảnh nhé.' : '',
    review.missingQuestionNumbers.length ? `Máy chưa thấy phần câu ${review.missingQuestionNumbers.join(', ')} trong ảnh. Em đã làm nhưng chưa chụp phần này, hay muốn nộp phần hiện có?` : '',
    review.unreadablePhotoNumbers.length ? `Máy chưa đọc rõ ảnh ${review.unreadablePhotoNumbers.join(', ')}. Em có thể chụp thẳng, đủ sáng và đủ trang rồi gửi lại.` : '',
  ].filter(Boolean);
  if (!issues.length) return '';
  return [...issues, '', 'Nhắn “bổ sung” để thêm ảnh; “nộp lại” để thay bộ ảnh. Nếu giữ phần đã nộp, không cần gửi lại. Chưa chắc đúng bài: nhờ thầy cô kiểm tra.'].join('\n');
};
