import type { LessonIRV83 } from './lessonIRSchema';

const own = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const safeInt = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function assertPlainObject(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (!object(value)) throw new Error(`V871_EXTENSION_INVALID:${path}`);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new Error(`V871_EXTENSION_INVALID:${path}:prototype_chain`);
  }
}

function assertSafeArray(value: unknown, path: string): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new Error(`V871_EXTENSION_INVALID:${path}`);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Array.prototype) {
    throw new Error(`V871_EXTENSION_INVALID:${path}:prototype_chain`);
  }
  for (let i = 0; i < value.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(value, i)) {
      throw new Error(`V871_EXTENSION_INVALID:${path}:sparse`);
    }
  }
  const ownKeys = Reflect.ownKeys(value);
  for (const key of ownKeys) {
    if (typeof key === 'symbol') throw new Error(`V871_EXTENSION_INVALID:${path}:symbol`);
    if (key === 'length') continue;
    if (UNSAFE_KEYS.has(key)) throw new Error(`V871_EXTENSION_INVALID:${path}.${key}`);
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= value.length || String(index) !== key) {
      throw new Error(`V871_EXTENSION_INVALID:${path}.${key}`);
    }
    const desc = Object.getOwnPropertyDescriptor(value, key);
    if (!desc || !own(desc, 'value')) {
      throw new Error(`V871_EXTENSION_INVALID:${path}.${key}:accessor`);
    }
  }
}

const exact = (value: Record<string, unknown>, keys: readonly string[], path: string): void => {
  assertPlainObject(value, path);
  const ownKeys = Reflect.ownKeys(value);
  for (const key of ownKeys) {
    if (typeof key === 'symbol') throw new Error(`V871_EXTENSION_INVALID:${path}:symbol`);
    if (UNSAFE_KEYS.has(key) || !keys.includes(key)) throw new Error(`V871_EXTENSION_INVALID:${path}.${key}`);
    const desc = Object.getOwnPropertyDescriptor(value, key);
    if (!desc || !own(desc, 'value')) {
      throw new Error(`V871_EXTENSION_INVALID:${path}.${key}:accessor`);
    }
  }
};

const enumValue = <T extends string>(value: unknown, values: readonly T[], path: string): T => {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    const display = typeof value === 'string' ? value : typeof value;
    throw new Error(`V871_ENUM_UNKNOWN:${path}:${display}`);
  }
  return value as T;
};

const claims = (value: unknown, path: string, allowEmpty = false): string[] => {
  assertSafeArray(value, path);
  if (!allowEmpty && value.length === 0) {
    throw new Error(`V871_EXTENSION_INVALID:${path}`);
  }
  const result: string[] = [];
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (!text(item)) throw new Error(`V871_EXTENSION_INVALID:${path}`);
    result.push(item);
  }
  return result;
};

const blocks = (value: unknown, path: string): string[] => {
  assertSafeArray(value, path);
  if (value.length === 0) {
    throw new Error(`V871_EXTENSION_INVALID:${path}`);
  }
  const result: string[] = [];
  for (let i = 0; i < value.length; i++) {
    const item = value[i];
    if (!text(item)) throw new Error(`V871_EXTENSION_INVALID:${path}`);
    result.push(item);
  }
  return result;
};

const parseProvenance = (
  obj: Record<string, unknown>,
  path: string,
  isV11: boolean,
  isNotApplicable = false,
): { sourceClaimIds: string[]; sourceBlockIds?: string[] } => {
  let sourceBlockIds: string[] | undefined;
  if (isV11 && own(obj, 'sourceBlockIds')) {
    if (obj.sourceBlockIds === undefined) {
      throw new Error(`V871_EXTENSION_INVALID:${path}.sourceBlockIds`);
    }
    sourceBlockIds = blocks(obj.sourceBlockIds, `${path}.sourceBlockIds`);
  }

  if (!own(obj, 'sourceClaimIds') || obj.sourceClaimIds === undefined) {
    throw new Error(`V871_EXTENSION_INVALID:${path}.sourceClaimIds`);
  }

  const allowEmpty = isNotApplicable || (isV11 && sourceBlockIds !== undefined);
  const sourceClaimIds = claims(obj.sourceClaimIds, `${path}.sourceClaimIds`, allowEmpty);
  return sourceBlockIds !== undefined ? { sourceClaimIds, sourceBlockIds } : { sourceClaimIds };
};

