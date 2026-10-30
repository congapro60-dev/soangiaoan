// Diagnose gửi câu hỏi ẩn danh trên phiên qY4: mở modal, điền, gửi, in kết quả + network
const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const hs = await puppeteer.connect({ browserWSEndpoint: (await (await fetch('http://127.0.0.1:9223/json/version')).json()).webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 180000 });
  const hp = await hs.newPage();
  await hp.setViewport({ width: 1100, height: 1400 });
  const cdp = await hp.target().createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const apiCalls = [];
  hp.on('response', async (res) => {
    if (res.url().includes('/api/classroom')) {
      let body = '';
      try { body = (await res.text()).slice(0, 200); } catch { body = '(không đọc được)'; }
      apiCalls.push(res.status() + ' ' + body);
    }
  });
  await hp.goto('https://giaoandewey.vercel.app/adaptive-live/qY4IedVQqTnNtX0HW8O4?mode=student&definitionKey=11-11-76&lessonId=adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2&classId=class-1787188523562&joinCode=R6RCFC', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await sleep(12000);
  for (let i = 0; i < 10; i++) { if (await hp.evaluate(() => Boolean(document.querySelector('select')))) break; await sleep(2500); }
  await hp.evaluate(() => {
    const sel = document.querySelector('select');
    const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(1200);
  await hp.evaluate(() => {
    const inp = document.querySelector('input[type="password"]');
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(1200);
  await hp.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Vào lớp' && !x.disabled); if (b) b.click(); });
  await sleep(10000);
  // mở modal hỏi
  const opened = await hp.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').indexOf('Đặt câu hỏi ẩn danh') >= 0);
    if (b) { b.click(); return true; }
    return false;
  });
  await sleep(1500);
  const modalInfo = await hp.evaluate(() => ({
    modal: Boolean(document.querySelector('.student-ask-modal')),
    input: Boolean(document.querySelector('.student-ask-input') || document.querySelector('#anon-question-input')),
    buttons: Array.from(document.querySelectorAll('.student-ask-modal button')).map((b) => (b.textContent || '').trim()),
  }));
  console.log('modal:', JSON.stringify(modalInfo));
  await hp.evaluate(() => {
    const ta = document.querySelector('.student-ask-input') || document.querySelector('#anon-question-input');
    const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    set.call(ta, 'Vì sao phải nội suy trung vị từ nhóm chứa n/2?');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(600);
  const clicked = await hp.evaluate(() => {
    const b = Array.from(document.querySelectorAll('.student-ask-modal button')).find((x) => (x.textContent || '').trim() === 'Gửi câu hỏi' && !x.disabled);
    if (b) { b.click(); return true; }
    return false;
  });
  await sleep(8000);
  const note = await hp.evaluate(() => (document.body.innerText || '').split('\n\n').join('\n').slice(0, 500));
  console.log('bấm Gửi:', clicked);
  console.log('API responses:', apiCalls.length ? apiCalls.join(' || ') : '(không gọi API)');
  console.log('HS NOTE:', note.replace(/\n/g, ' | '));
  await hp.close(); await hs.disconnect(); process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
