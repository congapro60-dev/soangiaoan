// Run: npx firebase emulators:exec --only firestore,auth --project demo-zalo-qa "npx tsx scripts/qa-zalo-student.ts"
// Real local Auth, Firestore rules, handoff and classroom handlers; no production or model requests.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import puppeteer from 'puppeteer';

const project = 'demo-zalo-qa';
const origin = 'http://127.0.0.1:3021';
assert.equal(process.env.GCLOUD_PROJECT, project, 'Run only under the demo-zalo-qa emulator project');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
Object.assign(process.env, {
  ASSISTANT_WEB_ORIGIN: origin, VITE_USE_EMULATOR: '1',
  VITE_FIREBASE_PROJECT_ID: project, VITE_FIREBASE_API_KEY: 'dummy-emulator-key',
  VITE_FIREBASE_AUTH_DOMAIN: `${project}.firebaseapp.com`, VITE_FIREBASE_STORAGE_BUCKET: `${project}.appspot.com`,
  VITE_FIREBASE_APP_ID: '1:123:web:demo', VITE_FIREBASE_MESSAGING_SENDER_ID: '123',
  VITE_API_TARGET: 'http://127.0.0.1:1', DISABLE_HMR: 'true',
});
const local = (value: string) => {
  const url = new URL(value);
  return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    && ['3021', '8080', '9099'].includes(url.port);
};
const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  assert(local(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url), 'Nonlocal server fetch blocked');
  return realFetch(input, init);
};
const app = initializeApp({ projectId: project, storageBucket: `${project}.appspot.com` });
const { getAdminDb } = await import('../api/_exam-core.js');
const db = getAdminDb();
const { issueWebHandoff, confirmWebHandoff } = await import('../api/_assistant-web-handoff.js');
const { default: classroom } = await import('../api/classroom.js');
const { createServer } = await import('vite');
const out = path.join(tmpdir(), 'zalo-student-emulator-qa');
await mkdir(out, { recursive: true });
const classId = 'qa-class', studentId = 'qa-student', teacherId = 'qa-teacher';
const assignmentId = 'qa-assignment', botId = 'qa-bot', userId = 'qa-chat', linkId = 'qa-link';
const description = 'Làm bài 1, 2, 3 trang 72 SGK. Dữ liệu kiểm thử.';
const batch = db.batch();
for (const [document, value] of Object.entries({
  [`classes/${classId}`]: { name: 'Lớp kiểm thử', teacherId, joinCode: 'TEST', grade: '10' },
  [`classes/${classId}/students/${studentId}`]: { name: 'Học sinh kiểm thử', code: 'QA01' },
  [`classes/${classId}/studentSecrets/${studentId}`]: { pinHash: 'synthetic-not-a-real-pin', updatedAt: '2026-11-06T00:00:00Z' },
  [`channelLinks/${linkId}`]: { active: true, channel: 'zalo_bot', channelAccountId: botId, channelUserId: userId, role: 'student', classId, studentId },
  [`assignments/${assignmentId}`]: { classId, teacherId, title: 'Bài kiểm thử cầu nối Zalo', description,
    type: 'upload', createdAt: '2026-11-06T00:00:00Z', isOpen: true, maxScore: 10, attachments: [] },
})) batch.set(db.doc(document), value);
await batch.commit();
const ticketUrl = await issueWebHandoff(db, botId, userId, 'student', classId, studentId, assignmentId);
const ticket = new URL(ticketUrl).hash.slice(5);
const ticketRef = db.doc(`assistantWebTickets/${createHash('sha256').update(ticket).digest('hex')}`);
const allowed = new Set(['beginBotWeb', 'redeemBotWeb', 'studentWorkspace', 'studentAssignmentDetail',
  'studentNotifications', 'studentScoreBook', 'studentAiCost', 'studentDiscoverCatalog', 'studentAdaptiveList', 'roster']);
