import { getPilotLiveLessonDefinition } from './definition';
import type {
  AdaptiveAssessment,
  AdaptiveLesson,
  AdaptiveQuestion,
  DifficultyLevel,
  KnowledgeUnit,
  LearningObjective,
  LearningRoute,
  LearningRouteContent,
} from '../adaptive/types';

type QuestionInput = Pick<AdaptiveQuestion, 'id' | 'type' | 'prompt' | 'correctAnswer' | 'explanation' | 'objectiveIds' | 'difficulty' | 'points'> & {
  options?: string[];
};

type RouteInput = {
  route: LearningRoute;
  explanation: string;
  exampleTitle: string;
  exampleProblem: string;
  exampleSolution: string;
  exampleExplanation: string;
  practicePrompt: string;
  practiceAnswer: string;
  hints: string[];
  difficulty: DifficultyLevel;
  objectiveIds: string[];
};

const makeQuestion = (input: QuestionInput): AdaptiveQuestion => ({
  ...input,
  options: input.options ? [...input.options] : undefined,
});

const makeAssessment = (
  id: string,
  title: string,
  purpose: AdaptiveAssessment['purpose'],
  durationMinutes: number,
  questions: AdaptiveQuestion[],
): AdaptiveAssessment => ({
  id,
  title,
  purpose,
  durationMinutes,
  questions,
});

const makeRouteContent = (input: RouteInput): LearningRouteContent => ({
  route: input.route,
  explanation: input.explanation,
  workedExamples: [{
    id: `${input.route}-example`,
    title: input.exampleTitle,
    problem: input.exampleProblem,
    solution: input.exampleSolution,
    explanation: input.exampleExplanation,
    objectiveIds: [...input.objectiveIds],
    timeLimitSeconds: 120,
    hintDelaySeconds: 45,
    hints: [...input.hints],
    responseMode: 'short_text',
  }],
  practiceTasks: [{
    id: `${input.route}-practice`,
    prompt: input.practicePrompt,
    expectedAnswer: input.practiceAnswer,
    hints: [...input.hints],
    objectiveIds: [...input.objectiveIds],
    difficulty: input.difficulty,
  }],
});

const makeObjective = (
  id: string,
  code: string,
  title: string,
  description: string,
  bloomLevel: LearningObjective['bloomLevel'],
  remediationHint: string,
): LearningObjective => ({
  id,
  code,
  title,
  description,
  bloomLevel,
  masteryThreshold: bloomLevel === 'analyze' ? 0.8 : 0.7,
  prerequisiteObjectiveIds: [],
  commonMisconceptions: [{
    id: `${id}-misconception`,
    title: 'Bỏ qua ý nghĩa của biến hoặc điều kiện bối cảnh',
    description: 'Học sinh viết biểu thức nhưng chưa giải thích đại lượng đang được đếm và điều kiện đi kèm.',
    remediationHint,
  }],
});

const makeKnowledgeUnit = (
  id: string,
  title: string,
  objectiveIds: string[],
  hookQuestion: string,
  knowledgeConclusion: string,
  routes: RouteInput[],
  quickCheck: AdaptiveQuestion[],
): KnowledgeUnit => ({
  id,
  title,
  objectiveIds: [...objectiveIds],
  estimatedMinutes: 6,
  hookQuestion,
  knowledgeConclusion,
  routes: routes.map(makeRouteContent),
  quickCheck: makeAssessment(`${id}-quick-check`, `Kiểm tra nhanh — ${title}`, 'quick_check', 3, quickCheck),
  maxRemediationAttempts: 2,
  supportTasks: [],
  enrichmentTasks: [],
  externalToolIds: [],
});

