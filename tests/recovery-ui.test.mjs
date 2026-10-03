import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import ts from 'typescript';

const source=readFileSync('public/app.js','utf8');
const ast=ts.createSourceFile('app.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const functions=new Map();
function visit(node){if(ts.isFunctionDeclaration(node)&&node.name)functions.set(node.name.text,node.getText(ast));ts.forEachChild(node,visit);}
visit(ast);
function harness(names,extra={}){
 const calls=[];
 const state={id:'team',round:2,revision:9,status:'active',solved:[],levels:[2],race:{task:0,phase:'challenge'},recovery:{questionRevision:3,points:350,downgradePoints:200},drafts:{0:{answer:'draft'}}};
 const context=createContext({state,session:{id:'team',token:'student'},teacherSession:null,reports:[],busy:false,draftTimer:0,levelNames:['Dễ','Trung bình','Khá'],window:{confirm:()=>true},clearTimeout(){},hintDialog(){calls.push('dialog');},apply(){},save(){},render(){},toast(){},refresh:async()=>{},esc:v=>String(v).replaceAll('<','&lt;'),uid:()=> 'request-1',Date,endStudentSession(){},fetch:async(url,options)=>{calls.push(JSON.parse(options.body));return {ok:true,json:async()=>({serverNow:Date.now()})};},...extra});
 runInContext(names.map(n=>functions.get(n)).join('\n'),context);
 return {context,calls,state};
}
test('actual API function sends immutable canonical recovery context',async()=>{
 const {context,calls}=harness(['api']);
 await runInContext("api('save-draft',{id:session.id,input:{answer:'x'}})",context);
 assert.deepEqual(calls[0],{action:'save-draft',id:'team',input:{answer:'x'},round:2,stage:0,questionRevision:3,revision:9,requestId:'request-1'});
});
test('actual recovery action opens hint dialog and respects downgrade cancellation',async()=>{
 const {context,calls}=harness(['recoveryAction'],{window:{confirm:()=>false},api:async()=>{throw Error('must not mutate');}});
 await runInContext("recoveryAction('request-hint')",context);assert.deepEqual(calls,['dialog']);
 await runInContext("recoveryAction('downgrade-question')",context);assert.equal(context.busy,false);
});
test('actual teacher panel renders pending controls and escapes history',()=>{
 const {context}=harness(['teacherRecovery','teacherRecoveryBoard'],{reports:[{id:'t',team:'<script>',recovery:{helpPending:true,reportPending:true,questionRevision:4},eventHistory:[{type:'<img>',round:2,questionRevision:4}]}]});
 const html=runInContext('teacherRecoveryBoard()',context);
 assert.match(html,/data-teacher-recovery="acknowledge-help"/);assert.match(html,/data-teacher-recovery="resolve-question"/);
 assert.match(html,/&lt;script>/);assert.doesNotMatch(html,/<img>/);
 context.reports[0].recovery.helpPending=false;context.reports[0].recovery.reportPending=false;
 assert.doesNotMatch(runInContext('teacherRecoveryBoard()',context),/data-teacher-recovery=/);
});
test('draft identity changes on round, stage and question replacement',()=>{
 const {context,state}=harness(['draftIdentity']);const old=runInContext('draftIdentity()',context);
 state.round++;assert.notEqual(runInContext('draftIdentity()',context),old);state.round--;
 state.race.task++;assert.notEqual(runInContext('draftIdentity()',context),old);state.race.task--;
 state.recovery.questionRevision++;assert.notEqual(runInContext('draftIdentity()',context),old);
});
test('flush captures question context and aborts support after replacement during save',async()=>{
 let resolveSave,submitted;
 const {context,state}=harness(['draftIdentity','flushRecoveryDraft'],{api:async(action,body)=>{submitted={action,body:JSON.parse(JSON.stringify(body))};return new Promise(resolve=>{resolveSave=resolve;});}});
 const pending=runInContext('flushRecoveryDraft()',context);
 assert.equal(submitted.body.round,2);assert.equal(submitted.body.questionRevision,3);assert.equal(submitted.body.revision,9);
 state.recovery.questionRevision=4;
 resolveSave({state:{...state}});
 await assert.rejects(pending,/Đề đã thay đổi/);
});
