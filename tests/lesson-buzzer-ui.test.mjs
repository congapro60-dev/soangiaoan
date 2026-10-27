import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function ui(){const hooks=[],exports={};let at=0;const React={createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(child=>child!==false&&child!=null)}),useState(initial){const i=at++;if(!(i in hooks))hooks[i]=initial;return[hooks[i],next=>hooks[i]=next];}};const js=ts.transpileModule(readFileSync(new URL('../components/lesson/ClassEventPanel.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(js,{exports,require:name=>name==='react'?React:name.endsWith('TaskImage')?{__esModule:true,default:'Visual',taskImageOf:()=>undefined,taskSolidOf:()=>undefined}:{__esModule:true,default:name.endsWith('TaskInput')?'TaskInput':'Visual'}});return{render(props){at=0;return exports.ClassEventPanel(props);}};}
function nodes(tree){return !tree||typeof tree!=='object'?[]:[tree,...(tree.children||[]).flatMap(nodes)];}
const view={id:'event',type:'buzzer',label:'Bấm chuông',status:'active',remainingMs:60000,players:2,progress:{label:'Thời gian',value:0},teams:[],own:{step:0,questions:2,score:0,correct:0,canAnswer:false,task:null,bingo:[],buzzer:{canBuzz:true,pressed:false,remainingMs:0}}};
test('actual pupil press dispatches server step, displays no question before server claim; frozen and TV have no button',async()=>{
 const env=ui(),calls=[],onBuzz=async input=>calls.push(input);let tree=env.render({view,onBuzz});const button=nodes(tree).find(node=>node.type==='button'&&node.children.includes('Bấm chuông để trả lời'));assert.ok(button);assert.equal(button.props.style.minHeight,44);await button.props.onClick();assert.deepEqual(JSON.parse(JSON.stringify(calls)),[{step:0}]);assert.equal(nodes(tree).filter(node=>node.type==='TaskInput').length,0);
 tree=env.render({view,onBuzz,disabled:true});assert.equal(nodes(tree).find(node=>node.type==='button').props.disabled,true);tree=env.render({view:{...view,own:null},onBuzz});assert.equal(nodes(tree).filter(node=>node.type==='button').length,0);
});
test('accepted server claim renders task; failed press keeps state with recoverable message',async()=>{
 const env=ui(),onBuzz=async()=>{throw Error('PRIVATE_ERROR');};let tree=env.render({view,onBuzz});await nodes(tree).find(node=>node.type==='button').props.onClick();tree=env.render({view,onBuzz});assert.ok(nodes(tree).some(node=>node.props.role==='alert'&&node.children.join('').includes('Chưa bấm')));assert.equal(JSON.stringify(tree).includes('PRIVATE_ERROR'),false);
 tree=env.render({view:{...view,mandatory:true,own:{...view.own,canAnswer:true,task:{id:'task',prompt:'Question',type:'closed'},buzzer:{canBuzz:false,pressed:true,remainingMs:30000}}},onBuzz,onAnswer:()=>{}});assert.equal(nodes(tree).filter(node=>node.type==='TaskInput').length,1);assert.equal(nodes(tree).filter(node=>node.type==='button').length,0);
});
