import assert from 'node:assert/strict';
import {test} from 'node:test';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {THEMES} from '../lib/campaign.js';
import {resolveThemeId} from '../lib/product-content.js';
import {DEFAULT_MEDIA_SETTINGS,MEDIA_CATEGORIES,MEDIA_CATALOG,createMediaGate,mediaEvents,normalizeMediaSettings} from '../lib/media-catalog.js';

test('server and generated client campaign exports preserve canonical parity',async()=>{
 const source=await readFile(new URL('../public/campaign-data.js',import.meta.url),'utf8');const context={window:{}};vm.runInNewContext(source,context);
 assert.deepEqual(JSON.parse(JSON.stringify(context.window.SignalCampaign.themes)),JSON.parse(JSON.stringify(THEMES)));assert.deepEqual(JSON.parse(JSON.stringify(context.window.SignalCampaign.topics)),JSON.parse(JSON.stringify((await import('../lib/campaign.js')).TOPICS)));
 assert.equal(Object.keys(THEMES).length,12);assert.equal(new Set(Object.values(THEMES).map(t=>t.title)).size,12);
 for(const [id,t] of Object.entries(THEMES)){assert.equal(t.route.length,33,id);assert.deepEqual(t.checkpoints,[0,8,16,24,32]);for(const [x,y] of t.route){assert(x>=0&&x<=100&&y>=0&&y<=100);}}
 assert.equal(resolveThemeId('Trạm mất tín hiệu'),'modern');assert.equal(resolveThemeId('Mật mã Ngày hội Dewey'),'dewey');assert.equal(resolveThemeId('Bí Mật Sau Tiếng Chuông'),'dewey');
});
test('legacy campaign title and report keys remain resolvable',()=>{const old={campaign:{theme:'Trạm mất tín hiệu'},teams:[{id:'a',completed:5,score:10}]};assert.equal(resolveThemeId(old.campaign.theme),'modern');assert.equal(old.teams[0].id,'a');});
test('media catalog has independent settings, categories and finite dedupe window',()=>{
 assert.equal(MEDIA_CATEGORIES.length,13);for(const category of MEDIA_CATEGORIES)assert(MEDIA_CATALOG[category].sound.notes.length>0);
 const safe=normalizeMediaSettings({master:true,sfx:false,music:true,meme:false,effects:false,reducedMotion:true,volume:999});assert.equal(safe.volume,100);assert.equal(safe.sfx,false);assert.equal(safe.music,true);assert.equal(DEFAULT_MEDIA_SETTINGS.master,false);
 const gate=createMediaGate();assert.equal(gate.accept({id:'a',category:'dice'}),true);assert.equal(gate.accept({id:'a',category:'dice'}),false);assert.equal(gate.accept({id:'b',category:'move'}),true);assert.equal(gate.accept({id:'c',category:'correct'}),true);assert.equal(gate.accept({id:'d',category:'move'},true),false);assert.equal(gate.accept({id:'d',category:'move'}),false);
});
test('state diffs produce event categories once without score mutation',()=>{const before={id:'team',round:1,revision:1,status:'active',events:[],solved:[],hints:[[],[],[],[],[]],wrong:0,race:{position:0,rolls:0}};const after={...before,revision:2,events:[{type:'roll',id:'r1'}],race:{position:2,rolls:1},solved:[3]};const events=mediaEvents(before,after,{peers:[]},0);assert(events.some(e=>e.category==='dice'));assert(events.some(e=>e.category==='move'));assert(events.some(e=>e.category==='correct'));assert.deepEqual(mediaEvents(after,after,{peers:[]},0),[]);});
