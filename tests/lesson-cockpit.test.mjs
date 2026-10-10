import test from 'node:test';
import assert from 'node:assert/strict';
const cockpit = await import('../lib/lesson/cockpit.js').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND') return {};
  throw error;
});

function fixture() {
  return {
    status: 'active', timeline: { currentActivityId: 'r', activityIndex: 1, locked: false },
    clock: { arenaPausedAt: null },
    roster: { a: { id: 'a', name: 'An', present: true }, absent: { id: 'absent', name: 'An', present: false }, b: { id: 'b', name: 'An', present: true } },
    map: { unitsPerActivity: 8, gatePosition: 16, peers: [{ id: 'm0', mascot: 1, position: 16 }, { id: 'm2', mascot: 1, position: 16 }] },
    package: {
      activities: [{ id: 'g', budgetRole: 'core', participation: 'group', taskIds: ['group'] }, { id: 'r', budgetRole: 'core', participation: 'individual', taskIds: ['q','open','extra'] }],
      tasks: [{ id: 'group', participation: 'group', branch: 'shared' }, { id: 'q', participation: 'individual', branch: 'shared' }, { id: 'open', participation: 'individual', branch: 'shared' }, { id: 'extra', participation: 'individual', branch: 'extension' }],
      evidenceRules: [{ taskId: 'q', kind: 'individual_recheck', individual: true }]
    },
    gateTiming: { a: { activityId: 'r', gatePosition: 16, enteredAt: 100, activeMs: 420000 }, b: { activityId: 'r', gatePosition: 16, enteredAt: 110, activeMs: 360000 } },
    submissions: {}, passports: {}, branches: {}
  };
}

test('cockpit maps anonymous peers using full roster order and sorts exact server duration', () => {
  assert.equal(typeof cockpit.cockpitLearners, 'function');
  const rows = cockpit.cockpitLearners(fixture(), 5);
  assert.deepEqual(rows.map(r => [r.learnerId, r.peerId]), [['a','m0'], ['b','m2']]);
  assert.deepEqual(rows.map(r => r.activeMs), [420000,360000]);
  assert.ok(rows.every(r => r.needsSupport && r.movementDone === 2 && r.evidenceDone === 0));
});

test('latest original submission time, branch tasks and pending distinguish review from wrong rechecks', () => {
  const v = fixture();
  v.submissions = { q1: { submissionId:'q1', learnerId:'a', taskId:'q', activityId:'r', at:200, ok:true, assessmentStatus:'assessed' }, q2: {submissionId:'q2',learnerId:'a',taskId:'open',activityId:'r',at:300,ok:false,assessmentStatus:'pending'} };
  v.passports.a = { submissions:[{at:99999}], supportHistory:[{taskId:'q',tier:'orientation',at:150}] };
  const a = cockpit.cockpitLearners(v,5).find(r=>r.learnerId==='a');
  assert.equal(a.lastSubmittedAt,300);
  assert.equal(a.hintCount,1);
  assert.equal(a.wrongRechecks,0);
  assert.equal(a.awaitingReview,true);
  assert.equal(a.needsSupport,false);
  assert.equal(a.evidenceTotal,1);
  assert.equal(a.evidenceDone,0);
  v.submissions.q2.ok=true; v.submissions.q2.assessmentStatus='assessed';
  const done=cockpit.cockpitLearners(v,5).find(r=>r.learnerId==='a');
  assert.equal(done.completed,true);
  assert.equal(done.evidenceDone,1);
  assert.equal(done.needsSupport,false);
});

