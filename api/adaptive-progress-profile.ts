const getAverageMasteryFromAttempts = (attempts: any[]) => {
  const scores = attempts.flatMap(attempt => (
    Array.isArray(attempt?.objectiveScores)
      ? attempt.objectiveScores.map((score: any) => Number(score?.masteryEstimate)).filter(Number.isFinite)
      : []
  ));

  if (scores.length === 0) return 0;
  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2));
};

export const mergeProfileWithExisting = ({ existingProfile, incomingProfile, progressRecord }: {
  existingProfile: any | null;
  incomingProfile: any;
  progressRecord: any;
}) => {
  if (!existingProfile) return incomingProfile;

  const diagnosticAttempt = progressRecord?.diagnosticAttempt;
  const quickCheckAttempts = Array.isArray(progressRecord?.quickCheckAttempts) ? progressRecord.quickCheckAttempts : [];
  const attempts = [diagnosticAttempt, ...quickCheckAttempts].filter(Boolean);
  const sessionMastery = getAverageMasteryFromAttempts(attempts);
  const previousSessions = Number(existingProfile.totalSessions || 0);
  const totalSessions = previousSessions + 1;
  const previousAverage = Number(existingProfile.averageMastery || 0);
  const averageMastery = Number((((previousAverage * previousSessions) + sessionMastery) / Math.max(totalSessions, 1)).toFixed(2));

  const currentMemory = Array.isArray(existingProfile.objectiveMemory) ? existingProfile.objectiveMemory : [];
  const incomingMemory = Array.isArray(incomingProfile.objectiveMemory) ? incomingProfile.objectiveMemory : [];
  const objectiveMemory = incomingMemory.length === 0 ? currentMemory : incomingMemory.map((incoming: any) => {
    const previous = currentMemory.find((item: any) => item?.objectiveId === incoming?.objectiveId);
    return {
      ...previous,
      ...incoming,
      attempts: Number(previous?.attempts || 0) + Math.max(Number(incoming?.attempts || 0), 1),
      lastUpdatedAt: incoming?.lastUpdatedAt || new Date().toISOString(),
    };
  });

  const misconceptionCounts = { ...(existingProfile.misconceptionCounts || {}) };
  Object.entries(incomingProfile.misconceptionCounts || {}).forEach(([key, value]) => {
    misconceptionCounts[key] = Number(misconceptionCounts[key] || 0) + Number(value || 0);
  });

  return {
    ...existingProfile,
    ...incomingProfile,
    totalSessions,
    averageMastery,
    routeHistory: [...(existingProfile.routeHistory || []), incomingProfile.routeHistory?.at?.(-1) || progressRecord.route].filter(Boolean).slice(-20),
    objectiveMemory,
    misconceptionCounts,
    createdAt: existingProfile.createdAt || incomingProfile.createdAt || new Date().toISOString(),
    updatedAt: incomingProfile.updatedAt || new Date().toISOString(),
  };
};
