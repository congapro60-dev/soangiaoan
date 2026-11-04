import { describe, expect, it } from 'vitest';
import {
  buildAssistantRequestHash,
  classifyAssistantTool,
  confirmationIdForRequest,
  normalizeAssistantConfirmationPayload,
  requiresAssistantConfirmation,
} from '../_assistant-core.js';
import {
  ASSISTANT_EXECUTION_LEASE_MS,
  cancelAssistantConfirmation,
  claimAssistantConfirmation,
  createAssistantConfirmation,
  executeAssistantConfirmation,
  expirePendingAssistantConfirmations,
} from '../_assistant-confirmations.js';

const actor = {
  firebaseUid: 'teacher-1', channel: 'telegram' as const, channelAccountId: 'bot-1',
  channelUserId: '123', channelChatId: '123', linkId: 'link-1', active: true as const,
};

class FakeDb {
  rows = new Map<string, Record<string, unknown>>();
  collection(name: string) { return new FakeCollection(this, name); }
  runTransaction<T>(fn: (tx: FakeTransaction) => Promise<T>) { return fn(new FakeTransaction(this)); }
  seed(collection: string, id: string, value: Record<string, unknown>) { this.rows.set(`${collection}/${id}`, { ...value }); }
  read(path: string) { const value = this.rows.get(path); return value ? { ...value } : undefined; }
  write(path: string, value: Record<string, unknown>) { this.rows.set(path, { ...value }); }
  patch(path: string, value: Record<string, unknown>) {
    const current = this.rows.get(path) || {};
    const next = { ...current };
    for (const [key, patchValue] of Object.entries(value)) {
      if (patchValue && typeof patchValue === 'object' && (patchValue as { constructor?: { name?: string } }).constructor?.name === 'DeleteTransform') delete next[key];
      else next[key] = patchValue;
    }
    this.rows.set(path, next);
  }
}
class FakeRef {
  constructor(private readonly db: FakeDb, readonly collection: string, readonly id: string) {}
  get() { const data = this.db.read(`${this.collection}/${this.id}`); return Promise.resolve({ exists: Boolean(data), id: this.id, data: () => data, ref: this }); }
}
class FakeQuery {
  constructor(private readonly db: FakeDb, protected readonly collectionName: string, private readonly filters: Array<[string, string, unknown]> = [], private readonly take?: number) {}
  where(field: string, op: string, value: unknown) { return new FakeQuery(this.db, this.collectionName, [...this.filters, [field, op, value]], this.take); }
  limit(value: number) { return new FakeQuery(this.db, this.collectionName, this.filters, value); }
  get() {
    const rows = [...this.db.rows.entries()].filter(([path, row]) => path.startsWith(`${this.collectionName}/`) && this.filters.every(([field, op, value]) => op === '==' ? row[field] === value : op === '<=' ? typeof row[field] === 'number' && row[field] <= value : op === '<' ? typeof row[field] === 'number' && row[field] < value : true));
    const selected = this.take === undefined ? rows : rows.slice(0, this.take);
    return Promise.resolve({ empty: selected.length === 0, docs: selected.map(([path, row]) => ({ id: path.slice(this.collectionName.length + 1), data: () => ({ ...row }), ref: new FakeRef(this.db, this.collectionName, path.slice(this.collectionName.length + 1)) })) });
  }
}
class FakeCollection extends FakeQuery {
  constructor(private readonly store: FakeDb, name: string) { super(store, name); }
  doc(id = `generated-${this.store.rows.size}`) { return new FakeRef(this.store, this.collectionName, id); }
}
class FakeTransaction {
  constructor(private readonly db: FakeDb) {}
  get(target: FakeRef | FakeQuery) { return target.get(); }
  set(ref: FakeRef, value: Record<string, unknown>) { this.db.write(`${ref.collection}/${ref.id}`, value); }
  create(ref: FakeRef, value: Record<string, unknown>) { if (this.db.read(`${ref.collection}/${ref.id}`)) throw new Error('already exists'); this.db.write(`${ref.collection}/${ref.id}`, value); }
  update(ref: FakeRef, value: Record<string, unknown>) { this.db.patch(`${ref.collection}/${ref.id}`, value); }
}

