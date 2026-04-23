export const generateAnswerSheetHTML = (): string => `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Phiếu Trả Lời – SmartPlan AI</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; background: #fff; }
  @page { size: A4; margin: 15mm 12mm; }
  @media print { body { margin: 0; } .no-print { display: none; } }

  /* ── Header ── */
  .header-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .header-table td { padding: 2px 4px; vertical-align: top; }
  .school-col { width: 48%; }
  .title-col { width: 52%; text-align: center; }
  .school-name { font-size: 10pt; font-weight: bold; text-transform: uppercase; }
  .dept-name { font-size: 9pt; }
  .doc-title { font-size: 13pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
  .doc-subtitle { font-size: 10pt; margin-top: 2px; }

  .divider { border: none; border-top: 2px solid #000; margin: 4px 0; }
  .divider-thin { border: none; border-top: 1px solid #555; margin: 4px 0; }

  /* ── Student Info ── */
  .info-row { display: flex; gap: 12px; margin: 5px 0; align-items: baseline; }
  .info-label { font-size: 10pt; white-space: nowrap; }
  .info-line { flex: 1; border-bottom: 1px solid #000; min-width: 30px; }
  .score-box { border: 2px solid #000; width: 60px; height: 28px; display: inline-block; vertical-align: middle; }

  /* ── Section titles ── */
  .section-title {
    font-size: 10pt; font-weight: bold; text-transform: uppercase;
    background: #222; color: #fff;
    padding: 3px 8px; margin: 8px 0 5px 0;
    letter-spacing: 0.5px;
  }
  .section-note { font-size: 9pt; font-style: italic; margin-bottom: 4px; }

  /* ── MCQ Grid ── */
  .mcq-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px 8px; }
  .mcq-item { display: flex; align-items: center; gap: 4px; font-size: 9.5pt; white-space: nowrap; }
  .mcq-num { width: 20px; text-align: right; font-weight: bold; }
  .mcq-opts { display: flex; gap: 4px; }
  .opt-circle {
    width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid #000;
    display: flex; align-items: center; justify-content: center;
    font-size: 8.5pt; font-weight: bold; cursor: pointer;
  }

  /* ── True/False ── */
  .tf-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  .tf-table th { border: 1.5px solid #000; padding: 3px 6px; text-align: center; background: #f0f0f0; font-size: 9pt; }
  .tf-table td { border: 1px solid #000; padding: 3px 6px; text-align: center; }
  .tf-table td.q-text { text-align: left; max-width: 200px; }
  .tf-blank { width: 22px; height: 18px; display: inline-block; }

  /* ── Short Answer ── */
  .sa-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  .sa-table td { border: 1px solid #000; padding: 3px 6px; }
  .sa-table td.sa-num { width: 40px; text-align: center; font-weight: bold; background: #f8f8f8; }
  .sa-answer-line { width: 100%; border: none; border-bottom: 1px dashed #888; outline: none; font-size: 9.5pt; padding: 1px 3px; }

  /* ── Essay ── */
  .essay-block { margin-bottom: 6px; }
  .essay-qhead { font-size: 9.5pt; font-weight: bold; margin-bottom: 2px; }
  .essay-lines { border: 1px solid #000; width: 100%; }
  .essay-line { border-bottom: 1px solid #ddd; height: 16px; width: 100%; }
  .essay-line:last-child { border-bottom: none; }

  /* ── Footer ── */
  .footer { margin-top: 8px; font-size: 8pt; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 4px; }

  /* ── Print button ── */
  .print-bar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 999;
    background: #1e40af; color: #fff; padding: 10px 20px;
    display: flex; align-items: center; justify-between;
    gap: 12px; font-family: sans-serif; font-size: 14px; font-weight: bold;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  .print-bar button {
    padding: 6px 20px; border-radius: 8px; border: none; cursor: pointer;
    font-weight: bold; font-size: 13px;
  }
  .btn-print { background: #fff; color: #1e40af; }
  .btn-close { background: rgba(255,255,255,0.2); color: #fff; }
  @media print { .print-bar { display: none !important; } body { padding-top: 0; } }
  body { padding-top: 52px; }
</style>
</head>
<body>

<div class="print-bar no-print">
  <span>📋 Phiếu Trả Lời – SmartPlan AI &nbsp;|&nbsp; In ra → Học sinh điền tay → Chụp ảnh → Tải lên chấm bài</span>
  <div style="display:flex;gap:8px">
    <button class="btn-print" onclick="window.print()">🖨 In ngay / Lưu PDF</button>
    <button class="btn-close" onclick="window.close()">✕ Đóng</button>
  </div>
</div>

<!-- ═══════════════════════════════ HEADER ═══════════════════════════════ -->
<table class="header-table">
  <tr>
    <td class="school-col">
      <div class="school-name">Sở GD&amp;ĐT: ___________________________</div>
      <div class="dept-name">Trường: _________________________________</div>
      <div class="dept-name">Tổ: _____________________________________</div>
    </td>
    <td class="title-col">
      <div class="doc-title">Phiếu Trả Lời</div>
      <div class="doc-subtitle">Bài kiểm tra / Bài thi</div>
      <div class="doc-subtitle">Môn: ______________ &nbsp; Lớp: _______</div>
      <div class="doc-subtitle">Ngày: _____________ &nbsp; Mã đề: _____</div>
    </td>
  </tr>
</table>
<hr class="divider">

<!-- ═══════════════════════════════ STUDENT INFO ═══════════════════════════ -->
<div class="info-row">
  <span class="info-label"><strong>Họ và tên học sinh:</strong></span>
  <span class="info-line"></span>
  <span class="info-label" style="margin-left:12px"><strong>Số báo danh:</strong></span>
  <span class="info-line" style="max-width:80px"></span>
</div>
<div class="info-row">
  <span class="info-label"><strong>Lớp:</strong></span>
  <span class="info-line" style="max-width:80px"></span>
  <span class="info-label" style="margin-left:12px"><strong>Ca thi:</strong></span>
  <span class="info-line" style="max-width:60px"></span>
  <span class="info-label" style="margin-left:12px"><strong>Điểm (GV chấm):</strong></span>
  <span class="score-box"></span>
</div>
<hr class="divider-thin">

<!-- ═══════════════════ PHẦN I – TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN ════════════ -->
<div class="section-title">Phần I – Trắc nghiệm nhiều phương án lựa chọn</div>
<div class="section-note">Khoanh tròn vào chữ cái A, B, C hoặc D tương ứng với đáp án đúng.</div>

<div class="mcq-grid">
${Array.from({ length: 40 }, (_, i) => `  <div class="mcq-item">
    <span class="mcq-num">${i + 1}.</span>
    <div class="mcq-opts">
      <div class="opt-circle">A</div>
      <div class="opt-circle">B</div>
      <div class="opt-circle">C</div>
      <div class="opt-circle">D</div>
    </div>
  </div>`).join('\n')}
</div>

<!-- ═══════════════════ PHẦN II – ĐÚNG SAI ══════════════════════════════ -->
<div class="section-title" style="margin-top:10px">Phần II – Trắc nghiệm Đúng / Sai</div>
<div class="section-note">Ghi chữ <strong>Đ</strong> (Đúng) hoặc <strong>S</strong> (Sai) vào ô tương ứng với mỗi phát biểu.</div>

<table class="tf-table">
  <thead>
    <tr>
      <th style="width:38px">Câu</th>
      <th style="width:34px">a)</th>
      <th style="width:34px">b)</th>
      <th style="width:34px">c)</th>
      <th style="width:34px">d)</th>
      <th style="width:38px">Câu</th>
      <th style="width:34px">a)</th>
      <th style="width:34px">b)</th>
      <th style="width:34px">c)</th>
      <th style="width:34px">d)</th>
      <th style="width:38px">Câu</th>
      <th style="width:34px">a)</th>
      <th style="width:34px">b)</th>
      <th style="width:34px">c)</th>
      <th style="width:34px">d)</th>
      <th style="width:38px">Câu</th>
      <th style="width:34px">a)</th>
      <th style="width:34px">b)</th>
      <th style="width:34px">c)</th>
      <th style="width:34px">d)</th>
    </tr>
  </thead>
  <tbody>
    ${Array.from({ length: 4 }, (_, r) => `<tr>
      ${Array.from({ length: 4 }, (_, c) => {
        const n = r + c * 4 + 1;
        return `<td style="font-weight:bold;text-align:center;background:#f8f8f8">${n}</td>
      <td></td><td></td><td></td><td></td>`;
      }).join('')}
    </tr>`).join('\n    ')}
  </tbody>
</table>

<!-- ═══════════════════ PHẦN III – TRẢ LỜI NGẮN ══════════════════════════ -->
<div class="section-title" style="margin-top:10px">Phần III – Trả lời ngắn</div>
<div class="section-note">Ghi đáp án vào ô dưới mỗi câu hỏi. Ghi rõ đơn vị nếu có.</div>

<table class="sa-table">
  <tbody>
    ${Array.from({ length: 3 }, (_, row) => `<tr>
      ${Array.from({ length: 3 }, (_, col) => {
        const n = row * 3 + col + 1;
        return `<td class="sa-num">Câu ${n}</td>
      <td style="width:28%"><input class="sa-answer-line" placeholder=" "/></td>`;
      }).join('')}
    </tr>`).join('\n    ')}
  </tbody>
</table>

<!-- ═══════════════════ PHẦN IV – TỰ LUẬN ═══════════════════════════════ -->
<div class="section-title" style="margin-top:10px">Phần IV – Tự luận</div>
<div class="section-note">Trình bày đầy đủ lời giải trong ô dành riêng cho từng câu. Không viết ra ngoài khung.</div>

${Array.from({ length: 3 }, (_, i) => `<div class="essay-block">
  <div class="essay-qhead">Câu ${i + 1}: (ghi rõ đề số câu hỏi tương ứng)</div>
  <div class="essay-lines">
    ${Array.from({ length: i === 2 ? 10 : 14 }, () => '<div class="essay-line"></div>').join('')}
  </div>
