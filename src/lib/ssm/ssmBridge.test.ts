import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pingSsmBridge } from './ssmBridge';

type Listener = (event: { source: unknown; origin: string; data: unknown }) => void;

/** Cửa sổ giả: ghi lại các lời gọi của app và cho phép "tiện ích" trả lời lúc nào tuỳ ý. */
const fakeWindow = () => {
  const listeners = new Set<Listener>();
  const posted: Array<{ id: string; op: string }> = [];
  const win: any = {
    location: { origin: 'https://app.test' },
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
    addEventListener: (_type: string, fn: Listener) => listeners.add(fn),
    removeEventListener: (_type: string, fn: Listener) => listeners.delete(fn),
    postMessage: (msg: { id: string; op: string }) => { posted.push(msg); },
  };
  const reply = (id: string) => listeners.forEach(fn => fn({ source: win, origin: win.location.origin, data: { source: 'ssm-bridge', kind: 'ssm-response', id, ok: true, data: { version: '0.1.0' } } }));
  return { win, posted, reply };
};

describe('pingSsmBridge', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); delete (globalThis as any).window; });

  it('tiện ích trả lời ngay → xong, chỉ gọi một lần', async () => {
    const { win, posted, reply } = fakeWindow();
    (globalThis as any).window = win;
    const done = pingSsmBridge();
    reply(posted[0].id);
    await expect(done).resolves.toBeUndefined();
    expect(posted).toHaveLength(1);
  });

  it('service worker ngủ: lần đầu im lặng quá 2 giây, lần thử lại (chờ tới 8 giây) vẫn nhận được', async () => {
    const { win, posted, reply } = fakeWindow();
    (globalThis as any).window = win;
    const done = pingSsmBridge();
    await vi.advanceTimersByTimeAsync(2100);
    expect(posted).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(3000); // máy chậm: 3 giây sau mới trả lời
    reply(posted[1].id);
    await expect(done).resolves.toBeUndefined();
  });

  it('không có tiện ích: sau 2 + 8 giây báo lỗi, chỉ dẫn mở edge://extensions', async () => {
    const { win } = fakeWindow();
    (globalThis as any).window = win;
    const done = pingSsmBridge();
    const assertion = expect(done).rejects.toThrow('edge://extensions');
    await vi.advanceTimersByTimeAsync(10_200);
    await assertion;
  });
});
