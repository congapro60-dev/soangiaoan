import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createSiteTrashService} from '../lib/site-trash.js';
function setup(){
 const raw=new DatabaseSync(':memory:');for(const entry of JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8')).entries)raw.exec(readFileSync('drizzle/'+entry.tag+'.sql','utf8'));raw.exec('PRAGMA foreign_keys=ON');
 const prepare=sql=>({bind:(...args)=>({first:async()=>raw.prepare(sql).get(...args)||null,all:async()=>({results:raw.prepare(sql).all(...args)}),run:async()=>({meta:{changes:Number(raw.prepare(sql).run(...args).changes)}})})});
 const db={prepare,batch:async statements=>{raw.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());raw.exec('COMMIT');return out;}catch(e){raw.exec('ROLLBACK');throw e;}}};
 raw.exec("INSERT INTO accounts(id,email,created_at) VALUES('owner','owner@example.invalid',1),('other','other@example.invalid',1);INSERT INTO rooms(id,code,admin_hash,title,created,owner_account_id,deleted_at,revision) VALUES('room','ABC234','secret','QA room',1,'owner',20,1);");
 raw.prepare("INSERT INTO site_trash VALUES('room','room','owner',20,?)").run(JSON.stringify({title:'QA room',revision:1,secret:'must not leak'}));
 return {raw,api:createSiteTrashService({db})};
}
test('trash metadata never projects private payload and room restores without deleting history',async()=>{
 const {raw,api}=setup();const listed=await api.list({ownerAccountId:'owner'});assert.equal(listed.items[0].title,'QA room');assert(!JSON.stringify(listed).includes('secret'));assert.equal((await api.list({ownerAccountId:'other'})).items.length,0);
 await assert.rejects(()=>api.restoreRoom({ownerAccountId:'other',id:'room'}),/NOT_FOUND/);
 await api.restoreRoom({ownerAccountId:'owner',id:'room'});assert.equal(raw.prepare('SELECT deleted_at FROM rooms').get().deleted_at,null);assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM site_trash').get().n,0);assert.equal(raw.prepare('SELECT revision FROM rooms').get().revision,2);
});
test('revoked owner and stale room revision cannot restore; trash remains recoverable',async()=>{
 const {raw,api}=setup();raw.exec("INSERT INTO system_hosts(account_id,role,created_at,revoked_at) VALUES('owner','host',1,2)");await assert.rejects(()=>api.restoreRoom({ownerAccountId:'owner',id:'room'}),/RESTORE_CONFLICT/);assert.equal(raw.prepare('SELECT deleted_at FROM rooms').get().deleted_at,20);
 raw.exec("UPDATE system_hosts SET revoked_at=NULL;UPDATE rooms SET revision=2");await assert.rejects(()=>api.restoreRoom({ownerAccountId:'owner',id:'room'}),/RESTORE_CONFLICT/);assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM site_trash').get().n,1);
});
test('game-team restoration rejects changed room or name conflict, restores retained state only at same revision',async()=>{
 const {raw,api}=setup();await api.restoreRoom({ownerAccountId:'owner',id:'room'});
 raw.prepare("INSERT INTO teams(id,room_id,name_key,token_hash,data,removed_at,revision) VALUES('team','room','group','secret','{}',30,1)").run();
 raw.prepare("INSERT INTO site_trash VALUES('game-team','team','owner',30,?)").run(JSON.stringify({title:'Group',roomRevision:2,race:null}));
 raw.exec('UPDATE rooms SET revision=3');await assert.rejects(()=>api.restoreTeam({ownerAccountId:'owner',id:'team'}),/RESTORE_CONFLICT/);raw.exec('UPDATE rooms SET revision=2');
 await api.restoreTeam({ownerAccountId:'owner',id:'team'});assert.equal(raw.prepare("SELECT removed_at FROM teams WHERE id='team'").get().removed_at,null);assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM site_trash').get().n,0);
});
test('cohost can restore its removed team while active membership permits it',async()=>{
 const {raw,api}=setup();await api.restoreRoom({ownerAccountId:'owner',id:'room'});
 raw.exec("INSERT INTO room_memberships(room_id,account_id,role,granted_at) VALUES('room','other','cohost',1);INSERT INTO teams(id,room_id,name_key,token_hash,data,removed_at,revision) VALUES('team','room','group','secret','{}',30,1)");
 raw.prepare("INSERT INTO site_trash VALUES('game-team','team','other',30,?)").run(JSON.stringify({title:'Group',roomRevision:2,race:null}));
 await api.restoreTeam({ownerAccountId:'other',id:'team'});assert.equal(raw.prepare("SELECT removed_at FROM teams WHERE id='team'").get().removed_at,null);
});
