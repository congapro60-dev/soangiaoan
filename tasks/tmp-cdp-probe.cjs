// Dò tab Thư viện MỚI: đăng nhập chưa + state React có mảng nào chứa giáo án không (depth sâu hơn).
const fs = require('fs');
const path = require('path');
const CDP_HTTP = 'http://127.0.0.1:9222';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let msgId = 0;
    const pending = new Map();
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        const { resolve: rs, reject: rj } = pending.get(m.id);
        pending.delete(m.id);
        if (m.error) rj(new Error('CDP ' + JSON.stringify(m.error).slice(0, 200)));
        else rs(m.result);
      }
    };
    ws.onopen = () => resolve({
      send: (method, params = {}) => new Promise((rs, rj) => {
        const id = ++msgId;
        pending.set(id, { resolve: rs, reject: rj });
        ws.send(JSON.stringify({ id, method, params }));
      }),
      close: () => { try { ws.close(); } catch (_) {} },
    });
    ws.onerror = () => reject(new Error('WS_ERROR'));
  });
}

async function evaluate(cdp, expr, timeoutMs = 30000) {
  let timer = null;
  const res = await Promise.race([
    cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true }),
    new Promise((_, rj) => { timer = setTimeout(() => rj(new Error('EVAL_TIMEOUT')), timeoutMs); }),
  ]).finally(() => clearTimeout(timer));
  if (res.exceptionDetails) throw new Error('EVAL_EXC ' + JSON.stringify(res.exceptionDetails).slice(0, 400));
  return res.result.value;
}

(async () => {
  const res = await fetch(CDP_HTTP + '/json');
  const targets = await res.json();
  const libTabs = targets.filter((t) => t.type === 'page' && (t.url || '').includes('giaoandewey.vercel.app/adaptive-lessons'));
  let cdp = null;
  for (const t of libTabs) {
    try {
      const c = await connect(t.webSocketDebuggerUrl);
      await evaluate(c, '1+1', 4000); // ping
      cdp = c;
      console.log('USE_TAB ' + t.id.slice(0, 12) + ' ' + (t.url || '').slice(0, 80));
      break;
    } catch (e) { try { c.close && c.close(); } catch (_) {} console.log('SKIP ' + t.id.slice(0, 12)); }
  }
  if (!cdp) { console.log('NO_LIVE_LIB_TAB'); process.exit(3); }

  const info = await evaluate(cdp, '(function(){return {href: location.href, ready: document.readyState, text: (document.body.innerText||"").replace(/\\s+/g," ").slice(0,600)}})()');
  console.log('INFO ' + JSON.stringify(info, null, 1));

  // Chờ tới 60s cho state xuất hiện (Firestore nạp chậm)
  const scan = await evaluate(cdp, '(async function(){' + `
    const sleep=(ms)=>new Promise((r)=>setTimeout(r,ms));
    let found=null;
    for (let i=0;i<60;i++){
      const seen=new WeakSet();
      const hits=[];
      function check(v,depth){
        if(depth>8||!v||typeof v!=='object')return;
        if(Array.isArray(v)){ if(v.length>0&&v[0]&&typeof v[0]==='object'&&('title' in v[0]||'lessonPlans' in v)) hits.push({depth,len:v.length,keys:Object.keys(v[0]).slice(0,25),firstTitle:v[0]&&v[0].title}); for(let i=0;i<Math.min(v.length,4);i++)check(v[i],depth+1); return;}
        for(const k of Object.keys(v)){ try{check(v[k],depth+1);}catch(e){} }
      }
      function scanFiber(f,visited){
        if(!f||visited.has(f))return; visited.add(f);
        let hook=f.memoizedState,hops=0;
        while(hook&&hops<100){ if(!seenHooksG.has(hook)){seenHooksG.add(hook); check(hook.memoizedState,0);} hook=hook.next;hops++; }
        scanFiber(f.child,visited); scanFiber(f.sibling,visited);
      }
      const seenHooksG=new WeakSet();
      const rootEl=document.querySelector('#root')||document.querySelector('#__next')||document.body.firstElementChild;
      if(rootEl){
        const fk=Object.keys(rootEl).find((k)=>k.startsWith('__reactFiber$')||k.startsWith('__reactContainer$'));
        if(fk) scanFiber(rootEl[fk],new Set());
      }
      if(hits.length){ found=hits; break; }
      await sleep(1000);
    }
    return found;
  })().catch(function(e){return {SCAN_ERROR:String(e && e.message || e)}})`, 90000);
  console.log('SCAN ' + JSON.stringify(scan, null, 1).slice(0, 3000));
  cdp.close();
  process.exit(0);
})().catch((e) => { console.error('FATAL ' + (e && e.stack || e)); process.exit(1); });
