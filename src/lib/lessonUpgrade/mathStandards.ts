// Bộ kiểm định CHUẨN TOÁN (deterministic) — không cần gọi AI.
// Nguồn tiêu chí: 7 tài liệu trong "các yêu cầu về Toán cần đạt" (Hướng dẫn soạn KHDH môn
// Toán TDS + Tiêu chí dự giờ CIS), đã đối chiếu với 2 giáo án mẫu KHDH_v13 và G12 Ứng dụng
// đạo hàm. Mỗi hàm trả về một finding có id ổn định để UI/kiểm thử bám vào.
//
// Đây là tầng bằng chứng CẤU TRÚC (nhìn thấy được trong văn bản). Nó BỔ SUNG cho phân tích
// AI chứ không thay thế: bắt đúng các lỗi lặp đi lặp lại (thiếu pha, mục tiêu không phân hóa,
// BTVN trống, sót câu hướng dẫn nội bộ, tiết luyện tập thiếu Polya/2 lộ trình gợi ý...).

export type LessonType = 'practice' | 'knowledge' | 'flipped' | 'unknown';

export type FindingStatus = 'pass' | 'fail' | 'warn';
export type FindingSeverity = 'high' | 'medium' | 'low';

export interface StandardsFinding {
  /** id ổn định, kebab-case — dùng cho UI/kiểm thử, KHÔNG đổi tuỳ tiện. */
  id: string;
  title: string;
  status: FindingStatus;
  severity: FindingSeverity;
  /** Bằng chứng: đã tìm thấy gì / thiếu gì trong giáo án. */
  evidence: string;
  /** Hướng sửa cụ thể, không chung chung. */
  suggestion: string;
  /** Áp dụng cho mọi tiết, hay chỉ tiết luyện tập (mục C). */
  scope: 'all' | 'practice';
}

const norm = (s: string): string => s.toLowerCase();

const has = (text: string, re: RegExp): boolean => re.test(text);

/** Nhận diện loại tiết để bật thêm bộ kiểm mục C cho tiết luyện tập. */
export const detectLessonType = (content: string): LessonType => {
  const t = norm(content);
  if (has(t, /đảo\s*ngược|flipped\s*classroom/)) return 'flipped';
  const looksPractice =
    has(t, /polya|pô-?li-?a/) ||
    has(t, /hình\s*thành\s*kĩ\s*năng|hình\s*thành\s*kỹ\s*năng/) ||
    (has(t, /luyện\s*tập/) && has(t, /dạng\s*bài|phương\s*pháp\s*giải|bài\s*tập\s*\d|bài\s*\d\s*[:.]/));
  if (looksPractice) return 'practice';
  if (has(t, /hình\s*thành\s*kiến\s*thức|định\s*ngh(?:ĩa|ĩ)|định\s*l(?:í|ý)|khái\s*niệm\s*mới/))
    return 'knowledge';
  return 'unknown';
};

// ── Các phép kiểm chung (mọi tiết) ────────────────────────────────────────────

const checkFourPhases = (t: string): StandardsFinding => {
  const phaseTrai = has(t, /trải\s*nghiệm|khởi\s*động|mở\s*đầu/);
  const phaseHinh = has(t, /hình\s*thành\s*(kiến\s*thức|kĩ\s*năng|kỹ\s*năng)/);
  const phaseRen = has(t, /rèn\s*luyện|luyện\s*tập|củng\s*cố|vận\s*dụng/);
  const phaseSoKet = has(t, /sơ\s*kết|tổng\s*kết|củng\s*cố.*dặn|hướng\s*dẫn\s*về\s*nhà|btvn|bài\s*tập\s*về\s*nhà/);
  const missing = [
    !phaseTrai && 'Trải nghiệm/Khởi động',
    !phaseHinh && 'Hình thành kiến thức/kĩ năng',
    !phaseRen && 'Rèn luyện/Luyện tập',
    !phaseSoKet && 'Sơ kết/Tổng kết',
  ].filter(Boolean) as string[];
  return {
    id: 'four-phases',
    title: 'Đủ 4 pha: Trải nghiệm → Hình thành → Rèn luyện → Sơ kết',
    status: missing.length === 0 ? 'pass' : 'fail',
    severity: 'high',
    evidence: missing.length === 0
      ? 'Có đủ dấu hiệu của cả 4 pha.'
      : `Thiếu/không rõ pha: ${missing.join(', ')}.`,
    suggestion: 'Bổ sung đủ 4 pha theo quy trình môn Toán TDS; mỗi pha là một hoạt động có tiêu đề rõ ràng.',
    scope: 'all',
  };
};

const checkDifferentiatedObjectives = (t: string): StandardsFinding => {
  const tiered =
    has(t, /must\s*do|should\s*do|could\s*do/) ||
    has(t, /🌶/) ||
    has(t, /cơ\s*bản.*trọng\s*tâm|trọng\s*tâm.*nâng\s*cao/) ||
    (has(t, /mục\s*tiêu/) && has(t, /học\s*sinh\s*yếu|học\s*sinh\s*giỏi|phân\s*hóa|phân\s*hoá/));
  return {
    id: 'differentiated-objectives',
    title: 'Mục tiêu đo được & phân hóa (tối thiểu / trọng tâm / nâng cao)',
    status: tiered ? 'pass' : 'fail',
    severity: 'high',
    evidence: tiered
      ? 'Có phân tầng mục tiêu (Must/Should/Could, 🌶, hoặc yếu–giỏi).'
      : 'Chưa thấy mục tiêu phân hóa theo mức tối thiểu/trọng tâm/nâng cao.',
    suggestion: 'Viết mục tiêu dạng "Tôi có thể..." theo 3 mức Must do (🌶 cơ bản) / Should do (🌶🌶 trọng tâm) / Could do (🌶🌶🌶 nâng cao), dùng động từ đo được.',
    scope: 'all',
  };
};

