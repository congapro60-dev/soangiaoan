import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {startClassEvent} from '../../lib/lesson/class-events.js';
import {MAX_STATE_BYTES} from '../../lib/lesson/service.js';

// ponytail: estimates combined state capacity; rerun compiled Worker HTTP before certifying N150.
const root=resolve(import.meta.dirname,'../..');
const prior=JSON.parse(await readFile(join(root,'tasks/codex-takeover-e2e.json'),'utf8'));
assert.equal(prior.result,'PASS');assert(prior.load);
const dir=join(prior.persistence,'d1');
const files=(await readdir(dir,{recursive:true})).filter(f=>/(?:^|[\\/])[0-9a-f]{64}\.sqlite$/.test(f));assert.equal(files.length,1);
const dbPath=join(dir,files[0]),hash=async()=>createHash('sha256').update(await readFile(dbPath)).digest('hex'),beforeHash=await hash();
const db=new DatabaseSync(dbPath,{readOnly:true});
try{
 const rows=db.prepare('SELECT s.state,p.data FROM lesson_sessions s JOIN lesson_packages p ON p.row_id=s.package_row_id').all();
 const row=rows.find(r=>Object.keys(JSON.parse(r.state).roster).length===150);assert(row,'Existing actual HTTP N150 fixture');
 const state=JSON.parse(row.state),pkg=JSON.parse(row.data),ids=Object.keys(state.roster);assert.equal(ids.length,150);
 const bytes=s=>Buffer.byteLength(JSON.stringify(s));
 const eventSource=structuredClone(state);eventSource.package=pkg;eventSource.status='active';eventSource.timeline.locked=false;eventSource.timeline.currentActivityId='act-prac';eventSource.timeline.currentPhase='practice';eventSource.timeline.activityIndex=pkg.activities.findIndex(a=>a.id==='act-prac');eventSource.clock.arenaPausedAt=null;eventSource.clock.classEventBudgetUsedMs=0;eventSource.clock.arenaBudgetUsedMs=0;eventSource.classEvent=null;eventSource.package.budget.reserveMinutes=3;
 const event=startClassEvent(eventSource,{type:'mountain',durationMs:180000,seed:1},{role:'teacher',id:state.hostId},state.clock.lastNow+1);
 assert.equal(Object.keys(event.participants).length,150);
 const sample={id:'tutor-1-123456',tutorId:ids[0],recipientId:ids[1],activityId:'act-prac',branch:'core',taskIds:['task-prac-error-hunt','task-prac-core-calc'],status:'awaiting_recheck',requestedAt:1000,acceptedAt:1001,endedAt:1002};
 const points=[];
 for(const count of [0,75,150,450,900]){
  const combined=structuredClone(state);delete combined.package;delete combined.eventCache;
  combined.classEvent=event;combined.tutors={needs:{},history:Array.from({length:count},(_,i)=>({...sample,id:'tutor-1-'+i,tutorId:ids[i%150],recipientId:ids[(i+1)%150]}))};
  const total=bytes(combined);points.push({tutorHistory:count,bytes:total,limit:MAX_STATE_BYTES,headroom:MAX_STATE_BYTES-total,withinCap:total<=MAX_STATE_BYTES});
 }
 assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 const result={generatedAt:new Date().toISOString(),result:points.every(p=>p.withinCap)?'ESTIMATE_WITHIN_CAP':'HOLD_CAPACITY',kind:'read-only combined serialized-state estimate, NOT new HTTP load certification',priorActualHTTPArtifact:'tasks/codex-takeover-e2e.json',learners:150,baselineBytes:bytes(state),jeopardyBytes:bytes(event),points,productionTouched:false,externalRequests:0,limitations:['Synthetic tutor histories estimate payload size; not all records arise from a single reachable classroom sequence','No concurrency, latency or current compiled Worker HTTP150 proof','No cap raised; original fixture opened read-only']};
 db.close();assert.equal(await hash(),beforeHash);result.sourceUnchanged=true;
 await writeFile(join(root,'tasks/codex-r1-load.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}catch(error){try{db.close();}catch{}throw error;}
