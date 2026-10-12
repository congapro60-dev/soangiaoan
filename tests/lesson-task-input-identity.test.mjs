import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const exports={},source=readFileSync(new URL('../components/lesson/TaskInput.tsx',import.meta.url),'utf8');
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports,require:name=>name==='react'?React:{__esModule:true,default:({text})=>React.createElement('span',null,text)}});
test('two pupils answering the same task get distinct accessible input IDs and radio groups',()=>{
 for(const checkerId of ['numeric_exact','single_choice_exact','rubric_manual']){
  const task={id:'shared-task',type:checkerId==='rubric_manual'?'open':'closed',evaluation:{checkerId},inputSchema:checkerId==='single_choice_exact'?{type:'single_choice',options:[{id:'a',label:'A'},{id:'b',label:'B'}]}:{}};
  const html=renderToStaticMarkup(React.createElement('div',null,[0,1].map(key=>React.createElement(exports.default,{key,task}))));
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'Input IDs must be unique');
  for(const match of html.matchAll(/\sfor="([^"]+)"/g))assert.equal(ids.filter(id=>id===match[1]).length,1,'Each label resolves one input');
  if(checkerId==='single_choice_exact'){const names=[...html.matchAll(/\sname="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(names).size,2,'Two independent radio groups');}
 }
});
