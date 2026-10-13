import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';

function harness(responder,initialCode='',stored={}) {
  const slots=[],effects=[],calls=[],joined=[],redirects=[],storage=new Map(Object.entries(stored));let cursor=0;
  const hooks={...React,useState(initial){const i=cursor++;if(!Object.hasOwn(slots,i))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},useRef(value){const i=cursor++;return slots[i]||=( {current:value});},useEffect(fn,deps){const i=cursor++,prior=slots[i];if(!prior||deps.some((v,j)=>!Object.is(v,prior.deps[j]))){prior?.cleanup?.();slots[i]={deps};effects.push(()=>{slots[i].cleanup=fn();});}}};
  const exports={},source=readFileSync(new URL('../app/play/page.tsx',import.meta.url),'utf8');
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText+'\nexports.StudentJoinForm = typeof StudentJoinForm === \"function\" ? StudentJoinForm : undefined;',{exports,require:n=>n==='react'?hooks:{},fetch:async(url,options={})=>{const call={url,options,body:options.body?JSON.parse(options.body):undefined};calls.push(call);const result=await responder(call);return{ok:result.ok??true,status:result.status??200,json:async()=>result.data};},sessionStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},window:{location:{assign:url=>redirects.push(url)}},AbortController,crypto:webcrypto,URLSearchParams,Date,Math,btoa:s=>Buffer.from(s,'binary').toString('base64'),console});
  assert.equal(typeof exports.StudentJoinForm,'function','Inline pupil login must exist');
  const render=()=>{cursor=0;const tree=exports.StudentJoinForm({initialCode,onJoined:value=>joined.push(value)});for(const e of effects.splice(0))e();return tree;};
  const settle=async()=>{for(let i=0;i<4;i++){await new Promise(resolve=>setImmediate(resolve));render();}return render();};
  return{render,settle,calls,joined,redirects,storage};
}
const nodes=(n,p,out=[])=>{if(Array.isArray(n))n.forEach(v=>nodes(v,p,out));else if(n&&typeof n==='object'){if(p(n))out.push(n);nodes(n.props?.children,p,out);}return out;};
const text=n=>Array.isArray(n)?n.map(text).join(''):n&&typeof n==='object'?text(n.props?.children):String(n??'');
const input=(tree,id)=>nodes(tree,n=>n.props?.id===id)[0];
const submit=tree=>nodes(tree,n=>n.type==='form')[0].props.onSubmit({preventDefault(){}});
const change=(h,id,value)=>input(h.render(),id).props.onChange({target:{value}});

