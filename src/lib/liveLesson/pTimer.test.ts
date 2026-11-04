import { describe, expect, it } from 'vitest';
import {
  P_TIMER_URGENT_AT_MINUTE,
  P_TIMER_WARN_AT_MINUTE,
  formatPTimerLabel,
  getPBandForOffset,
  getPTimerState,
} from './pTimer';

describe('getPTimerState', () => {
  it('phút bình thường thì không nhắc gì', () => {
    const state = getPTimerState(12 * 60 + 34);
    expect(state.minute).toBe(12);
    expect(state.second).toBe(34);
    expect(state.band).toBe('P12');
    expect(state.tone).toBe('normal');
    expect(state.notice).toBeNull();
  });

  it('từ phút 35 chuyển sang cảnh báo vàng kèm số phút còn lại', () => {
    const state = getPTimerState(P_TIMER_WARN_AT_MINUTE * 60);
    expect(state.tone).toBe('warn');
    expect(state.notice).toBe('Còn 5 phút — chuẩn bị sơ kết.');
  });

  it('từ phút 38 chuyển sang nhắc sơ kết', () => {
    const state = getPTimerState(P_TIMER_URGENT_AT_MINUTE * 60 + 5);
    expect(state.tone).toBe('urgent');
    expect(state.notice).toBe('SƠ KẾT — còn 2 phút.');
  });

  it('quá 40 phút thì báo lố giờ thay vì im lặng', () => {
    const state = getPTimerState(41 * 60 + 30);
    expect(state.tone).toBe('overrun');
    expect(state.notice).toBe('Đã lố 2 phút — chốt ngay.');
    expect(state.remainingSeconds).toBe(-90);
  });

  it('đúng mốc 40 phút chưa coi là lố', () => {
    const state = getPTimerState(40 * 60);
    expect(state.tone).toBe('urgent');
    expect(state.remainingSeconds).toBe(0);
  });

  it('chịu được giá trị âm và NaN từ dữ liệu hỏng', () => {
    expect(getPTimerState(-50).minute).toBe(0);
    expect(getPTimerState(Number.NaN).minute).toBe(0);
  });

  it('tôn trọng tiết không phải 40 phút', () => {
    const state = getPTimerState(33 * 60, 35);
    expect(state.tone).toBe('normal');
    expect(state.remainingSeconds).toBe(120);
  });

  it('slotMinutes không hợp lệ thì rơi về 40', () => {
    expect(getPTimerState(0, 0).remainingSeconds).toBe(2400);
    expect(getPTimerState(0, -5).remainingSeconds).toBe(2400);
  });
});

describe('formatPTimerLabel', () => {
  it('giữ hai chữ số ở phần giây để GV canh nhịp ngắn', () => {
    expect(formatPTimerLabel(getPTimerState(5 * 60 + 7))).toBe('P5 · 5:07');
  });
});

describe('getPBandForOffset', () => {
  it('đổi mốc giây của cue sang dải P', () => {
    expect(getPBandForOffset(0)).toBe('P0');
    expect(getPBandForOffset(8 * 60)).toBe('P8');
    expect(getPBandForOffset(22 * 60 + 59)).toBe('P22');
  });
});
