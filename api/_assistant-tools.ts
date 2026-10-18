import type { Firestore } from 'firebase-admin/firestore';
import type { AssistantActor, AssistantToolName } from './_assistant-types.js';
import { getAdminDb } from './_exam-core.js';

const READ_TOOLS = new Set<AssistantToolName>(['listClasses', 'getClassSummary', 'listStudents', 'getStudentTeacherSummary', 'listAssignments', 'getAssignmentSubmissionSummary', 'getStudentSubmissionHistory', 'getApprovedGradeSummary', 'searchLessonPlans', 'getLessonPlan', 'searchExams', 'getAdaptiveProgressSummary', 'getAssistantJobStatus']);
const clean = (v: unknown) => typeof v === 'string' ? v : '';
const limitOf = (v: unknown, max = 50) => Math.min(max, Math.max(1, Number.isInteger(v) ? Number(v) : 20));
const dataOf = (doc: any) => ({ id: doc.id, ...doc.data() });
const latest = (items: any[]) => [...new Map(items.map(x => [x.studentId, x])).values()];
const safeGrade = (g: any) => g?.teacherApproved === true ? { score: g.score, maxScore: g.maxScore, feedback: g.feedback, strengths: g.strengths, weaknesses: g.weaknesses, gradedAt: g.gradedAt, teacherApproved: true } : undefined;
const counts = (roster: any[], submissions: any[]) => {
  const byStudent = latest(submissions.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))));
  const result = { submitted: 0, grading: 0, graded: 0, error: 0, missing: 0, unknown: 0 };
  const seen = new Set<string>();
  for (const item of byStudent) {
    seen.add(item.studentId);
    if (item.status in result && item.status !== 'missing' && item.status !== 'unknown') result[item.status as 'submitted' | 'grading' | 'graded' | 'error']++;
    else result.unknown++;
  }
  result.missing = roster.filter(s => !seen.has(s.id)).length;
  return result;
};
const safeStudent = (s: any) => ({ id: s.id, name: clean(s.name), code: clean(s.code), status: s.status, progress: s.progress });
const assertOwner = (doc: any, uid: string, field = 'teacherId') => { if (!doc || doc[field] !== uid) throw new Error('Resource not found'); };
const queryDocs = async (q: any) => (await q.get()).docs.map(dataOf);