test('room code selects simple name join and validates before sending',async()=>{
 const h=harness(call=>call.url==='/api/escape'?{data:{kind:'lesson',needsProfile:false}}:{data:{projection:{id:'session'},learnerId:'learner'}},'ABC123');
 h.render();let tree=await h.settle();assert.equal(input(tree,'room-code-input').props.value,'ABC123');assert.ok(input(tree,'student-name-input'));assert.equal(input(tree,'join-pin'),undefined);
 change(h,'student-name-input',' An ');await submit(h.render());assert.equal(h.joined.length,1);const join=h.calls.find(c=>c.url==='/api/lesson-sessions');assert.equal(join.body.name,'An');assert.equal(join.body.code,'ABC123');assert.equal(join.body.classToken,undefined);
});
test('profile room uses inline PIN, canonical server name, keeps PIN out of storage and lesson body',async()=>{
 const h=harness(call=>call.url==='/api/escape'?{data:{kind:'lesson',needsProfile:true}}:call.url==='/api/lesson-classes'?{data:{token:'class-token',class:{id:'class'},member:{id:'member',name:'An chính thức'}}}:{data:{projection:{id:'session'},learnerId:'learner'}},'ABC123');
 h.render();let tree=await h.settle();assert.equal(input(tree,'student-name-input'),undefined);assert.equal(input(tree,'join-pin').props.type,'password');
 change(h,'join-class-code','CLS123');change(h,'join-member-code','MEM123');change(h,'join-pin','ABCDEFGH');await submit(h.render());
 const join=h.calls.find(c=>c.url==='/api/lesson-sessions');assert.equal(join.body.name,'An chính thức');assert.equal(join.body.classToken,'class-token');assert.equal(join.body.pin,undefined);assert.equal(h.joined.length,1);assert.equal([...h.storage.values()].includes('ABCDEFGH'),false);assert.equal(input(h.render(),'join-pin'),undefined);
});
test('bad PIN never joins lesson and error remains recoverable',async()=>{
 const h=harness(call=>call.url==='/api/escape'?{data:{kind:'lesson',needsProfile:true}}:{ok:false,status:403,data:{error:'CLASS_LOGIN_UNAVAILABLE'}},'ABC123');h.render();await h.settle();change(h,'join-class-code','CLS123');change(h,'join-member-code','MEM123');change(h,'join-pin','ABCDEFGH');await submit(h.render());
 assert.equal(h.calls.filter(c=>c.url==='/api/lesson-sessions').length,0);assert.match(text(h.render()),/Mã lớp, mã học sinh hoặc PIN/);assert.ok(input(h.render(),'join-pin'));assert.equal(h.joined.length,0);
});
test('stored credential requires server validation; stale token returns inline login',async()=>{
 const h=harness(call=>call.url==='/api/escape'?{data:{kind:'lesson',needsProfile:true}}:{ok:false,status:401,data:{error:'AUTH_REQUIRED'}},'ABC123',{lesson_class_passport_token:'stale'});h.render();const tree=await h.settle();assert.equal(h.calls.find(c=>c.url==='/api/lesson-classes').options.headers.Authorization,'Bearer stale');assert.ok(input(tree,'join-pin'));assert.equal(h.storage.has('lesson_class_passport_token'),false);assert.equal(h.joined.length,0);
});
test('changed room ignores a late lookup and legacy game returns only to fixed local route',async()=>{
 let resolveOld;const h=harness(call=>call.body.code==='OLD123'?new Promise(resolve=>{resolveOld=resolve;}):{data:{kind:'game'}},'OLD123');h.render();change(h,'room-code-input','NEW123');h.render();await h.settle();resolveOld({data:{kind:'lesson',needsProfile:true}});const tree=await h.settle();assert.equal(input(tree,'join-pin'),undefined);await submit(tree);assert.deepEqual(h.redirects,['/?code=NEW123']);assert.equal(h.joined.length,0);
});
test('validated saved profile needs no second name or PIN, forbidden room recovers inline',async()=>{
 const h=harness(call=>call.url==='/api/escape'?{data:{kind:'lesson',needsProfile:true}}:call.url==='/api/lesson-classes'?{data:{member:{id:'member',name:'An chính thức'}}}:{ok:false,status:403,data:{error:'FORBIDDEN'}},'ABC123',{lesson_class_passport_token:'verified'});h.render();let tree=await h.settle();assert.match(text(tree),/An chính thức/);assert.equal(input(tree,'join-pin'),undefined);await submit(tree);tree=h.render();assert.ok(input(tree,'join-pin'));assert.equal(h.storage.has('lesson_class_passport_token'),false);assert.equal(h.joined.length,0);assert.equal(h.calls.find(c=>c.url==='/api/lesson-sessions').body.classToken,'verified');
});
test('lookup failure exposes retry, invalid code never sends credentials',async()=>{
 let fail=true;const h=harness(()=>fail?{ok:false,data:{error:'not found'}}:{data:{kind:'lesson',needsProfile:false}},'ABC123');h.render();let tree=await h.settle();assert.match(text(tree),/Thử lại/);fail=false;nodes(tree,n=>n.type==='button'&&text(n)==='Thử lại')[0].props.onClick();tree=await h.settle();assert.ok(input(tree,'student-name-input'));const count=h.calls.length;change(h,'room-code-input','bad!');h.render();await h.settle();await submit(h.render());assert.equal(h.calls.length,count);assert.equal(h.joined.length,0);
});
