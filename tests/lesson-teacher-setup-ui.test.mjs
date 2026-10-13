import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as setup from '../lib/lesson/teacher-setup.js';
const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../components/lesson/TeacherSetupPanel.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{exports,require:name=>name==='react'?React:setup});
const lesson={objectives:[{code:'T11.18'}],budget:{reserveMinutes:4},activities:[{phase:'practice',taskIds:['t']}],tasks:[{id:'t',type:'closed',participation:'individual',prompt:'Hàng ghế',evaluation:{checkerId:'numeric_exact'}}]};
const find=(node,predicate)=>{if(!node||typeof node!=='object')return; if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const found=find(child,predicate);if(found)return found;}};
test('before launch proposal exposes primary choices before collapsed advanced controls',()=>{
 const value=setup.recommendTeacherSetup(lesson),html=renderToStaticMarkup(React.createElement(exports.TeacherSetupPanel,{lesson,value,onChange(){}}));
 assert.match(html,/Gợi ý thiết lập cả bài/);assert.match(html,/Thầy cô có thể chỉnh lại/);assert.match(html,/<details>/);assert.doesNotMatch(html,/<details open/);for(const label of Object.values(setup.RULE_LABELS))assert.ok(html.includes(label));assert.match(html,/4 phút/);assert.doesNotMatch(html,/5 phút/);
 const primary=html.slice(0,html.indexOf('<details>'));for(const label of ['Thế giới','Luật chơi','Hình thức','Thiết bị học sinh'])assert.ok(primary.includes(label));for(const label of Object.values(setup.WORLD_LABELS))assert.ok(primary.includes(label));for(const label of Object.values(setup.DEVICE_LABELS))assert.ok(primary.includes(label));assert.equal(Object.keys(setup.WORLD_LABELS).length,12);
});
test('recommend button replaces only local proposal; manual changes preserve other chosen fields',()=>{
 const value={...setup.recommendTeacherSetup(lesson),rule:'treasure',aiPolicy:'hints'},saved=[];
 const tree=exports.TeacherSetupPanel({lesson,value,onChange:next=>saved.push(next)});
 find(tree,node=>node.type==='button'&&node.props.children==='Gợi ý thiết lập cả bài').props.onClick();assert.deepEqual(saved[0],setup.recommendTeacherSetup(lesson));
 const rule=find(tree,node=>node.type==='select'&&node.props.value==='treasure');rule.props.onChange({target:{value:'relay'}});assert.equal(saved[1].rule,'relay');assert.equal(saved[1].aiPolicy,'hints');assert.equal(saved[1].event.minutes,3);
 find(tree,node=>node.type==='select'&&node.props.value==='modern').props.onChange({target:{value:'historical'}});assert.equal(saved[2].worldTheme,'historical');assert.equal(saved[2].rule,'treasure');
 find(tree,node=>node.type==='select'&&node.props.value==='A').props.onChange({target:{value:'B'}});assert.equal(saved[3].deviceMode,'B');assert.equal(saved[3].aiPolicy,'hints');
});
test('unsupported lesson disables exploration and event choices without modifying academic tasks',()=>{
 const pkg={objectives:[],tasks:[],activities:[],budget:{reserveMinutes:0}},before=JSON.stringify(pkg),value=setup.recommendTeacherSetup(pkg),html=renderToStaticMarkup(React.createElement(exports.TeacherSetupPanel,{lesson:pkg,value,onChange(){}}));
 assert.match(html,/<input type="checkbox" disabled=""/);assert.match(html,/value="buzzer" disabled=""/);assert.equal(JSON.stringify(pkg),before);
});
test('unticking one integration preserves the other selection',()=>{
 const value={...setup.recommendTeacherSetup(lesson),integrationIds:['real-world','digital-media']},saved=[];
 const tree=exports.TeacherSetupPanel({lesson,value,onChange:next=>saved.push(next)}),node=find(tree,n=>typeof n.type==='function'&&n.type.name==='SetupIntegrations');
 const controls=node.type(node.props),checkbox=find(controls,n=>n.type==='input'&&n.props.checked);
 checkbox.props.onChange({target:{checked:false}});assert.deepEqual(saved[0].integrationIds,['real-world']);
});
