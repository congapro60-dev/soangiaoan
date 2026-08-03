// Bộ kiểm TOÀN TRƯỜNG (deterministic) — áp dụng cho giáo án MỌI MÔN, không riêng Toán.
//
// Nguồn tiêu chí: "Checklist tự kiểm tra giáo án.xlsx" (sheet `Checklist`, 15 đầu việc) và
// rubric Danielson Domain 1 (sheet `Domain 1`) trong thư mục "các yêu cầu về Toán cần đạt".
// Mỗi phép kiểm dưới đây bám vào đúng một dòng của checklist; mã Danielson lấy từ cột F.
//
// Các đầu việc KHÔNG có ở đây vì đã được `mathStandards.ts` phủ (mục tiêu phân hóa, tiến trình,
// sản phẩm hoạt động, thời gian, phiếu học tập) hoặc vì không kiểm được bằng văn bản
// (#1 "Nghiên cứu chương trình" — đọc SGK/PPCT là việc xảy ra trước khi soạn).

import { has, norm } from './standardsTypes';
import type { StandardsFinding } from './standardsTypes';

// ── Nhận diện môn học ─────────────────────────────────────────────────────────

export type SubjectId =
  | 'toan' | 'ngu-van' | 'tieng-anh' | 'vat-li' | 'hoa-hoc' | 'sinh-hoc'
  | 'lich-su' | 'dia-li' | 'gdcd' | 'tin-hoc' | 'cong-nghe';

export const SUBJECT_LABEL: Record<SubjectId, string> = {
  'toan': 'Toán',
  'ngu-van': 'Ngữ văn',
  'tieng-anh': 'Tiếng Anh',
  'vat-li': 'Vật lí',
  'hoa-hoc': 'Hóa học',
  'sinh-hoc': 'Sinh học',
  'lich-su': 'Lịch sử',
  'dia-li': 'Địa lí',
  'gdcd': 'Giáo dục công dân',
  'tin-hoc': 'Tin học',
  'cong-nghe': 'Công nghệ',
};

/** Tên môn khi giáo án tự khai báo ("Môn: Ngữ văn", "Môn học – Vật lí"). */
const SUBJECT_DECLARED: [SubjectId, RegExp][] = [
  ['ngu-van', /ngữ\s*văn/],
  ['tieng-anh', /tiếng\s*anh|english/],
  ['vat-li', /vật\s*l(?:í|ý)/],
  ['hoa-hoc', /h(?:óa|oá)\s*học/],
  ['sinh-hoc', /sinh\s*học/],
  ['lich-su', /lịch\s*sử/],
  ['dia-li', /địa\s*l(?:í|ý)/],
  ['gdcd', /giáo\s*dục\s*công\s*dân|gdcd|giáo\s*dục\s*kinh\s*tế/],
  ['tin-hoc', /tin\s*học/],
  ['cong-nghe', /công\s*nghệ/],
  ['toan', /toán/],
];

/** Từ khóa nội dung đặc trưng, dùng khi giáo án không khai báo tên môn. */
const SUBJECT_TOPICS: [SubjectId, RegExp][] = [
  ['ngu-van', /nghị\s*luận|tác\s*phẩm|nhân\s*vật\s*trữ\s*tình|biện\s*pháp\s*tu\s*từ|thể\s*thơ|văn\s*bản\s*(?:tự\s*sự|thông\s*tin)/g],
  ['tieng-anh', /\bvocabulary\b|\bgrammar\b|\bpronunciation\b|\blistening\b|\bspeaking\b/g],
  ['vat-li', /gia\s*tốc|lực\s*(?:ma\s*sát|đàn\s*hồi)|dao\s*động\s*điều\s*h(?:òa|oà)|điện\s*trở|từ\s*trường/g],
  ['hoa-hoc', /phương\s*trình\s*h(?:óa|oá)\s*học|nguyên\s*tử\s*khối|liên\s*kết\s*(?:ion|cộng\s*h(?:óa|oá)\s*trị)|dung\s*dịch\s*(?:axit|bazơ)/g],
  ['sinh-hoc', /tế\s*bào|nhiễm\s*sắc\s*thể|quang\s*hợp|di\s*truyền|hệ\s*sinh\s*thái/g],
  ['lich-su', /triều\s*(?:đại|nguyễn|lê)|khởi\s*nghĩa|hiệp\s*định|chiến\s*dịch|sự\s*kiện\s*lịch\s*sử/g],
  ['dia-li', /khí\s*hậu|địa\s*hình|lược\s*đồ|dân\s*cư|kinh\s*tế\s*vùng/g],
];

