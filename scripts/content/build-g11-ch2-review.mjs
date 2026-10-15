// Gói bài "Ôn tập chương II — Dãy số, cấp số cộng, cấp số nhân" (Toán 11 KNTT, PPCT tds-g11-50/51, 80 phút).
// Câu hỏi do Claude soạn mới (không chép SGK); số liệu đã tự kiểm, để draft cho GV duyệt.
// Chạy: node scripts/content/build-g11-ch2-review.mjs  → content/lessons/g11-ch2-review.json
import { writeFile } from 'node:fs/promises';
import { hashPackage } from '../../lib/lesson/schema.js';
import { validateLessonPackage } from '../../lib/lesson/validate.js';

const R = String.raw;
const SRC = ['src-sgk-g11-ch2'];
const O = { mono: 'obj-t11-20', cscTerm: 'obj-t11-22', cscSum: 'obj-t11-23', csnTerm: 'obj-t11-26', csnSum: 'obj-t11-27', real: 'obj-t11-28' };

const objectives = [
  { id: O.mono, code: 'T11.20', level: 'should', statement: 'Nhận biết được tính chất tăng, giảm, bị chặn của dãy số trong những trường hợp đơn giản.', prerequisiteIds: [] },
  { id: O.cscTerm, code: 'T11.22', level: 'must', statement: 'Nhận biết cấp số cộng và dùng công thức số hạng tổng quát $u_n=u_1+(n-1)d$ (gộp T11.21–T11.22).', prerequisiteIds: [] },
  { id: O.cscSum, code: 'T11.23', level: 'must', statement: 'Tính được tổng $n$ số hạng đầu tiên của cấp số cộng.', prerequisiteIds: [O.cscTerm] },
  { id: O.csnTerm, code: 'T11.26', level: 'must', statement: 'Nhận biết cấp số nhân và dùng công thức số hạng tổng quát $u_n=u_1q^{n-1}$ (gộp T11.25–T11.26).', prerequisiteIds: [] },
  { id: O.csnSum, code: 'T11.27', level: 'should', statement: 'Tính được tổng $n$ số hạng đầu tiên của cấp số nhân.', prerequisiteIds: [O.csnTerm] },
  { id: O.real, code: 'T11.28', level: 'could', statement: 'Giải quyết một số vấn đề thực tiễn gắn với cấp số cộng, cấp số nhân (gộp T11.24, T11.28).', prerequisiteIds: [O.cscSum, O.csnSum] },
];

const tasks = [], hints = [], evidenceRules = [];
const choice = (options, answer) => ({ inputSchema: { options: options.map(([id, label]) => ({ id, label })) }, evaluation: { checkerId: 'choice_exact', options: options.map(([id]) => id), answerKey: answer } });
const numeric = answer => ({ evaluation: { checkerId: 'numeric_exact', answerKey: answer } });
const rubric = (criteria, lookFor) => ({ evaluation: { rubric: { criteria, lookFor } } });
function task(activityId, id, { type = 'closed', objectiveIds, participation = 'individual', branch = 'shared', prompt, minutes, why, hint, evidence, isCore = branch !== 'support' && branch !== 'extension', ...rest }) {
  const hintId = 'hint-' + id.replace(/^task-/, '');
  hints.push({ id: hintId, tier: 'H1', text: hint, taskId: id, objectiveIds, order: 1, notAnswer: true, penalty: { time: 0, score: 0, freeze: 0 }, supportRationale: why });
  const evidenceIds = [];
  if (evidence) { const ev = { id: 'ev-' + id.replace(/^task-/, ''), objectiveIds: evidence.objectiveIds || objectiveIds, individual: evidence.kind !== 'group_product', countsForMastery: ['individual_recheck', 'exit'].includes(evidence.kind), taskId: id, kind: evidence.kind }; evidenceRules.push(ev); evidenceIds.push(ev.id); }
  tasks.push({ id, type, objectiveIds, activityId, participation, prompt, sourceRefs: SRC, evidenceIds, ...rest, isCore, requiresFullScaffold: false, supportRationale: why, minutes, hintIds: [hintId], branch });
  return id;
}
const all = Object.values(O);
const activities = [];
function activity(id, phase, minutes, participation, objectiveIds, taskIds, text, budgetRole = 'core') {
  const own = tasks.filter(t => taskIds.includes(t.id));
  activities.push({ id, phase, budgetRole, minutes, objectiveIds, taskIds, participation, studentAction: text.action, expectedProduct: text.product, evidenceIds: own.flatMap(t => t.evidenceIds), teacherLookFor: text.look, supportIds: own.flatMap(t => t.hintIds), transition: text.next });
}

