import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSourceBundle } from '../../lessonGen/sourceIngestion';
import { buildSourceVerificationRecords } from '../../lessonGen/sourceVerification';
import { createV871AuthoringFixture } from './lessonIR.testFixture';
import { authorLessonIR, type AuthoredLessonIR } from './authorLessonIR';
import { AUTHORING_CONTEXT } from './authoringContext';
import { buildSourceModel } from './sourceModel';
import { validateExperienceAuthoringPlan, validateExperiencePlanMapping } from './experienceAuthoring';

const context = async (version: 1 | 2 = 2) => {
  const bundle = await createSourceBundle([{ id: 'teacher-source', name: 'Day-so.md', mimeType: 'text/markdown',
    role: 'teacher_lesson', durationMinutes: 40, content: 'Dãy số\nCho u_n = 2n + 1.\nHọc sinh giải thích cách chọn quy luật.' },
  { id: 'reference', name: 'reference.txt', mimeType: 'text/plain', role: 'reference', content: 'Additional context.' }]);
  if (version === 1) bundle.sourceHash = createHash('sha256').update(bundle.sources.map(source =>
    `${source.id}\n${source.name}\n${source.mimeType}\n${source.role}\n${source.content}`).join('\n---\n')).digest('hex');
  const reviews = buildSourceVerificationRecords(bundle).map(record => ({ ...record,
    status: record.kind === 'canonical_gap' ? 'needs_review' as const : 'verified' as const }));
  return { bundle, reviews, ownerUid: 'teacher-a', lessonId: 'authored-lesson',
    teacherApproval: { sourceId: 'teacher-source', sourceHash: bundle.sourceHash,
      durationMinutes: 40, reviewerUid: 'teacher-a', approvedAt: '2026-10-01T00:00:00.000Z' } };
};

afterEach(() => vi.restoreAllMocks());
const authoringFixture = (input: Awaited<ReturnType<typeof context>>) =>
  createV871AuthoringFixture(buildSourceModel(input.bundle, input.reviews), input.bundle.durationMinutes!);
const invokeStages = (input: Awaited<ReturnType<typeof context>>, lesson = authoringFixture(input).lesson) => {
  const plan = authoringFixture(input).plan;
  let calls = 0;
  return async () => JSON.stringify(++calls === 1 ? plan : lesson);
};
const mapped = (result: AuthoredLessonIR) => {
  expect(result.status).toBe('MAPPED');
  if (result.status !== 'MAPPED') throw new Error('Expected a mapped synthetic result');
  return result;
};

