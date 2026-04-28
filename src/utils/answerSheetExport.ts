import { ExamQuestion, GradeLevel } from '../types';
import { exportElementToPdf } from './pdfExport';

export interface AnswerSheetOptions {
  title: string;
  subject?: string;
  durationMinutes: number;
  schoolName: string;
  gradeLevel: GradeLevel;
  filename: string;
}

// ── Digit grid (SBD / Mã đề) ──────────────────────────────────────────────

const digitGrid = (n: number): string => {
  const cols = Array(n).fill('').map(() =>
    `<td style="width:20px;border:1px solid #333;height:18px;"></td>`
  ).join('');
  const digitRows = [0,1,2,3,4,5,6,7,8,9].map(d => {
    const cells = Array(n).fill('').map(() =>
      `<td style="text-align:center;padding:1px 0;"><span style="display:inline-block;width:13px;height:13px;border-radius:50%;border:1px solid #333;"></span></td>`
    ).join('');
    return `<tr><td style="font-size:8pt;padding-right:3px;text-align:right;">${d}</td>${cells}</tr>`;
  }).join('');

  return `<table style="border-collapse:collapse;font-size:9pt;text-align:center;display:inline-table;">
    <tr><td style="width:18px;"></td>${cols}</tr>
    ${digitRows}
  </table>`;
};

// ── MCQ bubble row ─────────────────────────────────────────────────────────

const bubble = (label: string) =>
  `<span style="display:inline-block;width:15px;height:15px;border-radius:50%;border:1.5px solid #333;text-align:center;line-height:14px;font-size:8pt;margin:0 2px;">${label}</span>`;

const mcqRow = (n: number) =>
  `<div style="display:inline-block;margin:3px 6px;font-size:10pt;white-space:nowrap;">
    <strong>Câu ${n}:</strong> ${bubble('A')} ${bubble('B')} ${bubble('C')} ${bubble('D')}
  </div>`;

// ── True/False block ───────────────────────────────────────────────────────

const trueFalseBlock = (n: number) =>
  `<div style="display:inline-block;margin:3px 8px;border:1px solid #ccc;border-radius:4px;padding:3px 6px;font-size:9pt;vertical-align:top;">
    <div style="font-weight:bold;margin-bottom:2px;">Câu ${n}</div>
    ${['a','b','c','d'].map(sub =>
      `<div style="margin:2px 0;">${sub}) ${bubble('Đ')} ${bubble('S')}</div>`
    ).join('')}
  </div>`;

// ── Short answer boxes ─────────────────────────────────────────────────────

const shortAnswerRow = (n: number) => {
  const boxes = Array(5).fill('').map(() =>
    `<span style="display:inline-block;width:18px;height:22px;border:1px solid #333;text-align:center;margin:0 1px;"></span>`
  ).join('');
  return `<div style="display:inline-block;margin:3px 8px;font-size:10pt;white-space:nowrap;">
    <strong>Câu ${n}:</strong> ${boxes}
  </div>`;
};

// ── Essay ruled lines ──────────────────────────────────────────────────────

const essayLines = (count = 10) =>
  Array(count).fill('').map(() =>
    `<div style="border-bottom:1px solid #ccc;min-height:24px;margin:2px 0;"></div>`
  ).join('');

// ── Header by grade level ──────────────────────────────────────────────────

