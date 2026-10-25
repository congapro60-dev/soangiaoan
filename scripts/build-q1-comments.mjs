/**
 * Soạn nhận xét QUÝ 1 (gộp F1 + IA1) theo giọng giáo viên Toán có kinh nghiệm.
 *
 * Khác bản trước: một nhận xét cho cả quý, không tách kỳ; viết thành đoạn 4-6 câu có nhận định
 * tổng quát, chỉ ra năng lực mạnh, năng lực cần cải thiện (gọi tên chủ đề cụ thể), nhận xét về
 * ý thức/thái độ dựa trên tỉ lệ bài đã nộp, và lời khuyên hành động cụ thể cho quý sau.
 *
 * Nguồn: `docs/qa/scores-input.json` (điểm từng LO) + `docs/qa/submission-stats.json`
 * (số bài đã nộp / tổng bài, nếu có — để nhận xét cả về ý thức học tập).
 *
 * node scripts/build-q1-comments.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const scores = JSON.parse(readFileSync(resolve('docs/qa/scores-input.json'), 'utf8'));
const stats = existsSync(resolve('docs/qa/submission-stats.json'))
  ? JSON.parse(readFileSync(resolve('docs/qa/submission-stats.json'), 'utf8'))
  : {};

/** Mô tả chủ đề theo mã LO — dùng trong câu nhận xét. */
const TOPIC = {
  LO_DIS_TO_34344: 'mệnh đề và các phép suy luận',
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

/** Xếp loại theo điểm trung bình thang 4 của SSM. */
const rankOf = (avg) => {
  if (avg >= 3.5) return 'tot';
  if (avg >= 3) return 'kha';
  if (avg >= 2.5) return 'tb';
  if (avg >= 1.5) return 'yeu';
  return 'kem';
};

/**
 * Một nhận xét Q1 hoàn chỉnh. Cấu trúc:
 *   1. Nhận định tổng quát + xếp loại
 *   2. Năng lực mạnh (gọi tên chủ đề, mức độ)
 *   3. Năng lực cần cải thiện (gọi tên chủ đề, mức độ) — chỉ nêu khi thật sự có điểm yếu
 *   4. Ý thức học tập (dựa trên tỉ lệ bài nộp nếu có)
 *   5. Lời khuyên cụ thể cho quý sau
 */
const buildQ1Comment = (name, marks, los, submissionRate) => {
  const pairs = los
    .map((lo, i) => ({ lo, mark: marks[i] }))
    .filter((p) => p.lo !== 'LO_DIS_TO_34764' && typeof p.mark === 'number');
  if (!pairs.length) {
    return `Em ${name} chưa có bài kiểm tra hay bài tập nào được ghi nhận trong Quý 1, nên chưa có căn cứ để đánh giá năng lực. Em cần liên hệ giáo viên bộ môn để được hướng dẫn bổ sung ngay từ đầu Quý 2, tránh để hổng kiến thức kéo dài.`;
  }

  const avg = round1(pairs.reduce((s, p) => s + p.mark, 0) / pairs.length);
  const sorted = [...pairs].sort((a, b) => b.mark - a.mark);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const spread = round1(best.mark - worst.mark);
  const rank = rankOf(avg);
  const sentences = [];

  // 1. Tổng quát
  if (rank === 'tot') {
    sentences.push(`Qua kết quả học tập Quý 1, em ${name} nắm kiến thức Toán chắc và vận dụng tốt, xứng đáng ở nhóm dẫn đầu lớp.`);
  } else if (rank === 'kha') {
    sentences.push(`Qua kết quả học tập Quý 1, em ${name} đã nắm được phần lớn kiến thức trọng tâm và làm bài khá đều tay.`);
  } else if (rank === 'tb') {
    sentences.push(`Qua kết quả học tập Quý 1, em ${name} đã có cố gắng nhưng kiến thức còn ở mức trung bình, nhiều dạng bài chưa làm chủ được.`);
  } else if (rank === 'yeu') {
    sentences.push(`Qua kết quả học tập Quý 1, em ${name} còn yếu ở nhiều nội dung quan trọng, kết quả chưa phản ánh đúng khả năng của em.`);
  } else {
    sentences.push(`Qua kết quả học tập Quý 1, em ${name} bị hổng khá nhiều kiến thức nền, ảnh hưởng trực tiếp đến kết quả các bài kiểm tra.`);
  }

  // 2. Điểm mạnh
  if (best.mark >= 3.5) {
    sentences.push(`Em đặc biệt vững phần ${TOPIC[best.lo] || best.lo}, làm bài chính xác và trình bày rõ ràng.`);
  } else if (best.mark >= 3) {
    sentences.push(`Em học tốt nhất ở phần ${TOPIC[best.lo] || best.lo}, nắm được cách làm các dạng cơ bản.`);
  } else if (best.mark >= 2.5 && rank !== 'tot') {
    sentences.push(`So với các phần khác, em đỡ vướng nhất ở phần ${TOPIC[best.lo] || best.lo}.`);
  }

  // 3. Điểm cần cải thiện — nói rõ mức độ, không chung chung
  if (worst.mark < 1.5) {
    sentences.push(`Tuy nhiên phần ${TOPIC[worst.lo] || worst.lo} em còn mất căn bản, cần học lại từ khái niệm trước khi luyện bài tập.`);
  } else if (worst.mark < 2.5) {
    sentences.push(`Phần ${TOPIC[worst.lo] || worst.lo} là chỗ em yếu nhất, sai chủ yếu do chưa nắm chắc phương pháp chứ không phải do bất cẩn.`);
  } else if (spread >= 1) {
    sentences.push(`Em cần san bằng độ chênh giữa các phần, hiện phần ${TOPIC[worst.lo] || worst.lo} còn thấp hơn các phần khác khá rõ.`);
  }

  // 4. Ý thức học tập — chỉ nhận xét khi tỉ lệ nộp bài KHÔNG mâu thuẫn với kết quả
  if (typeof submissionRate === 'number') {
    if (submissionRate >= 0.9) {
      sentences.push('Về ý thức, em nộp bài đầy đủ và đúng hạn, đây là nền tảng tốt để tiến bộ tiếp.');
    } else if (submissionRate >= 0.7) {
      sentences.push('Về ý thức, em nộp bài tương đối đều nhưng vẫn còn bài bỏ trống, cần khắc phục trong Quý 2.');
    } else if (rank === 'tot' || rank === 'kha') {
      // Điểm cao mà nộp ít: nhiều khả năng em chỉ làm bài kiểm tra, không làm bài tập thường.
      // Nói đúng hiện tượng, không mâu thuẫn với lời khen ở trên.
      sentences.push('Điểm số của em cao nhưng số bài tập nộp còn ít, chủ yếu dựa vào các bài kiểm tra; đây là điều em cần khắc phục vì bài tập thường mới rèn được kỹ năng.');
    } else {
      sentences.push('Về ý thức, em còn bỏ nhiều bài tập, đây là nguyên nhân chính khiến kết quả chưa cao.');
    }
  }

  // 5. Lời khuyên cho quý sau
  if (rank === 'tot') {
    sentences.push('Sang Quý 2, em tiếp tục giữ nhịp học này và thử sức với các bài toán vận dụng cao để chuẩn bị cho kỳ thi học kỳ.');
  } else if (rank === 'kha') {
    sentences.push('Sang Quý 2, em nên dành thêm thời gian cho các dạng bài tổng hợp và chủ động hỏi thầy cô ngay khi gặp bài chưa giải được.');
  } else if (rank === 'tb') {
    sentences.push('Sang Quý 2, em cần làm lại toàn bộ bài tập đã chữa, ghi chép lại các lỗi sai thường gặp và luyện thêm mỗi tuần để bù phần còn hổng.');
  } else {
    sentences.push('Sang Quý 2, thầy cô sẽ cùng em hệ thống lại kiến thức nền; em cần đi học đều, làm đủ bài tập cơ bản và không ngại hỏi khi chưa hiểu bài.');
  }

  return sentences.join(' ');
};

/** Gộp điểm F1 và IA1 thành một bộ điểm Q1 cho mỗi em (lấy trung bình hai kỳ). */
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
const rows = ['lop,ma_hs,ten,nhan_xet_q1'];
const detail = [];

for (const cls of merged) {
  for (const row of cls.rows) {
    const rate = stats[row.code];
    const text = buildQ1Comment(row.name, row.marks, cls.los, rate);
    rows.push([cls.className, row.code, row.name, `"${text.replace(/"/g, '""')}"`].join(','));
    detail.push({ className: cls.className, code: row.code, name: row.name, comment: text });
  }
}

writeFileSync(resolve('docs/qa/nhan-xet-Q1.csv'), '\ufeff' + rows.join('\n'), 'utf8');
writeFileSync(resolve('docs/qa/nhan-xet-Q1.json'), JSON.stringify(detail, null, 2), 'utf8');

console.log(JSON.stringify({
  total: detail.length,
  byClass: merged.map((c) => `${c.className}: ${c.rows.length}`),
  sample: detail[0],
}, null, 1));
