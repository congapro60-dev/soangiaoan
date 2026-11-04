import type { LessonIRV83 } from './lessonIRSchema';
import type { SourceModel } from './sourceModel';
import type { ExperienceAuthoringPlanV1 } from './experienceAuthoring';

export const createSyntheticSourceModel = (): SourceModel => ({
  sourceHash: 'src_hash_1234567890abcdef',
  blocks: [
    {
      id: 'B1',
      sourceId: 'S1',
      sourceRole: 'teacher_lesson',
      text: '  Định lý sin trong tam giác: a/sinA = b/sinB = c/sinC = 2R.  ',
      locator: { kind: 'extracted_line', value: 'dinh-ly-sin', line: 1 },
      extractionConfidence: null,
    },
    {
      id: 'B2',
      sourceId: 'S1',
      sourceRole: 'teacher_lesson',
      text: 'Bài tập áp dụng định lý sin tính cạnh và góc tam giác.',
      locator: { kind: 'extracted_line', value: 'bai-tap', line: 2 },
      extractionConfidence: null,
    },
  ],
  claims: [
    {
      id: 'C1',
      sourceId: 'S1',
      sourceBlockId: 'B1',
      kind: 'math_expression',
      excerpt: '  Định lý sin trong tam giác  ',
      status: 'verified',
    },
  ],
  issues: [],
});

