import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { EDUFIT_VALUES, LESSON_INTEGRATIONS } from '../lib/lesson/values.js';

function ui(file, extra = {}) {
  const state = [], effects = [], output = {};
  let cursor = 0;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(child => child !== false && child != null) }),
    useState(initial) { const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial; return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; },
    useRef(initial) { const index = cursor++; return state[index] ||= { current: initial }; },
    useEffect(effect) { effects.push(effect); }, useCallback: callback => callback,
  };
  const code = ts.transpileModule(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports: output, crypto: globalThis.crypto, Date, window: { location: { search: '?session=room' } }, sessionStorage: { getItem: () => null },
    require(name) { if (name === 'react') return react; if (name.includes('/values')) return { EDUFIT_VALUES, LESSON_INTEGRATIONS };
      if (name.includes('useLessonSession')) return { formatDuration:()=> '1:00',useLessonSession: () => ({ view: extra.view, getRemainingMs: () => 60000 }) };
      if (name.includes('useLessonMedia')) return { useLessonMedia: () => ({ settings: {}, updateSettings() {}, enableMedia() {} }) };
      if (name.includes('LessonEncounterSheet')) return { LessonEncounterSheet: 'LessonEncounterSheet' };
      if (name.includes('QuestionPager')) return { QuestionPager: 'QuestionPager' };
      if (name.includes('ClassEventPanel')) return { ClassEventPanel: 'ClassEventPanel' };
      if (name.includes('SharedDevicePanel')) return { BoardResponsePanel: 'BoardResponsePanel' };
      return { __esModule: true, default: 'Component' }; }, ...extra });
  return { render(name, props) { cursor = 0; effects.length = 0; return output[name](props); }, effects, state };
}
function nodes(tree, match = () => true) { return !tree || typeof tree !== 'object' ? [] : [...(match(tree) ? [tree] : []), ...(tree.children || []).flatMap(child => nodes(child, match)),...(tree.type==='QuestionPager'?(tree.props.items||[]).flatMap(item=>nodes(item.content,match)):[])]; }
const named = (tree, text) => nodes(tree, node => node.children.includes(text))[0];
const byId = (tree, id) => nodes(tree, node => node.props.id === id)[0];
const members = [{ learnerId: 'a', name: 'An' }, { learnerId: 'b', name: 'Bình' }];
const props = { sessionId: 'room', members, tasks: [{ id: 'q', prompt: 'Câu hỏi' }], onCommand: async () => ({ ok: true }) };
test('changing rule drafts locally and only Apply dispatches the new mode',async()=>{
 const commands=[],env=ui('components/lesson/TeacherLessonTools.tsx');const input={...props,currentRule:'campaign',currentParticipation:'individual',onCommand:async(type,payload)=>{commands.push({type,payload});return{ok:true};}};
 let tree=env.render('TeacherLessonTools',input);nodes(tree,n=>n.type==='select'&&n.props.value==='campaign')[0].props.onChange({target:{value:'treasure'}});assert.equal(commands.length,0);
 tree=env.render('TeacherLessonTools',input);const button=nodes(tree,n=>n.type==='button'&&n.children.includes('Áp dụng luật và hình thức'))[0];await button.props.onClick();assert.deepEqual(JSON.parse(JSON.stringify(commands)),[{type:'SET_MODE',payload:{rule:'treasure',participation:'individual'}}]);
});

test('teacher sees named tutor consent history and can revoke a live pair without peer answers',async()=>{
 const commands=[];const env=ui('components/lesson/TeacherLessonTools.tsx');const tree=env.render('TeacherLessonTools',{...props,tutors:{history:[{id:'pair',tutorId:'a',recipientId:'b',status:'active'}]},onCommand:async(type,payload)=>{commands.push({type,payload});return{ok:true};}});
 const revoke=nodes(tree,node=>node.type==='button'&&node.children.join('')==='Dừng hỗ trợ An và Bình')[0];assert.ok(revoke);await revoke.props.onClick();assert.deepEqual(JSON.parse(JSON.stringify(commands)),[{type:'TUTOR_REVOKE',payload:{requestId:'pair'}}]);
});

