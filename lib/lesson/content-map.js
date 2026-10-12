import { hashPackage } from './schema.js';
import { validateLessonPackage } from './validate.js';
import pilot from '../../content/lessons/g11-sequences-p1.json' with { type: 'json' };

export const GENERATION_SCOPE = 'lesson-generation-scope-v1';
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const ids = value => Array.isArray(value) && value.length > 0 && Array.from(value).every(id => typeof id === 'string' && id.trim()) && new Set(value).size === value.length;
const issue = (code, path, message, extra = {}) => ({ code, path, message, ...extra });
const failure = (field, issues) => ({ ok: false, [field]: null, issues });

// Only call with the server-owned catalogue; request data selects IDs, never supplies curriculum claims.
export function createGenerationScope(catalogue, request) {
  if (object(request) && Object.hasOwn(request, 'selections')) {
    if (Object.keys(request).length !== 1 || !Array.isArray(request.selections) || request.selections.length < 2 || request.selections.length > 12 || !ids(request.selections.map(item => item?.lessonId))) return failure('scope', [issue('INVALID_SCOPE', 'selections', 'Choose two to twelve distinct lessons.')]);
    const resolved = request.selections.map(selection => createGenerationScope(catalogue, selection));
    const errors = resolved.flatMap(result => result.issues);
    if (errors.length) return failure('scope', errors);
    const scopes = catalogue.lessons.flatMap(lesson => resolved.filter(result => result.scope.lessonId === lesson.id).map(result => result.scope));
    const sections = scopes.flatMap(scope => scope.sections.map(section => ({ ...section, lessonId: scope.lessonId, lessonTitle: scope.title, scopeSectionId: scope.lessonId + '/' + section.id })));
    const sourceIds = new Set(scopes.flatMap(scope => scope.sources.map(source => source.id)));
    return { ok: true, issues: [], scope: {
      format: 'lesson-generation-scope-v2', catalogueId: catalogue.id, title: 'Ôn tập: ' + scopes.map(scope => scope.title).join('; '),
      subject: catalogue.subject, grade: catalogue.grade, lessonIds: scopes.map(scope => scope.lessonId),
      sectionIds: sections.map(section => section.scopeSectionId), sections, objectiveCodes: [...new Set(scopes.flatMap(scope => scope.objectiveCodes))],
      sources: structuredClone(catalogue.sources.filter(source => sourceIds.has(source.id))),
      requiresTeacherReview: true, curriculumVerification: 'teacher_review_required',
      uncertainties: [...new Set(scopes.flatMap(scope => scope.uncertainties))]
    } };
  }
  if (!object(catalogue) || catalogue.schemaVersion !== '1.0.0' || !Array.isArray(catalogue.lessons) || !Array.isArray(catalogue.sources) || !object(request) || Object.keys(request).some(key => !['lessonId', 'sectionIds'].includes(key)) || typeof request.lessonId !== 'string' || !ids(request.sectionIds)) return failure('scope', [issue('INVALID_SCOPE', '', 'Choose a lesson and unique section IDs.')]);
  const lesson = catalogue.lessons.find(item => item.id === request.lessonId);
  if (!lesson || !Array.isArray(lesson.sections)) return failure('scope', [issue('UNKNOWN_SCOPE', 'sectionIds', 'A lesson or section is not in the catalogue.')]);
  const nodes = lesson.sections.flatMap(section => [section, ...(section.knowledge || []).map(knowledge => ({ ...knowledge, sourceTitle: section.title, locator: section.locator + '/knowledge/' + knowledge.id, sourceRows: section.sourceRows }))]);
  if (request.sectionIds.some(id => !nodes.some(section => section.id === id))) return failure('scope', [issue('UNKNOWN_SCOPE', 'sectionIds', 'A lesson or section is not in the catalogue.')]);
  const sections = nodes.filter(section => request.sectionIds.includes(section.id)).map(({ id, title, sourceTitle, locator, sourceRows, objectiveCodes }) => ({ id, title, ...(sourceTitle ? { sourceTitle } : {}), locator, sourceRows: [...sourceRows], objectiveCodes: [...objectiveCodes] }));
  const objectiveCodes = [...new Set(sections.flatMap(section => section.objectiveCodes))];
  return { ok: true, issues: [], scope: {
    format: GENERATION_SCOPE, catalogueId: catalogue.id, lessonId: lesson.id, title: lesson.title,
    subject: catalogue.subject, grade: catalogue.grade, sectionIds: sections.map(section => section.id), sections, objectiveCodes,
    sources: structuredClone(catalogue.sources.filter(source => lesson.sourceIds.includes(source.id))),
    requiresTeacherReview: true, curriculumVerification: 'teacher_review_required',
    uncertainties: [...new Set([...(catalogue.uncertainties || []), ...(sections.some(section => !section.objectiveCodes.length) ? ['OBJECTIVES_UNKNOWN'] : [])])]
  } };
}

