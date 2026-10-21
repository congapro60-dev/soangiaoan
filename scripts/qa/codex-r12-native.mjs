import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = resolve(import.meta.dirname, '../..');
const buildRoot = resolve(process.env.TAKEOVER_BUILD_ROOT || join(root, '.sites-runtime/takeover-candidate-20261011'));
assert.equal(buildRoot, resolve(root, '.sites-runtime/takeover-candidate-20261011'), 'R1 QA requires isolated candidate');
const directory = join(root, '.sites-runtime/r10-native-qa', new Date().toISOString().replace(/[:.]/g, '-'));
const artifact = join(root, 'tasks/codex-r12-native.json');
const sha = value => createHash('sha256').update(value).digest('hex');
const secrets = new Set();
const secret = value => { if (value) secrets.add(value); return value; };
const clean = error => { let text = String(error?.stack || error); for (const value of secrets) text = text.replaceAll(value, '[redacted]'); return text.slice(0, 2000); };
const bearer = token => ({ Authorization: 'Bearer ' + token });
const owner = 'qa-r1-' + Date.now();
const teacher = { 'oai-authenticated-user-id': owner, 'oai-authenticated-user-email': owner + '@example.invalid' };
const report = { generatedAt:new Date().toISOString(),result:'HOLD',productionTouched:false,externalRequests:0,persistence:directory,checks:[],stages:[],limits:['Local synthetic Worker/D1 only; no real classroom or production data.','Clock and position fixtures explicitly staged in local D1 for boundary tests.'] };
let mf, database, serial = 0;
const rid = prefix => 'qa-r1-' + prefix + '-' + ++serial;
const stage = name => { report.stages.push({ name, checks: report.checks.length, result: 'PASS' }); console.log(JSON.stringify(report.stages.at(-1))); };
await mkdir(directory, { recursive: true });
try {
  const require = createRequire(import.meta.url);
  const { Miniflare } = await import(pathToFileURL(require.resolve('miniflare', { paths: [require.resolve('wrangler')] })).href);
  const workerDir = join(buildRoot, 'dist/server');
  const files = (await readdir(workerDir, { recursive: true })).filter(file => file.endsWith('.js')).sort();
  const parts = await Promise.all(files.map(async file => ({ path: file, sha256: sha(await readFile(join(workerDir, file))) })));
  report.worker = { buildRoot, entrySha256: parts.find(part => part.path === 'index.js')?.sha256, treeSha256: sha(JSON.stringify(parts)), modules: parts.length, runtime: 'actual compiled candidate in workerd/D1/R2' };
  mf = new Miniflare({ rootPath: workerDir, modules: ['index.js', ...files.filter(file => file !== 'index.js')].map(file => ({ type: 'ESModule', path: join(workerDir, file) })), compatibilityDate: '2026-05-15', compatibilityFlags: ['nodejs_compat'], d1Databases: { DB: 'r10-native-qa' }, d1Persist: join(directory, 'd1'), r2Buckets: { LESSON_SOURCES: 'r10-native-qa' }, r2Persist: join(directory, 'r2'), host: '127.0.0.1', port: 0, outboundService: () => { report.externalRequests++; return new Response('External disabled', { status: 403 }); } });
  const base = String(await mf.ready).replace(/\/$/, '');
  assert.equal(new URL(base).hostname, '127.0.0.1');
  database = await mf.getD1Database('DB');
  const journal = JSON.parse(await readFile(join(buildRoot, 'drizzle/meta/_journal.json'), 'utf8')).entries;
  report.migrations = journal.map(entry => entry.tag);
  for (const entry of journal) for (const sql of (await readFile(join(buildRoot, 'drizzle', entry.tag + '.sql'), 'utf8')).split('--> statement-breakpoint')) if (sql.trim()) await database.prepare(sql).run();
  async function api(path, body, headers = teacher, expected = 200) {
    const start = Date.now();
    const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json();
    const check = { path: path.split('?')[0], action: body?.action || 'GET', type: body?.event?.type, status: response.status, expected, ms: Date.now() - start, ...(data.error ? { error: data.error } : {}) };
    report.checks.push(check);
    assert.equal(response.status, expected, JSON.stringify(check));
    return data;
  }

  const cls = (await api('/api/lesson-classes', { action: 'create', title: 'Lớp giả R1', requestId: rid('class') })).class; secret(cls.code);
  const pupils = [];
  for (let i = 0; i < 4; i++) {
    const p = await api('/api/lesson-classes', { action: 'member-add', classId: cls.id, name: 'HS giả R1 ' + i, requestId: rid('member') });
    secret(p.pin); secret(p.member.code);
    const login = await api('/api/lesson-classes', { action: 'join', classCode: cls.code, memberCode: p.member.code, pin: p.pin }, {}); secret(login.token);
    pupils.push({ member: p.member, classToken: login.token, token: secret(randomBytes(32).toString('base64url')) });
  }
  const pkgBytes = await readFile(join(buildRoot, 'content/lessons/g11-sequences-p1.json'));
  const pkg = JSON.parse(pkgBytes);
  report.package = { source: 'content/lessons/g11-sequences-p1.json', sha256: sha(pkgBytes), modifications: ['Synthetic ID/version only; reserve3/slot41 with matching reserveactivity; source review acknowledged by synthetic teacher'] };
  pkg.id = 'qa-r10-native'; pkg.version = '0.0.1'; pkg.status = 'draft'; delete pkg.contentHash;
  pkg.budget.reserveMinutes = 3; pkg.budget.slotMinutes = 41; pkg.activities.find(a => a.budgetRole === 'reserve').minutes = 3;
  const saved = await api('/api/lessons', { action: 'save', package: pkg });
  const approved = await api('/api/lessons', { action: 'approve', id: saved.row.rowId, parentHash: saved.row.contentHash, version: '0.0.2', sourceReviewAck: pkg.sourceRefs.map(ref => ({ ...ref, numericReviewConfirmed: true })) });
  const director = await api('/api/lessons?kind=director&id=' + approved.row.rowId);
  const plan = await api('/api/lessons', { action: 'approve-plan', packageRowId: approved.row.rowId, packageVersion: approved.row.version, packageHash: approved.row.contentHash, planHash: director.plan.contentHash, sourceReview: approved.package.sourceRefs });
  const tuple = { packageRowId: approved.row.rowId, packageVersion: approved.row.version, packageHash: approved.row.contentHash, planRowId: plan.row.rowId, planHash: plan.row.planHash, classId: cls.id, mode: 'live' };
  const {recommendTeacherSetup}=await import('../../lib/lesson/teacher-setup.js');
  const teacherSetup={...recommendTeacherSetup(pkg),rule:'treasure',participation:'individual'};
  const createInput={action:'create',...tuple,title:'QA R12 reading and setup',requestId:rid('room'),teacherSetup};
  const created=await api('/api/lesson-sessions',createInput);secret(created.session.code);secret(created.presenterToken);
  assert.equal((await api('/api/lesson-sessions',createInput)).replay,true);
  await api('/api/lesson-sessions',{...createInput,teacherSetup:{...teacherSetup,rule:'relay'}},teacher,409);
  await api('/api/lesson-sessions',{...createInput,requestId:rid('bad-setup'),teacherSetup:{...teacherSetup,admin:true}},teacher,400);
  const sid=created.session.id,players=[];
  for(const p of pupils.slice(0,3)){const token=secret(randomBytes(32).toString('base64url'));const joined=await api('/api/lesson-sessions',{action:'join',code:created.session.code,classToken:p.classToken,name:'Synthetic',requestId:rid('join')},bearer(token));players.push({id:joined.learnerId,token});}
  let get=async(headers=teacher,actor)=> (await api('/api/lesson-sessions?id='+sid+(actor?'&actingLearnerId='+actor:''),undefined,headers)).view;
  const post=async(type,payload={},headers=teacher,expected=200,actor,extra={})=>{const v=await get(headers,actor);return api('/api/lesson-sessions',{action:'event',id:sid,...(actor?{actingLearnerId:actor}:{}),event:{type,payload,eventId:rid(type),round:v.round,revision:v.revision,activityId:v.timeline.currentActivityId,...extra}},headers,expected);};
  const pupil=bearer(players[0].token);
  assert.deepEqual((await get()).teacherSetup,teacherSetup);
  assert.equal((await get(pupil)).teacherSetup,undefined);
  assert.ok((await get()).exploration.cards.every(c=>c.body&&c.sourceLabel));
  assert.ok((await get(pupil)).exploration.cards.every(c=>c.sourceLabel===undefined&&c.sourceUrl===undefined&&c.options===undefined&&c.question===undefined));
  assert.deepEqual((await get(pupil)).tasks,[]);assert.equal((await get(pupil)).currentActivity,null);
  const tv=()=>api('/api/lesson-sessions?id='+sid+'&kind=presenter',undefined,bearer(created.presenterToken));
  assert.deepEqual((await tv()).view.tasks,[]);
  await post('EXPLORATION_CONFIG',{enabled:true},pupil,400);
  await post('EXPLORATION_CONFIG',{enabled:true});await post('START');assert.equal((await get()).lessonMode.rule,'treasure');await post('SET_MODE',{rule:'campaign',participation:'individual'});assert.equal((await get()).lessonMode.rule,'campaign');
  await post('EXPLORATION_WINDOW',{open:true});
  assert.ok((await get(pupil)).exploration.cards.every(c=>c.body));
  await post('EXPLORATION_REFLECT',{cardId:'sequence-domain',choice:0},pupil,400);
  await post('EXPLORATION_REFLECT',{cardId:'constructor',choice:0},pupil,400);
  await post('EXPLORATION_REFLECT',{cardId:'sequence-domain',choice:0,learnerId:players[1].id},pupil,400);
  await post('EXPLORATION_REFLECT',{cardId:'sequence-domain',choice:0},pupil,400,undefined,{activityId:'stale'});
  const {packLessonState,unpackLessonState}=await import('../../lib/lesson/state-storage.js');
  const load=async()=>unpackLessonState(JSON.parse((await database.prepare('SELECT state FROM lesson_sessions WHERE id=?').bind(sid).first()).state));
  const save=async s=>database.prepare('UPDATE lesson_sessions SET state=? WHERE id=?').bind(JSON.stringify(packLessonState(s)),sid).run();
  const point=(await get(pupil)).exploration.points[0];while((await get()).timeline.activityIndex<Math.floor(point.position/8))await post('NEXT');
  let stored=await load();let hash=0;for(const ch of `${stored.seed}:${players[0].id}:${stored.diceTrack[players[0].id].rolls}`)hash=(hash*31+ch.charCodeAt(0))>>>0;
  stored.diceTrack[players[0].id].position=point.position-(1+hash%6);stored.diceTrack[players[0].id].carry=0;await save(stored);
  await post('ROLL',{},pupil);assert.ok((await get(pupil)).exploration.cards.find(c=>c.id===point.id).found);
  await post('EXPLORATION_WINDOW',{open:true});
  const before=await load(),view=await get(pupil),event={type:'EXPLORATION_READ',payload:{cardId:point.id},eventId:rid('claim'),round:view.round,revision:view.revision,activityId:view.timeline.currentActivityId};
  await api('/api/lesson-sessions',{action:'event',id:sid,event},pupil);const replay=await api('/api/lesson-sessions',{action:'event',id:sid,event},pupil);assert.equal(replay.result.replay,true);
  await api('/api/lesson-sessions',{action:'event',id:sid,event:{...event,eventId:rid('stale')}},pupil,400);
  await post('EXPLORATION_REFLECT',{cardId:point.id,choice:0},pupil);assert.equal((await load()).exploration.learners[players[0].id].choices[(await get(pupil)).exploration.cards.findIndex(c=>c.id===point.id)],null);
  const after=await load();assert.deepEqual(after.passports,before.passports);assert.deepEqual(after.gameWallets,before.gameWallets);
  const shared=await api('/api/lesson-devices',{action:'create',sessionId:sid,kind:'B',memberIds:players.slice(0,2).map(p=>p.id),requestId:rid('device')});secret(shared.token);
  await post('EXPLORATION_REFLECT',{cardId:point.id,choice:1},bearer(shared.token),200,players[0].id);
  assert.equal((await get(bearer(shared.token),players[1].id)).exploration.fragments,0);
  await api('/api/lesson-sessions?id='+sid+'&actingLearnerId='+players[2].id,undefined,bearer(shared.token),403);
  assert.equal(Object.hasOwn((await tv()).view,'exploration'),false);
  await post('SET_VALUES',{integrationIds:[],aiPolicy:'off'});assert.deepEqual((await get()).lessonIntegrations,[]);assert.deepEqual((await get()).teacherSetup,teacherSetup);assert.deepEqual((await get()).lessonIntegrations,[]);
  await post('PAUSE');await post('EXPLORATION_REFLECT',{cardId:point.id,choice:1},pupil,400);await post('RESUME');
  stored=await load();stored.exploration.usedMs=120000;await save(stored);
  assert.equal((await get(pupil)).exploration.open,false);await post('EXPLORATION_REFLECT',{cardId:point.id,choice:1},pupil,400);
  stored=await load();stored.exploration.usedMs=0;stored.exploration.openedAtActiveMs=null;stored.exploration.learners[players[0].id].found=7;await save(stored);
  report.rewardFixture='Explicit synthetic found-mask7 for reward boundary; earlier discovery separately proven by actual ROLL, no dice probability claim';
  await post('EXPLORATION_WINDOW',{open:true});
  for(const card of (await get(pupil)).exploration.cards)await post('EXPLORATION_READ',{cardId:card.id},pupil);
  const fullReward=await get(pupil);assert.equal(fullReward.exploration.fragments,3);assert.equal(fullReward.exploration.rewardUnlocked,true);assert.equal((await get(bearer(players[1].token))).exploration.rewardUnlocked,false);
  const rewardState=await load();assert.deepEqual(rewardState.passports,before.passports);assert.deepEqual(rewardState.gameWallets,before.gameWallets);
  stage('HTTP trust, discovery, shared actor, replay, expiration and waiting/TV privacy');

  const baseline=JSON.parse(await readFile(join(root,'tasks/codex-r6-load-assess-r1-r9-release.json'),'utf8'));
  const sourceDir=join(baseline.persistence,'d1'),sqlite=(await readdir(sourceDir,{recursive:true})).find(p=>/[0-9a-f]{64}\.sqlite$/.test(p));
  const original=join(sourceDir,sqlite),originalHash=sha(await readFile(original)),prior=new DatabaseSync(original,{readOnly:true});
  try{
    const row=prior.prepare('SELECT state FROM lesson_sessions WHERE id=?').get(baseline.fixture.sessionId),heavy=unpackLessonState(JSON.parse(row.state));
    heavy.exploration={enabled:true,windowActivityId:null,openedAtActiveMs:null,usedMs:120000,learners:Object.fromEntries(Object.keys(heavy.roster).map(id=>[id,{found:7,fragments:7,choices:[2,2,2]}]))};
    heavy.teacherSetup=teacherSetup;
    const bytes=Buffer.byteLength(JSON.stringify(packLessonState(heavy)));assert.ok(bytes<=1572864);assert.equal(Object.keys(heavy.roster).length,150);
    report.capacity={kind:'actual persisted heavy fixture plus bounded maximum exploration, codec measurement only',bytes,headroom:1572864-bytes,learners:150,history:heavy.tutors.history.length,receipts:Object.keys(heavy.classEvent.receipts).length,submissions:Object.keys(heavy.submissions).length};
    const small=await load();
    heavy.hostId=small.hostId;
    await save(heavy);
    await post('PAUSE');await post('RESUME');
    const resaved=await load(),raw=(await database.prepare('SELECT state FROM lesson_sessions WHERE id=?').bind(sid).first()).state;
    assert.deepEqual(resaved.exploration,heavy.exploration);
    assert.equal(resaved.tutors.history.length,900);assert.equal(Object.keys(resaved.classEvent.receipts).length,600);assert.equal(Object.keys(resaved.submissions).length,1650);
    assert.ok(Buffer.byteLength(raw)<=1572864);
    Object.assign(report.capacity,{kind:'seeded150 maximum exploration plus released combined heavy fixture; actual newWorker teacher GET/PAUSE/RESUME/D1resave',resavedBytes:Buffer.byteLength(raw),resavedHeadroom:1572864-Buffer.byteLength(raw),academicAuditPreserved:true,actualHttpCommands:2});
    await save(small);
  }finally{prior.close();assert.equal(sha(await readFile(original)),originalHash);}
  stage('Combined prior heavy fixture maximum exploration fits 1.5MiB');

  const beforeRollback=(await load()).exploration,setupBeforeRollback=(await load()).teacherSetup;await mf.dispose();mf=null;
  const oldDir=join(root,'.sites-runtime/release-r1-r9-20261012/dist/server'),oldFiles=(await readdir(oldDir,{recursive:true})).filter(p=>p.endsWith('.js')).sort();
  report.rollbackWorkerSha256=sha(await readFile(join(oldDir,'index.js')));
  mf=new Miniflare({rootPath:oldDir,modules:['index.js',...oldFiles.filter(p=>p!=='index.js')].map(p=>({type:'ESModule',path:join(oldDir,p)})),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'r10-native-qa'},d1Persist:join(directory,'d1'),r2Buckets:{LESSON_SOURCES:'r10-native-qa'},r2Persist:join(directory,'r2'),host:'127.0.0.1',port:0,outboundService:()=>new Response('Disabled',{status:403})});
  const oldBase=String(await mf.ready).replace(/\/$/,'');database=await mf.getD1Database('DB');
  const oldRead=await fetch(oldBase+'/api/lesson-sessions?id='+sid,{headers:teacher});assert.equal(oldRead.status,200);const oldView=(await oldRead.json()).view;
  const oldWrite=await fetch(oldBase+'/api/lesson-sessions',{method:'POST',headers:{...teacher,'Content-Type':'application/json'},body:JSON.stringify({action:'event',id:sid,event:{type:'PAUSE',payload:{},eventId:rid('rollback'),round:oldView.round,revision:oldView.revision,activityId:oldView.timeline.currentActivityId}})});assert.equal(oldWrite.status,200);
  const oldStored=JSON.parse((await database.prepare('SELECT state FROM lesson_sessions WHERE id=?').bind(sid).first()).state);assert.deepEqual(oldStored.exploration,beforeRollback);assert.deepEqual(oldStored.teacherSetup,setupBeforeRollback);
  report.rollback={actualReleasedWorkerReadAndWrite:true,unknownExplorationPreserved:true};stage('Actual version7 Worker reads new state and PAUSE resaves exploration unchanged');
  report.result='PASS';
}catch(error){report.result='FAIL';report.error=clean(error);process.exitCode=1;}finally{if(mf)await mf.dispose();await writeFile(artifact,JSON.stringify(report,null,2));console.log(JSON.stringify({result:report.result,checks:report.checks.length,artifact,...(report.error?{error:report.error}:{})}));}



