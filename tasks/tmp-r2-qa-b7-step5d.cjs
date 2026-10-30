// R2 B7-PA v4 — Bước 3: dump TOÀN BỘ fields (visible + hidden), giá trị đầy đủ, lưu JSON TRƯỚC screenshot
const puppeteer = require('puppeteer');
const fs = require('fs');

const DETAIL_URL = 'https://giaoandewey.vercel.app/adaptive-builder/adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(DETAIL_URL, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(9000);

  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button, [role="button"], a')).find((b) => /Bước 3/.test(b.textContent || ''));
    if (el) el.click();
  });
  await sleep(8000);

  const fields = await page.evaluate(() => {
    const out = [];
    const els = Array.from(document.querySelectorAll('textarea, input[type="text"], input:not([type]), input[type="number"]'));
    for (const el of els) {
      let label = '';
      let node = el.closest('div');
      for (let up = 0; up < 6 && node; up++) {
        const prev = node.previousElementSibling;
        if (prev && (prev.innerText || '').trim()) { label = (prev.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 120); break; }
        node = node.parentElement;
      }
      out.push({ tag: el.tagName, visible: el.offsetParent !== null, label, value: el.value || '' });
    }
    return out;
  });

  const allVals = fields.map((f) => f.value).join('\n');
  const visVals = fields.filter((f) => f.visible).map((f) => f.value).join('\n');
  const checks = {
    fieldCount: fields.length,
    visibleCount: fields.filter((f) => f.visible).length,
    totalChars: allVals.length,
    has215: /2,15/.test(allVals),
    has224: /2,24/.test(allVals),
    has22: /2,2(?!\d)/.test(allVals),
    has587: /5,87/.test(allVals),
    tuTinh: /tự tính/i.test(allVals),
    nhanPHT1: /đáp án PHT số 1/i.test(allVals),
    nhanPHT2: /đáp án PHT số 2/i.test(allVals),
    internet158: /158/.test(allVals),
    internet395: /3,95/.test(allVals),
    y3_khongNhoHon: /không nhỏ hơn/.test(allVals),
    y3_152: /152/.test(allVals),
    y3_nhoNhatK: /nhỏ nhất của k|giá trị nhỏ nhất của k/.test(allVals),
    con_73k365: /73k\s*=\s*365/.test(allVals),
    k5: /k\s*=\s*5\b/.test(allVals),
    k_15227: /152,27/.test(allVals),
    casio: /Casio/i.test(allVals),
    luong24: /24 triệu/.test(allVals),
    phieu3: /10;\s*15;\s*20;\s*x|10,\s*15,\s*20,\s*x/.test(allVals),
  };
  const findCtx = (re, src, n = 4, pre = 200, post = 300) => {
    const ctx = [];
    let m;
    const r = new RegExp(re, 'gi');
    while ((m = r.exec(src)) && ctx.length < n) {
      ctx.push({ at: m.index, text: src.slice(Math.max(0, m.index - pre), m.index + post).replace(/\n/g, ' | ') });
    }
    return ctx;
  };
  checks.ctx_215 = findCtx('2,15', allVals);
  checks.ctx_22 = findCtx('2,2(?!\\d)', allVals);
  checks.ctx_tuTinh = findCtx('tự tính', allVals);
  checks.ctx_587 = findCtx('5,87', allVals, 2);
  checks.ctx_nhanPHT1 = findCtx('đáp án PHT', allVals);
  checks.ctx_khongNhoHon = findCtx('không nhỏ hơn', allVals, 2, 300, 500);
  checks.ctx_152 = findCtx('152', allVals, 3);
  // field lengths để biết có bị cắt không
  checks.fieldLens = fields.map((f) => ({ label: f.label, visible: f.visible, len: f.value.length }));

  fs.writeFileSync('tasks/tmp-r2-qa-b7-step5d.json', JSON.stringify({ savedAt: new Date().toISOString(), checks, fields }, null, 1), 'utf8');
  console.log('== CHECKS ==\n' + JSON.stringify({ ...checks, ctx_215: checks.ctx_215.length, ctx_22: checks.ctx_22.length, ctx_tuTinh: checks.ctx_tuTinh.length, ctx_khongNhoHon: checks.ctx_khongNhoHon.length, ctx_152: checks.ctx_152.length }, null, 1));
  console.log('SAVED: tasks/tmp-r2-qa-b7-step5d.json');
  try { await page.screenshot({ path: 'tasks/tmp-r2-qa-b7-step5d.png', timeout: 20000 }); } catch (e) { console.log('screenshot skip:', e.message.slice(0, 80)); }
  await page.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
