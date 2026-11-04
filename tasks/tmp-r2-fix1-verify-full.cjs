// R2 fix1 — dump ĐẦY ĐỦ builder bài 11-11-76 (bài MỚI sau republish): Bước 2→3→4, mở hết summary + nút thêm,
// lấy TẤT CẢ input/textarea values; chốt PA-β / PA-d (73k=365 vắng, đích mới 152,27) / Casio ẨN / ký hiệu cᵢ/Mₑ
const puppeteer = require('puppeteer');
const fs = require('fs');

const DETAIL_URL = 'https://giaoandewey.vercel.app/adaptive-builder/adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 120000 });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(DETAIL_URL, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(8000);

  const expandAll = () => page.evaluate(() => {
    let n = 0;
    for (const s of Array.from(document.querySelectorAll('summary'))) {
      const p = s.parentElement;
      if (p && !p.open) { s.click(); n++; }
    }
    for (const b of Array.from(document.querySelectorAll('button'))) {
      const t = (b.textContent || '').trim();
      if (/^(Xem|Chi tiết|Mở rộng|Hiện|Hiển thị|Thêm câu hỏi)[\s…]*$/.test(t) && b.offsetParent !== null) { b.click(); n++; if (n > 30) break; }
    }
    return n;
  });

  let allText = '';
  const fieldsAll = [];
  for (const step of ['Mục tiêu & Chẩn đoán', 'Các mảnh kiến thức', 'Hoàn tất & Xuất bản']) {
    await page.evaluate((label) => {
      const el = Array.from(document.querySelectorAll('button, a, [role="button"], div, span'))
        .find((e) => (e.textContent || '').trim().includes(label) && (e.textContent || '').trim().length < 40 && e.offsetParent !== null);
      if (el) el.click();
    }, step);
    await sleep(4000);
    for (let round = 0; round < 8; round++) {
      const expanded = await expandAll();
      await sleep(1000);
      if (!expanded) break;
    }
    const fields = await page.evaluate(() => Array.from(document.querySelectorAll('input, textarea')).map((el) => ({
      tag: el.tagName, visible: el.offsetParent !== null,
      label: (el.labels && el.labels[0] ? el.labels[0].textContent : (el.closest('label') ? el.closest('label').textContent : '') || '').trim().slice(0, 60),
      value: (el.value || '').slice(0, 1200),
    })));
    fieldsAll.push({ step, fields });
    allText += '\n=== ' + step + ' ===\n' + fields.map((f) => f.value).join('\n') + '\n' + await page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  }

  const ciNew = '\u1D62', meNew = '\u2091';
  const checks = {
    // PA-β
    tuTinh: /tự tính/i.test(allText),
    has215: /2,15/.test(allText),
    has224: /2,24/.test(allText),
    has587: /5,87/.test(allText),
    internet395: /3,95/.test(allText),
    internet158: /158/.test(allText),
    // PA-d
    con_73k365: /73k\s*=\s*365/.test(allText),
    dich_moi_152: /152/.test(allText),
    dich_moi_nhoNhatK: /nhỏ nhất của k|nhỏ nhất của k\b/i.test(allText),
    k_15227: /152,27/.test(allText),
    k5: /k\s*=\s*5\b/.test(allText),
    // Casio
    casio: /Casio/i.test(allText),
    // Ký hiệu
    dem_cSub: (allText.match(new RegExp('c' + ciNew, 'g')) || []).length,
    dem_meSub: (allText.match(new RegExp('M' + meNew, 'g')) || []).length,
    con_cUnderscore: /c_i/.test(allText),
    con_MeUnderscore: /M_e/.test(allText),
    fieldCount: fieldsAll.reduce((s, g) => s + g.fields.length, 0),
  };
  console.log('== CHECKS ==\n' + JSON.stringify(checks, null, 1));

  // Ngữ cảnh PA-d: mọi dòng/chỗ chứa 152 hoặc k
  const ctx = allText.split('\n').filter((l) => /152|nhỏ nhất|73k|k\s*=\s*\d/.test(l)).slice(0, 20);
  console.log('== CTX PA-d ==\n' + (ctx.join('\n---\n') || '(không)'));
  const ctxCasio = allText.split('\n').filter((l) => /Casio/i.test(l)).slice(0, 6);
  console.log('== CTX CASIO ==\n' + (ctxCasio.join('\n') || '(không)'));

  await page.screenshot({ path: 'tasks/tmp-r2-fix1-verify-full.png' });
  fs.writeFileSync('tasks/tmp-r2-fix1-verify-full.json', JSON.stringify({ savedAt: new Date().toISOString(), checks, ctx, ctxCasio, fieldsAll }, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r2-fix1-verify-full.json');
  await page.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
