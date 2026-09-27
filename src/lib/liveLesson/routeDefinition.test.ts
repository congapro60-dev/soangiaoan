import { describe, expect, it } from 'vitest';
import { getLiveLessonDefinitionForRoute } from './routeDefinition';

describe('live lesson definition route resolver', () => {
  it('keeps the legacy route when no V4 definition key is supplied', () => {
    expect(getLiveLessonDefinitionForRoute().id).toBe('g10_w5_p31_bpt_tiet1');
  });

  it('resolves a V4 package by source key and binds the actual adaptive lesson id', () => {
    const definition = getLiveLessonDefinitionForRoute('10-5-37', 'adaptive-v4-10-5-37-teacher-1');
    expect(definition.id).toBe('g10_w5_p37_v4');
    expect(definition.lessonId).toBe('adaptive-v4-10-5-37-teacher-1');
  });

  it('rejects an unknown definition key instead of guessing from a title', () => {
    expect(() => getLiveLessonDefinitionForRoute('10-5-37-not-real')).toThrow(/definitionKey/i);
  });
});