/** Dấu hiệu nội dung Toán — dùng để KHÔNG tắt nhầm lớp kiểm Toán. */
const MATH_TOPIC_RE =
  /hàm\s*số|phương\s*trình|bất\s*phương\s*trình|đạo\s*hàm|tích\s*phân|véc\s*tơ|vect(?:o|ơ)|tam\s*giác|hình\s*chóp|xác\s*suất|tổ\s*hợp|cấp\s*số|logarit|đồ\s*thị|toạ\s*độ|tọa\s*độ/;

/**
 * Đoán môn của giáo án. **Cố ý thiên về Toán**: chỉ trả về môn khác khi giáo án tự khai báo
 * tên môn khác, hoặc khi từ khóa của một môn khác xuất hiện dày mà tuyệt nhiên không có dấu
 * hiệu Toán nào. Đoán sai theo chiều này chỉ làm thừa vài tiêu chí; đoán sai chiều ngược lại
 * sẽ làm mất toàn bộ lớp kiểm Toán của một giáo án Toán thật.
 */
export const detectSubject = (content: string): SubjectId => {
  const t = norm(content || '');

  // "Môn: Ngữ văn", "Môn học | Vật lí". Bỏ qua "liên môn", "tích hợp liên môn" — đó là kết nối
  // sang môn khác, không phải môn của giáo án này.
  for (const m of t.matchAll(/m[ôo]n\s*(?:học)?\s*[:\-–|]?\s*([^\n|]{0,30})/g)) {
    const before = t.slice(Math.max(0, (m.index ?? 0) - 8), m.index ?? 0);
    if (/liên\s*$/.test(before)) continue;
    const found = SUBJECT_DECLARED.find(([, re]) => re.test(m[1]));
    if (found) return found[0];
  }

  if (has(t, MATH_TOPIC_RE)) return 'toan';

  for (const [id, re] of SUBJECT_TOPICS) {
    if ((t.match(re) || []).length >= 3) return id;
  }
  return 'toan';
};

// ── Checklist #2 — Nhận diện đối tượng học sinh ───────────────────────────────

const checkStudentProfile = (t: string): StandardsFinding => {
  const hasProfile = has(t, /sĩ\s*số|đặc\s*điểm\s*(?:học\s*sinh|hs|lớp)|đối\s*tượng\s*(?:học\s*sinh|hs)|trình\s*độ\s*(?:học\s*sinh|hs)/);
  const hasGroups = has(t, /nhóm\s*năng\s*lực|\d\s*nhóm\s*(?:học\s*sinh|hs|đối\s*tượng)|(?:học\s*sinh|hs)\s*(?:yếu|khá|giỏi)|must\s*do|🌶/);
  return {
    id: 'student-profile',
    danielson: '1b',
    title: 'Nhận diện đối tượng học sinh (sĩ số, nhóm năng lực, nhu cầu)',
    status: hasProfile && hasGroups ? 'pass' : hasProfile || hasGroups ? 'warn' : 'fail',
    severity: 'medium',
    evidence: hasProfile && hasGroups
      ? 'Có mô tả lớp và phân nhóm năng lực học sinh.'
      : hasProfile
        ? 'Có mô tả lớp nhưng chưa chia nhóm năng lực học sinh.'
        : hasGroups
          ? 'Có nhắc nhóm năng lực nhưng chưa nêu sĩ số/đặc điểm lớp.'
          : 'Chưa thấy thông tin về sĩ số, đặc điểm hay nhóm năng lực của lớp.',
    suggestion: 'Ghi ở phần thông tin chung: sĩ số, số nhóm năng lực và đặc điểm nổi bật của lớp (trình độ, nhu cầu, sở thích) để làm căn cứ cho các quyết định phân hóa phía sau.',
    scope: 'all',
  };
};

