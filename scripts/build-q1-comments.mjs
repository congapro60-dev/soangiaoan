/**
 * Soạn nhận xét QUÝ 1 — PHÂN HOÁ SÂU, dựa trên chính LỖI của từng em.
 *
 * Bốn nguồn dữ liệu (đều là số liệu thật app ghi nhận khi chấm):
 *   docs/qa/scores-input.json    điểm từng LO (thang 4)
 *   docs/qa/behaviour.json       số bài, điểm TB, xu hướng, độ ổn định, thi vs bài tập
 *   docs/qa/question-stats.json  số câu đúng / bỏ trống / đúng một phần và KIỂU LỖI chủ đạo
 *
 * Kiểu lỗi (gom từ `errorType` của AI chấm từng câu) quyết định câu "nét riêng" — vì vậy hai em
 * cùng điểm trung bình vẫn có nhận xét khác nhau: em vướng "thiếu bước", em "bỏ câu", em
 * "sai công thức", em "hiểu sai bản chất", em "đọc sai đề", em "tính toán".
 *
 * Chuẩn văn phong: trang trọng kiểu học bạ · chỉ Quý 1 · khen nhiều hơn chê · không nêu số bài
 * nộp, tỉ lệ, xếp hạng hay so sánh với bạn khác.
 *
 * node scripts/build-q1-comments.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const scores = JSON.parse(readFileSync(resolve('docs/qa/scores-input.json'), 'utf8'));
const behaviour = existsSync(resolve('docs/qa/behaviour.json'))
  ? JSON.parse(readFileSync(resolve('docs/qa/behaviour.json'), 'utf8'))
  : {};
const questionStats = existsSync(resolve('docs/qa/question-stats.json'))
  ? JSON.parse(readFileSync(resolve('docs/qa/question-stats.json'), 'utf8'))
  : {};
const errorSignatures = existsSync(resolve('docs/qa/error-signatures.json'))
  ? JSON.parse(readFileSync(resolve('docs/qa/error-signatures.json'), 'utf8'))
  : {};
/** Điểm thi giữa HKI (thang 10) — căn cứ xếp loại mức cho nhận xét. */
const midtermScores = existsSync(resolve('docs/qa/midterm-scores.json'))
  ? JSON.parse(readFileSync(resolve('docs/qa/midterm-scores.json'), 'utf8'))
  : {};

/**
 * Xếp loại mức theo điểm thi giữa HKI (chủ dự án chốt 25/10):
 *   tốt: x > 9 · khá tốt: 8 < x < 9 · khá: 6,5 < x < 8 · cơ bản: 5 < x < 6,5 · bước đầu: x < 5
 */
const bandOf = (score) => {
  if (typeof score !== 'number') return null;
  if (score > 9) return 'tot';
  if (score > 8) return 'khaTot';
  if (score > 6.5) return 'kha';
  if (score > 5) return 'coBan';
  return 'buocDau';
};

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

const behaviourOf = (className, code) => {
  const rows = behaviour[className] || [];
  const row = rows.find((r) => r[0] === code);
  if (!row) return null;
  const [, , n, avg, trend, best, worst, sd, perAvg, hwAvg] = row;
  return { n, avg, trend, best, worst, sd, perAvg, hwAvg };
};

const questionStatsOf = (className, code) => {
  const rows = questionStats[className] || [];
  const row = rows.find((r) => r[0] === code);
  if (!row) return null;
  const [, , total, correct, blank, partial, groups] = row;
  if (!total) return null;
  const top = Object.entries(groups || {}).sort((a, b) => b[1] - a[1]);
  return { total, correct, blank, partial, groups: groups || {}, topGroup: top[0]?.[0] || null, topCount: top[0]?.[1] || 0 };
};

/** Lỗi cụ thể nhất của em (từ error-type thật) + số lần. */
const errorSignatureOf = (className, code) => {
  const byClass = {
    '10Olinda': 'class-1787208462088',
    '11Columbus': 'class-1787188523562',
    '12LoTrinh1': 'class-1787208442826',
  };
  const rows = errorSignatures[byClass[className]] || [];
  const row = rows.find((r) => r[0] === code);
  if (!row) return null;
  const [, , firstType, firstCount, secondType, secondCount] = row;
  return { firstType, firstCount, secondType, secondCount };
};

