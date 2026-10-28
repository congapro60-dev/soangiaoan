import { attachAssignmentSolutions } from './_assignment-solutions.js';
import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import type { StudentAssignmentView, SubmissionDoc, QuestionResult } from '../src/lib/classroom/types.js';
import type { ExamSubmission } from '../src/types.js';
import type { StudentWorkspaceSubmission } from '../src/lib/classroom/studentWorkspace.js';
import type { ParentReportPrintInput } from '../src/lib/classroom/parentReportTypes.js';
import { hideUnofficialOnlineScore } from '../src/lib/classroom/onlineGradeLifecycle.js';
import { isActionableClarifyQuestion, isClarifyPending, sanitizeClarify } from '../src/lib/classroom/clarification.js';
import { compareParentReports, isSafeDocId, PARENT_REPORTS_SUB } from '../src/lib/classroom/parentAccess.js';
import { loadLiveSource } from './_parent-live.js';
import { publishedReportInput } from './_published-report.js';
import { COMPETENCY_LEVELS } from '../src/lib/classroom/competency/framework.js';
import { REPORT_KINDS } from '../src/lib/classroom/reportKinds.js';
import { isRealDay } from '../src/lib/classroom/reportPeriod.js';
import discoverManifest from '../src/data/discoverNewKnowledgeLessons.js';
import type { DiscoverNewKnowledgeSeed, StudentDiscoverCatalogItem } from '../src/lib/discover/types.js';
import { stripAnswers } from '../src/lib/adaptive/stripAnswers.js';
import { gradeLibraryAssessment } from './_adaptive-submit.js';
import type { AdaptiveLesson } from '../src/lib/adaptive/types.js';
import { submitAdaptiveAssessment } from './_adaptive-submit.js';
import { resolveHomework, type CloseArtifacts } from '../src/lib/adaptive/closeAssignment.js';

type Data = FirebaseFirestore.DocumentData;
type Db = FirebaseFirestore.Firestore;
type Projectors = {
  projectStudentAssignment(id: string, data: Data): StudentAssignmentView;
  projectStudentSubmission(id: string, data: Data): SubmissionDoc;
};
class WorkspaceError extends Error {
  constructor(readonly statusCode: number, message: string) { super(message); }
}
const text = (value: unknown): string => typeof value === 'string' ? value : '';
const record = (value: unknown): Data => value && typeof value === 'object' && !Array.isArray(value) ? value as Data : {};
const rows = (value: unknown): Data[] => Array.isArray(value) ? value.map(record) : [];

const studentContext = async (db: Db, body: Data) => {
  let uid: string;
  try {
    if (!text(body.idToken)) throw new Error();
    uid = (await getAuth().verifyIdToken(body.idToken)).uid;
  } catch { throw new WorkspaceError(401, 'Phiên đăng nhập học sinh không hợp lệ.'); }
  const link = (await db.collection('studentLinks').doc(uid).get()).data() || {};
  if (![link.classId, link.studentId, link.teacherId].every(isSafeDocId)) {
    throw new WorkspaceError(403, 'Phiên học sinh chưa được xác nhận.');
  }
  const classRef = db.collection('classes').doc(link.classId);
  const [classDoc, studentDoc] = await Promise.all([classRef.get(), classRef.collection('students').doc(link.studentId).get()]);
  if (!classDoc.exists || !studentDoc.exists || classDoc.data()?.teacherId !== link.teacherId) {
    throw new WorkspaceError(403, 'Em không còn thuộc lớp của phiên đăng nhập này.');
  }
  return { classRef, classDoc, studentDoc, studentId: link.studentId as string, classId: link.classId as string, teacherId: link.teacherId as string };
};
type Context = Awaited<ReturnType<typeof studentContext>>;
const visibleAssignment = (data: Data, context: Context): boolean =>
  data.classId === context.classId && data.teacherId === context.teacherId
  && (!Array.isArray(data.targetStudentIds) || data.targetStudentIds.length === 0 || data.targetStudentIds.includes(context.studentId));
const ownSubmission = (data: Data, context: Context): boolean =>
  data.studentId === context.studentId && data.classId === context.classId && data.teacherId === context.teacherId;
const onlineOwn = (data: Data, context: Context): boolean =>
  data.studentId === context.studentId && data.classId === context.classId
  && (!data.teacherId || data.teacherId === context.teacherId);
