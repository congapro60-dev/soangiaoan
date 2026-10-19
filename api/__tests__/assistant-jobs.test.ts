import { describe, expect, it } from 'vitest';
import { cancelAssistantJob, createAssistantJob, failAssistantJob, getAssistantJobStatus, jobIdForRequest, startAssistantJob, completeAssistantJob } from '../_assistant-jobs.js';

const actor = { firebaseUid: 'teacher-1', channel: 'telegram' as const, channelAccountId: 'bot', channelUserId: '123', channelChatId: '123', linkId: 'link', active: true as const };

class Db {
  rows = new Map<string, Record<string, unknown>>();
  collection(name: string) { return new Collection(this, name); }
  runTransaction<T>(fn: (tx: Tx) => Promise<T>) { return fn(new Tx(this)); }
  read(path: string) { const row = this.rows.get(path); return row ? { ...row } : undefined; }
  write(path: string, row: Record<string, unknown>) { this.rows.set(path, { ...row }); }
  update(path: string, patch: Record<string, unknown>) { this.rows.set(path, { ...(this.rows.get(path) || {}), ...patch }); }
}
class Ref { constructor(private db: Db, readonly collection: string, readonly id: string) {} get() { const row = this.db.read(`${this.collection}/${this.id}`); return Promise.resolve({ exists: Boolean(row), id: this.id, data: () => row, ref: this }); } }
class Collection { constructor(private db: Db, private name: string) {} doc(id: string) { return new Ref(this.db, this.name, id); } }
class Tx { constructor(private db: Db) {} get(ref: Ref) { return ref.get(); } create(ref: Ref, row: Record<string, unknown>) { if (this.db.read(`${ref.collection}/${ref.id}`)) throw new Error('already exists'); this.db.write(`${ref.collection}/${ref.id}`, row); } update(ref: Ref, patch: Record<string, unknown>) { this.db.update(`${ref.collection}/${ref.id}`, patch); } }

describe('assistant jobs', () => {
  it('creates one idempotent job for a request and exposes only the linked actor', async () => {
    const db = new Db();
    const requestHash = 'a'.repeat(64);
    const first = await createAssistantJob({ actor, toolName: 'exportLesson', requestHash, confirmationId: 'confirm-1', now: 1000 }, db as any);
    const replay = await createAssistantJob({ actor, toolName: 'exportLesson', requestHash, confirmationId: 'confirm-1', now: 1001 }, db as any);
    expect(replay).toMatchObject({ jobId: first.jobId, status: 'queued', retryCount: 0 });
    await expect(getAssistantJobStatus({ actor: { ...actor, channelUserId: '999' }, jobId: first.jobId }, db as any)).rejects.toThrow('Job not found');
    await expect(getAssistantJobStatus({ actor: { ...actor, linkId: 'revoked-link' }, jobId: first.jobId }, db as any)).rejects.toThrow('Job not found');
    expect(jobIdForRequest(actor, 'exportLesson', requestHash)).toBe(first.jobId);
  });

  it('enforces transitions, progress bounds, retry limit, and terminal idempotency', async () => {
    const db = new Db();
    const requestHash = 'b'.repeat(64);
    const job = await createAssistantJob({ actor, toolName: 'startAssignmentGrading', requestHash, confirmationId: 'confirm-2', maxRetries: 1, now: 1000 }, db as any);
    expect((await startAssistantJob({ actor, jobId: job.jobId, progress: 20, now: 1001 }, db as any)).status).toBe('running');
    expect((await failAssistantJob({ actor, jobId: job.jobId, error: new Error('provider timeout'), now: 1002 }, db as any)).status).toBe('failed');
    expect((await startAssistantJob({ actor, jobId: job.jobId, progress: 40, now: 1003 }, db as any)).retryCount).toBe(1);
    expect((await completeAssistantJob({ actor, jobId: job.jobId, now: 1004 }, db as any)).status).toBe('succeeded');
    expect((await completeAssistantJob({ actor, jobId: job.jobId, now: 1005 }, db as any)).status).toBe('succeeded');
    await expect(cancelAssistantJob({ actor, jobId: job.jobId, now: 1006 }, db as any)).rejects.toThrow('Invalid assistant job transition');
    const retryJob = await createAssistantJob({ actor, toolName: 'startAssignmentGrading', requestHash: 'c'.repeat(64), confirmationId: 'confirm-3', maxRetries: 1, now: 1000 }, db as any);
    await startAssistantJob({ actor, jobId: retryJob.jobId, now: 1001 }, db as any);
    await failAssistantJob({ actor, jobId: retryJob.jobId, error: 'first', now: 1002 }, db as any);
    await startAssistantJob({ actor, jobId: retryJob.jobId, now: 1003 }, db as any);
    await failAssistantJob({ actor, jobId: retryJob.jobId, error: 'second', now: 1004 }, db as any);
    await expect(startAssistantJob({ actor, jobId: retryJob.jobId, now: 1005 }, db as any)).rejects.toThrow('Invalid assistant job transition');
    await expect(startAssistantJob({ actor, jobId: job.jobId, progress: 101, now: 1007 }, db as any)).rejects.toThrow('Invalid assistant job update');
  });

  it('fails closed for private result references and empty chat identities', async () => {
    const db = new Db();
    const base = {
      actorUid: 'teacher-1', linkId: 'link', channel: 'telegram', channelAccountId: 'bot', channelUserId: '123',
      toolName: 'exportLesson', requestHash: 'd'.repeat(64), status: 'succeeded', progress: 100, retryCount: 0, maxRetries: 2,
      createdAt: 1000, updatedAt: 1001,
    };
    db.write('assistantJobs/private-ref', { ...base, resultRef: 'https://storage.example/file?token=secret' });
    await expect(getAssistantJobStatus({ actor, jobId: 'private-ref' }, db as any)).rejects.toThrow('Job not found');

    db.write('assistantJobs/empty-chat', { ...base, channel: 'zalo_oa', channelAccountId: 'oa-1', channelUserId: 'uid-1', channelChatId: '' });
    await expect(getAssistantJobStatus({ actor: { ...actor, channel: 'zalo_oa', channelAccountId: 'oa-1', channelUserId: 'uid-1', channelChatId: undefined }, jobId: 'empty-chat' }, db as any)).rejects.toThrow('Job not found');
  });
});
