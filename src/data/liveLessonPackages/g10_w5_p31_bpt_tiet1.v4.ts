import type {
  Checkpoint,
  GlossaryItem,
  LiveLessonV4Contract,
  PublicTvScreen,
  ScaffoldSet,
  TaskVariant,
  TimelineBlock,
} from '../../lib/liveLesson/v4';
import { g10W5P31BptTiet1Cues } from './g10_w5_p31_bpt_tiet1.cues';

const SHARED_SUCCESS_CRITERIA = [
  'Lập hoặc đọc đúng bất phương trình biểu diễn điều kiện.',
  'Dùng hình, ký hiệu hoặc lời nói để giải thích miền nghiệm.',
  'Kiểm tra ít nhất một điểm hoặc một trường hợp biên.',
];

const cueById = new Map(g10W5P31BptTiet1Cues.map((cue) => [cue.id, cue]));

function cueText(id: string, field: 'teacher' | 'student' | 'boardLarge' | 'boardSide'): string {
  return cueById.get(id)?.[field] ?? '';
}

function timelineBlock(
  id: string,
  label: string,
  startSeconds: number,
  endSeconds: number,
  tvScreenId: string,
  teacherScript: string,
  studentAction: string,
  boardLarge: string,
  boardSide: string,
  checkpointId?: string,
): TimelineBlock {
  return {
    id,
    label,
    startSeconds,
    endSeconds,
    teacherScript,
    tvScreenId,
    studentAction,
    boardLarge,
    boardSide,
    checkpointId,
  };
}

