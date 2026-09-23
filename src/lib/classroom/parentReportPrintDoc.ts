import type { ParentSafeReport, ParentSafeAssignmentStatus, ParentSafeTrend } from './parentSafeReport';
import { COMPETENCY_LEVELS, type CompetencyLevel } from './competency/framework';
import type { StudentExamScores } from './examScores';
import { exportElementToPdf } from '../../utils/pdfExport';

/** Một năng lực Toán đã được đánh giá (đã có bài duyệt), rút từ hồ sơ năng lực cho bản phụ huynh. */
export interface ParentCompetencyItem {
  area: string;
  topic: string;
  level: CompetencyLevel;
}

/** Tóm tắt hồ sơ năng lực an toàn để gửi phụ huynh — chỉ tên năng lực + mức, không đáp án/ghi chú. */
export interface ParentCompetencySummary {
  /** Khối lớp của khung năng lực ("10"/"11"/"12"). */
  grade: string;
  assessed: number;
  total: number;
  items: ParentCompetencyItem[];
}

export interface ParentReportPrintInput {
  report: ParentSafeReport;
  studentName: string;
  className: string;
  studentCode?: string;
  /** Ngày lập báo cáo dạng dd/mm/yyyy; mặc định là hôm nay. */
  generatedOn?: string;
  /** Hồ sơ năng lực rút gọn; vắng thì bỏ mục "Năng lực Toán học". */
  competency?: ParentCompetencySummary | null;
  /** Điểm thi định kì (MOET + TDS); vắng/rỗng thì bỏ mục "Điểm thi định kì". */
  exams?: StudentExamScores | null;
}

const ROOT_ID = 'parent-report-pdf-root';

const STATUS_LABEL: Record<ParentSafeAssignmentStatus, string> = {
  official: 'Đã có kết quả',
  pending: 'Chờ thầy cô duyệt',
  grading: 'Đang được chấm',
  error: 'Cần xử lý lại',
  not_submitted: 'Chưa nộp',
};

interface Band { label: string; color: string; soft: string; }
const scoreBand = (pct: number): Band =>
  pct >= 80 ? { label: 'Tốt', color: '#15803d', soft: '#dcfce7' }
    : pct >= 65 ? { label: 'Khá', color: '#1d4ed8', soft: '#dbeafe' }
      : pct >= 50 ? { label: 'Trung bình', color: '#b45309', soft: '#fef3c7' }
        : { label: 'Cần cố gắng', color: '#b91c1c', soft: '#fee2e2' };

interface TrendMeta { label: string; arrow: string; color: string; }
const TREND_META: Record<ParentSafeTrend, TrendMeta> = {
  up: { label: 'Đang tiến bộ', arrow: '▲', color: '#16a34a' },
  flat: { label: 'Giữ ổn định', arrow: '▬', color: '#2563eb' },
  down: { label: 'Cần theo dõi thêm', arrow: '▼', color: '#dc2626' },
  not_enough_data: { label: 'Chưa đủ dữ liệu', arrow: '•', color: '#64748b' },
};