describe('assistant confirmation contracts', () => {
  it('classifies known tools and requires confirmation for every non-read action', () => {
    for (const tool of ['listStudents', 'getLessonPlan', 'getAssistantJobStatus']) {
      expect(classifyAssistantTool(tool)).toBe('read');
      expect(requiresAssistantConfirmation(tool)).toBe(false);
    }
    for (const [tool, category] of [
      ['draftLesson', 'draft'], ['patchLessonSection', 'write'], ['sendParentMessage', 'send'],
      ['replaceDriveFile', 'destructive'], ['startAssignmentGrading', 'billable'],
    ] as const) {
      expect(classifyAssistantTool(tool)).toBe(category);
      expect(requiresAssistantConfirmation(tool)).toBe(true);
    }
    expect(() => classifyAssistantTool('unknownTool')).toThrow('Unsupported assistant tool');
  });

  it('hashes canonical normalized action, actor, resources, payload, and recipients', () => {
    const first = buildAssistantRequestHash({
      actor, toolName: 'createAssignment', resourceIds: ['class-1'], recipients: ['uid-1'],
      payload: { title: 'Bài tập', dueAt: 100 },
    });
    expect(buildAssistantRequestHash({
      actor, toolName: 'createAssignment', resourceIds: ['class-1'], recipients: ['uid-1'],
      payload: { dueAt: 100, title: 'Bài tập' },
    })).toBe(first);
    expect(buildAssistantRequestHash({
      actor: { ...actor, channelUserId: '456' }, toolName: 'createAssignment', resourceIds: ['class-1'], recipients: ['uid-1'],
      payload: { title: 'Bài tập', dueAt: 100 },
    })).not.toBe(first);
    expect(buildAssistantRequestHash({
      actor, toolName: 'createAssignment', resourceIds: ['class-1'], recipients: ['uid-2'],
      payload: { title: 'Bài tập', dueAt: 100 },
    })).not.toBe(first);
  });

  it('uses an actor-bound stable idempotency key and rejects secret-bearing payloads', () => {
    expect(confirmationIdForRequest(actor, 'update-1')).toBe(confirmationIdForRequest(actor, 'update-1'));
    expect(confirmationIdForRequest(actor, 'update-1')).not.toBe(confirmationIdForRequest({ ...actor, firebaseUid: 'teacher-2' }, 'update-1'));
    expect(() => normalizeAssistantConfirmationPayload({ apiKey: 'secret' })).toThrow('Sensitive confirmation payload');
    expect(() => normalizeAssistantConfirmationPayload({ fileUrl: 'https://files.test/report?token=secret' })).toThrow('Sensitive confirmation payload');
    expect(normalizeAssistantConfirmationPayload({ title: 'Bài tập', dueAt: 100 })).toEqual({ title: 'Bài tập', dueAt: 100 });
  });

});

