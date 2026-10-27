import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import { createHash } from 'node:crypto';
import { GAME_ACTIVITY_TYPES, createGameActivity, applyGameActivity, publicGameActivity, finishGameActivity, settleGameActivities, withdrawGameActivity } from '../lib/game-community-activities.js';
import { createCampaign } from '../lib/campaign.js';
import { registerPause, gameNow, activeEvent, canOpenEvent } from '../lib/community.js';
import { createGame } from '../lib/mode-engine/index.js';
import { projectMode } from '../lib/mode-runtime.js';

const config = createCampaign({ grade: 10, topics: ['quadratic','vectors'], playMode: 'individual' }, 12);
const roster = ['a','b','c','d'].map(id=>({id,name:id,status:'active'}));
const room = {id:'unit-room',round:1};
function solve(event,id,requestId,wall,wrong=false) {
  const own=event.engine.participants[id];
  if(event.type==='buzzer')event=applyGameActivity(event,{learnerId:id,eventAction:'buzz',step:own.step,requestId:`buzz-${requestId}`},wall);
  if(event.type==='mountain')event=applyGameActivity(event,{learnerId:id,eventAction:'pick',cellId:own.taskIds[own.step],requestId:`pick-${requestId}`},wall);
  const taskId=event.type==='mountain'?event.engine.participants[id].selectedCellId:own.taskIds[own.step];
  const key=event.engine.tasks.find(task=>task.id===taskId).evaluation.answerKey;
  return applyGameActivity(event,{learnerId:id,eventAction:'answer',step:own.step,requestId,answer:wrong?key+1:key},wall);
}
for(const type of GAME_ACTIVITY_TYPES){
  let event=createGameActivity(room,config,roster,type,1000,type);
  const initial=publicGameActivity(event,1001,'a');
  assert.equal(initial.phase,'countdown');assert.equal(initial.own.canAnswer,false);assert.equal(initial.own.task,null);
  assert.throws(()=>solve(event,'a','early',event.startAt-1),/EVENT_BOUNDARY/);
  const start=event.startAt+1;
  if(type==='relay'){
    const team=event.engine.teams[0],notTurn=team.memberIds[1];
    assert.throws(()=>solve(event,notTurn,'not-turn',start),/NOT_EVENT_TURN/);
    const first=team.memberIds[0];event=solve(event,first,'relay-turn',start);
    assert.equal(event.engine.teams[0].turn,1);
    event=solve(event,notTurn,'relay-next',start+1);
  }else{
    event=solve(event,'a','first',start);
    assert.equal(event.engine.participants.a.score,10);
    assert.equal(event.engine.participants.a.correct,1);
    if(type==='surf'){event=solve(event,'a','second',start+1);event=solve(event,'a','third',start+2);assert.equal(event.engine.participants.a.score,60);}
    if(type==='bingo')assert.equal(event.engine.participants.a.bingo[0],true);
    if(type==='mountain')assert.equal(event.engine.participants.a.usedCellIds.length,1);
    if(type==='boss')assert.equal(event.engine.bossHealth,11);
    if(type==='tug')assert.equal(event.engine.teams[event.engine.participants.a.team].points,10);
    if(type==='duel')assert.ok(event.engine.participants.a.opponent);
    if(type==='buzzer')assert.equal(event.engine.fastest.learnerId,'a');
  }
  const publicView=publicGameActivity(event,start+5,'a');
  assert(!JSON.stringify(publicView).includes('answerKey'));assert(!JSON.stringify(publicView).includes('seed'));
  assert.equal(publicGameActivity(event,start+5,'late').own,null);
  assert.equal(publicGameActivity(event,start+5,null,true).own,null);
  assert.throws(()=>solve(event,'absent','unknown',start+5),/Cannot read|EVENT_LEARNER_UNAVAILABLE/);
  const next=withdrawGameActivity(event,['a','b'],start+5);assert.equal(next.engine.participants.c.absentAt,start+5);
  const finished=finishGameActivity(room,event,start+8);
  assert.equal(finished.resumeAt,start+8);
  const pauseRace={classActivity:finished,pauses:registerPause(null,finished)};
  const pausedRoom={...room,race:JSON.stringify(pauseRace)};
  assert.equal(gameNow(pausedRoom,start+7),1000);
  assert.equal(activeEvent(pausedRoom,start+9),null);
  const player={id:'a',score:100,events:[]};
  settleGameActivities(player,pausedRoom,start+8,1000);const score=player.score;
  settleGameActivities(player,pausedRoom,start+9,1001);assert.equal(player.score,score);
  assert.equal(player.events.length,1);
}
assert.equal(canOpenEvent({pauses:Array.from({length:6},(_,i)=>({id:String(i),openedAt:1,resumeAt:2}))},3).code,'EVENT_BUDGET');
const modeRoom={...room,started:1000};
let modeRace={modeState:createGame({rule:'treasure',learners:roster,gameNow:1000}),pauses:[]};
for(let i=0;i<2;i++){
  const opened=1000+i*1000,event=createGameActivity(modeRoom,config,roster,'boss',opened,`mode-${i}`);
  modeRace.classActivity=event;modeRace.pauses=registerPause(modeRace,event);
  modeRoom.race=JSON.stringify(modeRace);modeRace.modeState=projectMode(modeRoom,opened+10);
  assert.equal(modeRace.modeState.communityOpened,true);
  assert.equal(modeRace.modeState.gameNow,1000+i*900);
  modeRace.classActivity=finishGameActivity(modeRoom,event,opened+100);modeRace.pauses=registerPause(modeRace,modeRace.classActivity);
  modeRoom.race=JSON.stringify(modeRace);modeRace.modeState=projectMode(modeRoom,opened+100);
  assert.equal(modeRace.modeState.communityOpened,false,'Each consecutive event closes its own request ID');
  modeRoom.race=JSON.stringify(modeRace);assert.equal(projectMode(modeRoom,opened+200).gameNow,1100+i*900);
}

