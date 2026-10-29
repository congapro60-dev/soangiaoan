import { describe, expect, it, vi } from 'vitest';

// Service import cần firebase — mock trước khi import module thuần cần test.
const state = vi.hoisted(() => ({ calls: [] as unknown[] }));
vi.mock('../../lib/firebase', () => ({
  auth: { currentUser: { uid: 'anon', getIdToken: async () => 'tok' } },
  db: {},
}));
vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => { state.calls.push(['collection', ...args]); return { type: 'collection', args }; },
  doc: (...args: unknown[]) => { state.calls.push(['doc', ...args]); return { type: 'doc', args }; },
  getDoc: async () => ({ exists: () => false, data: () => null }),
  getFirestore: () => ({}),
  initializeFirestore: () => ({}),
  onSnapshot: () => () => {},
  query: (...args: unknown[]) => args,
  serverTimestamp: () => ({ toMillis: () => 0 }),
  setDoc: async (...args: unknown[]) => { state.calls.push(['setDoc', ...args]); },
  where: (...args: unknown[]) => args,
}));

import {
  buildQuestionNonce, pulseCuesFor, pulseDocId, sanitizeQuestionBody,
  PULSE_CUE_IDS_BY_KEY,
} from './liveQuestionService';

describe('COMM-AQ-01 — phần thuần của liveQuestionService', () => {
  it('sanitizeQuestionBody: gọn khoảng trắng, cắt 500 ký tự', () => {
    expect(sanitizeQuestionBody('  xin  chào   lớp  ')).toBe('xin chào lớp');
    expect(sanitizeQuestionBody('x'.repeat(600)).length).toBe(500);
  });

  it('buildQuestionNonce: đủ dài, không trùng lặp cục bộ, không chứa định danh', () => {
    const a = buildQuestionNonce();
    const b = buildQuestionNonce();
    expect(a).toMatch(/^[0-9a-f]{24}$/);
    expect(a).not.toBe(b);
    expect(a).not.toContain('anon');
  });

  it('pulseDocId: đúng format uid__cueId (khớp rules pulseId)', () => {
    expect(pulseDocId('u1', 'P20')).toBe('u1__P20');
    expect(pulseDocId('u1', 'P20')).not.toContain('/');
  });

  it('pulseCuesFor: bài khai báo trả chặng, bài lạ trả rỗng', () => {
    expect(pulseCuesFor('11-11-76')).toEqual(['P20', 'P27']);
    expect(pulseCuesFor('99-99-99')).toEqual([]);
    expect(pulseCuesFor(null)).toEqual([]);
  });

  it('PULSE_CUE_IDS_BY_KEY: chỉ dùng chặng có thật trong TIMELINE chung (P0–P40)', () => {
    for (const cues of Object.values(PULSE_CUE_IDS_BY_KEY)) {
      for (const cue of cues) expect(cue).toMatch(/^P\d{2}$/);
    }
  });

  it('setDoc pulse: doc id là uid__cueId — dữ liệu cá nhân không lẫn vào câu hỏi ẩn danh', async () => {
    state.calls.length = 0;
    const { submitPulse } = await import('./liveQuestionService');
    await submitPulse('session-1', 'u1', 'class-1', 'P20', 'need_example');
    const setCall = state.calls.find((c) => c[0] === 'setDoc') as unknown[] | undefined;
    expect(setCall).toBeDefined();
    const docArg = setCall![1] as { args: unknown[] };
    expect(docArg.args[docArg.args.length - 1]).toBe('u1__P20');
  });
});
