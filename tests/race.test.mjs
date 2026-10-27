import {nativeVmModule} from './helpers/vm-native.mjs';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const database=new DatabaseSync(':memory:');
for(const file of ['0000_boring_pete_wisdom.sql','0001_organic_aqueduct.sql','0002_big_ogun.sql','0003_dazzling_rockslide.sql','0004_classy_wolf_cub.sql','0005_reflective_hellion.sql','0006_empty_harry_osborn.sql','0007_rapid_ezekiel.sql'])database.exec(await readFile(resolve('drizzle',file),'utf8'));
database.exec('PRAGMA foreign_keys=ON');
function stmt(sql,...params){const query=database.prepare(sql);return {first:()=>query.get(...params)??null,all:()=>({results:query.all(...params)}),run:()=>{const result=query.run(...params);return {meta:{changes:Number(result.changes)}};}};}
const testEnv={SITE_OWNER_EMAIL:'root@race.test',SITE_OWNER_USER_ID:'root-race-id'};
const storage={stmt,db:()=>({batch:queries=>{database.exec('BEGIN');try{const result=queries.map(q=>q.run());database.exec('COMMIT');return result;}catch(e){database.exec('ROLLBACK');throw e;}}}),getEnv:()=>testEnv};
let clock=Date.now();class TestDate extends Date{static now(){return clock;}}
database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(testEnv.SITE_OWNER_USER_ID,testEnv.SITE_OWNER_EMAIL,'Root',clock);
database.prepare('INSERT INTO system_hosts(account_id,role,created_at,created_by) VALUES(?,?,?,?)').run(testEnv.SITE_OWNER_USER_ID,'root',clock,testEnv.SITE_OWNER_USER_ID);
const context=createContext({structuredClone,Date:TestDate,crypto:globalThis.crypto,Request,Response,URL,TextEncoder,console});
const cache=new Map();
async function moduleAt(path){if(cache.has(path))return cache.get(path);let loadedModule;if(resolve(path)===resolve('lib/storage.js'))loadedModule=new SyntheticModule(['stmt','db','getEnv'],function(){this.setExport('stmt',storage.stmt);this.setExport('db',storage.db);this.setExport('getEnv',storage.getEnv);},{context,identifier:path});else loadedModule=new SourceTextModule(await readFile(path,'utf8'),{context,identifier:path});cache.set(path,loadedModule);return loadedModule;}
const entryModule=await moduleAt(resolve('app/api/escape/route.js'));await entryModule.link((specifier,parent)=>specifier.startsWith('node:')?nativeVmModule(specifier,context):moduleAt(resolve(dirname(parent.identifier),specifier)));await entryModule.evaluate();
const route=entryModule.namespace;
const rootH={'oai-authenticated-user-id':testEnv.SITE_OWNER_USER_ID,'oai-authenticated-user-email':testEnv.SITE_OWNER_EMAIL};
async function post(action,body={},token='',extraH={}){let response=await route.POST(new Request('https://game.test/api/escape',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token,'Origin':'https://game.test',...extraH},body:JSON.stringify({action,requestId:crypto.randomUUID(),...body})}));return {status:response.status,data:await response.json()};}
async function get(kind,id,token,extraH={}){let response=await route.GET(new Request(`https://game.test/api/escape?kind=${kind}&id=${id}`,{headers:{Authorization:'Bearer '+token,...extraH}}));return {status:response.status,data:await response.json()};}
const teacher=(action,body={})=>post(action,body,'',rootH);
const teacherGet=(kind,id)=>get(kind,id,'',rootH);
import {challenge} from '../lib/challenges.js';
import {initRace,roll as pureRoll,finishStation,compareTeams} from '../lib/race.js';
const admin=crypto.randomUUID()+crypto.randomUUID(),id=crypto.randomUUID();
const room=(await teacher('create-room',{id,adminKey:admin,title:'QA Board'})).data.room;
const A=(await post('join',{code:room.code,name:'Cáo',mascot:0})).data.session;
const B=(await post('join',{code:room.code,name:'Rồng',mascot:7})).data.session;
assert.equal((await post('mascot',{id:A.id,mascot:4,round:1},A.token)).status,200);
await teacher('begin',{id});
const state=async team=>(await get('state',team.id,team.token)).data;
const raw=team=>JSON.parse(database.prepare('SELECT data FROM teams WHERE id=?').get(team.id).data);
const edit=(team,fn)=>{let s=raw(team);fn(s);database.prepare('UPDATE teams SET data=?,revision=revision+1 WHERE id=?').run(JSON.stringify(s),team.id);};
function answer(s,index){let p=challenge(index,s.levels[index],s.seed),v={...p.expected};if(index===2)v.circuit='1,0,0,0,0,0,0,0,1';return v;}
async function solve(team){let r=await post('choose-level',{id:team.id,level:0,round:1},team.token);assert.equal(r.status,200,JSON.stringify(r.data));let s=raw(team),i=s.race.outcomes.length;let reply=await post('submit',{id:team.id,input:answer(s,i),round:1},team.token);assert.equal(reply.status,200,JSON.stringify(reply.data));assert.equal(reply.data.result.ok,true,JSON.stringify(reply.data));return reply.data;}
assert.equal((await post('abandon',{id:A.id,round:1},A.token)).status,400,'Start cannot be skipped');
assert.equal((await post('roll',{id:A.id,sequence:0,round:1},A.token)).status,409,'Busy teams cannot roll');
let a=await solve(A);assert.equal(a.state.race.phase,'travel');assert.equal(a.map.turn.cursor,A.id,'Busy peer is passed');
assert(!JSON.stringify(a.state).includes('eventOrder'));assert(!JSON.stringify(a.state).includes('"bag"'));
let seq=a.map.turn.sequence;
const requestId=crypto.randomUUID();let first=await post('roll',{id:A.id,sequence:seq,round:1,requestId},A.token);
assert.equal(first.status,200);let before=raw(A).race.rolls;
assert.equal((await post('roll',{id:A.id,sequence:seq,round:1,requestId},A.token)).status,200);
assert.equal(raw(A).race.rolls,before,'Retry cannot move twice');
assert.equal((await post('roll',{id:A.id,sequence:seq,round:1},A.token)).status,409,'Old turn cannot roll again');
await solve(B);
async function settleBonus(team){let d=await state(team);if(d.state.effects.freezeUntil>clock)clock=d.state.effects.freezeUntil+1;let s=raw(team);if(s.race.bonus&&!s.race.bonus.done){let r=await post('bonus',{id:team.id,answer:s.race.bonus.answer,round:1},team.token);assert.equal(r.data.result.ok,true,JSON.stringify(r.data));}}
// Walk both teams; A abandons all three middle stations, B solves them.
let limit=100;while(limit--){await settleBonus(A);await settleBonus(B);for(const team of [A,B]){let d=await state(team),s=raw(team);if(s.race.phase==='challenge'){if(team===A&&s.race.outcomes.length>0&&s.race.outcomes.length<4){let early=await post('abandon',{id:A.id,round:1},A.token);if(clock-s.race.entered<90000)assert.equal(early.status,400);clock=Math.max(clock,s.race.entered+90001);let skipped=await post('abandon',{id:A.id,round:1},A.token);assert.equal(skipped.status,200,JSON.stringify(skipped.data));}else await solve(team);}}let d=await state(A);if([A,B].every(t=>raw(t).race.phase==='gate'))break;let current=d.map.turn.cursor,team=current===A.id?A:current===B.id?B:null;if(!team){clock+=16001;continue;}let r=await post('roll',{id:team.id,sequence:d.map.turn.sequence,round:1},team.token);assert.equal(r.status,200,JSON.stringify(r.data));}
assert(limit>0,'Both teams reach final gate');
for(const team of [A,B]){let s=raw(team);assert.equal(s.race.position,32);assert.equal(s.race.encounters.length,6);assert.equal(new Set(s.race.encounters.map(e=>e.kind)).size,6);assert(s.race.rolls>=8&&s.race.rolls<=11);let code=s.race.outcomes.map(o=>o.digit).join('');let r=await post('unlock',{id:team.id,code,round:1},team.token);assert.equal(r.data.state.status,'completed');}
assert.equal(raw(A).race.outcomes.filter(o=>o.skipped).length,3);
assert.equal((await post('abandon',{id:A.id,round:1},A.token)).status,400);
let board=(await teacherGet('board',id)).data;assert.equal(board.teams.find(t=>t.id===A.id).completed,2);assert.equal(board.teams[0].id,B.id,'Points rank finished teams');
// Card redemption and hints use new teams so completed records remain fixed.
const C=(await post('join',{code:room.code,name:'Robot'})).data.session;
await solve(C);edit(C,s=>{s.race.cards=1;});
let card=await post('skill',{id:C.id,skill:'shield',free:true,round:1},C.token);assert.equal(card.status,200,JSON.stringify(card.data));assert.equal(card.data.skill.cost,0);
assert.equal((await post('skill',{id:C.id,skill:'help',free:true,target:C.id,round:1},C.token)).status,400);
// Pure exhaustive seed sampling verifies fair coverage, no bypass, and 21-per-six.
let min=99,max=0,distribution={};for(let seed=0;seed<10000;seed++){let s={id:'x',seed,score:0,penalty:0,solved:[],events:[]};initRace(s);finishStation(s,8,0);let dice=[];while(s.race.position<32){let r=pureRoll(s,100000);dice.push(r.die);if(s.race.phase==='challenge')finishStation(s,1,100000,true);}assert.equal(s.race.encounters.length,6);assert.equal(new Set(s.race.encounters.map(e=>e.kind)).size,6);assert.equal(dice.slice(0,6).reduce((a,b)=>a+b),21);min=Math.min(min,dice.length);max=Math.max(max,dice.length);distribution[dice.length]=(distribution[dice.length]||0)+1;}
assert.equal(min,8);assert.equal(max,11);
assert(compareTeams({id:'a',status:'completed',score:1,adjustedMs:1000},{id:'b',status:'timeout',score:999,adjustedMs:1,completed:5,race:{position:32}})<0);
console.log('Race integration passed: permissions, mascot, turn order, retries, barriers, abandonment, all events, final code, free card, ranking.');
console.log('10,000 journey seeds: rolls',min,'to',max,'distribution',distribution,'; each team receives all six event types.');
// Concurrent callers cannot use one turn twice or redeem one card twice.
let c=await state(C),sequence=c.map.turn.sequence,rollsBefore=raw(C).race.rolls;
let concurrent=await Promise.all([post('roll',{id:C.id,sequence,round:1},C.token),post('roll',{id:C.id,sequence,round:1},C.token)]);
assert.equal(concurrent.filter(r=>r.status===200).length,1);assert.equal(raw(C).race.rolls,rollsBefore+1);
edit(C,s=>{s.race.cards=2;});clock+=61000;
let redeem=await Promise.all([post('skill',{id:C.id,skill:'shield',free:true,round:1},C.token),post('skill',{id:C.id,skill:'shield',free:true,round:1},C.token)]);
assert.equal(redeem.filter(r=>r.status===200).length,1,'Remaining free card spent once');
assert.equal(database.prepare('SELECT COUNT(*) AS n FROM skill_actions WHERE actor_id=? AND cost=0').get(C.id).n,2);
// Busy/frozen teams are passed and the deadline advances without client trust.
// The preceding random roll can leave every team at a challenge or bonus.
// Keep one eligible traveler so this assertion measures deadline auto-pass.
edit(C,s=>{s.race.phase='travel';s.race.bonus=null;s.race.bonusQueue=[];s.race.reward=null;});
let d=await state(C);let oldSequence=d.map.turn.sequence;clock+=11000;let next=await state(C);assert(next.map.turn.sequence>oldSequence);
let hintTeam=(await post('join',{code:room.code,name:'QA Hint'})).data.session;
await post('choose-level',{id:hintTeam.id,level:0,round:1},hintTeam.token);
let hint=await post('hint',{id:hintTeam.id,level:1,round:1},hintTeam.token);assert.equal(hint.data.state.penalty,60000);assert.equal(hint.data.state.effects.freezeUntil,clock+8000);
let frozen=await post('submit',{id:hintTeam.id,input:answer(raw(hintTeam),0),round:1},hintTeam.token);assert.equal(frozen.data.result.reason,'frozen');
clock+=8001;let unlocked=await post('submit',{id:hintTeam.id,input:answer(raw(hintTeam),0),round:1},hintTeam.token);assert.equal(unlocked.data.result.ok,true);
console.log('Concurrent turn/card guards, deadline auto-pass, and hint freeze passed.');
// Teacher-created thematic campaigns are enforced by the same authoritative API.
const themedId=crypto.randomUUID(),themedAdmin=crypto.randomUUID()+crypto.randomUUID();
let invalid=await teacher('create-room',{id:crypto.randomUUID(),adminKey:themedAdmin,campaign:{grade:10,topics:['integral']}});assert.equal(invalid.status,400);
let themed=(await teacher('create-room',{id:themedId,adminKey:themedAdmin,title:'Aurora QA',campaign:{theme:'future',grade:12,topics:['integral','conditional'],minLevel:0,maxLevel:2,stationMax:2}})).data.room;
const T=(await post('join',{code:themed.code,name:'Phi đội QA',mascot:6})).data.session;
let publicT=await state(T);assert.equal(publicT.state.race.campaign.theme,'future');assert(!('seed'in publicT.state.race.campaign));
await teacher('begin',{id:themedId});
assert.equal((await post('choose-level',{id:T.id,level:4,round:1},T.token)).status,400,'Teacher maximum cannot be bypassed');
assert.equal((await post('roll',{id:T.id,round:1},T.token)).status,400,'Campaign rooms cannot roll dice');
edit(T,s=>{s.score=10000;});
const {stationLogic}=await import('../lib/station-logic.js');
let maths=0;
for(let guard=0;guard<55&&raw(T).race.phase!=='gate';guard++){
 clock+=16000;let s=raw(T);
 if(s.race.reward){let awarded=await post('reward',{id:T.id,choice:'points',round:1},T.token);assert.equal(awarded.status,200);continue;}
 if(s.race.bonus&&!s.race.bonus.done){let q=s.race.bonus;let reply=await post('bonus',{id:T.id,answer:String(q.answer),round:1},T.token);assert.equal(reply.status,200);assert(reply.data.result.ok);assert(!('answer'in (reply.data.state.race.bonus||{})));maths++;continue;}
 if(s.race.phase==='challenge'){let i=s.race.outcomes.length;await post('choose-level',{id:T.id,level:0,round:1},T.token);let p=stationLogic(i,0,s.seed),input={...p.expected};if(i===2)input.circuit='1,0,0,0,0,0,0,0,1';let reply=await post('submit',{id:T.id,input,round:1},T.token);assert.equal(reply.status,200,JSON.stringify(reply.data));assert(reply.data.result.ok);continue;}
 clock+=16000;let dState=await state(T);let reply=await post('choose',{id:T.id,steps:6,sequence:dState.map.turn.sequence,round:1},T.token);assert.equal(reply.status,200,JSON.stringify(reply.data));assert.equal(reply.data.result.ok,true);
}
assert.equal(maths,5);assert.equal(raw(T).race.outcomes.length,5);
let tc=raw(T).race.outcomes.map(o=>o.digit).join('');assert((await post('unlock',{id:T.id,code:tc,round:1},T.token)).data.result.ok);
let themedBoard=(await teacherGet('board',themedId)).data;assert.equal(themedBoard.room.campaign.grade,12);assert.equal(themedBoard.teams[0].mathHistory.length,5);assert(themedBoard.teams[0].mathHistory.every(q=>q.steps.length&&Number.isFinite(q.answer)));
await teacher('reset-room',{id:themedId,revision:themedBoard.room.revision,confirmCode:themed.code});
let resetThemed=await state(T);assert.equal(resetThemed.state.race.campaign.theme,'future');assert.equal(resetThemed.state.race.position,0);assert.equal(resetThemed.state.score,240,'A fresh campaign round re-grants the 240 starting points');assert(!('mathHistory'in resetThemed.state.race));
console.log('Thematic campaign API passed: teacher matrix, maximum level, private solutions, 5 queued questions, all gates, final unlock, reset configuration.');
// Single-attempt choices, concurrent reward redemption, limited self-trades and movement skills.
const U=(await post('join',{code:themed.code,name:'QA Trade',mascot:2})).data.session;
await teacher('begin',{id:themedId});
edit(U,s=>{finishStation(s,1,clock);s.score=500;});
const {contextQuestion}=await import('../lib/context-questions.js');
edit(U,s=>{s.race.bonus=contextQuestion({topic:'integral',level:0,category:'digital',format:'mcq'},27);s.race.bonus.serial=99;});
let uq=raw(U).race.bonus,wrongOption=String((Number(uq.answer)+1)%4);
let wrongChoice=await post('bonus',{id:U.id,answer:wrongOption,round:2},U.token);assert(!wrongChoice.data.result.ok);assert(wrongChoice.data.state.race.bonus.done);assert.equal((await post('bonus',{id:U.id,answer:uq.answer,round:2},U.token)).status,400,'Cannot guess another option');
edit(U,s=>{s.cooldown=0;s.race.bonus=contextQuestion({topic:'quadratic',level:1,category:'theory',format:'tf'},33);s.race.bonus.serial=100;});
let correctTF=await post('bonus',{id:U.id,answer:raw(U).race.bonus.answer,round:2},U.token);assert(correctTF.data.result.ok);assert(correctTF.data.state.race.reward);
let rewardReplies=await Promise.all([post('reward',{id:U.id,choice:'points',round:2},U.token),post('reward',{id:U.id,choice:'points',round:2},U.token)]);assert.equal(rewardReplies.filter(r=>r.status===200).length,1);assert.equal(raw(U).score,560);
assert.equal((await post('pact',{id:U.id,choice:'pass',round:2},U.token)).status,200);let um=await state(U);clock+=11000;um=await state(U);assert.equal(um.map.turn.skipLedger[U.id],1,'Exactly one eligible slot pays the pact');let repeated=await state(U);assert.equal(repeated.map.turn.skipLedger[U.id],1);
assert.equal((await post('pact',{id:U.id,choice:'delay',round:2},U.token)).status,200);assert.equal(raw(U).penalty,45000);assert.equal((await post('pact',{id:U.id,choice:'delay',round:2},U.token)).status,400);
for(const skill of ['time','boost'])assert.equal((await post('skill',{id:U.id,skill,round:2},U.token)).status,200);
assert.equal((await post('skill',{id:U.id,skill:'double',free:true,round:2},U.token)).status,400,'Free card cannot buy premium movement');
assert.equal((await post('skill',{id:U.id,skill:'double',round:2},U.token)).status,400,'Double dice is locked in campaign (v34)');
let skillState=await state(U);assert.equal(skillState.state.race.timeBonus,30000);let ur=await post('choose',{id:U.id,steps:1,sequence:skillState.map.turn.sequence,round:2},U.token);assert.equal(ur.status,200,JSON.stringify(ur.data));assert.equal(ur.data.result.ok,true);assert.equal(ur.data.result.cost,30,'Purchased steps cost 30đ each');assert.equal(ur.data.result.to-ur.data.result.from,3,'1 bought step plus 2 boost-carry');assert.equal(raw(U).race.usedBoosts,1);
assert.equal((await post('skill',{id:U.id,skill:'boost',round:2},U.token)).status,200);assert.equal((await post('skill',{id:U.id,skill:'boost',round:2},U.token)).status,400,'Two-purchase cap');
console.log('Extended mechanics passed: one-shot choices, one reward under concurrency, exact pact pass, trade caps, time credit, extra dice/steps, premium card exclusion.');