function buildTimeline(): TimelineBlock[] {
  return [
    timelineBlock(
      'P00',
      'P00-P03: Tình huống bánh nước',
      0,
      180,
      'S0',
      `${cueText('P01', 'teacher')} ${cueText('P02', 'teacher')} Hỏi: “Có thể biểu diễn mọi cách chọn bằng một hình như thế nào, và làm sao biết một điểm có hợp lệ?”`,
      'Dự đoán cá nhân 20-30 giây, nói với bạn bên cạnh; chưa cần đăng nhập.',
      cueText('P00', 'boardLarge'),
      'Bảng phụ để trống; chuẩn bị câu hỏi định hướng.',
    ),
    timelineBlock(
      'P03',
      'P03-P05: Mục tiêu cá nhân',
      180,
      300,
      'S1',
      'Mỗi em viết một điều muốn tự làm được cuối tiết. Sau 45 giây, bấm tổng hợp từ khóa và đọc 2-3 ý tiêu biểu.',
      'Chọn 1-2 mục tiêu gợi ý hoặc nhập tối đa một câu ngắn; dùng khung câu nếu cần.',
      'Giữ tiêu đề và câu hỏi định hướng đang hình thành.',
      cueText('P03', 'boardSide'),
      'cp-student-goal',
    ),
    timelineBlock(
      'P05',
      'P05-P08: Chốt mục tiêu chung',
      300,
      480,
      'S2',
      `${cueText('P05', 'teacher')} ${cueText('P06', 'teacher')} Viết 2-3 mục tiêu Toán và 1 mục tiêu diễn đạt lên bảng phụ.`,
      'Đối chiếu mục tiêu cá nhân với mục tiêu chung, hỏi nếu chưa hiểu.',
      cueText('P06', 'boardLarge'),
      'MỤC TIÊU CHUNG: kiểm tra một điểm; lập mô hình; giải thích nghiệm bằng hình/ký hiệu/lời nói.',
      'cp-teacher-synthesis',
    ),
    timelineBlock(
      'P08',
      'P08-P16: Đường biên và miền nghiệm',
      480,
      960,
      'S3',
      `${cueText('P07', 'teacher')} ${cueText('P08', 'teacher')} ${cueText('P09', 'teacher')} ${cueText('P10', 'teacher')} ${cueText('P11', 'teacher')} Dựng trục tọa độ, đường biên và miền nghiệm; hỏi “vì sao dấu là ≤?”.`,
      'Quan sát, ghi hình/biến đổi vào vở; bấm thuật ngữ nếu cần, không gửi đáp án liên tục.',
      `${cueText('P07', 'boardLarge')}\n${cueText('P08', 'boardLarge')}\n${cueText('P09', 'boardLarge')}\n${cueText('P11', 'boardLarge')}`,
      'TỪ KHÓA: bất phương trình; đường biên; miền nghiệm; điểm thuộc miền nghiệm.',
      'cp-model',
    ),
    timelineBlock(
      'P16',
      'P16-P19: AI Error of the Week',
      960,
      1140,
      'S4',
      `AI Error of the Week. ${cueText('P12', 'teacher')} ${cueText('P13', 'teacher')} ${cueText('P14', 'teacher')} Chốt: “160>150 nên 160≤150 sai; (6;7) không là nghiệm.”`,
      'Chọn loại lỗi trong 30-40 giây, trao đổi cặp đôi, ghi bước sửa vào vở.',
      'Lời giải AI cần kiểm: Với (6;7), 15·6 + 10·7 = 160. AI kết luận 160 ≤ 150 nên phương án hợp lệ.',
      cueText('P15', 'boardSide'),
      'cp-ai-error',
    ),
    timelineBlock(
      'P19',
      'P19-P20: Duyệt nhóm',
      1140,
      1200,
      'S5',
      'Xem đề xuất riêng, chọn Duyệt/Đổi nhóm/Mặc định; nói: “Nhóm khác nhau về điểm cần hỗ trợ, không phải nhãn người học.”',
      'Nhận mã nhóm trên thiết bị và di chuyển theo sơ đồ chỗ ngồi đã có.',
      'Giữ lời giải đúng và định nghĩa trên bảng lớn.',
      'NHÓM: mã nhóm + nhiệm vụ; không ghi nhãn năng lực.',
    ),
    timelineBlock(
      'P20',
      'P20-P27: Nhiệm vụ nhóm M/S/C',
      1200,
      1620,
      'S6',
      `${cueText('P16', 'teacher')} ${cueText('P17', 'teacher')} Giao cùng câu hỏi lớn, đi tới nhóm đồng nhu cầu trước, hỏi bằng chứng chứ không đọc lời giải.`,
      'Ổn định nhóm, giải, trình bày/đối chiếu; thiết bị đặt xuống khi làm nhóm.',
      '3 tiêu chí: biến rõ; dấu đúng; kết luận có căn cứ.',
      'KHUNG CÂU: Điểm ___ thuộc miền vì ___. Đường biên là ___ nên ___.',
      'cp-group-product',
    ),
    timelineBlock(
      'P27',
      'P27-P30: Post-check cá nhân',
      1620,
      1800,
      'S7',
      'Yêu cầu từng HS làm một post-check khác dữ kiện nhưng cùng tiêu chí; không cho nhóm trả lời thay.',
      'Tự giải và kiểm tra một điểm/điều kiện; gửi đáp án ngắn hoặc giơ vở.',
      'Post-check: Với 2x + y ≤ 12, kiểm tra điểm (5;3) và nêu kết luận.',
      'POST-CHECK: thay tọa độ; so sánh; kết luận thuộc/không thuộc.',
      'cp-postcheck',
    ),
    timelineBlock(
      'P30',
      'P30-P35: Nhiệm vụ cá nhân theo tuyến',
      1800,
      2100,
      'S8',
      `${cueText('P18', 'teacher')} Cho HS chọn/nhận tuyến M/S/C; chỉ dẫn trên điện thoại GV nêu nhóm nào cần gợi ý, GV vẫn hỏi-đáp trực tiếp.`,
      'Làm nhiệm vụ cá nhân phù hợp, dùng tối đa một gợi ý rồi tự hoàn thiện.',
      'Giữ mô hình + định nghĩa + tiêu chí.',
      'LỖI CẦN SOI: dấu ≤; thay cặp; x,y nguyên không âm.',
      'cp-route',
    ),
    timelineBlock(
      'P35',
      'P35-P38: Chốt Toán và phản ví dụ',
      2100,
      2280,
      'S9',
      `${cueText('P19', 'teacher')} Gọi một lời giải, một phản ví dụ và một phép kiểm; chốt trên bảng lớn, đối chiếu mục tiêu trên bảng phụ.`,
      'Giải thích/đặt câu hỏi, sửa vở nếu cần.',
      'Mô hình toán học phải gắn với ý nghĩa của biến; nghiệm phải thỏa điều kiện.',
      'Giữ mục tiêu chung và lỗi cần soi.',
    ),
    timelineBlock(
      'P38',
      'P38-P40: Exit ticket',
      2280,
      2400,
      'S10',
      `${cueText('P20', 'teacher')} “Một điều em đã hiểu, một điều còn cần kiểm chứng.” Đóng phiên sau khi đủ thời gian.`,
      'Viết một câu hoặc gửi lựa chọn + câu ngắn; dùng khung câu nếu cần.',
      cueText('P20', 'boardLarge'),
      'Tiết sau: biểu diễn miền nghiệm.',
      'cp-exit-ticket',
    ),
  ];
}