export const buildPilotAdaptiveLesson = (
  teacherId: string,
  now = new Date().toISOString(),
): AdaptiveLesson => {
  if (!teacherId.trim()) throw new Error('teacherId phải là chuỗi không rỗng.');

  const liveDefinition = getPilotLiveLessonDefinition();
  const durationMinutes = liveDefinition.durationSeconds / 60;
  if (durationMinutes !== 40) {
    throw new Error(`Pilot lesson phải có 40 phút, nhận được ${durationMinutes}.`);
  }
  const objectives = [
    makeObjective(
      'G1',
      'G1',
      'Kiểm tra một cặp số có thỏa điều kiện hay không',
      'Học sinh thay một cặp số vào bất phương trình và nêu kết luận có căn cứ.',
      'apply',
      'Viết phép thay đầy đủ rồi so sánh kết quả với vế phải của bất phương trình.',
    ),
    makeObjective(
      'G2',
      'G2',
      'Lập bất phương trình bậc nhất hai ẩn từ tình huống có giới hạn',
      'Học sinh xác định ý nghĩa của x, y và chọn dấu phù hợp với điều kiện không vượt quá.',
      'apply',
      'Nói thành câu: x là gì, y là gì, tổng đại lượng nào không vượt quá bao nhiêu.',
    ),
    makeObjective(
      'G3',
      'G3',
      'Giải thích nghiệm của bất phương trình',
      'Học sinh giải thích được một cặp số là nghiệm khi thay vào làm bất phương trình đúng và phù hợp bối cảnh.',
      'analyze',
      'Tách hai việc: kiểm tra bất phương trình và kiểm tra điều kiện của đại lượng trong tình huống.',
    ),
  ];

  const diagnosticQuestions = [
    makeQuestion({
      id: 'pilot-dq-1',
      type: 'multiple_choice',
      prompt: 'Với ngân sách không vượt quá 150 nghìn đồng, dấu nào phù hợp nhất?',
      options: ['≤', '=', '≥', '>'],
      correctAnswer: '≤',
      explanation: '“Không vượt quá” nghĩa là nhỏ hơn hoặc bằng.',
      objectiveIds: ['G2'],
      difficulty: 'easy',
      points: 1,
    }),
    makeQuestion({
      id: 'pilot-dq-2',
      type: 'multiple_choice',
      prompt: 'Với 15x + 10y ≤ 150, cặp (4;9) có là nghiệm không?',
      options: ['Có', 'Không', 'Chưa đủ dữ kiện', 'Chỉ khi x = y'],
      correctAnswer: 'Có',
      explanation: '15·4 + 10·9 = 150 nên mệnh đề 150 ≤ 150 đúng.',
      objectiveIds: ['G1', 'G3'],
      difficulty: 'easy',
      points: 1,
    }),
    makeQuestion({
      id: 'pilot-dq-3',
      type: 'multiple_choice',
      prompt: 'Trong bài mua bánh và nước, x và y nên là loại số nào?',
      options: ['Số nguyên không âm', 'Mọi số thực', 'Số nguyên âm', 'Chỉ số dương'],
      correctAnswer: 'Số nguyên không âm',
      explanation: 'x, y là số lượng đồ vật nên phải nguyên và không âm.',
      objectiveIds: ['G2', 'G3'],
      difficulty: 'easy',
      points: 1,
    }),
    makeQuestion({
      id: 'pilot-dq-4',
      type: 'short_answer',
      prompt: 'Viết một câu giải thích vì sao (6;7) không phù hợp với 15x + 10y ≤ 150.',
      correctAnswer: '15·6 + 10·7 = 160 > 150 nên (6;7) không là nghiệm.',
      explanation: 'Kết quả 160 vượt ngân sách nên bất phương trình không đúng.',
      objectiveIds: ['G1', 'G3'],
      difficulty: 'medium',
      points: 1,
    }),
  ];

  const knowledgeUnits = [
    makeKnowledgeUnit(
      'pilot-unit-model',
      'Mảnh 1: Từ tình huống đến bất phương trình',
      ['G2'],
      'Làm thế nào viết được điều kiện cho tất cả phương án không vượt ngân sách?',
      'Nếu x, y là số lượng bánh và nước thì 15x + 10y ≤ 150; dấu ≤ diễn tả “không vượt quá”.',
      [
        {
          route: 'foundation',
          explanation: 'Tách dữ kiện thành đại lượng và số tiền tương ứng; sau đó chọn dấu theo cụm từ “không vượt quá”.',
          exampleTitle: 'Đặt biến và chọn dấu',
          exampleProblem: 'Một chiếc bánh 15 nghìn và một chai nước 10 nghìn; ngân sách 150 nghìn. Đặt x, y và lập điều kiện.',
          exampleSolution: 'x là số bánh, y là số chai nước. Tổng tiền là 15x + 10y và điều kiện là 15x + 10y ≤ 150.',
          exampleExplanation: 'Biến phải có ý nghĩa trước khi viết biểu thức.',
          practicePrompt: 'Một bút 8 nghìn và một vở 12 nghìn, ngân sách 100 nghìn. Đặt biến và lập bất phương trình.',
          practiceAnswer: 'x là số bút, y là số vở; 8x + 12y ≤ 100; x,y là số nguyên không âm.',
          hints: ['Viết rõ x và y đang đếm gì.', '“Không vượt quá” dùng dấu ≤.'],
          difficulty: 'easy',
          objectiveIds: ['G2'],
        },
        {
          route: 'standard',
          explanation: 'Mô hình cần có ba lớp: ý nghĩa biến, biểu thức tổng và dấu thể hiện giới hạn.',
          exampleTitle: 'Mô hình hóa một giới hạn',
          exampleProblem: 'Một quyển vở 20 nghìn, một cây bút 15 nghìn; ngân sách 200 nghìn. Lập mô hình.',
          exampleSolution: 'Đặt x là số vở, y là số bút. Khi đó 20x + 15y ≤ 200, với x,y ∈ ℤ≥0.',
          exampleExplanation: 'Điều kiện nguyên không âm đến từ việc x, y là số lượng đồ vật.',
          practicePrompt: 'Vé loại 1 giá 2 điểm, vé loại 2 giá 3 điểm, ngân sách không quá 18 điểm. Lập mô hình.',
          practiceAnswer: '2x + 3y ≤ 18, x,y ∈ ℤ≥0; x, y lần lượt là số vé loại 1 và loại 2.',
          hints: ['Đặt biến bằng một câu đầy đủ.', 'Thêm điều kiện x,y nguyên không âm vì đây là số lượng.'],
          difficulty: 'medium',
          objectiveIds: ['G2'],
        },
        {
          route: 'challenge',
          explanation: 'Không chỉ viết bất phương trình; cần kiểm tra mô hình có phản ánh đúng mọi điều kiện của tình huống không.',
          exampleTitle: 'Mô hình và miền bối cảnh',
          exampleProblem: 'Một nhóm mua hai loại vé 2 điểm và 3 điểm, tổng không quá 18 điểm. Nêu mô hình và điều kiện.',
          exampleSolution: 'Đặt x,y là số vé loại 1, loại 2. Mô hình 2x + 3y ≤ 18 với x,y ∈ ℤ≥0.',
          exampleExplanation: 'Một cặp số chỉ có ý nghĩa trong bài toán khi vừa thỏa bất phương trình vừa thỏa điều kiện bối cảnh.',
          practicePrompt: 'Hãy giải thích vì sao mô hình 2x + 3y = 18 không mô tả tất cả phương án “không quá 18 điểm”.',
          practiceAnswer: 'Dấu = chỉ giữ các phương án dùng đúng 18 điểm, còn dấu ≤ bao gồm cả phương án dùng ít hơn 18 điểm.',
          hints: ['So sánh “đúng bằng” với “không vượt quá”.', 'Tìm một phương án dùng ít hơn 18 điểm để phản ví dụ.'],
          difficulty: 'hard',
          objectiveIds: ['G2', 'G3'],
        },
      ],
      [
        makeQuestion({
          id: 'pilot-u1-q1',
          type: 'multiple_choice',
          prompt: 'Câu nào mô tả đúng “không vượt quá 150”?',
          options: ['Tổng ≤ 150', 'Tổng = 150', 'Tổng ≥ 150', 'Tổng > 150'],
          correctAnswer: 'Tổng ≤ 150',
          explanation: 'Không vượt quá bao gồm cả trường hợp bằng 150 và nhỏ hơn 150.',
          objectiveIds: ['G2'],
          difficulty: 'easy',
          points: 1,
        }),
        makeQuestion({
          id: 'pilot-u1-q2',
          type: 'short_answer',
          prompt: 'Viết điều kiện của x,y trong bài đếm số bánh và số chai nước.',
          correctAnswer: 'x,y là số nguyên không âm.',
          explanation: 'Số lượng đồ vật không thể là số âm hay số lẻ thập phân.',
          objectiveIds: ['G2'],
          difficulty: 'easy',
          points: 1,
        }),
      ],
    ),
    makeKnowledgeUnit(
      'pilot-unit-solution',
      'Mảnh 2: Kiểm tra và giải thích nghiệm',
      ['G1', 'G3'],
      'Một cặp số trở thành nghiệm bằng cách nào, và vì sao chỉ nhìn vào kết quả tính là chưa đủ?',
      'Cặp (x₀;y₀) là nghiệm khi thay vào làm bất phương trình đúng và đồng thời phù hợp điều kiện bối cảnh.',
      [
        {
          route: 'foundation',
          explanation: 'Thay từng giá trị vào biểu thức, tính vế trái rồi so sánh với vế phải.',
          exampleTitle: 'Kiểm tra một cặp số',
          exampleProblem: 'Kiểm tra (4;9) với 15x + 10y ≤ 150.',
          exampleSolution: '15·4 + 10·9 = 60 + 90 = 150 ≤ 150. Vậy (4;9) là nghiệm.',
          exampleExplanation: 'Kết luận phải đi cùng phép thay và dấu so sánh.',
          practicePrompt: 'Kiểm tra (2;12) với 15x + 10y ≤ 150.',
          practiceAnswer: '15·2 + 10·12 = 150 ≤ 150 nên (2;12) là nghiệm.',
          hints: ['Tính 15·2 + 10·12.', 'So sánh kết quả với 150 rồi viết kết luận.'],
          difficulty: 'easy',
          objectiveIds: ['G1', 'G3'],
        },
        {
          route: 'standard',
          explanation: 'Một lời giải thuyết phục cần chỉ ra phép tính, mệnh đề sau khi thay và kết luận đúng chiều.',
          exampleTitle: 'Phân biệt nghiệm và không nghiệm',
          exampleProblem: 'Kiểm tra (6;7) với 15x + 10y ≤ 150.',
          exampleSolution: '15·6 + 10·7 = 90 + 70 = 160. Vì 160 ≤ 150 là sai nên (6;7) không là nghiệm.',
          exampleExplanation: 'Không được đổi “160 > 150” thành “thỏa 160 ≤ 150”.',
          practicePrompt: 'Kiểm tra (5;6) với 20x + 15y ≤ 200 và giải thích kết luận.',
          practiceAnswer: '20·5 + 15·6 = 190 ≤ 200 nên (5;6) là nghiệm.',
          hints: ['Tính vế trái trước.', 'Giữ nguyên dấu ≤ khi đưa ra kết luận.'],
          difficulty: 'medium',
          objectiveIds: ['G1', 'G3'],
        },
        {
          route: 'challenge',
          explanation: 'Nghiệm của mô hình thực tế phải đồng thời thỏa bất phương trình và miền bối cảnh nguyên không âm.',
          exampleTitle: 'Nghiệm toán học và nghiệm phù hợp bối cảnh',
          exampleProblem: 'Với 2x + 3y ≤ 18, kiểm tra (3;2) và giải thích vai trò của điều kiện x,y.',
          exampleSolution: '2·3 + 3·2 = 12 ≤ 18; 3,2 là số nguyên không âm. Vậy (3;2) là nghiệm phù hợp bối cảnh.',
          exampleExplanation: 'Nếu một cặp thỏa bất phương trình nhưng có số âm hoặc không nguyên thì không phù hợp với bài toán đếm.',
          practicePrompt: 'Cho 2x + 3y ≤ 18. Vì sao (10;-1) không được xem là phương án mua vé dù 2·10 + 3·(-1) = 17 ≤ 18?',
          practiceAnswer: 'Cặp này không phù hợp vì y = -1 là số âm, trong khi y là số vé và phải là số nguyên không âm.',
          hints: ['Kiểm tra bất phương trình chưa đủ.', 'Nhắc lại ý nghĩa của y trong bối cảnh.'],
          difficulty: 'hard',
          objectiveIds: ['G1', 'G3'],
        },
      ],
      [
        makeQuestion({
          id: 'pilot-u2-q1',
          type: 'multiple_choice',
          prompt: 'Với 15x + 10y ≤ 150, (6;7) là nghiệm vì 160 > 150. Nhận xét nào đúng?',
          options: ['Sai: 160 ≤ 150 là mệnh đề sai', 'Đúng vì 160 lớn hơn 150', 'Đúng nếu x,y nguyên', 'Chưa đủ dữ kiện'],
          correctAnswer: 'Sai: 160 ≤ 150 là mệnh đề sai',
          explanation: 'Đây là lỗi đảo chiều kết luận sau phép thay.',
          objectiveIds: ['G1', 'G3'],
          difficulty: 'medium',
          points: 1,
        }),
        makeQuestion({
          id: 'pilot-u2-q2',
          type: 'short_answer',
          prompt: 'Nêu hai điều cần kiểm tra để một cặp số là nghiệm phù hợp bối cảnh.',
          correctAnswer: 'Thỏa bất phương trình và thỏa điều kiện bối cảnh.',
          explanation: 'Cần kiểm tra cả mệnh đề toán học và ý nghĩa của biến.',
          objectiveIds: ['G3'],
          difficulty: 'medium',
          points: 1,
        }),
      ],
    ),
  ];

  return {
    id: liveDefinition.lessonId,
    title: liveDefinition.title,
    subjectId: 'math',
    grade: '10',
    durationMinutes: 40,
    status: 'published',
    teacherId,
    createdAt: now,
    updatedAt: now,
    curriculumRef: {
      programType: 'TDS',
      week: '5',
      period: 31,
      textbook: 'TDS Toán 10 — Tập 1',
      chapter: 'Bất phương trình và hệ bất phương trình bậc nhất hai ẩn',
      lessonCode: liveDefinition.lessonId,
    },
    preparation: {
      readingInstructions: 'Đọc tình huống mua bánh và nước; ghi lại điều em muốn biết về các phương án phù hợp với ngân sách.',
      guidingQuestions: [
        'Làm thế nào mô tả điều kiện của tất cả các phương án phù hợp mà không phải thử từng phương án?',
        'Vì sao “không vượt quá” dùng dấu ≤?',
        'Một cặp số là nghiệm khi nào?',
      ],
      estimatedMinutes: 5,
      engage: {
        storyHook: 'Một nhóm có 150 nghìn đồng để mua bánh và nước cho hoạt động lớp.',
        realityCheckMessage: 'Không phải phương án nào cũng vừa ngân sách; ta cần một cách mô tả có hệ thống.',
        guidingQuestion: 'Làm thế nào mô tả điều kiện của tất cả các phương án phù hợp mà không phải thử từng phương án?',
        guidingQuestionBox: 'Bắt đầu từ một cặp số: em cần kiểm tra điều gì để biết nó phù hợp?',
        bigTitle: 'Bất phương trình bậc nhất hai ẩn',
        studentExpectationPrompt: 'Em muốn sau tiết học mình làm được điều gì? Chọn G1, G2 hoặc G3.',
        routeGoals: {
          foundation: 'G1: kiểm tra một cặp số bằng phép thay.',
          standard: 'G2: lập mô hình có biến và dấu đúng.',
          challenge: 'G3: giải thích nghiệm gắn với bối cảnh.',
        },
      },
    },
    fiveStepFlow: {
      steps: [
        { id: 'pilot-step-connect', name: 'Kết nối', purpose: 'Kích hoạt tình huống ngân sách và câu hỏi của học sinh.', estimatedMinutes: 5, teacherRole: 'Nêu tình huống, thu câu hỏi và tổng hợp thành câu hỏi định hướng.', studentAction: 'Chọn cặp số, trao đổi căn cứ và nêu điều muốn biết.', systemSupport: 'Hiển thị bối cảnh, lựa chọn và câu hỏi định hướng.' },
        { id: 'pilot-step-diagnose', name: 'Chẩn đoán', purpose: 'Xác định điểm xuất phát về dấu, phép thay và điều kiện biến.', estimatedMinutes: 5, teacherRole: 'Đọc thống kê tổng hợp để chọn câu hỏi can thiệp.', studentAction: 'Làm bốn câu chẩn đoán ngắn.', systemSupport: 'Thu câu trả lời và phân tuyến hỗ trợ.' },
        { id: 'pilot-step-learn', name: 'Hình thành kiến thức', purpose: 'Xây dựng mô hình, khái niệm bất phương trình và nghiệm.', estimatedMinutes: 12, teacherRole: 'Dẫn dắt bằng câu hỏi, ghi chốt trên bảng lớn.', studentAction: 'Chọn mục tiêu cá nhân, trả lời và ghi minh chứng.', systemSupport: 'Hiển thị màn hình chung và gợi ý riêng theo lựa chọn.' },
        { id: 'pilot-step-practice', name: 'Luyện tập và điều chỉnh', purpose: 'Cho học sinh tự chọn tuyến M/S/C và sửa lỗi AI.', estimatedMinutes: 12, teacherRole: 'Theo dõi tín hiệu, hỗ trợ nhóm cần thiết và không công khai nhãn tuyến.', studentAction: 'Làm nhiệm vụ tuyến, kiểm chéo và sửa một lỗi.', systemSupport: 'Hiển thị gợi ý theo yêu cầu và thống kê tổng hợp realtime.' },
        { id: 'pilot-step-reflect', name: 'Phản tư', purpose: 'Đối chiếu câu hỏi định hướng với mục tiêu cá nhân.', estimatedMinutes: 6, teacherRole: 'Chốt biến, điều kiện, nghiệm và giao điểm xuất phát tiết sau.', studentAction: 'Làm exit ticket, tự đánh dấu mục tiêu đạt/chưa đạt.', systemSupport: 'Lưu tiến trình và tạo dữ liệu cho lần học sau.' },
      ],
    },
    objectives,
    knowledgeUnits,
    diagnosticTest: makeAssessment('pilot-diagnostic', 'Chẩn đoán đầu giờ — Bất phương trình hai ẩn', 'diagnostic', 5, diagnosticQuestions),
    exitTicket: makeAssessment('pilot-exit-ticket', 'Exit ticket — Biến, điều kiện và nghiệm', 'exit_ticket', 3, [
      makeQuestion({
        id: 'pilot-exit-q1',
        type: 'short_answer',
        prompt: 'Vé loại 1 có giá trị 2 điểm, vé loại 2 có giá trị 3 điểm, ngân sách không quá 18 điểm. Viết mô hình và điều kiện của x,y; hoặc giải thích “nghiệm” bằng một câu của em.',
        correctAnswer: '2x + 3y ≤ 18; x,y là số nguyên không âm; một cặp là nghiệm nếu thay vào làm bất phương trình đúng và phù hợp bối cảnh.',
        explanation: 'Câu trả lời cần chạm vào ý nghĩa biến, dấu ≤, điều kiện nguyên không âm và phép thay hoặc diễn giải nghiệm.',
        objectiveIds: ['G2', 'G3'],
        difficulty: 'medium',
        points: 3,
      }),
    ]),
    pacingPolicy: {
      minExitTicketMinutes: 3,
      aheadThresholdMinutes: 3,
      behindThresholdMinutes: 3,
      stuckAfterRemediationAttempts: 2,
      enrichmentTriggerMastery: 0.85,
      supportTriggerMastery: 0.55,
    },
    completionReward: {
      toolId: 'gamedoikhang',
      message: 'Em đã biến một tình huống thực tế thành điều kiện toán học có thể kiểm chứng.',
    },
    generationWarnings: ['Bài pilot được biên soạn sẵn để chạy thử realtime; không gọi AI khi cài vào Firestore.'],
  };
};
