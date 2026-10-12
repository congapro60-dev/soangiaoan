import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile,readdir} from 'node:fs/promises';
import {createLessonGenerationService} from '../lib/lesson/generation-service.js';
import {normalizeLessonProposal} from '../lib/lesson/proposal-result.js';
const pilot=JSON.parse(await readFile(new URL('../content/lessons/g11-sequences-p1.json',import.meta.url),'utf8'));
const basis='Toán 11 Dãy số',taskId='task-prac-support-tab',prompt=pilot.tasks.find(task=>task.id===taskId).prompt,fullQuote=basis+'. '+prompt;
const source={id:'repair-source',status:'ready',sha256:'a'.repeat(64),parserRevision:'repair-parser',extractionHash:'b'.repeat(64),originalName:'synthetic.txt',extraction:{sha256:'a'.repeat(64),segments:[{id:'s1',text:fullQuote},{id:'s2',text:fullQuote}],uncertainties:[]}};
const migrations=await Promise.all((await readdir(new URL('../drizzle/',import.meta.url))).filter(name=>/^\d{4}_.*\.sql$/.test(name)).sort().map(name=>readFile(new URL('../drizzle/'+name,import.meta.url),'utf8')));
const first=()=>({package:structuredClone(pilot),citations:[...pilot.objectives,...pilot.activities,...pilot.tasks,...pilot.hints,...pilot.evidenceRules].map(entity=>({entityId:entity.id,segmentId:'s1',quote:basis,origin:entity.id===taskId?'source':'adapted'})),uncertainties:[]});
async function runRepair(t,mutate){
 const database=new DatabaseSync(':memory:');t.after(()=>database.close());for(const sql of migrations)database.exec(sql);database.exec('PRAGMA foreign_keys=ON');
 database.prepare('INSERT INTO accounts(id,email,created_at) VALUES(?,?,?)').run('repair-owner','repair@example.invalid',1);
 database.prepare('INSERT INTO lesson_sources(id,owner_account_id,request_id,request_fingerprint,original_name,mime,bytes,sha256,status,parser_revision,extraction_hash,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(source.id,'repair-owner','repair-upload','c'.repeat(64),source.originalName,'text/plain',fullQuote.length,source.sha256,'ready',source.parserRevision,source.extractionHash,1,1);
 const before=first(),repaired=structuredClone(before),citation=repaired.citations.find(item=>item.entityId===taskId);citation.quote=fullQuote;mutate?.(repaired,citation);
 const db={prepare:sql=>({bind:(...args)=>({first:()=>database.prepare(sql).get(...args)??null,run:()=>({meta:{changes:database.prepare(sql).run(...args).changes}})})})};
 let calls=0;const service=createLessonGenerationService({db,sourceService:{get:async()=>source},generate:async()=>structuredClone(++calls===1?before:repaired),now:()=>1000});
 const job=await service.start({ownerAccountId:'repair-owner',sourceId:source.id,requestId:'repair-quote',settings:{slotMinutes:40,subject:'math',grade:11},model:'synthetic'});
 const done=await service.run({ownerAccountId:'repair-owner',id:job.id,aiConsent:{confirmed:true,sourceId:source.id,sourceSha256:source.sha256,parserRevision:source.parserRevision,extractionHash:source.extractionHash}});
 assert.equal(calls,2);assert.equal(done.status,'needs_review');return{before,repaired,result:done.result};
}
test('numeric-invalid source task may broaden only its exact quote within the same segment',async t=>{
 const {before,repaired,result}=await runRepair(t);
 assert.equal(normalizeLessonProposal({source,candidate:before}).validation.errors[0].code,'ERR_SOURCE_NUMERIC_MISMATCH');
 assert.equal(normalizeLessonProposal({source,candidate:repaired}).validation.ok,true);
 assert.equal(result.validation.ok,true,JSON.stringify(result.uncertainties));
 assert.equal(result.citations.find(item=>item.entityId===taskId).quote,fullQuote);
 assert.equal(result.citations.find(item=>item.entityId===taskId).origin,'source');
});
for(const [name,mutate] of [
 ['new hint and citation',output=>{const original=output.package.hints.find(hint=>hint.taskId===taskId);output.package.hints.push({...structuredClone(original),id:'hint-added-during-repair',tier:'H2',order:2,text:'Kiểm tra điều kiện chỉ số trước khi tính.'});output.package.tasks.find(task=>task.id===taskId).hintIds.push('hint-added-during-repair');output.citations.push({entityId:'hint-added-during-repair',segmentId:'s1',quote:basis,origin:'adapted'});}],
 ['invented quote',(_output,citation)=>{citation.quote+=' fabricated 9999';}],
 ['provenance downgrade',(_output,citation)=>{citation.origin='adapted';}],
 ['unaffected citation',output=>{output.citations[0].quote='Dãy số';}],
 ['quote replacement instead of broadening',(_output,citation)=>{citation.quote=prompt;}],
 ['segment change',(_output,citation)=>{citation.segmentId='s2';}],
 ['entity change',(_output,citation)=>{citation.entityId='invented-entity';}],
 ['valid answer changed',output=>{output.package.tasks.find(task=>task.id===taskId).evaluation.answerKey=21;}],
 ['hint changed',output=>{output.package.hints[0].text='Một gợi ý khác.';}],
 ['unaffected citation removed',output=>{output.citations.shift();}],
 ['prompt changed',output=>{output.package.tasks.find(task=>task.id===taskId).prompt+=' Kiểm tra lời giải.';}]
])test('numeric citation repair rejects '+name,async t=>{
 const {before,result}=await runRepair(t,mutate);
 assert.equal(result.validation.ok,false);assert(result.uncertainties.some(code=>['AI_REPAIR_CONTENT_CHANGED','AI_REPAIR_FAILED','AI_REPAIR_REJECTED'].includes(code)));
 assert.deepEqual(result.citations,before.citations);
 assert.equal(result.package.tasks.find(task=>task.id===taskId).prompt,before.package.tasks.find(task=>task.id===taskId).prompt);
});