describe('assistant confirmation lifecycle', () => {
  const now = 10_000;
  const activeLink = { firebaseUid: actor.firebaseUid, channel: actor.channel, channelAccountId: actor.channelAccountId, channelUserId: actor.channelUserId, channelChatId: actor.channelChatId, createdAt: now - 100, updatedAt: now - 100, active: true };
  const makeDb = () => { const db = new FakeDb(); db.seed('channelLinks', actor.linkId, activeLink); db.seed('classes', 'class-1', { teacherId: actor.firebaseUid }); return db; };
  const prepare = (db: FakeDb, requestId = 'request-1', payload: Record<string, unknown> = { title: 'Bài' }) => createAssistantConfirmation({ actor, requestId, toolName: 'createAssignment', payload, preview: 'Tạo bài tập Bài', resourceIds: ['class-1'], resourceScopes: [{ resourceType: 'class', resourceId: 'class-1', requiredRole: 'write' }], recipients: [] , now }, db as any);

  it('is idempotent by request ID and rejects changed content', async () => {
    const db = makeDb();
    const first = await prepare(db);
    const replay = await prepare(db);
    expect(replay).toMatchObject({ confirmationId: first.confirmationId, requestHash: first.requestHash, status: 'pending' });
    await expect(prepare(db, 'request-1', { title: 'Bài khác' })).rejects.toThrow('Request ID reused');
  });

  it('claims one confirmation, finalizes once, and returns the stored result on replay', async () => {
    const db = makeDb();
    const created = await prepare(db);
    let calls = 0;
    const first = await executeAssistantConfirmation({ actor, confirmationId: created.confirmationId, requestHash: created.requestHash, now: now + 1, execute: () => { calls += 1; return { ok: true, count: calls }; } }, db as any);
    const replay = await executeAssistantConfirmation({ actor, confirmationId: created.confirmationId, requestHash: created.requestHash, now: now + 2, execute: () => { calls += 1; return { ok: true, count: calls }; } }, db as any);
    expect(first).toMatchObject({ status: 'executed', result: { ok: true, count: 1 } });
    expect(replay).toMatchObject({ status: 'executed', replay: true, result: { ok: true, count: 1 } });
    expect(calls).toBe(1);
    expect(db.read(`assistantConfirmations/${created.confirmationId}`)).not.toHaveProperty('payload');
  });

  it('turns an executor failure into locked OUTCOME_UNKNOWN and never retries', async () => {
    const db = makeDb();
    const created = await prepare(db, 'request-unknown');
    let calls = 0;
    const first = await executeAssistantConfirmation({ actor, confirmationId: created.confirmationId, requestHash: created.requestHash, now: now + 1, execute: () => { calls += 1; throw new Error('provider timed out'); } }, db as any);
    const replay = await executeAssistantConfirmation({ actor, confirmationId: created.confirmationId, requestHash: created.requestHash, now: now + 2, execute: () => { calls += 1; return { recovered: true }; } }, db as any);
    expect(first).toMatchObject({ status: 'outcome_unknown', code: 'OUTCOME_UNKNOWN' });
    expect(replay).toMatchObject({ status: 'outcome_unknown', replay: true, code: 'OUTCOME_UNKNOWN' });
    expect(calls).toBe(1);
  });

  it('denies wrong chat or revoked link and expires pending payloads', async () => {
    const db = makeDb();
    const created = await prepare(db, 'request-bound');
    const wrongChat = { ...actor, channelChatId: '999' };
    await expect(claimAssistantConfirmation({ actor: wrongChat, confirmationId: created.confirmationId, requestHash: created.requestHash, now: now + 1 }, db as any)).rejects.toThrow('identity');

    const expiredDb = makeDb();
    const expired = await prepare(expiredDb, 'request-expired');
    await expect(claimAssistantConfirmation({ actor, confirmationId: expired.confirmationId, requestHash: expired.requestHash, now: now + 5 * 60 * 1000 + 1 }, expiredDb as any)).rejects.toThrow('expired');
    expect(expiredDb.read(`assistantConfirmations/${expired.confirmationId}`)).not.toHaveProperty('payload');

    const revokedDb = makeDb();
    const revoked = await prepare(revokedDb, 'request-revoked');
    revokedDb.patch(`channelLinks/${actor.linkId}`, { active: false, revokedAt: now + 1 });
    await expect(claimAssistantConfirmation({ actor, confirmationId: revoked.confirmationId, requestHash: revoked.requestHash, now: now + 1 }, revokedDb as any)).rejects.toThrow('no longer active');
  });

  it('locks an abandoned executing claim after its lease without reclaiming it', async () => {
    const db = makeDb();
    const created = await prepare(db, 'request-crash');
    const claim = await claimAssistantConfirmation({ actor, confirmationId: created.confirmationId, requestHash: created.requestHash, now: now + 1 }, db as any);
    expect(claim.status).toBe('executing');
    const locked = await claimAssistantConfirmation({ actor, confirmationId: created.confirmationId, requestHash: created.requestHash, now: now + ASSISTANT_EXECUTION_LEASE_MS + 2 }, db as any);
    expect(locked).toMatchObject({ status: 'outcome_unknown', code: 'OUTCOME_UNKNOWN' });
  });

  it('cancels pending confirmations but cannot pretend an executing effect stopped', async () => {
    const db = makeDb();
    const created = await prepare(db, 'request-cancel');
    const cancelled = await cancelAssistantConfirmation({ actor, confirmationId: created.confirmationId, requestHash: created.requestHash, now: now + 1 }, db as any);
    expect(cancelled).toMatchObject({ status: 'cancelled' });
    await expect(claimAssistantConfirmation({ actor, confirmationId: created.confirmationId, requestHash: created.requestHash, now: now + 2 }, db as any)).rejects.toThrow('cancelled');

    const running = await prepare(db, 'request-running');
    await claimAssistantConfirmation({ actor, confirmationId: running.confirmationId, requestHash: running.requestHash, now: now + 3 }, db as any);
    await expect(cancelAssistantConfirmation({ actor, confirmationId: running.confirmationId, requestHash: running.requestHash, now: now + 4 }, db as any)).rejects.toThrow('already executing');
  });

  it('rechecks a stored class share at claim time and cleans expired pending payloads', async () => {
    const db = makeDb();
    db.seed('classes', 'class-1', { teacherId: 'teacher-owner' });
    db.seed('assistantShares', 'share-1', { resourceType: 'class', resourceId: 'class-1', ownerUid: 'teacher-owner', granteeUid: actor.firebaseUid, role: 'write', status: 'active', createdAt: now - 100 });
    const created = await createAssistantConfirmation({ actor, requestId: 'request-share', toolName: 'createAssignment', payload: { title: 'Bài' }, preview: 'Tạo bài', resourceIds: ['class-1'], resourceScopes: [{ resourceType: 'class', resourceId: 'class-1', ownerUid: 'teacher-owner', requiredRole: 'write' }], now }, db as any);
    db.patch('assistantShares/share-1', { status: 'revoked', revokedAt: now + 1 });
    await expect(claimAssistantConfirmation({ actor, confirmationId: created.confirmationId, requestHash: created.requestHash, now: now + 1 }, db as any)).rejects.toThrow('Share grant');

    const pendingDb = makeDb();
    const pending = await prepare(pendingDb, 'request-cleanup');
    const cleanup = await expirePendingAssistantConfirmations(now + 5 * 60 * 1000 + 1, pendingDb as any);
    expect(cleanup).toMatchObject({ expired: 1, outcomeUnknown: 0 });
    expect(pendingDb.read(`assistantConfirmations/${pending.confirmationId}`)).toMatchObject({ status: 'expired' });
    expect(pendingDb.read(`assistantConfirmations/${pending.confirmationId}`)).not.toHaveProperty('payload');
  });

  it('derives write scope role from the tool instead of trusting a read role from the adapter', async () => {
    const db = makeDb();
    db.patch(`channelLinks/${actor.linkId}`, { firebaseUid: actor.firebaseUid });
    db.patch('classes/class-1', { teacherId: 'owner' });
    db.seed('assistantShares', 'share-read', { resourceType: 'class', resourceId: 'class-1', ownerUid: 'owner', granteeUid: actor.firebaseUid, role: 'read', status: 'active', createdAt: now - 1 });
    await expect(createAssistantConfirmation({ actor, requestId: 'request-role', toolName: 'createAssignment', payload: { classId: 'class-1', title: 'Bài' }, preview: 'Tạo bài', resourceIds: ['class-1'], resourceScopes: [{ resourceType: 'class', resourceId: 'class-1', requiredRole: 'read' }], now }, db as any)).rejects.toThrow('Share grant');
  });

  it('rejects PII-shaped payload fields and unscoped write preparation', async () => {
    const db = makeDb();
    expect(() => normalizeAssistantConfirmationPayload({ studentSubmission: 'full answer' })).toThrow('Sensitive confirmation payload');
    expect(() => normalizeAssistantConfirmationPayload({ title: 'Mã PIN 1234' })).toThrow('Sensitive confirmation payload');
    await expect(createAssistantConfirmation({ actor, requestId: 'request-preview-pii', toolName: 'createAssignment', payload: { title: 'Bài' }, preview: 'Gửi mã PIN 1234', resourceIds: ['class-1'], resourceScopes: [{ resourceType: 'class', resourceId: 'class-1' }], now }, db as any)).rejects.toThrow('Sensitive confirmation preview');
    await expect(createAssistantConfirmation({ actor, requestId: 'request-no-scope', toolName: 'createAssignment', payload: { title: 'Bài' }, preview: 'Tạo bài', resourceIds: ['class-1'], now }, db as any)).rejects.toThrow('resource scope');
  });
});
