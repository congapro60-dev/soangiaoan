import { describe, expect, it } from 'vitest';

import {
  LiveLessonDefinitionError,
  getPilotLiveLessonDefinition,
  validateLiveLessonDefinition,
} from './definition';

describe('g10_w5_p31_bpt_tiet1 live lesson definition', () => {
  it('normalizes the pilot package into the runtime boundary', () => {
    const definition = getPilotLiveLessonDefinition();

    expect(definition.durationSeconds).toBe(2400);
    expect(definition.cues.length).toBeGreaterThanOrEqual(20);
    expect(definition.tvScreens).toHaveLength(12);
    expect(definition.studentScreens).toHaveLength(11);
    expect(definition.aiErrorStepId).toBe('ai-error-w01');
    expect(definition.allowedStepIds).toContain('quick-check');
  });

  it('rejects a cue that references an undeclared TV screen', () => {
    const definition = getPilotLiveLessonDefinition();
    const badDefinition = {
      ...definition,
      cues: definition.cues.map((cue, index) =>
        index === 0 ? { ...cue, tvScreenId: 'S-missing' } : cue,
      ),
    };

    expect(() => validateLiveLessonDefinition(badDefinition)).toThrowError(
      expect.objectContaining({ code: 'LIVE_TV_SCREEN_NOT_FOUND' }),
    );
    expect(() => validateLiveLessonDefinition(badDefinition)).toThrow(
      LiveLessonDefinitionError,
    );
  });

  it('keeps cues ordered and response steps unique', () => {
    const definition = getPilotLiveLessonDefinition();

    expect(definition.cues).toEqual(
      [...definition.cues].sort((left, right) => left.atSeconds - right.atSeconds),
    );
    expect(new Set(definition.allowedStepIds).size).toBe(
      definition.allowedStepIds.length,
    );
    expect(definition.responseSteps.map((step) => step.id)).toEqual(
      expect.arrayContaining(['ai-error-w01', 'quick-check', 'exit-ticket']),
    );
  });
});
