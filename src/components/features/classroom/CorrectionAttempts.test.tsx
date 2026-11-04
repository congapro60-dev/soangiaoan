import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubmissionDoc } from '../../../lib/classroom/types';
const view = vi.hoisted(() => ({ saving: false, loaded: false, source: '', index: 0 }));
vi.mock('react', async original => {
  const react = await original<typeof import('react')>();
  return { ...react, useState: (initial: unknown) => {
    if (view.loaded) {
      const index = view.index++;
      if (index === 0) return [true, () => undefined];
      if (index === 1) return [[new Blob(['draft'], { type: 'image/jpeg' })], () => undefined];
      if (index === 3) return ['Bản nháp cần giữ', () => undefined];
      if (index === 4) return [[{ id: 'attempt', fileUrls: [], createdAt: '', status: 'reviewed', assessment: { outcome: 'achieved', feedback: 'NHAN_XET_NGUON_CU' } }], () => undefined];
      if (index === 7) return [view.source ||= String(initial), () => undefined];
      return [initial, () => undefined];
    }
    if (!view.saving) return react.useState(initial);
    const index = view.index++;
    return [index === 0 ? true : index === 1 ? [new Blob(['photo'], { type: 'image/jpeg' })] : index === 5 ? 'save' : initial, () => undefined];
  } };
});
import { CorrectionAttempts } from './CorrectionAttempts';
beforeEach(() => { view.saving = false; view.loaded = false; view.source = ''; view.index = 0; });
const submission = (patch: Partial<SubmissionDoc> = {}): SubmissionDoc => ({
  id: 's', studentId: 'own', classId: 'c', teacherId: 't', assignmentId: 'a',
  status: 'graded', fileUrls: [], note: '', createdAt: '', updatedAt: '',
  grade: { score: 8, maxScore: 10, teacherApproved: true, feedback: '', strengths: [], weaknesses: [], gradedAt: '' },
  ...patch,
});
describe('bài chữa riêng không đổi điểm', () => {
  it('HS được chụp bài chữa sau công bố, không cần nộp lại bài gốc', () => {
    const html = renderToStaticMarkup(<CorrectionAttempts submission={submission()} />);
    expect(html).toContain('Chụp ảnh bài chữa');
    expect(html).not.toContain('8/10');
    expect(html).not.toContain('Nộp lại');
  });
  it('giữ đường xem lịch sử nhưng khóa nộp mới khi điểm chưa được xem hoặc đang xác nhận', () => {
    const original = submission();
    for (const grade of [{ ...original.grade!, teacherApproved: false }, { ...original.grade!, awaitingClarification: true }]) {
      const html = renderToStaticMarkup(<CorrectionAttempts submission={submission({ grade })} />);
      expect(html).toContain('Bài chữa / làm lại');
      expect(html).toContain('Lịch sử bài chữa vẫn xem được');
      expect(html).toMatch(/<input[^>]*disabled=""[^>]*type="file"/);
    }
  });
  it('bản chấm tay đã công bố cho phép nộp bài chữa khi chưa có điểm công bố', () => {
    const handMarkedEvidence = { id:'review', files:[], note:'', submittedBy:{role:'teacher' as const,studentId:'own',at:''}, createdAt:'' };
    const html = renderToStaticMarkup(<CorrectionAttempts submission={submission({grade:undefined,handMarkedEvidence,handMarkedPublished:true})} />);
    expect(html).toContain('Chụp ảnh bài chữa');
    expect(html).not.toMatch(/<input[^>]*disabled=""[^>]*type="file"/);
    expect(html).not.toContain('Lịch sử bài chữa vẫn xem được');
  });
  it('GV có thể nộp hộ bài chữa bằng quyền GV', () => {
    const html = renderToStaticMarkup(<CorrectionAttempts submission={submission()} credentials={{ role: 'teacher', classId: 'c', studentId: 'own' }} />);
    expect(html).toContain('Bài chữa / làm lại');
    expect(html).toContain('Nộp hộ bài chữa / làm lại');
  });
  it('PH được nộp hộ và xem bài chữa bằng phiên PH, không mượn phiên HS', () => {
    const html = renderToStaticMarkup(<CorrectionAttempts submission={submission()} credentials={{role:'parent',studentId:'own',joinCode:'class-code',pin:'PIN'}} />);
    expect(html).toContain('Nộp hộ bài chữa / làm lại'); expect(html).not.toContain('PIN'); expect(html).not.toContain('8/10');
  });
  it('đang lưu không nhận ảnh hoặc nháp mới để tránh xóa dữ liệu chưa gửi', () => {
    view.saving = true;
    const html = renderToStaticMarkup(<CorrectionAttempts submission={submission()} />);
    expect(html).toMatch(/<input[^>]*disabled=""[^>]*type="file"/);
    expect(html).toMatch(/<textarea[^>]*disabled=""/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?Chụp ảnh bài chữa/);
  });
  it.each(['unpublish', 'revision', 'grade'])('ẩn nhận xét nguồn cũ khi %s, giữ ảnh và ghi chú nháp', change => {
    const evidence = { id: 'review', files: [], note: '', submittedBy: { role: 'teacher' as const, studentId: 'own', at: '' }, createdAt: '' };
    const original = submission({ handMarkedEvidence: evidence, handMarkedPublished: true });
    view.loaded = true;
    expect(renderToStaticMarkup(<CorrectionAttempts submission={original} />)).toContain('NHAN_XET_NGUON_CU');
    view.index = 0;
    const changed = change === 'unpublish' ? { ...original, handMarkedPublished: false, grade: undefined }
      : change === 'revision' ? { ...original, handMarkedEvidence: { ...evidence, id: 'replacement' } }
      : { ...original, grade: { ...original.grade!, score: 9 } };
    const html = renderToStaticMarkup(<CorrectionAttempts submission={changed} />);
    expect(html).not.toContain('NHAN_XET_NGUON_CU');
    expect(html).toContain('Bản nháp cần giữ');
    expect(html).toContain('Bỏ ảnh 1');
  });
});
