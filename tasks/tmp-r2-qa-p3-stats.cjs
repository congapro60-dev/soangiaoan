// R2 part3d — bật "Hiện kết quả lớp" trên GV phiên 2 → bắt "Tiến độ gửi · N học sinh đã gửi" trên GV + TV
const puppeteer = require('puppeteer');
const fs = require('fs');

const S2 = JSON.parse(fs.readFileSync('tasks/tmp-r2-qa-session2.json', 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null, protocolTimeout: 300000 });

  const gv = await browser.newPage();
  await gv.setViewport({ width: 1440, height: 900 });
  await gv.goto(S2.tvControl, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(9000);

  const tv = await browser.newPage();
  await tv.setViewport({ width: 1280, height: 720 });
  await tv.goto(S2.tvControl.replace('mode=tv-control', 'mode=tv'), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(8000);

  const clicked = await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /Hiện kết quả lớp/.test((b.textContent || '').trim()) && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  });
  console.log('Bấm Hiện kết quả lớp:', clicked);
  await sleep(5000);

  const gvT = await gv.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  const tvT = await tv.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));

  const pick = (t) => {
    const i = t.indexOf('Tiến độ gửi');
    return i >= 0 ? t.slice(i, i + 120).replace(/\n/g, ' | ') : null;
  };
  // ngữ cảnh "Theo phản hồi đã nhận" trên TV
  const i2 = tvT.indexOf('Theo phản hồi');
  const tvStats = i2 >= 0 ? tvT.slice(i2, i2 + 400).replace(/\n/g, ' | ') : null;

  const out = {
    savedAt: new Date().toISOString(),
    clicked,
    gvTienDo: pick(gvT),
    tvTienDo: pick(tvT),
    tvStats,
    gvHas1HS: /1\s*\n?\s*học sinh đã gửi/.test(gvT) || /Tiến độ gửi[\s\S]{0,40}\b1\b/.test(gvT),
    tvHas1HS: /1\s*\n?\s*học sinh đã gửi/.test(tvT),
    tvHasStudentName: tvT.includes('Đặng Tuệ Minh'),
    gvStage: (gvT.match(/Chặng (\d+)\/12/) || [])[1] || null,
  };
  console.log(JSON.stringify(out, null, 1));

  await gv.screenshot({ path: 'tasks/tmp-r2-qa-p3-stats-gv.png' });
  await tv.screenshot({ path: 'tasks/tmp-r2-qa-p3-stats-tv.png' });
  fs.writeFileSync('tasks/tmp-r2-qa-c-log-part3b.json', JSON.stringify(out, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r2-qa-c-log-part3b.json');

  // tắt lại kết quả lớp cho gọn
  await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /Ẩn kết quả/.test((b.textContent || '').trim()));
    if (btn) btn.click();
  });
  await gv.close();
  await tv.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