const requests: Array<{ action: string; status: number }> = [];
const errors: string[] = [];
let lastToken = '', verifier = '';
async function call(body: Record<string, unknown>) {
  let status = 200, data: unknown;
  const response = {
    status(value: number) { status = value; return this; },
    json(value: unknown) { data = value; return this; }, setHeader() { return this; },
  };
  await classroom({ method: 'POST', body, headers: { origin }, query: {} } as any, response as any);
  return { status, data };
}
let server: Awaited<ReturnType<typeof createServer>> | undefined;
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
try {
  server = await createServer({ server: { host: '127.0.0.1', port: 3021, strictPort: true }, logLevel: 'error' });
  await server.listen();
  browser = await puppeteer.launch({ headless: true, executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--disable-background-networking'] });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 390, height: 844 });
  page.on('pageerror', error => errors.push(error instanceof Error ? error.message : String(error)));
  await page.setRequestInterception(true);
  page.on('request', async request => {
    try {
      const url = new URL(request.url());
      if (!local(url.href)) return await request.abort();
      if (!url.pathname.startsWith('/api/')) return await request.continue();
      assert.equal(url.pathname, '/api/classroom');
      assert.equal(request.method(), 'POST');
      const body = JSON.parse(request.postData() || '{}');
      assert(allowed.has(body.action), `Unapproved QA action: ${body.action}`);
      if (body.idToken) lastToken = body.idToken;
      if (body.verifier) verifier = body.verifier;
      const result = await call(body);
      requests.push({ action: body.action, status: result.status });
      await request.respond({ status: result.status, contentType: 'application/json', body: JSON.stringify(result.data) });
    } catch (error) { errors.push(error instanceof Error ? error.message : 'Request interception failed'); await request.abort().catch(() => {}); }
  });
  await page.goto(ticketUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.body.innerText.includes('Tiếp tục bằng bot'), { timeout: 60000 });
  console.log('QA student handoff mounted');
  assert.equal(requests.length, 0, 'GET/mount must not start or consume ticket');
  assert.equal((await ticketRef.get()).data()?.consumed, false);
  await page.$$eval('button', buttons => buttons.find(button => button.textContent?.trim() === 'Tiếp tục bằng bot')!.click());
  await page.waitForFunction(() => /mở web [a-f0-9]{12}/.test(document.body.innerText));
  const code = await page.evaluate(() => /mở web ([a-f0-9]{12})/.exec(document.body.innerText)![1]);
  assert.match((await confirmWebHandoff(db, botId, 'wrong-chat', `mở web ${code}`))!, /không hợp lệ/);
  assert.equal((await ticketRef.get()).data()?.confirmed, false);
  await page.waitForFunction(() => !!localStorage.length);
  await page.screenshot({ path: path.join(out, 'student-chat-confirm.png'), fullPage: true });
  assert.match((await confirmWebHandoff(db, botId, userId, `mở web ${code}`))!, /Đã xác nhận/);
  console.log('QA original-chat confirmation accepted');
  await page.waitForFunction(() => location.search.includes('assignment=qa-assignment'), { timeout: 30000 });
  await page.waitForFunction(text => document.body.innerText.includes(text), { timeout: 30000 }, description);
  console.log('QA actual student assignment opened');
  assert.equal(await page.$('input[type=password]'), null, 'Student must not need a PIN');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert(requests.some(item => item.action === 'studentWorkspace' && item.status === 200));
  assert(requests.some(item => item.action === 'studentAssignmentDetail' && item.status === 200));
  assert.equal((await ticketRef.get()).data()?.consumed, true);
  const links = await db.collection('studentLinks').get();
  assert.equal(links.size, 1);
  assert.equal(links.docs[0].data().studentId, studentId);
  assert.equal(links.docs[0].data().classId, classId);
  assert.equal((await call({ action: 'redeemBotWeb', ticket, verifier, idToken: lastToken })).status, 401, 'Consumed ticket must not replay');
  await page.screenshot({ path: path.join(out, 'student-assignment.png'), fullPage: true });
  await db.doc(`channelLinks/${linkId}`).update({ active: false });
  assert.equal((await call({ action: 'studentWorkspace', idToken: lastToken })).status, 403, 'Revoked bot link must deny API');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('input') !== null, { timeout: 20000 });
  assert.equal(await page.evaluate(text => document.body.innerText.includes(text), description), false, 'Revoked link must not reopen workspace');
  await page.screenshot({ path: path.join(out, 'student-revoked.png'), fullPage: true });
  assert.deepEqual(errors, [], 'Browser runtime / interception errors');
  console.log(JSON.stringify({ result: 'PASS', project, actual: ['Auth anonymous login', 'Firestore rules reads', 'handoff issue/begin/confirm/redeem', 'wrong-chat denial', 'one-use denial', 'classroom workspace/detail', 'public instructions without PIN', 'revoked API and reload denial'], apiRequests: requests.length, screenshots: out }));
} finally {
  await browser?.close();
  await server?.close();
  await db.terminate();
  await deleteApp(app);
  globalThis.fetch = realFetch;
}
