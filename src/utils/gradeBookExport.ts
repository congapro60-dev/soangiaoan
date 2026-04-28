import * as XLSX from 'xlsx';
import { ExamQuestion, GradeLevel } from '../types';

export interface GradeBookOptions {
  title: string;
  gradeLevel: GradeLevel;
  filename: string;
  studentCount?: number;
}

export const exportGradeBookExcel = (
  questions: ExamQuestion[],
  options: GradeBookOptions
): void => {
  const { title, gradeLevel, filename, studentCount = 35 } = options;

  const mcqs   = questions.filter(q => q.type === 'multiple_choice');
  const tfqs   = questions.filter(q => q.type === 'true_false');
  const saqs   = questions.filter(q => q.type === 'short_answer');
  const essays = questions.filter(q => q.type === 'essay');

  // Build header columns
  const fixedCols = ['STT', 'Họ và tên', 'Lớp'];
  const mcqCols   = mcqs.map((_, i)  => `P.I C${i + 1}`);
  const tfCols    = tfqs.map((_, i)  => `P.II C${i + 1}`);
  const saCols    = saqs.map((_, i)  => `P.III C${i + 1}`);
  const essayCols = essays.map((_, i) => `TL ${i + 1}`);
  const sumCols   = ['Tổng', 'Ghi chú'];

  const headers = [...fixedCols, ...mcqCols, ...tfCols, ...saCols, ...essayCols, ...sumCols];
  const totalColIdx = headers.indexOf('Tổng') + 1; // 1-based for Excel

  // Compute max possible scores per section for header row 3
  const mcqTotal  = mcqs.reduce((s, q)  => s + q.points, 0);
  const tfTotal   = tfqs.reduce((s, q)  => s + q.points, 0);
  const saTotal   = saqs.reduce((s, q)  => s + q.points, 0);
  const esTotal   = essays.reduce((s, q) => s + q.points, 0);
  const grandTotal = mcqTotal + tfTotal + saTotal + esTotal;

  // Rows
  const wsData: any[][] = [];

  // Row 1: Title (spans all columns)
  wsData.push([title, ...Array(headers.length - 1).fill('')]);

  // Row 2: Sub-info
  const infoRow = [
    `Cấp: ${gradeLevel === 'cap2' ? 'THCS' : gradeLevel === 'lop1011' ? 'THPT (10-11)' : 'THPT 12'}`,
    `Tổng điểm: ${grandTotal}`,
    ...Array(headers.length - 2).fill(''),
  ];
  wsData.push(infoRow);

  // Row 3: Section total points
  const pointsRow: any[] = ['', '', ''];
  mcqs.forEach(q   => pointsRow.push(q.points));
  tfqs.forEach(q   => pointsRow.push(q.points));
  saqs.forEach(q   => pointsRow.push(q.points));
  essays.forEach(q => pointsRow.push(q.points));
  pointsRow.push(grandTotal, '');
  wsData.push(pointsRow);

  // Row 4: Column headers
  wsData.push(headers);

  // Rows 5..: Student rows (35 by default)
  const dataStartRow = 5; // 1-based Excel row where student data starts
  for (let i = 1; i <= studentCount; i++) {
    const row: any[] = [i, '', ''];
    // MCQ, TF, SA, Essay — blank cells
    const scoreCols = mcqCols.length + tfCols.length + saCols.length + essayCols.length;
    for (let j = 0; j < scoreCols; j++) row.push('');

    // Tổng: for lop12 (all objective) add SUM formula; others leave blank
    if (gradeLevel === 'lop12' && scoreCols > 0) {
      // Excel column of first score cell (1-based): fixedCols=3, so col 4
      const firstScoreCol = 4;
      const lastScoreCol  = fixedCols.length + scoreCols;
      const excelRow = dataStartRow + i - 1;
      const startLetter = colLetter(firstScoreCol);
      const endLetter   = colLetter(lastScoreCol);
      row.push({ f: `SUM(${startLetter}${excelRow}:${endLetter}${excelRow})` });
    } else {
      row.push('');
    }

    row.push(''); // Ghi chú
    wsData.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  const colWidths: XLSX.ColInfo[] = [
    { wch: 5 },  // STT
    { wch: 25 }, // Họ tên
    { wch: 8 },  // Lớp
    ...mcqCols.map(() => ({ wch: 6 } as XLSX.ColInfo)),
    ...tfCols.map(() => ({ wch: 6 } as XLSX.ColInfo)),
    ...saCols.map(() => ({ wch: 6 } as XLSX.ColInfo)),
    ...essayCols.map(() => ({ wch: 7 } as XLSX.ColInfo)),
    { wch: 8 },  // Tổng
    { wch: 20 }, // Ghi chú
  ];
  ws['!cols'] = colWidths;

  // Merge title row across all columns
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bảng điểm');
  XLSX.writeFile(wb, filename);
};

// Convert 1-based column index to Excel letter (A, B, ..., Z, AA, ...)
function colLetter(n: number): string {
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}
