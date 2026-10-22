import type { LessonIRV83 } from './lessonIRSchema';
import type { AttentionSurface } from './lessonIR.generated';
import type { SourceModel } from './sourceModel';
import {
  parseV871ExperienceExtension,
  type V871Experience,
  type V871ExperienceV11,
  type V871Target,
  type V871ActivityMetadata,
} from './experienceExtension';

export interface ExperienceResult {
  status: 'LEGACY' | 'BLOCKED' | 'REVIEW_REQUIRED' | 'STRUCTURALLY_VALID';
  issues: string[];
  diagnostics: string[];
  warnings: string[];
}

const mapTarget = (t: V871Target): AttentionSurface | 'REVIEW_REQUIRED' => {
  switch (t) {
    case 'PRESENTER': return 'presenter';
    case 'STUDENT_DEVICE': return 'student_device';
    case 'PAPER': return 'notebook';
    case 'PEER':
    case 'GROUP': return 'pair_group';
    case 'BOARD': return 'board';
    case 'PHYSICAL_MODEL': return 'REVIEW_REQUIRED';
  }
};

export const evaluateExperienceDesign = (
  lesson: LessonIRV83,
  sourceModel?: Pick<SourceModel, 'sourceHash' | 'claims'> & Partial<Pick<SourceModel, 'blocks'>>,
): ExperienceResult => {
  let extension: V871Experience | V871ExperienceV11 | null;
  try {
    extension = parseV871ExperienceExtension(lesson.extensions);
  } catch (error) {
    return {
      status: 'BLOCKED',
      issues: [error instanceof Error ? error.message : 'V871_EXTENSION_INVALID'],
      diagnostics: [],
      warnings: [],
    };
  }

  if (!extension) {
    return { status: 'LEGACY', issues: [], diagnostics: [], warnings: [] };
  }

  const issues: string[] = [];
  const diagnostics: string[] = [];
  const warnings: string[] = [];

  // 1. Timeline, Arc, and Coverage verification (duplicate/missing/unknown refs first)
  const timelineIds = lesson.timeline.map(activity => activity.id);
  if (new Set(timelineIds).size !== timelineIds.length) {
    issues.push('V871_ACTIVITY_COVERAGE_INVALID:canonical_duplicate');
  }

  if (extension.experienceArc.length !== lesson.timeline.length) {
    issues.push('V871_ACTIVITY_COVERAGE_INVALID');
  } else {
    for (let i = 0; i < lesson.timeline.length; i += 1) {
      if (extension.experienceArc[i].activityId !== lesson.timeline[i].id) {
        issues.push('V871_ACTIVITY_COVERAGE_INVALID');
        break;
      }
    }
  }

  const activityKeys = Object.keys(extension.activities);
  if (activityKeys.length !== timelineIds.length
    || timelineIds.some(id => !Object.prototype.hasOwnProperty.call(extension!.activities, id))
    || activityKeys.some(id => !timelineIds.includes(id))) {
    issues.push('V871_ACTIVITY_COVERAGE_INVALID');
  }

  const revealKeys = Object.keys(extension.reveal);
  if (revealKeys.length !== timelineIds.length
    || timelineIds.some(id => !Object.prototype.hasOwnProperty.call(extension!.reveal, id))
    || revealKeys.some(id => !timelineIds.includes(id))) {
    issues.push('V871_ACTIVITY_COVERAGE_INVALID');
  }

  // 2. Source hash & claim verification
  if (extension.sourceHash !== lesson.provenance?.sourceHash) {
    issues.push('V871_SOURCE_HASH_MISMATCH');
  }

  let validClaims = false;
  let validBlocks = false;

  if (sourceModel) {
    if (extension.sourceHash !== sourceModel.sourceHash) {
      issues.push('V871_SOURCE_HASH_MISMATCH');
    }

    if (extension.version === '1.0') {
      const verifiedClaimIds = new Set(sourceModel.claims.map(claim => claim.id));

      // Collect all typed claims
      const claimIdsToCheck: string[] = [
        ...extension.archetype.sourceClaimIds,
        ...extension.visualOpportunityAudit.sourceClaimIds,
        ...extension.capabilities.collaboration.sourceClaimIds,
        ...extension.capabilities.peerReview.sourceClaimIds,
      ];
      for (const act of Object.values(extension.activities)) {
        if (act.repetitionRationale) {
          claimIdsToCheck.push(...act.repetitionRationale.sourceClaimIds);
        }
      }

      for (const claimId of claimIdsToCheck) {
        if (!verifiedClaimIds.has(claimId)) {
          issues.push(`V871_SOURCE_CLAIM_NOT_FOUND:${claimId}`);
        }
      }
    } else {
      type ProvenanceRef = { sourceClaimIds: string[]; sourceBlockIds?: string[] };
      const refObjects: ProvenanceRef[] = [
        extension.archetype,
        ...extension.experienceArc.map(arc => ({ sourceClaimIds: [], sourceBlockIds: arc.sourceBlockIds })),
        extension.visualOpportunityAudit,
        extension.capabilities.collaboration,
        extension.capabilities.peerReview,
      ];
      for (const act of Object.values(extension.activities)) {
        if (act.repetitionRationale) {
          refObjects.push(act.repetitionRationale);
        }
      }

      const hasAnyBlockRefs = refObjects.some(r => r.sourceBlockIds && r.sourceBlockIds.length > 0);

      if (!Array.isArray(sourceModel.claims)) {
        issues.push('V871_SOURCE_CLAIMS_INVALID');
      } else {
        let claimsMalformed = false;
        for (let i = 0; i < sourceModel.claims.length; i += 1) {
          if (!Object.prototype.hasOwnProperty.call(sourceModel.claims, i)) {
            claimsMalformed = true;
            break;
          }
          const claim = sourceModel.claims[i];
          if (claim === null || typeof claim !== 'object' || Array.isArray(claim) || typeof (claim as any).id !== 'string') {
            claimsMalformed = true;
            break;
          }
        }
        if (claimsMalformed) {
          issues.push('V871_SOURCE_CLAIMS_INVALID');
        } else {
          validClaims = true;
        }
      }

      if (sourceModel.blocks !== undefined) {
        if (!Array.isArray(sourceModel.blocks)) {
          issues.push('V871_SOURCE_BLOCKS_INVALID');
        } else {
          let blocksMalformed = false;
          for (let i = 0; i < sourceModel.blocks.length; i += 1) {
            if (!Object.prototype.hasOwnProperty.call(sourceModel.blocks, i)) {
              blocksMalformed = true;
              break;
            }
            const block = sourceModel.blocks[i];
            if (block === null || typeof block !== 'object' || Array.isArray(block) || typeof (block as any).id !== 'string') {
              blocksMalformed = true;
              break;
            }
          }
          if (blocksMalformed) {
            issues.push('V871_SOURCE_BLOCKS_INVALID');
          } else {
            validBlocks = true;
          }
        }
      }

      if (hasAnyBlockRefs && sourceModel.blocks === undefined) {
        diagnostics.push('V871_PROVENANCE_REVIEW_REQUIRED');
      } else if (validBlocks) {
        const seenBlockIds = new Set<string>();
        for (const block of sourceModel.blocks!) {
          if (seenBlockIds.has(block.id)) issues.push(`V871_SOURCE_BLOCK_DUPLICATE:${block.id}`);
          seenBlockIds.add(block.id);
        }
        const availableBlocks = new Map(sourceModel.blocks!.map(b => [b.id, b]));
        for (const refObj of refObjects) {
          if (refObj.sourceBlockIds) {
            for (const blockId of refObj.sourceBlockIds) {
              if (!availableBlocks.has(blockId)) {
                issues.push(`V871_SOURCE_BLOCK_NOT_FOUND:${blockId}`);
              }
            }
          }
        }
      }

      if (validClaims) {
        const seenClaimIds = new Set<string>();
        for (const claim of sourceModel.claims) {
          if (seenClaimIds.has(claim.id)) issues.push(`V871_SOURCE_CLAIM_DUPLICATE:${claim.id}`);
          seenClaimIds.add(claim.id);
        }
        const claimsMap = new Map(sourceModel.claims.map(c => [c.id, c]));
        for (const refObj of refObjects) {
          for (const claimId of refObj.sourceClaimIds) {
            const claim = claimsMap.get(claimId);
            if (!claim) {
              issues.push(`V871_SOURCE_CLAIM_NOT_FOUND:${claimId}`);
            } else if (claim.status !== 'verified') {
              issues.push(`V871_SOURCE_CLAIM_UNVERIFIED:${claimId}`);
            } else if (refObj.sourceBlockIds && refObj.sourceBlockIds.length > 0) {
              if (!refObj.sourceBlockIds.includes(claim.sourceBlockId)) {
                issues.push(`V871_CLAIM_BLOCK_MISMATCH:${claimId}`);
              }
            }
          }
        }
      }
    }
  } else {
    diagnostics.push('V871_PROVENANCE_REVIEW_REQUIRED');
  }

  // 3. Archetype compatibility
  const hasRationale = extension.archetype.rationale.trim().length > 0;
  const hasProvenance = extension.version === '1.1'
    ? (extension.archetype.sourceClaimIds.length > 0 || Boolean(extension.archetype.sourceBlockIds && extension.archetype.sourceBlockIds.length > 0))
    : extension.archetype.sourceClaimIds.length > 0;
  if (!hasRationale || !hasProvenance) {
    issues.push('V871_SEMANTIC_CONFLICT');
  } else if (extension.archetype.v871 === 'KNOWLEDGE_FORMATION') {
    if (lesson.archetype.type !== 'concept_formation' || extension.archetype.canonicalBase !== 'concept_formation' || extension.archetype.decision !== 'LOSSLESS') {
      issues.push('V871_SEMANTIC_CONFLICT');
    }
  } else if (extension.archetype.v871 === 'PRACTICE_REVIEW') {
    if (lesson.archetype.type !== extension.archetype.canonicalBase
      || (extension.archetype.canonicalBase !== 'practice' && extension.archetype.canonicalBase !== 'review_diagnostic')
      || extension.archetype.decision !== 'TEACHER_SELECTED') {
      issues.push('V871_SEMANTIC_CONFLICT');
    }
  } else {
    if (lesson.archetype.type !== extension.archetype.canonicalBase
      || extension.archetype.decision !== 'REVIEW_REQUIRED') {
      issues.push('V871_SEMANTIC_CONFLICT');
    } else {
      diagnostics.push('V871_MAPPING_REVIEW_REQUIRED');
    }
  }

  // 4. Reveal, Target, and Handoff compatibility
  for (const activity of lesson.timeline) {
    const rev = extension.reveal[activity.id];
    if (rev) {
      if (rev.v871Policy === 'TEACHER_MANUAL') {
        if (activity.revealPolicy !== 'teacher_manual' || rev.canonicalPolicy !== 'teacher_manual' || rev.decision !== 'LOSSLESS') {
          issues.push('V871_SEMANTIC_CONFLICT');
        }
      } else if (rev.v871Policy === 'NO_REVEAL') {
        if (activity.revealPolicy !== 'no_reveal' || rev.canonicalPolicy !== 'no_reveal' || rev.decision !== 'LOSSLESS') {
          issues.push('V871_SEMANTIC_CONFLICT');
        }
      } else if (rev.v871Policy === 'AUTO_AFTER_STATS' || rev.v871Policy === 'DISCUSSION_THEN_REVEAL') {
        if (rev.canonicalPolicy !== null || rev.decision !== 'REVIEW_REQUIRED') {
          issues.push('V871_SEMANTIC_CONFLICT');
        } else {
          diagnostics.push('V871_MAPPING_REVIEW_REQUIRED');
        }
      }
    }

    const meta = extension.activities[activity.id];
    if (meta) {
      if (meta.signature.attentionTarget === 'PHYSICAL_MODEL') {
        if (activity.threeWayOrchestration.primaryAttentionSurface !== 'teacher_demonstration') {
          issues.push('V871_SEMANTIC_CONFLICT');
        }
        diagnostics.push('V871_MAPPING_REVIEW_REQUIRED');
      } else {
        const mappedTarget = mapTarget(meta.signature.attentionTarget);
        if (mappedTarget !== activity.threeWayOrchestration.primaryAttentionSurface) {
          issues.push('V871_SEMANTIC_CONFLICT');
        }
      }

      if (meta.handoff.target === 'PHYSICAL_MODEL') {
        if (activity.threeWayOrchestration.primaryAttentionSurface !== 'teacher_demonstration') {
          issues.push('V871_SEMANTIC_CONFLICT');
        }
        diagnostics.push('V871_MAPPING_REVIEW_REQUIRED');
      } else {
        const mappedHandoff = mapTarget(meta.handoff.target);
        if (mappedHandoff !== activity.threeWayOrchestration.primaryAttentionSurface) {
          issues.push('V871_SEMANTIC_CONFLICT');
        }
      }

      if (meta.handoff.deviceState !== activity.student.state) {
        issues.push('V871_SEMANTIC_CONFLICT');
      }
    }
  }

  // 5. Protected roles derivation & timing
  const timelineIdSet = new Set(lesson.timeline.map(a => a.id));
  const recheckTargetIds = new Set<string>();
  for (const a of lesson.timeline) {
    const ref = (a.coach?.studentMirror as any)?.recheckRef;
    if (typeof ref === 'string' && timelineIdSet.has(ref)) {
      recheckTargetIds.add(ref);
    }
  }

  for (const activity of lesson.timeline) {
    const meta = extension.activities[activity.id];
    const phase = (activity.phase || '').trim().toLowerCase();
    const isPhaseExit = phase === 'exit' || phase === 'exit_ticket';
    const isPhaseReflection = phase === 'reflection' || phase === 'self_assessment';
    const isPhaseClosing = phase === 'closing';
    const isPhaseRecheck = phase === 'recheck';
    const isTimingProtected = (activity.timingPolicy as any)?.protected === true;
    const isRecheckReferenced = recheckTargetIds.has(activity.id);
    const metadataProtected = meta ? meta.protectedEvidence.length > 0 : false;
    const isProtected = isPhaseExit || isPhaseReflection || isPhaseClosing || isPhaseRecheck || isTimingProtected || isRecheckReferenced || metadataProtected;

    if (meta) {
      if (isProtected && meta.fastPath.cuttable === true) {
        issues.push(`V871_TIMING_INVALID:${activity.id}:protected_cuttable`);
      }
      if ((meta.fastPath.cuttable === false || isProtected) && meta.coreBudgetSec === 0) {
        issues.push(`V871_TIMING_INVALID:${activity.id}:mandatory_core_zero`);
      }
      if (!Number.isSafeInteger(activity.durationSec) || activity.durationSec < 0 || !Number.isSafeInteger(meta.coreBudgetSec) || meta.coreBudgetSec < 0 || !Number.isSafeInteger(meta.recoveryBudgetSec) || meta.recoveryBudgetSec < 0) {
        issues.push(`V871_TIMING_INVALID:${activity.id}:safe_int`);
      }
      if (meta.coreBudgetSec + meta.recoveryBudgetSec > activity.durationSec) {
        issues.push(`V871_TIMING_INVALID:${activity.id}:envelope_exceeded`);
      }
    }
  }

  // Timing totals
  if (!Number.isSafeInteger(lesson.lesson.runtimeMin) || lesson.lesson.runtimeMin <= 0) {
    issues.push('V871_TIMING_INVALID:runtimeMin');
  }
  const expectedSlot = lesson.lesson.runtimeMin * 60;
  const totalDuration = lesson.timeline.reduce((sum, a) => sum + a.durationSec, 0);
  const totalCore = lesson.timeline.reduce((sum, a) => sum + (extension!.activities[a.id]?.coreBudgetSec ?? 0), 0);
  const totalRecovery = lesson.timeline.reduce((sum, a) => sum + (extension!.activities[a.id]?.recoveryBudgetSec ?? 0), 0);

  if (totalDuration !== expectedSlot
    || totalDuration !== extension.timing.slotDurationSec
    || totalCore !== extension.timing.coreBudgetSec
    || totalRecovery !== extension.timing.reserveBudgetSec
    || totalCore + totalRecovery > extension.timing.slotDurationSec) {
    issues.push('V871_TIMING_INVALID:sum');
  }

  // 6. Visual Opportunity and Capability diagnostics
  if (extension.visualOpportunityAudit.decision === 'APPLICABLE' || extension.visualOpportunityAudit.decision === 'UNDETERMINED') {
    diagnostics.push('V871_VISUAL_REVIEW_REQUIRED');
  }
  if (extension.capabilities.collaboration.lessonDecision === 'APPLICABLE' || extension.capabilities.collaboration.lessonDecision === 'UNDETERMINED') {
    diagnostics.push('V871_CAPABILITY_REVIEW_REQUIRED');
  }
  if (extension.capabilities.peerReview.lessonDecision === 'APPLICABLE' || extension.capabilities.peerReview.lessonDecision === 'UNDETERMINED') {
    diagnostics.push('V871_CAPABILITY_REVIEW_REQUIRED');
  }

  // 7. Repetition & Monotony
  const sigTuple = (meta: V871ActivityMetadata) => `${meta.signature.participationMode}:${meta.signature.interactionPattern}:${meta.signature.responseMode}`;
  let currentTuple = '';
  let runLength = 0;

  for (let i = 0; i < lesson.timeline.length; i += 1) {
    const meta = extension.activities[lesson.timeline[i].id];
    if (!meta) continue;
    const t = sigTuple(meta);
    if (t === currentTuple) {
      runLength += 1;
    } else {
      currentTuple = t;
      runLength = 1;
    }

    if (runLength === 3) {
      warnings.push('EXPERIENCE_REPETITION');
    } else if (runLength >= 4) {
      let hasValidRationale = false;
      if (meta.repetitionRationale !== null && meta.repetitionRationale.text.trim().length > 0) {
        if (extension.version === '1.0') {
          hasValidRationale = meta.repetitionRationale.sourceClaimIds.length > 0
            && (!sourceModel || meta.repetitionRationale.sourceClaimIds.every(id => sourceModel.claims.some(c => c.id === id)));
        } else {
          const rep = extension.activities[lesson.timeline[i].id]?.repetitionRationale;
          if (rep) {
            const hasClaims = rep.sourceClaimIds.length > 0;
            const hasBlocks = Boolean(rep.sourceBlockIds && rep.sourceBlockIds.length > 0);
            if (hasClaims || hasBlocks) {
              const claimsValid = !hasClaims || !sourceModel
                || (validClaims && rep.sourceClaimIds.every(id => sourceModel.claims.some(c => c.id === id)));
              const blocksValid = !hasBlocks || !sourceModel || sourceModel.blocks === undefined
                || (validBlocks && rep.sourceBlockIds!.every(id => sourceModel.blocks!.some(b => b.id === id)));
              hasValidRationale = claimsValid && blocksValid;
            }
          }
        }
      }

      if (hasValidRationale) {
        warnings.push('EXPERIENCE_REPETITION');
      } else {
        issues.push('EXPERIENCE_MONOTONY');
      }
    }
  }

  const dedupedIssues = [...new Set(issues)];
  const dedupedDiagnostics = [...new Set(diagnostics)];
  const dedupedWarnings = [...new Set(warnings)];

  if (dedupedIssues.length > 0) {
    return { status: 'BLOCKED', issues: dedupedIssues, diagnostics: dedupedDiagnostics, warnings: dedupedWarnings };
  }
  if (dedupedDiagnostics.length > 0) {
    return { status: 'REVIEW_REQUIRED', issues: [], diagnostics: dedupedDiagnostics, warnings: dedupedWarnings };
  }
  return { status: 'STRUCTURALLY_VALID', issues: [], diagnostics: [], warnings: dedupedWarnings };
};
