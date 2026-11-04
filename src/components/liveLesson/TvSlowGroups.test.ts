import { afterEach, describe, expect, it, vi } from 'vitest';
import { selectSlowGroups } from './TvSlowGroups';

const beat = { startSeconds: 0, endSeconds: 420 };

const membershipsOf = (group: string) => [{ participantUid: 'u1', groupNumber: group }];

describe('selectSlowGroups — R2 nhóm chậm trên màn GV thật (tv-control)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('không có nhóm chậm khi nhóm đã gửi đủ (100%)', () => {
    const slow = selectSlowGroups({
      memberships: membershipsOf('3'),
      counters: { members: { '3': 1 }, submitted: { '3': 1 }, cueId: 'P20' },
      currentCueId: 'P20',
      beat,
      elapsedSeconds: 400,
    });
    expect(slow).toEqual([]);
  });

  it('nhóm có người nhưng gửi < 50% sau quá 80% thời lượng → vào danh sách chậm', () => {
    const slow = selectSlowGroups({
      memberships: membershipsOf('5'),
      counters: { members: { '5': 1 }, submitted: { '5': 0 }, cueId: 'P20' },
      currentCueId: 'P20',
      beat,
      elapsedSeconds: 400,
    });
    expect(slow).toEqual(['5']);
  });

  it('dưới 80% thời lượng thì chưa cảnh báo dù chưa ai gửi', () => {
    const slow = selectSlowGroups({
      memberships: membershipsOf('5'),
      counters: { members: { '5': 1 }, submitted: { '5': 0 }, cueId: 'P20' },
      currentCueId: 'P20',
      beat,
      elapsedSeconds: 300,
    });
    expect(slow).toEqual([]);
  });

  it('progress lệch chặng (cueId khác chặng đang dạy) thì bỏ qua', () => {
    const slow = selectSlowGroups({
      memberships: membershipsOf('5'),
      counters: { members: { '5': 1 }, submitted: { '5': 0 }, cueId: 'P27' },
      currentCueId: 'P20',
      beat,
      elapsedSeconds: 400,
    });
    expect(slow).toEqual([]);
  });

  it('chưa bật stats (counters null) thì không cảnh báo', () => {
    const slow = selectSlowGroups({
      memberships: membershipsOf('5'),
      counters: null,
      currentCueId: 'P20',
      beat,
      elapsedSeconds: 400,
    });
    expect(slow).toEqual([]);
  });

  it('nhiều nhóm chậm được sắp theo số thứ tự nhóm', () => {
    const slow = selectSlowGroups({
      memberships: [{ participantUid: 'u1', groupNumber: '7' }, { participantUid: 'u2', groupNumber: '2' }],
      counters: { members: { '2': 1, '7': 2 }, submitted: { '2': 0, '7': 0 }, cueId: 'P20' },
      currentCueId: 'P20',
      beat,
      elapsedSeconds: 400,
    });
    expect(slow).toEqual(['2', '7']);
  });
});
