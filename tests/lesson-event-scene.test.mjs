import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
function render(view){const exports={};const js=ts.transpileModule(readFileSync(new URL('../components/lesson/ClassEventScene.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(js,{exports,require:()=>React});return renderToStaticMarkup(React.createElement(exports.default,{view}));}
function view(type,value=0,own=null){return{id:'event',type,label:type,status:'active',remainingMs:120000,players:150,progress:{label:'Tiến độ',value,max:10},teams:[{label:'Đội 1',points:10,players:75},{label:'Đội 2',points:20,players:75}],own};}
test('all scenes render bounded scalable native SVG with accessible honest text and no interactive answer controls',()=>{
 const types=['tug','boss','buzzer','castle','archery','surf','duel','relay','treasure','estimate','bingo'];
 for(const type of types){const html=render(view(type));assert.match(html,/viewBox="0 0 320 150"/);assert.match(html,/aria-label=/);assert.doesNotMatch(html,/<button|<input|<canvas|answerKey|PRIVATE|setInterval/);assert.match(html,/width="100%"/);}
 assert.equal(render(view('mountain')),'');assert.equal(render(view('unknown')),'');
});
test('tug signed rope endpoints reflect real advantage; boss health has bounded zero/max widths',()=>{
 const left=render(view('tug',-10)),neutral=render(view('tug',0)),right=render(view('tug',10));assert.match(left,/cx="80"/);assert.match(neutral,/cx="160"/);assert.match(right,/cx="240"/);
 assert.match(render(view('boss',0)),/width="0"/);assert.match(render(view('boss',10)),/width="240"/);assert.match(render(view('boss',Infinity)),/width="0"/);
});
test('own turn, duel bye, surf combo and bingo free cells are visible without leaking names or answers',()=>{
 const own={step:1,questions:3,score:20,correct:1,canAnswer:true,opponentScore:null,bingo:[true,false,true,true],bingoFree:[false,false,true,true],combo:2,task:{prompt:'PRIVATE_ANSWER'}};
 assert.match(render(view('relay',1,own)),/Tới lượt em/);assert.match(render(view('relay',1,{...own,canAnswer:false})),/Chờ lượt/);assert.match(render(view('duel',1,own)),/miễn đấu/);
 assert.match(render(view('surf',40,own)),/Combo ×2/);assert.match(render(view('bingo',0,own)),/Tự do/);assert.doesNotMatch(render(view('bingo',0,own)),/PRIVATE_ANSWER/);
});