export type V871ArchetypeType =
  | 'KNOWLEDGE_FORMATION'
  | 'PRACTICE_REVIEW'
  | 'APPLICATION_TRANSFER'
  | 'INVESTIGATION_EXPERIENTIAL'
  | 'ASSESSMENT_FEEDBACK'
  | 'PROJECT_WORKSHOP'
  | 'SEMINAR_DISCUSSION'
  | 'MIXED';

export const V871_ARCHETYPES = [
  'KNOWLEDGE_FORMATION',
  'PRACTICE_REVIEW',
  'APPLICATION_TRANSFER',
  'INVESTIGATION_EXPERIENTIAL',
  'ASSESSMENT_FEEDBACK',
  'PROJECT_WORKSHOP',
  'SEMINAR_DISCUSSION',
  'MIXED',
] as const;

export type V871CanonicalArchetype =
  | 'concept_formation'
  | 'practice'
  | 'review_diagnostic'
  | 'flipped'
  | 'modeling_application';

export const V871_CANONICAL_ARCHETYPES = [
  'concept_formation',
  'practice',
  'review_diagnostic',
  'flipped',
  'modeling_application',
] as const;

export type V871ArchetypeDecision = 'LOSSLESS' | 'TEACHER_SELECTED' | 'REVIEW_REQUIRED';

export const V871_ARCHETYPE_DECISIONS = ['LOSSLESS', 'TEACHER_SELECTED', 'REVIEW_REQUIRED'] as const;

export interface V871Archetype {
  v871: V871ArchetypeType;
  canonicalBase: V871CanonicalArchetype | null;
  decision: V871ArchetypeDecision;
  rationale: string;
  sourceClaimIds: string[];
}

export type V871RevealPolicy =
  | 'TEACHER_MANUAL'
  | 'NO_REVEAL'
  | 'AUTO_AFTER_STATS'
  | 'DISCUSSION_THEN_REVEAL';

export const V871_REVEAL_POLICIES = [
  'TEACHER_MANUAL',
  'NO_REVEAL',
  'AUTO_AFTER_STATS',
  'DISCUSSION_THEN_REVEAL',
] as const;

export type V871CanonicalRevealPolicy =
  | 'teacher_manual'
  | 'no_reveal'
  | 'auto_on_next'
  | 'show_after_submit';

export const V871_CANONICAL_REVEAL_POLICIES = [
  'teacher_manual',
  'no_reveal',
  'auto_on_next',
  'show_after_submit',
] as const;

export interface V871RevealEntry {
  v871Policy: V871RevealPolicy;
  canonicalPolicy: V871CanonicalRevealPolicy | null;
  decision: 'LOSSLESS' | 'REVIEW_REQUIRED';
}

export type V871Target =
  | 'PRESENTER'
  | 'STUDENT_DEVICE'
  | 'PAPER'
  | 'PEER'
  | 'GROUP'
  | 'BOARD'
  | 'PHYSICAL_MODEL';

export const V871_TARGETS = [
  'PRESENTER',
  'STUDENT_DEVICE',
  'PAPER',
  'PEER',
  'GROUP',
  'BOARD',
  'PHYSICAL_MODEL',
] as const;

export type V871ParticipationMode =
  | 'INDIVIDUAL'
  | 'PAIR'
  | 'GROUP'
  | 'WHOLE_CLASS'
  | 'ROTATION';

export const V871_PARTICIPATION_MODES = [
  'INDIVIDUAL',
  'PAIR',
  'GROUP',
  'WHOLE_CLASS',
  'ROTATION',
] as const;

export type V871ResponseMode =
  | 'SELECT'
  | 'TEXT'
  | 'DRAG_DROP'
  | 'DRAW'
  | 'SPEAK'
  | 'PHOTO'
  | 'MANIPULATE'
  | 'BUILD'
  | 'NONE';

