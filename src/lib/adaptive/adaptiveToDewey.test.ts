import { describe, expect, it } from 'vitest';
import { adaptiveLessonToDeweyContent } from './adaptiveToDewey';
import { buildBanToanV4AdaptiveLessonDraft } from '../liveLesson/v4/adaptiveDraft';
import { getAllBanToanV4Contracts } from '../liveLesson/v4/lessonAdapter';

describe('adaptiveLessonToDeweyContent — V4 self-study practice', () => {
  it('uses the three differentiated route tasks instead of a placeholder pack', () => {
    const lesson = buildBanToanV4AdaptiveLessonDraft('10-5-31', 'teacher-qa');
    const content = adaptiveLessonToDeweyContent(lesson, 'standard');
    const questions = content.olympia.packs.map(pack => pack.questions[0]);

    expect(content.olympia.packs.map(pack => pack.packLabel)).toEqual(['Nhận biết', 'Thông hiểu', 'Vận dụng']);
    expect(questions.every(question => question && !question.id.startsWith('placeholder-'))).toBe(true);
    expect(questions.every(question => !question.prompt.includes('Câu hỏi đang được chuẩn bị'))).toBe(true);
    expect(new Set(questions.map(question => question?.prompt)).size).toBe(3);
    expect(questions[0]?.prompt).toContain('có dạng nào');
    expect(questions[1]?.prompt).toContain('thỏa mô hình');
    expect(questions[2]?.prompt).toContain('dùng dấu');
  });

  it('keeps all 48 V4 self-study packs substantive', () => {
    for (const contract of getAllBanToanV4Contracts()) {
      const lesson = buildBanToanV4AdaptiveLessonDraft(contract.sourceKey, 'teacher-qa');
      const content = adaptiveLessonToDeweyContent(lesson, 'standard');

      expect(content.olympia.packs).toHaveLength(3);
      expect(content.olympia.packs.every(pack => pack.questions.length > 0)).toBe(true);
      expect(content.olympia.packs.every(pack => pack.questions.every(question => (
        !question.id.startsWith('placeholder-')
        && !question.prompt.includes('Câu hỏi đang được chuẩn bị')
      )))).toBe(true);
    }
  });
});
