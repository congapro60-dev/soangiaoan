import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
function module(file,modules={}){const exports={},js=ts.transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(js,{exports,require:name=>name==='react'?React:modules[name]});return exports;}
function load(){const modes=module('components/lesson/LessonModePanel.tsx');return module('components/lesson/SessionRules.tsx',{'./LessonModePanel':modes});}
const render=(props)=>renderToStaticMarkup(React.createElement(load().SessionRules,props));
test('rules show current world/mode/participation, objective/action/completion and game points distinction',()=>{
 const html=render({worldTitle:'Ngũ Ấn',rule:'merchant',participation:'pairs'});assert.match(html,/Ngũ Ấn/);assert.match(html,/Thương nhân/);assert.match(html,/Cặp đôi/);assert.match(html,/hợp đồng/);assert.match(html,/bài tiếp theo/);assert.match(html,/Điểm chơi/);assert.match(html,/cá nhân/);assert.match(html,/<details/);assert.match(html,/min-height:44px/);assert.doesNotMatch(html,/answerKey|Đáp án/);
});
test('world never determines rule; rerendered server choice updates without cached acknowledgement',()=>{
 const campaign=render({worldTitle:'Mê Cung Mật Mã',rule:'campaign',participation:'individual'}),duel=render({worldTitle:'Mê Cung Mật Mã',rule:'duel',participation:'group'});
 assert.match(campaign,/Hành trình năm ấn tín/);assert.match(duel,/Đấu trí/);assert.match(duel,/Đội/);assert.doesNotMatch(duel,/Hành trình năm ấn tín/);
 assert.match(render({worldTitle:'Thế giới của lớp'}),/Chờ thầy cô chọn luật/);assert.match(render({worldTitle:'Thế giới',rule:'UNKNOWN_PRIVATE',participation:'UNKNOWN'}),/Chờ thầy cô chọn luật/);assert.doesNotMatch(render({worldTitle:'Thế giới',rule:'UNKNOWN_PRIVATE'}),/UNKNOWN_PRIVATE/);
 assert.doesNotThrow(()=>assert.match(render({worldTitle:'Thế giới',rule:'constructor',participation:'constructor'}),/Chờ thầy cô chọn luật/));
});
test('rules use the established dark lesson surface paired with readable lesson text',()=>{
 const html=render({worldTitle:'Thế giới',rule:'campaign',participation:'individual'});assert.match(html,/background:var\(--lesson-surface,#1e293b\)/);assert.match(html,/color:var\(--lesson-text,#f8fafc\)/);
});
test('all nine rules have distinct understandable instructions; temporary event stays separate',()=>{
 const labels=['campaign','duel','zones','survival','escort','treasure','relay','lockdown','merchant'];for(const rule of labels){const html=render({worldTitle:'Cùng thế giới',rule,participation:'individual'});assert.match(html,/Mục tiêu chơi/);assert.match(html,/Em làm gì/);assert.match(html,/Khi nào hoàn thành/);}
 const html=render({worldTitle:'Thế giới',rule:'campaign',participation:'individual',eventLabel:'Bấm chuông'});assert.match(html,/Sự kiện tạm thời: Bấm chuông/);assert.match(html,/Luật: <strong>Hành trình năm ấn tín/);
});
test('lesson link prefills validated code, preserves typed code and takes precedence over another restored room',()=>{
 const source=readFileSync(new URL('../app/play/page.tsx',import.meta.url),'utf8'),ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let effect;
 function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[0]?.getText(ast).includes('const codeParam = params.get("code")'))effect=node.arguments[0].getText(ast);ts.forEachChild(node,visit);}visit(ast);assert.ok(effect);
 function restore(search,initial='',session=null){let code=initial;const context={URLSearchParams,window:{location:{search},setTimeout:fn=>{fn();return 1;},clearTimeout(){}},sessionStorage:{getItem:key=>key==='lesson_active_session_id'?session:null},setCode:value=>{code=typeof value==='function'?value(code):value;},setSessionId(){},setLearnerId(){},setBearerToken(){},setJoinError(){},setIsSessionRestored(){}};vm.runInNewContext('('+ts.transpileModule(effect,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText.trim().replace(/;$/,'')+')()',context);return code;}
 assert.equal(restore('?code=abc123'),'ABC123');assert.equal(restore('?code=abc123','TYPED1'),'TYPED1');assert.equal(restore('?code=abc123','','restored'), 'ABC123');for(const value of ['abc123long','abc12','abc!23','<test>'])assert.equal(restore('?code='+encodeURIComponent(value)),'');
});