describe('V8.8.1 actual two-stage authoring', () => {
  const fixture = async () => {
    const input = await context();
    const source = buildSourceModel(input.bundle, input.reviews);
    return { input, ...createV871AuthoringFixture(source, 40), source };
  };
  it('uses the actual source-bound Stage1 before canonical Stage2 and never returns LEGACY', async () => {
    const { input, plan, lesson, source } = await fixture();
    const authoringContext = { sourceModel: source, durationMinutes: 40 };
    expect(validateExperienceAuthoringPlan(plan, authoringContext).mapping).toBe('MAPPABLE');
    expect(validateExperiencePlanMapping(plan, lesson, authoringContext)).toEqual([]);
    const prompts: string[] = [];
    const result = await authorLessonIR({ ...input, invoke: async prompt => {
      prompts.push(prompt);
      return JSON.stringify(prompts.length === 1 ? plan : lesson);
    } });
    expect(prompts).toHaveLength(2);
    expect(prompts[0]).toContain('ExperienceAuthoringPlanV1');
    expect(prompts[1]).toContain(JSON.stringify(plan));
    expect(result).toHaveProperty('status', 'MAPPED');
    expect(result).toHaveProperty('authoringPlan', plan);
    expect(result).toHaveProperty('lessonIR.extensions.v871Experience', plan.experience);
    expect(result).not.toHaveProperty('experience.status', 'LEGACY');
  });
  it('retains unsupported experience in one call without invoking Stage2 or inventing IR', async () => {
    const { input, plan } = await fixture();
    plan.experience.archetype = { ...plan.experience.archetype,
      v871: 'SEMINAR_DISCUSSION', canonicalBase: null, decision: 'REVIEW_REQUIRED' };
    let calls = 0;
    const result = await authorLessonIR({ ...input, invoke: async () => { calls++; return JSON.stringify(plan); } });
    expect(calls).toBe(1);
    expect(result).toHaveProperty('status', 'REVIEW_REQUIRED');
    expect(result).toHaveProperty('authoringPlan', plan);
    expect(result).not.toHaveProperty('lessonIR');
    expect(result).not.toHaveProperty('quality');
  });
  it('does not call Stage2 after two invalid Stage1 results', async () => {
    const { input } = await fixture();
    const prompts: string[] = [];
    await expect(authorLessonIR({ ...input, invoke: async prompt => { prompts.push(prompt); return '{}'; } }))
      .rejects.toThrow(/V871_AUTHORING_PLAN_INVALID/);
    expect(prompts).toHaveLength(2);
    expect(prompts.every(prompt => prompt.includes('ExperienceAuthoringPlanV1'))).toBe(true);
    expect(prompts[1]).toContain('shape:/version');
    expect(prompts[1]).toContain('"closingContract"');
    expect(prompts[0]).toContain('version, experience, subjectProfile, learningDesign, learningSourceRefs, activities, opening, closing');
    expect(prompts[0]).toContain('tối đa 8 activities');
  });
  it('repairs a plan missing closing fields by naming the omitted root keys', async () => {
    const { input, plan, lesson } = await fixture();
    const incomplete = structuredClone(plan);
    delete (incomplete as Partial<typeof plan>).opening;
    delete (incomplete as Partial<typeof plan>).closing;
    let calls = 0;
    let repairPrompt = '';
    const result = mapped(await authorLessonIR({ ...input, invoke: async prompt => {
      calls += 1;
      if (calls === 1) return JSON.stringify(incomplete);
      if (calls === 2) { repairPrompt = prompt; return JSON.stringify(plan); }
      return JSON.stringify(lesson);
    } }));
    expect(calls).toBe(3);
    expect(repairPrompt).toContain('/opening');
    expect(repairPrompt).toContain('/closing');
    expect(repairPrompt).toContain('Bắt buộc giữ đủ cả 13 khóa root');
    expect(result.lessonIR.schemaVersion).toBe('8.3.2');
  });
  it('isolates one correction per stage and caps total model calls at four', async () => {
    const { input, plan, lesson } = await fixture();
    const mutated = structuredClone(lesson);
    mutated.learningDesign.learningIntention.vi += ' thay đổi';
    const outputs = ['{}', JSON.stringify(plan), JSON.stringify(mutated), JSON.stringify(lesson)];
    let calls = 0;
    const result = await authorLessonIR({ ...input, invoke: async prompt => {
      if (calls >= 2) expect(prompt).toContain(JSON.stringify(plan));
      return outputs[calls++];
    } });
    expect(calls).toBe(4);
    expect(result).toHaveProperty('status', 'MAPPED');
    expect(result).toHaveProperty('authoringPlan', plan);
  });
  it('rejects mutated supplied experience instead of overwriting it with approved metadata', async () => {
    const { input, plan, lesson } = await fixture();
    lesson.extensions = { v871Experience: { ...plan.experience, sourceHash: 'forged' } };
    let calls = 0;
    await expect(authorLessonIR({ ...input, invoke: async () => JSON.stringify(++calls === 1 ? plan : lesson) }))
      .rejects.toThrow(/V871_STAGE2_MAPPING_INVALID/);
    expect(calls).toBe(3);
  });
  it('propagates transport failure without consuming hidden correction calls', async () => {
    const { input } = await fixture();
    const invoke = vi.fn(async () => { throw new Error('transport unavailable'); });
    await expect(authorLessonIR({ ...input, invoke })).rejects.toThrow('transport unavailable');
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});

describe('source-backed canonical IR authoring', () => {
  it('captures the real prompt with the serialized context separate from SOURCE_MODEL', async () => {
    const input = await context();
    let captured = '';
    const fixture = authoringFixture(input);
    let calls = 0;
    await authorLessonIR({ ...input, invoke: async prompt => {
      captured = prompt;
      return JSON.stringify(++calls === 1 ? fixture.plan : fixture.lesson);
    } });
    expect(captured).toContain(`AUTHORING_CONTEXT: ${JSON.stringify(AUTHORING_CONTEXT)}`);
    expect(captured).toContain('SOURCE_MODEL:');
    expect(captured.indexOf('AUTHORING_CONTEXT:')).toBeLessThan(captured.indexOf('SOURCE_MODEL:'));
    expect(JSON.stringify(AUTHORING_CONTEXT)).toContain('synthetic_visual_unit_circle');
    expect(JSON.stringify(AUTHORING_CONTEXT)).not.toContain('source_verified');
  });

  it('accepts genuine historical v1 without rewriting provenance or approval', async () => {
    const input = await context(1);
    const original = structuredClone(input);
    const result = mapped(await authorLessonIR({ ...input, invoke: invokeStages(input) }));
    expect(result.lessonIR.provenance?.sourceHash).toBe(original.bundle.sourceHash);
    expect(input).toEqual(original);
  });

  for (const version of [1, 2] as const) {
    it.each(['content', 'name', 'mimeType', 'role', 'order'] as const)(`rejects v${version} tampered %s before AI`, async field => {
      const input = await context(version);
      if (field === 'order') input.bundle.sources.reverse();
      else if (field === 'role') input.bundle.sources[1].role = 'canonical';
      else input.bundle.sources[0][field] += ' changed';
      input.reviews = buildSourceVerificationRecords(input.bundle).map(record => ({ ...record, status: 'verified' as const }));
      const invoke = vi.fn(async () => '{}');
      await expect(authorLessonIR({ ...input, invoke })).rejects.toThrow('SOURCE_HASH_MISMATCH');
      expect(invoke).not.toHaveBeenCalled();
    });
  }

  it.each(['digest', 'invoke'] as const)('uses the entry snapshot when input changes during %s', async phase => {
    const input = await context(1);
    const original = structuredClone(input);
    const fixture = authoringFixture(input);
    let calls = 0;
    const mutate = () => {
      input.bundle.sources[0].content = 'changed';
      input.bundle.durationMinutes = 80;
      input.bundle.sourceHash = 'changed';
      input.reviews.length = 0;
      input.teacherApproval.sourceId = 'changed';
      input.teacherApproval.reviewerUid = 'other';
    };
    if (phase === 'digest') {
      const digest = crypto.subtle.digest.bind(crypto.subtle);
      vi.spyOn(crypto.subtle, 'digest').mockImplementationOnce(async (...args) => {
        await Promise.resolve();
        mutate();
        return digest(...args);
      });
    }
    const result = mapped(await authorLessonIR({ ...input, invoke: async prompt => {
      expect(prompt).toContain('Cho u_n = 2n + 1.');
      await Promise.resolve();
      if (phase === 'invoke') mutate();
      return JSON.stringify(++calls === 1 ? fixture.plan : fixture.lesson);
    } }));
    expect(result.lessonIR.provenance?.sourceHash).toBe(original.bundle.sourceHash);
    expect(result.lessonIR.sourceVerification.canonicalSources[0].sourceId).toBe('teacher-source');
    expect(result.sourceModel.claims[0].excerpt).toBe('Cho u_n = 2n + 1.');
  });

  it('does not invoke AI when the original source gate is unresolved', async () => {
    const input = await context();
    let calls = 0;
    await expect(authorLessonIR({ ...input, teacherApproval: null, invoke: async () => { calls++; return '{}'; } }))
      .rejects.toThrow('SOURCE_GATE_NOT_VERIFIED');
    expect(calls).toBe(0);
  });

  it('rejects changed source bytes even when the asserted hash and approval still match', async () => {
    const input = await context();
    const tampered = { ...input.bundle, sources: [{ ...input.bundle.sources[0], content: 'Cho u_n = 999.' }] };
    const reviews = buildSourceVerificationRecords(tampered).map(record => ({ ...record, status: 'verified' as const }));
    let calls = 0;
    await expect(authorLessonIR({ ...input, bundle: tampered, reviews, invoke: async () => { calls++; return '{}'; } }))
      .rejects.toThrow('SOURCE_HASH_MISMATCH');
    expect(calls).toBe(0);
  });

  it('binds source provenance and resets claimed readiness to a real Quality Audit', async () => {
    const input = await context();
    const proposed = authoringFixture(input).lesson;
    proposed.buildStatus = 'PUBLISHED';
    proposed.qualityAudit.status = 'READY';
    proposed.sourceVerification.canonicalTerms = ['Dãy số'];
    proposed.sourceVerification.canonicalFormulas = ['u_n = 2n + 1'];
    proposed.sourceVerification.unresolved = [];
    proposed.learnerContext.evidence = [{ id: 'assumption', type: 'planning_assumption', summary: 'Cần kiểm tra kiến thức nền.',
      requiresTeacherConfirmation: true, confirmedByTeacher: true }];
    const result = mapped(await authorLessonIR({ ...input, invoke: invokeStages(input, proposed) }));
    expect(result.lessonIR.lesson.lessonId).toBe(input.lessonId);
    expect(result.lessonIR.buildStatus).toBe('QUALITY_AUDIT');
    expect(result.lessonIR.provenance?.sourceHash).toBe(input.bundle.sourceHash);
    expect(result.lessonIR.sourceVerification.canonicalSources[0]).toMatchObject({ sourceId: 'teacher-source', kind: 'teacher_lesson_plan' });
    expect(result.lessonIR.learnerContext.evidence[0]).toMatchObject({ requiresTeacherConfirmation: true,
      materialForReadyToTeach: true, confirmedByTeacher: false });
    expect(result.lessonIR.qualityAudit.status).toBe('BLOCKED');
    expect(result.quality.pendingRules).toContain('M01');
    expect(result.quality.teacherConfirmationsRequired.filter(item => item.id === 'assumption')).toHaveLength(1);
    expect(result.sourceModel.claims[0].excerpt).toBe('Cho u_n = 2n + 1.');
  });

  it('retains mathematical source issues raised by the draft for teacher review', async () => {
    const input = await context();
    const proposed = authoringFixture(input).lesson;
    proposed.sourceVerification.unresolved = ['Cần kiểm tra điều kiện của công thức.'];
    const result = mapped(await authorLessonIR({ ...input, invoke: invokeStages(input, proposed) }));
    expect(result.lessonIR.sourceVerification.status).toBe('SOURCE_VERIFICATION_REQUIRED');
    expect(result.quality.failedRules).toContain('M01');
  });

  it('rejects factual learner observations created by AI without user-supplied evidence', async () => {
    const input = await context();
    const proposed = authoringFixture(input).lesson;
    proposed.learnerContext.evidence = [{ id: 'fake', type: 'teacher_observed', summary: '8 học sinh đang yếu về dãy số.',
      sourceRef: 'teacher-source', requiresTeacherConfirmation: false }];
    await expect(authorLessonIR({ ...input, invoke: invokeStages(input, proposed) }))
      .rejects.toThrow('LEARNER_FACT_NOT_SUPPLIED');
  });

  it('repairs malformed output once and never accepts arbitrary HTML as a lesson', async () => {
    const input = await context();
    let calls = 0;
    const fixture = authoringFixture(input);
    const result = mapped(await authorLessonIR({ ...input, invoke: async prompt => {
      calls++;
      if (calls === 1) return '<html>fake lesson</html>';
      if (calls === 2) {
        expect(prompt).toContain('JSON_PARSE_FAILED:');
        expect(prompt).toContain('Unexpected token');
      }
      return JSON.stringify(calls === 2 ? fixture.plan : fixture.lesson);
    } }));
    expect(calls).toBe(3);
    expect(result.lessonIR.schemaVersion).toBe('8.3.2');
  });

  it('validates the first complete JSON object when the provider appends trailing commentary', async () => {
    const input = await context();
    const fixture = authoringFixture(input);
    let calls = 0;
    const result = mapped(await authorLessonIR({ ...input, invoke: async () => {
      calls++;
      const value = calls === 1 ? fixture.plan : fixture.lesson;
      return `${JSON.stringify(value)}\nThe JSON above follows the requested schema.`;
    } }));
    expect(calls).toBe(2);
    expect(result.lessonIR.schemaVersion).toBe('8.3.2');
  });

  it('rejects a claimed canonical formula that cannot be traced to the input text', async () => {
    const input = await context();
    const proposed = authoringFixture(input).lesson;
    proposed.sourceVerification.canonicalFormulas = ['u_n = 999'];
    await expect(authorLessonIR({ ...input, invoke: invokeStages(input, proposed) }))
      .rejects.toThrow('CANONICAL_FORMULA_NOT_IN_SOURCE');
  });

  it('rejects a generated question falsely claimed to be canonical source content', async () => {
    const input = await context();
    const proposed = authoringFixture(input).lesson;
    proposed.questions.Q1 = { id: 'Q1', prompt: { vi: 'Tính giới hạn của một hàm không có trong giáo án.' },
      responseType: 'text', hints: [], misconceptions: [], evidenceTargets: ['reasoning'],
      submissionModes: ['typed'], estimatedWorkTimeSec: 60, authoredSource: 'canonical' };
    await expect(authorLessonIR({ ...input, invoke: invokeStages(input, proposed) }))
      .rejects.toThrow('CANONICAL_QUESTION_NOT_IN_SOURCE');
  });

  it('labels new questions as system-authored rather than attributing them to the teacher', async () => {
    const input = await context();
    const proposed = authoringFixture(input).lesson;
    proposed.questions.Q1 = { id: 'Q1', prompt: { vi: 'Tìm một phản ví dụ cho quy tắc khác.' },
      responseType: 'text', hints: [], misconceptions: [], evidenceTargets: ['reasoning'],
      submissionModes: ['typed'], estimatedWorkTimeSec: 60, authoredSource: 'teacher' };
    const result = mapped(await authorLessonIR({ ...input, invoke: invokeStages(input, proposed) }));
    expect(result.lessonIR.questions.Q1.authoredSource).toBe('system_authored');
    expect(result.experience.status).not.toBe('LEGACY');
  });

  it('retries when candidate has BLOCKED v871Experience and succeeds on valid second output', async () => {
    const input = await context();
    const fixture = authoringFixture(input);
    const malformed = structuredClone(fixture.lesson);
    malformed.extensions = { v871Experience: { invalid: true } };

    const valid = fixture.lesson;
    let calls = 0;
    let secondPrompt = '';

    const result = mapped(await authorLessonIR({
      ...input,
      invoke: async prompt => {
        calls += 1;
        if (calls === 1) return JSON.stringify(fixture.plan);
        if (calls === 2) return JSON.stringify(malformed);
        secondPrompt = prompt;
        return JSON.stringify(valid);
      },
    }));

    expect(calls).toBe(3);
    expect(secondPrompt).toContain('V871_STAGE2_MAPPING_INVALID');
    expect(result.experience.status).not.toBe('LEGACY');
  });

  it('fails closed when candidate repeatedly returns BLOCKED v871Experience', async () => {
    const input = await context();
    const malformed = authoringFixture(input).lesson;
    malformed.extensions = { v871Experience: { invalid: true } };

    await expect(authorLessonIR({
      ...input,
      invoke: invokeStages(input, malformed),
    })).rejects.toThrow(/V871_STAGE2_MAPPING_INVALID/);
  });

  it('returns retained review-only experience for unsupported reveal without claiming READY', async () => {
    const input = await context();
    const { plan } = authoringFixture(input);
    plan.experience.reveal['act-1'] = {
      v871Policy: 'AUTO_AFTER_STATS', canonicalPolicy: null, decision: 'REVIEW_REQUIRED',
    };
    let calls = 0;
    const result = await authorLessonIR({ ...input, invoke: async () => {
      calls++; return JSON.stringify(plan);
    } });
    expect(calls).toBe(1);
    expect(result.status).toBe('REVIEW_REQUIRED');
    expect(result).toHaveProperty('authoringPlan', plan);
    expect(result).not.toHaveProperty('lessonIR');
    expect(result).not.toHaveProperty('quality');
  });
});
