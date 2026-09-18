import type { ParentSafeReport, ParentSafeAssignmentStatus, ParentSafeTrend } from './parentSafeReport';
import { exportElementToPdf } from '../../utils/pdfExport';

export interface ParentReportPrintInput {
  report: ParentSafeReport;
  studentName: string;
  className: string;
  studentCode?: string;
  /** Ngày lập báo cáo dạng dd/mm/yyyy; mặc định là hôm nay. */
  generatedOn?: string;
}

const ROOT_ID = 'parent-report-pdf-root';

const STATUS_LABEL: Record<ParentSafeAssignmentStatus, string> = {
  official: 'Đã có kết quả',
  pending: 'Chờ thầy cô duyệt',
  grading: 'Đang được chấm',
  error: 'Cần xử lý lại',
  not_submitted: 'Chưa nộp',
};

const TREND_LABEL: Record<ParentSafeTrend, string> = {
  up: 'Đang tiến bộ',
  flat: 'Ổn định',
  down: 'Cần theo dõi thêm',
  not_enough_data: 'Chưa đủ dữ liệu',
};

const esc = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const scoreText = (score: number | null, maxScore: number | null): string =>
  score === null || maxScore === null ? '—' : `${score}/${maxScore}`;

const listItems = (items: readonly string[], emptyText: string): string =>
  items.length === 0
    ? `<p class="muted">${esc(emptyText)}</p>`
    : `<ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;

/** CSS scope theo #ROOT_ID để không rò rỉ style ra phần còn lại của app khi node được gắn tạm vào DOM. */
const styleBlock = `
#${ROOT_ID} { width: 780px; box-sizing: border-box; padding: 28px 30px; background: #ffffff; color: #1f2937; font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; font-size: 13px; line-height: 1.55; }
#${ROOT_ID} * { box-sizing: border-box; }
#${ROOT_ID} header { border-bottom: 3px solid #4f46e5; padding-bottom: 12px; margin-bottom: 18px; }
#${ROOT_ID} .brand { font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #4f46e5; }
#${ROOT_ID} h1 { font-size: 22px; margin: 6px 0 4px; color: #111827; }
#${ROOT_ID} .meta { font-size: 12.5px; color: #4b5563; margin: 0; }
#${ROOT_ID} .meta b { color: #111827; }
#${ROOT_ID} h2 { font-size: 14px; margin: 0 0 8px; color: #312e81; }
#${ROOT_ID} section { margin-bottom: 16px; }
#${ROOT_ID} .stats { display: flex; gap: 10px; }
#${ROOT_ID} .stat { flex: 1; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; text-align: center; }
#${ROOT_ID} .stat-label { display: block; font-size: 11px; color: #6b7280; font-weight: 700; }
#${ROOT_ID} .stat-value { display: block; font-size: 22px; font-weight: 800; color: #111827; margin-top: 4px; }
#${ROOT_ID} .callout { border: 1px solid #c7d2fe; background: #eef2ff; border-radius: 12px; padding: 12px 16px; }
#${ROOT_ID} .callout p { margin: 0; font-weight: 600; color: #312e81; }
#${ROOT_ID} .cols { display: flex; gap: 12px; }
#${ROOT_ID} .cols > .box { flex: 1; }
#${ROOT_ID} .box { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 16px; }
#${ROOT_ID} .box.good { border-color: #bbf7d0; background: #f0fdf4; }
#${ROOT_ID} .box.warn { border-color: #fde68a; background: #fffbeb; }
#${ROOT_ID} .box.home { border-color: #bae6fd; background: #f0f9ff; }
#${ROOT_ID} .box.school { border-color: #ddd6fe; background: #f5f3ff; }
#${ROOT_ID} ul { margin: 0; padding-left: 18px; }
#${ROOT_ID} li { margin-bottom: 5px; }
#${ROOT_ID} .muted { color: #6b7280; font-style: italic; margin: 0; }
#${ROOT_ID} .note { font-size: 11.5px; color: #6b7280; margin: 8px 0 0; }
#${ROOT_ID} table { width: 100%; border-collapse: collapse; }
#${ROOT_ID} th, #${ROOT_ID} td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #eef0f4; font-size: 12.5px; }
#${ROOT_ID} th { background: #f8fafc; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; }
#${ROOT_ID} td.score, #${ROOT_ID} th.score { text-align: right; font-weight: 800; white-space: nowrap; }
#${ROOT_ID} .trend { font-size: 11.5px; color: #475569; font-weight: 700; }
#${ROOT_ID} .signature { display: flex; gap: 16px; margin-top: 32px; }
#${ROOT_ID} .signature div { flex: 1; text-align: center; font-size: 11.5px; color: #475569; }
#${ROOT_ID} .sig-line { margin-top: 48px; border-top: 1px dotted #94a3b8; padding-top: 4px; }
#${ROOT_ID} footer { margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 11px; color: #94a3b8; }
`;

/**
 * Dựng phần thân báo cáo phụ huynh (style + markup, đã scope theo #ROOT_ID) để nhúng vào một node
 * rồi xuất PDF. Chỉ dùng dữ liệu đã an toàn trong ParentSafeReport — không có đáp án, ghi chú nội bộ
 * hay điểm bài chưa duyệt.
 */
export const buildParentReportPrintDoc = ({ report, studentName, className, studentCode, generatedOn }: ParentReportPrintInput): string => {
  const ngay = generatedOn ?? new Date().toLocaleDateString('vi-VN');
  const average = report.officialAveragePercent === null ? '—' : `${report.officialAveragePercent.toFixed(1)}%`;

  const stats = [
    { label: 'Bài đã có kết quả', value: String(report.officialCount) },
    { label: 'Điểm trung bình', value: average },
    { label: 'Chờ xử lý', value: String(report.pendingCount) },
    { label: 'Chưa nộp', value: String(report.missingCount) },
  ]
    .map(item => `<div class="stat"><span class="stat-label">${esc(item.label)}</span><span class="stat-value">${esc(item.value)}</span></div>`)
    .join('');

  const resultRows = report.results.length === 0
    ? '<tr><td colspan="3" class="muted">Chưa có bài được ghi nhận.</td></tr>'
    : report.results
        .map(result => `<tr><td>${esc(result.title)}</td><td>${esc(STATUS_LABEL[result.status])}</td><td class="score">${esc(scoreText(result.score, result.maxScore))}</td></tr>`)
        .join('');

  const bridgeNote = report.strengths.length > 0 || report.areasToPractice.length > 0
    ? '<section><p class="note">Hai mục trên là tên các phần trong môn Toán. Phụ huynh không cần hiểu sâu — chỉ cần phối hợp nhắc con luyện đúng những phần thầy cô đánh dấu ở “Cần rèn thêm”.</p></section>'
    : '';

  return `<style>${styleBlock}</style>
