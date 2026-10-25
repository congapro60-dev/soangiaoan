import { describe, expect, it } from 'vitest';
import { getLockedThinkWindow, getThinkWindowState } from './thinkWindow';

/**
 * Ca Codex bắt được: sau khi GV bấm Công bố, hết 10 giây học sinh vẫn gửi/sửa được.
 * Luật: đã công bố thì khoá hẳn, bất kể đồng hồ chờ đã hết hay chưa.
 */
describe('getLockedThinkWindow — khoá sau Công bố', () => {
  it('khoá hẳn, không cho gửi', () => {
    const state = getLockedThinkWindow();
    expect(state.phase).toBe('closed');
    expect(state.canAnswer).toBe(false);
    expect(state.remainingSeconds).toBe(0);
    expect(state.label).toContain('Đã công bố');
  });

  it('khác với trạng thái hết giờ chờ (phải đang mở mới đúng)', () => {
    const afterWaiting = getThinkWindowState({ thinkSeconds: 10 }, 10);
    expect(afterWaiting.phase).toBe('answering');
    expect(afterWaiting.canAnswer).toBe(true);
    // Sau Công bố thì dù đồng hồ đã quá 10s, khoá vẫn thắng.
    expect(getLockedThinkWindow().canAnswer).toBe(false);
  });

  it('khoá cả khi câu có skip (câu thăm dò vốn mở ngay)', () => {
    expect(getThinkWindowState({ thinkSeconds: 10, skip: true }, 0).canAnswer).toBe(true);
    expect(getLockedThinkWindow().canAnswer).toBe(false);
  });
});

describe('getThinkWindowState — chờ hai nhịp', () => {
  it('chưa hết giờ chờ thì khoá', () => {
    const state = getThinkWindowState({ thinkSeconds: 10 }, 3);
    expect(state.phase).toBe('thinking');
    expect(state.canAnswer).toBe(false);
    expect(state.remainingSeconds).toBe(7);
  });

  it('hết giờ chờ thì mở', () => {
    expect(getThinkWindowState({ thinkSeconds: 10 }, 10).canAnswer).toBe(true);
  });
});
