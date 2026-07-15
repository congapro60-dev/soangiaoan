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