const newest = <T extends { id: string }>(items: T[], date: (item: T) => string): T[] =>
  items.sort((a, b) => date(b).localeCompare(date(a)) || b.id.localeCompare(a.id));

const normalizeAdaptiveLesson = (raw: unknown, fallbackId: string): AdaptiveLesson | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown> & { lesson?: Record<string, unknown> };
  const lesson = data.lesson && typeof data.lesson === 'object' && !Array.isArray(data.lesson) ? { ...data.lesson } : { ...data };
  if (!lesson.id) lesson.id = typeof data.lessonId === 'string' ? data.lessonId : typeof data.id === 'string' ? data.id : fallbackId;
  if (!lesson.teacherId && typeof data.teacherId === 'string') lesson.teacherId = data.teacherId;
  if (!lesson.title && typeof data.title === 'string') lesson.title = data.title;
  // Bài tạo trước khi tách "tự học / tương tác" không có lessonKind → mặc định tự học (khớp client).
  if (!lesson.lessonKind) lesson.lessonKind = 'self_study';
  return lesson.id ? lesson as unknown as AdaptiveLesson : null;
};

const summary = (id: string, data: Data, project: Projectors['projectStudentSubmission']): StudentWorkspaceSubmission => {
  const submission = project(id, data);
  const { handMarkedEvidence: _evidence, ...summarySubmission } = submission;
  const pending = rows(record(data.grade).questionResults).filter(row => isClarifyPending({ clarify: sanitizeClarify(row.clarify) }));
  const actionable = pending.filter(row => isActionableClarifyQuestion({ ...row, clarify: sanitizeClarify(row.clarify) } as QuestionResult));
  return {
    ...summarySubmission, fileUrls: [], attachments: [], note: '',
    ...(submission.grade ? { grade: {
      score: submission.grade.score, maxScore: submission.grade.maxScore,
      teacherApproved: submission.grade.teacherApproved, scoreHidden: submission.grade.scoreHidden,
      awaitingClarification: submission.grade.awaitingClarification,
      gradedAt: submission.grade.gradedAt, feedback: '', strengths: [], weaknesses: [],
    } } : {}),
    clarificationCount: actionable.length,
    clarificationRegrading: pending.some(row => record(row.clarify).state === 'regrading'),
  };
};

const onlineSummary = (id: string, data: Data, context: Context): ExamSubmission => hideUnofficialOnlineScore({
  id, examId: text(data.examId), examCode: '', studentName: '', studentClass: '',
  classId: context.classId, studentId: context.studentId, assignmentId: text(data.assignmentId),
  startedAt: text(data.startedAt), ...(data.submittedAt ? { submittedAt: text(data.submittedAt) } : {}),
  answers: [], maxScore: typeof data.maxScore === 'number' ? data.maxScore : 0,
  ...(typeof data.totalScore === 'number' ? { totalScore: data.totalScore } : {}),
  status: ['in_progress', 'submitted', 'graded'].includes(data.status) ? data.status : 'submitted',
  ...(['official', 'provisional', 'pending_teacher_review'].includes(data.gradeState) ? { gradeState: data.gradeState } : {}),
  ...(['automatic', 'ai', 'teacher', 'mixed'].includes(data.gradingSource) ? { gradingSource: data.gradingSource } : {}),
  ...(['teacher', 'automatic_policy'].includes(data.approvalMode) ? { approvalMode: data.approvalMode } : {}),
  ...(record(data.grade).teacherApproved === true ? { grade: {
    score: Number(record(data.grade).score) || 0, maxScore: Number(record(data.grade).maxScore) || 0,
    teacherApproved: true, gradedAt: text(record(data.grade).gradedAt), feedback: '', strengths: [], weaknesses: [],
  } } : {}),
});

