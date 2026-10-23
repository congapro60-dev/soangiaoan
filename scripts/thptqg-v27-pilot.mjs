// Thêm nhiệm vụ chuẩn THPTQG (trắc nghiệm, đúng/sai, trả lời ngắn decimal_4)
// vào 3 entry pilot trên catalogue hki-2026-g11.json: r013, r028, r108.
// Re-runnable: bỏ qua entry đã có nhiệm vụ thptqg-*. Validate từng pkg trước khi
// ghi; nếu có entry không hợp lệ thì thoát mà không ghi file.
// Chạy: node scripts/thptqg-v27-pilot.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { validateLessonPackage } from '../lib/lesson/validate.js';
import { hashPackage } from '../lib/lesson/schema.js';

const FILE = new URL('../content/lessons/hki-2026-g11.json', import.meta.url);
const PREFIX = 'thptqg-';
const db = JSON.parse(readFileSync(FILE, 'utf8'));

const svgUri = (inner) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160"><rect width="240" height="160" fill="#f8fafc"/>' + inner + '</svg>');
const BLUE = '#1e40af';
const label = (x, y, t) => '<text x="' + x + '" y="' + y + '" font-size="13" fill="' + BLUE + '">' + t + '</text>';
const tetraSvg = svgUri(
  '<polygon points="120,18 34,132 206,132" fill="#dbeafe" stroke="' + BLUE + '" stroke-width="2"/>' +
  '<line x1="120" y1="18" x2="120" y2="108" stroke="' + BLUE + '" stroke-width="1.5"/>' +
  label(112, 14, 'A') + label(20, 150, 'B') + label(198, 150, 'C') + label(112, 124, 'D')
);
const pyramidSvg = svgUri(
  '<polygon points="120,16 30,110 210,110" fill="#dbeafe" stroke="' + BLUE + '" stroke-width="2"/>' +
  '<polygon points="30,110 210,110 178,146 62,146" fill="#eff6ff" stroke="' + BLUE + '" stroke-width="2"/>' +
  '<line x1="120" y1="16" x2="120" y2="128" stroke="' + BLUE + '" stroke-width="1.5" stroke-dasharray="4 3"/>' +
  label(114, 12, 'S') + label(14, 128, 'A') + label(214, 128, 'B') + label(184, 158, 'C') + label(52, 158, 'D')
);