const checkGuidingQuestions = (t: string): StandardsFinding => {
  const questionCount = (t.match(/\?/g) || []).length;
  const hasCritical = has(t, /phản\s*biện|cách\s*(làm|giải)\s*khác|ý\s*kiến\s*khác|phản\s*ví\s*dụ|vì\s*sao|tại\s*sao/);
  const ok = questionCount >= 3 && hasCritical;
  return {
    id: 'guiding-questions',
    title: 'Dùng câu hỏi dẫn dắt & tư duy phản biện thay vì thuyết trình',
    status: ok ? 'pass' : questionCount >= 3 ? 'warn' : 'fail',
    severity: 'medium',
    evidence: `Có ${questionCount} câu hỏi; ${hasCritical ? 'có' : 'thiếu'} câu hỏi phản biện/mở rộng ("vì sao", "cách khác", "phản ví dụ").`,
    suggestion: 'Thay các đoạn giảng một chiều bằng hệ thống câu hỏi định hướng + câu hỏi phân rã; thêm câu hỏi phản biện (hỏi ý kiến khác, cách làm khác, phản ví dụ).',
    scope: 'all',
  };
};

const checkPracticeMinThree = (t: string): StandardsFinding => {
  const hasPractice = has(t, /rèn\s*luyện|luyện\s*tập|củng\s*cố/);
  // Đếm dấu hiệu "3 ý": Bài 1/2/3, Ví dụ 1/2/3, Câu 1/2/3, hoặc 🌶🌶🌶.
  const numbered = new Set(
    (t.match(/(?:bài|ví\s*dụ|câu|bài\s*tập)\s*(\d+)/g) || []).map((m) => m.replace(/\D/g, '')),
  );
  const enough = numbered.size >= 3 || (t.match(/🌶/g) || []).length >= 3;
  return {
    id: 'practice-min-three',
    title: 'Hoạt động rèn luyện có tối thiểu 3 ý, từ dễ đến nâng cao',
    status: hasPractice && enough ? 'pass' : hasPractice ? 'warn' : 'fail',
    severity: 'high',
    evidence: hasPractice
      ? `Nhận diện ${numbered.size} bài/ví dụ được đánh số.`
      : 'Chưa thấy hoạt động rèn luyện/luyện tập.',
    suggestion: 'Bảo đảm pha rèn luyện có ≥3 ý cho mục tiêu trọng tâm, sắp từ đơn giản → nâng cao, đa dạng cách hỏi (xuôi/ngược), tránh ví dụ 1 đã cồng kềnh.',
    scope: 'all',
  };
};

const checkExpectedProducts = (t: string): StandardsFinding => {
  const mentions = has(t, /sản\s*phẩm\s*dự\s*kiến|nội\s*dung\s*ghi\s*bảng|đáp\s*án|lời\s*giải|kết\s*quả\s*dự\s*kiến/);
  // Dấu hiệu ô/đáp án để trống: nhiều "| |" liên tiếp hoặc cụm "…" ở cột sản phẩm.
  const emptyProductCol = has(t, /\|\s*\|\s*\|\s*\n/) && !has(t, /đáp\s*án|lời\s*giải|sản\s*phẩm\s*dự\s*kiến/);
  const ok = mentions && !emptyProductCol;
  return {
    id: 'expected-products',
    title: 'Có sản phẩm/đáp án dự kiến cho các hoạt động',
    status: ok ? 'pass' : 'fail',
    severity: 'high',
    evidence: mentions
      ? (emptyProductCol ? 'Có nhắc "sản phẩm" nhưng nhiều ô nội dung để trống.' : 'Có cột/đoạn sản phẩm, đáp án, lời giải dự kiến.')
      : 'Không thấy đáp án/sản phẩm dự kiến; các hoạt động có nguy cơ để trống cột nội dung.',
    suggestion: 'Điền đầy đủ đáp án/lời giải/kết quả dự kiến cho mọi hoạt động (đặc biệt cột "Nội dung ghi bảng / Sản phẩm dự kiến"). Không để ô trống.',
    scope: 'all',
  };
};

const checkHomework = (t: string): StandardsFinding => {
  const heading = t.match(/(btvn|bài\s*tập\s*về\s*nhà|hướng\s*dẫn\s*về\s*nhà|giao\s*nhiệm\s*vụ\s*về\s*nhà)([\s\S]{0,400})/);
  if (!heading) {
    return {
      id: 'homework-present',
      title: 'Bài tập về nhà (BTVN) có nhiệm vụ cụ thể',
      status: 'warn',
      severity: 'medium',
      evidence: 'Không tìm thấy mục BTVN.',
      suggestion: 'Thêm mục BTVN với nhiệm vụ cụ thể (bài tập/đề bài), gắn mức độ phân hóa nếu có.',
      scope: 'all',
    };
  }
  const after = heading[2];
  // BTVN "trống": sau heading không có bài/câu/đề nào, chỉ toàn khoảng trắng/gạch đầu dòng rỗng.
  const hasTask = has(after, /bài\s*\d|câu\s*\d|\d\s*[).]|đề\s*bài|làm\s*bài|hoàn\s*thành|giải|trang\s*\d/);
  return {
    id: 'homework-present',
    title: 'Bài tập về nhà (BTVN) có nhiệm vụ cụ thể',
    status: hasTask ? 'pass' : 'fail',
    severity: 'medium',
    evidence: hasTask ? 'Mục BTVN có nhiệm vụ cụ thể.' : 'Có tiêu đề BTVN nhưng không có nhiệm vụ đi kèm (đang để trống).',
    suggestion: 'Điền nhiệm vụ BTVN cụ thể (số bài, trang, hoặc đề bài); không để mục BTVN trống.',
    scope: 'all',
  };
};

// Câu hướng dẫn dành cho NGƯỜI SOẠN bị bỏ sót trong giáo án chính thức.
const INTERNAL_INSTRUCTION_RE = /(^|\n)\s*[-*•]?\s*(liệt\s*kê|mô\s*tả|nêu\s*rõ|tạo\s*cơ\s*hội|điền\s*vào|ghi\s*rõ|\[[^\]]*\.\.\.[^\]]*\]|\.\.\.\s*$)/i;