export const V871_RESPONSE_MODES = [
  'SELECT',
  'TEXT',
  'DRAG_DROP',
  'DRAW',
  'SPEAK',
  'PHOTO',
  'MANIPULATE',
  'BUILD',
  'NONE',
] as const;

export type V871VisualMode =
  | 'NONE'
  | 'STATIC'
  | 'DYNAMIC'
  | 'SIMULATION'
  | 'COMPARISON'
  | 'STEPWISE'
  | 'MAP';

export const V871_VISUAL_MODES = [
  'NONE',
  'STATIC',
  'DYNAMIC',
  'SIMULATION',
  'COMPARISON',
  'STEPWISE',
  'MAP',
] as const;

export type V871PhysicalAction =
  | 'NONE'
  | 'TURN_AND_TALK'
  | 'MOVE'
  | 'POINT'
  | 'WRITE_PAPER'
  | 'MANIPULATE'
  | 'PRESENT';

export const V871_PHYSICAL_ACTIONS = [
  'NONE',
  'TURN_AND_TALK',
  'MOVE',
  'POINT',
  'WRITE_PAPER',
  'MANIPULATE',
  'PRESENT',
] as const;

export interface V871Signature {
  attentionTarget: V871Target;
  participationMode: V871ParticipationMode;
  interactionPattern: string;
  responseMode: V871ResponseMode;
  visualMode: V871VisualMode;
  physicalAction: V871PhysicalAction;
  evidenceType: string;
  transitionCue: string;
}

export interface V871Handoff {
  target: V871Target;
  entryCue: string;
  deviceState: 'locked' | 'view_only' | 'interactive';
  exitCue: string;
  fallback: string;
}

export type V871ProtectedRole = 'recheck' | 'exit' | 'selfAssessment' | 'closing';

export const V871_PROTECTED_ROLES = ['recheck', 'exit', 'selfAssessment', 'closing'] as const;

export interface V871RepetitionRationale {
  text: string;
  sourceClaimIds: string[];
}

export interface V871ActivityMetadata {
  signature: V871Signature;
  handoff: V871Handoff;
  coreBudgetSec: number;
  recoveryBudgetSec: number;
  protectedEvidence: V871ProtectedRole[];
  fastPath: { cuttable: boolean };
  repetitionRationale: V871RepetitionRationale | null;
}

export interface V871VisualOpportunityAudit {
  spatial: boolean;
  parameter: boolean;
  representation: boolean;
  invariant: boolean;
  errorTrace: boolean;
  stepwiseReveal: boolean;
  decision: 'APPLICABLE' | 'NOT_APPLICABLE' | 'UNDETERMINED';
  rationale: string;
  sourceClaimIds: string[];
}

export interface V871CapabilityAudit {
  lessonDecision: 'APPLICABLE' | 'NOT_APPLICABLE' | 'UNDETERMINED';
  rationale: string;
  sourceClaimIds: string[];
}

export interface V871Capabilities {
  collaboration: V871CapabilityAudit;
  peerReview: V871CapabilityAudit;
}

export interface V871Timing {
  slotDurationSec: number;
  coreBudgetSec: number;
  reserveBudgetSec: number;
}

export interface V871ArcEntry {
  activityId: string;
  purpose: string;
}

export interface V871ArcEntryV11 extends V871ArcEntry {
  sourceBlockIds?: string[];
}

export interface V871ArchetypeV11 extends V871Archetype {
  sourceBlockIds?: string[];
}

export interface V871VisualOpportunityAuditV11 extends V871VisualOpportunityAudit {
  sourceBlockIds?: string[];
}

export interface V871CapabilityAuditV11 extends V871CapabilityAudit {
  sourceBlockIds?: string[];
}

export interface V871CapabilitiesV11 {
  collaboration: V871CapabilityAuditV11;
  peerReview: V871CapabilityAuditV11;
}

export interface V871RepetitionRationaleV11 extends V871RepetitionRationale {
  sourceBlockIds?: string[];
}

