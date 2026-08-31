import { getPilotLiveLessonDefinition } from './definition';
import type { LiveLessonDefinition } from './types';
import { LiveLessonDefinitionError } from './types';
import {
  getBanToanV4Contract,
  getBanToanV4ContractByPackageId,
} from './v4/lessonRegistry';
import { buildLiveLessonDefinitionFromV4 } from './v4/runtimeDefinition';

/**
 * Load the definition named by a live URL. No title matching is allowed:
 * V4 routes must carry an exact source key/package id and the real lesson id.
 */
export function getLiveLessonDefinitionForRoute(
  definitionKey?: string | null,
  lessonId?: string | null,
): LiveLessonDefinition {
  if (!definitionKey?.trim()) return getPilotLiveLessonDefinition();

  const key = definitionKey.trim();
  const contract = getBanToanV4ContractByPackageId(key) ?? (() => {
    try {
      return getBanToanV4Contract(key);
    } catch {
      return null;
    }
  })();
  if (!contract) {
    throw new LiveLessonDefinitionError('LIVE_DEFINITION_NOT_FOUND', `Không có gói runtime cho definitionKey ${key}.`);
  }
  return buildLiveLessonDefinitionFromV4(contract, lessonId?.trim() || contract.lessonId);
}
