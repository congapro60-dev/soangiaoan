import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleStudentWorkspaceAction, projectStudentReport } from '../_student-workspace';
import { projectStudentAssignment, projectStudentSubmission } from '../classroom';
import { publishedReportInput } from '../_published-report';
import { buildParentSafeReport } from '../../src/lib/classroom/parentSafeReport';
import { buildParentReportPrintDoc } from '../../src/lib/classroom/parentReportPrintDoc';

type Data = Record<string, unknown>;
const mocks = vi.hoisted(() => ({ uid: 'uid', live: vi.fn(), build: vi.fn() }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: async (token: string) => {
  if (token === 'bad') throw new Error();
  return { uid: mocks.uid };
} }) }));
vi.mock('../_parent-live.js', () => ({ loadLiveSource: mocks.live, buildLiveReport: mocks.build }));

const makeDb = (store: Record<string, Data>) => {
  const doc = (path: string) => ({
    id: path.split('/').at(-1),
    get: async () => ({ id: path.split('/').at(-1), exists: path in store, data: () => store[path], ref: doc(path) }),
    collection: (name: string) => collection(`${path}/${name}`),
  });
  const collection = (path: string, filters: Array<[string, unknown]> = []) => ({
    doc: (id: string) => doc(`${path}/${id}`),
    where: (field: string, _op: string, value: unknown) => collection(path, [...filters, [field, value]]),
    get: async () => ({ docs: Object.entries(store).filter(([key, value]) => key.startsWith(`${path}/`)
      && !key.slice(path.length + 1).includes('/') && filters.every(([field, target]) => value[field] === target))
      .map(([path, value]) => ({ id: path.split('/').at(-1)!, data: () => value, ref: doc(path) })) }),
  });
  return { collection };
};
const assignment = (patch: Data = {}): Data => ({
  classId: 'class', teacherId: 'teacher', title: 'Bài giao', type: 'upload', createdAt: '2026-10-01',
  isOpen: true, attachments: [{ name: 'Đề', url: 'private-photo' }], answerKey: 'SECRET KEY', ...patch,
});
const submission = (patch: Data = {}): Data => ({
  classId: 'class', teacherId: 'teacher', studentId: 'student', assignmentId: 'a',
  status: 'graded', createdAt: '2026-10-01', fileUrls: ['PHOTO'], note: 'ANSWER',
  grade: { score: 8, maxScore: 10, teacherApproved: true, feedback: 'FEEDBACK', noteForTeacher: 'INTERNAL',
    strengths: ['STRENGTH'], weaknesses: ['WEAK'], questionResults: [] }, ...patch,
});
const reportInput = () => ({
  studentName: 'HS', className: 'Lớp', teacherComment: 'Nhận xét công bố',
  report: buildParentSafeReport({ studentId: 'student', studentName: 'HS', className: 'Lớp', submissions: [] }),
});
let store: Record<string, Data>;
const call = async (body: Data) => {
  const result = { status: 0, payload: {} as Data };
  const res = { status(code: number) { result.status = code; return res; }, json(data: Data) { result.payload = data; return res; } };
  await handleStudentWorkspaceAction(makeDb(store) as never, { idToken: 'good', ...body }, res as never, { projectStudentAssignment, projectStudentSubmission });
  return result;
};
beforeEach(() => {
  mocks.uid = 'uid'; mocks.live.mockReset(); mocks.build.mockReset();
  store = {
    'studentLinks/uid': { studentId: 'student', classId: 'class', teacherId: 'teacher' },
    'classes/class': { teacherId: 'teacher', name: 'Lớp' },
    'classes/class/students/student': { name: 'HS' },
    'assignments/a': assignment(),
    'submissions/s': submission(),
  };
});

