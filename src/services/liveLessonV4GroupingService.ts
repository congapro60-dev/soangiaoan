import { buildEvidenceVectors, deduplicateResponses, type StudentEvidence } from '../lib/liveLesson/v4/evidence';
import { proposeGroups, type GroupProposal } from '../lib/liveLesson/v4/grouping';
import type { EvidenceRule, GroupingCheckpoint } from '../lib/liveLesson/v4/types';
import type { LiveResponse } from '../lib/liveLesson/types';

export interface GroupingServiceInput {
  responses: LiveResponse[];
  evidenceRules: EvidenceRule[];
  checkpoints: GroupingCheckpoint[];
  existingRoles?: Map<string, string>;
  now: number;
}

export interface GroupingServiceOutput {
  evidence: StudentEvidence[];
  proposals: Array<GroupProposal & { checkpointId: string }>;
}

export function buildGroupingProposals(input: GroupingServiceInput): GroupingServiceOutput {
  const { evidenceRules, checkpoints, existingRoles, now } = input;
  const responses = deduplicateResponses(input.responses);

  const evidence = buildEvidenceVectors({ responses, evidenceRules, now });

  const proposals: GroupingServiceOutput['proposals'] = [];

  for (const checkpoint of checkpoints) {
    const stepResponses = evidence.filter(e =>
      e.vector.points.some(p => p.sourceStepId === checkpoint.stepId),
    );

    const relevantEvidence = stepResponses.length > 0 ? stepResponses : evidence;

    const groupProposals = proposeGroups({
      checkpoint,
      students: relevantEvidence,
      existingRoles,
    });

    for (const proposal of groupProposals) {
      proposals.push({ ...proposal, checkpointId: checkpoint.id });
    }
  }

  return { evidence, proposals };
}
