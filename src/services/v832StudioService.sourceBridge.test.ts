import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSourceBundle } from '../lib/lessonGen/sourceIngestion';
import { buildSourceVerificationRecords } from '../lib/lessonGen/sourceVerification';
import { structuralLessonIR } from '../lib/lessonCompiler/v832/lessonIR.testFixture';
import { decodePrivateLessonIR } from '../lib/lessonCompiler/v832/privateJsonCodec';

const state = vi.hoisted(() => ({ source: null as Record<string, unknown> | null, writes: [] as Array<{ kind: string; value: unknown }> }));
vi.mock('../lib/firebase', () => ({ auth: { currentUser: { uid: 'teacher-a', isAnonymous: false } }, db: {}, storage: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), getDoc: vi.fn(), limit: vi.fn(), onSnapshot: vi.fn(), query: vi.fn(), where: vi.fn(), setDoc: vi.fn(),
  serverTimestamp: () => 'SERVER_TIMESTAMP', doc: (_db: unknown, ...segments: string[]) => segments.join('/'),
  runTransaction: async (_db: unknown, fn: (transaction: unknown) => Promise<unknown>) => fn({
    get: async () => ({ exists: () => state.source !== null, data: () => state.source }),
    set: (_ref: unknown, value: unknown) => state.writes.push({ kind: 'set', value }),
    update: (_ref: unknown, value: unknown) => state.writes.push({ kind: 'update', value }),
  }),
}));
import { saveImportedV832Draft } from './v832StudioService';

const sourceId = 'lesson-gen-aaaaaaaaaaaaaaaaaaaa';

beforeEach(() => { state.source = null; state.writes = []; });
afterEach(() => vi.restoreAllMocks());

const prepare = async (version: 1 | 2 = 2) => {
  const bundle = await createSourceBundle([{ id: 'source', name: 'lesson.txt', mimeType: 'text/plain',
    role: 'teacher_lesson', durationMinutes: 40, content: 'u_n = 2n + 1' },
  { id: 'reference', name: 'reference.txt', mimeType: 'text/plain', role: 'reference', content: 'Additional context.' }]);
  if (version === 1) bundle.sourceHash = createHash('sha256').update(bundle.sources.map(source =>
    `${source.id}\n${source.name}\n${source.mimeType}\n${source.role}\n${source.content}`).join('\n---\n')).digest('hex');
  state.source = { ownerUid: 'teacher-a', sourceHash: bundle.sourceHash, sourceBundle: bundle,
    verificationRecords: buildSourceVerificationRecords(bundle).map(record => ({ ...record,
      status: record.kind === 'canonical_gap' ? 'needs_review' : 'verified' })),
    sourceApproval: { sourceId: 'source', sourceHash: bundle.sourceHash, durationMinutes: 40,
      reviewerUid: 'teacher-a', approvedAt: '2026-10-01T00:00:00.000Z' }, originalStoragePath: 'lessonGen/teacher-a/source/lesson.txt' };
  const lesson = structuralLessonIR();
  lesson.provenance = { sourceHash: bundle.sourceHash };
  return lesson;
};