function buildGlossary(): GlossaryItem[] {
  return [
    {
      id: 'term-inequality',
      vietnamese: 'bất phương trình',
      translations: { en: 'inequality' },
      plainExplanationVi: 'Một mệnh đề so sánh hai biểu thức bằng <, ≤, > hoặc ≥.',
      plainExplanationByLanguage: { en: 'A statement comparing two expressions with <, ≤, >, or ≥.' },
      notation: 'ax + by ≤ c',
      example: '3x + 2y ≤ 30',
      nonExample: '3x + 2y = 30 là phương trình, không phải bất phương trình.',
      sourceRef: 'pilot-v4-design-sec10-sgk-derived',
      reviewer: 'pilot-math-reviewer',
      version: '2026-08-27-pilot',
      status: 'approved',
    },
    {
      id: 'term-boundary-line',
      vietnamese: 'đường biên',
      translations: { en: 'boundary line' },
      plainExplanationVi: 'Đường thẳng tạo ranh giới giữa hai nửa mặt phẳng khi biểu diễn bất phương trình.',
      plainExplanationByLanguage: { en: 'The line separating two half-planes when representing an inequality.' },
      notation: '3x + 2y = 30',
      example: 'Đường biên của 3x + 2y ≤ 30 là 3x + 2y = 30.',
      nonExample: 'Một điểm riêng lẻ không phải là đường biên.',
      sourceRef: 'pilot-v4-design-sec10-sgk-derived',
      reviewer: 'pilot-math-reviewer',
      version: '2026-08-27-pilot',
      status: 'approved',
    },
    {
      id: 'term-solution-region',
      vietnamese: 'miền nghiệm',
      translations: { en: 'solution region' },
      plainExplanationVi: 'Tập hợp các điểm có tọa độ làm bất phương trình đúng.',
      plainExplanationByLanguage: { en: 'The set of points whose coordinates make the inequality true.' },
      notation: '{(x;y) | 3x + 2y ≤ 30}',
      example: '(0;0) thuộc miền nghiệm của 3x + 2y ≤ 30.',
      nonExample: '(10;10) không thuộc miền nghiệm vì 50 > 30.',
      sourceRef: 'pilot-v4-design-sec10-sgk-derived',
      reviewer: 'pilot-math-reviewer',
      version: '2026-08-27-pilot',
      status: 'approved',
    },
    {
      id: 'term-point-in-region',
      vietnamese: 'điểm thuộc miền nghiệm',
      translations: { en: 'point in the solution region' },
      plainExplanationVi: 'Một điểm mà khi thay tọa độ vào bất phương trình thì mệnh đề nhận được là đúng.',
      plainExplanationByLanguage: { en: 'A point whose coordinates make the inequality true when substituted.' },
      notation: '(x0;y0)',
      example: '(6;5) thuộc miền nghiệm của 3x + 2y ≤ 30 vì 28 ≤ 30.',
      nonExample: '(6;7) không thuộc miền nghiệm vì 32 > 30.',
      sourceRef: 'pilot-v4-design-sec10-sgk-derived',
      reviewer: 'pilot-math-reviewer',
      version: '2026-08-27-pilot',
      status: 'approved',
    },
  ];
}

function buildScaffoldSets(): ScaffoldSet[] {
  return [
    {
      id: 'scaffold-M',
      route: 'M',
      hints: ['Vẽ hoặc nhìn đường biên trước.', 'Thay tọa độ một điểm đơn giản như (0;0).'],
      sentenceFrames: ['Điểm ___ thuộc miền vì khi thay vào ta được ___ ≤ ___.'],
      glossaryRefs: ['term-boundary-line', 'term-solution-region'],
    },
    {
      id: 'scaffold-S',
      route: 'S',
      hints: ['Liên hệ bảng giá trị với vị trí trên hình.', 'Kiểm tra một điểm trên đường biên và một điểm ngoài đường biên.'],
      sentenceFrames: ['Đường biên là ___; phía được chọn là phía chứa điểm ___.'],
      glossaryRefs: ['term-inequality', 'term-solution-region'],
    },
    {
      id: 'scaffold-C',
      route: 'C',
      hints: ['Tự tạo một phản ví dụ cho kết luận sai.', 'Giải thích điều kiện dấu bằng có làm đường biên thuộc miền không.'],
      sentenceFrames: ['Phản ví dụ của em là ___ vì ___.'],
      glossaryRefs: ['term-point-in-region'],
    },
  ];
}

