import { describe, expect, it } from 'vitest';
import { displaySelfAssessment, parseV871ExperienceExtension, storeSelfAssessment, type V871Experience } from './experienceExtension';

export const createValidV871Extension = () => ({
  version: '1.0' as const,
  sourceHash: 'source-hash-test',
  experienceArc: [
    { activityId: 'A1', purpose: 'Orientation' },
    { activityId: 'A2', purpose: 'Independent practice' },
    { activityId: 'A3', purpose: 'Exit check' },
  ],
  archetype: {
    v871: 'KNOWLEDGE_FORMATION' as const,
    canonicalBase: 'concept_formation' as const,
    decision: 'LOSSLESS' as const,
    rationale: 'Concept formation directly supported',
    sourceClaimIds: ['CLAIM-1'],
  },
  reveal: {
    A1: { v871Policy: 'TEACHER_MANUAL' as const, canonicalPolicy: 'teacher_manual' as const, decision: 'LOSSLESS' as const },
    A2: { v871Policy: 'TEACHER_MANUAL' as const, canonicalPolicy: 'teacher_manual' as const, decision: 'LOSSLESS' as const },
    A3: { v871Policy: 'NO_REVEAL' as const, canonicalPolicy: 'no_reveal' as const, decision: 'LOSSLESS' as const },
  },
  timing: {
    slotDurationSec: 2400,
    coreBudgetSec: 2000,
    reserveBudgetSec: 400,
  },
  activities: {
    A1: {
      signature: {
        attentionTarget: 'PRESENTER' as const,
        participationMode: 'WHOLE_CLASS' as const,
        interactionPattern: 'DIRECT_EXPLANATION',
        responseMode: 'NONE' as const,
        visualMode: 'STATIC' as const,
        physicalAction: 'POINT' as const,
        evidenceType: 'OBSERVATION',
        transitionCue: 'Focus on front screen',
      },
      handoff: {
        target: 'PRESENTER' as const,
        entryCue: 'Class eyes on screen',
        deviceState: 'view_only' as const,
        exitCue: 'Open student device',
        fallback: 'Use board notes',
      },
      coreBudgetSec: 500,
      recoveryBudgetSec: 100,
      protectedEvidence: [],
      fastPath: { cuttable: false },
      repetitionRationale: null,
    },
    A2: {
      signature: {
        attentionTarget: 'STUDENT_DEVICE' as const,
        participationMode: 'INDIVIDUAL' as const,
        interactionPattern: 'PROBLEM_SOLVING',
        responseMode: 'SELECT' as const,
        visualMode: 'DYNAMIC' as const,
        physicalAction: 'NONE' as const,
        evidenceType: 'ITEM_RESPONSE',
        transitionCue: 'Answer question 1',
      },
      handoff: {
        target: 'STUDENT_DEVICE' as const,
        entryCue: 'Begin practice',
        deviceState: 'interactive' as const,
        exitCue: 'Finalize answer',
        fallback: 'Use printed worksheet',
      },
      coreBudgetSec: 1000,
      recoveryBudgetSec: 200,
      protectedEvidence: [],
      fastPath: { cuttable: false },
      repetitionRationale: null,
    },
    A3: {
      signature: {
        attentionTarget: 'STUDENT_DEVICE' as const,
        participationMode: 'INDIVIDUAL' as const,
        interactionPattern: 'EXIT_SYNTHESIS',
        responseMode: 'TEXT' as const,
        visualMode: 'NONE' as const,
        physicalAction: 'WRITE_PAPER' as const,
        evidenceType: 'EXIT_SUBMISSION',
        transitionCue: 'Complete reflection and exit ticket',
      },
      handoff: {
        target: 'STUDENT_DEVICE' as const,
        entryCue: 'Open exit ticket',
        deviceState: 'interactive' as const,
        exitCue: 'Submit and pack up',
        fallback: 'Paper index card',
      },
      coreBudgetSec: 500,
      recoveryBudgetSec: 100,
      protectedEvidence: ['exit' as const],
      fastPath: { cuttable: false },
      repetitionRationale: null,
    },
  },
  visualOpportunityAudit: {
    spatial: false,
    parameter: false,
    representation: false,
    invariant: false,
    errorTrace: false,
    stepwiseReveal: false,
    decision: 'NOT_APPLICABLE' as const,
    rationale: 'Analytical lesson without dynamic geometry',
    sourceClaimIds: ['CLAIM-1'],
  },
  capabilities: {
    collaboration: {
      lessonDecision: 'NOT_APPLICABLE' as const,
      rationale: 'Independent pacing selected by teacher',
      sourceClaimIds: ['CLAIM-1'],
    },
    peerReview: {
      lessonDecision: 'NOT_APPLICABLE' as const,
      rationale: 'No peer review structured in this lesson',
      sourceClaimIds: ['CLAIM-1'],
    },
  },
});

