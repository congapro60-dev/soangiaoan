// R2 B8-C2a — GV về S4: nháp+reload HS; S5: chọn tuyến M/S/C; S6: snap + gửi đề 1 câu; log part2a
const puppeteer = require('puppeteer');
const fs = require('fs');

const SESSION = JSON.parse(fs.readFileSync('tasks/tmp-r2-qa-session.json', 'utf8'));
const GV_URL = SESSION.links.tvControl;
const OUT1 = 'tasks/tmp-r2-qa-c-log-part1.json';
const OUT = 'tasks/tmp-r2-qa-c-log-part2a.json';
const LOG = JSON.parse(fs.readFileSync(OUT1, 'utf8'));
LOG.stageNotes = LOG.stageNotes || {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function dump(page) {
  return page.evaluate(() => (document.body.innerText || '').replace(/\n{2,}/g, '\n'));
}
async function gvClick(gv, label) {
  return gv.evaluate((l) => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === l && !b.disabled);
    if (btn) { btn.click(); return true; }
    return false;
  }, label);
}
async function gvInfo(gv) {
  return gv.evaluate(() => {
    const t = document.body.innerText || '';
    const stage = (t.match(/Chặng (\d+)\/12/) || [])[1] || null;
    const plan = (t.match(/Kế hoạch [\d–\-′']+· tiết 40′/) || [])[0] || (t.match(/Kế hoạch[^\n]*/) || [])[0] || null;
    const timer = (t.match(/\n(\d{1,2}:\d{2})\n/) || [])[1] || null;
    const status = t.includes('ĐANG HỌC') ? 'running' : t.includes('TẠM DỪNG') ? 'paused' : t.includes('CHỜ VÀO TIẾT') ? 'waiting' : null;
    return { stage, plan, timer, status };
  });
}
async function navTo(gv, target) {
  let info = await gvInfo(gv);
  let guard = 0;
  while (info.stage !== String(target) && guard < 6) {
    const cur = Number(info.stage || 1);
    await gvClick(gv, cur < target ? 'Sau →' : '← Trước');
    await sleep(2800);
    info = await gvInfo(gv);
    guard++;
  }
  await sleep(2000);
  return info;
}
async function snap(gv, hs, tv, key) {
  LOG[key] = { gv: await dump(gv), hs: await dump(hs), tv: await dump(tv), info: await gvInfo(gv) };
  await gv.screenshot({ path: `tasks/tmp-r2-qa-c-${key}-gv.png` });
  await hs.screenshot({ path: `tasks/tmp-r2-qa-c-${key}-hs.png` });
  await tv.screenshot({ path: `tasks/tmp-r2-qa-c-${key}-tv.png` });
}
async function ensureHsLoggedIn(hs) {
  for (let i = 0; i < 10; i++) {
    const st = await hs.evaluate(() => ({
      hasForm: (document.body.innerText || '').includes('Vào tiết học trực tiếp') && Boolean(document.querySelector('select')),
      hasView: (document.body.innerText || '').includes('HỌC SINH'),
    }));
    if (st.hasView) return 'view';
    if (st.hasForm) {
      await hs.evaluate(() => {
        const sel = document.querySelector('select');
        const opt = Array.from(sel.options).find((o) => o.textContent.trim() === 'Đặng Tuệ Minh');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
        setter.call(sel, opt.value);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await sleep(500);
      await hs.evaluate(() => {
        const inp = document.querySelector('input[placeholder="PIN"]');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(inp, '2750');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await sleep(500);
      await hs.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Vào lớp' && !b.disabled);
        if (btn) btn.click();
      });
      await sleep(4000);
      continue;
    }
    await sleep(2000);
  }
  return (await dump(hs)).includes('HỌC SINH') ? 'view' : 'lost';
}
async function hsSetText(hs, text) {
  return hs.evaluate((t) => {
    const els = Array.from(document.querySelectorAll('textarea, input[type="text"], input:not([type])'))
      .filter((e) => e.offsetParent !== null && e.placeholder !== 'PIN' && !e.disabled && !e.readOnly);
    if (!els.length) return false;
    const el = els[0];
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, t);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, text);
}
async function hsHasDraft(hs, marker) {
  return hs.evaluate((m) => {
    const els = Array.from(document.querySelectorAll('textarea, input[type="text"], input:not([type])'))
      .filter((e) => e.offsetParent !== null && e.placeholder !== 'PIN');
    return els.some((e) => (e.value || '').includes(m));
  }, marker);
}

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });
  const pages = await browser.pages();
  const hs = pages.find((p) => p.url().includes('mode=student'));
  const tv = pages.find((p) => p.url().includes('mode=tv&'));
  if (!hs || !tv) throw new Error('Thiếu trang HS hoặc TV');
  const gv = await browser.newPage();
  await gv.setViewport({ width: 1440, height: 900 });
  await gv.goto(GV_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(9000);
  console.log('GV hiện tại:', JSON.stringify(await gvInfo(gv)));

  // === E-a: nháp + reload tại S4 (chặng 5) ===
  LOG.draftTest = null;
  await navTo(gv, 5);
  const hsButtons5 = await hs.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter(Boolean).slice(0, 40));
  console.log('HS buttons @S4:', JSON.stringify(hsButtons5));
  // mở bước "Viết" nếu có
  await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /^Viết$/.test((b.textContent || '').trim()));
    if (btn) btn.click();
  });
  await sleep(1500);
  const typed = await hsSetText(hs, 'Nháp R2 — kiểm tra lưu 27/10');
  console.log('Typed draft @S4:', typed);
  if (typed) {
    await sleep(3500);
    const hsBefore = await dump(hs);
    await hs.reload({ waitUntil: 'domcontentloaded' });
    await sleep(12000);
    const loggedIn = await ensureHsLoggedIn(hs);
    await sleep(3000);
    const hsAfter = await dump(hs);
    const kept = await hsHasDraft(hs, 'Nháp R2');
    LOG.draftTest = {
      stage: 5, typed, reloaded: true, loggedIn, kept,
      bandBefore: (hsBefore.match(/Chặng [\d–]+ phút/) || [null])[0],
      bandAfter: (hsAfter.match(/Chặng [\d–]+ phút/) || [null])[0],
      sameBand: (hsBefore.match(/Chặng [\d–]+ phút/) || [''])[0] === (hsAfter.match(/Chặng [\d–]+ phút/) || [''])[0],
      aiErrorStill: /Nam/.test(hsAfter),
    };
    await hs.screenshot({ path: 'tasks/tmp-r2-qa-e-reload-s4.png' });
    console.log('E-a nháp+reload @S4:', JSON.stringify(LOG.draftTest));
  }

  // === E-d(1): S5 — chọn tuyến M/S/C (chặng 6) ===
  await navTo(gv, 6);
  await sleep(2000);
  const routeButtons = await hs.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter((t) => /^(M|S|C)\b|Củng cố|Chuẩn|Thử thách/.test(t)).slice(0, 12));
  console.log('HS route buttons @S5:', JSON.stringify(routeButtons));
  LOG.routeChoice = { buttons: routeButtons, clicked: null, after: null };
  const clickedRoute = await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /^S\b|— Chuẩn|S — /.test((b.textContent || '').trim()) && !b.disabled);
    if (btn) { btn.click(); return (btn.textContent || '').trim(); }
    return null;
  });
  LOG.routeChoice.clicked = clickedRoute;
  await sleep(4000);
  LOG.routeChoice.after = (await dump(hs)).slice(0, 900);
  await hs.screenshot({ path: 'tasks/tmp-r2-qa-e-route-s5.png' });
  console.log('Đã chọn tuyến:', clickedRoute);

  // === S6 (chặng 7): snap + spoiler + gửi đề 1 câu ===
  const info7 = await navTo(gv, 7);
  await sleep(2500);
  await snap(gv, hs, tv, 's6');
  const L6 = LOG.s6;
  const note6 = { stage: L6.info.stage, plan: L6.info.plan, timer: L6.info.timer, status: L6.info.status };
  note6.spoilerMe22_text = { hs: /2,2(?!\d)/.test(L6.hs), tv: /2,2(?!\d)/.test(L6.tv) };
  note6.spoilerMe22_dom = await Promise.all([
    hs.evaluate(() => /2,2(?!\d)/.test(document.body.innerHTML)),
    tv.evaluate(() => /2,2(?!\d)/.test(document.body.innerHTML)),
  ]).then(([hsd, tvd]) => ({ hs: hsd, tv: tvd }));
  note6.gv_vinhDanh587_text = /5,87/.test(L6.gv);
  note6.gv_vinhDanh587_dom = await gv.evaluate(() => /5,87/.test(document.body.innerHTML));
  note6.gv_pht2_22_tuTinh_dom = await gv.evaluate(() => {
    const h = document.body.innerHTML;
    return { has22: /2,2(?!\d)/.test(h), tuTinh: /tự tính/i.test(h), nhanPHT2: /đáp án PHT số 2/i.test(h) };
  });
  note6.casio = { gv: /Casio/i.test(L6.gv), hs: /Casio/i.test(L6.hs), tv: /Casio/i.test(L6.tv) };
  LOG.stageNotes.s6 = note6;
  console.log('--- s6 ---', JSON.stringify(note6).slice(0, 700));

  // HS gửi đề trọn vẹn 1 câu (poll nút Gửi qua cửa sổ nghĩ)
  const sent = { typed: null, clicked: false, status: null, gvProgress: null };
  sent.typed = await hsSetText(hs, 'Theo tuyến S: em lập tần số tích luỹ cho bảng PHT số 1, tìm nhóm chứa vị trí n/2 rồi nội suy trung vị theo công thức.');
  for (let i = 0; i < 12; i++) {
    sent.clicked = await hs.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => /^Gửi/.test((b.textContent || '').trim()) && !b.disabled);
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (sent.clicked) break;
    await sleep(2500);
  }
  await sleep(3500);
  const hsAfter6 = await dump(hs);
  sent.status = (hsAfter6.match(/Đã gửi[^\n]*|Đã xác nhận[^\n]*/g) || []).slice(0, 3);
  sent.gvProgress = (L6.gv.match(/Tiến độ gửi[^\n]*/) || [null])[0];
  const gvNow6 = await dump(gv);
  sent.gvProgressNow = (gvNow6.match(/Tiến độ gửi[^\n]*/) || [null])[0];
  LOG.s6Send = sent;
  await hs.screenshot({ path: 'tasks/tmp-r2-qa-e-s6-sent.png' });
  console.log('S6 gửi:', JSON.stringify(sent));

  fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: ' + OUT);
  await gv.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
