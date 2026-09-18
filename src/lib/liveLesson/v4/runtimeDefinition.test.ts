import { describe, expect, it } from 'vitest';
import { getAllBanToanV4Contracts, getBanToanV4Contract } from './lessonAdapter';
import { buildLiveLessonDefinitionFromV4 } from './runtimeDefinition';
import { validateLiveLessonDefinition } from '../definition';

describe('V4 contract → live lesson runtime definition', () => {
  it('creates a 40-minute public runtime with a terminal cue and route checkpoint', () => {
    const definition = buildLiveLessonDefinitionFromV4(
      getBanToanV4Contract('10-5-31'),
      'adaptive-v4-10-5-31-teacher-1',
    );

    expect(definition.id).toBe('g10_w5_p31_v4');
    expect(definition.lessonId).toBe('adaptive-v4-10-5-31-teacher-1');
    expect(definition.durationSeconds).toBe(2400);
    expect(definition.cues[0]).toMatchObject({ id: 'P00', atSeconds: 0, tvScreenId: 'S0' });
    expect(definition.cues.at(-1)).toMatchObject({ id: 'P40', atSeconds: 2400, tvScreenId: 'S13' });
    expect(definition.cues.find((cue) => cue.id === 'P18')).toMatchObject({ responseStepId: 'cp-route-choice' });
    expect(definition.responseSteps.map((step) => step.id)).toContain('cp-route-choice');
    expect(definition.responseSteps.map((step) => step.id)).toContain('cp-practice-challenge');
    expect(definition.aiErrorStepId).toBe('cp-ai-error');
    expect(validateLiveLessonDefinition(definition)).toBe(definition);
  });

  it('keeps TV projection public while retaining the faulty statement as the learning object', () => {
    const contract = getBanToanV4Contract('10-5-37');
    const definition = buildLiveLessonDefinitionFromV4(contract);
    const aiErrorScreen = definition.tvScreens.find((screen) => screen.id === 'S7');

    expect(aiErrorScreen?.body).toContain(contract.aiError.faultyStatement);
    expect(aiErrorScreen?.body).toContain('sửa');
    expect(aiErrorScreen?.body).not.toContain(contract.aiError.correction);
    expect(definition.tvScreens.map((screen) => screen.id)).toEqual([
      'S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13',
    ]);
  });

  it('projects the source math tool and visible screen labels instead of replacing it with the goal prompt', () => {
    const contract = getBanToanV4Contract('10-5-31');
    const definition = buildLiveLessonDefinitionFromV4(contract);
    const knowledgeScreen = definition.tvScreens.find((screen) => screen.id === 'S3');
    const mathToolScreen = definition.tvScreens.find((screen) => screen.id === 'S5');
    const quickCheckScreen = definition.tvScreens.find((screen) => screen.id === 'S6');

    expect(knowledgeScreen).toMatchObject({ label: 'KHÁM PHÁ', title: 'Nhìn dữ kiện trước khi dùng công thức' });
    expect(mathToolScreen).toMatchObject({ label: 'KHÁI QUÁT', title: 'Từ ví dụ đến quy tắc' });
    expect(mathToolScreen?.body).toContain(contract.sourceContent?.formulas[0]);
    expect(knowledgeScreen?.body).not.toContain(contract.objectives.studentGoalPrompt);
    expect(quickCheckScreen?.body).toContain(contract.sourceContent?.quickChecks[1].question);
    expect(definition.tvScreens.every((screen) => Boolean(screen.label && screen.title))).toBe(true);
  });

  it('supports a self-choice package without changing the common post-check contract', () => {
    const definition = buildLiveLessonDefinitionFromV4(getBanToanV4Contract('10-5-37'));
    const routeStep = definition.responseSteps.find((step) => step.id === 'cp-route-choice');
    const postCheckStep = definition.responseSteps.find((step) => step.id === 'cp-exit-ticket');

    expect(routeStep?.responseTypes).toEqual(['route']);
    expect(postCheckStep?.responseTypes).toEqual(['exit_ticket']);
    expect(definition.studentScreens.map((screen) => screen.id)).toEqual([
      'HS0', 'HS1', 'HS2', 'HS3', 'HS4', 'HS5', 'HS6', 'HS7', 'HS8', 'HS9', 'HS10',
    ]);
  });

  it('builds a valid 40-minute runtime for every source package', () => {
    const contracts = getAllBanToanV4Contracts();

    expect(contracts).toHaveLength(48);
    contracts.forEach((contract) => {
      const definition = buildLiveLessonDefinitionFromV4(contract, `lesson-${contract.sourceKey}`);

      expect(definition.durationSeconds).toBe(2400);
      expect(definition.cues.at(-1)).toMatchObject({ id: 'P40', atSeconds: 2400 });
      expect(validateLiveLessonDefinition(definition)).toBe(definition);
      expect(definition.tvScreens.map((screen) => screen.id)).toHaveLength(contract.version.includes('v7.2') ? 14 : 11);
    });
  });
});