const esc = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const listItems = (items: readonly string[], emptyText: string): string =>
  items.length === 0
    ? `<p class="muted">${esc(emptyText)}</p>`
    : `<ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;

/** Đồng hồ điểm TB dạng thanh có thang mức (Cần cố gắng / TB / Khá / Tốt) + con trỏ tại vị trí điểm. */
const buildMeter = (avg: number | null): string => {
  if (avg === null) {
    return '<div class="big-null">—</div><p class="muted" style="margin:6px 0 0">Chưa đủ bài chấm chính thức để tính điểm trung bình.</p>';
  }
  const band = scoreBand(avg);
  const pos = Math.max(0, Math.min(100, avg));
  const segs = [
    { w: 50, c: '#fecaca', t: 'Cần cố gắng' },
    { w: 15, c: '#fde68a', t: 'TB' },
    { w: 15, c: '#bfdbfe', t: 'Khá' },
    { w: 20, c: '#bbf7d0', t: 'Tốt' },
  ];
  return `<div class="meter-top"><span class="meter-num" style="color:${band.color}">${avg.toFixed(1)}%</span><span class="pill" style="color:${band.color};background:${band.soft}">Mức ${band.label}</span></div>
  <div class="meter-bar">${segs.map(s => `<span style="width:${s.w}%;background:${s.c}"></span>`).join('')}<span class="meter-mark" style="left:${pos}%"></span></div>
  <div class="meter-scale">${segs.map(s => `<span style="width:${s.w}%">${s.t}</span>`).join('')}</div>`;
};

/** Đường xu hướng điểm qua các bài đã chấm (SVG). */
const buildSparkline = (series: readonly number[], trend: TrendMeta): string => {
  if (series.length < 2) {
    return `<p class="muted">Cần ít nhất 2 bài đã chấm để vẽ xu hướng.</p><p class="trend-line" style="color:${trend.color}">${trend.arrow} ${esc(trend.label)}</p>`;
  }
  const W = 232, H = 66, pad = 9;
  const stepX = (W - 2 * pad) / (series.length - 1);
  const pts = series.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - Math.max(0, Math.min(100, v)) / 100) * (H - 2 * pad);
    return [x, y] as const;
  });
  const line = pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${pad.toFixed(1)},${(H - pad).toFixed(1)} ${line} ${(pad + (series.length - 1) * stepX).toFixed(1)},${(H - pad).toFixed(1)}`;
  const dots = pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2" fill="${i === pts.length - 1 ? '#1d4ed8' : '#93c5fd'}"/>`).join('');
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><polyline points="${area}" fill="#eff6ff" stroke="none"/><polyline points="${line}" fill="none" stroke="#1d4ed8" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>${dots}</svg>
  <p class="trend-line" style="color:${trend.color}">${trend.arrow} ${esc(trend.label)}</p>`;
};

/** Thanh tiến độ nộp bài (đã chấm / chờ duyệt / chưa nộp). */
const buildCompletion = (official: number, pending: number, missing: number): string => {
  const total = official + pending + missing;
  if (total === 0) return '<p class="muted">Chưa có bài nào được giao.</p>';
  const pct = (n: number) => (n / total) * 100;
  const done = official > 0 ? `<span style="width:${pct(official)}%;background:#22c55e"></span>` : '';
  const wait = pending > 0 ? `<span style="width:${pct(pending)}%;background:#f59e0b"></span>` : '';
  const miss = missing > 0 ? `<span style="width:${pct(missing)}%;background:#cbd5e1"></span>` : '';
  return `<div class="stack">${done}${wait}${miss}</div>
  <div class="legend"><span><i style="background:#22c55e"></i>Đã chấm ${official}</span><span><i style="background:#f59e0b"></i>Chờ duyệt ${pending}</span><span><i style="background:#cbd5e1"></i>Chưa nộp ${missing}</span></div>`;
};

const LEVEL_STYLE: Record<CompetencyLevel, { color: string; soft: string }> = {
  'Xuất sắc': { color: '#15803d', soft: '#dcfce7' },
  'Tốt': { color: '#1d4ed8', soft: '#dbeafe' },
  'Đạt yêu cầu': { color: '#b45309', soft: '#fef3c7' },
  'Chưa đạt yêu cầu': { color: '#b91c1c', soft: '#fee2e2' },
};

/** Mục "Năng lực Toán học": tiến độ + các năng lực đã đánh giá, nhóm theo mức của khung trường. */
const buildCompetencySection = (c: ParentCompetencySummary): string => {
  const head = `<p class="comp-progress">Theo khung năng lực môn Toán Lớp ${esc(c.grade)} · đã đánh giá <b>${c.assessed}/${c.total}</b> năng lực (chỉ dựa trên bài thầy cô đã duyệt).</p>`;
  if (c.items.length === 0) {
    return head + '<p class="muted">Chưa có năng lực nào đủ bài đã duyệt để kết luận. Con nộp và được chấm thêm bài sẽ dần hiện rõ.</p>';
  }
  const buckets = COMPETENCY_LEVELS
    .map(level => ({ level, items: c.items.filter(item => item.level === level) }))
    .filter(group => group.items.length > 0)
    .map(group => {
      const st = LEVEL_STYLE[group.level];
      return `<div class="comp-row"><span class="comp-lv" style="color:${st.color};background:${st.soft}">${esc(group.level)}</span><span class="comp-list">${group.items.map(item => esc(item.topic)).join(' · ')}</span></div>`;
    })
    .join('');
  return head + `<div class="comp-wrap">${buckets}</div>`;
};

const fmtScore = (value: number): string => (Number.isInteger(value) ? String(value) : String(value));

/** Mục "Điểm thi định kì": MOET (thang 10, có thanh mức) + TDS (điểm quý kèm điểm chữ). */
const buildExamSection = (exams: StudentExamScores): string => {
  const blocks: string[] = [];
  if (exams.moet.length > 0) {
    const rows = exams.moet.map(mark => {
      const pct = Math.max(0, Math.min(100, mark.score * 10));
      const band = scoreBand(pct);
      return `<div class="subject"><div class="subj-top"><div class="subj-name"><span class="dot" style="background:${band.color}"></span>${esc(mark.label)}</div><div class="subj-grade" style="color:${band.color}">${esc(fmtScore(mark.score))}/10</div></div><div class="subj-bar"><span style="width:${pct}%;background:${band.color}"></span></div></div>`;
    }).join('');
    blocks.push(`<div class="exam-block"><p class="exam-cap">Đánh giá định kì (thang 10)</p>${rows}</div>`);
  }
  if (exams.tds.length > 0) {
    const rows = exams.tds.map(mark =>
      `<div class="subject"><div class="subj-top"><div class="subj-name"><span class="dot" style="background:#6366f1"></span>${esc(mark.label)}</div><div class="subj-grade" style="color:#4338ca">${esc(fmtScore(mark.score))}${mark.letter ? `<span class="tds-letter">${esc(mark.letter)}</span>` : ''}</div></div></div>`
    ).join('');
    blocks.push(`<div class="exam-block"><p class="exam-cap">Điểm theo quý (hệ TDS)</p>${rows}</div>`);
  }
  return `<div class="exam-wrap">${blocks.join('')}</div>`;
};

/** Mỗi bài một hàng theo phong cách phiếu điểm IB: tên đậm trái · điểm phải · thanh mức bên dưới. */
const buildSubjectRows = (results: ParentSafeReport['results']): string => {
  if (results.length === 0) return '<p class="muted">Chưa có bài được ghi nhận.</p>';
  return results.map(r => {
    const official = r.status === 'official' && r.score !== null && r.maxScore !== null && r.maxScore > 0;
    if (official) {
      const pct = Math.round((r.score as number) / (r.maxScore as number) * 100);
      const band = scoreBand(pct);
      return `<div class="subject"><div class="subj-top"><div class="subj-name"><span class="dot" style="background:${band.color}"></span>${esc(r.title)}</div><div class="subj-grade" style="color:${band.color}">${r.score}/${r.maxScore}</div></div><div class="subj-bar"><span style="width:${pct}%;background:${band.color}"></span></div></div>`;
    }
    return `<div class="subject"><div class="subj-top"><div class="subj-name"><span class="dot" style="background:#cbd5e1"></span>${esc(r.title)}</div><div class="subj-status">${esc(STATUS_LABEL[r.status])}</div></div></div>`;
  }).join('');
};

/** CSS scope theo #ROOT_ID để không rò rỉ style ra phần còn lại của app khi node được gắn tạm vào DOM. */
const styleBlock = `
#${ROOT_ID} { width: 780px; box-sizing: border-box; padding: 30px 34px; background:#fff; color:#1e293b; font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif; font-size:13px; line-height:1.55; }
#${ROOT_ID} * { box-sizing: border-box; }
#${ROOT_ID} .info-table { width:100%; border-collapse:collapse; margin-bottom:20px; }
#${ROOT_ID} .info-table td { border:1px solid #dbe4ec; padding:8px 12px; font-size:12.5px; }
#${ROOT_ID} .info-table td.k { background:#f1f5f9; font-weight:800; width:150px; color:#334155; }
#${ROOT_ID} .title-wrap { border-bottom:3px solid #17375e; padding-bottom:14px; margin-bottom:18px; }
#${ROOT_ID} .kicker { font-size:11.5px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#1d4ed8; }
#${ROOT_ID} .title-wrap h1 { font-size:24px; font-weight:800; color:#17375e; margin:5px 0 2px; }
#${ROOT_ID} .title-wrap .prep { font-size:12px; color:#94a3b8; margin:0; }
#${ROOT_ID} .verdict { border-radius:10px; padding:14px 18px; color:#fff; display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
#${ROOT_ID} .verdict .v-l small, #${ROOT_ID} .verdict .v-r small { display:block; font-size:11px; font-weight:700; opacity:.85; letter-spacing:.04em; text-transform:uppercase; }
#${ROOT_ID} .verdict .v-l b { font-size:22px; font-weight:800; }
#${ROOT_ID} .verdict .v-r { text-align:right; }
#${ROOT_ID} .verdict .v-r b { font-size:15px; font-weight:800; }
#${ROOT_ID} .sec-head { display:flex; align-items:center; gap:10px; margin:22px 0 11px; }
#${ROOT_ID} .sec-head .n { display:inline-flex; width:25px; height:25px; border-radius:7px; background:#17375e; color:#fff; font-weight:800; font-size:13px; align-items:center; justify-content:center; }
#${ROOT_ID} .sec-head h2 { font-size:15px; font-weight:800; color:#17375e; margin:0; text-transform:uppercase; letter-spacing:.02em; }
#${ROOT_ID} .lead { border:1px solid #dbe4ec; border-left:5px solid #1d4ed8; border-radius:8px; padding:12px 16px; font-size:13.5px; font-weight:600; color:#334155; }
#${ROOT_ID} .tiles { display:flex; gap:12px; }
#${ROOT_ID} .tile { flex:1; border:1px solid #dbe4ec; border-radius:10px; padding:12px 14px; }
#${ROOT_ID} .tile .cap { font-size:11px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:.03em; margin-bottom:9px; }
#${ROOT_ID} .meter-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
#${ROOT_ID} .meter-num { font-size:24px; font-weight:800; }
#${ROOT_ID} .big-null { font-size:24px; font-weight:800; color:#94a3b8; }
#${ROOT_ID} .pill { font-size:11px; font-weight:800; padding:3px 9px; border-radius:999px; }
#${ROOT_ID} .meter-bar { position:relative; display:flex; height:14px; border-radius:7px; overflow:hidden; }
#${ROOT_ID} .meter-bar > span { display:block; height:100%; }
#${ROOT_ID} .meter-mark { position:absolute; top:-3px; width:3px; height:20px; background:#0f172a; border-radius:2px; transform:translateX(-50%); }
#${ROOT_ID} .meter-scale { display:flex; margin-top:4px; }
#${ROOT_ID} .meter-scale > span { font-size:9px; color:#94a3b8; text-align:center; font-weight:600; }
#${ROOT_ID} .trend-line { margin:4px 0 0; font-size:13px; font-weight:800; }
#${ROOT_ID} .stack { display:flex; height:16px; border-radius:8px; overflow:hidden; background:#eef2f7; }
#${ROOT_ID} .stack > span { display:block; height:100%; }
#${ROOT_ID} .legend { display:flex; flex-wrap:wrap; gap:10px; margin-top:8px; font-size:11px; font-weight:700; color:#475569; }
#${ROOT_ID} .legend span { display:inline-flex; align-items:center; gap:5px; }
#${ROOT_ID} .legend i { width:10px; height:10px; border-radius:3px; display:inline-block; }
#${ROOT_ID} .subject { border:1px solid #dbe4ec; border-radius:8px; padding:10px 14px; margin-bottom:8px; }
#${ROOT_ID} .subj-top { display:flex; align-items:center; justify-content:space-between; gap:10px; }
#${ROOT_ID} .subj-name { font-weight:800; color:#1e293b; font-size:13.5px; display:flex; align-items:center; gap:8px; }
#${ROOT_ID} .subj-name .dot { width:9px; height:9px; border-radius:50%; display:inline-block; flex:0 0 auto; }
#${ROOT_ID} .subj-grade { font-weight:800; font-size:17px; white-space:nowrap; }
#${ROOT_ID} .subj-status { font-size:11.5px; font-weight:700; color:#64748b; background:#f1f5f9; padding:3px 10px; border-radius:999px; white-space:nowrap; }
#${ROOT_ID} .subj-bar { margin-top:8px; height:7px; border-radius:4px; background:#eef2f7; overflow:hidden; }
#${ROOT_ID} .subj-bar > span { display:block; height:100%; }
#${ROOT_ID} .exam-wrap { display:flex; gap:14px; }
#${ROOT_ID} .exam-block { flex:1; min-width:0; }
#${ROOT_ID} .exam-cap { font-size:12px; font-weight:800; color:#334155; text-transform:uppercase; letter-spacing:.02em; margin:0 0 8px; }
#${ROOT_ID} .tds-letter { display:inline-block; margin-left:8px; font-size:12px; font-weight:800; color:#4338ca; background:#e0e7ff; border-radius:6px; padding:1px 9px; }
#${ROOT_ID} .comp-progress { font-size:12px; color:#475569; margin:0 0 11px; }
#${ROOT_ID} .comp-wrap { display:flex; flex-direction:column; gap:8px; }
#${ROOT_ID} .comp-row { display:flex; align-items:flex-start; gap:10px; border:1px solid #dbe4ec; border-radius:8px; padding:8px 12px; }
#${ROOT_ID} .comp-lv { flex:0 0 auto; font-size:11px; font-weight:800; padding:3px 10px; border-radius:999px; white-space:nowrap; min-width:104px; text-align:center; }
#${ROOT_ID} .comp-list { font-size:12.5px; font-weight:600; color:#334155; line-height:1.55; }
#${ROOT_ID} .cards2 { display:flex; gap:12px; }
#${ROOT_ID} .card { flex:1; border:1px solid #dbe4ec; border-radius:10px; padding:12px 15px; }
#${ROOT_ID} .card.good { border-top:4px solid #16a34a; }
#${ROOT_ID} .card.warn { border-top:4px solid #d97706; }
#${ROOT_ID} .card.home { border-top:4px solid #0284c7; }
#${ROOT_ID} .card.school { border-top:4px solid #7c3aed; }
#${ROOT_ID} .card h3 { font-size:13.5px; font-weight:800; color:#1e293b; margin:0 0 8px; }
#${ROOT_ID} ul { margin:0; padding-left:18px; }
#${ROOT_ID} li { margin-bottom:5px; }
#${ROOT_ID} .muted { color:#64748b; font-style:italic; margin:0; }
#${ROOT_ID} .note { border:1px solid #dbe4ec; background:#f8fafc; border-radius:8px; padding:10px 14px; font-size:11.5px; color:#64748b; margin-top:16px; }
#${ROOT_ID} .signature { display:flex; gap:16px; margin-top:22px; }
#${ROOT_ID} .signature div { flex:1; text-align:center; font-size:11.5px; color:#475569; font-weight:700; }
#${ROOT_ID} .sig-line { margin-top:46px; border-top:1px dotted #94a3b8; padding-top:5px; }
`;

/**
 * Dựng phần thân báo cáo phụ huynh (style + markup, đã scope theo #ROOT_ID) theo phong cách phiếu
 * tiến độ IB: bảng thông tin, dải tổng kết, biểu đồ thống kê, mục điểm từng bài, phương án đồng hành.
 * Chỉ dùng dữ liệu đã an toàn trong ParentSafeReport — không có đáp án, ghi chú nội bộ hay điểm bài chưa duyệt.
 */
export const buildParentReportPrintDoc = ({ report, studentName, className, studentCode, generatedOn, competency, exams }: ParentReportPrintInput): string => {
  const ngay = generatedOn ?? new Date().toLocaleDateString('vi-VN');
  const avg = report.officialAveragePercent;
  const band = avg === null ? { label: 'Chưa đủ dữ liệu', color: '#64748b' } : scoreBand(avg);
  const trend = TREND_META[report.progress.trend];
  const officialSeries = report.results
    .filter(r => r.status === 'official' && r.score !== null && r.maxScore !== null && r.maxScore > 0)
    .map(r => (r.score as number) / (r.maxScore as number) * 100);

  const bridgeNote = report.strengths.length > 0 || report.areasToPractice.length > 0
    ? '<p class="muted" style="margin:10px 0 0;font-size:11.5px">Hai mục trên là tên các phần trong môn Toán. Phụ huynh không cần hiểu sâu — chỉ cần phối hợp nhắc con luyện đúng những phần thầy cô đánh dấu ở “Cần rèn thêm”.</p>'
    : '';

  let sectionNo = 0;
  const secHead = (title: string) => `<div class="sec-head"><span class="n">${++sectionNo}</span><h2>${title}</h2></div>`;
  const hasCompetency = Boolean(competency && competency.total > 0);
  const hasExams = Boolean(exams && (exams.moet.length > 0 || exams.tds.length > 0));

  return `<style>${styleBlock}</style>