const checkNoInternalInstructions = (t: string): StandardsFinding => {
  const found = t.match(/(liệt\s*kê\s*\.{2,}|mô\s*tả\s*\.{2,}|tạo\s*cơ\s*hội\s*\.{2,}|điền\s*(nội\s*dung|vào\s*đây)|\[\s*(điền|ghi|nội\s*dung)[^\]]*\]|<[^>]*placeholder[^>]*>)/i);
  const generic = INTERNAL_INSTRUCTION_RE.test(t);
  const hit = found || generic;
  return {
    id: 'no-internal-instructions',
    title: 'Không sót câu hướng dẫn nội bộ / placeholder cho người soạn',
    status: hit ? 'fail' : 'pass',
    severity: 'medium',
    evidence: found ? `Phát hiện văn bản hướng dẫn nội bộ: "${found[0].trim().slice(0, 60)}".` : hit ? 'Có dấu hiệu placeholder/hướng dẫn nội bộ (Liệt kê…, Mô tả…, […]).' : 'Không thấy placeholder/hướng dẫn nội bộ còn sót.',
    suggestion: 'Xóa/thay mọi câu hướng dẫn dành cho người soạn ("Liệt kê…", "Mô tả…", "Tạo cơ hội…", "[điền…]") bằng nội dung thực tế.',
    scope: 'all',
  };
};

const checkTimeCoverage = (t: string): StandardsFinding => {
  const realClock = has(t, /\d{1,2}\s*[:hg]\s*\d{2}/); // 10:49, 8h05, 9g30
  const durations = has(t, /\(\s*~?\s*\d+\s*phút\s*\)|\d+\s*phút/);
  const ok = realClock || durations;
  return {
    id: 'time-coverage',
    title: 'Có mốc thời gian / thời lượng khép kín cho các hoạt động',
    status: realClock ? 'pass' : durations ? 'warn' : 'fail',
    severity: 'low',
    evidence: realClock
      ? 'Có mốc thời gian thực (giờ:phút).'
      : durations ? 'Có thời lượng (phút) nhưng chưa ghi mốc giờ thực.' : 'Không thấy mốc thời gian/thời lượng.',
    suggestion: 'Ghi cột mốc thời gian theo giờ thực (VD 10:49–11:00) để kiểm soát thời lượng khép kín cả tiết.',
    scope: 'all',
  };
};

// ── Tiêu chí bổ sung từ skill lesson-plan-generator (chuẩn form giáo án/slide) ──
// Đây là các tiêu chí về KHUNG SƯ PHẠM (mục tiêu + tiêu chí thành công, thoại giáo viên,
// phiếu học tập) — bổ trợ cho bộ chuẩn Toán TDS. Để severity 'medium' và detector nhận cả
// biến thể tiếng Việt để giáo án tốt (đã nêu mục tiêu/thoại/phiếu) vẫn PASS.

const checkLearningIntentionSuccessCriteria = (t: string): StandardsFinding => {
  // WALT/WILF, hoặc tương đương tiếng Việt: mục tiêu + tiêu chí thành công/dấu hiệu hoàn thành.
  const hasWaltWilf = has(t, /\bwalt\b|\bwilf\b/);
  const hasIntention = has(t, /mục\s*tiêu|yêu\s*cầu\s*cần\s*đạt|em\s*sẽ\s*(học|làm)|chúng\s*ta\s*sẽ\s*học/);
  const hasCriteria =
    has(t, /tiêu\s*chí\s*(thành\s*công|đánh\s*giá|hoàn\s*thành)|dấu\s*hiệu\s*hoàn\s*thành|em\s*làm\s*được\s*khi|sản\s*phẩm\s*cần\s*đạt/) ||
    has(t, /must\s*do|should\s*do|could\s*do/) ||
    has(t, /🌶/);
  const ok = hasWaltWilf || (hasIntention && hasCriteria);
  return {
    id: 'success-criteria',
    title: 'Mục tiêu học tập nêu rõ tiêu chí thành công (WALT/WILF)',
    status: ok ? 'pass' : hasIntention ? 'warn' : 'fail',
    severity: 'medium',
    evidence: hasWaltWilf
      ? 'Có khung WALT/WILF.'
      : hasIntention && hasCriteria
        ? 'Có mục tiêu kèm tiêu chí thành công/mức độ (Must–Should–Could, 🌶, "em làm được khi…").'
        : hasIntention
          ? 'Có mục tiêu nhưng chưa nêu tiêu chí thành công/dấu hiệu hoàn thành.'
          : 'Chưa thấy mục tiêu học tập kèm tiêu chí thành công.',
    suggestion: 'Nêu mục tiêu theo khung WALT (điều học hôm nay) / WILF (tiêu chí thành công), hoặc "Em sẽ học được…" + "Em làm được khi…" (dấu hiệu hoàn thành đo được).',
    scope: 'all',
  };
};

const checkTeacherScript = (t: string): StandardsFinding => {
  // Cột hoạt động phải có thoại/câu hỏi giáo viên cụ thể, không chỉ mô tả chung chung.
  const hasScript = has(t, /gv\s*(hỏi|nói|nêu|dẫn\s*dắt|đặt\s*câu\s*hỏi|chốt)|giáo\s*viên\s*(hỏi|nói|nêu|dẫn\s*dắt|đặt\s*câu\s*hỏi)|gv\s*:/);
  const vagueOnly = has(t, /gv\s*(hướng\s*dẫn|hỗ\s*trợ|tổ\s*chức)/) && !hasScript;
  return {
    id: 'teacher-script',
    title: 'Cột hoạt động có thoại/câu hỏi giáo viên cụ thể (Teacher script)',
    status: hasScript ? 'pass' : 'fail',
    severity: 'medium',
    evidence: hasScript
      ? 'Có thoại/câu hỏi giáo viên cụ thể (GV hỏi/nói/dẫn dắt…).'
      : vagueOnly
        ? 'Chỉ mô tả chung chung ("GV hướng dẫn/hỗ trợ"), thiếu lời thoại thực tế.'
        : 'Chưa thấy thoại/câu hỏi giáo viên trong cột hoạt động.',
    suggestion: 'Ghi rõ câu chữ giáo viên sẽ nói và các câu hỏi đặt ra cho học sinh (VD: GV hỏi: "…?"), thay vì mô tả chung chung "GV hướng dẫn".',
    scope: 'all',
  };
};

