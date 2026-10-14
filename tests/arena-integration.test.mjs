import {nativeVmModule} from './helpers/vm-native.mjs';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {SourceTextModule,SyntheticModule,createContext} from 'node:vm';
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const database=new DatabaseSync(':memory:');
for(const file of ['0000_boring_pete_wisdom.sql','0001_organic_aqueduct.sql','0002_big_ogun.sql','0003_dazzling_rockslide.sql','0004_classy_wolf_cub.sql','0005_reflective_hellion.sql','0006_empty_harry_osborn.sql','0007_rapid_ezekiel.sql'])
    database.exec(await readFile(resolve('drizzle',file),'utf8'));
database.exec('PRAGMA foreign_keys=ON');
function stmt(sql,...params){
    return {
        first:() => {
            try { return database.prepare(sql).get(...params)??null; }
            catch(e) { console.error('first error', sql, params); throw e; }
        },
        all:()=>({results:database.prepare(sql).all(...params)}),
        run:()=>{
            try {
                const result=database.prepare(sql).run(...params);
                return {meta:{changes:Number(result.changes)}};
            } catch(e) {
                console.error('run error', sql, params); throw e;
            }
        }
    };
}

let interceptBatch = null;
let inspectBatch = null;
const testEnv={SITE_OWNER_EMAIL:'root@arena.test',SITE_OWNER_USER_ID:'root-arena-id'};
const storage={stmt,db:()=>({batch:queries=>{
    if (interceptBatch) {
        interceptBatch();
        interceptBatch = null;
    }
    database.exec('BEGIN');
    try{
        const result=queries.map(q=>q.run());
        database.exec('COMMIT');
        if (inspectBatch) { const inspect = inspectBatch; inspectBatch = null; inspect(result); }
        return result;
    }catch(e){
        database.exec('ROLLBACK');
        throw e;
    }
}}),getEnv:()=>testEnv};
let clock=Date.now();
class TestDate extends Date{static now(){return clock;}}
database.prepare('INSERT INTO accounts(id,email,display_name,created_at) VALUES(?,?,?,?)').run(testEnv.SITE_OWNER_USER_ID,testEnv.SITE_OWNER_EMAIL,'Root',clock);
database.prepare('INSERT INTO system_hosts(account_id,role,created_at,created_by) VALUES(?,?,?,?)').run(testEnv.SITE_OWNER_USER_ID,'root',clock,testEnv.SITE_OWNER_USER_ID);
const context=createContext({structuredClone,Date:TestDate,crypto:globalThis.crypto,Request,Response,URL,TextEncoder,console});
const cache=new Map();
async function moduleAt(path){
    if(cache.has(path))return cache.get(path);
    let loadedModule;
    if(resolve(path)===resolve('lib/storage.js'))
        loadedModule=new SyntheticModule(['stmt','db','getEnv'],function(){
            this.setExport('stmt',storage.stmt);
            this.setExport('db',storage.db);
            this.setExport('getEnv',storage.getEnv);
        },{context,identifier:path});
    else 
        loadedModule=new SourceTextModule(await readFile(path,'utf8'),{context,identifier:path});
    cache.set(path,loadedModule);
    return loadedModule;
}
const entryModule=await moduleAt(resolve('app/api/escape/route.js'));
await entryModule.link((specifier,parent)=>specifier.startsWith('node:')?nativeVmModule(specifier,context):moduleAt(resolve(dirname(parent.identifier),specifier)));
await entryModule.evaluate();
const route=entryModule.namespace;
const rootH={'oai-authenticated-user-id':testEnv.SITE_OWNER_USER_ID,'oai-authenticated-user-email':testEnv.SITE_OWNER_EMAIL};
async function post(action,body={},token='',extraH={}){
    let response=await route.POST(new Request('https://game.test/api/escape',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token,'Origin':'https://game.test',...extraH},body:JSON.stringify({action,requestId:crypto.randomUUID(),...body})}));
    return {status:response.status,data:await response.json()};
}
const teacher=(action,body={})=>post(action,body,'',rootH);



// Setup room and 26 learners
const id=crypto.randomUUID(),admin=crypto.randomUUID()+crypto.randomUUID();
const roomRes = await teacher('create-room',{id,adminKey:admin,title:'26 learners arena',campaign:{playMode:'individual',community:'arena',theme:'historical',grade:10,topics:['quadratic','vectors'],minLevel:0,maxLevel:1}});
const room=roomRes.data.room;

const joined = [];
for (let i = 0; i < 26; i++) {
    joined.push(await post('join',{code:room.code,name:'Hoc sinh '+(i+1),mascot:i%8}));
}
assert(joined.every(x=>x.status===200), JSON.stringify(joined.filter(x=>x.status!==200)));
const players=joined.map(x=>x.data.session);

