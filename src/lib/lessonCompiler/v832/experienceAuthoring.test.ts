import { describe, it, expect } from 'vitest';
import {
  EXPERIENCE_AUTHORING_PLAN_SCHEMA,
  PEDAGOGICAL_ROLES,
  validateExperienceAuthoringPlanShape,
  buildExperienceAuthoringPrompt,
  type ExperienceAuthoringPlanV1,
} from './experienceAuthoring';
import * as authoring from './experienceAuthoring';
import { structuralLessonIR, createSyntheticSourceModel, createValidSyntheticAuthoringPlan } from './lessonIR.testFixture';


describe('M2c T3: Stage 1 Schema & Experience Authoring Plan Shape Guard', () => {
  it('accepts nonblank map IDs containing spaces without changing their bytes', () => {
    const plan = createValidSyntheticAuthoringPlan();
    plan.learningSourceRefs.successCriteria[' Tiêu chí 1 / nâng cao '] =
      structuredClone(Object.values(plan.learningSourceRefs.successCriteria)[0]);
    const result = validateExperienceAuthoringPlanShape(plan);
    expect(result.valid).toBe(true);
    expect(Object.keys(result.plan!.learningSourceRefs.successCriteria))
      .toContain(' Tiêu chí 1 / nâng cao ');
  });

  it.each(['default opening', 'exception opening', 'closing'] as const)(
    'rejects duplicate complete references in %s', kind => {
      const plan = createValidSyntheticAuthoringPlan();
      if (kind === 'exception opening') {
        plan.opening = {
          mode: 'AUTHORED_EXCEPTION', rationale: 'Mở đầu bằng việc xem lại cách giải.',
          sourceRefs: structuredClone(plan.subjectProfile.sourceRefs), refs: plan.opening.refs,
        };
      }
      const refs = kind === 'closing' ? plan.closing.refs : plan.opening.refs;
      refs.push(structuredClone(refs[0]) as never);
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some(issue => issue.keyword === 'uniqueItems')).toBe(true);
    },
  );
  it('validates a complete valid synthetic authoring plan shape with zero issues and returns detached snapshot', () => {
    const plan = createValidSyntheticAuthoringPlan();
    const result = validateExperienceAuthoringPlanShape(plan);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.plan).toBeDefined();

    // Verify detached snapshot: mutating original input does not affect result.plan
    plan.version = 'mutated' as unknown as '1.0';
    expect(result.plan?.version).toBe('1.0');
  });

  describe('Boundary & Codec Hardening (Negative getter, symbol, cycle, sparse, custom proto, custom iterator)', () => {
    it('rejects circular references as boundary issue without maximum call stack error', () => {
      const plan = createValidSyntheticAuthoringPlan();
      (plan as unknown as Record<string, unknown>).self = plan;
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.keyword === 'boundary')).toBe(true);
    });

    it('rejects getter property accessors across trust boundary', () => {
      const plan = createValidSyntheticAuthoringPlan();
      let getterCallCount = 0;
      Object.defineProperty(plan, 'maliciousGetter', {
        get() {
          getterCallCount++;
          return 'exploit';
        },
        enumerable: true,
        configurable: true,
      });
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.keyword === 'boundary')).toBe(true);
      // Codec inspects descriptor before reading value
      expect(getterCallCount).toBe(0);
    });

    it('rejects Symbol keys', () => {
      const plan = createValidSyntheticAuthoringPlan();
      const sym = Symbol('secret');
      (plan as unknown as Record<symbol, unknown>)[sym] = 'leaked';
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.keyword === 'boundary')).toBe(true);
    });

    it('rejects sparse arrays with holes', () => {
      const plan = createValidSyntheticAuthoringPlan();
      const sparseBeats = [];
      sparseBeats[2] = plan.activities[0].beats[0];
      (plan.activities[0] as unknown as Record<string, unknown>).beats = sparseBeats;
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.keyword === 'boundary')).toBe(true);
    });

    it('rejects exotic objects with custom prototype chain', () => {
      const customProto = { isCustom: true };
      const plan = Object.create(customProto);
      Object.assign(plan, createValidSyntheticAuthoringPlan());
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.keyword === 'boundary')).toBe(true);
    });

    it('rejects objects with custom iterator', () => {
      const plan = createValidSyntheticAuthoringPlan();
      (plan as unknown as Record<symbol, unknown>)[Symbol.iterator] = function* () {
        yield 1;
      };
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.keyword === 'boundary')).toBe(true);
    });

    it('accepts valid plan created with plain null prototype (Object.create(null))', () => {
      const validPlan = createValidSyntheticAuthoringPlan();
      const nullProtoPlan = Object.create(null);
      Object.assign(nullProtoPlan, validPlan);
      const result = validateExperienceAuthoringPlanShape(nullProtoPlan);
      expect(result.valid).toBe(true);
    });
  });

  describe('Root envelope 13 required fields and additionalProperties: false', () => {
    const requiredRootFields: (keyof ExperienceAuthoringPlanV1)[] = [
      'version',
      'experience',
      'subjectProfile',
      'learningDesign',
      'learningSourceRefs',
      'activities',
      'opening',
      'closing',
      'formativeDecisionCycles',
      'cycleRecheckRefs',
      'reflectionContract',
      'closingContract',
      'fastPathOrder',
    ];

    it.each(requiredRootFields)('rejects missing root field: %s', (field) => {
      const plan = createValidSyntheticAuthoringPlan();
      delete (plan as unknown as Record<string, unknown>)[field];
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some((issue) => issue.keyword === 'required')).toBe(true);
    });

    it('rejects unexpected foreign root properties (additionalProperties: false)', () => {
      const plan = createValidSyntheticAuthoringPlan();
      (plan as unknown as Record<string, unknown>).status = 'READY_TO_TEACH';
      (plan as unknown as Record<string, unknown>).qaApproval = true;
      (plan as unknown as Record<string, unknown>).modelTimestamp = Date.now();
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some((issue) => issue.keyword === 'additionalProperties')).toBe(true);
    });

    it('rejects non-object root inputs', () => {
      expect(validateExperienceAuthoringPlanShape(null).valid).toBe(false);
      expect(validateExperienceAuthoringPlanShape([]).valid).toBe(false);
      expect(validateExperienceAuthoringPlanShape('not-a-plan').valid).toBe(false);
      expect(validateExperienceAuthoringPlanShape(123).valid).toBe(false);
    });

    it('rejects version other than literal "1.0"', () => {
      const plan = createValidSyntheticAuthoringPlan();
      (plan as unknown as Record<string, unknown>).version = '1.1';
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });

    it('rejects null for required root objects', () => {
      const plan = createValidSyntheticAuthoringPlan();
      (plan as unknown as Record<string, unknown>).experience = null;
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });
  });

  describe('Explicit 1.1 experience metadata schema & provenance constraints', () => {
    it('rejects experience with missing required fields or version != "1.1"', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.experience.version = '1.0' as unknown as '1.1';
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });

    it('requires non-empty sourceBlockIds on archetype in Stage 1', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.experience.archetype.sourceBlockIds = [];
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.keyword === 'minItems')).toBe(true);
    });

    it('requires non-empty sourceBlockIds on every arc entry in Stage 1', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.experience.experienceArc[0].sourceBlockIds = [];
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });

    it('requires non-empty sourceBlockIds on visualOpportunityAudit in Stage 1', () => {
      const plan = createValidSyntheticAuthoringPlan();
      delete (plan.experience.visualOpportunityAudit as unknown as Record<string, unknown>).sourceBlockIds;
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });

    it('requires non-empty sourceBlockIds on both capability audits in Stage 1', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.experience.capabilities.collaboration.sourceBlockIds = [];
      expect(validateExperienceAuthoringPlanShape(plan).valid).toBe(false);

      const plan2 = createValidSyntheticAuthoringPlan();
      plan2.experience.capabilities.peerReview.sourceBlockIds = [];
      expect(validateExperienceAuthoringPlanShape(plan2).valid).toBe(false);
    });

    it('requires non-empty sourceBlockIds on non-null repetitionRationale in Stage 1', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.experience.activities['act-1'].repetitionRationale = {
        text: 'Lặp lại có chủ đích để khắc sâu kỹ năng tính toán.',
        sourceClaimIds: [],
        sourceBlockIds: [],
      };
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });

    it('accepts empty sourceClaimIds when real sourceBlockIds are present', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.experience.archetype.sourceClaimIds = [];
      plan.experience.archetype.sourceBlockIds = ['B1'];
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(true);
    });

    it('rejects experience with invalid archetype enum', () => {
      const plan = createValidSyntheticAuthoringPlan();
      (plan.experience.archetype as unknown as Record<string, unknown>).v871 = 'INVALID_ARCHETYPE';
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });

    it('rejects experience with invalid attentionTarget enum', () => {
      const plan = createValidSyntheticAuthoringPlan();
      (plan.experience.activities['act-1'].signature as unknown as Record<string, unknown>).attentionTarget = 'TELEVISION_UNKNOWN';
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });
  });

  describe('Pedagogical roles and teaching beats', () => {
    it('defines exactly 23 pedagogical roles matching approved contract', () => {
      expect(PEDAGOGICAL_ROLES).toHaveLength(23);
      expect(PEDAGOGICAL_ROLES).toContain('PROBLEM');
      expect(PEDAGOGICAL_ROLES).toContain('GUIDING_QUESTION');
      expect(PEDAGOGICAL_ROLES).toContain('LESSON_TITLE');
      expect(PEDAGOGICAL_ROLES).toContain('LEARNER_GOAL');
      expect(PEDAGOGICAL_ROLES).toContain('TEACHER_GOAL');
      expect(PEDAGOGICAL_ROLES).toContain('INITIAL_THINKING');
      expect(PEDAGOGICAL_ROLES).toContain('EXPLORE');
      expect(PEDAGOGICAL_ROLES).toContain('DISCUSS');
      expect(PEDAGOGICAL_ROLES).toContain('FORMALIZE');
      expect(PEDAGOGICAL_ROLES).toContain('WORKED_EXAMPLE');
      expect(PEDAGOGICAL_ROLES).toContain('GUIDED_PRACTICE');
      expect(PEDAGOGICAL_ROLES).toContain('DIAGNOSTIC');
      expect(PEDAGOGICAL_ROLES).toContain('STRATEGY_MODEL');
      expect(PEDAGOGICAL_ROLES).toContain('ERROR_ANALYSIS');
      expect(PEDAGOGICAL_ROLES).toContain('INDEPENDENT_EVIDENCE');
      expect(PEDAGOGICAL_ROLES).toContain('RESPONSIVE_ACTION');
      expect(PEDAGOGICAL_ROLES).toContain('TRANSFER');
      expect(PEDAGOGICAL_ROLES).toContain('REFLECT');
      expect(PEDAGOGICAL_ROLES).toContain('RECHECK');
      expect(PEDAGOGICAL_ROLES).toContain('EXIT');
      expect(PEDAGOGICAL_ROLES).toContain('SELF_ASSESSMENT');
      expect(PEDAGOGICAL_ROLES).toContain('NEXT_STEP');
      expect(PEDAGOGICAL_ROLES).toContain('TEACHER_CLOSE');
    });

    it('rejects invalid pedagogical role in teaching beat', () => {
      const plan = createValidSyntheticAuthoringPlan();
      (plan.activities[0].beats[0].roles as unknown as string[]) = ['NOT_A_REAL_ROLE'];
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });

    it('rejects empty roles array in teaching beat', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.activities[0].beats[0].roles = [];
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });

    it('rejects duplicate roles in teaching beat', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.activities[0].beats[0].roles = ['PROBLEM', 'PROBLEM'];
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.keyword === 'uniqueItems')).toBe(true);
    });

    it('rejects invalid beat phase', () => {
      const plan = createValidSyntheticAuthoringPlan();
      (plan.activities[0].beats[0] as unknown as Record<string, unknown>).phase = 'INTRO';
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });
  });

  describe('Opening union and closing contract', () => {
    it('accepts valid opening in DEFAULT mode', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.opening = {
        mode: 'DEFAULT',
        refs: [
          { role: 'PROBLEM', activityId: 'act-1', beatId: 'b-1-1' },
          { role: 'GUIDING_QUESTION', activityId: 'act-1', beatId: 'b-1-1' },
          { role: 'LESSON_TITLE', activityId: 'act-1', beatId: 'b-1-2' },
          { role: 'LEARNER_GOAL', activityId: 'act-1', beatId: 'b-1-2' },
          { role: 'TEACHER_GOAL', activityId: 'act-1', beatId: 'b-1-2' },
        ],
      };
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(true);
    });

    it('accepts valid opening in AUTHORED_EXCEPTION mode', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.opening = {
        mode: 'AUTHORED_EXCEPTION',
        rationale: 'Bài học tiếp nối trực tiếp từ tiết 1, không nhắc lại bài toán mở đầu.',
        sourceRefs: { sourceBlockIds: ['B1'], sourceClaimIds: ['C1'] },
        refs: [
          { role: 'LESSON_TITLE', activityId: 'act-1', beatId: 'b-1-2' },
          { role: 'LEARNER_GOAL', activityId: 'act-1', beatId: 'b-1-2' },
        ],
      };
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(true);
    });

    it('rejects AUTHORED_EXCEPTION mode missing rationale or sourceRefs', () => {
      const plan = createValidSyntheticAuthoringPlan();
      (plan.opening as unknown as Record<string, unknown>) = {
        mode: 'AUTHORED_EXCEPTION',
        refs: [{ role: 'LESSON_TITLE', activityId: 'act-1', beatId: 'b-1-2' }],
      };
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });

    it('rejects opening ref with invalid opening role', () => {
      const plan = createValidSyntheticAuthoringPlan();
      (plan.opening.refs[0] as unknown as Record<string, unknown>).role = 'RECHECK';
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });

    it('rejects closing ref with invalid closing role', () => {
      const plan = createValidSyntheticAuthoringPlan();
      (plan.closing.refs[0] as unknown as Record<string, unknown>).role = 'PROBLEM';
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });

    it('rejects empty nextStepOptions in closing', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.closing.nextStepOptions = [];
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });

    it('rejects closing options missing EN/JA learner copy', () => {
      const plan = createValidSyntheticAuthoringPlan();
      delete (plan.closing.nextStepOptions[0].label as unknown as Record<string, unknown>).ja;
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });

    it('requires all 3 strings in closingContract', () => {
      const plan = createValidSyntheticAuthoringPlan();
      delete (plan.closingContract as unknown as Record<string, unknown>).studentPersonalFeedback;
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });
  });

  describe('Nullable fields required but accept null', () => {
    it('accepts explicit null for planned activity nullable fields', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.activities[0].discussionPrompt = null;
      plan.activities[0].formalization = null;
      plan.activities[0].notebookAction = null;
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(true);
    });

    it('rejects omitted (undefined) nullable fields on planned activity', () => {
      const plan = createValidSyntheticAuthoringPlan();
      delete (plan.activities[0] as unknown as Record<string, unknown>).discussionPrompt;
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some((issue) => issue.keyword === 'required')).toBe(true);
    });

    it('accepts explicit null for teaching beat expectedEvidence', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.activities[0].beats[0].expectedEvidence = null;
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(true);
    });

    it('rejects omitted expectedEvidence on teaching beat', () => {
      const plan = createValidSyntheticAuthoringPlan();
      delete (plan.activities[0].beats[0] as unknown as Record<string, unknown>).expectedEvidence;
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });
  });

  describe('Nonblank authored text encoded directly in schema via pattern \\S', () => {
    it('rejects empty string or whitespace-only in subjectProfile.subject directly via pattern', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.subjectProfile.subject = '   ';
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.keyword === 'pattern')).toBe(true);
    });

    it('rejects whitespace-only string in LocaleText vi', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.learningDesign.learningIntention.vi = '   ';
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.keyword === 'pattern')).toBe(true);
    });

    it('rejects empty string in planned activity teacherAction', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.activities[0].teacherAction = '';
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });

    it('rejects whitespace-only string in teaching beat instruction', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.activities[0].beats[0].instruction = '  \t\n ';
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.keyword === 'pattern')).toBe(true);
    });

    it('rejects whitespace-only in closingContract strings', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.closingContract.presenterClassSummary = '  ';
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.keyword === 'pattern')).toBe(true);
    });
  });

  describe('Safe bounded integer seconds', () => {
    it('rejects negative or fractional durationSec in planned activity', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.activities[0].durationSec = -60;
      expect(validateExperienceAuthoringPlanShape(plan).valid).toBe(false);

      plan.activities[0].durationSec = 120.5;
      expect(validateExperienceAuthoringPlanShape(plan).valid).toBe(false);
    });

    it('rejects durationSec exceeding MAX_SAFE_INTEGER', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.activities[0].durationSec = Number.MAX_SAFE_INTEGER + 1000;
      expect(validateExperienceAuthoringPlanShape(plan).valid).toBe(false);
    });

    it('rejects negative entrySec, organizationSec, or transitionSec', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.activities[0].entrySec = -10;
      expect(validateExperienceAuthoringPlanShape(plan).valid).toBe(false);

      plan.activities[0].entrySec = 30;
      plan.activities[0].organizationSec = 15.2;
      expect(validateExperienceAuthoringPlanShape(plan).valid).toBe(false);
    });

    it('rejects zero or negative durationSec in teaching beat', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.activities[0].beats[0].durationSec = 0;
      expect(validateExperienceAuthoringPlanShape(plan).valid).toBe(false);

      plan.activities[0].beats[0].durationSec = -30;
      expect(validateExperienceAuthoringPlanShape(plan).valid).toBe(false);
    });
  });

  describe('Unique items across reference and list arrays', () => {
    it('rejects duplicate sourceBlockIds in SourceRefs', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.subjectProfile.sourceRefs.sourceBlockIds = ['B1', 'B1'];
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.keyword === 'uniqueItems')).toBe(true);
    });

    it('rejects duplicate sourceClaimIds in SourceRefs', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.subjectProfile.sourceRefs.sourceClaimIds = ['C1', 'C1'];
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.keyword === 'uniqueItems')).toBe(true);
    });

    it('rejects duplicate mappedActivityRefs in SuccessCriterion', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.learningDesign.successCriteria[0].mappedActivityRefs = ['act-2', 'act-2'];
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.keyword === 'uniqueItems')).toBe(true);
    });

    it('rejects duplicate fastPathOrder IDs', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.fastPathOrder = ['act-3', 'act-3'];
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.keyword === 'uniqueItems')).toBe(true);
    });
  });

  describe('Planning obstacles and criteria constraints', () => {
    it('rejects misconception with provenanceType outside planning_assumption|unknown', () => {
      const plan = createValidSyntheticAuthoringPlan();
      (plan.learningDesign.misconceptions![0] as unknown as Record<string, unknown>).provenanceType = 'observed';
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });

    it('rejects potential obstacle with requiresTeacherConfirmation === false', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.activities[0].potentialObstacles[0].requiresTeacherConfirmation = false as unknown as true;
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });

    it('rejects success criteria with empty mappedActivityRefs', () => {
      const plan = createValidSyntheticAuthoringPlan();
      plan.learningDesign.successCriteria[0].mappedActivityRefs = [];
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });

    it('rejects success criteria with non-empty mappedQuestionRefs in stage 1', () => {
      const plan = createValidSyntheticAuthoringPlan();
      (plan.learningDesign.successCriteria[0] as unknown as Record<string, unknown>).mappedQuestionRefs = ['Q1'];
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });
  });

  describe('Unsafe map key rejection via schema propertyNames', () => {
    it('rejects __proto__ or constructor keys in record mappings via schema propertyNames', () => {
      const plan = createValidSyntheticAuthoringPlan();
      const unsafeObj = JSON.parse('{"__proto__": {"sourceBlockIds": ["B1"], "sourceClaimIds": ["C1"]}}');
      Object.assign(plan.learningSourceRefs.successCriteria, unsafeObj);
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });

    it('rejects constructor key in reveal map', () => {
      const plan = createValidSyntheticAuthoringPlan();
      const unsafeReveal = JSON.parse('{"constructor": {"v871Policy": "TEACHER_MANUAL", "canonicalPolicy": "teacher_manual", "decision": "LOSSLESS"}}');
      Object.assign(plan.experience.reveal, unsafeReveal);
      const result = validateExperienceAuthoringPlanShape(plan);
      expect(result.valid).toBe(false);
    });
  });

  describe('buildExperienceAuthoringPrompt and schema equality', () => {
    it('serializes the EXACT exported Ajv schema and unmodified SourceModel bytes into prompt', () => {
      const sourceModel = createSyntheticSourceModel();
      const sourceModelSnapshot = JSON.stringify(sourceModel, null, 2);

      const prompt = buildExperienceAuthoringPrompt(sourceModel, 45, 'practice');

      // Schema serialized into prompt matches exported schema exactly
      const schemaJson = JSON.stringify(EXPERIENCE_AUTHORING_PLAN_SCHEMA);
      expect(prompt).toContain(schemaJson);

      // SourceModel serialized directly preserving bytes and spaces
      expect(prompt).toContain(JSON.stringify(sourceModel));
      expect(prompt).toContain('  Định lý sin trong tam giác: a/sinA = b/sinB = c/sinC = 2R.  ');
      expect(prompt).toContain('45');
      expect(prompt).toContain('practice');

      // No claims of QA readiness or executable HTML/JS in prompt instructions
      expect(prompt).not.toContain('<script>');
      expect(prompt).not.toContain('READY_TO_TEACH');

      // SourceModel is NOT mutated
      expect(JSON.stringify(sourceModel, null, 2)).toBe(sourceModelSnapshot);
    });
  });
});