const checkWorksheetAppendix = (t: string): StandardsFinding => {
  const ok = has(t, /phiếu\s*(học\s*tập|bài\s*tập|giao\s*việc|luyện\s*tập)|phụ\s*lục|worksheet|experience\s*passport/);
  return {
    id: 'worksheet-appendix',
    title: 'Có Phiếu học tập ở Phụ lục',
    status: ok ? 'pass' : 'fail',
    severity: 'medium',
    evidence: ok
      ? 'Có Phiếu học tập / mục Phụ lục.'
      : 'Chưa thấy Phiếu học tập hoặc mục Phụ lục.',
    suggestion: 'Thiết kế sẵn một Phiếu học tập bám sát bài học và đặt ở phần Phụ lục (cuối giáo án), gồm hoạt động thiết thực để học sinh làm.',
    scope: 'all',
  };
};

const checkMathCompetencies = (t: string): StandardsFinding => {
  const comps = [
    has(t, /tư\s*duy.*lập\s*luận|lập\s*luận\s*toán/) && 'tư duy–lập luận',
    has(t, /mô\s*hình\s*hóa|mô\s*hình\s*hoá/) && 'mô hình hóa',
    has(t, /giải\s*quyết\s*vấn\s*đề/) && 'giải quyết vấn đề',
    has(t, /giao\s*tiếp\s*toán/) && 'giao tiếp',
    has(t, /công\s*cụ|máy\s*tính|geogebra|desmos|thước|compa/) && 'sử dụng công cụ',
  ].filter(Boolean) as string[];
  return {
    id: 'math-competencies',
    title: 'Thể hiện các năng lực Toán cốt lõi',
    status: comps.length >= 3 ? 'pass' : comps.length >= 1 ? 'warn' : 'fail',
    severity: 'low',
    evidence: comps.length ? `Có: ${comps.join(', ')}.` : 'Chưa nêu năng lực Toán cốt lõi nào.',
    suggestion: 'Chỉ rõ hoạt động nào rèn năng lực nào trong 5 năng lực: tư duy–lập luận, mô hình hóa, giải quyết vấn đề, giao tiếp, sử dụng công cụ.',
    scope: 'all',
  };
};

// ── Bộ kiểm mục C — chỉ áp dụng cho TIẾT LUYỆN TẬP ────────────────────────────

const POLYA_STEPS: [RegExp, string][] = [
  [/hiểu\s*(bài\s*toán|đề)|tìm\s*hiểu\s*(bài|đề)|phân\s*tích\s*đề/, 'Hiểu bài toán'],
  [/tìm\s*(hướng|cách)\s*giải|xây\s*dựng\s*chương\s*trình\s*giải|lập\s*kế\s*hoạch\s*giải/, 'Tìm hướng giải'],
  [/trình\s*bày\s*(lời\s*giải|bài\s*giải)|thực\s*hiện\s*(lời\s*giải|chương\s*trình)/, 'Trình bày lời giải'],
  [/nhìn\s*lại|kiểm\s*tra\s*(và\s*)?(nghiên\s*cứu|lại)|khai\s*thác\s*bài\s*toán|mở\s*rộng\s*bài\s*toán/, 'Nhìn lại bài toán'],
];

const checkPolyaFourSteps = (t: string): StandardsFinding => {
  const found = POLYA_STEPS.filter(([re]) => re.test(t)).map(([, label]) => label);
  const missing = POLYA_STEPS.map(([, l]) => l).filter((l) => !found.includes(l));
  return {
    id: 'polya-4-steps',
    title: '[Luyện tập] Đủ 4 bước Polya cho bài chữa chung',
    status: missing.length === 0 ? 'pass' : found.length >= 2 ? 'warn' : 'fail',
    severity: 'high',
    evidence: missing.length === 0 ? 'Có đủ 4 bước Polya.' : `Thiếu bước: ${missing.join(', ')}.`,
    suggestion: 'Triển khai đủ 4 bước Polya (Hiểu bài toán → Tìm hướng giải → Trình bày lời giải → Nhìn lại bài toán) cho ít nhất bài chữa chung; nhấn mạnh bước 2 và bước 4.',
    scope: 'practice',
  };
};

const checkDualHintRoutes = (t: string): StandardsFinding => {
  const dual =
    (has(t, /lộ\s*trình\s*chuẩn/) && has(t, /lộ\s*trình\s*hỗ\s*trợ|lộ\s*trình\s*dắt\s*tay/)) ||
    (has(t, /gợi\s*ý/) && has(t, /nhóm\s*khá|nhóm\s*giỏi/) && has(t, /nhóm\s*yếu|cần\s*hỗ\s*trợ|dắt\s*tay/)) ||
    (has(t, /thẻ\s*dắt\s*tay/) && has(t, /thẻ\s*thử\s*thách/));
  return {
    id: 'dual-hint-routes',
    title: '[Luyện tập] Bước "Tìm hướng giải" có 2 bộ câu hỏi gợi ý',
    status: dual ? 'pass' : 'fail',
    severity: 'high',
    evidence: dual ? 'Có 2 lộ trình gợi ý (chuẩn + hỗ trợ).' : 'Chỉ có một bộ gợi ý hoặc không tách lộ trình chuẩn/hỗ trợ.',
    suggestion: 'Ở bước "Tìm hướng giải" cung cấp 2 bộ câu hỏi gợi ý: lộ trình chuẩn (nhóm khá–giỏi) và lộ trình hỗ trợ/dắt tay (nhóm yếu).',
    scope: 'practice',
  };
};

