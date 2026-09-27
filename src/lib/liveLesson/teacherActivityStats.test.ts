import { describe, expect, it } from 'vitest';
import { assessTeacherResponse, buildTeacherActivityRows } from './teacherActivityStats';
import type { LiveResponse } from './types';

const response = (overrides: Partial<LiveResponse>): LiveResponse => ({
  id: 'r', participantUid: 'u', classId: 'class', stepId: 'cp-model', responseType: 'choice', value: 'A', clientNonce: 'n', submittedAt: 1, updatedAt: 1,
  ...overrides,
});

describe('teacherActivityStats', () => {
  it('auto-assesses only the canonical P31 choice keys', () => {
    expect(assessTeacherResponse('cp-model', response({ value: 'A' }))).toBe('Đúng');
    expect(assessTeacherResponse('cp-model', response({ value: 'B' }))).toBe('Sai');
    expect(assessTeacherResponse('cp-postcheck', response({ responseType: 'text', value: '13 > 12' }))).toBe('Cần GV xem');
  });

  it('extracts AI error category from the combined private explanation payload', () => {
    expect(assessTeacherResponse('cp-ai-error', response({ responseType: 'text', value: JSON.stringify({ category: 'Logical', explanation: '160 > 150' }) }))).toBe('Đúng');
    expect(assessTeacherResponse('cp-ai-error', response({ responseType: 'text', value: JSON.stringify({ category: 'Algebraic', explanation: '...' }) }))).toBe('Sai');
  });

  it('returns stable private labels without exposing raw response text in the row model', () => {
    const rows = buildTeacherActivityRows([
      response({ participantUid: 'u-b', value: 'B' }),
      response({ participantUid: 'u-a', value: 'A' }),
    ], 'cp-model');
    expect(rows.map(row => row.label)).toEqual(['HS 01', 'HS 02']);
    expect(rows.map(row => row.assessment)).toEqual(['Đúng', 'Sai']);
    expect(rows[0]).not.toHaveProperty('rawText');
  });
});
