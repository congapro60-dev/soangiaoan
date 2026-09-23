import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ added: [] as Array<Record<string, unknown>>, fail: false }));

vi.mock('../_exam-core.js', () => ({
  getAdminDb: () => ({
    collection: (name: string) => ({
      add: async (doc: Record<string, unknown>) => {
        if (h.fail) throw new Error('firestore down');
        h.added.push({ __col: name, ...doc });
      },
    }),
  }),
}));

import {
  buildAiUsageRecord,
  createAiUsageContext,
  geminiUsageCounts,
  openAiUsageCounts,
  recordAiUsage,
  refsFromBody,
  runWithAiUsage,
} from '../_ai-usage';

describe('đếm token', () => {
  beforeEach(() => { h.added = []; h.fail = false; });

  it('đọc usageMetadata của Gemini, tách token suy nghĩ và cache', () => {
    expect(geminiUsageCounts({
      promptTokenCount: 1200, candidatesTokenCount: 300, thoughtsTokenCount: 500, cachedContentTokenCount: 200, totalTokenCount: 2000,
    })).toEqual({ inputTokens: 1200, outputTokens: 300, thoughtsTokens: 500, cachedTokens: 200, totalTokens: 2000 });
    expect(geminiUsageCounts(undefined)).toBeNull();
    expect(geminiUsageCounts({})).toBeNull();
  });

  it('usage kiểu OpenAI: tách reasoning khỏi completion để không đếm hai lần', () => {
    expect(openAiUsageCounts({
      prompt_tokens: 100, completion_tokens: 80, total_tokens: 180,
      completion_tokens_details: { reasoning_tokens: 30 }, prompt_tokens_details: { cached_tokens: 10 },
    })).toEqual({ inputTokens: 100, outputTokens: 50, thoughtsTokens: 30, cachedTokens: 10, totalTokens: 180 });
  });

  it('bản ghi gom theo ngày/tháng GIỜ VIỆT NAM (thu tiền đúng tháng)', () => {
    const record = buildAiUsageRecord(
      { feature: 'gradeOne', refs: { submissionId: 's1' } },
      { uid: 'u1', email: 'a@b.c', anonymous: false },
      'gemini', 'gemini-x', { inputTokens: 1, outputTokens: 2, thoughtsTokens: 0, cachedTokens: 0, totalTokens: 3 },
      {}, new Date('2026-09-30T18:30:00Z'), // 01:30 sáng 1/10 giờ VN
    );
    expect(record).toMatchObject({ day: '2026-10-01', month: '2026-10', uid: 'u1', feature: 'gradeOne', refs: { submissionId: 's1' } });
  });

  it('ghi kèm người gọi của ngữ cảnh; token chỉ giải mã khi có lượt cần ghi, và chỉ một lần', async () => {
    const resolve = vi.fn(async () => ({ uid: 'gv-1', email: 'gv@x.vn', anonymous: false }));
    const ctx = createAiUsageContext('tok', 'gradeAssignment', { classId: 'lop-1', junk: 5 }, resolve);
    expect(resolve).not.toHaveBeenCalled();
    const counts = { inputTokens: 10, outputTokens: 5, thoughtsTokens: 0, cachedTokens: 0, totalTokens: 15 };
    await runWithAiUsage(ctx, async () => {
      await recordAiUsage('gemini', 'm', counts);
      await Promise.resolve().then(() => recordAiUsage('gemini', 'm', counts)); // lượt chạy nền vẫn đúng ngữ cảnh
    });
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(h.added).toHaveLength(2);
    expect(h.added[1]).toMatchObject({ __col: 'aiUsage', uid: 'gv-1', email: 'gv@x.vn', refs: { classId: 'lop-1' } });
  });

  it('không có số token thì không ghi; Firestore hỏng thì KHÔNG ném lỗi ra lượt chấm', async () => {
    await recordAiUsage('gemini', 'm', null);
    expect(h.added).toHaveLength(0);
    h.fail = true;
    await expect(recordAiUsage('gemini', 'm', { inputTokens: 1, outputTokens: 1, thoughtsTokens: 0, cachedTokens: 0, totalTokens: 2 }))
      .resolves.toBeUndefined();
  });

  it('chỉ lấy các mã tham chiếu hợp lệ trong body', () => {
    expect(refsFromBody({ classId: ' lop ', submissionId: '', idToken: 'bí mật', assignmentId: 7 })).toEqual({ classId: 'lop' });
  });
});