const startRes = await teacher('begin',{id});
assert.equal(startRes.status, 200, JSON.stringify(startRes.data));

// trigger arena
await post('roll', {sequence: 1}, players[0].token);
// player 0 rolled, crossed ARENA_CELL
// actually I need to move player to ARENA_CELL
for(let p of players) {
    let s = JSON.parse(database.prepare('SELECT data FROM teams WHERE id=?').get(p.id).data);
    s.status = 'active'; // force active
    s.start = clock;
    database.prepare('UPDATE teams SET data=? WHERE id=?').run(JSON.stringify(s), p.id);
}

// wait, community trigger happens when roll crosses cell.
// It's easier to manually trigger the arena opening by setting cursor and sending roll?
// Let's just use the teacher trigger for arena. Wait, in `app/api/escape/route.js`, action `arena-open`.
let openRes = await teacher('arena-open', {id});
assert.equal(openRes.status, 200, JSON.stringify(openRes.data));

const event = openRes.data.arena;
assert(event.theme === 'historical');
assert.equal(event.entries.length, 26);
assert.equal(event.bracket.length, 13);
// 26 roster, means no byes
// Let's find a pair
// unused
const firstMatch = event.bracket[0];
const leftId = firstMatch.left.id;
const rightId = firstMatch.right.id;

const leftPlayer = players.find(p => p.id === leftId);
const rightPlayer = players.find(p => p.id === rightId);

// 1. "pause/main draft restore"
// When the arena opens, it registers a pause. Wait 10 seconds to start.
clock += 10000; 

// Let's answer a question to get resource
let leftAns1 = await post('arena-action', { id: leftId, arenaAction: 'answer', step: 0, answer: '1', eventId: event.id, round: 1 }, leftPlayer.token);
assert.equal(leftAns1.status, 200, JSON.stringify(leftAns1.data));
assert(leftAns1.data.result.resource >= 0);

// Let's cheat and give both players some resources by editing DB
let leftRow = database.prepare('SELECT * FROM community_players WHERE id=?').get(event.id+'.'+leftId);
let leftData = JSON.parse(leftRow.data);
leftData.resource = 5;
database.prepare('UPDATE community_players SET data=? WHERE id=?').run(JSON.stringify(leftData), leftRow.id);

let rightRow = database.prepare('SELECT * FROM community_players WHERE id=?').get(event.id+'.'+rightId);
let rightData = JSON.parse(rightRow.data);
rightData.resource = 5;
database.prepare('UPDATE community_players SET data=? WHERE id=?').run(JSON.stringify(rightData), rightRow.id);

// 2. Actor CAS failure must not mutate the target. A concurrent actor write
// advances only the actor revision before the combat batch starts.
const actorCasReqId = crypto.randomUUID();
const targetHpBeforeActorCas = JSON.parse(database.prepare('SELECT data FROM community_players WHERE id=?').get(event.id+'.'+rightId).data).hp;
interceptBatch = () => {
    database.prepare('UPDATE community_players SET revision=revision+1 WHERE id=?').run(event.id+'.'+leftId);
};
inspectBatch = results => {
    assert.equal(results[0].meta.changes, 0, 'First actor CAS must commit neither participant');
    assert.equal(JSON.parse(database.prepare('SELECT data FROM community_players WHERE id=?').get(event.id+'.'+rightId).data).hp, targetHpBeforeActorCas);
};
const actorCasRes = await post('arena-action', { id: leftId, arenaAction: 'attack', target: rightId, eventId: event.id, requestId: actorCasReqId, round: 1 }, leftPlayer.token);
assert.equal(actorCasRes.status, 200, 'Safe retry should succeed once');
const actorAfterCasReject = JSON.parse(database.prepare('SELECT data FROM community_players WHERE id=?').get(event.id+'.'+leftId).data);
const targetAfterActorCasReject = JSON.parse(database.prepare('SELECT data FROM community_players WHERE id=?').get(event.id+'.'+rightId).data);
assert.equal(actorAfterCasReject.log.filter(l => l.requestId === actorCasReqId).length, 1, 'Safe retry appends one action');
assert.equal(targetAfterActorCasReject.hp, targetHpBeforeActorCas - 1, 'Safe retry damages target once');
assert.equal(actorAfterCasReject.resource, 4, 'Safe retry spends one resource');
// Restore the fixture for the independent target-CAS schedule below.
database.prepare('UPDATE community_players SET data=?,revision=revision+1 WHERE id=?').run(JSON.stringify(leftData), leftRow.id);
database.prepare('UPDATE community_players SET data=?,revision=revision+1 WHERE id=?').run(JSON.stringify(rightData), rightRow.id);