// Multi-source revision authors a new draft; it never concatenates complete lessons or cuts checks to fit time.
export function validateMultiGenerationScope(scope, pkg) {
  if (scope?.format !== 'lesson-generation-scope-v2') return [];
  const errors = [], sections = scope.sections, objectives = pkg.objectives || [], tasks = pkg.tasks || [];
  const mismatch = path => errors.push(issue('ERR_PROPOSAL_SCOPE_MISMATCH', path, 'Each selected source section needs only its own objectives, tasks, independent recheck and exit.'));
  for (const objective of objectives) if (!sections.some(section => section.scopeSectionId === objective.metadata?.scopeSectionId)) mismatch('objectives.' + objective.id);
  for (const task of tasks) {
    const sectionId = task.metadata?.scopeSectionId;
    if (!sections.some(section => section.scopeSectionId === sectionId) || task.objectiveIds.some(id => objectives.find(objective => objective.id === id)?.metadata?.scopeSectionId !== sectionId)) mismatch('tasks.' + task.id);
  }
  for (const section of sections) {
    const own = objectives.filter(objective => objective.metadata?.scopeSectionId === section.scopeSectionId), codes = own.map(objective => objective.code);
    if (!own.length || section.objectiveCodes.length && (codes.length !== section.objectiveCodes.length || section.objectiveCodes.some(code => !codes.includes(code))) || !section.objectiveCodes.length && codes.some(code => /^T(?:10|11|12)\.\d+$/.test(code || ''))) mismatch('sections.' + section.scopeSectionId);
    for (const objective of own) for (const kind of ['individual_recheck','exit']) {
      const covered = (pkg.evidenceRules || []).some(rule => rule.kind === kind && rule.individual && rule.countsForMastery && rule.objectiveIds.includes(objective.id) && tasks.some(task => task.id === rule.taskId && task.metadata?.scopeSectionId === section.scopeSectionId && task.participation === 'individual' && (!task.branch || ['shared','core'].includes(task.branch)) && pkg.activities.some(activity => activity.id === task.activityId && activity.budgetRole === 'core' && activity.phase === (kind === 'exit' ? 'exit' : 'recheck'))));
      if (!covered) mismatch('objectives.' + objective.id + '.' + kind);
    }
  }
  return errors;
}

