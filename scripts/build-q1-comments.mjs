/**
 * Soạn nhận xét QUÝ 1 — PHÂN HOÁ theo hồ sơ học tập thật của từng em.
 *
 * Vấn đề của bản trước: mọi em cùng một mô-týp vì chỉ dựa vào điểm trung bình. Bản này khai thác
 * thêm hành vi học tập đo được từ dữ liệu bài nộp:
 *   n      số bài đã hoàn thành
 *   avg    điểm trung bình (%)
 *   trend  chênh lệch nửa sau so với nửa đầu kỳ (>0 là tiến bộ dần)
 *   best / worst  điểm cao nhất / thấp nhất
 *   sd     độ dao động (cao = phong độ thất thường)
 *   perAvg / hwAvg  điểm trung bình bài kiểm tra định kì / bài tập thường
 *
 * Mỗi em nhận một nhận xét ghép từ: mở đầu theo mức chung → NÉT RIÊNG (tiến bộ / ổn định /
 * thất thường / vững bài kiểm tra / mạnh bài tập) → năng lực nổi bật theo chủ đề → nội dung cần
 * củng cố → kết câu theo đúng nét riêng đó.
 *
 * Chuẩn văn phong: trang trọng kiểu học bạ · chỉ Quý 1 · khen nhiều hơn chê · không nêu số bài
 * nộp, tỉ lệ, xếp hạng hay so sánh với bạn khác.
 *
 * node scripts/build-q1-comments.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const scores = JSON.parse(readFileSync(resolve('docs/qa/scores-input.json'), 'utf8'));
const behaviour = JSON.parse(readFileSync(resolve('docs/qa/behaviour.json'), 'utf8'));

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

/** Chỉ số hành vi của một em, tra theo mã HS. */
const behaviourOf = (className, code) => {
  const rows = behaviour[className] || [];
  const row = rows.find((r) => r[0] === code);
  if (!row) return null;
  const [, , n, avg, trend, best, worst, sd, perAvg, hwAvg] = row;
  return { n, avg, trend, best, worst, sd, perAvg, hwAvg };
};

/**
 * Xác định "nét riêng" của em — chọn một nét nổi bật nhất, không liệt kê hết.
 * Thứ tự ưu tiên: tiến bộ rõ > vững bài kiểm tra > ổn định cao > mạnh bài tập thường > thất thường.
 */
const signatureOf = (b, rank) => {
  if (!b || b.n === 0) return 'absent';
  if (b.trend >= 8) return 'tienBo';
  if (b.trend <= -8) return 'chungLai';
  if (b.sd >= 22) return 'thatThuong';  if (typeof b.perAvg === 'number' && typeof b.hwAvg === 'number' && b.perAvg - b.hwAvg >= 8) return 'vungThi';
  if (typeof b.perAvg === 'number' && typeof b.hwAvg === 'number' && b.hwAvg - b.perAvg >= 8) return 'manhBaiTap';
  if (b.sd <= 12) return 'onDinh';
  if (rank === 'tot') return 'vuotTroi';
  return 'deu';
};

/** Câu mở đầu theo mức chung — mỗi mức dùng từ vựng khác nhau. */
const openingFor = (name, rank, b) => {
  const n = b?.n ?? 0;
  if (rank === 'tot') {
    return n >= 15
      ? `Trong Quý 1, em ${name} có kết quả học tập môn Toán tốt và duy trì được phong độ qua suốt quá trình học.`
      : `Trong Quý 1, em ${name} đạt kết quả học tập môn Toán tốt, thể hiện nền tảng kiến thức vững.`;
  }
  if (rank === 'kha') {
    return n >= 15
      ? `Trong Quý 1, em ${name} đạt kết quả học tập môn Toán ở mức khá, giữ được nhịp học đều đặn.`
      : `Trong Quý 1, em ${name} đạt kết quả học tập môn Toán ở mức khá, nắm được phần lớn kiến thức trọng tâm.`;
  }
  if (rank === 'tb') {
    return `Trong Quý 1, em ${name} đạt kết quả học tập môn Toán ở mức trung bình, đã nắm được các kiến thức cơ bản của chương trình.`;
  }
  return `Trong Quý 1, em ${name} đã tham gia học tập và bước đầu làm quen với các nội dung của chương trình Toán.`;
};