test('group machine starts with no pupils selected and issues only explicit checked members', async () => {
  const calls = [], env = ui('components/lesson/TeacherLessonTools.tsx', { fetch: async (url, request) => { calls.push(JSON.parse(request.body)); return { ok: true, json: async () => ({ token: 'PRIVATE_DEVICE_TOKEN' }) }; } });
  let tree = env.render('TeacherLessonTools', props);
  assert.equal(named(tree, 'Cấp mã cho máy nhóm').props.disabled, true);
  byId(tree, 'device-member-a').props.onChange({ target: { checked: true } });
  tree = env.render('TeacherLessonTools', props);
  await named(tree, 'Cấp mã cho máy nhóm').props.onClick();
  assert.deepEqual(calls[0].memberIds, ['a']);
  tree = env.render('TeacherLessonTools', props);
  const token = byId(tree, 'lesson-device-token');
  assert.equal(token.props.type, 'password'); assert.equal(token.props.readOnly, true); assert.equal(token.props.value, 'PRIVATE_DEVICE_TOKEN');
  assert.equal(nodes(tree, node => node.children.includes('PRIVATE_DEVICE_TOKEN')).length, 0);
  assert.ok(nodes(tree, node => node.type === 'a' && node.props.href === '/shared?session=room').length);
});

test('observed badge is listed only for selected pupil and revoke requires a recorded reason', async () => {
  const commands = [], env = ui('components/lesson/TeacherLessonTools.tsx');
  const input = { ...props, onCommand: async (type, payload) => { commands.push({ type, payload }); return { ok: true }; },
    valueBadges: { a: [{ valueId: 'integrity', evidenceId: 'seen-1', reason: 'Khai đúng hỗ trợ', awardedAt: 100, awardedBy: 'teacher' }], b: [{ valueId: 'passion', evidenceId: 'foreign', reason: 'Riêng em B', awardedAt: 100, awardedBy: 'teacher' }] } };
  let tree = env.render('TeacherLessonTools', input);
  byId(tree, 'value-learner').props.onChange({ target: { value: 'a' } });
  tree = env.render('TeacherLessonTools', input);
  assert.ok(nodes(tree, node => node.children.includes('Khai đúng hỗ trợ')).length);
  assert.equal(nodes(tree, node => node.children.includes('Riêng em B')).length, 0);
  assert.equal(named(tree, 'Thu hồi ghi nhận').props.disabled, true);
  byId(tree, 'badge-revoke-reason').props.onChange({ target: { value: 'Ghi nhận trùng' } });
  tree = env.render('TeacherLessonTools', input);
  await named(tree, 'Thu hồi ghi nhận').props.onClick();
  assert.deepEqual(JSON.parse(JSON.stringify(commands[0])), { type: 'VALUE_REVOKE', payload: { learnerId: 'a', valueId: 'integrity', evidenceId: 'seen-1', reason: 'Ghi nhận trùng' } });
});

test('quality report displays observed evidence and missing observations without invented rubric ratings', () => {
  const env = ui('components/lesson/TeacherLessonTools.tsx');
  const tree = env.render('TeacherLessonTools', { ...props, qualityReport: { learners: 0, pending: 0, objectives: [],
    reflection: { completed: 0, total: 0, rate: null }, groupContribution: { learners: 0, total: 0, rate: null }, criteria: [{ id: 'objective_evidence', status: 'missing' }] } });
  assert.ok(named(tree, 'Báo cáo minh chứng tiết học'));
  assert.ok(nodes(tree, node => node.children.includes('Chưa có minh chứng')).length);
  assert.equal(nodes(tree, node => node.children.some(child => typeof child === 'string' && /xuất sắc|đạt chuẩn|Danielson: [1-4]/i.test(child))).length, 0);
});

test('presenter displays aggregate class event and passes no answer callbacks', () => {
  const event = { id: 'e', type: 'tug', label: 'Kéo co', status: 'active', own: null, teams: [], progress: { label: 'Lợi thế', value: 1 }, remainingMs: 60000, players: 20 };
  const env = ui('app/presenter/page.tsx', { view: { id: 'room', status: 'active', classEvent: event, tasks: [], map: { peers: [], totalPosition: 10 } } });
  env.render('default'); env.state[0]='room';env.state[2]=true;env.state[3]=true;env.state[4]=true;
  const tree = env.render('default');
  const panel = nodes(tree, node => node.type === 'ClassEventPanel')[0];
  assert.ok(panel); assert.equal(panel.props.view, event); assert.equal(panel.props.onAnswer, undefined);
});

test('teacher lists and revokes a device without exposing its bearer or PIN',async()=>{
 const calls=[];const env=ui('components/lesson/TeacherLessonTools.tsx',{fetch:async(url,request)=>{calls.push({url,body:request.body?JSON.parse(request.body):null});return{ok:true,json:async()=>({devices:[{id:'device-1',kind:'B',revoked:false,expiresAt:123000}]})};}});
 let tree=env.render('TeacherLessonTools',props);await named(tree,'Xem thiết bị đã cấp').props.onClick();tree=env.render('TeacherLessonTools',props);
 const revoke=nodes(tree,node=>node.type==='button'&&node.children.join('')==='Thu hồi mã máy 1')[0];assert.ok(revoke);await revoke.props.onClick();assert.deepEqual(calls[1].body,{action:'revoke',sessionId:'room',deviceId:'device-1'});
 tree=env.render('TeacherLessonTools',props);assert.equal(nodes(tree,node=>node.type==='button'&&node.children.join('')==='Thu hồi mã máy 1').length,0);
});

