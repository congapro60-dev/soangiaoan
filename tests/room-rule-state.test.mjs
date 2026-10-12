import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const ast=ts.createSourceFile('app.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),functions=new Map();
function visit(node){if(ts.isFunctionDeclaration(node)&&node.name)functions.set(node.name.text,node.getText(ast));ts.forEachChild(node,visit);}visit(ast);
function context(overrides={}){
 const pendingCampaign={rule:'duel',theme:'old',participation:'pairs'};
 const sandbox={screen:'landing',state:null,pendingRoomInfo:{durationMs:375000,campaign:pendingCampaign},pendingCampaign,board:null,C:{themes:{old:{title:'Old world'},current:{title:'Current world'}},resolveThemeId:key=>key},...overrides};
 vm.createContext(sandbox);vm.runInContext(functions.get('roomRulesInfo'),sandbox);return sandbox;
}
test('unbound landing ignores previous room; briefing uses only its selected room',()=>{
 const sandbox=context();assert.equal(vm.runInContext('roomRulesInfo()',sandbox),null);
 sandbox.screen='briefing';const info=vm.runInContext('roomRulesInfo()',sandbox);assert.equal(info.campaign.rule,'duel');assert.equal(info.durationMs,375000);
});
test('canonical student room overrides pending room and header uses current mode rule',()=>{
 const sandbox=context({screen:'play',state:{campaign:{rule:'campaign',theme:'current'},mode:{rule:'zones'},durationMs:300000},esc:String,window:{SignalRoomRules:{label:rule=>rule}}});
 const info=vm.runInContext('roomRulesInfo()',sandbox);assert.equal(info.worldTitle,'Current world');assert.equal(info.mode.rule,'zones');assert.equal(info.durationMs,300000);
 vm.runInContext(functions.get('header'),sandbox);assert.match(vm.runInContext('header()',sandbox),/Luật phòng · zones/);
});
test('teacher rules ignore an unrelated student session including its duration',()=>{
 const sandbox=context({screen:'teacher',state:{campaign:{rule:'survival',theme:'old'},mode:{rule:'survival'},durationMs:180000},board:{room:{campaign:{rule:'duel',theme:'current'}}},esc:String,window:{SignalRoomRules:{label:rule=>rule}}});
 const info=vm.runInContext('roomRulesInfo()',sandbox);assert.equal(info.campaign.rule,'duel');assert.equal(info.mode,null);assert.notEqual(info.durationMs,180000,'Student duration cannot describe the teacher room');
 sandbox.board=null;assert.equal(vm.runInContext('roomRulesInfo()',sandbox),null,'Teacher without a selected room remains unbound');
 vm.runInContext(functions.get('header'),sandbox);assert.doesNotMatch(vm.runInContext('header()',sandbox),/Luật phòng · campaign/,'Unbound teacher header cannot guess a rule');
});
test('an open rule dialog refreshes after canonical state changes',()=>{
 const sandbox=context({screen:'play',state:{id:'a',round:1,revision:1,solved:[],drafts:{},mode:{rule:'duel'}},dlg:{open:true,dataset:{kind:'rules'},innerHTML:'duel',close(){this.open=false;}},mapState:null,read:()=>({}),DK:'draft',draftIdentity:()=>'',draftTimer:null,pipeTurns:[],clearTimeout(){},save(){}});
 sandbox.rulesBody=()=>sandbox.state.mode.rule;
 vm.runInContext(functions.get('apply'),sandbox);vm.runInContext('apply({state:{id:"a",round:1,revision:2,solved:[],drafts:{},mode:{rule:"zones"}}})',sandbox);
 assert.match(sandbox.dlg.innerHTML,/zones/);assert.doesNotMatch(sandbox.dlg.innerHTML,/duel/);
});