// 1. Khởi động cả lớp (4')
activity('act-exp', 'experience', 4, 'whole_class', [O.cscTerm, O.csnTerm], [
  task('act-exp', 'task-exp-classify', { objectiveIds: [O.cscTerm, O.csnTerm], participation: 'whole_class', minutes: 4,
    prompt: R`Ba dãy số: (A) $3, 7, 11, 15, \dots$; (B) $2, 6, 18, 54, \dots$; (C) $1, 4, 9, 16, \dots$. Dãy nào là cấp số nhân?`,
    ...choice([['opt_a', 'Dãy (A)'], ['opt_b', 'Dãy (B)'], ['opt_c', 'Dãy (C)']], 'opt_b'),
    why: 'Dãy (B) có tỉ số hai số hạng liên tiếp luôn bằng 3; (A) là cấp số cộng công sai 4; (C) là dãy bình phương, không phải cấp số.',
    hint: 'Thử chia mỗi số hạng cho số hạng đứng trước nó: tỉ số có giữ nguyên không?', evidence: { kind: 'precheck' } }),
], { action: 'Cả lớp nhận dạng nhanh cấp số cộng, cấp số nhân trên TV.', product: 'Lựa chọn và lý do ngắn.', look: 'Em nào còn nhầm hiệu với tỉ số.', next: 'Chuyển sang kiểm tra nền tảng cá nhân.' });

// 2. Kiểm tra đầu giờ cá nhân (8')
activity('act-pre', 'guided', 8, 'individual', all, [
  task('act-pre', 'task-pre-mono', { objectiveIds: [O.mono], minutes: 2, prompt: R`Dãy số $u_n=\dfrac{n}{n+1}$ là dãy số:`,
    ...choice([['opt_inc', 'Tăng'], ['opt_dec', 'Giảm'], ['opt_none', 'Không tăng, không giảm']], 'opt_inc'),
    why: R`$u_{n+1}-u_n=\dfrac{1}{(n+1)(n+2)}>0$ với mọi $n\ge 1$ nên dãy tăng.`, hint: R`Xét dấu của hiệu $u_{n+1}-u_n$.`, evidence: { kind: 'precheck' } }),
  task('act-pre', 'task-pre-csc', { objectiveIds: [O.cscTerm, O.cscSum], minutes: 2, prompt: R`Cấp số cộng có $u_1=2$ và công sai $d=3$. Tính $u_{10}$.`, ...numeric(29),
    why: R`$u_{10}=u_1+9d=2+27=29$.`, hint: R`Dùng $u_n=u_1+(n-1)d$ với $n=10$.`, evidence: { kind: 'precheck' } }),
  task('act-pre', 'task-pre-csn', { objectiveIds: [O.csnTerm, O.csnSum], minutes: 2, prompt: R`Cấp số nhân có $u_1=3$ và công bội $q=2$. Tính $u_5$.`, ...numeric(48),
    why: R`$u_5=u_1q^4=3\cdot 16=48$.`, hint: R`Dùng $u_n=u_1q^{n-1}$ với $n=5$.`, evidence: { kind: 'precheck' } }),
  task('act-pre', 'task-pre-real', { objectiveIds: [O.real], minutes: 2, prompt: 'Lương khởi điểm của một kỹ sư là 8 triệu đồng/tháng; mỗi năm lương tháng tăng thêm 0,5 triệu đồng. Năm thứ 5 lương tháng là bao nhiêu triệu đồng?', ...numeric(10),
    why: 'Lương tháng các năm lập cấp số cộng $u_1=8$, $d=0{,}5$; $u_5=8+4\\cdot 0{,}5=10$.', hint: 'Năm thứ 5 cách năm đầu 4 lần tăng lương.', evidence: { kind: 'precheck' } }),
], { action: 'Mỗi em làm 4 câu nền tảng, không trao đổi.', product: 'Đáp án 4 câu.', look: 'Nhóm em sai câu số hạng tổng quát để kèm ở trạm luyện tập.', next: 'Chia nhóm hệ thống hóa công thức.' });

