import type { Firestore } from 'firebase-admin/firestore';
import type { AssistantActor, AssistantToolName } from './_assistant-types.js';
import { getAdminDb } from './_exam-core.js';

const SUBMISSION_STATUSES = ['submitted', 'grading', 'graded', 'error'];
const READ_TOOLS = new Set<AssistantToolName>(['listClasses', 'getClassSummary', 'listStudents', 'getStudentTeacherSummary', 'listAssignments', 'getAssignmentSubmissionSummary', 'getStudentSubmissionHistory', 'getApprovedGradeSummary', 'searchLessonPlans', 'getLessonPlan', 'searchExams', 'getAdaptiveProgressSummary', 'getAssistantJobStatus']);
const MAX_ROWS = 500;
const clean = (v: unknown, max = 2000) => typeof v === 'string' ? v.slice(0, max) : '';
const redactTokenUrls = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, 12000) : '').replace(/https?:\/\/[^\s<>"']+/gi, url => {
  const trailing = url.match(/[)\].,!?;:]+$/)?.[0] || '';
  const link = trailing ? url.slice(0, -trailing.length) : url;
  return /[?&](?:amp;)?token=/i.test(link) ? '[liên kết riêng tư đã ẩn]' + trailing : url;
}).slice(0, max);
const optionalString = (key: string, value: unknown, max: number) => typeof value === 'string' ? { [key]: clean(value, max) } : {};
const optionalCount = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? { studentCount: value } : {};
const limitOf = (v: unknown, max = 50) => Math.min(max, Math.max(1, Number.isInteger(v) ? Number(v) : 20));
const dataOf = (doc: any) => ({ ...doc.data(), id: doc.id });
const assertOwner = (doc: any, uid: string, field = 'teacherId') => { if (!doc || doc[field] !== uid) throw new Error('Resource not found'); };
const safeGrade = (g: any) => {
  if (g?.teacherApproved !== true) return undefined;
  const result: Record<string, unknown> = { teacherApproved: true };
  for (const key of ['score', 'maxScore'] as const) if (Number.isFinite(g[key]) && g[key] >= 0 && g[key] <= 10000) result[key] = g[key];
  for (const key of ['feedback', 'gradedAt'] as const) if (typeof g[key] === 'string') result[key] = clean(g[key], key === 'feedback' ? 2000 : 100);
  for (const key of ['strengths', 'weaknesses'] as const) if (Array.isArray(g[key])) result[key] = g[key].slice(0, 20).filter((x: unknown) => typeof x === 'string').map((x: string) => clean(x, 300));
  return result;
};
const safeStudent = (s: any) => ({
  id: clean(s.id, 200), name: clean(s.name, 200), code: clean(s.code, 80),
  ...(['active', 'needs_support', 'excellent'].includes(s.status) ? { status: s.status } : {}),
  ...(typeof s.progress === 'number' && Number.isFinite(s.progress) && s.progress >= 0 && s.progress <= 100 ? { progress: s.progress } : {}),
});
const queryDocs = async (q: any, limit: number) => {
  const snap = await q.limit(limit + 1).get();
  const truncated = snap.docs.length > limit;
  return { rows: snap.docs.slice(0, limit).map(dataOf), complete: !truncated, truncated };
};
const docById = async (collection: any, id: string) => {
  const snap = await collection.doc(id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
};
const sourcesFor = (...collections: string[]) => [...new Set(collections)].map(collection => ({ collection, label: collection }));

function submissionCounts(roster: any[], assignments: any[], submissions: any[]) {
  const statuses = ['submitted', 'grading', 'graded', 'error'];
  const aggregate = { submitted: 0, grading: 0, graded: 0, error: 0, missing: 0, unknown: 0 };
  const perAssignment = assignments.map(assignment => {
    const members = new Set(roster.filter(s => s.classId === assignment.classId).map(s => s.id));
    const latest = new Map<string, any>();
    const unknownPairs = new Set<string>();
    for (const item of submissions.filter(x => x.assignmentId === assignment.id)) {
      if (!item.studentId || !members.has(item.studentId) || item.classId !== assignment.classId) { unknownPairs.add(item.studentId || item.id); continue; }
      const prior = latest.get(item.studentId);
      if (!prior || String(item.updatedAt || '').localeCompare(String(prior.updatedAt || '')) > 0) latest.set(item.studentId, item);
    }
    const counts = { submitted: 0, grading: 0, graded: 0, error: 0, missing: 0, unknown: unknownPairs.size };
    for (const [studentId, item] of latest) {
      if (SUBMISSION_STATUSES.includes(item.status)) counts[item.status as keyof typeof counts]++;
      else counts.unknown++;
    }
    counts.missing = [...members].filter(id => !latest.has(id)).length;
    for (const key of Object.keys(aggregate) as (keyof typeof aggregate)[]) aggregate[key] += counts[key];
    return { assignmentId: assignment.id, counts };
  });
  aggregate.unknown += new Set(submissions.filter(x => !assignments.some(a => a.id === x.assignmentId)).map(x => x.studentId || x.id)).size;
  return { perAssignment, aggregate };
}
export async function runAssistantReadTool(name: string, args: Record<string, unknown>, actor: AssistantActor, db?: Firestore, observedAt = new Date().toISOString()): Promise<{ data: unknown; sources: Array<{ collection: string; label: string }>; observedAt: string }> {
  if (!READ_TOOLS.has(name as AssistantToolName)) throw new Error('Unsupported read tool');
  const fs: any = db || getAdminDb();
  const uid = actor.firebaseUid;
  let data: unknown;
  let sources: Array<{ collection: string; label: string }> = [];
  if (name === 'listClasses') {
    const { rows, complete, truncated } = await queryDocs(fs.collection('classes').where('teacherId', '==', uid), limitOf(args.limit));
    data = { items: rows.filter((x: any) => x.teacherId === uid).map((x: any) => ({ id: x.id, ...optionalString('name', x.name, 200), ...optionalString('grade', x.grade, 40), ...optionalString('track', x.track, 100), ...optionalCount(x.studentCount), ...optionalString('updatedAt', x.updatedAt, 100) })), complete, truncated }; sources = sourcesFor('classes');
  } else if (name === 'getClassSummary' || name === 'listStudents' || name === 'getStudentTeacherSummary') {
    const classId = clean(args.classId, 200); if (!classId) throw new Error('classId required');
    const cls = await docById(fs.collection('classes'), classId); assertOwner(cls, uid);
    if (name === 'getStudentTeacherSummary') {
      const studentId = clean(args.studentId, 200);
      const student = await docById(fs.collection('classes').doc(classId).collection('students'), studentId);
      if (!student || student.teacherId !== uid || student.classId !== classId) throw new Error('Resource not found');
      data = safeStudent(student);
    } else {
      const rosterResult = await queryDocs(fs.collection('classes').doc(classId).collection('students'), name === 'listStudents' ? limitOf(args.limit) : MAX_ROWS);
      const roster = rosterResult.rows.filter((x: any) => x.teacherId === uid && x.classId === classId);
      if (name === 'listStudents') data = { items: roster.map(safeStudent), complete: rosterResult.complete, truncated: rosterResult.truncated };
      else {
      const assignmentResult = await queryDocs(fs.collection('assignments').where('teacherId', '==', uid).where('classId', '==', classId), MAX_ROWS);
      const assignments = assignmentResult.rows.filter((x: any) => x.teacherId === uid && x.classId === classId);
      const submissionResult = await queryDocs(fs.collection('submissions').where('teacherId', '==', uid), MAX_ROWS);
      const assignmentIds = new Set(assignments.map((x: any) => x.id));
      const submissions = submissionResult.rows.filter((x: any) => x.teacherId === uid && (assignmentIds.has(x.assignmentId) || x.classId === classId));
      const counts = submissionCounts(roster, assignments, submissions);
      data = { id: cls.id, ...optionalString('name', cls.name, 200), ...optionalString('grade', cls.grade, 40), ...optionalString('track', cls.track, 100), ...optionalString('updatedAt', cls.updatedAt, 100), students: roster.length, assignments: assignments.length, submissions: counts, complete: rosterResult.complete && assignmentResult.complete && submissionResult.complete, truncated: rosterResult.truncated || assignmentResult.truncated || submissionResult.truncated };
      }
    }
    sources = sourcesFor('classes', `classes/${classId}/students`, ...(name === 'getClassSummary' ? ['assignments', 'submissions'] : []));
  } else if (name === 'listAssignments' || name === 'getAssignmentSubmissionSummary') {
    if (name === 'getAssignmentSubmissionSummary') {
      const assignmentId = clean(args.assignmentId, 200); if (!assignmentId) throw new Error('assignmentId required');
      const assignment = await docById(fs.collection('assignments'), assignmentId); assertOwner(assignment, uid);
      const cls = await docById(fs.collection('classes'), clean(assignment.classId, 200)); assertOwner(cls, uid);
      const [rosterResult, submissionsResult] = await Promise.all([
        queryDocs(fs.collection('classes').doc(cls.id).collection('students'), MAX_ROWS),
        queryDocs(fs.collection('submissions').where('teacherId', '==', uid).where('assignmentId', '==', assignment.id), MAX_ROWS),
      ]);
      const roster = rosterResult.rows.filter((s: any) => s.teacherId === uid && s.classId === cls.id);
      const submissions = submissionsResult.rows.filter((s: any) => s.teacherId === uid && s.assignmentId === assignment.id);
      data = { assignmentId: assignment.id, counts: submissionCounts(roster, [assignment], submissions).perAssignment[0].counts, complete: rosterResult.complete && submissionsResult.complete, truncated: rosterResult.truncated || submissionsResult.truncated };
      sources = sourcesFor('assignments', 'classes', `classes/${cls.id}/students`, 'submissions');
    } else {
      const query = fs.collection('assignments').where('teacherId', '==', uid);
      const filtered = clean(args.classId, 200) ? query.where('classId', '==', clean(args.classId, 200)) : query;
      const { rows, complete, truncated } = await queryDocs(filtered, limitOf(args.limit));
      data = { items: rows.filter((x: any) => x.teacherId === uid).map((x: any) => ({ id: x.id, classId: x.classId, ...optionalString('title', x.title, 300), ...optionalString('type', x.type, 80), ...optionalString('dueAt', x.dueAt, 100), ...(typeof x.isOpen === 'boolean' ? { isOpen: x.isOpen } : {}) })), complete, truncated }; sources = sourcesFor('assignments');
    }
  } else if (name === 'getStudentSubmissionHistory' || name === 'getApprovedGradeSummary') {
    const studentId = clean(args.studentId, 200); if (!studentId) throw new Error('studentId required');
    const query = fs.collection('submissions').where('teacherId', '==', uid).where('studentId', '==', studentId);
    const approved = name === 'getApprovedGradeSummary';
    const { rows, complete, truncated } = await queryDocs(approved ? query.where('grade.teacherApproved', '==', true) : query, limitOf(args.limit, 100));
    const safe = rows.filter((x: any) => x.teacherId === uid && x.studentId === studentId).map((x: any) => ({ id: x.id, assignmentId: x.assignmentId, classId: x.classId, status: SUBMISSION_STATUSES.includes(x.status) ? x.status : 'unknown', createdAt: x.createdAt, updatedAt: x.updatedAt, ...(safeGrade(x.grade) ? { grade: safeGrade(x.grade) } : {}) }));
    data = { items: approved ? safe.filter((x: any) => x.grade).map((x: any) => ({ id: x.id, assignmentId: x.assignmentId, grade: x.grade })) : safe, complete, truncated }; sources = sourcesFor('submissions');
  } else if (name === 'searchLessonPlans' || name === 'getLessonPlan') {
    if (name === 'getLessonPlan') {
      const id = clean(args.lessonPlanId, 200); if (!id) throw new Error('lessonPlanId required');
      const plan = await docById(fs.collection('lessonPlans'), id); assertOwner(plan, uid, 'userId');
      data = { id: plan.id, title: clean(plan.title, 300), subject: clean(plan.subject, 100), grade: clean(plan.grade, 40), updatedAt: clean(plan.updatedAt, 100), content: redactTokenUrls(plan.content, 12000) }; sources = sourcesFor('lessonPlans');
    } else {
      const { rows, complete, truncated } = await queryDocs(fs.collection('lessonPlans').where('userId', '==', uid), limitOf(args.limit, 100));
      const term = clean(args.query, 200).toLocaleLowerCase();
      data = { items: rows.filter((x: any) => x.userId === uid && (!term || `${x.title || ''} ${x.content || ''}`.toLocaleLowerCase().includes(term))).map((x: any) => ({ id: x.id, title: clean(x.title, 300), subject: clean(x.subject, 100), grade: clean(x.grade, 40), updatedAt: clean(x.updatedAt, 100), snippet: redactTokenUrls(x.content, 240) })), complete, truncated }; sources = sourcesFor('lessonPlans');
    }
  } else if (name === 'searchExams') {
    const { rows, complete, truncated } = await queryDocs(fs.collection('exams').where('teacherId', '==', uid), limitOf(args.limit, 100));
    const term = clean(args.query, 200).toLocaleLowerCase();
    data = { items: rows.filter((x: any) => x.teacherId === uid && (!term || clean(x.title).toLocaleLowerCase().includes(term))).map((x: any) => ({ id: x.id, title: clean(x.title, 300), subject: clean(x.subject, 100), grade: clean(x.grade, 40), createdAt: clean(x.createdAt, 100), updatedAt: clean(x.updatedAt, 100) })), complete, truncated }; sources = sourcesFor('exams');
  } else if (name === 'getAdaptiveProgressSummary') {
    const { rows, complete, truncated } = await queryDocs(fs.collection('studentLearningProfiles').where('teacherId', '==', uid), MAX_ROWS);
    const profiles = rows.filter((x: any) => x.teacherId === uid);
    const topics = profiles.flatMap((p: any) => Array.isArray(p.topics) ? p.topics.slice(0, 100) : []);
    const topicTruncated = profiles.some((p: any) => Array.isArray(p.topics) && p.topics.length > 100); data = { students: profiles.length, topics: topics.length, mastery: { weak: topics.filter((x: any) => x?.level === 'weak').length, developing: topics.filter((x: any) => x?.level === 'developing').length, solid: topics.filter((x: any) => x?.level === 'solid').length }, sessions: profiles.reduce((n: number, p: any) => n + (Number.isFinite(p.totalSessions) && p.totalSessions >= 0 ? p.totalSessions : 0), 0), complete: complete && !topicTruncated, truncated: truncated || topicTruncated }; sources = sourcesFor('studentLearningProfiles');
  } else if (name === 'getAssistantJobStatus') {
    const jobId = clean(args.jobId, 200); if (!jobId) throw new Error('jobId required'); const job = await docById(fs.collection('assistantJobs'), jobId); assertOwner(job, uid, 'actorUid'); data = { status: job.status, toolName: job.toolName, createdAt: job.createdAt, updatedAt: job.updatedAt }; sources = sourcesFor('assistantJobs');
  }
  return { data, sources, observedAt };
}