<header>
  <div class="brand">SmartPlan AI · Báo cáo học tập gửi phụ huynh</div>
  <h1>${esc(studentName)}</h1>
  <p class="meta">Lớp <b>${esc(className)}</b>${studentCode ? ` · Mã học sinh <b>${esc(studentCode)}</b>` : ''} · Lập ngày <b>${esc(ngay)}</b></p>
</header>

<section><div class="stats">${stats}</div></section>

<section class="callout">
  <h2>Nhận xét chung về con</h2>
  <p>${esc(report.overallSummary)}</p>
</section>

<section class="cols">
  <div class="box good"><h2>Điểm mạnh</h2>${listItems(report.strengths, 'Chưa đủ bằng chứng chính thức.')}</div>
  <div class="box warn"><h2>Cần rèn thêm</h2>${listItems(report.areasToPractice, 'Chưa có nội dung cần rèn được xác nhận.')}</div>
</section>
${bridgeNote}

<section>
  <h2>Kết quả theo bài <span class="trend">· Xu hướng: ${esc(TREND_LABEL[report.progress.trend])}</span></h2>
  <table>
    <thead><tr><th>Bài</th><th>Trạng thái</th><th class="score">Điểm</th></tr></thead>
    <tbody>${resultRows}</tbody>
  </table>
</section>

<section class="cols">
  <div class="box home"><h2>Phụ huynh có thể đồng hành cùng con</h2>${listItems(report.parentActions, 'Chưa có gợi ý cụ thể.')}</div>
  <div class="box school"><h2>Thầy cô sẽ hỗ trợ con</h2>${listItems(report.teacherActions, 'Chưa có gợi ý cụ thể.')}</div>
</section>

<div class="signature">
  <div><div class="sig-line">Phụ huynh (ký, ghi rõ họ tên)</div></div>
  <div><div class="sig-line">Giáo viên (ký, ghi rõ họ tên)</div></div>
</div>

<footer>Bản này chỉ sử dụng kết quả đã được thầy cô xem và duyệt. Bài đang chờ xử lý không hiển thị điểm, đáp án hoặc ghi chú nội bộ.</footer>`;
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
    await exportElementToPdf(root, { filename: pdfFileName(input) });
  } finally {
    root.remove();
  }
};
