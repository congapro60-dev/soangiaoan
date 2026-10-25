/**
 * Soạn nhận xét QUÝ 1 cho học bạ / báo cáo học tập của học sinh.
 *
 * Chuẩn văn phong (chủ dự án chốt 25/10):
 *   - TRANG TRỌNG, như nhận xét học bạ, không khẩu ngữ.
 *   - CHỈ nhận xét Quý 1: không nêu việc cần làm ở Quý 2, không định hướng tương lai.
 *   - Khách quan, khen nhiều hơn chê; phần hạn chế nêu ngắn, đúng mức.
 *   - KHÔNG nêu số lượt nộp bài, tỉ lệ nộp, xếp hạng hay so sánh với bạn khác.
 *
 * Cấu trúc 3 câu: kết quả chung của quý · năng lực nổi bật · nội dung cần củng cố (nếu có).
 *
 * node scripts/build-q1-comments.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const scores = JSON.parse(readFileSync(resolve('docs/qa/scores-input.json'), 'utf8'));

/** Tên chủ đề theo mã LO — dùng trong nhận xét học bạ. */
const TOPIC = {
  LO_DIS_TO_34344: 'mệnh đề và các phép suy luận toán học',
  LO_DIS_TO_34345: 'các phép toán trên tập hợp',
  LO_DIS_TO_34346: 'bất phương trình và hệ bất phương trình bậc nhất hai ẩn',
  LO_DIS_TO_34352: 'giá trị lượng giác của góc từ 0° đến 180°',
  LO_DIS_TO_34353: 'hệ thức lượng trong tam giác',
  LO_DIS_TO_34354: 'vectơ và các phép toán vectơ',
  LO_DIS_TO_34745: 'hàm số lượng giác và công thức lượng giác',
  LO_DIS_TO_34746: 'phương trình lượng giác',
  LO_DIS_TO_34747: 'dãy số',
  LO_DIS_TO_34748: 'cấp số cộng và cấp số nhân',
  LO_DIS_TO_34756: 'đường thẳng, mặt phẳng và quan hệ song song trong không gian',
  LO_DIS_TO_34383: 'sự đồng biến, nghịch biến của hàm số',
  LO_DIS_TO_34384: 'cực trị của hàm số',
  LO_DIS_TO_34385: 'giá trị lớn nhất và giá trị nhỏ nhất của hàm số',
  LO_DIS_TO_34386: 'các đường tiệm cận của đồ thị hàm số',
  LO_DIS_TO_34387: 'khảo sát sự biến thiên và vẽ đồ thị hàm số',
  LO_DIS_TO_34390: 'vectơ trong không gian',
  LO_DIS_TO_34391: 'hệ trục toạ độ trong không gian',
  LO_DIS_TO_34392: 'biểu thức toạ độ của các phép toán vectơ',
};

const round1 = (v) => Math.round(v * 10) / 10;

const rankOf = (avg) => {
  if (avg >= 3.5) return 'tot';
  if (avg >= 3) return 'kha';
  if (avg >= 2.5) return 'tb';
  return 'canCoGang';
};

/**
 * Nhận xét học bạ Quý 1. Câu 1 nêu kết quả chung, câu 2 năng lực nổi bật, câu 3 nội dung cần
 * củng cố. Không có câu định hướng tương lai.
 */
