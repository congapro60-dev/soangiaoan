// R2 B8-C2b — E-a nháp+reload tại S4 (mở "3 · Tự diễn đạt"); S5 chọn nhiệm vụ; probe GV buttons/Đáp án tại S6
const puppeteer = require('puppeteer');
const fs = require('fs');

const SESSION = JSON.parse(fs.readFileSync('tasks/tmp-r2-qa-session.json', 'utf8'));
const GV_URL = SESSION.links.tvControl;
const OUT = 'tasks/tmp-r2-qa-c-log-part2b.json';
const LOG = { draftTest: null, routeChoice: null, gvProbe: null, s6Recheck: null };
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
    return { stage, status: t.includes('ĐANG HỌC') ? 'running' : t.includes('TẠM DỪNG') ? 'paused' : t.includes('CHỜ VÀO TIẾT') ? 'waiting' : null };
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
        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, opt.value);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await sleep(500);
      await hs.evaluate(() => {
        const inp = document.querySelector('input[placeholder="PIN"]');
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(inp, '2750');
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

  // === E-a: nháp + reload tại S4 (chặng 5) — mở "3 · Tự diễn đạt" ===
  await navTo(gv, 5);
  await hs.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /Tự diễn đạt/.test((b.textContent || '').trim()));
    if (btn) btn.click();
  });
  await sleep(2000);
  const typed = await hsSetText(hs, 'Nháp R2 — kiểm tra lưu 27/10');
  console.log('Typed draft @S4 (sau khi mở Tự diễn đạt):', typed);
  if (typed) {
    await sleep(3500);
    const hsBefore = await dump(hs);
    await hs.reload({ waitUntil: 'domcontentloaded' });
    await sleep(12000);
    const loggedIn = await ensureHsLoggedIn(hs);
    await sleep(3000);
    // mở lại "Tự diễn đạt" nếu cần
    await hs.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => /Tự diễn đạt/.test((b.textContent || '').trim()));
      if (btn) btn.click();
    });
    await sleep(2000);
    const hsAfter = await dump(hs);
    const kept = await hs.evaluate((m) => {
      const els = Array.from(document.querySelectorAll('textarea, input[type="text"], input:not([type])'))
        .filter((e) => e.offsetParent !== null && e.placeholder !== 'PIN');
      return els.some((e) => (e.value || '').includes(m));
    }, 'Nháp R2');
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

  // === E-d(1): S5 — chọn nhiệm vụ (chặng 6) ===
  await navTo(gv, 6);
  await sleep(2000);
  const cards = await hs.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter((t) => t && t.length > 10 && t.length < 300).slice(0, 12));
  console.log('HS cards @S5:', JSON.stringify(cards));
  const clickedCard = await hs.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).filter((b) => /Chọn nhiệm vụ này/.test((b.textContent || '')) && !b.disabled);
    if (btns.length) { btns[0].click(); return (btns[0].textContent || '').trim().slice(0, 200); }
    return null;
  });
  LOG.routeChoice = { cards, clicked: clickedCard };
  await sleep(4000);
  LOG.routeChoice.after = (await dump(hs)).slice(0, 900);
  await hs.screenshot({ path: 'tasks/tmp-r2-qa-e-route-s5.png' });
  console.log('Đã chọn nhiệm vụ:', clickedCard ? clickedCard.slice(0, 120) : null);

  // === Probe GV tại S6 (chặng 7): buttons + tìm toggle "Đáp án/Kịch bản" ===
  await navTo(gv, 7);
  await sleep(2500);
  const gvButtons = await gv.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter(Boolean).slice(0, 40));
  const gvDomS6 = await gv.evaluate(() => {
    const h = document.body.innerHTML;
    const pick = (re) => {
      const m = h.match(re);
      return m ? h.slice(Math.max(0, (m.index || 0) - 150), (m.index || 0) + 250).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') : null;
    };
    return {
      has22: /2,2(?!\d)/.test(h), has587: /5,87/.test(h), tuTinh: /tự tính/i.test(h),
      ctx22: pick(/2,2(?!\d)/), ctx587: pick(/5,87/), ctxTuTinh: pick(/tự tính/i),
    };
  });
  LOG.gvProbe = { buttons: gvButtons, domS6: gvDomS6 };
  console.log('GV buttons:', JSON.stringify(gvButtons));
  console.log('GV DOM S6:', JSON.stringify(gvDomS6).slice(0, 800));

  // Nếu có nút "Đáp án" thì bấm thử rồi kiểm lại
  const ansBtn = await gv.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) => /Đáp án|Kịch bản|Chi tiết dạy|Board/i.test((b.textContent || '')) && !b.disabled);
    if (btn) { const t = (btn.textContent || '').trim(); btn.click(); return t; }
    return null;
  });
  if (ansBtn) {
    await sleep(3000);
    LOG.gvProbe.clickedAnswerBtn = ansBtn;
    LOG.gvProbe.domS6AfterClick = await gv.evaluate(() => {
      const h = document.body.innerHTML;
      return { has22: /2,2(?!\d)/.test(h), has587: /5,87/.test(h), tuTinh: /tự tính/i.test(h) };
    });
    await gv.screenshot({ path: 'tasks/tmp-r2-qa-c-s6-gv-answers.png' });
    console.log('Bấm nút:', ansBtn, '→ DOM sau bấm:', JSON.stringify(LOG.gvProbe.domS6AfterClick));
  }

  fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: ' + OUT);
  await gv.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