export function selectLessonScope(input, request = {}) {
  if (!object(request) || Object.keys(request).some(key => !['objectiveIds', 'activityIds'].includes(key)) || ['objectiveIds', 'activityIds'].some(key => request[key] !== undefined && !ids(request[key]))) return failure('package', [issue('INVALID_SCOPE', '', 'Use nonempty, unique objective/activity IDs only.')]);
  let pkg, validation;
  try { pkg = structuredClone(input); validation = validateLessonPackage(pkg); }
  catch { return failure('package', [issue('INVALID_PACKAGE', '', 'The source package is not valid JSON lesson data.')]); }
  if (!validation.ok) return failure('package', validation.errors);
  if (['prerequisites', 'curriculumRefs'].some(key => !Array.isArray(pkg[key]) || pkg[key].some(value => typeof value !== 'string'))) return failure('package', [issue('INVALID_PACKAGE', '', 'Prerequisites and curriculum references must be arrays of strings.')]);
  if (!pkg.objectives.length) return failure('package', [issue('EMPTY_SCOPE', 'objectives', 'Select at least one objective.')]);
  const selected = new Set(request.objectiveIds || pkg.objectives.map(item => item.id));
  const activities = new Set(request.activityIds || pkg.activities.map(item => item.id));
  if ([...selected].some(id => !pkg.objectives.some(item => item.id === id)) || [...activities].some(id => !pkg.activities.some(item => item.id === id))) return failure('package', [issue('UNKNOWN_SCOPE', '', 'An objective or activity is not in the source package.')]);
  const intersects = item => item.objectiveIds.some(id => selected.has(id));
  const subset = item => item.objectiveIds.every(id => selected.has(id));
  const issues = pkg.tasks.filter(task => activities.has(task.activityId) && intersects(task) && !subset(task)).map(task => issue('SCOPE_MIXED_OBJECTIVES', 'tasks.' + task.id, 'This task also assesses unselected objectives; author a scoped variant first.', { taskId: task.id, objectiveIds: [...task.objectiveIds] }));
  const objectives = pkg.objectives.filter(item => selected.has(item.id));
  for (const objective of objectives) for (const id of objective.prerequisiteIds || []) if (!selected.has(id)) issues.push(issue('SCOPE_PREREQUISITE_REQUIRED', 'objectives.' + objective.id, 'Select the prerequisite or author a scope with reviewed prerequisites.', { objectiveId: objective.id, prerequisiteId: id }));
  if (issues.length) return failure('package', issues);
  const partial = selected.size !== pkg.objectives.length || activities.size !== pkg.activities.length;
  pkg.status = 'draft';
  if (partial) {
    // ponytail: free-text prerequisites have no scope links; add reviewed mappings before trimming them.
    if (pkg.prerequisites.length) issues.push(issue('SCOPE_PREREQUISITES_REVIEW_REQUIRED', 'prerequisites', 'Review free-text prerequisites before authoring a partial variant.'));
    pkg.objectives = objectives;
    pkg.tasks = pkg.tasks.filter(task => activities.has(task.activityId) && intersects(task) && subset(task));
    const taskIds = new Set(pkg.tasks.map(task => task.id));
    pkg.hints = pkg.hints.filter(hint => taskIds.has(hint.taskId));
    pkg.evidenceRules = pkg.evidenceRules.filter(evidence => taskIds.has(evidence.taskId));
    pkg.activities = pkg.activities.filter(activity => activities.has(activity.id) && pkg.tasks.some(task => task.activityId === activity.id)).map(activity => {
      const tasks = pkg.tasks.filter(task => task.activityId === activity.id);
      if (!subset(activity)) issues.push(issue('SCOPE_MIXED_ACTIVITY', 'activities.' + activity.id, 'Activity instructions cover unselected objectives; author a scoped variant first.'));
      return { ...activity, taskIds: tasks.map(task => task.id), objectiveIds: activity.objectiveIds.filter(id => selected.has(id)),
        evidenceIds: pkg.evidenceRules.filter(evidence => tasks.some(task => task.id === evidence.taskId)).map(evidence => evidence.id),
        supportIds: pkg.hints.filter(hint => tasks.some(task => task.id === hint.taskId)).map(hint => hint.id) };
    });
    const sourceIds = new Set(pkg.tasks.flatMap(task => task.sourceRefs || []));
    pkg.sourceRefs = pkg.sourceRefs.filter(source => sourceIds.has(source.id));
    pkg.curriculumRefs = pkg.curriculumRefs.filter(code => objectives.some(objective => objective.code === code));
    pkg.essentialQuestion = objectives.map(objective => objective.statement).join('; ');
    pkg.prerequisites = [];
    pkg.rubric = { criteria: objectives.map(objective => objective.statement), lookFor: objectives.map(objective => objective.statement) };
    for (const role of ['core', 'reserve', 'optional']) pkg.budget[role + 'Minutes'] = pkg.activities.filter(activity => activity.budgetRole === role).reduce((total, activity) => total + activity.minutes, 0);
    pkg.budget.slotMinutes = pkg.budget.coreMinutes + pkg.budget.reserveMinutes + pkg.budget.optionalMinutes + pkg.budget.transitionMinutes;
  }
  for (const phase of ['recheck', 'exit']) if (!pkg.activities.some(activity => activity.phase === phase && activity.participation === 'individual')) issues.push(issue('SCOPE_PHASE_REQUIRED', 'activities', 'The scope requires an individual ' + phase + '.'));
  if (!pkg.activities.some(activity => ['formation', 'practice'].includes(activity.phase))) issues.push(issue('SCOPE_PHASE_REQUIRED', 'activities', 'The scope requires formation or practice.'));
  if (!pkg.activities.some(activity => ['experience', 'guided'].includes(activity.phase))) issues.push(issue('SCOPE_PHASE_REQUIRED', 'activities', 'The scope requires an entry or precheck activity.'));
  for (const objective of pkg.objectives) for (const phase of ['recheck', 'exit']) {
    const found = pkg.evidenceRules.some(evidence => evidence.objectiveIds.includes(objective.id) && evidence.individual && evidence.countsForMastery && (phase === 'exit' ? evidence.kind === 'exit' : ['individual_recheck', 'independent_recheck'].includes(evidence.kind)) && pkg.tasks.some(task => task.id === evidence.taskId && task.participation === 'individual' && pkg.activities.some(activity => activity.id === task.activityId && activity.phase === phase)));
    if (!found) issues.push(issue('SCOPE_OBJECTIVE_CHECK_REQUIRED', 'objectives.' + objective.id, 'This objective requires its own independent ' + phase + ' evidence.', { objectiveId: objective.id }));
  }
  pkg.contentHash = hashPackage(pkg);
  validation = validateLessonPackage(pkg);
  issues.push(...validation.errors);
  return issues.length ? failure('package', issues) : { ok: true, package: pkg, issues: [] };
}

