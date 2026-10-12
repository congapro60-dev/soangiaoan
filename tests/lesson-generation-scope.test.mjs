import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFile, readdir } from 'node:fs/promises';
import { createLessonGenerationService } from '../lib/lesson/generation-service.js';
import { generateLessonCandidate } from '../lib/lesson/generation-provider.js';
import { createPilotLessonScope } from '../lib/lesson/content-map.js';
import { hashPackage, createPackageDraft } from '../lib/lesson/schema.js';
import catalogue from '../content/lesson-catalogue.json' with {type:'json'};
import { validateLessonPackage } from '../lib/lesson/validate.js';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import { resolve, dirname } from 'node:path';

const pilot = JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json', import.meta.url), 'utf8'));
const source = { id: 'src', status: 'ready', sha256: 'a'.repeat(64), extractionHash: 'b'.repeat(64), parserRevision: 'typed-v1', originalName: 'brief.txt', extraction: { sha256: 'a'.repeat(64), segments: [{ id: 'seg', text: 'Toán 11 Dãy số. T11.18 T11.19 Phân biệt dãy hữu hạn/vô hạn; bốn cách biểu diễn dãy số.' }], uncertainties: [] } };
const legacyConsent = { confirmed: true, sourceId: source.id, sourceSha256: source.sha256, parserRevision: source.parserRevision, extractionHash: source.extractionHash };
const settings = { subject: 'math', grade: 11, slotMinutes: 40, scope: { lessonId: 'g11-sequences', sectionIds: ['tds-g11-38'] } };
const env = { LESSON_AI_ENABLED: 'true', LESSON_AI_ENDPOINT: 'https://provider.invalid/chat', LESSON_AI_MODEL: 'fake-model', LESSON_AI_API_KEY: 'FAKE_ONLY' };
const candidate = () => ({ package: structuredClone(pilot), citations: [...pilot.objectives, ...pilot.activities, ...pilot.tasks, ...pilot.hints, ...pilot.evidenceRules].map(entity => ({ entityId: entity.id, segmentId: 'seg', quote: source.extraction.segments[0].text, origin: 'adapted' })), uncertainties: [] });
async function fixture(generate = async () => candidate(), selectedSource = source) {
  const database = new DatabaseSync(':memory:');
  for (const file of (await readdir(new URL('../drizzle/', import.meta.url))).filter(f => /^\d{4}_.*\.sql$/.test(f)).sort()) database.exec(await readFile(new URL('../drizzle/' + file, import.meta.url), 'utf8'));
  database.prepare('INSERT INTO accounts(id,email,created_at)VALUES(?,?,?)').run('teacher', 'scope@example.invalid', 0);
  database.prepare('INSERT INTO lesson_sources(id,owner_account_id,request_id,request_fingerprint,original_name,mime,bytes,sha256,status,parser_revision,extraction_hash,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(source.id, 'teacher', 'upload', 'c'.repeat(64), source.originalName, 'text/plain', 100, source.sha256, 'ready', source.parserRevision, source.extractionHash, 0, 0);
  const db = { prepare: sql => ({ bind: (...args) => ({ first: () => database.prepare(sql).get(...args) || null, run: () => ({ meta: { changes: Number(database.prepare(sql).run(...args).changes) } }) }) }) };
  const sourceService = { get: async (owner, sourceId) => { if (owner !== 'teacher' || sourceId !== selectedSource.id) throw Error('NOT_FOUND'); return structuredClone(selectedSource); } };
  const service = createLessonGenerationService({ db, sourceService, generate, providerEndpoint: env.LESSON_AI_ENDPOINT, now: () => 1000 });
  return { service, database, sourceService };
}
function multiFixture() {
 const lessons=catalogue.lessons.slice(0,2),sections=lessons.map(lesson=>lesson.sections[0]);
 const selectedSource=structuredClone(source);selectedSource.extraction.segments[0].text=lessons.map((lesson,i)=>lesson.title+'. '+sections[i].title+'. Tính 1 + 1.').join('\n');
 const selectedSettings={subject:'math',grade:11,slotMinutes:40,scope:{selections:lessons.map((lesson,i)=>({lessonId:lesson.id,sectionIds:[sections[i].id]}))}};
 const pkg=createPackageDraft({id:'multi-draft',subject:'math',grade:11,curriculumRefs:[],prerequisites:[],sourceRefs:[{id:'src',kind:'external',locator:'src',label:'Source',verification:'teacher_review_required'}],essentialQuestion:'Ôn tập hai phần',rubric:{criteria:[],lookFor:[]}});
 for(let i=0;i<2;i++){
  const objectiveId='obj'+i, scopeSectionId=lessons[i].id+'/'+sections[i].id;pkg.objectives.push({id:objectiveId,code:'LO'+i,level:'must',statement:'Tính 1 + 1',prerequisiteIds:[],metadata:{scopeSectionId}});
  for(const phase of ['guided','formation','practice','recheck','exit']){
   const taskId='task-'+i+'-'+phase,activityId='act-'+i+'-'+phase,evidenceId='ev-'+i+'-'+phase;
   pkg.activities.push({id:activityId,phase,budgetRole:'core',minutes:4,objectiveIds:[objectiveId],taskIds:[taskId],participation:'individual',studentAction:'Tính',expectedProduct:'Kết quả',teacherLookFor:'Thay đúng',evidenceIds:[evidenceId],supportIds:[],transition:''});
   pkg.tasks.push({id:taskId,type:'closed',activityId,objectiveIds:[objectiveId],participation:'individual',prompt:phase+' phần '+String.fromCharCode(65+i)+': Tính 1 + 1.',sourceRefs:['src'],evidenceIds:[evidenceId],evaluation:{checkerId:'numeric_exact',answerKey:2},isCore:false,requiresFullScaffold:false,supportRationale:'',minutes:4,hintIds:[],branch:'shared',metadata:{scopeSectionId}});
   pkg.evidenceRules.push({id:evidenceId,taskId,objectiveIds:[objectiveId],kind:phase==='guided'?'precheck':phase==='recheck'?'individual_recheck':phase==='exit'?'exit':'practice',individual:true,countsForMastery:['recheck','exit'].includes(phase)});
  }
 }
 pkg.budget={slotMinutes:40,coreMinutes:40,reserveMinutes:0,optionalMinutes:0,transitionMinutes:0};pkg.contentHash=hashPackage(pkg);
 const output=()=>({package:structuredClone(pkg),citations:[...pkg.objectives,...pkg.activities,...pkg.tasks,...pkg.evidenceRules].map(entity=>({entityId:entity.id,segmentId:'seg',quote:'Tính 1 + 1.',origin:'source'})),uncertainties:[]});
 return{selectedSource,selectedSettings,output};
}
test('multi-lesson source scope reaches consent/job/draft with section coverage; missing source or outside IDs fail closed',async()=>{
 const{selectedSource,selectedSettings,output}=multiFixture();let seen;
 const{service,sourceService}=await fixture(async input=>{seen=input;return output();},selectedSource);
 const binding=await service.consent({ownerAccountId:'teacher',sourceId:'src',settings:selectedSettings,model:'fake-model'});assert.equal(binding.scope.format,'lesson-generation-scope-v2');
 const job=await service.start({ownerAccountId:'teacher',sourceId:'src',settings:selectedSettings,model:'fake-model',requestId:'multi'});
 const done=await service.run({ownerAccountId:'teacher',id:job.id,aiConsent:{...binding.aiConsent,confirmed:true}});
 assert.equal(done.result.validation.ok,true,JSON.stringify(done.result.validation.errors));assert.equal(done.result.scope.lessonIds.length,2);assert.equal(done.result.package.status,'needs_review');assert.equal(seen.scope.sections.length,2);
 sourceService.get=async()=>source;await assert.rejects(()=>service.consent({ownerAccountId:'teacher',sourceId:'src',settings:selectedSettings,model:'fake-model'}),/SCOPE_SOURCE_MISMATCH/);
 for(const mutate of [pkg=>{pkg.tasks[0].metadata.scopeSectionId='outside';},pkg=>{pkg.evidenceRules.find(rule=>rule.taskId==='task-1-exit').countsForMastery=false;},pkg=>{pkg.objectives[0].code='T11.999';}]){
  const invalid=await fixture(async()=>{const candidate=output();mutate(candidate.package);return candidate;},selectedSource);
  const approved=await invalid.service.consent({ownerAccountId:'teacher',sourceId:'src',settings:selectedSettings,model:'fake-model'}),queued=await invalid.service.start({ownerAccountId:'teacher',sourceId:'src',settings:selectedSettings,model:'fake-model',requestId:'badmulti'});
  const result=await invalid.service.run({ownerAccountId:'teacher',id:queued.id,aiConsent:{...approved.aiConsent,confirmed:true}});assert.equal(result.result.validation.ok,false);assert.ok(result.result.validation.errors.some(error=>error.code==='ERR_PROPOSAL_SCOPE_MISMATCH'));
 }
});
test('multi-scope provider binds selected section IDs and asks for review without silently cutting checks',async()=>{
 const{selectedSource,selectedSettings}=multiFixture(),{service}=await fixture(undefined,selectedSource);
 const binding=await service.consent({ownerAccountId:'teacher',sourceId:'src',settings:selectedSettings,model:'fake-model'});let body;
 await generateLessonCandidate({source:selectedSource,settings:selectedSettings,scope:binding.scope,model:'fake-model',aiConsent:{...binding.aiConsent,confirmed:true}},{env,fetchImpl:async(url,request)=>{body=JSON.parse(request.body);return new Response(JSON.stringify({choices:[{message:{content:'{}'},finish_reason:'stop'}]}),{headers:{'content-type':'application/json'}});}});
 assert.match(body.messages[0].content,/scopeSectionId/);assert.match(body.messages[0].content,/không cắt/);assert.match(body.messages[0].content,/ÔN TẬP NHIỀU BÀI/);assert.deepEqual(JSON.parse(body.messages[1].content).scope.sectionIds,binding.scope.sectionIds);
});
test('multi-review rejects stale consent for changed sections and over-budget draft without trimming checks',async()=>{
 const {selectedSource,selectedSettings,output}=multiFixture();let calls=0;
 const{service}=await fixture(async()=>{calls++;const candidate=output();candidate.package.budget.coreMinutes=80;for(const activity of candidate.package.activities)activity.minutes=8;return candidate;},selectedSource);
 const binding=await service.consent({ownerAccountId:'teacher',sourceId:'src',settings:selectedSettings,model:'fake-model'});
 const job=await service.start({ownerAccountId:'teacher',sourceId:'src',settings:selectedSettings,model:'fake-model',requestId:'budget-multi'});
 await assert.rejects(()=>service.run({ownerAccountId:'teacher',id:job.id,aiConsent:{...binding.aiConsent,confirmed:true,scopeFingerprint:'0'.repeat(64)}}),/AI_CONSENT_REQUIRED/);assert.equal(calls,0);
 const done=await service.run({ownerAccountId:'teacher',id:job.id,aiConsent:{...binding.aiConsent,confirmed:true}});assert.equal(done.result.validation.ok,false);assert.ok(done.result.validation.errors.some(error=>error.code==='ERR_TIME_BUDGET_MISMATCH'));assert.equal(done.result.package.evidenceRules.filter(rule=>rule.countsForMastery).length,4);
 await assert.rejects(()=>service.consent({ownerAccountId:'teacher',sourceId:'src',settings:{...selectedSettings,grade:12},model:'fake-model'}),/INVALID_SETTINGS/);
});

test('scoped generation requests carry only trusted catalogue fields, consent and durable scope', async () => {
  let seen;
  const { service } = await fixture(async input => { seen = input; return candidate(); });
  const binding = await service.consent({ ownerAccountId: 'teacher', sourceId: source.id, settings, model: 'fake-model' });
  assert.equal(binding.aiConsent.confirmed, false); assert.match(binding.aiConsent.scopeFingerprint, /^[a-f0-9]{64}$/);
  const job = await service.start({ ownerAccountId: 'teacher', sourceId: source.id, settings, model: 'fake-model', requestId: 'scope' });
  assert.equal(job.scopeFingerprint, binding.aiConsent.scopeFingerprint);
  await assert.rejects(() => service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent: legacyConsent }), /AI_CONSENT_REQUIRED/);
  const done = await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent: { ...binding.aiConsent, confirmed: true } });
  assert.equal(done.result.validation.ok, true, JSON.stringify(done.result.validation.errors));
  assert.deepEqual(done.result.scope.objectiveCodes, ['T11.18', 'T11.19']);
  assert.deepEqual(seen.scope.objectiveCodes, ['T11.18', 'T11.19']);
  assert.equal(done.result.requiresTeacherReview, true);
});