const buildHeader = (options: AnswerSheetOptions): string => {
  const { title, subject, durationMinutes, schoolName, gradeLevel } = options;

  if (gradeLevel === 'lop12') {
    return `
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
        <tr>
          <td style="width:50%;vertical-align:top;padding-right:10px;">
            <div style="font-size:10pt;font-weight:bold;">${schoolName || 'TRƯỜNG THPT ...'}</div>
            <div style="font-size:9pt;margin-top:4px;">Họ tên: <span style="display:inline-block;width:160px;border-bottom:1px solid #333;"></span></div>
            <div style="font-size:9pt;margin-top:4px;">Ngày sinh: <span style="display:inline-block;width:100px;border-bottom:1px solid #333;"></span></div>
            <div style="font-size:9pt;margin-top:4px;">Phòng thi: <span style="display:inline-block;width:80px;border-bottom:1px solid #333;"></span></div>
          </td>
          <td style="width:50%;vertical-align:top;text-align:center;">
            <div style="display:inline-block;margin-right:10px;text-align:center;">
              <div style="font-size:8pt;font-weight:bold;margin-bottom:2px;">SỐ BÁO DANH</div>
              ${digitGrid(8)}
            </div>
            <div style="display:inline-block;text-align:center;">
              <div style="font-size:8pt;font-weight:bold;margin-bottom:2px;">MÃ ĐỀ</div>
              ${digitGrid(4)}
            </div>
          </td>
        </tr>
      </table>
      <div style="text-align:center;font-size:14pt;font-weight:bold;margin:6px 0 2px;">PHIẾU TRẢ LỜI TRẮC NGHIỆM</div>
      <div style="text-align:center;font-size:9pt;margin-bottom:8px;">
        Môn: ${subject || '___________'} &nbsp;|&nbsp; Thời gian: ${durationMinutes} phút &nbsp;|&nbsp; Mã đề: ____
      </div>
    `;
  }

  if (gradeLevel === 'lop1011') {
    return `
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
        <tr>
          <td style="width:50%;vertical-align:top;padding-right:10px;">
            <div style="font-size:10pt;font-weight:bold;">${schoolName || 'TRƯỜNG THPT ...'}</div>
            <div style="font-size:9pt;margin-top:4px;">Họ tên: <span style="display:inline-block;width:160px;border-bottom:1px solid #333;"></span></div>
            <div style="font-size:9pt;margin-top:4px;">Ngày sinh: <span style="display:inline-block;width:100px;border-bottom:1px solid #333;"></span></div>
            <div style="font-size:9pt;margin-top:4px;">Lớp: <span style="display:inline-block;width:80px;border-bottom:1px solid #333;"></span></div>
          </td>
          <td style="width:50%;vertical-align:top;text-align:center;">
            <div style="display:inline-block;margin-right:10px;text-align:center;">
              <div style="font-size:8pt;font-weight:bold;margin-bottom:2px;">SỐ BÁO DANH</div>
              ${digitGrid(8)}
            </div>
            <div style="display:inline-block;text-align:center;">
              <div style="font-size:8pt;font-weight:bold;margin-bottom:2px;">MÃ ĐỀ</div>
              ${digitGrid(4)}
            </div>
          </td>
        </tr>
      </table>
      <div style="text-align:center;font-size:14pt;font-weight:bold;margin:6px 0 2px;">PHIẾU TRẢ LỜI TRẮC NGHIỆM</div>
      <div style="text-align:center;font-size:9pt;margin-bottom:8px;">
        Môn: ${subject || '___________'} &nbsp;|&nbsp; Thời gian: ${durationMinutes} phút &nbsp;|&nbsp; Mã đề: ____
      </div>
    `;
  }

  // cap2
  return `
    <table style="width:100%;border-collapse:collapse;margin-bottom:6px;">
      <tr>
        <td style="width:50%;font-size:10pt;font-weight:bold;">${schoolName || 'TRƯỜNG THCS ...'}</td>
        <td style="width:50%;text-align:right;">
          <table style="border:2px solid #333;padding:4px 8px;font-size:9pt;display:inline-table;">
            <tr><td style="font-weight:bold;text-align:center;">ĐIỂM</td></tr>
            <tr><td style="height:30px;width:60px;"></td></tr>
          </table>
        </td>
      </tr>
    </table>
    <div style="text-align:center;font-size:14pt;font-weight:bold;margin:4px 0 2px;">${title}</div>
    <div style="text-align:center;font-size:9pt;margin-bottom:6px;">
      Môn: ${subject || '___________'} &nbsp;|&nbsp; Thời gian: ${durationMinutes} phút
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:9pt;margin-bottom:6px;">
      <tr>
        <td style="width:50%;">Họ tên: <span style="display:inline-block;width:150px;border-bottom:1px solid #333;"></span></td>
        <td style="width:25%;">Lớp: <span style="display:inline-block;width:60px;border-bottom:1px solid #333;"></span></td>
        <td style="width:25%;">Ngày: <span style="display:inline-block;width:70px;border-bottom:1px solid #333;"></span></td>
      </tr>
    </table>
  `;
};