export interface V871ActivityMetadataV11 extends Omit<V871ActivityMetadata, 'repetitionRationale'> {
  repetitionRationale: V871RepetitionRationaleV11 | null;
}

export interface V871Experience {
  version: '1.0';
  sourceHash: string;
  experienceArc: V871ArcEntry[];
  archetype: V871Archetype;
  reveal: Record<string, V871RevealEntry>;
  timing: V871Timing;
  activities: Record<string, V871ActivityMetadata>;
  visualOpportunityAudit: V871VisualOpportunityAudit;
  capabilities: V871Capabilities;
}

export interface V871ExperienceV11 {
  version: '1.1';
  sourceHash: string;
  experienceArc: V871ArcEntryV11[];
  archetype: V871ArchetypeV11;
  reveal: Record<string, V871RevealEntry>;
  timing: V871Timing;
  activities: Record<string, V871ActivityMetadataV11>;
  visualOpportunityAudit: V871VisualOpportunityAuditV11;
  capabilities: V871CapabilitiesV11;
}

export type V871ExperienceAny = V871Experience | V871ExperienceV11;

const parseActivity = (value: unknown, path: string, isV11: boolean): V871ActivityMetadataV11 => {
  if (!object(value)) throw new Error(`V871_EXTENSION_INVALID:${path}`);
  exact(value, ['signature', 'handoff', 'coreBudgetSec', 'recoveryBudgetSec', 'protectedEvidence', 'fastPath', 'repetitionRationale'], path);

  if (!safeInt(value.coreBudgetSec) || !safeInt(value.recoveryBudgetSec)) {
    throw new Error(`V871_TIMING_INVALID:${path}`);
  }

  if (!object(value.signature) || !object(value.handoff)
    || !Array.isArray(value.protectedEvidence) || !object(value.fastPath)) {
    throw new Error(`V871_EXTENSION_INVALID:${path}`);
  }

  assertSafeArray(value.protectedEvidence, `${path}.protectedEvidence`);
  exact(value.fastPath, ['cuttable'], `${path}.fastPath`);
  if (typeof value.fastPath.cuttable !== 'boolean') throw new Error(`V871_EXTENSION_INVALID:${path}.fastPath.cuttable`);

  exact(value.signature, ['attentionTarget', 'participationMode', 'interactionPattern', 'responseMode', 'visualMode', 'physicalAction', 'evidenceType', 'transitionCue'], `${path}.signature`);
  const sig = value.signature;
  const attentionTarget = enumValue(sig.attentionTarget, V871_TARGETS, `${path}.signature.attentionTarget`);
  const participationMode = enumValue(sig.participationMode, V871_PARTICIPATION_MODES, `${path}.signature.participationMode`);
  if (!text(sig.interactionPattern)) throw new Error(`V871_EXTENSION_INVALID:${path}.signature.interactionPattern`);
  const responseMode = enumValue(sig.responseMode, V871_RESPONSE_MODES, `${path}.signature.responseMode`);
  const visualMode = enumValue(sig.visualMode, V871_VISUAL_MODES, `${path}.signature.visualMode`);
  const physicalAction = enumValue(sig.physicalAction, V871_PHYSICAL_ACTIONS, `${path}.signature.physicalAction`);
  if (!text(sig.evidenceType)) throw new Error(`V871_EXTENSION_INVALID:${path}.signature.evidenceType`);
  if (!text(sig.transitionCue)) throw new Error(`V871_EXTENSION_INVALID:${path}.signature.transitionCue`);

  exact(value.handoff, ['target', 'entryCue', 'deviceState', 'exitCue', 'fallback'], `${path}.handoff`);
  const handoff = value.handoff;
  const target = enumValue(handoff.target, V871_TARGETS, `${path}.handoff.target`);
  if (!text(handoff.entryCue) || !text(handoff.exitCue) || !text(handoff.fallback)) {
    throw new Error(`V871_EXTENSION_INVALID:${path}.handoff`);
  }
  const deviceState = enumValue(handoff.deviceState, ['locked', 'view_only', 'interactive'] as const, `${path}.handoff.deviceState`);

  const protectedEvidence: V871ProtectedRole[] = [];
  for (let i = 0; i < value.protectedEvidence.length; i++) {
    const role = value.protectedEvidence[i];
    protectedEvidence.push(enumValue(role, V871_PROTECTED_ROLES, `${path}.protectedEvidence`));
  }

  let repetitionRationale: V871RepetitionRationaleV11 | null = null;
  if (value.repetitionRationale !== null) {
    if (!object(value.repetitionRationale)) {
      throw new Error(`V871_EXTENSION_INVALID:${path}.repetitionRationale`);
    }
    exact(value.repetitionRationale, isV11
      ? ['text', 'sourceClaimIds', 'sourceBlockIds']
      : ['text', 'sourceClaimIds'],
    `${path}.repetitionRationale`);
    if (!text(value.repetitionRationale.text)) {
      throw new Error(`V871_EXTENSION_INVALID:${path}.repetitionRationale`);
    }
    const repProv = parseProvenance(value.repetitionRationale, `${path}.repetitionRationale`, isV11, false);
    repetitionRationale = {
      text: (value.repetitionRationale.text as string).trim(),
      sourceClaimIds: repProv.sourceClaimIds,
      ...(repProv.sourceBlockIds !== undefined ? { sourceBlockIds: repProv.sourceBlockIds } : {}),
    };
  }

  return {
    signature: {
      attentionTarget,
      participationMode,
      interactionPattern: (sig.interactionPattern as string).trim(),
      responseMode,
      visualMode,
      physicalAction,
      evidenceType: (sig.evidenceType as string).trim(),
      transitionCue: (sig.transitionCue as string).trim(),
    },
    handoff: {
      target,
      entryCue: (handoff.entryCue as string).trim(),
      deviceState,
      exitCue: (handoff.exitCue as string).trim(),
      fallback: (handoff.fallback as string).trim(),
    },
    coreBudgetSec: value.coreBudgetSec,
    recoveryBudgetSec: value.recoveryBudgetSec,
    protectedEvidence,
    fastPath: { cuttable: value.fastPath.cuttable },
    repetitionRationale,
  };
};

