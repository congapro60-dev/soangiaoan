import type { ParentSafeReport, ParentSafeAssignmentStatus, ParentSafeTrend } from './parentSafeReport';
import { COMPETENCY_LEVELS, type CompetencyLevel } from './competency/framework';
import type { StudentExamScores } from './examScores';
import { hs1Average, type Hs1Mark } from './scoreBook';
import { exportElementToPdf } from '../../utils/pdfExport';
import type { MonthPoint, PeriodComparison, ReportKind } from './reportPeriod';
import { groupRequirementLines, requirementLevelLabel, type ParentRequirementLine, type RequirementLevel } from './parentRequirements';

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
  /** Điểm thi định kì (MOET + TDS) từ sổ điểm lớp. */
  exams?: StudentExamScores | null;
  /** Điểm hệ số 1 giáo viên nhập trên lớp. Vắng cả hai thì bỏ mục điểm kiểm tra/thi. */
  hs1?: Hs1Mark[] | null;
  /** Báo cáo theo tháng/kì/năm; vắng = báo cáo chung từ đầu năm như trước. */
  period?: { title: string; range: string; kind: ReportKind } | null;
  /** So sánh tháng trước / hai nửa kì / hai học kì. */
  comparison?: PeriodComparison | null;
  /** Điểm trung bình theo từng tháng (báo cáo kì/năm). */
  monthly?: MonthPoint[] | null;
  /** Nhận xét riêng của giáo viên (AI soạn nháp, giáo viên đã sửa). */
  teacherComment?: string;
  /** Kết quả theo yêu cầu cần đạt (giáo viên đã soát). Có thì thay cho danh sách "Điểm mạnh / Cần rèn thêm". */
  requirements?: ParentRequirementLine[] | null;
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

/** Danh sách chủ đề cũ (khi chưa có kết quả theo YCCĐ) chỉ in tối đa chừng này dòng mỗi cột. */
const MAX_TOPIC_ITEMS = 6;

const LEVEL_ORDER: readonly RequirementLevel[] = ['vung', 'dang', 'chua'];

/**
 * Kết quả theo yêu cầu cần đạt, nhóm theo chủ đề. Mỗi nhóm (tên chủ đề + dòng đầu) không bị cắt khi sang trang.
 * Trả về [phần đầu giữ cùng tiêu đề mục, phần còn lại].
 */
const buildRequirementSection = (lines: readonly ParentRequirementLine[]): [string, string] => {
  const groups = groupRequirementLines(lines);
  const count = (level: RequirementLevel) => lines.filter(line => line.level === level).length;
  const summary = `<div class="req-sum">${LEVEL_ORDER.map(level => `<span class="req-lv lv-${level}">${requirementLevelLabel(level)}: ${count(level)}</span>`).join('')}</div>
<p class="muted" style="margin:6px 0 10px;font-size:11.5px">Đối chiếu Chương trình GDPT 2018 môn Toán. Mức do thầy cô xác nhận, gợi ý từ tỉ lệ điểm các câu đã duyệt trong kì: Vững ≥ 80% · Đang hình thành 50–79% · Chưa đạt &lt; 50%.</p>`;
  const row = (line: ParentRequirementLine, text: string) => `<div class="req-row">
  <span class="req-lv lv-${line.level}">${requirementLevelLabel(line.level)}</span>
  <div class="req-body"><div class="req-text">${esc(text)}</div>${line.note ? `<div class="req-note">${esc(line.note)}</div>` : ''}<div class="req-ev">Căn cứ: ${line.evidence} câu · đạt ${Math.round(line.percent)}%</div></div>
</div>`;
  const blocks = groups.map(group => {
    const [first, ...rest] = group.rows;
    return `<div class="req-keep"><div class="req-topic">${esc(group.strand)} · ${esc(group.topic)}</div>${row(first.line, first.item.text)}</div>${rest.map(r => row(r.line, r.item.text)).join('')}`;
  });
  return [summary + (blocks[0] ?? ''), blocks.slice(1).join('')];
};

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

