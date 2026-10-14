import {nativeVmModule} from './helpers/vm-native.mjs';
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
const storage={stmt,db:()=>({batch:queries=>{database.exec('BEGIN');try{const r=queries.map(q=>q.run());database.exec('COMMIT');return r;}catch(e){database.exec('ROLLBACK');throw e;}}}),getEnv:()=>testEnv};
let clock=1800000000000;class TestDate extends Date{static now(){return clock;}}
database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(testEnv.SITE_OWNER_USER_ID,testEnv.SITE_OWNER_EMAIL,'Root',clock);
database.prepare('INSERT INTO system_hosts(account_id,role,created_at,created_by) VALUES(?,?,?,?)').run(testEnv.SITE_OWNER_USER_ID,'root',clock,testEnv.SITE_OWNER_USER_ID);
const context=createContext({Date:TestDate,structuredClone,crypto:globalThis.crypto,Request,Response,URL,TextEncoder,console});
runInContext('structuredClone = value => JSON.parse(JSON.stringify(value))',context);
const cache=new Map();
async function moduleAt(path){if(cache.has(path))return cache.get(path);const m=path===resolve('lib/storage.js')?new SyntheticModule(['stmt','db','getEnv'],function(){this.setExport('stmt',storage.stmt);this.setExport('db',storage.db);this.setExport('getEnv',storage.getEnv);},{context,identifier:path}):new SourceTextModule(await readFile(path,'utf8'),{context,identifier:path});cache.set(path,m);return m;}
const entry=await moduleAt(resolve('app/api/escape/route.js'));await entry.link((s,p)=>s.startsWith('node:')?nativeVmModule(s,context):moduleAt(resolve(dirname(p.identifier),s)));await entry.evaluate();
const rootH={'oai-authenticated-user-id':testEnv.SITE_OWNER_USER_ID,'oai-authenticated-user-email':testEnv.SITE_OWNER_EMAIL};
async function post(action,body={},token='',extraH={}){const r=await entry.namespace.POST(new Request('https://game.test/api/escape',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Origin':'https://game.test',...extraH},body:JSON.stringify({action,requestId:crypto.randomUUID(),...body})}));return {status:r.status,data:await r.json()};}
const teacher=(action,body={})=>post(action,body,'',rootH);
const raw=id=>database.prepare('SELECT * FROM rooms WHERE id=?').get(id);
for(const rule of ['duel','zones','survival','escort','treasure','relay','lockdown','merchant']){
 const id=crypto.randomUUID(),admin=crypto.randomUUID()+crypto.randomUUID();
 const created=await teacher('create-room',{id,adminKey:admin,campaign:{rule,participation:'individual',roster:['Ada','Bo'],grade:10,topics:['sets'],minLevel:0,maxLevel:1,categories:['practice'],formats:['short']}});assert.equal(created.status,200);
 const sessions=[];for(const name of ['Ada','Bo'])sessions.push((await post('join',{code:created.data.room.code,name})).data.session);
 const begin=await teacher('begin',{id});assert.equal(begin.status,200,JSON.stringify(begin));
 const team=sessions[0],initial=JSON.parse(raw(id).race).modeState,unit=initial.units[0];
 const actions={duel:{type:'answer'},zones:{type:'capture',zone:0},survival:{type:'objective'},escort:{type:'fuel'},treasure:{type:'clue'},relay:{type:'solve',learnerId:unit.members[0].id},lockdown:{type:'power'},merchant:{type:'earn'}};
 const send=(action,extra={})=>post(action,{id:team.id,round:1,revision:raw(id).revision,deadline:clock+10000,modeAction:actions[rule],...extra},team.token);
 assert.equal((await post('mode-state',{id:team.id,round:1})).status,403);
 const issueAction={...actions[rule]};
 const issue=await send('mode-issue',{modeAction:issueAction});assert.equal(issue.status,200,JSON.stringify(issue));
 assert.doesNotMatch(JSON.stringify(issue.data),/"(?:expected|steps|seed|answer)":/);
 const mode=JSON.parse(raw(id).race).modeState,q=mode.challenges[mode.activeChallenges[unit.id]];
 const body={requestId:crypto.randomUUID(),revision:raw(id).revision,answer:q.answer,challengeId:q.id};
 const progress=await send('mode-progress',body);assert.equal(progress.status,200,JSON.stringify(progress));assert.equal(progress.data.result.correct,true);
 assert.notDeepEqual(JSON.parse(raw(id).race).modeState.ruleState,initial.ruleState);
 assert.equal((await send('mode-progress',body)).status,200);
 assert.equal((await send('mode-progress',{...body,answer:'different'})).data.code,'REQUEST_ID_CONFLICT');
 assert.equal((await send('mode-tick',{revision:0})).data.code,'REVISION_MISMATCH');
 assert.equal((await send('mode-tick',{round:0})).data.code,'SESSION_RESET');
 assert.equal((await send('mode-tick',{deadline:clock-1})).data.code,'DEADLINE_EXPIRED');
 const revision=raw(id).revision;
 const concurrent=await Promise.all([send('mode-tick',{revision}),send('mode-tick',{revision})]);assert.equal(concurrent.filter(x=>x.status===200).length,1);
 const reset=await teacher('reset-room',{id,revision:raw(id).revision,confirmCode:created.data.room.code});assert.equal(reset.status,200);assert.equal(raw(id).race,null);
 assert.equal(JSON.parse(database.prepare('SELECT data FROM teams WHERE id=?').get(team.id).data).modeUnit,undefined);
}
console.log('Mode route VM/SQLite: eight noncampaign rules, canonical answers, secrecy, replay conflicts, stale guards, concurrent CAS and reset passed.');
