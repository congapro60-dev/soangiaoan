import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {SourceTextModule,SyntheticModule,createContext,runInContext} from 'node:vm';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const database=new DatabaseSync(':memory:');
for(const file of ['0000_boring_pete_wisdom.sql','0001_organic_aqueduct.sql','0002_big_ogun.sql','0003_dazzling_rockslide.sql','0004_classy_wolf_cub.sql','0005_reflective_hellion.sql','0006_empty_harry_osborn.sql','0007_rapid_ezekiel.sql'])database.exec(await readFile(resolve('drizzle',file),'utf8'));
database.exec('PRAGMA foreign_keys=ON');
function stmt(sql,...params){const q=database.prepare(sql);return {first:()=>q.get(...params)??null,all:()=>({results:q.all(...params)}),run:()=>({meta:{changes:Number(q.run(...params).changes)}})};}
const testEnv={SITE_OWNER_EMAIL:'root@mode.test',SITE_OWNER_USER_ID:'root-mode-id'};
let beforeBatch = null;
const storage={stmt,db:()=>({batch:queries=>{if(beforeBatch){const hook=beforeBatch;beforeBatch=null;hook();}database.exec('BEGIN');try{const r=queries.map(q=>q.run());database.exec('COMMIT');return r;}catch(e){database.exec('ROLLBACK');throw e;}}}),getEnv:()=>testEnv};
let clock=1800000000000;class TestDate extends Date{static now(){return clock;}}
database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(testEnv.SITE_OWNER_USER_ID,testEnv.SITE_OWNER_EMAIL,'Root',clock);
database.prepare('INSERT INTO system_hosts(account_id,role,created_at,created_by) VALUES(?,?,?,?)').run(testEnv.SITE_OWNER_USER_ID,'root',clock,testEnv.SITE_OWNER_USER_ID);
const context=createContext({Date:TestDate,structuredClone,crypto:globalThis.crypto,Request,Response,URL,TextEncoder,console});
runInContext('structuredClone = value => JSON.parse(JSON.stringify(value))',context);
const cache=new Map();
async function moduleAt(path){if(cache.has(path))return cache.get(path);const m=path===resolve('lib/storage.js')?new SyntheticModule(['stmt','db','getEnv'],function(){this.setExport('stmt',storage.stmt);this.setExport('db',storage.db);this.setExport('getEnv',storage.getEnv);},{context,identifier:path}):new SourceTextModule(await readFile(path,'utf8'),{context,identifier:path});cache.set(path,m);return m;}
const entry=await moduleAt(resolve('app/api/escape/route.js'));await entry.link((s,p)=>moduleAt(resolve(dirname(p.identifier),s)));await entry.evaluate();
const rootH={'oai-authenticated-user-id':testEnv.SITE_OWNER_USER_ID,'oai-authenticated-user-email':testEnv.SITE_OWNER_EMAIL};
async function post(action,body={},token='',extraH={}){const r=await entry.namespace.POST(new Request('https://game.test/api/escape',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Origin':'https://game.test',...extraH},body:JSON.stringify({action,requestId:crypto.randomUUID(),...body})}));return {status:r.status,data:await r.json()};}
const teacher=(action,body={})=>post(action,body,'',rootH);
const raw=id=>database.prepare('SELECT * FROM rooms WHERE id=?').get(id);

const modeRaw=id=>JSON.parse(raw(id).race).modeState;
async function setup(participation, members, rule='merchant') {
 const id=crypto.randomUUID();
 const made=await teacher('create-room',{id,adminKey:crypto.randomUUID()+crypto.randomUUID(),campaign:{rule,participation,grade:10,topics:['sets'],community:'arena',theme:'historical'}});
 assert.equal(made.status,200);
 const sessions=[];
 for(let i=0;i<members.length;i++){
  const joined=await post('join',{code:made.data.room.code,name:participation==='individual'?members[i][0]:`Device ${i+1}`,memberNames:members[i]});
  assert.equal(joined.status,200,JSON.stringify(joined));sessions.push(joined.data.session);
 }
 const begun=await teacher('begin',{id});assert.equal(begun.status,200,JSON.stringify(begun));
 return {id,code:made.data.room.code,sessions};
}
const names=Array.from({length:26},(_,i)=>`Learner ${i+1}`);
for(const [kind,widths] of [['individual',Array(26).fill(1)],['pairs',Array(13).fill(2)],['group',[4,4,4,4,4,3,3]]]){
 let offset=0;const members=widths.map(width=>{const out=names.slice(offset,offset+width);offset+=width;return out;});
 const room=await setup(kind,members);
 const mode=modeRaw(room.id);
 assert.equal(mode.units.length,members.length);
 for(let i=0;i<members.length;i++){
  const team=JSON.parse(database.prepare('SELECT data FROM teams WHERE id=?').get(room.sessions[i].id).data);
  assert.deepEqual(mode.units.find(u=>u.id===team.modeUnit).members.map(m=>m.name),members[i]);
 }
}
// Polling projects the server clock without causing room revision churn.
const timer=await setup('individual',[['Clock A'],['Clock B']],'survival');
const initialRevision=raw(timer.id).revision;
clock+=30000;
const viewed=await post('mode-state',{id:timer.sessions[0].id,round:1},timer.sessions[0].token);
assert.equal(viewed.status,200);
assert.equal(viewed.data.mode.players[viewed.data.mode.unitId].energy,70);
assert.equal(raw(timer.id).revision,initialRevision);
assert.equal(modeRaw(timer.id).ruleState.players['unit-1'].energy,100);
// Active community freezes gameplay; late device returns after close.
const community=await setup('pairs',[['Pair A','Pair B'],['Pair C','Pair D']]);
clock+=5000;
assert.equal((await teacher('arena-open',{id:community.id})).status,200);
const race=JSON.parse(raw(community.id).race),event=race.arena;
const late=await post('join',{code:community.code,name:'Late pair',memberNames:['Late A','Late B']});
assert.equal(late.status,200);
let lateMode=late.data.state.mode;
assert.ok(lateMode.unitId);
assert.equal(lateMode.units.find(u=>u.id===lateMode.unitId).outcome,'spectator');
const lateRequest={id:late.data.session.id,round:1,revision:raw(community.id).revision,deadline:clock+10000,modeAction:{type:'earn'}};
assert.equal((await post('mode-issue',lateRequest,late.data.session.token)).status,409);
clock=event.resumeAt+1000;
const active=await post('mode-state',{id:late.data.session.id,round:1},late.data.session.token);
assert.equal(active.data.mode.units.find(u=>u.id===lateMode.unitId).outcome,'active');
assert.equal(active.data.mode.paused,false);
const issue=await post('mode-issue',{...lateRequest,requestId:crypto.randomUUID(),revision:raw(community.id).revision,deadline:clock+10000},late.data.session.token);
assert.equal(issue.status,200,JSON.stringify(issue));
// Removal updates team and engine unit together, including every device member.
const remove=await teacher('remove-team',{id:community.id,teamId:late.data.session.id,revision:raw(community.id).revision});
assert.equal(remove.status,200,JSON.stringify(remove));
const removedUnit=modeRaw(community.id).units.find(u=>u.id===lateMode.unitId);
assert.equal(removedUnit.outcome,'abandoned');
assert.ok(removedUnit.members.every(member=>member.present===false));
console.log('Mode lifecycle: 26 learners, explicit device map, server read ticks, paused late device activation, atomic remove passed.');

// A losing begin must not assign any team. Same-clock begins cannot borrow proof.
const pendingId=crypto.randomUUID();
const pending=await teacher('create-room',{id:pendingId,adminKey:crypto.randomUUID()+crypto.randomUUID(),campaign:{rule:'merchant',participation:'individual',grade:10,topics:['sets']}});
const beforeStart=await post('join',{code:pending.data.room.code,name:'Pending'});
beforeBatch=()=>database.prepare('UPDATE teams SET revision=revision+1 WHERE id=?').run(beforeStart.data.session.id);
const failedBegin=await teacher('begin',{id:pendingId});
assert.equal(failedBegin.status,409);
assert.equal(raw(pendingId).started,null);
assert.equal(JSON.parse(database.prepare('SELECT data FROM teams WHERE id=?').get(beforeStart.data.session.id).data).modeUnit,undefined);
assert.equal((await teacher('begin',{id:pendingId})).status,200);
// Losing late join has neither an inserted team nor an orphan engine unit.
const unitsBefore=modeRaw(pendingId).units.length;
beforeBatch=()=>database.prepare('UPDATE rooms SET revision=revision+1 WHERE id=?').run(pendingId);
const failedJoin=await post('join',{code:pending.data.room.code,name:'Must not exist'});
assert.equal(failedJoin.status,409);
assert.equal(modeRaw(pendingId).units.length,unitsBefore);
assert.equal(database.prepare('SELECT COUNT(*) n FROM teams WHERE room_id=? AND name_key=?').get(pendingId,'must not exist').n,0);
// A losing removal cannot abandon a still-live device.
const teamBeforeRemove=JSON.parse(database.prepare('SELECT data FROM teams WHERE id=?').get(beforeStart.data.session.id).data);
beforeBatch=()=>database.prepare('UPDATE teams SET revision=revision+1 WHERE id=?').run(beforeStart.data.session.id);
const failedRemove=await teacher('remove-team',{id:pendingId,teamId:beforeStart.data.session.id,revision:raw(pendingId).revision});
assert.equal(failedRemove.status,409);
assert.equal(modeRaw(pendingId).units.find(u=>u.id===teamBeforeRemove.modeUnit).outcome,'active');
assert.equal(database.prepare('SELECT removed_at FROM teams WHERE id=?').get(beforeStart.data.session.id).removed_at,null);

// Finished reads and host management stay available, but new events cannot reopen the ván.
clock += 1800001;
const ended = await post('mode-state',{id:timer.sessions[0].id,round:1},timer.sessions[0].token);
assert.equal(ended.status,200);
assert.equal(ended.data.mode.finished,true);
const endedEvent=await teacher('arena-open',{id:timer.id});
assert.equal(endedEvent.status,409);
assert.equal(endedEvent.data.code,'GAME_FINISHED');
const finishedRemoval=await teacher('remove-team',{id:timer.id,teamId:timer.sessions[0].id,revision:raw(timer.id).revision});
assert.equal(finishedRemoval.status,200,JSON.stringify(finishedRemoval));

// A new community event must first commit the previous close plus the unpaused gap.
const repeated=await setup('individual',[['Repeat A'],['Repeat B']]);
clock+=5000;
assert.equal((await teacher('arena-open',{id:repeated.id})).status,200);
const firstEvent=JSON.parse(raw(repeated.id).race).arena;
const lateRepeat=await post('join',{code:repeated.code,name:'Repeat Late'});
assert.equal(lateRepeat.status,200);
clock=firstEvent.resumeAt+10000;
const beforeSecond=await post('mode-state',{id:lateRepeat.data.session.id,round:1},lateRepeat.data.session.token);
assert.equal(beforeSecond.data.mode.units.find(u=>u.id===beforeSecond.data.mode.unitId).outcome,'active');
assert.equal((await teacher('arena-open',{id:repeated.id})).status,200);
const duringSecond=await post('mode-state',{id:lateRepeat.data.session.id,round:1},lateRepeat.data.session.token);
assert.equal(duringSecond.status,200);
assert.equal(duringSecond.data.mode.units.find(u=>u.id===duringSecond.data.mode.unitId).outcome,'active');
assert.equal(duringSecond.data.mode.gameNow,beforeSecond.data.mode.gameNow);