const PILOTS = [
  {
    periodId: 'g11-discover-r013',
    tasks: [
      {
        id: 'thptqg-r013-mc', kind: 'mc', minutes: 2, image: null,
        prompt: 'Góc $120^\\circ$ có số đo bằng bao nhiêu radian?',
        options: [
          { id: 'A', label: '$\\frac{\\pi}{3}$' },
          { id: 'B', label: '$\\frac{2\\pi}{3}$' },
          { id: 'C', label: '$\\frac{3\\pi}{4}$' },
          { id: 'D', label: '$\\frac{5\\pi}{6}$' }
        ],
        answerKey: 'B',
        hint: 'Đổi độ sang radian: nhân $\\frac{\\pi}{180}$.',
        solution: '$120^\\circ=120\\cdot\\frac{\\pi}{180}=\\frac{2\\pi}{3}$ rad, chọn B.'
      },
      {
        id: 'thptqg-r013-tf', kind: 'tf', minutes: 2, image: null,
        prompt: 'Xét tính đúng/sai của các khẳng định sau:',
        statements: [
          { label: 'Góc $120^\\circ$ có số đo $\\frac{2\\pi}{3}$ rad.', value: true },
          { label: 'Góc $45^\\circ$ có số đo $\\frac{\\pi}{4}$ rad.', value: true },
          { label: 'Góc $270^\\circ$ có số đo $\\frac{3\\pi}{4}$ rad.', value: false },
          { label: 'Trên đường tròn đơn vị, cung ứng góc $60^\\circ$ có chiều dài $\\frac{\\pi}{3}$.', value: true }
        ],
        hint: 'Nhớ $270^\\circ=\\frac{3\\pi}{2}$; chiều dài cung là $l=r\\alpha$ với $r=1$.',
        solution: '$270^\\circ=\\frac{3\\pi}{2}\\ne\\frac{3\\pi}{4}$ nên ý 3 sai; các ý còn lại đúng theo công thức đổi độ sang radian và $l=r\\alpha$.'
      },
      {
        id: 'thptqg-r013-sa', kind: 'sa', minutes: 2, image: null,
        prompt: 'Dùng $\\pi \\approx 3{,}14$. Số đo radian của góc $100^\\circ$ (làm tròn đến hàng phần trăm) là bao nhiêu? Ghi kết quả vào bốn ô, ví dụ $1{,}23$.',
        answerKey: ['1', ',', '7', '4'],
        hint: '$100^\\circ=100\\cdot\\frac{\\pi}{180}$; thay $\\pi\\approx 3{,}14$ rồi làm tròn.',
        solution: '$100\\cdot\\frac{3{,}14}{180}\\approx 1{,}7444\\ldots\\approx 1{,}74$.'
      }
    ]
  },
  {
    periodId: 'g11-discover-r028',
    tasks: [
      {
        id: 'thptqg-r028-mc', kind: 'mc', minutes: 2, image: tetraSvg,
        prompt: 'Tứ diện đều $ABCD$ cạnh $a$ có thể tích khối tứ diện $ABCD$ bằng:',
        options: [
          { id: 'A', label: '$\\frac{a^3\\sqrt{2}}{12}$' },
          { id: 'B', label: '$\\frac{a^3}{6}$' },
          { id: 'C', label: '$\\frac{a^3\\sqrt{3}}{12}$' },
          { id: 'D', label: '$\\frac{a^3}{12}$' }
        ],
        answerKey: 'A',
        hint: 'Dùng $V=\\frac{1}{3}S_{\\triangle BCD}\\cdot h$, với $h$ là khoảng cách từ $A$ đến mặt $(BCD)$.',
        solution: '$S_{\\triangle BCD}=\\frac{a^2\\sqrt{3}}{4}$, $h=a\\sqrt{\\frac{2}{3}}$, nên $V=\\frac{1}{3}\\cdot\\frac{a^2\\sqrt{3}}{4}\\cdot a\\sqrt{\\frac{2}{3}}=\\frac{a^3\\sqrt{2}}{12}$, chọn A.'
      },
      {
        id: 'thptqg-r028-tf', kind: 'tf', minutes: 2, image: pyramidSvg,
        prompt: 'Cho hình chóp $S.ABC$ có $SA\\perp (ABC)$ (xem hình). Xét tính đúng/sai của các khẳng định sau:',
        statements: [
          { label: '$SA$ vuông góc với đường thẳng $BC$.', value: true },
          { label: '$BC$ vuông góc với mặt phẳng $(SAB)$.', value: false },
          { label: 'Hai mặt phẳng $(SBC)$ và $(SAC)$ cắt nhau theo giao tuyến $SC$.', value: true },
          { label: 'Hình chiếu vuông góc của $S$ trên mặt phẳng $(ABC)$ là điểm $A$.', value: true }
        ],
        hint: '$SA\\perp (ABC)$ nên $SA$ vuông góc với mọi đường thẳng trong $(ABC)$; để $BC\\perp(SAB)$ phải có thêm $AB\\perp BC$.',
        solution: 'Ý 1 đúng vì đường thẳng vuông góc với mặt phẳng thì vuông góc với mọi đường thẳng nằm trong đó. Ý 2 sai vì chỉ có $BC$ vuông góc với $SA$ trong $(SAB)$, chưa có $AB\\perp BC$. Ý 3 dùng định nghĩa giao tuyến của hai mặt phẳng có chung hai điểm $S$, $C$. Ý 4 đúng vì $SA\\perp(ABC)$ tại $A$.'
      },
      {
        id: 'thptqg-r028-sa', kind: 'sa', minutes: 2, image: null,
        prompt: 'Hình chóp có đáy là hình vuông cạnh $3$ và chiều cao $2{,}5$. Thể tích khối chóp bằng bao nhiêu? Ghi kết quả vào bốn ô, ví dụ $7{,}50$.',
        answerKey: ['7', ',', '5', '0'],
        hint: '$V=\\frac{1}{3}S_{đáy}\\cdot h=\\frac{1}{3}\\cdot 3^2\\cdot 2{,}5$.',
        solution: '$V=\\frac{1}{3}\\cdot 9\\cdot 2{,}5=7{,}5$.'
      }
    ]
  },
  {
    periodId: 'g11-discover-r108',
    tasks: [
      {
        id: 'thptqg-r108-mc', kind: 'mc', minutes: 2, image: null,
        prompt: 'Cho tam giác $ABC$, $M\\in AB$, $N\\in AC$ sao cho $MN\\parallel BC$. Biết $AM=4$, $MB=6$, $BC=10$. Độ dài $MN$ là:',
        options: [
          { id: 'A', label: '$5$' },
          { id: 'B', label: '$4$' },
          { id: 'C', label: '$6$' },
          { id: 'D', label: '$8$' }
        ],
        answerKey: 'B',
        hint: 'Định lý Thales: $\\frac{AM}{AB}=\\frac{MN}{BC}$ với $AB=AM+MB$.',
        solution: '$\\frac{AM}{AB}=\\frac{4}{10}$, nên $MN=\\frac{4}{10}\\cdot 10=4$, chọn B.'
      },
      {
        id: 'thptqg-r108-tf', kind: 'tf', minutes: 2, image: null,
        prompt: 'Về quan hệ song song, xét tính đúng/sai của các khẳng định sau:',
        statements: [
          { label: 'Hai mặt phẳng phân biệt cùng song song với một mặt phẳng thứ ba thì song song với nhau.', value: true },
          { label: 'Một đường thẳng song song với một mặt phẳng thì song song với mọi đường thẳng nằm trong mặt phẳng đó.', value: false },
          { label: 'Nếu một mặt phẳng chứa hai đường thẳng cắt nhau lần lượt song song với hai đường thẳng cắt nhau của mặt phẳng khác thì hai mặt phẳng đó song song.', value: true },
          { label: 'Nếu $(\\alpha)\\parallel (\\beta)$, $(\\alpha)\\cap (\\gamma)=a$ và $(\\beta)\\cap (\\gamma)=b$ thì $a\\parallel b$.', value: true }
        ],
        hint: 'Đường thẳng song song với mặt phẳng có thể chéo nhau với các đường thẳng trong mặt phẳng đó; tính chất giao tuyến cho ý 4.',
        solution: 'Ý 2 sai vì đường thẳng có thể chéo với đường thẳng trong mặt phẳng. Ý 1 là tính chất transitive của song song, ý 3 là dấu hiệu nhận biết, ý 4 là tính chất giao tuyến — đều đúng.'
      },
      {
        id: 'thptqg-r108-sa', kind: 'sa', minutes: 2, image: null,
        prompt: 'Cho tam giác $ABC$, $M\\in AB$, $N\\in AC$, $MN\\parallel BC$. Biết $\\frac{AM}{AB}=0{,}4$ và $BC=12$. Độ dài $MN$ là bao nhiêu? Ghi kết quả vào bốn ô, ví dụ $4{,}80$.',
        answerKey: ['4', ',', '8', '0'],
        hint: 'Theo Thales: $MN=\\frac{AM}{AB}\\cdot BC$.',
        solution: '$MN=0{,}4\\cdot 12=4{,}8$.'
      }
    ]
  }
];

