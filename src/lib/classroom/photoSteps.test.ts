import { describe, expect, it } from 'vitest';
import { bindQuestionPhotoMarks, projectPhotoSteps, sanitizePhotoSteps, validPhotoSteps } from './photoMarks';
import type { PhotoStep } from './types';
import { buildRubricPrompt, PHOTO_STEPS_RULES } from './gradingPrompt';

const question = { status: 'partially_correct', studentAnswer: 'x = 5; x = -19', ignoredByTeacherInstruction: false };
const line = { imageIndex: 1, x: .1, y: .3, width: .8, height: .04, confidence: .9 };
const steps = [
  { text: 'Đặt ẩn, điều kiện', verdict: 'correct', score: .25, maxScore: .25, mark: line },
  { text: 'Đối chiếu điều kiện', verdict: 'partial', score: .125, maxScore: .25, note: 'Loại x = −19 vì x > 0', mark: { ...line, y: .6 } },
  { text: 'Kết luận', verdict: 'wrong', score: 0, maxScore: .25 },
];

describe('bút đỏ từng bước', () => {
  it('giữ bước hợp lệ, bỏ bước hỏng, cần ít nhất 2 bước; câu bỏ trống / bỏ qua không có bước', () => {
    expect(sanitizePhotoSteps([...steps, { text: '', verdict: 'correct', score: 0, maxScore: 0 }, { text: 'x', verdict: 'maybe', score: 0, maxScore: 1 },
      { text: 'y', verdict: 'correct', score: 2, maxScore: 1 }], question, 1)).toHaveLength(3);
    expect(sanitizePhotoSteps([steps[0]], question)).toEqual([]);
    expect(sanitizePhotoSteps(steps, { ...question, studentAnswer: 'Bỏ trống' })).toEqual([]);
    expect(sanitizePhotoSteps(steps, { ...question, ignoredByTeacherInstruction: true })).toEqual([]);
    expect(sanitizePhotoSteps([{ ...steps[0], mark: { ...line, confidence: .5 } }, steps[2]], question)[0].mark).toBeUndefined();
  });

  it('chỉ hiện khi tổng điểm bước khớp điểm câu hiện tại (GV sửa điểm câu → bước tự ẩn)', () => {
    const photoSteps = sanitizePhotoSteps(steps, question);
    expect(validPhotoSteps({ score: .375, maxScore: .75, photoSteps })).toHaveLength(3);
    expect(validPhotoSteps({ score: .5, maxScore: .75, photoSteps })).toEqual([]);
    expect(validPhotoSteps({ score: .375, maxScore: 1, photoSteps })).toEqual([]);
  });

  it('máy chủ gắn URL theo imageIndex, không tin URL AI; bản chiếu bỏ vị trí ngoài bài', () => {
    const bound = bindQuestionPhotoMarks({ ...question, photoSteps: [{ ...steps[0], mark: { ...line, imageUrl: 'https://foreign' } }, steps[2]] }, ['https://own']) as typeof question & { photoSteps?: PhotoStep[] };
    expect(bound.photoSteps?.[0].mark?.imageUrl).toBe('https://own');
    expect(projectPhotoSteps(bound, ['https://other'])[0].mark).toBeUndefined();
    expect(projectPhotoSteps(bound, ['https://own'])[0].mark?.imageUrl).toBe('https://own');
    expect(bindQuestionPhotoMarks({ ...question, photoMarksCleared: true, photoSteps: steps }, ['https://own']).photoSteps).toBeUndefined();
  });

  it('hướng dẫn chấm chia điểm theo từng bước; bút đỏ bám đúng mốc hướng dẫn', () => {
    expect(buildRubricPrompt('x = 5', 10)).toContain('Bước 1: đặt ẩn, điều kiện — 0,25đ');
    expect(PHOTO_STEPS_RULES).toContain('dùng ĐÚNG các bước và điểm tối đa từng bước');
    expect(PHOTO_STEPS_RULES).toContain('tổng score các bước = đúng score của câu');
  });
});
