// Bộ xem trước offline cho GV: dựng nội dung TV + HS theo từng cue từ chính
// runtime definition (đã sửa mapping), để GV mở xem mà KHÔNG cần Firebase/auth/
// mạng. Chỉ chứa nội dung công khai — không teacherScript, không đáp án riêng,
// không PII/PIN/UID/response của học sinh.

import type { LiveLessonDefinition, LiveResponseType } from '../types';
import type { LiveLessonV4Contract } from './types';
import { lookupTvMedia } from './mediaManifest';

export interface PreviewCue {
  order: number;
  cueId: string;
  atSeconds: number;
  tv: { screenId: string; label: string; title: string; body: string };
  student: {
    screenId: string;
    label: string;
    action: string;
    responsePrompt?: string;
    responseType?: LiveResponseType;
    responseOptions?: Array<{ value: string; label: string }>;
    responseStepIds?: string[];
    responseSteps?: Array<{ id: string; label: string; responseType: LiveResponseType; options: Array<{ value: string; label: string }> }>;
  };
  media: { poster: string; alt: string } | null;
}

export interface PreviewModel {
  definitionKey: string;
  lessonId: string;
  title: string;
  durationSeconds: number;
  cues: PreviewCue[];
}

export interface PreviewManifest {
  schema: 'smartplan.tv-hs-preview.v1';
  definitionKey: string;
  lessonId: string;
  title: string;
  generatedFrom: 'live-runtime-definition';
  cueCount: number;
  cues: Array<{
    order: number;
    cueId: string;
    atSeconds: number;
    tvScreenId: string;
    tvTitle: string;
    studentScreenId: string;
    hasResponse: boolean;
    responseType: LiveResponseType | null;
    responseOptions: Array<{ value: string; label: string }>;
    responseStepIds: string[];
    media: string | null;
  }>;
}

// Chuyển các lệnh LaTeX phổ biến sang ký hiệu Unicode để preview offline không
// cần thư viện toán; giữ nguyên nội dung đã là Unicode.
const LATEX_TO_UNICODE: ReadonlyArray<[RegExp, string]> = [
  [/\\leq?\b/g, '≤'], [/\\geq?\b/g, '≥'], [/\\ne\b/g, '≠'],
  [/\\times\b/g, '×'], [/\\cdot\b/g, '·'], [/\\pm\b/g, '±'],
  [/\\Rightarrow\b/g, '⇒'], [/\\rightarrow\b/g, '→'], [/\\to\b/g, '→'],
  [/\\in\b/g, '∈'], [/\\infty\b/g, '∞'],
];

export function formulaToText(input: string): string {
  let out = input;
  for (const [pattern, replacement] of LATEX_TO_UNICODE) out = out.replace(pattern, replacement);
  // Bỏ dấu $…$ / $$…$$ bao quanh (đã render dạng chữ), giữ nội dung bên trong.
  out = out.replace(/\${1,2}/g, '');
  return out;
}

export function buildPreviewModel(
  definition: LiveLessonDefinition,
  definitionKey: string,
): PreviewModel {
  const tvById = new Map(definition.tvScreens.map((s) => [s.id, s]));
  const stepById = new Map(definition.responseSteps.map((s) => [s.id, s]));
  const studentById = new Map(definition.studentScreens.map((s) => [s.id, s]));

  const cues: PreviewCue[] = definition.cues.map((cue, index) => {
    const tv = tvById.get(cue.tvScreenId);
    const responseStepIds = cue.responseStepIds ?? (cue.responseStepId ? [cue.responseStepId] : []);
    const steps = responseStepIds.map(stepId => stepById.get(stepId)).filter((item): item is NonNullable<typeof item> => Boolean(item));
    const step = steps[0];
    const studentScreenId = step?.screenId ?? 'HS0';
    const student = studentById.get(studentScreenId) ?? studentById.get('HS0');
    const mediaEntry = lookupTvMedia(definitionKey, cue.tvScreenId);
    return {
      order: index,
      cueId: cue.id,
      atSeconds: cue.atSeconds,
      tv: {
        screenId: cue.tvScreenId,
        label: tv?.label ?? '',
        title: tv?.title ?? cue.tvScreenId,
        body: formulaToText(tv?.body ?? ''),
      },
      student: {
        screenId: studentScreenId,
        label: student?.label ?? 'Theo dõi hướng dẫn',
        action: student?.action ?? '',
        ...(step ? {
          responsePrompt: formulaToText(step.label),
          responseType: step.responseTypes[0],
          responseOptions: step.options?.map(option => ({ ...option })),
          responseStepIds: steps.map(responseStep => responseStep.id),
          responseSteps: steps.map(responseStep => ({ id: responseStep.id, label: formulaToText(responseStep.label), responseType: responseStep.responseTypes[0], options: responseStep.options?.map(option => ({ ...option })) ?? [] })),
        } : {}),
      },
      media: mediaEntry ? { poster: mediaEntry.posterSrc, alt: mediaEntry.altText } : null,
    };
  });

  return {
    definitionKey,
    lessonId: definition.lessonId,
    title: definition.title,
    durationSeconds: definition.durationSeconds,
    cues,
  };
}

