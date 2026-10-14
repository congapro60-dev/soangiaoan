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
});