function buildCheckpoints(): Checkpoint[] {
  return [
    {
      id: 'cp-student-goal',
      stepId: 'P03',
      kind: 'in_class',
      prompt: 'Một điều em muốn tự làm được cuối tiết là gì?',
      responseType: 'text',
      evidenceSignal: 'Mục tiêu cá nhân của HS, tối đa một câu ngắn.',
      teacherNextActions: ['Gom từ khóa ẩn danh', 'Chốt mục tiêu chung trên bảng phụ'],
    },
    {
      id: 'cp-teacher-synthesis',
      stepId: 'P05',
      kind: 'in_class',
      prompt: 'GV tổng hợp mục tiêu chung từ mục tiêu cá nhân.',
      responseType: 'choice',
      evidenceSignal: 'Mục tiêu chung đã được công bố và neo trên bảng phụ.',
      teacherNextActions: ['Viết mục tiêu chung', 'Giữ mục tiêu đến cuối tiết'],
    },
    {
      id: 'cp-model',
      stepId: 'P08',
      kind: 'in_class',
      prompt: 'Chọn dấu và giải thích vì sao không vượt quá dùng ≤.',
      responseType: 'choice',
      evidenceSignal: 'HS phân biệt được ≤ với = trong bối cảnh.',
      teacherNextActions: ['Hỏi vì sao dấu bằng còn được nhận', 'Chuyển sang đường biên'],
    },
    {
      id: 'cp-ai-error',
      stepId: 'P16',
      kind: 'in_class',
      prompt: 'Dòng nào đáng nghi trong lời giải AI? Chọn loại lỗi và nêu bằng chứng.',
      responseType: 'choice',
      evidenceSignal: 'HS phân loại lỗi và dùng phép thay điểm để bác kết luận sai.',
      teacherNextActions: ['Chốt lỗi logic', 'Yêu cầu ghi phép kiểm vào vở'],
    },
    {
      id: 'cp-group-product',
      stepId: 'P20',
      kind: 'in_class',
      prompt: 'Nhóm dùng cùng tiêu chí để giải thích một miền nghiệm.',
      responseType: 'text',
      evidenceSignal: 'Sản phẩm nhóm có mô hình, hình/ký hiệu và phép kiểm.',
      teacherNextActions: ['Đi tới nhóm cần scaffold trước', 'Gọi nhóm trình bày ngắn'],
    },
    {
      id: 'cp-postcheck',
      stepId: 'P27',
      kind: 'post_check',
      prompt: 'Với 2x + y ≤ 12, kiểm tra điểm (5;3) và nêu kết luận có căn cứ.',
      responseType: 'text',
      evidenceSignal: 'Bằng chứng cá nhân sau hoạt động nhóm — dữ kiện mới, cùng tiêu chí.',
      teacherNextActions: ['Đọc nhanh vài vở', 'Ghi nhận HS cần hỗ trợ khi vào tuyến ở P30'],
    },
    {
      id: 'cp-postcheck-m',
      stepId: 'P27',
      kind: 'post_check',
      prompt: 'Với x + 2y ≤ 8, kiểm tra điểm (2;3) và nêu kết luận. (Tuyến M)',
      responseType: 'text',
      evidenceSignal: 'Bằng chứng cá nhân sau hoạt động nhóm — dữ kiện mới, cùng tiêu chí.',
      teacherNextActions: ['Đọc mẫu vở', 'Ghi nhận HS cần hỏi lại ở P30'],
    },
    {
      id: 'cp-postcheck-s',
      stepId: 'P27',
      kind: 'post_check',
      prompt: 'Với 2x + y ≤ 10, kiểm tra điểm (3;4) và giải thích. (Tuyến S)',
      responseType: 'text',
      evidenceSignal: 'Bằng chứng cá nhân sau hoạt động nhóm — dữ kiện mới, cùng tiêu chí.',
      teacherNextActions: ['Đọc mẫu vở', 'Ghi nhận HS cần hỏi lại ở P30'],
    },
    {
      id: 'cp-postcheck-c',
      stepId: 'P27',
      kind: 'post_check',
      prompt: 'Với 3x + 2y ≤ 14, kiểm tra điểm (4;1) và viết phản ví dụ nếu sai. (Tuyến C)',
      responseType: 'text',
      evidenceSignal: 'Bằng chứng cá nhân sau hoạt động nhóm — dữ kiện mới, cùng tiêu chí.',
      teacherNextActions: ['Đọc mẫu vở', 'Ghi nhận HS cần hỏi lại ở P30'],
    },
    {
      id: 'cp-route',
      stepId: 'P30',
      kind: 'in_class',
      prompt: 'Chọn hoặc nhận tuyến M/S/C và dùng tối đa một gợi ý.',
      responseType: 'route',
      evidenceSignal: 'Tuyến cá nhân và mức tự chủ qua số gợi ý đã dùng.',
      teacherNextActions: ['Không công khai tuyến', 'Hỏi trực tiếp nhóm cần hỗ trợ'],
    },
    {
      id: 'cp-exit-ticket',
      stepId: 'P38',
      kind: 'post_check',
      prompt: 'Một điều em đã hiểu, một điều còn cần kiểm chứng.',
      responseType: 'exit_ticket',
      evidenceSignal: 'Tín hiệu cuối tiết cho việc nối sang tiết sau.',
      teacherNextActions: ['Chọn 1-2 ticket phản hồi miệng', 'Đóng phiên'],
    },
  ];
}