export const parseV871ExperienceExtension = (extensions: unknown): V871Experience | V871ExperienceV11 | null => {
  if (!object(extensions) || !own(extensions, 'v871Experience')) return null;
  assertPlainObject(extensions, 'extensions');
  const rootDesc = Object.getOwnPropertyDescriptor(extensions, 'v871Experience');
  if (!rootDesc || !own(rootDesc, 'value')) {
    throw new Error('V871_EXTENSION_INVALID:root:accessor');
  }
  const root = rootDesc.value;
  if (!object(root)) throw new Error('V871_EXTENSION_INVALID:root');
  exact(root, ['version', 'sourceHash', 'experienceArc', 'archetype', 'reveal', 'timing', 'activities', 'visualOpportunityAudit', 'capabilities'], 'root');

  if (root.version !== '1.0' && root.version !== '1.1') throw new Error('V871_EXTENSION_INVALID:version');
  const isV11 = root.version === '1.1';

  if (!text(root.sourceHash)) throw new Error('V871_EXTENSION_INVALID:sourceHash');
  if (!Array.isArray(root.experienceArc) || !object(root.archetype) || !object(root.reveal) || !object(root.timing) || !object(root.activities) || !object(root.visualOpportunityAudit) || !object(root.capabilities)) {
    throw new Error('V871_EXTENSION_INVALID:root');
  }

  // Arc
  assertSafeArray(root.experienceArc, 'experienceArc');
  const experienceArc: (V871ArcEntry | V871ArcEntryV11)[] = [];
  const arcIds = new Set<string>();
  for (let index = 0; index < root.experienceArc.length; index++) {
    const item = root.experienceArc[index];
    if (!object(item)) throw new Error(`V871_EXTENSION_INVALID:experienceArc.${index}`);
    exact(item, isV11 ? ['activityId', 'purpose', 'sourceBlockIds'] : ['activityId', 'purpose'], `experienceArc.${index}`);
    if (!text(item.activityId) || !text(item.purpose)) throw new Error(`V871_EXTENSION_INVALID:experienceArc.${index}`);
    const actId = (item.activityId as string).trim();
    if (arcIds.has(actId)) throw new Error('V871_ACTIVITY_COVERAGE_INVALID:duplicate_arc');
    arcIds.add(actId);

    let arcBlocks: string[] | undefined;
    if (isV11 && own(item, 'sourceBlockIds')) {
      if (item.sourceBlockIds === undefined) {
        throw new Error(`V871_EXTENSION_INVALID:experienceArc.${index}.sourceBlockIds`);
      }
      arcBlocks = blocks(item.sourceBlockIds, `experienceArc.${index}.sourceBlockIds`);
    }

    experienceArc.push({
      activityId: actId,
      purpose: (item.purpose as string).trim(),
      ...(arcBlocks !== undefined ? { sourceBlockIds: arcBlocks } : {}),
    });
  }

  // Archetype
  exact(root.archetype, isV11
    ? ['v871', 'canonicalBase', 'decision', 'rationale', 'sourceClaimIds', 'sourceBlockIds']
    : ['v871', 'canonicalBase', 'decision', 'rationale', 'sourceClaimIds'],
  'archetype');
  const v871 = enumValue(root.archetype.v871, V871_ARCHETYPES, 'archetype.v871');
  const canonicalBase = root.archetype.canonicalBase === null
    ? null
    : enumValue(root.archetype.canonicalBase, V871_CANONICAL_ARCHETYPES, 'archetype.canonicalBase');
  const decision = enumValue(root.archetype.decision, V871_ARCHETYPE_DECISIONS, 'archetype.decision');
  if (typeof root.archetype.rationale !== 'string') throw new Error('V871_EXTENSION_INVALID:archetype.rationale');
  const archProv = parseProvenance(root.archetype, 'archetype', isV11, false);
  const archetype: V871Archetype | V871ArchetypeV11 = {
    v871,
    canonicalBase,
    decision,
    rationale: root.archetype.rationale.trim(),
    sourceClaimIds: archProv.sourceClaimIds,
    ...(archProv.sourceBlockIds !== undefined ? { sourceBlockIds: archProv.sourceBlockIds } : {}),
  };

  // Reveal
  assertPlainObject(root.reveal, 'reveal');
  const revealKeys = Reflect.ownKeys(root.reveal);
  for (const key of revealKeys) {
    if (typeof key === 'symbol') throw new Error('V871_EXTENSION_INVALID:reveal:symbol');
    if (UNSAFE_KEYS.has(key)) throw new Error(`V871_EXTENSION_INVALID:reveal.${key}`);
    const desc = Object.getOwnPropertyDescriptor(root.reveal, key);
    if (!desc || !own(desc, 'value')) {
      throw new Error(`V871_EXTENSION_INVALID:reveal.${key}:accessor`);
    }
  }
  const reveal: Record<string, V871RevealEntry> = {};
  for (const key of revealKeys) {
    const id = key as string;
    const rev = (root.reveal as Record<string, unknown>)[id];
    if (UNSAFE_KEYS.has(id)) throw new Error(`V871_EXTENSION_INVALID:reveal.${id}`);
    if (!object(rev)) throw new Error(`V871_EXTENSION_INVALID:reveal.${id}`);
    exact(rev, ['v871Policy', 'canonicalPolicy', 'decision'], `reveal.${id}`);
    const v871Policy = enumValue(rev.v871Policy, V871_REVEAL_POLICIES, `reveal.${id}.v871Policy`);
    const canonicalPolicy = rev.canonicalPolicy === null
      ? null
      : enumValue(rev.canonicalPolicy, V871_CANONICAL_REVEAL_POLICIES, `reveal.${id}.canonicalPolicy`);
    const revDecision = enumValue(rev.decision, ['LOSSLESS', 'REVIEW_REQUIRED'] as const, `reveal.${id}.decision`);
    if (['AUTO_AFTER_STATS', 'DISCUSSION_THEN_REVEAL'].includes(v871Policy) && (canonicalPolicy !== null || revDecision !== 'REVIEW_REQUIRED')) {
      throw new Error(`V871_SEMANTIC_CONFLICT:reveal.${id}`);
    }
    reveal[id] = { v871Policy, canonicalPolicy, decision: revDecision };
  }

  // Timing
  exact(root.timing, ['slotDurationSec', 'coreBudgetSec', 'reserveBudgetSec'], 'timing');
  if (!safeInt(root.timing.slotDurationSec) || !safeInt(root.timing.coreBudgetSec) || !safeInt(root.timing.reserveBudgetSec)) {
    throw new Error('V871_TIMING_INVALID:timing');
  }
  const timing: V871Timing = {
    slotDurationSec: root.timing.slotDurationSec,
    coreBudgetSec: root.timing.coreBudgetSec,
    reserveBudgetSec: root.timing.reserveBudgetSec,
  };

  // Activities
  assertPlainObject(root.activities, 'activities');
  const activityKeys = Reflect.ownKeys(root.activities);
  for (const key of activityKeys) {
    if (typeof key === 'symbol') throw new Error('V871_EXTENSION_INVALID:activities:symbol');
    if (UNSAFE_KEYS.has(key)) throw new Error(`V871_EXTENSION_INVALID:activities.${key}`);
    const desc = Object.getOwnPropertyDescriptor(root.activities, key);
    if (!desc || !own(desc, 'value')) {
      throw new Error(`V871_EXTENSION_INVALID:activities.${key}:accessor`);
    }
  }
  const activities: Record<string, V871ActivityMetadataV11> = {};
  for (const key of activityKeys) {
    const id = key as string;
    if (UNSAFE_KEYS.has(id)) throw new Error(`V871_EXTENSION_INVALID:activities.${id}`);
    const act = (root.activities as Record<string, unknown>)[id];
    activities[id] = parseActivity(act, `activities.${id}`, isV11);
  }

  // VisualOpportunityAudit
  exact(root.visualOpportunityAudit, isV11
    ? ['spatial', 'parameter', 'representation', 'invariant', 'errorTrace', 'stepwiseReveal', 'decision', 'rationale', 'sourceClaimIds', 'sourceBlockIds']
    : ['spatial', 'parameter', 'representation', 'invariant', 'errorTrace', 'stepwiseReveal', 'decision', 'rationale', 'sourceClaimIds'],
  'visualOpportunityAudit');
  const voa = root.visualOpportunityAudit;
  if (typeof voa.spatial !== 'boolean' || typeof voa.parameter !== 'boolean' || typeof voa.representation !== 'boolean'
    || typeof voa.invariant !== 'boolean' || typeof voa.errorTrace !== 'boolean' || typeof voa.stepwiseReveal !== 'boolean'
    || !text(voa.rationale)) {
    throw new Error('V871_EXTENSION_INVALID:visualOpportunityAudit');
  }
  const voaDecision = enumValue(voa.decision, ['APPLICABLE', 'NOT_APPLICABLE', 'UNDETERMINED'] as const, 'visualOpportunityAudit.decision');
  const voaProv = parseProvenance(voa, 'visualOpportunityAudit', isV11, voaDecision === 'NOT_APPLICABLE');
  const visualOpportunityAudit: V871VisualOpportunityAudit | V871VisualOpportunityAuditV11 = {
    spatial: voa.spatial,
    parameter: voa.parameter,
    representation: voa.representation,
    invariant: voa.invariant,
    errorTrace: voa.errorTrace,
    stepwiseReveal: voa.stepwiseReveal,
    decision: voaDecision,
    rationale: voa.rationale.trim(),
    sourceClaimIds: voaProv.sourceClaimIds,
    ...(voaProv.sourceBlockIds !== undefined ? { sourceBlockIds: voaProv.sourceBlockIds } : {}),
  };

  // Capabilities
  exact(root.capabilities, ['collaboration', 'peerReview'], 'capabilities');
  const caps = root.capabilities;
  if (!object(caps.collaboration) || !object(caps.peerReview)) {
    throw new Error('V871_EXTENSION_INVALID:capabilities');
  }
  exact(caps.collaboration, isV11
    ? ['lessonDecision', 'rationale', 'sourceClaimIds', 'sourceBlockIds']
    : ['lessonDecision', 'rationale', 'sourceClaimIds'],
  'capabilities.collaboration');
  exact(caps.peerReview, isV11
    ? ['lessonDecision', 'rationale', 'sourceClaimIds', 'sourceBlockIds']
    : ['lessonDecision', 'rationale', 'sourceClaimIds'],
  'capabilities.peerReview');
  if (!text(caps.collaboration.rationale) || !text(caps.peerReview.rationale)) {
    throw new Error('V871_EXTENSION_INVALID:capabilities');
  }
  const collabDecision = enumValue(caps.collaboration.lessonDecision, ['APPLICABLE', 'NOT_APPLICABLE', 'UNDETERMINED'] as const, 'capabilities.collaboration.lessonDecision');
  const peerDecision = enumValue(caps.peerReview.lessonDecision, ['APPLICABLE', 'NOT_APPLICABLE', 'UNDETERMINED'] as const, 'capabilities.peerReview.lessonDecision');
  const collabProv = parseProvenance(caps.collaboration, 'capabilities.collaboration', isV11, collabDecision === 'NOT_APPLICABLE');
  const peerProv = parseProvenance(caps.peerReview, 'capabilities.peerReview', isV11, peerDecision === 'NOT_APPLICABLE');
  const capabilities: V871Capabilities | V871CapabilitiesV11 = {
    collaboration: {
      lessonDecision: collabDecision,
      rationale: (caps.collaboration.rationale as string).trim(),
      sourceClaimIds: collabProv.sourceClaimIds,
      ...(collabProv.sourceBlockIds !== undefined ? { sourceBlockIds: collabProv.sourceBlockIds } : {}),
    },
    peerReview: {
      lessonDecision: peerDecision,
      rationale: (caps.peerReview.rationale as string).trim(),
      sourceClaimIds: peerProv.sourceClaimIds,
      ...(peerProv.sourceBlockIds !== undefined ? { sourceBlockIds: peerProv.sourceBlockIds } : {}),
    },
  };

  if (isV11) {
    return {
      version: '1.1',
      sourceHash: root.sourceHash.trim(),
      experienceArc: experienceArc as V871ArcEntryV11[],
      archetype: archetype as V871ArchetypeV11,
      reveal,
      timing,
      activities: activities as Record<string, V871ActivityMetadataV11>,
      visualOpportunityAudit: visualOpportunityAudit as V871VisualOpportunityAuditV11,
      capabilities: capabilities as V871CapabilitiesV11,
    };
  }

  return {
    version: '1.0',
    sourceHash: root.sourceHash.trim(),
    experienceArc: experienceArc as V871ArcEntry[],
    archetype: archetype as V871Archetype,
    reveal,
    timing,
    activities: activities as Record<string, V871ActivityMetadata>,
    visualOpportunityAudit: visualOpportunityAudit as V871VisualOpportunityAudit,
    capabilities: capabilities as V871Capabilities,
  };
};

export const displaySelfAssessment = (value: 'achieved' | 'exceeded' | 'progressing' | 'not_started'): string => {
  if (value === 'achieved' || value === 'exceeded') return 'Đã đạt';
  if (value === 'progressing') return 'Gần đạt';
  if (value === 'not_started') return 'Chưa đạt';
  throw new Error(`V871_ENUM_UNKNOWN:selfAssessment:${String(value)}`);
};

export const storeSelfAssessment = (label: string): 'achieved' | 'progressing' | 'not_started' => {
  if (label === 'Đã đạt') return 'achieved';
  if (label === 'Gần đạt') return 'progressing';
  if (label === 'Chưa đạt') return 'not_started';
  throw new Error(`V871_ENUM_UNKNOWN:selfAssessmentLabel:${label}`);
};

export type ExperienceLesson = LessonIRV83;
