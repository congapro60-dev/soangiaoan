// R2 B8-C1 — GV mở presenter, Chạy tiết, sweep chặng 1→6; test nháp+reload HS tại S3/S4; log part1
const puppeteer = require('puppeteer');
const fs = require('fs');

const SESSION = JSON.parse(fs.readFileSync('tasks/tmp-r2-qa-session.json', 'utf8'));
const GV_URL = SESSION.links.tvControl;
const LOG = {};
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
async function snap(gv, hs, tv, key) {
  LOG[key] = { gv: await dump(gv), hs: await dump(hs), tv: await dump(tv), info: await gvInfo(gv) };
  await gv.screenshot({ path: `tasks/tmp-r2-qa-c-${key}-gv.png` });
  await hs.screenshot({ path: `tasks/tmp-r2-qa-c-${key}-hs.png` });
  await tv.screenshot({ path: `tasks/tmp-r2-qa-c-${key}-tv.png` });
}

// Đăng nhập lại HS nếu reload xong hiện form chọn tên + PIN
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

async function findVisibleInput(hs) {
  return hs.evaluate(() => {
    const els = Array.from(document.querySelectorAll('textarea, input[type="text"], input:not([type])'))
      .filter((e) => e.offsetParent !== null && e.placeholder !== 'PIN' && !e.disabled && !e.readOnly);
    return els.length ? { tag: els[0].tagName, ph: els[0].placeholder || '', count: els.length } : null;
  });
}