<table class="info-table">
  <tr><td class="k">Học sinh</td><td>${esc(studentName)}</td></tr>
  <tr><td class="k">Lớp</td><td>${esc(className)}</td></tr>
  ${studentCode ? `<tr><td class="k">Mã học sinh</td><td>${esc(studentCode)}</td></tr>` : ''}
  <tr><td class="k">Ngày lập</td><td>${esc(ngay)}</td></tr>
</table>

<div class="title-wrap">
  <div class="kicker">SmartPlan AI · Trợ lý sư phạm</div>
  <h1>Báo cáo học tập môn Toán</h1>
  <p class="prep">Bản gửi phụ huynh · Lập ngày ${esc(ngay)}</p>
</div>

<div class="verdict" style="background:${band.color}">
  <div class="v-l"><small>Kết quả chung</small><b>${avg === null ? 'Chưa đủ dữ liệu' : `Mức ${band.label} · ${avg.toFixed(1)}%`}</b></div>
  <div class="v-r"><small>Xu hướng gần đây</small><b>${trend.arrow} ${esc(trend.label)}</b></div>
</div>

<div class="lead">${esc(report.overallSummary)}</div>

${secHead('Tổng quan bằng số')}
<div class="tiles">
  <div class="tile"><div class="cap">Điểm trung bình</div>${buildMeter(avg)}</div>
  <div class="tile"><div class="cap">Xu hướng điểm</div>${buildSparkline(officialSeries, trend)}</div>
  <div class="tile"><div class="cap">Tiến độ nộp bài</div>${buildCompletion(report.officialCount, report.pendingCount, report.missingCount)}</div>
