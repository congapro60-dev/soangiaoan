const fail = code => { throw new Error(code); };
const phases = new Set(['experience', 'formation', 'guided', 'practice', 'recheck', 'exit', 'reflection']);
const participations = new Set(['whole_class', 'individual', 'pair', 'group']);
const taskTypes = new Set(['closed', 'open', 'reflection']);
const branches = new Set(['shared', 'support', 'core', 'extension']);
const allowedKeys = new Set(['format', 'essentialQuestion', 'objectives', 'activities', 'uncertainties']);
const citationKeys = new Set(['segmentId', 'quote', 'origin']);
function sectionMetadata(value) {
  if (value === undefined) return {};
  if (typeof value !== 'string' || !value.trim() || value.length > 256) fail('INVALID_PROPOSAL');
  return {metadata:{scopeSectionId:value}};
}
const phaseAliases = new Map([['khởi động','experience'],['hình thành kiến thức','formation'],['luyện tập','practice'],['vận dụng và recheck','recheck'],['vận dụng','practice'],['exit ticket','exit'],['củng cố','recheck']]);
const participationAliases = new Map([['toàn lớp','whole_class'],['cá nhân','individual'],['nhóm','group'],['theo nhóm','group'],['cặp','pair'],['đôi','pair']]);

function citation(value, fallback) {
  const item = value || fallback;
  if (!item || typeof item !== 'object' || Object.keys(item).some(key => !citationKeys.has(key)) || typeof item.segmentId !== 'string' || typeof item.quote !== 'string' || !item.quote.trim() || !['source', 'adapted', 'generated'].includes(item.origin)) fail('INVALID_PROPOSAL');
  return { segmentId: item.segmentId, quote: item.quote, origin: item.origin };
}