describe('source to Studio persistence', () => {
  it('stores nested matrices in a private envelope', async () => {
    const lesson = await prepare();
    lesson.extensions = { matrix: [[1, 2], [3, 4]] };
    await saveImportedV832Draft(lesson, sourceId);
    const stored = (state.writes[0].value as { lessonIR: unknown }).lessonIR;
    expect(stored).toMatchObject({ codec: 'v832-private-json', version: 1 });
    expect(decodePrivateLessonIR(stored)).toEqual(lesson);
  });
  it('rejects source-linked encoded size overflow atomically without relinking the source', async () => {
    const lesson = await prepare();
    lesson.extensions = { escaped: '"'.repeat(210_000) };
    await expect(saveImportedV832Draft(lesson, sourceId)).rejects.toThrow('PRIVATE_DOCUMENT_SIZE');
    expect(state.writes).toHaveLength(0);
  });
  it('accepts genuine historical v1 and preserves its private snapshot and hash', async () => {
    const lesson = await prepare(1);
    const original = structuredClone(state.source!);
    await saveImportedV832Draft(lesson, sourceId);
    expect(state.writes[0].value).toMatchObject({ sourceHash: original.sourceHash,
      sourceSnapshot: { sourceBundle: original.sourceBundle, sourceApproval: original.sourceApproval,
        verificationRecords: original.verificationRecords, originalStoragePath: original.originalStoragePath } });
    expect(state.source).toEqual(original);
  });

  for (const version of [1, 2] as const) {
    it.each(['content', 'name', 'mimeType', 'role', 'order'] as const)(`rejects v${version} tampered %s without writes`, async field => {
      const lesson = await prepare(version);
      const bundle = state.source!.sourceBundle as Awaited<ReturnType<typeof createSourceBundle>>;
      if (field === 'order') bundle.sources.reverse();
      else if (field === 'role') bundle.sources[1].role = 'canonical';
      else bundle.sources[0][field] += ' changed';
      state.source!.verificationRecords = buildSourceVerificationRecords(bundle).map(record => ({ ...record, status: 'verified' }));
      await expect(saveImportedV832Draft(lesson, sourceId)).rejects.toThrow('Nguồn đã đổi');
      expect(state.writes).toHaveLength(0);
    });

    it(`pins entry IR and transaction source snapshots during v${version} digest`, async () => {
      const lesson = await prepare(version);
      const originalLesson = structuredClone(lesson);
      const originalSource = structuredClone(state.source!);
      const digest = crypto.subtle.digest.bind(crypto.subtle);
      vi.spyOn(crypto.subtle, 'digest').mockImplementationOnce(async (...args) => {
        await Promise.resolve();
        lesson.lesson.runtimeMin = 80;
        lesson.provenance!.sourceHash = 'changed';
        const bundle = state.source!.sourceBundle as Awaited<ReturnType<typeof createSourceBundle>>;
        bundle.sources[0].content = 'changed';
        bundle.sourceHash = 'changed';
        state.source!.verificationRecords = [];
        (state.source!.sourceApproval as { reviewerUid: string }).reviewerUid = 'other';
        state.source!.originalStoragePath = 'other/path';
        return digest(...args);
      });
      const saving = saveImportedV832Draft(lesson, sourceId);
      lesson.lesson.lessonId = 'changed-before-transaction-read';
      await saving;
      expect(state.writes).toHaveLength(2);
      expect(decodePrivateLessonIR((state.writes[0].value as { lessonIR: unknown }).lessonIR)).toEqual(originalLesson);
      expect(state.writes[0].value).toMatchObject({ lessonIR: { codec: 'v832-private-json', version: 1 }, sourceHash: originalSource.sourceHash,
        sourceSnapshot: { sourceBundle: originalSource.sourceBundle, sourceApproval: originalSource.sourceApproval,
          verificationRecords: originalSource.verificationRecords, originalStoragePath: originalSource.originalStoragePath } });
    });
  }

  it('pins the reviewed source snapshot and links both drafts in one transaction', async () => {
    const lesson = await prepare();
    const draftId = await saveImportedV832Draft(lesson, sourceId);
    expect(draftId).toMatch(/^v832-[0-9a-f]{24}$/);
    expect(state.writes).toHaveLength(2);
    expect(state.writes[0].value).toMatchObject({ sourceDraftId: sourceId, ownerUid: 'teacher-a',
      sourceSnapshot: { sourceBundle: state.source!.sourceBundle, sourceApproval: state.source!.sourceApproval } });
    expect(state.writes[1].value).toMatchObject({ v832DraftId: draftId });
  });

  it('rejects stale outer source metadata before creating a Studio draft', async () => {
    const lesson = await prepare();
    state.source!.sourceHash = 'stale';
    await expect(saveImportedV832Draft(lesson, sourceId)).rejects.toThrow('Nguồn đã đổi');
    expect(state.writes).toHaveLength(0);
  });

  it('rejects an existing matching owner/hash record missing its source bundle without writes', async () => {
    const lesson = await prepare();
    delete state.source!.sourceBundle;
    await expect(saveImportedV832Draft(lesson, sourceId)).rejects.toThrow('Nguồn đã đổi');
    expect(state.writes).toHaveLength(0);
  });

  it('rejects another owner or changed duration without writing either draft', async () => {
    const lesson = await prepare();
    state.source!.ownerUid = 'teacher-b';
    await expect(saveImportedV832Draft(lesson, sourceId)).rejects.toThrow('Nguồn đã đổi');
    expect(state.writes).toHaveLength(0);
    state.source!.ownerUid = 'teacher-a';
    lesson.lesson.runtimeMin = 80;
    await expect(saveImportedV832Draft(lesson, sourceId)).rejects.toThrow('Nguồn đã đổi');
    expect(state.writes).toHaveLength(0);
  });

  it('rejects a source content edit that reuses the old asserted content hash', async () => {
    const lesson = await prepare();
    const bundle = state.source!.sourceBundle as Awaited<ReturnType<typeof createSourceBundle>>;
    bundle.sources[0].content = 'u_n = 999';
    state.source!.verificationRecords = buildSourceVerificationRecords(bundle).map(record => ({ ...record, status: 'verified' }));
    await expect(saveImportedV832Draft(lesson, sourceId)).rejects.toThrow('Nguồn đã đổi');
    expect(state.writes).toHaveLength(0);
  });
});
