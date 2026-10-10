import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

test('late image callback stays with its question after an earlier question is removed', () => {
  const source = fs.readFileSync(new URL('../components/exam/ExamImport.tsx', import.meta.url), 'utf8');
  const line = source.split(/\r?\n/).find((text) => text.includes('const patch = '));
  let draft = { questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }] };
  const executable = line.trim().replace(/\((i|qid): (number|string), change: Partial<DraftQuestion>\)/, '($1, change)').replace('const patch = ', '').replace(/;$/, '');
  const patch = vm.runInNewContext(executable, { setDraft: (update) => { draft = update(draft); } });
  const readingQuestion = 'q2';
  const callback = /<SolutionEditor q=\{q\}[^\n]*onChange=\{\(change\) => patch\(([^,]+)/.exec(source);
  const target = vm.runInNewContext(callback[1], { q: { id: readingQuestion }, i: 1 });
  draft = { ...draft, questions: draft.questions.filter((question) => question.id !== 'q1') };
  patch(target, { solutionUploads: [{ id: 'new-image' }] });
  assert.equal(draft.questions.find((question) => question.solutionUploads?.length)?.id, readingQuestion);
});

test('question removal stays disabled during image, guide or crop staging', () => {
  const source = fs.readFileSync(new URL('../components/exam/ExamImport.tsx', import.meta.url), 'utf8');
  const line = source.split(/\r?\n/).find((text) => text.includes('title="Bỏ câu này'));
  const expression = /disabled=\{(.*?)\} onClick/.exec(line)[1];
  const disabled = (values) => vm.runInNewContext(expression, { createdId: '', guidePending: false, imageReaders: 0, draft: { questions: [{ busy: false }] }, ...values });
  assert.equal(disabled({}), false);
  assert.equal(disabled({ imageReaders: 1 }), true);
  assert.equal(disabled({ guidePending: true }), true);
  assert.equal(disabled({ draft: { questions: [{ busy: true }] } }), true);
});

test('recrop prevents replacing the file or creating a room from a stale image', () => {
  const source = fs.readFileSync(new URL('../components/exam/ExamImport.tsx', import.meta.url), 'utf8');
  const lines = source.split(/\r?\n/);
  const replace = lines.find((text) => text.includes('>Chọn file khác</button>'));
  const create = lines.find((text) => text.includes('onClick={() => void create()}'));
  const context = { stage: 'review', guidePending: false, imageReaders: 0, draft: { questions: [{ busy: true }] } };
  assert.equal(vm.runInNewContext(/disabled=\{(.*?)\}>Chọn file khác/.exec(replace)[1], context), true);
  assert.equal(vm.runInNewContext(/disabled=\{(.*?)\} onClick/.exec(create)[1], context), true);
});

