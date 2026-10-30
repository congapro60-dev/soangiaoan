// R2 B7-PA v3 — vào Bước 3, dump TOÀN BỘ giá trị textarea/input của editor mảnh kiến thức
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

  // Bấm Bước 3
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button, [role="button"], a'))
      .find((b) => /Bước 3/.test(b.textContent || ''));
    if (el) el.click();
  });
  await sleep(8000);

  // Dump tất cả textarea + input values kèm label gần nhất phía trên
  const fields = await page.evaluate(() => {
    const out = [];
    const els = Array.from(document.querySelectorAll('textarea, input[type="text"], input:not([type]), input[type="number"]'));
    for (const el of els) {
      if (el.offsetParent === null) continue; // chỉ lấy visible
      // tìm label: phần tử text gần nhất phía trên cùng cột
      let label = '';
      let node = el.closest('div');
      for (let up = 0; up < 6 && node; up++) {
        const prev = node.previousElementSibling;
        if (prev && (prev.innerText || '').trim()) { label = (prev.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 120); break; }
        node = node.parentElement;
      }
      out.push({ tag: el.tagName, label, value: (el.value || '').slice(0, 4000), len: (el.value || '').length });
    }
    return out;
  });
  console.log('Số field visible:', fields.length);
  const joined = fields.map((f) => (f.label ? '[' + f.label + '] ' : '') + f.value).join('\n---\n');

  const text = fields.map((f) => f.value).join('\n');
  const checks = {
    fieldCount: fields.length,
    totalChars: text.length,
    hasPHT1De: /\[0;1\)\s*có 5|5;\s*12;\s*15;\s*8/.test(text),
    has215: /2,15/.test(text),
    has224: /2,24/.test(text),
    has22: /2,2(?!\d)/.test(text),
    has587: /5,87/.test(text),
    tuTinh: /tự tính/i.test(text),
    nhanPHT1: /đáp án PHT số 1/i.test(text),
    nhanPHT2: /đáp án PHT số 2/i.test(text),
    internet158: /158/.test(text),
    internet395: /3,95/.test(text),
    y3_khongNhoHon: /không nhỏ hơn/.test(text),
    y3_152: /152/.test(text),
    y3_nhoNhatK: /nhỏ nhất của k|giá trị nhỏ nhất của k/.test(text),
    con_73k365: /73k\s*=\s*365/.test(text),
    k5: /k\s*=\s*5\b/.test(text),
    k_15227: /152,27/.test(text),
    casio: /Casio/i.test(text),
    luong24: /24 triệu/.test(text),
    phieu3: /10;\s*15;\s*20;\s*x|10,\s*15,\s*20,\s*x/.test(text),
  };
  // ngữ cảnh PA-β: quanh "đáp án PHT số 1"
  checks.pht1Contexts = [];
  const re = /đáp án PHT số 1/gi;
  let m;
  while ((m = re.exec(text)) && checks.pht1Contexts.length < 6) {
    checks.pht1Contexts.push(text.slice(Math.max(0, m.index - 220), m.index + 280).replace(/\n/g, ' | '));
  }
  // ngữ cảnh PA-d: quanh "không nhỏ hơn"
  const i2 = text.indexOf('không nhỏ hơn');
  checks.y3Context = i2 >= 0 ? text.slice(Math.max(0, i2 - 320), i2 + 520).replace(/\n/g, ' | ') : null;
  // ngữ cảnh 158
  const i3 = text.indexOf('158');
  checks.internetContext = i3 >= 0 ? text.slice(Math.max(0, i3 - 260), i3 + 320).replace(/\n/g, ' | ') : null;

  console.log('== CHECKS ==\n' + JSON.stringify(checks, null, 1));

  await page.screenshot({ path: 'tasks/tmp-r2-qa-b7-step5c.png' });
  fs.writeFileSync('tasks/tmp-r2-qa-b7-step5c.json', JSON.stringify({ savedAt: new Date().toISOString(), checks, fields, joined: joined.slice(0, 40000) }, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r2-qa-b7-step5c.json');
  await page.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
