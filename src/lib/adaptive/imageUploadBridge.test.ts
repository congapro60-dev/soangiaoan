import { describe, it, expect } from 'vitest';
import { sampleAdaptiveLesson } from './sampleAdaptiveLesson';
import { adaptiveLessonToDeweyContent } from './adaptiveToDewey';

describe('ISSUE-01: image_upload responseMode bridge', () => {
  const lesson = sampleAdaptiveLesson;

  it('challenge route passes responseMode=image_upload to Dewey steps', () => {
    const content = adaptiveLessonToDeweyContent(lesson, 'challenge');
    const allSteps = content.knowledgeUnits.flatMap(u => u.socraticSteps);
    const imageSteps = allSteps.filter(s => s.responseMode === 'image_upload');
    expect(imageSteps.length).toBeGreaterThan(0);
    expect(imageSteps[0].aiRubric).toBeTruthy();
  });

  it('foundation route has no image_upload steps (sample data)', () => {
    const content = adaptiveLessonToDeweyContent(lesson, 'foundation');
    const allSteps = content.knowledgeUnits.flatMap(u => u.socraticSteps);
    const imageSteps = allSteps.filter(s => s.responseMode === 'image_upload');
    expect(imageSteps.length).toBe(0);
  });

  it('image_upload step has correct placeholder text', () => {
    const content = adaptiveLessonToDeweyContent(lesson, 'challenge');
    const allSteps = content.knowledgeUnits.flatMap(u => u.socraticSteps);
    const imageStep = allSteps.find(s => s.responseMode === 'image_upload');
    expect(imageStep).toBeDefined();
    expect(imageStep!.inputPlaceholder).toContain('chụp ảnh');
  });
});