describe('M2c T4: source-bound experience decisions', () => {
  const sourceCase = () => {
    const plan = createValidSyntheticAuthoringPlan();
    const source = createSyntheticSourceModel();
    const refs = [plan.experience.archetype, plan.experience.visualOpportunityAudit,
      plan.experience.capabilities.collaboration, plan.experience.capabilities.peerReview,
      plan.subjectProfile.sourceRefs, plan.learningSourceRefs.learningIntention,
      ...Object.values(plan.learningSourceRefs.successCriteria),
      ...plan.activities.map(activity => activity.sourceRefs)];
    for (const ref of refs) if (!ref.sourceBlockIds?.includes('B1')) ref.sourceClaimIds = [];
    return { plan, source };
  };
  const check = (plan: unknown, source: unknown): string[] => {
    const validate = (authoring as unknown as Record<string, unknown>).validateExperienceAuthoringSource;
    expect(typeof validate).toBe('function');
    return (validate as (plan: unknown, source: unknown) => string[])(plan, source);
  };

  it('accepts block-backed decisions and verified same-block claims without mutation', () => {
    const { plan, source } = sourceCase();
    const before = JSON.stringify({ plan, source });
    expect(check(plan, source)).toEqual([]);
    expect(JSON.stringify({ plan, source })).toBe(before);
  });
  it('accepts text-only sources with zero claims and grounded NOT_APPLICABLE audits', () => {
    const { plan, source } = sourceCase();
    source.claims = [];
    source.blocks.forEach(block => { block.text = 'Trao đổi cách giải thích và ghi lại kết luận.'; });
    const stripClaims = (value: unknown): void => {
      if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) {
        if (key === 'sourceClaimIds') (value as Record<string, unknown>)[key] = [];
        else stripClaims(item);
      }
    };
    stripClaims(plan);
    expect(check(plan, source)).toEqual([]);
  });
  it.each(['archetype', 'arc', 'visual', 'collaboration', 'peerReview', 'repetition',
    'subject', 'intention', 'criterion', 'activity', 'opening'])(
    'checks real block provenance at %s', site => {
      const { plan, source } = sourceCase();
      plan.experience.activities['act-1'].repetitionRationale = {
        text: 'Lặp lại để so sánh cách lập luận.', sourceBlockIds: ['B1'], sourceClaimIds: [],
      };
      plan.opening = { mode: 'AUTHORED_EXCEPTION', rationale: 'Ôn cách giải đã học.',
        sourceRefs: { sourceBlockIds: ['B1'], sourceClaimIds: [] }, refs: plan.opening.refs };
      const refs = {
        archetype: plan.experience.archetype, arc: plan.experience.experienceArc[0],
        visual: plan.experience.visualOpportunityAudit,
        collaboration: plan.experience.capabilities.collaboration,
        peerReview: plan.experience.capabilities.peerReview,
        repetition: plan.experience.activities['act-1'].repetitionRationale,
        subject: plan.subjectProfile.sourceRefs, intention: plan.learningSourceRefs.learningIntention,
        criterion: plan.learningSourceRefs.successCriteria.SC1, activity: plan.activities[0].sourceRefs,
        opening: plan.opening.sourceRefs,
      };
      refs[site as keyof typeof refs].sourceBlockIds = ['unknown-block'];
      expect(check(plan, source).length).toBeGreaterThan(0);
    },
  );
  it.each(['hash', 'sourceIssues', 'claimMissing', 'unreviewed', 'rejected', 'claimBlock',
    'claimSource', 'duplicateBlock', 'duplicateClaim', 'arcBlocks', 'arcActivity',
    'criterionMissing', 'criterionExtra', 'duplicateCriterion', 'duplicateActivity'])(
    'rejects untrustworthy source binding: %s', defect => {
      const { plan, source } = sourceCase();
      switch (defect) {
        case 'hash': source.sourceHash = 'different-source'; break;
        case 'sourceIssues': source.issues = ['UNREADABLE_SOURCE']; break;
        case 'claimMissing': source.claims = []; break;
        case 'unreviewed': source.claims[0].status = 'needs_review'; break;
        case 'rejected': source.claims[0].status = 'rejected'; break;
        case 'claimBlock': source.claims[0].sourceBlockId = 'B2'; break;
        case 'claimSource': source.claims[0].sourceId = 'another-source'; break;
        case 'duplicateBlock': source.blocks.push(structuredClone(source.blocks[0])); break;
        case 'duplicateClaim': source.claims.push(structuredClone(source.claims[0])); break;
        case 'arcBlocks': plan.experience.experienceArc[0].sourceBlockIds = ['B2']; break;
        case 'arcActivity': plan.experience.experienceArc[0].activityId = 'missing'; break;
        case 'criterionMissing': delete plan.learningSourceRefs.successCriteria.SC1; break;
        case 'criterionExtra': plan.learningSourceRefs.successCriteria.extra = plan.subjectProfile.sourceRefs; break;
        case 'duplicateCriterion': plan.learningDesign.successCriteria.push(plan.learningDesign.successCriteria[0]); break;
        case 'duplicateActivity': plan.activities.push(plan.activities[0]); break;
      }
      expect(check(plan, source).length).toBeGreaterThan(0);
    },
  );
  it.each([null, undefined, { blocks: null }, { blocks: [null] }, { claims: [null] }])(
    'fails closed without throwing on malformed source %j', malformed => {
      const { plan, source } = sourceCase();
      const invalid = malformed == null ? malformed : { ...source, ...malformed };
      expect(check(plan, invalid).length).toBeGreaterThan(0);
    },
  );
  it('rejects source getters and sparse entries without reading getters', () => {
    const { plan, source } = sourceCase();
    let reads = 0;
    Object.defineProperty(source, 'sourceHash', { enumerable: true, get: () => { reads++; return 'forged'; } });
    expect(check(plan, source).length).toBeGreaterThan(0);
    expect(reads).toBe(0);
    const sparse = sourceCase();
    delete sparse.source.blocks[0];
    expect(check(sparse.plan, sparse.source).length).toBeGreaterThan(0);
  });
});