// ── Checklist #3 — Điền thông tin về bản kế hoạch ─────────────────────────────

const checkPlanMetadata = (t: string): StandardsFinding => {
  const fields: [string, boolean][] = [
    ['người soạn/GV dạy', has(t, /(?:giáo\s*viên|gv|người)\s*(?:soạn|thực\s*hiện|dạy)\s*[:\-–]|họ\s*(?:và\s*)?tên\s*(?:giáo\s*viên|gv)/)],
    ['ngày/tuần', has(t, /ngày\s*(?:soạn|dạy)|tuần\s*\d|ngày\s*\d{1,2}\s*[\/.-]\s*\d{1,2}/)],
    ['lớp', has(t, /lớp\s*[:\-–]?\s*\d{1,2}/)],
    ['trường', has(t, /trường\s+\S/)],
    ['tiết theo PPCT', has(t, /tiết\s*(?:số\s*)?\d|ppct|phân\s*phối\s*chương\s*trình/)],
  ];
  const missing = fields.filter(([, ok]) => !ok).map(([name]) => name);
  return {
    id: 'plan-metadata',
    title: 'Điền đủ thông tin đầu bản kế hoạch',
    status: missing.length === 0 ? 'pass' : missing.length <= 2 ? 'warn' : 'fail',
    severity: 'low',
    evidence: missing.length === 0
      ? 'Có đủ người soạn, ngày/tuần, lớp, trường, tiết theo PPCT.'
      : `Thiếu: ${missing.join(', ')}.`,
    suggestion: 'Điền đủ phần thông tin chung ở đầu giáo án: trường, lớp, người soạn, ngày/tuần soạn và tiết theo PPCT.',
    scope: 'all',
  };
};

// ── Checklist #5 — Đa dạng hình thức tổ chức ──────────────────────────────────

const checkActivityFormatVariety = (t: string): StandardsFinding => {
  const forms = [
    has(t, /cá\s*nhân/) && 'cá nhân',
    has(t, /cặp\s*đôi|theo\s*cặp|nhóm\s*đôi|think.{0,3}pair.{0,3}share/) && 'cặp đôi',
    has(t, /(?:hoạt\s*động|thảo\s*luận|làm\s*việc|chia)\s*nhóm|nhóm\s*chuyên\s*gia|nhóm\s*[1-6]\b/) && 'nhóm',
    has(t, /cả\s*lớp|toàn\s*lớp|vấn\s*đáp\s*chung/) && 'cả lớp',
  ].filter(Boolean) as string[];
  return {
    id: 'activity-format-variety',
    danielson: '1e',
    title: 'Đa dạng hình thức tổ chức (cá nhân / cặp / nhóm / cả lớp)',
    status: forms.length >= 3 ? 'pass' : forms.length === 2 ? 'warn' : 'fail',
    severity: 'medium',
    evidence: forms.length
      ? `Có ${forms.length} hình thức: ${forms.join(', ')}.`
      : 'Không thấy hình thức tổ chức nào được nêu rõ.',
    suggestion: 'Ghi rõ hình thức tổ chức cho từng hoạt động và dùng ít nhất 3 trong 4 hình thức (cá nhân, cặp đôi, nhóm, cả lớp); chỉ dùng nhóm khi nhiệm vụ thực sự cần hợp tác.',
    scope: 'all',
  };
};

// ── Checklist #5 — Môi trường học tập an toàn ─────────────────────────────────

