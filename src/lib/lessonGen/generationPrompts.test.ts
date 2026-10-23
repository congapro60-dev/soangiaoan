import { describe, expect, it } from 'vitest';
import { buildV821DraftPrompt } from './generationPrompts';

describe('V8.2.1 generation prompt', () => {
  it('asks for structured provenance, atomic questions and the three realtime surfaces', () => {
    const prompt = buildV821DraftPrompt({
      sourceHash: 'abc123',
      durationMinutes: 40,
      sources: [{
        id: 'lesson',
        name: 'Day so.docx',
        mimeType: 'application/docx',
        role: 'teacher_lesson',
        content: 'Bài 5. Dãy số.',
        locator: { kind: 'whole_file', value: 'Day so.docx' },
      }],
    });

    expect(prompt).toContain('question_instance_id');
    expect(prompt).toContain('Presenter');
    expect(prompt).toContain('Teacher Coach');
    expect(prompt).toContain('source_verification_required');
    expect(prompt).toContain('Bài 5. Dãy số.');
  });

  it('labels a teacher-approved source as teacher-approved rather than as a textbook', () => {
    const bundle = { sourceHash: 'hash', durationMinutes: 40, sources: [{
      id: 'teacher-plan', name: 'Giáo án.docx', mimeType: 'application/docx',
      role: 'teacher_lesson' as const, content: 'Dãy số.', locator: { kind: 'whole_file' as const, value: 'Giáo án.docx' },
    }] };
    const approval = { sourceId: 'teacher-plan', sourceHash: 'hash', durationMinutes: 40,
      reviewerUid: 'teacher-a', approvedAt: '2026-09-30T00:00:00.000Z' };
    const prompt = buildV821DraftPrompt(bundle, approval);
    expect(prompt).toContain('Giáo viên đã xác nhận nguồn teacher-plan');
    expect(prompt).toContain('không tự gán là SGK/PPCT');
    expect(buildV821DraftPrompt(bundle, { ...approval, sourceHash: 'stale' })).toContain('Nguồn giáo viên chưa được xác nhận');
  });
});
