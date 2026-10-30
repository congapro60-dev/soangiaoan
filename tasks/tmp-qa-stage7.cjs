// QA xoay tua — tiếp nối phiên wPXEqrWTZUe1bKe5GAGG (chống detached frame)
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const APP = 'https://giaoandewey.vercel.app';
const STUDENT_LINK = APP + '/adaptive-live/wPXEqrWTZUe1bKe5GAGG?mode=student&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC';
(async () => {
  const gv = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9222/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const hs = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });

  const hp = await hs.newPage();
  await hp.setViewport({ width: 1000, height: 900 });
  const gv2 = await gv.newPage();
  await gv2.setViewport({ width: 1440, height: 900 });

  const gvEval = async (fn, arg) => { try { return await gv2.evaluate(fn, arg); } catch (e) { console.log('[gv detached]', e.message); return null; } };
  const hsEval = async (fn) => { try { return await hp.evaluate(fn); } catch (e) { console.log('[hs detached]', e.message); return null; } };

  // GV mở tv-control (trang mới — không detach)
  await gv2.goto(STUDENT_LINK.replace('mode=student', 'mode=tv-control'), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  // HS join
  await hp.goto(STUDENT_LINK, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);
  for (let i = 0; i < 6; i++) {
    const hasForm = await hsEval(() => (document.body.innerText || '').includes('Vào tiết học trực tiếp') && Boolean(document.querySelector('select')));
    if (!hasForm) break;
    await hsEval(() => {
      const sel = document.querySelector('select');
      const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(700);
    await hsEval(() => {
      const inp = document.querySelector('input[placeholder="PIN"]');
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(500);
    await hsEval(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Vào lớp' && !x.disabled); if (b) b.click(); });
    await sleep(4000);
  }
  console.log('HS joined');
  const gvClick = async (label) => gvEval((l) => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === l && !x.disabled); if (b) { b.click(); return true; } return false; }, label);
  let ran = false;
  for (const lbl of ['Chạy', 'Bắt đầu tiết', 'Chạy tiết']) {
    for (let i = 0; i < 3; i++) { if (await gvClick(lbl)) { ran = true; break; } await sleep(2000); }
    if (ran) break;
  }
  console.log('GV nút chạy:', ran);
  await sleep(3000);
  console.log('status:', await gvEval(() => { const x = document.body.innerText || ''; return x.includes('CHỜ VÀO TIẾT') ? 'waiting' : x.includes('ĐANG HỌC') ? 'running' : x.includes('TẠM DỪNG') ? 'paused' : '?'; }));

  // Nav tới chặng nhóm — dừng khi HS thấy group picker
  let stopped = null;
  for (let target = 2; target <= 7; target++) {
    const cur = await gvEval(() => (document.body.innerText || '').match(/Chặng (\d+)\/12/)?.[1] || '1') || '1';
    if (Number(cur) < target) { await gvClick('Sau →'); await sleep(4500); } else if (Number(cur) > target) { await gvClick('← Trước'); await sleep(4500); }
    stopped = await gvEval(() => (document.body.innerText || '').match(/Chặng \d+\/12/)?.[0] || null);
    const t = await hsEval(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')) || '';
    const isGroup = /Nhóm đã phân công|Xác nhận nhóm/.test(t);
    console.log('Chặng', stopped, '| group picker:', isGroup ? '✓' : '—');
    if (isGroup) { await sleep(10000); const dump = await hsEval(() => (document.body.innerText || '').slice(0, 500)); console.log('HS @ nhóm:', (dump || '').replace(/\n/g, ' | ')); break; }
  }

  await sleep(12000);
  const hsDump = await hsEval(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n')) || '';
  console.log('HS TEXT (800):', hsDump.slice(0, 800).replace(/\n/g, ' | '));
  console.log('co select:', await hsEval(() => Boolean(document.querySelector('select'))));

  // HS chọn nhóm 3 + xác nhận
  const joined = await hsEval(() => {
    const sel = document.querySelector('select');
    if (!sel) return { ok: false };
    const opt = Array.from(sel.options).find((o) => o.value === '3');
    if (!opt) return { ok: false };
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, value: sel.value };
  });
  console.log('HS chọn nhóm 3:', JSON.stringify(joined));
  await sleep(2500);
  await hsEval(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => /Xác nhận nhóm/.test((x.textContent || '')) && !x.disabled); if (b) b.click(); });
  await sleep(3000);
  await hp.screenshot({ path: 'tasks/tmp-xoaytua-hs.png' }).catch(() => {});
  await hp.close(); await gv2.close();
  await gv.disconnect(); await hs.disconnect();
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
