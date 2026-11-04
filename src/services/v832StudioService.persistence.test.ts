import { beforeEach, describe, expect, it, vi } from 'vitest';
import { structuralLessonIR } from '../lib/lessonCompiler/v832/lessonIR.testFixture';
import { encodePrivateLessonIR, encodePrivateJson, decodePrivateLessonIR } from '../lib/lessonCompiler/v832/privateJsonCodec';
import { computeLessonContentHash } from '../lib/lessonReview/v832/repairLifecycle';
import * as designGate from '../lib/lessonCompiler/v832/designGate';

const state = vi.hoisted(() => ({ value: {} as Record<string, unknown>, writes: [] as Record<string, unknown>[],
  listener: null as null | ((snapshot: unknown) => void) }));
vi.mock('../lib/firebase', () => ({ auth: { currentUser: { uid: 'teacher-a', isAnonymous: false } }, db: {}, storage: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), limit: vi.fn(), query: vi.fn(), where: vi.fn(),
  doc: (_db: unknown, ...parts: string[]) => parts.join('/'),
  serverTimestamp: () => new (class Sentinel {})(),
  getDoc: async () => ({ exists: () => true, data: () => state.value, id: 'candidate' }),
  setDoc: async (_ref: unknown, value: Record<string, unknown>) => { state.writes.push(value); },
  onSnapshot: (_query: unknown, callback: (snapshot: unknown) => void) => { state.listener = callback; return () => {}; },
  runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) => fn({
    get: async () => ({ exists: () => true, data: () => state.value }),
    update: (_ref: unknown, value: Record<string, unknown>) => state.writes.push(value),
  }),
}));
import { saveImportedV832Draft, readV832StudioDraft, persistV832ConfirmationDecision,
  persistV832SemanticAttestation, persistV832DesignReview, readV832RepairCandidate, subscribeV832RepairCandidates } from './v832StudioService';
import { readV832PrivateBuild } from './v832RoomService';

const draftId = 'v832-' + 'a'.repeat(24);
const lesson = () => {
  const value = structuralLessonIR();
  value.provenance = { sourceHash: 'source' };
  value.extensions = { matrix: [[1, 2], [3, 4]] };
  return value;
};
beforeEach(() => { state.value = {}; state.writes = []; state.listener = null; });