// 3. Hệ thống hóa công thức theo nhóm (8')
activity('act-form', 'formation', 8, 'group', [O.cscTerm, O.cscSum, O.csnTerm, O.csnSum], [
  task('act-form', 'task-form-formulas', { objectiveIds: [O.cscTerm, O.cscSum, O.csnTerm, O.csnSum], participation: 'group', minutes: 8,
    prompt: 'Nhóm em ghép mỗi ô với công thức đúng để lập bảng hệ thống chương II.',
    inputSchema: { representations: [
      { id: 'rep_csc_term', label: 'Cấp số cộng: số hạng tổng quát' }, { id: 'rep_csc_sum', label: 'Cấp số cộng: tổng $n$ số hạng đầu' },
      { id: 'rep_csn_term', label: 'Cấp số nhân: số hạng tổng quát' }, { id: 'rep_csn_sum', label: R`Cấp số nhân: tổng $n$ số hạng đầu ($q\ne 1$)` }],
      cards: [
        { id: 'card_csc_term', label: R`$u_n=u_1+(n-1)d$` }, { id: 'card_csc_sum', label: R`$S_n=\dfrac{n(u_1+u_n)}{2}$` },
        { id: 'card_csn_term', label: R`$u_n=u_1q^{n-1}$` }, { id: 'card_csn_sum', label: R`$S_n=\dfrac{u_1(1-q^n)}{1-q}$` }] },
    evaluation: { checkerId: 'representation_match', answerKey: { rep_csc_term: 'card_csc_term', rep_csc_sum: 'card_csc_sum', rep_csn_term: 'card_csn_term', rep_csn_sum: 'card_csn_sum' } },
    why: 'Bảng bốn công thức là khung để giải mọi trạm sau.', hint: 'Cấp số cộng đi bằng phép cộng (có $d$); cấp số nhân đi bằng phép nhân (có lũy thừa của $q$).', evidence: { kind: 'group_product' } }),
], { action: 'Nhóm ghép công thức, mỗi em giải thích một ô cho bạn.', product: 'Bảng hệ thống 4 công thức.', look: 'Nhóm lẫn công thức tổng CSC và CSN.', next: 'Vào các trạm luyện tập theo 3 mức.' });

// 4. Luyện tập theo 3 mức
const lanes = (act, base, items) => items.map(([branch, spec]) => task(act, `task-${base}-${branch}`, { branch, ...spec }));
activity('act-prac-mono', 'practice', 6, 'individual', [O.mono], lanes('act-prac-mono', 'mono', [
  ['support', { objectiveIds: [O.mono], minutes: 4, prompt: R`Mức 1: Cho $u_n=2n+1$. Tính hiệu $u_{n+1}-u_n$.`, ...numeric(2), why: R`$u_{n+1}-u_n=2(n+1)+1-(2n+1)=2$.`, hint: R`Thay $n$ bởi $n+1$ rồi trừ đi $u_n$.` }],
  ['core', { objectiveIds: [O.mono], minutes: 6, prompt: R`Mức 2: Với dãy $u_n=\dfrac{2n+1}{n+2}$, khẳng định nào đúng?`,
    ...choice([['opt_inc_bounded', 'Dãy tăng và bị chặn'], ['opt_dec_bounded', 'Dãy giảm và bị chặn'], ['opt_inc_unbounded', 'Dãy tăng và không bị chặn trên']], 'opt_inc_bounded'),
    why: R`$u_n=2-\dfrac{3}{n+2}$ tăng theo $n$ và $1\le u_n<2$.`, hint: R`Viết $u_n=2-\dfrac{3}{n+2}$ rồi xét khi $n$ tăng.`, evidence: { kind: 'individual_reasoning' } }],
  ['extension', { objectiveIds: [O.mono], minutes: 6, prompt: R`Mức 3: Với $u_n=\dfrac{2n+1}{n+2}$, tìm số nguyên dương $n$ nhỏ nhất để $u_n>1{,}9$.`, ...numeric(29),
    why: R`$2-\dfrac{3}{n+2}>1{,}9\iff n+2>30\iff n>28$, nên $n=29$.`, hint: R`Dùng $u_n=2-\dfrac{3}{n+2}$ và giải bất phương trình theo $n$.` }],
]), { action: 'Mỗi em chọn mức phù hợp; có thể đổi mức.', product: 'Kết luận tăng/giảm, bị chặn có lập luận.', look: 'Em kết luận từ vài số hạng đầu mà không xét hiệu.', next: 'Sang trạm cấp số cộng.' });

