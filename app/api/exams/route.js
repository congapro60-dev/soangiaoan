import { db, getEnv, stmt } from '../../../lib/storage.js';
import { resolveIdentity } from '../../../lib/account-room-access.js';
import { createExamService } from '../../../lib/exam/service.js';
import { json, errorResponse, readJson, imageResponse } from '../../../lib/exam/http.js';
import { loadStoredAI } from '../../../lib/ai-settings.js';
import { variantCapabilities, variantSource, proposeExamVariants } from '../../../lib/exam/variants.js';

// Teacher side of the exam rooms: create, edit, run, mark and export. Everything needs a signed-in account and only
// the owner of an exam can see or change it.
export const dynamic = 'force-dynamic';

const service = () => createExamService({ db: db() });

async function teacher(request) {
  const { user } = resolveIdentity(request, getEnv());
  if (!user) throw new Error('AUTH_REQUIRED');
  await loadStoredAI(db);
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
    if (q.get('capabilities') === 'variants') {
      await api.getExam({ ownerAccountId: owner, examId });
      return json({ capabilities: variantCapabilities(getEnv()) });
    }
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
      case 'delete':
        return json(await api.deleteExam({ ...base, confirmTitle: body.confirmTitle, confirmAttempts: body.confirmAttempts }));
      case 'remove-attempt':
        return json(await api.removeAttempt({ ...base, attemptId: body.attemptId, confirmName: body.confirmName, expectedLastSeenAt: body.expectedLastSeenAt, expectedSubmittedAt: body.expectedSubmittedAt, expectedContentRevision: body.expectedContentRevision }));
      case 'create':
        return json(await api.createExam({ ownerAccountId: owner, requestId: body.requestId, input: body.exam }), 201);
      case 'update':
        return json(await api.updateExam({ ...base, input: body.exam || {} }));
      case 'duplicate-code':
        return json(await api.duplicateCode({ ...base, sourceCode: body.sourceCode, newCode: body.newCode }));
      case 'remove-question':
      case 'remove-code':
        if (body.action === 'remove-question' && (typeof body.qid !== 'string' || !body.qid.trim())) throw new Error('INVALID_BODY');
        return json(await api.removeExamPart({ ...base, examCode: body.examCode, qid: body.action === 'remove-question' ? body.qid : undefined, confirmLabel: body.confirmLabel, expectedContentRevision: body.expectedContentRevision }));
      case 'image':
        return json(await api.saveQuestionImage({ ...base, qid: body.qid, mime: body.mime, data: body.data, assetId: body.assetId }));
      case 'item-image':
        return json(await api.saveItemImage({ ...base, qid: body.qid, itemKind: body.itemKind, letter: body.letter, mime: body.mime, data: body.data, assetId: body.assetId }));
      case 'assign-code':
        return json(await api.assignCode({ ...base, attemptId: body.attemptId, examCode: body.examCode }));
      case 'preview':
        return json(await api.preview({ ...base, examCode: body.examCode, seed: body.seed }));
      case 'variant-source':
      case 'variants': {
        const full = (await api.getExam(base)).exam;
        const capabilities = variantCapabilities(getEnv());
        if (!capabilities.enabled) throw new Error('AI_PROVIDER_NOT_CONFIGURED');
        const code = full.codes.find((code) => code.code === (body.examCode ?? null)) || (body.examCode === '101' && full.codes[0]?.code === null ? full.codes[0] : null);
        if (!code) throw new Error('NOT_FOUND');
        if (!Array.isArray(body.qids) || body.qids.length < 1 || body.qids.length > 80 || body.qids.some((qid) => typeof qid !== 'string') || new Set(body.qids).size !== body.qids.length) throw new Error('INVALID_BODY');
        const selected = code.questions.filter((question) => body.qids.includes(question.id));
        if (selected.length !== body.qids.length) throw new Error('NOT_FOUND');
        const source = await variantSource({ id: full.id + ':' + (code.code || 'legacy'), questions: selected, model: capabilities.model, providerHost: capabilities.providerHost });
        if (body.action === 'variant-source') return json({ source, capabilities });
        return json(await proposeExamVariants({ source, model: body.model, aiConsent: body.aiConsent }, { env: getEnv() }));
      }
      case 'remove-image':
        return json(await api.removeQuestionImage({ ...base, qid: body.qid, assetId: body.assetId }));
      case 'remove-item-image':
        return json(await api.removeItemImage({ ...base, qid: body.qid, itemKind: body.itemKind, letter: body.letter, assetId: body.assetId }));
      case 'solution-image':
        return json(await api.saveSolutionImage({ ...base, qid: body.qid, mime: body.mime, data: body.data, assetId: body.assetId }));
      case 'remove-solution-image':
        return json(await api.removeSolutionImage({ ...base, assetId: body.assetId }));
      case 'control':
        return json(await api.control({ ...base, action: body.command, minutes: body.minutes, force: body.force === true }));
      case 'accommodation':
        return json(await api.setAccommodation({ ...base, attemptId: body.attemptId, expectedRevision: body.expectedRevision, extraMinutes: body.extraMinutes, textScale: body.textScale }));
      case 'grade':
        return json(await api.grade({ ...base, attemptId: body.attemptId, qid: body.qid, score: body.score, comment: body.comment }));
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
