/**
 * Soạn nhận xét học sinh theo giọng giáo viên từ điểm LO đã tính.
 *
 * Thuần quy tắc, KHÔNG gọi AI: mỗi em nhận một nhận xét dựa trên
 *   - mức điểm trung bình thang 4,
 *   - năng lực mạnh nhất / yếu nhất (để nhận xét đúng chỗ),
 *   - độ trải (chênh lệch giữa năng lực cao nhất và thấp nhất).
 *
 * Xuất `docs/qa/nhan-xet.md` (đọc nhanh) và `docs/qa/nhan-xet.csv` (dán vào SSM/Excel).
 *
 * node scripts/build-comments.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const scores = JSON.parse(readFileSync(resolve('docs/qa/lo-scores.json'), 'utf8'));

const LABEL = {
  'g10-tap-hop-va-menh-de': 'mệnh đề',
  'g10-phep-toan-tren-tap-hop': 'các phép toán trên tập hợp',
  'g10-bpt-bac-nhat-hai-an': 'bất phương trình bậc nhất hai ẩn',
  'g10-gia-tri-luong-giac-0-180': 'giá trị lượng giác của góc 0°–180°',
  'g10-he-thuc-luong-tam-giac': 'hệ thức lượng trong tam giác',
  'g10-vecto-va-phep-toan': 'vectơ và các phép toán',
  'g11-ham-va-pt-luong-giac': 'hàm số lượng giác và phương trình lượng giác',
  'g11-day-so-cap-so': 'dãy số, cấp số cộng và cấp số nhân',
  'g11-duong-thang-mat-phang-kg': 'đường thẳng, mặt phẳng trong không gian',
  'g11-quan-he-song-song': 'quan hệ song song',
  'g12-khao-sat-ham-so': 'khảo sát hàm số và ứng dụng đạo hàm',
  'g12-toa-do-khong-gian': 'toạ độ trong không gian',
};

/** Mô tả mức độ theo thang 4 của SSM. */
const BAND = (mark) => {
  if (mark >= 3.5) return { key: 'tot', text: 'nắm chắc' };
  if (mark >= 3) return { key: 'kha', text: 'nắm được' };
  if (mark >= 2.5) return { key: 'tb', text: 'ở mức trung bình' };
  if (mark >= 1.5) return { key: 'yeu', text: 'còn yếu' };
  return { key: 'kem', text: 'còn rất yếu' };
};

const round1 = (value) => Math.round(value * 10) / 10;

const buildComment = (name, mark4, competencyIds) => {
  const marks = competencyIds
    .map((id) => ({ id, mark: typeof mark4[id] === 'number' ? mark4[id] : null }))
    .filter((row) => row.mark !== null);
  if (marks.length === 0) {
    return 'Chưa có bài nộp nào được duyệt trong kỳ này nên chưa đủ căn cứ nhận xét.';
  }

  const avg = round1(marks.reduce((sum, row) => sum + row.mark, 0) / marks.length);
  const sorted = [...marks].sort((a, b) => b.mark - a.mark);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const spread = round1(best.mark - worst.mark);

  const overall = BAND(avg);
  const parts = [];

  // Câu 1: nhận định tổng quát.
  if (overall.key === 'tot') parts.push(`Em ${name} học tốt môn Toán trong kỳ này.`);
  else if (overall.key === 'kha') parts.push(`Em ${name} có ý thức học tập, kết quả ở mức khá.`);
  else if (overall.key === 'tb') parts.push(`Em ${name} cần cố gắng thêm để nâng kết quả môn Toán.`);
  else parts.push(`Em ${name} còn hạn chế nhiều ở môn Toán, cần được hỗ trợ thêm.`);

  // Câu 2: điểm mạnh.
  if (best.mark >= 2.5) {
    parts.push(`Em ${BAND(best.mark).text} phần ${LABEL[best.id] || best.id}.`);
  }

  // Câu 3: điểm cần cải thiện — chỉ nói khi thật sự lệch hoặc yếu.
  if (worst.mark < 2.5) {
    parts.push(`Cần tập trung ôn lại phần ${LABEL[worst.id] || worst.id}.`);
  } else if (spread >= 1) {
    parts.push(`So với mặt bằng chung, em cần chú ý hơn ở phần ${LABEL[worst.id] || worst.id}.`);
  }

  // Câu 4: định hướng hành động.
  if (overall.key === 'tot' || overall.key === 'kha') {
    parts.push('Em tiếp tục phát huy, làm thêm bài tập nâng cao để giữ vững phong độ.');
  } else if (overall.key === 'tb') {
    parts.push('Em nên làm lại các bài tập đã chữa và hỏi thầy cô ngay khi chưa hiểu bài.');
  } else {
    parts.push('Em cần học lại kiến thức nền, làm bài tập cơ bản và nhờ thầy cô kèm thêm.');
  }

  return parts.join(' ');
};

const rows = [];
for (const cls of scores) {
  for (const periodKey of ['IA1', 'F1']) {
    const period = cls.periods[periodKey];
    for (const row of period.rows) {
      rows.push({
        className: cls.className,
        period: period.label,
        code: row.code,
        name: row.name,
        comment: buildComment(row.name, row.mark4, period.competencyIds),
      });
    }
  }
}

const md = ['# Nhận xét học sinh theo kỳ', ''];
let currentClass = '';
for (const row of rows) {
  const key = `${row.className} · ${row.period}`;
  if (key !== currentClass) {
    md.push('', `## ${key}`, '');
    currentClass = key;
  }
  md.push(`- **${row.name}** (${row.code}): ${row.comment}`);
}
writeFileSync(resolve('docs/qa/nhan-xet.md'), md.join('\n'), 'utf8');

const csv = ['lop,ky,ma_hs,ten,nhan_xet'];
for (const row of rows) {
  csv.push([row.className, row.period, row.code, row.name, `"${row.comment.replace(/"/g, '""')}"`].join(','));
}
writeFileSync(resolve('docs/qa/nhan-xet.csv'), csv.join('\n'), 'utf8');

console.log(JSON.stringify({ comments: rows.length, files: ['docs/qa/nhan-xet.md', 'docs/qa/nhan-xet.csv'] }, null, 1));