activity('act-prac-csc', 'practice', 10, 'individual', [O.cscTerm, O.cscSum], lanes('act-prac-csc', 'csc', [
  ['support', { objectiveIds: [O.cscTerm], minutes: 4, prompt: R`Mức 1: Cấp số cộng có $u_1=5$, $u_2=8$. Tìm công sai $d$.`, ...numeric(3), why: '$d=u_2-u_1=3$.', hint: 'Công sai là hiệu của hai số hạng liên tiếp.' }],
  ['core', { objectiveIds: [O.cscTerm, O.cscSum], minutes: 6, prompt: R`Mức 2: Cấp số cộng có $u_1=-2$, $d=4$. Tính tổng 10 số hạng đầu $S_{10}$.`, ...numeric(160),
    why: R`$u_{10}=-2+36=34$; $S_{10}=\dfrac{10(-2+34)}{2}=160$.`, hint: R`Tính $u_{10}$ trước, rồi dùng $S_n=\dfrac{n(u_1+u_n)}{2}$.`, evidence: { kind: 'individual_reasoning' } }],
  ['extension', { objectiveIds: [O.cscSum], minutes: 6, prompt: R`Mức 3: Cấp số cộng có $u_3=7$ và $u_8=22$. Tính $S_{20}$.`, ...numeric(590),
    why: R`$5d=15\Rightarrow d=3$, $u_1=1$, $u_{20}=58$, $S_{20}=\dfrac{20(1+58)}{2}=590$.`, hint: R`Từ $u_8-u_3=5d$ tìm $d$, rồi tìm $u_1$.` }],
]), { action: 'Mỗi em làm câu ở mức mình chọn.', product: 'Số hạng và tổng của cấp số cộng.', look: 'Em dùng nhầm $n$ thay cho $n-1$.', next: 'Sang trạm cấp số nhân.' });

activity('act-prac-csn', 'practice', 10, 'individual', [O.csnTerm, O.csnSum], lanes('act-prac-csn', 'csn', [
  ['support', { objectiveIds: [O.csnTerm], minutes: 4, prompt: R`Mức 1: Cấp số nhân có $u_1=2$, $u_2=6$. Tìm công bội $q$.`, ...numeric(3), why: R`$q=\dfrac{u_2}{u_1}=3$.`, hint: 'Công bội là thương của hai số hạng liên tiếp.' }],
  ['core', { objectiveIds: [O.csnTerm, O.csnSum], minutes: 6, prompt: R`Mức 2: Cấp số nhân có $u_1=1$, $q=2$. Tính tổng 8 số hạng đầu $S_8$.`, ...numeric(255),
    why: R`$S_8=\dfrac{1(1-2^8)}{1-2}=255$.`, hint: R`Dùng $S_n=\dfrac{u_1(1-q^n)}{1-q}$.`, evidence: { kind: 'individual_reasoning' } }],
  ['extension', { objectiveIds: [O.csnSum], minutes: 6, prompt: R`Mức 3: Cấp số nhân có $u_2=6$ và $u_5=-162$. Tính $S_5$.`, ...numeric(-122),
    why: R`$q^3=-27\Rightarrow q=-3$, $u_1=-2$, $S_5=\dfrac{-2(1-(-3)^5)}{1-(-3)}=-122$.`, hint: R`Lập tỉ số $\dfrac{u_5}{u_2}=q^3$.` }],
]), { action: 'Mỗi em làm câu ở mức mình chọn.', product: 'Số hạng và tổng của cấp số nhân.', look: 'Em quên dấu khi công bội âm.', next: 'Sang trạm bài toán thực tế theo nhóm.' });

