import { FieldValue } from 'firebase-admin/firestore';
import type { RuntimeBuildV832 } from '../src/lib/lessonCompiler/v832/runtimePackage.js';
import { decodePrivateJson, decodePrivateLessonIR, assertPrivateDocumentSize } from '../src/lib/lessonCompiler/v832/privateJsonCodec.js';
import { synthesizeV84Closing, type V84ClosingInput } from '../src/lib/lessonRuntime/v84/closingContract.js';
import { normalizeV84NextStepOptions, type V84NextStepOption } from '../src/lib/lessonRuntime/v84/closingNextStep.js';
import type { RoomStateV832 } from '../src/lib/lessonCompiler/v832/roomState.js';

const MAX_ROSTER = 60;
const MAX_EXIT_REFS = 180;
const MAX_OUTPUT_BYTES = 500_000;

const bytes = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).byteLength;
const safeHex = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const exitPhase = (phase: unknown): boolean => /(?:^|_)(exit|reflection|closing|postcheck|self_assessment)(?:$|_)/i.test(String(phase ?? ''));
const asJson = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const comparable = (value: unknown): string => typeof value === 'string' ? value.trim().normalize('NFC') : JSON.stringify(value);

export const readV84NextStepOptions = (build: RuntimeBuildV832): Array<{ id: string; label: { vi: string; en: string; ja: string }; taskRef: string }> => {
  if (!build.privateExperiencePlan) return [];
  const plan = asJson(decodePrivateJson(build.privateExperiencePlan));
  const closing = asJson(plan.closing);
  const normalized = normalizeV84NextStepOptions(closing.nextStepOptions);
  return normalized.flatMap(option => {
    const source = Array.isArray(closing.nextStepOptions)
      ? closing.nextStepOptions.find(item => asJson(item).id === option.id) : undefined;
    const label = asJson(asJson(source).label);
    if (['vi', 'en', 'ja'].some(locale => typeof label[locale] !== 'string' || !(label[locale] as string).trim())) return [];
    return [{ ...option, label: { vi: label.vi as string, en: label.en as string, ja: label.ja as string } }];
  });
};

export const deriveV84ResponseEvidence = (question: Record<string, unknown>, response: Record<string, unknown>) => {
  const answer = question.correctAnswer;
  const mode = response.mode === 'photo' ? 'photo' : response.mode === 'math' ? 'typed' : 'typed';
  if (mode === 'photo' || answer === undefined || answer === null || question.rubric !== undefined) {
    return { evaluated: 'unsupported' as const, evidenceType: mode === 'photo' ? 'photo' as const : 'open_response' as const };
  }
  return { evaluated: comparable(answer) === comparable(response.value) ? 'correct' as const : 'incorrect' as const, evidenceType: 'exact_answer' as const };
};

export const projectV84ClosingNextSteps = (
  roster: readonly Record<string, unknown>[],
  snapshots: readonly { exists: boolean; data: () => unknown }[],
  options: readonly { id: string; taskRef: string }[],
): NonNullable<V84ClosingInput['nextSteps']> => {
  const taskRefById = new Map(options.map(option => [option.id, option.taskRef]));
  return snapshots.flatMap((snapshot, index) => {
    if (!snapshot.exists) return [];
    const data = asJson(snapshot.data());
    const student = asJson(roster[index]);
    if (typeof data.nextStepId !== 'string' || !Number.isSafeInteger(data.responseRevision)) return [];
    const taskRef = taskRefById.get(data.nextStepId);
    return taskRef ? [{ studentId: String(student.studentId), nextStepId: data.nextStepId,
      responseRevision: Number(data.responseRevision), taskRef }] : [];
  });
};