describe('M2c T5: connected teaching choreography', () => {
  const choreographyCase = () => {
    const plan = createValidSyntheticAuthoringPlan();
    plan.learningDesign.successCriteria.forEach(criterion => criterion.mappedActivityRefs.push('act-4'));
    plan.formativeDecisionCycles[0].recheck.newEvidence = 'Lời giải bài 2 thể hiện cách tính R để đối chiếu SC2.';
    return plan;
  };
  const check = (plan: unknown): string[] => {
    const validate = (authoring as unknown as Record<string, unknown>).validateExperienceAuthoringChoreography;
    expect(typeof validate).toBe('function');
    return (validate as (plan: unknown) => string[])(plan);
  };
  it('accepts connected goals, compatible opening roles and distinct ending functions without mutation', () => {
    const plan = choreographyCase();
    const before = JSON.stringify(plan);
    expect(check(plan)).toEqual([]);
    expect(JSON.stringify(plan)).toBe(before);
  });
  it('accepts all five ending beats in one activity after collection work', () => {
    const plan = choreographyCase();
    const recheck = plan.activities[2].beats.pop()!;
    plan.activities[3].beats.unshift(recheck);
    plan.closing.refs[0].activityId = 'act-4';
    plan.cycleRecheckRefs['cycle-1'].activityId = 'act-4';
    expect(check(plan)).toEqual([]);
  });
  it.each(['order', 'arcOrder', 'arcMissing', 'activityMapExtra', 'revealMissing',
    'activityPhase', 'duplicateActivity', 'duplicateBeat', 'duplicateCriterion',
    'unknownActivityCriterion', 'unknownBeatCriterion', 'danglingCriterionActivity', 'nonreciprocal',
    'openingRole', 'openingOrder', 'openingMissing', 'openingDangling', 'openingRoleNotOnBeat',
    'closingOrder', 'closingMissing', 'closingDangling', 'mergedEnding', 'exitNoEvidence',
    'recheckNoCriteria', 'selfAssessmentMissingGoal', 'reflectionGoals', 'reflectionText', 'nextText',
    'duplicateNextOption', 'cycleDuplicate', 'cycleKeys', 'cycleActivity', 'cycleCriteria',
    'cycleRecheckBeforeWork', 'cycleWrongRecheck', 'missingFormalization', 'missingIndependentEvidence'])(
    'rejects disconnected choreography: %s', defect => {
      const plan = choreographyCase();
      switch (defect) {
        case 'order': plan.activities[1].order = 9; break;
        case 'arcOrder': plan.experience.experienceArc.reverse(); break;
        case 'arcMissing': plan.experience.experienceArc.pop(); break;
        case 'activityMapExtra': plan.experience.activities.extra = plan.experience.activities['act-1']; break;
        case 'revealMissing': delete plan.experience.reveal['act-2']; break;
        case 'activityPhase': plan.activities[1].phase = 'unmapped'; break;
        case 'duplicateActivity': plan.activities[1].id = 'act-1'; break;
        case 'duplicateBeat': plan.activities[1].beats[0].id = 'b-1-1'; break;
        case 'duplicateCriterion': plan.learningDesign.successCriteria.push(plan.learningDesign.successCriteria[0]); break;
        case 'unknownActivityCriterion': plan.activities[1].successCriteriaRefs = ['unknown']; break;
        case 'unknownBeatCriterion': plan.activities[1].beats[0].successCriteriaRefs = ['unknown']; break;
        case 'danglingCriterionActivity': plan.learningDesign.successCriteria[0].mappedActivityRefs = ['unknown']; break;
        case 'nonreciprocal': plan.learningDesign.successCriteria[0].mappedActivityRefs.push('act-3'); break;
        case 'openingRole': plan.opening.refs[0].role = 'LESSON_TITLE'; break;
        case 'openingOrder': plan.opening.refs.reverse(); break;
        case 'openingMissing': plan.opening.refs.pop(); break;
        case 'openingDangling': plan.opening.refs[0].beatId = 'unknown'; break;
        case 'openingRoleNotOnBeat': plan.activities[0].beats[0].roles = ['INITIAL_THINKING']; break;
        case 'closingOrder': plan.closing.refs.reverse(); break;
        case 'closingMissing': plan.closing.refs.pop(); break;
        case 'closingDangling': plan.closing.refs[0].activityId = 'unknown'; break;
        case 'mergedEnding':
          plan.activities[3].beats[1].roles.push('NEXT_STEP');
          plan.closing.refs[3].beatId = plan.closing.refs[2].beatId;
          break;
        case 'exitNoEvidence': plan.activities[3].beats[0].expectedEvidence = null; break;
        case 'recheckNoCriteria': plan.activities[2].beats[1].successCriteriaRefs = []; break;
        case 'selfAssessmentMissingGoal': plan.activities[3].beats[1].successCriteriaRefs = ['SC1']; break;
        case 'reflectionGoals': plan.reflectionContract.mappedSuccessCriteria = ['SC1']; break;
        case 'reflectionText': plan.reflectionContract.studentReflection = 'Mục tiêu khác'; break;
        case 'nextText': plan.reflectionContract.nextStep = 'Nhiệm vụ khác'; break;
        case 'duplicateNextOption': plan.closing.nextStepOptions[1].id = plan.closing.nextStepOptions[0].id; break;
        case 'cycleDuplicate': plan.formativeDecisionCycles.push(plan.formativeDecisionCycles[0]); break;
        case 'cycleKeys': delete plan.cycleRecheckRefs['cycle-1']; break;
        case 'cycleActivity': plan.formativeDecisionCycles[0].activityRef = 'unknown'; break;
        case 'cycleCriteria': plan.formativeDecisionCycles[0].mappedSuccessCriteria = ['unknown']; break;
        case 'cycleRecheckBeforeWork': plan.activities[2].beats.reverse(); break;
        case 'cycleWrongRecheck': plan.cycleRecheckRefs['cycle-1'].beatId = 'b-3-1'; break;
        case 'missingFormalization': plan.activities[1].beats[1].roles = ['WORKED_EXAMPLE']; break;
        case 'missingIndependentEvidence': plan.activities[2].beats[1].roles = ['RECHECK']; break;
      }
      expect(check(plan).length).toBeGreaterThan(0);
    },
  );
  it('requires practice/review diagnostic and strategy roles without coercing other archetypes', () => {
    const plan = choreographyCase();
    plan.experience.archetype.v871 = 'PRACTICE_REVIEW';
    expect(check(plan).length).toBeGreaterThan(0);
    plan.activities[0].beats[0].roles.push('DIAGNOSTIC');
    plan.activities[1].beats[1].roles.push('STRATEGY_MODEL');
    expect(check(plan)).toEqual([]);
    plan.experience.archetype.v871 = 'SEMINAR_DISCUSSION';
    expect(check(plan)).toEqual([]);
  });
  it.each(['instruction', 'option'])('rejects whitespace-padded self-rating as next-step %s', target => {
    const plan = choreographyCase();
    const self = plan.activities[3].beats[1].instruction;
    if (target === 'instruction') {
      plan.activities[3].beats[2].instruction = ` ${self} `;
      plan.reflectionContract.nextStep = plan.activities[3].beats[2].instruction;
    } else plan.closing.nextStepOptions[0].action = ` ${self} `;
    expect(check(plan)).toContain('V871_NEXT_STEP_IS_SELF_RATING');
  });
  it('rejects duplicate exception-opening roles but accepts an authored subset', () => {
    const plan = choreographyCase();
    plan.opening = { mode: 'AUTHORED_EXCEPTION', rationale: 'Mở đầu rút gọn.',
      sourceRefs: structuredClone(plan.subjectProfile.sourceRefs), refs: [plan.opening.refs[0]] };
    expect(check(plan)).toEqual([]);
    plan.activities[0].beats[1].roles.push('PROBLEM');
    plan.opening.refs.push({ role: 'PROBLEM', activityId: 'act-1', beatId: 'b-1-2' });
    expect(check(plan)).toContain('V871_OPENING_ROLE_DUPLICATE');
  });
  it.each([null, undefined, { activities: [] }])('rejects malformed plan %j without throwing', plan => {
    expect(check(plan).length).toBeGreaterThan(0);
  });
});