activity('act-prac-real', 'practice', 10, 'group', [O.real], [
  task('act-prac-real', 'task-real-bacteria', { objectiveIds: [O.real], participation: 'group', minutes: 5, prompt: 'Một mẻ nuôi cấy có 500 vi khuẩn; cứ sau mỗi giờ số vi khuẩn tăng gấp đôi. Sau 6 giờ có bao nhiêu vi khuẩn?', ...numeric(32000),
    why: 'Số vi khuẩn sau $k$ giờ là $500\\cdot 2^k$; sau 6 giờ là $500\\cdot 64=32000$.', hint: 'Mỗi giờ nhân thêm 2: đây là cấp số nhân. Đếm đúng số lần nhân.', evidence: { kind: 'group_product' } }),
  task('act-prac-real', 'task-real-stadium', { objectiveIds: [O.real], participation: 'group', minutes: 5, prompt: 'Một khán đài có 20 hàng ghế; hàng đầu có 30 ghế, mỗi hàng sau nhiều hơn hàng trước 4 ghế. Khán đài có tất cả bao nhiêu ghế?', ...numeric(1360),
    why: 'Cấp số cộng $u_1=30$, $d=4$, $n=20$: $S_{20}=10(60+76)=1360$.', hint: 'Số ghế mỗi hàng lập cấp số cộng; cần tổng 20 số hạng.' }),
], { action: 'Nhóm chọn mô hình cấp số phù hợp, mỗi em trình bày một bước.', product: 'Lời giải hai bài thực tế.', look: 'Nhóm nhận ra mô hình cộng hay nhân trước khi tính.', next: 'Kiểm tra cá nhân độc lập.' });

// 5. Kiểm tra lại cá nhân (12')
const rc = (id, objectiveIds, spec) => task('act-recheck', id, { objectiveIds, minutes: 2, evidence: { kind: 'individual_recheck' }, ...spec });
activity('act-recheck', 'recheck', 12, 'individual', all, [
  rc('task-rc-mono', [O.mono], { prompt: R`Với dãy $u_n=\dfrac{n+3}{n+1}$, khẳng định nào đúng?`, ...choice([['opt_dec_bounded', 'Dãy giảm và bị chặn'], ['opt_inc_bounded', 'Dãy tăng và bị chặn'], ['opt_dec_unbounded', 'Dãy giảm và không bị chặn dưới']], 'opt_dec_bounded'),
    why: R`$u_n=1+\dfrac{2}{n+1}$ giảm và $1<u_n\le 2$.`, hint: R`Tách $u_n=1+\dfrac{2}{n+1}$.` }),
  rc('task-rc-csc-term', [O.cscTerm], { prompt: R`Cấp số cộng có $u_1=7$ và $u_6=-8$. Tính $u_{11}$.`, ...numeric(-23), why: R`$5d=-15\Rightarrow d=-3$; $u_{11}=7+10(-3)=-23$.`, hint: R`$u_6-u_1=5d$.` }),
  rc('task-rc-csc-sum', [O.cscSum], { prompt: R`Tính tổng $S=1+4+7+\dots+58$.`, ...numeric(590), why: R`Cấp số cộng $u_1=1$, $d=3$, $58=1+3(n-1)\Rightarrow n=20$; $S=\dfrac{20(1+58)}{2}=590$.`, hint: 'Tìm số số hạng trước khi tính tổng.' }),
  rc('task-rc-csn-term', [O.csnTerm], { prompt: R`Cấp số nhân có $u_1=5$ và $q=-2$. Tính $u_6$.`, ...numeric(-160), why: R`$u_6=5\cdot(-2)^5=-160$.`, hint: 'Chú ý dấu của lũy thừa bậc lẻ của số âm.' }),
  rc('task-rc-csn-sum', [O.csnSum], { prompt: R`Tính tổng $S=3+6+12+\dots+384$.`, ...numeric(765), why: R`Cấp số nhân $u_1=3$, $q=2$, $3\cdot 2^{n-1}=384\Rightarrow n=8$; $S=3(2^8-1)=765$.`, hint: R`Tìm $n$ từ $u_n=384$ trước.` }),
  rc('task-rc-real', [O.real], { prompt: 'Một quả bóng rơi từ độ cao 81 m; mỗi lần chạm đất nó nảy lên bằng $\\dfrac{2}{3}$ độ cao lần rơi trước. Lần nảy thứ 4 bóng lên cao bao nhiêu mét?', ...numeric(16),
    why: R`Độ cao các lần nảy lập cấp số nhân $u_1=54$, $q=\dfrac{2}{3}$; $u_4=81\cdot\left(\dfrac{2}{3}\right)^4=16$.`, hint: 'Lần nảy thứ nhất đã nhân 2/3 một lần.' }),
], { action: 'Mỗi em tự làm 6 câu, không dùng gợi ý nếu muốn được ghi nhận độc lập.', product: 'Đáp án 6 câu kiểm tra lại.', look: 'Mục tiêu nào còn nhiều em sai để chữa ngay.', next: 'Phiếu ra cửa.' });