test('out-of-scope objectives cannot be accepted, missing source sections fail before a provider call', async () => {
  const { service, sourceService } = await fixture(async () => { const output = candidate(); output.package.objectives[1].code = 'T11.99'; return output; });
  const binding = await service.consent({ ownerAccountId: 'teacher', sourceId: source.id, settings, model: 'fake-model' });
  const job = await service.start({ ownerAccountId: 'teacher', sourceId: source.id, settings, model: 'fake-model', requestId: 'outside' });
  const result = await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent: { ...binding.aiConsent, confirmed: true } });
  assert.equal(result.result.validation.ok, false);
  assert.ok(result.result.validation.errors.some(i => i.code === 'ERR_PROPOSAL_SCOPE_MISMATCH'));
  sourceService.get = async () => ({ ...source, extraction: { ...source.extraction, segments: [{ id: 'seg', text: 'Một chủ đề khác.' }] } });
  await assert.rejects(() => service.start({ ownerAccountId: 'teacher', sourceId: source.id, settings, model: 'fake-model', requestId: 'bad-source' }), /SCOPE_SOURCE_MISMATCH/);
});

test('provider prompt limits known sections and refuses a forged descriptor or stale scope consent', async () => {
  const { service } = await fixture();
  const binding = await service.consent({ ownerAccountId: 'teacher', sourceId: source.id, settings, model: 'fake-model' });
  let sent;
  const fetchImpl = async (url, options) => { sent = JSON.parse(options.body); return Response.json({ choices: [{ message: { content: '{}' }, finish_reason: 'stop' }] }); };
  await generateLessonCandidate({ source, settings, scope: binding.scope, model: 'fake-model', aiConsent: { ...binding.aiConsent, confirmed: true } }, { env, fetchImpl });
  assert.match(sent.messages[0].content, /PHẠM VI ĐÃ CHỌN/);
  assert.match(sent.messages[0].content, /T11\.18/); assert.match(sent.messages[0].content, /T11\.19/);
  assert.deepEqual(JSON.parse(sent.messages[1].content).scope.sectionIds, ['tds-g11-38']);
  await assert.rejects(() => generateLessonCandidate({ source, settings, scope: { ...binding.scope, objectiveCodes: ['FAKE'] }, model: 'fake-model', aiConsent: { ...binding.aiConsent, confirmed: true } }, { env, fetchImpl }), /INVALID_SETTINGS/);
});