const checkMethodMastery = (t: string): StandardsFinding => {
  const ok = has(t, /vì\s*sao\s*(chọn|dùng)|khi\s*nào\s*(dùng|áp\s*dụng|chọn)|lý\s*do\s*chọn\s*phương\s*pháp|dấu\s*hiệu\s*nhận\s*biết/);
  return {
    id: 'method-mastery',
    title: '[Luyện tập] Học sinh hiểu vì sao & khi nào chọn phương pháp',
    status: ok ? 'pass' : 'fail',
    severity: 'medium',
    evidence: ok ? 'Có nội dung "vì sao/khi nào" chọn phương pháp.' : 'Chưa làm rõ vì sao/khi nào dùng phương pháp giải.',
    suggestion: 'Thêm câu hỏi/nội dung giúp HS nêu được vì sao chọn và khi nào dùng phương pháp cho dạng bài đang luyện.',
    scope: 'practice',
  };
};

const checkConcreteDifferentiation = (t: string): StandardsFinding => {
  const concrete = has(t, /thẻ\s*gợi\s*ý|hint\s*card|phiếu.*giàn\s*giáo|tiered\s*worksheet|khay\s*(xanh|vàng|đỏ|hồng)|trạm\s*giáo\s*viên|teacher\s*station|phao\s*cứu\s*sinh/);
  const vagueOnly = has(t, /gv\s*hỗ\s*trợ|giáo\s*viên\s*hỗ\s*trợ/) && !concrete;
  return {
    id: 'concrete-differentiation',
    title: '[Luyện tập] Phân hóa cụ thể (phiếu/thẻ/nhóm), không chung chung',
    status: concrete ? 'pass' : 'fail',
    severity: 'medium',
    evidence: concrete
      ? 'Có công cụ phân hóa cụ thể (thẻ gợi ý, phiếu giàn giáo, khay màu, trạm GV).'
      : vagueOnly ? 'Chỉ ghi "GV hỗ trợ" chung chung.' : 'Chưa nêu chiến lược phân hóa cụ thể.',
    suggestion: 'Nêu rõ phân hóa áp dụng ở đâu, với nhóm nào, dùng phiếu/thẻ gợi ý gì; tránh ghi chung chung "GV hỗ trợ".',
    scope: 'practice',
  };
};

// ── Bộ kiểm bổ sung 2026-07: rút từ đợt rà 3 giáo án định hướng Bài 19 ────────
// Mỗi luật dưới đây tương ứng một lỗi THẬT đã lọt qua cổng cũ và phải sửa tay:
//  1. time-continuity      — Tiết 2 hụt 3 phút (P35–P38 không hoạt động nào nhận)
//  2. board-content-filled — ô "Nội dung ghi bảng" của Khởi động bỏ trống
//  3. term-introduced      — Tiết 1 dùng VTCP / PT đoạn chắn / UNCLOS chưa hề giới thiệu
//  4. no-duplicate-block   — Tiết 1 lặp nguyên một khối nháp trong cùng một ô
// Cổng cũ chỉ dò từ khóa nên không bắt được nhóm lỗi này.

/** Mốc "p7 – p35" (text đã lowercase). */
const P_RANGE_RE = /p(\d+)\s*[–—-]\s*p(\d+)/g;
/** Heading kiểu "(18 phút, p7–p25)". */
const HEADING_TIME_RE = /\(\s*~?\s*(\d+)\s*phút\s*,\s*p(\d+)\s*[–—-]\s*p(\d+)\s*\)/g;

const LESSON_MINUTES = 40;

const checkTimeContinuity = (t: string): StandardsFinding => {
  const ranges: Array<[number, number]> = [];
  for (const m of t.matchAll(P_RANGE_RE)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && b > a) ranges.push([a, b]);
  }
  // Bỏ trùng, sắp theo mốc bắt đầu.
  const uniq = Array.from(new Map(ranges.map((r) => [`${r[0]}-${r[1]}`, r])).values()).sort(
    (x, y) => x[0] - y[0],
  );

  const problems: string[] = [];

  // (a) Thời lượng ghi ở heading phải khớp hiệu hai mốc.
  for (const m of t.matchAll(HEADING_TIME_RE)) {
    const stated = Number(m[1]);
    const span = Number(m[3]) - Number(m[2]);
    if (stated !== span) {
      problems.push(`"(${stated} phút, P${m[2]}–P${m[3]})" — mốc chỉ dài ${span} phút`);
    }
  }

  // (b) Các mốc phải nối liền nhau, không hở, không chồng.
  for (let i = 0; i < uniq.length - 1; i += 1) {
    const end = uniq[i][1];
    const nextStart = uniq[i + 1][0];
    if (nextStart > end) problems.push(`hở ${nextStart - end} phút giữa P${end} và P${nextStart}`);
    else if (nextStart < end) problems.push(`chồng lấn giữa P${uniq[i][0]}–P${end} và P${nextStart}–P${uniq[i + 1][1]}`);
  }

  // (c) Phải phủ kín cả tiết 40 phút.
  if (uniq.length > 0) {
    const first = uniq[0][0];
    const last = uniq[uniq.length - 1][1];
    if (first > 0) problems.push(`chưa có hoạt động nào cho ${first} phút đầu (bắt đầu từ P${first})`);
    if (last !== LESSON_MINUTES) problems.push(`mốc cuối là P${last}, chưa phủ kín P${LESSON_MINUTES}`);
  }

  const noRanges = uniq.length === 0;
  return {
    id: 'time-continuity',
    title: 'Mốc thời gian liền mạch, khớp thời lượng và phủ kín 40 phút',
    status: noRanges || problems.length > 0 ? 'fail' : 'pass',
    severity: 'high',
    evidence: noRanges
      ? 'Không tìm thấy mốc phút dạng "P0 – P5" ở cột Thời gian.'
      : problems.length > 0
        ? `Lệch thời gian: ${problems.slice(0, 4).join('; ')}.`
        : `Các mốc nối liền P${uniq[0][0]}→P${uniq[uniq.length - 1][1]}, khớp thời lượng.`,
    suggestion:
      'Ghi cột Thời gian dạng "P0 – P5" và heading dạng "(5 phút, P0–P5)". Mốc kết thúc của hoạt động trước phải TRÙNG mốc bắt đầu của hoạt động sau; hoạt động đầu bắt đầu từ P0 và hoạt động cuối kết thúc đúng P40 (đừng để hở phút nào).',
    scope: 'all',
  };
};

