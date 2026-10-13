import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function extract(source,name,kind=ts.ScriptKind.TS){const ast=ts.createSourceFile('test',source,ts.ScriptTarget.Latest,true,kind);let text;function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)text=node.getText(ast);if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name)text='const '+node.getText(ast);ts.forEachChild(node,visit);}visit(ast);assert.ok(text,name);return ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;}
test('iframe exploration messages require origin, frame, own player and canonical ID; never issue reflection',()=>{
 const source=extract(read('components/lesson/LessonWorldMap.tsx'),'onMessage',ts.ScriptKind.TSX),frame={},calls=[],map={peers:[{own:true}],discoveryPoints:[{id:'card-a',cell:7}]};
 const context={window:{location:{origin:'https://lesson.test'}},frameRef:{current:{contentWindow:frame}},latest:{current:{payload:{map}}},handlers:{current:{onExploreCard:id=>calls.push(id)}},send(){},readyRef:{current:false}};
 vm.createContext(context);vm.runInContext(source+';globalThis.handle=onMessage;',context);
 const message=(id,extra={})=>context.handle({origin:'https://lesson.test',source:frame,data:{type:'lesson-map:exploration',payload:{cardId:id}},...extra});
 message('card-a');assert.deepEqual(calls,['card-a']);for(const id of ['unknown','constructor','__proto__',null])message(id);message('card-a',{origin:'https://evil.test'});message('card-a',{source:{}});map.peers=[];message('card-a');assert.deepEqual(calls,['card-a']);
});
test('frame model uses canonical cells and hides discovery points from spectators and exams',()=>{
 const html=read('public/lesson-map.html'),source=extract(html.slice(html.indexOf('  function buildModel'),html.indexOf('\n  function ',html.indexOf('  function buildModel')+10)),'buildModel');
 const context={visiblePeers:i=>i.map.peers,cellOf:()=>0,sprite:()=>'',selectPeer(){},openPeerChooser(){}};vm.createContext(context);vm.runInContext(source,context);
 const input={sessionKey:'a',world:'modern',map:{totalPosition:40,peers:[{own:true,id:'me'}],discoveryPoints:[{id:'a',cell:7,position:9},{id:'bad',cell:99}]}},theme={image:'x',places:[],palette:[],route:[]};
 assert.equal(context.buildModel(input,theme).discoveryPoints.length,1);assert.equal(context.buildModel(input,theme).discoveryPoints[0].cell,7);input.examJourney={};assert.equal(context.buildModel(input,theme).discoveryPoints.length,0);delete input.examJourney;input.map.peers=[];assert.equal(context.buildModel(input,theme).discoveryPoints.length,0);
});
