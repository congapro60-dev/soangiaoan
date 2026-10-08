import type { ParentSafeReport, ParentSafeAssignmentStatus, ParentSafeTrend } from './parentSafeReport';
import type { ParentCompetencyItem, ParentCompetencySummary, ParentReportPrintInput } from './parentReportTypes';
import { COMPETENCY_LEVELS, type CompetencyLevel } from './competency/framework';
import type { StudentExamScores } from './examScores';
import { hs1Average, type Hs1Mark } from './scoreBook';
import { exportElementToPdf } from '../../utils/pdfExport';
import type { MonthPoint, PeriodComparison } from './reportPeriod';
import { heroSvg, safeLogoDataUrl, sectionIcon, strandIcon, type SectionIconName } from './parentReportArt';
import {
  buildLessonMap, groupRequirementLines, lessonPriorities, MIN_REQUIREMENT_EVIDENCE, parentActionsForRequirements, requirementLevelLabel,
  type LessonSummary, type ParentRequirementLine, type RequirementLevel,
} from './parentRequirements';

export type { ParentCompetencyItem, ParentCompetencySummary, ParentReportPrintInput };

/** `print`: khổ A4 cố định 780px cho PDF/in. `web`: tự co giãn, chữ lớn, cho phụ huynh xem trên điện thoại. */
export type ParentReportVariant = 'print' | 'web';

/** id của node chứa bản báo cáo — CSS của bản in được scope theo id này, trang phụ huynh cũng phải dùng đúng id. */
export const PARENT_REPORT_ROOT_ID = 'parent-report-pdf-root';
const ROOT_ID = PARENT_REPORT_ROOT_ID;
const PDF_BOTTOM_MARGIN_MM = 20;

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

/** Tên mục — dùng chung cho tiêu đề và bảng biểu tượng. Lời nhắc ở mục đồng hành (parentRequirements) gọi đúng tên này. */
const LESSON_MAP_TITLE = 'Bản đồ theo bài SGK';

/** Mỗi nhãn/chip là MỘT khối không ngắt (`nw`): màn hẹp thì cả khối xuống dòng, không tách "Chưa / đạt". */
const lessonCard = (lesson: LessonSummary): string => {
  const tone = lesson.level ?? 'thieu';
  const label = lesson.level ? requirementLevelLabel(lesson.level) : 'Chưa đủ căn cứ';
  const meta = lesson.level
    ? [
      `Đạt ${Math.round(lesson.percent)}%`,
      ...(lesson.questions !== null ? [`${lesson.questions}&nbsp;câu làm căn cứ`] : []),
      // Câu làm tại lớp (bài kiểm tra định kì) đáng tin hơn BTVN — ghi rõ để phụ huynh biết căn cứ đến từ đâu.
      ...(lesson.testQuestions ? [`trong đó ${lesson.testQuestions}&nbsp;câu bài kiểm tra`] : []),
    ]
    : [lesson.questions !== null ? `Mới có ${lesson.questions}&nbsp;câu, chưa đủ để kết luận` : 'Chưa đủ câu để kết luận'];
  return `<div class="lm-card lm-${tone}">
  <div class="lm-top"><span class="lm-bai nw">${esc(lesson.lesson)}</span><span class="lm-lv nw">${label}</span></div>
  <p class="lm-name">${esc(lesson.title)}</p>
  ${lesson.level ? `<div class="lm-bar"><i style="width:${Math.max(2, Math.min(100, lesson.percent))}%"></i></div>` : ''}
  ${lesson.note ? `<p class="lm-note">${esc(lesson.note)}</p>` : ''}
  <div class="lm-meta">${meta.map(text => `<span class="nw">${text}</span>`).join('')}</div>
</div>`;
};

/**
 * "Bản đồ theo bài SGK": mỗi bài một thẻ màu + "Ưu tiên ôn trước" — câu trả lời cho "con hổng bài nào?" nằm ngay
 * tầng tóm tắt, không phải mở phần chi tiết. Lưới tự xếp: 1 cột trên điện thoại, 2 cột từ khổ iPad và bản in A4.
 */
const buildLessonMapSection = (lessons: readonly LessonSummary[], gradeLabel: string): [string, string] => {
  const priorities = lessonPriorities(lessons);
  const assessed = lessons.filter(lesson => lesson.level !== null);
  const priorityBox = priorities.length > 0
    ? `<div class="lm-pri"><p class="lm-pri-t">Ưu tiên ôn trước</p><ol>${priorities.map(lesson =>
      `<li><b class="nw">${esc(lesson.lesson)}</b> — ${esc(lesson.title)}</li>`).join('')}</ol></div>`
    : assessed.length > 0
      ? '<div class="lm-pri lm-pri-ok"><p class="lm-pri-t">Chưa có bài nào cần ôn gấp</p><p class="lm-pri-p">Các bài đã có đủ căn cứ đều ở mức Vững.</p></div>'
      : '';
  const legend = `<ul class="lm-legend">
  <li><i class="lm-d lm-vung"></i>Vững: đạt từ 80%</li>
  <li><i class="lm-d lm-dang"></i>Đang hình thành: 50–79%</li>
  <li><i class="lm-d lm-chua"></i>Chưa đạt: dưới 50%</li>
  <li><i class="lm-d lm-thieu"></i>Chưa đủ căn cứ: dưới ${MIN_REQUIREMENT_EVIDENCE}&nbsp;câu</li>
</ul>
<p class="lm-foot">Mức tính từ tỉ lệ điểm các câu thầy cô đã duyệt. Chi tiết từng yêu cầu cần đạt ở phần <span class="nw">“Chi tiết báo cáo”</span>.</p>`;
  // Tiêu đề mục đi cùng hàng thẻ đầu (không trơ trọi cuối trang PDF); các hàng sau chảy tự nhiên, thẻ không bị cắt.
  const [first, rest] = [lessons.slice(0, 2), lessons.slice(2)];
  return [
    `<p class="lm-sub">Con đang vững hay còn hổng ở bài nào${gradeLabel ? ` — <span class="nw">SGK ${esc(gradeLabel)}</span> <span class="nw">Kết nối tri thức</span>` : ''}.</p>
${priorityBox}
<div class="lm-grid">${first.map(lessonCard).join('')}</div>`,
    `${rest.length > 0 ? `<div class="lm-grid lm-more">${rest.map(lessonCard).join('')}</div>` : ''}
${legend}`,
  ];
};

