import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import katex from 'katex';
import {renderMath,tokenizeMath} from '../public/math-renderer.js';
import {createLessonSession,reduceLessonSession} from '../lib/lesson/runtime.js';
import {explorationView} from '../lib/lesson/exploration.js';
const mathExports={};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/lesson/MathText.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports:mathExports,require:name=>name==='react'?React:name==='katex'?katex:{renderMath}});
const exports={};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/lesson/ExplorationPanel.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports,require:name=>name==='react'?React:mathExports});
const render=(view)=>renderToStaticMarkup(React.createElement(exports.ExplorationPanel,{view,status:'active',activityId:'a',onCommand:async()=>({ok:true})}));
test('exploration optional, content remains nongraded and claim needs an encountered card',()=>{
 assert.equal(render(undefined),'');
 const html=render({supported:true,enabled:true,open:true,canOpen:true,remainingMs:120000,budgetLeftMs:120000,fragments:0,cards:[{id:'one',title:'Thẻ',body:'Nội dung đọc chung',question:'Em chú ý gì?',options:['Một','Hai','Ba'],sourceLabel:'Tự soạn',found:false,collected:false,selected:null}],points:[]});
 assert.match(html,/Nội dung đọc chung/);assert.match(html,/Thẻ 1\/1/);assert.match(html,/Chưa gặp ô/);assert.match(html,/<dialog/);assert.match(html,/min-height:44px/);assert.doesNotMatch(html,/Đã đọc · nhận mảnh/);
});
test('collected responses retain choice and reward is only cosmetic',()=>{
 const html=render({supported:true,enabled:true,open:true,fragments:3,rewardUnlocked:true,cards:[{id:'one',title:'Thẻ',options:['Một','Hai','Ba'],found:true,collected:true,selected:1}],points:[]});
 assert.match(html,/Nhà thám hiểm/);assert.match(html,/trang trí/);assert.doesNotMatch(html,/checked|<input/);assert.match(html,/Mảnh này đã ở trong sổ tay/);
});
test('concluded album remains readable but cannot claim new fragments',()=>{
 const html=renderToStaticMarkup(React.createElement(exports.ExplorationPanel,{status:'concluded',view:{supported:true,enabled:true,open:false,fragments:1,cards:[{id:'one',title:'Thẻ',body:'Nội dung xem lại',options:['Một'],found:true,collected:false,selected:null}]},onCommand:async()=>({ok:true})}));
 assert.match(html,/Xem lại/);assert.match(html,/Nội dung xem lại/);assert.match(html,/<button[^>]*disabled[^>]*>Đã đọc/);assert.doesNotMatch(html,/<button[^>]*disabled[^>]*>Sổ tay/);
});
test('all exploration rich fields use the actual safe MathText renderer',()=>{
 const cards=[{id:'one',title:'Vai trò $u_n$',category:'Ký hiệu $n$',body:'$u_3=7$; <img src=x onerror=alert(1)>',question:'$n=3$?',options:['$u_1=3$','$u_2=5$','$u_3=7$'],sourceLabel:'Ví dụ $n=1$',found:true,collected:false,selected:null}];
 const html=render({supported:true,enabled:true,open:true,cards});
 assert.equal((html.match(/class="katex"/g)||[]).length,3);
 assert.doesNotMatch(html,/<input|<fieldset|Tự soạn|Ví dụ \$n=1\$|Lưu ý và nhận/);
 assert.match(html,/<msub>/);assert.doesNotMatch(html,/math-error|<img /);assert.match(html,/&lt;img/);
});
test('authored cards mark every formula explicitly and keep sequence calculations',()=>{
 const pkg=JSON.parse(readFileSync(new URL('../content/lessons/g11-sequences-p1.json',import.meta.url)));
 let state=createLessonSession({package:pkg,seed:43,sessionId:'math',hostId:'teacher',learners:[{id:'pupil',name:'Em'}],now:1000});
 for(const [type,payload]of [['EXPLORATION_CONFIG',{enabled:true}],['START',{}],['EXPLORATION_WINDOW',{open:true}]])state=reduceLessonSession(state,{type,payload,eventId:type,round:state.round,revision:state.revision,activityId:state.timeline.currentActivityId},{actor:{role:'teacher',id:'teacher'},now:state.clock.lastNow+1}).state;
 const cards=explorationView(state,'pupil',state.clock.lastNow).cards;
 for(const card of cards){for(const field of [card.title,card.body]){const tokens=tokenizeMath(field);assert.ok(tokens.filter(t=>t.type==='text').every(t=>!/[a-z]_[a-z0-9]/i.test(t.text)),field);assert.doesNotMatch(renderMath(field,katex),/math-error/);}assert.equal(card.question,undefined);assert.equal(card.options,undefined);assert.equal(card.sourceLabel,undefined);}
 assert.equal((render({supported:true,enabled:true,open:true,cards}).match(/<math/g)||[]).length>0,true);
 for(let n=1;n<=4;n++)assert.equal(n+(n-1)*(n-2)*(n-3),n===4?10:n);
});



test('only the requested exploration card renders; navigation exposes bounds without questions',()=>{
 const cards=[{id:'first',title:'Thẻ đầu',body:'Nội dung đầu',found:false,collected:false},{id:'second',title:'Thẻ sau',body:'Nội dung sau',found:true,collected:false}];
 const html=renderToStaticMarkup(React.createElement(exports.ExplorationPanel,{status:'active',activityId:'a',openCardId:'second',hideTrigger:true,view:{supported:true,enabled:true,open:true,cards},onCommand:async()=>({ok:true})}));
 assert.match(html,/Nội dung sau/);assert.doesNotMatch(html,/Nội dung đầu/);assert.match(html,/Thẻ 2\/2/);assert.match(html,/<button[^>]*disabled[^>]*>Thẻ tiếp/);assert.match(html,/Đã đọc · nhận mảnh/);assert.doesNotMatch(html,/<input|<fieldset/);
});