const checkSafeEnvironment = (t: string): StandardsFinding => {
  const ok = has(
    t,
    /môi\s*trường\s*(?:học\s*tập\s*)?an\s*toàn|tôn\s*trọng\s*(?:ý\s*kiến|lẫn\s*nhau|sự\s*khác)|không\s*(?:chê|cười)\s*(?:bạn|hs|học\s*sinh)|sai\s*(?:cũng\s*)?không\s*sao|chấp\s*nhận\s*(?:lỗi\s*sai|câu\s*trả\s*lời\s*sai|phương\s*án\s*sai)|khuyến\s*khích\s*(?:mọi\s*)?(?:hs|học\s*sinh|em)\s*(?:phát\s*biểu|thử|nêu\s*ý\s*kiến)|giữ\s*thể\s*diện|nội\s*quy\s*(?:nhóm|lớp|làm\s*việc)/,
  );
  return {
    id: 'safe-environment',
    danielson: '1e',
    title: 'Bảo đảm môi trường học tập an toàn về tâm lí',
    status: ok ? 'pass' : 'warn',
    severity: 'low',
    evidence: ok
      ? 'Có nội dung bảo đảm an toàn tâm lí (tôn trọng ý kiến, chấp nhận câu trả lời sai, nội quy nhóm).'
      : 'Chưa thấy nội dung nào bảo đảm học sinh dám nói sai mà không bị chê cười.',
    suggestion: 'Thêm một câu vào kịch bản giáo viên hoặc nội quy nhóm cho thấy học sinh được phép trả lời sai (VD: "Sai là chuyện bình thường, cô cần biết em đang nghĩ gì"), đặc biệt ở hoạt động phát biểu trước lớp.',
    scope: 'all',
  };
};

// ── Checklist #7 — Dạy học phân hóa theo 4 trục Tomlinson ─────────────────────

const DIFF_RE = /phân\s*h(?:óa|oá)/g;
/** Cửa sổ ±240 kí tự quanh mỗi lần nhắc "phân hóa" — tránh ăn nhầm "sản phẩm dự kiến". */
const DIFF_WINDOW = 240;

const checkDifferentiationDimensions = (t: string): StandardsFinding => {
  const windows: string[] = [];
  for (const m of t.matchAll(DIFF_RE)) {
    const at = m.index ?? 0;
    windows.push(t.slice(Math.max(0, at - DIFF_WINDOW), at + DIFF_WINDOW));
  }
  const near = windows.join('\n');
  const axes = [
    has(near, /nội\s*dung/) && 'nội dung',
    has(near, /tiến\s*trình|quy\s*trình|cách\s*(?:học|làm)/) && 'tiến trình',
    has(near, /sản\s*phẩm/) && 'sản phẩm',
    has(near, /môi\s*trường/) && 'môi trường học tập',
  ].filter(Boolean) as string[];
  return {
    id: 'differentiation-dimensions',
    danielson: '1e',
    title: 'Nêu rõ phân hóa theo trục nào (nội dung / tiến trình / sản phẩm / môi trường)',
    status: windows.length === 0 ? 'fail' : axes.length >= 2 ? 'pass' : 'warn',
    severity: 'medium',
    evidence: windows.length === 0
      ? 'Giáo án không nhắc đến dạy học phân hóa.'
      : axes.length
        ? `Phân hóa theo trục: ${axes.join(', ')}.`
        : 'Có nhắc phân hóa nhưng không nói rõ phân hóa theo trục nào.',
    suggestion: 'Với mỗi chỗ áp dụng phân hóa, ghi rõ phân hóa theo trục nào trong 4 trục Tomlinson (nội dung / tiến trình / sản phẩm / môi trường học tập) và chiến lược cụ thể đi kèm.',
    scope: 'all',
  };
};

// ── Checklist #8 — Trải nghiệm và suy ngẫm có chủ đích ────────────────────────

const checkReflectionPrompt = (t: string): StandardsFinding => {
  const ok = has(
    t,
    /suy\s*ngẫm|reflect|nhìn\s*lại\s*(?:quá\s*trình|bài\s*học|cách\s*(?:học|làm))|em\s*(?:đã\s*)?học\s*được\s*(?:gì|điều\s*gì)|rút\s*ra\s*(?:được\s*)?(?:bài\s*học|điều\s*gì)|tự\s*đánh\s*giá|3\s*[-–]\s*2\s*[-–]\s*1|exit\s*ticket|vé\s*ra\s*cửa/,
  );
  return {
    id: 'reflection-prompt',
    danielson: '1a',
    title: 'Có câu hỏi cho học sinh suy ngẫm có chủ đích',
    status: ok ? 'pass' : 'fail',
    severity: 'medium',
    evidence: ok
      ? 'Có hoạt động/câu hỏi yêu cầu học sinh suy ngẫm về việc học của mình.'
      : 'Chưa có câu hỏi nào yêu cầu học sinh nhìn lại quá trình học.',
    suggestion: 'Thêm vào pha sơ kết một câu hỏi suy ngẫm gắn với mục tiêu tiết học (VD: "Điều gì hôm nay em thấy khó nhất, vì sao?", vé ra cửa 3-2-1), không chỉ hỏi lại kiến thức.',
    scope: 'all',
  };
};

