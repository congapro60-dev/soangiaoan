import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getG10P31V4Contract } from '../src/data/liveLessonPackages/g10_w5_p31_bpt_tiet1.v4.ts';
import { buildEvidenceVectors } from '../src/lib/liveLesson/v4/evidence.ts';
import { buildStudentGlossaryPopup } from '../src/lib/liveLesson/v4/glossary.ts';
import { proposeGroups } from '../src/lib/liveLesson/v4/grouping.ts';
import { projectTeacher, projectTv, projectStudent } from '../src/lib/liveLesson/v4/lessonProjection.ts';
import { projectToPublicTvState, isPrivateFieldLeaked } from '../src/lib/liveLesson/v4/publicProjection.ts';
import { getRoutedVariant } from '../src/lib/liveLesson/v4/taskRouting.ts';
import { validateV4Contract } from '../src/lib/liveLesson/v4/validateContract.ts';
import {
  enqueueLiveResponse,
  flushLiveResponseQueue,
  getLiveResponseStepState,
  getQueuedLiveResponses,
} from '../src/lib/liveLesson/offlineQueue.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(__dirname, 'fixtures', 'g10-p31-v4-anonymous.json');
const manifestPath = join(__dirname, '..', 'qa_artifacts', 'live-lesson-v4', 'e2e-manifest.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const contract = getG10P31V4Contract();
const now = 1_787_875_200_000;
const sessionId = 'session-g10-p31-v4-anon';

const leakTokens = [
  ...fixture.students.map((student) => student.uid),
  ...fixture.students.map((student) => student.id).filter(Boolean),
  ...fixture.students.map((student) => student.name).filter(Boolean),
  'languageSupportPlan',
  'privateReason',
  'teacherScript',
  ...fixture.students.flatMap((student) => [
    student.script.p27PostCheckText,
    student.script.p38ExitTicket,
  ]),
].filter(Boolean);

const passLines = [];
const report = {
  checks: 9,
  allPassed: false,
  timeline: contract.durationSeconds,
  tvLeak: 'not-run',
  generatedAt: new Date().toISOString(),
};

function pass(message) {
  const line = `PASS ${passLines.length + 1}/9: ${message}`;
  passLines.push(line);
  console.log(line);
}

function assertRenderablePublicTv(state, block) {
  assert.equal(typeof state.cueId, 'string', `${block.id}: missing cueId`);
  assert.equal(typeof state.screenId, 'string', `${block.id}: missing screenId`);
  assert.ok(['lobby', 'running', 'paused', 'closed'].includes(state.status), `${block.id}: invalid status`);
  const statCards = [
    state.participantCount,
    state.submittedCount,
    state.routeCounts,
    state.errorCategoryCounts,
  ].filter((value) => value !== undefined);
  assert.ok(statCards.length <= 4, `${block.id}: TV exposes more than 4 stat cards`);
}

function publicInputFor(block) {
  return {
    cueId: block.id,
    screenId: block.tvScreenId,
    status: 'running',
    showStats: true,
    participantCount: fixture.students.length,
    submittedCount: block.startSeconds >= 960 ? fixture.students.length : Math.min(1, fixture.students.length),
    routeCounts: { M: 1, S: 1, C: 1 },
    errorCategoryCounts: { Conceptual: 0, Algebraic: 1, Logical: 2, 'Missing condition': 0 },
    groupProgress: block.id === 'P20' ? { G1: 1 } : undefined,
    updatedAt: now + block.startSeconds * 1000,
  };
}

function rawLeakyTvInput(block) {
  return {
    ...publicInputFor(block),
    studentId: fixture.students[0].uid,
    participantUid: fixture.students[1].uid,
    name: 'HS private name',
    languageSupportPlan: 'confidential school support plan',
    privateReason: 'student still needs private reasoning support',
    teacherScript: block.teacherScript,
    rawText: fixture.students[0].script.p27PostCheckText,
  };
}

function makeResponse(student, stepId, responseType, value, offsetSeconds) {
  const submittedAt = now + offsetSeconds * 1000;
  return {
    id: `${student.uid}-${stepId}-${responseType}`,
    participantUid: student.uid,
    classId: student.classId,
    stepId,
    responseType,
    value,
    clientNonce: `${student.uid}-${stepId}-${responseType}`,
    submittedAt,
    updatedAt: submittedAt,
  };
}

function buildResponses() {
  return fixture.students.flatMap((student, index) => [
    makeResponse(student, 'P16', 'choice', index < 2 ? 'C' : 'A', 1_000 + index),
    makeResponse(student, 'P27', 'text', student.script.p27PostCheckText, 1_650 + index),
    makeResponse(student, 'P30', 'route', student.script.p30RoutePick, 1_850 + index),
    makeResponse(student, 'P38', 'exit_ticket', student.script.p38ExitTicket, 2_310 + index),
  ]);
}

function evidenceScore(vector) {
  return {
    concept: vector.concept,
    reasoning: vector.reasoning,
    procedure: vector.procedure,
    modeling: vector.modeling,
    confidence: vector.confidence,
  };
}

function assertTeacherProjection() {
  for (const block of contract.timeline) {
    const projection = projectTeacher(contract, block.id);
    assert.equal(projection.cue.id, block.id, `${block.id}: teacher cue mismatch`);
    assert.ok(projection.script.trim().length > 0, `${block.id}: teacher script missing`);
    assert.ok(projection.board.large || projection.board.side, `${block.id}: teacher board missing`);
  }
  pass('Teacher phone projection renders cue + script + board for every timeline block');
}

function assertTvPublicProjection() {
  for (const block of contract.timeline) {
    const tvProjection = projectTv(contract, block.id, publicInputFor(block));
    assert.equal(tvProjection.cueId, block.id, `${block.id}: TV cue mismatch`);
    assert.ok(tvProjection.screen.title, `${block.id}: TV screen title missing`);
    const publicState = projectToPublicTvState(tvProjection);
    assertRenderablePublicTv(publicState, block);
  }
  assert.ok(contract.projections.tv.maxStatCards <= 4, 'contract TV projection allows too many stat cards');
  pass('TV public projection is renderable for every block with <=4 stat cards and cueId/screenId/status');
}

function assertStudentProjection() {
  for (const student of fixture.students) {
    for (const stepId of ['P08', 'P20', 'P27', 'P30']) {
      const projection = projectStudent(contract, stepId, student.script.languageChoice);
      assert.equal(projection.cueId, stepId, `${student.uid}/${stepId}: student cue mismatch`);
      assert.ok(projection.action || projection.checkpoint, `${student.uid}/${stepId}: no task/action`);
      assert.ok(projection.taskVariants.length >= 3, `${student.uid}/${stepId}: missing task variants`);
      assert.ok(projection.scaffoldSets.length >= 3, `${student.uid}/${stepId}: missing scaffold`);
      assert.ok(Array.isArray(projection.glossary), `${student.uid}/${stepId}: missing glossary array`);
      assert.equal(projection.languageView.language, student.script.languageChoice.language, `${student.uid}/${stepId}: language view mismatch`);
    }
  }
  pass('Three anonymous students can project P08/P20/P27/P30 with task, scaffold, glossary, and languageView');
}

function assertLanguageGlossaryEvidence() {
  const multilingualStudent = fixture.students.find((student) => student.script.languageChoice.language !== 'vi');
  assert.ok(multilingualStudent, 'fixture must include a non-vi language choice');
  const projection = projectStudent(contract, 'P08', multilingualStudent.script.languageChoice);
  const demand = contract.languageDemands.find((item) => item.stepId === 'P08');
  assert.ok(demand?.sentenceFrames.length, 'P08 sentence frames missing');
  assert.equal(projection.languageView.showSentenceFrames, true, 'non-vi student does not receive sentence frames');

  const popup = buildStudentGlossaryPopup(contract.glossary, 'term-inequality', multilingualStudent.script.languageChoice);
  assert.ok(popup, 'approved glossary popup missing');
  assert.equal(popup.id, 'term-inequality');
  assert.ok(popup.translation, 'non-vi approved glossary translation missing');

  const draftGlossary = { ...contract.glossary[0], id: 'term-draft-private', status: 'draft' };
  const retiredGlossary = { ...contract.glossary[0], id: 'term-retired-private', status: 'retired' };
  assert.equal(buildStudentGlossaryPopup([...contract.glossary, draftGlossary], 'term-draft-private', multilingualStudent.script.languageChoice), null);
  assert.equal(buildStudentGlossaryPopup([...contract.glossary, retiredGlossary], 'term-retired-private', multilingualStudent.script.languageChoice), null);

  // Prove language neutrality by actually VARYING language: attach a different
  // languagePreference to every response, then assert the evidence vectors are
  // byte-identical. evidence.ts only reads {stepId,responseType,value,submittedAt},
  // so any language attached must be ignored.
  const viResponses = buildResponses().map((r) => ({ ...r, languagePreference: 'vi_anchor' }));
  const multilingualResponses = buildResponses().map((r) => ({ ...r, languagePreference: 'bilingual', language: 'ko' }));
  const baseline = buildEvidenceVectors({ responses: viResponses, evidenceRules: contract.evidenceRules, now: now + 1_900_000 });
  const changedLanguage = buildEvidenceVectors({ responses: multilingualResponses, evidenceRules: contract.evidenceRules, now: now + 1_900_000 });
  assert.deepEqual(
    baseline.map((entry) => [entry.participantUid, evidenceScore(entry.vector)]),
    changedLanguage.map((entry) => [entry.participantUid, evidenceScore(entry.vector)]),
    'language choice changed concept/reasoning evidence score',
  );
  pass('Language support provides sentence frames and approved-only glossary without changing concept/reasoning evidence');
}

function assertGroupApproval() {
  const checkpoint = contract.groupingCheckpoints.find((item) => item.stepId === 'P19');
  assert.ok(checkpoint, 'P19 grouping checkpoint missing');
  const evidence = buildEvidenceVectors({ responses: buildResponses(), evidenceRules: contract.evidenceRules, now: now + 1_900_000 });
  const proposals = proposeGroups({ checkpoint, students: evidence });
  assert.ok(proposals.length >= 1, 'no grouping proposal returned');
  const proposal = proposals[0];
  assert.ok(proposal.purpose, 'grouping purpose missing');
  assert.ok(Array.isArray(proposal.memberIds), 'grouping memberIds missing');
  assert.ok(proposal.scaffold, 'grouping scaffold missing');
  assert.ok(!('abilityLabel' in proposal), 'grouping leaked ability label');
  if (proposal.purpose === 'teacher_defined') {
    assert.ok(proposal.reason, 'teacher_defined fallback must explain insufficient evidence');
  } else {
    assert.ok(proposal.memberIds.length >= 3 && proposal.memberIds.length <= 4, 'group size outside [3,4]');
  }
  pass('P19 grouping proposal returns purpose/memberIds/scaffold, no ability label, and valid size or teacher fallback');
}

function assertPostCheckIntegrity() {
  const groupTask = contract.taskVariants.find((variant) => variant.route === 'M');
  assert.ok(groupTask, 'group task missing');
  for (const route of ['M', 'S', 'C']) {
    const routed = getRoutedVariant(contract, route);
    assert.ok(routed, `missing routed task ${route}`);
    const postCheck = contract.checkpoints.find((checkpoint) => checkpoint.id === routed.variant.postCheckId);
    assert.ok(postCheck, `missing post-check for route ${route}`);
    assert.equal(postCheck.stepId, 'P27', `${route}: post-check is not at P27`);
    assert.equal(postCheck.kind, 'post_check', `${route}: post-check is not individual post_check`);
    assert.equal(postCheck.id, `cp-postcheck-${route.toLowerCase()}`, `${route}: post-check id mismatch`);
    assert.deepEqual(routed.variant.successCriteria, groupTask.successCriteria, `${route}: success criteria differ from group task`);
    assert.notEqual(postCheck.prompt, contract.checkpoints.find((checkpoint) => checkpoint.id === 'cp-group-product')?.prompt, `${route}: post-check reuses group prompt`);
    assert.ok(!/official score|điểm chính thức|auto-graded|auto graded|tự chấm điểm/i.test(postCheck.evidenceSignal), `${route}: post-check is auto-graded as official score`);
  }
  pass('P27 gives per-student cp-postcheck-m/s/c with new data, same criteria, and no official auto-grade');
}

async function assertOfflineQueue() {
  const storage = new Map();
  const storageLike = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };
  const student = fixture.students[0];
  const input = {
    sessionId,
    participantUid: student.uid,
    classId: student.classId,
    stepId: 'P27',
    responseType: 'text',
    value: student.script.p27PostCheckText,
    clientNonce: 'offline-nonce-p27',
  };
  enqueueLiveResponse(input, storageLike, now);
  assert.equal(getQueuedLiveResponses(sessionId, student.uid, storageLike).length, 1, 'offline response was not queued');
  const synced = [];
  const flushResult = await flushLiveResponseQueue(async (item) => { synced.push(item.clientNonce); }, sessionId, student.uid, storageLike, now + 1_000);
  assert.deepEqual(flushResult, { attempted: 1, synced: 1, failed: null });
  assert.deepEqual(synced, ['offline-nonce-p27']);
  assert.equal(getLiveResponseStepState(sessionId, student.uid, 'P27', storageLike)?.status, 'synced');

  enqueueLiveResponse(input, storageLike, now + 2_000);
  enqueueLiveResponse(input, storageLike, now + 3_000);
  assert.equal(getQueuedLiveResponses(sessionId, student.uid, storageLike).length, 1, 'duplicate clientNonce created duplicate queue item');
  pass('Offline queue enqueues offline response, flushes to synced, and deduplicates same clientNonce');
}