function buildTaskVariants(): TaskVariant[] {
  return [
    {
      id: 'task-M',
      route: 'M',
      prompt: 'Dùng hình đã cho để xác định miền nghiệm của 3x + 2y ≤ 30 và kiểm tra hai điểm.',
      scaffoldSetId: 'scaffold-M',
      successCriteria: [...SHARED_SUCCESS_CRITERIA],
      postCheckId: 'cp-postcheck-m',
    },
    {
      id: 'task-S',
      route: 'S',
      prompt: 'Từ bất phương trình 3x + 2y ≤ 30, nối biểu thức, đường biên và miền nghiệm trên hình.',
      scaffoldSetId: 'scaffold-S',
      successCriteria: [...SHARED_SUCCESS_CRITERIA],
      postCheckId: 'cp-postcheck-s',
    },
    {
      id: 'task-C',
      route: 'C',
      prompt: 'Tạo một phản ví dụ cho kết luận sai về miền nghiệm rồi chứng minh bằng phép thay điểm.',
      scaffoldSetId: 'scaffold-C',
      successCriteria: [...SHARED_SUCCESS_CRITERIA],
      postCheckId: 'cp-postcheck-c',
      extension: 'Xét thêm khi dấu ≤ đổi thành < thì đường biên thay đổi vai trò như thế nào.',
    },
  ];
}

// Nội dung TRÌNH CHIẾU cho từng cue. Đây là chữ học sinh đọc trên TV, nên viết
// thành câu đầy đủ; KHÔNG lấy từ boardLarge/boardSide (đó là ghi chú tốc ký cho
// giáo viên viết bảng: "Giữ mô hình + định nghĩa", "LỖI CẦN SOI: dấu ≤ | thay
// cặp") và KHÔNG bao giờ lấy từ teacherScript.
interface TvSlideCopy { label: string; title: string; body: string; action: string }

