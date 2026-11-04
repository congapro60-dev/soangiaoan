// Test 3 quy tắc nhóm xoay tua tự động (Gate D mini)
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/lib/liveLesson/v4/grouping.test.ts';
let t = readFileSync(p, 'utf8');
const add = `
// --- Nhóm xoay tua tự động (Gate D mini, thầy duyệt 29/10) ---
import { isGroupDone, isGroupSlow, type LiveGroupCounters } from './grouping';

describe('Nhóm xoay tua tự động (Gate D mini)', () => {
  const counters = (members: Record<string, number>, submitted: Record<string, number>): LiveGroupCounters => ({ members, submitted });

  it('R1 — nhóm xong sớm: members > 0 và submitted ≥ members', () => {
    expect(isGroupDone(counters({ '3': 4 }, { '3': 4 }), '3')).toBe(true);
    expect(isGroupDone(counters({ '3': 4 }, { '3': 5 }), '3')).toBe(true);
  });

  it('R1 — nhóm chưa xong: thiếu thành viên gửi hoặc nhóm trống', () => {
    expect(isGroupDone(counters({ '3': 4 }, { '3': 2 }), '3')).toBe(false);
    expect(isGroupDone(counters({ '3': 0 }, { '3': 0 }), '3')).toBe(false);
    expect(isGroupDone(counters({}, { '3': 3 }), '3')).toBe(false);
  });

  it('R2 — nhóm chậm: quá 80% thời lượng và tỷ lệ gửi < 50%', () => {
    expect(isGroupSlow(counters({ '5': 4 }, { '5': 1 }), '5', 0.85)).toBe(true);
    expect(isGroupSlow(counters({ '5': 4 }, { '5': 1 }), '5', 0.7)).toBe(false);
    expect(isGroupSlow(counters({ '5': 4 }, { '5': 3 }), '5', 0.9)).toBe(false);
  });

  it('R2 — nhóm trống hoặc tỷ lệ ≥ 50% không báo chậm', () => {
    expect(isGroupSlow(counters({ '5': 0 }, { '5': 0 }), '5', 0.9)).toBe(false);
    expect(isGroupSlow(counters({ '5': 2 }, { '5': 2 }), '5', 0.9)).toBe(false);
  });

  it('R3 — hàm thuần không thay đổi counters (không tự di chuyển HS)', () => {
    const c = counters({ '2': 3 }, { '2': 1 });
    isGroupDone(c, '2');
    isGroupSlow(c, '2', 0.9);
    expect(c).toEqual(counters({ '2': 3 }, { '2': 1 }));
  });
});
`;
writeFileSync(p, t.trimEnd() + '\n' + add, 'utf8');
console.log('tests appended');
