// Diễn tập phòng kiểm tra bằng Chrome thật: giáo viên tải PDF, dán đáp án, tạo phòng; 5 học sinh vào bằng API và
// 1 học sinh thao tác thật trên khung điện thoại (chọn đáp án, chụp ảnh tự luận, nộp bài); giáo viên theo dõi, chấm
// tự luận, kết thúc và xem bảng điểm. In kết quả từng bước và dừng ngay khi có sai lệch.
//   node scripts/qa/exam-e2e.mjs <đường-dẫn-file-PDF-đề> [địa-chỉ-local] [đường-dẫn-chrome] [file-HDC]
// Mặc định: http://localhost:5173 (cần đang chạy `npm run dev`). Dùng danh tính giáo viên giả bằng header chỉ có
// tác dụng trên máy dev; không chạy trên bản phát hành thật.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';

const pdf = process.argv[2];
const base = process.argv[3] || 'http://localhost:5173';
const guide = process.argv[5] || 'C:/Users/ADMIN/Downloads/HDC_Cham_Diem_Thi_Thu_GHKI_Toan11_De01.pdf';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname)) throw new Error('Chỉ diễn tập trên máy local, không dùng dữ liệu giả trên site thật.');
const chrome =
  process.argv[4] ||
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
if (!pdf || !fs.existsSync(pdf)) throw new Error('Truyền đường dẫn file PDF đề làm tham số đầu tiên.');
if (!fs.existsSync(guide)) throw new Error('Không tìm thấy file hướng dẫn chấm; truyền tham số thứ năm.');
if (!chrome) throw new Error('Không tìm thấy Chrome.');

const port = 9500 + Math.floor(Math.random() * 400);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'exam-e2e-'));
const child = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=1280,1000', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function attach(page) {
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', rej);
  });
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) rej(new Error(msg.error.message));
      else res(msg.result);
    }
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; const timer = setTimeout(() => { pending.delete(i); rej(new Error('CDP timeout: ' + method)); }, 30000); pending.set(i, { res: value => { clearTimeout(timer); res(value); }, rej: error => { clearTimeout(timer); rej(error); } }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const click = (text) => evaluate(`(() => { const b = [...document.querySelectorAll('button, a, label')].find((x) => x.textContent.trim().includes(${JSON.stringify(text)})); if (b) b.click(); return !!b; })()`);
  const waitFor = async (expression, label, seconds = 60) => {
    for (let i = 0; i < seconds * 2; i++) {
      try {
        if (await evaluate(expression)) return;
      } catch {
        /* the page is still loading */
      }
      await sleep(500);
    }
    throw new Error('Quá thời gian chờ: ' + label);
  };
  const setFiles = async (selector, files) => {
    const doc = await send('DOM.getDocument', { depth: 1 });
    const node = await send('DOM.querySelector', { nodeId: doc.root.nodeId, selector });
    await send('DOM.setFileInputFiles', { nodeId: node.nodeId, files });
  };
  const fill = (selector, index, value) => evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})][${index}]; const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');
  return { send, evaluate, click, waitFor, setFiles, fill, errors };
}

async function tabs() {
  for (let i = 0; i < 60; i++) {
    try {
      return await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    } catch {
      await sleep(250);
    }
  }
  throw new Error('Không kết nối được Chrome.');
}

const step = (text) => console.log('✔', text);

