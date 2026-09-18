import type { ParentSafeReport, ParentSafeAssignmentStatus, ParentSafeTrend } from './parentSafeReport';

export interface ParentReportPrintInput {
  report: ParentSafeReport;
  studentName: string;
  className: string;
  studentCode?: string;
  /** Ngày lập báo cáo dạng dd/mm/yyyy; mặc định là hôm nay. */
  generatedOn?: string;
}

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

/**
 * Dựng một trang HTML A4 hoàn chỉnh, độc lập với giao diện app, để in / lưu PDF gửi phụ huynh.
 * Chỉ dùng dữ liệu đã an toàn trong ParentSafeReport — không có đáp án, ghi chú nội bộ hay điểm bài chưa duyệt.
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
    ? '<p class="note">Hai mục trên là tên các phần trong môn Toán. Phụ huynh không cần hiểu sâu — chỉ cần phối hợp nhắc con luyện đúng những phần thầy cô đánh dấu ở “Cần rèn thêm”.</p>'
    : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Báo cáo học tập — ${esc(studentName)} (${esc(className)})</title>
<style>
  * { box-sizing: border-box; }
  @page { size: A4; margin: 16mm 14mm; }
  html, body { margin: 0; padding: 0; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1f2937; font-size: 12.5px; line-height: 1.5; background: #fff; }
  .sheet { max-width: 720px; margin: 0 auto; padding: 8px; }
  header { border-bottom: 3px solid #4f46e5; padding-bottom: 12px; margin-bottom: 16px; }
  .brand { font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #4f46e5; }
  h1 { font-size: 20px; margin: 6px 0 4px; color: #111827; }
  .meta { font-size: 12px; color: #4b5563; }
  .meta b { color: #111827; }
  h2 { font-size: 13px; margin: 0 0 8px; color: #312e81; display: flex; align-items: center; gap: 6px; }
  section { margin-bottom: 16px; page-break-inside: avoid; }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .stat { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; text-align: center; }
  .stat-label { display: block; font-size: 10.5px; color: #6b7280; font-weight: 700; }
  .stat-value { display: block; font-size: 20px; font-weight: 800; color: #111827; margin-top: 4px; }
  .callout { border: 1px solid #c7d2fe; background: #eef2ff; border-radius: 12px; padding: 12px 14px; }
  .callout p { margin: 0; font-weight: 600; color: #312e81; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .box { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 14px; }
  .box.good { border-color: #bbf7d0; background: #f0fdf4; }
  .box.warn { border-color: #fde68a; background: #fffbeb; }
  .box.home { border-color: #bae6fd; background: #f0f9ff; }
  .box.school { border-color: #ddd6fe; background: #f5f3ff; }
  .box h2 { margin-bottom: 8px; }
  ul { margin: 0; padding-left: 18px; }
  li { margin-bottom: 5px; }
  .muted { color: #6b7280; font-style: italic; margin: 0; }
  .note { font-size: 11px; color: #6b7280; margin: 8px 0 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #eef0f4; font-size: 12px; }
  th { background: #f8fafc; font-size: 10.5px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; }
  td.score, th.score { text-align: right; font-weight: 800; white-space: nowrap; }
  .trend { font-size: 11px; color: #475569; font-weight: 700; }
  .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 28px; page-break-inside: avoid; }
  .signature div { text-align: center; font-size: 11px; color: #475569; }
  .sig-line { margin-top: 44px; border-top: 1px dotted #94a3b8; padding-top: 4px; }
  footer { margin-top: 18px; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 10.5px; color: #94a3b8; }
  @media print { .sheet { padding: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="sheet">
  <header>
    <div class="brand">SmartPlan AI · Báo cáo học tập gửi phụ huynh</div>
    <h1>${esc(studentName)}</h1>
    <p class="meta">Lớp <b>${esc(className)}</b>${studentCode ? ` · Mã học sinh <b>${esc(studentCode)}</b>` : ''} · Lập ngày <b>${esc(ngay)}</b></p>
  </header>

  <section>
    <div class="stats">${stats}</div>
  </section>

  <section class="callout">
    <h2>Nhận xét chung về con</h2>
    <p>${esc(report.overallSummary)}</p>
  </section>

  <section class="cols">
    <div class="box good">
      <h2>Điểm mạnh</h2>
      ${listItems(report.strengths, 'Chưa đủ bằng chứng chính thức.')}
    </div>
    <div class="box warn">
      <h2>Cần rèn thêm</h2>
      ${listItems(report.areasToPractice, 'Chưa có nội dung cần rèn được xác nhận.')}
    </div>
  </section>
  ${bridgeNote ? `<section>${bridgeNote}</section>` : ''}

  <section>
    <h2>Kết quả theo bài <span class="trend">· Xu hướng: ${esc(TREND_LABEL[report.progress.trend])}</span></h2>
    <table>
      <thead><tr><th>Bài</th><th>Trạng thái</th><th class="score">Điểm</th></tr></thead>
      <tbody>${resultRows}</tbody>
    </table>
  </section>

  <section class="cols">
    <div class="box home">
      <h2>Phụ huynh có thể đồng hành cùng con</h2>
      ${listItems(report.parentActions, 'Chưa có gợi ý cụ thể.')}
    </div>
    <div class="box school">
      <h2>Thầy cô sẽ hỗ trợ con</h2>
      ${listItems(report.teacherActions, 'Chưa có gợi ý cụ thể.')}
    </div>
  </section>

  <div class="signature">
    <div><div class="sig-line">Phụ huynh (ký, ghi rõ họ tên)</div></div>
    <div><div class="sig-line">Giáo viên (ký, ghi rõ họ tên)</div></div>
  </div>

  <footer>Bản này chỉ sử dụng kết quả đã được thầy cô xem và duyệt. Bài đang chờ xử lý không hiển thị điểm, đáp án hoặc ghi chú nội bộ.</footer>
</div>
</body>
</html>`;
};

/**
 * Mở một cửa sổ in độc lập với báo cáo phụ huynh rồi kích hoạt hộp thoại in/lưu PDF của trình duyệt.
 * Trả về false nếu trình duyệt chặn popup để nơi gọi báo cho người dùng.
 */
export const openParentReportPrint = (input: ParentReportPrintInput): boolean => {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=880,height=1000');
  if (!win) return false;
  const doc = buildParentReportPrintDoc(input) +
    '<script>window.onload=function(){window.focus();window.print();};window.onafterprint=function(){window.close();};</' + 'script>';
  win.document.open();
  win.document.write(doc);
  win.document.close();
  return true;
};
