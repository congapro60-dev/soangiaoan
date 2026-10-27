import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import * as nodeCrypto from 'node:crypto';
const database=new DatabaseSync(':memory:');
for(const file of ['0000_boring_pete_wisdom.sql','0001_organic_aqueduct.sql','0002_big_ogun.sql','0003_dazzling_rockslide.sql','0004_classy_wolf_cub.sql','0005_reflective_hellion.sql','0006_empty_harry_osborn.sql','0007_rapid_ezekiel.sql'])database.exec(await readFile(resolve('drizzle',file),'utf8'));
database.exec('PRAGMA foreign_keys=ON');
function stmt(sql,...params){const query=database.prepare(sql);return {first:()=>query.get(...params)??null,all:()=>({results:query.all(...params)}),run:()=>{const result=query.run(...params);return {meta:{changes:Number(result.changes)}};}};}
const testEnv={SITE_OWNER_EMAIL:'root@community.test',SITE_OWNER_USER_ID:'root-community-id'};
const storage={stmt,db:()=>({batch:queries=>{database.exec('BEGIN');try{const result=queries.map(q=>q.run());database.exec('COMMIT');return result;}catch(e){database.exec('ROLLBACK');throw e;}}}),getEnv:()=>testEnv};
let clock=Date.now();class TestDate extends Date{static now(){return clock;}}
database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(testEnv.SITE_OWNER_USER_ID,testEnv.SITE_OWNER_EMAIL,'Root',clock);
database.prepare('INSERT INTO system_hosts(account_id,role,created_at,created_by) VALUES(?,?,?,?)').run(testEnv.SITE_OWNER_USER_ID,'root',clock,testEnv.SITE_OWNER_USER_ID);
const context=createContext({Date:TestDate,crypto:globalThis.crypto,structuredClone,Request,Response,URL,TextEncoder,console});
const cache=new Map();
async function moduleAt(path){if(cache.has(path))return cache.get(path);let loadedModule;if(resolve(path)===resolve('lib/storage.js'))loadedModule=new SyntheticModule(['stmt','db','getEnv'],function(){this.setExport('stmt',storage.stmt);this.setExport('db',storage.db);this.setExport('getEnv',storage.getEnv);},{context,identifier:path});else loadedModule=new SourceTextModule(await readFile(path,'utf8'),{context,identifier:path});cache.set(path,loadedModule);return loadedModule;}
const cryptoModule=new SyntheticModule(['createHash'],function(){this.setExport('createHash',nodeCrypto.createHash);},{context});
const entryModule=await moduleAt(resolve('app/api/escape/route.js'));await entryModule.link((specifier,parent)=>specifier==='node:crypto'?cryptoModule:moduleAt(resolve(dirname(parent.identifier),specifier)));await entryModule.evaluate();
const route=entryModule.namespace;
const rootH={'oai-authenticated-user-id':testEnv.SITE_OWNER_USER_ID,'oai-authenticated-user-email':testEnv.SITE_OWNER_EMAIL};
async function post(action,body={},token='',extraH={}){let response=await route.POST(new Request('https://game.test/api/escape',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token,'Origin':'https://game.test',...extraH},body:JSON.stringify({action,requestId:crypto.randomUUID(),...body})}));return {status:response.status,data:await response.json()};}
async function get(kind,id,token,extraH={}){let response=await route.GET(new Request(`https://game.test/api/escape?kind=${kind}&id=${id}`,{headers:{Authorization:'Bearer '+token,...extraH}}));return {status:response.status,data:await response.json()};}
const teacher=(action,body={})=>post(action,body,'',rootH);
const teacherGet=(kind,id)=>get(kind,id,'',rootH);

