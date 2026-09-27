/**
 * Bản PDF SAO KÊ VÍ AI của một giáo viên cho một tháng — cùng cách xuất PDF với giáo án/bản phụ huynh.
 * Mọi con số lấy thẳng từ sao kê máy chủ; bản này chỉ trình bày, không tính lại.
 */
import type { AiStatement } from './aiBillingApi';
import { featureLabel } from './featureLabels';
import { exportElementToPdf } from '../../utils/pdfExport';

const ROOT_ID = 'ai-statement-pdf-root';

const esc = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const vnd = (value: number): string => `${Math.round(value).toLocaleString('vi-VN')}đ`;

const when = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
};

export const monthLabel = (month: string): string => {
  const [y, m] = month.split('-');
  return `tháng ${Number(m)}/${y}`;
};

const style = `
#${ROOT_ID} { width: 780px; box-sizing: border-box; padding: 28px 32px; background:#fff; color:#1e293b; font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif; font-size:12px; line-height:1.5; }
#${ROOT_ID} * { box-sizing:border-box; }
#${ROOT_ID} h1 { font-size:21px; color:#17375e; margin:0 0 4px; }
#${ROOT_ID} .sub { color:#64748b; margin:0 0 16px; }
#${ROOT_ID} .totals { display:flex; gap:10px; margin-bottom:16px; }
#${ROOT_ID} .tile { flex:1; border:1px solid #dbe4ec; border-radius:8px; padding:9px 11px; }
#${ROOT_ID} .tile small { display:block; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; }
#${ROOT_ID} .tile b { font-size:15px; }
#${ROOT_ID} h2 { font-size:13px; color:#17375e; text-transform:uppercase; margin:18px 0 8px; }
#${ROOT_ID} table { width:100%; border-collapse:collapse; }
#${ROOT_ID} th, #${ROOT_ID} td { border:1px solid #dbe4ec; padding:5px 7px; text-align:left; vertical-align:top; }
#${ROOT_ID} th { background:#f1f5f9; font-size:10.5px; }
#${ROOT_ID} td.n { text-align:right; white-space:nowrap; }
#${ROOT_ID} .note { margin-top:14px; font-size:10.5px; color:#64748b; border:1px solid #dbe4ec; background:#f8fafc; border-radius:6px; padding:8px 10px; }
`;

export const buildStatementPrintDoc = (s: AiStatement, teacherLabel: string): string => {
  const topupRows = s.topups.map(t => `<tr><td>${esc(when(t.at))}</td><td>${esc(t.gateway)} · ${esc(t.referenceCode)}</td><td>${esc(t.content)}</td><td class="n">+${vnd(t.amountVnd)}</td></tr>`).join('');
  const adjustRows = s.adjustments.map(a => `<tr><td>${esc(when(a.at))}</td><td colspan="2">${esc(a.reason)}</td><td class="n">${a.amountVnd > 0 ? '+' : ''}${vnd(a.amountVnd)}</td></tr>`).join('');
  const itemRows = s.items.map(i => {
    const where = [i.className, i.assignmentTitle, i.studentName].filter(Boolean).join(' · ');
    return `<tr><td>${esc(when(i.at))}</td><td>${esc(featureLabel(i.feature))}${where ? `<br><span style="color:#64748b">${esc(where)}</span>` : ''}</td><td class="n">${(i.inputTokens + i.outputTokens + i.thoughtsTokens).toLocaleString('vi-VN')}</td><td class="n">${vnd(i.grossVnd)}</td><td class="n">${i.discountPct ? `${i.discountPct}%${i.voucherCode ? ` (${esc(i.voucherCode)})` : ''}` : '—'}</td><td class="n">${vnd(i.chargeVnd)}</td></tr>`;
  }).join('');
  return `<style>${style}</style>
<h1>Sao kê ví AI — ${esc(monthLabel(s.month))}</h1>
<p class="sub">${esc(teacherLabel)} · Lập ngày ${esc(new Date().toLocaleDateString('vi-VN'))}</p>
<div class="totals">
  <div class="tile"><small>Đầu kỳ</small><b>${vnd(s.openingVnd)}</b></div>
  <div class="tile"><small>Nạp vào</small><b>+${vnd(s.topupVnd)}</b></div>
  <div class="tile"><small>Điều chỉnh</small><b>${s.adjustVnd >= 0 ? '+' : ''}${vnd(s.adjustVnd)}</b></div>
  <div class="tile"><small>Đã trừ (${s.items.length} lượt)</small><b>−${vnd(s.chargeVnd)}</b></div>
  <div class="tile"><small>Cuối kỳ</small><b>${vnd(s.closingVnd)}</b></div>
</div>
${s.topups.length ? `<h2>Tiền nạp (chuyển khoản)</h2><table><tr><th>Thời gian</th><th>Ngân hàng · mã giao dịch</th><th>Nội dung</th><th>Số tiền</th></tr>${topupRows}</table>` : ''}
${s.adjustments.length ? `<h2>Điều chỉnh của quản trị</h2><table><tr><th>Thời gian</th><th colspan="2">Lý do</th><th>Số tiền</th></tr>${adjustRows}</table>` : ''}
<h2>Từng lượt dùng AI bị trừ ví</h2>
${s.items.length ? `<table><tr><th>Thời gian</th><th>Tính năng · lớp · bài · học sinh</th><th>Token</th><th>Giá gốc</th><th>Giảm</th><th>Trừ ví</th></tr>${itemRows}</table>` : '<p class="sub">Không có lượt nào.</p>'}
<div class="note">Giá gốc mỗi lượt = số token × giá niêm yết của Google/Vercel đúng ngày dùng × tỷ giá USD→VNĐ lúc dùng (Vietcombank bán ra, do quản trị cập nhật), làm tròn tới đồng. Trừ ví = giá gốc × (100% − mức giảm của mã giảm giá). Cuối kỳ = đầu kỳ + nạp + điều chỉnh − đã trừ. ${s.ownKeyCalls ? `Có ${s.ownKeyCalls} lượt chạy bằng khoá riêng của thầy/cô — không tính phí, không có trong sao kê.` : ''}</div>`;
};

export const exportStatementPdf = async (s: AiStatement, teacherLabel: string): Promise<void> => {
  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.style.position = 'fixed';
  root.style.left = '-10000px';
  root.style.top = '0';
  root.innerHTML = buildStatementPrintDoc(s, teacherLabel);
  document.body.appendChild(root);
  try {
    await exportElementToPdf(root, {
      filename: `Sao ke vi AI - ${teacherLabel} - ${s.month}.pdf`.replace(/[\\/:*?"<>|]+/g, ' '),
      noBreakSelectors: ['h1', 'h2', 'tr', '.totals', '.note'],
    });
  } finally {
    root.remove();
  }
};
