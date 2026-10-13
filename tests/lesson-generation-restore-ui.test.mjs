import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {matchesCreationSettings} from '../lib/lesson/creation-context.js';
const source=readFileSync(new URL('../app/lessons/lesson-dashboard.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('dashboard.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let effect;
function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[0]?.getText(ast).includes('latest=true&sourceId='))effect=node.arguments[0].getText(ast);ts.forEachChild(node,visit);}visit(ast);
assert.ok(effect);
const js=ts.transpileModule(effect,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.trim().replace(/;$/,'');
async function restore({stored=null,job={id:'saved',sourceId:'source',extractionHash:'extract',sourceSha256:'sha',parserRevision:'parser'},cancel=false,newJob=null}={}){
 let timer,resolve,cleanup,state=null;const requests=[],updates=[];
 const context={creation:null,generationSettings:{subject:'math',grade:11,slotMinutes:40},matchesCreationSettings,importSourceId:'source',importSourceMeta:{extractionHash:'extract',sha256:'sha',parserRevision:'parser'},user:{userId:'teacher'},sessionStorage:{getItem:()=>stored},window:{setTimeout:fn=>{timer=fn;return 1;},clearTimeout(){}},fetch:async url=>{requests.push(url);return new Promise(done=>{resolve=()=>done({ok:true,json:async()=>({job})});});},setGenerationJob:job=>{state=typeof job==='function'?job(state):job;updates.push(state);},encodeURIComponent};
 cleanup=vm.runInNewContext('('+js+')()',context);const pending=timer();state=newJob;if(cancel)cleanup();resolve?.();await pending;return{requests,updates,state};
}
test('closed-tab recovery requests latest saved source draft; matching session keeps in-flight job',async()=>{
 const latest=await restore();assert.deepEqual(latest.requests,['/api/lessons/proposal?latest=true&sourceId=source']);assert.equal(latest.updates[0].id,'saved');
 const current=await restore({stored:JSON.stringify({id:'running',hash:'extract'})});assert.deepEqual(current.requests,['/api/lessons/proposal?jobId=running']);
 assert.deepEqual((await restore({stored:JSON.stringify({id:'old',hash:'old'})})).requests,latest.requests);
 assert.deepEqual((await restore({stored:'invalid-json'})).requests,latest.requests);
});
test('recovery ignores stale source/hash, cancelled request and no saved draft',async()=>{
 for(const job of [null,{sourceId:'other',extractionHash:'extract',sourceSha256:'sha',parserRevision:'parser'},{sourceId:'source',extractionHash:'old',sourceSha256:'sha',parserRevision:'parser'},{sourceId:'source',extractionHash:'extract',sourceSha256:'old',parserRevision:'parser'},{sourceId:'source',extractionHash:'extract',sourceSha256:'sha',parserRevision:'old-parser'}])assert.equal((await restore({job})).updates.length,0);
 assert.equal((await restore({cancel:true})).updates.length,0);
});
test('late restore does not replace a new generation started on the same source',async()=>{
 const newer={id:'newer-running',sourceId:'source'};assert.equal((await restore({newJob:newer})).state,newer);
});
