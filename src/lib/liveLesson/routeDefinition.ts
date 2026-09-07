import { getPilotLiveLessonDefinition } from './definition';
import type { LiveLessonDefinition } from './types';
import { LiveLessonDefinitionError } from './types';
import {
  getBanToanV4Contract,
  getBanToanV4ContractByPackageId,
} from './v4/lessonRegistry';
import { buildLiveLessonDefinitionFromV4 } from './v4/runtimeDefinition';
import { getG10P31V4Contract } from '../../data/liveLessonPackages/g10_w5_p31_bpt_tiet1.v4';

// Bài demo 10-5-31 dùng contract thủ công (kịch bản bánh-nước + video + nội dung
// TV theo từng cue), không dùng bản adapter generic. 47 nguồn còn lại giữ adapter.
const CANONICAL_P31_KEYS: ReadonlySet<string> = new Set([
  '10-5-31',
  'g10_w5_p31_v4',
  'g10_w5_p31_bpt_tiet1_v4',
]);

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
  if (CANONICAL_P31_KEYS.has(key)) {
    const canonical = getG10P31V4Contract();
    return buildLiveLessonDefinitionFromV4(canonical, lessonId?.trim() || canonical.lessonId);
  }
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