describe('M2c T6: conserved timing and protected evidence', () => {
  const timingCase = () => {
    const plan = createValidSyntheticAuthoringPlan();
    plan.learningDesign.successCriteria.forEach(criterion => criterion.mappedActivityRefs.push('act-4'));
    for (const activity of plan.activities) {
      const meta = plan.experience.activities[activity.id];
      activity.beats[0].durationSec -= meta.recoveryBudgetSec;
      meta.fastPath.cuttable = false;
    }
    plan.fastPathOrder = [];
    return plan;
  };
  const check = (plan: unknown, minutes: unknown = 45): string[] => {
    const validate = (authoring as unknown as Record<string, unknown>).validateExperienceAuthoringTiming;
    expect(typeof validate).toBe('function');
    return (validate as (plan: unknown, minutes: unknown) => string[])(plan, minutes);
  };
  it('accepts real recovery allocation and preserves input bytes', () => {
    const plan = timingCase();
    const before = JSON.stringify(plan);
    expect(check(plan)).toEqual([]);
    expect(JSON.stringify(plan)).toBe(before);
  });
  it('accepts positive fractional minutes with exact integer seconds', () => {
    const plan = timingCase();
    plan.activities[0].durationSec += 30;
    plan.experience.activities['act-1'].recoveryBudgetSec += 30;
    plan.experience.timing.reserveBudgetSec += 30;
    plan.experience.timing.slotDurationSec += 30;
    expect(check(plan, 45.5)).toEqual([]);
  });
  it('allows zero individual recovery but requires positive lesson reserve', () => {
    const plan = timingCase();
    const first = plan.experience.activities['act-1'];
    plan.activities[0].beats[0].durationSec += first.recoveryBudgetSec;
    first.coreBudgetSec += first.recoveryBudgetSec;
    plan.experience.timing.coreBudgetSec += first.recoveryBudgetSec;
    plan.experience.timing.reserveBudgetSec -= first.recoveryBudgetSec;
    first.recoveryBudgetSec = 0;
    expect(check(plan)).toEqual([]);
  });
  it('accepts exact authored cut priority only while criterion coverage remains', () => {
    const plan = timingCase();
    plan.experience.activities['act-2'].fastPath.cuttable = true;
    plan.fastPathOrder = ['act-2'];
    expect(check(plan)).toEqual([]);
    plan.learningDesign.successCriteria[0].mappedActivityRefs = ['act-2'];
    expect(check(plan).length).toBeGreaterThan(0);
  });
  it.each(['core', 'duration', 'entry', 'organization', 'transition', 'globalCore', 'globalReserve',
    'slot', 'unsafeSum', 'noReserve', 'missingMetadata', 'extraMetadata', 'inheritedMetadata',
    'protectedOpeningCut', 'protectedCycleCut', 'protectedClosingCut', 'missingRole', 'extraRole',
    'missingFastpath', 'extraFastpath', 'duplicateFastpath', 'cycleWrongOwner', 'cycleNonRecheck'])(
    'rejects timing/protection defect: %s', defect => {
      const plan = timingCase();
      switch (defect) {
        case 'core': plan.experience.activities['act-1'].coreBudgetSec++; break;
        case 'duration': plan.activities[0].durationSec++; break;
        case 'entry': plan.activities[0].entrySec++; break;
        case 'organization': plan.activities[0].organizationSec++; break;
        case 'transition': plan.activities[0].transitionSec++; break;
        case 'globalCore': plan.experience.timing.coreBudgetSec++; break;
        case 'globalReserve': plan.experience.timing.reserveBudgetSec++; break;
        case 'slot': plan.experience.timing.slotDurationSec++; break;
        case 'unsafeSum': plan.activities[0].entrySec = Number.MAX_SAFE_INTEGER; break;
        case 'noReserve':
          for (const activity of plan.activities) {
            const meta = plan.experience.activities[activity.id];
            activity.beats[0].durationSec += meta.recoveryBudgetSec;
            meta.coreBudgetSec += meta.recoveryBudgetSec;
            meta.recoveryBudgetSec = 0;
          }
          plan.experience.timing.coreBudgetSec = plan.experience.timing.slotDurationSec;
          plan.experience.timing.reserveBudgetSec = 0;
          break;
        case 'missingMetadata': delete plan.experience.activities['act-1']; break;
        case 'extraMetadata': plan.experience.activities.extra = plan.experience.activities['act-1']; break;
        case 'inheritedMetadata': plan.activities[0].id = 'toString'; break;
        case 'protectedOpeningCut': plan.experience.activities['act-1'].fastPath.cuttable = true; plan.fastPathOrder = ['act-1']; break;
        case 'protectedCycleCut': plan.experience.activities['act-3'].fastPath.cuttable = true; plan.fastPathOrder = ['act-3']; break;
        case 'protectedClosingCut': plan.experience.activities['act-4'].fastPath.cuttable = true; plan.fastPathOrder = ['act-4']; break;
        case 'missingRole': plan.experience.activities['act-3'].protectedEvidence = []; break;
        case 'extraRole': plan.experience.activities['act-1'].protectedEvidence = ['exit']; break;
        case 'missingFastpath': plan.experience.activities['act-2'].fastPath.cuttable = true; break;
        case 'extraFastpath': plan.fastPathOrder = ['unknown']; break;
        case 'duplicateFastpath': plan.experience.activities['act-2'].fastPath.cuttable = true; plan.fastPathOrder = ['act-2', 'act-2']; break;
        case 'cycleWrongOwner': plan.cycleRecheckRefs['cycle-1'].activityId = 'act-2'; break;
        case 'cycleNonRecheck': plan.cycleRecheckRefs['cycle-1'].beatId = 'b-3-1'; break;
      }
      expect(check(plan).length).toBeGreaterThan(0);
    },
  );
  it.each([0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER, 45.001, '45', null])(
    'rejects nonnumeric or unsafe/nonintegral slot duration %j', minutes => {
      expect(check(timingCase(), minutes).length).toBeGreaterThan(0);
    },
  );
});