test('legacy typed briefs retain five-field consent and the existing settings result', async () => {
  const { service } = await fixture();
  const original = { subject: 'math', grade: 11, slotMinutes: 40 };
  const job = await service.start({ ownerAccountId: 'teacher', sourceId: source.id, settings: original, model: 'fake-model', requestId: 'legacy' });
  const result = await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent: legacyConsent });
  assert.deepEqual(result.settings, original); assert.equal(result.result.scope, undefined); assert.equal(result.result.validation.ok, true);
});

test('unverified PPCT scopes require source section text and reject invented official objective codes', async () => {
  const unknown = { subject: 'math', grade: 11, slotMinutes: 40, scope: { lessonId: 'g11-trig-formulas', sectionIds: ['tds-g11-8'] } };
  const { service, sourceService } = await fixture(async () => { const output = candidate(); output.package.objectives.forEach((objective, i) => { objective.code = 'T11.' + (90 + i); }); output.citations.forEach(citation => { citation.quote = 'Toán 11 Công thức lượng giác. Công thức cộng.'; }); return output; });
  sourceService.get = async () => ({ ...source, extraction: { ...source.extraction, segments: [{ id: 'seg', text: 'Toán 11 Công thức lượng giác. Công thức cộng.' }] } });
  const binding = await service.consent({ ownerAccountId: 'teacher', sourceId: source.id, settings: unknown, model: 'fake-model' });
  assert.deepEqual(binding.scope.objectiveCodes, []);
  const job = await service.start({ ownerAccountId: 'teacher', sourceId: source.id, settings: unknown, model: 'fake-model', requestId: 'unknown-codes' });
  const result = await service.run({ ownerAccountId: 'teacher', id: job.id, aiConsent: { ...binding.aiConsent, confirmed: true } });
  assert.equal(result.result.validation.ok, false);
  assert.ok(result.result.validation.errors.some(i => i.code === 'ERR_PROPOSAL_SCOPE_MISMATCH'));
  assert.ok(result.result.uncertainties.includes('OBJECTIVES_REQUIRE_TEACHER_CONFIRMATION'));
});