// ── Checklist #9 — Công dân toàn cầu & học tập liên văn hóa ───────────────────

const checkGlobalCitizenship = (t: string): StandardsFinding => {
  const ok = has(
    t,
    /công\s*dân\s*toàn\s*cầu|cdtc|liên\s*văn\s*h(?:óa|oá)|global\s*citizen|(?:vấn\s*đề|bối\s*cảnh|chủ\s*đề)\s*toàn\s*cầu|phát\s*triển\s*bền\s*vững|biến\s*đổi\s*khí\s*hậu/,
  );
  return {
    id: 'global-citizenship',
    danielson: '1a',
    title: 'Kết nối với tuyên bố Công dân toàn cầu',
    status: ok ? 'pass' : 'warn',
    severity: 'low',
    evidence: ok
      ? 'Có chủ đề/vấn đề toàn cầu hoặc liên văn hóa trong bài.'
      : 'Chưa thấy kết nối nào tới chủ đề toàn cầu hoặc liên văn hóa.',
    suggestion: 'Nếu bài có chỗ gắn được, chọn một bối cảnh toàn cầu làm ngữ liệu (dân số, khí hậu, năng lượng, thương mại…) và highlight năng lực Công dân toàn cầu trên bản KHDH.',
    scope: 'all',
  };
};

// ── Checklist #10 — Công dân kỹ thuật số ──────────────────────────────────────

const checkDigitalCitizenship = (t: string): StandardsFinding => {
  const citizenship = has(
    t,
    /công\s*dân\s*(?:kỹ|kĩ)\s*thuật\s*số|cdkts|năng\s*lực\s*số|digital\s*citizen|an\s*toàn\s*(?:thông\s*tin|trên\s*mạng)|bản\s*quyền|trích\s*dẫn\s*nguồn|thông\s*tin\s*sai\s*lệch|dữ\s*liệu\s*cá\s*nhân/,
  );
  const toolsOnly = has(t, /geogebra|desmos|padlet|kahoot|quizizz|canva|google\s*form|phần\s*mềm|máy\s*tính\s*bảng/);
  return {
    id: 'digital-citizenship',
    danielson: '1a',
    title: 'Kết nối với tuyên bố Công dân kỹ thuật số',
    status: citizenship ? 'pass' : 'warn',
    severity: 'low',
    evidence: citizenship
      ? 'Có nội dung về năng lực/ứng xử công dân kỹ thuật số.'
      : toolsOnly
        ? 'Mới dừng ở việc dùng công cụ số, chưa chạm tới năng lực công dân kỹ thuật số.'
        : 'Chưa thấy nội dung nào về công nghệ hay công dân kỹ thuật số.',
    suggestion: 'Khi học sinh dùng công cụ số, thêm một yêu cầu về ứng xử số đi kèm (ghi nguồn dữ liệu, kiểm chứng thông tin, giữ an toàn tài khoản) và highlight năng lực CDKTS trên bản KHDH.',
    scope: 'all',
  };
};

// ── Checklist #11 — Đánh giá thường xuyên ─────────────────────────────────────