try {
  const first = (await tabs()).find((t) => t.type === 'page');
  const t = await attach(first);
  await t.send('Network.enable');
  await t.send('Network.setExtraHTTPHeaders', { headers: { 'oai-authenticated-user-id': 'teacher-e2e', 'oai-authenticated-user-email': 'teacher-e2e@test.local' } });
  await t.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await t.send('Page.navigate', { url: base + '/exams' });
  await t.waitFor("document.body.innerText.includes('Phòng kiểm tra')", 'trang giáo viên');
  // the first click can arrive before the page is interactive, so click until the file chooser appears
  for (let i = 0; i < 30 && !(await t.evaluate("!!document.querySelector('input[type=file]')")); i++) {
    await t.click('Tạo bài kiểm tra từ file');
    await sleep(700);
  }
  await t.waitFor("!!document.querySelector('input[type=file]')", 'ô chọn file');
  await t.setFiles('input[type=file]', [pdf]);
  await t.waitFor("document.body.innerText.includes('Kiểm tra lại đề')", 'đọc PDF', 120);
  const count = await t.evaluate("document.querySelectorAll('.exam-qcard').length");
  const images = await t.evaluate("document.querySelectorAll('.exam-crop img').length");
  step(`đọc PDF: ${count} câu, ${images} hình`);
  assert.ok(count >= 10 && images === count, 'mỗi câu phải có hình');
  const firstImage = await t.evaluate("document.querySelector('.exam-crop img').src.split(',')[1]");
  const photoFile = path.join(profile, 'bai-lam.jpg');
  fs.writeFileSync(photoFile, Buffer.from(firstImage, 'base64'));

  await t.setFiles('input[aria-label="File hướng dẫn chấm"]', [guide]);
  await t.waitFor("document.querySelectorAll('[data-guide-review] tbody tr').length === 20", 'bảng rà soát HDC', 90);
  assert.ok(await t.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Tạo phòng kiểm tra').disabled"), 'chưa áp dụng guide thì không tạo phòng');
  assert.ok(await t.evaluate("document.querySelector('[data-guide-question=\"101_q1\"] textarea[aria-label^=\"Lời giải\"]').value.includes('chu kỳ')"));
  await t.evaluate("document.querySelector('[data-guide-question=\"101_q1\"] details').open = true; true");
  await t.evaluate("[...document.querySelectorAll('[data-guide-question=\"101_q1\"] button')].find(b=>b.textContent==='Cắt ảnh lời giải').click(); true");
  await t.waitFor("!!document.querySelector('[data-guide-question=\"101_q1\"] img[alt^=\"Ảnh lời giải mới\"]')", 'cắt ảnh lời giải');
  await t.evaluate("document.querySelector('[data-guide-question=\"101_q17\"] details').open = true; [...document.querySelectorAll('[data-guide-question=\"101_q17\"] button')].find(b=>b.textContent==='Cắt ảnh lời giải').click(); true");
  await t.waitFor("!!document.querySelector('[data-guide-question=\"101_q17\"] img[alt^=\"Ảnh lời giải mới\"]')", 'cắt lời giải tự luận');
  await t.evaluate("document.querySelector('[data-guide-question=\"101_q18\"] details').open = true; [...document.querySelectorAll('[data-guide-question=\"101_q18\"] button')].find(b=>b.textContent==='Cắt ảnh lời giải').click(); true");
  await t.waitFor("document.querySelectorAll('[data-guide-question=\"101_q18\"] img[alt^=\"Ảnh lời giải mới\"]').length === 2", 'cắt lời giải qua hai trang');
  await t.click('Áp dụng hướng dẫn chấm');
  await t.waitFor("document.querySelector('.exam-summary')?.innerText.includes('đã có đủ đáp án')", 'áp dụng đáp án HDC');
  step('HDC thật: rà soát 20 câu, cắt ảnh lời giải, áp dụng 16 đáp án');
  await t.click('Tạo phòng kiểm tra');
  await t.waitFor("!!document.querySelector('.exam-code-big')", 'tạo phòng', 90);
  const code = await t.evaluate("document.querySelector('.exam-code-big').innerText");
  const examId = await t.evaluate("new URL(location.href).searchParams.get('id')");
  assert.ok(examId, 'URL phòng chứa id');
  const teacherHeaders = { 'oai-authenticated-user-id': 'teacher-e2e', 'oai-authenticated-user-email': 'teacher-e2e@test.local' };
  const examData = await (await fetch(base + '/api/exams?id=' + examId, {headers:teacherHeaders})).json();
  const solutionId = examData.exam.questions[0].solutionImages[0]?.id;
  assert.ok(solutionId, 'ảnh giải được lưu');
  step('tạo phòng, mã ' + code);
  await t.click('Mở phòng cho học sinh vào');
  await t.waitFor("document.body.innerText.includes('Đang mở phòng')", 'mở phòng');

  const tokens = [];
  for (const [i, name] of ['An', 'Bình', 'Chi', 'Dũng', 'Giang'].entries()) {
    const r = await (await fetch(base + '/api/exam-play', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'join', code, name, mascot: i }) })).json();
    assert.ok(r.token, 'vào phòng ' + name);
    tokens.push({ name, token: r.token });
  }
  const dup = await fetch(base + '/api/exam-play', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'join', code, name: 'an' }) });
  assert.equal(dup.status, 409, 'trùng tên phải bị từ chối');
  step('5 học sinh vào phòng bằng API; tên trùng bị từ chối');

  await fetch(`http://127.0.0.1:${port}/json/new?${base}/exam?code=${code}`, { method: 'PUT' });
  const pupilTab = (await tabs()).find((x) => x.type === 'page' && x.url.includes('/exam?code='));
  const s = await attach(pupilTab);
  await s.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await s.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await s.send('Page.navigate', { url: base + '/exam?code=' + code });
  await s.waitFor("document.querySelectorAll('input.lesson-input').length >= 2", 'màn vào phòng');
  await s.fill('input.lesson-input', 1, 'Thảo Nguyên');
  await s.click('Rồng');
  await s.click('Vào phòng');
  await s.waitFor("document.body.innerText.includes('Em đã vào phòng')", 'học sinh vào phòng');
  await t.waitFor("document.querySelectorAll('.exam-table tbody tr').length === 6", 'giáo viên thấy 6 học sinh');
  step('giáo viên thấy 6 học sinh (1 em thao tác thật trên khung điện thoại)');

  // starting without anything missing needs no confirmation
  await t.click('Bắt đầu tính giờ');
  await s.waitFor("!!document.querySelector('.exam-option')", 'bắt đầu thi');
  step('bắt đầu: học sinh thấy câu hỏi và đồng hồ');
  const wire = await (await fetch(base + '/api/exam-play', { headers: { authorization: 'Bearer ' + tokens[0].token } })).text();
  assert.ok(!/"key"|accept/.test(wire), 'đáp án không được lọt xuống học sinh');
  step('đáp án không có trong dữ liệu gửi cho học sinh');

  const answer = (token, qid, value, seq = 1) => fetch(base + '/api/exam-play', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify({ action: 'answer', qid, value, seq }) });
  for (const p of tokens) {
    await answer(p.token, '101_q1', p.name === 'An' ? 'C' : 'A');
    await answer(p.token, '101_q2', 'B');
    await answer(p.token, '101_q13', [true, true, true, false]);
    await answer(p.token, '101_q14', [true, true, true, true]);
  }
  await s.evaluate("[...document.querySelectorAll('.exam-option')].find((b) => b.textContent.trim() === 'C').click(); true");
  await s.waitFor("document.querySelector('.exam-save')?.innerText.includes('Đã lưu')", 'lưu câu 1');
  step('chọn đáp án: hiện "Đã lưu"');

  // an essay with a photo
  await s.click('Bảng câu');
  await s.evaluate("[...document.querySelectorAll('.exam-station')].find((b) => b.getAttribute('aria-label')?.startsWith('Bài 1'))?.click(); true");
  await s.waitFor("!!document.querySelector('.exam-add-photo input')", 'câu tự luận');
  await s.setFiles('.exam-add-photo input', [photoFile]);
  await s.waitFor("document.querySelectorAll('.exam-thumb').length === 1", 'ảnh bài làm', 40);
  step('chụp ảnh bài tự luận: ảnh đã gửi');

  await t.waitFor("[...document.querySelectorAll('.exam-table tbody tr')].some((r) => r.innerText.includes('Thảo Nguyên') && r.innerText.includes('1 ảnh'))", 'giáo viên thấy ảnh', 30);
  step('giáo viên thấy học sinh đã gửi ảnh');

  await s.click('Nộp bài');
  await s.waitFor("!!document.querySelector('.exam-modal')", 'hộp xác nhận');
  await s.evaluate("[...document.querySelectorAll('.exam-modal-actions button')].find((b) => b.textContent.includes('Nộp bài')).click(); true");
  await s.waitFor("document.body.innerText.includes('Em đã nộp bài')", 'nộp bài');
  const pupilToken = await s.evaluate("JSON.parse(localStorage.getItem('exam-session')).token");
  const state = async () => (await fetch(base + '/api/exam-play', {headers:{authorization:'Bearer ' + pupilToken}})).json();
  const early = await state();
  assert.equal(early.exam.status, 'running');
  assert.equal(early.review, undefined);
  assert.equal(early.result.sections, undefined);
  assert.ok(!/\"key\"|\"solution\"|\"rubric\"|\"solutionImages\"/.test(JSON.stringify(early)), 'nộp sớm không nhận lời giải');
  const protectedSolution = await fetch(base + '/api/exam-play?solution=' + solutionId, {headers:{authorization:'Bearer ' + pupilToken}});
  assert.equal(protectedSolution.status, 404, 'ảnh lời giải khóa khi phòng còn chạy');
  assert.ok(await s.evaluate("document.body.innerText.includes('Lời giải sẽ mở khi phòng kết thúc.')"));
  step('học sinh nộp bài và thấy điểm tạm thời');

  // Word import is staged too: cancel it without changing the published guide or the pupil's score.
  await t.click('Đề và đáp án');
  const wordFile = path.join(profile, 'huong-dan-cham.docx');
  fs.writeFileSync(wordFile, zipSync({
    '[Content_Types].xml': strToU8('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
    'word/document.xml': strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + ['PHẦN I. Trắc nghiệm','Câu 1: C','Lời giải Word được rà soát.','PHẦN III. Tự luận','Bài 1. Lời giải mẫu','Nhận xét (0,25đ)'].map(text=>'<w:p><w:r><w:t>'+text+'</w:t></w:r></w:p>').join('') + '</w:body></w:document>'),
  }));
  await t.setFiles('input[aria-label="File hướng dẫn chấm"]', [wordFile]);
  await t.waitFor("document.querySelector('[data-guide-review]') && document.querySelector('[data-guide-question=\"101_q1\"] textarea[aria-label^=\"Lời giải\"]').value.includes('Word')", 'HDC Word được trích và rà soát');
  assert.ok(await t.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Lưu thay đổi').disabled"));
  await t.click('Hủy hướng dẫn chấm');
  assert.equal((await state()).review, undefined);
  step('hướng dẫn Word được trích/rà soát; hủy giữ HDC cũ, không lưu ngầm');

  await t.evaluate('window.confirm = () => true; true');
  await t.click('Kết thúc');
  await t.waitFor("document.body.innerText.includes('Đã kết thúc')", 'kết thúc');
  await s.waitFor("document.body.innerText.includes('Trạm lời giải')", 'phòng đóng tự mở lời giải, không reload', 30);
  await s.evaluate("[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Xem lại Câu 1').click(); true");
  await s.waitFor("!!document.querySelector('img[alt=\"Ảnh lời giải 1\"]')", 'ảnh lời giải mở');
  assert.equal((await fetch(base + '/api/exam-play?solution=' + solutionId, {headers:{authorization:'Bearer ' + pupilToken}})).status, 200);
  await s.evaluate("[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Xem lại Bài 1').click(); true");
  await s.waitFor("document.body.innerText.includes('Đang chờ giáo viên chấm')", 'bài tự luận chờ chấm');
  await s.waitFor("!!document.querySelector('img[alt=\"Ảnh lời giải 1\"]')", 'ảnh lời giải tự luận');
  step('đóng phòng: lưới lời giải mở tự động, ảnh giải tải được, tự luận chờ chấm');

  await t.evaluate('window.confirm = () => true; true');
  await t.click('Chấm tự luận');
  await t.waitFor("[...document.querySelectorAll('.exam-pick button')].some((b) => b.innerText.includes('Thảo Nguyên'))", 'danh sách chấm', 30);
  await t.evaluate("[...document.querySelectorAll('.exam-pick button')].find((b) => b.innerText.includes('Thảo Nguyên')).click(); true");
  await t.waitFor("document.querySelectorAll('.exam-shots img').length >= 1", 'ảnh bài làm hiện cho giáo viên', 30);
  await t.fill('.exam-score-row input', 0, '0,5');
  await t.fill('[data-essay-mark=\"101_q17\"] textarea[aria-label^="Nhận xét"]', 0, 'Cần nêu điều kiện xác định.');
  await t.click('Lưu điểm và nhận xét');
  await t.waitFor("document.body.innerText.includes('Đã lưu điểm')", 'lưu điểm tự luận');
  step('giáo viên xem ảnh và chấm tự luận');
  await s.waitFor("document.body.innerText.includes('Cần nêu điều kiện xác định.')", 'nhận xét tự cập nhật cho học sinh', 30);
  const graded = await state();
  assert.equal(graded.review.manual['101_q17'], 0.5);
  assert.equal(graded.review.comments['101_q17'], 'Cần nêu điều kiện xác định.');
  fs.mkdirSync('tasks/qa-exam-solutions', {recursive:true});
  for (const [name, tab, selector] of [['teacher-marking',t,'[data-essay-mark=\"101_q17\"]'],['pupil-essay-review',s,'.exam-review-question'],['pupil-solution-image',s,'.exam-review-solution img']]) {
    await tab.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'start'}); true`);
    const shot = await tab.send('Page.captureScreenshot', {format:'png'});
    fs.writeFileSync('tasks/qa-exam-solutions/' + name + '.png', Buffer.from(shot.data, 'base64'));
  }
  await t.click('Kết quả');
  await t.waitFor("document.querySelectorAll('.exam-table tbody tr').length === 6", 'bảng điểm');
  const rows = await t.evaluate("[...document.querySelectorAll('.exam-table tbody tr')].map((r) => r.innerText.split(String.fromCharCode(10)).join(' '))");
  const an = rows.find((r) => r.includes('An'));
  assert.match(an, /2 \/ 10/, 'điểm của An phải là 2/10: ' + an);
  const thao = rows.find((r) => r.includes('Thảo Nguyên'));
  assert.match(thao, /0,75 \/ 10/, 'điểm của Thảo Nguyên phải là 0,75 (câu 1 đúng 0,25 + tự luận 0,5): ' + thao);
  step('bảng điểm đúng: ' + an.replace(/\s+/g, ' ') + ' | ' + thao.replace(/\s+/g, ' '));
  fs.mkdirSync('tasks/qa-exam-solutions', {recursive:true});
  for (const [name, tab] of [['teacher-results',t],['pupil-review',s]]) {
    await tab.evaluate("document.querySelectorAll('.exam-review-pin code').forEach(el=>el.style.filter='blur(8px)');true");
    const shot = await tab.send('Page.captureScreenshot', {format:'png'});
    fs.writeFileSync('tasks/qa-exam-solutions/' + name + '.png', Buffer.from(shot.data, 'base64'));
    assert.equal(await tab.evaluate('document.documentElement.scrollWidth <= innerWidth'), true, name + ' không tràn ngang');
    assert.deepEqual(tab.errors, [], name + ' không có lỗi runtime');
  }
  await t.click('Đề và đáp án');
  const editedSolution = 'Lời giải đã kiểm tra: $u_n = u_1 + (n-1)d$.';
  await t.fill('[data-solution-editor=\"101_q1\"] textarea', 0, editedSolution);
  await sleep(3000); // the room polls every few seconds; the unsaved draft must survive it
  assert.equal(await t.evaluate("document.querySelector('[data-solution-editor=\"101_q1\"] textarea').value"), editedSolution);
  await t.evaluate("const select=document.querySelector('select[aria-label=\"Lời giải cho học sinh\"]'); select.value='none'; select.dispatchEvent(new Event('change',{bubbles:true})); true");
  await t.click('Lưu thay đổi');
  await t.waitFor("document.body.innerText.includes('Đã lưu đáp án, lời giải và cài đặt.')", 'lưu bản nháp và chính sách');
  await s.waitFor("document.body.innerText.includes('Thầy/cô không mở lời giải cho phòng này.')", 'chính sách none đóng màn xem lại', 30);
  assert.equal((await state()).review, undefined);
  assert.equal((await fetch(base + '/api/exam-play?solution=' + solutionId, {headers:{authorization:'Bearer ' + pupilToken}})).status, 404);
  const savedExam = await (await fetch(base + '/api/exams?id=' + examId, {headers:teacherHeaders})).json();
  assert.equal(savedExam.exam.questions[0].solution, editedSolution);
  step('bản nháp giữ qua polling; lưu chính sách none chặn cả màn xem và ảnh giải');
  await s.click('Thoát');
  assert.equal(await s.evaluate("JSON.parse(localStorage.getItem('exam-session')).token") === pupilToken, true, 'Thoát sau thi giữ mã phiên để xem tại nhà');
  await s.send('Page.navigate', {url:base + '/exam?code=' + code});
  await s.waitFor("document.body.innerText.includes('Thầy/cô không mở lời giải cho phòng này.')", 'mở lại đúng phiên trên cùng thiết bị');
  step('thoát rồi mở lại giữ đúng bài làm và mã phiên học sinh');
  console.log('\nTất cả các bước đều đạt.');
} catch (error) {
  console.error('\n✘ Thất bại:', error.message);
  process.exitCode = 1;
} finally {
  child.kill();
}
