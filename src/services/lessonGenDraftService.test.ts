import { beforeEach, expect, it, vi } from 'vitest';
import { serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { saveLessonGenDraft, updateLessonGenDraft, type StoredLessonGenDraft } from './lessonGenDraftService';

vi.mock('firebase/firestore', async importOriginal => ({
  ...await importOriginal<typeof import('firebase/firestore')>(),
  setDoc: vi.fn(), updateDoc: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

it('preserves Firestore timestamp sentinels when saving a source draft', async () => {
  const draft: Omit<StoredLessonGenDraft, 'createdAt' | 'updatedAt'> = {
    id: 'qa-draft', ownerUid: 'qa-owner', sourceHash: 'hash', revision: 1, status: 'imported',
    sourceBundle: { sourceHash: 'hash', sources: [] }, verificationRecords: [],
    originalStoragePath: undefined,
  };
  await saveLessonGenDraft(draft);
  const data = vi.mocked(setDoc).mock.calls[0][1] as Record<string, unknown>;
  expect(data.createdAt).toBeInstanceOf(serverTimestamp().constructor);
  expect(data.updatedAt).toBeInstanceOf(serverTimestamp().constructor);
  expect(data).not.toHaveProperty('originalStoragePath');
});

it('preserves the timestamp and invalidates authored artifacts on source updates', async () => {
  await updateLessonGenDraft('qa-draft', { sourceApproval: null, planDraft: undefined });
  const data = vi.mocked(updateDoc).mock.calls[0][1] as unknown as Record<string, unknown>;
  expect(data.updatedAt).toBeInstanceOf(serverTimestamp().constructor);
  expect(data).toMatchObject({ sourceApproval: null, v871ExperiencePlanDraft: null, v871PackageSummary: null });
  expect(data).not.toHaveProperty('planDraft');
});