// Native route, real in-memory SQLite, two independent pupil tokens; no browser-only mock of authorization.
const database=new DatabaseSync(':memory:');
for(const file of ['0000_boring_pete_wisdom.sql','0001_organic_aqueduct.sql','0002_big_ogun.sql','0003_dazzling_rockslide.sql','0004_classy_wolf_cub.sql','0005_reflective_hellion.sql','0006_empty_harry_osborn.sql','0007_rapid_ezekiel.sql'])database.exec(await readFile(resolve('drizzle',file),'utf8'));
database.exec('PRAGMA foreign_keys=ON');
database.exec(await readFile(resolve('drizzle/0022_site_trash.sql'),'utf8'));
function stmt(sql,...params){const query=database.prepare(sql);return{first:()=>query.get(...params)??null,all:()=>({results:query.all(...params)}),run:()=>({meta:{changes:Number(query.run(...params).changes)}})};}
const env={SITE_OWNER_EMAIL:'r18@activity.test',SITE_OWNER_USER_ID:'r18-owner'};
let clock=Date.now();class TestDate extends Date{static now(){return clock;}}
database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(env.SITE_OWNER_USER_ID,env.SITE_OWNER_EMAIL,'Synthetic teacher',clock);
database.prepare('INSERT INTO system_hosts(account_id,role,created_at,created_by) VALUES(?,?,?,?)').run(env.SITE_OWNER_USER_ID,'root',clock,env.SITE_OWNER_USER_ID);
const context=createContext({Date:TestDate,crypto:globalThis.crypto,structuredClone,Request,Response,URL,TextEncoder,console});
const storage=new SyntheticModule(['stmt','db','getEnv'],function(){this.setExport('stmt',stmt);this.setExport('getEnv',()=>env);this.setExport('db',()=>({batch:queries=>{database.exec('BEGIN');try{const result=queries.map(query=>query.run());database.exec('COMMIT');return result;}catch(error){database.exec('ROLLBACK');throw error;}}}));},{context});
const cryptoModule=new SyntheticModule(['createHash'],function(){this.setExport('createHash',createHash);},{context});
const modules=new Map();async function load(path){if(modules.has(path))return modules.get(path);const mod=path===resolve('lib/storage.js')?storage:new SourceTextModule(await readFile(path,'utf8'),{context,identifier:path});modules.set(path,mod);return mod;}
const mod=await load(resolve('app/api/escape/route.js'));await mod.link((specifier,parent)=>specifier==='node:crypto'?cryptoModule:load(resolve(dirname(parent.identifier),specifier)));await mod.evaluate();
const headers={'oai-authenticated-user-id':env.SITE_OWNER_USER_ID,'oai-authenticated-user-email':env.SITE_OWNER_EMAIL};
async function post(action,body={},token='',teacher=false,origin='https://game.test'){const response=await mod.namespace.POST(new Request('https://game.test/api/escape',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`,Origin:origin,...(teacher?headers:{})},body:JSON.stringify({action,requestId:crypto.randomUUID(),...body})}));return{status:response.status,data:await response.json()};}
async function get(kind,id,token='',teacher=false){const response=await mod.namespace.GET(new Request(`https://game.test/api/escape?kind=${kind}&id=${id}`,{headers:{Authorization:`Bearer ${token}`,...(teacher?headers:{})}}));return{status:response.status,data:await response.json()};}
for(const type of GAME_ACTIVITY_TYPES){
  const id=crypto.randomUUID();
  const created=await post('create-room',{id,adminKey:crypto.randomUUID()+crypto.randomUUID(),title:`QA ${type}`,campaign:{playMode:'individual',community:type,grade:10,topics:['quadratic'],minLevel:0,maxLevel:1}},'',true);assert.equal(created.status,200,JSON.stringify(created.data));
  const code=created.data.room.code;
  const pupils=[];for(const name of type==='relay'?['Synthetic A','Synthetic B','Synthetic C','Synthetic D']:['Synthetic A','Synthetic B']){const joined=await post('join',{code,name,mascot:0});assert.equal(joined.status,200);pupils.push(joined.data.session);}
  assert.equal((await post('begin',{id},'',true)).status,200);
  const openId=crypto.randomUUID();const opened=await post('class-event-open',{id,type,round:1,requestId:openId},'',true);assert.equal(opened.status,200,JSON.stringify(opened.data));
  let event=JSON.parse(database.prepare('SELECT race FROM rooms WHERE id=?').get(id).race).classActivity;
  assert.equal(event.type,type);
  assert.equal((await post('class-event-open',{id,type,round:1,requestId:openId},'',true)).data.replay,true);
  assert.equal((await post('class-event-open',{id,type:'tug',round:1},pupils[0].token)).status,403);
  assert.equal((await post('class-event-open',{id,type:'tug',round:1},'',true)).data.code,'EVENT_ACTIVE');
  clock=event.startAt+1;
  const first=type==='relay'?pupils.find(p=>p.id===event.engine.teams[0].memberIds[0]):pupils[0];
  const player=event.engine.participants[first.id];
  if(type==='buzzer')assert.equal((await post('class-event-action',{id:first.id,eventId:event.id,eventAction:'buzz',step:0,round:1},first.token)).status,200);
  if(type==='mountain')assert.equal((await post('class-event-action',{id:first.id,eventId:event.id,eventAction:'pick',cellId:player.taskIds[0],round:1},first.token)).status,200);
  const key=event.engine.tasks.find(task=>task.id===player.taskIds[0]).evaluation.answerKey;
  const body={id:first.id,eventId:event.id,eventAction:'answer',step:0,round:1,answer:key,requestId:crypto.randomUUID()};
  const sent=await post('class-event-action',body,first.token);assert.equal(sent.status,200,JSON.stringify(sent.data));assert.equal(sent.data.result.correct,true);
  assert.equal((await post('class-event-action',body,first.token)).data.result.replay,true);
  assert.equal((await post('class-event-action',{...body,answer:key+1},first.token)).data.code,'EVENT_REQUEST_CONFLICT');
  const other=pupils.find(pupil=>pupil.id!==first.id);
  assert.equal((await post('class-event-action',{...body,id:other.id},first.token)).status,403);
  assert.equal((await post('class-event-action',body,first.token,false,'https://other.test')).status,403);
  const map=(await get('map',id)).data;assert(!JSON.stringify(map).includes('answerKey'));assert(!JSON.stringify(map).includes('classActivityHistory'));
  const ownState=(await get('state',first.id,first.token)).data.state;assert.equal(ownState.classActivity.own.correct,1);assert(!JSON.stringify(ownState.classActivity).includes('answerKey'));
  if(type==='relay'){
    const currentRoom=database.prepare('SELECT race,revision FROM rooms WHERE id=?').get(id),race=JSON.parse(currentRoom.race);
    const team=race.classActivity.engine.teams[0],target=team.memberIds[team.turn];
    const removed=await post('remove-team',{id,teamId:target,revision:currentRoom.revision},'',true);assert.equal(removed.status,200,JSON.stringify(removed.data));
    const readyState=(await get('state',first.id,first.token)).data.state;
    assert.equal(readyState.classActivity.own.canAnswer,true,'Removing current relay runner advances the turn without a disabled-UI deadlock');
    assert.equal((await get('state',target,pupils.find(pupil=>pupil.id===target).token)).status,410);
  }
  const rawBefore=JSON.parse(database.prepare('SELECT data FROM teams WHERE id=?').get(first.id).data);
  assert.equal((await post('class-event-finish',{id,eventId:event.id,round:1},'',true)).status,200);
  await get('state',first.id,first.token);const after=JSON.parse(database.prepare('SELECT data FROM teams WHERE id=?').get(first.id).data);
  assert.deepEqual(after.solved,rawBefore.solved);assert.deepEqual(after.drafts,rawBefore.drafts);assert.equal(after.score,rawBefore.score+10);
  await get('state',first.id,first.token);assert.equal(JSON.parse(database.prepare('SELECT data FROM teams WHERE id=?').get(first.id).data).score,after.score);
  clock+=1000;
}
for(const count of [1,2]){
  const id=crypto.randomUUID(),created=await post('create-room',{id,adminKey:crypto.randomUUID()+crypto.randomUUID(),title:'QA automatic activity',campaign:{playMode:'individual',community:'boss',grade:10,topics:['quadratic']}},'',true);
  const pupils=[];for(let i=0;i<count;i++)pupils.push((await post('join',{code:created.data.room.code,name:`Auto ${i}`,mascot:0})).data.session);
  await post('begin',{id},'',true);
  await get('state',pupils[0].id,pupils[0].token);
  const stored=JSON.parse(database.prepare('SELECT data FROM teams WHERE id=?').get(pupils[0].id).data);
  stored.race.position=17;stored.race.phase='travel';stored.race.outcomes=[{station:0},{station:1},{station:2}];stored.race.bag=[1];stored.race.bonus=null;stored.race.reward=null;
  database.prepare('UPDATE teams SET data=?,revision=revision+1 WHERE id=?').run(JSON.stringify(stored),pupils[0].id);
  const rolled=await post('choose',{id:pupils[0].id,steps:3,sequence:0,round:1},pupils[0].token);assert.equal(rolled.status,200,JSON.stringify(rolled.data));
  const race=JSON.parse(database.prepare('SELECT race FROM rooms WHERE id=?').get(id).race);
  assert.equal(Boolean(race.classActivity),count===2,'Cell 18 opens actual activity only with eligible roster; solo movement remains available');
  if(count===2)assert.equal((await post('choose',{id:pupils[0].id,steps:1,sequence:1,round:1},pupils[0].token)).status,409,'Main movement pauses while class activity runs');
}
console.log('R18: twelve shared mechanics, two-pupil native HTTP authorization/CAS/replay/privacy, timer pause/resume and one-time rewards passed.');
