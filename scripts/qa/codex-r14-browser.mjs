import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { normalizeLessonProposal } from '../../lib/lesson/proposal-result.js';

// Disposable actual Worker fixture. Teacher and pupil browser origins remain separate.
const root = resolve(import.meta.dirname, '../..');
const buildRoot = resolve(process.env.TAKEOVER_BUILD_ROOT || join(root, '.sites-runtime/takeover-candidate-20261011'));
assert.equal(buildRoot, resolve(root, '.sites-runtime/takeover-candidate-20261011'), 'R1 browser requires exact isolated candidate');
assert.ok(!process.env.TAKEOVER_BUILD_ROOT || /^(?:[A-Za-z]:[\\/]|\/)/.test(process.env.TAKEOVER_BUILD_ROOT), 'TAKEOVER_BUILD_ROOT must be absolute');
const workerDirectory = join(buildRoot, 'dist/server'), assets = join(buildRoot, 'dist/client');
const directory = join(root, '.sites-runtime/r1-browser-qa', new Date().toISOString().replace(/[:.]/g, '-'));
const artifact = join(root, 'tasks/codex-r14-browser-server.json');
const owner = 'qa-r1-browser-' + Date.now();
const teacher = { 'oai-authenticated-user-id': owner, 'oai-authenticated-user-email': owner + '@example.invalid', 'oai-authenticated-user-full-name': 'QA Teacher' };
const teacherPort = 5201, pupilPort = 5202;
const report = { startedAt: new Date().toISOString(), result: 'LOCAL_QA_RUNNING', productionTouched: false, externalRequests: 0, fixture: 'synthetic A10 exam2pupils +teacher/class/members/live individual R10 server-ROLL discovery +concluded own passport; actual Worker/D1/R2', requests: 0, teacherUrl: `http://127.0.0.1:${teacherPort}/qa`, pupilUrl: `http://127.0.0.1:${pupilPort}/qa`, persistence: directory };
const secrets = new Set(), secret = value => { if (value) secrets.add(value); return value; };
const bearer = token => ({ Authorization: 'Bearer ' + token });
const sha = value => createHash('sha256').update(value).digest('hex');
let mf, teacherServer, pupilServer, stopQA, serial = 0;
const rid = prefix => 'browser-' + prefix + '-' + ++serial;
const escape = text => String(text).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
await mkdir(directory, { recursive: true });
try {
  const require = createRequire(import.meta.url), wrangler = require.resolve('wrangler');
  const { Miniflare } = await import(pathToFileURL(require.resolve('miniflare', { paths: [wrangler] })).href);
  const files = (await readdir(workerDirectory, { recursive: true })).filter(file => file.endsWith('.js')).sort();
  report.workerSha256 = sha(await readFile(join(workerDirectory, 'index.js')));
  report.workerTreeSha256 = sha(JSON.stringify(await Promise.all(files.map(async file => ({ path: file, sha256: sha(await readFile(join(workerDirectory, file))) })))));
  report.gobkitASha256 = sha(await readFile(join(assets, 'models/mascot-gobkit-a.glb')));
  report.map3dSha256 = sha(await readFile(join(assets, 'map3d.js')));
  report.buildRoot = buildRoot;
  mf = new Miniflare({ rootPath: workerDirectory, modules: ['index.js', ...files.filter(file => file !== 'index.js')].map(file => ({ type: 'ESModule', path: join(workerDirectory, file) })), compatibilityDate: '2026-05-15', compatibilityFlags: ['nodejs_compat'], d1Databases: { DB: 'r1-browser-qa' }, d1Persist: join(directory, 'd1'), r2Buckets: { LESSON_SOURCES: 'r1-browser-qa' }, r2Persist: join(directory, 'r2'), port: 0, host: '127.0.0.1', outboundService: () => { report.externalRequests++; return new Response('External calls disabled in local browser QA', { status: 403 }); } });
  const base = String(await mf.ready).replace(/\/$/, ''); assert.equal(new URL(base).hostname, '127.0.0.1');
  const database = await mf.getD1Database('DB');
  for (const entry of JSON.parse(await readFile(join(buildRoot, 'drizzle/meta/_journal.json'), 'utf8')).entries) for (const sql of (await readFile(join(buildRoot, 'drizzle', entry.tag + '.sql'), 'utf8')).split('--> statement-breakpoint').filter(part => part.trim())) await database.prepare(sql).run();
  const api = async (path, body, headers = teacher, expected = 200) => {
    const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const result = await response.json(); assert.equal(response.status, expected, path.split('?')[0] + ': ' + result.error); return result;
  };
  const exam = (await api('/api/exams', { action: 'create', requestId: rid('exam'), exam: { title: 'QA R1 — chữ lớn và giờ riêng', durationMin: 60, settings: { graceSeconds: 30 }, questions: [
    { label: 'Câu 1', section: 'I', type: 'mc', text: 'Với $u_n=2n+1$, số hạng $u_2$ bằng bao nhiêu?', options: ['A','B','C','D'], choiceText: { A: '$3$', B: '$5$', C: '$7$', D: '$9$' }, key: 'B', points: 1 },
    { label: 'Câu 2', section: 'II', type: 'tf', text: 'Xét dãy $u_n=2n+1$. Chọn Đúng hoặc Sai cho mỗi nhận định.', statements: ['a','b'], statementText: { a: '$u_1=3$', b: '$u_2=7$' }, key: [true,false], points: 1 },
    { label: 'Câu 3', section: 'III', type: 'short', text: 'Tính $u_3$ của dãy $u_n=2n+1$.', key: { accept: ['7'] }, points: 1 }
  ] } }, teacher, 201)).exam; secret(exam.code);
  await api('/api/exams', { action: 'control', id: exam.id, command: 'open' });
  const examPupils = [];
  for (const name of ['HS giả thi A', 'HS giả thi B']) { const joined = await api('/api/exam-play', { action: 'join', code: exam.code, name }, {}); secret(joined.token); examPupils.push({ ...joined, name }); }
  await api('/api/exams', { action: 'control', id: exam.id, command: 'start' });
  await api('/api/exams', { action: 'accommodation', id: exam.id, attemptId: examPupils[0].attemptId, expectedRevision: 0, extraMinutes: 5, textScale: 1.75 });
  report.examFixture = { examId: exam.id, pupils: 2, durationMinutes: 60, ownExtraMinutes: 5, ownTextScale: 1.75, ordinaryTextScale: 1, integrityNotPreconfirmed: true, nativeAPIsUnmodified: true };
  const cls = (await api('/api/lesson-classes', { action: 'create', title: 'Lớp giả browser QA', requestId: rid('class') })).class; secret(cls.code);
  const team = (await api('/api/lesson-classes', { action: 'team-create', classId: cls.id, title: 'Đội điều tra QA', requestId: rid('team') })).team;
  const pupils = [];
  for (let index = 0; index < 4; index++) {
    const added = await api('/api/lesson-classes', { action: 'member-add', classId: cls.id, teamId: team.id, name: 'HS giả browser ' + (index + 1), requestId: rid('member') }); secret(added.member.code); secret(added.pin);
    const logged = await api('/api/lesson-classes', { action: 'join', classCode: cls.code, memberCode: added.member.code, pin: added.pin }, {}); secret(logged.token);
    pupils.push({ ...added, classToken: logged.token, token: secret(randomBytes(32).toString('base64url')) });
  }
  const pkg = JSON.parse(await readFile(join(buildRoot, 'content/lessons/g11-sequences-p1.json'), 'utf8')); pkg.id = 'qa-takeover-browser'; pkg.version = '0.0.1'; pkg.status = 'draft'; delete pkg.contentHash;
  pkg.budget.reserveMinutes = 3; pkg.budget.slotMinutes = 41; pkg.activities.find(activity => activity.budgetRole === 'reserve').minutes = 3;
  const saved = await api('/api/lessons', { action: 'save', package: pkg });
  const approved = await api('/api/lessons', { action: 'approve', id: saved.row.rowId, parentHash: saved.row.contentHash, version: '0.0.2', sourceReviewAck: pkg.sourceRefs.map(ref => ({ ...ref, numericReviewConfirmed: true })) });
  const draft = await api('/api/lessons?kind=director&id=' + approved.row.rowId);
  const plan = await api('/api/lessons', { action: 'approve-plan', packageRowId: approved.row.rowId, packageVersion: approved.row.version, packageHash: approved.row.contentHash, planHash: draft.plan.contentHash, sourceReview: approved.package.sourceRefs });
  const tuple = { classId: cls.id, mode: 'live', packageRowId: approved.row.rowId, packageVersion: approved.row.version, packageHash: approved.row.contentHash, planRowId: plan.row.rowId, planHash: plan.row.planHash };
  const event = async (room, type, payload = {}, headers = teacher) => {
    const view = (await api('/api/lesson-sessions?id=' + room.session.id, undefined, headers)).view;
    return api('/api/lesson-sessions', { action: 'event', id: room.session.id, event: { type, payload, round: view.round, revision: view.revision, activityId: view.timeline.currentActivityId, eventId: rid(type) } }, headers);
  };
  async function createRoom(title) {
    const room = await api('/api/lesson-sessions', { action: 'create', ...tuple, title, requestId: rid('room') }); secret(room.session.code); secret(room.presenterToken);
    for (const pupil of pupils) { pupil.token = secret(randomBytes(32).toString('base64url')); const joined = await api('/api/lesson-sessions', { action: 'join', code: room.session.code, name: 'IGNORED', classToken: pupil.classToken, requestId: rid('join') }, bearer(pupil.token)); (pupil.rooms ||= {})[room.session.id] = joined.learnerId; }
    for (const pupil of pupils) await event(room, 'CHOOSE_MASCOT', { mascot: pupils.indexOf(pupil) }, bearer(pupil.token));
    await event(room, 'START'); return room;
  }
  const concluded = await createRoom('Tiết đã kết thúc — hộ chiếu QA');
  while ((await api('/api/lesson-sessions?id=' + concluded.session.id)).view.timeline.currentActivityId !== 'act-recheck') await event(concluded, 'NEXT');
  await event(concluded, 'INTEGRITY', { confirmed: true, usedAI: false }, bearer(pupils[0].token));
  await event(concluded, 'SUBMIT', { taskId: 'task-recheck-18', answer: 'opt_recheck_infinite' }, bearer(pupils[0].token));
  const recheck = await event(concluded, 'SUBMIT', { taskId: 'task-recheck-19', answer: 'w_n=3n+1; 4,7,10; w_1=4; w_n=w_(n-1)+3' }, bearer(pupils[0].token));
  await event(concluded, 'ASSESS', { submissionId: recheck.result.submissionId, criteriaMet: true });
  while ((await api('/api/lesson-sessions?id=' + concluded.session.id)).view.timeline.currentActivityId !== 'act-exit') await event(concluded, 'NEXT');
  await event(concluded, 'INTEGRITY', { confirmed: true, usedAI: false }, bearer(pupils[0].token));
  const exit = await event(concluded, 'SUBMIT', { taskId: 'task-exit-ticket', answer: 'n là chỉ số; u_n là giá trị số hạng. u_n=3n+1.' }, bearer(pupils[0].token));
  await event(concluded, 'ASSESS', { submissionId: exit.result.submissionId, criteriaMet: true });
  await event(concluded, 'VALUE_REFLECT', { reflection: { integrity: true, usedAI: false, aiHelp: '', ownChanges: '', reflection: 'Trước em nhầm chỉ số.\nGiờ em kiểm tra từng số hạng.' } }, bearer(pupils[0].token));
  await event(concluded, 'VALUE_BADGE', { learnerId: pupils[0].rooms[concluded.session.id], valueId: 'integrity', evidenceId: 'qa-observation', reason: 'Lời giải cá nhân đã được kiểm tra trong phiên giả QA.' });
  const league = (await api('/api/lesson-leagues', { action: 'create', title: 'Giải giả browser QA', format: 'async', requestId: rid('league') })).league;
  await api('/api/lesson-leagues', { action: 'class-add', leagueId: league.id, classId: cls.id }); await api('/api/lesson-leagues', { action: 'link', leagueId: league.id, classId: cls.id, sessionId: concluded.session.id, round: 1 });
  await event(concluded, 'CONCLUDE'); await api('/api/lesson-leagues', { action: 'finalize', leagueId: league.id, classId: cls.id, round: 1 });
  let live, discoveryRolls = [];
  for (let attempt = 0; attempt < 12; attempt++) {
    live = await createRoom('R10 Khám phá — dữ liệu giả, luyện cá nhân');
    await event(live, 'SET_MODE', { rule: 'campaign', participation: 'individual' });
    while ((await api('/api/lesson-sessions?id=' + live.session.id)).view.timeline.currentActivityId !== 'act-prac') await event(live, 'NEXT');
    await event(live, 'EXPLORATION_CONFIG', { enabled: true });
    let previous = -1;
    discoveryRolls = [];
    for (let roll = 0; roll < 30; roll++) {
      const response = await event(live, 'ROLL', {}, bearer(pupils[0].token));
      discoveryRolls.push({from:response.result.from,die:response.result.die,position:response.result.position});
      const own = (await api('/api/lesson-sessions?id=' + live.session.id, undefined, bearer(pupils[0].token))).view;
      if (own.exploration?.cards?.some(card => card.found)) break;
      if (response.result.position === previous) break;
      previous = response.result.position;
    }
    const own = (await api('/api/lesson-sessions?id=' + live.session.id, undefined, bearer(pupils[0].token))).view;
    if (own.exploration?.cards?.some(card => card.found)) break;
    await event(live, 'CONCLUDE');
  }
  const discoveryOwn = (await api('/api/lesson-sessions?id=' + live.session.id, undefined, bearer(pupils[0].token))).view;
  assert.ok(discoveryOwn.exploration?.cards?.some(card => card.found), 'R10 fixture must discover a card through actual server ROLL');
  assert.equal(discoveryOwn.exploration.open, false, 'Teacher opens the window through actual UI');
  assert.equal(discoveryOwn.exploration.fragments, 0, 'No fragments are pre-awarded');
  await event(live, 'EXTEND', { minutes: 10 });
  await event(live, 'EXTEND', { minutes: 5 });
  report.liveFixture = { activityId: 'act-prac', teacherAddedMinutes: 15, actingLearnerAutoSelected: false, explorationEnabled:true, windowInitiallyClosed:true, fragmentSeeded:false, serverRolls:discoveryRolls, foundCards:discoveryOwn.exploration.cards.filter(card=>card.found).map(card=>card.id) };
  const device = await api('/api/lesson-devices', { action: 'create', sessionId: live.session.id, kind: 'B', memberIds: pupils.slice(0,2).map(pupil => pupil.rooms[live.session.id]), requestId: rid('shared') }); secret(device.token);
  report.sessionId = live.session.id;
  const gameRooms=[];
  await database.prepare("INSERT OR IGNORE INTO system_hosts(account_id,role,created_at,created_by) VALUES(?,'root',?,?)").bind(owner,Date.now(),owner).run();
  for(const rule of ['relay','duel']){const game=(await api('/api/escape',{action:'create-room',id:randomBytes(16).toString('hex'),adminKey:secret(randomBytes(40).toString('base64url')),title:'R7 '+rule,campaign:{theme:rule==='relay'?'modern':'historical',grade:11,topics:['sequences'],minLevel:0,maxLevel:0,stationMax:0,rule,participation:'pairs',playMode:'teams'}})).room;gameRooms.push(game);}
  report.legacyGameFixtures={rules:['relay','duel'],pupilNamesSynthetic:true,canonicalAPIs:true};
  const restoreText='Toán 11 Dãy số: phân biệt hữu hạn/vô hạn và bốn cách biểu diễn; recheck cá nhân.';
  const uploadResponse=await fetch(base+'/api/lessons/sources',{method:'POST',headers:{...teacher,'content-type':'text/plain','x-file-name':'qa-restore.txt','x-request-id':rid('restore-source')},body:restoreText});
  assert.equal(uploadResponse.status,201);
  const restoreSource=(await uploadResponse.json()).source,restoreJobId=crypto.randomUUID();
  const restorePackage=JSON.parse(await readFile(join(buildRoot,'content/lessons/g11-sequences-p1.json'),'utf8'));restorePackage.id='qa-restored-draft';
  const restoreResult=normalizeLessonProposal({source:restoreSource,slotMinutes:40,candidate:{package:restorePackage,citations:[...restorePackage.objectives,...restorePackage.activities,...restorePackage.tasks,...restorePackage.hints,...restorePackage.evidenceRules].map(entity=>({entityId:entity.id,segmentId:'seg-1',quote:restoreText,origin:'adapted'})),uncertainties:[]}});
  assert.equal(restoreResult.validation.ok,true,JSON.stringify(restoreResult.validation.errors));
  await database.prepare("INSERT INTO lesson_generation_jobs(id,owner_account_id,source_id,source_sha256,parser_revision,extraction_hash,request_id,request_fingerprint,settings_json,model,status,result_json,created_at,updated_at,completed_at) VALUES(?,?,?,?,?,?,?,?,?,?,'needs_review',?,?,?,?)").bind(restoreJobId,owner,restoreSource.id,restoreSource.sha256,restoreSource.parserRevision,restoreSource.extractionHash,rid('restore-job'),'qa-fixture',JSON.stringify({slotMinutes:40,subject:'math',grade:11}),'synthetic-no-provider',JSON.stringify(restoreResult),Date.now(),Date.now(),Date.now()).run();
  const recovered=await api('/api/lessons/proposal?latest=true&sourceId='+restoreSource.id);assert.equal(recovered.job.id,restoreJobId);
  assert.equal((await api('/api/lessons/proposal?latest=true&sourceId='+restoreSource.id,undefined,{'oai-authenticated-user-id':'qa-foreign','oai-authenticated-user-email':'qa-foreign@example.invalid'},404)).error,'NOT_FOUND');
  report.restoreFixture={sourceId:restoreSource.id,jobId:restoreJobId,seed:'Synthetic saved candidate inserted into local D1; source uploaded through actual API',providerCalls:0,nativeLatestAndForeignOwner:true};
  const json = (res, body, status = 200) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(body)); };
  const html = teacherMode => `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QA cách ly</title><style>body{font:16px system-ui;max-width:800px;margin:auto;padding:16px;background:#102133;color:#eef6ff}button,a,input{font:inherit;padding:12px;margin:5px;min-height:44px}button{cursor:pointer}label{display:block}input{width:min(80%,640px)}a{display:inline-block;color:#91e9ff}</style><h1>QA cách ly · ${teacherMode ? 'giáo viên' : 'học sinh'}</h1><p>Dữ liệu giả; actual Worker/D1/R2. Chỉ localhost. Không gọi AI.</p>${teacherMode ? `<p>Nguồn khôi phục nháp QA: <strong>${escape(restoreSource.id)}</strong></p>` : ''}${teacherMode ? `<button id="teacher">Mở Studio và cockpit QA</button><button id="teacher-exam">Mở phòng kiểm tra QA</button><a href="/presenter?session=${escape(live.session.id)}">Mở TV tổng hợp</a>` : `<button id="passport">Mở hộ chiếu QA</button><button id="play">Mở nhiệm vụ cá nhân QA — HS 1</button><button id="play-other">Mở nhiệm vụ cá nhân QA — HS 2</button><p>Phòng game Tiếp sức: <strong>${escape(gameRooms[0].code)}</strong> · Phòng game Đấu đơn: <strong>${escape(gameRooms[1].code)}</strong></p><a href="/">Mở trang vào phòng game</a><p>Mã tiết học: <strong>${escape(live.session.code)}</strong></p><button id="pupil-exam">Mở bài kiểm tra QA — chữ 175%</button><button id="pupil-exam-other">Mở bài kiểm tra QA — chữ 100%</button><a href="/shared">Mở thiết bị nhóm</a><label>Mã phiên<input id="session" readonly value="${escape(live.session.id)}"></label><label>Mã thiết bị<input id="device" type="password" readonly value="${escape(device.token)}"></label><button id="shared">Mở máy nhóm QA</button><details><summary>Mã lớp/PIN giả để kiểm đăng nhập</summary><label>Mã lớp<input readonly value="${escape(cls.code)}"></label><label>Mã học sinh<input readonly value="${escape(pupils[0].member.code)}"></label><label>PIN<input type="password" readonly value="${escape(pupils[0].pin)}"></label></details>`}<p role="status" id="note"></p><script>const note=document.getElementById('note');document.addEventListener('click',async e=>{const id=e.target.id;if(!['teacher','teacher-exam','passport','play','play-other','pupil-exam','pupil-exam-other','shared'].includes(id))return;try{const r=await fetch('/qa/bootstrap',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:id})});const d=await r.json();if(!r.ok)throw Error();if(id==='teacher'){sessionStorage.setItem('active_teacher_session',d.id);sessionStorage.setItem('active_teacher_session_code',d.code);sessionStorage.setItem('presenter_token_'+d.id,d.presenterToken);location.href='/lessons'}else if(id==='teacher-exam'){location.href='/exams?id='+encodeURIComponent(d.id)}else if(id==='pupil-exam'||id==='pupil-exam-other'){localStorage.setItem('exam-session',JSON.stringify({code:d.code,token:d.token,name:d.name}));location.href='/exam'}else if(id==='passport'){sessionStorage.setItem('lesson_class_passport_token',d.token);location.href='/passport'}else if(id==='play'||id==='play-other'){sessionStorage.setItem('lesson_class_passport_token',d.classToken);sessionStorage.setItem('lesson_active_session_id',d.id);sessionStorage.setItem('lesson_active_learner_id',d.learnerId);sessionStorage.setItem('lesson_active_token',d.token);location.href='/play'}else{sessionStorage.setItem('qa_shared_session',d.id);sessionStorage.setItem('qa_shared_token',d.token);location.href='/qa/shared'}}catch{note.textContent='Chưa mở được. QA fixture có thể đã hết hạn.'}});</script></html>`;
  const sharedHtml = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Thiết bị nhóm QA</title><body><p>Nhập mã phiên và mã thiết bị trên trang thật. Mã được giữ trong trường mật khẩu.</p><label>Mã phiên<input id="sid" readonly value="${escape(live.session.id)}"></label><label>Mã thiết bị<input id="token" type="password" readonly value="${escape(device.token)}"></label><a href="/shared">Tới thiết bị nhóm thật</a><a href="/shared?qa-prefill=1">Mở trang thật với mã QA điền sẵn</a><button id="copy">Chép mã thiết bị</button><script>document.getElementById('copy').onclick=()=>navigator.clipboard.writeText(document.getElementById('token').value);</script></body></html>`;
  report.examBootstrap = { storage: 'localStorage exam-session {code,token,name}; actual ExamPlay contract', teacherPath: '/exams?id=<synthetic exam id>', pupilPath: '/exam', credentialsPrinted: false };
  report.sharedPrefill = { scope: 'own synthetic live B device only, pupil origin; actual compiled /shared HTML + password-field prefill', clicksAutomated: false, loginAutomated: false, apiResponsesAltered: false };
  const sharedPrefill = `<script>(()=>{let n=0;const timer=setInterval(()=>{const inputs=document.querySelectorAll('main form input');if(document.readyState!=='complete'||inputs.length!==2){if(++n>100)clearInterval(timer);return;}clearInterval(timer);const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setTimeout(()=>{for(const[input,value]of [[inputs[0],${JSON.stringify(live.session.id)}],[inputs[1],${JSON.stringify(device.token)}]]){setter.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}},1000);},100);})();</script>`;
  const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.woff': 'font/woff', '.woff2': 'font/woff2', '.json': 'application/json', '.wasm': 'application/wasm' };
  let stagedOriginal;
  let pupilApiUnavailable=false;
  function proxy(teacherMode) {
    return createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://127.0.0.1:${teacherMode ? teacherPort : pupilPort}`); report.requests++;
        if (url.pathname === '/qa/stop' && req.method === 'POST' && teacherMode) { json(res, { stopping: true }); setTimeout(() => void stopQA(), 20); return; }
        if(url.pathname==='/qa/network'&&req.method==='POST'&&teacherMode){pupilApiUnavailable=url.searchParams.get('down')==='1';return json(res,{syntheticApiUnavailable:pupilApiUnavailable});}
        if(!teacherMode&&pupilApiUnavailable&&url.pathname.startsWith('/api/'))return json(res,{error:'LESSON_UNAVAILABLE'},503);
        if (url.pathname === '/qa/stage' && req.method === 'POST' && teacherMode) {
          const {packLessonState,unpackLessonState}=await import('../../lib/lesson/state-storage.js');
          const row=await database.prepare('SELECT state FROM lesson_sessions WHERE id=?').bind(live.session.id).first();
          stagedOriginal ||= row.state;
          const state=unpackLessonState(JSON.parse(stagedOriginal)),kind=url.searchParams.get('kind');
          if(kind==='waiting'){state.status='waiting';state.clock.startedAt=null;state.exploration.openedAtActiveMs=null;}
          else if(kind==='reward'){state.status='concluded';state.exploration.learners[pupils[0].rooms[live.session.id]]={found:7,fragments:7,choices:[0,1,2]};}
          else if(kind==='window'){state.status='active';state.clock.lastNow=Date.now();state.clock.activityDeadline=Date.now()+900000;state.exploration.usedMs=0;state.exploration.openedAtActiveMs=null;state.exploration.windowActivityId=null;}
          else if(kind!=='restore')return json(res,{error:'INVALID_STAGE'},400);
          await database.prepare('UPDATE lesson_sessions SET state=? WHERE id=?').bind(kind==='restore'?stagedOriginal:JSON.stringify(packLessonState(state)),live.session.id).run();
          (report.syntheticStages ||= []).push({kind,at:new Date().toISOString(),seeded:true,notDiceProof:true});
          return json(res,{kind,seeded:true});
        }
        if (url.pathname === '/qa') { res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' }); res.end(html(teacherMode)); return; }
        if (url.pathname === '/qa/math') { res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' }); res.end(await readFile(join(root,'tasks/codex-r11-notation-preview.html'))); return; }
        if (url.pathname === '/qa/shared' && !teacherMode) { res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' }); res.end(sharedHtml); return; }
        if (url.pathname === '/qa/bootstrap' && req.method === 'POST') {
          const chunks = []; let bytes = 0; for await (const chunk of req) { bytes += chunk.length; if (bytes > 1024) return json(res, { error: 'QA_INPUT_TOO_LARGE' }, 413); chunks.push(chunk); }
          const action = JSON.parse(Buffer.concat(chunks).toString()).action;
          if (teacherMode && action === 'teacher') return json(res, { id: live.session.id, code: live.session.code, presenterToken: live.presenterToken });
          if (teacherMode && action === 'teacher-exam') return json(res, { id: exam.id });
          if (!teacherMode && ['pupil-exam','pupil-exam-other'].includes(action)) { const pupil = examPupils[action === 'pupil-exam' ? 0 : 1]; return json(res, { code: exam.code, token: pupil.token, name: pupil.name }); }
          if (!teacherMode && action === 'play-other') return json(res, { id: live.session.id, learnerId: pupils[1].rooms[live.session.id], token: pupils[1].token, classToken: pupils[1].classToken });
          if (!teacherMode && action === 'passport') return json(res, { token: pupils[0].classToken });
          if (!teacherMode && action === 'play') return json(res, { id: live.session.id, learnerId: pupils[0].rooms[live.session.id], token: pupils[0].token, classToken: pupils[0].classToken });
          if (!teacherMode && action === 'shared') return json(res, { id: live.session.id, token: device.token });
          return json(res, { error: 'QA_FORBIDDEN' }, 403);
        }
        if (url.pathname.startsWith('/qa')) return json(res, { error: 'QA_NOT_FOUND' }, 404);
        const file = resolve(assets, '.' + decodeURIComponent(url.pathname));
        if (file.startsWith(assets + sep) && ['GET', 'HEAD'].includes(req.method)) {
          const info = await stat(file).catch(() => null);
          if (info?.isFile()) { res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }); res.end(req.method === 'HEAD' ? undefined : await readFile(file)); return; }
        }
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) if (!['host', 'content-length', 'connection', 'accept-encoding'].includes(key) && !key.startsWith('oai-authenticated-')) headers.set(key, Array.isArray(value) ? value.join(',') : value);
        if(req.headers.origin){const origin=new URL(req.headers.origin).origin;if(origin!==new URL(url).origin)return json(res,{error:'QA_ORIGIN_DENIED'},403);headers.set('Origin',base);}
        if (teacherMode) for (const [key, value] of Object.entries(teacher)) headers.set(key, value);
        const chunks = []; let bytes = 0; for await (const chunk of req) { bytes += chunk.length; if (bytes > 12 * 1024 * 1024) return json(res, { error: 'QA_INPUT_TOO_LARGE' }, 413); chunks.push(chunk); }
        const joinPrefill=!teacherMode&&url.pathname==='/play'&&url.searchParams.get('qa-profile')==='1'&&req.method==='GET';if(joinPrefill)url.searchParams.delete('qa-profile');
        const prefill = !teacherMode && url.pathname === '/shared' && url.searchParams.get('qa-prefill') === '1' && req.method === 'GET';
        if (prefill) url.searchParams.delete('qa-prefill');
        const upstream = await fetch(base + url.pathname + url.search, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks), redirect: 'manual' });
        const out = Object.fromEntries([...upstream.headers].filter(([key]) => !['content-encoding', 'transfer-encoding', 'content-length'].includes(key)));
        if (out.location?.startsWith(base)) out.location = out.location.slice(base.length) || '/';
        res.writeHead(upstream.status, out);
        if(joinPrefill&&out['content-type']?.includes('text/html'))res.end((await upstream.text()).replace('</body>', `<script>(()=>{let n=0;const timer=setInterval(()=>{const inputs=['join-class-code','join-member-code','join-pin'].map(id=>document.getElementById(id));if(inputs.some(x=>!x)){if(++n>100)clearInterval(timer);return;}clearInterval(timer);const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;for(const[input,value]of inputs.map((input,i)=>[input,[${JSON.stringify(cls.code)},${JSON.stringify(pupils[0].member.code)},${JSON.stringify(pupils[0].pin)}][i]])){setter.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}},100);})();</script></body>`));
        else if (prefill && out['content-type']?.includes('text/html')) res.end((await upstream.text()).replace('</body>', sharedPrefill + '</body>'));
        else res.end(Buffer.from(await upstream.arrayBuffer()));
      } catch { json(res, { error: 'QA_PROXY_UNAVAILABLE' }, 503); }
    });
  }
  teacherServer = proxy(true); pupilServer = proxy(false);
  await Promise.all([new Promise((resolve, reject) => teacherServer.listen(teacherPort, '127.0.0.1', resolve).once('error', reject)), new Promise((resolve, reject) => pupilServer.listen(pupilPort, '127.0.0.1', resolve).once('error', reject))]);
  assert.equal((await fetch(`http://127.0.0.1:${pupilPort}/api/lesson-classes`)).status, 401);
  assert.equal((await fetch(`http://127.0.0.1:${teacherPort}/api/lesson-classes`)).status, 200);
  assert.equal((await fetch(`http://127.0.0.1:${pupilPort}/api/lesson-classes`, { headers: teacher })).status, 401);
  report.originsVerified = { teacher: 200, pupilAnonymous: 401, pupilForgedTeacherHeaders: 401 };
  await writeFile(artifact, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ teacherUrl: report.teacherUrl, pupilUrl: report.pupilUrl, result: report.result, fixture: report.fixture, credentials: 'in-memory only; /qa UI, never logged' }));
  let closed = false;
  const close = async () => { if (closed) return; closed = true; teacherServer.close(); pupilServer.close(); await mf.dispose(); report.stoppedAt = new Date().toISOString(); report.result = 'LOCAL_QA_STOPPED'; await writeFile(artifact, JSON.stringify(report, null, 2) + '\n'); process.exit(0); };
  stopQA = close;
  process.on('SIGINT', close); process.on('SIGTERM', close);
} catch (error) {
  teacherServer?.close(); pupilServer?.close(); await mf?.dispose();
  let message = String(error?.message || error); for (const value of secrets) message = message.replaceAll(value, '[redacted]');
  report.result = 'HOLD'; report.failure = message.slice(0, 1200); await writeFile(artifact, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ result: report.result, failure: report.failure })); process.exitCode = 1;
}