export async function runAssistantReadTool(name: string, args: Record<string, unknown>, actor: AssistantActor, db?: Firestore, observedAt = new Date().toISOString()): Promise<{ data: unknown; sources: Array<{ collection: string; label: string }>; observedAt: string }> {
  if (!READ_TOOLS.has(name as AssistantToolName)) throw new Error('Unsupported read tool');
  const fs: any = db || getAdminDb();
  const uid = actor.firebaseUid;
  const source = (collection: string, label: string) => [{ collection, label }];
  let data: unknown;
  let sources: Array<{ collection: string; label: string }> = [];
  if (name === 'listClasses') {
    const rows = await queryDocs(fs.collection('classes').where('teacherId', '==', uid).limit(limitOf(args.limit)));
    data = rows.filter((x: any) => x.teacherId === uid).map((x: any) => ({ id: x.id, name: x.name, grade: x.grade, track: x.track, studentCount: x.studentCount, updatedAt: x.updatedAt })); sources = source('classes', 'Lớp học');
  } else if (name === 'getClassSummary' || name === 'listStudents' || name === 'getStudentTeacherSummary') {
    const classId = clean(args.classId); if (!classId) throw new Error('classId required');
    const ref = fs.collection('classes').doc(classId); const snap = await ref.get(); const cls = snap.exists ? { id: snap.id, ...snap.data() } : null; assertOwner(cls, uid);
    const students = await queryDocs(ref.collection('students'));
    if (name === 'listStudents') data = students.filter((x: any) => x.teacherId === uid && x.classId === classId).map(safeStudent);
    else if (name === 'getStudentTeacherSummary') { const studentId = clean(args.studentId); const student = students.find((x: any) => x.id === studentId); if (!student || student.teacherId !== uid || student.classId !== classId) throw new Error('Resource not found'); data = safeStudent(student); }
    else { const assignments = await queryDocs(fs.collection('assignments').where('teacherId', '==', uid).where('classId', '==', classId)); const submissions = await queryDocs(fs.collection('submissions').where('teacherId', '==', uid).where('classId', '==', classId)); data = { id: cls!.id, name: cls!.name, grade: cls!.grade, students: students.filter((x: any) => x.teacherId === uid && x.classId === classId).length, assignments: assignments.filter((x: any) => x.teacherId === uid).length, submissions: counts(students.filter((x: any) => x.teacherId === uid && x.classId === classId).map((x: any) => ({ ...x, id: x.id })), submissions.filter((x: any) => x.teacherId === uid)) }; }
    sources = source('classes', 'Lớp học');
  } else if (name === 'listAssignments' || name === 'getAssignmentSubmissionSummary') {
    const query = fs.collection('assignments').where('teacherId', '==', uid);
    const rows = name === 'getAssignmentSubmissionSummary' && clean(args.assignmentId) ? await queryDocs(query.limit(100)) : await queryDocs(clean(args.classId) ? query.where('classId', '==', clean(args.classId)).limit(limitOf(args.limit)) : query.limit(limitOf(args.limit)));
    if (name === 'listAssignments') data = rows.filter((x: any) => x.teacherId === uid).map((x: any) => ({ id: x.id, classId: x.classId, title: x.title, type: x.type, dueAt: x.dueAt, isOpen: x.isOpen }));
    else { const assignment = rows.find((x: any) => x.id === args.assignmentId); assertOwner(assignment, uid); const [roster, submissions] = await Promise.all([queryDocs(fs.collection('classes').doc(assignment.classId).collection('students')), queryDocs(fs.collection('submissions').where('teacherId', '==', uid).where('assignmentId', '==', assignment.id))]); data = { assignmentId: assignment.id, counts: counts(roster.filter((s: any) => s.teacherId === uid && s.classId === assignment.classId).map((s: any) => ({ ...s, id: s.id })), submissions.filter((s: any) => s.teacherId === uid && s.assignmentId === assignment.id)) }; }
    sources = source(name === 'listAssignments' ? 'assignments' : 'submissions', 'Bài tập');
  } else if (name === 'getStudentSubmissionHistory' || name === 'getApprovedGradeSummary') {
    const studentId = clean(args.studentId); if (!studentId) throw new Error('studentId required');
    const rows = await queryDocs(fs.collection('submissions').where('teacherId', '==', uid).where('studentId', '==', studentId).limit(limitOf(args.limit, 100)));
    const safe = rows.filter((x: any) => x.teacherId === uid && x.studentId === studentId).map((x: any) => ({ id: x.id, assignmentId: x.assignmentId, classId: x.classId, status: x.status, createdAt: x.createdAt, updatedAt: x.updatedAt, ...(safeGrade(x.grade) ? { grade: safeGrade(x.grade) } : {}) }));
    data = name === 'getApprovedGradeSummary' ? safe.filter((x: any) => x.grade).map((x: any) => ({ id: x.id, assignmentId: x.assignmentId, grade: x.grade })) : safe; sources = source('submissions', 'Bài nộp');
  } else if (name === 'searchLessonPlans' || name === 'getLessonPlan') {
    const query = fs.collection('lessonPlans').where('userId', '==', uid);
    const rows = name === 'getLessonPlan' ? await queryDocs(query.limit(100)) : await queryDocs(query.limit(100));
    const owned = rows.filter((x: any) => x.userId === uid);
    if (name === 'getLessonPlan') { const plan = owned.find((x: any) => x.id === args.lessonPlanId); if (!plan) throw new Error('Resource not found'); data = { id: plan.id, title: plan.title, subject: plan.subject, grade: plan.grade, updatedAt: plan.updatedAt, content: clean(plan.content).slice(0, 12000) }; }
    else { const term = clean(args.query).toLocaleLowerCase(); data = owned.filter((x: any) => !term || `${x.title || ''} ${x.content || ''}`.toLocaleLowerCase().includes(term)).slice(0, limitOf(args.limit, 100)).map((x: any) => ({ id: x.id, title: x.title, subject: x.subject, grade: x.grade, updatedAt: x.updatedAt, snippet: clean(x.content).slice(0, 240) })); }
    sources = source('lessonPlans', 'Giáo án');
  } else if (name === 'searchExams') {
    const rows = await queryDocs(fs.collection('exams').where('teacherId', '==', uid).limit(100)); const term = clean(args.query).toLocaleLowerCase(); data = rows.filter((x: any) => x.teacherId === uid && (!term || clean(x.title).toLocaleLowerCase().includes(term))).slice(0, limitOf(args.limit, 100)).map((x: any) => ({ id: x.id, title: x.title, subject: x.subject, grade: x.grade, createdAt: x.createdAt, updatedAt: x.updatedAt })); sources = source('exams', 'Đề kiểm tra');
  } else if (name === 'getAdaptiveProgressSummary') {
    const rows = await queryDocs(fs.collection('studentLearningProfiles').where('teacherId', '==', uid).limit(100)); const profiles = rows.filter((x: any) => x.teacherId === uid); const topics = profiles.flatMap((p: any) => Array.isArray(p.topics) ? p.topics : []); data = { students: profiles.length, topics: topics.length, mastery: { weak: topics.filter((x: any) => x.level === 'weak').length, developing: topics.filter((x: any) => x.level === 'developing').length, solid: topics.filter((x: any) => x.level === 'solid').length }, sessions: profiles.reduce((n: number, p: any) => n + (Number.isFinite(p.sessionCount) ? p.sessionCount : 0), 0) }; sources = source('studentLearningProfiles', 'Tiến độ thích ứng');
  } else if (name === 'getAssistantJobStatus') {
    const jobId = clean(args.jobId); if (!jobId) throw new Error('jobId required'); const snap = await fs.collection('assistantJobs').doc(jobId).get(); const job = snap.exists ? snap.data() : null; assertOwner(job, uid, 'actorUid'); data = { status: job.status, toolName: job.toolName, createdAt: job.createdAt, updatedAt: job.updatedAt }; sources = source('assistantJobs', 'Tác vụ trợ lý');
  }
  return { data, sources, observedAt };
}
