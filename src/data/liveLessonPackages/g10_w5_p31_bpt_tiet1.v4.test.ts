import { describe, expect, it } from 'vitest';
import { validateV4Contract } from '../../lib/liveLesson/v4';
import { getG10P31V4Contract } from './g10_w5_p31_bpt_tiet1.v4';

describe('getG10P31V4Contract', () => {
  it('returns a valid V4 contract', () => {
    const result = validateV4Contract(getG10P31V4Contract());

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('keeps the pilot timeline at exactly 40 minutes with 11 blocks', () => {
    const contract = getG10P31V4Contract();
    const totalSeconds = contract.timeline.reduce(
      (sum, block) => sum + block.endSeconds - block.startSeconds,
      0,
    );

    expect(totalSeconds).toBe(2400);
    expect(contract.timeline).toHaveLength(11);
    expect(contract.timeline.map((block) => block.id)).toEqual([
      'P00',
      'P03',
      'P05',
      'P08',
      'P16',
      'P19',
      'P20',
      'P27',
      'P30',
      'P35',
      'P38',
    ]);
  });

  it('keeps AI Error of the Week inside P16 without adding a twelfth block', () => {
    const contract = getG10P31V4Contract();
    const aiErrorBlock = contract.timeline.find((block) => block.id === 'P16');

    expect(contract.timeline[11]).toBeUndefined();
    expect(contract.aiError.stepId).toBe('P16');
    expect(aiErrorBlock?.teacherScript).toContain('AI Error of the Week');
    expect(aiErrorBlock?.checkpointId).toBe('cp-ai-error');
  });
});