describe('student workspace private read', () => {
  it('returns only safe Discover seed metadata for the linked class grade', async () => {
    store['classes/class'].grade = '10';
    store['adaptiveLessons/private'] = {
      teacherId: 'teacher', classId: 'class', answerKey: 'SECRET KEY', privateNotes: 'SECRET',
    };
    const result = await call({ action: 'studentDiscoverCatalog' });
    expect(result.status).toBe(200);
    expect(result.payload.catalog).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'tds-discover-g10-p2', title: 'Mệnh đề', grade: '10', week: 1, period: 2, status: 'available' }),
    ]));
    expect((result.payload.catalog as Data[]).every(item => Object.keys(item).sort().join(',') === 'grade,id,period,status,title,week')).toBe(true);
    expect((result.payload.catalog as Data[]).every(item => item.grade === '10')).toBe(true);
    expect(JSON.stringify(result.payload)).not.toContain('SECRET');
  });

  it('keeps Discover catalog behind the linked student session', async () => {
    store['classes/class'].grade = '10';
    expect((await call({ action: 'studentDiscoverCatalog', idToken: 'bad' })).status).toBe(401);
    delete store['classes/class/students/student'];
    expect((await call({ action: 'studentDiscoverCatalog' })).status).toBe(403);
  });

  it('keeps all 300 assignments / 500 attempts including closed history, without heavy or hidden content', async () => {
    delete store['assignments/a']; delete store['submissions/s'];
    for (let i = 0; i < 300; i++) store[`assignments/a${i}`] = assignment({ isOpen: i > 100, createdAt: `2026-10-${String(i % 30 + 1).padStart(2, '0')}` });
    for (let i = 0; i < 500; i++) store[`submissions/s${i}`] = submission({ assignmentId: `a${i % 300}` });
    const result = await call({ action: 'studentWorkspace' });
    expect(result.status).toBe(200);
    expect(result.payload.assignments).toHaveLength(300); expect(result.payload.submissions).toHaveLength(500);
    expect((result.payload.assignments as Data[]).filter(a => !a.isOpen)).toHaveLength(101);
    const json = JSON.stringify(result.payload);
    for (const secret of ['PHOTO', 'ANSWER', 'FEEDBACK', 'INTERNAL', 'STRENGTH', 'WEAK', 'SECRET KEY', 'private-photo', 'questionResults']) expect(json).not.toContain(secret);
    expect(json.length).toBeLessThan(700_000);
  });

  it('scopes teacher, class, enrollment, target before returning index or detail', async () => {
    store['assignments/target'] = assignment({ targetStudentIds: ['other'] });
    store['assignments/teacher'] = assignment({ teacherId: 'other' });
    store['assignments/class'] = assignment({ classId: 'other' });
    store['submissions/target'] = submission({ assignmentId: 'target' });
    store['submissions/teacher'] = submission({ teacherId: 'other' });
    store['submissions/class'] = submission({ classId: 'other' });
    store['submissions/student'] = submission({ studentId: 'other' });
    expect((await call({ action: 'studentWorkspace' })).payload.assignments).toHaveLength(1);
    expect((await call({ action: 'studentWorkspace' })).payload.submissions).toHaveLength(1);
    for (const assignmentId of ['target', 'teacher', 'class']) expect((await call({ action: 'studentAssignmentDetail', assignmentId })).status).toBe(404);
    expect((await call({ action: 'studentWorkspace', idToken: 'bad' })).status).toBe(401);
    delete store['classes/class/students/student'];
    expect((await call({ action: 'studentWorkspace' })).status).toBe(403);
    store['classes/class/students/student'] = { name: 'HS' };
    store['classes/class'].teacherId = 'new-owner';
    expect((await call({ action: 'studentAssignmentDetail', assignmentId: 'a' })).status).toBe(403);
  });

  it('detail returns own closed assignment photos, never answer key or unapproved grade', async () => {
    store['assignments/a'].isOpen = false;
    (store['submissions/s'].grade as Data).teacherApproved = false;
    const result = await call({ action: 'studentAssignmentDetail', assignmentId: 'a' });
    expect((result.payload.assignment as Data).isOpen).toBe(false);
    expect(result.payload.assignment).not.toHaveProperty('answerKey');
    const own = (result.payload.submissions as Data[])[0];
    expect(own.fileUrls).toEqual(['PHOTO']);
    expect(own.grade).toMatchObject({ score: 0, scoreHidden: true, feedback: '' });
    expect(own.grade).not.toHaveProperty('questionResults');
  });

  it('counts only actionable writing, keeps pending/regrading scores hidden and periodic AI separate', async () => {
    store['assignments/a'].periodicTest = { columnId: 'SECRET COLUMN' };
    (store['submissions/s'].grade as Data).questionResults = [
      { questionNumber: '1', studentAnswer: 'B hoặc D', clarify: { kind: 'mcq', state: 'open', reading: 'B hoặc D' } },
      { questionNumber: '2', studentAnswer: 'Bỏ trống', clarify: { kind: 'photo', state: 'open', reading: 'Bỏ trống' } },
      { questionNumber: '3', studentAnswer: 'x=2', clarify: { kind: 'photo', state: 'regrading', reading: 'x=2' } },
    ];
    const result = await call({ action: 'studentWorkspace' });
    const own = (result.payload.submissions as Data[])[0];
    expect(own).toMatchObject({ clarificationCount: 1, clarificationRegrading: true, grade: { score: 0, awaitingClarification: true } });
    expect((result.payload.assignments as Data[])[0].periodicTest).toEqual({});
    expect(JSON.stringify(result.payload)).not.toContain('SECRET COLUMN');
    const questionRows = (store['submissions/s'].grade as Data).questionResults as Data[];
    (questionRows[2].clarify as Data).state = 'photo_saved';
    const savedPhotos = (await call({ action: 'studentWorkspace' })).payload.submissions as Data[];
    expect(savedPhotos[0]).toMatchObject({ clarificationCount: 2, clarificationRegrading: false });
  });

  it('keeps online full history scoped by assigned activity and strips draft scores', async () => {
    for (let i = 0; i < 120; i++) store[`examSubmissions/o${i}`] = { studentId: 'student', classId: 'class', assignmentId: 'a', status: 'graded', gradeState: 'provisional', totalScore: 8, answers: ['SECRET'] };
    store['examSubmissions/other'] = { studentId: 'student', classId: 'other', assignmentId: 'a', totalScore: 9 };
    store['examSubmissions/official'] = { studentId: 'student', classId: 'class', assignmentId: 'a', status: 'graded', gradeState: 'official', totalScore: 9 };
    const result = await call({ action: 'studentWorkspace' });
    expect(result.payload.onlineSubmissions).toHaveLength(121);
    const drafts = (result.payload.onlineSubmissions as Data[]).filter(s => s.gradeState === 'provisional');
    for (const draft of drafts) expect(draft).not.toHaveProperty('totalScore');
    expect((result.payload.onlineSubmissions as Data[]).find(s => s.id === 'official')?.totalScore).toBe(9);
    expect(JSON.stringify(result.payload)).not.toContain('SECRET');
  });

  it('self detail cannot read another student or assignment work by submissionId', async () => {
    store['submissions/self'] = submission({ assignmentId: null });
    store['submissions/revision'] = submission({ assignmentId: null, supplementOf: 'self', createdAt: '2026-10-02' });
    store['submissions/revision2'] = submission({ assignmentId: null, supplementOf: 'revision', createdAt: '2026-10-03' });
    store['submissions/other'] = submission({ assignmentId: null, studentId: 'other' });
    expect((await call({ action: 'studentAssignmentDetail', assignmentId: null, submissionId: 'self' })).status).toBe(200);
    const chain = await call({ action: 'studentAssignmentDetail', assignmentId: null, submissionId: 'revision2' });
    expect((chain.payload.submissions as Data[]).map(item => item.id)).toEqual(['revision2', 'revision', 'self']);
    for (const submissionId of ['other', 's']) expect((await call({ action: 'studentAssignmentDetail', assignmentId: null, submissionId })).status).toBe(404);
  });
});

