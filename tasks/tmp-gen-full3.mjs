import { readFileSync, writeFileSync } from 'node:fs';
let t = readFileSync('tasks/tmp-qa-aq-full2.cjs', 'utf8');
// bỏ bước gỡ (để REST kiểm doc còn tồn tại), thêm REST check
const oldTail = `  // 7. Gỡ khỏi TV
  await click(gv2, 'Gỡ khỏi TV');
  await sleep(7000);
  console.log('GV gỡ:', (await text(hp)).indexOf('Câu hỏi đã công bố') < 0 ? '✓ HS không còn thấy' : '✗');`;
const newTail = `  // 7. REST kiểm doc publishedQuestions (public read khi active)
  await sleep(3000);
  const res = await fetch('https://firestore.googleapis.com/v1/projects/smartplan-ai-14200/databases/(default)/documents/liveLessonSessions/' + sessionId + '/publishedQuestions');
  const json = await res.json();
  const docs = json.documents || [];
  console.log('REST publishedQuestions:', res.status, '| docs:', docs.length, docs.length ? '| fields: ' + Object.keys(docs[0].fields || {}).join(', ') : '');
  console.log('doc có định danh?', docs.length && JSON.stringify(docs[0].fields || {}).match(/participantUid|studentName|deviceId/i) ? '✗ CÓ' : '✓ KHÔNG');`;
if (!t.includes(oldTail)) throw new Error('tail anchor missing');
t = t.split(oldTail).join(newTail);
writeFileSync('tasks/tmp-qa-aq-full3.cjs', t, 'utf8');
console.log('written full3');
