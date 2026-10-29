/**
 * PH/HS chat tự do với AI (Phase 2.5).
 *
 * Nguyên tắc (chốt 25/10):
 * - AI chỉ được nói điều CÓ TRONG báo cáo an toàn của đúng em đã liên kết. Không có trong
 *   báo cáo → phải nói "chưa có thông tin", KHÔNG được suy đoán. PH đọc sai điểm là chuyện lớn.
 * - Feedback GV (`grade.feedback`) CHỈ vào prompt bản HS, và chỉ với bài đã duyệt. Điểm chưa
 *   duyệt và dữ liệu em khác không bao giờ vào prompt.
 * - Câu hỏi chung (cách dạy con, quản lý thời gian) được trả lời bằng kiến thức chung, nhưng
 *   phải nói rõ đó là gợi ý chung, không phải nhận xét về con.
 * - Mọi câu trả lời đi qua `sanitizeAiReply` để chặn lộ mã nội bộ / số điện thoại.
 */
import type { ParentSafeReport } from '../src/lib/classroom/parentSafeReport.js';
import { MATH_FORMAT_RULE, latexToUnicodeMath } from './_assistant-math-text.js';
import { extractGeometryReply, type GeometrySpec } from './_assistant-geometry.js';
import { hasLatexFormula } from './_assistant-math-image.js';

export const AI_CHAT_REPLIES = {
  unavailable: 'Trợ lý AI đang bận. Bạn nhắn 0 để xem menu hoặc thử lại sau ít phút.',
  empty: 'Mình chưa rõ câu hỏi. Bạn nhắn 0 để xem menu, hoặc hỏi cụ thể hơn về việc học.',
} as const;

/** Câu chốt LUÔN nằm cuối mọi câu trả lời AI — PH không phải nhớ cú pháp. */
export const AI_MENU_HINT = 'Nhắn 0 để xem lại menu.';

export type ChatRole = 'parent' | 'student';

/**
 * Dựng ngữ cảnh cho AI từ báo cáo an toàn.
 * CHỈ dùng số liệu đã lọc (official = điểm GV đã duyệt). Bản PH không kèm feedback từng bài;
 * bản HS được kèm nhận xét GV cho bài đã duyệt (có trong report.results khi includeFeedback).
 */
export const buildAiContext = (report: ParentSafeReport, periodicIds: ReadonlySet<string>, role: ChatRole = 'parent'): string => {
  const isPeriodic = (id: string) => periodicIds.has(id);
  const graded = report.results.filter(item => item.status === 'official');
  const bt = graded.filter(item => !isPeriodic(item.assignmentId));
  const kt = report.results.filter(item => isPeriodic(item.assignmentId));
  const lines: string[] = [
    `Học sinh: ${report.studentName} — lớp ${report.className}`,
    `Số bài đã chấm: ${report.officialCount}`,
    `Đang chờ chấm: ${report.pendingCount}, chưa nộp: ${report.missingCount}`,
    `Xu hướng: ${report.progress?.trend === 'up' ? 'đang tiến bộ' : report.progress?.trend === 'down' ? 'đang giảm' : report.progress?.trend === 'flat' ? 'ổn định' : 'chưa đủ dữ liệu'}`,
  ];
  if (bt.length) {
    lines.push('Bài tập về nhà đã chấm:');
    for (const item of bt.slice(0, 10)) lines.push(`- ${item.title}: ${item.score ?? '-'}/${item.maxScore ?? '-'}`);
  }
  if (kt.length) {
    lines.push('Bài kiểm tra định kì:');
    for (const item of kt.slice(0, 10)) {
      lines.push(item.status === 'official'
        ? `- ${item.title}: ${item.score ?? '-'}/${item.maxScore ?? '-'}`
        : `- ${item.title}: ${item.status === 'not_submitted' ? 'chưa nộp' : 'chưa có điểm'}`);
    }
  }
  if (report.strengths.length) lines.push(`Điểm mạnh: ${report.strengths.join('; ')}`);
  if (report.areasToPractice.length) lines.push(`Cần luyện thêm: ${report.areasToPractice.join('; ')}`);
  if (role === 'student') {
    // HS được hỏi về nhận xét của GV cho bài của chính mình — đưa feedback đã duyệt vào ngữ cảnh.
    const withFeedback = report.results.filter(item => item.status === 'official' && item.feedback);
    if (withFeedback.length) {
      lines.push('Nhận xét của giáo viên theo bài:');
      for (const item of withFeedback.slice(0, 8)) {
        lines.push(`- ${item.title} (${item.score ?? '-'}/${item.maxScore ?? '-'}): ${String(item.feedback).replace(/\s+/g, ' ').slice(0, 300)}`);
      }
    }
  } else if (report.parentActions.length) {
    lines.push(`Gợi ý cho phụ huynh: ${report.parentActions.join('; ')}`);
  }
  return lines.join('\n');
};

