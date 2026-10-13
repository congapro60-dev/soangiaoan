import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync(new URL('../components/lesson/LessonEncounterSheet.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('sheet.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let effect;
function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect')effect=node.arguments[0].getText(ast);ts.forEachChild(node,visit);}visit(ast);
test('mounted encounter traps Tab, restores background and lets native attention own Escape',()=>{
 const listeners={},doc={activeElement:null,body:{},querySelector:()=>null,addEventListener:(name,fn)=>listeners[name]=fn,removeEventListener:name=>delete listeners[name]};
 class Element {constructor(){this.inert=false;this.tagName='DIV';this.children=[];}focus(){doc.activeElement=this;}getClientRects(){return[{}];}closest(){return null;}}
 const trigger=new Element(),background=new Element(),attention=new Element(),sheet=new Element(),panel=new Element(),first=new Element(),last=new Element(),main=new Element();attention.tagName='DIALOG';main.parentElement=doc.body;doc.body.children=[main];main.children=[background,attention,sheet];sheet.parentElement=main;panel.parentElement=sheet;panel.querySelectorAll=()=>[first,last];doc.activeElement=trigger;
 let closes=0;const context={document:doc,HTMLElement:Element,open:true,panelRef:{current:panel},returnFocus:{current:null},onClose:()=>closes++};vm.createContext(context);vm.runInContext('globalThis.cleanup=('+ts.transpileModule(effect,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.trim().replace(/;$/,'')+')()',context);
 assert.equal(background.inert,true);assert.equal(attention.inert,false);assert.equal(doc.activeElement,panel);
 let prevented=0;doc.activeElement=last;listeners.keydown({key:'Tab',preventDefault:()=>prevented++});assert.equal(doc.activeElement,first);
 listeners.keydown({key:'Tab',shiftKey:true,preventDefault:()=>prevented++});assert.equal(doc.activeElement,last);assert.equal(prevented,2);
 doc.querySelector=()=>attention;listeners.keydown({key:'Escape',preventDefault(){}});assert.equal(closes,0);
 doc.querySelector=()=>null;listeners.keydown({key:'Escape',preventDefault(){}});assert.equal(closes,1);context.cleanup();assert.equal(background.inert,false);assert.equal(doc.activeElement,trigger);
 doc.activeElement=doc.body;doc.querySelector=query=>query==='[data-encounter-trigger]'?trigger:null;
 vm.runInContext('globalThis.cleanup=('+ts.transpileModule(effect,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.trim().replace(/;$/,'')+')()',context);
 context.cleanup();assert.equal(doc.activeElement,trigger);
});