test('a changed provider endpoint or model cannot reuse scoped consent or the same request ID', async () => {
  const { service, database, sourceService } = await fixture();
  const binding = await service.consent({ ownerAccountId: 'teacher', sourceId: source.id, settings, model: 'fake-model' });
  const job = await service.start({ ownerAccountId: 'teacher', sourceId: source.id, settings, model: 'fake-model', requestId: 'bound' });
  await assert.rejects(() => service.start({ ownerAccountId: 'teacher', sourceId: source.id, settings, model: 'other-model', requestId: 'bound' }), /REQUEST_ID_CONFLICT/);
  const db = { prepare: sql => ({ bind: (...args) => ({ first: () => database.prepare(sql).get(...args) || null, run: () => ({ meta: { changes: Number(database.prepare(sql).run(...args).changes) } }) }) }) };
  const changed = createLessonGenerationService({ db, sourceService, generate: async () => { throw Error('SHOULD_NOT_CALL'); }, providerEndpoint: 'https://changed.invalid/chat', now: () => 1000 });
  const result = await changed.run({ ownerAccountId: 'teacher', id: job.id, aiConsent: { ...binding.aiConsent, confirmed: true } });
  assert.equal(result.status, 'failed'); assert.equal(result.errorCode, 'AI_CONSENT_REQUIRED');
});