/**
 * Quy tắc vẽ hình minh hoạ (chốt 28/10 — render ảnh qua sendPhoto):
 * AI chỉ thêm khối geometry khi câu hỏi mô tả dữ liệu ĐÁNG vẽ; parser ở
 * api/_assistant-geometry.ts sẽ tách khối — hỏng thì bot gửi text như cũ, không vỡ luồng.
 * Hình học: nét liền = nhìn thấy, nét đứt = bị che (đã chuẩn SGK phía renderer).
 * Thống kê: bảng/biểu đồ cột/đồ thị điểm — dùng khi đề có mẫu số liệu, tần suất.
 */
export const GEOMETRY_PROMPT_RULE = [
  'VẼ HÌNH (bắt buộc khi đề có hình không gian hoặc số liệu thống kê — HS cần HÌNH, không chỉ chữ):',
  'Khi đề nhắc tới chóp/lăng trụ/hộp/trụ/nón/cầu hoặc có bảng số liệu/tần suất, em LUÔN thêm đúng MỘT khối này ở CUỐI câu trả lời:',
  '```geometry',
  '{"shape":"pyramid","base":"square","note":"ABCD vuông cạnh a, SA ⊥ (ABCD), SA = a√2"}',
  '```',
  'Các shape hợp lệ:',
  '- pyramid (base: square nếu đáy vuông/chữ nhật, triangle nếu đáy tam giác) | prism | box | cylinder | cone | sphere',
  '  ⚠️ CHỌN ĐÚNG CHÂN ĐƯỜNG CAO (apexAt) — sai là VẼ SAI ĐỀ:',
  '    • Đề cho "SA ⊥ (ABCD)" / "SA vuông góc với mặt đáy" → apexAt: "A" (S đứng trên A, SA là đường cao)',
  '    • Đề cho "hình chóp đều" / "S cách đều A,B,C,D" / "chân đường cao là tâm O" → apexAt: "center"',
  '    • Không nói gì về chân đường cao → apexAt: "A" (đa số bài lớp 11 cho SA ⊥ đáy)',
  '- graph — đồ thị hàm số: {"shape":"graph","points":[[-2,4],[-1,1],[0,0],[1,1],[2,4]],"xrange":[-3,3],"yrange":[-1,5]}',
  '  ⚠️ QUY CHUẨN ĐỒ THỊ: điểm phải đúng toán học; TUYỆT ĐỐI KHÔNG đưa điểm nằm ở nơi hàm KHÔNG xác định,',
  '  KHÔNG nối qua tiệm cận đứng hay điểm gián đoạn (ví dụ y=1/(x−2): 2 nhánh tách rời, không có điểm tại x=2;',
  '  y=(x²−1)/(x−1): đường thẳng y=x+1 nhưng THIẾU điểm tại x=1). Chọn xrange/yrange theo đặc trưng hàm.',
  '- table — bảng số liệu: {"shape":"table","head":["x","1","2","3"],"rows":[["tần suất","3","5","2"]]}',
  '  ⚠️ Phân biệt tần số (đếm) và tần suất %; tổng tần suất phải đúng 100% (làm tròn thì ghi chú).',
  '- bar — biểu đồ cột: {"shape":"bar","labels":["A","B","C"],"values":[3,5,2]}',
  '  ⚠️ Trục giá trị bắt đầu từ 0; chiều cao cột tỉ lệ THUẬN giá trị; không chế số liệu.',
  'note: mô tả ngắn dữ kiện (⊥, √, °, ⇒), tối đa 200 ký tự. KHÔNG giải thích khối này trong phần chữ.',
  'QUY CHUẨN KÝ HIỆU: chóp viết S.ABC / S.ABCD; hộp viết ABCD.A\'B\'C\'D\' (A\' tương ứng A); đường tròn (O;R).',
  'TUYỆT ĐỐI KHÔNG "vẽ thêm" quan hệ không có trong đề: không tự coi tam giác là cân/vuông, không tự thêm',
  'điểm bằng nhau/vuông góc/song song khi đề không cho — hình chỉ minh họa giả thiết đã cho.',
  'Câu hỏi điểm số, phương pháp học, đại số thuần (không có hình/số liệu) thì KHÔNG thêm khối.',
].join('\n');