/**
 * Kết quả theo yêu cầu cần đạt, nhóm theo chủ đề. Mỗi nhóm (tên chủ đề + dòng đầu) không bị cắt khi sang trang.
 * Trả về [phần đầu giữ cùng tiêu đề mục, phần còn lại].
 */
const buildRequirementSection = (lines: readonly ParentRequirementLine[]): [string, string] => {
  const groups = groupRequirementLines(lines);
  const thin = (line: ParentRequirementLine) => line.evidence < MIN_REQUIREMENT_EVIDENCE;
  const count = (level: RequirementLevel) => lines.filter(line => !thin(line) && line.level === level).length;
  const thinCount = lines.filter(thin).length;
  const summary = `<div class="req-sum">${LEVEL_ORDER.filter(level => level === 'vung' || count(level) > 0).map(level => `<span class="req-lv lv-${level}">${requirementLevelLabel(level)}: ${count(level)}</span>`).join('')}${thinCount > 0 ? `<span class="req-lv lv-thieu">Chưa đủ căn cứ: ${thinCount}</span>` : ''}</div>
<p class="muted" style="margin:6px 0 10px;font-size:11.5px">Đối chiếu Chương trình GDPT 2018 môn Toán. Mức do thầy cô xác nhận, gợi ý từ tỉ lệ điểm các câu đã duyệt trong kì: <span class="nw">Vững ≥&nbsp;80%</span> · <span class="nw">Đang hình thành 50–79%</span> · <span class="nw">Chưa đạt &lt;&nbsp;50%</span>.</p>`;
  const row = (line: ParentRequirementLine, text: string) => `<div class="req-row">
  <span class="req-lv lv-${thin(line) ? 'thieu' : line.level}">${thin(line) ? 'Chưa đủ căn cứ' : requirementLevelLabel(line.level)}</span>
  <div class="req-body">${line.note
    ? `<div class="req-main">${esc(line.note)}</div><div class="req-text">Theo chương trình: ${esc(text)}</div>`
    : `<div class="req-main">${esc(text)}</div>`}<div class="req-ev">Căn cứ: ${line.evidence} câu · đạt ${Math.round(line.percent)}%</div></div>
</div>`;
  const blocks = groups.map(group => {
    const [first, ...rest] = group.rows;
    return `<div class="req-keep"><div class="req-topic"><span class="req-ico">${strandIcon(group.strand, 16)}</span>${esc(group.strand)} · ${esc(group.topic)}</div>${row(first.line, first.item.text)}</div>${rest.map(r => row(r.line, r.item.text)).join('')}`;
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
  if (series.length < MIN_GRADED_FOR_TREND) {
    return `<p class="muted">Cần ít nhất ${MIN_GRADED_FOR_TREND} bài đã chấm để vẽ xu hướng.</p>`;
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
  // Ghi giá trị điểm đầu và điểm cuối để đường xu hướng đọc được, không chỉ là hình trang trí.
  const endLabel = (index: number, anchor: 'start' | 'end') => {
    const [x, y] = pts[index];
    return `<text x="${x.toFixed(1)}" y="${Math.max(10, y - 7).toFixed(1)}" text-anchor="${anchor}" font-size="11" font-weight="700" fill="#334155">${Math.round(series[index])}%</text>`;
  };
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><polyline points="${area}" fill="#eff6ff" stroke="none"/><polyline points="${line}" fill="none" stroke="#1d4ed8" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>${dots}${endLabel(0, 'start')}${endLabel(series.length - 1, 'end')}</svg>
  <p class="trend-line" style="color:${trend.color}">${trend.arrow} ${esc(trend.label)}</p>`;
};

/** Dưới ngần này thì "xu hướng" chưa đáng tin: chỉ 1–2 điểm không vẽ được đường, dễ kết luận sai về con. */
const MIN_GRADED_FOR_TREND = 3;

/** Chữ cái đầu của họ và tên cuối ("Vũ Việt Cường" → "VC") cho ảnh đại diện ở cuối báo cáo. */
const initialsOf = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
};

interface Takeaway { tone: 'good' | 'focus' | 'home'; label: string; text: string }

/**
 * "Tóm tắt nhanh" cho phụ huynh chỉ đọc 10 giây: một điểm mạnh, một điều cần chú ý, một việc có thể làm ở nhà.
 * Ưu tiên nhận xét theo yêu cầu cần đạt (đã viết cho phụ huynh đọc); chưa có thì lấy chủ đề chung của báo cáo.
 */
export const keyTakeaways = (
  report: Pick<ParentSafeReport, 'strengths' | 'areasToPractice' | 'parentActions'>,
  requirements?: readonly ParentRequirementLine[] | null,
): Takeaway[] => {
  const lines = requirements ?? [];
  const good = lines.filter(line => line.evidence >= MIN_REQUIREMENT_EVIDENCE && line.level === 'vung' && line.note).sort((a, b) => b.percent - a.percent)[0];
  const focus = lines.filter(line => line.evidence >= MIN_REQUIREMENT_EVIDENCE && line.level !== 'vung' && line.note).sort((a, b) => a.percent - b.percent)[0];
  const out: Takeaway[] = [];
  const goodText = good?.note || report.strengths[0];
  if (goodText) out.push({ tone: 'good', label: 'Điểm mạnh', text: goodText });
  const focusText = focus?.note || (report.areasToPractice[0] ? `Cần rèn thêm: ${report.areasToPractice[0]}.` : '');
  if (focusText) out.push({ tone: 'focus', label: 'Cần chú ý', text: focusText });
  if (report.parentActions[0]) out.push({ tone: 'home', label: 'Phụ huynh có thể làm', text: report.parentActions[0] });
  return out;
};

const buildTakeaways = (items: readonly Takeaway[]): string =>
  items.length === 0 ? '' : `<div class="takeaways"><div class="tk-title">Tóm tắt nhanh</div><div class="tk-grid">${items.map(item =>
    `<div class="tk tk-${item.tone}"><b><span class="tk-ico">${sectionIcon(item.tone === 'good' ? 'star' : item.tone === 'focus' ? 'flag' : 'home', 15)}</span>${esc(item.label)}</b><p>${esc(item.text)}</p></div>`).join('')}</div></div>`;

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

// Mức năng lực là thứ tự: hai mức cao cùng tông xanh lá, đậm dần theo mức (Xuất sắc nền đặc, Tốt nền nhạt).
const LEVEL_STYLE: Record<CompetencyLevel, { color: string; soft: string }> = {
  'Xuất sắc': { color: '#ffffff', soft: '#15803d' },
  'Tốt': { color: '#166534', soft: '#dcfce7' },
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
const printStyle = `
#${ROOT_ID} { width: 780px; box-sizing: border-box; padding: 30px 34px; background:#fff; color:#1e293b; font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif; font-size:13px; line-height:1.55; }
#${ROOT_ID} * { box-sizing: border-box; }
#${ROOT_ID} .info-table { width:100%; border-collapse:collapse; margin-bottom:20px; }
#${ROOT_ID} .info-table td { border:1px solid #dbe4ec; padding:8px 12px; font-size:12.5px; }
#${ROOT_ID} .info-table td.k { background:#f1f5f9; font-weight:800; width:150px; color:#334155; }
#${ROOT_ID} .title-wrap { border-bottom:3px solid #17375e; padding-bottom:14px; margin-bottom:18px; }
#${ROOT_ID} .kicker { font-size:11.5px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:#1d4ed8; }
#${ROOT_ID} .head-text h1 { font-size:24px; font-weight:800; color:#17375e; margin:5px 0 2px; }
#${ROOT_ID} .brandbar { display:flex; justify-content:space-between; align-items:baseline; gap:12px; margin-bottom:8px; }
#${ROOT_ID} .school-name { font-size:14px; font-weight:800; color:#17375e; }
#${ROOT_ID} .who { margin:4px 0 0; font-size:15px; color:#0f172a; }
#${ROOT_ID} .who b { font-weight:800; }
#${ROOT_ID} .title-wrap .prep { font-size:12.5px; color:#64748b; margin:2px 0 0; }
#${ROOT_ID} .verdict { border-radius:10px; padding:14px 18px; color:#fff; display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
#${ROOT_ID} .verdict .v-l small, #${ROOT_ID} .verdict .v-r small { display:block; font-size:11px; font-weight:700; opacity:.85; letter-spacing:.04em; text-transform:uppercase; }
#${ROOT_ID} .verdict .v-l b { font-size:22px; font-weight:800; }
#${ROOT_ID} .verdict .v-r { text-align:right; }
#${ROOT_ID} .verdict .v-r b { font-size:15px; font-weight:800; }
#${ROOT_ID} .sec-head { display:flex; align-items:center; gap:10px; margin:22px 0 11px; }
#${ROOT_ID} .sec-head .ico { display:inline-flex; width:32px; height:32px; border-radius:10px; border:1px solid #cfe0ee; background:#f1f7fc; color:#17375e; align-items:center; justify-content:center; flex:none; }
#${ROOT_ID} .hero { display:block; width:100%; height:auto; margin:0 0 16px; border-radius:14px; }
#${ROOT_ID} .head-row { display:flex; align-items:center; gap:16px; margin-bottom:12px; }
#${ROOT_ID} .logo { height:62px; max-width:150px; object-fit:contain; flex:none; }
#${ROOT_ID} .head-text { min-width:0; }
#${ROOT_ID} .req-ico, #${ROOT_ID} .tk-ico { display:inline-flex; vertical-align:middle; margin-right:6px; color:#1d6fa5; }
#${ROOT_ID} .tk-ico { margin-right:5px; }
#${ROOT_ID} .sec-head h2 { font-size:15px; font-weight:800; color:#17375e; margin:0; text-transform:uppercase; letter-spacing:.02em; }
#${ROOT_ID} .lead { border:1px solid #dbe4ec; border-left:5px solid #1d4ed8; border-radius:8px; padding:12px 16px; font-size:13.5px; font-weight:600; color:#334155; }
#${ROOT_ID} .takeaways { margin:16px 0 2px; }
#${ROOT_ID} .tk-title { font-size:12px; font-weight:800; letter-spacing:.05em; text-transform:uppercase; color:#475569; margin-bottom:8px; }
#${ROOT_ID} .tk-grid { display:flex; gap:10px; }
#${ROOT_ID} .tk { flex:1; border:1px solid #dbe4ec; border-top:4px solid #94a3b8; border-radius:10px; padding:10px 13px; }
#${ROOT_ID} .tk b { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.03em; }
#${ROOT_ID} .tk p { margin:5px 0 0; font-size:13px; color:#1e293b; }
#${ROOT_ID} .tk-good { border-top-color:#16a34a; } #${ROOT_ID} .tk-good b { color:#166534; }
#${ROOT_ID} .tk-focus { border-top-color:#d97706; } #${ROOT_ID} .tk-focus b { color:#92400e; }
#${ROOT_ID} .tk-home { border-top-color:#0284c7; } #${ROOT_ID} .tk-home b { color:#075985; }
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
#${ROOT_ID} .meter-scale > span { font-size:10.5px; color:#64748b; text-align:center; font-weight:600; }
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
#${ROOT_ID} .subj-sub { font-size:11.5px; font-weight:600; color:#64748b; }
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
#${ROOT_ID} .muted { color:#475569; font-style:italic; margin:0; }
#${ROOT_ID} .note { border:1px solid #dbe4ec; background:#f8fafc; border-radius:8px; padding:10px 14px; font-size:12px; color:#475569; margin-top:16px; }
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
#${ROOT_ID} .req-sum .req-lv { width:auto; padding:3px 12px; }
#${ROOT_ID} .chips { display:flex; flex-wrap:wrap; gap:8px; margin:-4px 0 14px; }
#${ROOT_ID} .chip { display:inline-flex; align-items:center; gap:6px; border-radius:999px; padding:5px 13px; font-size:12.5px; font-weight:700; }
#${ROOT_ID} .chip b { font-size:14px; }
#${ROOT_ID} .chip-ok { background:#dcfce7; color:#166534; } #${ROOT_ID} .chip-wait { background:#fef3c7; color:#92400e; } #${ROOT_ID} .chip-miss { background:#ffe4e6; color:#9f1239; }
#${ROOT_ID} .verdict .basis { display:block; margin-top:3px; font-size:11.5px; opacity:.92; font-weight:600; }
#${ROOT_ID} .more-sum { display:flex; align-items:center; gap:12px; padding:13px 16px; border:1px solid #cfe0ee; background:#f1f7fc; border-radius:12px; margin:24px 0 4px; color:#17375e; list-style:none; cursor:pointer; }
#${ROOT_ID} .more-sum::-webkit-details-marker { display:none; }
#${ROOT_ID} .more-sum .ico { display:inline-flex; width:32px; height:32px; border-radius:10px; background:#fff; border:1px solid #cfe0ee; align-items:center; justify-content:center; flex:none; }
#${ROOT_ID} .more-t b { display:block; font-size:15px; font-weight:800; text-transform:uppercase; letter-spacing:.02em; }
#${ROOT_ID} .more-t small { display:block; font-size:12px; color:#475569; font-weight:600; margin-top:2px; }
#${ROOT_ID} .more-sum .chev { margin-left:auto; font-size:16px; transition:transform .2s; }
#${ROOT_ID} .more[open] > .more-sum .chev { transform:rotate(180deg); }
#${ROOT_ID} .lv-thieu { background:#e2e8f0; color:#475569; }
#${ROOT_ID} .sig-name { margin-top:3px; font-size:13.5px; font-weight:800; color:#17375e; text-align:center; }
#${ROOT_ID} .teacher-foot { display:flex; align-items:center; gap:14px; margin-top:20px; padding:14px 16px; border:1px solid #cfe0ee; border-radius:14px; background:linear-gradient(135deg,#f1f7fc,#ffffff); }
#${ROOT_ID} .avatar { width:46px; height:46px; border-radius:50%; background:linear-gradient(135deg,#17375e,#14a3a3); color:#fff; font-weight:800; font-size:16px; display:flex; align-items:center; justify-content:center; flex:none; }
#${ROOT_ID} .teacher-foot b { display:block; font-size:15px; color:#17375e; }
#${ROOT_ID} .teacher-foot small { display:block; font-size:12.5px; color:#475569; font-weight:600; }
#${ROOT_ID} .teacher-foot p { margin:4px 0 0; font-size:13px; color:#334155; }
#${ROOT_ID} .req-topic { margin:12px 0 4px; font-size:12.5px; font-weight:800; color:#1e3a8a; border-bottom:1px solid #dbe4ec; padding-bottom:3px; }
#${ROOT_ID} .req-row { display:flex; gap:10px; align-items:flex-start; padding:6px 0; border-bottom:1px dashed #e2e8f0; }
#${ROOT_ID} .req-lv { flex:none; display:inline-block; width:112px; text-align:center; border-radius:999px; padding:2px 8px; font-size:11px; font-weight:800; }
#${ROOT_ID} .lv-vung { background:#dcfce7; color:#166534; }
#${ROOT_ID} .lv-dang { background:#fef3c7; color:#92400e; }
#${ROOT_ID} .lv-chua { background:#fee2e2; color:#991b1b; }
#${ROOT_ID} .req-body { flex:1; }
#${ROOT_ID} .req-text { margin-top:3px; font-size:11.5px; color:#64748b; }
#${ROOT_ID} .req-main { font-size:13.5px; font-weight:700; color:#0f172a; }
#${ROOT_ID} .req-ev { margin-top:3px; font-size:11.5px; color:#475569; }
#${ROOT_ID} .teacher-note { border:1px solid #dbe4ec; border-left:5px solid #7c3aed; border-radius:8px; padding:12px 16px; font-size:13px; color:#1e293b; white-space:normal; }
#${ROOT_ID} .nw { white-space:nowrap; }
#${ROOT_ID} .lm-vung { --lm-c:#16a34a; --lm-bg:#dcfce7; --lm-fg:#166534; }
#${ROOT_ID} .lm-dang { --lm-c:#ca8a04; --lm-bg:#fef3c7; --lm-fg:#92400e; }
#${ROOT_ID} .lm-chua { --lm-c:#dc2626; --lm-bg:#fee2e2; --lm-fg:#991b1b; }
#${ROOT_ID} .lm-thieu { --lm-c:#94a3b8; --lm-bg:#e2e8f0; --lm-fg:#475569; }
#${ROOT_ID} .lm-sub { margin:-4px 0 10px; font-size:12.5px; color:#475569; }
#${ROOT_ID} .lm-pri { border:1px solid #fed7aa; background:#fff7ed; border-radius:10px; padding:10px 14px; margin-bottom:12px; }
#${ROOT_ID} .lm-pri-t { margin:0 0 4px; font-size:12px; font-weight:800; color:#9a3412; text-transform:uppercase; letter-spacing:.03em; }
#${ROOT_ID} .lm-pri ol { margin:0; padding-left:20px; }
#${ROOT_ID} .lm-pri li { margin:0 0 2px; font-size:13.5px; font-weight:500; color:#1e293b; }
#${ROOT_ID} .lm-pri li b { color:#9a3412; }
#${ROOT_ID} .lm-pri-ok { border-color:#bbf7d0; background:#f0fdf4; }
#${ROOT_ID} .lm-pri-ok .lm-pri-t { color:#166534; }
#${ROOT_ID} .lm-pri-p { margin:0; font-size:13px; color:#334155; }
#${ROOT_ID} .lm-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, 300px), 1fr)); gap:10px; }
#${ROOT_ID} .lm-more { margin-top:10px; }
#${ROOT_ID} .lm-card { border:1px solid #dbe4ec; border-left:5px solid var(--lm-c); border-radius:10px; padding:10px 14px; display:flex; flex-direction:column; gap:6px; }
#${ROOT_ID} .lm-top { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
#${ROOT_ID} .lm-bai { font-size:11.5px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; color:var(--lm-fg); }
#${ROOT_ID} .lm-lv { font-size:11px; font-weight:800; padding:2px 10px; border-radius:999px; background:var(--lm-bg); color:var(--lm-fg); }
#${ROOT_ID} .lm-name { margin:0; font-size:14px; font-weight:800; line-height:1.35; color:#0f172a; text-wrap:balance; }
#${ROOT_ID} .lm-bar { height:6px; border-radius:999px; background:#eef2f7; overflow:hidden; }
#${ROOT_ID} .lm-bar > i { display:block; height:100%; border-radius:999px; background:var(--lm-c); }
#${ROOT_ID} .lm-note { margin:0; font-size:12.5px; line-height:1.5; color:#334155; text-wrap:pretty; }
#${ROOT_ID} .lm-meta { display:flex; flex-wrap:wrap; gap:2px 12px; font-size:11.5px; font-weight:600; color:#64748b; }
#${ROOT_ID} .lm-legend { list-style:none; margin:12px 0 0; padding:10px 0 0; border-top:1px solid #e2e8f0; display:flex; flex-wrap:wrap; gap:6px 18px; }
#${ROOT_ID} .lm-legend li { display:flex; align-items:center; gap:7px; margin:0; white-space:nowrap; font-size:11.5px; font-weight:500; color:#334155; }
#${ROOT_ID} .lm-d { width:10px; height:10px; border-radius:50%; flex:none; background:var(--lm-c); }
#${ROOT_ID} .lm-foot { margin:6px 0 0; font-size:11.5px; color:#64748b; text-wrap:pretty; }
`;

/** Bản web (điện thoại): bỏ khổ A4 cố định; chữ to hơn, các cột xếp dọc khi màn hẹp. Dữ liệu và nội dung giữ nguyên. */
const webStyle = `
#${ROOT_ID} { width:auto; max-width:820px; margin:0 auto; padding:18px 16px 26px; font-size:15px; line-height:1.6; }
#${ROOT_ID} svg { max-width:100%; height:auto; }
#${ROOT_ID} .head-text h1 { font-size:22px; line-height:1.25; }
#${ROOT_ID} .who { font-size:16px; }
#${ROOT_ID} .title-wrap .prep { font-size:13px; }
#${ROOT_ID} .lead, #${ROOT_ID} .teacher-note, #${ROOT_ID} .req-main, #${ROOT_ID} .tk p { font-size:15px; }
#${ROOT_ID} .req-text { font-size:13px; } #${ROOT_ID} .req-ev, #${ROOT_ID} .legend, #${ROOT_ID} .tile .cap, #${ROOT_ID} .note { font-size:12.5px; }
#${ROOT_ID} .subj-name, #${ROOT_ID} .card h3 { font-size:15px; } #${ROOT_ID} .comp-list, #${ROOT_ID} .cmp-verdict, #${ROOT_ID} .comp-progress, #${ROOT_ID} li { font-size:14.5px; }
#${ROOT_ID} .meter-scale > span { font-size:11px; } #${ROOT_ID} .tk b { font-size:12.5px; }
#${ROOT_ID} .lm-name { font-size:16.5px; } #${ROOT_ID} .lm-note, #${ROOT_ID} .lm-pri li { font-size:15px; } #${ROOT_ID} .lm-pri-p { font-size:14.5px; }
#${ROOT_ID} .lm-sub, #${ROOT_ID} .lm-meta, #${ROOT_ID} .lm-foot { font-size:13px; } #${ROOT_ID} .lm-legend li { font-size:13.5px; } #${ROOT_ID} .lm-bai, #${ROOT_ID} .lm-lv { font-size:12.5px; }
#${ROOT_ID} .lm-card { padding:12px 16px; gap:7px; border-radius:12px; } #${ROOT_ID} .lm-grid { gap:12px; } #${ROOT_ID} .lm-more { margin-top:12px; }
@media (max-width: 640px) {
  #${ROOT_ID} .lm-legend { flex-direction:column; gap:6px; }
  #${ROOT_ID} .tiles, #${ROOT_ID} .cards2, #${ROOT_ID} .tk-grid, #${ROOT_ID} .cmp { flex-direction:column; }
  #${ROOT_ID} .verdict { flex-direction:column; align-items:flex-start; gap:10px; } #${ROOT_ID} .verdict .v-r { text-align:left; }
  #${ROOT_ID} .cmp-arrow { transform:rotate(90deg); align-self:center; }
  #${ROOT_ID} .req-row { flex-direction:column; gap:6px; } #${ROOT_ID} .req-lv { width:auto; align-self:flex-start; padding:3px 12px; }
  #${ROOT_ID} .exam-block { flex-basis:100%; } #${ROOT_ID} .brandbar { flex-direction:column; gap:2px; }
  #${ROOT_ID} .head-row { flex-direction:column; align-items:flex-start; gap:8px; } #${ROOT_ID} .logo { height:50px; }
  #${ROOT_ID} .head-text h1 { font-size:20px; }
}
`;

const styleBlock = (variant: ParentReportVariant): string => (variant === 'web' ? printStyle + webStyle : printStyle);

/**
 * Dựng phần thân báo cáo phụ huynh (style + markup, đã scope theo #ROOT_ID) theo phong cách phiếu
 * tiến độ IB: bảng thông tin, dải tổng kết, biểu đồ thống kê, mục điểm từng bài, phương án đồng hành.
 * Chỉ dùng dữ liệu đã an toàn trong ParentSafeReport — không có đáp án, ghi chú nội bộ hay điểm bài chưa duyệt.
 */
export const buildParentReportPrintDoc = (
  { report, studentName, className, studentCode, generatedOn, competency, exams, hs1, period, comparison, monthly, teacherComment, requirements, branding }: ParentReportPrintInput,
  variant: ParentReportVariant = 'print',
): string => {
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

  const SECTION_ICON: Record<string, SectionIconName> = {
    'Nhận xét của giáo viên': 'comment', 'Tổng quan bằng số': 'chart', 'So sánh để thấy tiến bộ': 'trend', 'Điểm trung bình theo tháng': 'chart',
    'Điểm kiểm tra &amp; thi định kì': 'exam', 'Điểm thi định kì': 'exam', 'Kết quả theo yêu cầu cần đạt': 'target', 'Điểm mạnh &amp; phần cần rèn': 'star',
    'Năng lực Toán học': 'medal', 'Kết quả từng bài': 'list', 'Cùng đồng hành với con': 'heart', [LESSON_MAP_TITLE]: 'flag',
  };
  const secHead = (title: string) => `<div class="sec-head"><span class="ico">${sectionIcon(SECTION_ICON[title] ?? 'list', 18)}</span><h2>${title}</h2></div>`;
  // Tiêu đề mục luôn đi cùng nội dung (khối không bị cắt khi sang trang) — không để tiêu đề trơ trọi cuối trang.
  const section = (title: string, body: string, rest = '') => `<div class="sec-keep">${secHead(title)}${body}</div>${rest}`;
  const hasCompetency = Boolean(competency && competency.total > 0);
  const examScores: StudentExamScores = exams ?? { moet: [], tds: [] };
  const hs1Marks = hs1 ?? [];
  const hasExams = examScores.moet.length > 0 || examScores.tds.length > 0;
  const examTitle = hs1Marks.length > 0 ? 'Điểm kiểm tra &amp; thi định kì' : 'Điểm thi định kì';

  const schoolName = branding?.schoolName?.trim();
  const teacherName = branding?.teacherName?.trim();
  const logo = safeLogoDataUrl(branding?.logoDataUrl);
  // Có bản đồ theo bài thì bỏ "Tóm tắt nhanh": thẻ Điểm mạnh / Cần chú ý chép lại đúng ghi chú đã in trên bản đồ.
  const lessons = hasRequirements ? buildLessonMap(requirements as ParentRequirementLine[]) : [];
  const gradeLabel = (() => {
    const grade = (requirements ?? [])[0]?.id.match(/^T(\d+)\./)?.[1];
    return grade ? `Toán ${grade}` : '';
  })();
  const lessonMap = lessons.length > 0 ? section(LESSON_MAP_TITLE, ...buildLessonMapSection(lessons, gradeLabel)) : '';
  const takeawayItems = lessonMap ? [] : keyTakeaways(report, requirements);
  const takeaways = buildTakeaways(takeawayItems);
  // Mức thấp không dùng nền đỏ chói: phụ huynh đọc dòng đầu tiên này như một lời phán xét về con.
  const verdictBg = avg !== null && avg < 50 ? '#9a3412' : band.color;

  // Mức và xu hướng chỉ đáng tin khi đủ bài: ít bài thì nói rõ là tham khảo, không khẳng định.
  const gradedCount = officialSeries.length;
  const enoughForTrend = gradedCount >= MIN_GRADED_FOR_TREND;
  const basis = avg === null ? ''
    : gradedCount < MIN_GRADED_FOR_TREND ? `Mới có ${gradedCount} bài đã chấm — kết quả chỉ mang tính tham khảo.`
      : `Dựa trên ${gradedCount} bài đã chấm.`;
  const chips = ([
    [report.officialCount, 'bài đã chấm', 'ok'],
    [report.pendingCount, 'bài chờ thầy cô duyệt', 'wait'],
    [report.missingCount, 'bài chưa nộp', 'miss'],
  ] as const).filter(([count]) => count > 0)
    .map(([count, label, tone]) => `<span class="chip chip-${tone}"><b>${count}</b> ${label}</span>`).join('');

  // Gợi ý đầu đã nằm ở ô "Phụ huynh có thể làm" của Tóm tắt nhanh → mục đồng hành không nhắc lại.
  const homeActions = parentActionsForRequirements(report.parentActions, requirements);
  const homeList = takeawayItems.some(item => item.tone === 'home') && homeActions.length > 1 ? homeActions.slice(1) : homeActions;
  const actionsSection = () => section('Cùng đồng hành với con', `<div class="cards2">
  <div class="card home"><h3>Phụ huynh có thể làm ở nhà</h3>${listItems(homeList, 'Chưa có gợi ý cụ thể.')}</div>
  <div class="card school"><h3>Thầy cô sẽ hỗ trợ</h3>${listItems(report.teacherActions, 'Chưa có gợi ý cụ thể.')}</div>
</div>`);

  // ── Tầng chi tiết (phía dưới): số liệu, so sánh, điểm thi, yêu cầu cần đạt, năng lực, từng bài ──
  const detailBody = `${section('Tổng quan bằng số', `<div class="tiles">
  <div class="tile"><div class="cap">Điểm trung bình</div>${buildMeter(avg)}</div>
  <div class="tile"><div class="cap">Xu hướng điểm</div>${buildSparkline(enoughForTrend ? officialSeries : [], trend)}</div>
  <div class="tile"><div class="cap">Tiến độ nộp bài</div>${buildCompletion(report.officialCount, report.pendingCount, report.missingCount)}</div>
</div>`)}

${comparison ? section('So sánh để thấy tiến bộ', buildComparison(comparison)) : ''}

${monthly && monthly.length >= 2 && period?.kind !== 'month' ? section('Điểm trung bình theo tháng', buildMonthlyChart(monthly)) : ''}

${hasExams || hs1Marks.length > 0 ? section(examTitle, buildExamSection(examScores, hs1Marks)) : ''}

${hasRequirements
    ? section('Kết quả theo yêu cầu cần đạt', ...buildRequirementSection(requirements as ParentRequirementLine[]))
    : section('Điểm mạnh &amp; phần cần rèn', `<div class="cards2">
  <div class="card good"><h3>Điểm mạnh</h3>${listItems(report.strengths.slice(0, MAX_TOPIC_ITEMS), 'Chưa đủ bằng chứng chính thức.')}</div>
  <div class="card warn"><h3>Cần rèn thêm</h3>${listItems(report.areasToPractice.slice(0, MAX_TOPIC_ITEMS), 'Chưa có nội dung cần rèn được xác nhận.')}</div>
</div>`)}
${bridgeNote}

${hasCompetency ? section('Năng lực Toán học', buildCompetencySection(competency as ParentCompetencySummary)) : ''}

${(() => {
    // Danh sách bài có thể dài hơn một trang: chỉ giữ tiêu đề đi cùng bài ĐẦU, phần còn lại chảy tự nhiên.
    const rows = buildSubjectRows(report.results);
    const cut = rows.indexOf('<div class="subject">', 1);
    return cut > 0 ? section('Kết quả từng bài', rows.slice(0, cut), rows.slice(cut)) : section('Kết quả từng bài', rows);
  })()}

<div class="note">${period ? 'Chỉ tính các bài có hạn nộp trong thời gian báo cáo; điểm thi định kì hiện tất cả cột đã có. ' : ''}Bài đang chờ xử lý không hiển thị điểm. Điểm từng bài theo thang điểm của bài; điểm trung bình quy về phần trăm để so sánh. Không hiển thị đáp án hay ghi chú nội bộ.</div>`;

  const moreHead = `<span class="ico">${sectionIcon('list', 18)}</span><span class="more-t"><b>Chi tiết báo cáo</b><small>Điểm số, so sánh, yêu cầu cần đạt, năng lực, từng bài</small></span>`;
  // Bản web: tầng chi tiết thu gọn, phụ huynh bấm để mở. Bản in/PDF: in đủ, ngăn cách bằng dải tiêu đề.
  const detail = variant === 'web'
    ? `<details class="more"><summary class="more-sum">${moreHead}<span class="chev">▾</span></summary>${detailBody}</details>`
    : `<div class="more-sum more-banner">${moreHead}</div>${detailBody}`;

  // Tên giáo viên (GV tự nhập một lần) đứng ở CUỐI báo cáo.
  const footer = variant === 'print'
    ? `<div class="signature">
  <div><div class="sig-line">Phụ huynh (ký, ghi rõ họ tên)</div></div>
  <div><div class="sig-line">${teacherName ? 'Giáo viên' : 'Giáo viên (ký, ghi rõ họ tên)'}</div>${teacherName ? `<div class="sig-name">${esc(teacherName)}</div>` : ''}</div>
</div>`
    : teacherName
      ? `<div class="teacher-foot"><span class="avatar">${esc(initialsOf(teacherName))}</span><div><b>${esc(teacherName)}</b><small>Giáo viên${schoolName ? ` · ${esc(schoolName)}` : ''}</small><p>Cảm ơn quý phụ huynh đã đồng hành cùng con.</p></div></div>`
      : '';

  return `<style>${styleBlock(variant)}</style>
<div class="head-row">${logo ? `<img class="logo" src="${logo}" alt="Logo ${esc(schoolName ?? 'trường')}"/>` : ''}<div class="head-text">
  <div class="brandbar">${schoolName ? `<span class="school-name">${esc(schoolName)}</span>` : ''}<span class="kicker">Báo cáo gửi phụ huynh</span></div>
  <h1 style="margin-top:2px">${esc(period?.title ?? 'Báo cáo học tập môn Toán')}</h1></div></div>
${heroSvg()}
<div class="title-wrap" style="padding-top:0">
  <p class="who"><b>${esc(studentName)}</b> · Lớp&nbsp;${esc(className)}${studentCode ? ` · <span class="nw">Mã HS ${esc(studentCode)}</span>` : ''}</p>
  <p class="prep">${period ? `Thời gian báo cáo: ${esc(period.range)} · ` : ''}Lập ngày ${esc(ngay)}</p>
</div>

<div class="verdict" style="background:${verdictBg}">
  <div class="v-l"><small>Kết quả chung</small><b>${avg === null ? 'Chưa đủ dữ liệu' : `Mức ${band.label} · ${avg.toFixed(1)}%`}</b>${basis ? `<span class="basis">${esc(basis)}</span>` : ''}</div>
  <div class="v-r"><small>Xu hướng gần đây</small><b>${enoughForTrend ? `${trend.arrow} ${esc(trend.label)}` : 'Cần thêm bài để nhận định'}</b></div>
</div>
${chips ? `<div class="chips">${chips}</div>` : ''}

<div class="lead">${esc(report.overallSummary)}</div>

${lessonMap}

${takeaways}

${teacherComment?.trim() ? section('Nhận xét của giáo viên', `<div class="teacher-note">${teacherComment.trim().split(/\n+/).map(line => esc(line)).join('<br/>')}</div>`) : ''}

${actionsSection()}

${detail}

${footer}`;
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
      noBreakSelectors: ['h1', 'h2', 'h3', 'svg', 'table', 'tr', '.subject', '.tile', '.card', '.verdict', '.lead', '.sec-head', '.exam-block', '.comp-row', '.cmp', '.teacher-note', '.sec-keep', '.req-keep', '.req-row', '.lm-card', '.lm-pri', '.lm-legend'],
      // Số trang không được đè nội dung: lề dưới 20mm, số trang cách mép 6mm (chữ cao ~4.5mm, tới 10.5mm),
      // trang chỉ được giãn thêm 8mm (20−12) — nội dung luôn dừng cách mép ≥ 12mm.
      marginMm: [15, 12, PDF_BOTTOM_MARGIN_MM, 12],
      pageNumberFromBottomMm: 6,
      maxStretch: 1 + (PDF_BOTTOM_MARGIN_MM - 12) / (297 - 15 - PDF_BOTTOM_MARGIN_MM),
    });
  } finally {
    root.remove();
  }
}
