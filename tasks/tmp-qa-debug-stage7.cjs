// Debug: tạo phiên, GV tới chặng nhóm, HS login, dump nút/textarea để biết nút gửi thật.
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
const CLASS_ID = 'class-1787188523562';

(async () => {
  const gv = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 240000 });
  const hs = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 240000 });

  const gvp = await gv.newPage();
  await gvp.setViewport({ width: 1440, height: 900 });
  await gvp.goto(APP + '/adaptive-lessons', { waitUntil: 'domcontentloaded', timeout: 90000 });
  for (let i = 0; i < 25; i++) { if (await gvp.evaluate(() => (document.body.innerText || '').includes('KHO BÀI HỌC'))) break; await sleep(2000); }
  await gvp.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => (t.textContent || '').replace(/\s+/g, ' ').includes('Bài học tương tác'));
    if (tab) tab.click();
  });
  await sleep(5000);
  for (let i = 0; i < 12; i++) {
    const ok = await gvp.evaluate(() => {
      const tr = Array.from(document.querySelectorAll('table tbody tr')).find((r) => (r.innerText || '').includes('Các số đặc trưng đo xu thế trung tâm — Tiết 2') && (r.innerText || '').includes('Lớp 11'));
      if (!tr) return false;
      const btn = Array.from(tr.querySelectorAll('button, a')).find((b) => (b.textContent || '').trim() === 'Mở tiết trực tiếp');
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (ok) break;
    await sleep(2000);
  }
  await sleep(3000);
  for (let i = 0; i < 15; i++) {
    const ok = await gvp.evaluate((cid) => {
      const sel = document.querySelector('[role="dialog"] select');
      if (!sel) return false;
      const opt = Array.from(sel.options).find((o) => o.value === cid);
      if (!opt) return false;
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, CLASS_ID);
    if (ok) break;
    await sleep(2000);
  }
  await sleep(1200);
  for (let i = 0; i < 12; i++) {
    const ok = await gvp.evaluate(() => {
      const b = Array.from(document.querySelectorAll('[role="dialog"] button')).find((x) => (x.textContent || '').includes('Tạo phiên tiết trực tiếp') && !x.disabled);
      if (b) { b.click(); return true; }
      return false;
    });
    if (ok) break;
    await sleep(2000);
  }
  let sessionId = null, studentLink = null;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const found = await gvp.evaluate(() => {
      const a = Array.from(document.querySelectorAll('[role="dialog"] a[href*="/adaptive-live/"]')).find((x) => x.href.indexOf('mode=student') >= 0);
      const m = (document.body.innerText || '').match(/Đã tạo phiên chung:\s*(\S+)/);
      return { link: a ? a.href : null, id: m ? m[1] : null };
    });
    if (found.id && found.link) { sessionId = found.id; studentLink = found.link; break; }
  }
  console.log('SESSION:', sessionId);
  await gvp.close();

  const gv2 = await gv.newPage();
  await gv2.setViewport({ width: 1440, height: 900 });
  await gv2.goto(studentLink.replace('mode=student', 'mode=tv-control'), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(9000);
  const gvClick = async (label) => { try { return await gv2.evaluate((l) => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === l && !x.disabled); if (b) { b.click(); return true; } return false; }, label); } catch (e) { return false; } };
  for (let i = 0; i < 6; i++) { if (await gvClick('Chạy')) break; await sleep(2500); }
  await sleep(4000);
  for (let target = 2; target <= 7; target++) {
    const cur = await gv2.evaluate(() => { const m = (document.body.innerText || '').match(/Chặng (\d+)\/12/); return m ? Number(m[1]) : 1; });
    if (cur < target) { await gvClick('Sau →'); await sleep(4000); }
    else if (cur > target) { await gvClick('← Trước'); await sleep(4000); }
  }
  const gvButtons = await gv2.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => ({ t: (b.textContent || '').trim().slice(0, 40), pressed: b.getAttribute('aria-pressed') })).filter((x) => x.t));
  console.log('GV BUTTONS:', JSON.stringify(gvButtons));
  const statsNow = await gv2.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => /kết quả lớp/.test(x.textContent || ''));
    return b ? (b.textContent || '').trim() : 'không thấy nút';
  });
  console.log('Nút kết quả lớp:', statsNow);

  // bật stats
  await gv2.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Hiện kết quả lớp' && !x.disabled); if (b) b.click(); });
  await sleep(4000);
  console.log('sau khi bật:', await gv2.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /kết quả lớp/.test(x.textContent || '')); return b ? (b.textContent || '').trim() : '?'; }));
  await sleep(6000);

  // HS
  const hp = await hs.newPage();
  await hp.setViewport({ width: 1100, height: 900 });
  const hsEval = async (fn, arg) => { try { return await hp.evaluate(fn, arg); } catch (e) { return null; } };
  await hp.goto(studentLink, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(9000);
  for (let round = 0; round < 8; round++) {
    const hasForm = await hsEval(() => (document.body.innerText || '').indexOf('Vào tiết học trực tiếp') >= 0 && Boolean(document.querySelector('select')));
    if (!hasForm) break;
    await hsEval((name) => {
      const sel = document.querySelector('select');
      const opt = Array.from(sel.options).find((o) => o.textContent.trim() === name);
      if (!opt) return false;
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, 'Đặng Tuệ Minh');
    await sleep(700);
    await hsEval((pin) => {
      const inp = Array.from(document.querySelectorAll('input')).find((e) => (e.placeholder || '').toUpperCase().indexOf('PIN') >= 0);
      if (!inp) return false;
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, pin);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }, '2750');
    await sleep(600);
    await hsEval(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Vào lớp' && !x.disabled); if (b) b.click(); });
    await sleep(6000);
  }
  await sleep(8000);
  const hsButtons = await hsEval(() => Array.from(document.querySelectorAll('button')).map((b) => ({ t: (b.textContent || '').trim().slice(0, 40), dis: b.disabled })).filter((x) => x.t));
  console.log('HS BUTTONS:', JSON.stringify(hsButtons));
  const areas = await hsEval(() => Array.from(document.querySelectorAll('textarea')).map((a) => ({ aria: a.getAttribute('aria-label'), vis: a.offsetParent !== null, len: a.value.length })));
  console.log('HS TEXTAREAS:', JSON.stringify(areas));
  const txt = (await hsEval(() => (document.body.innerText || '').split('\n\n').join('\n'))) || '';
  console.log('HS TEXT:', txt.slice(0, 1200).replace(/\n/g, ' | '));

  await hp.close(); await gv2.close();
  await gv.disconnect(); await hs.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