/** Quy error-type thô về câu nhận xét trang trọng. */
const describeError = (type) => {
  if (!type) return null;
  const s = String(type).toLowerCase();
  if (/thiếu bước|thiếu kết luận|thiếu biểu diễn|thiếu đơn vị|thiếu gọi tên|thiếu chú thích/.test(s))
    return 'ở các câu tự luận còn thiếu bước lập luận hoặc chưa có kết luận, dù hướng giải đúng';  if (/^bỏ|bỏ câu|bỏ trống|bỏ bài|chưa hoàn thành/.test(s))
    return 'còn để trống một số câu, phần lớn rơi vào những câu khó hoặc câu cuối đề';
  if (/nhầm công thức|sai dấu|sai công thức|sai ký hiệu|sai kí hiệu/.test(s))
    return 'còn nhầm công thức hoặc sai dấu ở một số câu';
  if (/tính toán|tính sai|chép số|làm tròn/.test(s))
    return 'phần lớn lỗi nằm ở bước tính toán, trong khi hướng giải vẫn đúng';
  if (/sai kiến thức|nhầm khái niệm|hiểu sai|ngộ nhận|giải sai/.test(s))
    return 'còn vướng ở một số kiến thức nền, cần được củng cố thêm';
  if (/đọc sai|đọc nhầm|không đọc hết/.test(s))
    return 'có câu đọc chưa kỹ yêu cầu đề bài nên làm lệch hướng';
  if (/chọn chưa đúng|chọn nhầm/.test(s))
    return 'còn chọn chưa đúng đáp án ở một số câu trắc nghiệm';
  return null;
};

/**
 * Câu mở đầu theo MỨC XẾP LOẠI từ điểm thi giữa HKI — mỗi mức một cách diễn đạt riêng,
 * không dùng "trung bình": mức 5–6,5 gọi là "cơ bản".
 */
const openingFor = (name, band, b) => {
  switch (band) {
    case 'tot':
      return `Trong Quý 1, em ${name} đạt kết quả học tập môn Toán ở mức tốt, bài kiểm tra giữa học kì cho thấy nền tảng kiến thức vững và khả năng vận dụng thành thạo.`;
    case 'khaTot':
      return `Trong Quý 1, em ${name} đạt kết quả học tập môn Toán ở mức khá tốt, nắm chắc các nội dung trọng tâm của chương trình.`;
    case 'kha':
      return `Trong Quý 1, em ${name} đạt kết quả học tập môn Toán ở mức khá, đã nắm được phần lớn kiến thức của chương trình.`;
    case 'coBan':
      return `Trong Quý 1, em ${name} đạt kết quả học tập môn Toán ở mức cơ bản, đã tiếp cận được các kiến thức nền của chương trình.`;
    default:
      return `Trong Quý 1, em ${name} bước đầu làm quen với các nội dung của chương trình Toán và đã tham gia đầy đủ các giờ học.`;
  }
};

/**
 * Nét riêng ưu tiên LỖI: kiểu lỗi chủ đạo nói rõ em vướng ở đâu khi làm bài.
 * Chỉ nêu khi kiểu lỗi đó chiếm tỉ trọng đáng kể so với tổng số câu.
 */