test('wrong streak counts distinct assessed rechecks, ignores pending and clears on correct', () => {
  const v=fixture(); delete v.gateTiming;
  const sub=(id,at,ok,status='assessed')=>({submissionId:id,learnerId:'a',taskId:'q',activityId:'r',at,ok,assessmentStatus:status});
  v.submissions={x:sub('x',100,false),y:sub('y',200,false),pending:sub('p',300,false,'pending')};
  let a=cockpit.cockpitLearners(v,5)[0];
  assert.equal(a.wrongRechecks,2); assert.equal(a.activeMs,null); assert.equal(a.needsSupport,true);
  v.submissions.alias=sub('y',200,false); // reassessment is one attempt
  assert.equal(cockpit.cockpitLearners(v,5)[0].wrongRechecks,2);
  v.submissions.z=sub('z',400,true);
  a=cockpit.cockpitLearners(v,5)[0]; assert.equal(a.wrongRechecks,0); assert.equal(a.needsSupport,false);
  v.submissions.z.activityId='other';
  assert.equal(cockpit.cockpitLearners(v,5)[0].wrongRechecks,2);
});

test('timer boundaries, missing/stale history and pause/arena/lock avoid fabricated support', () => {
  const v=fixture(); v.gateTiming.a.activeMs=299999;
  assert.equal(cockpit.cockpitLearners(v,5).find(r=>r.learnerId==='a').needsSupport,false);
  v.gateTiming.a.activeMs=300000;
  assert.equal(cockpit.cockpitLearners(v,5).find(r=>r.learnerId==='a').needsSupport,true);
  v.gateTiming.a.activityId='old';
  assert.equal(cockpit.cockpitLearners(v,5).find(r=>r.learnerId==='a').activeMs,null);
  for (const mutation of [()=>{v.status='paused'},()=>{v.status='active';v.timeline.locked=true},()=>{v.timeline.locked=false;v.clock.arenaPausedAt=123}]) {
    mutation(); assert.ok(cockpit.cockpitLearners(v,5).every(r=>!r.needsSupport));
  }
  assert.equal(cockpit.normalizeSupportMinutes(''),5);
  assert.equal(cockpit.normalizeSupportMinutes(0),5);
  assert.equal(cockpit.normalizeSupportMinutes(61),5);
  assert.equal(cockpit.normalizeSupportMinutes('7'),7);
  assert.equal(cockpit.normalizeSupportMinutes(5.5),5);
  v.status='active'; v.clock.arenaPausedAt=null; v.gateClockActive=false;
  assert.ok(cockpit.cockpitLearners(v,5).every(r=>!r.needsSupport),'expired activity is not actionable');
});

test('peer inspector renders exact server time and separates movement from individual evidence', async () => {
  const [{readFile},vm,ts,React,{renderToStaticMarkup}]=await Promise.all([import('node:fs/promises'),import('node:vm'),import('typescript'),import('react'),import('react-dom/server')]);
  const source=await readFile(new URL('../components/lesson/LessonPeerInspector.tsx',import.meta.url),'utf8').catch(e=>e.code==='ENOENT'?null:Promise.reject(e));
  assert.ok(source,'teacher peer inspector exists');
  const exports={};
  vm.runInNewContext(ts.default.transpileModule(source,{compilerOptions:{target:ts.default.ScriptTarget.ES2022,module:ts.default.ModuleKind.CommonJS,jsx:ts.default.JsxEmit.React,esModuleInterop:true}}).outputText,{
    exports,require(name){
      if(name==='react')return {...React.default,useState:v=>[v,()=>{}],default:React.default};
      if(name.endsWith('/cockpit.js'))return cockpit;
      if(name.endsWith('/product-content.js'))return {resolveThemeId:()=> 'modern',PRODUCT_THEMES:{modern:{mascots:['Cáo','Cú'],sprites:'mascots.png'}}};
      if(name.endsWith('/LessonMascotPicker'))return {LessonMascotChip:()=>null};
      if(name.endsWith('/useLessonSession'))return {formatDuration:ms=>`${Math.floor(ms/60000)}:00`};
      throw Error(name);
    }
  });
  const html=renderToStaticMarkup(React.default.createElement(exports.LessonPeerInspector,{view:fixture(),selectedLearnerId:'a',onSelectLearner:()=>{},onClose:()=>{}}));
  assert.match(html,/HS cần hỗ trợ/); assert.match(html,/7:00/); assert.match(html,/server/);
  assert.match(html,/Di chuyển/); assert.match(html,/Bài cá nhân/); assert.doesNotMatch(html,/mastery/);
});
