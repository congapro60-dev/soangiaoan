import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSourceBundle } from '../lib/lessonGen/sourceIngestion';
import { buildSourceVerificationRecords } from '../lib/lessonGen/sourceVerification';
import { buildSourceModel } from '../lib/lessonCompiler/v832/sourceModel';
import { createV871AuthoringFixture } from '../lib/lessonCompiler/v832/lessonIR.testFixture';
import { decodePrivateJson, decodePrivateLessonIR } from '../lib/lessonCompiler/v832/privateJsonCodec';
import type { StoredLessonGenDraft } from './lessonGenDraftService';

type TestUser = { uid: string; isAnonymous: boolean; getIdToken?: () => Promise<string> };
const state = vi.hoisted(() => ({
  user: { uid: 'teacher-a', isAnonymous: false } as TestUser | null,
  listeners: new Set<(user: TestUser | null) => void>(),
  docs: new Map<string, { data: Record<string, unknown>; version: number }>(),
  writes: [] as Array<{ ref: string; data: Record<string, unknown> }>,
  attempts: 0,
  afterCommit: null as null | (() => void),
  readBarrier: null as null | (() => Promise<void>),
  beforeTransaction: null as null | (() => Promise<void>),
  sourceListener: null as null | ((snapshot: unknown) => void),
}));
vi.mock('../lib/firebase', () => ({ auth: { get currentUser() { return state.user; } }, db: {}, storage: {},
  removeUndefinedFields: (value: unknown) => value }));
vi.mock('firebase/auth', () => ({ onAuthStateChanged: (_auth: unknown, listener: (user: TestUser | null) => void) => {
  state.listeners.add(listener); listener(state.user); return () => { state.listeners.delete(listener); };
} }));
vi.mock('firebase/firestore', () => {
  const snapshot = (ref: string) => {
    const data = state.docs.get(ref)?.data;
    const copy = data && structuredClone(data);
    return { id: ref.split('/').at(-1), exists: () => !!copy, data: () => copy };
  };
  return {
    collection: vi.fn(), limit: vi.fn(), query: vi.fn(), where: vi.fn(),
    onSnapshot: (_ref: string, _options: unknown, listener: (snapshot: unknown) => void) => {
      state.sourceListener = listener; return () => { state.sourceListener = null; };
    },
    doc: (_db: unknown, ...parts: string[]) => parts.join('/'), serverTimestamp: () => 'SERVER_TIMESTAMP',
    getDoc: async (ref: string) => snapshot(ref), getDocFromServer: async (ref: string) => snapshot(ref),
    setDoc: vi.fn(), updateDoc: async (ref: string, patch: Record<string, unknown>) => {
      const current = state.docs.get(ref)!;
      const data = { ...current.data, ...structuredClone(patch) };
      state.docs.set(ref, { data, version: current.version + 1 }); state.writes.push({ ref, data });
    },
    runTransaction: async (_db: unknown, callback: (tx: unknown) => Promise<unknown>) => {
      const before = state.beforeTransaction; state.beforeTransaction = null; await before?.();
      for (let attempt = 0; attempt < 3; attempt++) {
        state.attempts++;
        const reads = new Map<string, number>();
        const pending: Array<{ ref: string; data: Record<string, unknown> }> = [];
        const result = await callback({
          get: async (ref: string) => {
            reads.set(ref, state.docs.get(ref)?.version ?? 0); const result = snapshot(ref);
            if (ref.endsWith('lesson-gen-aaaaaaaaaaaaaaaaaaaa')) await state.readBarrier?.();
            return result;
          },
          set: (ref: string, data: Record<string, unknown>) => { pending.push({ ref, data: structuredClone(data) }); },
          update: (ref: string, data: Record<string, unknown>) => {
            pending.push({ ref, data: { ...structuredClone(state.docs.get(ref)?.data), ...structuredClone(data) } });
          },
        });
        if ([...reads].some(([ref, version]) => (state.docs.get(ref)?.version ?? 0) !== version)) continue;
        for (const write of pending) {
          state.docs.set(write.ref, { data: write.data, version: (state.docs.get(write.ref)?.version ?? 0) + 1 });
          state.writes.push(write);
        }
        state.afterCommit?.();
        return result;
      }
      throw new Error('Synthetic transaction retry limit');
    },
  };
});