test('shared group proposal shows authored labels instead of internal answer IDs',()=>{
 const task={id:'q',participation:'group',prompt:'Ghép biểu diễn',inputSchema:{representations:[{id:'rep',label:'Cách liệt kê'}],cards:[{id:'card',label:'18, 20, 22'}]}};
 const env=ui('app/shared/page.tsx',{view:{status:'active',tasks:[task],timeline:{},group:{proposal:{taskId:'q',answer:{rep:'card'},hash:'hash'},products:{},contributions:[],consent:{votes:1,required:3}}}});
 env.render('default');env.state[0]='room';env.state[2]='device';env.state[4]=members;env.state[5]='a';
 const tree=env.render('default');const math=nodes(tree,node=>node.props.text==='Cách liệt kê: 18, 20, 22')[0];
 assert.ok(math);assert.equal(math.props.inline,false);assert.equal(nodes(tree,node=>node.children.some(child=>typeof child==='string'&&child.includes('{"rep"'))).length,0);
});

test('practice picks gate and branch without commands until explicit open, preserves attempt key',async()=>{
 const commands=[],env=ui('components/lesson/PracticePanel.tsx'),input={enabled:true,busy:false,gates:[{id:'a',branches:['support','core']},{id:'b',branches:['extension']}],practice:{activityId:'a',attemptId:'same-attempt',task:{id:'q'},assessed:false},onCommand:async(type,payload)=>{commands.push({type,payload});return{ok:true};}};
 let tree=env.render('PracticePanel',input);const selects=nodes(tree,n=>n.type==='select');selects[0].props.onChange({target:{value:'b'}});assert.equal(commands.length,0);
 tree=env.render('PracticePanel',input);assert.equal(nodes(tree,n=>n.type==='select')[1].props.value,'extension');assert.ok(nodes(tree,n=>n.props.key==='same-attempt').length);
 await named(tree,'Mở câu').props.onClick();assert.deepEqual(JSON.parse(JSON.stringify(commands)),[{type:'REVISIT',payload:{activityId:'b',branch:'extension'}}]);
 tree=env.render('PracticePanel',{...input,practice:{...input.practice,submission:{assessmentStatus:'pending'}}});assert.equal(named(tree,'Mở câu').props.disabled,true);
});

test('shared event hides but retains question pager and binds cursor to actor/activity/round',()=>{
 const env=ui('app/shared/page.tsx',{view:{status:'active',round:2,tasks:[{id:'q',prompt:'Own'}],timeline:{currentActivityId:'act'},classEvent:{status:'active',type:'surf'},submissions:{}}});
 env.render('default');env.state[0]='room';env.state[2]='device';env.state[4]=members;env.state[5]='a';
 const tree=env.render('default'),pager=nodes(tree,n=>n.type==='QuestionPager')[0];assert.equal(pager.props.identity,'room:a:act:2');assert.equal(pager.props.items.length,1);
 assert.ok(nodes(tree,n=>n.props.hidden===true&&n.props.style?.display==='none'&&n.children.includes(pager)).length);
});
test('shared popup retains tasks while closed, practice replaces ordinary question, pause suppresses popup',()=>{
 const view={status:'active',round:1,tasks:[{id:'q',prompt:'Own'}],timeline:{currentActivityId:'act'},submissions:{}};
 const env=ui('app/shared/page.tsx',{view});env.render('default');env.state[0]='room';env.state[2]='device';env.state[4]=members;env.state[5]='a';
 let tree=env.render('default');assert.equal(nodes(tree,n=>n.type==='LessonEncounterSheet')[0].props.open,false);assert.equal(nodes(tree,n=>n.type==='QuestionPager')[0].props.items.length,1);
 named(tree,'Mở nhiệm vụ').props.onClick();tree=env.render('default');assert.equal(nodes(tree,n=>n.type==='LessonEncounterSheet')[0].props.open,true);
 named(tree,'Luyện lại cổng đã qua').props.onClick();tree=env.render('default');const pager=nodes(tree,n=>n.type==='QuestionPager')[0];assert.ok(nodes(tree,n=>n.props.hidden&&n.children.includes(pager)).length);
 named(tree,'Về câu đang học').props.onClick();tree=env.render('default');assert.ok(nodes(tree,n=>n.props.hidden===false&&n.children.some(child=>child.type==='QuestionPager')).length);
 view.status='paused';tree=env.render('default');assert.equal(nodes(tree,n=>n.type==='LessonEncounterSheet')[0].props.open,false);assert.equal(nodes(tree,n=>n.type==='QuestionPager')[0].props.items.length,1);
});

