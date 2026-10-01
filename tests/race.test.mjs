import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const database=new DatabaseSync(':memory:');
for(const file of ['0000_boring_pete_wisdom.sql','0001_organic_aqueduct.sql','0002_big_ogun.sql','0003_dazzling_rockslide.sql'])database.exec(await readFile(resolve('drizzle',file),'utf8'));
database.exec('PRAGMA foreign_keys=ON');
function stmt(sql,...params){const query=database.prepare(sql);return {first:()=>query.get(...params)??null,all:()=>({results:query.all(...params)}),run:()=>{const result=query.run(...params);return {meta:{changes:Number(result.changes)}};}};}
const storage={stmt,db:()=>({batch:queries=>{database.exec('BEGIN');try{const result=queries.map(q=>q.run());database.exec('COMMIT');return result;}catch(e){database.exec('ROLLBACK');throw e;}}})};
let clock=Date.now();class TestDate extends Date{static now(){return clock;}}
const context=createContext({Date:TestDate,crypto:globalThis.crypto,Request,Response,URL,TextEncoder,console});
const cache=new Map();
async function moduleAt(path){if(cache.has(path))return cache.get(path);let module;if(path.endsWith('/lib/storage.js'))module=new SyntheticModule(['stmt','db'],function(){this.setExport('stmt',storage.stmt);this.setExport('db',storage.db);},{context,identifier:path});else module=new SourceTextModule(await readFile(path,'utf8'),{context,identifier:path});cache.set(path,module);await module.link((specifier,parent)=>moduleAt(resolve(dirname(parent.identifier),specifier)));return module;}
const module=await moduleAt(resolve('app/api/escape/route.js'));await module.evaluate();
const route=module.namespace;
async function post(action,body={},token=''){let response=await route.POST(new Request('https://game.test/api/escape',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token,'Origin':'https://game.test'},body:JSON.stringify({action,requestId:crypto.randomUUID(),...body})}));return {status:response.status,data:await response.json()};}
async function get(kind,id,token){let response=await route.GET(new Request(`https://game.test/api/escape?kind=${kind}&id=${id}`,{headers:{Authorization:'Bearer '+token}}));return {status:response.status,data:await response.json()};}
import {challenge} from '../lib/challenges.js';
import {initRace,roll as pureRoll,finishStation,compareTeams} from '../lib/race.js';
const admin=crypto.randomUUID()+crypto.randomUUID(),id=crypto.randomUUID();
const room=(await post('create-room',{id,adminKey:admin,title:'QA Board'})).data.room;
const A=(await post('join',{code:room.code,name:'Cáo',mascot:0})).data.session;
const B=(await post('join',{code:room.code,name:'Rồng',mascot:7})).data.session;
assert.equal((await post('mascot',{id:A.id,mascot:4,round:1},A.token)).status,200);
await post('begin',{id},admin);
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
let board=(await get('board',id,admin)).data;assert.equal(board.teams.find(t=>t.id===A.id).completed,2);assert.equal(board.teams[0].id,B.id,'Points rank finished teams');
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
let d=await state(C);let oldSequence=d.map.turn.sequence;clock+=11000;let next=await state(C);assert(next.map.turn.sequence>oldSequence);
let hintTeam=(await post('join',{code:room.code,name:'QA Hint'})).data.session;
await post('choose-level',{id:hintTeam.id,level:0,round:1},hintTeam.token);
let hint=await post('hint',{id:hintTeam.id,level:1,round:1},hintTeam.token);assert.equal(hint.data.state.penalty,60000);assert.equal(hint.data.state.effects.freezeUntil,clock+8000);
let frozen=await post('submit',{id:hintTeam.id,input:answer(raw(hintTeam),0),round:1},hintTeam.token);assert.equal(frozen.data.result.reason,'frozen');
clock+=8001;let unlocked=await post('submit',{id:hintTeam.id,input:answer(raw(hintTeam),0),round:1},hintTeam.token);assert.equal(unlocked.data.result.ok,true);
console.log('Concurrent turn/card guards, deadline auto-pass, and hint freeze passed.');