// 6. Phiếu ra cửa (6') + phản tư (2')
activity('act-exit', 'exit', 6, 'individual', all, [
  task('act-exit', 'task-exit-ticket', { type: 'open', objectiveIds: all, minutes: 6,
    prompt: R`(1) Với dãy $2, 5, 8, 11, \dots$ và dãy $2, 6, 18, 54, \dots$: nhận dạng mỗi dãy, viết số hạng tổng quát và tính tổng 10 số hạng đầu. (2) Dãy $u_n=\dfrac{1}{n}$ tăng hay giảm, có bị chặn không? Giải thích. (3) Nêu một tình huống thực tế dùng được cấp số nhân.`,
    ...rubric(['Nhận dạng đúng và viết đúng số hạng tổng quát, tổng của cả hai cấp số', 'Kết luận đúng tính đơn điệu, bị chặn có lập luận', 'Tình huống thực tế hợp lý, chỉ rõ số hạng đầu và công bội'],
      [R`CSC $d=3$: $u_n=3n-1$, $S_{10}=155$; CSN $q=3$: $u_n=2\cdot 3^{n-1}$, $S_{10}=3^{10}-1=59048$`, R`$u_n=\dfrac1n$ giảm, $0<u_n\le 1$`]),
    why: 'Phiếu tổng hợp cả chương, GV chấm theo rubric.', hint: 'Xét hiệu hoặc tỉ số của hai số hạng liên tiếp để nhận dạng.', evidence: { kind: 'exit' } }),
], { action: 'Mỗi em làm phiếu ra cửa.', product: 'Lời giải 3 ý.', look: 'Chấm theo rubric; ghi em cần kèm thêm.', next: 'Phản tư cuối giờ.' });
activity('act-reflection', 'reflection', 2, 'individual', all, [
  task('act-reflection', 'task-reflection', { type: 'reflection', objectiveIds: all, minutes: 2, isCore: false, prompt: 'Trước giờ ôn tập em nghĩ…; giờ em nghĩ… về sự khác nhau giữa cấp số cộng và cấp số nhân.',
    ...rubric(['Nêu được thay đổi trong cách hiểu'], ['So sánh phép cộng $d$ với phép nhân $q$']), why: 'Phản tư theo Visible Thinking.', hint: 'Nghĩ về câu em sửa lại trong giờ.', evidence: { kind: 'self_assessment' } }),
], { action: 'Mỗi em viết hai câu phản tư.', product: 'Hai câu Trước/Giờ.', look: 'Không chấm điểm.', next: 'Kết thúc.' });

