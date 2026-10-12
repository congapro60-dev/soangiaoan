import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
function load(views,commands=[]){const exports={},calls=[];const js=ts.transpileModule(readFileSync(new URL('../components/lesson/SharedDuelPanel.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(js,{exports,crypto:{randomUUID:()=> 'request'},require:name=>name==='react'?React:name.includes('useLessonSession')?{useLessonSession:options=>{calls.push(options);return{view:views[options.actingLearnerId],isSubmitting:false,error:null,dispatchCommand:async(type,payload)=>{commands.push({actor:options.actingLearnerId,type,payload});return{ok:true};}};} }:name.includes('ClassEventPanel')?{ClassEventPanel:'ClassEventPanel'}:{}});return{exports,calls};}
function nodes(tree){return !tree||typeof tree!=='object'?[]:[tree,...React.Children.toArray(tree.props?.children).flatMap(nodes)];}
const memberA={learnerId:'a',name:'An'},memberB={learnerId:'b',name:'Bình'};
const view=opponentId=>({status:'active',timeline:{locked:false},classEvent:{id:'event',type:'duel',status:'active',own:{opponentId,sharedDuel:true,canAnswer:true,task:{prompt:'Own prompt'}}},passport:{PRIVATE:'secret'},drafts:{PRIVATE:'secret'}});
test('shared duel panes each bind their own actor, dispatch own answer only and never render passport/drafts',async()=>{
 const commands=[],h=load({a:view('b'),b:view('a')},commands);const tree=h.exports.SharedDuelPanel({sessionId:'session',token:'PRIVATE_TOKEN',members:[memberA,memberB]});const sides=nodes(tree).filter(node=>typeof node.type==='function');assert.equal(sides.length,2);
 const left=sides[0].type(sides[0].props),right=sides[1].type(sides[1].props);assert.deepEqual(h.calls.map(call=>call.actingLearnerId),['a','b']);assert.equal(JSON.stringify([left,right]).includes('PRIVATE'),false);
 const pane=nodes(left).find(node=>node.type==='ClassEventPanel');await pane.props.onAnswer({step:0,answer:5});assert.deepEqual(JSON.parse(JSON.stringify(commands)),[{actor:'a',type:'CLASS_EVENT_ANSWER',payload:{step:0,answer:5,eventId:'event',requestId:'request'}}]);
});
test('mismatched or legacy opponent pane shows waiting message, pause/revoked error never leaves enabled answer UI',()=>{
 const h=load({a:view('outside')});const tree=h.exports.SharedDuelPanel({sessionId:'session',token:'token',members:[memberA,memberB]});const side=nodes(tree).find(node=>typeof node.type==='function'),rendered=side.type(side.props);assert.equal(nodes(rendered).filter(node=>node.type==='ClassEventPanel').length,0);assert.ok(JSON.stringify(rendered).includes('Cặp đối kháng chưa được xác nhận'));
 const paused=load({a:{...view('b'),status:'paused'}}),whole=paused.exports.SharedDuelPanel({sessionId:'s',token:'t',members:[memberA,memberB]}),first=nodes(whole).find(node=>typeof node.type==='function'),pane=nodes(first.type(first.props)).find(node=>node.type==='ClassEventPanel');assert.equal(pane.props.disabled,true);
});