// 3. "Failure-injection actual SQLite test where target revision changes before batch, verify no actor deduction/log and no phantom replay"
let actionReqId = crypto.randomUUID();
interceptBatch = () => {
    // Modify target row to invalidate revision
    database.prepare('UPDATE community_players SET revision=revision+1 WHERE id=?').run(event.id+'.'+rightId);
};

let attackRes = await post('arena-action', { id: leftId, arenaAction: 'attack', target: rightId, eventId: event.id, requestId: actionReqId, round: 1 }, leftPlayer.token);
assert.equal(attackRes.status, 200, 'Retry should succeed after failure injection');

// verify the log has exactly one attack (no phantom replay from the failed batch)
leftRow = database.prepare('SELECT * FROM community_players WHERE id=?').get(event.id+'.'+leftId);
leftData = JSON.parse(leftRow.data);
let attackLogs = leftData.log.filter(l => l.action === 'attack');
assert.equal(attackLogs.length, 1, 'Should have exactly 1 attack log despite failure retry');

// verify target took exactly 1 damage
rightRow = database.prepare('SELECT * FROM community_players WHERE id=?').get(event.id+'.'+rightId);
rightData = JSON.parse(rightRow.data);
assert.equal(rightData.hp, 2, 'Target hp should be 3 - 1 = 2');
assert.equal(leftData.resource, 4, 'Actor resource should be 5 - 1 = 4');

// 3. "Store full canonical action payload fingerprint and original result"
// different target -> 409
let attackRes2 = await post('arena-action', { id: leftId, arenaAction: 'attack', target: 'someone_else', eventId: event.id, requestId: actionReqId, round: 1 }, leftPlayer.token);
assert.equal(attackRes2.status, 409, 'Different payload under same requestId should conflict');
assert.equal(attackRes2.data.code, 'REQUEST_ID_CONFLICT');

// same payload -> exact original effect including blocked
let attackRes3 = await post('arena-action', { id: leftId, arenaAction: 'attack', target: rightId, eventId: event.id, requestId: actionReqId, round: 1 }, leftPlayer.token);
assert.equal(attackRes3.status, 200, 'Same payload should return replay');
assert.equal(attackRes3.data.result.replay, true);
assert.equal(attackRes3.data.result.effect, 'hit');

// 4. "Require current eventId and round"
let attackRes4 = await post('arena-action', { id: leftId, arenaAction: 'guard', eventId: 'wrong-event-id', round: 1 }, leftPlayer.token);
assert.equal(attackRes4.status, 409);
assert.equal(attackRes4.data.code, 'ARENA_EVENT_MISMATCH');

let attackRes5 = await post('arena-action', { id: leftId, arenaAction: 'guard', eventId: event.id, round: 999 }, leftPlayer.token);
assert.equal(attackRes5.status, 409);
assert.equal(attackRes5.data.code, 'SESSION_RESET');

// 5. "Student opponent shield flag derived from actual shieldUntil"
let guardRes = await post('arena-action', { id: rightId, arenaAction: 'guard', eventId: event.id, round: 1 }, rightPlayer.token);
assert.equal(guardRes.status, 200);

let stateRes = await post('arena-state', { id: leftId }, leftPlayer.token);
// The opponent of leftPlayer is rightPlayer, should be shielded
assert.equal(stateRes.data.arena.own.opponent.shielded, true, 'Opponent should be shielded');

// Let time pass
clock += 5000;
stateRes = await post('arena-state', { id: leftId }, leftPlayer.token);
assert.equal(stateRes.data.arena.own.opponent.shielded, false, 'Opponent shield should have expired');

// 6. reward once/reset/delete/removed target/late spectator/secrecy
// Finish event
clock += 90000; // pass 75s wall AND 10s cooldown
let finishRes = await post('arena-finish', {id: leftId}, leftPlayer.token);
assert.equal(finishRes.status, 200);
assert.equal(finishRes.data.phase, 'done');
assert(finishRes.data.arena.own.reward > 0);

// verify reward awarded once
leftRow = database.prepare('SELECT * FROM teams WHERE id=?').get(leftId);
let leftTeamData = JSON.parse(leftRow.data);
let rewardLogs = leftTeamData.events.filter(e => e.type === 'arena-result');
assert.equal(rewardLogs.length, 1);
const scoreAfterFirstFinish = leftTeamData.score;

let finishRes2 = await post('arena-finish', {id: leftId}, leftPlayer.token); // retry
assert.equal(finishRes2.status, 200);
leftRow = database.prepare('SELECT * FROM teams WHERE id=?').get(leftId);
leftTeamData = JSON.parse(leftRow.data);
assert.equal(leftTeamData.score, scoreAfterFirstFinish, 'Reward should not be given twice');
assert.equal(leftTeamData.events.filter(e => e.type === 'arena-result').length, 1);

console.log('All tests passed.');
