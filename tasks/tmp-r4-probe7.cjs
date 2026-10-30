// R3 fix2 probe 2 — chỉ route choice chặng 6 (selector .includes như exit2 đã chứng minh)
const puppeteer = require('puppeteer');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { execSync } = require('child_process');

const S = JSON.parse(fs.readFileSync('tasks/tmp-r4-qa-session.json', 'utf8'));
const OUT = 'tasks/tmp-r4-probe7-log.json';
const LOG = { gvOpen: null, join: null, route: null };

async function dump(page) { return page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')); }
async function gvInfo(gv) {
  return gv.evaluate(() => {
    const t = document.body.innerText || '';
    return {
      stage: (t.match(/Chặng (\d+)\/12/) || [])[1] || null,
      plan: (t.match(/Kế hoạch[^\n]*/) || [])[0] || null,
      expired: t.includes('đã hết hạn'),
    };
  });
}
async function gvClick(gv, label) {
  return gv.evaluate((l) => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === l && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  }, label);
}
async function thinkGone(hs, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < (timeoutMs || 45000)) {
    const has = await hs.evaluate(() => Array.from(document.querySelectorAll('button')).some((b) => /^Chờ \d+s$/.test((b.textContent || '').trim())));
    if (!has) return true;
    await sleep(1200);
  }
  return false;
}
async function navTo(gv, hs, target) {
  let info = await gvInfo(gv);
  let guard = 0;
  while (info.stage !== String(target) && guard < 16 && !info.expired) {
    const cur = Number(info.stage || 1);
    await gvClick(gv, cur < target ? 'Sau →' : '← Trước');
    await sleep(1800);
    await thinkGone(hs, 15000);
    await sleep(700);
    info = await gvInfo(gv);
    guard++;
  }
  await sleep(1500);
  return info;
}
async function hsState(hs) {
  return hs.evaluate(() => {
    const t = document.body.innerText || '';
    return {
      hasForm: t.includes('Vào tiết học trực tiếp') && Boolean(document.querySelector('select')),
      view: !t.includes('Vào tiết học trực tiếp') && t.includes('HỌC SINH'),
    };
  });
}
async function hsJoinStable(hs) {
  for (let round = 0; round < 6; round++) {
    for (let i = 0; i < 10; i++) {
      const st = await hsState(hs);
      if (!st.hasForm) break;
      await hs.evaluate(() => {
        const sel = document.querySelector('select');
        const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await sleep(800);
      await hs.evaluate(() => {
        const inp = document.querySelector('input[placeholder="PIN"]');
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await sleep(600);
      await hs.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Vào lớp' && !b.disabled);
        if (btn) btn.click();
      });
      await sleep(4000);
    }
    let stable = true;
    for (let i = 0; i < 3; i++) {
      await sleep(2000);
      const st = await hsState(hs);
      if (st.hasForm || !st.view) { stable = false; break; }
    }
    if (stable) return 'view-stable';
  }
  return 'lost';
}

(async () => {
  let hsBrowser = null;
  try {
    const v = await (await fetch('http://127.0.0.1:9223/json/version')).json();
    hsBrowser = await puppeteer.connect({ browserWSEndpoint: v.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  } catch (e) {
    execSync('Start-Process "msedge.exe" -ArgumentList "--remote-debugging-port=9223","--user-data-dir=C:\\\\Users\\\\ADMIN\\\\AppData\\\\Local\\\\Temp\\\\opencode\\\\edge-hs-profile","--no-first-run","--window-size=1000,900"', { shell: 'powershell.exe' });
    await sleep(7000);
    const v = await (await fetch('http://127.0.0.1:9223/json/version')).json();
    hsBrowser = await puppeteer.connect({ browserWSEndpoint: v.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  }
  const ver = await (await fetch('http://127.0.0.1:9222/json/version')).json();
  const browser = await puppeteer.connect({ browserWSEndpoint: ver.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });

  const gv = await browser.newPage();
  await gv.setViewport({ width: 1440, height: 900 });
  await gv.goto(S.tvControl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(9000);
  LOG.gvOpen = await gvInfo(gv);
  console.log('GV mở:', JSON.stringify(LOG.gvOpen));
  if (LOG.gvOpen.expired) { console.log('EXPIRED-NEED-NEW-SESSION'); process.exit(2); }

  const hs = await hsBrowser.newPage();
  await hs.setViewport({ width: 900, height: 800 });
  await hs.goto(S.student, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  LOG.join = await hsJoinStable(hs);
  console.log('HS join:', LOG.join);
  if (LOG.join !== 'view-stable') throw new Error('HS join không ổn định');

  const info6 = await navTo(gv, hs, 6);
  await sleep(2000);
  await thinkGone(hs, 45000);
  await sleep(1500);
  const clickedTask = await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Chọn nhiệm vụ này') && b.offsetParent !== null && !b.disabled);
    if (btn) { btn.click(); return (btn.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160); }
    return null;
  });
  await sleep(4000);
  const afterTask = await dump(hs);
  LOG.route = {
    info: info6,
    clicked: clickedTask,
    taskAppeared: /nhiệm vụ|lời giải|bước/i.test(afterTask),
    after: afterTask.slice(0, 1400),
  };
  try { await hs.screenshot({ path: 'tasks/tmp-r4-route-clicked.png', timeout: 20000 }); } catch (e) {}
  console.log('clickedTask:', clickedTask ? String(clickedTask).slice(0, 120) : 'null', '| taskAppeared:', LOG.route.taskAppeared);

  fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: ' + OUT);
  await gv.close().catch(() => {});
  await hs.close().catch(() => {});
  browser.disconnect();
  hsBrowser.disconnect();
})().catch((e) => {
  fs.writeFileSync(OUT.replace('.json', '-fail.json'), JSON.stringify({ LOG, error: e.message }, null, 1), 'utf8');
  console.error('FAIL:', e.message);
  process.exit(1);
});