// Explicit nested allowlist: no unknown field from a saved report can escape in either portal's student projection.
type Schema = 'string' | 'number' | 'boolean' | { [key: string]: Schema } | readonly [Schema];
const resultSchema: Schema = { assignmentId: 'string', title: 'string', status: 'string', submittedAt: 'string', dueAt: 'string', score: 'number', maxScore: 'number' };
const markSchema: Schema = { label: 'string', score: 'number', letter: 'string' };
const sideSchema: Schema = { label: 'string', avgPercent: 'number', count: 'number' };
const reportSchema: Schema = {
  studentName: 'string', className: 'string', studentCode: 'string', generatedOn: 'string', teacherComment: 'string',
  report: {
    studentId: 'string', studentName: 'string', className: 'string', results: [resultSchema], officialCount: 'number',
    officialAveragePercent: 'number', pendingCount: 'number', missingCount: 'number', strengths: ['string'], areasToPractice: ['string'],
    progress: { trend: 'string', firstPercent: 'number', latestPercent: 'number' }, overallSummary: 'string',
    parentActions: ['string'], teacherActions: ['string'],
  },
  competency: { grade: 'string', assessed: 'number', total: 'number', items: [{ area: 'string', topic: 'string', level: 'string' }] },
  exams: { moet: [markSchema], tds: [markSchema] },
  hs1: [{ label: 'string', date: 'string', score: 'number', weight: 'number' }],
  period: { title: 'string', range: 'string', kind: 'string' }, comparison: { before: sideSchema, after: sideSchema },
  monthly: [{ month: 'string', label: 'string', avgPercent: 'number', count: 'number' }],
  requirements: [{ id: 'string', level: 'string', evidence: 'number', percent: 'number', note: 'string', questions: [{ code: 'string', score: 'number', max: 'number', test: 'boolean' }] }],
  weekPlan: { week1Monday: 'string', skippedWeeks: ['string'] },
  branding: { schoolName: 'string', teacherName: 'string', logoDataUrl: 'string' },
};
const allow = (value: unknown, schema: Schema): unknown => {
  if (value === null) return null;
  if (typeof schema === 'string') return typeof value === schema && (schema !== 'number' || Number.isFinite(value)) ? value : undefined;
  if (Array.isArray(schema)) return Array.isArray(value) ? value.map(item => allow(item, schema[0])).filter(item => item !== undefined && item !== null) : undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return Object.fromEntries(Object.entries(schema).flatMap(([key, child]) => {
    const projected = allow(record(value)[key], child);
    return projected === undefined ? [] : [[key, projected]];
  }));
};
const hasFields = (value: unknown, strings: string[], numbers: string[] = []): boolean =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))
  && strings.every(key => typeof record(value)[key] === 'string')
  && numbers.every(key => typeof record(value)[key] === 'number' && Number.isFinite(record(value)[key]));
const validArray = (value: unknown, check: (row: unknown) => boolean): boolean => Array.isArray(value) && value.every(check);
const validReportShape = (input: Data): boolean => {
  const report = record(input.report);
  const result = (row: unknown) => hasFields(row, ['assignmentId', 'title', 'status'])
    && ['official', 'pending', 'grading', 'error', 'not_submitted'].includes(record(row).status)
    && ['score', 'maxScore'].every(key => record(row)[key] === null || typeof record(row)[key] === 'number');
  const side = (row: unknown) => hasFields(row, ['label'], ['count']) && (record(row).avgPercent === null || typeof record(row).avgPercent === 'number');
  return hasFields(input, ['studentName', 'className'])
    && hasFields(report, ['studentId', 'studentName', 'className', 'overallSummary'], ['officialCount', 'pendingCount', 'missingCount'])
    && validArray(report.results, result)
    && ['strengths', 'areasToPractice', 'parentActions', 'teacherActions'].every(key => validArray(report[key], value => typeof value === 'string'))
    && ['up', 'flat', 'down', 'not_enough_data'].includes(record(report.progress).trend)
    && (report.officialAveragePercent === null || typeof report.officialAveragePercent === 'number')
    && (!input.competency || (hasFields(input.competency, ['grade'], ['assessed', 'total'])
      && validArray(record(input.competency).items, value => hasFields(value, ['area', 'topic', 'level']) && (COMPETENCY_LEVELS as readonly string[]).includes(record(value).level))))
    && (!input.exams || ['moet', 'tds'].every(key => validArray(record(input.exams)[key], value => hasFields(value, ['label'], ['score']))))
    && (!input.hs1 || validArray(input.hs1, value => hasFields(value, ['label', 'date'], ['score'])))
    && (!input.period || (hasFields(input.period, ['title', 'range', 'kind']) && [...REPORT_KINDS.map(item => item.kind), 'custom'].includes(record(input.period).kind)))
    && (!input.comparison || (side(record(input.comparison).before) && side(record(input.comparison).after)))
    && (!input.monthly || validArray(input.monthly, value => hasFields(value, ['month', 'label'], ['avgPercent', 'count'])))
    && (!input.requirements || validArray(input.requirements, value => hasFields(value, ['id', 'level', 'note'], ['evidence', 'percent'])
      && ['vung', 'dang', 'chua'].includes(record(value).level)
      && (!record(value).questions || validArray(record(value).questions, q => hasFields(q, ['code'], ['score', 'max'])))))
    && (!input.weekPlan || (hasFields(input.weekPlan, ['week1Monday']) && isRealDay(record(input.weekPlan).week1Monday)
      && validArray(record(input.weekPlan).skippedWeeks, value => typeof value === 'string' && isRealDay(value))));
};
export const projectStudentReport = (value: unknown, studentId: string): ParentReportPrintInput | null => {
  const input = record(value);
  const report = record(input.report);
  if (report.studentId !== studentId || !validReportShape(input)) return null;
  const projected = allow(value, reportSchema);
  return validReportShape(record(projected)) ? projected as ParentReportPrintInput : null;
};
const reportMeta = (id: string, data: Data) => ({
  id, kind: text(data.kind), from: text(data.from), to: text(data.to), title: text(data.title), range: text(data.range), publishedAt: text(data.publishedAt),
});