import {stationLogic} from '../lib/station-logic.js';
import {finishStation} from '../lib/race.js';
import {communityQuestion,gameNow} from '../lib/community.js';
const id=crypto.randomUUID(),admin=crypto.randomUUID()+crypto.randomUUID();
const room=(await teacher('create-room',{id,adminKey:admin,title:'26 learners',campaign:{playMode:'individual',community:'boat',theme:'dewey',grade:10,topics:['quadratic','vectors'],minLevel:0,maxLevel:1}})).data.room;
await teacherGet('board',id); // Initial room metadata is stable before concurrent joins.
const joined=await Promise.all(Array.from({length:26},(_,i)=>post('join',{code:room.code,name:'Học sinh '+(i+1),mascot:i%8})));
assert(joined.every(x=>x.status===200),JSON.stringify(joined.filter(x=>x.status!==200)));
const players=joined.map(x=>x.data.session);
const raw=p=>JSON.parse(database.prepare('SELECT data FROM teams WHERE id=?').get(p.id).data);
const edit=(p,fn)=>{let s=raw(p);fn(s);database.prepare('UPDATE teams SET data=?,revision=revision+1 WHERE id=?').run(JSON.stringify(s),p.id);};
const currentRoom=()=>database.prepare('SELECT * FROM rooms WHERE id=?').get(id);
await teacher('begin',{id});
let levels=await Promise.all(players.map(p=>post('choose-level',{id:p.id,round:1,level:0},p.token)));
assert(levels.every(x=>x.status===200));
let solved=await Promise.all(players.map(p=>post('submit',{id:p.id,round:1,input:stationLogic(0,0,raw(p).seed).expected},p.token)));
assert(solved.every(x=>x.status===200&&x.data.result.ok),JSON.stringify(solved.filter(x=>x.status!==200)));
let moves=await Promise.all(players.map(p=>post('choose',{id:p.id,steps:3,sequence:0,round:1},p.token)));
assert(moves.every(x=>x.status===200),'26 players move without global turn contention');
let first=players[0],oldRolls=raw(first).race.rolls;
assert.equal((await post('roll',{id:first.id,sequence:oldRolls,round:1},first.token)).status,400,'Campaign rooms cannot roll dice');
clock+=100000;
for(let p of players)edit(p,s=>{s.race.position=17;s.race.outcomes=[];s.solved=[];for(let i=0;i<3;i++)finishStation(s,1,clock);s.race.phase='travel';s.race.bag=[1,2,3,4,5,6];s.race.bonus=null;s.race.bonusQueue=[];s.race.reward=null;s.race.lastRollAt=0;});
edit(players[25],s=>s.events.push({type:'ice',at:clock,until:clock+20000,source:'QA freeze'}));
let trigger=await Promise.all(players.map(p=>post('choose',{id:p.id,steps:2,sequence:raw(p).race.rolls,round:1},p.token)));
assert.equal(trigger.filter(x=>x.status===200).length,1,'Exactly one movement triggers a community event');
let c=JSON.parse(currentRoom().race).community;assert(c&&c.roster.length===26);
assert.equal(database.prepare('SELECT COUNT(*) AS n FROM community_players WHERE event_id=?').get(c.id).n,26);
let paused=gameNow(currentRoom(),clock);let originalScore=raw(first).score;
assert.equal((await post('hint',{id:first.id,level:1,round:1},first.token)).status,409);
assert.equal((await post('pact',{id:first.id,choice:'delay',round:1},first.token)).status,409);
assert.equal((await post('skill',{id:first.id,skill:'time',round:1},first.token)).status,409);
assert.equal((await post('community-answer',{id:first.id,step:0,answer:'1',round:1},first.token)).status,409,'Cannot answer during countdown');
let late=(await post('join',{code:room.code,name:'Khán giả muộn'})).data.session;
assert.equal((await post('community-answer',{id:late.id,step:0,answer:'1',round:1},late.token)).status,409,'Late join is a spectator');
clock=c.startAt;
const entry=p=>JSON.parse(database.prepare('SELECT data FROM community_players WHERE id=?').get(c.id+'.'+p.id).data);
let answers=players.map(p=>String(communityQuestion(c,raw(p).campaign,entry(p)).answer));
let cachedId=crypto.randomUUID();let firstAnswer=await post('community-answer',{id:first.id,step:0,answer:answers[0],round:1,requestId:cachedId},first.token);assert(firstAnswer.data.result.correct);
assert.equal((await post('community-answer',{id:first.id,step:0,answer:answers[0],round:1,requestId:cachedId},first.token)).status,200);
assert.equal(entry(first).step,1,'Retry never advances twice');
let rest=await Promise.all(players.slice(1).map((p,i)=>post('community-answer',{id:p.id,step:0,answer:answers[i+1],round:1},p.token)));
assert(rest.every(x=>x.status===200&&x.data.result.correct),'25 simultaneous answers save independently');
assert.equal((await post('community-answer',{id:first.id,step:1,answer:'0',round:1},first.token)).status,409,'2.5-second anti-spam interval');
clock+=2500;
let concurrent=await Promise.all([post('community-answer',{id:first.id,step:1,answer:'-99999',round:1},first.token),post('community-answer',{id:first.id,step:1,answer:communityQuestion(c,raw(first).campaign,entry(first)).answer,round:1},first.token)]);
assert.equal(concurrent.filter(x=>x.status===200).length,1,'One submission per question under concurrency');
assert.equal(entry(first).step,2);assert.equal(entry(first).wrong,concurrent.find(x=>x.status===200).data.result.correct?0:1,'Only the winning concurrent submission is scored');
let wrongPlayer=players[1],wrongEntry=entry(wrongPlayer);let wrongResult=await post('community-answer',{id:wrongPlayer.id,step:wrongEntry.step,answer:'-99999',round:1},wrongPlayer.token);assert.equal(wrongResult.status,200);assert.equal(wrongResult.data.result.correct,false);assert.equal(entry(wrongPlayer).step,wrongEntry.step+1,'Wrong advances the question, prevents guessing');assert.equal(entry(wrongPlayer).wrong,1);
clock+=2500;
for(let step=2;step<6;step++){
 let r=await Promise.all(players.map(p=>{let e=entry(p);return post('community-answer',{id:p.id,step:e.step,answer:communityQuestion(c,raw(p).campaign,e).answer,round:1},p.token);}));
 assert(r.every(x=>x.status===200));clock+=2500;
}
assert.equal(entry(first).step,6);
let snap=(await get('state',first.id,first.token)).data;
assert.equal(snap.state.community.own.question,null);assert(!JSON.stringify(snap.map).includes('"seed"'));
assert(!JSON.stringify(snap.state.community).includes('"expected"'));assert(!JSON.stringify(snap.state.community).includes('"guides"'));
assert.equal(gameNow(currentRoom(),clock),paused,'Main game clock is stopped');let frozen=(await get('state',players[25].id,players[25].token)).data.state;assert.equal(frozen.effects.freezeUntil-gameNow(currentRoom(),clock),20000,'Existing freeze duration pauses with the main game');
let teacherBoard=(await teacherGet('board',id)).data;assert(teacherBoard.community.guides[0].attempts[0].steps.length);assert(Number.isFinite(teacherBoard.community.guides[0].attempts[0].expected));
clock=c.finishAt;
assert.equal((await post('community-answer',{id:players[1].id,step:5,answer:'1',round:1},players[1].token)).status,409,'No answers after the deadline');
assert.equal((await get('state',first.id,first.token)).data.state.community.phase,'results');
clock=c.resumeAt+1;
let returned=(await get('state',first.id,first.token)).data;
assert.equal(returned.state.community.phase,'done');assert.equal(raw(first).score,originalScore+returned.state.community.entries.find(e=>e.id===first.id).reward);
let score=raw(first).score;await get('state',first.id,first.token);assert.equal(raw(first).score,score,'Reward awarded once, including refresh');
assert.equal(gameNow(currentRoom(),clock),paused+1,'Clock resumes after exactly 65 seconds');let thawing=(await get('state',players[25].id,players[25].token)).data.state;assert.equal(thawing.effects.freezeUntil-gameNow(currentRoom(),clock),19999,'Existing freeze retains its remaining duration after the regatta');
let cfg=returned.state.race.campaign;assert.equal(cfg.theme,'dewey');assert.equal(cfg.playMode,'individual');assert(!cfg.cells.includes(18));
let board=(await teacherGet('board',id)).data;assert.equal(board.teams.length,27);assert.equal(board.teams.find(x=>x.id===first.id).elapsedMs,gameNow(currentRoom(),clock)-raw(first).start);
// Individual pass pact is consumed once, without consuming dice, then enforces cadence.
edit(first,s=>{s.race.phase='travel';s.race.bonus=null;s.race.reward=null;s.race.lastRollAt=0;s.race.promisedPasses=1;s.race.paidPasses=0;});
let rcount=raw(first).race.rolls,position=raw(first).race.position;
let pass=await post('roll',{id:first.id,sequence:rcount,round:1},first.token);assert.equal(pass.status,200);assert(pass.data.result.skipped);assert.equal(raw(first).race.rolls,rcount);assert.equal(raw(first).race.position,position);
assert.equal((await post('roll',{id:first.id,sequence:rcount,round:1},first.token)).status,400,'Pact pass is spent; dice stay locked in campaign');let next=await post('choose',{id:first.id,steps:1,sequence:rcount,round:1},first.token);assert.equal(next.status,200);assert(!next.data.result.skipped);
// Reset interrupts a community event and invalidates its old requests.
let revision=currentRoom().revision;
let reset=await teacher('reset-room',{id,revision,confirmCode:room.code});assert.equal(reset.status,200);
assert.equal(JSON.parse(currentRoom().race),null);
assert.equal((await post('community-answer',{id:first.id,step:6,answer:1,round:1},first.token)).data.code,'SESSION_RESET');
let clean=(await get('state',first.id,first.token)).data;assert.equal(clean.state.community,null);assert.equal(clean.state.status,'waiting');assert.equal(clean.state.score,240,'Fresh campaign round re-grants the 240 starting points');
console.log('26-player integration passed: independent movement, one shared trigger, paused main timers, parallel answers, one-shot/cooldown/retry guards, spectator handling, private solutions, teacher explanations, one reward, resumed time, pass pact and reset.');
