import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function ui() {
 const hooks=[], out={};let cursor=0;
 const React={createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(child=>child!==false&&child!=null)}),useState(initial){const at=cursor++;if(!(at in hooks))hooks[at]=initial;return[hooks[at],next=>hooks[at]=next];}};
 const code=ts.transpileModule(readFileSync(new URL('../components/lesson/TutorPanel.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports:out,require:name=>name==='react'?React:{__esModule:true,default:'MathText'}});
 return {render(props){cursor=0;return out.TutorPanel(props);}};
}
function nodes(tree) {return !tree||typeof tree!=='object'?[]:[tree,...(tree.children||[]).flatMap(nodes)];}
function button(tree,text) {return nodes(tree).find(node=>node.type==='button'&&node.children.join('')===text);}
test('recipient explicitly accepts or rejects; busy/frozen disables requests; no received pair means no consent action',async()=>{
 const env=ui(),calls=[],onCommand=async(type,payload)=>{calls.push({type,payload});return{ok:true};};
 const tutor={available:true,eligible:false,needed:true,candidates:[],hints:[],history:[],stars:0,pair:{id:'pair',role:'recipient',peerName:'An',status:'requested'}};
 let tree=env.render({tutor,busy:false,onCommand});await button(tree,'Đồng ý').props.onClick();await button(tree,'Từ chối').props.onClick();
 assert.deepEqual(JSON.parse(JSON.stringify(calls)),[{type:'TUTOR_RESPOND',payload:{requestId:'pair',accept:true}},{type:'TUTOR_RESPOND',payload:{requestId:'pair',accept:false}}]);
 tree=env.render({tutor:{...tutor,available:false},busy:false,onCommand});assert.equal(button(tree,'Đồng ý').props.disabled,true);
 tree=env.render({tutor:{...tutor,pair:null},busy:false,onCommand});assert.equal(button(tree,'Đồng ý'),undefined);
});
test('failed command displays recoverable error; hints render only consented tutor data',async()=>{
 const env=ui(),tutor={available:true,eligible:true,needed:false,candidates:[{id:'peer',name:'Bình'}],pair:null,hints:[],history:[],stars:0};
 const onCommand=async()=>({ok:false,code:'REVISION_MISMATCH'});let tree=env.render({tutor,busy:false,onCommand});
 await button(tree,'Mời hỗ trợ Bình').props.onClick();tree=env.render({tutor,busy:false,onCommand});assert.ok(nodes(tree).some(node=>node.props.role==='status'&&node.children.join('').includes('Chưa thực hiện')));
 tree=env.render({tutor:{...tutor,pair:{id:'pair',role:'tutor',peerName:'Bình',status:'active'},hints:[{id:'hint',taskId:'task',prompt:'Câu hỏi',text:'Gợi ý an toàn'}]},busy:false,onCommand});assert.equal(nodes(tree).filter(node=>node.type==='MathText').length,2);
});
test('awaiting recheck history has no actionable pair or end support button',()=>{
 const env=ui(),tutor={available:false,eligible:false,needed:false,candidates:[],pair:null,hints:[],stars:0,history:[{id:'pair',role:'tutor',peerName:'Bình',status:'awaiting_recheck'}]};
 const tree=env.render({tutor,busy:false,onCommand:async()=>{throw Error('must not call');}});assert.equal(button(tree,'Kết thúc hỗ trợ'),undefined);assert.equal(button(tree,'Đồng ý'),undefined);assert.equal(button(tree,'Hủy lời mời'),undefined);
});
