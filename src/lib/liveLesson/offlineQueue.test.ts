import { describe, expect, it, vi } from 'vitest';
import type { SubmitLiveResponseInput } from './types';
import {
  classifyLiveResponseError,
  enqueueLiveResponse,
  flushLiveResponseQueue,
  getQueuedLiveResponses,
  validateLiveResponsePayload,
} from './offlineQueue';

const input = (overrides: Partial<SubmitLiveResponseInput> = {}): SubmitLiveResponseInput => ({
  sessionId: 'session-1', participantUid: 'student-1', classId: 'class-1', stepId: 'warmup',
  responseType: 'choice', value: 'A', clientNonce: 'nonce-123456789012345678901234', ...overrides,
});

const storage = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; }, clear: () => values.clear(),
    getItem: key => values.get(key) ?? null, key: index => [...values.keys()][index] ?? null,
    removeItem: key => values.delete(key), setItem: (key, value) => values.set(key, value),
  };
};

describe('live lesson offline response queue', () => {
  it.each(['permission-denied', 'failed-precondition', 'not-found', 'invalid-argument', 'closed', 'expired'])('classifies %s as a permanent blocked failure', code => {
    expect(classifyLiveResponseError({ code })).toBe('blocked');
  });

  it('keeps network failures retryable', () => {
    expect(classifyLiveResponseError({ code: 'unavailable' })).toBe('retryable');
    expect(classifyLiveResponseError(new Error('network down'))).toBe('retryable');
  });

  it('keeps only the latest response for one participant and step', () => {
    const store = storage();
    enqueueLiveResponse(input(), store, 1);
    enqueueLiveResponse(input({ value: 'B', clientNonce: 'nonce-223456789012345678901234' }), store, 2);
    expect(getQueuedLiveResponses('session-1', 'student-1', store)).toHaveLength(1);
    expect(getQueuedLiveResponses('session-1', 'student-1', store)[0]).toMatchObject({ value: 'B', enqueuedAt: 2 });
  });

  it('flushes in order and removes only successful submissions', async () => {
    const store = storage();
    enqueueLiveResponse(input({ stepId: 'warmup' }), store, 1);
    enqueueLiveResponse(input({ stepId: 'goals', clientNonce: 'nonce-223456789012345678901234' }), store, 2);
    const submitted: string[] = [];
    const result = await flushLiveResponseQueue(async response => { submitted.push(response.stepId); }, 'session-1', 'student-1', store);
    expect(result).toEqual({ attempted: 2, synced: 2, failed: null });
    expect(submitted).toEqual(['warmup', 'goals']);
    expect(getQueuedLiveResponses('session-1', 'student-1', store)).toEqual([]);
  });

  it('retains the failed item and later items for a visible retry', async () => {
    const store = storage();
    enqueueLiveResponse(input({ stepId: 'warmup' }), store, 1);
    enqueueLiveResponse(input({ stepId: 'goals', clientNonce: 'nonce-223456789012345678901234' }), store, 2);
    const result = await flushLiveResponseQueue(vi.fn().mockRejectedValue(new Error('network down')), 'session-1', 'student-1', store);
    expect(result.failed).toMatchObject({ kind: 'retryable', message: 'network down', item: { stepId: 'warmup' } });
    expect(result.synced).toBe(0);
    expect(getQueuedLiveResponses('session-1', 'student-1', store)).toHaveLength(2);
  });

  it('blocks permanent failures, does not retry blocked items, and allows a new answer to unblock the step', async () => {
    const store = storage();
    const first = enqueueLiveResponse(input(), store, 1);
    const submit = vi.fn().mockRejectedValue(Object.assign(new Error('permission-denied'), { code: 'permission-denied' }));

    const failed = await flushLiveResponseQueue(submit, 'session-1', 'student-1', store);
    expect(failed.failed).toMatchObject({ kind: 'blocked', item: { stepId: 'warmup', deliveryState: 'blocked' } });
    expect(getQueuedLiveResponses('session-1', 'student-1', store)[0]).toMatchObject({ deliveryState: 'blocked', lastError: 'permission-denied' });

    await flushLiveResponseQueue(submit, 'session-1', 'student-1', store);
    expect(submit).toHaveBeenCalledOnce();

    const replacement = enqueueLiveResponse(input({ value: 'B', clientNonce: 'new-client-nonce' }), store, 2);
    expect(replacement).toMatchObject({ value: 'B', clientNonce: first.clientNonce, deliveryState: 'pending' });
  });

  it('keeps one stable nonce after sync and collapses hint tiers to the latest response for the step', async () => {
    const store = storage();
    const first = enqueueLiveResponse(input({ responseType: 'hint', value: 1 }), store, 1);
    await expect(flushLiveResponseQueue(vi.fn().mockResolvedValue(undefined), 'session-1', 'student-1', store)).resolves.toMatchObject({ synced: 1 });
    const latest = enqueueLiveResponse(input({ responseType: 'hint', value: 2, clientNonce: 'another-nonce' }), store, 2);

    expect(latest.clientNonce).toBe(first.clientNonce);
    expect(getQueuedLiveResponses('session-1', 'student-1', store)).toEqual([expect.objectContaining({ value: 2, stepId: 'warmup' })]);
  });

  it('rejects malformed payloads before storage and never stores a PIN', () => {
    const store = storage();
    expect(() => enqueueLiveResponse(input({ responseType: 'route', value: 'X' as never }), store)).toThrow(/route/i);
    expect(() => enqueueLiveResponse(input({ value: { pin: '1234' } as never }), store)).toThrow(/primitive/i);
    expect(() => enqueueLiveResponse(input({ clientNonce: '' }), store)).toThrow(/nonce/i);
    expect(JSON.stringify(store)).not.toContain('1234');
    expect(() => validateLiveResponsePayload(input({ responseType: 'boolean', value: 'yes' } as never))).toThrow(/boolean/i);
  });

  it('applies exponential backoff on retryable failures and skips items before retryAfter', async () => {
    const store = storage();
    const now = 1000;
    enqueueLiveResponse(input(), store, now);
    const submit = vi.fn().mockRejectedValue(new Error('network down'));

    // First attempt → fails with retryable
    const first = await flushLiveResponseQueue(submit, 'session-1', 'student-1', store, now);
    expect(first.failed).toMatchObject({ kind: 'retryable' });
    expect(first.failed?.item.retryCount).toBe(1);
    expect(first.failed?.item.retryAfter).toBe(1000); // 1s backoff
    expect(first.failed?.item.deliveryState).toBe('failed');

    // Immediate retry should skip the item (backoff not elapsed)
    const skipped = await flushLiveResponseQueue(submit, 'session-1', 'student-1', store, now + 500);
    expect(skipped.attempted).toBe(0);
    expect(skipped.synced).toBe(0);

    // After backoff elapses, retry should succeed
    const retried = await flushLiveResponseQueue(vi.fn().mockResolvedValue(undefined), 'session-1', 'student-1', store, now + 1100);
    expect(retried.synced).toBe(1);
    expect(retried.failed).toBeNull();
  });

  it('blocks permanently after max retries (5)', async () => {
    const store = storage();
    const now = 1000;
    enqueueLiveResponse(input(), store, now);
    const submit = vi.fn().mockRejectedValue(new Error('network down'));

    // Fail 5 times; each time advance `now` past the backoff window
    // backoff: 1s, 2s, 4s, 8s, 16s → need to advance now by cumulative backoff
    let result = await flushLiveResponseQueue(submit, 'session-1', 'student-1', store, now);
    let elapsed = 0;
    for (let i = 1; i < 5; i++) {
      elapsed += 1000 * Math.pow(2, i - 1) + 100; // advance past each backoff + buffer
      result = await flushLiveResponseQueue(submit, 'session-1', 'student-1', store, now + elapsed);
    }
    // After 5th failure, should be blocked (permanent)
    expect(result.failed?.item.deliveryState).toBe('blocked');
    expect(result.failed?.item.retryCount).toBe(5);

    // Subsequent flush should not attempt this item
    const final = await flushLiveResponseQueue(submit, 'session-1', 'student-1', store, now + 100000);
    expect(final.attempted).toBe(0);
  });

  it('preserves nonce across re-enqueue after failed state', async () => {
    const store = storage();
    const first = enqueueLiveResponse(input(), store, 1);
    const submit = vi.fn().mockRejectedValue(new Error('network down'));
    await flushLiveResponseQueue(submit, 'session-1', 'student-1', store, 1);

    const replacement = enqueueLiveResponse(input({ value: 'B', clientNonce: 'new-nonce' }), store, 2);
    expect(replacement.clientNonce).toBe(first.clientNonce);
    expect(replacement.deliveryState).toBe('pending');
  });
});