/** Tách các bảng hoạt động 3 cột trong markdown, trả về các hàng dữ liệu. */
const activityTableRows = (t: string): string[][] => {
  const lines = t.split('\n');
  const rows: string[][] = [];
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) {
      inTable = false;
      continue;
    }
    const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.length !== 3) {
      inTable = false;
      continue;
    }
    const isHeader = /thời\s*gian/.test(cells[0]) && /nội\s*dung/.test(cells[2]);
    if (isHeader) {
      inTable = true;
      continue;
    }
    const isSeparator = cells.every((c) => /^:?-{2,}:?$/.test(c));
    if (isSeparator) continue;
    if (inTable) rows.push(cells);
  }
  return rows;
};

const checkBoardContentFilled = (t: string): StandardsFinding => {
  const rows = activityTableRows(t);
  const empty = rows.filter((r) => r[2].length === 0);
  const thin = rows.filter((r) => r[2].length > 0 && r[2].length < 15);
  const ok = rows.length > 0 && empty.length === 0;
  return {
    id: 'board-content-filled',
    title: 'Mọi hoạt động đều có "Nội dung ghi bảng" (không bỏ trống)',
    status: rows.length === 0 ? 'warn' : ok ? 'pass' : 'fail',
    severity: 'high',
    evidence:
      rows.length === 0
        ? 'Chưa thấy bảng hoạt động 3 cột để kiểm tra.'
        : empty.length > 0
          ? `${empty.length}/${rows.length} hàng có cột "Nội dung ghi bảng" TRỐNG (mốc: ${empty.map((r) => r[0] || '?').slice(0, 3).join(', ')}).`
          : thin.length > 0
            ? `Đủ nội dung, nhưng ${thin.length} hàng ghi bảng rất ngắn — nên kiểm lại.`
            : `Cả ${rows.length} hàng đều có nội dung ghi bảng.`,
    suggestion:
      'Mỗi hàng của bảng hoạt động PHẢI có cột "Nội dung ghi bảng" — ghi đúng thứ hiện trên bảng cho HS chép: công thức chốt, ĐÁP ÁN ra kết quả cuối của từng nhiệm vụ, và dòng "⚠ Lỗi phổ biến:" nếu có bẫy. Không để trống, không chỉ chép lại lời thoại.',
    scope: 'all',
  };
};

/**
 * Thuật ngữ thuộc bài/tiết SAU — nếu đã dùng thì trong giáo án phải có chỗ giới thiệu.
 * Bắt đúng lỗi: tiết VTPT lại dùng "vectơ chỉ phương"; tiết 1 dùng "PT đoạn chắn"; dùng
 * "UNCLOS" như thuật ngữ quen thuộc mà không giải thích.
 */
const ADVANCED_TERMS: Array<{ label: string; re: RegExp }> = [
  { label: 'vectơ chỉ phương', re: /vect(?:ơ|o)\s*chỉ\s*phương|\bvtcp\b|\bvcp\b/ },
  { label: 'phương trình đoạn chắn', re: /(?:phương\s*trình|pt)\s*đoạn\s*chắn|đoạn\s*chắn/ },
  { label: 'phương trình tham số', re: /(?:phương\s*trình|pt)\s*tham\s*số/ },
  { label: 'UNCLOS', re: /unclos/ },
];

const checkTermIntroduced = (t: string): StandardsFinding => {
  const used = ADVANCED_TERMS.filter((term) => term.re.test(t));
  const notIntroduced = used.filter((term) => {
    const src = term.re.source;
    // Có giới thiệu nếu thuật ngữ đứng cạnh dấu hiệu định nghĩa/giới thiệu.
    const intro = new RegExp(
      `(?:thuật\\s*ngữ|giới\\s*thiệu|định\\s*nghĩa|gọi\\s*là|nghĩa\\s*là|tức\\s*là|nhắc\\s*lại)[^\\n]{0,160}(?:${src})` +
        `|(?:${src})[^\\n]{0,160}(?:\\blà\\b|gọi\\s*là|nghĩa\\s*là|tức\\s*là|:\\s)`,
    );
    return !intro.test(t);
  });
  const ok = notIntroduced.length === 0;
  return {
    id: 'term-introduced',
    title: 'Thuật ngữ nâng cao phải được giới thiệu trước khi dùng',
    status: ok ? 'pass' : 'fail',
    severity: 'medium',
    evidence: ok
      ? used.length > 0
        ? `Các thuật ngữ nâng cao (${used.map((u) => u.label).join(', ')}) đều có phần giới thiệu.`
        : 'Không dùng thuật ngữ vượt phạm vi tiết.'
      : `Dùng nhưng chưa giới thiệu: ${notIntroduced.map((u) => u.label).join(', ')}.`,
    suggestion:
      'Hoặc BỎ thuật ngữ vượt phạm vi tiết (ưu tiên — đổi hẳn sang bài toán chỉ dùng công cụ đã học), hoặc giới thiệu tường minh ngay trước khi dùng (một câu định nghĩa ngắn + ghi vào mục Thuật ngữ). TUYỆT ĐỐI không dùng như thể HS đã biết.',
    scope: 'all',
  };
};

