// Synthetic browser acceptance: every API request intercepted, external network blocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');
const base = process.env.ZALO_QA_ORIGIN || 'http://127.0.0.1:3019';
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'QA requires a local origin');
const out = path.join(process.env.TEMP || '.', 'zalo-qa-20261106');
fs.mkdirSync(out, { recursive: true });
const assignment = { id: 'assignment-test', classId: 'class-test', title: 'Bài kiểm thử ảnh', description: 'Làm bài 1, 2, 3 trang 72 SGK.', type: 'upload', createdAt: '2026-11-06T00:00:00Z', isOpen: true, maxScore: 10, attachments: [] };
const submission = { id: 'submission-test', classId: 'class-test', studentId: 'student-test', teacherId: 'teacher-test', assignmentId: assignment.id, createdAt: '2026-11-05T00:00:00Z', updatedAt: '2026-11-05T00:00:00Z', status: 'graded', fileUrls: [], note: '', grade: { score: 8, maxScore: 10, teacherApproved: true, feedback: '', strengths: [], weaknesses: [], weakTopics: [], gradedAt: '2026-11-05T00:00:00Z' } };
(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    const actions = []; const unknown = []; const errors = [];
    let expired = false; let redemption = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', async request => {
      try {
        const url = new URL(request.url());
        if (url.origin !== new URL(base).origin) return request.abort();
        if (!url.pathname.startsWith('/api/')) return request.continue();
        const body = JSON.parse(request.postData() || '{}'); actions.push(body.action);
        let status = 200; let data = {};
        switch (body.action) {
          case 'beginBotWeb': status = expired ? 401 : 200; data = expired ? { error: 'Liên kết đã hết hạn. Nhắn web trong bot để lấy liên kết mới.' } : { code: 'abcdef123456' }; break;
          case 'redeemBotWeb': status = ++redemption === 1 ? 202 : 200; data = status === 202 ? { pending: true } : { role: 'parent', joinCode: 'TEST', studentId: 'student-test', assignmentId: assignment.id }; break;
          case 'parentWebSession': data = { role: 'parent', joinCode: 'TEST', studentId: 'student-test', assignmentId: assignment.id }; break;
          case 'parentReports': assert.equal(body.pin, ''); data = { studentName: 'Học sinh kiểm thử', className: 'Lớp kiểm thử', mustChange: false, reports: [] }; break;
          case 'actorAssignments': data = { assignments: [assignment], submissions: [submission] }; break;
          case 'actorAssignmentDetail': assert.equal(body.assignmentId, assignment.id); data = { assignment, submissions: [submission] }; break;
          case 'parentEvent': data = { ok: true }; break;
          default: unknown.push(body.action || url.pathname); status = 503; data = { error: 'Blocked by synthetic QA' };
        }
        return request.respond({ status, contentType: 'application/json', body: JSON.stringify(data) });
      } catch { return request.abort(); }
    });
    const ticket = 'a'.repeat(64);
    await page.goto(`${base}/ph/TEST#bot=${ticket}`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('Tiếp tục bằng bot'));
    console.log('QA handoff mounted');
    assert.equal(actions.length, 0, 'GET/mount must not begin or consume handoff');
    await page.$$eval('button', buttons => { const button = buttons.find(button => button.innerText.trim() === 'Tiếp tục bằng bot'); if (!button) throw new Error('Missing continue button'); button.click(); });
    await page.waitForFunction(() => document.body.innerText.includes('mở web abcdef123456'));
    console.log('QA confirmation displayed');
    await page.screenshot({ path: path.join(out, 'parent-confirm-mobile.png'), fullPage: true });
    await page.waitForFunction(() => location.search.includes('assignment=assignment-test'), { timeout: 20000 });
    await page.waitForFunction(() => document.body.innerText.includes('Làm bài 1, 2, 3 trang 72 SGK.'));
    console.log('QA assignment opened');
    assert.equal(await page.$('input[type=password]'), null, 'linked parent should not enter PIN');
    await page.$$eval('button', buttons => { const button = buttons.find(button => button.innerText.trim() === 'Cập nhật bài nộp'); if (!button) throw new Error('Missing revision button'); button.click(); });
    await page.waitForSelector('input[type=radio]');
    const radios = await page.$$eval('input[type=radio]', list => list.map(input => ({ checked: input.checked, label: input.closest('label').innerText })));
    assert.equal(radios.length, 2); assert.equal(radios[0].checked, true);
    await page.click('input[type=radio]:nth-of-type(1)');
    await page.$$eval('input[type=radio]', list => list[1].click());
    assert.equal(await page.$$eval('input[type=radio]', list => list[1].checked), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'mobile horizontal overflow');
    await page.screenshot({ path: path.join(out, 'parent-assignment-mobile.png'), fullPage: true });
    expired = true;
    await page.goto(`${base}/ph/TEST#bot=${'b'.repeat(64)}`, { waitUntil: 'networkidle0' });
    await page.$$eval('button', buttons => { const button = buttons.find(button => button.innerText.trim() === 'Tiếp tục bằng bot'); if (!button) throw new Error('Missing continue button'); button.click(); });
    await page.waitForFunction(() => [...document.querySelectorAll('[role=alert]')].some(element => element.textContent.includes('hết hạn')));
    await page.screenshot({ path: path.join(out, 'expired-mobile.png'), fullPage: true });
    assert.deepEqual(unknown, [], 'unexpected API actions must be investigated');
    assert.deepEqual(errors, [], 'browser runtime errors');
    console.log(JSON.stringify({ result: 'PASS', checks: ['no mount consumption', 'chat confirmation', 'parent without PIN', 'exact assignment', 'public requirement', 'supplement/replace', 'mobile layout', 'expired link'], screenshots: out, apiRequests: actions.length }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