test('rubric step buttons exclude question and total headings', () => {
  const source = fs.readFileSync(new URL('../components/exam/ExamTeacher.tsx', import.meta.url), 'utf8');
  const prefix = /q\.rubric\?\.split\([^\n]+\.map\(\(line, index\) => \{([\s\S]*?)return <button/.exec(source)[1];
  const eligible = vm.runInNewContext('(line, q) => {' + prefix + 'return true;}');
  assert.equal(eligible('Chọn đúng công thức (0,25đ)', { points: 1 }), true);
  assert.equal(eligible('Bài 1 – Tính giới hạn (0,50điểm)', { points: 1 }), null);
  assert.equal(eligible('Câu 1 (0,50đ)', { points: 1 }), null);
  assert.equal(eligible('Tổng (1đ)', { points: 1 }), null);
});

test('failed recrop keeps the previous image and clears busy', async () => {
  const source = fs.readFileSync(new URL('../components/exam/ExamImport.tsx', import.meta.url), 'utf8');
  const body = /const nudge = async \(i: number, edge: "top" \| "bottom", delta: number\) => \{([\s\S]*?)\n  \};/.exec(source)[1];
  const question = { id: 'q1', image: 'previous-image', regions: [{ page: 1, top: 5, bottom: 100 }] };
  let error = '';
  const nudge = vm.runInNewContext('(async (i, edge, delta) => {' + body + '})', {
    draft: { questions: [question] },
    pdf: { current: { crop: async () => { throw new Error('render-failed'); } } },
    patch: (qid, change) => { assert.equal(qid, question.id); Object.assign(question, change); },
    setError: (message) => { error = message; },
    messageFor: () => 'Không cắt được ảnh. Thử lại.',
  });
  await nudge(0, 'top', 8);
  assert.equal(question.busy, false);
  assert.equal(question.image, 'previous-image');
  assert.ok(error);
});

test('Word guide extraction warnings accept lists without inventing an empty warning count', () => {
  const source = fs.readFileSync(new URL('../components/exam/GuideImport.tsx', import.meta.url), 'utf8');
  const start = source.indexOf('if (Array.isArray(result.warnings))');
  const statement = source.slice(start, source.indexOf('\n      } else if', start));
  const run = (warnings) => { const extractionWarnings = []; vm.runInNewContext(statement, { result: { warnings }, extractionWarnings }); return extractionWarnings; };
  assert.deepEqual(run([]), []);
  assert.deepEqual(run(['Kiểm tra công thức.']), ['Kiểm tra công thức.']);
  assert.equal(run(2).length, 1);
  assert.deepEqual(run(Infinity), []);
});

test('removed questions compact code IDs before JSON and image upload snapshots', () => {
  const source = fs.readFileSync(new URL('../components/exam/ExamImport.tsx', import.meta.url), 'utf8');
  const lines = source.split(/\r?\n/);
  const expression = lines.find((line) => line.includes('const compactCodes = ')).trim().replace('const compactCodes = ', '').replace(/;$/, '');
  const codes = [{ code: '101', questions: [{ id: '101_q2', image: 'picture-two' }, { id: '101_q3', image: 'picture-three' }] }];
  const compactCodes = vm.runInNewContext(expression, { allCodes: codes });
  assert.equal(compactCodes[0].questions[0].id, '101_q1');
  assert.equal(compactCodes[0].questions[0].image, 'picture-two');
  assert.match(lines.find((line) => line.includes('const codes = ')), /compactCodes\.map/);
  assert.match(lines.find((line) => line.includes('const flatQuestions = ')), /compactCodes\.flatMap/);
});

test('room start and open cannot use an older paper while a draft is staged', () => {
  const source = fs.readFileSync(new URL('../components/exam/ExamTeacher.tsx', import.meta.url), 'utf8');
  const lines = source.split(/\r?\n/);
  const expression = lines.find((line) => line.includes('const staged = ')).trim().replace('const staged = ', '').replace(/;$/, '');
  const pending = vm.runInNewContext(expression, { dirty: false, guidePending: false, variantPending: true, imageReaders: 0, importing: null });
  for (const label of ['Mở phòng cho học sinh vào', 'Bắt đầu tính giờ']) {
    const line = lines.find((text) => text.includes(label) && text.includes('disabled='));
    assert.equal(vm.runInNewContext(/disabled=\{(.*?)\}/.exec(line)[1], { busy: false, staged: pending }), true);
  }
});

test('room deletion names the room and attempt count; running and staged rooms cannot delete', () => {
  const source=fs.readFileSync(new URL('../components/exam/ExamTeacher.tsx',import.meta.url),'utf8');
  const block=/data-delete-exam[\s\S]*?>Xóa phòng<\/button>/.exec(source)?.[0];
  assert.ok(block);
  assert.match(block,/exam\.title/);
  assert.match(block,/data\.attempts\.length/);
  assert.match(block,/confirmTitle:\s*exam\.title/);
  assert.match(block,/confirmAttempts:\s*data\.attempts\.length/);
  assert.match(block,/disabled=\{busy \|\| staged \|\| exam\.status === "running"\}/);
});

test('next exam code stays three digits when an existing code is 999', () => {
  const source = fs.readFileSync(new URL('../components/exam/VariantEditor.tsx', import.meta.url), 'utf8');
  const line = source.split(/\r?\n/).find((text) => text.includes('export const nextExamCode = '));
  const expression = line.trim().replace('export const nextExamCode = ', '').replace('(codes: Array<{ code: string }>)', '(codes)').replace(/;$/, '');
  const next = vm.runInNewContext(expression);
  assert.equal(next([{ code: '101' }, { code: '999' }]), '102');
  assert.equal(next(Array.from({ length: 899 }, (_, index) => ({ code: String(index + 101) }))), '');
});

test('student progress uses the assigned code question count and clamps the bar', () => {
  const source = fs.readFileSync(new URL('../components/exam/ExamTeacher.tsx', import.meta.url), 'utf8');
  const progress = source.split(/\r?\n/).find((line) => line.includes('exam-bar-mini'));
  const denominator = /\{a\.answered\}\/\{([^}]+)\}/.exec(progress)[1];
  const width = /width: (.*?) \}\}/.exec(progress)[1];
  const countLine = source.split(/\r?\n/).find((line) => line.includes('const attemptQuestionCount = '));
  const countExpression = countLine?.trim().replace('const attemptQuestionCount = ', '').replace(/;$/, '');
  const evaluate = (answered) => {
    const context = { a: { examCode: '102', answered }, exam: { questions: Array(10).fill({}) }, serverCodes: [{ code: '101', questions: Array(10).fill({}) }, { code: '102', questions: Array(15).fill({}) }] };
    if (countExpression) context.attemptQuestionCount = vm.runInNewContext(countExpression, context);
    return { count: vm.runInNewContext(denominator, context), width: vm.runInNewContext(width, context) };
  };
  assert.deepEqual(evaluate(12), { count: 15, width: '80%' });
  assert.equal(evaluate(30).width, '100%');
});