const TV_SLIDES: Record<string, TvSlideCopy> = {
  P00: {
    label: 'MỞ ĐẦU',
    title: 'TÌNH HUỐNG MỞ ĐẦU',
    body: [
      'Em có 150 nghìn đồng để mua bánh và nước cho nhóm.',
      'Mỗi chiếc bánh 15 nghìn đồng. Mỗi chai nước 10 nghìn đồng.',
      'Số tiền phải trả không được vượt quá số tiền em đang có.',
      'Làm sao mô tả mọi cách chọn hợp lệ mà không phải thử từng cách?',
    ].join('\n'),
    action: 'Nghĩ 30 giây rồi nói dự đoán của em với bạn bên cạnh. Chưa cần mở máy.',
  },
  P03: {
    label: 'MỤC TIÊU CÁ NHÂN',
    title: 'CUỐI TIẾT EM MUỐN LÀM ĐƯỢC GÌ?',
    body: [
      'Cuối tiết này, em muốn tự làm được điều gì khi gặp một bất phương trình hai ẩn?',
      'Ví dụ: em muốn tự kiểm tra được một cách chọn có hợp lệ hay không.',
      'Ví dụ: em muốn giải thích được vì sao một cách chọn bị loại.',
    ].join('\n'),
    action: 'Mở màn hình của em: chọn 1–2 mục tiêu, hoặc viết một câu ngắn của riêng em.',
  },
  P05: {
    label: 'MỤC TIÊU CHUNG',
    title: 'MỤC TIÊU CHUNG CỦA LỚP',
    body: [
      '1. Viết được bất phương trình mô tả điều kiện của bài toán.',
      '2. Chỉ ra đường biên và mô tả miền nghiệm bằng hình, ký hiệu hoặc lời nói.',
      '3. Kiểm tra được một điểm có thuộc miền nghiệm hay không.',
      '4. Giải thích kết luận bằng một câu có căn cứ.',
    ].join('\n'),
    action: 'So mục tiêu em vừa viết với bốn mục tiêu này. Chỗ nào chưa rõ thì hỏi ngay.',
  },
  P08: {
    label: 'HÌNH THÀNH',
    title: 'ĐƯỜNG BIÊN VÀ MIỀN NGHIỆM',
    body: [
      'Gọi x là số chiếc bánh, y là số chai nước. Điều kiện của bài toán: 15x + 10y ≤ 150.',
      'Đường biên là đường thẳng 15x + 10y = 150.',
      'Miền nghiệm là tất cả các điểm (x ; y) làm bất phương trình trở thành mệnh đề đúng.',
      'Câu hỏi: vì sao dấu ở đây là ≤ chứ không phải < ?',
    ].join('\n'),
    action: 'Vẽ trục toạ độ và đường biên vào vở. Ghi lại bốn từ khoá đang có trên bảng.',
  },
  P16: {
    label: 'TƯ DUY PHẢN BIỆN',
    title: 'KIỂM CHỨNG LỜI GIẢI CỦA AI',
    body: [
      'Lời giải của AI cần kiểm:',
      'Với (6 ; 7) ta có 15 · 6 + 10 · 7 = 160. Vì 160 ≤ 150 nên (6 ; 7) là phương án hợp lệ.',
      'Em có đồng ý với kết luận này không?',
      'Chỉ ra bước đáng nghi, rồi dùng một phép tính để chứng minh điều em nói.',
    ].join('\n'),
    action: 'Trên máy: chọn loại lỗi trước khi thảo luận. Sau đó ghi bước sửa vào vở.',
  },
  P19: {
    label: 'HỢP TÁC',
    title: 'CHIA NHÓM LÀM VIỆC',
    body: [
      'Mỗi nhóm nhận một mã nhóm và một nhiệm vụ.',
      'Các nhóm khác nhau ở chỗ cần hỗ trợ, không phải ở việc ai giỏi hơn ai.',
      'Câu hỏi lớn của cả lớp vẫn là một.',
    ].join('\n'),
    action: 'Xem mã nhóm trên máy của em, rồi di chuyển theo sơ đồ chỗ ngồi.',
  },
  P20: {
    label: 'HỢP TÁC',
    title: 'NHIỆM VỤ NHÓM',
    body: [
      'Câu hỏi chung: làm sao biết một điểm có thuộc miền nghiệm mà không cần nhìn đáp án?',
      'Bài của nhóm đạt khi có đủ ba điều:',
      '1. Nói rõ x và y là gì. 2. Dùng đúng dấu của bất phương trình. 3. Kết luận có kèm căn cứ.',
    ].join('\n'),
    action: 'Đặt thiết bị xuống khi cả nhóm cùng giải thích. Khung câu: “Điểm ___ thuộc miền vì ___.”',
  },
  P27: {
    label: 'ĐÁNH GIÁ LẠI',
    title: 'TỰ KIỂM TRA CÁ NHÂN',
    body: [
      'Cho bất phương trình 2x + y ≤ 12.',
      'Điểm (5 ; 3) có thuộc miền nghiệm không? Vì sao?',
      'Làm một mình: thay toạ độ, so sánh hai vế, rồi kết luận.',
    ].join('\n'),
    action: 'Tự làm và gửi câu trả lời của riêng em. Bước này không hỏi nhóm.',
  },
  P30: {
    label: 'PHÂN HÓA',
    title: 'BA CỬA VÀO, MỘT ĐÍCH ĐẾN',
    body: [
      'M — Củng cố: kiểm tra một điểm cho trước và giải thích kết luận.',
      'S — Chuẩn: tự lập bất phương trình rồi mô tả miền nghiệm.',
      'C — Thử thách: thêm điều kiện x và y là số nguyên không âm.',
      'Ba chỗ dễ sai: nhầm dấu ≤ với < ; thay nhầm x với y ; bỏ quên điều kiện của bài toán.',
    ].join('\n'),
    action: 'Chọn tuyến trên máy, làm bài, dùng nhiều nhất một gợi ý rồi tự hoàn thiện.',
  },
  P35: {
    label: 'CHỐT TOÁN',
    title: 'CHỐT LẠI VÀ PHẢN VÍ DỤ',
    body: [
      'Một mô hình toán học chỉ có nghĩa khi đã nói rõ x và y là gì.',
      'Một điểm là nghiệm khi thay toạ độ vào ta được một mệnh đề đúng.',
      'Một phản ví dụ là đủ để bác bỏ một kết luận.',
    ].join('\n'),
    action: 'Đối chiếu với mục tiêu em viết đầu tiết. Sửa lại vở nếu cần.',
  },
  P38: {
    label: 'KẾT THÚC',
    title: 'EXIT TICKET',
    body: [
      'Viết hai câu trước khi rời lớp:',
      '1. Một điều em đã hiểu, kèm một căn cứ.',
      '2. Một điều em còn cần kiểm chứng.',
      'Tiết sau: biểu diễn miền nghiệm trên mặt phẳng toạ độ.',
    ].join('\n'),
    action: 'Gửi exit ticket trên máy của em, rồi giữ vở mở.',
  },
};

