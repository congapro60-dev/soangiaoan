import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import katex from 'katex';
import {renderMath} from '../public/math-renderer.js';
function load(file,imports={}){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports,require:name=>name==='react'?React:imports[name]});return exports;}
const math=load('components/lesson/MathText.tsx',{katex,'../../public/math-renderer.js':{renderMath}});
test('teacher group review renders prompt, string answer, rubric and feedback math without altering JSON answers',()=>{
 const {TeacherGroupAssessment}=load('components/lesson/TeacherGroupAssessment.tsx',{'./MathText':math});
 const props={products:{one:{groupId:'group_raw',taskId:'task_raw',proposalHash:'x',answer:'$u_2=5$',ok:true,assessment:{feedback:'Kiểm tra $n\\ge1$'}}},tasks:[{id:'task_raw',prompt:'Tính $u_n=2n+1$',evaluation:{rubric:{criteria:['Thay $n=2$']}}}],onCommand(){}};
 const html=renderToStaticMarkup(React.createElement(TeacherGroupAssessment,props));
 assert.equal((html.match(/class="katex"/g)||[]).length,4);assert.match(html,/group_raw/);assert.doesNotMatch(html,/math-error/);
 props.products.one.answer={keep_key:'$u_n$'};
 const json=renderToStaticMarkup(React.createElement(TeacherGroupAssessment,props));assert.match(json,/keep_key/);assert.match(json,/\$u_n\$/);assert.equal((json.match(/class="katex"/g)||[]).length,3);
});
test('ordering editor renders math labels while editable input keeps exact authored TeX',()=>{
 const {StructuredQuestionEditor}=load('components/lesson/StructuredQuestionEditor.tsx',{'./MathText':math});
 const html=renderToStaticMarkup(React.createElement(StructuredQuestionEditor,{task:{id:'t',inputSchema:{items:[{id:'a',label:'$\\frac12$'}]},evaluation:{checkerId:'ordering_exact',answerKey:['a']}},onChange(){}}));
 assert.match(html,/class="katex"/);assert.match(html,/value="\$\\frac12\$"/);assert.doesNotMatch(html,/math-error/);
});
test('matching editor native options keep IDs, full card formulas render beside the selector',()=>{
 const source=readFileSync(new URL('../app/lessons/lesson-dashboard.tsx',import.meta.url),'utf8'),ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const node=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='MatchEditor');assert.ok(node);
 const context={React,MathText:math.default};vm.createContext(context);vm.runInContext(ts.transpileModule(node.getText(ast),{compilerOptions:{jsx:ts.JsxEmit.React}}).outputText,context);
 const html=renderToStaticMarkup(React.createElement(context.MatchEditor,{task:{inputSchema:{representations:[{id:'r',label:'Biểu diễn'}],cards:[{id:'card_1',label:'$\\frac12$'}]},evaluation:{answerKey:{r:'card_1'}}},onChange(){}}));
 assert.match(html,/<option value="card_1" selected="">card_1<\/option>/);assert.match(html,/class="katex"/);assert.match(html,/value="\$\\frac12\$"/);
});