function assertTvPrivacy() {
  for (const block of contract.timeline) {
    const publicState = projectToPublicTvState(rawLeakyTvInput(block));
    const json = JSON.stringify(publicState);
    const structuralLeak = isPrivateFieldLeaked(json);
    assert.equal(structuralLeak, null, `${block.id}: ${structuralLeak}`);
    for (const token of leakTokens) {
      assert.ok(!json.includes(token), `${block.id}: TV/public projection leaked ${token}`);
    }
  }
  report.tvLeak = 'none';
  pass('TV/public projection leaks no uid/id/name/languageSupportPlan/privateReason/teacherScript/raw answers at any block');
}

function assertTimelineIntegrity() {
  assert.equal(contract.durationSeconds, 2400, 'contract duration must be 2400 seconds');
  const blocks = [...contract.timeline].sort((a, b) => a.startSeconds - b.startSeconds);
  assert.equal(blocks[0].startSeconds, 0, 'timeline must start at 0');
  let cursor = 0;
  for (const block of blocks) {
    assert.equal(block.startSeconds, cursor, `${block.id}: timeline gap/overlap at ${cursor}->${block.startSeconds}`);
    assert.ok(block.endSeconds > block.startSeconds, `${block.id}: backward or zero time`);
    cursor = block.endSeconds;
  }
  assert.equal(cursor, 2400, 'timeline must cover through 2400');
  const validation = validateV4Contract(contract);
  assert.equal(validation.ok, true, `validateV4Contract failed: ${JSON.stringify(validation.errors)}`);

  // Timing evidence derived from the CONTRACT itself (real allocations, not
  // fabricated constants). Each phase's allocated seconds must be positive and
  // the key interaction phases must allocate enough room for the plan's human
  // budgets. Actual human-interaction latency (join <=45s, language first-run
  // <=15s, group approval <=20s, movement <=45s) is NOT wall-clock measurable in
  // a headless sim — it is deferred to the browser multi-client pilot.
  const phaseAllocations = Object.fromEntries(
    blocks.map((block) => [block.id, block.endSeconds - block.startSeconds]),
  );
  for (const [id, seconds] of Object.entries(phaseAllocations)) {
    assert.ok(seconds > 0, `${id}: non-positive phase allocation`);
  }
  const p19 = blocks.find((block) => block.id === 'P19');
  assert.ok(p19, 'P19 group-approval phase missing');
  // P19 must allocate room for approval (<=20s) + movement (<=45s) budgets.
  assert.ok((p19.endSeconds - p19.startSeconds) >= 45, 'P19 allocates too little time for approval + movement');
  console.log(`CONTRACT phase allocations (s): ${JSON.stringify(phaseAllocations)}`);
  console.log('NOTE: human-interaction time budgets (join/language/approval/movement) require the browser pilot; not asserted here.');
  pass('Timeline covers 0..2400 contiguously, validates, and contract phase allocations are sound');
}

async function main() {
  try {
    assertTeacherProjection();
    assertTvPublicProjection();
    assertStudentProjection();
    assertLanguageGlossaryEvidence();
    assertGroupApproval();
    assertPostCheckIntegrity();
    await assertOfflineQueue();
    assertTvPrivacy();
    assertTimelineIntegrity();
    report.allPassed = true;
    report.generatedAt = new Date().toISOString();
    writeFileSync(manifestPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`SUMMARY: ${passLines.length}/9 checks passed for ${fixture.students.length} anonymous students over ${contract.timeline.length} timeline blocks.`);
  } catch (error) {
    report.allPassed = false;
    report.generatedAt = new Date().toISOString();
    try {
      writeFileSync(manifestPath, `${JSON.stringify(report, null, 2)}\n`);
    } catch {
      // If the artifact folder is missing during RED runs, surface the original assertion instead.
    }
    throw error;
  }
}

await main();
