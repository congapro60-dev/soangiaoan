import { describe, expect, it } from 'vitest';
import { evaluateExperienceDesign } from './experienceDesign';
import { structuralLessonIR } from './lessonIR.testFixture';
import { createValidV871Extension, createValidV871V11Extension } from './experienceExtension.test';
import type { LessonIRV83 } from './lessonIRSchema';
import type { SourceModel } from './sourceModel';

const syntheticSourceModel: Pick<SourceModel, 'sourceHash' | 'claims'> = {
  sourceHash: 'source-hash-test',
  claims: [{ id: 'CLAIM-1', sourceId: 'S1', sourceBlockId: 'B1', kind: 'math_expression' as const, excerpt: 'Text', status: 'verified' as const }],
};

export const create3ActivityLessonIR = (): LessonIRV83 => {
  const lesson = structuralLessonIR();
  lesson.lesson.runtimeMin = 40;
  lesson.provenance = { sourceHash: 'source-hash-test' };
  lesson.archetype = { type: 'concept_formation', rationale: 'Concept formation test' };

  const a1 = structuredClone(lesson.timeline[0]);
  a1.id = 'A1';
  a1.order = 1;
  a1.phase = 'hook';
  a1.durationSec = 600;
  a1.timingPolicy.plannedDurationSec = 600;
  a1.threeWayOrchestration.primaryAttentionSurface = 'presenter';
  a1.student.state = 'view_only';
  a1.revealPolicy = 'teacher_manual';

  const a2 = structuredClone(lesson.timeline[0]);
  a2.id = 'A2';
  a2.order = 2;
  a2.phase = 'practice';
  a2.durationSec = 1200;
  a2.timingPolicy.plannedDurationSec = 1200;
  a2.threeWayOrchestration.primaryAttentionSurface = 'student_device';
  a2.student.state = 'interactive';
  a2.revealPolicy = 'teacher_manual';

  const a3 = structuredClone(lesson.timeline[0]);
  a3.id = 'A3';
  a3.order = 3;
  a3.phase = 'exit';
  a3.durationSec = 600;
  a3.timingPolicy.plannedDurationSec = 600;
  a3.threeWayOrchestration.primaryAttentionSurface = 'student_device';
  a3.student.state = 'interactive';
  a3.revealPolicy = 'no_reveal';

  lesson.timeline = [a1, a2, a3];
  lesson.extensions = {
    v871Experience: createValidV871Extension(),
  };
  return lesson;
};

