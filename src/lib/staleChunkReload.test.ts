import { describe, expect, it, vi } from 'vitest';
import { STALE_RELOAD_GUARD_MS, isStaleChunkError, reloadForStaleChunk, shouldAutoReload } from './staleChunkReload';

/** Kho nhớ giả thay sessionStorage — test chạy trong Node, không có window. */
const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
};

describe('isStaleChunkError', () => {
  it('nhận đúng câu lỗi thật giáo viên gặp ngày 11/09/2026 trên Edge', () => {
    expect(isStaleChunkError(new TypeError(
      'Failed to fetch dynamically imported module: https://giaoandewey.vercel.app/assets/ClassesTab-BgSaY9Qt.js',
    ))).toBe(true);
  });

  it('nhận cả cách Firefox và Safari báo cùng một chuyện', () => {
    expect(isStaleChunkError(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(isStaleChunkError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isStaleChunkError('Unable to preload CSS for /assets/index-abc.css')).toBe(true);
  });

  it('lỗi thường thì không bị coi là lỗi bản cũ', () => {
    expect(isStaleChunkError(new TypeError("Cannot read properties of undefined (reading 'name')"))).toBe(false);
    expect(isStaleChunkError(null)).toBe(false);
  });
});

describe('reloadForStaleChunk', () => {
  it('lần đầu thì tải lại và ghi nhớ mốc', () => {
    const storage = memoryStorage();
    const reload = vi.fn();

    expect(reloadForStaleChunk(storage, 1_000_000, reload)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('vừa tải lại mà vẫn lỗi thì dừng — file mất thật, không tải lại vô hạn', () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    reloadForStaleChunk(storage, 1_000_000, reload);

    expect(reloadForStaleChunk(storage, 1_000_000 + 5_000, reload)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('qua khỏi khoảng chặn thì lần deploy sau lại được tự tải lại', () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    reloadForStaleChunk(storage, 1_000_000, reload);

    expect(reloadForStaleChunk(storage, 1_000_000 + STALE_RELOAD_GUARD_MS + 1, reload)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('không có chỗ ghi nhớ thì không tự tải, vì không chặn được vòng lặp', () => {
    const reload = vi.fn();
    expect(reloadForStaleChunk(null, 1_000_000, reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('shouldAutoReload: chưa từng tải lại thì được tải', () => {
    expect(shouldAutoReload(1_000, null)).toBe(true);
  });
});