/** Câu nét riêng — phần tạo khác biệt giữa các em. */
const signatureSentence = (signature, name, b) => {
  switch (signature) {
    case 'tienBo':
      return `Điểm đáng ghi nhận là em có tiến bộ rõ rệt về sau: kết quả những bài cuối quý cao hơn hẳn giai đoạn đầu, cho thấy em đã điều chỉnh được cách học.`;
    case 'chungLai':
      return `Kết quả các bài cuối quý có phần giảm so với giai đoạn đầu, rất có thể do khối lượng kiến thức tăng nhanh ở giai đoạn ôn thi giữa kì.`;
    case 'thatThuong':
      return `Kết quả giữa các lần kiểm tra của em có độ chênh khá lớn: có lần làm rất tốt nhưng cũng có lần còn ở mức thấp, cho thấy phong độ chưa thật ổn định.`;
    case 'vungThi':
      return `Điểm nổi bật là em làm tốt hơn hẳn khi kiểm tra tập trung so với luyện tập thường ngày, cho thấy em có khả năng huy động kiến thức dưới áp lực thời gian.`;
    case 'manhBaiTap':
      return `Điểm nổi bật là phần luyện tập thường ngày của em tốt hơn hẳn khi làm đề kiểm tra, cho thấy em nắm chắc các dạng cơ bản nhưng còn lúng túng khi gặp đề tổng hợp.`;
    case 'onDinh':
      return `Điều đáng khen là phong độ của em rất ổn định: kết quả các bài gần như đồng đều trong suốt quý.`;
    case 'vuotTroi':
      return `Em thường xuyên đạt kết quả cao, nhiều lần làm gần như trọn vẹn đề.`;
    case 'deu':
      return `Kết quả của em tương đối đồng đều qua các lần kiểm tra, không có giai đoạn nào sa sút rõ rệt.`;
    default:
      return '';
  }
};

/** Câu về năng lực nổi bật theo chủ đề. */
const strengthSentence = (best, bestTopic) => {
  if (best >= 3.5) return `Em nắm vững và vận dụng tốt nhất ${bestTopic}, bài làm thể hiện sự chính xác và trình bày rõ ràng.`;
  if (best >= 3) return `Em thực hiện tốt các dạng bài của ${bestTopic}.`;
  if (best >= 2.5) return `Em có kết quả khá nhất ở ${bestTopic}.`;
  return `Em đạt kết quả cao nhất ở ${bestTopic}.`;
};

/**
 * Nhận xét Q1 — ghép 4 phần, mỗi em ra một câu chuyện khác nhau vì phần "nét riêng" và
 * "năng lực nổi bật" phụ thuộc dữ liệu riêng của em đó.
 */
const buildQ1Comment = (className, code, name, marks, los) => {
  const b = behaviourOf(className, code);
  const pairs = los
    .map((lo, i) => ({ lo, mark: marks[i] }))
    .filter((p) => p.lo !== 'LO_DIS_TO_34764' && typeof p.mark === 'number');

  if (!b || b.n === 0 || !pairs.length) {
    return b && b.n === 0
      ? `Trong Quý 1, em ${name} chưa có bài làm nào được ghi nhận trong chương trình.`
      : `Trong Quý 1, em ${name} đã tham gia đầy đủ các giờ học và hoàn thành các nội dung của chương trình Toán.`;
  }

  const avg = round1(pairs.reduce((s, p) => s + p.mark, 0) / pairs.length);
  const sorted = [...pairs].sort((a, b2) => b2.mark - a.mark);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const rank = avg >= 3.5 ? 'tot' : avg >= 3 ? 'kha' : avg >= 2.5 ? 'tb' : 'canCoGang';
  const span = round1(best.mark - worst.mark);
  const signature = signatureOf(b, rank);

  const parts = [
    openingFor(name, rank, b),
    signatureSentence(signature, name, b),
    strengthSentence(best.mark, TOPIC[best.lo] || best.lo),
  ];

  // Nội dung cần củng cố — chỉ nêu khi thật sự có khoảng trống so với chính em đó.
  if (worst.mark < 2.5 || (span >= 1 && worst.mark < best.mark)) {
    parts.push(`Nội dung ${TOPIC[worst.lo] || worst.lo} cần được củng cố và rèn luyện thêm.`);
  }

  return parts.filter(Boolean).join(' ');
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
    const text = buildQ1Comment(cls.className, row.code, row.name, row.marks, cls.los);
    csvRows.push([cls.className, row.code, row.name, `"${text.replace(/"/g, '""')}"`].join(','));
    detail.push({ className: cls.className, code: row.code, name: row.name, comment: text });
  }
}

writeFileSync(resolve('docs/qa/nhan-xet-Q1.csv'), '\ufeff' + csvRows.join('\n'), 'utf8');
writeFileSync(resolve('docs/qa/nhan-xet-Q1.json'), JSON.stringify(detail, null, 2), 'utf8');

// Báo cáo mức phân hoá: bao nhiêu kiểu mở đầu / nét riêng khác nhau.
const uniqOpenings = new Set(detail.map((d) => d.comment.split('.')[0]));
console.log(JSON.stringify({
  total: detail.length,
  uniqueOpenings: uniqOpenings.size,
  byClass: merged.map((c) => `${c.className}: ${c.rows.length}`),
  samples: [detail[0], detail[1], detail.find((d) => /Lê Trung Đức/.test(d.name))].map((d) => `${d.name}: ${d.comment}`),
}, null, 1));
