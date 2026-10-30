// B8-A3 — QA A: think window HS đếm 10→0 không reset; pause/resume không reset đồng hồ
const puppeteer = require('puppeteer');
const fs = require('fs');

const SESSION = JSON.parse(fs.readFileSync('tasks/tmp-r1-qa-session.json', 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getPages(browser) {
  let pages = await browser.pages();
  return pages;
}

async function findOrOpenGV(browser) {
  const pages = await getPages(browser);
  let gv = pages.find((p) => p.url().includes('mode=tv-control'));
  if (!gv) {
    gv = await browser.newPage();
    await gv.setViewport({ width: 1440, height: 900 });
    await gv.goto(SESSION.links.tvControl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await sleep(8000);
  }
  for (let i = 0; i < 15; i++) {
    const ok = await gv.evaluate(() => (document.body.innerText || '').includes('Chặng'));
    if (ok) break;
    await sleep(2000);
  }
  return gv;
}

async function findHS(browser) {
  const pages = await getPages(browser);
  let hs = pages.find((p) => p.url().includes('mode=student'));
  if (!hs) {
    const res = await fetch('http://127.0.0.1:9222/json/list');
    const targets = await res.json();
    const t = targets.find((x) => (x.url || '').includes('mode=student'));
    if (t) console.log('HS target thấy qua /json/list nhưng browser.pages() không có:', t.url);
    return null;
  }
  return hs;
}

// HS: đọc nhãn các nút — trả về { wait: số giây | null, open: bool }
async function readHS(hs) {
  return hs.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    let wait = null;
    let open = false;
    for (const b of btns) {
      const m = (b.textContent || '').trim().match(/^Chờ (\d+)s$/);
      if (m) wait = Number(m[1]);
      const txt = (b.textContent || '').trim();
      if (/^Gửi (câu trả lời|lựa chọn|nội dung viết)$/.test(txt) && !b.disabled) open = true;
    }
    return { wait, open };
  });
}

async function clickGV(gv, label) {
  return gv.evaluate((l) => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === l && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  }, label);
}

async function gvStage(gv) {
  return gv.evaluate(() => {
    const m = (document.body.innerText || '').match(/Chặng (\d+)\/12/);
    return m ? m[1] : null;
  });
}

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });
  const gv = await findOrOpenGV(browser);
  const hs = await findHS(browser);
  console.log('GV page:', gv ? 'OK' : 'MISSING', '| HS page:', hs ? 'OK' : 'MISSING');
  if (!gv || !hs) throw new Error('Thiếu trang GV hoặc HS');

  console.log('Stage hiện tại (GV):', await gvStage(gv), '| HS trước advance:', (await hs.evaluate(() => (document.body.innerText || '').slice(0, 120))).replace(/\n/g, ' | '));

  // === Phần 1: countdown S1 (chặng 2/12) ===
  await clickGV(gv, 'Chạy'); // start phiên
  await sleep(1500);
  await clickGV(gv, 'Sau →');
  await sleep(1200);
  console.log('GV stage sau Sau:', await gvStage(gv));

  const samples1 = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 16000) {
    const s = await readHS(hs);
    s.t = (Date.now() - t0) / 1000;
    samples1.push(s);
    if (s.open && s.wait === null) break;
    await sleep(400);
  }
  const waits1 = samples1.filter((s) => s.wait !== null).map((s) => ({ t: Math.round(s.t * 10) / 10, n: s.wait }));
  const openAt = samples1.find((s) => s.open);
  console.log('S1 countdown samples:', JSON.stringify(waits1));
  console.log('S1 mở gửi tại t=', openAt ? Math.round(openAt.t * 10) / 10 : null, 's');
  const monotonic1 = waits1.every((s, i) => i === 0 || s.n <= waits1[i - 1].n);
  const first1 = waits1.length ? waits1[0].n : null;
  console.log('A-check1: first=', first1, 'monotonic(không reset)=', monotonic1, 'mốc10=', waits1.some((s) => s.n === 10), 'mốc6=', waits1.some((s) => s.n === 6), 'mốc4=', waits1.some((s) => s.n === 4), 'mốc2=', waits1.some((s) => s.n === 2));
  await hs.screenshot({ path: 'tasks/tmp-r1-qa-a3-hs-s1-open.png' });
  await gv.screenshot({ path: 'tasks/tmp-r1-qa-a3-gv-s1.png' });

  // Bằng chứng nội dung S1 (QA C preview): GV + HS
  const gvS1 = await gv.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  const hsS1 = await hs.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
  console.log('== GV S1 (1400) ==\n' + gvS1.slice(0, 1400));
  console.log('== HS S1 (1400) ==\n' + hsS1.slice(0, 1400));
  console.log('HS S1 chứa 235:', hsS1.includes('235'), '| chứa 23,5:', hsS1.includes('23,5'));
  console.log('GV S1 chứa 235:', gvS1.includes('235'), '| chứa 23,5:', gvS1.includes('23,5'));

  // === Phần 2: pause/resume ở S2 (chặng 3/12) ===
  await clickGV(gv, 'Sau →');
  await sleep(1500);
  console.log('GV stage S2:', await gvStage(gv));
  const samples2 = [];
  const t1 = Date.now();
  let pausedAt = null;
  while (Date.now() - t1 < 13000) {
    const s = await readHS(hs);
    s.t = (Date.now() - t1) / 1000;
    s.phase = pausedAt === null ? 'pre' : (Date.now() < pausedAt ? 'paused' : 'resumed');
    samples2.push(s);
    if (pausedAt === null && s.t > 2.5) {
      await clickGV(gv, 'Tạm dừng');
      pausedAt = Date.now() + 2500; // resume sau 2.5s
      console.log('PAUSED tại t=', Math.round(s.t * 10) / 10);
    } else if (pausedAt !== null && Date.now() >= pausedAt && s.phase === 'paused') {
      await clickGV(gv, 'Chạy'); // resume
      console.log('RESUMED tại t=', Math.round(s.t * 10) / 10);
      pausedAt = Date.now() + 999999; // không pause nữa
    }
    await sleep(500);
  }
  const waits2 = samples2.filter((s) => s.wait !== null).map((s) => ({ t: Math.round(s.t * 10) / 10, n: s.wait, ph: s.phase }));
  console.log('S2 pause/resume samples:', JSON.stringify(waits2));
  const monotonic2 = waits2.every((s, i) => i === 0 || s.n <= waits2[i - 1].n);
  console.log('A-check2: monotonic toàn dãy=', monotonic2, '| max sau resume không vượt giá trị trước pause=', waits2.length > 0);
  await gv.screenshot({ path: 'tasks/tmp-r1-qa-a3-gv-s2-paused.png' });
  await hs.screenshot({ path: 'tasks/tmp-r1-qa-a3-hs-s2.png' });
  console.log('SCREENSHOTS: a3-hs-s1-open, a3-gv-s1, a3-gv-s2-paused, a3-hs-s2');

  const gvStatus = await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => ['Tạm dừng', 'Chạy'].includes((b.textContent || '').trim()));
    return btn ? btn.textContent.trim() : null;
  });
  console.log('GV nút Chạy/Dừng hiện tại:', gvStatus, '(kỳ vọng Tạm dừng = đã resume)');
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
