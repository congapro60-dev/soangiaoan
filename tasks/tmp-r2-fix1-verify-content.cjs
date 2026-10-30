// R2 fix1 — xác minh nội dung bài 11-11-76 trên Production: MỚI (cᵢ U+1D62 / Mₑ U+2091) hay CŨ (c_i / M_e)
const puppeteer = require('puppeteer');
const fs = require('fs');

const DETAIL_URL = process.argv[2] || 'https://giaoandewey.vercel.app/adaptive-builder/adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(DETAIL_URL, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(8000);

  const dump = () => page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));

  // Duyệt lần lượt Bước 2 → 3 → 4, mở rộng accordion, gom text
  let allText = '';
  for (const step of ['Mục tiêu & Chẩn đoán', 'Các mảnh kiến thức', 'Hoàn tất & Xuất bản']) {
    const clicked = await page.evaluate((label) => {
      const el = Array.from(document.querySelectorAll('button, a, [role="button"], div, span'))
        .find((e) => (e.textContent || '').trim().includes(label) && (e.textContent || '').trim().length < 40 && e.offsetParent !== null);
      if (el) { el.click(); return (el.textContent || '').trim(); }
      return null;
    }, step);
    console.log('Clicked bước:', clicked);
    await sleep(4000);
    for (let round = 0; round < 5; round++) {
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
      await sleep(1200);
      if (!expanded) break;
    }
    allText += '\n=== ' + step + ' ===\n' + (await dump());
  }

  const ciNew = '\u1D62'; // ᵢ
  const meNew = '\u2091'; // ₑ
  const checks = {
    // Ký hiệu MỚI (Unicode subscript)
    focus_moi_cSub: allText.includes('đại diện c' + ciNew + ' và tần số tích lũy'),
    dem_cSub: (allText.match(new RegExp('c' + ciNew, 'g')) || []).length,
    dem_meSub: (allText.match(new RegExp('M' + meNew, 'g')) || []).length,
    dem_apSub: (allText.match(new RegExp('a\\u209A', 'g')) || []).length,
    // Ký hiệu CŨ (underscore, ngoài LaTeX)
    con_cUnderscore: /c_i/.test(allText),
    con_MeUnderscore: /M_e/.test(allText),
    // PA-β / PA-d vẫn đúng (nội dung R2)
    has215: /2,15/.test(allText),
    tuTinh: /tự tính/i.test(allText),
    internet395: /3,95/.test(allText),
    y3_nhoNhatK: /nhỏ nhất của k/.test(allText),
    con_73k365: /73k\s*=\s*365/.test(allText),
    k5_15227: /k\s*=\s*5\b/.test(allText) && /152,27/.test(allText),
    casio: /Casio/i.test(allText),
  };
  console.log('== CHECKS ==\n' + JSON.stringify(checks, null, 1));

  // Dòng ngữ cảnh chứa c_i / cᵢ để đối chiếu (c_i trong LaTeX là hợp lệ)
  const ctx = allText.split('\n').filter(l => /c_i|c\u1D62/.test(l)).slice(0, 25);
  console.log('== DÒNG CHỨA c_i/cᵢ ==\n' + (ctx.join('\n') || '(không)'));

  await page.screenshot({ path: 'tasks/tmp-r2-fix1-verify-content.png', fullPage: false });
  fs.writeFileSync('tasks/tmp-r2-fix1-verify-content.json', JSON.stringify({ savedAt: new Date().toISOString(), checks, ctx, allText }, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r2-fix1-verify-content.json + .png');
  await page.close();
  browser.disconnect();
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