</div>

${hasExams ? `${secHead('Điểm thi định kì')}${buildExamSection(exams as StudentExamScores)}` : ''}

${secHead('Điểm mạnh &amp; phần cần rèn')}
<div class="cards2">
  <div class="card good"><h3>✅ Điểm mạnh</h3>${listItems(report.strengths, 'Chưa đủ bằng chứng chính thức.')}</div>
  <div class="card warn"><h3>🎯 Cần rèn thêm</h3>${listItems(report.areasToPractice, 'Chưa có nội dung cần rèn được xác nhận.')}</div>
</div>
${bridgeNote}

${hasCompetency ? `${secHead('Năng lực Toán học')}${buildCompetencySection(competency as ParentCompetencySummary)}` : ''}

${secHead('Kết quả từng bài')}
${buildSubjectRows(report.results)}

${secHead('Cùng đồng hành với con')}
<div class="cards2">
  <div class="card home"><h3>🤝 Phụ huynh có thể làm ở nhà</h3>${listItems(report.parentActions, 'Chưa có gợi ý cụ thể.')}</div>
  <div class="card school"><h3>🎓 Thầy cô sẽ hỗ trợ</h3>${listItems(report.teacherActions, 'Chưa có gợi ý cụ thể.')}</div>
</div>

<div class="note">Báo cáo chỉ dùng kết quả đã được thầy cô xem và duyệt; bài đang chờ xử lý không hiển thị điểm. Điểm từng bài theo thang điểm của bài; điểm trung bình quy về phần trăm để so sánh. Không hiển thị đáp án hay ghi chú nội bộ.</div>

