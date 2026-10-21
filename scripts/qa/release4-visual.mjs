// Actual world-card UI + two 2D maps. API calls intercepted; no classroom writes.
import {spawn} from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const base=process.argv[2]||'http://127.0.0.1:5173';const out='tasks/qa-release4';fs.mkdirSync(out,{recursive:true});
const production=new URL(base).hostname!=='127.0.0.1';assert.ok(['127.0.0.1','mat-ma-da-gioi.cuong-vuviet.chatgpt.site'].includes(new URL(base).hostname));
const port=9840+Math.floor(Math.random()*90);const proc=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(),'release4-qa-'))}`,'--no-first-run','about:blank'],{stdio:'ignore',windowsHide:true});
const pause=ms=>new Promise(r=>setTimeout(r,ms));let socket;const report={environment:base,writes:0,cards:[],maps:[],screenshots:[]};
try{
 let page;for(let i=0;i<60&&!page;i++){try{page=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page')}catch{}if(!page)await pause(200)}assert.ok(page);
 socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.addEventListener('open',r);socket.addEventListener('error',j)});let seq=0;const pending=new Map(),errors=[];
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;const timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timeout'))},20000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v)},reject:e=>{clearTimeout(timer);reject(e)}});socket.send(JSON.stringify({id,method,params}))});
 socket.addEventListener('message',async event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){const t=pending.get(m.id);pending.delete(m.id);m.error?t.reject(Error(m.error.message)):t.resolve(m.result)}
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
  if(m.method==='Fetch.requestPaused'){const r=m.params;const url=new URL(r.request.url);const body=url.pathname==='/api/hosts'?{user:{userId:'qa-worlds',email:'qa@example.invalid',displayName:'QA'},configured:true,isRoot:true,systemRole:'owner',revoked:false}:{rooms:[]};await send('Fetch.fulfillRequest',{requestId:r.requestId,responseCode:r.request.method==='GET'?200:409,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify(body)).toString('base64')})}
 });
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value};
 const wait=async(expression,label)=>{for(let i=0;i<150;i++){if(await evaluate(expression).catch(()=>false))return;await pause(200)}throw Error('Timeout '+label)};
 const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(`${out}/${name}.png`,Buffer.from(r.data,'base64'));report.screenshots.push(name)};
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
 await send('Fetch.enable',{patterns:[{urlPattern:base+'/api/*'}]});
 for(const width of [375,1280]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
  await send('Page.navigate',{url:base+'/?view=teacher'});await wait("document.querySelectorAll('.theme-card').length===12",'12worldcards');
  const images=await evaluate("[...document.querySelectorAll('.theme-card img')].map(e=>e.src)");assert.equal(new Set(images).size,11); // historical/pastoral intentionally share the strategy-valley cover.
  for(let i=0;i<12;i++){
   await evaluate(`document.querySelectorAll('.theme-card')[${i}].scrollIntoView({block:'center'})`);
   await wait(`document.querySelectorAll('.theme-card img')[${i}].complete&&document.querySelectorAll('.theme-card img')[${i}].naturalWidth>0`,'worldimage'+i);
   const card=await evaluate(`(()=>{const e=document.querySelectorAll('.theme-card')[${i}],im=e.querySelector('img'),r=e.getBoundingClientRect();return{world:e.querySelector('input').value,text:e.innerText,src:im.src,natural:[im.naturalWidth,im.naturalHeight],left:r.left,right:r.right}})()`);
   assert.ok(card.left>=-1&&card.right<=width+1,JSON.stringify(card));report.cards.push({width,...card});
   await shot(`${production?'production-':''}card-${card.world}-${width}`);
  }
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  for(const world of ['survival','cube']){
   await send('Page.navigate',{url:base+`/lesson-map.html?demo=8&world=${world}&show=all`});
   await wait("!!document.querySelector('[data-action=map-menu]')",'mapready');
   await evaluate("document.querySelector('[data-action=map-menu]').click();document.querySelector('[data-mode=\"2d\"]').click()");
   await wait("!document.querySelector('#pilot3d')",'map2D');
   await evaluate("document.querySelector('[data-action=map-menu]').click()");await pause(600);
   const map=await evaluate("(()=>{const bg=document.querySelector('.strategy-backdrop,.strategy-background,.terrain-image');const im=[...document.querySelectorAll('img')].find(i=>i.src.includes('world-'));return {world:"+JSON.stringify(world)+",background:bg?.style.backgroundImage||bg?.style.background||null,image:im?.src||null,canvasCount:document.querySelectorAll('canvas').length,overflow:document.documentElement.scrollWidth>innerWidth}})()");
   assert.equal(map.overflow,false);report.maps.push({width,...map});await shot(`${production?'production-':''}map-${world}-${width}`);
  }
 }
 assert.equal(errors.length,0,errors.join('\n'));fs.writeFileSync(`${out}/${production?'production-':''}visual-report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({cards:report.cards.length,maps:report.maps.length,screenshots:report.screenshots.length,errors}));
}finally{socket?.close();proc.kill()}