export function buildPreviewManifest(model: PreviewModel): PreviewManifest {
  return {
    schema: 'smartplan.tv-hs-preview.v1',
    definitionKey: model.definitionKey,
    lessonId: model.lessonId,
    title: model.title,
    generatedFrom: 'live-runtime-definition',
    cueCount: model.cues.length,
    cues: model.cues.map((cue) => ({
      order: cue.order,
      cueId: cue.cueId,
      atSeconds: cue.atSeconds,
      tvScreenId: cue.tv.screenId,
      tvTitle: cue.tv.title,
      studentScreenId: cue.student.screenId,
      hasResponse: Boolean(cue.student.responsePrompt),
      responseType: cue.student.responseType ?? null,
      responseOptions: cue.student.responseOptions ?? [],
      responseStepIds: cue.student.responseSteps?.map(step => step.id) ?? [],
      media: cue.media ? cue.media.poster : null,
    })),
  };
}

// Chặn rò rỉ trường riêng tư vào gói preview. Ném lỗi nếu phát hiện.
const PRIVATE_PATTERNS: ReadonlyArray<[RegExp, string]> = [
  [/teacherScript/i, 'teacherScript'],
  [/"name"\s*:/i, 'name'],
  [/studentId/i, 'studentId'],
  [/participantUid/i, 'participantUid'],
  [/\bpin\b/i, 'pin'],
  [/languageSupportPlan/i, 'languageSupportPlan'],
  [/privateReason/i, 'privateReason'],
];