const checkNoDuplicateBlock = (t: string): StandardsFinding => {
  // Tìm khối văn bản dài lặp lại NGUYÊN VĂN (dấu vết copy-paste / bản nháp còn sót).
  // Quét từng vị trí (bước 1) và lưu hash để không bỏ sót khi khoảng cách lặp lệch pha —
  // bản đầu lấy mẫu theo bước 20 nên chỉ bắt được lặp cách nhau bội số của 20.
  // Ngưỡng 160 ký tự: dài hơn hẳn các câu lặp hợp lệ (câu hỏi cốt lõi ~100, dòng kỹ thuật
  // chờ ~80) nên gần như chỉ nổ khi thật sự bị nhân đôi khối.
  const CHUNK = 160;
  const compact = t.replace(/\s+/g, ' ');
  const seen = new Map<number, number>();
  let duplicate = '';
  let hash = 0;
  for (let i = 0; i + CHUNK <= compact.length; i += 1) {
    // Hash djb2 tính lại theo cửa sổ (đủ nhanh với độ dài một giáo án).
    hash = 5381;
    for (let k = i; k < i + CHUNK; k += 1) hash = ((hash * 33) ^ compact.charCodeAt(k)) | 0;
    const prev = seen.get(hash);
    if (prev !== undefined && i - prev >= CHUNK) {
      // Xác thực lại để loại trừ trùng hash.
      if (compact.slice(prev, prev + CHUNK) === compact.slice(i, i + CHUNK)) {
        duplicate = compact.slice(i, i + CHUNK);
        break;
      }
    }
    if (prev === undefined) seen.set(hash, i);
  }
  return {
    id: 'no-duplicate-block',
    title: 'Không có khối nội dung bị lặp nguyên văn',
    status: duplicate ? 'fail' : 'pass',
    severity: 'medium',
    evidence: duplicate
      ? `Phát hiện đoạn lặp lại nguyên văn: "${duplicate.slice(0, 70).trim()}…".`
      : 'Không thấy khối nội dung nào bị lặp.',
    suggestion:
      'Xóa bản lặp, chỉ giữ MỘT bản hoàn chỉnh (thường là bản có công thức/định dạng đầy đủ). Lỗi này hay xảy ra khi bản nháp và bản hoàn chỉnh cùng nằm trong một ô.',
    scope: 'all',
  };
};

/**
 * Tiết cho HS TỰ CHỌN mức độ/lộ trình thì BẮT BUỘC có kịch bản khi HS chọn sai.
 * Nguồn: giáo án Tiết 2 do GV bộ môn soạn tay có đủ 3 kịch bản (hạ cánh mềm / nâng cấp tại
 * chỗ / để trải nghiệm bế tắc) — bản AI sinh thì không, vì prompt cũ chỉ bắt "dự kiến khó
 * khăn" về TOÁN, bỏ trống khó khăn về VẬN HÀNH. Cho tự chọn mà không dự phòng là thiết kế
 * dở: trên lớp chắc chắn có em chọn nhầm.
 */
const checkSelfSelectionFallback = (t: string): StandardsFinding => {
  // CHỈ bắt khi HS tự chọn về ĐỘ KHÓ/NHIỆM VỤ. Cố ý KHÔNG bắt "tự chọn" chung chung, vì
  // trục Sản phẩm của Tomlinson cho HS "chọn cách thể hiện (bảng con / A3 / trình bày miệng)"
  // — chuyện đó hoàn toàn hợp lệ và không cần kịch bản "chọn quá sức".
  const hasSelfSelection = has(
    t,
    /lộ\s*trình\s*[12]|thẻ\s*(?:thử\s*thách|dự\s*án|gợi\s*ý)|tic.?tac.?toe|tự\s*(?:chọn|rút)\s*(?:1\s*)?(?:mức|độ\s*khó|thử\s*thách|nhiệm\s*vụ|bài|lộ\s*trình|thẻ)|chọn\s*mức\s*(?:bài|độ)/,
  );
  if (!hasSelfSelection) {
    return {
      id: 'self-selection-fallback',
      title: 'Có kịch bản xử lý khi HS chọn sai mức độ',
      status: 'pass',
      severity: 'medium',
      evidence: 'Tiết này không có cơ chế HS tự chọn mức độ — không cần kịch bản dự phòng.',
      suggestion: '',
      scope: 'all',
    };
  }
  const tooHard = has(t, /quá\s*sức|hạ\s*cánh\s*mềm|bế\s*tắc|không\s*viết\s*được|cắn\s*bút|chọn\s*nhầm.*khó/);
  const tooEasy = has(t, /dưới\s*sức|nâng\s*cấp|xong\s*(?:sớm|quá\s*nhanh)|né\s*tránh|thăng\s*cấp|vượt\s*rào/);
  const missing = [!tooHard && 'chọn QUÁ SỨC', !tooEasy && 'chọn DƯỚI SỨC'].filter(Boolean) as string[];
  return {
    id: 'self-selection-fallback',
    title: 'Có kịch bản xử lý khi HS chọn sai mức độ',
    status: missing.length === 0 ? 'pass' : 'fail',
    severity: 'medium',
    evidence:
      missing.length === 0
        ? 'Có kịch bản cho cả hai chiều chọn sai (quá sức và dưới sức).'
        : `Tiết có cơ chế HS tự chọn nhưng thiếu kịch bản cho trường hợp: ${missing.join(' và ')}.`,
    suggestion:
      'Thêm vào cột "Giáo viên và Học sinh" hai tình huống: (1) HS chọn QUÁ SỨC — dấu hiệu nhận ' +
      'biết + cách chuyển việc mà KHÔNG thu lại phiếu (giữ thể diện); (2) HS giỏi chọn DƯỚI SỨC — ' +
      'tung câu hỏi mở rộng tại chỗ trước, HS trả lời được rồi mới mời nhận nhiệm vụ khó hơn.',
    scope: 'all',
  };
};