// 7. Thử thách thêm (2', tùy chọn) và dự phòng (2')
activity('act-challenge', 'practice', 2, 'individual', [O.cscTerm, O.csnTerm], [
  task('act-challenge', 'task-challenge-mix', { branch: 'extension', objectiveIds: [O.cscTerm, O.csnTerm], minutes: 2,
    prompt: R`Ba số $a, b, c$ theo thứ tự lập cấp số cộng có công sai dương và $a+b+c=15$. Nếu cộng thêm lần lượt $1, 1, 4$ vào ba số đó thì được một cấp số nhân. Tìm $c$.`, ...numeric(8),
    why: R`$b=5$, $a=5-d$, $c=5+d$; $(6-d)(9+d)=36\Rightarrow d^2+3d-18=0\Rightarrow d=3$; $c=8$.`, hint: R`Đặt $b=5$, $a=5-d$, $c=5+d$ rồi dùng tính chất $y^2=xz$ của cấp số nhân.` }),
], { action: 'Em nào xong sớm làm thử thách.', product: 'Đáp án thử thách.', look: 'Không bắt buộc.', next: 'Quay lại phiếu ra cửa.' }, 'optional');
activities.push({ id: 'act-reserve', phase: 'reflection', budgetRole: 'reserve', minutes: 2, objectiveIds: all, taskIds: [], participation: 'whole_class', studentAction: 'GV chữa câu kiểm tra lại có nhiều em sai.', expectedProduct: 'Lời giải mẫu.', evidenceIds: [], teacherLookFor: 'Dùng khi lớp còn vướng.', supportIds: [], transition: 'Kết thúc giờ.' });

// Thứ tự hoạt động trong giờ: thử thách để sau kiểm tra lại (mở khi em đã qua các mục tiêu Must).
const order = ['act-exp', 'act-pre', 'act-form', 'act-prac-mono', 'act-prac-csc', 'act-prac-csn', 'act-prac-real', 'act-recheck', 'act-challenge', 'act-exit', 'act-reflection', 'act-reserve'];
activities.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

const pkg = {
  schemaVersion: '1.0.0', id: 'g11-ch2-review', version: '1.0.0', status: 'draft', subject: 'math', grade: 11,
  curriculumRefs: ['CT2018-Toan11', ...objectives.map(o => o.code)],
  sourceRefs: [
    { id: 'src-sgk-g11-ch2', kind: 'external', locator: 'SGK Toán 11 Kết nối tri thức, Tập 1, Chương II (Bài 5–7, Bài tập cuối chương II); PPCT TDS tiết 50–51', label: 'Toán 11 KNTT — Chương II: Dãy số, cấp số cộng, cấp số nhân', verification: 'teacher_review_required' },
  ],
  essentialQuestion: 'Làm thế nào để hệ thống hóa và nhận ra khi nào một quy luật là cấp số cộng hay cấp số nhân, rồi dùng đúng công thức số hạng và tổng?',
  prerequisites: ['Dãy số và cách cho dãy số (Bài 5)', 'Lũy thừa với số mũ tự nhiên'],
  objectives,
  budget: { slotMinutes: 80, coreMinutes: 76, reserveMinutes: 2, transitionMinutes: 0, optionalMinutes: 2 },
  activities, tasks, hints, evidenceRules,
  rubric: { criteria: ['Nhận dạng đúng cấp số cộng, cấp số nhân', 'Dùng đúng công thức số hạng tổng quát và tổng', 'Mô hình hóa được tình huống thực tế'], lookFor: ['Xét hiệu hoặc tỉ số hai số hạng liên tiếp', 'Đếm đúng số số hạng $n$'] },
  modePolicies: { classroom: { enforceIndividualMastery: true, allowHintAssistance: true } },
  masteryPolicy: { individualEvidencePerObjectiveMin: 2, masterySources: ['individual_recheck', 'exit'], forbiddenSources: ['group_product', 'map_position', 'race_position', 'group_score'] },
};
pkg.contentHash = hashPackage(pkg);
const result = validateLessonPackage(pkg);
if (!result.ok) { console.error(JSON.stringify(result.errors, null, 1)); process.exit(1); }
await writeFile(new URL('../../content/lessons/g11-ch2-review.json', import.meta.url), JSON.stringify(pkg, null, 1) + '\n');
console.log(`OK ${tasks.length} tasks, ${activities.length} activities, hash ${pkg.contentHash.slice(0, 12)}`);