test('curated pilot scopes split both approved exit parts into valid source-backed drafts', () => {
  const before = JSON.stringify(pilot);
  for (const objectiveId of ['obj-t11-18', 'obj-t11-19']) {
    const result = createPilotLessonScope(pilot, { objectiveIds: [objectiveId] });
    assert.equal(result.ok, true, JSON.stringify(result.issues));
    assert.equal(result.package.status, 'needs_review');
    assert.equal(result.package.objectives.length, 1); assert.equal(result.package.objectives[0].id, objectiveId);
    assert.equal(result.package.contentHash, hashPackage(result.package));
    assert.equal(validateLessonPackage(result.package).ok, true);
    assert.ok(result.package.tasks.every(task => task.objectiveIds.length === 1));
    assert.ok(result.package.tasks.find(task => task.id.startsWith('task-exit-scope-')).metadata.sourceCitation.quote.includes('Phiếu Exit Ticket'));
    assert.ok(result.package.sourceRefs.every(source => source.verification === 'teacher_review_required'));
  }
  assert.equal(JSON.stringify(pilot), before);
  assert.equal(createPilotLessonScope({ ...pilot, contentHash: 'bad' }, { objectiveIds: ['obj-t11-18'] }).ok, false);
  assert.equal(createPilotLessonScope(pilot, { objectiveIds: ['unknown'] }).ok, false);
  const approved = structuredClone(pilot); approved.status = 'approved'; approved.version = '1.1.1'; approved.sourceRefs.forEach(source => { source.verification = 'verified'; }); approved.contentHash = hashPackage(approved);
  assert.equal(createPilotLessonScope(approved, { objectiveIds: ['obj-t11-18'] }).ok, true);
  approved.tasks[0].prompt = 'Different math'; approved.contentHash = hashPackage(approved);
  assert.equal(createPilotLessonScope(approved, { objectiveIds: ['obj-t11-18'] }).ok, false);
});