const errorSignature = (q, rank) => {
  if (!q || !q.total) return null;
  const share = (key) => (q.groups[key] || 0) / q.total;
  const { topGroup, topCount } = q;

  // Em làm rất tốt: khen sự chắc chắn thay vì bới lỗi.
  const correctRate = q.correct / q.total;
  if (correctRate >= 0.75) {
    return `Đáng chú ý là phần lớn câu hỏi em đều làm đúng, số câu sai không nhiều và thường chỉ là lỗi nhỏ.`;
  }

  // Bỏ câu là dấu hiệu thiếu thời gian hoặc bỏ phần khó.
  if (topGroup === 'boCau' && (share('boCau') >= 0.15 || q.blank / q.total >= 0.15)) {
    return `Khi làm bài, em còn để trống một số câu, phần lớn rơi vào các câu khó hoặc câu cuối đề.`;
  }
  if (topGroup === 'thieuBuoc' && share('thieuBuoc') >= 0.1) {
    return `Điều cần lưu ý là các bài tự luận của em còn thiếu bước lập luận hoặc thiếu kết luận, dù hướng làm đúng.`;
  }
  if (topGroup === 'saiCongThuc' && share('saiCongThuc') >= 0.1) {
    return `Em còn nhầm công thức hoặc sai dấu ở một số câu, đây là dạng lỗi có thể khắc phục nhanh nếu soát kỹ lại.`;
  }
  if (topGroup === 'hieuSaiBanChat' && share('hieuSaiBanChat') >= 0.05) {
    return `Một số câu em hiểu chưa đúng bản chất khái niệm nên chọn sai dù đã cố gắng.`;
  }
  if (topGroup === 'docSaiDe' && share('docSaiDe') >= 0.05) {
    return `Có câu em đọc chưa kỹ yêu cầu đề bài nên làm lệch hướng.`;
  }
  if (topGroup === 'tinhToan' && share('tinhToan') >= 0.1) {
    return `Phần lớn lỗi của em nằm ở bước tính toán, trong khi hướng giải vẫn đúng.`;
  }
  if (q.partial / q.total >= 0.2) {
    return `Nhiều câu em làm được một phần, cho thấy em đã nắm được hướng giải nhưng chưa hoàn thiện hết các ý.`;
  }
  // Lỗi rải rác nhiều kiểu khác nhau (nhóm "khac" chiếm ưu thế) — không có một điểm yếu hệ thống,
  // nhưng vẫn cần một câu để nhận xét có chiều sâu thay vì chỉ khen chung.
  if (topGroup === 'khac' && q.total >= 40) {
    const scattered = Object.values(q.groups).filter((v) => v >= 2).length;
    if (scattered >= 3) {
      return `Lỗi của em rải ở nhiều dạng khác nhau chứ không tập trung vào một phần kiến thức nào, cho thấy em cần rà soát kỹ hơn sau mỗi bài làm.`;
    }
  }
  if (q.partial / q.total >= 0.12) {
    return `Em thường làm đúng hướng nhưng dừng ở mức một phần các câu tự luận.`;
  }
  return null;
};

const strengthSentence = (best, bestTopic) => {
  if (best >= 3.5) return `Em nắm vững và vận dụng tốt nhất ${bestTopic}, bài thi thể hiện sự chính xác và trình bày rõ ràng.`;
  if (best >= 3) return `Em thực hiện tốt các dạng bài của ${bestTopic}.`;
  if (best >= 2.5) return `Em có kết quả khá nhất ở ${bestTopic}.`;
  return `Em đạt kết quả cao nhất ở ${bestTopic}.`;
};

/** Nhận xét Q1 — ghép 4 phần, mỗi em một câu chuyện riêng. */
const buildQ1Comment = (className, code, name, marks, los) => {
  const b = behaviourOf(className, code);
  const q = questionStatsOf(className, code);
  const pairs = los
    .map((lo, i) => ({ lo, mark: marks[i] }))
    .filter((p) => p.lo !== 'LO_DIS_TO_34764' && typeof p.mark === 'number');

  if (!pairs.length) {
    return `Trong Quý 1, em ${name} đã tham gia đầy đủ các giờ học và hoàn thành các nội dung của chương trình Toán.`;
  }

  const avg = round1(pairs.reduce((s, p) => s + p.mark, 0) / pairs.length);
  const sorted = [...pairs].sort((a, b2) => b2.mark - a.mark);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  // Mức xếp loại lấy từ ĐIỂM THI GIỮA HKI (thang 10), không từ điểm trung bình thang 4.
  const midterm = midtermScores[className]?.[code];
  const band = bandOf(midterm) || 'kha';
  const rank = band;
  const span = round1(best.mark - worst.mark);

  const parts = [openingFor(name, band, b)];

  // Nét riêng: ưu tiên LỖI CỤ THỂ nhất (error-type thật của em), sau đó mới tới nhóm lỗi chung.
  const sig = errorSignatureOf(className, code);
  const errPhrase = describeError(sig?.firstType) || describeError(sig?.secondType);
  if (errPhrase) {
    parts.push(`Trong quá trình đánh giá, ${errPhrase}.`);
  } else {
    const errSig = errorSignature(q, rank);
    if (errSig) parts.push(errSig);
  }

  parts.push(strengthSentence(best.mark, TOPIC[best.lo] || best.lo));

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

const uniqOpenings = new Set(detail.map((d) => d.comment.split('.')[0]));
console.log(JSON.stringify({
  total: detail.length,
  uniqueOpenings: uniqOpenings.size,
  byClass: merged.map((c) => `${c.className}: ${c.rows.length}`),
  samples: [detail[0], detail[1], detail.find((d) => /Hồ Anh Phong/.test(d.name)), detail.find((d) => /Lê Trung Đức/.test(d.name))].filter(Boolean).map((d) => `${d.name}: ${d.comment}`),
}, null, 1));