async function typeFirstInput(hs, text) {
  return hs.evaluate((t) => {
    const els = Array.from(document.querySelectorAll('textarea, input[type="text"], input:not([type])'))
      .filter((e) => e.offsetParent !== null && e.placeholder !== 'PIN' && !e.disabled && !e.readOnly);
    if (!els.length) return false;
    const el = els[0];
    const setter = Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, t);
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
  if (!hs || !tv) throw new Error('Thiếu trang HS hoặc TV — chạy lại a2');
  const gv = await browser.newPage();
  await gv.setViewport({ width: 1440, height: 900 });
  await gv.goto(GV_URL, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await sleep(9000);
  console.log('GV info ban đầu:', JSON.stringify(await gvInfo(gv)));

  // === QA F: TV không có nút điều khiển + không lộ tên HS ===
  LOG.tvButtons = await tv.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter(Boolean));
  LOG.tvHasStudentName = (await dump(tv)).includes('Đặng Tuệ Minh');
  console.log('TV buttons:', JSON.stringify(LOG.tvButtons), '| TV lộ tên HS:', LOG.tvHasStudentName);

  // Chạy tiết
  let started = false;
  for (let i = 0; i < 5; i++) {
    started = await gvClick(gv, 'Chạy');
    if (started) break;
    await sleep(2000);
  }
  await sleep(3000);
  console.log('Đã Chạy:', started, '| info:', JSON.stringify(await gvInfo(gv)));

  // Sweep chặng 1→6
  let draftDone = null; // { stage, typed, reloaded, kept, bandBefore, bandAfter }
  for (let target = 1; target <= 6; target++) {
    let info0 = await gvInfo(gv);
    let guard = 0;
    while ((info0.stage || 0) < target && guard < 4) {
      await gvClick(gv, 'Sau →');
      await sleep(2800);
      info0 = await gvInfo(gv);
      guard++;
    }
    await sleep(2500);
    const key = 's' + (target - 1); // chặng 1 = S0 ... chặng 6 = S5
    await snap(gv, hs, tv, key);
    const L = LOG[key];
    const t = { gv: L.gv, hs: L.hs, tv: L.tv };
    const note = { stage: L.info.stage, plan: L.info.plan, timer: L.info.timer, status: L.info.status };

    if (target === 2) {
      note.gv_onnEN_24711 = /2;\s*4;\s*7;\s*11|2,\s*4,\s*7,\s*11/.test(t.gv);
      note.gv_hasCongThucCab2 = /a\s*\+\s*b/.test(t.gv);
      note.spoiler_onnEN = { hs: /2;\s*4;\s*7;\s*11|2,\s*4,\s*7,\s*11/.test(t.hs), tv: /2;\s*4;\s*7;\s*11|2,\s*4,\s*7,\s*11/.test(t.tv) };
    }
    if (target === 4) {
      note.hs_hasDePHT1 = /5;\s*12;\s*15;\s*8|5,\s*12,\s*15,\s*8/.test(t.hs);
      note.gv_pht1_215 = /2,15/.test(t.gv);
      note.gv_pht1_224 = /2,24/.test(t.gv);
      note.gv_tuTinh = /tự tính/i.test(t.gv);
      note.gv_nhanPHT1 = /đáp án PHT số 1/i.test(t.gv);
      note.gv_internet395 = /3,95/.test(t.gv);
      // PA-β: mỗi chỗ nhắc "đáp án PHT số 1" có kèm 2,15 và KHÔNG nằm sát số 158 (bảng Internet)?
      note.gv_pht1_contexts = [];
      const re = /đáp án PHT số 1/gi;
      let m;
      while ((m = re.exec(t.gv)) && note.gv_pht1_contexts.length < 5) {
        note.gv_pht1_contexts.push(t.gv.slice(Math.max(0, m.index - 160), m.index + 200).replace(/\n/g, ' | '));
      }
      note.spoiler215_224 = { hs: /2,15|2,24/.test(t.hs), tv: /2,15|2,24/.test(t.tv) };
      note.spoiler_internet395_hs_tv = { hs: /3,95/.test(t.hs), tv: /3,95/.test(t.tv) };
    }
    if (target === 5) {
      note.hs_hasNam = /Nam/.test(t.hs);
      note.hs_hasWrong = /2\s*\+\s*4\s*\+\s*6\s*\+\s*8|0,125/.test(t.hs);
      note.spoiler_correction = { hs: /3,95|158\/40/.test(t.hs), tv: /3,95|158\/40/.test(t.tv) };
      note.gv_hasCorrection = /3,95/.test(t.gv);
    }

    // === E-a: nháp + reload HS (thử tại chặng 4 = S3, fallback chặng 5 = S4) ===
    if ((target === 4 || target === 5) && !draftDone) {
      const inputInfo = await findVisibleInput(hs);
      if (inputInfo) {
        const typed = await typeFirstInput(hs, 'Nháp R2 — kiểm tra lưu 27/10');
        await sleep(3500);
        const bandBefore = (t.hs.match(/Chặng [\d–]+ phút/) || [null])[0];
        await hs.reload({ waitUntil: 'domcontentloaded' });
        await sleep(12000);
        const loggedIn = await ensureHsLoggedIn(hs);
        await sleep(3000);
        const hsAfter = await dump(hs);
        const kept = await hs.evaluate(() => {
          const els = Array.from(document.querySelectorAll('textarea, input[type="text"], input:not([type])'))
            .filter((e) => e.offsetParent !== null && e.placeholder !== 'PIN');
          return els.some((e) => (e.value || '').includes('Nháp R2'));
        });
        draftDone = { stage: target, inputTag: inputInfo.tag, typed, reloaded: true, loggedIn, kept, bandBefore, bandAfter: (hsAfter.match(/Chặng [\d–]+ phút/) || [null])[0], hsHasContent: hsAfter.length > 400 };
        await hs.screenshot({ path: `tasks/tmp-r2-qa-e-reload-s${target - 1}.png` });
        console.log('E-a nháp+reload:', JSON.stringify(draftDone));
      } else {
        console.log(`Chặng ${target}: không thấy input nháp trên máy HS`);
      }
    }
    draftDone && (note.draftDone = draftDone);
    LOG.stageNotes = LOG.stageNotes || {};
    LOG.stageNotes[key] = note;
    console.log(`--- chặng ${target} ---`, JSON.stringify(note).slice(0, 800));
  }

  LOG.draftTest = draftDone;
  fs.writeFileSync('tasks/tmp-r2-qa-c-log-part1.json', JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r2-qa-c-log-part1.json');
  await gv.close();
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