export const createValidV871V11Extension = () => ({
  version: '1.1' as const,
  sourceHash: 'source-hash-test',
  experienceArc: [
    { activityId: 'A1', purpose: 'Orientation', sourceBlockIds: ['BLK-ARC-1'] },
    { activityId: 'A2', purpose: 'Independent practice' },
    { activityId: 'A3', purpose: 'Exit check', sourceBlockIds: ['BLK-ARC-3'] },
  ],
  archetype: {
    v871: 'KNOWLEDGE_FORMATION' as const,
    canonicalBase: 'concept_formation' as const,
    decision: 'LOSSLESS' as const,
    rationale: 'Concept formation directly supported',
    sourceClaimIds: ['CLAIM-1'],
    sourceBlockIds: ['BLK-ARCH-1'],
  },
  reveal: {
    A1: { v871Policy: 'TEACHER_MANUAL' as const, canonicalPolicy: 'teacher_manual' as const, decision: 'LOSSLESS' as const },
    A2: { v871Policy: 'TEACHER_MANUAL' as const, canonicalPolicy: 'teacher_manual' as const, decision: 'LOSSLESS' as const },
    A3: { v871Policy: 'NO_REVEAL' as const, canonicalPolicy: 'no_reveal' as const, decision: 'LOSSLESS' as const },
  },
  timing: {
    slotDurationSec: 2400,
    coreBudgetSec: 2000,
    reserveBudgetSec: 400,
  },
  activities: {
    A1: {
      signature: {
        attentionTarget: 'PRESENTER' as const,
        participationMode: 'WHOLE_CLASS' as const,
        interactionPattern: 'DIRECT_EXPLANATION',
        responseMode: 'NONE' as const,
        visualMode: 'STATIC' as const,
        physicalAction: 'POINT' as const,
        evidenceType: 'OBSERVATION',
        transitionCue: 'Focus on front screen',
      },
      handoff: {
        target: 'PRESENTER' as const,
        entryCue: 'Class eyes on screen',
        deviceState: 'view_only' as const,
        exitCue: 'Open student device',
        fallback: 'Use board notes',
      },
      coreBudgetSec: 500,
      recoveryBudgetSec: 100,
      protectedEvidence: [],
      fastPath: { cuttable: false },
      repetitionRationale: {
        text: 'Reinforcement required',
        sourceClaimIds: ['CLAIM-1'],
        sourceBlockIds: ['BLK-REP-1'],
      },
    },
    A2: {
      signature: {
        attentionTarget: 'STUDENT_DEVICE' as const,
        participationMode: 'INDIVIDUAL' as const,
        interactionPattern: 'PROBLEM_SOLVING',
        responseMode: 'SELECT' as const,
        visualMode: 'DYNAMIC' as const,
        physicalAction: 'NONE' as const,
        evidenceType: 'ITEM_RESPONSE',
        transitionCue: 'Answer question 1',
      },
      handoff: {
        target: 'STUDENT_DEVICE' as const,
        entryCue: 'Begin practice',
        deviceState: 'interactive' as const,
        exitCue: 'Finalize answer',
        fallback: 'Use printed worksheet',
      },
      coreBudgetSec: 1000,
      recoveryBudgetSec: 200,
      protectedEvidence: [],
      fastPath: { cuttable: false },
      repetitionRationale: null,
    },
    A3: {
      signature: {
        attentionTarget: 'STUDENT_DEVICE' as const,
        participationMode: 'INDIVIDUAL' as const,
        interactionPattern: 'EXIT_SYNTHESIS',
        responseMode: 'TEXT' as const,
        visualMode: 'NONE' as const,
        physicalAction: 'WRITE_PAPER' as const,
        evidenceType: 'EXIT_SUBMISSION',
        transitionCue: 'Complete reflection and exit ticket',
      },
      handoff: {
        target: 'STUDENT_DEVICE' as const,
        entryCue: 'Open exit ticket',
        deviceState: 'interactive' as const,
        exitCue: 'Submit and pack up',
        fallback: 'Paper index card',
      },
      coreBudgetSec: 500,
      recoveryBudgetSec: 100,
      protectedEvidence: ['exit' as const],
      fastPath: { cuttable: false },
      repetitionRationale: null,
    },
  },
  visualOpportunityAudit: {
    spatial: false,
    parameter: false,
    representation: false,
    invariant: false,
    errorTrace: false,
    stepwiseReveal: false,
    decision: 'NOT_APPLICABLE' as const,
    rationale: 'Analytical lesson without dynamic geometry',
    sourceClaimIds: ['CLAIM-1'],
    sourceBlockIds: ['BLK-VOA-1'],
  },
  capabilities: {
    collaboration: {
      lessonDecision: 'NOT_APPLICABLE' as const,
      rationale: 'Independent pacing selected by teacher',
      sourceClaimIds: ['CLAIM-1'],
      sourceBlockIds: ['BLK-COL-1'],
    },
    peerReview: {
      lessonDecision: 'NOT_APPLICABLE' as const,
      rationale: 'No peer review structured in this lesson',
      sourceClaimIds: ['CLAIM-1'],
      sourceBlockIds: ['BLK-PEER-1'],
    },
  },
});