// ── Main builder ───────────────────────────────────────────────────────────

const buildAnswerSheetHTML = (questions: ExamQuestion[], options: AnswerSheetOptions): string => {
  const mcqs = questions.filter(q => q.type === 'multiple_choice');
  const tfqs = questions.filter(q => q.type === 'true_false');
  const saqs = questions.filter(q => q.type === 'short_answer');
  const essayqs = questions.filter(q => q.type === 'essay');

  let sections = '';

  if (mcqs.length > 0) {
    const rows = mcqs.map((q, i) => mcqRow(i + 1)).join('');
    sections += `
      <div style="margin-bottom:10px;">
        <div style="font-weight:bold;font-size:10pt;border-bottom:1px solid #666;margin-bottom:4px;padding-bottom:2px;">
          PHẦN I. TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN (${mcqs.length} câu)
        </div>
        <div style="display:flex;flex-wrap:wrap;">${rows}</div>
      </div>`;
  }

  if (tfqs.length > 0) {
    const blocks = tfqs.map((q, i) => trueFalseBlock(i + 1)).join('');
    sections += `
      <div style="margin-bottom:10px;">
        <div style="font-weight:bold;font-size:10pt;border-bottom:1px solid #666;margin-bottom:4px;padding-bottom:2px;">
          PHẦN II. TRẮC NGHIỆM ĐÚNG SAI (${tfqs.length} câu)
        </div>
        <div style="display:flex;flex-wrap:wrap;">${blocks}</div>
      </div>`;
  }

  if (saqs.length > 0) {
    const rows = saqs.map((q, i) => shortAnswerRow(i + 1)).join('');
    sections += `
      <div style="margin-bottom:10px;">
        <div style="font-weight:bold;font-size:10pt;border-bottom:1px solid #666;margin-bottom:4px;padding-bottom:2px;">
          PHẦN III. TRẢ LỜI NGẮN (${saqs.length} câu)
        </div>
        <div style="display:flex;flex-wrap:wrap;">${rows}</div>
      </div>`;
  }

  const hasEssay = essayqs.length > 0 || options.gradeLevel === 'lop1011';
  if (hasEssay) {
    sections += `
      <div style="margin-bottom:10px;">
        <div style="font-weight:bold;font-size:10pt;border-bottom:1px solid #666;margin-bottom:4px;padding-bottom:2px;">
          PHẦN IV. TỰ LUẬN
        </div>
        ${essayLines(14)}
      </div>`;
  }

  return `
    <div style="font-family:'Times New Roman',serif;font-size:10pt;color:#000;
                padding:15mm 10mm;width:190mm;box-sizing:border-box;background:#fff;">
      ${buildHeader(options)}
      <hr style="border:none;border-top:2px solid #333;margin:6px 0;" />
      ${sections}
      <hr style="border:none;border-top:1px dashed #999;margin-top:10px;" />
      <div style="text-align:center;font-size:8pt;color:#666;margin-top:4px;">
        Thí sinh không được viết vào phần này
      </div>
    </div>
  `;
};

// ── Public export ──────────────────────────────────────────────────────────

export const exportAnswerSheetPDF = async (
  questions: ExamQuestion[],
  options: AnswerSheetOptions
): Promise<void> => {
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = '-9999px';
  div.style.left = '-9999px';
  div.innerHTML = buildAnswerSheetHTML(questions, options);
  document.body.appendChild(div);

  try {
    await exportElementToPdf(div, {
      filename: options.filename,
      marginMm: [5, 5, 5, 5],
      scale: 2,
      orientation: 'portrait',
    });
  } finally {
    document.body.removeChild(div);
  }
};
