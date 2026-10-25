/**
 * Soạn nhận xét QUÝ 1 (gộp F1 + IA1) cho hồ sơ học tập của học sinh.
 *
 * QUAN TRỌNG — nhận xét này đi vào báo cáo học tập và hồ sơ học sinh (có thể dùng khi du học),
 * nên văn phong phải: khách quan · tích cực · khen nhiều hơn chê · KHÔNG nêu số liệu nộp bài tập
 * hay bất kỳ dữ liệu nội bộ nào (tỉ lệ nộp bài, so sánh với bạn khác, xếp hạng lớp).
 *
 * Cấu trúc 4 câu:
 *   1. Nhận định tổng quát về kết quả học tập trong quý (luôn mở đầu tích cực)
 *   2. Năng lực nổi bật — gọi tên chủ đề cụ thể em làm tốt
 *   3. Nội dung cần củng cố — diễn đạt nhẹ, hướng tới tiến bộ (nếu có)
 *   4. Định hướng tích cực cho Quý 2
 *
 * node scripts/build-q1-comments.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const scores = JSON.parse(readFileSync(resolve('docs/qa/scores-input.json'), 'utf8'));

/** Mô tả chủ đề theo mã LO — dùng trong câu nhận xét. */
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
  return 'yeu';
};

/**
 * Nhận xét cho hồ sơ. Nguyên tắc: luôn có ít nhất một lời ghi nhận tích cực và một định hướng
 * phát triển; phần cần củng cố nói ở giọng gợi mở, không phán xét, không so sánh.
 */
const buildQ1Comment = (name, marks, los) => {
  const pairs = los
    .map((lo, i) => ({ lo, mark: marks[i] }))
    .filter((p) => p.lo !== 'LO_DIS_TO_34764' && typeof p.mark === 'number');

  if (!pairs.length) {
    return `Em ${name} đã tham gia học tập trong Quý 1. Với những nội dung đã học, em có nhiều tiềm năng phát triển nếu duy trì đều đặn việc ôn luyện. Thầy cô ghi nhận sự có mặt của em trong các giờ học và mong em sẽ thể hiện được năng lực của mình rõ nét hơn trong Quý 2.`;
  }

  const avg = round1(pairs.reduce((s, p) => s + p.mark, 0) / pairs.length);
  const sorted = [...pairs].sort((a, b) => b.mark - a.mark);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const rank = rankOf(avg);
  const sentences = [];

  // 1. Nhận định tổng quát — luôn mở bằng ghi nhận tích cực
  if (rank === 'tot') {
    sentences.push(`Trong Quý 1, em ${name} thể hiện nền tảng kiến thức Toán vững và khả năng vận dụng tốt, kết quả học tập thuộc nhóm cao của lớp.`);
  } else if (rank === 'kha') {
    sentences.push(`Trong Quý 1, em ${name} có thái độ học tập tích cực và nắm được phần lớn kiến thức trọng tâm của chương trình.`);
  } else if (rank === 'tb') {
    sentences.push(`Trong Quý 1, em ${name} đã có nhiều cố gắng và từng bước làm quen với các dạng toán mới của chương trình.`);
  } else {
    sentences.push(`Trong Quý 1, em ${name} đã tham gia học tập và có ý thức tiếp thu bài giảng của thầy cô.`);
  }

  // 2. Năng lực nổi bật — luôn có, gọi tên chủ đề
  if (best.mark >= 3.5) {
    sentences.push(`Em đặc biệt vững phần ${TOPIC[best.lo] || best.lo}: các bài làm thể hiện sự chính xác và trình bày rõ ràng, mạch lạc.`);
  } else if (best.mark >= 3) {
    sentences.push(`Em học tốt phần ${TOPIC[best.lo] || best.lo} và đã nắm được phương pháp giải các dạng bài cơ bản ở nội dung này.`);
  } else if (best.mark >= 2.5) {
    sentences.push(`Em tiếp thu tốt nhất ở phần ${TOPIC[best.lo] || best.lo}, đây là nền tảng thuận lợi để em phát triển thêm.`);
  } else {
    sentences.push(`Trong các nội dung của Quý 1, em thể hiện sự cố gắng rõ nhất ở phần ${TOPIC[best.lo] || best.lo}.`);
  }

  // 3. Nội dung cần củng cố — nhẹ nhàng, hướng tới tiến bộ
  if (worst.mark < 2.5) {
    sentences.push(`Để kết quả được toàn diện hơn, em sẽ được thầy cô đồng hành củng cố thêm phần ${TOPIC[worst.lo] || worst.lo} trong thời gian tới.`);
  } else if (round1(best.mark - worst.mark) >= 1) {
    sentences.push(`Nếu dành thêm thời gian cho phần ${TOPIC[worst.lo] || worst.lo}, kết quả học tập của em sẽ đồng đều và nổi bật hơn nữa.`);
  } else {
    sentences.push('Các nội dung trong quý đều được em tiếp thu tương đối đồng đều, tạo thuận lợi cho việc học tiếp ở Quý 2.');
  }

  // 4. Định hướng Quý 2
  if (rank === 'tot') {
    sentences.push('Bước sang Quý 2, với nền tảng hiện có, em hoàn toàn có thể chinh phục các bài toán vận dụng cao và chuẩn bị tốt cho kỳ thi học kỳ.');
  } else if (rank === 'kha') {
    sentences.push('Bước sang Quý 2, nếu duy trì được sự chuyên cần và mạnh dạn trao đổi với thầy cô khi gặp bài khó, em sẽ tiến bộ rõ rệt.');
  } else {
    sentences.push('Bước sang Quý 2, thầy cô tin rằng với sự đồng hành của gia đình và nhà trường, em sẽ từng bước vững vàng hơn và đạt kết quả tốt hơn.');
  }

  return sentences.join(' ');
};

/** Gộp điểm F1 và IA1 thành một bộ điểm Q1 cho mỗi em (trung bình hai kỳ). */
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