export const materializeV84ClosingInTransaction = async (input: {
  db: FirebaseFirestore.Firestore;
  transaction: FirebaseFirestore.Transaction;
  roomRef: FirebaseFirestore.DocumentReference;
  room: FirebaseFirestore.DocumentData;
  nextState: RoomStateV832;
  build: RuntimeBuildV832;
}): Promise<{ status: string; closingRevision: number; materializationKey: string } | null> => {
  if (!input.nextState.closed) return null;
  const room = input.room;
  const closingRevision = input.nextState.closingRevision ?? input.nextState.sessionRevision;
  const contentHash = input.build.manifest.contentHash;
  if (!safeHex(contentHash)) throw new Error('CLOSING_CONTENT_HASH_INVALID');
  const previous = room.closingReceipt as Record<string, unknown> | undefined;
  if (previous) {
    if (previous.closingRevision === closingRevision && previous.contentHash === contentHash) {
      return { status: String(previous.status ?? 'collecting'), closingRevision,
        materializationKey: String(previous.materializationKey ?? `${input.roomRef.id}:${contentHash}:${closingRevision}`) };
    }
    throw new Error('CLOSING_CONFLICT');
  }
  const presence = asJson(room.presenceLedger);
  const roster = Array.isArray(room.classBinding?.roster) ? room.classBinding.roster : Object.entries(presence).map(([studentId, value]) => {
    const student = asJson(value);
    return { studentId, name: String(student.name ?? '') };
  });
  if (roster.length > MAX_ROSTER) throw new Error('TRANSACTION_LIMIT_EXCEEDED');
  const lesson = input.build.privateLessonIR;
  const exitItems = lesson.timeline.filter(activity => exitPhase(activity.phase)).flatMap(activity =>
    (activity.questionInstances ?? []).map(instance => {
      const question = asJson(lesson.questions[instance.questionId]);
      const criterionIds = Array.isArray(activity.successCriteriaRefs) ? activity.successCriteriaRefs.filter((id): id is string => typeof id === 'string') : [];
      return { instanceId: instance.instanceId, questionId: instance.questionId, criterionIds,
        supportsExactEvaluation: question.correctAnswer !== undefined && question.rubric === undefined };
    }));
  if (roster.length * exitItems.length > MAX_EXIT_REFS) throw new Error('TRANSACTION_LIMIT_EXCEEDED');
  const responseRefs = roster.flatMap((student: Record<string, unknown>) => exitItems.map(item =>
    input.roomRef.collection('responses').doc(`${student.studentId}__${item.instanceId}`)));
  const assessmentRefs = roster.map((student: Record<string, unknown>) => input.roomRef.collection('selfAssessments').doc(String(student.studentId)).collection('latest').doc('current'));
  const nextStepRefs = roster.map((student: Record<string, unknown>) => input.roomRef.collection('nextSteps').doc(String(student.studentId)).collection('latest').doc('current'));
  const responseSnapshots = await Promise.all(responseRefs.map((ref: FirebaseFirestore.DocumentReference) => input.transaction.get(ref)));
  const assessmentSnapshots = await Promise.all(assessmentRefs.map((ref: FirebaseFirestore.DocumentReference) => input.transaction.get(ref)));
  const nextStepSnapshots = await Promise.all(nextStepRefs.map((ref: FirebaseFirestore.DocumentReference) => input.transaction.get(ref)));
  const responses: V84ClosingInput['responses'] = [];
  for (let index = 0; index < responseRefs.length; index += 1) {
    const snapshot = responseSnapshots[index]; if (!snapshot.exists) continue;
    const data = asJson(snapshot.data());
    const studentIndex = Math.floor(index / Math.max(1, exitItems.length)); const item = exitItems[index % Math.max(1, exitItems.length)];
    const question = asJson(lesson.questions[item.questionId]); const student = asJson(roster[studentIndex]);
    const evidence = deriveV84ResponseEvidence(question, data);
    responses.push({ studentId: String(student.studentId), participantUid: String(data.participantUid ?? asJson(presence[String(student.studentId)]).claimUid ?? ''),
      instanceId: item.instanceId, revision: Number(data.revision ?? 0), value: String(data.value ?? ''), ...evidence });
  }
  const selfAssessments: V84ClosingInput['selfAssessments'] = assessmentSnapshots.flatMap((snapshot, index) => {
    if (!snapshot.exists) return [];
    const data = asJson(snapshot.data()); const student = asJson(roster[index]); const criteria = Array.isArray(data.criteria) ? data.criteria : [];
    return [{ studentId: String(student.studentId), participantUid: String(data.participantUid ?? asJson(presence[String(student.studentId)]).claimUid ?? ''), revision: Number(data.revision ?? 0),
      criteria: criteria.flatMap(item => { const value = asJson(item); return typeof value.criterionId === 'string' && ['not_started','progressing','achieved','exceeded'].includes(String(value.value))
        ? [{ criterionId: value.criterionId, value: value.value as 'not_started'|'progressing'|'achieved'|'exceeded' }] : []; }) }];
  });
  const nextStepOptions = readV84NextStepOptions(input.build);
  const nextSteps = projectV84ClosingNextSteps(roster, nextStepSnapshots, nextStepOptions);
  const result = synthesizeV84Closing({ roomId: input.roomRef.id, closingRevision, contentHash,
    roster: roster.map((student: Record<string, unknown>) => { const value = asJson(student); const p = asJson(presence[String(value.studentId)]); return {
      studentId: String(value.studentId), name: String(value.name ?? ''), participantUid: String(p.claimUid ?? ''), attendance: String(p.attendance ?? 'UNCONFIRMED') as V84ClosingInput['roster'][number]['attendance'],
    }; }), exitItems, responses, selfAssessments, nextStepOptions, nextSteps });
  const documents = [result.publicClosing, ...Object.values(result.studentClosing), result.teacherAnalytics];
  if (documents.some(document => bytes(document) > MAX_OUTPUT_BYTES)) throw new Error('TRANSACTION_LIMIT_EXCEEDED');
  const publicRef = input.roomRef.collection('publicClosing').doc(String(closingRevision));
  const teacherRef = input.roomRef.collection('teacherAnalytics').doc('current').collection('revisions').doc(String(closingRevision));
  input.transaction.create(publicRef, result.publicClosing);
  for (const [studentId, feedback] of Object.entries(result.studentClosing)) {
    input.transaction.create(input.roomRef.collection('studentClosing').doc(studentId).collection('revisions').doc(String(closingRevision)), { ...feedback, studentId, contentHash, closingRevision, createdAt: FieldValue.serverTimestamp() });
  }
  input.transaction.create(teacherRef, { ...result.teacherAnalytics, contentHash, closingRevision, createdAt: FieldValue.serverTimestamp() });
  return { status: result.status, closingRevision,
    materializationKey: `${input.roomRef.id}:${contentHash}:${closingRevision}` };
};