/** Một hàng điểm thang 10 có thanh mức (dùng cho MOET và hệ số 1). */
const scale10Row = (label: string, score: number, sub = ''): string => {
  const pct = Math.max(0, Math.min(100, score * 10));
  const band = scoreBand(pct);
  return `<div class="subject"><div class="subj-top"><div class="subj-name"><span class="dot" style="background:${band.color}"></span>${esc(label)}${sub ? `<span class="subj-sub">${esc(sub)}</span>` : ''}</div><div class="subj-grade" style="color:${band.color}">${esc(fmtScore(score))}/10</div></div><div class="subj-bar"><span style="width:${pct}%;background:${band.color}"></span></div></div>`;
};

const ddmm = (isoDay: string): string => {
  const [y, m, d] = isoDay.split('-');
  return d && m && y ? `${d}/${m}/${y}` : isoDay;
};

/** Mục điểm kiểm tra/thi: MOET (thang 10) + TDS (điểm quý kèm điểm chữ) + hệ số 1 (thang 10, có TB). */
const buildExamSection = (exams: StudentExamScores, hs1: readonly Hs1Mark[]): string => {
  const blocks: string[] = [];
  if (exams.moet.length > 0) {
    const rows = exams.moet.map(mark => scale10Row(mark.label, mark.score)).join('');
    blocks.push(`<div class="exam-block"><p class="exam-cap">Đánh giá định kì (thang 10)</p>${rows}</div>`);
  }
  if (exams.tds.length > 0) {
    const rows = exams.tds.map(mark =>
      `<div class="subject"><div class="subj-top"><div class="subj-name"><span class="dot" style="background:#6366f1"></span>${esc(mark.label)}</div><div class="subj-grade" style="color:#4338ca">${esc(fmtScore(mark.score))}${mark.letter ? `<span class="tds-letter">${esc(mark.letter)}</span>` : ''}</div></div></div>`
    ).join('');
    blocks.push(`<div class="exam-block"><p class="exam-cap">Điểm theo quý (hệ TDS)</p>${rows}</div>`);
  }
  if (hs1.length > 0) {
    const rows = hs1.map(mark => scale10Row(mark.label, mark.score, ddmm(mark.date))).join('');
    const avg = hs1Average(hs1);
    blocks.push(`<div class="exam-block"><p class="exam-cap">Điểm hệ số 1 trên lớp (thang 10)${avg === null ? '' : ` · TB ${esc(fmtScore(avg))}`}</p>${rows}</div>`);
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

/** Hai cột so sánh điểm trung bình (trước → sau) + câu kết luận tăng/giảm. */
const buildComparison = (c: PeriodComparison): string => {
  const bar = (s: PeriodComparison['before']) => {
    if (s.avgPercent === null) return `<div class="cmp-side"><p class="cmp-lab">${esc(s.label)}</p><p class="muted">Chưa có bài chấm chính thức.</p></div>`;
    const band = scoreBand(s.avgPercent);
    return `<div class="cmp-side"><p class="cmp-lab">${esc(s.label)} · ${s.count} bài</p><div class="subj-bar"><span style="width:${Math.max(0, Math.min(100, s.avgPercent))}%;background:${band.color}"></span></div><p class="cmp-num" style="color:${band.color}">${s.avgPercent.toFixed(1)}%</p></div>`;
  };
  const { before, after } = c;
  let verdict = '';
  if (before.avgPercent !== null && after.avgPercent !== null) {
    const diff = after.avgPercent - before.avgPercent;
    verdict = Math.abs(diff) < 3
      ? 'Kết quả giữ ổn định giữa hai giai đoạn.'
      : diff > 0 ? `Tiến bộ ${diff.toFixed(1)} điểm phần trăm so với giai đoạn trước.` : `Giảm ${Math.abs(diff).toFixed(1)} điểm phần trăm so với giai đoạn trước — cần theo dõi thêm.`;
  }
  return `<div class="cmp">${bar(before)}<div class="cmp-arrow">→</div>${bar(after)}</div>${verdict ? `<p class="cmp-verdict">${esc(verdict)}</p>` : ''}`;
};

/** Cột điểm trung bình theo tháng (SVG). */
const buildMonthlyChart = (points: readonly MonthPoint[]): string => {
  const W = 700, H = 150, padB = 24, padT = 18, gap = 14;
  const barW = Math.min(64, (W - gap * (points.length + 1)) / points.length);
  const total = points.length * barW + (points.length + 1) * gap;
  const x0 = (W - total) / 2;
  const bars = points.map((p, i) => {
    const h = (Math.max(0, Math.min(100, p.avgPercent)) / 100) * (H - padB - padT);
    const x = x0 + gap + i * (barW + gap);
    const y = H - padB - h;
    const color = scoreBand(p.avgPercent).color;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="5" fill="${color}"/>
<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="800" fill="#334155">${Math.round(p.avgPercent)}%</text>
<text x="${(x + barW / 2).toFixed(1)}" y="${H - 7}" text-anchor="middle" font-size="11" font-weight="700" fill="#64748b">${esc(p.label)} (${p.count})</text>`;
  }).join('');
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><line x1="0" y1="${H - padB}" x2="${W}" y2="${H - padB}" stroke="#dbe4ec"/>${bars}</svg><p class="muted" style="font-size:11.5px">Mỗi cột là điểm trung bình các bài đã chấm chính thức trong tháng (trong ngoặc: số bài).</p>`;
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
#${ROOT_ID} .exam-wrap { display:flex; flex-wrap:wrap; gap:14px; }
#${ROOT_ID} .exam-block { flex:1 1 300px; min-width:0; }
#${ROOT_ID} .subj-sub { font-size:11px; font-weight:600; color:#94a3b8; }
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
#${ROOT_ID} .cmp { display:flex; align-items:center; gap:14px; }
#${ROOT_ID} .cmp-side { flex:1; border:1px solid #dbe4ec; border-radius:10px; padding:10px 14px; }
#${ROOT_ID} .cmp-lab { margin:0 0 6px; font-size:12px; font-weight:800; color:#334155; }
#${ROOT_ID} .cmp-num { margin:6px 0 0; font-size:18px; font-weight:800; }
#${ROOT_ID} .cmp-arrow { font-size:22px; font-weight:800; color:#94a3b8; }
#${ROOT_ID} .cmp-verdict { margin:8px 0 0; font-size:12.5px; font-weight:700; color:#334155; }
#${ROOT_ID} .req-sum { display:flex; gap:8px; flex-wrap:wrap; }
#${ROOT_ID} .req-topic { margin:12px 0 4px; font-size:12.5px; font-weight:800; color:#1e3a8a; border-bottom:1px solid #dbe4ec; padding-bottom:3px; }
#${ROOT_ID} .req-row { display:flex; gap:10px; align-items:flex-start; padding:6px 0; border-bottom:1px dashed #e2e8f0; }
#${ROOT_ID} .req-lv { flex:none; display:inline-block; min-width:92px; text-align:center; border-radius:999px; padding:2px 8px; font-size:11px; font-weight:800; }
#${ROOT_ID} .lv-vung { background:#dcfce7; color:#166534; }
#${ROOT_ID} .lv-dang { background:#fef3c7; color:#92400e; }
#${ROOT_ID} .lv-chua { background:#fee2e2; color:#991b1b; }
#${ROOT_ID} .req-body { flex:1; }
#${ROOT_ID} .req-text { font-size:12.5px; color:#1e293b; }
#${ROOT_ID} .req-note { margin-top:3px; font-size:12px; color:#334155; font-style:italic; }
#${ROOT_ID} .req-ev { margin-top:2px; font-size:10.5px; color:#64748b; }
#${ROOT_ID} .teacher-note { border:1px solid #dbe4ec; border-left:5px solid #7c3aed; border-radius:8px; padding:12px 16px; font-size:13px; color:#1e293b; white-space:normal; }
`;

/**
 * Dựng phần thân báo cáo phụ huynh (style + markup, đã scope theo #ROOT_ID) theo phong cách phiếu
 * tiến độ IB: bảng thông tin, dải tổng kết, biểu đồ thống kê, mục điểm từng bài, phương án đồng hành.
 * Chỉ dùng dữ liệu đã an toàn trong ParentSafeReport — không có đáp án, ghi chú nội bộ hay điểm bài chưa duyệt.
 */
export const buildParentReportPrintDoc = ({ report, studentName, className, studentCode, generatedOn, competency, exams, hs1, period, comparison, monthly, teacherComment, requirements }: ParentReportPrintInput): string => {
  const ngay = generatedOn ?? new Date().toLocaleDateString('vi-VN');
  const avg = report.officialAveragePercent;
  const band = avg === null ? { label: 'Chưa đủ dữ liệu', color: '#64748b' } : scoreBand(avg);
  const trend = TREND_META[report.progress.trend];
  const officialSeries = report.results
    .filter(r => r.status === 'official' && r.score !== null && r.maxScore !== null && r.maxScore > 0)
    .map(r => (r.score as number) / (r.maxScore as number) * 100);

  const hasRequirements = Boolean(requirements && requirements.length > 0);
  const bridgeNote = !hasRequirements && (report.strengths.length > 0 || report.areasToPractice.length > 0)
    ? '<p class="muted" style="margin:10px 0 0;font-size:11.5px">Hai mục trên là tên các phần trong môn Toán. Phụ huynh không cần hiểu sâu — chỉ cần phối hợp nhắc con luyện đúng những phần thầy cô đánh dấu ở “Cần rèn thêm”.</p>'
    : '';

  let sectionNo = 0;
  const secHead = (title: string) => `<div class="sec-head"><span class="n">${++sectionNo}</span><h2>${title}</h2></div>`;
  // Tiêu đề mục luôn đi cùng nội dung (khối không bị cắt khi sang trang) — không để tiêu đề trơ trọi cuối trang.
  const section = (title: string, body: string, rest = '') => `<div class="sec-keep">${secHead(title)}${body}</div>${rest}`;
  const hasCompetency = Boolean(competency && competency.total > 0);
  const examScores: StudentExamScores = exams ?? { moet: [], tds: [] };
  const hs1Marks = hs1 ?? [];
  const hasExams = examScores.moet.length > 0 || examScores.tds.length > 0;
  const examTitle = hs1Marks.length > 0 ? 'Điểm kiểm tra &amp; thi định kì' : 'Điểm thi định kì';

  return `<style>${styleBlock}</style>
<table class="info-table">
  <tr><td class="k">Học sinh</td><td>${esc(studentName)}</td></tr>
  <tr><td class="k">Lớp</td><td>${esc(className)}</td></tr>
  ${studentCode ? `<tr><td class="k">Mã học sinh</td><td>${esc(studentCode)}</td></tr>` : ''}
  ${period ? `<tr><td class="k">Thời gian báo cáo</td><td>${esc(period.range)}</td></tr>` : ''}
  <tr><td class="k">Ngày lập</td><td>${esc(ngay)}</td></tr>
</table>

<div class="title-wrap">
  <div class="kicker">SmartPlan AI · Trợ lý sư phạm</div>
  <h1>${esc(period?.title ?? 'Báo cáo học tập môn Toán')}</h1>
  <p class="prep">Bản gửi phụ huynh${period ? ` · ${esc(period.range)}` : ''} · Lập ngày ${esc(ngay)}</p>
</div>

<div class="verdict" style="background:${band.color}">
  <div class="v-l"><small>Kết quả chung</small><b>${avg === null ? 'Chưa đủ dữ liệu' : `Mức ${band.label} · ${avg.toFixed(1)}%`}</b></div>
  <div class="v-r"><small>Xu hướng gần đây</small><b>${trend.arrow} ${esc(trend.label)}</b></div>
</div>

<div class="lead">${esc(report.overallSummary)}</div>

${teacherComment?.trim() ? section('Nhận xét của giáo viên', `<div class="teacher-note">${teacherComment.trim().split(/\n+/).map(line => esc(line)).join('<br/>')}</div>`) : ''}

${section('Tổng quan bằng số', `<div class="tiles">
  <div class="tile"><div class="cap">Điểm trung bình</div>${buildMeter(avg)}</div>
  <div class="tile"><div class="cap">Xu hướng điểm</div>${buildSparkline(officialSeries, trend)}</div>
  <div class="tile"><div class="cap">Tiến độ nộp bài</div>${buildCompletion(report.officialCount, report.pendingCount, report.missingCount)}</div>
</div>`)}

${comparison ? section('So sánh để thấy tiến bộ', buildComparison(comparison)) : ''}

${monthly && monthly.length >= 2 && period?.kind !== 'month' ? section('Điểm trung bình theo tháng', buildMonthlyChart(monthly)) : ''}

${hasExams || hs1Marks.length > 0 ? section(examTitle, buildExamSection(examScores, hs1Marks)) : ''}

${hasRequirements
    ? section('Kết quả theo yêu cầu cần đạt', ...buildRequirementSection(requirements as ParentRequirementLine[]))
    : section('Điểm mạnh &amp; phần cần rèn', `<div class="cards2">
  <div class="card good"><h3>✅ Điểm mạnh</h3>${listItems(report.strengths.slice(0, MAX_TOPIC_ITEMS), 'Chưa đủ bằng chứng chính thức.')}</div>
  <div class="card warn"><h3>🎯 Cần rèn thêm</h3>${listItems(report.areasToPractice.slice(0, MAX_TOPIC_ITEMS), 'Chưa có nội dung cần rèn được xác nhận.')}</div>
</div>`)}
${bridgeNote}

${hasCompetency ? section('Năng lực Toán học', buildCompetencySection(competency as ParentCompetencySummary)) : ''}

${(() => {
    // Danh sách bài có thể dài hơn một trang: chỉ giữ tiêu đề đi cùng bài ĐẦU, phần còn lại chảy tự nhiên.
    const rows = buildSubjectRows(report.results);
    const cut = rows.indexOf('<div class="subject">', 1);
    return cut > 0 ? section('Kết quả từng bài', rows.slice(0, cut), rows.slice(cut)) : section('Kết quả từng bài', rows);
  })()}

${section('Cùng đồng hành với con', `<div class="cards2">
  <div class="card home"><h3>🤝 Phụ huynh có thể làm ở nhà</h3>${listItems(report.parentActions, 'Chưa có gợi ý cụ thể.')}</div>
  <div class="card school"><h3>🎓 Thầy cô sẽ hỗ trợ</h3>${listItems(report.teacherActions, 'Chưa có gợi ý cụ thể.')}</div>
</div>`)}

<div class="note">${period ? 'Chỉ tính các bài có hạn nộp trong thời gian báo cáo; điểm thi định kì hiện tất cả cột đã có. ' : ''}Báo cáo chỉ dùng kết quả đã được thầy cô xem và duyệt; bài đang chờ xử lý không hiển thị điểm. Điểm từng bài theo thang điểm của bài; điểm trung bình quy về phần trăm để so sánh. Không hiển thị đáp án hay ghi chú nội bộ.</div>

<div class="signature">
  <div><div class="sig-line">Phụ huynh (ký, ghi rõ họ tên)</div></div>
  <div><div class="sig-line">Giáo viên (ký, ghi rõ họ tên)</div></div>
</div>`;
};

export const parentReportFileName = ({ studentName, className, period }: ParentReportPrintInput): string =>
  `${period ? period.title.split(' — ')[0] : 'Bao cao PH'} - ${studentName} - ${className}.pdf`.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Xuất bản phụ huynh thành file PDF tải về (giống cách giáo án xuất PDF): dựng báo cáo vào một node
 * ẩn ngoài màn hình, chụp bằng html2canvas-pro + jsPDF rồi `pdf.save()`. Không mở tab, không hộp thoại in.
 */
export function exportParentReportToPdf(input: ParentReportPrintInput): Promise<void>;
export function exportParentReportToPdf(input: ParentReportPrintInput, output: 'blob'): Promise<Blob>;
export async function exportParentReportToPdf(input: ParentReportPrintInput, output: 'save' | 'blob' = 'save'): Promise<Blob | void> {
  const root = document.createElement('div');
  root.id = ROOT_ID;
  // Đặt ngoài màn hình nhưng vẫn được layout để html2canvas chụp đúng.
  root.style.cssText = 'position:fixed;left:-10000px;top:0;z-index:-1;';
  root.innerHTML = buildParentReportPrintDoc(input);
  document.body.appendChild(root);
  try {
    return await exportElementToPdf(root, {
      output,
      filename: parentReportFileName(input),
      // Giữ nguyên khối, không cắt ngang thẻ/biểu đồ khi sang trang.
      noBreakSelectors: ['h1', 'h2', 'h3', 'svg', 'table', 'tr', '.subject', '.tile', '.card', '.verdict', '.lead', '.sec-head', '.exam-block', '.comp-row', '.cmp', '.teacher-note', '.sec-keep', '.req-keep', '.req-row'],
    });
  } finally {
    root.remove();
  }
}
