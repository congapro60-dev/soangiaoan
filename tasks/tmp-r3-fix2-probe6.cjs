// R3 fix2 probe bổ sung (cùng phiên nếu còn sống):
// (1) chặng 6 — chờ think window xong → bấm "Chọn nhiệm vụ này" → bắt route choice
// (2) chặng 11 — GV bấm "Hiện kết quả lớp" → bắt "Tiến độ gửi · 1 học sinh đã gửi" trên GV + TV
const puppeteer = require('puppeteer');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const S = JSON.parse(fs.readFileSync('tasks/tmp-r3-fix2-session.json', 'utf8'));
const OUT = 'tasks/tmp-r3-fix2-probe6-log.json';
const LOG = { gvOpen: null, join: null, route: null, progress: null };

async function dump(page) { return page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')); }
async function gvInfo(gv) {
  return gv.evaluate(() => {
    const t = document.body.innerText || '';
    return {
      stage: (t.match(/Chặng (\d+)\/12/) || [])[1] || null,
      plan: (t.match(/Kế hoạch[^\n]*/) || [])[0] || null,
      status: t.includes('ĐANG HỌC') ? 'running' : t.includes('TẠM DỪNG') ? 'paused' : t.includes('CHỜ VÀO TIẾT') ? 'waiting' : null,
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
async function gvClickRx(gv, rx) {
  return gv.evaluate((pattern) => {
    const re = new RegExp(pattern);
    const btn = Array.from(document.querySelectorAll('button')).find((b) => re.test((b.textContent || '').trim()) && !b.disabled);
    if (btn) { btn.click(); return (btn.textContent || '').trim(); }
    return null;
  }, rx);
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
  const { execSync } = require('child_process');
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

  const tv = await browser.newPage();
  await tv.setViewport({ width: 1280, height: 720 });
  await tv.goto(S.tv, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);

  const hs = await hsBrowser.newPage();
  await hs.setViewport({ width: 900, height: 800 });
  await hs.goto(S.student, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(6000);
  LOG.join = await hsJoinStable(hs);
  console.log('HS join:', LOG.join);
  if (LOG.join !== 'view-stable') throw new Error('HS join không ổn định');

  // ===== (1) Chặng 6 — route choice sau khi think window kết thúc =====
  const info6 = await navTo(gv, hs, 6);
  await sleep(2000);
  await thinkGone(hs, 45000);
  await sleep(1500);
  const hsT6 = await dump(hs);
  LOG.route = {
    info: info6,
    hsBand: (hsT6.match(/Chặng [\d–]+ phút/) || [null])[0],
    hasTuyen: hsT6.includes('Tuyến M/S/C'),
    buttons: await hs.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter((t) => t && t.length < 60).slice(0, 24)),
    excerpt: hsT6.slice(0, 1600),
  };
  console.log('Chặng 6 buttons:', JSON.stringify(LOG.route.buttons));
  const clicked = await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Chọn nhiệm vụ này' && b.offsetParent !== null && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  });
  await sleep(4000);
  LOG.route.clicked = clicked;
  LOG.route.after = (await dump(hs)).slice(0, 1200);
  try { await hs.screenshot({ path: 'tasks/tmp-r3-fix2-route-clicked.png', timeout: 20000 }); } catch (e) {}
  console.log('Route clicked:', clicked, '| excerpt sau bấm:', LOG.route.after.slice(0, 300).replace(/\n/g, ' · '));

  // ===== (2) Chặng 11 — Hiện kết quả lớp → Tiến độ gửi =====
  const info11 = await navTo(gv, hs, 11);
  await sleep(2500);
  const hsT11 = await dump(hs);
  let clickedHKL = null;
  for (let i = 0; i < 6; i++) {
    clickedHKL = await gvClickRx(gv, 'Hiện kết quả lớp');
    if (clickedHKL) break;
    await sleep(2000);
  }
  await sleep(5000);
  const gvT = await dump(gv);
  const tvT = await dump(tv);
  const pick = (t) => { const i = t.indexOf('Tiến độ gửi'); return i >= 0 ? t.slice(i, i + 120).replace(/\n/g, ' | ') : null; };
  LOG.progress = {
    info: info11,
    hsStatus: (hsT11.match(/Đã gửi[^\n]*|Đã xác nhận[^\n]*/g) || []).slice(0, 3),
    clickedHKL,
    gvTienDo: pick(gvT),
    tvTienDo: pick(tvT),
    gvHas1HS: /1\s*\n?\s*học sinh đã gửi/.test(gvT),
    tvHas1HS: /1\s*\n?\s*học sinh đã gửi/.test(tvT),
    tvHasStudentName: tvT.includes('Đặng Tuệ Minh'),
  };
  try { await gv.screenshot({ path: 'tasks/tmp-r3-fix2-progress-gv.png', timeout: 20000 }); } catch (e) {}
  try { await tv.screenshot({ path: 'tasks/tmp-r3-fix2-progress-tv.png', timeout: 20000 }); } catch (e) {}
  console.log('PROGRESS:', JSON.stringify({ clickedHKL, gvTienDo: LOG.progress.gvTienDo, tvTienDo: LOG.progress.tvTienDo, gvHas1HS: LOG.progress.gvHas1HS, tvHas1HS: LOG.progress.tvHas1HS }));

  fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: ' + OUT);
  await gv.close().catch(() => {});
  await tv.close().catch(() => {});
  await hs.close().catch(() => {});
  browser.disconnect();
  hsBrowser.disconnect();
})().catch((e) => {
  fs.writeFileSync(OUT.replace('.json', '-fail.json'), JSON.stringify({ LOG, error: e.message }, null, 1), 'utf8');
  console.error('FAIL:', e.message);
  process.exit(1);
});
