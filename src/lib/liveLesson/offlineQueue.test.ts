import { describe, expect, it, vi } from 'vitest';
import type { SubmitLiveResponseInput } from './types';
import {
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
    expect(result.failed).toMatchObject({ stepId: 'warmup' });
    expect(result.synced).toBe(0);
    expect(getQueuedLiveResponses('session-1', 'student-1', store)).toHaveLength(2);
  });

  it('rejects malformed payloads before storage and never stores a PIN', () => {
    const store = storage();
    expect(() => enqueueLiveResponse(input({ responseType: 'route', value: 'X' as never }), store)).toThrow(/route/i);
    expect(() => enqueueLiveResponse(input({ value: { pin: '1234' } as never }), store)).toThrow(/primitive/i);
    expect(() => enqueueLiveResponse(input({ clientNonce: '' }), store)).toThrow(/nonce/i);
    expect(JSON.stringify(store)).not.toContain('1234');
    expect(() => validateLiveResponsePayload(input({ responseType: 'boolean', value: 'yes' } as never))).toThrow(/boolean/i);
  });
});
