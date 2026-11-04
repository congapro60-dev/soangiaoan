import { describe, expect, it } from 'vitest';
import { validateLessonIRSchema } from './lessonIRSchema';
import { structuralLessonIR } from './lessonIR.testFixture';

describe('canonical Lesson IR 8.3.2 schema', () => {
  it('accepts a structurally complete IR without claiming learning quality', () => {
    expect(validateLessonIRSchema(structuralLessonIR())).toEqual({ valid: true, issues: [] });
  });
  it('rejects an incomplete object with canonical root paths', () => {
    const result = validateLessonIRSchema({ schemaVersion: '8.3.2' });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/lesson' }),
      expect.objectContaining({ path: '/qualityAudit' }),
      expect.objectContaining({ path: '/buildStatus' }),
    ]));
  });

  it('rejects an old schema version before any lesson migration', () => {
    const result = validateLessonIRSchema({ schemaVersion: '8.3.1' });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/schemaVersion', keyword: 'const' }),
    ]));
  });
});