const TV_SLIDE_FALLBACK: TvSlideCopy = {
  label: 'LIVE CLASSROOM',
  title: 'THEO DÕI HƯỚNG DẪN',
  body: 'Nghe hướng dẫn của thầy cô và chuẩn bị cho hoạt động tiếp theo.',
  action: 'Giữ vở mở và chờ bước tiếp theo.',
};

function buildPublicTvScreens(timeline: TimelineBlock[]): PublicTvScreen[] {
  return timeline.map((block) => {
    const copy = TV_SLIDES[block.id] ?? TV_SLIDE_FALLBACK;
    return { screenId: block.tvScreenId, label: copy.label, title: copy.title, body: copy.body, action: copy.action };
  });
}

export function getG10P31V4Contract(): LiveLessonV4Contract {
  const timeline = buildTimeline();
  return {
    schemaVersion: 4,
    id: 'g10_w5_p31_bpt_tiet1_v4',
    lessonId: 'g10_w5_p31_bpt_tiet1',
    title: 'Bất phương trình bậc nhất hai ẩn — Tiết 1',
    durationSeconds: 2400,
    timeline,
    publicTvScreens: buildPublicTvScreens(timeline),
    objectives: {
      math: [
        { id: 'obj-math-1', kind: 'math', text: 'Lập được bất phương trình bậc nhất hai ẩn từ bối cảnh đơn giản.' },
        { id: 'obj-math-2', kind: 'math', text: 'Nhận biết đường biên và mô tả miền nghiệm bằng hình/ký hiệu/lời nói.' },
        { id: 'obj-math-3', kind: 'math', text: 'Kiểm tra được một điểm có thuộc miền nghiệm hay không.' },
      ],
      language: [
        { id: 'obj-lang-1', kind: 'language', text: 'Dùng đúng các thuật ngữ bất phương trình, đường biên, miền nghiệm.' },
        { id: 'obj-lang-2', kind: 'language', text: 'Giải thích một kết luận bằng khung câu có bằng chứng.' },
      ],
      studentGoalPrompt: 'Cuối tiết, em muốn tự làm được điều gì khi gặp một bất phương trình hai ẩn?',
      teacherSynthesisPrompt: 'Câu hỏi chung: làm sao mô tả tất cả phương án phù hợp mà không thử từng phương án?',
    },
    languageDemands: [
      {
        stepId: 'P08',
        terms: ['bất phương trình', 'đường biên', 'miền nghiệm', 'điểm thuộc miền nghiệm'],
        sentenceFrames: ['Điểm ___ thuộc miền nghiệm vì ___.', 'Đường biên là ___ nên ___.'],
      },
      {
        stepId: 'P20',
        terms: ['miền nghiệm', 'đường biên'],
        sentenceFrames: ['Nhóm em chọn miền phía ___ vì điểm kiểm tra ___ cho kết quả ___.'],
      },
    ],
    glossary: buildGlossary(),
    curriculumBridges: [
      {
        id: 'bridge-halfplane',
        priorNotation: 'half-plane / shaded region',
        vietnameseEquivalent: 'nửa mặt phẳng / miền nghiệm của bất phương trình',
        example: '3x + 2y ≤ 30 biểu diễn nửa mặt phẳng chứa các điểm thỏa điều kiện.',
        nonExample: 'Chỉ vẽ đường thẳng 3x + 2y = 30 mà không chọn phía thì chưa có miền nghiệm.',
        selfCheckQuestion: 'Nếu thay (0;0) vào được mệnh đề đúng, em tô phía nào của đường biên?',
      },
    ],
    scaffoldSets: buildScaffoldSets(),
    fading: [
      { stepId: 'P20', maxHints: 1, note: 'Ưu tiên hỏi trực tiếp trước khi mở gợi ý thứ hai.' },
      { stepId: 'P30', maxHints: 1, note: 'Nhiệm vụ cá nhân chỉ dùng tối đa một gợi ý.' },
    ],
    evidenceRules: [
      { id: 'er-goal-language', sourceStepId: 'P03', dimension: 'languageAccess', minConfidence: 0.4 },
      { id: 'er-ai-reasoning', sourceStepId: 'P16', dimension: 'reasoning', minConfidence: 0.6 },
      { id: 'er-postcheck-concept', sourceStepId: 'P27', dimension: 'concept', minConfidence: 0.7 },
      { id: 'er-route-autonomy', sourceStepId: 'P30', dimension: 'autonomyCollaboration', minConfidence: 0.5 },
    ],
    checkpoints: buildCheckpoints(),
    taskVariants: buildTaskVariants(),
    groupingCheckpoints: [
      {
        id: 'grp-p19-same-need',
        stepId: 'P19',
        purpose: 'same_need_workshop',
        minGroupSize: 3,
        maxGroupSize: 4,
        sharedQuestion: 'Làm sao biết một điểm có thuộc miền nghiệm mà không nhìn đáp án?',
        rubric: SHARED_SUCCESS_CRITERIA,
        postCheckId: 'cp-postcheck-m',
      },
    ],
    aiError: {
      id: 'ai-error-w01',
      stepId: 'P16',
      category: 'Logical',
      faultyStatement: 'Với (6;7), 15·6 + 10·7 = 160. Vì 160 ≤ 150 nên (6;7) là phương án hợp lệ.',
      correction: '160 > 150 nên (6;7) không thỏa điều kiện ngân sách và không thuộc miền nghiệm.',
      proof: 'Thay (6;7) vào 15x + 10y ≤ 150 được 160 ≤ 150, đây là mệnh đề sai.',
    },
    projections: {
      teacher: { fields: ['cueId', 'script', 'board', 'checkpoint', 'grouping', 'evidence'] },
      tv: {
        screenIds: ['S1', 'S3', 'S4', 'S7', 'S8', 'S9', 'S10', 'S11'],
        fields: [
          'cueId',
          'screenId',
          'status',
          'showStats',
          'participantCount',
          'submittedCount',
          'routeCounts',
          'errorCategoryCounts',
          'groupProgress',
          'updatedAt',
        ],
        maxStatCards: 4,
      },
      student: { fields: ['cueId', 'task', 'glossary', 'scaffold', 'ownResponse', 'languageView'] },
    },
    offline: {
      tvCuesIncluded: true,
      glossaryPrintIncluded: true,
      boardPlanIncluded: true,
      aiErrorAnswerKeyIncluded: true,
      routeCards: ['M', 'S', 'C'],
      manualGroupingSheet: true,
      paperExitTicket: true,
    },
    publication: {
      glossaryApproved: true,
      aiErrorReviewed: true,
      offlineReady: true,
      reviewedBy: 'pilot-v4-fixture-review',
    },
    version: '2026-08-27-task2-pilot',
  };
}