</div>`).join('\n')}

<!-- ═══════════════════ FOOTER ════════════════════════════════════════════ -->
<div class="footer">
  Phiếu trả lời chuẩn – SmartPlan AI &nbsp;|&nbsp;
  Sau khi làm bài: chụp ảnh rõ nét (ánh sáng đều, không nghiêng &gt; 10°) → tải lên hệ thống để AI chấm tự động.
</div>

</body>
</html>`;

export const generateAnswerKeyTemplateHTML = (): string => `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Mẫu Đáp Án Chuẩn – SmartPlan AI</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', serif; font-size: 11pt; background: #fff; color: #000; }
  @page { size: A4; margin: 15mm 12mm; }
  @media print { .no-print { display: none; } body { padding-top: 0; } }
  body { padding-top: 52px; }

  h2 { font-size: 14pt; text-align: center; text-transform: uppercase; margin-bottom: 4px; }
  .sub { text-align: center; font-size: 10pt; margin-bottom: 8px; color: #333; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 10px; }
  th { background: #1e3a5f; color: #fff; padding: 4px 8px; text-align: center; font-size: 9.5pt; }
  td { border: 1px solid #999; padding: 4px 8px; vertical-align: top; }
  td.center { text-align: center; }
  .section { font-size: 10pt; font-weight: bold; background: #e8f0fe; padding: 3px 8px; margin: 10px 0 4px; border-left: 4px solid #1e40af; }
  .note { font-size: 9pt; font-style: italic; color: #555; margin: 4px 0 6px; }
  .hint { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 6px; padding: 8px 12px; font-size: 9.5pt; margin: 10px 0; }

  .print-bar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 999;
    background: #15803d; color: #fff; padding: 10px 20px;
    display: flex; align-items: center; gap: 12px;
    font-family: sans-serif; font-size: 14px; font-weight: bold;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  .print-bar button { padding: 6px 20px; border-radius: 8px; border: none; cursor: pointer; font-weight: bold; }
  .btn-print { background: #fff; color: #15803d; }
  .btn-close { background: rgba(255,255,255,0.2); color: #fff; }
</style>
</head>
<body>

<div class="print-bar no-print">
  <span>📝 Mẫu Đáp Án Chuẩn – SmartPlan AI &nbsp;|&nbsp; Điền đáp án vào bảng → Tải lên cùng đề bài khi chấm</span>
  <div style="display:flex;gap:8px">
    <button class="btn-print" onclick="window.print()">🖨 In / Lưu PDF</button>
    <button class="btn-close" onclick="window.close()">✕ Đóng</button>
  </div>
</div>

<h2>Đáp Án &amp; Thang Điểm Chuẩn</h2>
<div class="sub">Môn: ________________ &nbsp;|&nbsp; Lớp: _____ &nbsp;|&nbsp; Mã đề: _____ &nbsp;|&nbsp; Tổng điểm: _____</div>

<div class="hint">
  💡 <strong>Hướng dẫn:</strong> Điền đầy đủ đáp án và điểm thành phần vào bảng bên dưới.
  Tải file này cùng với file đề bài lên hệ thống trước khi bấm "Chấm bài".
  AI sẽ đọc bảng này để đối chiếu với bài làm học sinh — đáp án càng chi tiết, chấm càng chính xác.
</div>

<!-- PHẦN I – TNPA -->
<div class="section">Phần I – Trắc nghiệm nhiều phương án (mỗi câu đúng: ______ điểm)</div>
<div class="note">Điền A / B / C / D vào cột "Đáp án đúng".</div>
<table>
  <thead>
    <tr>
      <th style="width:12%">Câu</th><th style="width:20%">Đáp án đúng</th>
      <th style="width:12%">Câu</th><th style="width:20%">Đáp án đúng</th>
      <th style="width:12%">Câu</th><th style="width:20%">Đáp án đúng</th>
      <th style="width:12%">Câu</th><th style="width:20%">Đáp án đúng</th>
    </tr>
  </thead>
  <tbody>
    ${Array.from({ length: 10 }, (_, r) => `<tr>
      ${Array.from({ length: 4 }, (_, c) => {
        const n = r + c * 10 + 1;
        return n <= 40
          ? `<td class="center">${n}</td><td class="center"></td>`
          : `<td></td><td></td>`;
      }).join('')}
    </tr>`).join('\n    ')}
  </tbody>
</table>

<!-- PHẦN II – ĐÚNG SAI -->
<div class="section">Phần II – Trắc nghiệm Đúng / Sai (thang điểm: 0.1 / 0.25 / 0.5 / 1.0 đ/câu)</div>
<div class="note">Điền Đ hoặc S cho từng ý a, b, c, d. Ghi điểm từng câu (ví dụ: 1.0đ).</div>
<table>
  <thead>
    <tr><th>Câu</th><th>a)</th><th>b)</th><th>c)</th><th>d)</th><th>Điểm câu</th><th>Ghi chú thang điểm</th></tr>
  </thead>
  <tbody>
    ${Array.from({ length: 6 }, (_, i) => `<tr>
      <td class="center">${i + 1}</td>
      <td class="center"></td><td class="center"></td><td class="center"></td><td class="center"></td>
      <td class="center"></td>
      <td style="font-size:9pt;color:#555">1 ý đúng: 0.1đ | 2 ý: 0.25đ | 3 ý: 0.5đ | 4 ý: 1đ</td>
    </tr>`).join('\n    ')}
  </tbody>
</table>

<!-- PHẦN III – TRẢ LỜI NGẮN -->
<div class="section">Phần III – Trả lời ngắn</div>
<div class="note">Ghi đáp án chính xác (số, từ, cụm từ). Chấp nhận sai số: ±______.</div>
<table>
  <thead>
    <tr><th style="width:12%">Câu</th><th style="width:38%">Đáp án đúng</th><th style="width:10%">Điểm</th><th style="width:12%">Câu</th><th style="width:38%">Đáp án đúng</th><th style="width:10%">Điểm</th></tr>
  </thead>
  <tbody>
    ${Array.from({ length: 5 }, (_, i) => `<tr>
      <td class="center">${i * 2 + 1}</td><td></td><td class="center"></td>
      <td class="center">${i * 2 + 2}</td><td></td><td class="center"></td>
    </tr>`).join('\n    ')}
  </tbody>
</table>

<!-- PHẦN IV – TỰ LUẬN -->
<div class="section">Phần IV – Tự luận</div>
<div class="note">Ghi hướng dẫn giải chi tiết và điểm thành phần. AI sẽ dùng nội dung này để đánh giá bài làm học sinh.</div>
<table>
  <thead>
    <tr><th style="width:10%">Câu</th><th style="width:10%">Tổng điểm</th><th style="width:50%">Hướng dẫn giải &amp; Yêu cầu chính</th><th style="width:30%">Điểm thành phần</th></tr>
  </thead>
  <tbody>
    ${Array.from({ length: 4 }, (_, i) => `<tr style="height:60px">
      <td class="center" style="font-weight:bold">${i + 1}</td>
      <td class="center"></td>
      <td style="font-size:9pt;color:#aaa;vertical-align:top;padding-top:4px">
        Bước 1: ... (____đ) &nbsp; Bước 2: ... (____đ) &nbsp; Kết quả: ... (____đ)
      </td>
      <td style="font-size:9pt;color:#aaa;vertical-align:top;padding-top:4px">
        • Đặt vấn đề đúng: ____đ<br>• Lập luận đúng: ____đ<br>• Tính đúng kết quả: ____đ
      </td>
    </tr>`).join('\n    ')}
  </tbody>
</table>

<div style="margin-top:12px;font-size:9pt;color:#555;border-top:1px solid #ccc;padding-top:6px;text-align:center">
  Mẫu đáp án chuẩn – SmartPlan AI &nbsp;|&nbsp;
  Lưu ý: Càng điền chi tiết điểm thành phần → AI chấm tự luận càng chính xác
</div>

</body>
</html>`;
