import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';

function harness(){
 const instances=new Map(),effects=[],commands=[];let current,cursor,focusCount=0;
 const hooks={...React,useState(initial){const slot=cursor++,owner=current;if(!Object.hasOwn(owner.slots,slot))owner.slots[slot]=typeof initial==='function'?initial():initial;return[owner.slots[slot],value=>{owner.slots[slot]=typeof value==='function'?value(owner.slots[slot]):value;}];},useRef(initial){const slot=cursor++;return current.slots[slot]||=( {current:initial});},useId(){return this.useRef(current.path).current;},useEffect(fn,deps){const slot=cursor++,owner=current,prior=owner.slots[slot];if(!prior||!deps||deps.some((v,i)=>!Object.is(v,prior.deps[i]))){if(prior?.cleanup)prior.cleanup();owner.slots[slot]={deps};effects.push(()=>{owner.slots[slot].cleanup=fn();});}}};
 const load=(file,other={})=>{const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/lesson/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>name==='react'?hooks:other[name],setTimeout:()=>1,clearTimeout:()=>{},window:{setTimeout:()=>1,clearTimeout:()=>{}},console});return exports;};
 const TaskInput=load('TaskInput.tsx',{'./MathText':({text})=>React.createElement('span',null,text)}).TaskInput;
 const Pager=load('QuestionPager.tsx').QuestionPager;
 const renderNode=(node,path)=>{if(!node||typeof node!=='object')return node;if(Array.isArray(node))return node.map((n,i)=>renderNode(n,path+'/'+(n?.key??i)));
  if(typeof node.type==='function'){const key=path+'/'+node.type.name+'/'+(node.key??'');current=instances.get(key)||{slots:[],path:key};instances.set(key,current);cursor=0;const out=node.type(node.props);return renderNode(out,key);}
  if(node.props?.ref)node.props.ref.current={focus:()=>focusCount++};return{...node,props:{...node.props,children:renderNode(node.props.children,path+'/children')}};};
 let identity='room:a:activity',ids=['one','two'];
 const render=(changes={})=>{identity=changes.identity??identity;ids=changes.ids??ids;const items=ids.map(id=>({id,content:React.createElement(TaskInput,{task:{id,type:'open',prompt:id,advertisedHints:[{id:'hint',tier:'one',opened:true,text:'Persistent hint'}]},onSubmit:()=>commands.push('submit'),onOpenHint:()=>commands.push('hint')})}));const tree=renderNode(React.createElement(Pager,{identity,items,busy:changes.busy}),'root');for(const effect of effects.splice(0))effect();return tree;};
 return{render,commands,get focusCount(){return focusCount;}};
}
const nodes=(node,predicate,result=[])=>{if(Array.isArray(node))node.forEach(n=>nodes(n,predicate,result));else if(node&&typeof node==='object'){if(predicate(node))result.push(node);nodes(node.props?.children,predicate,result);}return result;};
const text=node=>Array.isArray(node)?node.map(text).join(''):node&&typeof node==='object'?text(node.props?.children):String(node??'');
const button=(tree,label)=>nodes(tree,n=>n.type==='button'&&text(n)===label)[0];
const panels=tree=>nodes(tree,n=>n.props?.['data-question-id']);

test('Next/Back keep real TaskInput draft and hints mounted without submission',()=>{
 const h=harness();let tree=h.render();const first=panels(tree)[0],editor=nodes(first,n=>n.type==='textarea')[0];editor.props.onChange({target:{value:'Unsaved draft'}});
 tree=h.render();button(tree,'Tiếp').props.onClick();tree=h.render();assert.equal(panels(tree)[0].props.hidden,true);assert.equal(panels(tree)[0].props.style.display,'none');assert.equal(panels(tree).length,2);
 button(tree,'Trước').props.onClick();tree=h.render();assert.equal(nodes(panels(tree)[0],n=>n.type==='textarea')[0].props.value,'Unsaved draft');assert.match(text(panels(tree)[0]),/Persistent hint/);assert.deepEqual(h.commands,[]);assert.equal(h.focusCount,2);
});
test('selection follows stable task ID, server replacement falls back, identity resets',()=>{
 const h=harness();let tree=h.render();button(tree,'Tiếp').props.onClick();tree=h.render({ids:['two','one']});assert.equal(panels(tree).find(n=>!n.props.hidden).props['data-question-id'],'two');
 tree=h.render({ids:['three','one']});assert.equal(panels(tree).find(n=>!n.props.hidden).props['data-question-id'],'three');
 button(tree,'Tiếp').props.onClick();tree=h.render({identity:'room:b:activity'});assert.equal(panels(tree).find(n=>!n.props.hidden).props['data-question-id'],'three');
});
test('native keyboard buttons have bounds, busy guards, announced counter and focusable question',()=>{
 const h=harness();let tree=h.render();assert.equal(button(tree,'Trước').props.disabled,true);assert.equal(button(tree,'Tiếp').props.type,'button');assert.ok(nodes(tree,n=>n.props?.['aria-live']==='polite').length);assert.ok(nodes(tree,n=>n.props?.tabIndex===-1).length);
 tree=h.render({busy:true});assert.equal(button(tree,'Tiếp').props.disabled,true);button(tree,'Tiếp').props.onClick();assert.equal(panels(h.render()).find(n=>!n.props.hidden).props['data-question-id'],'one');
 assert.equal(h.render({ids:[]}),null);
});
