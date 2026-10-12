import catalogue from '../../../../content/lesson-catalogue.json' with { type: 'json' };
import { resolveIdentity } from '../../../../lib/account-room-access.js';
import { getEnv } from '../../../../lib/storage.js';
import { readJson, json } from '../../../../lib/exam/http.js';
import { createGenerationScope, selectLessonScope, createPilotLessonScope } from '../../../../lib/lesson/content-map.js';
export const dynamic = 'force-dynamic';
export async function POST(request) {
  if (!resolveIdentity(request, getEnv()).user) return json({ error: 'AUTH_REQUIRED' }, 401);
  try {
    const input = await readJson(request, 160 * 1024);
    if (!input || Object.keys(input).some(key => !['package', 'selection', 'scope'].includes(key)) || Object.hasOwn(input, 'scope') && (Object.hasOwn(input, 'package') || Object.hasOwn(input, 'selection'))) return json({ error: 'INVALID_BODY' }, 400);
    if (Object.hasOwn(input, 'scope')) { const scope = createGenerationScope(catalogue, input.scope); return json(scope, scope.ok ? 200 : 422); }
    let result = selectLessonScope(input.package, input.selection ?? {});
    if (!result.ok && input.package?.id === 'g11-sequences-p1' && input.selection?.objectiveIds?.length === 1) result = createPilotLessonScope(input.package, input.selection);
    return json(result, result.ok ? 200 : 422);
  } catch { return json({ error: 'INVALID_BODY' }, 400); }
}
