import { describe, expect, it } from 'vitest';
import { structuralLessonIR } from './lessonIR.testFixture';
import { applyPresenterRoomCommand, createRoomState } from './roomState';

describe('V8.8 closing revision fence', () => {
  it('pins a closing revision when the room enters the closing sequence', () => {
    const lesson = structuralLessonIR();
    lesson.timeline[0].phase = 'reflection';
    const current = createRoomState(lesson, 'room-1', 'a'.repeat(64));
    const next = applyPresenterRoomCommand(lesson, current, { id: 'start', type: 'START', expectedRevision: 0 }, 'a'.repeat(64));
    expect(next.closingRevision).toBe(1);
  });
});
