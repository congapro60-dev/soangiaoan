import type { KnowledgeUnit, LearningObjective } from './types';

export interface ObjectiveCoverage {
  total: number;
  covered: number;
  uncoveredObjectiveIds: string[];
  ratio: number;
}

const isLanguageObjective = (objective: LearningObjective): boolean => {
  if (objective.kind === 'language') return true;
  if (objective.kind === 'math') return false;
  // Backward compatibility for V4 drafts saved before `kind` was persisted.
  return /^L(?:ANG(?:UAGE)?)?[-_\s]?\d+$/i.test(objective.code.trim());
};

export const getObjectiveCoverage = (
  objectives: LearningObjective[],
  knowledgeUnits: KnowledgeUnit[],
): ObjectiveCoverage => {
  const contentObjectiveIds = [...new Set(
    objectives
      .filter(objective => !isLanguageObjective(objective))
      .map(objective => objective.id.trim())
      .filter(Boolean),
  )];
  const coveredObjectiveIds = new Set(
    knowledgeUnits.flatMap(unit => unit.objectiveIds).map(objectiveId => objectiveId.trim()).filter(Boolean),
  );
  const uncoveredObjectiveIds = contentObjectiveIds.filter(objectiveId => !coveredObjectiveIds.has(objectiveId));
  const covered = contentObjectiveIds.length - uncoveredObjectiveIds.length;

  return {
    total: contentObjectiveIds.length,
    covered,
    uncoveredObjectiveIds,
    ratio: contentObjectiveIds.length > 0 ? covered / contentObjectiveIds.length : 1,
  };
};
