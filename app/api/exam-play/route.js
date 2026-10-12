import { db } from '../../../lib/storage.js';
import { createExamService } from '../../../lib/exam/service.js';
import { json, errorResponse, readJson, imageResponse, bearer } from '../../../lib/exam/http.js';

// Pupil side of the exam rooms. A pupil has no account: joining returns a private token (kept on the device) that
// every later request sends as a bearer token. Keys and solutions open only after closure when review is enabled.
export const dynamic = 'force-dynamic';

const service = () => createExamService({ db: db() });

export async function GET(request) {
  try {
    const token = bearer(request);
    const q = new URL(request.url).searchParams;
    const api = service();
    if (q.get('photo')) return imageResponse(await api.pupilAsset({ token, photoId: q.get('photo') }));
    if (q.get('question')) return imageResponse(await api.pupilAsset({ token, questionId: q.get('question') }));
    if (q.get('item')) return imageResponse(await api.pupilAsset({ token, itemId: q.get('item') }));
    if (q.get('solution')) return imageResponse(await api.pupilAsset({ token, solutionId: q.get('solution') }));
    if (q.get('image')) return imageResponse(await api.pupilAsset({ token, qid: q.get('image') }));
    return json(await api.getState({ token }));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request) {
  try {
    const body = await readJson(request, 900 * 1024);
    const api = service();
    const token = bearer(request);
    switch (body.action) {
      case 'review-join':
        return json(await api.reviewJoin({ code: body.code, name: body.name, pin: body.pin }));
      case 'join':
        return json(await api.join({ code: body.code, name: body.name, token: token || body.token, mascot: body.mascot }));
      case 'answer':
        return json(await api.saveAnswer({ token, qid: body.qid, value: body.value, seq: body.seq }));
      case 'integrity':
        return json(await api.acknowledgeIntegrity({ token, integrity: body.integrity }));
      case 'submit':
        return json(await api.submit({ token, answers: body.answers }));
      case 'tab':
        return json(await api.tabLeave({ token }));
      case 'mascot':
        return json(await api.chooseMascot({ token, mascot: body.mascot }));
      case 'photo':
        return json(await api.savePhoto({ token, qid: body.qid, mime: body.mime, data: body.data }), 201);
      case 'photo-delete':
        return json(await api.deletePhoto({ token, id: body.id }));
      default:
        throw new Error('INVALID_ACTION');
    }
  } catch (error) {
    return errorResponse(error);
  }
}
