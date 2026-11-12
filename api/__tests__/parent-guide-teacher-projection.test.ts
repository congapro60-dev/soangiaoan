import { describe, expect, it } from 'vitest';
import { teacherAssignmentProjection } from '../_classroom-teacher';

describe('teacherAssignmentProjection: GV đọc được hướng dẫn phụ huynh để sửa', () => {
  it('giữ parentGuide (kể cả bản nháp) trong bài GV nhận', () => {
    const guide = { version: 'v1', status: 'draft', generatedAt: 't', goal: 'Hiểu phép nhân', askFirst: [], steps: ['Đọc đề'], commonMistakes: [], askTeacher: '' };
    const shown = teacherAssignmentProjection('a1', { teacherId: 't1', classId: 'c1', title: 'Bài 1', isOpen: true, parentGuide: guide });
    expect(shown.parentGuide).toEqual(guide);
  });
  it('bài chưa có hướng dẫn thì không có field này', () => {
    const shown = teacherAssignmentProjection('a1', { teacherId: 't1', classId: 'c1', title: 'Bài 1', isOpen: true });
    expect(shown.parentGuide).toBeUndefined();
  });
});