test('scope route requires authentication, resolves trusted descriptors and returns curated partial drafts', async () => {
  const context = createContext({ Request, Response, TextEncoder, TextDecoder, JSON, Object, Error, Array });
  const cache = new Map();
  const make = (exports, identifier) => new SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context, identifier });
  async function load(path) {
    if (cache.has(path)) return cache.get(path);
    const normalized = path.replaceAll('\\', '/'); let mod;
    if (normalized.endsWith('/lib/account-room-access.js')) mod = make({ resolveIdentity: req => ({ user: req.headers.get('x-test-user') ? { userId: 'teacher' } : null }) }, path);
    else if (normalized.endsWith('/lib/storage.js')) mod = make({ getEnv: () => ({}) }, path);
    else if (normalized.endsWith('/lib/lesson/content-map.js')) mod = make(await import('../lib/lesson/content-map.js'), path);
    else if (path.endsWith('.json')) mod = make({ default: JSON.parse(await readFile(path, 'utf8')) }, path);
    else mod = new SourceTextModule(await readFile(path, 'utf8'), { context, identifier: path });
    cache.set(path, mod); return mod;
  }
  const route = await load(resolve('app/api/lessons/scope/route.js'));
  await route.link((specifier, mod) => load(resolve(dirname(mod.identifier), specifier))); await route.evaluate();
  const post = (body, auth = true) => route.namespace.POST(new Request('https://test/api/lessons/scope', { method: 'POST', headers: { 'content-type': 'application/json', ...(auth ? { 'x-test-user': 'teacher' } : {}) }, body: JSON.stringify(body) }));
  assert.equal((await post({ scope: settings.scope }, false)).status, 401);
  assert.equal((await post({ scope: { ...settings.scope, objectiveCodes: ['FAKE'] } })).status, 422);
  assert.equal((await post({ scope: settings.scope, package: pilot })).status, 400);
  const result = await post({ package: pilot, selection: { objectiveIds: ['obj-t11-18'] } });
  assert.equal(result.status, 200); assert.equal((await result.json()).package.objectives.length, 1);
});

test('typed scope briefs can use trusted pilot objective codes without typing them into the source', async () => {
  const { service, sourceService } = await fixture();
  const one = { ...settings, scope: { lessonId: 'g11-sequences', sectionIds: ['obj-t11-18'] } };
  sourceService.get = async () => ({ ...source, extraction: { ...source.extraction, segments: [{ id: 'seg', text: 'Toán 11, Dãy số: nhận biết dãy số hữu hạn, vô hạn.' }] } });
  const binding = await service.consent({ ownerAccountId: 'teacher', sourceId: source.id, settings: one, model: 'fake-model' });
  assert.deepEqual(binding.scope.objectiveCodes, ['T11.18']);
  sourceService.get = async () => ({ ...source, extraction: { ...source.extraction, segments: [{ id: 'seg', text: 'Toán 11, Cấp số cộng: số hạng tổng quát.' }] } });
  await assert.rejects(() => service.consent({ ownerAccountId: 'teacher', sourceId: source.id, settings: one, model: 'fake-model' }), /SCOPE_SOURCE_MISMATCH/);
});

test('generation start snapshots validated scope IDs before awaiting source storage', async () => {
  const { service, sourceService } = await fixture();
  let release;
  sourceService.get = () => new Promise(resolve => { release = resolve; });
  const requestSettings = structuredClone(settings);
  const pending = service.start({ ownerAccountId: 'teacher', sourceId: source.id, settings: requestSettings, model: 'fake-model', requestId: 'snapshot' });
  requestSettings.scope.sectionIds = ['FORGED_AFTER_VALIDATION'];
  release(structuredClone(source));
  const job = await pending;
  assert.deepEqual(job.settings.scope.sectionIds, ['tds-g11-38']);
});
