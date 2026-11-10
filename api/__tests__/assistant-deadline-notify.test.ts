import { describe, expect, it, vi } from 'vitest';
import { deliveryId, drainDeadlineOutbox, syncDeadlineNotices, type DeadlineNotice } from '../_assistant-deadline-notify';

export function memoryDb() {
  const data = new Map<string, any>();
  let lock = Promise.resolve();
  const ref = (path: string): any => ({ path, id: path.split('/').at(-1), collection: (name: string) => collection(`${path}/${name}`), get: async () => snap(path), set: async (v: any) => { data.set(path, structuredClone(v)); }, update: async (v: any) => { data.set(path, { ...data.get(path), ...structuredClone(v) }); } });
  const snap = (path: string): any => ({ exists: data.has(path), id: path.split('/').at(-1), ref: ref(path), data: () => data.has(path) ? structuredClone(data.get(path)) : undefined });
  const collection = (path: string): any => ({ doc: (id: string) => ref(`${path}/${id}`) });
  const db = { collection, runTransaction: async (f: any) => {
    const previous = lock; let release!: () => void; lock = new Promise<void>(r => { release = r; }); await previous;
    const writes: Array<() => void> = [];
    try { const result = await f({ get: (r: any) => r.get(), set: (r: any, v: any) => { writes.push(() => data.set(r.path, structuredClone(v))); }, update: (r: any, v: any) => { writes.push(() => data.set(r.path, { ...data.get(r.path), ...structuredClone(v) })); } }); writes.forEach(w => w()); return result; }
    finally { release(); }
  } };
  return { db: db as any, data, ref };
}
const notice = (patch: Partial<DeadlineNotice> = {}): DeadlineNotice => ({ taskId: 't1', version: 'v1', studentId: 's1', classId: 'c1', teacherId: 'owner', title: 'Khảo sát', dueAt: '2026-11-10T01:00:00Z', description: 'Làm form', url: '', ...patch });
const config = { botId: 'bot', testUserIds: ['test-chat'], enabled: true };
function setup() {
  const h = memoryDb();
  h.data.set('channelLinks/l1', { active: true, channel: 'zalo_bot', channelAccountId: 'bot', channelUserId: 'test-chat', channelChatId: 'test-chat', role: 'student', classId: 'c1', studentId: 's1' });
  h.data.set('classes/c1', { teacherId: 'owner' });
  h.data.set('classes/c1/students/s1', { code: 'HS01', name: 'Em thử' });
  return h;
}
const target = { linkId: 'l1', userId: 'test-chat', studentId: 's1', classId: 'c1', teacherId: 'owner' };
describe('deadline delivery outbox', () => {
  it('ignores an older observation after a newer snapshot', async () => {
    const h = setup(); await syncDeadlineNotices(h.db, 'c1', [], [target], config, 10);
    await syncDeadlineNotices(h.db, 'c1', [notice({ version: 'new' })], [target], config, 30);
    expect(await syncDeadlineNotices(h.db, 'c1', [notice({ version: 'old' })], [target], config, 20)).toEqual([]);
  });
  it('does not redeliver the same semantic version after it disappears and reappears', async () => {
    const h = setup(); await syncDeadlineNotices(h.db, 'c1', [], [target], config, 1);
    await syncDeadlineNotices(h.db, 'c1', [notice()], [target], config, 2);
    await syncDeadlineNotices(h.db, 'c1', [], [target], config, 3);
    await syncDeadlineNotices(h.db, 'c1', [notice()], [target], config, 4);
    expect([...h.data.keys()].filter(k => k.startsWith('assistantDeadlineOutbox/'))).toHaveLength(1);
  });
  it('does not accumulate deliveries while class notifications are disabled', async () => {
    const h = setup(); await syncDeadlineNotices(h.db, 'c1', [], [target], config, 1);
    await syncDeadlineNotices(h.db, 'c1', [notice()], [target], { ...config, enabled: false }, 2);
    await syncDeadlineNotices(h.db, 'c1', [notice()], [target], config, 3);
    expect([...h.data.keys()].filter(k => k.startsWith('assistantDeadlineOutbox/'))).toHaveLength(0);
  });
  it('first sync records baseline but never enqueues old tasks', async () => {
    const h = setup(); await syncDeadlineNotices(h.db, 'c1', [notice()], [target], config, 10);
    expect([...h.data.keys()].filter(k => k.startsWith('assistantDeadlineOutbox/'))).toEqual([]);
  });
  it('new version creates one delivery per student and repeated syncs do not duplicate', async () => {
    const h = setup(); await syncDeadlineNotices(h.db, 'c1', [], [target], config, 10);
    await Promise.all([syncDeadlineNotices(h.db, 'c1', [notice()], [target, target], config, 11), syncDeadlineNotices(h.db, 'c1', [notice()], [target], config, 12)]);
    expect([...h.data.keys()].filter(k => k.startsWith('assistantDeadlineOutbox/'))).toHaveLength(1);
    await syncDeadlineNotices(h.db, 'c1', [notice({ version: 'v2' })], [target], config, 13);
    expect([...h.data.keys()].filter(k => k.startsWith('assistantDeadlineOutbox/'))).toHaveLength(2);
  });
  it('concurrent drains send once and a crash after claim never auto-retries', async () => {
    const h = setup(); await syncDeadlineNotices(h.db, 'c1', [], [target], config, 1);
    await syncDeadlineNotices(h.db, 'c1', [notice()], [target], config, 2);
    const id = deliveryId('bot', 'c1', 's1', 't1', 'v1');
    const send = vi.fn(async () => ({ state: 'sent' as const }));
    await Promise.all([drainDeadlineOutbox(h.db, [id], config, send, async () => true, 3), drainDeadlineOutbox(h.db, [id], config, send, async () => true, 3)]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(h.data.get(`assistantDeadlineOutbox/${id}`).state).toBe('sent');
    h.data.set(`assistantDeadlineOutbox/${id}`, { ...h.data.get(`assistantDeadlineOutbox/${id}`), state: 'sending' });
    await drainDeadlineOutbox(h.db, [id], config, send, async () => true, 4);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('ambiguous network outcome locks automatic retry', async () => {
    const h = setup(); await syncDeadlineNotices(h.db, 'c1', [], [target], config, 1); await syncDeadlineNotices(h.db, 'c1', [notice()], [target], config, 2);
    const id = deliveryId('bot', 'c1', 's1', 't1', 'v1'), send = vi.fn(async () => { throw new Error('network'); });
    await drainDeadlineOutbox(h.db, [id], config, send, async () => true, 3); await drainDeadlineOutbox(h.db, [id], config, send, async () => true, 999999);
    expect(send).toHaveBeenCalledTimes(1); expect(h.data.get(`assistantDeadlineOutbox/${id}`).state).toBe('unknown');
    await syncDeadlineNotices(h.db, 'c1', [], [target], config, 1000000);
    await syncDeadlineNotices(h.db, 'c1', [notice()], [target], config, 1000001);
    expect([...h.data.keys()].filter(k => k.startsWith('assistantDeadlineOutbox/'))).toHaveLength(1);
  });
  it('rechecks recipient AFTER a slow source refresh, before sending', async () => {
    const h = setup(); await syncDeadlineNotices(h.db, 'c1', [], [target], config, 1); await syncDeadlineNotices(h.db, 'c1', [notice()], [target], config, 2);
    const id = deliveryId('bot', 'c1', 's1', 't1', 'v1'), send = vi.fn(async () => ({ state: 'sent' as const }));
    await drainDeadlineOutbox(h.db, [id], config, send, async () => { h.data.get('channelLinks/l1').active = false; return true; }, 3);
    expect(send).not.toHaveBeenCalled();
  });
  it('definite rejection may retry with backoff, bounded at three attempts', async () => {
    const h = setup(); await syncDeadlineNotices(h.db, 'c1', [], [target], config, 1); await syncDeadlineNotices(h.db, 'c1', [notice()], [target], config, 2);
    const id = deliveryId('bot', 'c1', 's1', 't1', 'v1'), send = vi.fn(async () => ({ state: 'rejected' as const, code: 429 }));
    for (const now of [3, 4, 60003, 180003, 999999]) await drainDeadlineOutbox(h.db, [id], config, send, async () => true, now);
    expect(send).toHaveBeenCalledTimes(3);
  });
  it('does not send to real users or changed/withdrawn identities, even when enabled', async () => {
    for (const change of ['real', 'revoked', 'owner', 'parent', 'stale-task']) {
      const h = setup(); await syncDeadlineNotices(h.db, 'c1', [], [target], config, 1); await syncDeadlineNotices(h.db, 'c1', [notice()], [target], config, 2);
      const id = deliveryId('bot', 'c1', 's1', 't1', 'v1');
      if (change === 'real') config.testUserIds = [];
      if (change === 'revoked') h.data.get('channelLinks/l1').active = false;
      if (change === 'owner') h.data.get('classes/c1').teacherId = 'other';
      if (change === 'parent') h.data.get('channelLinks/l1').role = 'parent';
      const send = vi.fn(async () => ({ state: 'sent' as const }));
      await drainDeadlineOutbox(h.db, [id], config, send, async () => change !== 'stale-task', 3);
      expect(send).not.toHaveBeenCalled(); config.testUserIds = ['test-chat'];
    }
  });
  it('disabled mode never calls transport', async () => {
    const h = setup(), send = vi.fn(); await drainDeadlineOutbox(h.db, ['anything'], { ...config, enabled: false }, send, async () => true, 1); expect(send).not.toHaveBeenCalled();
  });
  it('cancels notices older than one day without a source call or send', async () => {
    const h = setup(); await syncDeadlineNotices(h.db, 'c1', [], [target], config, 1); await syncDeadlineNotices(h.db, 'c1', [notice()], [target], config, 2);
    const id = deliveryId('bot', 'c1', 's1', 't1', 'v1'), send = vi.fn(), source = vi.fn();
    await drainDeadlineOutbox(h.db, [id], config, send, source, 86400003);
    expect(send).not.toHaveBeenCalled(); expect(source).not.toHaveBeenCalled();
    expect(h.data.get(`assistantDeadlineOutbox/${id}`).state).toBe('cancelled');
  });
  it('source outage leaves an unattempted job retryable', async () => {
    const h = setup(); await syncDeadlineNotices(h.db, 'c1', [], [target], config, 1); await syncDeadlineNotices(h.db, 'c1', [notice()], [target], config, 2);
    const id = deliveryId('bot', 'c1', 's1', 't1', 'v1'), send = vi.fn();
    await drainDeadlineOutbox(h.db, [id], config, send, async () => { throw new Error('unavailable'); }, 3);
    expect(send).not.toHaveBeenCalled(); expect(h.data.get(`assistantDeadlineOutbox/${id}`).state).toBe('pending');
  });
  it('state storage is scoped by bot as well as class', async () => {
    const h = setup(); await syncDeadlineNotices(h.db, 'c1', [], [target], config, 1); await syncDeadlineNotices(h.db, 'c1', [notice()], [target], { ...config, botId: 'other-bot' }, 2);
    expect([...h.data.keys()].filter(k => k.startsWith('assistantDeadlineOutbox/'))).toHaveLength(0);
  });
});
