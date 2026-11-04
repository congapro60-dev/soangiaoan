import type { Firestore } from 'firebase-admin/firestore';
import type { AssistantActor, AssistantToolName } from './_assistant-types.js';
import { getAdminDb } from './_exam-core.js';
import { canActorAccessSharedResource } from './_assistant-auth.js';

const SUBMISSION_STATUSES = ['submitted', 'grading', 'graded', 'error'];
const READ_TOOLS = new Set<AssistantToolName>(['listClasses', 'getClassSummary', 'listStudents', 'getStudentTeacherSummary', 'listAssignments', 'getAssignmentSubmissionSummary', 'getStudentSubmissionHistory', 'getApprovedGradeSummary', 'searchLessonPlans', 'getLessonPlan', 'searchExams', 'getAdaptiveProgressSummary', 'getAssistantJobStatus']);
const MAX_ROWS = 500;
const clean = (v: unknown, max = 2000) => typeof v === 'string' ? v.slice(0, max) : '';
const safeId = (v: unknown): string | undefined => typeof v === 'string' && v.trim().length > 0 && v.length <= 256 && !/[\u0000-\u001f\u007f/]/.test(v) ? v : undefined;
const optionalId = (key: string, value: unknown) => safeId(value) ? { [key]: value } : {};
const TOOL_NAMES = new Set(['listClasses', 'getClassSummary', 'listStudents', 'getStudentTeacherSummary', 'listAssignments', 'getAssignmentSubmissionSummary', 'getStudentSubmissionHistory', 'getApprovedGradeSummary', 'searchLessonPlans', 'getLessonPlan', 'searchExams', 'getAdaptiveProgressSummary', 'getAssistantJobStatus', 'draftLesson', 'patchLessonSection', 'exportLesson', 'uploadLessonToDrive', 'createAssignment', 'startAssignmentGrading', 'approveGrade', 'editGrade', 'sendTeacherMessage', 'sendParentMessage', 'revokeStudentAccess', 'replaceDriveFile']);
const optionalToolName = (value: unknown) => typeof value === 'string' && TOOL_NAMES.has(value) ? { toolName: value } : {};
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
const safeStudent = (s: any, includePerformance = true) => ({
  ...optionalId('id', s.id), name: clean(s.name, 200), code: clean(s.code, 80),
  ...(includePerformance && ['active', 'needs_support', 'excellent'].includes(s.status) ? { status: s.status } : {}),
  ...(includePerformance && typeof s.progress === 'number' && Number.isFinite(s.progress) && s.progress >= 0 && s.progress <= 100 ? { progress: s.progress } : {}),
});
const queryDocs = async (q: any, limit: number) => {
  const snap = await q.limit(limit + 1).get();
  const truncated = snap.docs.length > limit;
  return { rows: snap.docs.slice(0, limit).map(dataOf), complete: !truncated, truncated };
};
const docById = async (collection: any, id: string) => {
  const snap = await collection.doc(id).get();
  return snap.exists ? { ...snap.data(), id: snap.id } : null;
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
    return { ...optionalId('assignmentId', assignment.id), counts };
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
    data = { items: rows.filter((x: any) => x.teacherId === uid).map((x: any) => ({ ...optionalId('id', x.id), ...optionalString('name', x.name, 200), ...optionalString('grade', x.grade, 40), ...optionalString('track', x.track, 100), ...optionalCount(x.studentCount), ...optionalString('updatedAt', x.updatedAt, 100) })), complete, truncated }; sources = sourcesFor('classes');
  } else if (name === 'getClassSummary' || name === 'listStudents' || name === 'getStudentTeacherSummary') {
    const classId = safeId(args.classId); if (!classId) throw new Error('classId required');
    const cls = await docById(fs.collection('classes'), classId);
    if (!cls) throw new Error('Resource not found');
    const classSharedReadOnly = cls.teacherId !== uid && ['getClassSummary', 'listStudents'].includes(name) && await canActorAccessSharedResource(uid, cls.teacherId, 'class', classId, 'read', db);
    if (!classSharedReadOnly) assertOwner(cls, uid);
    const resourceUid = cls.teacherId;
    if (name === 'getStudentTeacherSummary') {
      const studentId = safeId(args.studentId); if (!studentId) throw new Error('studentId required');
      const student = await docById(fs.collection('classes').doc(classId).collection('students'), studentId);
      if (!student || student.teacherId !== resourceUid || student.classId !== classId || classSharedReadOnly) throw new Error('Resource not found');
      data = safeStudent(student);
    } else {
      const rosterResult = await queryDocs(fs.collection('classes').doc(classId).collection('students'), name === 'listStudents' ? limitOf(args.limit) : MAX_ROWS);
      const roster = rosterResult.rows.filter((x: any) => x.teacherId === resourceUid && x.classId === classId);
      if (name === 'listStudents') data = { items: roster.map((student: any) => safeStudent(student, !classSharedReadOnly)), complete: rosterResult.complete, truncated: rosterResult.truncated };
      else {
      const assignmentResult = await queryDocs(fs.collection('assignments').where('teacherId', '==', resourceUid).where('classId', '==', classId), MAX_ROWS);
      const assignments = assignmentResult.rows.filter((x: any) => x.teacherId === resourceUid && x.classId === classId);
      const submissionResult = await queryDocs(fs.collection('submissions').where('teacherId', '==', resourceUid), MAX_ROWS);
      const assignmentIds = new Set(assignments.map((x: any) => x.id));
      const submissions = submissionResult.rows.filter((x: any) => x.teacherId === resourceUid && (assignmentIds.has(x.assignmentId) || x.classId === classId));
      const counts = submissionCounts(roster, assignments, submissions);
      data = { ...optionalId('id', cls.id), ...optionalString('name', cls.name, 200), ...optionalString('grade', cls.grade, 40), ...optionalString('track', cls.track, 100), ...optionalString('updatedAt', cls.updatedAt, 100), students: roster.length, assignments: assignments.length, submissions: counts, complete: rosterResult.complete && assignmentResult.complete && submissionResult.complete, truncated: rosterResult.truncated || assignmentResult.truncated || submissionResult.truncated };
      }
    }
    sources = sourcesFor('classes', `classes/${classId}/students`, ...(name === 'getClassSummary' ? ['assignments', 'submissions'] : []));
  } else if (name === 'listAssignments' || name === 'getAssignmentSubmissionSummary') {
    if (name === 'getAssignmentSubmissionSummary') {
      const assignmentId = safeId(args.assignmentId); if (!assignmentId) throw new Error('assignmentId required');
      const assignment = await docById(fs.collection('assignments'), assignmentId); if (!assignment) throw new Error('Resource not found');
      const cls = await docById(fs.collection('classes'), safeId(assignment.classId) || '');
      if (!cls || assignment.teacherId !== cls.teacherId || assignment.classId !== cls.id) throw new Error('Resource not found');
      const sharedRead = cls?.teacherId !== uid && cls && await canActorAccessSharedResource(uid, cls.teacherId, 'class', cls.id, 'read', db);
      if (!sharedRead) { assertOwner(assignment, uid); assertOwner(cls, uid); }
      const resourceUid = cls.teacherId;
      const [rosterResult, submissionsResult] = await Promise.all([
        queryDocs(fs.collection('classes').doc(cls.id).collection('students'), MAX_ROWS),
        queryDocs(fs.collection('submissions').where('teacherId', '==', resourceUid).where('assignmentId', '==', assignment.id), MAX_ROWS),
      ]);
      const roster = rosterResult.rows.filter((s: any) => s.teacherId === resourceUid && s.classId === cls.id);
      const submissions = submissionsResult.rows.filter((s: any) => s.teacherId === resourceUid && s.assignmentId === assignment.id);
      data = { ...optionalId('assignmentId', assignment.id), counts: submissionCounts(roster, [assignment], submissions).perAssignment[0].counts, complete: rosterResult.complete && submissionsResult.complete, truncated: rosterResult.truncated || submissionsResult.truncated };
      sources = sourcesFor('assignments', 'classes', `classes/${cls.id}/students`, 'submissions');
    } else {
      const classId = safeId(args.classId);
      const cls = classId ? await docById(fs.collection('classes'), classId) : undefined;
      const sharedRead = !!cls && cls.teacherId !== uid && await canActorAccessSharedResource(uid, cls.teacherId, 'class', classId!, 'read', db);
      if (sharedRead) {
        const { rows, complete, truncated } = await queryDocs(fs.collection('assignments').where('teacherId', '==', cls.teacherId).where('classId', '==', classId), limitOf(args.limit));
        data = { items: rows.filter((x: any) => x.teacherId === cls.teacherId && x.classId === classId).map((x: any) => ({ ...optionalId('id', x.id), ...optionalId('classId', x.classId), ...optionalString('title', x.title, 300), ...optionalString('type', x.type, 80), ...optionalString('dueAt', x.dueAt, 100), ...(typeof x.isOpen === 'boolean' ? { isOpen: x.isOpen } : {}) })), complete, truncated }; sources = sourcesFor('assignments');
      } else {
      if (cls && cls.teacherId !== uid) throw new Error('Resource not found');
      const query = fs.collection('assignments').where('teacherId', '==', uid);
      const filtered = classId ? query.where('classId', '==', classId) : query;
      const { rows, complete, truncated } = await queryDocs(filtered, limitOf(args.limit));
      data = { items: rows.filter((x: any) => x.teacherId === uid).map((x: any) => ({ ...optionalId('id', x.id), ...optionalId('classId', x.classId), ...optionalString('title', x.title, 300), ...optionalString('type', x.type, 80), ...optionalString('dueAt', x.dueAt, 100), ...(typeof x.isOpen === 'boolean' ? { isOpen: x.isOpen } : {}) })), complete, truncated }; sources = sourcesFor('assignments');
      }
    }
  } else if (name === 'getStudentSubmissionHistory' || name === 'getApprovedGradeSummary') {
    const studentId = safeId(args.studentId); if (!studentId) throw new Error('studentId required');
    const approved = name === 'getApprovedGradeSummary';
    let rows: any[] = []; let complete = true; let truncated = false;
    const classId = safeId(args.classId);
    if (classId) {
      const cls = await docById(fs.collection('classes'), classId);
      const sharedRead = !!cls && cls.teacherId !== uid && await canActorAccessSharedResource(uid, cls.teacherId, 'class', classId, 'read', db);
      if (!cls || cls.teacherId !== uid && !sharedRead) throw new Error('Resource not found');
      const member = await docById(fs.collection('classes').doc(classId).collection('students'), studentId);
      if (!member || member.teacherId !== cls.teacherId || member.classId !== classId) throw new Error('Resource not found');
      const query = fs.collection('submissions').where('teacherId', '==', cls.teacherId).where('studentId', '==', studentId).where('classId', '==', classId);
      ({ rows, complete, truncated } = await queryDocs(approved ? query.where('grade.teacherApproved', '==', true) : query, limitOf(args.limit, 100)));
      rows = rows.filter((x: any) => x.teacherId === cls.teacherId && x.studentId === studentId && x.classId === classId);
    } else {
      const query = fs.collection('submissions').where('teacherId', '==', uid).where('studentId', '==', studentId);
      ({ rows, complete, truncated } = await queryDocs(approved ? query.where('grade.teacherApproved', '==', true) : query, limitOf(args.limit, 100)));
      rows = rows.filter((x: any) => x.teacherId === uid && x.studentId === studentId);
    }
    const safe = rows.map((x: any) => ({ ...optionalId('id', x.id), ...optionalId('assignmentId', x.assignmentId), ...optionalId('classId', x.classId), status: SUBMISSION_STATUSES.includes(x.status) ? x.status : 'unknown', createdAt: x.createdAt, updatedAt: x.updatedAt, ...(safeGrade(x.grade) ? { grade: safeGrade(x.grade) } : {}) }));
    data = { items: approved ? safe.filter((x: any) => x.grade).map((x: any) => ({ ...optionalId('id', x.id), ...optionalId('assignmentId', x.assignmentId), grade: x.grade })) : safe, complete, truncated }; sources = sourcesFor('submissions');
  } else if (name === 'searchLessonPlans' || name === 'getLessonPlan') {
    if (name === 'getLessonPlan') {
      const id = safeId(args.lessonPlanId); if (!id) throw new Error('lessonPlanId required');
      const plan = await docById(fs.collection('lessonPlans'), id); if (!plan) throw new Error('Resource not found');
      if (plan.userId !== uid && !await canActorAccessSharedResource(uid, plan.userId, 'lessonPlan', id, 'read', db)) throw new Error('Resource not found');
      data = { ...optionalId('id', plan.id), title: clean(plan.title, 300), subject: clean(plan.subject, 100), grade: clean(plan.grade, 40), updatedAt: clean(plan.updatedAt, 100), content: redactTokenUrls(plan.content, 12000) }; sources = sourcesFor('lessonPlans');
    } else {
      const { rows, complete, truncated } = await queryDocs(fs.collection('lessonPlans').where('userId', '==', uid), limitOf(args.limit, 100));
      const term = clean(args.query, 200).toLocaleLowerCase();
      data = { items: rows.filter((x: any) => x.userId === uid && (!term || `${x.title || ''} ${x.content || ''}`.toLocaleLowerCase().includes(term))).map((x: any) => ({ ...optionalId('id', x.id), title: clean(x.title, 300), subject: clean(x.subject, 100), grade: clean(x.grade, 40), updatedAt: clean(x.updatedAt, 100), snippet: redactTokenUrls(x.content, 240) })), complete, truncated }; sources = sourcesFor('lessonPlans');
    }
  } else if (name === 'searchExams') {
    const { rows, complete, truncated } = await queryDocs(fs.collection('exams').where('teacherId', '==', uid), limitOf(args.limit, 100));
    const term = clean(args.query, 200).toLocaleLowerCase();
    data = { items: rows.filter((x: any) => x.teacherId === uid && (!term || clean(x.title).toLocaleLowerCase().includes(term))).map((x: any) => ({ ...optionalId('id', x.id), title: clean(x.title, 300), subject: clean(x.subject, 100), grade: clean(x.grade, 40), createdAt: clean(x.createdAt, 100), updatedAt: clean(x.updatedAt, 100) })), complete, truncated }; sources = sourcesFor('exams');
  } else if (name === 'getAdaptiveProgressSummary') {
    const { rows, complete, truncated } = await queryDocs(fs.collection('studentLearningProfiles').where('teacherId', '==', uid), MAX_ROWS);
    const profiles = rows.filter((x: any) => x.teacherId === uid);
    const topics = profiles.flatMap((p: any) => Array.isArray(p.topics) ? p.topics.slice(0, 100) : []);
    const topicTruncated = profiles.some((p: any) => Array.isArray(p.topics) && p.topics.length > 100); data = { students: profiles.length, topics: topics.length, mastery: { weak: topics.filter((x: any) => x?.level === 'weak').length, developing: topics.filter((x: any) => x?.level === 'developing').length, solid: topics.filter((x: any) => x?.level === 'solid').length }, sessions: profiles.reduce((n: number, p: any) => n + (Number.isFinite(p.totalSessions) && p.totalSessions >= 0 ? p.totalSessions : 0), 0), complete: complete && !topicTruncated, truncated: truncated || topicTruncated }; sources = sourcesFor('studentLearningProfiles');
  } else if (name === 'getAssistantJobStatus') {
    const jobId = safeId(args.jobId); if (!jobId) throw new Error('jobId required'); const job = await docById(fs.collection('assistantJobs'), jobId); assertOwner(job, uid, 'actorUid'); if (job.linkId !== actor.linkId) throw new Error('Resource not found'); data = { status: ['queued', 'running', 'succeeded', 'failed', 'cancelled'].includes(job.status) ? job.status : 'unknown', ...optionalToolName(job.toolName), createdAt: job.createdAt, updatedAt: job.updatedAt }; sources = sourcesFor('assistantJobs');
  }
  return { data, sources, observedAt };
}
