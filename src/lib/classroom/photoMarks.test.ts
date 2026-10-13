import { describe, expect, it } from 'vitest';
import { bindQuestionPhotoMarks, projectPhotoMarks, sanitizePhotoMarks } from './photoMarks';

const question = { status: 'incorrect', studentAnswer: 'x = 2', ignoredByTeacherInstruction: false };
const mark = { imageIndex: 1, x: .1, y: .2, width: .3, height: .1, confidence: .9 };

describe('photo marks trust boundaries', () => {
  it('rejects malformed optional marks without losing valid marks; strips AI URLs', () => {
    expect(sanitizePhotoMarks([null, { ...mark, confidence: .84 }, { ...mark, x: NaN },
      { ...mark, width: 0 }, { ...mark, x: .9 }, { ...mark, imageIndex: 1.5 },
      { ...mark, x: '0.1' }, { ...mark, imageUrl: 'https://foreign' }], question, 1)).toEqual([mark]);
    expect(sanitizePhotoMarks(Array(5).fill(mark), question)).toHaveLength(3);
    expect(sanitizePhotoMarks([{ ...mark, imageIndex: 2 }], question, 1)).toEqual([]);
  });
  it('does not mark blank, unreadable, correct or ignored answers', () => {
    for (const change of [{ studentAnswer: '' }, { studentAnswer: 'Bỏ trống' }, { studentAnswer: '[không đọc rõ]' },
      { studentAnswer: 'Không làm (chỉ ghi tiêu đề rồi gạch bỏ)' }, { studentAnswer: 'Để trống' },
      { status: 'correct' }, { status: 'unreadable' }, { ignoredByTeacherInstruction: true }]) {
      expect(sanitizePhotoMarks([mark], { ...question, ...change })).toEqual([]);
    }
  });
  it('keeps teacher removal when new grading proposes marks again', () => {
    expect(bindQuestionPhotoMarks({ ...question, photoMarksCleared: true, photoMarks: [mark] }, ['https://own']).photoMarks).toBeUndefined();
  });
  it('binds only successful student images, never AI chosen URL', () => {
    const bound = bindQuestionPhotoMarks({ ...question, photoMarks: [{ ...mark, imageUrl: 'https://foreign' }] }, ['https://own/second.jpg']);
    expect(bound.photoMarks).toEqual([{ ...mark, imageUrl: 'https://own/second.jpg' }]);
    expect(bindQuestionPhotoMarks(bound, []).photoMarks).toBeUndefined();
  });
  it('projects only valid stored marks on allowed submission evidence', () => {
    const q = { ...question, photoMarks: [{ ...mark, imageUrl: 'https://foreign' }, { ...mark, imageUrl: 'https://own' }] };
    expect(projectPhotoMarks(q, ['https://own'])).toEqual([{ ...mark, imageUrl: 'https://own' }]);
    expect(projectPhotoMarks({ ...q, status: 'correct' }, ['https://own'])).toEqual([]);
  });
});