const job = (spec) => {
  if (spec.kind === 'mc') {
    return {
      inputSchema: { options: spec.options },
      evaluation: { checkerId: 'choice_exact', answerKey: spec.answerKey }
    };
  }
  if (spec.kind === 'tf') {
    return {
      inputSchema: {
        type: 'true_false_4',
        statements: spec.statements.map((s, i) => ({ id: 's' + (i + 1), label: s.label }))
      },
      evaluation: { checkerId: 'true_false_4', answerKey: spec.statements.map((s) => s.value) }
    };
  }
  return {
    inputSchema: { type: 'short_answer_4', format: 'decimal_4' },
    evaluation: { checkerId: 'short_answer_4', answerKey: spec.answerKey }
  };
};

const failures = [];
let patched = 0;
for (const pilot of PILOTS) {
  const entry = db.entries.find((e) => e.sourcePeriodId === pilot.periodId);
  if (!entry) { failures.push(pilot.periodId + ': không tìm thấy entry'); continue; }
  const pkg = entry.pkg;
  if (pkg.tasks.some((t) => String(t.id).startsWith(PREFIX))) {
    console.log('Bỏ qua (đã có nhiệm vụ thptqg-):', pilot.periodId);
    continue;
  }
  const host = pkg.activities.find((a) => a.id === 'act-3');
  if (!host) { failures.push(pilot.periodId + ': không có activity act-3'); continue; }
  const template = pkg.tasks.find((t) => t.type === 'closed') || pkg.tasks.find((t) => t.type === 'open');
  if (!template) { failures.push(pilot.periodId + ': không có nhiệm vụ mẫu'); continue; }
  const citation =
    (template.metadata && template.metadata.sourceCitation &&
      JSON.parse(JSON.stringify(template.metadata.sourceCitation))) ||
    { segmentId: (pkg.sourceRefs[0] || {}).id, quote: pkg.essentialQuestion || '', origin: 'generated' };

  for (const spec of pilot.tasks) {
    const task = JSON.parse(JSON.stringify(template));
    task.id = spec.id;
    task.type = 'closed';
    task.prompt = spec.prompt;
    task.activityId = host.id;
    task.branch = 'shared';
    task.participation = 'individual';
    task.minutes = spec.minutes;
    task.isCore = true;
    task.requiresFullScaffold = false;
    task.evidenceIds = [];
    task.hintIds = ['hint-' + spec.id];
    if (spec.image) task.image = spec.image;
    else { delete task.image; delete task.diagramUrl; }
    Object.assign(task, job(spec));
    task.metadata = {
      sourceCitation: JSON.parse(JSON.stringify(citation)),
      numericReviewRequired: true,
      workedSolution: spec.solution
    };
    task.supportRationale = 'Lời giải đối soát: ' + spec.solution + ' Lỗi cần quan sát: làm tròn sai bước cuối; đọc nhầm dữ kiện đề.';
    pkg.tasks.push(task);
    host.taskIds.push(spec.id);
    pkg.hints.push({
      id: 'hint-' + spec.id,
      tier: 'H1',
      text: spec.hint,
      taskId: spec.id,
      objectiveIds: JSON.parse(JSON.stringify(task.objectiveIds)),
      order: 1,
      notAnswer: true,
      penalty: { time: 0, score: 0, freeze: 0 },
      supportRationale: 'Gợi mở hướng giải, không chứa đáp số: ' + spec.hint
    });
  }

  // Tái phân bổ thời gian luyện tập trong act-3: nhiệm vụ mới dùng chung (shared)
  // dành lấy phút từ các nhiệm vụ theo lane, giữ nguyên slotMinutes 40 và tổng
  // budget (bất biến catalogue). Mỗi học sinh vẫn cùng tổng phút luyện tập.
  const newSharedMin = pilot.tasks.reduce((sum, t) => sum + t.minutes, 0);
  const actMin = typeof host.minutes === 'number' ? host.minutes : 0;
  const laneTasks = pkg.tasks.filter(
    (t) => t.activityId === host.id && !String(t.id).startsWith(PREFIX) && t.branch && t.branch !== 'shared' && typeof t.minutes === 'number'
  );
  const maxLane = Math.max(0, ...laneTasks.map((t) => t.minutes));
  const allowLane = actMin - newSharedMin;
  if (laneTasks.length === 0 || allowLane <= 0 || maxLane <= 0) {
    failures.push(pilot.periodId + ': không đủ thời gian lane để xen nhiệm vụ mới mà giữ slot ' + (pkg.budget ? pkg.budget.slotMinutes : '?'));
    continue;
  }
  const factor = allowLane / maxLane;
  for (const laneTask of laneTasks) {
    laneTask.minutes = Math.max(2, Math.round(laneTask.minutes * factor));
  }
  const effMin = newSharedMin + Math.max(0, ...laneTasks.map((t) => t.minutes));
  if (effMin > actMin) {
    failures.push(pilot.periodId + ': sau tái phân bổ vẫn vượt (' + effMin + ' > ' + actMin + ')');
    continue;
  }

  pkg.contentHash = hashPackage(pkg);
  const result = validateLessonPackage(pkg);
  if (result.ok !== true) {
    failures.push(pilot.periodId + ': validate thất bại — ' + formatErrors(result.errors));
    continue;
  }
  patched += 1;
  console.log('Đã patch + validate OK:', pilot.periodId, '(lane ' + maxLane + '→' + laneTasks[0].minutes + ' phút, xen ' + newSharedMin + ' phút shared)');
}

function formatErrors(errors) {
  return (errors || [])
    .slice(0, 8)
    .map((e) => '[' + e.code + '] ' + (e.path || '') + ': ' + e.message)
    .join(' | ');
}

if (failures.length > 0) {
  console.error('KHÔNG GHI FILE vì có lỗi:\n- ' + failures.join('\n- '));
  process.exit(1);
}
if (patched === 0) {
  console.log('Không có entry nào cần patch.');
} else {
  writeFileSync(FILE, JSON.stringify(db));
  console.log('Ghi ' + FILE.pathname + ' với ' + patched + ' entry đã patch.');
}
