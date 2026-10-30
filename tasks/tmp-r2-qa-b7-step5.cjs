// R2 B7-PA — mở builder bài 11-11-76, vào Bước 3 "Các mảnh kiến thức", mở rộng, dump spec (PA-β/PA-d/guide)
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
  await sleep(8000);

  // Bấm Bước 3 — Các mảnh kiến thức
  const clicked = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button, a, [role="button"], div, span'))
      .find((e) => /Các mảnh kiến thức/.test((e.textContent || '').trim()) && (e.textContent || '').trim().length < 40 && e.offsetParent !== null);
    if (el) { el.click(); return (el.textContent || '').trim(); }
    return null;
  });
  console.log('Clicked Bước 3:', clicked);
  await sleep(5000);

  // Mở rộng các mục gập (details/summary, accordion, nút "+")
  for (let round = 0; round < 6; round++) {
    const expanded = await page.evaluate(() => {
      let n = 0;
      for (const s of Array.from(document.querySelectorAll('summary'))) {
        const p = s.parentElement;
        if (p && !p.open) { s.click(); n++; }
      }
      for (const b of Array.from(document.querySelectorAll('button'))) {
        const t = (b.textContent || '').trim();
        if (/^(Xem|Chi tiết|Mở rộng|Hiện|Hiển thị)[\s…]*$/.test(t) && b.offsetParent !== null) { b.click(); n++; if (n > 12) break; }
      }
      return n;
    });
    await sleep(1500);
    if (!expanded) break;
    console.log('Round ' + round + ': mở rộng ' + expanded + ' mục');
  }

  const text = await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('textLen:', text.length);

  const checks = {
    textLen: text.length,
    hasPHT1De_5_12_15_8: /5;\s*1?2;\s*15;\s*8|5,\s*12,\s*15,\s*8|\[0;1\)\s*có 5/.test(text),
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
    phieu3_10_15_20_x: /10;\s*15;\s*20;\s*x|10,\s*15,\s*20,\s*x/.test(text),
  };

  // ngữ cảnh quanh mỗi "đáp án PHT số 1" — kiểm nhãn có dính số Internet 158/3,95 không (PA-β)
  checks.pht1Contexts = [];
  const re = /đáp án PHT số 1/gi;
  let m;
  while ((m = re.exec(text)) && checks.pht1Contexts.length < 6) {
    checks.pht1Contexts.push(text.slice(Math.max(0, m.index - 200), m.index + 260).replace(/\n/g, ' | '));
  }
  // ngữ cảnh quanh "không nhỏ hơn" (PA-d)
  const i2 = text.indexOf('không nhỏ hơn');
  checks.y3Context = i2 >= 0 ? text.slice(Math.max(0, i2 - 300), i2 + 500).replace(/\n/g, ' | ') : null;
  // ngữ cảnh quanh 158 (bảng Internet)
  const i3 = text.indexOf('158');
  checks.internetContext = i3 >= 0 ? text.slice(Math.max(0, i3 - 250), i3 + 300).replace(/\n/g, ' | ') : null;

  console.log('== CHECKS ==\n' + JSON.stringify(checks, null, 1));
  await page.screenshot({ path: 'tasks/tmp-r2-qa-b7-step5-buoc3.png', fullPage: false });

  fs.writeFileSync('tasks/tmp-r2-qa-b7-step5.json', JSON.stringify({ savedAt: new Date().toISOString(), checks, specText: text }, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r2-qa-b7-step5.json');
  await page.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