<div class="signature">
  <div><div class="sig-line">Phụ huynh (ký, ghi rõ họ tên)</div></div>
  <div><div class="sig-line">Giáo viên (ký, ghi rõ họ tên)</div></div>
</div>`;
};

const pdfFileName = ({ studentName, className }: ParentReportPrintInput): string =>
  `Bao cao PH - ${studentName} - ${className}.pdf`.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Xuất bản phụ huynh thành file PDF tải về (giống cách giáo án xuất PDF): dựng báo cáo vào một node
 * ẩn ngoài màn hình, chụp bằng html2canvas-pro + jsPDF rồi `pdf.save()`. Không mở tab, không hộp thoại in.
 */
export const exportParentReportToPdf = async (input: ParentReportPrintInput): Promise<void> => {
  const root = document.createElement('div');
  root.id = ROOT_ID;
  // Đặt ngoài màn hình nhưng vẫn được layout để html2canvas chụp đúng.
  root.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;';
  root.innerHTML = buildParentReportPrintDoc(input);
  document.body.appendChild(root);
  try {
    await exportElementToPdf(root, {
      filename: pdfFileName(input),
      // Giữ nguyên khối, không cắt ngang thẻ/biểu đồ khi sang trang.
      noBreakSelectors: ['h1', 'h2', 'h3', 'svg', 'table', 'tr', '.subject', '.tile', '.card', '.verdict', '.lead', '.sec-head', '.exam-block', '.comp-row'],
    });
  } finally {
    root.remove();
  }
};