const checkFormativeAssessment = (t: string): StandardsFinding => {
  const forms = [
    has(t, /vấn\s*đáp|hỏi\s*[-–]\s*đáp/) && 'vấn đáp',
    has(t, /trắc\s*nghiệm|quizizz|kahoot|google\s*form/) && 'trắc nghiệm nhanh',
    has(t, /trình\s*bày\s*bảng|lên\s*bảng|bảng\s*nhóm|bảng\s*phụ/) && 'trình bày bảng',
    has(t, /kiểm\s*tra\s*nhanh|mini\s*test|\d\s*phút\s*kiểm\s*tra/) && 'kiểm tra nhanh',
    has(t, /quan\s*sát\s*(?:nhóm|hs|học\s*sinh)|đi\s*(?:quanh|từng)\s*nhóm/) && 'quan sát nhóm',
    has(t, /rubric|bảng\s*tiêu\s*chí|đánh\s*giá\s*(?:chéo|đồng\s*đẳng)|tự\s*đánh\s*giá/) && 'rubric/đánh giá chéo',
    has(t, /exit\s*ticket|vé\s*ra\s*cửa|thẻ\s*(?:xanh|đỏ|vàng)/) && 'vé ra cửa/thẻ tín hiệu',
  ].filter(Boolean) as string[];
  return {
    id: 'formative-assessment',
    danielson: '1f',
    title: 'Có đánh giá thường xuyên và nêu rõ hình thức',
    status: forms.length >= 2 ? 'pass' : forms.length === 1 ? 'warn' : 'fail',
    severity: 'medium',
    evidence: forms.length
      ? `Có ${forms.length} hình thức đánh giá: ${forms.join(', ')}.`
      : 'Không thấy hoạt động đánh giá thường xuyên nào trong tiết.',
    suggestion: 'Cài ít nhất 2 điểm đánh giá thường xuyên trong tiết và ghi rõ hình thức (vấn đáp, trắc nghiệm nhanh, trình bày bảng, quan sát nhóm, vé ra cửa) cùng việc giáo viên làm gì với kết quả thu được.',
    scope: 'all',
  };
};

// ── Checklist #12–14 — Tài nguyên dạy học ─────────────────────────────────────

const checkResourcesListed = (t: string): StandardsFinding => {
  const hasSection = has(t, /(?:thiết\s*bị|đồ\s*dùng|tài\s*nguyên|học\s*liệu|phương\s*tiện)\s*(?:dạy\s*học)?|chuẩn\s*bị\s*của\s*(?:gv|giáo\s*viên|hs|học\s*sinh)/);
  const digital = has(t, /máy\s*chiếu|slide|powerpoint|geogebra|desmos|padlet|kahoot|quizizz|canva|video|clip|qr|phần\s*mềm|máy\s*tính\s*bảng|tivi|bảng\s*tương\s*tác/);
  const physical = has(t, /phiếu\s*học\s*tập|bảng\s*phụ|bảng\s*nhóm|giấy\s*a[034]|thước|compa|nam\s*châm|bút\s*dạ|mô\s*hình|giấy\s*nhớ/);
  const both = digital && physical;
  return {
    id: 'resources-listed',
    danielson: '1d',
    title: 'Liệt kê tài nguyên dạy học, có cả tài nguyên số và đồ dùng',
    status: hasSection && both ? 'pass' : hasSection && (digital || physical) ? 'warn' : 'fail',
    severity: 'medium',
    evidence: !hasSection
      ? 'Chưa thấy mục thiết bị/đồ dùng/học liệu dạy học.'
      : both
        ? 'Có mục tài nguyên gồm cả tài nguyên số và đồ dùng vật lí.'
        : digital
          ? 'Mới liệt kê tài nguyên số, chưa có đồ dùng vật lí.'
          : physical
            ? 'Mới liệt kê đồ dùng vật lí, chưa có tài nguyên số.'
            : 'Có mục tài nguyên nhưng chưa liệt kê thứ gì cụ thể.',
    suggestion: 'Liệt kê ở mục "Thiết bị dạy học và học liệu" đủ cả tài nguyên số (slide, video, phần mềm) và đồ dùng vật lí (phiếu học tập, bảng nhóm, dụng cụ), kèm chỗ nào cần chuẩn bị trước hoặc mượn phòng chức năng.',
    scope: 'all',
  };
};

const SCHOOL_CHECKS = [
  checkStudentProfile,
  checkPlanMetadata,
  checkActivityFormatVariety,
  checkSafeEnvironment,
  checkDifferentiationDimensions,
  checkReflectionPrompt,
  checkGlobalCitizenship,
  checkDigitalCitizenship,
  checkFormativeAssessment,
  checkResourcesListed,
];

/** Chấm giáo án theo Checklist tự kiểm tra giáo án — dùng được cho mọi môn. */
export const auditGeneralStandards = (content: string): StandardsFinding[] => {
  const t = norm(content || '');
  return SCHOOL_CHECKS.map((fn) => fn(t));
};