export const createValidSyntheticAuthoringPlan = (): ExperienceAuthoringPlanV1 => ({
  version: '1.0',
  experience: {
    version: '1.1',
    sourceHash: 'src_hash_1234567890abcdef',
    experienceArc: [
      { activityId: 'act-1', purpose: 'Khởi động và nêu tình huống thực tế', sourceBlockIds: ['B1'] },
      { activityId: 'act-2', purpose: 'Hình thành định lý sin', sourceBlockIds: ['B1'] },
      { activityId: 'act-3', purpose: 'Luyện tập giải tam giác', sourceBlockIds: ['B2'] },
      { activityId: 'act-4', purpose: 'Tổng kết và định hướng', sourceBlockIds: ['B2'] },
    ],
    archetype: {
      v871: 'KNOWLEDGE_FORMATION',
      canonicalBase: 'concept_formation',
      decision: 'LOSSLESS',
      rationale: 'Xây dựng định lý sin từ bài toán tam giác vuông mở rộng sang tam giác thường.',
      sourceClaimIds: ['C1'],
      sourceBlockIds: ['B1'],
    },
    reveal: {
      'act-1': { v871Policy: 'TEACHER_MANUAL', canonicalPolicy: 'teacher_manual', decision: 'LOSSLESS' },
      'act-2': { v871Policy: 'TEACHER_MANUAL', canonicalPolicy: 'teacher_manual', decision: 'LOSSLESS' },
      'act-3': { v871Policy: 'NO_REVEAL', canonicalPolicy: 'no_reveal', decision: 'LOSSLESS' },
      'act-4': { v871Policy: 'TEACHER_MANUAL', canonicalPolicy: 'teacher_manual', decision: 'LOSSLESS' },
    },
    timing: {
      slotDurationSec: 2700,
      coreBudgetSec: 2400,
      reserveBudgetSec: 300,
    },
    activities: {
      'act-1': {
        signature: {
          attentionTarget: 'PRESENTER',
          participationMode: 'WHOLE_CLASS',
          interactionPattern: 'Giáo viên trình chiếu bài toán mở đầu, học sinh quan sát suy nghĩ.',
          responseMode: 'SPEAK',
          visualMode: 'STATIC',
          physicalAction: 'POINT',
          evidenceType: 'Câu trả lời miệng của học sinh',
          transitionCue: 'Chuyển sang đo đạc tỉ số các cạnh',
        },
        handoff: {
          target: 'PRESENTER',
          entryCue: 'Quan sát hình vẽ ngọn hải đăng',
          deviceState: 'view_only',
          exitCue: 'Ghi nhận mâu thuẫn nhận thức',
          fallback: 'Vẽ hình lên bảng đen',
        },
        coreBudgetSec: 300,
        recoveryBudgetSec: 60,
        protectedEvidence: [],
        fastPath: { cuttable: false },
        repetitionRationale: null,
      },
      'act-2': {
        signature: {
          attentionTarget: 'BOARD',
          participationMode: 'INDIVIDUAL',
          interactionPattern: 'Học sinh chứng minh a/sinA = 2R cho tam giác nhọn.',
          responseMode: 'TEXT',
          visualMode: 'DYNAMIC',
          physicalAction: 'WRITE_PAPER',
          evidenceType: 'Lời giải trong vở ghi',
          transitionCue: 'Chuyển sang phát biểu định lý tổng quát',
        },
        handoff: {
          target: 'BOARD',
          entryCue: 'Vẽ đường kính qua đỉnh B',
          deviceState: 'interactive',
          exitCue: 'Định lý sin được phát biểu',
          fallback: 'Dùng bảng phụ in sẵn',
        },
        coreBudgetSec: 900,
        recoveryBudgetSec: 60,
        protectedEvidence: [],
        fastPath: { cuttable: false },
        repetitionRationale: null,
      },
      'act-3': {
        signature: {
          attentionTarget: 'STUDENT_DEVICE',
          participationMode: 'PAIR',
          interactionPattern: 'Học sinh thảo luận cặp đôi tính bán kính đường tròn ngoại tiếp.',
          responseMode: 'SELECT',
          visualMode: 'STATIC',
          physicalAction: 'TURN_AND_TALK',
          evidenceType: 'Kết quả trắc nghiệm và lời giải nháp',
          transitionCue: 'Chuyển sang kiểm tra mức độ đạt chuẩn',
        },
        handoff: {
          target: 'STUDENT_DEVICE',
          entryCue: 'Mở bài tập luyện tập 1',
          deviceState: 'interactive',
          exitCue: 'Nộp đáp án cặp đôi',
          fallback: 'Phát phiếu học tập giấy',
        },
        coreBudgetSec: 900,
        recoveryBudgetSec: 120,
        protectedEvidence: ['recheck'],
        fastPath: { cuttable: true },
        repetitionRationale: null,
      },
      'act-4': {
        signature: {
          attentionTarget: 'PRESENTER',
          participationMode: 'INDIVIDUAL',
          interactionPattern: 'Học sinh làm phiếu tự đánh giá và lắng nghe tổng kết.',
          responseMode: 'TEXT',
          visualMode: 'STATIC',
          physicalAction: 'WRITE_PAPER',
          evidenceType: 'Phiếu thoát và đánh giá mục tiêu',
          transitionCue: 'Kết thúc tiết học',
        },
        handoff: {
          target: 'PRESENTER',
          entryCue: 'Điền phiếu tự đánh giá',
          deviceState: 'view_only',
          exitCue: 'Giao bài tập về nhà',
          fallback: 'Hỏi đáp trực tiếp',
        },
        coreBudgetSec: 300,
        recoveryBudgetSec: 60,
        protectedEvidence: ['exit', 'selfAssessment', 'closing'],
        fastPath: { cuttable: false },
        repetitionRationale: null,
      },
    },
    visualOpportunityAudit: {
      spatial: true,
      parameter: true,
      representation: false,
      invariant: true,
      errorTrace: false,
      stepwiseReveal: true,
      decision: 'APPLICABLE',
      rationale: 'Tam giác ngoại tiếp đường tròn có tính chất góc nội tiếp chắn nửa đường tròn giữ nguyên tỉ số sin.',
      sourceClaimIds: ['C1'],
      sourceBlockIds: ['B1'],
    },
    capabilities: {
      collaboration: {
        lessonDecision: 'APPLICABLE',
        rationale: 'Học sinh làm việc cặp đôi ở hoạt động luyện tập tính toán cạnh.',
        sourceClaimIds: ['C1'],
        sourceBlockIds: ['B2'],
      },
      peerReview: {
        lessonDecision: 'NOT_APPLICABLE',
        rationale: 'Tiết học lý thuyết mới tập trung hình thành công thức, chưa bố trí chấm chéo lời giải.',
        sourceClaimIds: ['C1'],
        sourceBlockIds: ['B1'],
      },
    },
  },
  subjectProfile: {
    subject: 'Toán học',
    disciplinaryPractices: [
      'Lập luận và chứng minh hình học',
      'Mô hình hóa hình học giải tam giác',
    ],
    representationTypes: [
      'Hình vẽ hình học 2D',
      'Đẳng thức đại số',
    ],
    commonEvidenceForms: [
      'Lời giải tự luận trong vở',
      'Phiếu học tập cặp đôi',
    ],
    subjectSpecificValidation: [
      'Kiểm tra tính đúng đắn khi góc tù',
      'Bảo toàn bán kính đường tròn ngoại tiếp',
    ],
    sourceRefs: {
      sourceBlockIds: ['B1', 'B2'],
      sourceClaimIds: ['C1'],
    },
  },
  learningDesign: {
    learningIntention: {
      vi: 'Hiểu và vận dụng được định lý sin trong tam giác để tính cạnh và góc.',
      en: 'Understand and apply the Law of Sines in triangles to calculate sides and angles.',
    },
    successCriteria: [
      {
        id: 'SC1',
        statement: {
          vi: 'Phát biểu đúng định lý sin và viết đúng công thức a/sinA = b/sinB = c/sinC = 2R.',
          en: 'State the Law of Sines correctly and write the formula.',
        },
        observableEvidence: 'Viết công thức đúng trên vở và bảng.',
        mappedActivityRefs: ['act-2'],
      },
      {
        id: 'SC2',
        statement: {
          vi: 'Tính được độ dài cạnh và góc còn lại của tam giác khi biết 1 cạnh và 2 góc.',
          en: 'Calculate side length and remaining angles given one side and two angles.',
        },
        observableEvidence: 'Lời giải chính xác bài toán áp dụng.',
        mappedActivityRefs: ['act-3'],
      },
    ],
    intellectualDemand: {
      coreRichThinkingMoment: 'Nhận ra góc nội tiếp cùng chắn một cung có sin bằng nhau ngay cả khi đỉnh di chuyển trên đường tròn.',
      modes: ['model', 'justify'],
    },
    priorKnowledge: [
      'Hệ thức lượng trong tam giác vuông',
      'Góc nội tiếp và góc ở tâm của đường tròn',
    ],
    misconceptions: [
      {
        id: 'MIS1',
        description: 'Học sinh nhầm lẫn a/sinA = R thay vì 2R.',
        provenanceType: 'planning_assumption',
        evidenceRef: null,
        requiresTeacherConfirmation: true,
        responsePlan: 'Nhắc lại bán kính đường tròn ngoại tiếp liên hệ với đường kính 2R.',
      },
    ],
  },
  learningSourceRefs: {
    learningIntention: {
      sourceBlockIds: ['B1'],
      sourceClaimIds: ['C1'],
    },
    successCriteria: {
      SC1: {
        sourceBlockIds: ['B1'],
        sourceClaimIds: ['C1'],
      },
      SC2: {
        sourceBlockIds: ['B2'],
        sourceClaimIds: ['C1'],
      },
    },
  },
  activities: [
    {
      id: 'act-1',
      order: 1,
      title: { vi: 'Khởi động: Đo khoảng cách không tới được', en: 'Warm-up' },
      durationSec: 360,
      phase: 'opening',
      successCriteriaRefs: [],
      teacherAction: 'Giới thiệu bài toán xác định khoảng cách giữa hai điểm A và B bị ngăn cách bởi hồ nước.',
      studentAction: 'Quan sát sơ đồ tam giác, nhận xét dữ kiện đã biết và dữ kiện cần tính.',
      cognitiveDemand: 'Nhận diện tình huống thực tế dẫn tới nhu cầu giải tam giác không vuông.',
      expectedEvidence: 'Học sinh nêu được câu hỏi: Có tính được AB khi không đo trực tiếp được không?',
      successLookFor: 'Học sinh nêu được các góc đo được bằng giác kế và cạnh đo được trên bờ.',
      expectedProduct: 'Ghi chú câu hỏi mở đầu vào vở.',
      sourceRefs: { sourceBlockIds: ['B1'], sourceClaimIds: ['C1'] },
      potentialObstacles: [
        {
          id: 'OBS1',
          description: 'Học sinh cố áp dụng tỉ số lượng giác tam giác vuông cho tam giác thường.',
          provenanceType: 'planning_assumption',
          evidenceRef: null,
          requiresTeacherConfirmation: true,
          responsePlan: 'Hỏi tam giác trong hình có vuông không để học sinh tự nhận ra giới hạn.',
        },
      ],
      responsiveMoves: ['Vẽ thêm đường cao để phân tách tam giác thường thành hai tam giác vuông.'],
      discussionPrompt: 'Liệu có công thức nào liên hệ trực tiếp giữa cạnh và sin của góc đối diện trong tam giác bất kỳ?',
      formalization: null,
      notebookAction: 'Ghi đề bài toán thực tế và vẽ hình phác thảo.',
      transitionToNext: 'Từ việc kẻ đường kính của đường tròn ngoại tiếp, ta sẽ xây dựng công thức tổng quát.',
      offlineFallback: 'Sử dụng thước đo góc và thước đo độ dài trên bảng đen.',
      entrySec: 30,
      organizationSec: 30,
      transitionSec: 30,
      beats: [
        {
          id: 'b-1-1',
          phase: 'LAUNCH',
          roles: ['PROBLEM', 'GUIDING_QUESTION'],
          instruction: 'Quan sát bài toán đo khoảng cách và đặt câu hỏi định hướng.',
          expectedEvidence: 'Câu hỏi của học sinh về cách tính khoảng cách.',
          successCriteriaRefs: [],
          durationSec: 120,
        },
        {
          id: 'b-1-2',
          phase: 'DISCUSS',
          roles: ['LESSON_TITLE', 'LEARNER_GOAL', 'TEACHER_GOAL'],
          instruction: 'Giới thiệu tên bài học và mục tiêu cần đạt: Định lý sin trong tam giác.',
          expectedEvidence: null,
          successCriteriaRefs: [],
          durationSec: 150,
        },
      ],
    },
    {
      id: 'act-2',
      order: 2,
      title: { vi: 'Hình thành kiến thức: Định lý sin', en: 'Concept Formation' },
      durationSec: 960,
      phase: 'teaching',
      successCriteriaRefs: ['SC1'],
      teacherAction: 'Hướng dẫn học sinh dựng đường tròn ngoại tiếp tam giác ABC và vẽ đường kính BA\'.',
      studentAction: 'Chứng minh sinA = sinA\' = a/(2R), suy ra a/sinA = 2R.',
      cognitiveDemand: 'Chứng minh hình học suy luận từ tam giác vuông nội tiếp đường tròn.',
      expectedEvidence: 'Chứng minh hoàn chỉnh trong vở học sinh.',
      successLookFor: 'Lập luận đúng góc A = góc A\' vì cùng chắn cung BC, tam giác A\'BC vuông tại C.',
      expectedProduct: 'Công thức định lý sin hoàn chỉnh trong khung đóng.',
      sourceRefs: { sourceBlockIds: ['B1'], sourceClaimIds: ['C1'] },
      potentialObstacles: [
        {
          id: 'OBS2',
          description: 'Học sinh chưa rõ trường hợp góc A tù thì góc nội tiếp bù nhau.',
          provenanceType: 'unknown',
          evidenceRef: null,
          requiresTeacherConfirmation: true,
          responsePlan: 'Nhắc lại tính chất sin(180 - A) = sinA cho góc tù.',
        },
      ],
      responsiveMoves: ['Vẽ hình riêng cho trường hợp góc A tù và nhắc lại công thức lượng giác bù nhau.'],
      discussionPrompt: 'Nếu điểm A di chuyển trên cung lớn BC thì tỉ số a/sinA có thay đổi không? Vì sao?',
      formalization: 'Trong mọi tam giác ABC có bán kính đường tròn ngoại tiếp R: a/sinA = b/sinB = c/sinC = 2R.',
      notebookAction: 'Đóng khung định lý sin và vẽ hình minh họa tam giác nội tiếp đường tròn.',
      transitionToNext: 'Bây giờ ta áp dụng định lý sin để giải các bài toán cụ thể.',
      offlineFallback: 'Giáo viên vẽ hình chi tiết từng bước trên bảng chính.',
      entrySec: 20,
      organizationSec: 20,
      transitionSec: 20,
      beats: [
        {
          id: 'b-2-1',
          phase: 'WORK',
          roles: ['EXPLORE'],
          instruction: 'Dựng đường tròn ngoại tiếp và vẽ đường kính.',
          expectedEvidence: 'Hình vẽ đúng của học sinh.',
          successCriteriaRefs: ['SC1'],
          durationSec: 300,
        },
        {
          id: 'b-2-2',
          phase: 'FORMALIZE',
          roles: ['FORMALIZE', 'WORKED_EXAMPLE'],
          instruction: 'Tổng quát hóa định lý sin và trình bày ví dụ mẫu tính cạnh a khi biết góc A và bán kính R.',
          expectedEvidence: 'Lời giải ví dụ mẫu của học sinh.',
          successCriteriaRefs: ['SC1'],
          durationSec: 600,
        },
      ],
    },
    {
      id: 'act-3',
      order: 3,
      title: { vi: 'Luyện tập: Áp dụng định lý sin giải tam giác', en: 'Practice' },
      durationSec: 1020,
      phase: 'practice',
      successCriteriaRefs: ['SC2'],
      teacherAction: 'Phát bài tập tính cạnh b, c và bán kính R khi tam giác ABC có a = 10, góc B = 60 độ, góc C = 45 độ.',
      studentAction: 'Làm việc theo cặp: tính góc A, sau đó dùng định lý sin tính b, c và R.',
      cognitiveDemand: 'Vận dụng định lý sin biến đổi đại số tìm ẩn số.',
      expectedEvidence: 'Bảng phụ hoặc phiếu làm bài của cặp đôi.',
      successLookFor: 'Tính đúng góc A = 75 độ, sử dụng sin 75 độ đúng hoặc quy về góc đặc biệt.',
      expectedProduct: 'Kết quả tính toán cạnh b, c và bán kính R chính xác.',
      sourceRefs: { sourceBlockIds: ['B2'], sourceClaimIds: ['C1'] },
      potentialObstacles: [
        {
          id: 'OBS3',
          description: 'Học sinh bấm máy tính sai chế độ radian/degree.',
          provenanceType: 'planning_assumption',
          evidenceRef: null,
          requiresTeacherConfirmation: true,
          responsePlan: 'Yêu cầu kiểm tra chữ D trên màn hình máy tính cầm tay trước khi bấm.',
        },
      ],
      responsiveMoves: ['Chiếu hướng dẫn kiểm tra đơn vị đo góc trên màn hình.'],
      discussionPrompt: null,
      formalization: null,
      notebookAction: 'Trình bày lời giải bài toán luyện tập 1 vào vở.',
      transitionToNext: 'Chuyển sang kiểm tra đánh giá mức độ nắm vững bài học.',
      offlineFallback: 'Học sinh giải bài tập trên bảng đen lớp học.',
      entrySec: 30,
      organizationSec: 30,
      transitionSec: 30,
      beats: [
        {
          id: 'b-3-1',
          phase: 'WORK',
          roles: ['GUIDED_PRACTICE'],
          instruction: 'Thực hiện giải tam giác theo nhóm cặp đôi.',
          expectedEvidence: 'Lời giải trên giấy nháp.',
          successCriteriaRefs: ['SC2'],
          durationSec: 540,
        },
        {
          id: 'b-3-2',
          phase: 'WORK',
          roles: ['RECHECK', 'INDEPENDENT_EVIDENCE'],
          instruction: 'Kiểm tra chéo kết quả tính cạnh và bán kính R.',
          expectedEvidence: 'Đáp án đúng b = 10*sqrt(6)/... và R = ...',
          successCriteriaRefs: ['SC2'],
          durationSec: 390,
        },
      ],
    },
    {
      id: 'act-4',
      order: 4,
      title: { vi: 'Tổng kết và Tự đánh giá', en: 'Closing' },
      durationSec: 360,
      phase: 'closing',
      successCriteriaRefs: ['SC1', 'SC2'],
      teacherAction: 'Hướng dẫn học sinh điền phiếu tự đánh giá và dặn dò bài tập.',
      studentAction: 'Tự đánh giá theo các tiêu chí và hoàn thành câu hỏi phiếu thoát.',
      cognitiveDemand: 'Nhận thức siêu nhận thức (metacognition) về mức độ hiểu bài.',
      expectedEvidence: 'Phiếu thoát hoàn thành.',
      successLookFor: 'Đánh giá chân thực và nêu được chỗ còn vướng mắc nếu có.',
      expectedProduct: 'Phiếu tự đánh giá thu về.',
      sourceRefs: { sourceBlockIds: ['B2'], sourceClaimIds: ['C1'] },
      potentialObstacles: [],
      responsiveMoves: ['Giải đáp vướng mắc chung được nêu trên phiếu thoát.'],
      discussionPrompt: null,
      formalization: null,
      notebookAction: 'Ghi nhiệm vụ tự học ở nhà.',
      transitionToNext: 'Tiết học tiếp theo sẽ học định lý côsin.',
      offlineFallback: 'Thu phiếu giấy trực tiếp.',
      entrySec: 20,
      organizationSec: 20,
      transitionSec: 20,
      beats: [
        {
          id: 'b-4-1',
          phase: 'WORK',
          roles: ['EXIT'],
          instruction: 'Trả lời nhanh câu hỏi trắc nghiệm kiểm tra công thức định lý sin.',
          expectedEvidence: 'Câu trả lời trắc nghiệm phiếu thoát.',
          successCriteriaRefs: ['SC1'],
          durationSec: 90,
        },
        {
          id: 'b-4-2',
          phase: 'WORK',
          roles: ['SELF_ASSESSMENT'],
          instruction: 'Đánh giá mức độ tự tin với 2 tiêu chí thành công của bài.',
          expectedEvidence: 'Mức tự đánh giá: đạt / vượt / đang tiến bộ.',
          successCriteriaRefs: ['SC1', 'SC2'],
          durationSec: 90,
        },
        {
          id: 'b-4-3',
          phase: 'DISCUSS',
          roles: ['NEXT_STEP'],
          instruction: 'Lựa chọn bài tập rèn luyện thêm hoặc bài tập nâng cao cho buổi sau.',
          expectedEvidence: 'Lựa chọn bài tập của học sinh.',
          successCriteriaRefs: [],
          durationSec: 60,
        },
        {
          id: 'b-4-4',
          phase: 'TRANSITION',
          roles: ['TEACHER_CLOSE'],
          instruction: 'Giáo viên nhấn mạnh ý nghĩa của định lý sin và liên hệ với định lý côsin sắp học.',
          expectedEvidence: null,
          successCriteriaRefs: [],
          durationSec: 60,
        },
      ],
    },
  ],
  opening: {
    mode: 'DEFAULT',
    refs: [
      { role: 'PROBLEM', activityId: 'act-1', beatId: 'b-1-1' },
      { role: 'GUIDING_QUESTION', activityId: 'act-1', beatId: 'b-1-1' },
      { role: 'LESSON_TITLE', activityId: 'act-1', beatId: 'b-1-2' },
      { role: 'LEARNER_GOAL', activityId: 'act-1', beatId: 'b-1-2' },
      { role: 'TEACHER_GOAL', activityId: 'act-1', beatId: 'b-1-2' },
    ],
  },
  closing: {
    refs: [
      { role: 'RECHECK', activityId: 'act-3', beatId: 'b-3-2' },
      { role: 'EXIT', activityId: 'act-4', beatId: 'b-4-1' },
      { role: 'SELF_ASSESSMENT', activityId: 'act-4', beatId: 'b-4-2' },
      { role: 'NEXT_STEP', activityId: 'act-4', beatId: 'b-4-3' },
      { role: 'TEACHER_CLOSE', activityId: 'act-4', beatId: 'b-4-4' },
    ],
    nextStepOptions: [
      {
        id: 'opt-basic',
        label: { vi: 'Luyện tập thêm bài toán tam giác nhọn cơ bản', en: 'Basic acute triangle exercises', ja: '鋭角三角形の基本問題を追加練習する' },
        action: 'Giải bài tập 1, 2 trang 72 SGK.',
      },
      {
        id: 'opt-advanced',
        label: { vi: 'Thử sức bài toán ứng dụng thực tế đo đạc phức hợp', en: 'Complex real-world application', ja: '実測を使った応用問題に挑戦する' },
        action: 'Giải bài tập ngọn hải đăng và tàu thủy trang 73 SGK.',
      },
    ],
  },
  formativeDecisionCycles: [
    {
      id: 'cycle-1',
      mappedSuccessCriteria: ['SC2'],
      activityRef: 'act-3',
      collect: {
        method: 'Quan sát bài làm cặp đôi của học sinh ở bài tập áp dụng',
        evidenceCollected: 'Tỉ lệ học sinh biến đổi đúng a/sinA = 2R để tìm R',
      },
      decisionRule: {
        below: {
          interpretation: 'Học sinh chưa biến đổi đúng công thức bán kính ngoại tiếp.',
          decision: 'HƯỚNG_DẪN_LẠI',
          action: 'Giáo viên dừng lại hướng dẫn lại bước biến đổi chéo tìm R = a/(2*sinA).',
        },
        onTrack: {
          interpretation: 'Học sinh nắm vững công thức biến đổi.',
          decision: 'TIẾP_TỤC_LUYỆN_TẬP',
          action: 'Cho các nhóm hoàn thành và chuyển sang tính cạnh b và c.',
        },
        above: {
          interpretation: 'Học sinh hoàn thành xuất sắc trước thời hạn.',
          decision: 'MỞ_RỘNG_NÂNG_CAO',
          action: 'Giao thêm câu hỏi tính diện tích tam giác qua công thức S = abc/(4R).',
        },
      },
      recheck: {
        method: 'Kiểm tra nhanh kết quả tính R ở bài tập 2',
        newEvidence: 'Tất cả các nhóm đều tính đúng R',
        timing: 'Cuối hoạt động 3',
      },
    },
  ],
  cycleRecheckRefs: {
    'cycle-1': {
      activityId: 'act-3',
      beatId: 'b-3-2',
    },
  },
  reflectionContract: {
    mappedSuccessCriteria: ['SC1', 'SC2'],
    studentReflection: 'Đánh giá mức độ tự tin với 2 tiêu chí thành công của bài.',
    nextStep: 'Lựa chọn bài tập rèn luyện thêm hoặc bài tập nâng cao cho buổi sau.',
  },
  closingContract: {
    presenterClassSummary: 'Kế hoạch tổng kết nhấn mạnh định lý sin và mối liên hệ với tam giác vuông.',
    studentPersonalFeedback: 'Khung phản hồi dự kiến: đối chiếu kết quả tính cạnh và góc với tiêu chí thành công.',
    coachPrivateAnalytics: 'Phân tích dự kiến: rà soát tỉ lệ hoàn thành nhiệm vụ và các bẫy lỗi lượng giác thường gặp.',
  },
  fastPathOrder: ['act-3'],
});

