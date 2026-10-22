import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ActorSubmissionUpload } from './ActorSubmissionUpload';
describe('nộp hộ qua quyền hiện có', () => {
  it('PH chọn nhiều ảnh trong đúng phiên, khóa chốt chặn nộp nhưng giữ nút đóng', () => {
    const credentials = { role: 'parent' as const, joinCode: 'private', studentId: 'child', pin: '1234' };
    const html = renderToStaticMarkup(<ActorSubmissionUpload credentials={credentials} assignmentId="assignment" onSubmitted={() => undefined} />);
    expect(html).toContain('multiple=""'); expect(html).toContain('Nộp bài'); expect(html).not.toContain('1234'); expect(html).not.toContain('private');
    const locked = renderToStaticMarkup(<ActorSubmissionUpload credentials={credentials} assignmentId="assignment" locked onSubmitted={() => undefined} onClose={() => undefined} />);
    expect(locked).toContain('GV đã khóa chốt'); expect(locked).not.toContain('type="file"'); expect(locked).toContain('Đóng');
  });

  it('GV nộp bài đã chấm hiển thị giao diện và nút Nộp bài đã chấm', () => {
    const credentials = { role: 'teacher' as const, classId: 'c1', studentId: 's1' };
    const html = renderToStaticMarkup(<ActorSubmissionUpload credentials={credentials} assignmentId="assignment" handMarked={true} onSubmitted={() => undefined} />);
    expect(html).toContain('Nộp bài đã chấm tay của học sinh');
    expect(html).toContain('Nộp bài đã chấm');
    expect(html).toContain('AI sẽ tự đọc điểm ghi tay');
  });

  it('trên điện thoại: có nút CHỤP ẢNH riêng (mở thẳng camera) + nút chọn ảnh/PDF', () => {
    const credentials = { role: 'teacher' as const, classId: 'c1', studentId: 's1' };
    const html = renderToStaticMarkup(<ActorSubmissionUpload credentials={credentials} assignmentId="assignment" onSubmitted={() => undefined} />);
    expect(html).toContain('Chụp ảnh');
    expect(html).toContain('capture="environment"');
    expect(html).toContain('Chọn ảnh / PDF');
    expect(html).toContain('multiple=""');
  });
});