import { authorV871SourceDraft, readV871SourceAuthoringPlan, computeSourceSnapshotFingerprint,
  readOrGenerateV871OwnerPackage, persistV871PackageSummary } from './v832StudioService';
import { subscribeV871SourceInvalidation } from './v832StudioService';
import { prepareV871StudioPreview } from './v832StudioService';
import { computeLessonContentHash } from '../lib/lessonReview/v832/repairLifecycle';
import { updateLessonGenDraft } from './lessonGenDraftService';

const sourceId = 'lesson-gen-aaaaaaaaaaaaaaaaaaaa';
const sourceRef = `lessonGenDrafts/${sourceId}`;
const source = () => state.docs.get(sourceRef)!.data as unknown as StoredLessonGenDraft;
const changeSource = (patch: Record<string, unknown>) => {
  const existing = state.docs.get(sourceRef)!;
  state.docs.set(sourceRef, { data: { ...existing.data, ...patch }, version: existing.version + 1 });
};
const changeUser = (user: TestUser | null) => { state.user = user; state.listeners.forEach(listener => listener(user)); };

beforeEach(() => {
  state.user = { uid: 'teacher-a', isAnonymous: false }; state.listeners.clear();
  state.docs.clear(); state.writes = []; state.attempts = 0; state.afterCommit = null; state.readBarrier = null;
  state.beforeTransaction = null;
  state.sourceListener = null;
});

const prepare = async (reviewOnly = false) => {
  const bundle = await createSourceBundle({ id: 'source', name: 'lesson.txt', mimeType: 'text/plain',
    role: 'teacher_lesson', durationMinutes: 40, content: 'Học sinh giải thích lập luận và kiểm tra cách giải của mình.' });
  const reviews = buildSourceVerificationRecords(bundle);
  const value: StoredLessonGenDraft = { id: sourceId, ownerUid: 'teacher-a', revision: 1, status: 'imported',
    sourceHash: bundle.sourceHash, sourceBundle: bundle, verificationRecords: reviews,
    sourceApproval: { sourceId: 'source', sourceHash: bundle.sourceHash, durationMinutes: 40,
      reviewerUid: 'teacher-a', approvedAt: '2026-10-15T00:00:00.000Z' } };
  state.docs.set(sourceRef, { data: value as unknown as Record<string, unknown>, version: 1 });
  const fixture = createV871AuthoringFixture(buildSourceModel(bundle, reviews), 40);
  if (reviewOnly) fixture.plan.experience.archetype = { ...fixture.plan.experience.archetype,
    v871: 'SEMINAR_DISCUSSION', canonicalBase: null, decision: 'REVIEW_REQUIRED' };
  let calls = 0;
  const invoke = vi.fn(async () => JSON.stringify(++calls === 1 ? fixture.plan : fixture.lesson));
  const input = { sourceDraftId: sourceId, expectedSourceRevision: 1,
    expectedSourceSnapshotFingerprint: await computeSourceSnapshotFingerprint(value), expectedAuthoringRevision: 0, invoke };
  return { input, fixture };
};

