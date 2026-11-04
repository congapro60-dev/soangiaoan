// B8-A6 — QA C/D/F: sweep chặng 6→12/12, kiểm nội dung theo Gate D, timeline Kế hoạch, TV không có nút điều khiển
const puppeteer = require('puppeteer');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LOG = {};
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
  LOG[key] = {
    gv: await dump(gv), hs: await dump(hs), tv: await dump(tv), info: await gvInfo(gv),
  };
  await gv.screenshot({ path: `tasks/tmp-r1-qa-c-${key}-gv.png` });
  await hs.screenshot({ path: `tasks/tmp-r1-qa-c-${key}-hs.png` });
  await tv.screenshot({ path: `tasks/tmp-r1-qa-c-${key}-tv.png` });
}

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const info = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: info.webSocketDebuggerUrl, defaultViewport: null });
  const pages = await browser.pages();
  const gv = pages.find((p) => p.url().includes('mode=tv-control'));
  const hs = pages.find((p) => p.url().includes('mode=student'));
  const tv = pages.find((p) => p.url().includes('mode=tv&'));
  if (!gv || !hs || !tv) throw new Error('Thiếu trang GV/HS/TV');

  // === QA F: TV không có nút điều khiển ===
  LOG.tvButtons = await tv.evaluate(() => Array.from(document.querySelectorAll('button')).map((b) => (b.textContent || '').trim()).filter(Boolean));
  LOG.tvHasStudentName = (await dump(tv)).includes('Trần Thùy Anh');
  console.log('TV buttons:', JSON.stringify(LOG.tvButtons), '| TV lộ tên HS:', LOG.tvHasStudentName);

  // Đảm bảo stats đang tắt trước khi sweep
  await gvClick(gv, 'Ẩn kết quả');
  await sleep(1500);

  // Tiến từng chặng 6 → 12
  const stageNotes = {};
  for (let target = 6; target <= 12; target++) {
    let info0 = await gvInfo(gv);
    let guard = 0;
    while ((info0.stage || 0) < target && guard < 4) {
      await gvClick(gv, 'Sau →');
      await sleep(2800);
      info0 = await gvInfo(gv);
      guard++;
    }
    await sleep(2500);
    const key = 's' + (target - 1); // stage 6 = S5 ... stage 11 = S10, stage 12 = sau
    await snap(gv, hs, tv, key);
    const L = LOG[key];
    const t = { gv: L.gv, hs: L.hs, tv: L.tv };
    const note = { stage: L.info.stage, plan: L.info.plan, timer: L.info.timer, status: L.info.status };
    if (target === 7) {
      note.hs_hasDeTH = /chiều cao 10 cây|10 cây giống/i.test(t.hs);
      note.hs_hasDeNB = /6;\s*7;\s*7;\s*8|6, 7, 7, 8/.test(t.hs);
      note.hs_hasDeVD = /x̄ = 8, tìm x|x = 8/.test(t.hs) || /mẫu 5 giá trị/.test(t.hs);
      note.spoiler14_9 = { hs: /14,9|149\/10/.test(t.hs), tv: /14,9|149\/10/.test(t.tv), gv: /14,9|149\/10/.test(t.gv) };
    }
    if (target === 8) {
      note.hs_hasDe = /3,\s*1,\s*4,\s*2,\s*5/.test(t.hs);
      note.spoilerMe3 = { hs: /Me\s*=\s*3\b/.test(t.hs), tv: /Me\s*=\s*3\b/.test(t.tv), gv: /Me\s*=\s*3\b/.test(t.gv) };
    }
    if (target === 9) {
      // S8: 3 câu — nút Gửi disabled khi chưa chọn
      note.hs_sendButtons = await hs.evaluate(() => Array.from(document.querySelectorAll('button')).filter((b) => /^Gửi /.test((b.textContent || '').trim())).map((b) => ({ t: (b.textContent || '').trim().slice(0, 40), dis: b.disabled })));
      note.hasC1 = /12,\s*7,\s*3,\s*15,\s*8,\s*9,\s*21/.test(t.hs) || /12,\s*7,\s*3/.test(t.hs);
      note.hasC3 = /2,\s*4,\s*5,\s*a/.test(t.hs);
      note.spoilerA8 = { hs: /a\s*=\s*8\b/.test(t.hs), tv: /a\s*=\s*8\b/.test(t.tv) };
    }
    if (target === 10) {
      note.tv_has65000 = t.tv.includes('65.000');
      note.tv_has42000 = t.tv.includes('42.000');
      note.hs_has65000 = t.hs.includes('65.000');
    }
    if (target === 11) {
      // S10: exit ticket — gửi trống phải bị chặn
      const stBefore = await hs.evaluate(() => Array.from(document.querySelectorAll('[role="status"]')).map((e) => (e.textContent || '').trim()));
      await hs.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) => /^Gửi /.test((b.textContent || '').trim()) && !b.disabled);
        if (btn) btn.click();
      });
      await sleep(3000);
      const stAfter = await hs.evaluate(() => Array.from(document.querySelectorAll('[role="status"]')).map((e) => (e.textContent || '').trim()));
      note.exitEmptyBlock = { stBefore, stAfter, blocked: !JSON.stringify(stAfter).includes('Đã xác nhận') };
    }
    if (target === 12) {
      note.gvTextAfter12 = L.gv.slice(0, 700);
    }
    stageNotes[key] = note;
    console.log(`--- stage ${target} ---`, JSON.stringify(note).slice(0, 900));
  }

  // === QA D: tổng hợp Kế hoạch từng chặng từ log ===
  LOG.stageNotes = stageNotes;

  // === S8: bật stats kiểm "Lựa chọn của lớp" ===
  const cur = await gvInfo(gv);
  console.log('Stage hiện tại trước stats-check:', cur.stage);
  // Nếu đã qua 9, lùi lại 9
  let g = 0;
  while ((cur.stage || 12) > 9 && g < 4) { await gvClick(gv, '← Trước'); await sleep(2500); cur.stage = (await gvInfo(gv)).stage; g++; }
  await gvClick(gv, 'Hiện kết quả lớp');
  await sleep(4000);
  const tvStats = await dump(tv);
  LOG.s8Stats = {
    hasChoiceLabel: tvStats.includes('Lựa chọn của lớp'),
    hasStudentName: tvStats.includes('Trần Thùy Anh'),
    excerpt: tvStats.slice(tvStats.indexOf('Theo phản hồi'), tvStats.indexOf('Theo phản hồi') + 700),
  };
  console.log('S8 stats:', JSON.stringify({ hasChoiceLabel: LOG.s8Stats.hasChoiceLabel, hasStudentName: LOG.s8Stats.hasStudentName }));
  console.log('S8 stats excerpt:', LOG.s8Stats.excerpt.slice(0, 500));
  await tv.screenshot({ path: 'tasks/tmp-r1-qa-c-s8-stats.png' });
  await gvClick(gv, 'Ẩn kết quả');
  await sleep(1500);

  fs.writeFileSync('tasks/tmp-r1-qa-c-log.json', JSON.stringify(LOG, null, 1), 'utf8');
  console.log('SAVED: tasks/tmp-r1-qa-c-log.json');
  browser.disconnect();
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