describe('M2c T7: explicit validated Stage1 mapping', () => {
  const authoringCase = () => {
    const plan = createValidSyntheticAuthoringPlan();
    const sourceModel = createSyntheticSourceModel();
    const cleanClaims = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      const ref = value as Record<string, unknown>;
      if (Array.isArray(ref.sourceClaimIds) && Array.isArray(ref.sourceBlockIds)
        && !ref.sourceBlockIds.includes('B1')) ref.sourceClaimIds = [];
      Object.values(ref).forEach(cleanClaims);
    };
    cleanClaims(plan);
    plan.learningDesign.successCriteria.forEach(criterion => criterion.mappedActivityRefs.push('act-4'));
    for (const activity of plan.activities) {
      const meta = plan.experience.activities[activity.id];
      activity.beats[0].durationSec -= meta.recoveryBudgetSec;
      meta.fastPath.cuttable = false;
    }
    plan.fastPathOrder = [];
    plan.experience.activities['act-2'].handoff.deviceState = 'view_only';
    plan.formativeDecisionCycles[0].recheck.newEvidence = 'Lời giải bài 2 để đối chiếu với tiêu chí SC2.';
    return { plan, context: { sourceModel, durationMinutes: 45 } };
  };
  const check = (plan: unknown, context: unknown) => {
    const validate = (authoring as unknown as Record<string, unknown>).validateExperienceAuthoringPlan;
    expect(typeof validate).toBe('function');
    return (validate as (plan: unknown, context: unknown) => {
      plan: ExperienceAuthoringPlanV1; mapping: 'MAPPABLE' | 'REVIEW_ONLY'; diagnostics: string[];
    })(plan, context);
  };
  const practice = (plan: ExperienceAuthoringPlanV1) => {
    plan.experience.archetype.v871 = 'PRACTICE_REVIEW';
    plan.activities[0].beats[0].roles.push('DIAGNOSTIC');
    plan.activities[1].beats[1].roles.push('STRATEGY_MODEL');
  };
  it('composes real gates into lossless mapping without mutating or claiming readiness', () => {
    const { plan, context } = authoringCase();
    const before = JSON.stringify({ plan, context });
    const result = check(plan, context);
    expect(result.mapping).toBe('MAPPABLE');
    expect(result.plan).toEqual(plan);
    expect(result.plan).not.toBe(plan);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result).not.toHaveProperty('ready');
    expect(JSON.stringify({ plan, context })).toBe(before);
  });
  it.each(['practice', 'review_diagnostic'] as const)('honors actual teacher choice %s', choice => {
    const { plan, context } = authoringCase();
    practice(plan);
    plan.experience.archetype.canonicalBase = choice;
    plan.experience.archetype.decision = 'TEACHER_SELECTED';
    expect(check(plan, { ...context, teacherArchetypeChoice: choice }).mapping).toBe('MAPPABLE');
    const other = choice === 'practice' ? 'review_diagnostic' : 'practice';
    expect(() => check(plan, { ...context, teacherArchetypeChoice: other })).toThrow();
    expect(() => check(plan, context)).toThrow();
  });
  it('retains a practice plan without actual teacher choice as review-only', () => {
    const { plan, context } = authoringCase();
    practice(plan);
    plan.experience.archetype.canonicalBase = null;
    plan.experience.archetype.decision = 'REVIEW_REQUIRED';
    const result = check(plan, context);
    expect(result.mapping).toBe('REVIEW_ONLY');
    expect(result.plan).toEqual(plan);
  });
  it.each(['APPLICATION_TRANSFER', 'INVESTIGATION_EXPERIENTIAL', 'ASSESSMENT_FEEDBACK',
    'PROJECT_WORKSHOP', 'SEMINAR_DISCUSSION', 'MIXED'] as const)('retains unsupported archetype %s', archetype => {
      const { plan, context } = authoringCase();
      plan.experience.archetype.v871 = archetype;
      plan.experience.archetype.canonicalBase = null;
      plan.experience.archetype.decision = 'REVIEW_REQUIRED';
      const result = check(plan, context);
      expect(result.mapping).toBe('REVIEW_ONLY');
      expect(result.plan.experience.archetype.v871).toBe(archetype);
    },
  );
  it.each(['AUTO_AFTER_STATS', 'DISCUSSION_THEN_REVEAL'] as const)('retains unsupported reveal %s', policy => {
    const { plan, context } = authoringCase();
    plan.experience.reveal['act-1'] = { v871Policy: policy, canonicalPolicy: null, decision: 'REVIEW_REQUIRED' };
    const result = check(plan, context);
    expect(result.mapping).toBe('REVIEW_ONLY');
    expect(result.plan.experience.reveal['act-1'].v871Policy).toBe(policy);
  });
  it('keeps no-reveal lossless but physical targets and authored opening exceptions review-only', () => {
    const { plan, context } = authoringCase();
    plan.experience.reveal['act-1'] = { v871Policy: 'NO_REVEAL', canonicalPolicy: 'no_reveal', decision: 'LOSSLESS' };
    expect(check(plan, context).mapping).toBe('MAPPABLE');
    plan.experience.activities['act-1'].signature.attentionTarget = 'PHYSICAL_MODEL';
    plan.experience.activities['act-1'].handoff.target = 'PHYSICAL_MODEL';
    expect(check(plan, context).mapping).toBe('REVIEW_ONLY');
    const exception = authoringCase();
    exception.plan.opening = { mode: 'AUTHORED_EXCEPTION', rationale: 'Ôn cách giải trước khi vào bài.',
      sourceRefs: structuredClone(exception.plan.subjectProfile.sourceRefs), refs: [exception.plan.opening.refs[0]] };
    expect(check(exception.plan, exception.context).diagnostics).toContain('OPENING_REVIEW_REQUIRED');
    expect(check(exception.plan, exception.context).mapping).toBe('REVIEW_ONLY');
  });
  it.each(['source', 'choreography', 'timing', 'archetype', 'reveal', 'attention', 'device'])(
    'does not bypass actual gate: %s', defect => {
      const { plan, context } = authoringCase();
      switch (defect) {
        case 'source': context.sourceModel.sourceHash = 'tampered'; break;
        case 'choreography': plan.activities[1].order = 99; break;
        case 'timing': plan.activities[0].durationSec++; break;
        case 'archetype': plan.experience.archetype.canonicalBase = 'practice'; break;
        case 'reveal': plan.experience.reveal['act-1'].canonicalPolicy = 'no_reveal'; break;
        case 'attention': plan.experience.activities['act-1'].handoff.target = 'PAPER'; break;
        case 'device': plan.experience.activities['act-1'].handoff.deviceState = 'interactive'; break;
      }
      expect(() => check(plan, context)).toThrow();
    },
  );
  it.each([null, undefined, {}, { teacherArchetypeChoice: 'flipped' }, { extra: true }])(
    'rejects missing or malformed authoring context %j', malformed => {
      const { plan, context } = authoringCase();
      const value = malformed == null || Object.keys(malformed).length === 0
        ? malformed : { ...context, ...malformed };
      expect(() => check(plan, value)).toThrow();
    },
  );
  it('rejects context getters without reading them', () => {
    const { plan, context } = authoringCase();
    let reads = 0;
    Object.defineProperty(context, 'sourceModel', { enumerable: true, get: () => { reads++; throw new Error('getter'); } });
    expect(() => check(plan, context)).toThrow();
    expect(reads).toBe(0);
  });
  describe('Stage2 immutable mapping', () => {
    const mappingCase = () => {
      const { plan, context } = authoringCase();
      const lesson = structuralLessonIR();
      lesson.lesson.subject = plan.subjectProfile.subject;
      lesson.lesson.runtimeMin = context.durationMinutes;
      lesson.archetype.type = 'concept_formation';
      lesson.learningDesign = structuredClone(plan.learningDesign) as typeof lesson.learningDesign;
      lesson.formativeDecisionCycles = structuredClone(plan.formativeDecisionCycles);
      lesson.reflectionContract = structuredClone(plan.reflectionContract);
      lesson.closingContract = structuredClone(plan.closingContract);
      lesson.provenance = { sourceHash: context.sourceModel.sourceHash };
      const base = lesson.timeline[0];
      const surface = { PRESENTER: 'presenter', BOARD: 'board', STUDENT_DEVICE: 'student_device',
        PAPER: 'notebook', PEER: 'pair_group', GROUP: 'pair_group', PHYSICAL_MODEL: 'presenter' } as const;
      const beacon = { PRESENTER: 'LOOK_UP', BOARD: 'BOARD', STUDENT_DEVICE: 'DEVICE',
        PAPER: 'NOTEBOOK', PEER: 'PAIR_GROUP', GROUP: 'PAIR_GROUP', PHYSICAL_MODEL: 'LOOK_UP' } as const;
      lesson.timeline = plan.activities.map((activity, index) => {
        const mapped = structuredClone(base);
        const meta = plan.experience.activities[activity.id];
        for (const key of ['id', 'order', 'title', 'durationSec', 'phase', 'successCriteriaRefs',
          'teacherAction', 'studentAction', 'cognitiveDemand', 'expectedEvidence', 'successLookFor'] as const)
          (mapped as unknown as Record<string, unknown>)[key] = structuredClone(activity[key]);
        mapped.objectiveRefs = ['LI1'];
        mapped.student.state = meta.handoff.deviceState;
        mapped.student.requiredProduct = activity.expectedProduct;
        mapped.coach.purpose = plan.experience.experienceArc[index].purpose;
        mapped.coach.observe = [activity.expectedEvidence, activity.successLookFor,
          ...activity.beats.map(beat => beat.expectedEvidence).filter((text): text is string => text !== null)];
        mapped.coach.ifManyStruggle = [...activity.responsiveMoves, meta.handoff.fallback];
        mapped.coach.ask = activity.discussionPrompt ? [activity.discussionPrompt] : [];
        mapped.coach.board = activity.formalization ? [activity.formalization] : [];
        mapped.coach.studentMirror.misconceptions = activity.potentialObstacles.map(item => item.description);
        mapped.coach.studentMirror.expectedProduct = activity.expectedProduct;
        mapped.notebookAction = activity.notebookAction;
        mapped.fallback = activity.offlineFallback;
        mapped.transitionPolicy = activity.transitionToNext;
        mapped.revealPolicy = plan.experience.reveal[activity.id].canonicalPolicy!;
        mapped.threeWayOrchestration.primaryAttentionSurface = surface[meta.handoff.target];
        mapped.attentionBeacon.mode = beacon[meta.handoff.target];
        const from = index === 0 ? 'presenter' : surface[plan.experience.activities[plan.activities[index - 1].id].handoff.target];
        mapped.surfaceHandoff = { fromSurface: from, toSurface: surface[meta.handoff.target],
          entry: { presenterCue: { vi: meta.handoff.entryCue }, studentState: meta.handoff.deviceState,
            coachState: 'Theo dõi học sinh bắt đầu nhiệm vụ.', durationSec: activity.entrySec },
          work: { durationSec: activity.organizationSec + activity.beats.reduce((sum, beat) => sum + beat.durationSec, 0),
            presenterMode: 'Giữ nhiệm vụ trên màn hình.', studentMode: 'Làm nhiệm vụ.', coachMode: 'Quan sát minh chứng.' },
          recall: { presenterCue: { vi: meta.handoff.exitCue }, studentCue: { vi: meta.handoff.exitCue },
            coachAction: 'Mời học sinh trở lại phần trao đổi.', durationSec: activity.transitionSec } };
        mapped.timingPolicy = { plannedDurationSec: activity.durationSec,
          surfaceSwitchCostSec: activity.entrySec + activity.transitionSec, neverAutoNext: true,
          protected: [...plan.opening.refs, ...plan.closing.refs, ...Object.values(plan.cycleRecheckRefs)]
            .some(ref => ref.activityId === activity.id) || plan.formativeDecisionCycles.some(cycle => cycle.activityRef === activity.id) };
        return mapped;
      }) as typeof lesson.timeline;
      return { plan, context, lesson };
    };
    const compare = (plan: unknown, lesson: unknown, context: unknown): string[] => {
      const validate = (authoring as unknown as Record<string, unknown>).validateExperiencePlanMapping;
      expect(typeof validate).toBe('function');
      return (validate as (plan: unknown, lesson: unknown, context: unknown) => string[])(plan, lesson, context);
    };
    it('preserves accepted intent, both fallback strings and input bytes', () => {
      const { plan, context, lesson } = mappingCase();
      const before = JSON.stringify({ plan, context, lesson });
      expect(compare(plan, lesson, context)).toEqual([]);
      expect(JSON.stringify({ plan, context, lesson })).toBe(before);
      lesson.extensions = { v871Experience: structuredClone(plan.experience) };
      expect(compare(plan, lesson, context)).toEqual([]);
      lesson.learningDesign = Object.fromEntries(Object.entries(lesson.learningDesign).reverse()) as typeof lesson.learningDesign;
      expect(compare(plan, lesson, context)).toEqual([]);
    });
    it.each(['subject', 'runtime', 'archetype', 'goal', 'cycle', 'reflection', 'closing', 'timelineOrder',
      'title', 'duration', 'teacherAction', 'criteria', 'objective', 'product', 'mirrorProduct', 'notebook',
      'fallback', 'transition', 'coachPurpose', 'coachObserve', 'coachMoves', 'coachMisconception',
      'discussion', 'formalization', 'surface', 'beacon', 'studentState', 'reveal', 'handoffCue',
      'handoffFrom', 'handoffWork', 'timingCost', 'protection', 'extension'])(
      'rejects accepted-plan mutation: %s', field => {
        const { plan, context, lesson } = mappingCase();
        const activity = lesson.timeline[1];
        switch (field) {
          case 'subject': lesson.lesson.subject += ' '; break;
          case 'runtime': lesson.lesson.runtimeMin++; break;
          case 'archetype': lesson.archetype.type = 'practice'; break;
          case 'goal': lesson.learningDesign.learningIntention.vi += ' '; break;
          case 'cycle': lesson.formativeDecisionCycles[0].collect.method += ' '; break;
          case 'reflection': lesson.reflectionContract.nextStep += ' '; break;
          case 'closing': lesson.closingContract!.studentPersonalFeedback += ' '; break;
          case 'timelineOrder': lesson.timeline.reverse(); break;
          case 'title': activity.title.vi += ' '; break;
          case 'duration': activity.durationSec++; break;
          case 'teacherAction': activity.teacherAction += ' '; break;
          case 'criteria': activity.successCriteriaRefs = []; break;
          case 'objective': activity.objectiveRefs = ['LI2']; break;
          case 'product': activity.student.requiredProduct += ' '; break;
          case 'mirrorProduct': activity.coach.studentMirror.expectedProduct += ' '; break;
          case 'notebook': activity.notebookAction = null; break;
          case 'fallback': activity.fallback += ' '; break;
          case 'transition': activity.transitionPolicy += ' '; break;
          case 'coachPurpose': activity.coach.purpose += ' '; break;
          case 'coachObserve': activity.coach.observe.reverse(); break;
          case 'coachMoves': activity.coach.ifManyStruggle!.pop(); break;
          case 'coachMisconception': activity.coach.studentMirror.misconceptions = []; break;
          case 'discussion': activity.coach.ask = []; break;
          case 'formalization': activity.coach.board = []; break;
          case 'surface': activity.threeWayOrchestration.primaryAttentionSurface = 'notebook'; break;
          case 'beacon': activity.attentionBeacon.mode = 'NOTEBOOK'; break;
          case 'studentState': activity.student.state = 'interactive'; break;
          case 'reveal': activity.revealPolicy = 'no_reveal'; break;
          case 'handoffCue': activity.surfaceHandoff!.entry.presenterCue.vi += ' '; break;
          case 'handoffFrom': activity.surfaceHandoff!.fromSurface = 'notebook'; break;
          case 'handoffWork': activity.surfaceHandoff!.work.durationSec++; break;
          case 'timingCost': activity.timingPolicy.surfaceSwitchCostSec++; break;
          case 'protection': lesson.timeline[0].timingPolicy.protected = false; break;
          case 'extension': lesson.extensions = { v871Experience: { ...plan.experience, sourceHash: 'forged' } }; break;
        }
        expect(compare(plan, lesson, context).length).toBeGreaterThan(0);
      },
    );
    it('rejects malformed candidates and prevents review-only plans from mapping', () => {
      const { plan, context, lesson } = mappingCase();
      expect(compare(plan, null, context).length).toBeGreaterThan(0);
      plan.opening = { mode: 'AUTHORED_EXCEPTION', rationale: 'Ôn bài trước khi vào nhiệm vụ.',
        sourceRefs: structuredClone(plan.subjectProfile.sourceRefs), refs: [plan.opening.refs[0]] };
      expect(compare(plan, lesson, context).length).toBeGreaterThan(0);
    });
    it('requires question budgets inside core and ignores untrusted extra workSec', () => {
      const { plan, context, lesson } = mappingCase();
      const activity = lesson.timeline[1];
      lesson.questions.Q1 = { id: 'Q1', prompt: structuredClone(activity.student.exactCopy), responseType: 'short',
        hints: [], misconceptions: [], evidenceTargets: ['SC1'], submissionModes: ['typed'],
        estimatedWorkTimeSec: 600, authoredSource: 'system_authored' };
      activity.questionInstances = [{ instanceId: 'Q1@act-2', questionId: 'Q1', activityId: 'act-2',
        attemptMode: 'fresh', required: true, order: 1 }];
      expect(compare(plan, lesson, context)).toContain('V871_STAGE2_QUESTION_BUDGET_MISSING:act-2');
      const budget = { introSec: 0, closeSec: 0,
        questions: { 'Q1@act-2': { statsSec: 0, revealDebriefSec: 0, transitionSec: 0 } } };
      lesson.extensions = { v84: { version: '1.0', activityBudgets: { 'act-2': budget } } };
      expect(compare(plan, lesson, context)).toEqual([]);
      lesson.questions.Q1.estimatedWorkTimeSec = 900;
      expect(compare(plan, lesson, context)).toContain('V871_STAGE2_QUESTION_CORE_BUDGET_EXCEEDED:act-2');
      Object.assign(budget.questions['Q1@act-2'], { workSec: 0 });
      expect(compare(plan, lesson, context)).toContain('V871_STAGE2_QUESTION_CORE_BUDGET_EXCEEDED:act-2');
    });
  });
});
