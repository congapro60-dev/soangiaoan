// R2 B8-C2c — E-a nháp+reload sạch tại S4; sweep chặng 8→12 (S7–S11 + Sau); E1 nút "Sau"; stats S8; merge log cuối
const puppeteer = require('puppeteer');
const fs = require('fs');

const SESSION = JSON.parse(fs.readFileSync('tasks/tmp-r2-qa-session.json', 'utf8'));
const GV_URL = SESSION.links.tvControl;
const OUT = 'tasks/tmp-r2-qa-c-log.json';
const LOG = JSON.parse(fs.readFileSync('tasks/tmp-r2-qa-c-log-part2a.json', 'utf8'));
const L2B = JSON.parse(fs.readFileSync('tasks/tmp-r2-qa-c-log-part2b.json', 'utf8'));
LOG.draftTest2 = null;
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
    const plan = (t.match(/Kế hoạch [\d–\-′']+· tiết 40′/) || [])[0] || null;
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
  await sleep(2500);
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

  // === E-a (lần 2, sạch): GV về S5, CHỜ HS theo kịp (đủ chữ "Nam") rồi mới gõ nháp ===
  await navTo(gv, 5);
  let hsReady = false;
  for (let i = 0; i < 10; i++) {
    hsReady = (await dump(hs)).includes('Nam');
    if (hsReady) break;
    await sleep(2000);
  }
  console.log('HS đã về S4 (thấy Nam):', hsReady);
  if (hsReady) {
    await hs.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => /Tự diễn đạt/.test((b.textContent || '').trim()));
      if (btn) btn.click();
    });
    await sleep(2000);
    const typed = await hsSetText(hs, 'Nháp R2 — kiểm tra lưu 27/10');
    await sleep(4000);
    const hsBefore = await dump(hs);
    await hs.reload({ waitUntil: 'domcontentloaded' });
    await sleep(12000);
    const loggedIn = await ensureHsLoggedIn(hs);
    await sleep(3000);
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
    LOG.draftTest2 = {
      stage: 5, typed, reloaded: true, loggedIn, kept,
      bandBefore: (hsBefore.match(/Chặng [\d–]+ phút/) || [null])[0],
      bandAfter: (hsAfter.match(/Chặng [\d–]+ phút/) || [null])[0],
      aiErrorStill: /Nam/.test(hsAfter),
      hsAfterExcerpt: hsAfter.slice(0, 700),
    };
    await hs.screenshot({ path: 'tasks/tmp-r2-qa-e-reload-s4.png' });
    console.log('E-a nháp+reload (lần 2):', JSON.stringify({ ...LOG.draftTest2, hsAfterExcerpt: undefined }));
    console.log('HS sau reload (500):', hsAfter.slice(0, 500));
  }

  // === Sweep chặng 8→12 ===
  for (let target = 8; target <= 12; target++) {
    await navTo(gv, target);
    const key = 's' + (target - 1);
    await snap(gv, hs, tv, key);
    const L = LOG[key];
    const t = { gv: L.gv, hs: L.hs, tv: L.tv };
    const note = { stage: L.info.stage, plan: L.info.plan, timer: L.info.timer, status: L.info.status };

    if (target === 8) { // S7 — Phiếu số 3 Ý1&2
      note.hs_hasDeP3 = /10;\s*15;\s*20;\s*x|10,\s*15,\s*20,\s*x|10;\s*15;\s*20/.test(t.hs);
      note.spoiler145 = { hs: /\b145\b/.test(t.hs), tv: /\b145\b/.test(t.tv) };
      note.spoiler150 = { hs: /\b150\b/.test(t.hs), tv: /\b150\b/.test(t.tv) };
      note.spoiler_x5 = { hs: /x\s*=\s*5\b/.test(t.hs), tv: /x\s*=\s*5\b/.test(t.tv) };
      note.spoiler_dom = await Promise.all([
        hs.evaluate(() => /\b145\b|\b150\b/.test(document.body.innerHTML)),
        tv.evaluate(() => /\b145\b|\b150\b/.test(document.body.innerHTML)),
      ]).then(([h, v]) => ({ hs: h, tv: v }));
    }
    if (target === 9) { // S8 — Ý 3 đề đích mới (PA-d)
      note.gv_dichMoi = { khongNhoHon: /không nhỏ hơn/.test(t.gv), has152: /152/.test(t.gv), nhoNhatK: /nhỏ nhất của k|giá trị nhỏ nhất/.test(t.gv) };
      note.spoiler_k5 = { hs: /k\s*=\s*5\b/.test(t.hs), tv: /k\s*=\s*5\b/.test(t.tv) };
      note.spoiler_15227 = { hs: /152,27/.test(t.hs), tv: /152,27/.test(t.tv) };
      note.spoiler_dom = await Promise.all([
        hs.evaluate(() => /k\s*=\s*5\b|152,27/.test(document.body.innerHTML)),
        tv.evaluate(() => /k\s*=\s*5\b|152,27/.test(document.body.innerHTML)),
      ]).then(([h, v]) => ({ hs: h, tv: v }));
      note.khong_73k365 = { gv: !/73k\s*=\s*365/.test(t.gv), hs: !/73k\s*=\s*365/.test(t.hs), tv: !/73k\s*=\s*365/.test(t.tv) };
      note.hs_hasDe = /không nhỏ hơn|152/.test(t.hs);
    }
    if (target === 10) { // S9 — lương công ty A + chốt Ý 3
      note.gv_luong = { has24: /24 triệu/.test(t.gv), hasMe10: /10 triệu/.test(t.gv) };
      note.tv_luong = { has24: /24 triệu/.test(t.tv), hasMe10: /10 triệu/.test(t.tv) };
      note.hs_luong = { has24: /24 triệu/.test(t.hs) };
      note.gv_chotY3_dom = await gv.evaluate(() => /k\s*=\s*5\b|152,27|73k\s*≥\s*350|73k ≥ 350/.test(document.body.innerHTML));
      note.gv_chotY3_text = /k\s*=\s*5\b|152,27/.test(t.gv);
    }
    if (target === 11) { // S10 — exit ticket
      note.hs_exit = { hasThe: /thoát hiểm|Hiểu rõ nhất|Còn thắc mắc|tự đánh giá/i.test(t.hs), hasKwli: /KWLI|học được|muốn tìm/i.test(t.hs) };
      const hsButtons = await hs.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter(Boolean).slice(0, 30));
      note.hs_buttons = hsButtons;
      // điền tự đánh giá: chọn "Hiểu rõ nhất" nếu có
      note.clickedSelfAssess = await hs.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) => /Hiểu rõ nhất/i.test((b.textContent || '')) && !b.disabled);
        if (btn) { btn.click(); return true; }
        return false;
      });
      await sleep(1500);
      note.typedKwli = await hsSetText(hs, 'Em học được cách tính x̄ và M_e của mẫu số liệu ghép nhóm; em muốn tìm thêm bài tập tứ phân vị.');
      // Gửi (poll qua cửa sổ nghĩ)
      for (let i = 0; i < 12; i++) {
        note.clickedSend = await hs.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find((b) => /^Gửi/.test((b.textContent || '').trim()) && !b.disabled);
          if (btn) { btn.click(); return true; }
          return false;
        });
        if (note.clickedSend) break;
        await sleep(2500);
      }
      await sleep(3500);
      const hsAfter = await dump(hs);
      note.statusAfterSend = (hsAfter.match(/Đã gửi[^\n]*|Đã xác nhận[^\n]*/g) || []).slice(0, 3);
      const gvNow = await dump(gv);
      note.gv_tienDoGui = (gvNow.match(/Tiến độ gửi[^\n]*/) || [null])[0];
      const tvNow = await dump(tv);
      note.tv_tienDoGui = (tvNow.match(/Tiến độ gửi[^\n]*/) || [null])[0];
      await hs.screenshot({ path: 'tasks/tmp-r2-qa-e-s10-exit-sent.png' });
    }
    if (target === 12) { // chặng "Sau" — E1: nút "Sau →" disabled
      const sauBtn = await gv.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Sau →');
        return btn ? { exists: true, disabled: btn.disabled } : { exists: false, disabled: null };
      });
      note.sauBtn = sauBtn;
      note.clickSauAttempt = await gvClick(gv, 'Sau →'); // false nếu disabled
      await sleep(2500);
      note.stageAfterClick = (await gvInfo(gv)).stage;
      note.gvText = t.gv.slice(0, 600);
      await gv.screenshot({ path: 'tasks/tmp-r2-qa-e1-sau-disabled.png' });
    }
    LOG.stageNotes[key] = note;
    console.log(`--- chặng ${target} ---`, JSON.stringify(note).slice(0, 750));
  }

  // === Stats tại S8 (chặng 9): "Hiện kết quả lớp" — TV không lộ từng em ===
  await navTo(gv, 9);
  await gvClick(gv, 'Hiện kết quả lớp');
  await sleep(4000);
  const tvStats = await dump(tv);
  LOG.s8Stats = {
    hasChoiceLabel: /Lựa chọn của lớp|Theo phản hồi/.test(tvStats),
    hasStudentName: tvStats.includes('Đặng Tuệ Minh'),
    hasDungSai: /đúng|sai|correct|incorrect/i.test(tvStats.slice(tvStats.indexOf('Theo phản hồi'), tvStats.indexOf('Theo phản hồi') + 700)),
    excerpt: tvStats.slice(tvStats.indexOf('Theo phản hồi'), tvStats.indexOf('Theo phản hồi') + 700),
  };
  console.log('S8 stats:', JSON.stringify({ hasChoiceLabel: LOG.s8Stats.hasChoiceLabel, hasStudentName: LOG.s8Stats.hasStudentName, hasDungSai: LOG.s8Stats.hasDungSai }));
  await tv.screenshot({ path: 'tasks/tmp-r2-qa-f-s8-stats.png' });
  await gvClick(gv, 'Ẩn kết quả');
  await sleep(1500);

  // === Gộp log part2b + lưu log cuối ===
  LOG.routeChoice = L2B.routeChoice;
  LOG.draftTest_lan1 = L2B.draftTest;
  LOG.gvProbe = L2B.gvProbe;
  LOG.casioScan = { s6: LOG.stageNotes.s6 ? LOG.stageNotes.s6.casio : null };
  const allText = JSON.stringify(LOG);
  LOG.casioAllViews = allText.includes('Casio');
  fs.writeFileSync(OUT, JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: ' + OUT + ' | Casio xuất hiện anywhere:', LOG.casioAllViews);
  await gv.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