describe('V8.8.1 experience extension', () => {
  it('returns null only when the recognized key is absent', () => {
    expect(parseV871ExperienceExtension({})).toBeNull();
    expect(() => parseV871ExperienceExtension({ v871Experience: null })).toThrow('V871_EXTENSION_INVALID');
    expect(() => parseV871ExperienceExtension({ v871Experience: undefined })).toThrow('V871_EXTENSION_INVALID');
    expect(() => parseV871ExperienceExtension({ v871Experience: 'string' })).toThrow('V871_EXTENSION_INVALID');
    expect(() => parseV871ExperienceExtension({ v871Experience: [] })).toThrow('V871_EXTENSION_INVALID');
  });

  it('rejects unknown nested fields and preserves unrelated siblings', () => {
    const input = { other: { keep: true }, v871Experience: { version: '1.0', nope: true } };
    expect(() => parseV871ExperienceExtension(input)).toThrow('V871_EXTENSION_INVALID');
    expect(input).toEqual({ other: { keep: true }, v871Experience: { version: '1.0', nope: true } });
  });

  it('parses valid typed extension successfully', () => {
    const valid = createValidV871Extension();
    const parsed = parseV871ExperienceExtension({ v871Experience: valid });
    expect(parsed).toEqual(valid);
  });

  it('validates archetype structure and enums', () => {
    const ext = createValidV871Extension();
    (ext.archetype as any).v871 = 'INVALID_ARCHETYPE';
    expect(() => parseV871ExperienceExtension({ v871Experience: ext })).toThrow('V871_ENUM_UNKNOWN');

    const ext2 = createValidV871Extension();
    (ext2.archetype as any).extraField = 'illegal';
    expect(() => parseV871ExperienceExtension({ v871Experience: ext2 })).toThrow('V871_EXTENSION_INVALID');

    const ext3 = createValidV871Extension();
    (ext3.archetype as any).decision = 'INVALID_DECISION';
    expect(() => parseV871ExperienceExtension({ v871Experience: ext3 })).toThrow('V871_ENUM_UNKNOWN');
  });

  it('validates signature enums strictly', () => {
    const ext = createValidV871Extension();
    (ext.activities.A1.signature as any).participationMode = 'SOLO';
    expect(() => parseV871ExperienceExtension({ v871Experience: ext })).toThrow('V871_ENUM_UNKNOWN');

    const ext2 = createValidV871Extension();
    (ext2.activities.A1.signature as any).responseMode = 'INVALID_MODE';
    expect(() => parseV871ExperienceExtension({ v871Experience: ext2 })).toThrow('V871_ENUM_UNKNOWN');

    const ext3 = createValidV871Extension();
    (ext3.activities.A1.signature as any).visualMode = '3D_VR';
    expect(() => parseV871ExperienceExtension({ v871Experience: ext3 })).toThrow('V871_ENUM_UNKNOWN');

    const ext4 = createValidV871Extension();
    (ext4.activities.A1.signature as any).physicalAction = 'JUMP';
    expect(() => parseV871ExperienceExtension({ v871Experience: ext4 })).toThrow('V871_ENUM_UNKNOWN');

    const ext5 = createValidV871Extension();
    (ext5.activities.A1.signature as any).attentionTarget = 'PROJECTOR';
    expect(() => parseV871ExperienceExtension({ v871Experience: ext5 })).toThrow('V871_ENUM_UNKNOWN');
  });

  it('validates visualOpportunityAudit and capabilities closed objects and fields', () => {
    const ext = createValidV871Extension();
    (ext.visualOpportunityAudit as any).spatial = 'not_a_bool';
    expect(() => parseV871ExperienceExtension({ v871Experience: ext })).toThrow('V871_EXTENSION_INVALID');

    const ext2 = createValidV871Extension();
    (ext2.visualOpportunityAudit as any).extraKey = true;
    expect(() => parseV871ExperienceExtension({ v871Experience: ext2 })).toThrow('V871_EXTENSION_INVALID');

    const ext3 = createValidV871Extension();
    (ext3.capabilities.collaboration as any).lessonDecision = 'UNKNOWN_DECISION';
    expect(() => parseV871ExperienceExtension({ v871Experience: ext3 })).toThrow('V871_ENUM_UNKNOWN');

    const ext4 = createValidV871Extension();
    (ext4.capabilities as any).unknownCapability = {};
    expect(() => parseV871ExperienceExtension({ v871Experience: ext4 })).toThrow('V871_EXTENSION_INVALID');
  });

  it('rejects unsupported reveal policies claiming lossless or providing canonical policy', () => {
    const ext = createValidV871Extension();
    ext.reveal.A1 = {
      v871Policy: 'AUTO_AFTER_STATS' as any,
      canonicalPolicy: 'auto_on_next' as any,
      decision: 'LOSSLESS' as any,
    };
    expect(() => parseV871ExperienceExtension({ v871Experience: ext })).toThrow('V871_SEMANTIC_CONFLICT');

    const ext2 = createValidV871Extension();
    ext2.reveal.A1 = {
      v871Policy: 'DISCUSSION_THEN_REVEAL' as any,
      canonicalPolicy: null,
      decision: 'LOSSLESS' as any,
    };
    expect(() => parseV871ExperienceExtension({ v871Experience: ext2 })).toThrow('V871_SEMANTIC_CONFLICT');
  });

  it('maps self-assessment without losing exceeded history and rejects unknown runtime inputs', () => {
    expect(displaySelfAssessment('exceeded')).toBe('Đã đạt');
    expect(displaySelfAssessment('achieved')).toBe('Đã đạt');
    expect(displaySelfAssessment('progressing')).toBe('Gần đạt');
    expect(displaySelfAssessment('not_started')).toBe('Chưa đạt');
    expect(() => displaySelfAssessment('unknown' as any)).toThrow('V871_ENUM_UNKNOWN');
    expect(storeSelfAssessment('Đã đạt')).toBe('achieved');
    expect(storeSelfAssessment('Gần đạt')).toBe('progressing');
    expect(storeSelfAssessment('Chưa đạt')).toBe('not_started');
    expect(() => storeSelfAssessment('unknown')).toThrow('V871_ENUM_UNKNOWN');
  });

  it('rejects empty claims array wherever contract requires source claims', () => {
    const ext = createValidV871Extension();
    ext.archetype.sourceClaimIds = [];
    expect(() => parseV871ExperienceExtension({ v871Experience: ext })).toThrow(/V871_EXTENSION_INVALID:archetype\.sourceClaimIds/);

    const ext2 = createValidV871Extension();
    ext2.activities.A1.repetitionRationale = { text: 'Some rationale', sourceClaimIds: [] };
    expect(() => parseV871ExperienceExtension({ v871Experience: ext2 })).toThrow(/V871_EXTENSION_INVALID:activities\.A1\.repetitionRationale\.sourceClaimIds/);

    const ext3 = createValidV871Extension();
    (ext3.visualOpportunityAudit as any).decision = 'APPLICABLE';
    ext3.visualOpportunityAudit.sourceClaimIds = [];
    expect(() => parseV871ExperienceExtension({ v871Experience: ext3 })).toThrow(/V871_EXTENSION_INVALID:visualOpportunityAudit\.sourceClaimIds/);

    const ext4 = createValidV871Extension();
    (ext4.capabilities.collaboration as any).lessonDecision = 'APPLICABLE';
    ext4.capabilities.collaboration.sourceClaimIds = [];
    expect(() => parseV871ExperienceExtension({ v871Experience: ext4 })).toThrow(/V871_EXTENSION_INVALID:capabilities\.collaboration\.sourceClaimIds/);
  });

  it('rejects unsafe keys __proto__, constructor, prototype in record maps and objects', () => {
    // 1. JSON.parse payload with __proto__ in activities
    const rawActivityProto = JSON.stringify(createValidV871Extension()).replace('"activities":{', '"activities":{"__proto__":{},');
    const parsedActivity = JSON.parse(rawActivityProto);
    expect(() => parseV871ExperienceExtension({ v871Experience: parsedActivity })).toThrow(/V871_EXTENSION_INVALID/);

    // 2. JSON.parse payload with constructor in reveal
    const rawRevealCtor = JSON.stringify(createValidV871Extension()).replace('"reveal":{', '"reveal":{"constructor":{},');
    const parsedReveal = JSON.parse(rawRevealCtor);
    expect(() => parseV871ExperienceExtension({ v871Experience: parsedReveal })).toThrow(/V871_EXTENSION_INVALID/);

    // 3. Payload with prototype in archetype
    const rawArchetypeProto = JSON.stringify(createValidV871Extension()).replace('"archetype":{', '"archetype":{"prototype":{},');
    const parsedArchetype = JSON.parse(rawArchetypeProto);
    expect(() => parseV871ExperienceExtension({ v871Experience: parsedArchetype })).toThrow(/V871_EXTENSION_INVALID/);

    // 4. Object inheriting unknown properties via prototype chain
    const protoObj = { inheritedIllegalKey: true };
    const inheritedExt = Object.create(protoObj);
    Object.assign(inheritedExt, createValidV871Extension());
    expect(() => parseV871ExperienceExtension({ v871Experience: inheritedExt })).toThrow(/V871_EXTENSION_INVALID/);
  });

  it('parses valid 1.1 extension retaining block references on detached output', () => {
    const valid11 = createValidV871V11Extension();
    const cloned = JSON.parse(JSON.stringify(valid11));
    const parsed = parseV871ExperienceExtension({ v871Experience: valid11 });
    expect(parsed).toEqual(cloned);
    expect(valid11).toEqual(cloned);
    if (parsed) {
      parsed.archetype.sourceClaimIds.push('MUTATION');
      expect(valid11.archetype.sourceClaimIds).not.toContain('MUTATION');
    }
  });

  it('supports explicit 1.1 provenance combinations: claims-only, block-only, and empty-claim with blocks', () => {
    const claimsOnly = createValidV871V11Extension();
    delete (claimsOnly.archetype as any).sourceBlockIds;
    delete (claimsOnly.experienceArc[0] as any).sourceBlockIds;
    const parsedClaimsOnly = parseV871ExperienceExtension({ v871Experience: claimsOnly });
    expect(parsedClaimsOnly?.archetype.sourceClaimIds).toEqual(['CLAIM-1']);
    expect((parsedClaimsOnly?.archetype as any).sourceBlockIds).toBeUndefined();

    const blockOnly = createValidV871V11Extension();
    blockOnly.archetype.sourceClaimIds = [];
    const parsedBlockOnly = parseV871ExperienceExtension({ v871Experience: blockOnly });
    expect(parsedBlockOnly?.archetype.sourceClaimIds).toEqual([]);
    expect((parsedBlockOnly?.archetype as any).sourceBlockIds).toEqual(['BLK-ARCH-1']);

    // Omission of sourceClaimIds in 1.1 is strictly rejected even with blocks
    const omittedClaimsWithBlocks = createValidV871V11Extension();
    delete (omittedClaimsWithBlocks.archetype as any).sourceClaimIds;
    expect(() => parseV871ExperienceExtension({ v871Experience: omittedClaimsWithBlocks })).toThrow(/V871_EXTENSION_INVALID:archetype\.sourceClaimIds/);

    const emptyClaimWithBlocks = createValidV871V11Extension();
    emptyClaimWithBlocks.archetype.sourceClaimIds = [];
    emptyClaimWithBlocks.archetype.sourceBlockIds = ['BLK-ARCH-1'];
    const parsedEmptyClaim = parseV871ExperienceExtension({ v871Experience: emptyClaimWithBlocks });
    expect(parsedEmptyClaim?.archetype.sourceClaimIds).toEqual([]);
    expect((parsedEmptyClaim?.archetype as any).sourceBlockIds).toEqual(['BLK-ARCH-1']);

    const naNoBlocks = createValidV871V11Extension();
    naNoBlocks.visualOpportunityAudit.sourceClaimIds = [];
    delete (naNoBlocks.visualOpportunityAudit as any).sourceBlockIds;
    const parsedNa = parseV871ExperienceExtension({ v871Experience: naNoBlocks });
    expect(parsedNa?.visualOpportunityAudit.sourceClaimIds).toEqual([]);

    const invalidEmptyClaims = createValidV871V11Extension();
    invalidEmptyClaims.archetype.sourceClaimIds = [];
    delete (invalidEmptyClaims.archetype as any).sourceBlockIds;
    expect(() => parseV871ExperienceExtension({ v871Experience: invalidEmptyClaims })).toThrow(/V871_EXTENSION_INVALID:archetype\.sourceClaimIds/);

    const invalidOmittedClaims = createValidV871V11Extension();
    delete (invalidOmittedClaims.archetype as any).sourceClaimIds;
    delete (invalidOmittedClaims.archetype as any).sourceBlockIds;
    expect(() => parseV871ExperienceExtension({ v871Experience: invalidOmittedClaims })).toThrow(/V871_EXTENSION_INVALID:archetype\.sourceClaimIds/);

    const invalidRep = createValidV871V11Extension();
    invalidRep.activities.A1.repetitionRationale!.sourceClaimIds = [];
    delete (invalidRep.activities.A1.repetitionRationale as any).sourceBlockIds;
    expect(() => parseV871ExperienceExtension({ v871Experience: invalidRep })).toThrow(/V871_EXTENSION_INVALID:activities\.A1\.repetitionRationale\.sourceClaimIds/);
  });

  it('rejects version 1.0 with 1.1 sourceBlockIds fields strictly', () => {
    const v10Arch = createValidV871Extension();
    (v10Arch.archetype as any).sourceBlockIds = ['BLK-1'];
    expect(() => parseV871ExperienceExtension({ v871Experience: v10Arch })).toThrow('V871_EXTENSION_INVALID:archetype.sourceBlockIds');

    const v10Arc = createValidV871Extension();
    (v10Arc.experienceArc[0] as any).sourceBlockIds = ['BLK-1'];
    expect(() => parseV871ExperienceExtension({ v871Experience: v10Arc })).toThrow('V871_EXTENSION_INVALID:experienceArc.0.sourceBlockIds');

    const v10Voa = createValidV871Extension();
    (v10Voa.visualOpportunityAudit as any).sourceBlockIds = ['BLK-1'];
    expect(() => parseV871ExperienceExtension({ v871Experience: v10Voa })).toThrow('V871_EXTENSION_INVALID:visualOpportunityAudit.sourceBlockIds');

    const v10Collab = createValidV871Extension();
    (v10Collab.capabilities.collaboration as any).sourceBlockIds = ['BLK-1'];
    expect(() => parseV871ExperienceExtension({ v871Experience: v10Collab })).toThrow('V871_EXTENSION_INVALID:capabilities.collaboration.sourceBlockIds');

    const v10Rep = createValidV871Extension();
    v10Rep.activities.A1.repetitionRationale = { text: 'Rationale', sourceClaimIds: ['CLAIM-1'] };
    (v10Rep.activities.A1.repetitionRationale as any).sourceBlockIds = ['BLK-1'];
    expect(() => parseV871ExperienceExtension({ v871Experience: v10Rep })).toThrow('V871_EXTENSION_INVALID:activities.A1.repetitionRationale.sourceBlockIds');
  });

  it('rejects unknown versions, empty version, and bad types for version', () => {
    const ext12 = createValidV871V11Extension();
    (ext12 as any).version = '1.2';
    expect(() => parseV871ExperienceExtension({ v871Experience: ext12 })).toThrow('V871_EXTENSION_INVALID:version');

    const ext20 = createValidV871V11Extension();
    (ext20 as any).version = '2.0';
    expect(() => parseV871ExperienceExtension({ v871Experience: ext20 })).toThrow('V871_EXTENSION_INVALID:version');

    const extEmpty = createValidV871V11Extension();
    (extEmpty as any).version = '';
    expect(() => parseV871ExperienceExtension({ v871Experience: extEmpty })).toThrow('V871_EXTENSION_INVALID:version');

    const extNum = createValidV871V11Extension();
    (extNum as any).version = 1.1;
    expect(() => parseV871ExperienceExtension({ v871Experience: extNum })).toThrow('V871_EXTENSION_INVALID:version');
  });

  it('rejects bad block arrays in 1.1: empty array, blank strings, non-strings, null', () => {
    const emptyBlocks = createValidV871V11Extension();
    emptyBlocks.archetype.sourceBlockIds = [];
    expect(() => parseV871ExperienceExtension({ v871Experience: emptyBlocks })).toThrow(/V871_EXTENSION_INVALID:archetype\.sourceBlockIds/);

    const blankBlocks = createValidV871V11Extension();
    blankBlocks.archetype.sourceBlockIds = [''];
    expect(() => parseV871ExperienceExtension({ v871Experience: blankBlocks })).toThrow(/V871_EXTENSION_INVALID:archetype\.sourceBlockIds/);

    const wsBlocks = createValidV871V11Extension();
    wsBlocks.archetype.sourceBlockIds = ['   '];
    expect(() => parseV871ExperienceExtension({ v871Experience: wsBlocks })).toThrow(/V871_EXTENSION_INVALID:archetype\.sourceBlockIds/);

    const numBlocks = createValidV871V11Extension();
    (numBlocks.archetype as any).sourceBlockIds = [123];
    expect(() => parseV871ExperienceExtension({ v871Experience: numBlocks })).toThrow(/V871_EXTENSION_INVALID:archetype\.sourceBlockIds/);

    const strBlocks = createValidV871V11Extension();
    (strBlocks.archetype as any).sourceBlockIds = 'BLK-1';
    expect(() => parseV871ExperienceExtension({ v871Experience: strBlocks })).toThrow(/V871_EXTENSION_INVALID:archetype\.sourceBlockIds/);

    const nullBlocks = createValidV871V11Extension();
    (nullBlocks.archetype as any).sourceBlockIds = null;
    expect(() => parseV871ExperienceExtension({ v871Experience: nullBlocks })).toThrow(/V871_EXTENSION_INVALID:archetype\.sourceBlockIds/);

    const arcEmpty = createValidV871V11Extension();
    arcEmpty.experienceArc[0].sourceBlockIds = [];
    expect(() => parseV871ExperienceExtension({ v871Experience: arcEmpty })).toThrow(/V871_EXTENSION_INVALID:experienceArc\.0\.sourceBlockIds/);
  });

  it('rejects unsafe keys, accessors, and prototype chain on 1.1 payloads', () => {
    const v11Accessor = createValidV871V11Extension();
    Object.defineProperty(v11Accessor.archetype, 'sourceBlockIds', {
      get() { return ['BLK-1']; },
      enumerable: true,
      configurable: true,
    });
    expect(() => parseV871ExperienceExtension({ v871Experience: v11Accessor })).toThrow(/V871_EXTENSION_INVALID:archetype\.sourceBlockIds:accessor/);

    const v11ArrAccessor = createValidV871V11Extension();
    const badArr = ['BLK-1'];
    Object.defineProperty(badArr, '0', {
      get() { return 'BLK-1'; },
      enumerable: true,
      configurable: true,
    });
    v11ArrAccessor.archetype.sourceBlockIds = badArr;
    expect(() => parseV871ExperienceExtension({ v871Experience: v11ArrAccessor })).toThrow(/V871_EXTENSION_INVALID:archetype\.sourceBlockIds/);

    const rawActivityProto = JSON.stringify(createValidV871V11Extension()).replace('"activities":{', '"activities":{"__proto__":{},');
    const parsedActivity = JSON.parse(rawActivityProto);
    expect(() => parseV871ExperienceExtension({ v871Experience: parsedActivity })).toThrow(/V871_EXTENSION_INVALID/);

    const protoObj = { inheritedIllegalKey: true };
    const inheritedExt = Object.create(protoObj);
    Object.assign(inheritedExt, createValidV871V11Extension());
    expect(() => parseV871ExperienceExtension({ v871Experience: inheritedExt })).toThrow(/V871_EXTENSION_INVALID/);
  });

  it('rejects unexpected extra keys and misplaced sourceBlockIds on 1.1', () => {
    const extraRoot = createValidV871V11Extension();
    (extraRoot as any).extraRootKey = 'bad';
    expect(() => parseV871ExperienceExtension({ v871Experience: extraRoot })).toThrow('V871_EXTENSION_INVALID:root.extraRootKey');

    const extraArch = createValidV871V11Extension();
    (extraArch.archetype as any).unauthorized = true;
    expect(() => parseV871ExperienceExtension({ v871Experience: extraArch })).toThrow('V871_EXTENSION_INVALID:archetype.unauthorized');

    const badReveal = createValidV871V11Extension();
    (badReveal.reveal.A1 as any).sourceBlockIds = ['BLK-1'];
    expect(() => parseV871ExperienceExtension({ v871Experience: badReveal })).toThrow('V871_EXTENSION_INVALID:reveal.A1.sourceBlockIds');

    const badTiming = createValidV871V11Extension();
    (badTiming.timing as any).sourceBlockIds = ['BLK-1'];
    expect(() => parseV871ExperienceExtension({ v871Experience: badTiming })).toThrow('V871_EXTENSION_INVALID:timing.sourceBlockIds');

    const badAct = createValidV871V11Extension();
    (badAct.activities.A1 as any).sourceBlockIds = ['BLK-1'];
    expect(() => parseV871ExperienceExtension({ v871Experience: badAct })).toThrow('V871_EXTENSION_INVALID:activities.A1.sourceBlockIds');
  });

  it('preserves untrimmed string bytes for claims in 1.0 and 1.1 and blocks in 1.1 without mutating input', () => {
    // 1.0 padded claims
    const v10 = createValidV871Extension();
    v10.archetype.sourceClaimIds = ['  CLAIM-PADDED-1  '];
    const parsed10 = parseV871ExperienceExtension({ v871Experience: v10 });
    expect(parsed10?.archetype.sourceClaimIds).toEqual(['  CLAIM-PADDED-1  ']);
    expect(v10.archetype.sourceClaimIds).toEqual(['  CLAIM-PADDED-1  ']);

    // 1.1 padded claims and padded blocks
    const v11 = createValidV871V11Extension();
    v11.archetype.sourceClaimIds = ['  CLAIM-11-PADDED  '];
    v11.archetype.sourceBlockIds = ['  BLK-11-PADDED  '];
    const parsed11 = parseV871ExperienceExtension({ v871Experience: v11 });
    expect(parsed11?.archetype.sourceClaimIds).toEqual(['  CLAIM-11-PADDED  ']);
    expect((parsed11?.archetype as any).sourceBlockIds).toEqual(['  BLK-11-PADDED  ']);
    expect(v11.archetype.sourceClaimIds).toEqual(['  CLAIM-11-PADDED  ']);
    expect(v11.archetype.sourceBlockIds).toEqual(['  BLK-11-PADDED  ']);
  });

  it('rejects sparse arrays with holes and accepts valid frozen dense arrays', () => {
    // Sparse array in sourceClaimIds
    const v10Sparse = createValidV871Extension();
    const sparseClaims = new Array(2);
    sparseClaims[1] = 'CLAIM-1';
    (v10Sparse.archetype as any).sourceClaimIds = sparseClaims;
    expect(() => parseV871ExperienceExtension({ v871Experience: v10Sparse })).toThrow(/V871_EXTENSION_INVALID/);

    // Sparse array in experienceArc
    const v10SparseArc = createValidV871Extension();
    const sparseArc = new Array(3);
    sparseArc[0] = { activityId: 'A1', purpose: 'Orientation' };
    sparseArc[2] = { activityId: 'A3', purpose: 'Exit' };
    (v10SparseArc as any).experienceArc = sparseArc;
    expect(() => parseV871ExperienceExtension({ v871Experience: v10SparseArc })).toThrow(/V871_EXTENSION_INVALID/);

    // Valid frozen dense arrays are accepted
    const frozenExt = createValidV871V11Extension();
    frozenExt.archetype.sourceClaimIds = Object.freeze(['CLAIM-1']) as any;
    frozenExt.archetype.sourceBlockIds = Object.freeze(['BLK-1']) as any;
    const parsedFrozen = parseV871ExperienceExtension({ v871Experience: frozenExt });
    expect(parsedFrozen?.archetype.sourceClaimIds).toEqual(['CLAIM-1']);
  });

  it('inspects recognized wrapper and repetitionRationale descriptors before get and avoids attacker toString coercion', () => {
    // 1. Getter on extensions.v871Experience
    let extGetterCalled = 0;
    const extWithGetter = {};
    Object.defineProperty(extWithGetter, 'v871Experience', {
      get() {
        extGetterCalled++;
        return createValidV871V11Extension();
      },
      enumerable: true,
      configurable: true,
    });
    expect(() => parseV871ExperienceExtension(extWithGetter)).toThrow(/V871_EXTENSION_INVALID:root:accessor/);
    expect(extGetterCalled).toBe(0);

    // 2. Getter on repetitionRationale.text
    let textGetterCalled = 0;
    const v11RepGetter = createValidV871V11Extension();
    const repWithGetter = { sourceClaimIds: ['CLAIM-1'] };
    Object.defineProperty(repWithGetter, 'text', {
      get() {
        textGetterCalled++;
        return 'Reinforcement';
      },
      enumerable: true,
      configurable: true,
    });
    v11RepGetter.activities.A1.repetitionRationale = repWithGetter as any;
    expect(() => parseV871ExperienceExtension({ v871Experience: v11RepGetter })).toThrow(/V871_EXTENSION_INVALID:activities\.A1\.repetitionRationale\.text:accessor/);
    expect(textGetterCalled).toBe(0);

    // 3. Attacker object with toString/valueOf in enum
    let toStringCalled = 0;
    const attackerObj = {
      toString() {
        toStringCalled++;
        return 'KNOWLEDGE_FORMATION';
      },
      valueOf() {
        toStringCalled++;
        return 'KNOWLEDGE_FORMATION';
      },
    };
    const v11BadEnum = createValidV871V11Extension();
    (v11BadEnum.archetype as any).v871 = attackerObj;
    expect(() => parseV871ExperienceExtension({ v871Experience: v11BadEnum })).toThrow('V871_ENUM_UNKNOWN:archetype.v871:object');
    expect(toStringCalled).toBe(0);
  });

  it('rejects Symbol keys and custom iterators via Reflect.ownKeys', () => {
    // 1. Symbol key on archetype
    const v11SymbolArch = createValidV871V11Extension();
    (v11SymbolArch.archetype as any)[Symbol('malicious')] = true;
    expect(() => parseV871ExperienceExtension({ v871Experience: v11SymbolArch })).toThrow(/V871_EXTENSION_INVALID:archetype:symbol/);

    // 2. Symbol.iterator on protectedEvidence array attempting to hide invalid items
    let iteratorCalled = 0;
    const v11SymbolIter = createValidV871V11Extension();
    const badProtected: any = ['INVALID_ROLE' as any];
    Object.defineProperty(badProtected, Symbol.iterator, {
      get() {
        iteratorCalled++;
        return function* () { yield 'exit'; };
      },
      enumerable: false,
      configurable: true,
    });
    v11SymbolIter.activities.A1.protectedEvidence = badProtected;
    expect(() => parseV871ExperienceExtension({ v871Experience: v11SymbolIter })).toThrow(/V871_EXTENSION_INVALID:activities\.A1\.protectedEvidence:symbol/);
    expect(iteratorCalled).toBe(0);

    // 3. Symbol key on reveal map
    const v11SymbolReveal = createValidV871V11Extension();
    (v11SymbolReveal.reveal as any)[Symbol('evil')] = { v871Policy: 'NO_REVEAL', canonicalPolicy: 'no_reveal', decision: 'LOSSLESS' };
    expect(() => parseV871ExperienceExtension({ v871Experience: v11SymbolReveal })).toThrow(/V871_EXTENSION_INVALID:reveal:symbol/);
  });

  it('rejects custom prototype on extensions wrapper when v871Experience is present', () => {
    const proto = { customProtoKey: true };
    const extWithProto = Object.create(proto);
    extWithProto.v871Experience = createValidV871V11Extension();
    expect(() => parseV871ExperienceExtension(extWithProto)).toThrow(/V871_EXTENSION_INVALID:extensions:prototype_chain/);

    // Absent key on custom prototype returns null without validation
    const absentProto = Object.create(proto);
    expect(parseV871ExperienceExtension(absentProto)).toBeNull();
  });

  it('rejects accessor descriptor with get/set undefined across all trust boundaries', () => {
    // 1. Wrapper with get: undefined
    const extUndefGetter = {};
    Object.defineProperty(extUndefGetter, 'v871Experience', {
      get: undefined,
      set: undefined,
      enumerable: true,
      configurable: true,
    });
    expect(() => parseV871ExperienceExtension(extUndefGetter)).toThrow(/V871_EXTENSION_INVALID:root:accessor/);

    // 2. Closed field with get: undefined (archetype.sourceBlockIds)
    const v11UndefField = createValidV871V11Extension();
    Object.defineProperty(v11UndefField.archetype, 'sourceBlockIds', {
      get: undefined,
      enumerable: true,
      configurable: true,
    });
    expect(() => parseV871ExperienceExtension({ v871Experience: v11UndefField })).toThrow(/V871_EXTENSION_INVALID:archetype\.sourceBlockIds:accessor/);

    // 3. Array with get: undefined
    const v11UndefArr = createValidV871V11Extension();
    const arrWithUndefGetter = ['BLK-1'];
    Object.defineProperty(arrWithUndefGetter, '0', {
      get: undefined,
      enumerable: true,
      configurable: true,
    });
    v11UndefArr.archetype.sourceBlockIds = arrWithUndefGetter;
    expect(() => parseV871ExperienceExtension({ v871Experience: v11UndefArr })).toThrow(/V871_EXTENSION_INVALID:archetype\.sourceBlockIds\.0:accessor/);

    // 4. Reveal map with get: undefined
    const v11UndefReveal = createValidV871V11Extension();
    Object.defineProperty(v11UndefReveal.reveal, 'A1', {
      get: undefined,
      enumerable: true,
      configurable: true,
    });
    expect(() => parseV871ExperienceExtension({ v871Experience: v11UndefReveal })).toThrow(/V871_EXTENSION_INVALID:reveal\.A1:accessor/);

    // 5. Activities map with get: undefined
    const v11UndefAct = createValidV871V11Extension();
    Object.defineProperty(v11UndefAct.activities, 'A1', {
      get: undefined,
      enumerable: true,
      configurable: true,
    });
    expect(() => parseV871ExperienceExtension({ v871Experience: v11UndefAct })).toThrow(/V871_EXTENSION_INVALID:activities\.A1:accessor/);

    // 6. Non-null repetitionRationale field with get: undefined
    const v11UndefRep = createValidV871V11Extension();
    Object.defineProperty(v11UndefRep.activities.A1.repetitionRationale!, 'text', {
      get: undefined,
      enumerable: true,
      configurable: true,
    });
    expect(() => parseV871ExperienceExtension({ v871Experience: v11UndefRep })).toThrow(/V871_EXTENSION_INVALID:activities\.A1\.repetitionRationale\.text:accessor/);
  });
});
