import { describe, expect, it } from 'vitest';
import { bindQuestionPhotoMarks, projectPhotoMarks, sanitizePhotoMarks, sanitizeReadingRegions, projectReadingRegions } from './photoMarks';

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
  it('does not mark blank, unreadable or ignored answers', () => {
    for (const change of [{ studentAnswer: '' }, { studentAnswer: 'Bỏ trống' }, { studentAnswer: '[không đọc rõ]' },
      { studentAnswer: 'Không làm (chỉ ghi tiêu đề rồi gạch bỏ)' }, { studentAnswer: 'Để trống' },
      { status: 'unreadable' }, { ignoredByTeacherInstruction: true }]) {
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
    expect(projectPhotoMarks({ ...q, status: 'correct' }, ['https://own'])).toEqual([{ ...mark, imageUrl: 'https://own' }]);
  });
});

it('neutral reading geometry is independent of answer correctness/confidence', () => {
  const q = { status: 'unreadable', studentAnswer: 'B hoặc D', confidence: .2 };
  expect(sanitizeReadingRegions([mark], q, 1)).toEqual([mark]);
  const bound = bindQuestionPhotoMarks({ ...q, readingRegions: [{ ...mark, imageUrl: 'foreign' }] }, ['own']);
  expect(projectReadingRegions(bound, ['own'])).toEqual([{ ...mark, imageUrl: 'own' }]);
  expect(projectReadingRegions(bound, ['other'])).toEqual([]);
  expect(sanitizeReadingRegions([mark], { ...q, studentAnswer: '' })).toEqual([]);
  expect(sanitizePhotoMarks([mark], { status: 'correct', studentAnswer: 'B' }, 1)).toEqual([mark]);
});