/**
 * Mảnh ghép (jigsaw) và trạm quay vòng (gallery walk) là HAI cách vận hành lớp khác hẳn nhau,
 * không chạy đồng thời được. Lỗi thật ở Tiết 3: cùng một tiết vừa mô tả "3 nhóm chuyên gia ghép
 * lại làm dự án" vừa mô tả "HS luân phiên đi qua 3 trạm", phiếu ghi chép thì theo kiểu trạm.
 * Prompt đã cấm ở mục "Năm lỗi hay mắc nhất" nhưng cần chặn được bằng máy.
 *
 * Lưu ý: "Trạm Giáo viên" (bàn hỗ trợ của GV) là thuật ngữ hợp lệ, KHÔNG tính là trạm quay vòng.
 */
const checkGroupModelCoherence = (t: string): StandardsFinding => {
  const jigsaw = has(t, /mảnh\s*ghép|jigsaw|nhóm\s*chuyên\s*gia/);
  const stationRotation = has(
    t,
    /trạm\s*[abc](?![\wà-ỹ])|(?:luân\s*phiên|di\s*chuyển|đi)\s+(?:qua|đến|tới)[^.\n]{0,15}trạm|quay\s*vòng[^.\n]{0,15}trạm/,
  );
  const conflict = jigsaw && stationRotation;
  return {
    id: 'group-model-coherence',
    title: 'Mô hình tổ chức lớp nhất quán (không trộn mảnh ghép với trạm quay vòng)',
    status: conflict ? 'fail' : 'pass',
    severity: 'medium',
    evidence: conflict
      ? 'Tiết mô tả CẢ mảnh ghép/nhóm chuyên gia LẪN việc HS luân phiên đi qua các trạm — hai cách vận hành lớp khác nhau, không chạy đồng thời được.'
      : jigsaw
        ? 'Dùng mô hình mảnh ghép, nhất quán.'
        : stationRotation
          ? 'Dùng mô hình trạm quay vòng, nhất quán.'
          : 'Không phát hiện mâu thuẫn mô hình tổ chức lớp.',
    suggestion:
      'Chọn MỘT mô hình và giữ nhất quán từ mục Tài liệu → kịch bản → phiếu học tập. ' +
      'Nếu dùng mảnh ghép: các nhóm chuyên gia ghép lại thành nhóm hỗn hợp, phiếu ghi chép ghi ' +
      '"nghe từ chuyên gia A/B/C trong nhóm" — KHÔNG cho HS luân phiên đi qua trạm. ' +
      'Nếu dùng trạm quay vòng: mỗi nhóm đứng tại một trạm làm chủ nhà, HS khác đi qua nghe.',
    scope: 'all',
  };
};

const GENERAL_CHECKS = [
  checkFourPhases,
  checkDifferentiatedObjectives,
  checkGuidingQuestions,
  checkPracticeMinThree,
  checkExpectedProducts,
  checkHomework,
  checkNoInternalInstructions,
  checkTimeCoverage,
  checkMathCompetencies,
  checkLearningIntentionSuccessCriteria,
  checkTeacherScript,
  checkWorksheetAppendix,
  checkTimeContinuity,
  checkBoardContentFilled,
  checkTermIntroduced,
  checkNoDuplicateBlock,
  checkSelfSelectionFallback,
  checkGroupModelCoherence,
];

const PRACTICE_CHECKS = [
  checkPolyaFourSteps,
  checkDualHintRoutes,
  checkMethodMastery,
  checkConcreteDifferentiation,
];

export interface StandardsAuditResult {
  lessonType: LessonType;
  findings: StandardsFinding[];
  /** Số tiêu chí quan trọng (severity high) đang FAIL. */
  criticalFailures: number;
}

/**
 * Chấm giáo án theo bộ chuẩn Toán. Với tiết luyện tập (tự nhận diện hoặc ép qua
 * `forceType`), bật thêm bộ kiểm mục C (Polya, 2 lộ trình gợi ý, ...).
 */
export const auditMathStandards = (content: string, forceType?: LessonType): StandardsAuditResult => {
  const t = norm(content || '');
  const lessonType = forceType ?? detectLessonType(content || '');
  const findings = GENERAL_CHECKS.map((fn) => fn(t));
  if (lessonType === 'practice') {
    findings.push(...PRACTICE_CHECKS.map((fn) => fn(t)));
  }
  const criticalFailures = findings.filter((f) => f.severity === 'high' && f.status === 'fail').length;
  return { lessonType, findings, criticalFailures };
};

const STATUS_ICON: Record<FindingStatus, string> = { pass: '✅', warn: '🟡', fail: '❌' };
const LESSON_TYPE_LABEL: Record<LessonType, string> = {
  practice: 'Tiết luyện tập / hình thành kĩ năng',
  knowledge: 'Tiết hình thành kiến thức',
  flipped: 'Lớp học đảo ngược',
  unknown: 'Chưa xác định loại tiết',
};

/**
 * Xuất báo cáo rà soát dạng Markdown (đạt/chưa đạt + bằng chứng + hướng sửa). Dùng cho panel
 * trên tab Nâng cấp và cho phần "NỘI DUNG ĐÃ BỔ SUNG" chèn vào file .docx gốc.
 */
export const formatStandardsReport = (result: StandardsAuditResult): string => {
  const passed = result.findings.filter((f) => f.status === 'pass').length;
  const total = result.findings.length;
  const lines: string[] = [];
  lines.push(`## Rà soát theo chuẩn Toán — ${LESSON_TYPE_LABEL[result.lessonType]}`);
  lines.push(`**Đạt ${passed}/${total} tiêu chí.** ${result.criticalFailures > 0 ? `Còn ${result.criticalFailures} tiêu chí quan trọng chưa đạt.` : 'Không còn tiêu chí quan trọng nào chưa đạt.'}`);
  lines.push('');
  for (const f of result.findings) {
    lines.push(`- ${STATUS_ICON[f.status]} **${f.title}** — ${f.evidence}`);
    if (f.status !== 'pass') lines.push(`  - Hướng sửa: ${f.suggestion}`);
  }
  return lines.join('\n');
};