const studentDiscoverCatalog = (grade: string): StudentDiscoverCatalogItem[] =>
  (discoverManifest as readonly DiscoverNewKnowledgeSeed[])
    .filter(seed => seed.grade === grade)
    .map(seed => ({
      id: seed.id,
      title: seed.text.split(' / ')[0]?.trim() || seed.text,
      grade: seed.grade,
      week: seed.week,
      period: seed.period,
      status: 'available' as const,
    }));

export const handleStudentWorkspaceAction = async (db: Db, body: Data, res: VercelResponse, projectors: Projectors): Promise<boolean> => {
  if (!['studentWorkspace', 'studentAssignmentDetail', 'studentReports', 'studentReport', 'studentDiscoverCatalog', 'studentAdaptiveList', 'studentAdaptiveOpen', 'studentAdaptiveSubmit', 'studentAdaptiveClosed', 'studentAdaptiveLibraryOpen', 'studentAdaptiveLibrarySubmit'].includes(body.action)) return false;
  try {
    const context = await studentContext(db, body);
    if (body.action === 'studentDiscoverCatalog') {
      res.status(200).json({ catalog: studentDiscoverCatalog(text(context.classDoc.data()?.grade)) });
      return true;
    }
    if (body.action === 'studentReports' || body.action === 'studentReport') {
      if (body.action === 'studentReports') {
        const snap = await context.classRef.collection(PARENT_REPORTS_SUB).where('studentId', '==', context.studentId).get();
        const reports = snap.docs.filter(doc => text(doc.data().publishedAt)).map(doc => reportMeta(doc.id, doc.data())).sort(compareParentReports);
        res.status(200).json({ reports });
      } else {
        if (!isSafeDocId(body.reportId)) throw new WorkspaceError(400, 'Mã báo cáo không hợp lệ.');
        const doc = await context.classRef.collection(PARENT_REPORTS_SUB).doc(body.reportId).get();
        const data = doc.data() || {};
        if (!doc.exists || data.studentId !== context.studentId || !text(data.publishedAt)) throw new WorkspaceError(404, 'Báo cáo chưa được công bố cho em.');
        // Gate the original snapshot before live merge: live numbers must not mask another student's saved remarks.
        if (!projectStudentReport(publishedReportInput({ ...data, live: false, overridesJson: undefined }, null), context.studentId)) {
          throw new WorkspaceError(404, 'Bản báo cáo này chưa sẵn sàng.');
        }
        let live: Awaited<ReturnType<typeof loadLiveSource>>['source'] | null = null;
        if (data.live === true) {
          try { live = (await loadLiveSource(db, context.classDoc, context.studentId, context.studentDoc.data(), Promise.resolve(null))).source; }
          catch (error) { console.error('[student-workspace] không đọc được dữ liệu báo cáo mới:', error); }
        }
        const input = projectStudentReport(publishedReportInput(data, live), context.studentId);
        if (!input) throw new WorkspaceError(404, 'Bản báo cáo này chưa sẵn sàng.');
        res.status(200).json({ report: { ...reportMeta(doc.id, data), input } });
      }
      return true;
    }

    if (body.action === 'studentAdaptiveList') {
      const snapshot = await db.collection('adaptiveAssignments').where('classId', '==', context.classId).get();
      const assignments = snapshot.docs.filter(doc => visibleAssignment(doc.data(), context) && (doc.data().isOpen === true || !!doc.data().closeArtifacts)).map(doc => ({
        closed: doc.data().isOpen !== true,
        assignmentId: doc.id, lessonId: text(doc.data().lessonId), title: text(doc.data().title),
        discoverSeedId: typeof doc.data().discoverSeedId === 'string' ? doc.data().discoverSeedId : undefined, createdAt: text(doc.data().createdAt),
      }));
      res.status(200).json({ assignments });
      return true;
    }

    // Thư viện học lại — list công khai bài TỰ HỌC đã xuất bản (mọi HS, không lọc lớp; thầy 28/10).
    if (body.action === 'studentAdaptiveLibrary') {
      const snapshot = await db.collection('adaptiveLessons').where('lessonKind', '==', 'self_study').where('status', '==', 'published').get();
      const lessons = snapshot.docs
        .filter(doc => doc.data().portalEnabled === true)
        .map(doc => ({
          lessonId: doc.id, title: text(doc.data().title),
          grade: text((doc.data().lesson as Data)?.grade) || text(doc.data().grade),
          week: text((doc.data().lesson as Data)?.curriculumRef?.week) || text((doc.data().curriculumRef as Data)?.week),
          period: typeof (doc.data().lesson as Data)?.curriculumRef?.period === 'number' ? (doc.data().lesson as Data).curriculumRef.period : (typeof (doc.data().curriculumRef as Data)?.period === 'number' ? (doc.data().curriculumRef as Data).period : null),
          updatedAt: text(doc.data().updatedAt),
        }))
        .sort((a, b) => a.grade.localeCompare(b.grade, 'vi') || String(a.period).localeCompare(String(b.period), 'vi', { numeric: true }) || a.title.localeCompare(b.title, 'vi'));
      res.status(200).json({ lessons });
      return true;
    }

    if (body.action === 'studentAdaptiveLibraryOpen') {
      if (!isSafeDocId(body.lessonId)) throw new WorkspaceError(400, 'Invalid lesson code.');
      const lessonSnap = await db.collection('adaptiveLessons').doc(body.lessonId).get();
      const data = lessonSnap.data() || {};
      const lesson = normalizeAdaptiveLesson(data, body.lessonId);
      // Chỉ bài TỰ HỌC đã xuất bản + mở cổng công khai mới học lại được.
      if (!lesson || lesson.lessonKind !== 'self_study' || lesson.status !== 'published' || data.portalEnabled !== true) throw new WorkspaceError(404, 'Bài học không có trong thư viện.');
      res.status(200).json({ lesson: stripAnswers(lesson) });
      return true;
    }

    if (body.action === 'studentAdaptiveLibrarySubmit') {
      if (!isSafeDocId(body.lessonId)) throw new WorkspaceError(400, 'Invalid lesson code.');
      const lessonSnap = await db.collection('adaptiveLessons').doc(body.lessonId).get();
      const data = lessonSnap.data() || {};
      const lesson = normalizeAdaptiveLesson(data, body.lessonId);
      if (!lesson || lesson.lessonKind !== 'self_study' || lesson.status !== 'published' || data.portalEnabled !== true) throw new WorkspaceError(404, 'Bài học không có trong thư viện.');
      // Chấm thuần — không ghi tiến độ/điểm/hồ sơ (mô hình học lại không tính điểm).
      res.status(200).json(gradeLibraryAssessment(lesson, body));
      return true;
    }


    if (body.action === 'studentAdaptiveOpen') {
      if (!isSafeDocId(body.assignmentId)) throw new WorkspaceError(400, 'Invalid lesson code.');
      const assignmentSnap = await db.collection('adaptiveAssignments').doc(body.assignmentId).get();
      const assignment = assignmentSnap.data() || {};
      if (!assignmentSnap.exists || !visibleAssignment(assignment, context) || assignment.isOpen !== true || !isSafeDocId(assignment.lessonId)) throw new WorkspaceError(404, 'Lesson not found.');
      const lessonSnap = await db.collection('adaptiveLessons').doc(assignment.lessonId).get();
      const lesson = normalizeAdaptiveLesson(lessonSnap.data(), assignment.lessonId);
      if (!lessonSnap.exists || !lesson || lesson.teacherId !== assignment.teacherId || lesson.status !== 'published') throw new WorkspaceError(404, 'Lesson is not ready.');
      res.status(200).json({ assignmentId: assignmentSnap.id, lesson: stripAnswers(lesson) });
      return true;
    }

    if (body.action === 'studentAdaptiveClosed') {
      if (!isSafeDocId(body.assignmentId)) throw new WorkspaceError(422, 'Invalid lesson code.');
      const assignmentSnap = await db.collection('adaptiveAssignments').doc(body.assignmentId).get();
      const assignment = assignmentSnap.data() || {};
      const artifacts = assignment.closeArtifacts as CloseArtifacts | undefined;
      if (!assignmentSnap.exists || !visibleAssignment(assignment, context) || !artifacts || !isSafeDocId(assignment.lessonId)) throw new WorkspaceError(404, 'Lesson is not closed yet.');
      const lesson = normalizeAdaptiveLesson((await db.collection('adaptiveLessons').doc(assignment.lessonId).get()).data(), assignment.lessonId);
      if (!lesson) throw new WorkspaceError(404, 'Lesson is not ready.');
      res.status(200).json({ assignmentId: assignmentSnap.id, feedback: artifacts.feedback?.[context.studentId] || [], homework: resolveHomework(lesson, artifacts.homework?.[context.studentId] || []) });
      return true;
    }

    if (body.action === 'studentAdaptiveSubmit') {
      if (!isSafeDocId(body.assignmentId)) throw new WorkspaceError(422, 'Mã bài tập không hợp lệ. Em hãy mở lại bài được giao rồi thử lại.');
      const assignmentSnap = await db.collection('adaptiveAssignments').doc(body.assignmentId).get();
      const assignment = assignmentSnap.data() || {};
      if (!assignmentSnap.exists || !visibleAssignment(assignment, context) || assignment.isOpen !== true || !isSafeDocId(assignment.lessonId)) throw new WorkspaceError(404, 'Không tìm thấy bài học được giao. Em hãy kiểm tra lại lớp và bài được mở.');
      const lessonSnap = await db.collection('adaptiveLessons').doc(assignment.lessonId).get();
      const lesson = normalizeAdaptiveLesson(lessonSnap.data(), assignment.lessonId);
      if (!lessonSnap.exists || !lesson || lesson.teacherId !== assignment.teacherId || lesson.status !== 'published') throw new WorkspaceError(404, 'Bài học chưa sẵn sàng. Em hãy quay lại sau.');
      let result;
      try {
        result = await submitAdaptiveAssessment(db, context, assignmentSnap.id, assignment, lesson, body);
      } catch (error) {
        const code = error instanceof Error ? error.message : '';
        const messages: Record<string, [number, string]> = {
          INVALID_KIND: [422, 'Loại bài kiểm tra không hợp lệ. Em hãy chọn bài đầu vào, kiểm tra nhanh hoặc vé thoát.'],
          INVALID_ANSWERS: [422, 'Câu trả lời không hợp lệ. Em hãy nhập lại đáp án rồi gửi lại.'],
          TOO_MANY_ANSWERS: [422, 'Bài gửi có quá nhiều câu trả lời. Em hãy kiểm tra lại bài được giao.'],
          ANSWER_TOO_LONG: [422, 'Câu trả lời vượt quá 2000 ký tự. Em hãy rút gọn rồi gửi lại.'],
          INVALID_UNIT: [422, 'Đơn vị kiến thức không hợp lệ. Em hãy mở đúng đơn vị rồi làm lại.'],
          INVALID_ASSESSMENT: [422, 'Bài kiểm tra không hợp lệ. Em hãy mở lại bài được giao rồi thử lại.'],
          NO_ANSWERS: [422, 'Em chưa trả lời câu nào. Em hãy làm ít nhất một câu rồi gửi bài, vì lần gửi đầu sẽ được tính điểm.'],
          DIAGNOSTIC_REQUIRED: [409, 'Em cần làm bài kiểm tra đầu vào trước.'],
        };
        const mapped = messages[code];
        if (mapped) throw new WorkspaceError(mapped[0], mapped[1]);
        throw error;
      }
      res.status(200).json(result);
      return true;
    }

    if (body.action === 'studentWorkspace') {
      const [assignmentSnap, submissionSnap, onlineSnap] = await Promise.all([
        db.collection('assignments').where('classId', '==', context.classId).get(),
        db.collection('submissions').where('studentId', '==', context.studentId).get(),
        db.collection('examSubmissions').where('studentId', '==', context.studentId).get(),
      ]);
      const visible = assignmentSnap.docs.filter(doc => visibleAssignment(doc.data(), context));
      const assignmentIds = new Set(visible.map(doc => doc.id));
      const assignments = newest(visible.map(doc => {
        const projected = projectors.projectStudentAssignment(doc.id, doc.data());
        return { ...projected, attachments: [], description: '', exportBundle: undefined };
      }), item => item.createdAt);
      const submissions = newest(submissionSnap.docs
        .filter(doc => ownSubmission(doc.data(), context) && (!doc.data().assignmentId || assignmentIds.has(doc.data().assignmentId)))
        .map(doc => summary(doc.id, doc.data(), projectors.projectStudentSubmission)), item => item.createdAt);
      const onlineSubmissions = newest(onlineSnap.docs
        .filter(doc => onlineOwn(doc.data(), context) && assignmentIds.has(doc.data().assignmentId))
        .map(doc => onlineSummary(doc.id, doc.data(), context)), item => item.submittedAt || item.startedAt);
      res.status(200).json({ assignments, submissions, onlineSubmissions });
      return true;
    }

    const assignmentId = body.assignmentId;
    let assignment: StudentAssignmentView | undefined;
    let fullAssignment: Data | undefined;
    if (assignmentId !== null) {
      if (!isSafeDocId(assignmentId)) throw new WorkspaceError(400, 'Mã bài tập không hợp lệ.');
      const snap = await db.collection('assignments').doc(assignmentId).get();
      if (!snap.exists || !visibleAssignment(snap.data() || {}, context)) throw new WorkspaceError(404, 'Không tìm thấy bài tập của em.');
      fullAssignment = snap.data()!;
      assignment = projectors.projectStudentAssignment(snap.id, snap.data()!);
    } else if (!isSafeDocId(body.submissionId)) throw new WorkspaceError(400, 'Mã bài nộp không hợp lệ.');
    const [submissionSnap, onlineSnap] = await Promise.all([
      db.collection('submissions').where('studentId', '==', context.studentId).get(),
      assignment ? db.collection('examSubmissions').where('studentId', '==', context.studentId).get() : Promise.resolve({ docs: [] }),
    ]);
    const self = submissionSnap.docs.filter(doc => ownSubmission(doc.data(), context) && !doc.data().assignmentId);
    const selfIds = new Set(self.map(doc => doc.id));
    const rootId = (id: string): string => {
      const seen = new Set<string>();
      while (!seen.has(id)) {
        seen.add(id);
        const parent = self.find(doc => doc.id === id)?.data().supplementOf;
        if (typeof parent !== 'string' || !selfIds.has(parent)) return id;
        id = parent;
      }
      return [...seen].sort()[0];
    };
    const selectedSelfRoot = !assignment && typeof body.submissionId === 'string' && selfIds.has(body.submissionId) ? rootId(body.submissionId) : null;
    const submissions = newest(submissionSnap.docs.filter(doc => ownSubmission(doc.data(), context)
      && (assignment ? doc.data().assignmentId === assignment.id : !doc.data().assignmentId && selectedSelfRoot !== null && rootId(doc.id) === selectedSelfRoot))
      .map(doc => projectors.projectStudentSubmission(doc.id, attachAssignmentSolutions({ id: doc.id, ...doc.data() } as SubmissionDoc, fullAssignment))), item => item.createdAt);
    if (!assignment && submissions.length === 0) throw new WorkspaceError(404, 'Không tìm thấy bài nộp của em.');
    const onlineSubmissions = newest(onlineSnap.docs.filter(doc => onlineOwn(doc.data(), context) && doc.data().assignmentId === assignment?.id)
      .map(doc => onlineSummary(doc.id, doc.data(), context)), item => item.submittedAt || item.startedAt);
    res.status(200).json({ ...(assignment ? { assignment } : {}), submissions, onlineSubmissions });
    return true;
  } catch (error) {
    if (!(error instanceof WorkspaceError)) throw error;
    res.status(error.statusCode).json({ error: error.message });
    return true;
  }
};