const buildQ1Comment = (name, marks, los) => {
  const pairs = los
    .map((lo, i) => ({ lo, mark: marks[i] }))
    .filter((p) => p.lo !== 'LO_DIS_TO_34764' && typeof p.mark === 'number');

  if (!pairs.length) {
    return `Trong Quý 1, em ${name} đã tham gia học tập đầy đủ các nội dung của chương trình.`;
  }

  const avg = round1(pairs.reduce((s, p) => s + p.mark, 0) / pairs.length);
  const sorted = [...pairs].sort((a, b) => b.mark - a.mark);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const rank = rankOf(avg);
  const sentences = [];

  // Câu 1 — kết quả chung của quý, giọng học bạ.
  if (rank === 'tot') {
    sentences.push(`Trong Quý 1, em ${name} có kết quả học tập môn Toán tốt, nền tảng kiến thức vững và khả năng vận dụng thành thạo các nội dung đã học.`);
  } else if (rank === 'kha') {
    sentences.push(`Trong Quý 1, em ${name} có kết quả học tập môn Toán ở mức khá, nắm được phần lớn kiến thức trọng tâm của chương trình.`);
  } else if (rank === 'tb') {
    sentences.push(`Trong Quý 1, em ${name} có kết quả học tập môn Toán ở mức trung bình, đã tiếp thu được các nội dung cơ bản của chương trình.`);
  } else {
    sentences.push(`Trong Quý 1, em ${name} đã tham gia học tập và bước đầu tiếp cận các nội dung của chương trình Toán.`);
  }

  // Câu 2 — năng lực nổi bật, luôn có và gọi tên chủ đề.
  if (best.mark >= 3.5) {
    sentences.push(`Em nắm vững và vận dụng tốt nhất nội dung ${TOPIC[best.lo] || best.lo}, bài làm thể hiện sự chính xác và trình bày rõ ràng.`);
  } else if (best.mark >= 3) {
    sentences.push(`Em nắm tốt nội dung ${TOPIC[best.lo] || best.lo} và thực hiện được các dạng bài cơ bản của phần này.`);
  } else if (best.mark >= 2.5) {
    sentences.push(`Trong các nội dung của quý, em tiếp thu tốt nhất phần ${TOPIC[best.lo] || best.lo}.`);
  } else {
    sentences.push(`Em đạt kết quả cao nhất ở nội dung ${TOPIC[best.lo] || best.lo}.`);
  }

  // Câu 3 — nội dung cần củng cố, chỉ nêu khi thật sự có khoảng trống.
  if (worst.mark < 2.5) {
    sentences.push(`Nội dung ${TOPIC[worst.lo] || worst.lo} cần được củng cố thêm để kết quả học tập của em được đồng đều hơn.`);
  } else if (round1(best.mark - worst.mark) >= 1) {
    sentences.push(`Nội dung ${TOPIC[worst.lo] || worst.lo} còn thấp hơn các phần khác, cần được chú ý củng cố thêm.`);
  } else {
    sentences.push('Các nội dung trong quý được em tiếp thu tương đối đồng đều.');
  }

  return sentences.join(' ');
};

/** Gộp điểm F1 và IA1 thành một bộ điểm Q1 (trung bình hai kỳ). */
const mergeQuarter = (classGroups) => {
  const byClass = new Map();
  for (const group of classGroups) {
    if (!byClass.has(group.c)) byClass.set(group.c, []);
    byClass.get(group.c).push(group);
  }

  const merged = [];
  for (const [className, groups] of byClass) {
    const los = [...new Set(groups.flatMap((g) => g.los))];
    const byCode = new Map();
    for (const group of groups) {
      for (const row of group.rows) {
        const [code, name, ...marks] = row;
        const scoresByLo = new Map(group.los.map((lo, i) => [lo, marks[i]]));
        const entry = byCode.get(code) || { code, name, byLo: new Map() };
        for (const lo of los) {
          const value = scoresByLo.get(lo);
          if (typeof value === 'number') {
            const list = entry.byLo.get(lo) || [];
            list.push(value);
            entry.byLo.set(lo, list);
          }
        }
        byCode.set(code, entry);
      }
    }
    merged.push({
      className,
      los,
      rows: [...byCode.values()].map((entry) => ({
        code: entry.code,
        name: entry.name,
        marks: los.map((lo) => {
          const list = entry.byLo.get(lo);
          if (!list || !list.length) return undefined;
          return round1(list.reduce((s, v) => s + v, 0) / list.length);
        }),
      })),
    });
  }
  return merged;
};

const merged = mergeQuarter(scores);
const csvRows = ['lop,ma_hs,ten,nhan_xet_q1'];
const detail = [];

for (const cls of merged) {
  for (const row of cls.rows) {
    const text = buildQ1Comment(row.name, row.marks, cls.los);
    csvRows.push([cls.className, row.code, row.name, `"${text.replace(/"/g, '""')}"`].join(','));
    detail.push({ className: cls.className, code: row.code, name: row.name, comment: text });
  }
}

writeFileSync(resolve('docs/qa/nhan-xet-Q1.csv'), '\ufeff' + csvRows.join('\n'), 'utf8');
writeFileSync(resolve('docs/qa/nhan-xet-Q1.json'), JSON.stringify(detail, null, 2), 'utf8');

console.log(JSON.stringify({
  total: detail.length,
  byClass: merged.map((c) => `${c.className}: ${c.rows.length}`),
  samples: [detail[0], detail.find((d) => /Hồ Anh Phong/.test(d.name)), detail.find((d) => /Lê Trung Đức/.test(d.name))].map((d) => `${d.name}: ${d.comment}`),
}, null, 1));
