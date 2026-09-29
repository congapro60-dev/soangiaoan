/**
 * Đọc phân phối chương trình (PPCT) của bất kỳ trường nào bằng AI: chữ thô của file → danh sách tiết.
 * Kết quả cùng kiểu `PpctLesson` với PPCT đóng sẵn trong app, để bộ xếp lịch dùng chung.
 * GV soát bảng trước khi dùng.
 */
import type { PpctLesson } from '../../data/ppct';

export const MAX_PPCT_CHARS = 80_000;

export const buildPpctPrompt = (sourceText: string): string => [
  'Bạn đọc PHÂN PHỐI CHƯƠNG TRÌNH (PPCT) một môn học của trường phổ thông Việt Nam (chép thô từ bảng tính / văn bản).',
  'Nhiệm vụ: liệt kê MỌI TIẾT theo thứ tự, mỗi tiết một dòng.',
  '',
  'Mỗi dòng là một mảng 6 phần tử: [tiết, tuần, phân môn, tên bài, nội dung tiết, tự chọn]',
  '- tiết: số tiết PPCT (đếm dồn từ đầu năm). Bài 3 tiết thì ghi 3 dòng liền nhau.',
  '- tuần: số tuần học ghi trong PPCT; không ghi thì null.',
  '- phân môn: "Đại số", "Hình học", "Thống kê"… nếu PPCT có tách; không có thì "".',
  '- tên bài: tên bài / chủ đề, giữ nguyên chữ gốc.',
  '- nội dung tiết: nội dung riêng của tiết đó nếu có (vd "Tiết 2: Luyện tập"); không có thì "".',
  '- tự chọn: true nếu là tiết tự chọn / GV tự quyết nội dung, ngược lại false.',
  'Không bịa tiết, không gộp tiết. Không giải thích thêm.',
  '',
  'Trả về DUY NHẤT một JSON: {"lessons": [[1, 1, "Đại số", "Mệnh đề", "Tiết 1: Mệnh đề", false], ...]}',
  '',
  'PPCT:',
  sourceText.slice(0, MAX_PPCT_CHARS),
].join('\n');

const cleanText = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const toNumber = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.trim()) : NaN;
  return Number.isInteger(n) && n > 0 && n < 1000 ? n : null;
};

/** Đọc JSON AI trả; bỏ dòng hỏng; đánh lại số tiết/tuần cho liền mạch; tính "tiết mấy của bài". */
export const parsePpctResponse = (text: string): PpctLesson[] => {
  const json = text.match(/\{[\s\S]*\}/);
  let rows: unknown[] = [];
  try {
    const parsed = json ? JSON.parse(json[0]) as { lessons?: unknown } : {};
    rows = Array.isArray(parsed.lessons) ? parsed.lessons : [];
  } catch {
    return [];
  }
  const lessons: PpctLesson[] = [];
  let lastWeek = 1;
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const [no, week, subject, title, detail, elective] = row;
    const isElective = elective === true;
    const name = cleanText(title) || (isElective ? 'Tiết tự chọn' : '');
    if (!name) continue;
    const w = toNumber(week) ?? lastWeek;
    lastWeek = Math.max(lastWeek, w);
    const periodNo = lessons.length + 1;
    lessons.push({
      id: `custom-${periodNo}`, title: name, subject: cleanText(subject), isElective,
      week: w, weeks: [w], periodNo, periodIndex: 1, periodCount: 1, lessonPeriods: [periodNo],
      detail: cleanText(detail), objectives: '', notes: toNumber(no) && toNumber(no) !== periodNo ? `Số tiết gốc: ${no}` : '',
    });
  }
  // Tiết mấy của bài: đếm các dòng liền nhau cùng tên.
  for (let i = 0; i < lessons.length;) {
    let j = i;
    while (j < lessons.length && lessons[j].title === lessons[i].title) j += 1;
    const group = lessons.slice(i, j);
    group.forEach((l, k) => { l.periodIndex = k + 1; l.periodCount = group.length; l.lessonPeriods = group.map((g) => g.periodNo!); });
    i = j;
  }
  return lessons;
};
