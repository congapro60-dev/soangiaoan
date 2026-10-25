/**
 * Soạn nhận xét QUÝ 1 cho học bạ / báo cáo học tập của học sinh.
 *
 * Chuẩn văn phong (chủ dự án chốt 25/10):
 *   - TRANG TRỌNG như nhận xét học bạ, không khẩu ngữ.
 *   - CHỈ nhận xét Quý 1: không nêu việc cần làm ở Quý 2, không định hướng tương lai.
 *   - Khách quan, khen nhiều hơn chê; phần hạn chế KHÔNG so sánh với phần khác — chỉ nêu
 *     nội dung đó cần củng cố và rèn luyện thêm.
 *   - KHÔNG nêu số lượt nộp bài, tỉ lệ nộp, xếp hạng hay so sánh với bạn khác.
 *   - Không lặp từ: mỗi câu dùng động từ khác nhau (nắm / tiếp thu / thực hiện / vận dụng).
 *
 * Cấu trúc 3 câu: kết quả chung của quý · năng lực nổi bật · nội dung cần củng cố (nếu có).
 *
 * node scripts/build-q1-comments.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const scores = JSON.parse(readFileSync(resolve('docs/qa/scores-input.json'), 'utf8'));

/** Tên chủ đề theo mã LO. */
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
 * Nhận xét học bạ Quý 1 — 3 câu, mỗi câu một ý, không lặp động từ.
 */
const buildQ1Comment = (name, marks, los) => {
  const pairs = los
    .map((lo, i) => ({ lo, mark: marks[i] }))
    .filter((p) => p.lo !== 'LO_DIS_TO_34764' && typeof p.mark === 'number');

  if (!pairs.length) {
    return `Trong Quý 1, em ${name} đã tham gia đầy đủ các giờ học và hoàn thành các nội dung của chương trình Toán.`;
  }

  const avg = round1(pairs.reduce((s, p) => s + p.mark, 0) / pairs.length);
  const sorted = [...pairs].sort((a, b) => b.mark - a.mark);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const rank = rankOf(avg);
  const bestTopic = TOPIC[best.lo] || best.lo;
  const worstTopic = TOPIC[worst.lo] || worst.lo;
  const spread = round1(best.mark - worst.mark);

  // Câu 1 — kết quả chung của quý.
  const opening = {
    tot: `Trong Quý 1, em ${name} đạt kết quả học tập môn Toán tốt, nền tảng kiến thức vững và khả năng vận dụng thành thạo các nội dung đã học.`,
    kha: `Trong Quý 1, em ${name} đạt kết quả học tập môn Toán ở mức khá, nắm được phần lớn kiến thức trọng tâm của chương trình.`,
    tb: `Trong Quý 1, em ${name} đạt kết quả học tập môn Toán ở mức trung bình, đã nắm được các kiến thức cơ bản của chương trình.`,
    canCoGang: `Trong Quý 1, em ${name} đã tham gia học tập và bước đầu làm quen với các nội dung của chương trình Toán.`,
  }[rank];

  // Câu 2 — năng lực nổi bật (động từ khác câu 1 để không lặp).
  let strength;
  if (best.mark >= 3.5) {
    strength = `Em vận dụng tốt nhất ${bestTopic}, bài làm thể hiện sự chính xác và trình bày rõ ràng.`;
  } else if (best.mark >= 3) {
    strength = `Em thực hiện tốt các dạng bài của ${bestTopic}.`;
  } else if (best.mark >= 2.5) {
    strength = `Em có kết quả khá nhất ở ${bestTopic}.`;
  } else {
    strength = `Em đạt kết quả cao nhất ở ${bestTopic}.`;
  }

  // Câu 3 — nội dung cần củng cố. Không so sánh với phần khác.
  let improvement;
  if (worst.mark < 2.5) {
    improvement = `Nội dung ${worstTopic} cần được củng cố và rèn luyện thêm.`;
  } else if (spread >= 1) {
    improvement = `Em cần củng cố và rèn luyện thêm ở ${worstTopic}.`;
  } else {
    improvement = 'Các nội dung trong chương trình được em tiếp thu đều.';
  }

  return `${opening} ${strength} ${improvement}`;
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
  samples: [detail[0], detail.find((d) => /Hoàng Tuấn Minh/.test(d.name)), detail.find((d) => /Lê Trung Đức/.test(d.name))].map((d) => `${d.name}: ${d.comment}`),
}, null, 1));
