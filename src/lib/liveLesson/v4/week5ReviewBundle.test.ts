import { describe, expect, it } from 'vitest';
import { buildLiveLessonDefinitionFromV4 } from './runtimeDefinition';
import { assertPreviewPrivacy, buildPreviewManifest, buildPreviewModel, buildTeacherGuideMarkdown } from './previewBundle';
import { getBanToanV4Contract } from './lessonAdapter';
import { WEEK5_SOURCE_KEYS } from './week5Catalog';

describe('Week 5 V7.2 review bundle contract', () => {
  it('keeps public previews private and teacher guides source-backed for all 24 packages', () => {
    for (const sourceKey of WEEK5_SOURCE_KEYS) {
      const contract = getBanToanV4Contract(sourceKey);
      const model = buildPreviewModel(buildLiveLessonDefinitionFromV4(contract), sourceKey);
      expect(() => assertPreviewPrivacy(JSON.stringify({ model, manifest: buildPreviewManifest(model) }))).not.toThrow();
      expect(buildTeacherGuideMarkdown(contract)).toContain(contract.aiError.correction);
      expect(model.cues.find(cue => cue.cueId === 'P22')?.student.responseSteps).toHaveLength(5);
    }
  });
});