describe('published student reports', () => {
  const publish = (patch: Data = {}) => {
    store['classes/class/parentReports/r'] = { studentId: 'student', kind: 'month', from: '2026-10-01', to: '2026-10-31', publishedAt: '2026-10-14', inputJson: JSON.stringify(reportInput()), ...patch };
  };
  it('validates nested saved rows and types before the actual report renderer', () => {
    const input = reportInput();
    expect(projectStudentReport({ ...input, report: { ...input.report, results: [null] } }, 'student')).toBeNull();
    expect(projectStudentReport({ ...input, requirements: [{}] }, 'student')).toBeNull();
    expect(projectStudentReport({ ...input, requirements: [{ id: 'yccd', level: '<img src=x onerror=alert(1)>', evidence: 5, percent: 70, note: '' }] }, 'student')).toBeNull();
    expect(projectStudentReport({ ...input, competency: { grade: '11', assessed: 1, total: 2, items: [null] } }, 'student')).toBeNull();
    expect(projectStudentReport({ ...input, weekPlan: { week1Monday: 'garbage', skippedWeeks: [] } }, 'student')).toBeNull();
    const projected = projectStudentReport({ ...input, teacherComment: true, branding: { teacherName: true } }, 'student');
    expect(projected).not.toBeNull();
    expect(projected).not.toHaveProperty('teacherComment');
    expect(() => buildParentReportPrintDoc(projected!, 'web')).not.toThrow();
    expect(projectStudentReport(input, 'student')).toEqual(input);
    expect(() => buildParentReportPrintDoc(projectStudentReport(input, 'student')!, 'web')).not.toThrow();
  });
  it('returns metadata only, same snapshot/overrides as parent, strips nested raw inputs and notes', async () => {
    const input = reportInput();
    (input.report as unknown as Data).rawAnswers = ['SECRET'];
    (input.report as unknown as Data).results = [{ assignmentId: 'a', title: 'Bài', status: 'official', score: 8, maxScore: 10, teacherNote: 'SECRET', studentAnswer: 'SECRET' }];
    publish({ inputJson: JSON.stringify({ ...input, rawEvidence: 'SECRET' }), overridesJson: JSON.stringify({ teacherComment: 'GV sửa' }) });
    const list = await call({ action: 'studentReports' });
    expect(list.payload.reports).toHaveLength(1); expect((list.payload.reports as Data[])[0]).not.toHaveProperty('input');
    const detail = await call({ action: 'studentReport', reportId: 'r' });
    expect(detail.status).toBe(200);
    expect(JSON.stringify(detail.payload)).not.toContain('SECRET');
    expect((detail.payload.report as Data).input).toMatchObject({ teacherComment: 'GV sửa' });
    expect((detail.payload.report as Data).input).toEqual(projectStudentReport(publishedReportInput(store['classes/class/parentReports/r'], null), 'student'));
  });

  it('uses identical live merge + overrides, falls back on live failure without creating a report', async () => {
    publish({ live: true });
    mocks.live.mockResolvedValue({ source: { live: true } });
    mocks.build.mockReturnValue({ printInput: { ...reportInput(), studentName: 'Tên mới', report: { ...reportInput().report, missingCount: 7 } } });
    const current = await call({ action: 'studentReport', reportId: 'r' });
    expect((current.payload.report as Data).input).toEqual(publishedReportInput(store['classes/class/parentReports/r'], { live: true } as never));
    mocks.live.mockRejectedValue(new Error('offline'));
    const fallback = await call({ action: 'studentReport', reportId: 'r' });
    expect((fallback.payload.report as Data).input).toEqual(reportInput());
    expect(Object.keys(store).filter(key => key.includes('parentStats'))).toHaveLength(0);
  });

  it('rechecks publication, student identity and current enrollment at detail request', async () => {
    publish();
    expect((await call({ action: 'studentReports' })).status).toBe(200);
    delete store['classes/class/parentReports/r'];
    expect((await call({ action: 'studentReport', reportId: 'r' })).status).toBe(404);
    publish({ studentId: 'other' });
    expect((await call({ action: 'studentReport', reportId: 'r' })).status).toBe(404);
    publish({ inputJson: JSON.stringify({ ...reportInput(), report: { ...reportInput().report, studentId: 'other' } }) });
    expect((await call({ action: 'studentReport', reportId: 'r' })).status).toBe(404);
    publish({ live: true, inputJson: JSON.stringify({ ...reportInput(), teacherComment: 'Another student comment', report: { ...reportInput().report, studentId: 'other' } }) });
    mocks.live.mockResolvedValue({ source: { live: true } });
    mocks.build.mockReturnValue({ printInput: reportInput() });
    expect((await call({ action: 'studentReport', reportId: 'r' })).status).toBe(404);
    expect(mocks.live).not.toHaveBeenCalled();
    publish({ inputJson: JSON.stringify({ report: { studentId: 'student' } }) });
    expect((await call({ action: 'studentReport', reportId: 'r' })).status).toBe(404);
    publish(); delete store['classes/class/students/student'];
    expect((await call({ action: 'studentReport', reportId: 'r' })).status).toBe(403);
  });
});