// Explicitly authored variants of the reviewed pilot; generic mixed tasks still fail closed above.
export function createPilotLessonScope(input, request) {
  const sourceHash = pilot.contentHash;
  let sourceMatches = false;
  try {
    if (object(input) && validateLessonPackage(input).ok) {
      const source = { ...input, status: pilot.status, version: pilot.version, sourceRefs: input.sourceRefs.map(ref => ({ ...ref, verification: pilot.sourceRefs.find(original => original.id === ref.id)?.verification })) };
      sourceMatches = input.id === pilot.id && hashPackage(source) === sourceHash;
    }
  } catch { /* A malformed source has no authored variant. */ }
  if (!sourceMatches || !object(request) || Object.keys(request).some(key => key !== 'objectiveIds') || !ids(request.objectiveIds) || request.objectiveIds.length !== 1 || !['obj-t11-18', 'obj-t11-19'].includes(request.objectiveIds[0])) return failure('package', [issue('SCOPE_VARIANT_NOT_AUTHORED', '', 'No reviewed source variant is available for this selection.')]);
  const objectiveId = request.objectiveIds[0], index = objectiveId === 'obj-t11-18' ? 0 : 1;
  const pkg = structuredClone(input), objective = pkg.objectives.find(item => item.id === objectiveId);
  const originalExit = input.tasks.find(task => task.id === 'task-exit-ticket');
  const exit = { ...structuredClone(originalExit), id: 'task-exit-scope-' + (index ? '19' : '18'), objectiveIds: [objectiveId],
    prompt: index ? 'Phiếu Exit Ticket: Nêu một cách cho dãy số mà em nắm vững nhất kèm ví dụ minh họa và kiểm chứng.' : 'Phiếu Exit Ticket: Nêu sự khác biệt giữa chỉ số $n$ và số hạng $u_n$.',
    evaluation: { rubric: { criteria: [originalExit.evaluation.rubric.criteria[index]], lookFor: [originalExit.evaluation.rubric.lookFor[index]] } },
    hintIds: [], evidenceIds: ['ev-exit-scope-' + index],
    metadata: { sourceCitation: { segmentId: originalExit.id, quote: originalExit.prompt, origin: 'adapted' }, numericReviewRequired: false, sourcePackageHash: sourceHash } };
  pkg.id += '-scope-' + (index ? '19' : '18'); pkg.version = '1.0.0'; pkg.status = 'needs_review';
  pkg.objectives = [{ ...objective, prerequisiteIds: [] }];
  pkg.tasks = pkg.tasks.filter(task => task.objectiveIds.length === 1 && task.objectiveIds[0] === objectiveId).concat(exit);
  const taskIds = new Set(pkg.tasks.map(task => task.id));
  pkg.hints = pkg.hints.filter(hint => taskIds.has(hint.taskId));
  const exitHint = structuredClone(input.hints.find(hint => hint.id === (index ? 'hint-exit-1' : 'hint-form18-1')));
  exitHint.id = 'hint-exit-scope-' + index; exitHint.taskId = exit.id; exitHint.objectiveIds = [objectiveId];
  pkg.hints.push(exitHint);
  pkg.evidenceRules = pkg.evidenceRules.filter(evidence => taskIds.has(evidence.taskId));
  pkg.evidenceRules.push({ id: exit.evidenceIds[0], taskId: exit.id, objectiveIds: [objectiveId], kind: 'exit', individual: true, countsForMastery: true });
  for (const task of pkg.tasks) {
    task.hintIds = pkg.hints.filter(hint => hint.taskId === task.id).map(hint => hint.id);
    task.evidenceIds = pkg.evidenceRules.filter(evidence => evidence.taskId === task.id).map(evidence => evidence.id);
    if (task.id !== exit.id) task.metadata = { ...task.metadata, sourceCitation: { segmentId: task.id, quote: input.tasks.find(item => item.id === task.id).prompt, origin: 'adapted' }, numericReviewRequired: true, sourcePackageHash: sourceHash };
  }
  pkg.activities = pkg.activities.filter(activity => pkg.tasks.some(task => task.activityId === activity.id)).map(activity => {
    const tasks = pkg.tasks.filter(task => task.activityId === activity.id);
    const shared = tasks.filter(task => !task.branch || task.branch === 'shared').reduce((sum, task) => sum + task.minutes, 0);
    const alternative = Math.max(0, ...['support', 'core', 'extension'].map(branch => tasks.filter(task => task.branch === branch).reduce((sum, task) => sum + task.minutes, 0)));
    return { ...activity, minutes: shared + alternative, objectiveIds: [objectiveId], taskIds: tasks.map(task => task.id), evidenceIds: tasks.flatMap(task => task.evidenceIds), supportIds: tasks.flatMap(task => task.hintIds), studentAction: objective.statement, expectedProduct: 'Bài làm thể hiện mục tiêu đã chọn.', teacherLookFor: objective.statement, transition: 'Tiếp tục phần bài đã chọn.' };
  });
  pkg.prerequisites = index ? [...pkg.prerequisites, 'Kiến thức đã học trước: ' + input.objectives[0].statement] : pkg.prerequisites;
  pkg.curriculumRefs = [objective.code]; pkg.essentialQuestion = objective.statement;
  pkg.rubric = { criteria: [objective.statement], lookFor: [objective.statement] };
  pkg.sourceRefs = pkg.sourceRefs.map(source => ({ ...source, verification: 'teacher_review_required' }));
  for (const role of ['core', 'reserve', 'optional']) pkg.budget[role + 'Minutes'] = pkg.activities.filter(activity => activity.budgetRole === role).reduce((sum, activity) => sum + activity.minutes, 0);
  pkg.budget.slotMinutes = pkg.budget.coreMinutes + pkg.budget.reserveMinutes + pkg.budget.optionalMinutes + pkg.budget.transitionMinutes;
  pkg.contentHash = hashPackage(pkg);
  const validation = validateLessonPackage(pkg);
  return validation.ok ? { ok: true, package: pkg, issues: [], requiresTeacherReview: true, sourcePackageHash: sourceHash } : failure('package', validation.errors);
}
