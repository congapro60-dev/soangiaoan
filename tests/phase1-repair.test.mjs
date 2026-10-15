import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {THEMES,createCampaign} from '../lib/campaign.js';
import {LEGACY_THEME_TITLES} from '../lib/product-content.js';

test('both generators are stable and keep the painted and 3D-rendered world covers untouched',async()=>{
 const rendered=['cube','ring','zones','academy','survival','galaxy','maze'].flatMap(id=>[THEMES[id].image,THEMES[id].imageHi]).map(f=>'public/assets/'+f);
 const preserved=['public/katex/katex.min.css',...Object.keys(LEGACY_THEME_TITLES).map(id=>'public/assets/'+THEMES[id].image),...rendered];
 const before=await Promise.all(preserved.map(p=>readFile(p)));
 const outputs=['public/campaign-data.js','public/feedback.js'];
 execFileSync(process.execPath,['scripts/generate-world-assets.mjs']);
 const first=await Promise.all(outputs.map(p=>readFile(p,'utf8')));
 execFileSync(process.execPath,['scripts/generate-campaign-assets.mjs']);
 assert.deepEqual(await Promise.all(outputs.map(p=>readFile(p,'utf8'))),first);
 assert.deepEqual(await Promise.all(preserved.map(p=>readFile(p))),before);
 const covers=before.slice(-rendered.length);
 assert.equal(new Set(covers.map(b=>b.toString('base64'))).size,14);
 for(const b of covers){assert.equal(b.subarray(0,4).toString(),'RIFF');assert.equal(b.subarray(8,12).toString(),'WEBP');}
 for(const [id,title] of Object.entries(LEGACY_THEME_TITLES))assert.equal(createCampaign({theme:title}).theme,id);
 assert.throws(()=>createCampaign({theme:'unknown-world'}));
});

test('real legacy report validator accepts unchanged report schema',async()=>{
 const context={window:{}};vm.runInNewContext(await readFile('public/engine.js','utf8'),context);
 const game=context.window.SignalGame;
 const report={kind:'signal-station-result',version:game.VERSION,id:'legacy',team:'Old team',status:'completed',completed:5,elapsedMs:1000,penaltyMs:200,adjustedMs:1200,hints:[0,1,0,0,0],wrong:0};
 assert.equal(game.validReport(report),true);assert.equal(game.validReport({...report,adjustedMs:0}),false);
});

test('runtime queues simultaneous events, gesture gates audio, and drops hidden backlog',async()=>{
 let clock=0,serial=0,created=0,starts=0;const timers=new Map(),listeners={},classes=new Set(),storage=new Map();
 const schedule=(fn,delay,interval=false)=>{const id=++serial;timers.set(id,{fn,at:clock+delay,delay,interval});return id;};
 const tick=ms=>{const end=clock+ms;for(;;){const entry=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;const [id,t]=entry;clock=t.at;timers.delete(id);t.fn();if(t.interval&& !timers.has(id))timers.set(id,{...t,at:clock+t.delay});}clock=end;};
 const param={setValueAtTime(){},exponentialRampToValueAtTime(){}};
 class Audio{constructor(){created++;this.state='suspended';this.currentTime=0;}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}createGain(){return {gain:param,connect(){},disconnect(){}};}createOscillator(){return {frequency:param,connect(){},disconnect(){},start(){starts++;},stop(){}};}}
 const document={hidden:false,body:{classList:{toggle(k,v){v?classes.add(k):classes.delete(k);}}},getElementById(){return null;},addEventListener(k,fn){listeners[k]=fn;}};
 const context={window:{matchMedia:()=>({matches:true,addEventListener(){}}),dispatchEvent(){},AudioContext:Audio},document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},Event:class{},structuredClone,setTimeout:(fn,ms)=>schedule(fn,ms),clearTimeout:id=>timers.delete(id),setInterval:(fn,ms)=>schedule(fn,ms,true),clearInterval:id=>timers.delete(id),Date:class extends Date{static now(){return clock;}}};
 vm.runInNewContext(await readFile('public/campaign-data.js','utf8'),context);vm.runInNewContext(await readFile('public/feedback.js','utf8'),context);
 const feedback=context.window.SignalFeedback;assert.equal(created,0);assert.equal(feedback.settings().reducedMotion,true);
 feedback.update({master:true,meme:false,music:false});await feedback.enableAudio({isTrusted:false});assert.equal(created,0);await feedback.enableAudio({isTrusted:true});assert.equal(created,1);
 for(const category of ['dice','move','correct'])feedback.emit({category,id:category});assert.equal(starts,3);tick(1999);assert.equal(starts,3);tick(1);assert.equal(starts,6);tick(2000);assert.equal(starts,9);
 for(const category of ['dice','move','correct'])feedback.emit({category,id:category});tick(2000);assert.equal(starts,9);
 feedback.emit({category:'hint',id:'hidden-next'});feedback.emit({category:'reward',id:'pending'});document.hidden=true;listeners.visibilitychange();feedback.emit({category:'finish',id:'hidden'});tick(6000);const stopped=starts;document.hidden=false;listeners.visibilitychange();await Promise.resolve();tick(6000);assert.equal(starts,stopped);
 feedback.update({sfx:false,music:true});assert.equal(feedback.settings().master,true);tick(1000);assert(starts>stopped);const musicStarts=starts;
 feedback.update({master:false});assert.equal(feedback.settings().music,true);tick(1000);assert.equal(starts,musicStarts);
 feedback.update({reducedMotion:false,effects:false});assert(classes.has('reduced-motion'));
});