/** Prompt hệ thống — chống bịa là yêu cầu cứng, không phải lời khuyên. Văn phong theo vai trò. */
export const buildSystemPrompt = (context: string, role: ChatRole = 'parent'): string => {
  const student = role === 'student';
  return [
    student
      ? 'Bạn là trợ lý hỗ trợ học sinh của một giáo viên Toán ở Việt Nam.'
      : 'Bạn là trợ lý hỗ trợ phụ huynh của một giáo viên Toán ở Việt Nam.',
    student
      ? 'Trả lời bằng tiếng Việt, ngắn gọn (tối đa 6 câu), giọng thân thiện, khích lệ, gọi người nhắn là "em" — em đang hỏi về bài của chính mình.'
      : 'Trả lời bằng tiếng Việt, ngắn gọn (tối đa 6 câu), giọng thân thiện, gọi phụ huynh là "anh/chị".',
    '',
    'QUY TẮC BẮT BUỘC:',
    '1. Chỉ nói về điểm số, bài tập, nhận xét CÓ TRONG phần DỮ LIỆU dưới đây.',
    `2. Nếu dữ liệu không có thông tin được hỏi, trả lời đúng ý: "Dữ liệu hiện có chưa ghi nhận thông tin này, ${student ? 'em' : 'anh/chị'} nhắn thầy cô để rõ hơn." KHÔNG được suy đoán, KHÔNG bịa thêm bài hay điểm.`,
    '3. Không hứa hẹn về điểm số tương lai, không cam kết kết quả thi.',
    '4. Không nhắc tên, điểm, hay thông tin của học sinh khác.',
    '5. Không đưa số điện thoại, mã học sinh, email hay thông tin liên hệ nội bộ.',
    `6. Câu hỏi chung (cách học, quản lý thời gian, tâm lý) thì trả lời như gợi ý chung, mở đầu bằng "Gợi ý chung:" để phân biệt với ${student ? 'nhận xét về bài của em' : 'nhận xét về con'}.`,
    '',
    GEOMETRY_PROMPT_RULE,
    '',
    MATH_FORMAT_RULE,
    '',
    'DỮ LIỆU:',
    context,
  ].join('\n');
};

/**
 * Chặn rò rỉ: bỏ số điện thoại, mã HS, mã lớp, và mọi chuỗi giống token nội bộ.
 * PH không bao giờ được thấy những thứ này dù model có "lỡ" sinh ra.
 */
export const sanitizeAiReply = (raw: string): string => String(raw ?? '')
  .replace(/\b0\d{9,10}\b/g, '[số điện thoại]')
  .replace(/\b84\d{9,10}\b/g, '[số điện thoại]')
  .replace(/\b(S|GB)\d{8,10}\b/g, '[mã học sinh]')
  .replace(/\bpinlink:[^\s]+/g, '')
  .replace(/\b[A-Fa-f0-9]{32,}\b/g, '')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

/** Ghép câu trả lời cuối: nội dung AI + nhắc menu. Rỗng thì trả câu lịch sự. */
export const composeAiReply = (raw: string): string => {
  // Lọc rò rỉ TRƯỚC, rồi mới chuyển công thức — để bộ chuyển không vô tình ghép
  // các mảnh thành chuỗi trông như số điện thoại/hash.
  const clean = latexToUnicodeMath(sanitizeAiReply(raw));
  if (!clean) return AI_CHAT_REPLIES.empty;
  return `${clean}\n\n${AI_MENU_HINT}`;
};

/** Gọi Gemini. Tách riêng để test thay được, không gọi mạng thật. */
export type AiCaller = (systemPrompt: string, userText: string, signal?: AbortSignal) => Promise<string>;