describe('private persistence service boundaries', () => {
  it.each([false, true])('reads canonical draft and build from envelope=%s', async encoded => {
    const ir = lesson();
    const stored = encoded ? encodePrivateLessonIR(ir) : ir;
    state.value = { ownerUid: 'teacher-a', status: 'v832_review', lessonIR: stored, privateLessonIR: stored };
    expect((await readV832StudioDraft(draftId))?.lessonIR).toEqual(ir);
    expect((await readV832PrivateBuild('package'))?.privateLessonIR).toEqual(ir);
    expect(state.writes).toHaveLength(0);
  });

  it('rejects corrupted envelopes in both private readers', async () => {
    const bad = { codec: 'v832-private-json', version: 2, json: '{}' };
    state.value = { ownerUid: 'teacher-a', status: 'v832_review', lessonIR: bad, privateLessonIR: bad };
    await expect(readV832StudioDraft(draftId)).rejects.toThrow('PRIVATE_JSON_ENVELOPE');
    await expect(readV832PrivateBuild('package')).rejects.toThrow('PRIVATE_JSON_ENVELOPE');
  });

  it('bounds imported complete encoded payload, including escaping', async () => {
    const ir = lesson();
    ir.extensions = { text: '"'.repeat(210_000) };
    await expect(saveImportedV832Draft(ir)).rejects.toThrow('PRIVATE_DOCUMENT_SIZE');
    expect(state.writes).toHaveLength(0);
    await saveImportedV832Draft(lesson());
    expect(decodePrivateLessonIR(state.writes[0].lessonIR)).toEqual(lesson());
  });

  it.each([false, true])('confirmation hydrates and writes only an envelope from legacy=%s', async legacy => {
    const ir = lesson();
    const hash = await computeLessonContentHash(ir);
    state.value = { ownerUid: 'teacher-a', status: 'v832_review', revision: 1,
      lessonIR: legacy ? ir : encodePrivateLessonIR(ir), confirmationAudit: [], semanticAttestations: [] };
    const audit = { lessonId: ir.lesson.lessonId, lessonVersion: ir.lesson.lessonVersion, teacherUid: 'teacher-a',
      decision: 'confirm_group' as const, confirmationRefs: [], rationale: 'Synthetic test only',
      confirmedAt: '2026-10-01', baseContentHash: hash, resultingContentHash: hash };
    await persistV832ConfirmationDecision(draftId, ir, audit);
    expect(state.writes[0].lessonIR).toMatchObject({ codec: 'v832-private-json' });
    expect(decodePrivateLessonIR(state.writes[0].lessonIR)).toEqual(ir);
    expect(state.writes[0].confirmationAudit).toEqual([audit]);
    state.writes = [];
    state.value.padding = 'x'.repeat(790_000);
    await expect(persistV832ConfirmationDecision(draftId, ir, { ...audit, rationale: 'x'.repeat(20_000) })).rejects.toThrow(/PRIVATE_DOCUMENT_SIZE/);
    expect(state.writes).toHaveLength(0);
  });

  it('attestation budgets resulting metadata and does not migrate legacy IR', async () => {
    const ir = lesson();
    state.value = { ownerUid: 'teacher-a', status: 'v832_review', revision: 1, lessonIR: ir,
      confirmationAudit: [], semanticAttestations: [] };
    const hash = await computeLessonContentHash(ir);
    const attestation = { ruleId: 'M01', verdict: 'pass' as const, evidence: 'Synthetic test evidence', reviewer: 'teacher-a', reviewedAt: '2026-10-01' };
    await persistV832SemanticAttestation(draftId, hash, attestation);
    expect(state.writes[0]).not.toHaveProperty('lessonIR');
    state.writes = [];
    state.value.padding = 'x'.repeat(790_000);
    await expect(persistV832SemanticAttestation(draftId, hash, { ...attestation, evidence: 'x'.repeat(20_000) })).rejects.toThrow('PRIVATE_DOCUMENT_SIZE');
    expect(state.writes).toHaveLength(0);
  });

  it('design persistence hydrates, encodes and budgets the complete result independently of gate evaluation', async () => {
    const ir = lesson();
    const frozen = { ...ir, buildStatus: 'DESIGN_FROZEN' as const };
    const freeze = vi.spyOn(designGate, 'freezeReviewedDesign').mockReturnValue(frozen);
    try {
      state.value = { ownerUid: 'teacher-a', status: 'v832_review', revision: 1,
        lessonIR: encodePrivateLessonIR(ir), confirmationAudit: [], semanticAttestations: [] };
      const hash = await computeLessonContentHash(ir);
      expect(await persistV832DesignReview(draftId, hash)).toEqual(frozen);
      expect(freeze.mock.calls[0][0]).toEqual(ir);
      expect(decodePrivateLessonIR(state.writes[0].lessonIR)).toEqual(frozen);
      expect(state.writes[0].designReview).toMatchObject({ reviewerUid: 'teacher-a', baseContentHash: hash });
      state.writes = [];
      state.value.padding = 'x'.repeat(800_000);
      await expect(persistV832DesignReview(draftId, hash)).rejects.toThrow('PRIVATE_DOCUMENT_SIZE');
      expect(state.writes).toHaveLength(0);
    } finally { freeze.mockRestore(); }
  });

  it('hydrates copied repair fields and reports subscription errors without partial publication', async () => {
    const ir = lesson();
    const before = { activityId: 'A1', activity: ir.timeline[0] };
    const changes = [{ path: '/extensions/matrix', before: [[1]], after: [[2]] }];
    const patch = { op: 'UPDATE_QUESTION', targetId: 'Q1', baseLessonVersion: '1', baseContentHash: 'h', beforeHash: 'h', changes: { rubric: [[1]] } };
    state.value = { ownerUid: 'teacher-a', candidateIR: encodePrivateLessonIR(ir), before: encodePrivateJson(before),
      changes: encodePrivateJson(changes), patch: encodePrivateJson(patch) };
    expect(await readV832RepairCandidate('candidate')).toMatchObject({ candidateIR: ir, before, changes, patch });
    const onChange = vi.fn(); const onError = vi.fn();
    subscribeV832RepairCandidates(onChange, onError);
    state.listener!({ docs: [{ id: 'ok', data: () => state.value },
      { id: 'bad', data: () => ({ ...state.value, changes: encodePrivateJson({ wrong: true }) }) }] });
    expect(onChange).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'PRIVATE_JSON_CHANGES' }));
  });
});
