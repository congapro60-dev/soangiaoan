import { gradeAssessment } from '../src/lib/adaptive/diagnosticEngine.js';
import { averageMastery, countMisconceptions, mergeObjectiveMemory } from '../src/lib/adaptive/learningProfile.js';
import { isSafeDocId } from '../src/lib/classroom/parentAccess.js';
import type { AdaptiveAssessment, AdaptiveLesson, AssessmentAttempt, StudentObjectiveMemory } from '../src/lib/adaptive/types.js';

type Data = FirebaseFirestore.DocumentData;
type Db = FirebaseFirestore.Firestore;
type Context = { studentId: string; classId: string; teacherId: string };
const text = (value: unknown): string => typeof value === 'string' ? value : '';
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const truncateAttempt = (attempt: AssessmentAttempt): AssessmentAttempt => ({ ...attempt, answers: attempt.answers.map(answer => ({ ...answer, answer: answer.answer.slice(0, 500) })) });
const assessmentFor = (lesson: AdaptiveLesson, kind: string, unitId: unknown): { assessment: AdaptiveAssessment; unitId?: string; key: string } => {
  if (kind === 'diagnostic') return { assessment: lesson.diagnosticTest, key: 'diagnostic' };
  if (kind === 'exitTicket') return { assessment: lesson.exitTicket, key: 'exitTicket' };
  if (kind === 'quickCheck' && typeof unitId === 'string' && isSafeDocId(unitId)) {
    const unit = lesson.knowledgeUnits.find(item => item.id === unitId);
    if (unit?.quickCheck) return { assessment: unit.quickCheck, unitId, key: `quickCheck:${unitId}` };
  }
  throw new Error('INVALID_ASSESSMENT');
};
export const submitAdaptiveAssessment = async (db: Db, context: Context, assignmentId: string, assignment: Data, lesson: AdaptiveLesson, body: Data) => {
  const kind = text(body.kind);
  if (!['diagnostic', 'quickCheck', 'exitTicket'].includes(kind)) throw new Error('INVALID_KIND');
  if (!isRecord(body.answers)) throw new Error('INVALID_ANSWERS');
  const entries = Object.entries(body.answers);
  if (entries.length > 100) throw new Error('TOO_MANY_ANSWERS');
  if (entries.some(([, answer]) => typeof answer !== 'string')) throw new Error('INVALID_ANSWERS');
  if (entries.some(([, answer]) => (answer as string).length > 2000)) throw new Error('ANSWER_TOO_LONG');
  let selected: ReturnType<typeof assessmentFor>;
  try { selected = assessmentFor(lesson, kind, body.unitId); } catch { throw new Error(kind === 'quickCheck' ? 'INVALID_UNIT' : 'INVALID_ASSESSMENT'); }
  const answers: Record<string, string> = Object.assign(Object.create(null), Object.fromEntries(entries.filter(([id]) => selected.assessment.questions.some(question => question.id === id)).map(([id, answer]) => [id, answer as string])));
  if (!Object.values(answers).some(answer => answer.trim())) throw new Error('NO_ANSWERS');
  const durationSeconds = Math.max(0, Math.min(86400, Number.isFinite(Number(body.durationSeconds)) ? Number(body.durationSeconds) : 0));
  const progressRef = db.collection('adaptiveAssignmentProgress').doc(`${assignmentId}_${context.studentId}`);
  // T3b: tiến độ + hồ sơ ghi KÈM classId để bảng GV đúng lớp đọc được.
  const sessionRef = db.collection('adaptiveSessionProgress').doc(`${assignmentId}_${context.studentId}`);
  const profileRef = db.collection('studentLearningProfiles').doc(context.studentId);
  const result = await db.runTransaction(async tx => {
    const progressSnap = await tx.get(progressRef);
    const progress = progressSnap.exists ? progressSnap.data() || {} : {};
    // Firestore transaction: mọi đọc phải đứng trước mọi ghi.
    const profileSnap = await tx.get(profileRef);
    if (kind !== 'diagnostic' && !progress.attempts?.diagnostic) throw new Error('DIAGNOSTIC_REQUIRED');
    const stored = progress.attempts?.[selected.key] as AssessmentAttempt | undefined;
    const graded = gradeAssessment(selected.assessment, answers, durationSeconds);
    const attempt: AssessmentAttempt = { ...graded, answers: graded.answers.map(({ feedback, ...answer }) => answers[answer.questionId]?.trim() ? { ...answer, feedback } : answer) };
    const scored = !stored;
    const now = new Date().toISOString();
    const score = attempt.answers.reduce<number>((sum, answer) => sum + answer.score, 0);
    const maxScore = selected.assessment.questions.reduce<number>((sum, question) => sum + question.points, 0);
    if (scored) {
      // merge: giữ trường người khác đã ghi vào cùng doc tiến độ (không ghi đè bằng bản thiếu field).
      tx.set(progressRef, { teacherId: context.teacherId, classId: context.classId, studentId: context.studentId, assignmentId, lessonId: lesson.id, ...(assignment.discoverSeedId ? { discoverSeedId: assignment.discoverSeedId } : {}), status: kind === 'exitTicket' ? 'completed' : (progress.status || 'in_progress'), attempts: { ...(progress.attempts || {}), [selected.key]: truncateAttempt(attempt) }, startedAt: progress.startedAt || now, updatedAt: now, ...(kind === 'exitTicket' ? { completedAt: now } : {}) }, { merge: true });
      tx.set(sessionRef, { teacherId: context.teacherId, classId: context.classId, studentId: context.studentId, assignmentId, lessonId: lesson.id, lessonTitle: text(lesson.title), status: kind === 'exitTicket' ? 'completed' : 'in_progress', score, maxScore, updatedAt: now, ...(kind === 'exitTicket' ? { completedAt: now } : {}) }, { merge: true });
    }
    // Hồ sơ năng lực: ghi thêm classId, KHÔNG ghi tên/lớp (không biết ở server) để không xoá tên đang có.
    // Lượt nộp lại (retry) vẫn cập nhật hồ sơ (năng lực + lỗi sai) nhưng không tính thêm buổi/điểm trung bình.
    const previousProfile = (profileSnap.exists ? profileSnap.data() : {}) as {
      objectiveMemory?: StudentObjectiveMemory[];
      misconceptionCounts?: Record<string, number>;
      totalSessions?: number;
      averageMastery?: number;
      createdAt?: string;
    };
    const totalSessions = (previousProfile.totalSessions || 0) + (scored ? 1 : 0);
    const previousAverage = previousProfile.averageMastery || 0;
    const sessionMastery = averageMastery([attempt]);
    tx.set(profileRef, {
      id: context.studentId,
      studentId: context.studentId,
      teacherId: context.teacherId,
      classId: context.classId,
      ...(scored ? { totalSessions, averageMastery: Number((((previousAverage * (totalSessions - 1)) + sessionMastery) / totalSessions).toFixed(2)) } : {}),
      objectiveMemory: mergeObjectiveMemory(lesson, [attempt], previousProfile.objectiveMemory || []),
      misconceptionCounts: countMisconceptions([attempt], previousProfile.misconceptionCounts || {}),
      lastLessonId: lesson.id,
      lastLessonTitle: text(lesson.title),
      lastActiveAt: now,
      createdAt: previousProfile.createdAt || now,
      updatedAt: now,
    }, { merge: true });
    tx.create(db.collection('adaptiveEvents').doc(), { type: scored ? 'attempt' : 'retry', kind, ...(selected.unitId ? { unitId: selected.unitId } : {}), teacherId: context.teacherId, classId: context.classId, studentId: context.studentId, assignmentId, lessonId: lesson.id, ...(assignment.discoverSeedId ? { discoverSeedId: assignment.discoverSeedId } : {}), score, maxScore, objectiveScores: attempt.objectiveScores, wrongQuestionIds: attempt.answers.filter(answer => !answer.isCorrect).map(answer => answer.questionId), misconceptionIds: [...new Set(attempt.answers.flatMap(answer => answer.detectedMisconceptionIds || []))], durationSeconds, createdAt: now });
    // Nộp lại: không trả lại lời giải/giải thích (chỉ giữ nhận xét lỗi sai qua detectedMisconceptionIds).
    const shown: AssessmentAttempt = scored ? attempt : { ...attempt, answers: attempt.answers.map(({ feedback, ...answer }) => answer) };
    return { attempt: shown, scored, status: kind === 'exitTicket' && scored ? 'completed' : (progress.status || 'in_progress') };
  });
  return { assignmentId, kind, ...(selected.unitId ? { unitId: selected.unitId } : {}), scored: result.scored, status: result.status, attempt: result.attempt, ...(kind === 'diagnostic' && result.attempt.recommendedRoute ? { nextRoute: result.attempt.recommendedRoute } : {}) };
};