describe('V8.8.1 experience design evaluation', () => {
  it('keeps legacy lessons explicitly separate from structural validity', () => {
    const result = evaluateExperienceDesign(structuralLessonIR());
    expect(result).toEqual({ status: 'LEGACY', issues: [], diagnostics: [], warnings: [] });
  });

  it('converts malformed recognized metadata into a blocked result', () => {
    const result = evaluateExperienceDesign({ extensions: { v871Experience: null } } as never);
    expect(result.status).toBe('BLOCKED');
    expect(result.issues[0]).toContain('V871_EXTENSION_INVALID');
  });

  it('evaluates valid 3-activity clone to STRUCTURALLY_VALID', () => {
    const lesson = create3ActivityLessonIR();
    const result = evaluateExperienceDesign(lesson, syntheticSourceModel);
    expect(result.status).toBe('STRUCTURALLY_VALID');
    expect(result.issues).toEqual([]);
    expect(result.diagnostics).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('detects sourceHash mismatch and missing claim IDs', () => {
    const lesson = create3ActivityLessonIR();
    lesson.provenance = { sourceHash: 'different-hash' };
    const res1 = evaluateExperienceDesign(lesson, syntheticSourceModel);
    expect(res1.issues).toContain('V871_SOURCE_HASH_MISMATCH');

    const lesson2 = create3ActivityLessonIR();
    const ext = lesson2.extensions!.v871Experience as any;
    ext.archetype.sourceClaimIds = ['NON_EXISTENT_CLAIM'];
    const res2 = evaluateExperienceDesign(lesson2, syntheticSourceModel);
    expect(res2.issues).toContain('V871_SOURCE_CLAIM_NOT_FOUND:NON_EXISTENT_CLAIM');
  });

  it('emits V871_PROVENANCE_REVIEW_REQUIRED when sourceModel is absent', () => {
    const lesson = create3ActivityLessonIR();
    const result = evaluateExperienceDesign(lesson);
    expect(result.status).toBe('REVIEW_REQUIRED');
    expect(result.diagnostics).toContain('V871_PROVENANCE_REVIEW_REQUIRED');
  });

  it('enforces exact experienceArc timeline ordering and coverage', () => {
    const lesson = create3ActivityLessonIR();
    const ext = lesson.extensions!.v871Experience as any;
    // Swap arc order
    ext.experienceArc = [
      { activityId: 'A2', purpose: 'Practice' },
      { activityId: 'A1', purpose: 'Orientation' },
      { activityId: 'A3', purpose: 'Exit' },
    ];
    const result = evaluateExperienceDesign(lesson, syntheticSourceModel);
    expect(result.status).toBe('BLOCKED');
    expect(result.issues).toContain('V871_ACTIVITY_COVERAGE_INVALID');
  });

  it('enforces exact reveal coverage and detects reveal policy semantic conflict', () => {
    const lesson = create3ActivityLessonIR();
    // Conflict: canonical is no_reveal, extension claims TEACHER_MANUAL
    lesson.timeline[0].revealPolicy = 'no_reveal';
    const result = evaluateExperienceDesign(lesson, syntheticSourceModel);
    expect(result.status).toBe('BLOCKED');
    expect(result.issues).toContain('V871_SEMANTIC_CONFLICT');
  });

  it('handles unsupported reveal policies with null canonicalPolicy as REVIEW_REQUIRED', () => {
    const lesson = create3ActivityLessonIR();
    const ext = lesson.extensions!.v871Experience as any;
    ext.reveal.A1 = {
      v871Policy: 'AUTO_AFTER_STATS',
      canonicalPolicy: null,
      decision: 'REVIEW_REQUIRED',
    };
    const result = evaluateExperienceDesign(lesson, syntheticSourceModel);
    expect(result.status).toBe('REVIEW_REQUIRED');
    expect(result.diagnostics).toContain('V871_MAPPING_REVIEW_REQUIRED');
  });

  it('detects archetype semantic conflicts between extension and canonical IR', () => {
    const lesson = create3ActivityLessonIR();
    lesson.archetype.type = 'practice';
    const result = evaluateExperienceDesign(lesson, syntheticSourceModel);
    expect(result.status).toBe('BLOCKED');
    expect(result.issues).toContain('V871_SEMANTIC_CONFLICT');
  });

  it('supports PRACTICE_REVIEW with teacher-selected practice or review_diagnostic', () => {
    const lesson = create3ActivityLessonIR();
    lesson.archetype.type = 'practice';
    const ext = lesson.extensions!.v871Experience as any;
    ext.archetype = {
      v871: 'PRACTICE_REVIEW',
      canonicalBase: 'practice',
      decision: 'TEACHER_SELECTED',
      rationale: 'Teacher selected practice',
      sourceClaimIds: ['CLAIM-1'],
    };
    const result = evaluateExperienceDesign(lesson, syntheticSourceModel);
    expect(result.status).toBe('STRUCTURALLY_VALID');
    expect(result.issues).toEqual([]);
  });

  it('rejects KNOWLEDGE_FORMATION with empty rationale or empty claims', () => {
    const lesson = create3ActivityLessonIR();
    const ext = lesson.extensions!.v871Experience as any;
    ext.archetype.rationale = '   ';
    const res1 = evaluateExperienceDesign(lesson, syntheticSourceModel);
    expect(res1.status).toBe('BLOCKED');
    expect(res1.issues).toContain('V871_SEMANTIC_CONFLICT');

    const lesson2 = create3ActivityLessonIR();
    const ext2 = lesson2.extensions!.v871Experience as any;
    ext2.archetype.sourceClaimIds = [];
    const res2 = evaluateExperienceDesign(lesson2, syntheticSourceModel);
    expect(res2.status).toBe('BLOCKED');
  });

  it('rejects PRACTICE_REVIEW or non-lossless archetypes with empty rationale or empty claims', () => {
    const lesson = create3ActivityLessonIR();
    lesson.archetype.type = 'practice';
    const ext = lesson.extensions!.v871Experience as any;
    ext.archetype = {
      v871: 'PRACTICE_REVIEW',
      canonicalBase: 'practice',
      decision: 'TEACHER_SELECTED',
      rationale: '   ',
      sourceClaimIds: ['CLAIM-1'],
    };
    const res1 = evaluateExperienceDesign(lesson, syntheticSourceModel);
    expect(res1.status).toBe('BLOCKED');
    expect(res1.issues).toContain('V871_SEMANTIC_CONFLICT');

    const lesson2 = create3ActivityLessonIR();
    lesson2.archetype.type = 'practice';
    const ext2 = lesson2.extensions!.v871Experience as any;
    ext2.archetype = {
      v871: 'PRACTICE_REVIEW',
      canonicalBase: 'practice',
      decision: 'TEACHER_SELECTED',
      rationale: 'Valid rationale',
      sourceClaimIds: [],
    };
    const res2 = evaluateExperienceDesign(lesson2, syntheticSourceModel);
    expect(res2.status).toBe('BLOCKED');
    expect(res2.issues.some(i => i.includes('V871_SEMANTIC_CONFLICT') || i.includes('V871_EXTENSION_INVALID'))).toBe(true);

    const lesson3 = create3ActivityLessonIR();
    lesson3.archetype.type = 'modeling_application';
    const ext3 = lesson3.extensions!.v871Experience as any;
    ext3.archetype = {
      v871: 'APPLICATION_TRANSFER',
      canonicalBase: 'modeling_application',
      decision: 'REVIEW_REQUIRED',
      rationale: '',
      sourceClaimIds: ['CLAIM-1'],
    };
    const res3 = evaluateExperienceDesign(lesson3, syntheticSourceModel);
    expect(res3.status).toBe('BLOCKED');
    expect(res3.issues).toContain('V871_SEMANTIC_CONFLICT');

    const lesson4 = create3ActivityLessonIR();
    lesson4.archetype.type = 'modeling_application';
    const ext4 = lesson4.extensions!.v871Experience as any;
    ext4.archetype = {
      v871: 'APPLICATION_TRANSFER',
      canonicalBase: 'modeling_application',
      decision: 'REVIEW_REQUIRED',
      rationale: 'Valid rationale',
      sourceClaimIds: [],
    };
    const res4 = evaluateExperienceDesign(lesson4, syntheticSourceModel);
    expect(res4.status).toBe('BLOCKED');
    expect(res4.issues.some(i => i.includes('V871_SEMANTIC_CONFLICT') || i.includes('V871_EXTENSION_INVALID'))).toBe(true);
  });

  it('flags review-required archetypes with V871_MAPPING_REVIEW_REQUIRED', () => {
    const lesson = create3ActivityLessonIR();
    lesson.archetype.type = 'modeling_application';
    const ext = lesson.extensions!.v871Experience as any;
    ext.archetype = {
      v871: 'APPLICATION_TRANSFER',
      canonicalBase: 'modeling_application',
      decision: 'REVIEW_REQUIRED',
      rationale: 'Application transfer requiring pedagogical review',
      sourceClaimIds: ['CLAIM-1'],
    };
    const result = evaluateExperienceDesign(lesson, syntheticSourceModel);
    expect(result.status).toBe('REVIEW_REQUIRED');
    expect(result.diagnostics).toContain('V871_MAPPING_REVIEW_REQUIRED');
  });

  it('validates signature attentionTarget and handoff deviceState against canonical activity', () => {
    const lesson = create3ActivityLessonIR();
    // Mismatch: signature target is BOARD while canonical is presenter
    const ext = lesson.extensions!.v871Experience as any;
    ext.activities.A1.signature.attentionTarget = 'BOARD';
    const res1 = evaluateExperienceDesign(lesson, syntheticSourceModel);
    expect(res1.status).toBe('BLOCKED');
    expect(res1.issues).toContain('V871_SEMANTIC_CONFLICT');

    const lesson2 = create3ActivityLessonIR();
    // Mismatch: handoff deviceState is locked while canonical student.state is view_only
    const ext2 = lesson2.extensions!.v871Experience as any;
    ext2.activities.A1.handoff.deviceState = 'locked';
    const res2 = evaluateExperienceDesign(lesson2, syntheticSourceModel);
    expect(res2.status).toBe('BLOCKED');
    expect(res2.issues).toContain('V871_SEMANTIC_CONFLICT');
  });

  it('derives protected roles from canonical phase, timingPolicy, recheckRef and rejects cuttable', () => {
    const lesson = create3ActivityLessonIR();
    // A3 is phase 'exit' -> protected! If author marks fastPath.cuttable = true, it must fail.
    const ext = lesson.extensions!.v871Experience as any;
    ext.activities.A3.fastPath.cuttable = true;
    const res1 = evaluateExperienceDesign(lesson, syntheticSourceModel);
    expect(res1.status).toBe('BLOCKED');
    expect(res1.issues.some(i => i.startsWith('V871_TIMING_INVALID'))).toBe(true);

    const lesson2 = create3ActivityLessonIR();
    // Even if metadata protectedEvidence is empty, canonical phase 'exit' protects it!
    const ext2 = lesson2.extensions!.v871Experience as any;
    ext2.activities.A3.protectedEvidence = [];
    ext2.activities.A3.fastPath.cuttable = true;
    const res2 = evaluateExperienceDesign(lesson2, syntheticSourceModel);
    expect(res2.status).toBe('BLOCKED');
    expect(res2.issues.some(i => i.startsWith('V871_TIMING_INVALID'))).toBe(true);

    const lesson3 = create3ActivityLessonIR();
    // timingPolicy.protected === true protects activity A1
    (lesson3.timeline[0].timingPolicy as any).protected = true;
    const ext3 = lesson3.extensions!.v871Experience as any;
    ext3.activities.A1.fastPath.cuttable = true;
    const res3 = evaluateExperienceDesign(lesson3, syntheticSourceModel);
    expect(res3.status).toBe('BLOCKED');
    expect(res3.issues.some(i => i.startsWith('V871_TIMING_INVALID'))).toBe(true);

    const lesson4 = create3ActivityLessonIR();
    // coach.studentMirror.recheckRef === 'A1' protects referenced activity A1
    (lesson4.timeline[1].coach.studentMirror as any).recheckRef = 'A1';
    const ext4 = lesson4.extensions!.v871Experience as any;
    ext4.activities.A1.fastPath.cuttable = true;
    const res4 = evaluateExperienceDesign(lesson4, syntheticSourceModel);
    expect(res4.status).toBe('BLOCKED');
    expect(res4.issues.some(i => i.startsWith('V871_TIMING_INVALID'))).toBe(true);
  });

  it('protects activities across phase exact tokens exit_ticket, reflection, self_assessment, closing, recheck with case and whitespace variations', () => {
    const tokens = [
      'exit_ticket',
      ' EXIT_TICKET ',
      'reflection',
      'self_assessment',
      ' Self_Assessment ',
      'closing',
      ' Closing ',
      'recheck',
      ' RECHECK ',
    ];

    for (const token of tokens) {
      const lesson = create3ActivityLessonIR();
      lesson.timeline[0].phase = token;
      const ext = lesson.extensions!.v871Experience as any;
      ext.activities.A1.fastPath.cuttable = true;
      const result = evaluateExperienceDesign(lesson, syntheticSourceModel);
      expect(result.status).toBe('BLOCKED');
      expect(result.issues.some(i => i.startsWith('V871_TIMING_INVALID'))).toBe(true);
    }
  });

  it('places coverage errors before source hash and claim errors in issue collection order', () => {
    const lesson = create3ActivityLessonIR();
    // Both coverage mismatch AND source hash mismatch
    lesson.provenance = { sourceHash: 'mismatched-source-hash' };
    const ext = lesson.extensions!.v871Experience as any;
    ext.experienceArc.pop(); // coverage error

    const result = evaluateExperienceDesign(lesson, syntheticSourceModel);
    expect(result.status).toBe('BLOCKED');
    const coverageIdx = result.issues.findIndex(i => i.startsWith('V871_ACTIVITY_COVERAGE_INVALID'));
    const hashIdx = result.issues.findIndex(i => i.startsWith('V871_SOURCE_HASH_MISMATCH'));
    expect(coverageIdx).toBeGreaterThanOrEqual(0);
    expect(hashIdx).toBeGreaterThanOrEqual(0);
    expect(coverageIdx).toBeLessThan(hashIdx);
  });

  it('enforces mandatory or protected core budget > 0 while optional nonprotected can be 0', () => {
    const lesson = create3ActivityLessonIR();
    // A1 is mandatory (cuttable: false); setting core = 0 must fail
    const ext = lesson.extensions!.v871Experience as any;
    ext.activities.A1.coreBudgetSec = 0;
    ext.activities.A1.recoveryBudgetSec = 600;
    ext.timing.coreBudgetSec = 1500;
    ext.timing.reserveBudgetSec = 900;
    const res = evaluateExperienceDesign(lesson, syntheticSourceModel);
    expect(res.status).toBe('BLOCKED');
    expect(res.issues.some(i => i.startsWith('V871_TIMING_INVALID'))).toBe(true);
  });

  it('enforces safe integer checks and total budget equalities', () => {
    const lesson = create3ActivityLessonIR();
    const ext = lesson.extensions!.v871Experience as any;
    // Fractional budget
    ext.activities.A1.coreBudgetSec = 500.5;
    const res1 = evaluateExperienceDesign(lesson, syntheticSourceModel);
    expect(res1.status).toBe('BLOCKED');
    expect(res1.issues.some(i => i.startsWith('V871_TIMING_INVALID'))).toBe(true);

    const lesson2 = create3ActivityLessonIR();
    const ext2 = lesson2.extensions!.v871Experience as any;
    // Core sum mismatch
    ext2.timing.coreBudgetSec = 2001;
    const res2 = evaluateExperienceDesign(lesson2, syntheticSourceModel);
    expect(res2.status).toBe('BLOCKED');
    expect(res2.issues.some(i => i.startsWith('V871_TIMING_INVALID'))).toBe(true);
  });

  it('emits EXPERIENCE_REPETITION warning for 3 consecutive equal signatures', () => {
    const lesson = create3ActivityLessonIR();
    const ext = lesson.extensions!.v871Experience as any;
    // Make A1, A2, A3 have identical (participationMode, interactionPattern, responseMode)
    ext.activities.A1.signature.participationMode = 'INDIVIDUAL';
    ext.activities.A1.signature.interactionPattern = 'TASK';
    ext.activities.A1.signature.responseMode = 'SELECT';

    ext.activities.A2.signature.participationMode = 'INDIVIDUAL';
    ext.activities.A2.signature.interactionPattern = 'TASK';
    ext.activities.A2.signature.responseMode = 'SELECT';

    ext.activities.A3.signature.participationMode = 'INDIVIDUAL';
    ext.activities.A3.signature.interactionPattern = 'TASK';
    ext.activities.A3.signature.responseMode = 'SELECT';

    const result = evaluateExperienceDesign(lesson, syntheticSourceModel);
    expect(result.warnings).toContain('EXPERIENCE_REPETITION');
    expect(result.issues).not.toContain('EXPERIENCE_MONOTONY');
  });

  it('emits EXPERIENCE_MONOTONY issue for 4 consecutive equal signatures without rationale', () => {
    const lesson = create3ActivityLessonIR();
    // Add a 4th activity
    const a4 = structuredClone(lesson.timeline[2]);
    a4.id = 'A4';
    a4.order = 4;
    a4.phase = 'closing';
    a4.durationSec = 600;
    lesson.timeline.push(a4);
    lesson.lesson.runtimeMin = 50;

    const ext = lesson.extensions!.v871Experience as any;
    ext.experienceArc.push({ activityId: 'A4', purpose: 'Closing' });
    ext.timing.slotDurationSec = 3000;
    ext.timing.coreBudgetSec = 2500;
    ext.timing.reserveBudgetSec = 500;
    ext.reveal.A4 = { v871Policy: 'NO_REVEAL', canonicalPolicy: 'no_reveal', decision: 'LOSSLESS' };
    ext.activities.A4 = structuredClone(ext.activities.A3);

    // Make all 4 signatures equal
    const sig = {
      participationMode: 'INDIVIDUAL' as const,
      interactionPattern: 'REPETITIVE_TASK',
      responseMode: 'SELECT' as const,
    };
    for (const act of Object.values(ext.activities) as any[]) {
      Object.assign(act.signature, sig);
      act.repetitionRationale = null;
    }

    const result = evaluateExperienceDesign(lesson, syntheticSourceModel);
    expect(result.status).toBe('BLOCKED');
    expect(result.issues).toContain('EXPERIENCE_MONOTONY');
  });

  it('downgrades 4 consecutive equal signatures to warning when valid rationale and verified claims exist', () => {
    const lesson = create3ActivityLessonIR();
    const a4 = structuredClone(lesson.timeline[2]);
    a4.id = 'A4';
    a4.order = 4;
    a4.phase = 'closing';
    a4.durationSec = 600;
    lesson.timeline.push(a4);
    lesson.lesson.runtimeMin = 50;

    const ext = lesson.extensions!.v871Experience as any;
    ext.experienceArc.push({ activityId: 'A4', purpose: 'Closing' });
    ext.timing.slotDurationSec = 3000;
    ext.timing.coreBudgetSec = 2500;
    ext.timing.reserveBudgetSec = 500;
    ext.reveal.A4 = { v871Policy: 'NO_REVEAL', canonicalPolicy: 'no_reveal', decision: 'LOSSLESS' };
    ext.activities.A4 = structuredClone(ext.activities.A3);

    const sig = {
      participationMode: 'INDIVIDUAL' as const,
      interactionPattern: 'REPETITIVE_TASK',
      responseMode: 'SELECT' as const,
    };
    for (const act of Object.values(ext.activities) as any[]) {
      Object.assign(act.signature, sig);
      act.repetitionRationale = {
        text: 'Intentional deliberate practice sequence supported by curriculum',
        sourceClaimIds: ['CLAIM-1'],
      };
    }

    const result = evaluateExperienceDesign(lesson, syntheticSourceModel);
    expect(result.issues).not.toContain('EXPERIENCE_MONOTONY');
    expect(result.warnings).toContain('EXPERIENCE_REPETITION');
  });

  it('emits visual and capability diagnostics when decisions are APPLICABLE or UNDETERMINED', () => {
    const lesson = create3ActivityLessonIR();
    const ext = lesson.extensions!.v871Experience as any;
    ext.visualOpportunityAudit.decision = 'APPLICABLE';
    ext.capabilities.collaboration.lessonDecision = 'UNDETERMINED';

    const result = evaluateExperienceDesign(lesson, syntheticSourceModel);
    expect(result.status).toBe('REVIEW_REQUIRED');
    expect(result.diagnostics).toContain('V871_VISUAL_REVIEW_REQUIRED');
    expect(result.diagnostics).toContain('V871_CAPABILITY_REVIEW_REQUIRED');
  });

  describe('V8.8.1 T2 — version-gated source block and reviewed claim evidence', () => {
    const valid11SourceModel: Pick<SourceModel, 'sourceHash' | 'claims' | 'blocks'> = {
      sourceHash: 'source-hash-test',
      blocks: [
        { id: 'BLK-ARC-1', sourceId: 'S1', sourceRole: 'teacher_lesson', text: 'Orientation block', locator: { kind: 'extracted_line', value: 'Line 1', line: 1 }, extractionConfidence: null },
        { id: 'BLK-ARC-3', sourceId: 'S1', sourceRole: 'teacher_lesson', text: 'Exit check block', locator: { kind: 'extracted_line', value: 'Line 2', line: 2 }, extractionConfidence: null },
        { id: 'BLK-ARCH-1', sourceId: 'S1', sourceRole: 'teacher_lesson', text: 'Concept formation block', locator: { kind: 'extracted_line', value: 'Line 3', line: 3 }, extractionConfidence: null },
        { id: 'BLK-REP-1', sourceId: 'S1', sourceRole: 'teacher_lesson', text: 'Repetition block', locator: { kind: 'extracted_line', value: 'Line 4', line: 4 }, extractionConfidence: null },
        { id: 'BLK-VOA-1', sourceId: 'S1', sourceRole: 'teacher_lesson', text: 'VOA block', locator: { kind: 'extracted_line', value: 'Line 5', line: 5 }, extractionConfidence: null },
        { id: 'BLK-COL-1', sourceId: 'S1', sourceRole: 'teacher_lesson', text: 'Collab block', locator: { kind: 'extracted_line', value: 'Line 6', line: 6 }, extractionConfidence: null },
        { id: 'BLK-PEER-1', sourceId: 'S1', sourceRole: 'teacher_lesson', text: 'Peer block', locator: { kind: 'extracted_line', value: 'Line 7', line: 7 }, extractionConfidence: null },
      ],
      claims: [
        { id: 'CLAIM-ARCH', sourceId: 'S1', sourceBlockId: 'BLK-ARCH-1', kind: 'math_expression', excerpt: 'Concept', status: 'verified' },
        { id: 'CLAIM-REP', sourceId: 'S1', sourceBlockId: 'BLK-REP-1', kind: 'math_expression', excerpt: 'Repeat', status: 'verified' },
        { id: 'CLAIM-VOA', sourceId: 'S1', sourceBlockId: 'BLK-VOA-1', kind: 'math_expression', excerpt: 'VOA', status: 'verified' },
        { id: 'CLAIM-COL', sourceId: 'S1', sourceBlockId: 'BLK-COL-1', kind: 'math_expression', excerpt: 'Collab', status: 'verified' },
        { id: 'CLAIM-PEER', sourceId: 'S1', sourceBlockId: 'BLK-PEER-1', kind: 'math_expression', excerpt: 'Peer', status: 'verified' },
      ],
    };

    const createValid11Lesson = () => {
      const lesson = create3ActivityLessonIR();
      const ext = createValidV871V11Extension();
      ext.archetype.sourceClaimIds = ['CLAIM-ARCH'];
      ext.activities.A1.repetitionRationale!.sourceClaimIds = ['CLAIM-REP'];
      ext.visualOpportunityAudit.sourceClaimIds = ['CLAIM-VOA'];
      ext.capabilities.collaboration.sourceClaimIds = ['CLAIM-COL'];
      ext.capabilities.peerReview.sourceClaimIds = ['CLAIM-PEER'];
      lesson.extensions = { v871Experience: ext };
      return lesson;
    };

    const create4Activity11Lesson = () => {
      const lesson = createValid11Lesson();
      const a4 = structuredClone(lesson.timeline[2]);
      a4.id = 'A4';
      a4.order = 4;
      a4.phase = 'closing';
      a4.durationSec = 600;
      lesson.timeline.push(a4);
      lesson.lesson.runtimeMin = 50;

      const ext = lesson.extensions!.v871Experience as any;
      ext.experienceArc.push({ activityId: 'A4', purpose: 'Closing', sourceBlockIds: ['BLK-ARC-3'] });
      ext.timing.slotDurationSec = 3000;
      ext.timing.coreBudgetSec = 2500;
      ext.timing.reserveBudgetSec = 500;
      ext.reveal.A4 = { v871Policy: 'NO_REVEAL', canonicalPolicy: 'no_reveal', decision: 'LOSSLESS' };
      ext.activities.A4 = structuredClone(ext.activities.A3);
      return lesson;
    };

    it('evaluates valid 1.1 lesson with real blocks and verified claims to STRUCTURALLY_VALID', () => {
      const lesson = createValid11Lesson();
      const result = evaluateExperienceDesign(lesson, valid11SourceModel);
      expect(result.issues).toEqual([]);
      expect(result.status).toBe('STRUCTURALLY_VALID');
    });

    it('accepts zero-claim plaintext blocks as valid provenance in 1.1', () => {
      const lesson = createValid11Lesson();
      const ext = lesson.extensions!.v871Experience as any;
      ext.archetype.sourceClaimIds = [];
      ext.visualOpportunityAudit.sourceClaimIds = [];
      ext.capabilities.collaboration.sourceClaimIds = [];
      ext.capabilities.peerReview.sourceClaimIds = [];
      ext.activities.A1.repetitionRationale.sourceClaimIds = [];

      const zeroClaimSourceModel: Pick<SourceModel, 'sourceHash' | 'claims' | 'blocks'> = {
        sourceHash: 'source-hash-test',
        blocks: valid11SourceModel.blocks,
        claims: [],
      };
      const result = evaluateExperienceDesign(lesson, zeroClaimSourceModel);
      expect(result.issues).toEqual([]);
      expect(result.status).toBe('STRUCTURALLY_VALID');
    });

    it('rejects missing or unknown block references with V871_SOURCE_BLOCK_NOT_FOUND', () => {
      const lesson = createValid11Lesson();
      const ext = lesson.extensions!.v871Experience as any;
      ext.archetype.sourceBlockIds = ['NON_EXISTENT_BLOCK'];

      const result = evaluateExperienceDesign(lesson, valid11SourceModel);
      expect(result.status).toBe('BLOCKED');
      expect(result.issues).toContain('V871_SOURCE_BLOCK_NOT_FOUND:NON_EXISTENT_BLOCK');
    });

    it('rejects unverified claims with V871_SOURCE_CLAIM_UNVERIFIED in 1.1', () => {
      const lesson = createValid11Lesson();
      const unreviewedModel: Pick<SourceModel, 'sourceHash' | 'claims' | 'blocks'> = {
        ...valid11SourceModel,
        claims: [
          { ...valid11SourceModel.claims[0], status: 'needs_review' },
          ...valid11SourceModel.claims.slice(1),
        ],
      };

      const result = evaluateExperienceDesign(lesson, unreviewedModel);
      expect(result.status).toBe('BLOCKED');
      expect(result.issues).toContain('V871_SOURCE_CLAIM_UNVERIFIED:CLAIM-ARCH');
    });

    it('rejects claim-block mismatch when claim.sourceBlockId is not in the same reference block set', () => {
      const lesson = createValid11Lesson();
      const ext = lesson.extensions!.v871Experience as any;
      ext.archetype.sourceBlockIds = ['BLK-ARC-1'];

      const result = evaluateExperienceDesign(lesson, valid11SourceModel);
      expect(result.status).toBe('BLOCKED');
      expect(result.issues).toContain('V871_CLAIM_BLOCK_MISMATCH:CLAIM-ARCH');
    });

    it('fails closed with V871_PROVENANCE_REVIEW_REQUIRED when sourceModel or required blocks context is missing', () => {
      const lesson = createValid11Lesson();

      const resNoSource = evaluateExperienceDesign(lesson);
      expect(resNoSource.status).toBe('REVIEW_REQUIRED');
      expect(resNoSource.diagnostics).toContain('V871_PROVENANCE_REVIEW_REQUIRED');

      const resNoBlocks = evaluateExperienceDesign(lesson, {
        sourceHash: 'source-hash-test',
        claims: valid11SourceModel.claims,
      });
      expect(resNoBlocks.status).toBe('REVIEW_REQUIRED');
      expect(resNoBlocks.diagnostics).toContain('V871_PROVENANCE_REVIEW_REQUIRED');
    });

    it('does not skip unverified or missing claim checks when blocks context is missing in 1.1', () => {
      const lesson = createValid11Lesson();
      const modelMissingBlocksWithUnverifiedClaim: Pick<SourceModel, 'sourceHash' | 'claims'> = {
        sourceHash: 'source-hash-test',
        claims: [
          { ...valid11SourceModel.claims[0], status: 'needs_review' },
          ...valid11SourceModel.claims.slice(1),
        ],
      };

      const result = evaluateExperienceDesign(lesson, modelMissingBlocksWithUnverifiedClaim);
      expect(result.status).toBe('BLOCKED');
      expect(result.issues).toContain('V871_SOURCE_CLAIM_UNVERIFIED:CLAIM-ARCH');
      expect(result.diagnostics).toContain('V871_PROVENANCE_REVIEW_REQUIRED');

      const modelMissingBlocksWithMissingClaim: Pick<SourceModel, 'sourceHash' | 'claims'> = {
        sourceHash: 'source-hash-test',
        claims: valid11SourceModel.claims.slice(1),
      };
      const resultMissing = evaluateExperienceDesign(lesson, modelMissingBlocksWithMissingClaim);
      expect(resultMissing.status).toBe('BLOCKED');
      expect(resultMissing.issues).toContain('V871_SOURCE_CLAIM_NOT_FOUND:CLAIM-ARCH');
      expect(resultMissing.diagnostics).toContain('V871_PROVENANCE_REVIEW_REQUIRED');
    });

    it('preserves 1.0 historical behavior: accepts unverified claims and does not check blocks', () => {
      const lesson10 = create3ActivityLessonIR();
      const modelWithUnverifiedClaim: Pick<SourceModel, 'sourceHash' | 'claims'> = {
        sourceHash: 'source-hash-test',
        claims: [{ id: 'CLAIM-1', sourceId: 'S1', sourceBlockId: 'B1', kind: 'math_expression', excerpt: 'Text', status: 'needs_review' }],
      };

      const result = evaluateExperienceDesign(lesson10, modelWithUnverifiedClaim);
      expect(result.issues).not.toContain('V871_SOURCE_CLAIM_UNVERIFIED:CLAIM-1');
      expect(result.status).toBe('STRUCTURALLY_VALID');
    });

    it('allows claims-only 1.1 without requiring sourceModel.blocks', () => {
      const lesson = createValid11Lesson();
      const ext = lesson.extensions!.v871Experience as any;
      delete ext.archetype.sourceBlockIds;
      delete ext.visualOpportunityAudit.sourceBlockIds;
      delete ext.capabilities.collaboration.sourceBlockIds;
      delete ext.capabilities.peerReview.sourceBlockIds;
      delete ext.activities.A1.repetitionRationale.sourceBlockIds;
      ext.experienceArc.forEach((a: any) => delete a.sourceBlockIds);

      const claimsOnlyModel: Pick<SourceModel, 'sourceHash' | 'claims'> = {
        sourceHash: 'source-hash-test',
        claims: valid11SourceModel.claims,
      };

      const result = evaluateExperienceDesign(lesson, claimsOnlyModel);
      expect(result.issues).toEqual([]);
      expect(result.status).toBe('STRUCTURALLY_VALID');
    });

    it('accepts repetition rationale from validated blocks in 1.1 across 4 activities avoiding monotony', () => {
      const lesson = create4Activity11Lesson();
      const ext = lesson.extensions!.v871Experience as any;
      const sig = {
        participationMode: 'INDIVIDUAL' as const,
        interactionPattern: 'REPETITIVE_TASK',
        responseMode: 'SELECT' as const,
      };
      for (const act of Object.values(ext.activities) as any[]) {
        Object.assign(act.signature, sig);
        act.repetitionRationale = {
          text: 'Intentional deliberate practice sequence with block provenance',
          sourceClaimIds: [],
          sourceBlockIds: ['BLK-REP-1'],
        };
      }

      const result = evaluateExperienceDesign(lesson, valid11SourceModel);
      expect(result.issues).toEqual([]);
      expect(result.status).toBe('STRUCTURALLY_VALID');
      expect(result.warnings).toContain('EXPERIENCE_REPETITION');
    });

    it('rejects 4 repeated activities with invalid block rationale in 1.1 with EXPERIENCE_MONOTONY', () => {
      const lesson = create4Activity11Lesson();
      const ext = lesson.extensions!.v871Experience as any;
      const sig = {
        participationMode: 'INDIVIDUAL' as const,
        interactionPattern: 'REPETITIVE_TASK',
        responseMode: 'SELECT' as const,
      };
      for (const act of Object.values(ext.activities) as any[]) {
        Object.assign(act.signature, sig);
        act.repetitionRationale = {
          text: 'Intentional deliberate practice sequence with unknown block',
          sourceClaimIds: [],
          sourceBlockIds: ['NON_EXISTENT_BLOCK'],
        };
      }

      const result = evaluateExperienceDesign(lesson, valid11SourceModel);
      expect(result.status).toBe('BLOCKED');
      expect(result.issues).toContain('EXPERIENCE_MONOTONY');
      expect(result.issues).toContain('V871_SOURCE_BLOCK_NOT_FOUND:NON_EXISTENT_BLOCK');
    });

    it('rejects duplicate claim IDs in 1.1 when unverified precedes verified', () => {
      const lesson = createValid11Lesson();
      const duplicateModel: Pick<SourceModel, 'sourceHash' | 'claims' | 'blocks'> = {
        ...valid11SourceModel,
        claims: [
          { ...valid11SourceModel.claims[0], status: 'needs_review' },
          { ...valid11SourceModel.claims[0], status: 'verified' },
          ...valid11SourceModel.claims.slice(1),
        ],
      };
      const result = evaluateExperienceDesign(lesson, duplicateModel);
      expect(result.status).toBe('BLOCKED');
      expect(result.issues).toContain('V871_SOURCE_CLAIM_DUPLICATE:CLAIM-ARCH');
    });

    it('rejects duplicate claim IDs in 1.1 when verified precedes unverified', () => {
      const lesson = createValid11Lesson();
      const duplicateModel: Pick<SourceModel, 'sourceHash' | 'claims' | 'blocks'> = {
        ...valid11SourceModel,
        claims: [
          { ...valid11SourceModel.claims[0], status: 'verified' },
          { ...valid11SourceModel.claims[0], status: 'needs_review' },
          ...valid11SourceModel.claims.slice(1),
        ],
      };
      const result = evaluateExperienceDesign(lesson, duplicateModel);
      expect(result.status).toBe('BLOCKED');
      expect(result.issues).toContain('V871_SOURCE_CLAIM_DUPLICATE:CLAIM-ARCH');
    });

    it('rejects duplicate claim IDs in claims-only 1.1', () => {
      const lesson = createValid11Lesson();
      const ext = lesson.extensions!.v871Experience as any;
      delete ext.archetype.sourceBlockIds;
      delete ext.visualOpportunityAudit.sourceBlockIds;
      delete ext.capabilities.collaboration.sourceBlockIds;
      delete ext.capabilities.peerReview.sourceBlockIds;
      delete ext.activities.A1.repetitionRationale.sourceBlockIds;
      ext.experienceArc.forEach((a: any) => delete a.sourceBlockIds);

      const duplicateClaimsOnly: Pick<SourceModel, 'sourceHash' | 'claims'> = {
        sourceHash: 'source-hash-test',
        claims: [
          valid11SourceModel.claims[0],
          valid11SourceModel.claims[0],
          ...valid11SourceModel.claims.slice(1),
        ],
      };
      const result = evaluateExperienceDesign(lesson, duplicateClaimsOnly);
      expect(result.status).toBe('BLOCKED');
      expect(result.issues).toContain('V871_SOURCE_CLAIM_DUPLICATE:CLAIM-ARCH');
    });

    it('rejects duplicate block IDs in 1.1', () => {
      const lesson = createValid11Lesson();
      const duplicateBlockModel: Pick<SourceModel, 'sourceHash' | 'claims' | 'blocks'> = {
        ...valid11SourceModel,
        blocks: [
          valid11SourceModel.blocks![0],
          valid11SourceModel.blocks![0],
          ...valid11SourceModel.blocks!.slice(1),
        ],
      };
      const result = evaluateExperienceDesign(lesson, duplicateBlockModel);
      expect(result.status).toBe('BLOCKED');
      expect(result.issues).toContain('V871_SOURCE_BLOCK_DUPLICATE:BLK-ARC-1');
    });

    it('rejects non-array claims container in 1.1 without throwing', () => {
      const lesson = createValid11Lesson();
      const badClaimsModel = {
        sourceHash: 'source-hash-test',
        blocks: valid11SourceModel.blocks,
        claims: 'not-an-array' as any,
      };
      const result = evaluateExperienceDesign(lesson, badClaimsModel);
      expect(result.status).toBe('BLOCKED');
      expect(result.issues).toContain('V871_SOURCE_CLAIMS_INVALID');
    });

    it('rejects null or non-array blocks container in 1.1 as BLOCKED without throwing', () => {
      const lesson = createValid11Lesson();
      const nullBlocksModel = {
        sourceHash: 'source-hash-test',
        claims: valid11SourceModel.claims,
        blocks: null as any,
      };
      const resultNull = evaluateExperienceDesign(lesson, nullBlocksModel);
      expect(resultNull.status).toBe('BLOCKED');
      expect(resultNull.issues).toContain('V871_SOURCE_BLOCKS_INVALID');

      const objBlocksModel = {
        sourceHash: 'source-hash-test',
        claims: valid11SourceModel.claims,
        blocks: { id: 'BLK-1' } as any,
      };
      const resultObj = evaluateExperienceDesign(lesson, objBlocksModel);
      expect(resultObj.status).toBe('BLOCKED');
      expect(resultObj.issues).toContain('V871_SOURCE_BLOCKS_INVALID');
    });

    it('rejects empty blocks array when block references are supplied in 1.1 with V871_SOURCE_BLOCK_NOT_FOUND', () => {
      const lesson = createValid11Lesson();
      const emptyBlocksModel: Pick<SourceModel, 'sourceHash' | 'claims' | 'blocks'> = {
        sourceHash: 'source-hash-test',
        claims: valid11SourceModel.claims,
        blocks: [],
      };
      const result = evaluateExperienceDesign(lesson, emptyBlocksModel);
      expect(result.status).toBe('BLOCKED');
      expect(result.issues).toContain('V871_SOURCE_BLOCK_NOT_FOUND:BLK-ARC-1');
    });

    it('rejects claims container with null, undefined, sparse elements, or non-string ID as BLOCKED without throwing', () => {
      const lesson = createValid11Lesson();

      const nullElemModel = {
        sourceHash: 'source-hash-test',
        blocks: valid11SourceModel.blocks,
        claims: [...valid11SourceModel.claims, null as any],
      };
      const resNull = evaluateExperienceDesign(lesson, nullElemModel);
      expect(resNull.status).toBe('BLOCKED');
      expect(resNull.issues).toContain('V871_SOURCE_CLAIMS_INVALID');

      const undefElemModel = {
        sourceHash: 'source-hash-test',
        blocks: valid11SourceModel.blocks,
        claims: [...valid11SourceModel.claims, undefined as any],
      };
      const resUndef = evaluateExperienceDesign(lesson, undefElemModel);
      expect(resUndef.status).toBe('BLOCKED');
      expect(resUndef.issues).toContain('V871_SOURCE_CLAIMS_INVALID');

      const sparseClaims = [...valid11SourceModel.claims];
      sparseClaims[sparseClaims.length + 1] = valid11SourceModel.claims[0];
      const sparseModel = {
        sourceHash: 'source-hash-test',
        blocks: valid11SourceModel.blocks,
        claims: sparseClaims as any,
      };
      const resSparse = evaluateExperienceDesign(lesson, sparseModel);
      expect(resSparse.status).toBe('BLOCKED');
      expect(resSparse.issues).toContain('V871_SOURCE_CLAIMS_INVALID');

      const badIdModel = {
        sourceHash: 'source-hash-test',
        blocks: valid11SourceModel.blocks,
        claims: [...valid11SourceModel.claims, { id: 12345, status: 'verified' } as any],
      };
      const resBadId = evaluateExperienceDesign(lesson, badIdModel);
      expect(resBadId.status).toBe('BLOCKED');
      expect(resBadId.issues).toContain('V871_SOURCE_CLAIMS_INVALID');
    });

    it('rejects blocks container with null, undefined, sparse elements, or non-string ID as BLOCKED without throwing', () => {
      const lesson = createValid11Lesson();

      const nullElemModel = {
        sourceHash: 'source-hash-test',
        claims: valid11SourceModel.claims,
        blocks: [...valid11SourceModel.blocks!, null as any],
      };
      const resNull = evaluateExperienceDesign(lesson, nullElemModel);
      expect(resNull.status).toBe('BLOCKED');
      expect(resNull.issues).toContain('V871_SOURCE_BLOCKS_INVALID');

      const undefElemModel = {
        sourceHash: 'source-hash-test',
        claims: valid11SourceModel.claims,
        blocks: [...valid11SourceModel.blocks!, undefined as any],
      };
      const resUndef = evaluateExperienceDesign(lesson, undefElemModel);
      expect(resUndef.status).toBe('BLOCKED');
      expect(resUndef.issues).toContain('V871_SOURCE_BLOCKS_INVALID');

      const sparseBlocks = [...valid11SourceModel.blocks!];
      sparseBlocks[sparseBlocks.length + 1] = valid11SourceModel.blocks![0];
      const sparseModel = {
        sourceHash: 'source-hash-test',
        claims: valid11SourceModel.claims,
        blocks: sparseBlocks as any,
      };
      const resSparse = evaluateExperienceDesign(lesson, sparseModel);
      expect(resSparse.status).toBe('BLOCKED');
      expect(resSparse.issues).toContain('V871_SOURCE_BLOCKS_INVALID');

      const badIdModel = {
        sourceHash: 'source-hash-test',
        claims: valid11SourceModel.claims,
        blocks: [...valid11SourceModel.blocks!, { id: null } as any],
      };
      const resBadId = evaluateExperienceDesign(lesson, badIdModel);
      expect(resBadId.status).toBe('BLOCKED');
      expect(resBadId.issues).toContain('V871_SOURCE_BLOCKS_INVALID');
    });
  });
});
