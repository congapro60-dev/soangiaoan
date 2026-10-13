import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLessonSession,reduceLessonSession} from '../lib/lesson/runtime.js';
import {serializeForStudent,serializeForTeacher,serializeForPresenter} from '../lib/lesson/serialize.js';
import {discoverExploration,explorationPoints,explorationView,recordExplorationRoll} from '../lib/lesson/exploration.js';
const pkg=JSON.parse(readFileSync(new URL('../content/lessons/g11-sequences-p1.json',import.meta.url)));
function fixture(){return createLessonSession({package:pkg,sessionId:'dto',hostId:'teacher',learners:[{id:'a',name:'A'},{id:'b',name:'B'}],now:1000,seed:43});}
function command(state,type,payload={},now=state.clock.lastNow+1,actor={role:'teacher',id:'teacher'}){return reduceLessonSession(state,{type,payload,eventId:type+state.revision,round:state.round,revision:state.revision,activityId:state.timeline.currentActivityId},{actor,now});}
test('waiting pupil and TV cannot peek while teacher retains lesson; old state unchanged',()=>{
 const s=fixture(),before=structuredClone(s),student=serializeForStudent(s,'a'),tv=serializeForPresenter(s);
 assert.deepEqual(student.tasks,[]);assert.equal(student.currentActivity,null);assert.equal(student.practice,null);assert.deepEqual(tv.tasks,[]);assert.equal(tv.currentActivity,null);assert.ok(serializeForTeacher(s).tasks.length);assert.deepEqual(s,before);assert.equal(Object.hasOwn(s,'exploration'),false);
});
test('own collection privacy, presenter excludes it, all cards readable in window and after conclusion',()=>{
 let s=fixture();s=command(s,'EXPLORATION_CONFIG',{enabled:true}).state;s=command(s,'START').state;s=command(s,'EXPLORATION_WINDOW',{open:true}).state;
 s.exploration.learners.a={found:7,fragments:1,choices:[2,null,null]};
 const a=serializeForStudent(s,'a'),b=serializeForStudent(s,'b'),tv=serializeForPresenter(s);
 assert.equal(a.exploration.fragments,1);assert.equal(b.exploration.fragments,0);assert.ok(b.exploration.cards.every(c=>c.body&&c.options===undefined&&c.sourceLabel===undefined));assert.equal(Object.hasOwn(tv,'exploration'),false);assert.equal(JSON.stringify(b.exploration).includes('learners'),false);assert.equal(serializeForTeacher(s).exploration.aggregate.collected,1);
 s=command(s,'CONCLUDE').state;assert.ok(serializeForStudent(s,'b').exploration.cards.every(c=>c.body));assert.equal(serializeForStudent(s,'b').exploration.open,false);assert.equal(command(s,'EXPLORATION_REFLECT',{cardId:'sequence-domain',choice:0},s.clock.lastNow+1,{role:'student',id:'b'}).result.code,'SESSION_CONCLUDED');
});
test('group discovery credits present participants only and held gate cannot farm',()=>{
 let s=fixture();s=command(s,'EXPLORATION_CONFIG',{enabled:true}).state;s=command(s,'START').state;
 const p=explorationPoints(s)[0];s.roster.b.present=false;discoverExploration(s,['a','b'],p.position-1,p.position);
 assert.ok(s.exploration.learners.a.found);assert.equal(s.exploration.learners.b,undefined);
 s.roster.b.present=true;discoverExploration(s,['a','b'],p.position,p.position);assert.equal(s.exploration.learners.b,undefined);
});
test('late NEXT clamps budget and retains cumulative spend, no deadline extension',()=>{
 let s=fixture();s=command(s,'EXPLORATION_CONFIG',{enabled:true}).state;s=command(s,'START').state;s=command(s,'EXPLORATION_WINDOW',{open:true}).state;
 const deadline=s.clock.activityDeadline,late=deadline+900000;assert.equal(explorationView(s,'a',late).budgetLeftMs,0);
 s=command(s,'NEXT',{},late).state;assert.equal(s.exploration.usedMs,120000);assert.equal(s.exploration.openedAtActiveMs,null);assert.equal(explorationView(s,'a',late).canOpen,false);
});
test('replay retains first command and stale revision cannot alter exploration',()=>{
 const s=fixture(),event={type:'EXPLORATION_CONFIG',payload:{enabled:true},eventId:'same',round:s.round,revision:s.revision};
 const one=reduceLessonSession(s,event,{actor:{role:'teacher',id:'teacher'},now:1001});assert.ok(one.result.ok);
 const replay=reduceLessonSession(one.state,event,{actor:{role:'teacher',id:'teacher'},now:1002});assert.equal(replay.result.replay,true);assert.deepEqual(replay.state,one.state);
 const stale=reduceLessonSession(one.state,{...event,eventId:'other',payload:{enabled:false}},{actor:{role:'teacher',id:'teacher'},now:1002});assert.equal(stale.result.code,'REVISION_MISMATCH');
});
test('assessment phases, locked lesson and unsupported package cannot open exploration',()=>{
 let s=fixture();s=command(s,'EXPLORATION_CONFIG',{enabled:true}).state;s=command(s,'START').state;
 for(const phase of ['recheck','exit','reflection']){const changed=structuredClone(s);changed.timeline.currentPhase=phase;assert.equal(command(changed,'EXPLORATION_WINDOW',{open:true}).result.code,'EXPLORATION_UNAVAILABLE');}
 const locked=command(s,'LOCK').state;assert.equal(command(locked,'EXPLORATION_WINDOW',{open:true}).result.code,'EXPLORATION_UNAVAILABLE');
 const unsupported=structuredClone(s);unsupported.package.objectives=[];assert.equal(command(unsupported,'EXPLORATION_CONFIG',{enabled:true}).result.code,'EXPLORATION_UNSUPPORTED');
});
test('expired claim fails without TICK; disable closes and reopening does not refund time',()=>{
 let s=fixture();s=command(s,'EXPLORATION_CONFIG',{enabled:true}).state;s=command(s,'START').state;s=command(s,'EXPLORATION_WINDOW',{open:true}).state;s.exploration.learners.a={found:7,fragments:0,choices:[null,null,null]};
 const opened=s.clock.lastNow;
 assert.equal(command(s,'EXPLORATION_REFLECT',{cardId:'sequence-domain',choice:1},opened+120000,{role:'student',id:'a'}).result.code,'EXPLORATION_UNAVAILABLE');
 s=command(s,'EXPLORATION_CONFIG',{enabled:false},opened+40000).state;assert.equal(s.exploration.usedMs,40000);s=command(s,'EXPLORATION_CONFIG',{enabled:true}).state;s=command(s,'EXPLORATION_WINDOW',{open:true}).state;assert.equal(explorationView(s,'a',s.clock.lastNow).remainingMs,80000);
});
test('actual group ROLL uses server result for present members, never late join or failed replay',()=>{
 let s=fixture();s=command(s,'EXPLORATION_CONFIG',{enabled:true}).state;s=command(s,'START').state;
 while(s.timeline.currentActivityId!=='act-form-19')s=command(s,'NEXT').state;
 const group=s.groups[s.timeline.currentActivityId].groups.find(g=>g.memberIds.includes('a'));
 assert.ok(group);const dice=s.groupDice[group.id], actor={role:'student',id:group.memberIds[dice.turnIndex]};
 const target=explorationPoints(s).find(p=>p.position>24&&p.position<32);
 assert.ok(target,'fixed seed puts a discovery inside the group activity');
 for(const t of s.package.tasks.filter(t=>t.activityId===s.timeline.currentActivityId&&t.participation==='group'))s.groupProducts[`${group.id}:${t.id}`]={ok:true};
 let hash=0;for(const ch of `${s.seed}:${group.id}:${dice.rolls}`)hash=(hash*31+ch.charCodeAt(0))>>>0;
 dice.position=target.position-(1+hash%6);dice.carry=0;
 const absent=group.memberIds.find(id=>id!==actor.id);if(absent)s.roster[absent].present=false;
 const result=command(s,'ROLL',{},s.clock.lastNow+1,actor);assert.ok(result.result.ok,JSON.stringify(result.result));
 assert.ok(explorationView(result.state,actor.id,result.state.clock.lastNow).cards.find(c=>c.id===target.id).found);
 if(absent){assert.equal(result.state.exploration.learners[absent],undefined);result.state.roster[absent].present=true;}
 const again=command(result.state,'ROLL',{},result.state.clock.lastNow+1,actor);assert.equal(again.result.ok,false);if(absent)assert.equal(again.state.exploration.learners[absent],undefined);
});
test('paired map discovery follows minimum visible member position, not first runner',()=>{
 let before=fixture();before=command(before,'EXPLORATION_CONFIG',{enabled:true}).state;before=command(before,'START').state;
 before.lessonMode={participation:'pairs',units:[{members:[{id:'a'},{id:'b'}]}]};const p=explorationPoints(before)[0];
 before.diceTrack.a={position:p.position-1};before.diceTrack.b={position:p.position-1};
 let next=structuredClone(before);next.diceTrack.a.position=p.position;
 recordExplorationRoll(before,next,{id:'a'},{from:p.position-1,position:p.position});assert.deepEqual(next.exploration.learners,{});
 before=structuredClone(next);next.diceTrack.b.position=p.position;recordExplorationRoll(before,next,{id:'b'},{from:p.position-1,position:p.position});
 assert.ok(next.exploration.learners.a.found);assert.ok(next.exploration.learners.b.found);
});
test('markers use distinct nongate visible cells; cramped unsupported map cannot enable',()=>{
 const s=fixture(),points=explorationPoints(s);assert.equal(new Set(points.map(p=>p.cell)).size,3);
 const gates=s.package.activities.map((_,i)=>Math.round((i+1)/s.package.activities.length*32));assert.ok(points.every(p=>!gates.includes(p.cell)));
 s.package.activities=Array.from({length:100},(_,i)=>({id:'a'+i,phase:i===0?'formation':'exit'}));
 assert.ok(explorationPoints(s).length<3);assert.equal(explorationView(s,'a',1000).supported,false);assert.equal(command(s,'EXPLORATION_CONFIG',{enabled:true}).result.code,'EXPLORATION_UNSUPPORTED');
});

