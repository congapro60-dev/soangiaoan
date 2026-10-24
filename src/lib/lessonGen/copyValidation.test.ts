import { describe, expect, it } from 'vitest';
import { validateClassroomCopy } from './copyValidation';

describe('classroom copy validation', () => {
  it('allows Vietnamese copy with approved MUST/SHOULD/COULD labels', () => {
    expect(validateClassroomCopy('MUST: Tôi có thể tính u_4.', 'vi')).toEqual([]);
  });

  it('flags English leakage in Vietnamese classroom copy', () => {
    expect(validateClassroomCopy('Hãy giải basic equations trên máy.', 'vi')).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'VI_ENGLISH_LEAK' }),
    ]));
  });

  it('blocks internal evidence state from a student-facing sentence', () => {
    expect(validateClassroomCopy('Trạng thái secure của em đã được sourceRef ghi nhận.', 'vi')).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INTERNAL_STATE_LEAK' }),
    ]));
  });

  it('flags an ambiguous instruction with two independent student actions', () => {
    expect(validateClassroomCopy('Tính u_4 và giải thích vì sao trên máy.', 'vi')).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'MULTI_ACTION_INSTRUCTION' }),
    ]));
  });
});