export function assertPreviewPrivacy(serialized: string): void {
  for (const [pattern, label] of PRIVATE_PATTERNS) {
    if (pattern.test(serialized)) {
      throw new Error(`Preview bundle chứa trường riêng tư nghi ngờ: ${label}`);
    }
  }
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const toParagraphs = (text: string): string =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');

export interface PreviewZipEntry {
  name: string;
  content: string | Uint8Array;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = typeof atob === 'function'
    ? atob(base64)
    : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Danh sách file cho gói ZIP offline: preview.html (tự chứa), manifest.json và
 * poster (nếu có). Đã chạy kiểm privacy trên html + manifest trước khi trả về.
 */
export function buildPreviewZipEntries(
  model: PreviewModel,
  posterDataUri?: string | null,
  contract?: LiveLessonV4Contract,
): PreviewZipEntry[] {
  const html = renderPreviewHtml(model, { posterDataUri });
  const manifest = buildPreviewManifest(model);
  assertPreviewPrivacy(html);
  assertPreviewPrivacy(JSON.stringify(manifest));
  const entries: PreviewZipEntry[] = [
    { name: 'preview.html', content: html },
    { name: 'manifest.json', content: JSON.stringify(manifest, null, 2) },
  ];
  if (contract) entries.push({ name: 'GV/huong-dan.md', content: buildTeacherGuideMarkdown(contract) });
  if (posterDataUri && posterDataUri.startsWith('data:')) {
    const base64 = posterDataUri.split(',')[1] ?? '';
    if (base64) entries.push({ name: 'media/preview-poster.png', content: base64ToBytes(base64) });
  }
  return entries;
}

/** Tài liệu riêng cho GV; preview.html vẫn chỉ chứa TV/HS công khai. */
export function buildTeacherGuideMarkdown(contract: LiveLessonV4Contract): string {
  const lines = [
    `# Hướng dẫn GV · ${contract.title}`,
    '',
    `- Thời lượng: ${Math.round(contract.durationSeconds / 60)} phút`,
    `- Câu hỏi định hướng: ${contract.objectives.teacherSynthesisPrompt}`,
    '',
    '## Đích đến chung',
    ...contract.objectives.math.map(objective => `- ${objective.text}`),
    '',
    '## Nhịp dạy và can thiệp',
    '| Thời gian | Hoạt động | GV dẫn/quan sát | Bảng và minh chứng |',
    '|---|---|---|---|',
    ...contract.timeline.map(block => `| ${Math.floor(block.startSeconds / 60)}:${String(block.startSeconds % 60).padStart(2, '0')}–${Math.floor(block.endSeconds / 60)}:${String(block.endSeconds % 60).padStart(2, '0')} | ${block.label} | ${block.teacherScript.replace(/\n/g, ' ')} | ${(block.boardLarge ?? '').replace(/\n/g, ' ')} |`),
    '',
    '## Đáp án và điểm cần chốt',
    `- Lỗi AI: ${contract.aiError.correction}`,
    `- Phép chứng minh: ${contract.aiError.proof}`,
    ...contract.taskVariants.map(task => `- Tuyến ${task.route}: ${task.prompt} · Sau hoạt động: ${task.postCheckId}`),
    '',
    '## Ghi chú sử dụng',
    '- `preview.html` là bản xem trước nội dung công khai, không phải ảnh chụp DOM runtime.',
    '- Số liệu trong preview có nhãn dữ liệu minh họa; khi dạy, TV chỉ nhận aggregate realtime sau khi GV bật kết quả.',
  ];
  return `${lines.join('\n')}\n`;
}

export interface RenderPreviewOptions {
  posterDataUri?: string | null;
}

export interface SyntheticCueStats {
  label: string;
  rows: Array<{ label: string; count: number }>;
}

// Số liệu MINH HỌA (không phải dữ liệu Firestore thật) cho các hoạt động có bước
// phản hồi, để GV hình dung bảng thống kê TV. Dựa vào responseType/options của
// chính activity, không dựa vào mã cue.
export function buildSyntheticCueStats(cue: PreviewCue): SyntheticCueStats | null {
  if (!cue.student.responsePrompt || !cue.student.responseType) return null;
  const options = cue.student.responseOptions ?? [];
  if (options.length > 0) {
    const values = new Set(options.map(option => option.value));
    const errorValues = new Set(['Conceptual', 'Algebraic', 'Logical', 'Missing condition']);
    const isAiError = options.length === errorValues.size && [...values].every(value => errorValues.has(value));
    const isRoute = options.length === 3 && ['M', 'S', 'C'].every(value => values.has(value));
    return {
      label: isAiError ? 'Phân loại lỗi AI' : isRoute ? 'Tuyến M / S / C' : 'Lựa chọn của hoạt động',
      rows: options.map((option, index) => ({ label: option.label, count: [8, 5, 11, 3][index] ?? 2 })),
    };
  }
  return { label: 'Tiến độ gửi', rows: [{ label: 'Tham gia', count: 24 }, { label: 'Đã gửi', count: 18 }] };
}

// Tạo một trang HTML tự chứa (CSS/JS nội tuyến) để mở offline. Không tham chiếu
// mạng ngoài; poster nhúng dạng data URI nếu được cung cấp.
export function renderPreviewHtml(model: PreviewModel, options: RenderPreviewOptions = {}): string {
  const poster = options.posterDataUri ?? null;
  const cuesJson = JSON.stringify(
    model.cues.map((cue) => ({
      cueId: cue.cueId,
      atSeconds: cue.atSeconds,
      tvLabel: cue.tv.label,
      tvTitle: cue.tv.title,
      tvBody: cue.tv.body,
      studentLabel: cue.student.label,
      studentAction: cue.student.action,
      responsePrompt: cue.student.responsePrompt ?? '',
      responseType: cue.student.responseType ?? null,
      responseOptions: cue.student.responseOptions ?? [],
      responseSteps: cue.student.responseSteps ?? [],
      hasMedia: Boolean(cue.media),
      stats: buildSyntheticCueStats(cue),
    })),
  ).replace(/</g, '\\u003c');

  const nav = model.cues
    .map((cue, i) => `<button class="cue-chip" data-i="${i}">${escapeHtml(cue.cueId)}</button>`)
    .join('');

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Xem trước TV + HS · ${escapeHtml(model.title)}</title>
<style>
  :root { color-scheme: light; --bg:#0f172a; --panel:#1e293b; --ink:#e2e8f0; --muted:#94a3b8; --cyan:#22d3ee; --amber:#fbbf24; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, "Segoe UI", Roboto, sans-serif; background:#f1f5f9; color:#0f172a; }
  header { padding:16px 20px; background:#0f172a; color:#fff; }
  header h1 { margin:0; font-size:18px; }
  header p { margin:4px 0 0; font-size:13px; color:#94a3b8; }
  .nav { display:flex; flex-wrap:wrap; gap:6px; padding:12px 20px; background:#e2e8f0; position:sticky; top:0; z-index:5; }
  .cue-chip { border:1px solid #cbd5e1; background:#fff; border-radius:999px; padding:6px 12px; font-weight:700; cursor:pointer; font-size:13px; }
  .cue-chip.active { background:#0f172a; color:#fff; border-color:#0f172a; }
  .stage { display:grid; gap:20px; padding:20px; grid-template-columns: 1fr; max-width:1200px; margin:0 auto; }
  @media (min-width: 900px){ .stage { grid-template-columns: 3fr 2fr; align-items:start; } }
  .col-title { font-size:12px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#64748b; margin:0 0 8px; }
  .tv { aspect-ratio:16/9; background:var(--bg); color:var(--ink); border-radius:16px; padding:24px; overflow:hidden; display:flex; flex-direction:column; }
  .tv .eyebrow { color:var(--cyan); font-weight:800; letter-spacing:.15em; text-transform:uppercase; font-size:13px; }
  .tv h2 { margin:6px 0 12px; font-size:clamp(20px,2.4vw,34px); line-height:1.05; }
  .tv .body p { margin:0 0 8px; font-size:clamp(13px,1.4vw,18px); color:#cbd5e1; }
  .tv .poster { margin-top:auto; }
  .tv .poster img { max-height:34%; border-radius:10px; }
  .hs { display:flex; flex-direction:column; gap:14px; }
  .card { border-radius:16px; padding:16px; }
  .card.work { background:#eef2ff; border:1px solid #c7d2fe; }
  .card.common { background:#fff; border:1px solid #e2e8f0; }
  .card h3 { margin:0 0 6px; font-size:16px; }
  .card .eyebrow { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#4f46e5; }
  .card.common .eyebrow { color:#0891b2; }
  .card p { margin:6px 0 0; font-size:14px; line-height:1.5; color:#1e293b; }
  .resp { margin-top:8px; padding:10px 12px; background:#fff; border:1px dashed #a5b4fc; border-radius:10px; font-size:14px; }
  .controls { display:flex; align-items:center; justify-content:center; gap:12px; padding:12px 20px 0; }
  .navbtn { border:1px solid #cbd5e1; background:#fff; border-radius:12px; padding:8px 16px; font-weight:800; cursor:pointer; font-size:14px; }
  .navbtn:disabled { opacity:.4; cursor:default; }
  .counter { min-width:64px; text-align:center; font-weight:800; font-variant-numeric:tabular-nums; color:#0f172a; }
  .stats { margin-top:auto; border-top:1px solid rgba(255,255,255,.12); padding-top:10px; }
  .stats .lbl { color:var(--amber); font-weight:800; font-size:12px; letter-spacing:.08em; text-transform:uppercase; }
  .stats .demo { color:var(--amber); font-size:11px; font-weight:700; }
  .stats .rows { display:flex; flex-wrap:wrap; gap:8px; margin-top:6px; }
  .stats .cell { background:rgba(34,211,238,.14); border-radius:10px; padding:6px 10px; min-width:64px; }
  .stats .cell .k { font-size:10px; font-weight:800; text-transform:uppercase; color:var(--cyan); }
  .stats .cell .v { font-size:20px; font-weight:900; line-height:1; }
  .foot { text-align:center; color:#94a3b8; font-size:12px; padding:8px 0 24px; }
  .hint { padding:0 20px; color:#64748b; font-size:12px; }
</style>
</head>
<body>
<header>
  <h1>Xem trước TV + Học sinh — ${escapeHtml(model.title)}</h1>
  <p>Gói offline theo từng cue · ${model.cues.length} bước · không cần đăng nhập/mạng</p>
</header>
<div class="controls"><button id="prev" class="navbtn" type="button">← Trước</button><span id="counter" class="counter"></span><button id="next" class="navbtn" type="button">Sau →</button></div>
<div class="nav" id="nav">${nav}</div>
<p class="hint">Bấm ← Trước / Sau → hoặc từng cue để xem đúng nội dung TV và màn hình học sinh sẽ hiển thị.</p>
<main class="stage">
  <section>
    <p class="col-title">Màn hình TV (16:9)</p>
    <div class="tv">
      <div class="eyebrow" id="tvEyebrow"></div>
      <h2 id="tvTitle"></h2>
      <div class="body" id="tvBody"></div>
      <div class="poster" id="tvPoster"></div>
      <div class="stats" id="tvStats" hidden></div>
    </div>
  </section>
  <section class="hs">
    <p class="col-title">Màn hình học sinh (laptop/tablet)</p>
    <div class="card work">
      <div class="eyebrow">Việc của em</div>
      <h3 id="hsLabel"></h3>
      <p id="hsAction"></p>
      <div class="resp" id="hsResp" hidden></div>
    </div>
    <div class="card common">
      <div class="eyebrow">Màn hình chung</div>
      <h3 id="hsTvTitle"></h3>
      <p id="hsTvBody"></p>
    </div>
  </section>
</main>
<p class="foot">SmartPlan · bản xem trước tĩnh, nội dung công khai (không lời thoại GV, không dữ liệu học sinh).</p>
<script>
  var CUES = ${cuesJson};
  var POSTER = ${poster ? JSON.stringify(poster) : 'null'};
  var current = 0;
  function paras(t){ return (t||'').split('\\n').map(function(s){return s.trim();}).filter(Boolean).map(function(s){var d=document.createElement('p');d.textContent=s;return d;}); }
  function show(i){
    var c = CUES[i]; if(!c) return;
    document.getElementById('tvEyebrow').textContent = c.tvLabel;
    document.getElementById('tvTitle').textContent = c.tvTitle;
    var tb = document.getElementById('tvBody'); tb.innerHTML=''; paras(c.tvBody).forEach(function(p){tb.appendChild(p);});
    var poster = document.getElementById('tvPoster'); poster.innerHTML='';
    if(c.hasMedia && POSTER){ var img=document.createElement('img'); img.src=POSTER; img.alt='Poster'; poster.appendChild(img); }
    document.getElementById('hsLabel').textContent = c.studentLabel;
    document.getElementById('hsAction').textContent = c.studentAction;
    var resp = document.getElementById('hsResp');
    if(c.responseSteps && c.responseSteps.length>1){ resp.hidden=false; resp.innerHTML=''; c.responseSteps.forEach(function(step){var d=document.createElement('div');d.textContent=step.id+': '+step.label;resp.appendChild(d);}); }
    else if(c.responsePrompt){ resp.hidden=false; resp.textContent='Ô phản hồi: '+c.responsePrompt; } else { resp.hidden=true; }
    document.getElementById('hsTvTitle').textContent = c.tvTitle;
    document.getElementById('hsTvBody').textContent = c.tvBody.split('\\n').filter(Boolean).join(' · ');
    var st = document.getElementById('tvStats');
    if(c.stats){
      var rows = c.stats.rows.map(function(r){ return '<div class="cell"><div class="k">'+r.label+'</div><div class="v">'+r.count+'</div></div>'; }).join('');
      st.hidden=false;
      st.innerHTML = '<span class="lbl">'+c.stats.label+'</span> <span class="demo">· Dữ liệu minh họa</span><div class="rows">'+rows+'</div>';
    } else { st.hidden=true; st.innerHTML=''; }
    var chips=document.querySelectorAll('.cue-chip');
    for(var k=0;k<chips.length;k++){ chips[k].classList.toggle('active', k===i); }
    current = i;
    document.getElementById('counter').textContent = (i+1)+'/'+CUES.length;
    document.getElementById('prev').disabled = i<=0;
    document.getElementById('next').disabled = i>=CUES.length-1;
  }
  document.getElementById('nav').addEventListener('click', function(e){
    var b=e.target.closest('.cue-chip'); if(!b) return; show(parseInt(b.getAttribute('data-i'),10));
  });
  document.getElementById('prev').addEventListener('click', function(){ if(current>0) show(current-1); });
  document.getElementById('next').addEventListener('click', function(){ if(current<CUES.length-1) show(current+1); });
  show(0);
</script>
</body>
</html>`;
}
