import { db, getEnv } from '../../../lib/storage.js';
import { resolveIdentity } from '../../../lib/account-room-access.js';
import { aiStatus, saveAI, clearAI, testAI, loadStoredAI } from '../../../lib/ai-settings.js';

// Site owner only: see, save, test or remove the AI connection. The key itself is never returned.
export const dynamic = 'force-dynamic';

const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

function owner(request) {
  const { user, isRootUser } = resolveIdentity(request, getEnv());
  if (!user) return json({ error: 'AUTH_REQUIRED' }, 401);
  if (!isRootUser) return json({ error: 'FORBIDDEN' }, 403);
  return null;
}

export async function GET(request) {
  const denied = owner(request);
  if (denied) return denied;
  return json({ ai: await aiStatus(db(), getEnv()) });
}

export async function POST(request) {
  const denied = owner(request);
  if (denied) return denied;
  let body;
  try {
    const text = await request.text();
    if (text.length > 4000) throw new Error('INVALID_BODY');
    body = JSON.parse(text);
  } catch {
    return json({ error: 'INVALID_BODY' }, 400);
  }
  try {
    if (body?.action === 'save') await saveAI(db(), { endpoint: body.endpoint, model: body.model, key: body.key });
    else if (body?.action === 'clear') await clearAI(db());
    else if (body?.action === 'test') {
      await loadStoredAI(db());
      return json({ test: await testAI(getEnv()), ai: await aiStatus(db(), getEnv()) });
    } else return json({ error: 'INVALID_BODY' }, 400);
    return json({ ai: await aiStatus(db(), getEnv()) });
  } catch (error) {
    const code = String(error?.message || '');
    return json({ error: /^(INVALID_AI_ENDPOINT|INVALID_AI_MODEL|INVALID_AI_KEY)$/.test(code) ? code : 'AI_SETTINGS_FAILED' }, /^(INVALID_AI_ENDPOINT|INVALID_AI_MODEL|INVALID_AI_KEY)$/.test(code) ? 400 : 500);
  }
}
