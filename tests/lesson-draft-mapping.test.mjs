import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { importText } from '../lib/lesson/import/text.js';
import { hashPackage, MANDATORY_FORBIDDEN_SOURCES } from '../lib/lesson/schema.js';
import { validateLessonPackage } from '../lib/lesson/validate.js';
import { createLessonService } from '../lib/lesson/service.js';
import * as teacherSetup from '../lib/lesson/teacher-setup.js';
import {containsDraftRemoval} from '../lib/lesson/draft-undo.js';
import {LESSON_PURPOSES,matchesCreationSettings} from '../lib/lesson/creation-context.js';

const source = await readFile(new URL('../app/lessons/lesson-dashboard.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('dashboard.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function handler(name, bindings) {
  let declaration;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) declaration = node;
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(declaration, name);
  const definition = ts.isFunctionDeclaration(declaration)
    ? declaration.getText(ast).replace(/^export\s+/, '')
    : `const ${declaration.getText(ast)};`;
  const js = ts.transpileModule(`${definition}; ${name};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return vm.runInNewContext(js, bindings);
}

const syncLinks = handler('syncPackageBidirectionalLinks', {});
const plain = value => JSON.parse(JSON.stringify(value));

test('Studio can select the current authored pilot when saved packages already exist', async () => {
  const state = {}, bindings = studioBindings(state);
  bindings.creation=null;bindings.setCurrentPackage=value=>{state.CurrentPackage=value;};
  bindings.setSelectedRecord=value=>{state.SelectedRecord=value;};bindings.setEditedPackage=value=>{state.EditedPackage=value;};bindings.setLaunchTitle=value=>{state.LaunchTitle=value;};
  bindings.setIsLoadingStudio=value=>{state.IsLoadingStudio=value;};bindings.setStudioStatus=value=>{state.StudioStatus=value;};
  const pilot = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
  bindings.fetch = async url => {
    assert.equal(url, '/api/lessons?kind=pilot');
    return { ok: true, json: async () => ({ package: pilot }) };
  };
  await handler('handleSelectPackage', bindings)(null,'__pilot__');
  assert.ok(state.SelectedRecord == null);
  assert.equal(state.CurrentPackage.version, pilot.version);
  assert.equal(state.EditedPackage.contentHash, pilot.contentHash);
  assert.equal(state.IsLoadingStudio, false);
});

test('Studio selects an authored source draft without treating it as an approved saved record',async()=>{
 const state={},bindings=studioBindings(state);const pkg=JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p2.json',import.meta.url),'utf8'));
 bindings.fetch=async url=>{assert.equal(url,'/api/lesson-content?id=g11-sequences-p2');return{ok:true,json:async()=>({package:pkg})};};
 await handler('handleSelectPackage',bindings)(null,'g11-sequences-p2');assert.equal(state.CurrentPackage.id,pkg.id);assert.equal(state.SelectedRecord,null);assert.equal(state.EditedPackage.status,'draft');assert.equal(state.ApprovedPlan,null);
});

test('Studio preview budget exposes optional extension minutes', () => {
  assert.match(source, /tùy chọn\/phó bản/);
  assert.match(source, /optionalMinutes/);
});

function studioBindings(state = {}) {
  const bindings = {
    draftRevisionRef: { current: 0 }, savingRef: { current: false }, mappingJson: null,
    importSourceId: null, importSourceMeta: null,
    creation:null,generationSettings:{subject:'math',grade:11,slotMinutes:40},
    setGenerationSettings:()=>{},
    activePackageFetchIdRef: { current: null }, activeDirectorFetchIdRef: { current: null }, activeListFetchIdRef: { current: null },
    syncPackageBidirectionalLinks: syncLinks,
    sourceNeedsNumericReview: handler('sourceNeedsNumericReview', {}), checkedNumericAcks: {},
    normalizeLessonResponse: handler('normalizeLessonResponse', { isRecord: handler('isRecord', {}) }),
  };
  for (const name of ['SelectedRecord', 'CurrentPackage', 'LaunchTitle', 'IsLoadingStudio', 'DirectorDraft', 'ApprovedPlan', 'DirectorError', 'PlanApprovalStatus', 'LaunchMode', 'MappingJson', 'MappingError', 'DraftErrors', 'StudioStatus', 'IsLoadingDirector', 'IsApprovingPlan', 'IsSubmittingApproval', 'IsApproveOpen', 'IsLaunchOpen', 'CheckedSourceAcks', 'CheckedNumericAcks', 'ApprovalNotes', 'CreatedSessionData', 'ImportError', 'UnsupportedInfo', 'IsSavingDraft']) {
    bindings[`set${name}`] = value => { state[name] = value; };
  }
  bindings.setEditedPackage = value => { bindings.draftRevisionRef.current++; state.EditedPackage = value; };
  bindings.setStudioSubTab = value => { bindings.draftRevisionRef.current++; state.StudioSubTab = value; };
  return bindings;
}

test('creation import loads no package while saved choice loads only the explicit row',async()=>{
 for(const creation of [
  {source:'import',purpose:'formation',grade:10,minutes:40,packageId:null},
  {source:'library',purpose:'review',grade:11,minutes:80,packageId:'chosen-row'},
 ]){
  const state={},bindings=studioBindings(state),calls=[];bindings.creation=creation;bindings.useCallback=fn=>fn;bindings.setPackages=value=>{state.Packages=value;};
  bindings.normalizeLessonResponse=value=>value;
  bindings.setSelectedRecord=value=>{state.SelectedRecord=value;};bindings.setCurrentPackage=value=>{state.CurrentPackage=value;};
  bindings.setIsLoadingStudio=value=>{state.IsLoadingStudio=value;};bindings.setStudioStatus=value=>{state.StudioStatus=value;};
  bindings.setLaunchTitle=value=>{state.LaunchTitle=value;};
  bindings.fetch=async url=>{calls.push(url);if(url==='/api/lessons?kind=list')return{ok:true,json:async()=>({packages:[{row_id:'other-row'},{row_id:'chosen-row'}]})};assert.equal(url,'/api/lessons?kind=get&id=chosen-row');return{ok:true,json:async()=>({row:{row_id:'chosen-row'},lesson:{id:'selected',grade:11,budget:{slotMinutes:80}}})};};
  await handler('loadStudio',bindings)(true);
  assert.deepEqual(calls,creation.source==='import'?['/api/lessons?kind=list']:['/api/lessons?kind=list','/api/lessons?kind=get&id=chosen-row']);
  if(creation.source==='import')assert.equal(state.CurrentPackage,undefined);else assert.equal(state.CurrentPackage.id,'selected');
 }
});

test('sync removes deleted and reassigned reciprocal links without mutating the draft', () => {
  const draft = {
    objectives: [{ id: 'o1', prerequisiteIds: ['deleted'] }],
    activities: [
      { id: 'a1', taskIds: ['t1', 'deleted'], objectiveIds: ['o1', 'deleted'], evidenceIds: ['e1', 'deleted'], supportIds: ['h1', 'deleted'] },
      { id: 'a2' },
    ],
    tasks: [{ id: 't1', activityId: 'a2', objectiveIds: ['o1', 'deleted'], hintIds: ['h1', 'deleted'], evidenceIds: ['e1', 'deleted'] }],
    hints: [{ id: 'h1', taskId: 't1', objectiveIds: ['o1', 'deleted'] }],
    evidenceRules: [{ id: 'e1', taskId: 't1', objectiveIds: ['o1', 'deleted'] }],
  };
  const before = structuredClone(draft);
  const synced = plain(syncLinks(draft));
  assert.deepEqual(draft, before);
  assert.deepEqual(synced.activities[0].taskIds, []);
  assert.deepEqual(synced.activities[0].supportIds, []);
  assert.deepEqual(synced.activities[0].evidenceIds, []);
  assert.deepEqual(synced.activities[1].taskIds, ['t1']);
  assert.deepEqual(synced.activities[1].supportIds, ['h1']);
  assert.deepEqual(synced.activities[1].evidenceIds, ['e1']);
  for (const entity of [...synced.activities, ...synced.tasks, ...synced.hints, ...synced.evidenceRules]) {
    assert.deepEqual(entity.objectiveIds, ['o1']);
  }
  assert.deepEqual(synced.objectives[0].prerequisiteIds, []);
  assert.deepEqual(synced.tasks[0].hintIds, ['h1']);
  assert.deepEqual(synced.tasks[0].evidenceIds, ['e1']);
  assert.deepEqual(plain(syncLinks(synced)), synced);
  synced.hints = [];
  synced.evidenceRules = [];
  const deleted = plain(syncLinks(synced));
  assert.deepEqual(deleted.tasks[0].hintIds, []);
  assert.deepEqual(deleted.tasks[0].evidenceIds, []);
  assert.deepEqual(deleted.activities[1].supportIds, []);
  assert.deepEqual(deleted.activities[1].evidenceIds, []);
  deleted.tasks = [];
  assert.deepEqual(plain(syncLinks(deleted)).activities[1].taskIds, []);
});

test('sync preserves authored hint policy and leaves unsafe or missing policy for validation', async () => {
  const fixture = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
  const synced = plain(syncLinks(fixture));
  assert.deepEqual(synced.hints, fixture.hints);
  synced.contentHash = hashPackage(synced);
  assert.equal(validateLessonPackage(synced).ok, true);
  for (const policy of [
    { notAnswer: false, penalty: { time: 1, score: 2, freeze: 3 } },
    {},
  ]) {
    const draft = structuredClone(fixture);
    delete draft.hints[0].notAnswer;
    delete draft.hints[0].penalty;
    Object.assign(draft.hints[0], policy);
    const result = plain(syncLinks(draft));
    assert.deepEqual(result.hints[0], draft.hints[0]);
    result.contentHash = hashPackage(result);
    const validation = validateLessonPackage(result);
    assert.equal(validation.ok, false);
    for (const field of ['notAnswer', 'penalty']) {
      assert.ok(validation.errors.some(error => error.path === `hints[0].${field}`), JSON.stringify(validation.errors));
    }
  }
});

test('extraction candidate preserves source, uses validator policy, and clears saved plan state', () => {
  const extraction = importText({ kind: 'markdown', originalName: 'source.md', text: '# Source title\n\nExact $x_1$ source text.' });
  const before = JSON.stringify(extraction);
  const state = {};
  const bindings = {
    ...studioBindings(state),
    importExtraction: extraction,
    activeDirectorFetchIdRef: { current: 'old-row' },
    activePackageFetchIdRef: { current: 'old-pkg' },
  };
  for (const name of ['SelectedRecord', 'DirectorDraft', 'ApprovedPlan', 'DirectorError', 'PlanApprovalStatus', 'IsLoadingDirector', 'LaunchMode', 'IsApproveOpen', 'IsLaunchOpen', 'CheckedSourceAcks', 'ApprovalNotes', 'CreatedSessionData', 'MappingJson', 'MappingError', 'DraftErrors', 'CurrentPackage', 'EditedPackage', 'StudioSubTab', 'StudioStatus', 'LaunchTitle', 'ImportError', 'UnsupportedInfo']) {
    bindings[`set${name}`] = value => { state[name] = value; };
  }
  handler('handleUseExtractionForDraft', bindings)();
  const candidate = JSON.parse(JSON.stringify(state.EditedPackage));
  assert.equal(state.SelectedRecord, null);
  assert.equal(state.DirectorDraft, null);
  assert.equal(state.ApprovedPlan, null);
  assert.equal(state.LaunchTitle, '');
  assert.equal(state.ImportError, '');
  assert.equal(state.UnsupportedInfo, null);
  assert.equal(bindings.activeDirectorFetchIdRef.current, null);
  assert.equal(bindings.activePackageFetchIdRef.current, null);
  assert.equal(state.StudioSubTab, 'edit');
  assert.equal(JSON.stringify(extraction), before);
  assert.equal(candidate.sourceRefs[0].kind, 'external');
  assert.equal(candidate.sourceRefs[0].verification, 'teacher_review_required');
  assert.equal(candidate.sourceRefs[0].hash, extraction.sha256);
  assert.deepEqual(candidate.masteryPolicy.forbiddenSources, [...MANDATORY_FORBIDDEN_SOURCES]);
  for (const key of ['objectives', 'activities', 'tasks', 'evidenceRules']) assert.deepEqual(candidate[key], []);
  candidate.contentHash = hashPackage(candidate);
  const validation = validateLessonPackage(candidate);
  assert.ok(!validation.errors.some(error => /^(sourceRefs|budget|masteryPolicy)/.test(error.path)), JSON.stringify(validation.errors));
});

test('save displays actual validator errors, does not persist invalid mapping, and accepts teacher-mapped package', async () => {
  let writes = 0;
  const service = createLessonService({ db: { prepare: () => ({ bind: () => ({ run: async () => { writes++; return { meta: { changes: 1 } }; } }) }) } });
  const fixture = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
  const invalid = structuredClone(fixture);
  invalid.budget.coreMinutes = 999;
  const state = {};
  let calls = 0;
  const bindings = {
    ...studioBindings(state),
    editedPackage: invalid, mappingJson: null,
    syncPackageBidirectionalLinks: syncLinks,
    setMappingError: value => { state.mappingError = value; },
    setDraftErrors: value => { state.errors = value; },
    setStudioStatus: value => { state.status = value; },
    setStudioSubTab: value => { state.tab = value; },
    loadStudio: async () => {},
    fetch: async (_url, options) => {
      calls++;
      try {
        const result = await service.savePackage({ ownerAccountId: 'teacher', package: JSON.parse(options.body).package });
        return { ok: true, json: async () => result };
      } catch (error) {
        return { ok: false, json: async () => ({ error: error.message, errors: error.validationErrors }) };
      }
    },
  };
  await handler('handleSaveDraft', bindings)();
  assert.equal(writes, 0);
  assert.ok(state.errors.some(error => error.path === 'budget.coreMinutes'));
  await handler('handleSaveDraft', { ...bindings, editedPackage: fixture, mappingJson: '{' })();
  assert.equal(calls, 1);
  assert.ok(state.mappingError);
  await handler('handleSaveDraft', { ...bindings, editedPackage: fixture })();
  assert.equal(writes, 1);
  assert.equal(state.tab, 'preview');
});

test('package selection protects against stale in-flight async results when switching packages', async () => {
  const state = {};
  const activePackageFetchIdRef = { current: null };
  const activeDirectorFetchIdRef = { current: 'old-dir' };

  let resolveFirst;
  const firstPromise = new Promise(resolve => { resolveFirst = resolve; });

  const bindings = {
    ...studioBindings(state),
    activePackageFetchIdRef,
    activeDirectorFetchIdRef,
    setSelectedRecord: v => { state.selectedRecord = v; },
    setCurrentPackage: v => { state.currentPackage = v; },
    setEditedPackage: v => { state.editedPackage = v; },
    setLaunchTitle: v => { state.launchTitle = v; },
    setIsLoadingStudio: v => { state.isLoadingStudio = v; },
    setStudioSubTab: v => { state.tab = v; },
    setDirectorDraft: v => { state.directorDraft = v; },
    setApprovedPlan: v => { state.approvedPlan = v; },
    setDirectorError: v => { state.directorError = v; },
    setPlanApprovalStatus: v => { state.planApprovalStatus = v; },
    setLaunchMode: v => { state.launchMode = v; },
    setMappingJson: () => {},
    setMappingError: () => {},
    setDraftErrors: () => {},
    normalizeLessonResponse: data => data,
    fetch: async (url) => {
      if (url.includes('pkg-1')) {
        await firstPromise;
        return {
          ok: true,
          json: async () => ({
            lesson: { id: 'pkg-1', version: '1.0.0', status: 'draft', essentialQuestion: 'Question 1' },
            row: { row_id: 'pkg-1', version: '1.0.0', status: 'draft' }
          })
        };
      }
      return {
        ok: true,
        json: async () => ({
          lesson: { id: 'pkg-2', version: '1.0.0', status: 'draft', essentialQuestion: 'Question 2' },
          row: { row_id: 'pkg-2', version: '1.0.0', status: 'draft' }
        })
      };
    }
  };

  const selectHandler = handler('handleSelectPackage', bindings);

  // User selects pkg-1 first (starts slow fetch)
  const p1 = selectHandler({ row_id: 'pkg-1', package_id: 'pkg-1', version: '1.0.0', status: 'draft' });
  assert.ok(activePackageFetchIdRef.current.startsWith('pkg-1-'));

  // User quickly switches to pkg-2 (starts second fetch and completes immediately)
  const p2 = selectHandler({ row_id: 'pkg-2', package_id: 'pkg-2', version: '1.0.0', status: 'draft' });
  assert.ok(activePackageFetchIdRef.current.startsWith('pkg-2-'));

  await p2;
  assert.equal(state.currentPackage?.id, 'pkg-2');
  assert.equal(state.selectedRecord?.row_id, 'pkg-2');

  // First fetch resolves LATER
  resolveFirst();
  await p1;

  // Stale async result from pkg-1 must NOT overwrite pkg-2!
  assert.equal(state.currentPackage?.id, 'pkg-2');
  assert.equal(state.selectedRecord?.row_id, 'pkg-2');
});

test('unmapped extraction candidate is blocked from saving by validator', async () => {
  let writes = 0;
  const service = createLessonService({
    db: {
      prepare: () => ({
        bind: () => ({
          run: async () => { writes++; return { meta: { changes: 1 } }; }
        })
      })
    }
  });

  const extraction = importText({ kind: 'markdown', originalName: 'notes.md', text: '# Tiết học Dãy số\n\nNội dung thực tế $u_n$.' });
  const draftState = {};
  const draftBindings = {
    ...studioBindings(draftState),
    importExtraction: extraction,
    activeDirectorFetchIdRef: { current: null },
    activePackageFetchIdRef: { current: null }
  };
  for (const name of ['SelectedRecord', 'DirectorDraft', 'ApprovedPlan', 'DirectorError', 'PlanApprovalStatus', 'IsLoadingDirector', 'LaunchMode', 'IsApproveOpen', 'IsLaunchOpen', 'CheckedSourceAcks', 'ApprovalNotes', 'CreatedSessionData', 'MappingJson', 'MappingError', 'DraftErrors', 'CurrentPackage', 'EditedPackage', 'StudioSubTab', 'StudioStatus', 'LaunchTitle', 'ImportError', 'UnsupportedInfo']) {
    draftBindings[`set${name}`] = value => { draftState[name] = value; };
  }
  handler('handleUseExtractionForDraft', draftBindings)();
  const rawCandidate = draftState.EditedPackage;

  // Incomplete candidate where teacher started entering an objective without covering tasks/evidence or budget
  const invalidCandidate = structuredClone(rawCandidate);
  invalidCandidate.objectives = [{ id: 'obj-1', code: 'T11.18', level: 'must', statement: 'Mục tiêu chưa có nhiệm vụ' }];
  invalidCandidate.budget = { slotMinutes: 40, coreMinutes: 36, reserveMinutes: 4, transitionMinutes: 0, optionalMinutes: 0 };

  // Verify incomplete candidate is blocked by real validator:
  invalidCandidate.contentHash = hashPackage(invalidCandidate);
  const directValidation = validateLessonPackage(invalidCandidate);
  assert.equal(directValidation.ok, false);
  assert.ok(directValidation.errors.some(e => e.code === 'ERR_LO_NOT_COVERED'));
  assert.ok(directValidation.errors.some(e => e.code === 'ERR_TIME_BUDGET_MISMATCH'));

  // Attempt saving this incomplete candidate via actual handleSaveDraft handler:
  const saveState = {};
  const saveBindings = {
    ...studioBindings(saveState),
    editedPackage: invalidCandidate,
    syncPackageBidirectionalLinks: syncLinks,
    setDraftErrors: value => { saveState.errors = value; },
    setStudioStatus: value => { saveState.status = value; },
    setStudioSubTab: value => { saveState.tab = value; },
    loadStudio: async () => {},
    fetch: async (_url, options) => {
      try {
        const result = await service.savePackage({ ownerAccountId: 'teacher', package: JSON.parse(options.body).package });
        return { ok: true, json: async () => result };
      } catch (error) {
        return { ok: false, json: async () => ({ error: error.message, errors: error.validationErrors }) };
      }
    }
  };

  await handler('handleSaveDraft', saveBindings)();
  // Must NOT persist invalid candidate
  assert.equal(writes, 0);
  assert.ok(saveState.errors && saveState.errors.length > 0);
  assert.ok(saveState.errors.some(e => e.code === 'ERR_LO_NOT_COVERED'));

  assert.equal(saveState.tab, undefined);
});

// Execute the component with persistent hooks and its real React elements/callbacks.
// No proxy globals or missing-binding fallbacks: an absent dependency throws.
function formHarness(fetch = async () => { throw new Error('Unexpected request'); }, session = {}) {
  const slots = [], names = [], refs = [];
  let cursor = 0, refCursor = 0;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name) && node.initializer && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(ast) === 'useState') names.push(node.name.elements[0].getText(ast));
    ts.forEachChild(node, visit);
  }
  visit(ast);
  const hooks = {
    ...React,
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = names[i] === 'isSessionRestored' ? true : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef(initial) { const i = refCursor++; return refs[i] ||= { current: initial }; },
    useCallback: fn => fn,
    useEffect: () => {},
  };
  const exports = {};
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  vm.runInNewContext(js, { exports, fetch, alert: message => { throw new Error(message); }, require(name) {
    if (name === 'react') return hooks;
    if (name.endsWith('/MathText')) return { default: ({ text }) => text, __esModule: true };
    if (name.endsWith('/lib/lesson/teacher-setup.js')) return teacherSetup;
    if (name.endsWith('/TeacherSetupPanel')) return {TeacherSetupPanel:()=>null,TeacherSetupSummary:()=>null};
    if (name.endsWith('/LessonWorldMap')) return { LessonWorldMap: () => null, __esModule: true };
    if (name.endsWith('/LessonPeerInspector')) return { LessonPeerInspector: () => null, __esModule: true };
    if (name.endsWith('/lib/lesson/cockpit.js')) return { cockpitLearners: () => [], __esModule: true };
    if (name.endsWith('/useLessonSession')) return { useLessonSession: () => session, formatDuration: String };
    if (name.endsWith('/lib/lesson/proposal.js')) return { buildLessonProposal: () => null, __esModule: true };
    if (name.endsWith("/ClassRosterPanel")) return { ClassRosterPanel: () => null };
    if (name.endsWith("/LessonContentLibrary")) return { default: () => null, __esModule: true };
    if (name.endsWith('/lib/lesson/draft-undo.js')) return {containsDraftRemoval};
    if (name.endsWith('/lib/lesson/creation-context.js')) return {LESSON_PURPOSES,matchesCreationSettings};
    if (name.endsWith("/ContentScopePicker")) return { ContentScopePicker: () => null };
    if (name.endsWith("lesson-catalogue.json")) return { default: { lessons: [] } };
    if (name.endsWith("/PracticePanel")) return { PracticePanel: () => null };
    if (name.endsWith("/TeacherGroupAssessment")) return { TeacherGroupAssessment: () => null };
    if (name.endsWith("/StructuredQuestionEditor")) return { StructuredQuestionEditor: () => null };
    if (name.endsWith("/lib/lesson/values.js")) return { REFLECTION_PROMPTS: {} };
    if (name.endsWith("/TeacherLessonTools")) return { TeacherLessonTools: () => null };
    if (name.endsWith("/LeaguePanel")) return { LeaguePanel: () => null };
    if (name.endsWith("/ClassEventPanel")) return { ClassEventPanel: () => null };
    if (name.endsWith("/ValueReflection")) return { ValueReflection: () => null };
    throw new Error(`Unexpected dependency ${name}`);
  } });
  function expand(node) {
    if (Array.isArray(node)) return node.map(expand);
    if (!React.isValidElement(node)) return node;
    if (typeof node.type === 'function') return expand(node.type(node.props));
    return { type: node.type, props: node.props, children: React.Children.toArray(node.props.children).map(expand) };
  }
  return {
    render() { cursor = 0; refCursor = 0; return expand(exports.default({ user: { userId: 'teacher', displayName: 'Teacher' } })); },
    get(name) { assert.ok(names.includes(name), name); return slots[names.indexOf(name)]; },
    seed(name, value) { assert.ok(names.includes(name), name); slots[names.indexOf(name)] = value; },
  };
}
function nodes(root, predicate) {
  if (Array.isArray(root)) return root.flatMap(node => nodes(node, predicate));
  if (!root || typeof root !== 'object') return [];
  return [...(predicate(root) ? [root] : []), ...(root.children || []).flatMap(node => nodes(node, predicate))];
}
function text(node) { return typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : (node?.children || []).map(text).join(''); }
function button(root, label) {
  const found = nodes(root, node => node.type === 'button' && text(node).includes(label));
  assert.equal(found.length, 1, `button: ${label}`);
  return found[0];
}
function field(root, label, value, checked) {
  const containers = nodes(root, node => (node.type === 'label' && text(node).includes(label)) || (node.props?.className === 'lesson-field-group' && node.children?.some(child => child?.type === 'label' && text(child).includes(label))));
  const wrapping = containers.filter(node => node.type === 'label' && nodes(node, child => ['input', 'select', 'textarea'].includes(child.type)).length);
  const controls = [...new Set((wrapping.length ? wrapping : containers).flatMap(node => nodes(node, child => ['input', 'select', 'textarea'].includes(child.type))))];
  assert.equal(controls.length, 1, `field: ${label}`);
  controls[0].props.onChange({ target: { value, checked } });
}

test('rendered teacher form authors an imported T11.18/19 package without fixture injection', () => {
  const ui = formHarness();
  ui.render();
  const extraction = importText({ kind: 'markdown', originalName: 'teacher.md', text: '# Dãy số\n\nSo sánh dãy hữu hạn và vô hạn. Biểu diễn bằng liệt kê, công thức, truy hồi và lời văn.\n\n$unfinished' });
  ui.seed('importExtraction', extraction);
  ui.seed('isLoadingStudio', false);
  ui.seed('studioSubTab', 'import');
  button(ui.render(), 'Dùng nội dung').props.onClick();
  assert.ok(extraction.uncertainties.length);
  assert.deepEqual(plain(ui.get('editedPackage').tasks), []);
  const cards = section => nodes(ui.render(), n => n.props?.className === 'lesson-form-section' && text(n).includes(section))[0];
  const card = (section, index) => nodes(cards(section), n => n.props?.className === 'lesson-form-card')[index];
  for (const [index, code, statement] of [[0, 'T11.18', 'Phân biệt dãy hữu hạn và vô hạn.'], [1, 'T11.19', 'Nhận biết bốn cách biểu diễn dãy số.']]) {
    button(ui.render(), '+ Thêm chuẩn đầu ra').props.onClick();
    assert.equal(ui.get('editedPackage').objectives[index].code, '');
    field(card('Chuẩn đầu ra cần đạt', index), 'Mã chuẩn', code);
    field(card('Chuẩn đầu ra cần đạt', index), 'Nội dung chuẩn', statement);
    field(card('Chuẩn đầu ra cần đạt', index), index ? 'Yêu cầu đủ bốn' : 'Yêu cầu phân biệt', '', true);
  }
  // Explicit test-authored inputs, entered through the same callbacks a teacher uses.
  const stages = [['experience', 'precheck'], ['practice', 'practice'], ['recheck', 'individual_recheck'], ['exit', 'exit']];
  for (let i = 0; i < stages.length; i++) {
    button(ui.render(), '+ Thêm hoạt động').props.onClick();
    field(card('Hoạt động dạy học', i), 'Pha tiến trình', stages[i][0]);
    field(card('Hoạt động dạy học', i), 'Thời lượng', '5');
    button(ui.render(), '+ Thêm nhiệm vụ').props.onClick();
    field(card('Nhiệm vụ học tập', i), 'Hoạt động:', `act-${i + 1}`);
    field(card('Nhiệm vụ học tập', i), 'Cốt lõi', '', false);
    field(card('Nhiệm vụ học tập', i), 'T11.19', '', true);
    field(card('Nhiệm vụ học tập', i), 'Đề bài', i === 2 ? 'Tự đối chiếu miền chỉ số để phân loại dãy và giải thích bốn biểu diễn bằng lập luận riêng.' : 'Phân biệt hai loại dãy và giải thích các cách biểu diễn trong nguồn.');
    field(card('Nhiệm vụ học tập', i), 'Loại nhiệm vụ', 'open');
    const rubricInputs = nodes(card('Nhiệm vụ học tập', i), n => n.props?.className === 'lesson-sub-card').flatMap(n => nodes(n, child => child.type === 'input'));
    assert.equal(rubricInputs.length, 2);
    rubricInputs[0].props.onChange({ target: { value: 'Giải thích đúng số lượng số hạng và cách xác định số hạng.' } });
    nodes(card('Nhiệm vụ học tập', i), n => n.props?.className === 'lesson-sub-card').flatMap(n => nodes(n, child => child.type === 'input'))[1].props.onChange({ target: { value: 'Học sinh đối chiếu từng cách biểu diễn với nguồn.' } });
    field(card('Nhiệm vụ học tập', i), 'Hữu hạn', '', true);
    field(card('Nhiệm vụ học tập', i), 'Vô hạn', '', true);
    for (const label of ['Liệt kê', 'Công thức tổng quát', 'Truy hồi', 'Bằng lời']) field(card('Nhiệm vụ học tập', i), label, '', true);
    button(ui.render(), '+ Thêm quy tắc minh chứng').props.onClick();
    field(card('Quy tắc minh chứng năng lực', i), 'Loại minh chứng', stages[i][1]);
    field(card('Quy tắc minh chứng năng lực', i), 'Nhiệm vụ phát sinh', `task-${i + 1}`);
    field(card('Quy tắc minh chứng năng lực', i), 'T11.19', '', true);
    field(card('Quy tắc minh chứng năng lực', i), 'Tính điểm làm chủ', '', i >= 2);
  }
  button(ui.render(), 'Đồng bộ từ các hoạt động').props.onClick();
  const authored = plain(ui.get('editedPackage'));
  authored.contentHash = hashPackage(authored);
  const validation = validateLessonPackage(authored);
  assert.equal(validation.ok, true, JSON.stringify(validation.errors));
  assert.equal(authored.sourceRefs[0].verification, 'teacher_review_required');
  assert.equal(ui.get('importExtraction'), extraction);
  for (const [key, code] of [['sequenceTypes', 'ERR_MISSING_FINITE_INFINITE_DISTINCTION'], ['representations', 'ERR_MISSING_REPRESENTATIONS']]) {
    const missing = structuredClone(authored);
    missing.tasks.forEach(task => { delete task[key]; });
    missing.contentHash = hashPackage(missing);
    assert.ok(validateLessonPackage(missing).errors.some(error => error.code === code));
  }
  button(ui.render(), '+ Thêm gợi ý').props.onClick();
  assert.deepEqual(plain(ui.get('editedPackage').hints[0].objectiveIds), []);
  field(card('Giàn giáo gợi ý', 0), 'T11.19', '', true);
  field(card('Giàn giáo gợi ý', 0), 'Nội dung gợi ý', 'Đối chiếu cách xác định số hạng trong nguồn.');
  assert.deepEqual(plain(ui.get('editedPackage').hints[0].objectiveIds), ['obj-2']);
  field(card('Giàn giáo gợi ý', 0), 'Gắn với nhiệm vụ', 'task-2');
  assert.deepEqual(plain(ui.get('editedPackage').hints[0].objectiveIds), ['obj-2']);
  field(card('Nhiệm vụ học tập', 1), 'T11.19', '', false);
  assert.deepEqual(plain(ui.get('editedPackage').hints[0].objectiveIds), []);
  assert.ok(!nodes(card('Giàn giáo gợi ý', 0), n => n.type === 'label' && text(n) === 'T11.19').length);

  field(card('Nhiệm vụ học tập', 0), 'Loại nhiệm vụ', 'closed');
  field(card('Nhiệm vụ học tập', 0), 'Cơ chế chấm', 'representation_match');
  assert.deepEqual(plain(ui.get('editedPackage').tasks[0].evaluation.answerKey), {});
  const matchGroup = name => nodes(card('Nhiệm vụ học tập', 0), n => n.type === 'fieldset' && n.children?.some(c => c?.type === 'legend' && text(c) === name))[0];
  for (const [name, add, id, label] of [['Biểu diễn cần ghép', 'Thêm biểu diễn', 'r1', 'Liệt kê'], ['Thẻ đáp án', 'Thêm thẻ', 'c1', 'Các số hạng được viết lần lượt.']]) {
    button(card('Nhiệm vụ học tập', 0), add).props.onClick();
    field(matchGroup(name), 'Mã', id);
    field(matchGroup(name), 'Nội dung', label);
  }
  field(matchGroup('Biểu diễn cần ghép'), 'Thẻ đúng', 'c1');
  assert.deepEqual(plain(ui.get('editedPackage').tasks[0].evaluation.answerKey), { r1: 'c1' });
  field(matchGroup('Thẻ đáp án'), 'Mã', 'renamed-card');
  field(matchGroup('Biểu diễn cần ghép'), 'Mã', 'renamed-rep');
  assert.deepEqual(plain(ui.get('editedPackage').tasks[0].evaluation.answerKey), { 'renamed-rep': 'renamed-card' });
  const matched = plain(ui.get('editedPackage'));
  matched.contentHash = hashPackage(matched);
  assert.ok(!validateLessonPackage(matched).errors.some(e => e.path.startsWith('tasks[0].evaluation') || e.path.startsWith('tasks[0].inputSchema')));
  field(matchGroup('Biểu diễn cần ghép'), 'Thẻ đúng', '');
  assert.deepEqual(plain(ui.get('editedPackage').tasks[0].evaluation.answerKey), {});
  field(matchGroup('Biểu diễn cần ghép'), 'Thẻ đúng', 'renamed-card');
  button(matchGroup('Thẻ đáp án'), 'Xóa').props.onClick();
  assert.deepEqual(plain(ui.get('editedPackage').tasks[0].evaluation.answerKey), {});
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const response = data => ({ ok: true, json: async () => data });

test('stale saves cannot overwrite a selected package, imported draft, edited draft or tab; duplicate saves are blocked', async () => {
  for (const change of ['select', 'import', 'edit', 'tab']) {
    const pending = deferred(), state = {};
    const bindings = studioBindings(state);
    let writes = 0, reloads = 0;
    Object.assign(bindings, {
      editedPackage: { id: 'old', version: '1.0.0', status: 'draft' },
      loadStudio: async () => { reloads++; },
      fetch: async (_url, options) => {
        if (options?.method === 'POST') { writes++; return pending.promise; }
        return response({ package: { id: 'new', version: '1.0.0', status: 'draft' } });
      },
    });
    const save = handler('handleSaveDraft', bindings);
    const saving = save();
    await save();
    assert.equal(writes, 1);
    assert.equal(state.IsSavingDraft, true);
    if (change === 'select') await handler('handleSelectPackage', bindings)({ row_id: 'new' });
    if (change === 'import') handler('handleUseExtractionForDraft', { ...bindings, importExtraction: importText({ kind: 'text', originalName: 'new.txt', text: 'New source' }) })();
    if (change === 'edit') bindings.setEditedPackage({ id: 'changed' });
    if (change === 'tab') bindings.setStudioSubTab('import');
    const before = plain(state);
    pending.resolve(response({ package: { id: 'old' }, row: { rowId: 'old' } }));
    await saving;
    assert.deepEqual({ ...plain(state), IsSavingDraft: true }, before);
    assert.equal(state.IsSavingDraft, false);
    assert.equal(reloads, 0);
  }
});

test('list refresh survives selection but initial detail and loading cannot replace an imported draft', async () => {
  for (const stage of ['list', 'detail', 'failure']) {
    const pending = deferred(), state = {}, bindings = studioBindings(state);
    bindings.creation={source:'library',packageId:'old',purpose:'formation',grade:11,minutes:40};
    bindings.setPackages = value => { state.Packages = value; };
    bindings.useCallback = fn => fn;
    bindings.fetch = async url => {
      if (stage === 'detail' && url.includes('kind=list')) return response({ packages: [{ row_id: 'old' }] });
      return pending.promise;
    };
    const loading = handler('loadStudio', bindings)(true);
    await new Promise(resolve => setImmediate(resolve));
    if (stage !== 'failure') {
      handler('handleUseExtractionForDraft', { ...bindings, importExtraction: importText({ kind: 'text', originalName: 'new.txt', text: 'New source' }) })();
      const before = plain(state.EditedPackage);
      pending.resolve(response(stage === 'list' ? { packages: [{ row_id: 'old' }] } : { package: { id: 'old', version: '1.0.0' } }));
      await loading;
      assert.deepEqual(plain(state.EditedPackage), before);
      assert.equal(state.StudioSubTab, 'edit');
      if (stage === 'list') assert.equal(state.Packages[0].row_id, 'old');
    } else {
      pending.reject(new Error('offline'));
      await loading;
      assert.ok(state.StudioStatus);
    }
    assert.equal(state.IsLoadingStudio, false);
  }
});

test('director and approval responses cannot update a replacement extraction', async () => {
  for (const name of ['handleFetchDirectorDraft', 'handleApprovePlan', 'handleApprove']) {
    const pending = deferred(), state = {}, bindings = studioBindings(state);
    Object.assign(bindings, {
      selectedRecord: { row_id: 'old', version: '1.0.0', content_hash: 'old-hash', status: 'approved' },
      currentPackage: { id: 'old', version: '1.0.0', sourceRefs: [{ id: 'source', locator: 'source.md', verification: 'verified' }] },
      directorDraft: { plan: { contentHash: 'plan-hash' } },
      checkedSourceAcks: { 'source\u0000source.md': true }, approvalNotes: '',
      bumpSemverPatch: handler('bumpSemverPatch', {}),
      fetch: async () => pending.promise,
      loadStudio: async () => { assert.fail('Stale approval must not reload'); },
      alert: () => { assert.fail('Stale approval must not alert'); },
    });
    const request = handler(name, bindings)();
    handler('handleUseExtractionForDraft', { ...bindings, importExtraction: importText({ kind: 'text', originalName: 'new.txt', text: 'New source' }) })();
    const before = plain(state);
    pending.resolve(response({ package: { id: 'old' }, row: { rowId: 'old' }, plan: { contentHash: 'old' } }));
    await request;
    assert.deepEqual(plain(state), before, name);
  }
});

test('selecting the same row twice uses distinct request identities', async () => {
  const first = deferred(), state = {}, bindings = studioBindings(state);
  let calls = 0;
  bindings.fetch = async () => ++calls === 1 ? first.promise : response({ package: { id: 'newest', version: '1.0.0' } });
  const select = handler('handleSelectPackage', bindings);
  const old = select({ row_id: 'same-row' });
  await select({ row_id: 'same-row' });
  first.resolve(response({ package: { id: 'stale', version: '1.0.0' } }));
  await old;
  assert.equal(state.CurrentPackage.id, 'newest');
  assert.equal(state.IsLoadingStudio, false);
});

test('successful save selects its returned row and refreshes only the list', async () => {
  const state = {}, bindings = studioBindings(state);
  let refreshed = false;
  Object.assign(bindings, {
    editedPackage: { id: 'authored', version: '1.0.0', status: 'draft' },
    fetch: async () => response({ package: { id: 'authored', version: '1.0.1', status: 'draft' }, row: { rowId: 'saved-row', packageId: 'authored', version: '1.0.1', contentHash: 'hash', status: 'draft', createdAt: 123 } }),
    loadStudio: async (...args) => { refreshed = true; assert.deepEqual(args, []); },
  });
  await handler('handleSaveDraft', bindings)();
  assert.equal(state.SelectedRecord.row_id, 'saved-row');
  assert.equal(state.CurrentPackage.id, 'authored');
  assert.equal(state.StudioSubTab, 'preview');
  assert.equal(state.IsSavingDraft, false);
  assert.equal(refreshed, true);
});

function generationBindings(state = {}, store = new Map()) {
  const bindings = {
    ...studioBindings(state), useCallback: fn => fn, user: { userId: 'teacher' },
    importSourceId: 'source-a', importSourceStatus: 'ready',
    importSourceMeta: { id: 'source-a', status: 'ready', sha256: 'a'.repeat(64), parserRevision: 'parser-1', extractionHash: 'b'.repeat(64) },
    aiConsentKey: 'consent-1', generationConsentKey: 'consent-1', generationProviderHost: 'provider.example',
    setGenerationProviderHost: value => { state.ProviderHost = value; }, setGenerationConsentKey: value => { state.ConsentKey = value; },
    scopeConsent: null, generationJob: null, generationSettings: { subject: 'math', grade: 11, slotMinutes: 40 },
    generationBusyRef: { current: false }, sourceOperationRef: { current: 0 },
    sessionStorage: { getItem: key => store.get(key) || null, setItem: (key,value) => store.set(key,value), removeItem: key => store.delete(key) },
    setGenerationJob: value => { state.GenerationJob = value; },
    setIsStartingGeneration: value => { state.IsStartingGeneration = value; }
  };
  return bindings;
}

test('generation duplicate clicks share one start/run and keep source snapshot request identity', async () => {
  const state = {}, bindings = generationBindings(state), pending = deferred();
  const requests = [];
  const job = { id: 'job-a', sourceId: 'source-a', sourceSha256: 'a'.repeat(64), extractionHash: 'b'.repeat(64), status: 'queued' };
  bindings.fetch = async (url, options) => {
    if (String(url).includes("capabilities")) return pending.promise;
    const body = JSON.parse(options.body); requests.push(body);
    return response({ job: { ...job, status: body.action === 'run' ? 'needs_review' : 'queued' } });
  };
  const create = handler('handleStartAIGeneration', bindings);
  const first = create(); await create();
  pending.resolve(response({ generation: { configured: true, providerHost: 'provider.example' } }));
  await first;
  assert.deepEqual(requests.map(request => request.action), ['start', 'run']);
  assert.deepEqual(requests[1].aiConsent, { confirmed: true, sourceId: 'source-a', sourceSha256: 'a'.repeat(64), parserRevision: 'parser-1', extractionHash: 'b'.repeat(64) });
  assert.equal(state.GenerationJob.status, 'needs_review');
  assert.equal(bindings.generationBusyRef.current, false);
});

test('source switch during capability request cancels start without creating an obsolete job', async () => {
  const state = {}, bindings = generationBindings(state), pending = deferred();
  let writes = 0;
  bindings.fetch = async (url, options) => {
    if (String(url).includes("capabilities")) return pending.promise;
    writes++;
    return response({ job: { id: 'old', sourceId: 'source-a', status: 'queued' } });
  };
  const start = handler('handleStartAIGeneration', bindings)();
  bindings.sourceOperationRef.current++;
  pending.resolve(response({ generation: { configured: true, providerHost: 'provider.example' } }));
  await start;
  assert.equal(writes, 0);
  assert.equal(state.GenerationJob, undefined);
});

test('generation network retry reuses request identity; applying a foreign source cannot replace editor', async () => {
  const store = new Map(), state = {}, bindings = generationBindings(state, store), requestIds = [];
  let failing = true;
  bindings.fetch = async (_url, options) => {
    if (!options) return response({ generation: { configured: true, providerHost: 'provider.example' } });
    const input = JSON.parse(options.body);
    if (input.action === 'start') requestIds.push(input.requestId);
    if (failing) throw Error('NETWORK_FAILED');
    return response({ job: { id: 'job-a', sourceId: 'source-a', status: input.action === 'run' ? 'needs_review' : 'queued' } });
  };
  const start = handler('handleStartAIGeneration', bindings);
  await start(); failing = false; await start();
  assert.equal(requestIds[0], requestIds[1]);
  bindings.generationJob = { id: 'job-foreign', sourceId: 'source-b', sourceSha256: 'a'.repeat(64), extractionHash: 'b'.repeat(64), status: 'needs_review', result: { package: { id: 'foreign', status: 'needs_review' } } };
  handler('handleApplyGenerationResult', bindings)();
  assert.equal(state.CurrentPackage, undefined);
  assert.equal(state.ApprovedPlan, undefined);
});

test('generation cannot start without current explicit consent or after provider host changes', async () => {
  for (const stale of ['missing', 'source', 'provider']) {
    const state = {}, bindings = generationBindings(state);
    let writes = 0;
    if (stale === 'missing') bindings.generationConsentKey = '';
    if (stale === 'source') bindings.aiConsentKey = 'source-2';
    bindings.fetch = async (_url, options) => {
      if (options?.method === 'POST') writes++;
      return response({ generation: { configured: true, providerHost: 'changed.example' } });
    };
    await handler('handleStartAIGeneration', bindings)();
    assert.equal(writes, 0, stale);
    assert.ok(state.ImportError);
    if (stale === 'provider') assert.equal(state.ConsentKey, '');
  }
});

test('rendered cockpit defaults to assessment, switches one panel, and searches Vietnamese learner names', () => {
  const ui = formHarness(undefined, { view: {
    status: 'active', timeline: { currentActivityId: 'a1', activityIndex: 0, currentPhase: 'experience' },
    roster: { a: { id: 'a', name: 'Đặng An', present: true }, b: { id: 'b', name: 'Bình', present: false } },
    openAssessments: { s: { submissionId: 's', learnerId: 'a', taskId: 't1', status: 'pending', answer: 'Lập luận riêng' } },
    package: { activities: [{ id: 'a1', phase: 'experience', minutes: 5, taskIds: [] }, { id: 'a2', phase: 'practice', minutes: 10 }] },
  }, getRemainingMs: () => 60000 });
  ui.render(); ui.seed('activeTab', 'cockpit');
  let root = ui.render();
  const panels = () => nodes(root, n => n.props?.role === 'tabpanel');
  assert.equal(panels().filter(n => !n.props.hidden).length, 1);
  assert.equal(panels().find(n => !n.props.hidden).props.id, 'cockpit-panel-attention');
  assert.match(text(panels().find(n => !n.props.hidden)), /1 bài chờ chấm/);
  button(root, 'Học sinh').props.onClick(); root = ui.render();
  assert.equal(panels().find(n => !n.props.hidden).props.id, 'cockpit-panel-students');
  nodes(root, n => n.props?.['aria-label'] === 'Tìm học sinh')[0].props.onChange({ target: { value: 'dang' } });
  root = ui.render();
  const students = panels().find(n => !n.props.hidden);
  assert.match(text(students), /Đặng An/);
  assert.ok(!text(students).includes('Bình'));
  button(root, 'Hoạt động').props.onClick(); root = ui.render();
  assert.match(text(panels().find(n => !n.props.hidden)), /Tiếp theo:Học|Tiếp theo:.*Luyện tập/);
});

test('approval blocks unreviewed adapted numbers and sends explicit numeric review acknowledgement', async () => {
  const state = {}, bindings = studioBindings(state);
  let sent;
  Object.assign(bindings, {
    selectedRecord: { row_id: 'r1', content_hash: 'hash' },
    currentPackage: { version: '1.0.0', sourceRefs: [{ id: 'source', locator: 'source.md' }], tasks: [{ id: 't1', sourceRefs: ['source'], metadata: { numericReviewRequired: true } }] },
    checkedSourceAcks: { 'source\u0000source.md': true }, checkedNumericAcks: {}, approvalNotes: '',
    bumpSemverPatch: handler('bumpSemverPatch', {}), alert: () => {},
    fetch: async (_url, options) => { sent = JSON.parse(options.body); return { ok: false, json: async () => ({ error: 'STOP_AFTER_REQUEST' }) }; },
  });
  const approve = handler('handleApprove', bindings);
  await approve();
  assert.equal(sent, undefined);
  bindings.checkedNumericAcks['source\u0000source.md'] = true;
  await approve();
  assert.deepEqual(sent.sourceReviewAck, [{ id: 'source', locator: 'source.md', numericReviewConfirmed: true }]);
});

test('teacher board assessment preserves server nonMastery flag automatically',async()=>{
 const sent=[];const state={};const bindings={...studioBindings(state),assessCriteriaMet:true,assessFeedback:'Đúng trên bảng',assessNonMastery:false,cockpitView:{openAssessments:{board:{nonMastery:true}}},dispatchCommand:async(type,payload)=>{sent.push({type,payload});return{ok:true};},setAssessingSubId(){},setAssessFeedback(){},setAssessNonMastery(){}};
 const submit=handler('handleSubmitAssessment',bindings);await submit('board');assert.equal(sent[0].payload.nonMastery,true);
});
