import { describe, expect, it } from 'vitest';

import pilotPackageText from '../../data/liveLessonPackages/g10_w5_p31_bpt_tiet1.json?raw';

import {
  LiveLessonDefinitionError,
  getPilotLiveLessonDefinition,
  normalizeLiveLessonDefinition,
  validateLiveLessonDefinition,
} from './definition';

describe('g10_w5_p31_bpt_tiet1 live lesson definition', () => {
  it('normalizes the pilot package into the runtime boundary', () => {
    const definition = getPilotLiveLessonDefinition();

    expect(definition.durationSeconds).toBe(2400);
    expect(definition.cues.length).toBeGreaterThanOrEqual(20);
    expect(definition.tvScreens).toHaveLength(13);
    expect(definition.studentScreens).toHaveLength(12);
    expect(definition.aiErrorStepId).toBe('ai-error-w01');
    expect(definition.allowedStepIds).toContain('ai-think-w01');
    expect(definition.allowedStepIds).toContain('quick-check');
  });

  it('does not ship canonical answer payloads in the runtime definition', () => {
    const serialized = JSON.stringify(getPilotLiveLessonDefinition());

    expect(serialized).not.toContain('aiAnswer');
    expect(serialized).not.toContain('routeTasks');
    expect(serialized).not.toContain('quickCheck');
    expect(serialized).not.toContain('teacherScript');
  });

  it('rejects a cue that references an undeclared TV screen', () => {
    const definition = getPilotLiveLessonDefinition();
    const badDefinition = {
      ...definition,
      cues: definition.cues.map((cue, index) =>
        index === 0 ? { ...cue, tvScreenId: 'S-missing' } : cue,
      ),
    };

    expect(() => validateLiveLessonDefinition(badDefinition)).toThrowError(
      expect.objectContaining({ code: 'LIVE_TV_SCREEN_NOT_FOUND' }),
    );
    expect(() => validateLiveLessonDefinition(badDefinition)).toThrow(
      LiveLessonDefinitionError,
    );
  });

  it('keeps cues ordered and response steps unique', () => {
    const definition = getPilotLiveLessonDefinition();

    expect(definition.cues).toEqual(
      [...definition.cues].sort((left, right) => left.atSeconds - right.atSeconds),
    );
    expect(new Set(definition.allowedStepIds).size).toBe(
      definition.allowedStepIds.length,
    );
    expect(definition.responseSteps.map((step) => step.id)).toEqual(
      expect.arrayContaining(['ai-think-w01', 'ai-error-w01', 'quick-check', 'exit-ticket']),
    );
  });

  it('keeps the AI answer behind the THINK gate', () => {
    const definition = getPilotLiveLessonDefinition();
    const thinkCue = definition.cues.find(cue => cue.id === 'P12');
    const verifyCue = definition.cues.find(cue => cue.id === 'P13');
    const thinkScreen = definition.tvScreens.find(screen => screen.id === 'S8A');
    const verifyScreen = definition.tvScreens.find(screen => screen.id === 'S8B');

    expect(thinkCue).toMatchObject({ tvScreenId: 'S8A', responseStepId: 'ai-think-w01' });
    expect(verifyCue).toMatchObject({ tvScreenId: 'S8B', responseStepId: 'ai-error-w01' });
    expect(thinkScreen?.body).not.toContain('160');
    expect(thinkScreen?.body).not.toContain('không là nghiệm');
    expect(verifyScreen?.body).toContain('160');
    expect(verifyScreen?.title).toContain('VERIFY');
  });

  it('rejects a malformed canonical package with a stable error code', () => {
    expect(() => normalizeLiveLessonDefinition({})).toThrowError(
      expect.objectContaining({ code: 'LIVE_PACKAGE_INVALID' }),
    );
  });

  it('rejects incomplete route, quick-check, and exit-ticket content', () => {
    const basePackage = JSON.parse(pilotPackageText) as Record<string, unknown>;
    const badRoutePackage = JSON.parse(JSON.stringify(basePackage)) as Record<string, unknown>;
    const routeTasks = badRoutePackage.routeTasks as Record<string, unknown>;
    delete routeTasks.C;

    const badQuickCheckPackage = JSON.parse(JSON.stringify(basePackage)) as Record<string, unknown>;
    badQuickCheckPackage.quickCheck = [];

    const badExitTicketPackage = JSON.parse(JSON.stringify(basePackage)) as Record<string, unknown>;
    const exitTicket = badExitTicketPackage.exitTicket as Record<string, unknown>;
    exitTicket.lookFor = [];

    for (const badPackage of [badRoutePackage, badQuickCheckPackage, badExitTicketPackage]) {
      expect(() => normalizeLiveLessonDefinition(badPackage)).toThrowError(
        expect.objectContaining({ code: 'LIVE_PACKAGE_INVALID' }),
      );
    }
  });

  it('rejects a malformed definition before accessing missing runtime arrays', () => {
    expect(() => validateLiveLessonDefinition({} as never)).toThrowError(
      expect.objectContaining({ code: 'LIVE_DEFINITION_INVALID' }),
    );
  });

  it('rejects sparse runtime arrays before iteration', () => {
    const definition = getPilotLiveLessonDefinition();
    const sparseCues = [...definition.cues];
    delete sparseCues[1];

    expect(() => validateLiveLessonDefinition({
      ...definition,
      cues: sparseCues,
    })).toThrowError(expect.objectContaining({ code: 'LIVE_DEFINITION_INVALID' }));
  });

  it('requires cues to start at zero and end at the lesson duration', () => {
    const definition = getPilotLiveLessonDefinition();

    expect(() => validateLiveLessonDefinition({
      ...definition,
      cues: [{ ...definition.cues[0], atSeconds: 1 }, ...definition.cues.slice(1)],
    })).toThrowError(expect.objectContaining({ code: 'LIVE_CUE_START_INVALID' }));

    expect(() => validateLiveLessonDefinition({
      ...definition,
      cues: [...definition.cues.slice(0, -1), { ...definition.cues.at(-1)!, atSeconds: 2399 }],
    })).toThrowError(expect.objectContaining({ code: 'LIVE_CUE_END_INVALID' }));
  });

  it('rejects pilot cue text drift after structural checks', () => {
    const definition = getPilotLiveLessonDefinition();
    const badDefinition = {
      ...definition,
      cues: definition.cues.map((cue, index) =>
        index === 6 ? { ...cue, teacher: `${cue.teacher} lệch canonical` } : cue,
      ),
    };

    expect(() => validateLiveLessonDefinition(badDefinition)).toThrowError(
      expect.objectContaining({ code: 'LIVE_CUE_CONTRACT_INVALID' }),
    );
  });

  it('whitelists public screen fields during normalization', () => {
    const basePackage = JSON.parse(pilotPackageText) as Record<string, unknown>;
    const leakedPackage = JSON.parse(JSON.stringify(basePackage)) as Record<string, unknown>;
    const tvScreens = leakedPackage.tvScreens as Array<Record<string, unknown>>;
    tvScreens[0].teacher = 'leaked teacher script';
    tvScreens[0].boardLarge = 'leaked board content';
    tvScreens[0].teacherScript = 'leaked script';

    const definition = normalizeLiveLessonDefinition(leakedPackage);
    expect(definition.tvScreens[0]).toEqual({
      id: 'S0',
      title: 'BẮT ĐẦU KHI SẴN SÀNG',
      body: 'Bất phương trình bậc nhất hai ẩn\nMở portal trên thiết bị cá nhân. Chưa cần ghi bài.',
    });
  });

  it('rejects non-string public screen fields with a stable package error', () => {
    const basePackage = JSON.parse(pilotPackageText) as Record<string, unknown>;
    const badPackage = JSON.parse(JSON.stringify(basePackage)) as Record<string, unknown>;
    const tvScreens = badPackage.tvScreens as Array<Record<string, unknown>>;
    tvScreens[0].title = 42;

    expect(() => normalizeLiveLessonDefinition(badPackage)).toThrowError(
      expect.objectContaining({ code: 'LIVE_PACKAGE_INVALID' }),
    );
  });

  it('whitelists the normalized AI error payload', () => {
    const basePackage = JSON.parse(pilotPackageText) as Record<string, unknown>;
    const leakedPackage = JSON.parse(JSON.stringify(basePackage)) as Record<string, unknown>;
    const aiError = leakedPackage.aiErrorOfTheWeek as Record<string, unknown>;
    aiError.answer = 'leaked answer';
    aiError.title = 'leaked title';
    aiError.libraryCard = 'leaked library card';

    const definition = normalizeLiveLessonDefinition(leakedPackage);
    expect(definition.aiErrorOfTheWeek).toEqual({
      id: 'W01',
      category: 'Logical error',
      correction: '160>150 nên điều kiện 160≤150 sai; (6;7) không là nghiệm.',
      proof: 'Thay x=6,y=7: 15·6+10·7=160; 160≤150 là mệnh đề sai.',
    });
    expect(definition.aiErrorOfTheWeek).not.toHaveProperty('answer');
    expect(definition.aiErrorOfTheWeek).not.toHaveProperty('title');
  });

  it('rejects response types outside the runtime union', () => {
    const definition = getPilotLiveLessonDefinition();
    const badDefinition = {
      ...definition,
      responseSteps: definition.responseSteps.map((step, index) =>
        index === 0 ? { ...step, responseTypes: ['number'] } : step,
      ),
    };

    expect(() => validateLiveLessonDefinition(badDefinition as never)).toThrowError(
      expect.objectContaining({ code: 'LIVE_RESPONSE_TYPE_INVALID' }),
    );
  });

  it('rejects non-finite cue timing with a stable error code', () => {
    const definition = getPilotLiveLessonDefinition();
    const badDefinition = {
      ...definition,
      cues: definition.cues.map((cue, index) =>
        index === 1 ? { ...cue, atSeconds: Number.NaN } : cue,
      ),
    };

    expect(() => validateLiveLessonDefinition(badDefinition)).toThrowError(
      expect.objectContaining({ code: 'LIVE_CUE_ORDER_INVALID' }),
    );
  });

  it('rejects extra AI error fields on an already normalized definition', () => {
    const definition = getPilotLiveLessonDefinition();
    const badDefinition = {
      ...definition,
      aiErrorOfTheWeek: {
        ...definition.aiErrorOfTheWeek,
        answer: 'leaked answer',
      },
    };

    expect(() => validateLiveLessonDefinition(badDefinition)).toThrowError(
      expect.objectContaining({ code: 'LIVE_AI_ERROR_INVALID' }),
    );
  });
});
