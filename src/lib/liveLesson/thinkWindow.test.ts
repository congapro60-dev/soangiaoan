import { describe, expect, it } from 'vitest';
import { getLockedThinkWindow, getThinkWindowState } from './thinkWindow';

describe('getThinkWindowState', () => {
  it('khoá ô trong lúc chờ để học sinh nghĩ trước khi gõ', () => {
    const state = getThinkWindowState({ thinkSeconds: 10 }, 3);
    expect(state.phase).toBe('thinking');
    expect(state.canAnswer).toBe(false);
    expect(state.remainingSeconds).toBe(7);
    expect(state.label).toBe('Suy nghĩ 7s — chưa bấm gì');
  });

  it('hết giờ chờ thì mở ô', () => {
    const state = getThinkWindowState({ thinkSeconds: 10 }, 10);
    expect(state.phase).toBe('answering');
    expect(state.canAnswer).toBe(true);
    expect(state.remainingSeconds).toBe(0);
    expect(state.label).toBe('Gửi đáp án');
  });

  it('vẫn mở khi đã quá giờ chờ', () => {
    expect(getThinkWindowState({ thinkSeconds: 10 }, 45).canAnswer).toBe(true);
  });

  it('câu thăm dò bỏ qua chờ thì mở ngay', () => {
    const state = getThinkWindowState({ thinkSeconds: 10, skip: true }, 0);
    expect(state.phase).toBe('answering');
    expect(state.canAnswer).toBe(true);
  });

  it('thiếu thinkSeconds thì dùng mặc định 10 giây', () => {
    expect(getThinkWindowState({ thinkSeconds: 0 }, 0).remainingSeconds).toBe(10);
  });

  it('chịu được elapsed hỏng', () => {
    expect(getThinkWindowState({ thinkSeconds: 10 }, Number.NaN).remainingSeconds).toBe(10);
    expect(getThinkWindowState({ thinkSeconds: 10 }, -20).remainingSeconds).toBe(10);
  });
});

describe('getLockedThinkWindow', () => {
  it('công bố xong thì khoá, không cho sửa bài', () => {
    const state = getLockedThinkWindow();
    expect(state.phase).toBe('closed');
    expect(state.canAnswer).toBe(false);
    expect(state.label).toContain('Đã công bố');
  });
});
