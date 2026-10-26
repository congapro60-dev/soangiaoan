import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { watchScoreBook } from './scoreBookStream';

const mocks = vi.hoisted(() => ({ currentUser: null as any, onToken: null as any, unsubscribe: vi.fn() }));
vi.mock('../firebase', () => ({ auth: mocks }));
vi.mock('firebase/auth', () => ({ onIdTokenChanged: (_: unknown, callback: unknown) => { mocks.onToken = callback; return mocks.unsubscribe; } }));

describe('score-book stream client', () => {
  let visibility: string; let events: EventTarget; let controller: ReadableStreamDefaultController<Uint8Array>;
  const encoder = new TextEncoder();
  const send = (text = '{"type":"invalidate"}\n') => controller.enqueue(encoder.encode(text));
  beforeEach(() => {
    vi.useFakeTimers(); events = new EventTarget(); visibility = 'visible';
    vi.stubGlobal('document', { get visibilityState() { return visibility; }, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) });
    mocks.currentUser = { uid: 'uid', isAnonymous: false, getIdToken: vi.fn(async () => 'token') };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, body: new ReadableStream({ start(c) { controller = c; } }) })));
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
  const start = async (onInvalidate = vi.fn(async (_current: () => boolean) => {})) => {
    const stop = watchScoreBook({ classId: 'class', onInvalidate }); mocks.onToken(mocks.currentUser); await vi.advanceTimersByTimeAsync(0); return { stop, onInvalidate };
  };

  it('parses split NDJSON; coalesces reads without overlap; guards work after disposal', async () => {
    let finish!: () => void; let current!: () => boolean;
    const onInvalidate = vi.fn(async (guard: () => boolean) => { current = guard; await new Promise<void>(r => { finish = r; }); });
    const { stop } = await start(onInvalidate);
    send('{"type":"inval'); send('idate"}\n'); await vi.advanceTimersByTimeAsync(0);
    expect(onInvalidate).toHaveBeenCalledOnce(); expect(current()).toBe(true);
    send(); send(); await vi.advanceTimersByTimeAsync(0); expect(onInvalidate).toHaveBeenCalledOnce();
    finish(); await vi.advanceTimersByTimeAsync(0); expect(onInvalidate).toHaveBeenCalledTimes(2);
    stop(); expect(current()).toBe(false); finish(); await vi.advanceTimersByTimeAsync(0);
    expect(mocks.unsubscribe).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts while hidden, resumes visible, reconnects after EOF, stops timers on unmount', async () => {
    const { stop } = await start(); const first = (fetch as any).mock.calls[0][1].signal;
    visibility = 'hidden'; events.dispatchEvent(new Event('visibilitychange')); expect(first.aborted).toBe(true);
    visibility = 'visible'; events.dispatchEvent(new Event('visibilitychange')); await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(2); controller.close(); await vi.advanceTimersByTimeAsync(1000);
    expect(fetch).toHaveBeenCalledTimes(3); stop(); expect(vi.getTimerCount()).toBe(0);
  });

  it('invalidates old session immediately and does not retry forbidden responses', async () => {
    let guard!: () => boolean;
    const { stop } = await start(vi.fn(async (current: () => boolean) => { guard = current; }));
    send(); await vi.advanceTimersByTimeAsync(0);
    mocks.currentUser = { ...mocks.currentUser, uid: 'other' }; mocks.onToken(mocks.currentUser);
    expect(guard()).toBe(false);
    (fetch as any).mockResolvedValue({ ok: false, status: 403 });
    await vi.advanceTimersByTimeAsync(60_000); expect(fetch).toHaveBeenCalledTimes(2); stop();
  });

  it('backs off network failures with one bounded timer', async () => {
    (fetch as any).mockRejectedValue(new Error('offline')); const { stop } = await start();
    await vi.advanceTimersByTimeAsync(120_000); expect((fetch as any).mock.calls.length).toBeLessThan(12); expect(vi.getTimerCount()).toBe(1); stop();
  });
});
