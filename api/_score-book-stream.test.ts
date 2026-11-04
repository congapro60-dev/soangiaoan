import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleScoreBookStream } from './_score-book-stream';

const mocks = vi.hoisted(() => ({ verify: vi.fn(), teacher: vi.fn(), access: vi.fn() }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: mocks.verify }) }));
vi.mock('./_classroom-teacher.js', () => ({ teacherContext: mocks.teacher }));
vi.mock('./_classroom-access.js', () => ({ readClassAccess: mocks.access, classMemberId: (c: string, u: string) => `${c}__${u}` }));

function fixture() {
  const listeners: Array<{ path: string; filters: unknown[]; next: () => void; error: () => void; stop: ReturnType<typeof vi.fn> }> = [];
  const data: Record<string, unknown> = { 'studentLinks/uid': { classId: 'class', studentId: 'self' }, 'classes/class': {}, 'classes/class/students/self': {} };
  const ref = (path: string, filters: unknown[] = []): any => ({
    doc: (id: string) => ref(`${path}/${id}`), collection: (name: string) => ref(`${path}/${name}`),
    where: (...filter: unknown[]) => ref(path, [...filters, filter]), select: () => ref(path, filters),
    get: vi.fn(async () => ({ exists: data[path] !== undefined, data: () => data[path] })),
    onSnapshot: (next: () => void, error: () => void) => { const item = { path, filters, next, error, stop: vi.fn() }; listeners.push(item); next(); return item.stop; },
  });
  const db = { collection: (name: string) => ref(name) };
  const res = Object.assign(new EventEmitter(), { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn(), flushHeaders: vi.fn(), write: vi.fn(() => true), end: vi.fn(), destroyed: false });
  return { db: db as any, res: res as any, listeners, data };
}

describe('score-book invalidation stream', () => {
  beforeEach(() => { vi.useFakeTimers(); mocks.verify.mockResolvedValue({ uid: 'uid' }); mocks.access.mockResolvedValue({}); });
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it('scopes student queries to server identity, emits no marks, coalesces changes, cleans up on disconnect', async () => {
    const f = fixture();
    const done = handleScoreBookStream(f.db, { action: 'studentScoreBookStream', idToken: 'token', studentId: 'victim', classId: 'other' }, f.res);
    await vi.advanceTimersByTimeAsync(100);
    expect(f.listeners.filter(x => ['submissions', 'examSubmissions'].includes(x.path)).map(x => x.filters)).toEqual([
      [['classId', '==', 'class'], ['studentId', '==', 'self']], [['classId', '==', 'class'], ['studentId', '==', 'self']],
    ]);
    expect(f.res.write.mock.calls).toEqual([['{"type":"invalidate"}\n']]);
    f.listeners[0].next(); f.listeners[1].next();
    await vi.advanceTimersByTimeAsync(100);
    expect(f.res.write).toHaveBeenCalledTimes(2);
    f.res.emit('close'); await done;
    expect(f.listeners.every(x => x.stop.mock.calls.length === 1)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects missing token before installing listeners', async () => {
    const f = fixture();
    await handleScoreBookStream(f.db, { action: 'studentScoreBookStream' }, f.res);
    expect(f.res.status).toHaveBeenCalledWith(401); expect(f.listeners).toHaveLength(0);
  });

  it('ends immediately when the trusted student link changes, without another invalidation', async () => {
    const f = fixture(); const done = handleScoreBookStream(f.db, { action: 'studentScoreBookStream', idToken: 'token' }, f.res);
    await vi.advanceTimersByTimeAsync(100);
    f.data['studentLinks/uid'] = { classId: 'class', studentId: 'different' };
    f.listeners.find(x => x.path === 'studentLinks/uid')!.next();
    await vi.advanceTimersByTimeAsync(100); await done;
    expect(f.res.write).toHaveBeenCalledTimes(1); expect(f.res.end).toHaveBeenCalledOnce();
    expect(f.listeners.every(x => x.stop.mock.calls.length === 1)).toBe(true);
  });

  it('ends on lost teacher membership and bounds duration/listeners', async () => {
    const f = fixture(); mocks.teacher.mockResolvedValue({ uid: 'uid', classId: 'class', classRef: f.db.collection('classes').doc('class') });
    const done = handleScoreBookStream(f.db, { action: 'teacherScoreBookStream', idToken: 'token', classId: 'class' }, f.res);
    await vi.advanceTimersByTimeAsync(100);
    mocks.access.mockResolvedValue(null);
    f.listeners.find(x => x.path === 'classMembers/class__uid')!.next();
    await vi.advanceTimersByTimeAsync(100); await done;
    expect(f.res.write).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
    const next = fixture(); mocks.access.mockResolvedValue({});
    const bounded = handleScoreBookStream(next.db, { action: 'teacherScoreBookStream', idToken: 'token', classId: 'class' }, next.res);
    await vi.advanceTimersByTimeAsync(40_000); await bounded;
    expect(next.res.end).toHaveBeenCalledOnce(); expect(next.listeners.every(x => x.stop.mock.calls.length === 1)).toBe(true);
  });

  it('cleans up when any Firestore listener fails', async () => {
    const f = fixture(); const done = handleScoreBookStream(f.db, { action: 'studentScoreBookStream', idToken: 'token' }, f.res);
    await vi.advanceTimersByTimeAsync(100); f.listeners[0].error(); await done;
    expect(f.listeners.every(x => x.stop.mock.calls.length === 1)).toBe(true); expect(vi.getTimerCount()).toBe(0);
  });
});