// Structural-only test data. These strings are not canonical mathematical or learner evidence.
export const createV871AuthoringFixture = (sourceModel: SourceModel, durationMinutes: number) => {
  const plan = createValidSyntheticAuthoringPlan();
  plan.experience.sourceHash = sourceModel.sourceHash;
  const blockIds = sourceModel.blocks.map(block => block.id);
  const claimIds = sourceModel.claims.filter(claim => claim.status === 'verified').map(claim => claim.id);
  const bindRefs = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    const object = value as Record<string, unknown>;
    if (Array.isArray(object.sourceBlockIds)) object.sourceBlockIds = [...blockIds];
    if (Array.isArray(object.sourceClaimIds)) object.sourceClaimIds = [...claimIds];
    Object.values(object).forEach(bindRefs);
  };
  bindRefs(plan);
  const slot = durationMinutes * 60;
  const perActivity = Math.floor(slot / plan.activities.length);
  for (const [index, activity] of plan.activities.entries()) {
    const meta = plan.experience.activities[activity.id];
    activity.durationSec = index === plan.activities.length - 1 ? slot - perActivity * index : perActivity;
    meta.recoveryBudgetSec = 60;
    meta.coreBudgetSec = activity.durationSec - meta.recoveryBudgetSec;
    const work = meta.coreBudgetSec - activity.entrySec - activity.organizationSec - activity.transitionSec;
    const perBeat = Math.floor(work / activity.beats.length);
    activity.beats.forEach((beat, position) => {
      beat.durationSec = position === activity.beats.length - 1 ? work - perBeat * position : perBeat;
    });
    meta.fastPath.cuttable = false;
    if (meta.handoff.target !== 'STUDENT_DEVICE') meta.handoff.deviceState = 'view_only';
  }
  plan.fastPathOrder = [];
  plan.experience.timing = { slotDurationSec: slot, reserveBudgetSec: 240, coreBudgetSec: slot - 240 };
  plan.learningDesign.successCriteria.forEach(criterion => criterion.mappedActivityRefs.push('act-4'));
  plan.formativeDecisionCycles[0].recheck.newEvidence = 'Lời giải mới để đối chiếu tiêu chí thành công.';
  const lesson = structuralLessonIR();
  lesson.lesson.subject = plan.subjectProfile.subject;
  lesson.lesson.runtimeMin = durationMinutes;
  lesson.archetype.type = 'concept_formation';
  lesson.learningDesign = structuredClone(plan.learningDesign) as typeof lesson.learningDesign;
  lesson.formativeDecisionCycles = structuredClone(plan.formativeDecisionCycles);
  lesson.reflectionContract = structuredClone(plan.reflectionContract);
  lesson.closingContract = structuredClone(plan.closingContract);
  lesson.provenance = { sourceHash: sourceModel.sourceHash };
  const surfaces = { PRESENTER: 'presenter', STUDENT_DEVICE: 'student_device', PAPER: 'notebook',
    PEER: 'pair_group', GROUP: 'pair_group', BOARD: 'board', PHYSICAL_MODEL: 'presenter' } as const;
  const beacons = { PRESENTER: 'LOOK_UP', STUDENT_DEVICE: 'DEVICE', PAPER: 'NOTEBOOK',
    PEER: 'PAIR_GROUP', GROUP: 'PAIR_GROUP', BOARD: 'BOARD', PHYSICAL_MODEL: 'LOOK_UP' } as const;
  const base = lesson.timeline[0];
  lesson.timeline = plan.activities.map((activity, index) => {
    const mapped = structuredClone(base);
    const meta = plan.experience.activities[activity.id];
    for (const key of ['id', 'order', 'title', 'durationSec', 'phase', 'successCriteriaRefs', 'teacherAction',
      'studentAction', 'cognitiveDemand', 'expectedEvidence', 'successLookFor'] as const)
      (mapped as unknown as Record<string, unknown>)[key] = structuredClone(activity[key]);
    mapped.objectiveRefs = ['LI1'];
    mapped.student.state = meta.handoff.deviceState;
    mapped.student.requiredProduct = activity.expectedProduct;
    mapped.coach.purpose = plan.experience.experienceArc[index].purpose;
    mapped.coach.observe = [activity.expectedEvidence, activity.successLookFor,
      ...activity.beats.map(beat => beat.expectedEvidence).filter((text): text is string => text !== null)];
    mapped.coach.ifManyStruggle = [...activity.responsiveMoves, meta.handoff.fallback];
    mapped.coach.ask = activity.discussionPrompt ? [activity.discussionPrompt] : [];
    mapped.coach.board = activity.formalization ? [activity.formalization] : [];
    mapped.coach.studentMirror.misconceptions = activity.potentialObstacles.map(item => item.description);
    mapped.coach.studentMirror.expectedProduct = activity.expectedProduct;
    mapped.notebookAction = activity.notebookAction;
    mapped.fallback = activity.offlineFallback;
    mapped.transitionPolicy = activity.transitionToNext;
    mapped.revealPolicy = plan.experience.reveal[activity.id].canonicalPolicy!;
    mapped.threeWayOrchestration.primaryAttentionSurface = surfaces[meta.handoff.target];
    mapped.attentionBeacon.mode = beacons[meta.handoff.target];
    mapped.surfaceHandoff = { fromSurface: index ? surfaces[plan.experience.activities[plan.activities[index - 1].id].handoff.target] : 'presenter',
      toSurface: surfaces[meta.handoff.target], entry: { presenterCue: { vi: meta.handoff.entryCue },
        studentState: meta.handoff.deviceState, coachState: 'Theo dõi việc nhận nhiệm vụ.', durationSec: activity.entrySec },
      work: { durationSec: activity.organizationSec + activity.beats.reduce((sum, beat) => sum + beat.durationSec, 0),
        presenterMode: 'Giữ nhiệm vụ.', studentMode: 'Làm bài.', coachMode: 'Quan sát minh chứng.' },
      recall: { presenterCue: { vi: meta.handoff.exitCue }, studentCue: { vi: meta.handoff.exitCue },
        coachAction: 'Mời học sinh trở lại trao đổi.', durationSec: activity.transitionSec } };
    mapped.timingPolicy = { plannedDurationSec: activity.durationSec,
      surfaceSwitchCostSec: activity.entrySec + activity.transitionSec, neverAutoNext: true,
      protected: index === 0 || index === 2 || index === 3 };
    return mapped;
  }) as typeof lesson.timeline;
  return { plan, lesson };
};

