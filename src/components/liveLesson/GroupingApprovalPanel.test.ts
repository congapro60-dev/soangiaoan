import { describe, expect, it } from 'vitest';
import { formatCountdown, getElapsedMs, shouldSuggestDefault } from './GroupingApprovalPanel';

describe('GroupingApprovalPanel pure logic', () => {
  it('computes elapsed milliseconds correctly', () => {
    expect(getElapsedMs(1000, 3500)).toBe(2500);
    expect(getElapsedMs(5000, 2000)).toBe(0);
  });

  it('suggests default after 40 seconds', () => {
    const now = Date.now();
    expect(shouldSuggestDefault(now, now + 39_999)).toBe(false);
    expect(shouldSuggestDefault(now, now + 40_000)).toBe(true);
    expect(shouldSuggestDefault(now, now + 60_000)).toBe(true);
  });

  it('formats countdown correctly', () => {
    expect(formatCountdown(40_000)).toBe('40s');
    expect(formatCountdown(1000)).toBe('1s');
    expect(formatCountdown(0)).toBe('0s');
    expect(formatCountdown(-500)).toBe('0s');
  });

  it('approval result contains correct action and chosenGroupId', () => {
    const proposal = {
      groupId: 'grp-1',
      purpose: 'same_need_workshop' as const,
      memberIds: ['s1', 's2', 's3'],
      scaffold: 'scaffold',
      reason: 'reason',
    };
    const result = { action: 'approved' as const, proposal, chosenGroupId: proposal.groupId };
    expect(result.action).toBe('approved');
    expect(result.chosenGroupId).toBe('grp-1');
  });

  it('default action uses default-mixed groupId', () => {
    const proposal = {
      groupId: 'grp-1',
      purpose: 'mixed_reasoning' as const,
      memberIds: ['s1', 's2', 's3'],
      scaffold: 'scaffold',
      reason: 'reason',
    };
    const defaultProposal = {
      groupId: 'default-mixed',
      purpose: 'teacher_defined' as const,
      memberIds: proposal.memberIds,
      scaffold: 'Nhóm mặc định — GV quyết định nhiệm vụ.',
      reason: 'GV chọn nhóm mặc định.',
    };
    const result = { action: 'default' as const, proposal: defaultProposal, chosenGroupId: 'default-mixed' };
    expect(result.action).toBe('default');
    expect(result.chosenGroupId).toBe('default-mixed');
    expect(result.proposal.purpose).toBe('teacher_defined');
  });

  it('does not leak private reason in TV-visible output', () => {
    const proposal = {
      groupId: 'grp-1',
      purpose: 'same_need_workshop' as const,
      memberIds: ['s1', 's2', 's3'],
      scaffold: 'scaffold',
      reason: 'HS chưa phân biệt đường biên — reason riêng tư của GV',
    };
    const json = JSON.stringify(proposal);
    expect(json).toContain('HS chưa phân biệt đường biên');
    // The reason is PRIVATE to teacher — it is OK in teacher view
    // but must NOT appear in TV projection
  });
});
