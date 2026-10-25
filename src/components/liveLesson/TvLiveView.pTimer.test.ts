import { describe, expect, it } from 'vitest';
import { getElapsedInLesson } from './TvLiveView';

/**
 * Ca Codex bắt được: chuyển pha từ P32 (sau 300 giây) sang P38 làm P-timer nhảy về.
 * Gốc rễ cũ: P-timer cộng `cue.atSeconds` + thời gian trong cue, nên đổi cue là đổi mốc.
 * Bản mới neo vào `lessonStartedAt` nên chuyển cue không ảnh hưởng.
 */
describe('getElapsedInLesson — neo vào đầu tiết, không theo cue', () => {
  const start = 1_000_000;

  it('đếm từ đầu tiết khi đang chạy, không phụ thuộc cue nào', () => {
    expect(getElapsedInLesson({ lessonStartedAt: start, lessonElapsedSeconds: 0, now: start + 300_000, running: true })).toBe(300);
  });

  it('chuyển cue KHÔNG làm đồng hồ nhảy ngược (ca 300s → 180s của Codex)', () => {
    // Ở phút thứ 5 của tiết. Chuyển sang cue bất kỳ (kể cả cue sớm hơn) vẫn phải ra 300.
    const at300 = getElapsedInLesson({ lessonStartedAt: start, lessonElapsedSeconds: 0, now: start + 300_000, running: true });
    const afterCueChange = getElapsedInLesson({ lessonStartedAt: start, lessonElapsedSeconds: 0, now: start + 300_000, running: true });
    expect(at300).toBe(300);
    expect(afterCueChange).toBe(300);
    expect(afterCueChange!).toBeGreaterThanOrEqual(at300!);
  });

  it('pause giữ nguyên số đã đếm, resume cộng tiếp chứ không reset', () => {
    // Chạy 200s rồi pause: service chốt lessonElapsedSeconds = 200, lessonStartedAt = 0.
    const paused = getElapsedInLesson({ lessonStartedAt: 0, lessonElapsedSeconds: 200, now: start + 999_999, running: false });
    expect(paused).toBe(200);
    // Resume ở mốc mới, chạy thêm 100s ⇒ 300.
    const resumed = getElapsedInLesson({ lessonStartedAt: start + 500_000, lessonElapsedSeconds: 200, now: start + 600_000, running: true });
    expect(resumed).toBe(300);
  });

  it('giữ nguyên khi pause dù thời gian thực trôi qua bao lâu', () => {
    const a = getElapsedInLesson({ lessonStartedAt: 0, lessonElapsedSeconds: 120, now: start, running: false });
    const b = getElapsedInLesson({ lessonStartedAt: 0, lessonElapsedSeconds: 120, now: start + 3_600_000, running: false });
    expect(a).toBe(120);
    expect(b).toBe(120);
  });

  it('phiên cũ chưa có 2 trường mới trả null để TV ẩn P-timer thay vì hiện số sai', () => {
    expect(getElapsedInLesson({ now: start, running: true })).toBeNull();
  });

  it('phiên mới nhưng tiết chưa chạy (lobby) trả 0 chứ không phải null', () => {
    expect(getElapsedInLesson({ lessonStartedAt: 0, lessonElapsedSeconds: 0, now: start, running: true })).toBe(0);
  });

  it('đồng hồ không âm khi đồng hồ máy lệch về quá khứ', () => {
    expect(getElapsedInLesson({ lessonStartedAt: start, lessonElapsedSeconds: 0, now: start - 60_000, running: true })).toBe(0);
  });
});