export function assembleLessonOutline(input, { slotMinutes, subject, grade } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !allowedKeys.has(key)) || input.format !== 'lesson-outline-v1') fail('INVALID_PROPOSAL');
  if (!Number.isInteger(slotMinutes) || slotMinutes < 1 || slotMinutes > 240 || typeof subject !== 'string' || !Number.isInteger(grade)) fail('INVALID_PROPOSAL');
  if (!Array.isArray(input.objectives) || input.objectives.length < 1 || !Array.isArray(input.activities) || input.activities.length < 1) fail('INVALID_PROPOSAL');
  const objectives = input.objectives.map((item, index) => {
    if (!item || typeof item !== 'object' || typeof item.statement !== 'string' || !item.statement.trim()) fail('INVALID_PROPOSAL');
    if (Object.keys(item).some(key => !['statement','source','code','level','prerequisiteIndexes','requiresFiniteInfiniteDistinction','requiresRepresentations','scopeSectionId'].includes(key))) fail('INVALID_PROPOSAL');
    const sourceCodes = [...new Set(citation(item.source).quote.match(/\bT(?:10|11|12)\.\d+(?!\w|\.\d)/g) || [])];
    return { id: 'obj-' + (index + 1), code: sourceCodes.length === 1 ? sourceCodes[0] : item.code || 'LO' + (index + 1), level: item.level || 'must', statement: item.statement, prerequisiteIds: [], ...sectionMetadata(item.scopeSectionId), ...(item.requiresFiniteInfiniteDistinction !== undefined ? { requiresFiniteInfiniteDistinction: item.requiresFiniteInfiniteDistinction } : {}), ...(item.requiresRepresentations !== undefined ? { requiresRepresentations: item.requiresRepresentations } : {}) };
  });
  const citations = [];
  input.objectives.forEach((item, index) => {
    if ((item.prerequisiteIndexes || []).some(reference => !Number.isInteger(reference) || reference < 0 || reference >= objectives.length)) fail('INVALID_PROPOSAL');
    objectives[index].prerequisiteIds = (item.prerequisiteIndexes || []).map(reference => objectives[reference].id);
    if (objectives[index].prerequisiteIds.some(id => !id)) fail('INVALID_PROPOSAL');
    citations.push({ entityId: objectives[index].id, ...citation(item.source) });
  });
  const tasks = [], hints = [], evidenceRules = [], activities = [];
  input.activities.forEach((activity, activityIndex) => {
    if (!activity || typeof activity !== 'object' || !Number.isInteger(activity.minutes) || activity.minutes < 1 || !Array.isArray(activity.tasks) || activity.tasks.length < 1) fail('INVALID_PROPOSAL');
    const phase = phases.has(activity.phase) ? activity.phase : phaseAliases.get(String(activity.phase || '').normalize('NFC').toLowerCase());
    const participation = participations.has(activity.participation) ? activity.participation : participationAliases.get(String(activity.participation || '').normalize('NFC').toLowerCase());
    if (!phase || !participation) fail('INVALID_PROPOSAL');
    if (Object.keys(activity).some(key => !['phase','minutes','participation','objectiveIndexes','studentAction','expectedProduct','teacherLookFor','source','tasks','transition','budgetRole'].includes(key))) fail('INVALID_PROPOSAL');
    if (!Array.isArray(activity.objectiveIndexes) || !activity.objectiveIndexes.length || activity.objectiveIndexes.some(index => !Number.isInteger(index) || !objectives[index])) fail('INVALID_PROPOSAL');
    const activityObjectives = activity.objectiveIndexes.map(index => objectives[index].id);
    const activityId = 'act-' + (activityIndex + 1);
    const taskIds = [], evidenceIds = [], hintIds = [];
    activity.tasks.forEach((task, taskIndex) => {
      if (!task || typeof task !== 'object' || !taskTypes.has(task.type) || typeof task.prompt !== 'string' || !task.prompt.trim() || !Number.isInteger(task.minutes) || task.minutes < 1 || !task.evaluation || typeof task.evaluation !== 'object' || !Array.isArray(task.hints) || task.hints.some(value => typeof value !== 'string')) fail('INVALID_PROPOSAL');
      const taskId = 'task-' + (activityIndex + 1) + '-' + (taskIndex + 1);
      const evidenceId = 'ev-' + (activityIndex + 1) + '-' + (taskIndex + 1);
      if (Object.keys(task).some(key => !['type','prompt','minutes','evaluation','hints','source','inputSchema','objectiveIndexes','branch','participation','isCore','requiresFullScaffold','supportRationale','sequenceType','sequenceTypes','representation','representations','expectedProduct','scopeSectionId'].includes(key))) fail('INVALID_PROPOSAL');
      const objectiveIds = task.objectiveIndexes ? task.objectiveIndexes.map(index => objectives[index]?.id) : activityObjectives;
      if (objectiveIds.some(id => !id || !activityObjectives.includes(id))) fail('INVALID_PROPOSAL');
      if (task.hints.length > 4) fail('INVALID_PROPOSAL');
      const taskParticipation = task.participation || participation;
      const branch = task.branch || 'shared';
      if (!branches.has(branch) || (task.isCore === true && ['support', 'extension'].includes(branch))) fail('INVALID_PROPOSAL');
      const budgetRole = activity.budgetRole || (phase === 'reflection' ? 'reserve' : 'core');
      const taskHintIds = [];
      const source = citation(task.source);
      const rationale = task.supportRationale || objectiveIds.map(id => objectives.find(obj => obj.id === id).statement).join('; ');
      const evaluation = structuredClone(task.evaluation);
      if (evaluation.type && !evaluation.checkerId) evaluation.checkerId = evaluation.type;
      if (task.inputSchema?.options && !evaluation.options && ['choice_exact','multi_choice_exact'].includes(evaluation.checkerId)) evaluation.options = task.inputSchema.options.map(option => option.id);
      task.hints.forEach((text, hintIndex) => {
        const hintId = 'hint-' + (activityIndex + 1) + '-' + (taskIndex + 1) + '-' + (hintIndex + 1);
        hints.push({ id: hintId, tier: 'H' + (hintIndex + 1), text, taskId, objectiveIds, order: hintIndex + 1, notAnswer: true, penalty: { time: 0, score: 0, freeze: 0 }, supportRationale: rationale });
        taskHintIds.push(hintId); hintIds.push(hintId);
        citations.push({ entityId: hintId, ...source });
      });
      const metadata = Object.fromEntries(['sequenceType','sequenceTypes','representation','representations','expectedProduct'].filter(key => task[key] !== undefined).map(key => [key, structuredClone(task[key])]));
      tasks.push({ ...metadata, ...sectionMetadata(task.scopeSectionId), ...(task.inputSchema ? { inputSchema: structuredClone(task.inputSchema) } : {}), id: taskId, type: task.type, objectiveIds, activityId, participation: taskParticipation, prompt: task.prompt, sourceRefs: [], evidenceIds: [evidenceId], hintIds: taskHintIds, minutes: task.minutes, isCore: task.isCore ?? (budgetRole === 'core' && !['support','extension'].includes(branch)), requiresFullScaffold: task.requiresFullScaffold ?? task.hints.length === 4, branch, supportRationale: rationale, evaluation });
      const individual = taskParticipation === 'individual';
      const kind = task.type === 'reflection' || phase === 'reflection' ? 'self_assessment' : phase === 'experience' || phase === 'guided' ? 'precheck' : phase === 'recheck' ? 'individual_recheck' : phase === 'exit' ? 'exit' : !individual ? 'group_product' : 'practice';
      evidenceRules.push({ id: evidenceId, kind, objectiveIds, taskId, individual, countsForMastery: individual && !['support','extension'].includes(branch) && ['individual_recheck','exit'].includes(kind) });
      taskIds.push(taskId); evidenceIds.push(evidenceId);
      citations.push({ entityId: taskId, ...source }, { entityId: evidenceId, ...source, origin: 'generated' });
    });
    activities.push({ id: activityId, phase, budgetRole: activity.budgetRole || (phase === 'reflection' ? 'reserve' : 'core'), minutes: activity.minutes, objectiveIds: activityObjectives, taskIds, participation, studentAction: activity.studentAction || '', expectedProduct: activity.expectedProduct || '', evidenceIds, supportIds: hintIds, teacherLookFor: activity.teacherLookFor || '', transition: activity.transition || '' });
    citations.push({ entityId: activityId, ...citation(activity.source) });
  });
  return {
    package: {
      schemaVersion: '1.0.0', id: 'ai-outline-draft', version: '1.0.0', status: 'needs_review', subject, grade, curriculumRefs: [], sourceRefs: [], essentialQuestion: input.essentialQuestion || objectives[0].statement, prerequisites: [], objectives,
      budget: { slotMinutes, coreMinutes: activities.filter(a => a.budgetRole === 'core').reduce((sum, a) => sum + a.minutes, 0), reserveMinutes: activities.filter(a => a.budgetRole === 'reserve').reduce((sum, a) => sum + a.minutes, 0), optionalMinutes: activities.filter(a => a.budgetRole === 'optional').reduce((sum, a) => sum + a.minutes, 0), transitionMinutes: 0 },
      activities, tasks, hints, evidenceRules, rubric: { criteria: [], lookFor: [] }, modePolicies: {}, masteryPolicy: { individualEvidencePerObjectiveMin: 2, masterySources: ['individual_recheck', 'exit'], forbiddenSources: ['group_product', 'map_position', 'race_position', 'group_score'] }
    },
    citations,
    uncertainties: Array.isArray(input.uncertainties) ? input.uncertainties : []
  };
}