// Structural-only test data. These strings are not canonical mathematical or learner evidence.
export const structuralLessonIR = (): LessonIRV83 => {
  const inactiveFeature = () => ({ triggered: false, triggerReason: '', learningValue: '', studentAction: '', expectedEvidence: '', observerEvidence: '' });
  return {
    schemaVersion: '8.3.2',
    compatibility: { masterSpecVersion: '8.3.2', qualityStandardVersion: '1.1.0', qualityValidatorVersion: '1.1.0', compilerSpecVersion: '1.3', reviewFixSpecVersion: '1.2' },
    lesson: { lessonId: 'structural-test-only', lessonVersion: '0.0.1', title: { vi: 'Bài thử cấu trúc' }, subject: 'Mathematics', runtimeMin: 40 },
    sourcePriorityTracks: { productArchitecture: ['V8.3.2'], mathematicalCurriculum: ['unverified test input'], pedagogicalQuality: ['CIS/TDS 1.1'] },
    sourceVerification: { status: 'SOURCE_VERIFICATION_REQUIRED', canonicalSources: [], canonicalTerms: [], canonicalFormulas: [], authoredBySystem: [], unresolved: ['No canonical math source in structural fixture'] },
    learnerContext: { evidence: [], planningImplications: [] },
    learningDesign: { learningIntention: { vi: 'Thử cấu trúc' }, successCriteria: [{ id: 'SC1', statement: { vi: 'Nêu được một cách giải' }, observableEvidence: 'Lời giải' }], intellectualDemand: { coreRichThinkingMoment: 'Giải thích cách chọn phương pháp' } },
    archetype: { type: 'practice', rationale: 'Structural test only' },
    timeline: [{
      id: 'A1', order: 1, title: { vi: 'Làm bài' }, durationSec: 2400, phase: 'practice',
      objectiveRefs: ['LI1'], successCriteriaRefs: ['SC1'], formativeCycleRefs: [],
      studentAction: 'Viết một lời giải', teacherAction: 'Quan sát bài làm', cognitiveDemand: 'justify',
      expectedEvidence: 'Lời giải', successLookFor: 'Có căn cứ',
      threeWayOrchestration: { primaryAttentionSurface: 'student_device', presenterRole: 'Đưa nhiệm vụ', studentRole: 'Làm bài', coachRole: 'Quan sát', sharedContextRequired: false },
      attentionBeacon: { mode: 'DEVICE', copy: { vi: 'Trên máy · Viết lời giải' } },
      deviceAdaptation: {
        presenterLaptop: '', presenterTabletLandscape: '', presenterTabletPortrait: '', presenterPhone: '',
        studentLaptop: '', studentTabletLandscape: '', studentTabletPortrait: '', studentPhone: '',
        coachPhone: '', coachTablet: '', keyboardBehavior: '', orientationBehavior: '',
      },
      presenter: { title: { vi: 'Làm bài' }, exactCopy: { vi: 'Viết lời giải.' }, controls: ['next'] },
      student: { state: 'interactive', exactCopy: { vi: 'Viết lời giải.' }, interaction: 'text', onSubmitState: 'wait' },
      coach: { purpose: 'Theo dõi', ask: [], observe: [], transitionWhen: 'Hết giờ', studentMirror: { studentPrompt: { vi: 'Viết lời giải.' }, inputType: 'text', expectedProduct: 'Lời giải', misconceptions: [], recommendedTeacherAction: 'Quan sát', nextControl: 'next' } },
      differentiation: { commonCoreLearning: 'Giải thích cách làm', scaffolds: [], challenge: { type: 'justify', description: 'Giải thích' } },
      cis: { differentiation: false, assessmentForLearning: false, globalIntercultural: false, digitalCitizenship: false },
      revealPolicy: 'no_reveal', transitionPolicy: 'manual',
      timingPolicy: { plannedDurationSec: 2400, surfaceSwitchCostSec: 0, neverAutoNext: true },
    }],
    questions: {}, visuals: {}, languageSupport: { terms: [], activitySupport: {} },
    formativeDecisionCycles: [],
    conditionalFeatures: {
      globalIntercultural: inactiveFeature(), digitalCitizenship: inactiveFeature(), technologyEnhancedMathematics: inactiveFeature(), realWorldExperiential: inactiveFeature(),
      groupWork: inactiveFeature(), peerAssessment: inactiveFeature(), flippedLearning: inactiveFeature(), intensiveLanguageSupport: inactiveFeature(),
    },
    cisEvidenceMap: [], reflectionContract: { mappedSuccessCriteria: ['SC1'], studentReflection: 'Tự đánh giá', nextStep: 'Học tiếp' },
    runtimePolicy: { authoritativeState: 'server', followPresenterDefault: true, reconnect: { restoreIdentity: true, restoreRoom: true, restoreActivity: true, restoreDraft: true } },
    qaContract: { requiredViewports: ['1366x768'], threeWayScenarioRequired: true, browserQARequired: true },
    qualityAudit: { status: 'BLOCKED', standardVersion: '1.1.0', validatorVersion: '1.1.0', passedRules: [], failedRules: [], warnings: [], teacherConfirmationsRequired: [] },
    buildStatus: 'QUALITY_AUDIT',
  };
};