/**
 * Gọi model qua Vilao (chuẩn OpenAI SDK).
 * Mặc định `cnt/glm-5.3-flash`: 80đ/1M vào — 240đ/1M ra, 99% thành công (chốt 26/10).
 * Đổi model = sửa hằng số này rồi deploy, KHÔNG đọc env (tránh đổi model ngoài git như lần chấm bài).
 */
export const PH_CHAT_MODEL = 'cnt/glm-5.3-flash';
export const PH_CHAT_ENDPOINT = 'https://api.vilao.ai/v1/chat/completions';

export const vilaoCaller = (apiKey: string, model = PH_CHAT_MODEL): AiCaller => async (systemPrompt, userText, signal) => {
  const res = await fetch(PH_CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText },
      ],
      temperature: 0.3,
      // Reasoning model tiêu token cho suy luận trước khi viết câu trả lời; 800 đo được là đủ
      // cho câu ngắn nhưng 1.200 an toàn hơn khi ngữ cảnh dài (báo cáo nhiều bài).
      max_tokens: 1200,
    }),
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
  const body: any = await res.json();
  const message = body?.choices?.[0]?.message ?? {};
  // glm-5.3-flash là REASONING model: nó tiêu token cho `reasoning` TRƯỚC khi sinh `content`.
  // Đã đo thật: max_tokens 50 → content rỗng (reasoning ăn hết); max_tokens 800 → content "4".
  // Vì vậy không dùng trần thấp, và nếu content rỗng thì coi là lỗi để caller trả câu "bận"
  // thay vì gửi tin nhắn trống cho phụ huynh.
  const reply = String(message.content ?? '');
  if (!reply.trim()) {
    const usedReasoning = Number(body?.usage?.completion_tokens_details?.reasoning_tokens ?? 0);
    throw new Error(usedReasoning > 0 ? 'AI reasoning-only (het token truoc khi tra loi)' : 'AI empty');
  }
  return reply;
};

/**
 * Xử lý 1 câu hỏi tự do của PH/HS — bản ĐẦY ĐỦ: text hiển thị + spec hình học (nếu AI vẽ được).
 * Khối ```geometry``` được tách khỏi RAW TRƯỚC khi sanitize/convert để JSON không bị
 * bộ chuyển công thức hay bộ lọc rò rỉ chạm vào.
 *
 * `text`   : bản Unicode đã convert — dùng làm CAPTION (HS đọc được ngay trong chat).
 * `mathSource`: bản RAW còn LaTeX — dùng để RENDER ẢNH KaTeX. PHẢI là bản raw, vì
 *            latexToUnicodeMath đã xoá $$…$$ nên nếu đưa `text` vào renderer thì
 *            hasLatexFormula() luôn false và ảnh công thức không bao giờ ra (bug 28/10).
 */
export type AiChatAnswer = { text: string; mathSource: string; geometry: GeometrySpec | null; hasMath: boolean };

export const answerParentQuestionDetailed = async (
  call: AiCaller,
  question: string,
  report: ParentSafeReport,
  periodicIds: ReadonlySet<string>,
  role: ChatRole = 'parent',
  signal?: AbortSignal,
): Promise<AiChatAnswer | null> => {
  const q = String(question ?? '').trim();
  if (!q) return null;
  const context = buildAiContext(report, periodicIds, role);
  const raw = await call(buildSystemPrompt(context, role), q.slice(0, 1000), signal);
  const { text, spec } = extractGeometryReply(raw);
  // Lọc rò rỉ trên bản raw TRƯỚC, nhưng KHÔNG convert công thức — giữ LaTeX cho renderer.
  const mathSource = sanitizeAiReply(text);
  return {
    text: composeAiReply(text),
    mathSource,
    geometry: spec,
    hasMath: hasLatexFormula(mathSource),
  };
};

/**
 * Xử lý 1 câu hỏi tự do của PH/HS.
 * Trả `null` khi input rỗng (để caller dùng câu mặc định).
 */
export const answerParentQuestion = async (
  call: AiCaller,
  question: string,
  report: ParentSafeReport,
  periodicIds: ReadonlySet<string>,
  role: ChatRole = 'parent',
  signal?: AbortSignal,
): Promise<string | null> => (await answerParentQuestionDetailed(call, question, report, periodicIds, role, signal))?.text ?? null;