describe('V8.8.1 durable source authoring', () => {
  it('sends only persisted identities and concurrency fields to trusted preview', async () => {
    const { input } = await prepare(); const saved=await authorV871SourceDraft(input);
    if(saved.status!=='DRAFT_CREATED')throw new Error('mapped fixture required');
    state.user!.getIdToken=async()=> 'synthetic-token';
    const fetcher=vi.fn(async()=>({ok:true,json:async()=>({manifest:{packageId:'preview'},irRevision:2,contentHash:'h'})}));
    vi.stubGlobal('fetch',fetcher);
    try {
      const hash=await computeLessonContentHash(saved.lessonIR);
      const result=await prepareV871StudioPreview(sourceId,saved.draftId,1,hash,()=>{});
      expect(result.manifest.packageId).toBe('preview');
      const body=JSON.parse((fetcher.mock.calls[0] as unknown as [string,RequestInit])[1].body as string);
      expect(Object.keys(body).sort()).toEqual(['action','idToken','sourceDraftId','irDraftId','expectedSourceSnapshotFingerprint','expectedAuthoringRevision','expectedIrRevision','expectedContentHash'].sort());
      expect(body).toMatchObject({action:'v871PreparePreview',expectedContentHash:hash,expectedAuthoringRevision:1});
    } finally {vi.unstubAllGlobals();}
  });
  it('does not send preview request if caller invalidates while obtaining token', async () => {
    const { input }=await prepare();const saved=await authorV871SourceDraft(input);
    if(saved.status!=='DRAFT_CREATED')throw new Error('mapped fixture required');
    let current=true;state.user!.getIdToken=async()=>{current=false;return 'synthetic-token';};
    const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
    try {
      await expect(prepareV871StudioPreview(sourceId,saved.draftId,1,await computeLessonContentHash(saved.lessonIR),()=>{if(!current)throw new Error('CALLER_CHANGED');})).rejects.toThrow('CALLER_CHANGED');
      expect(fetcher).not.toHaveBeenCalled();
    } finally {vi.unstubAllGlobals();}
  });
  it('atomically saves mapped IR, encoded plan and resulting pointer fingerprint', async () => {
    const { input, fixture } = await prepare();
    const result = await authorV871SourceDraft(input);
    expect(result.status).toBe('DRAFT_CREATED');
    expect(state.writes).toHaveLength(2);
    const saved = source();
    expect(saved.v871AuthoringRevision).toBe(1);
    expect(saved.v871PackageSummary).toBeNull();
    expect(saved.v832DraftId).toMatch(/^v832-[a-f0-9]{24}$/);
    const wrapper = saved.v871ExperiencePlanDraft!;
    expect(wrapper).toMatchObject({ state: 'MAPPED', authoringRevision: 1, sourceHash: saved.sourceHash,
      sourceSnapshotFingerprint: await computeSourceSnapshotFingerprint(saved), plan: { codec: 'v832-private-json' } });
    expect(decodePrivateJson(wrapper.plan)).toEqual(fixture.plan);
    const storedIR = state.docs.get(`lessonGenDrafts/${saved.v832DraftId}`)!.data;
    expect(decodePrivateLessonIR(storedIR.lessonIR).provenance?.sourceHash).toBe(saved.sourceHash);
    expect(storedIR).toMatchObject({ ownerUid: 'teacher-a', sourceDraftId: sourceId, confirmationAudit: [], semanticAttestations: [] });
    expect((await readV871SourceAuthoringPlan(sourceId))?.plan).toEqual(fixture.plan);
    expect(input.invoke).toHaveBeenCalledTimes(2);
    expect(state.listeners.size).toBe(0);
  });

  it('retains review-only plan while preserving the old IR pointer and clearing cache', async () => {
    const { input, fixture } = await prepare(true);
    changeSource({ v832DraftId: 'v832-' + 'b'.repeat(24), v871PackageSummary: { old: true } });
    input.expectedSourceSnapshotFingerprint = await computeSourceSnapshotFingerprint(source());
    const result = await authorV871SourceDraft(input);
    expect(result.status).toBe('REVIEW_REQUIRED'); expect(result).not.toHaveProperty('lessonIR');
    expect(source().v832DraftId).toBe('v832-' + 'b'.repeat(24));
    expect(source().v871PackageSummary).toBeNull(); expect(state.writes).toHaveLength(1);
    expect(await readV871SourceAuthoringPlan(sourceId)).toMatchObject({ state: 'REVIEW_REQUIRED', authoringRevision: 1, plan: fixture.plan });
    expect(input.invoke).toHaveBeenCalledTimes(1);
  });

  it.each(['revision', 'fingerprint', 'counter', 'owner', 'approval', 'hash'] as const)('rejects invalid entry %s without model calls/writes', async kind => {
    const { input } = await prepare();
    if (kind === 'revision') input.expectedSourceRevision = 2;
    if (kind === 'fingerprint') input.expectedSourceSnapshotFingerprint = '0'.repeat(64);
    if (kind === 'counter') input.expectedAuthoringRevision = 1;
    if (kind === 'owner') changeSource({ ownerUid: 'other' });
    if (kind === 'approval') changeSource({ sourceApproval: null });
    if (kind === 'hash') changeSource({ sourceHash: '0'.repeat(64) });
    await expect(authorV871SourceDraft(input)).rejects.toThrow();
    expect(input.invoke).not.toHaveBeenCalled(); expect(state.writes).toHaveLength(0);
  });

  it.each([-1, 0.5, Number.MAX_SAFE_INTEGER, NaN, null])('rejects invalid or overflowing stored counter %s before generation', async counter => {
    const { input } = await prepare(); changeSource({ v871AuthoringRevision: counter });
    await expect(authorV871SourceDraft(input)).rejects.toThrow();
    expect(input.invoke).not.toHaveBeenCalled(); expect(state.writes).toHaveLength(0);
  });

  it.each(['source', 'logout', 'sameUID', 'authABA'] as const)('rejects %s changed during generation without writes', async kind => {
    const { input } = await prepare(true);
    const original = input.invoke;
    input.invoke = vi.fn(async () => {
      if (kind === 'source') changeSource({ revision: 2 });
      if (kind === 'logout') changeUser(null);
      if (kind === 'sameUID') changeUser({ uid: 'teacher-a', isAnonymous: false });
      if (kind === 'authABA') { const user = state.user; changeUser({ uid: 'teacher-b', isAnonymous: false }); changeUser(user); }
      return original();
    });
    await expect(authorV871SourceDraft(input)).rejects.toThrow();
    expect(state.writes).toHaveLength(0); expect(state.listeners.size).toBe(0);
  });

  it.each([false, true])('serializes competing saves with staged retry, reviewOnly=%s', async reviewOnly => {
    const { input, fixture } = await prepare(reviewOnly);
    let release!: () => void;
    const bothRead = new Promise<void>(resolve => { release = resolve; });
    let readCount = 0;
    state.readBarrier = async () => { if (++readCount === 2) release(); await bothRead; };
    const secondPlan = structuredClone(fixture.plan);
    secondPlan.experience.archetype = { ...secondPlan.experience.archetype,
      v871: 'SEMINAR_DISCUSSION', canonicalBase: null, decision: 'REVIEW_REQUIRED' };
    const outcomes = await Promise.allSettled([authorV871SourceDraft(input),
      authorV871SourceDraft({ ...input, invoke: async () => JSON.stringify(secondPlan) })]);
    expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect(source().v871AuthoringRevision).toBe(1);
    expect(state.writes.filter(write => write.ref === sourceRef)).toHaveLength(1);
    expect(state.docs.size).toBe(source().v871ExperiencePlanDraft?.state === 'MAPPED' ? 2 : 1);
    expect(state.attempts).toBeGreaterThanOrEqual(3);
  });

  it('rejects whole-source overflow before staging either write', async () => {
    const { input } = await prepare(); changeSource({ padding: 'x'.repeat(795_000) });
    await expect(authorV871SourceDraft(input)).rejects.toThrow(/PRIVATE_DOCUMENT_SIZE/);
    expect(state.writes).toHaveLength(0);
  });

  it('rejects whole encoded IR overflow before staging either write', async () => {
    const { input, fixture } = await prepare();
    fixture.lesson.extensions = { padding: '"'.repeat(210_000) };
    await expect(authorV871SourceDraft(input)).rejects.toThrow(/PRIVATE_DOCUMENT_SIZE/);
    expect(state.writes).toHaveLength(0);
  });

  it('suppresses private return if auth changes after a successful commit', async () => {
    const { input } = await prepare(true);
    state.afterCommit = () => changeUser(null);
    await expect(authorV871SourceDraft(input)).rejects.toThrow();
    expect(state.writes).toHaveLength(1); expect(source().v871AuthoringRevision).toBe(1);
    expect(state.listeners.size).toBe(0);
  });

  it('suppresses superseded private result after commit without undoing committed writes', async () => {
    const { input } = await prepare(true);
    state.afterCommit = () => changeSource({ v871AuthoringRevision: 2 });
    await expect(authorV871SourceDraft(input)).rejects.toThrow(/V871_AUTHORING_REVISION_CONFLICT/);
    expect(state.writes).toHaveLength(1); expect(source().v871AuthoringRevision).toBe(2);
  });

  it('honors caller invalidation while the transaction is pending, with zero writes', async () => {
    const { input } = await prepare(); let current = true;
    const changed = new Error('CALLER_CHANGED');
    state.beforeTransaction = async () => { current = false; };
    await expect(authorV871SourceDraft({ ...input, assertCurrent: () => { if (!current) throw changed; } }))
      .rejects.toBe(changed);
    expect(input.invoke).toHaveBeenCalledTimes(2);
    expect(state.writes).toHaveLength(0);
  });

  it('withdraws source-bound artifacts immediately on newer source event, but ignores summary-only writes', async () => {
    const { input } = await prepare(true); await authorV871SourceDraft(input);
    const invalidate = vi.fn();
    const stop = subscribeV871SourceInvalidation(sourceId, await computeSourceSnapshotFingerprint(source()), 1, invalidate);
    const emit = () => state.sourceListener!({ exists: () => true, data: () => structuredClone(source()),
      metadata: { hasPendingWrites: false, fromCache: false } });
    emit(); await vi.waitFor(() => expect(state.listeners.size).toBe(1));
    changeSource({ v871PackageSummary: { generatedAt: 'new-summary' } }); emit();
    expect(invalidate).not.toHaveBeenCalled();
    changeSource({ v871AuthoringRevision: 2 }); emit();
    expect(invalidate).toHaveBeenCalledTimes(1);
    stop(); expect(state.listeners.size).toBe(0); expect(state.sourceListener).toBeNull();
  });

  it('invalidates plan and package on source edit without resetting authoring revision', async () => {
    const { input } = await prepare(true); await authorV871SourceDraft(input);
    await updateLessonGenDraft(sourceId, { sourceApproval: null });
    expect(source().v871ExperiencePlanDraft).toBeNull(); expect(source().v871PackageSummary).toBeNull();
    expect(source().v871AuthoringRevision).toBe(1);
    expect(await readV871SourceAuthoringPlan(sourceId)).toBeNull();
  });

  it('blocks old package and cache when the latest plan requires review', async () => {
    const { input } = await prepare(true);
    changeSource({ v832DraftId: 'v832-' + 'b'.repeat(24) });
    input.expectedSourceSnapshotFingerprint = await computeSourceSnapshotFingerprint(source());
    await authorV871SourceDraft(input);
    state.writes = [];
    await expect(readOrGenerateV871OwnerPackage(sourceId)).rejects.toThrow('V871_AUTHORING_REVIEW_REQUIRED');
    const fingerprint = await computeSourceSnapshotFingerprint(source());
    const summary = { version: '8.8.1' as const, access: 'OWNER_PRIVATE' as const, releaseStatus: 'NOT_CERTIFIED' as const,
      sourceHash: source().sourceHash, contentHash: 'a'.repeat(64), packageHash: 'b'.repeat(64), artifactCount: 14 as const,
      sourceSnapshotFingerprint: fingerprint, irDraftId: source().v832DraftId!, irRevision: 1, generatedAt: '2026-10-15T00:00:00.000Z' };
    await expect(persistV871PackageSummary(sourceId, fingerprint, 1, summary.contentHash, summary, summary.irDraftId, state.user, 1))
      .rejects.toThrow('V871_AUTHORING_REVIEW_REQUIRED');
    expect(state.writes).toHaveLength(0);
  });

  it('exports a saved mapped plan through the real fourteen-file exporter and caches its revision', async () => {
    const { input } = await prepare(); await authorV871SourceDraft(input);
    state.writes = [];
    const result = await readOrGenerateV871OwnerPackage(sourceId);
    expect(result.package.files).toHaveLength(14);
    expect(source().v871PackageSummary).toEqual(result.summary);
    expect(Object.keys(result.summary)).toHaveLength(11);
    expect(state.writes).toHaveLength(1);
  });

  it('does not let an older export repopulate cache after a new review-only save', async () => {
    const { input, fixture } = await prepare(); await authorV871SourceDraft(input);
    const plan = structuredClone(fixture.plan);
    plan.experience.archetype = { ...plan.experience.archetype, v871: 'SEMINAR_DISCUSSION', canonicalBase: null, decision: 'REVIEW_REQUIRED' };
    state.writes = [];
    state.beforeTransaction = async () => {
      await authorV871SourceDraft({ ...input, expectedAuthoringRevision: 1,
        expectedSourceSnapshotFingerprint: await computeSourceSnapshotFingerprint(source()), invoke: async () => JSON.stringify(plan) });
    };
    await expect(readOrGenerateV871OwnerPackage(sourceId)).rejects.toThrow('V871_AUTHORING_REVIEW_REQUIRED');
    expect(source().v871AuthoringRevision).toBe(2);
    expect(source().v871PackageSummary).toBeNull(); expect(state.writes).toHaveLength(1);
  });

  it('suppresses stale package return after cache commit without undoing the cache write', async () => {
    const { input } = await prepare(); await authorV871SourceDraft(input); state.writes = [];
    state.afterCommit = () => changeSource({ v871AuthoringRevision: 2 });
    await expect(readOrGenerateV871OwnerPackage(sourceId)).rejects.toThrow('V871_PACKAGE_REVISION_CONFLICT');
    expect(state.writes).toHaveLength(1); expect(source().v871PackageSummary).not.toBeNull();
  });

  it('rejects auth A-B-A during package persistence even when the original User object returns', async () => {
    const { input } = await prepare(); await authorV871SourceDraft(input); state.writes = [];
    state.beforeTransaction = async () => { const original = state.user; changeUser({ uid: 'teacher-b', isAnonymous: false }); changeUser(original); };
    await expect(readOrGenerateV871OwnerPackage(sourceId)).rejects.toThrow('Phiên đăng nhập đã thay đổi.');
    expect(state.writes).toHaveLength(0); expect(state.listeners.size).toBe(0);
  });

  it.each(['fingerprint', 'revision', 'state', 'plan'] as const)('rejects stale or invalid persisted %s during reload', async field => {
    const { input } = await prepare(true); await authorV871SourceDraft(input);
    const wrapper = structuredClone(source().v871ExperiencePlanDraft!);
    if (field === 'fingerprint') wrapper.sourceSnapshotFingerprint = '0'.repeat(64);
    if (field === 'revision') wrapper.authoringRevision = 0;
    if (field === 'state') wrapper.state = 'MAPPED';
    if (field === 'plan') wrapper.plan = { codec: 'v832-private-json', version: 1, json: '{}' };
    changeSource({ v871ExperiencePlanDraft: wrapper });
    state.writes = [];
    await expect(readV871SourceAuthoringPlan(sourceId)).rejects.toThrow();
    expect(state.writes).toHaveLength(0);
  });
});
