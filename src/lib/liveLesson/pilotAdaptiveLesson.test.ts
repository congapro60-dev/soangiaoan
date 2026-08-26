import { describe, expect, it } from 'vitest';
import { buildPilotAdaptiveLesson } from './pilotAdaptiveLesson';

describe('pilot adaptive lesson seed', () => {
  it('builds a published grade-10 lesson aligned with the live pilot package', () => {
    const lesson = buildPilotAdaptiveLesson('teacher-42', '2026-08-26T10:00:00.000Z');

    expect(lesson).toMatchObject({
      id: 'tds-g10-30-pilot',
      title: 'Bất phương trình bậc nhất hai ẩn — Tiết 1',
      subjectId: 'math',
      grade: '10',
      durationMinutes: 40,
      status: 'published',
      teacherId: 'teacher-42',
      createdAt: '2026-08-26T10:00:00.000Z',
      updatedAt: '2026-08-26T10:00:00.000Z',
    });
    expect(lesson.objectives.length).toBeGreaterThanOrEqual(3);
    expect(lesson.knowledgeUnits.length).toBeGreaterThanOrEqual(2);
    expect(lesson.diagnosticTest.questions.length).toBeGreaterThanOrEqual(3);
    expect(lesson.exitTicket.questions.length).toBeGreaterThanOrEqual(1);
    expect(lesson.knowledgeUnits.every(unit => unit.routes.length === 3)).toBe(true);
    expect(JSON.stringify(lesson)).not.toContain('Cấp số cộng');
  });

  it('creates independent records without mutating another teacher or sharing timestamps', () => {
    const first = buildPilotAdaptiveLesson('teacher-a', '2026-08-26T10:00:00.000Z');
    const second = buildPilotAdaptiveLesson('teacher-b', '2026-08-26T11:00:00.000Z');

    expect(first.teacherId).toBe('teacher-a');
    expect(second.teacherId).toBe('teacher-b');
    expect(first.updatedAt).toBe('2026-08-26T10:00:00.000Z');
    expect(second.updatedAt).toBe('2026-08-26T11:00:00.000Z');
    expect(first.objectives).not.toBe(second.objectives);
    expect(first.knowledgeUnits).not.toBe(second.knowledgeUnits);
  });
});
