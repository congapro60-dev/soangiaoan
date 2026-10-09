import { db, getEnv, stmt } from '../../../lib/storage.js';
import { resolveIdentity } from '../../../lib/account-room-access.js';
import { createExamService } from '../../../lib/exam/service.js';
import { json, errorResponse, readJson, imageResponse } from '../../../lib/exam/http.js';

// Teacher side of the exam rooms: create, edit, run, mark and export. Everything needs a signed-in account and only
// the owner of an exam can see or change it.
export const dynamic = 'force-dynamic';

const service = () => createExamService({ db: db() });

async function teacher(request) {
  const { user } = resolveIdentity(request, getEnv());
  if (!user) throw new Error('AUTH_REQUIRED');
  await stmt(
    'INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,display_name=excluded.display_name',
    user.userId, user.email, user.displayName || user.email, Date.now(),
  ).run();
  return user.userId;
}

export async function GET(request) {
  try {
    const owner = await teacher(request);
    const q = new URL(request.url).searchParams;
    const api = service();
    const examId = q.get('id');
    if (!examId) return json(await api.listExams(owner));
    if (q.get('csv')) {
      const csv = await api.exportCsv({ ownerAccountId: owner, examId });
      return new Response(csv, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="ket-qua-kiem-tra.csv"', 'Cache-Control': 'no-store' } });
    }
    if (q.get('asset') || q.get('image')) return imageResponse(await api.teacherAsset({ ownerAccountId: owner, examId, assetId: q.get('asset'), qid: q.get('image') }));
    if (q.get('results')) return json(await api.results({ ownerAccountId: owner, examId }));
    if (q.get('attempt')) return json(await api.getAttempt({ ownerAccountId: owner, examId, attemptId: q.get('attempt') }));
    return json(await api.getExam({ ownerAccountId: owner, examId }));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request) {
  try {
    const owner = await teacher(request);
    const body = await readJson(request, 900 * 1024);
    const api = service();
    const base = { ownerAccountId: owner, examId: body.id };
    switch (body.action) {
      case 'create':
        return json(await api.createExam({ ownerAccountId: owner, requestId: body.requestId, input: body.exam }), 201);
      case 'update':
        return json(await api.updateExam({ ...base, input: body.exam || {} }));
      case 'image':
        return json(await api.saveQuestionImage({ ...base, qid: body.qid, mime: body.mime, data: body.data }));
      case 'remove-image':
        return json(await api.removeQuestionImage({ ...base, qid: body.qid }));
      case 'control':
        return json(await api.control({ ...base, action: body.command, minutes: body.minutes, force: body.force === true }));
      case 'grade':
        return json(await api.grade({ ...base, attemptId: body.attemptId, qid: body.qid, score: body.score }));
      case 'release':
        return json(await api.releaseAttempt({ ...base, attemptId: body.attemptId }));
      case 'reopen':
        return json(await api.reopenAttempt({ ...base, attemptId: body.attemptId }));
      default:
        throw new Error('INVALID_ACTION');
    }
  } catch (error) {
    return errorResponse(error);
  }
}
