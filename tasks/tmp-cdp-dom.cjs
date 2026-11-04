// Bấm "Tạo từ giáo án nguồn" → xem trang/modal sau khi mở + scan state lessonPlans.
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
      await evaluate(c, '1+1', 4000);
      cdp = c;
      break;
    } catch (e) { try { c && c.close(); } catch (_) {} }
  }
  if (!cdp) { console.log('NO_LIVE_LIB_TAB'); process.exit(3); }

  // 1) Bấm "Tạo từ giáo án nguồn"
  const clicked = await evaluate(cdp, '(function(){' + `
    const els = Array.from(document.querySelectorAll('button, a, [role="button"]'));
    const el = els.find((x) => (x.textContent || '').trim() === 'Tạo từ giáo án nguồn' && x.getBoundingClientRect().width > 0);
    if (!el) return { ok: false };
    el.click();
    return { ok: true };
  })()`, 20000);
  console.log('CLICK ' + JSON.stringify(clicked));
  await sleep(4000);

  // 2) Trang/modal sau khi bấm
  const after = await evaluate(cdp, '(function(){return {href: location.href, text: (document.body.innerText||"").replace(/\\s+/g," ").slice(0, 1200)}})()', 20000);
  console.log('AFTER ' + JSON.stringify(after));

  // 3) Scan state: tìm mảng object có title + content (giáo án nguồn) — depth 8, 30s poll
  const scan = await evaluate(cdp, '(async function(){' + `
    const sleep=(ms)=>new Promise((r)=>setTimeout(r,ms));
    for (let round=0; round<30; round++){
      const seenHooks=new WeakSet();
      let best=null;
      function check(v,depth){
        if(depth>8||!v||typeof v!=='object')return;
        if(Array.isArray(v)){
          if(v.length>0&&v[0]&&typeof v[0]==='object'&&typeof v[0].title==='string'&&typeof v[0].content==='string'){
            if(!best||v.length>best.length)best=v;
          }
          for(let i=0;i<Math.min(v.length,4);i++)check(v[i],depth+1);
          return;
        }
        for(const k of Object.keys(v)){ try{check(v[k],depth+1);}catch(e){} }
      }
      function scanFiber(f,visited){
        if(!f||visited.has(f))return; visited.add(f);
        let hook=f.memoizedState,hops=0;
        while(hook&&hops<100){ if(!seenHooks.has(hook)){seenHooks.add(hook); check(hook.memoizedState,0);} hook=hook.next;hops++; }
        scanFiber(f.child,visited); scanFiber(f.sibling,visited);
      }
      const rootEl=document.querySelector('#root')||document.querySelector('#__next')||document.body.firstElementChild;
      if(rootEl){
        const fk=Object.keys(rootEl).find((k)=>k.startsWith('__reactFiber$')||k.startsWith('__reactContainer$'));
        if(fk) scanFiber(rootEl[fk],new Set());
      }
      if(best&&best.length>0){
        return {found:true,len:best.length,titles:best.slice(0,80).map(function(p){return p.title})};
      }
      await sleep(1000);
    }
    return {found:false};
  })().catch(function(e){return {SCAN_ERROR:String(e&&e.message||e)}})`, 60000);
  console.log('SCAN ' + JSON.stringify(scan, null, 1).slice(0, 4000));
  cdp.close();
  await sleep(500);
  process.exit(0);
})().catch((e) => { console.error('FATAL ' + (e && e.stack || e)); process.exit(1); });
