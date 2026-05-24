import { sampleGeometry2DTriangleSimulation, sampleGeometry3DPyramidSimulation } from './simulationTypes';
import type {
  AdaptiveAssessment,
  AdaptiveLesson,
  AdaptiveQuestion,
  BloomLevel,
  KnowledgeUnit,
  LearningRoute,
  LearningRouteContent,
  WorkedExample,
} from './types';

type AdaptiveGrade = AdaptiveLesson['grade'];

export interface AdaptiveLessonSource {
  title: string;
  content: string;
  grade?: string;
  week?: string;
  sourceLabel?: string;
}

const routeOptions: LearningRoute[] = ['foundation', 'standard', 'challenge'];
const defaultRewardMessage = 'Em đã học xong! Thử thách bạn cùng lớp trong Đấu Trường Tri Thức?';

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeGrade = (grade?: string): AdaptiveGrade => {
  if (grade === '10' || grade === '11' || grade === '12') return grade;
  const match = String(grade || '').match(/1[0-2]/);
  return match && (match[0] === '10' || match[0] === '11' || match[0] === '12') ? match[0] : '10';
};

const cleanLine = (line: string) => line.replace(/^#+\s*/, '').replace(/^[-*]\s*/, '').trim();

const extractHeadings = (markdown: string): string[] => markdown
  .split('\n')
  .map(line => line.trim())
  .filter(line => /^#{2,4}\s+/.test(line) || /^[-*]\s*(Mảnh|Chunk|Tuyến|Mục tiêu|Bài tập|Câu hỏi)/i.test(line))
  .map(cleanLine)
  .filter(Boolean);

const extractBulletsAfter = (markdown: string, anchors: string[], fallback: string[]): string[] => {
  const lines = markdown.split('\n');
  const start = lines.findIndex(line => anchors.some(anchor => line.toLowerCase().includes(anchor.toLowerCase())));
  if (start < 0) return fallback;

  const items: string[] = [];
  for (let i = start + 1; i < Math.min(lines.length, start + 45); i++) {
    const line = lines[i].trim();
    if (/^#{1,3}\s+/.test(line) && items.length) break;
    if (/^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      const cleaned = cleanLine(line.replace(/^\d+[.)]\s+/, ''));
      if (cleaned.length > 8) items.push(cleaned);
    }
    if (items.length >= 6) break;
  }
  return items.length ? items : fallback;
};

const makeObjective = (title: string, index: number) => ({
  id: uid('obj'),
  code: `OBJ-${index + 1}`,
  title,
  description: title,
  bloomLevel: (index < 2 ? 'understand' : index < 4 ? 'apply' : 'analyze') as BloomLevel,
  masteryThreshold: index < 2 ? 0.7 : 0.75,
  prerequisiteObjectiveIds: [],
  commonMisconceptions: [],
});

const makeQuestion = (purpose: AdaptiveAssessment['purpose'], objectiveId: string, index: number, sourceHint: string): AdaptiveQuestion => ({
  id: uid('q'),
  type: 'multiple_choice',
  prompt: purpose === 'diagnostic'
    ? `Câu ${index + 1}. Kiểm tra nhanh mức độ sẵn sàng: ${sourceHint}`
    : purpose === 'exit_ticket'
      ? `Câu ${index + 1}. Học sinh chứng minh đã đạt mục tiêu: ${sourceHint}`
      : `Quick check ${index + 1}: ${sourceHint}`,
  options: ['A. Đáp án đúng', 'B. Phương án nhiễu 1', 'C. Phương án nhiễu 2', 'D. Phương án nhiễu 3'],
  correctAnswer: 'A. Đáp án đúng',
  explanation: 'Giáo viên rà soát và chỉnh đáp án/giải thích theo nội dung giáo án nguồn trước khi xuất bản.',
  objectiveIds: [objectiveId],
  difficulty: index === 0 ? 'easy' : index === 1 ? 'medium' : 'hard',
  points: 1,
});

const makeAssessment = (
  purpose: AdaptiveAssessment['purpose'],
  title: string,
  objectiveIds: string[],
  sourceHints: string[],
  count: number,
): AdaptiveAssessment => ({
  id: uid(purpose),
  title,
  purpose,
  durationMinutes: purpose === 'quick_check' ? 5 : purpose === 'exit_ticket' ? 6 : 7,
  questions: Array.from({ length: count }, (_, index) => makeQuestion(
    purpose,
    objectiveIds[index % Math.max(objectiveIds.length, 1)] || objectiveIds[0] || uid('obj'),
    index,
    sourceHints[index % Math.max(sourceHints.length, 1)] || 'nội dung trọng tâm của bài',
  )),
});

const makeWorkedExample = (objectiveId: string, title: string, sourceHint: string): WorkedExample => ({
  id: uid('example'),
  title: `Ví dụ minh hoạ — ${title}`,
  problem: sourceHint,
  solution: 'Bổ sung lời giải chi tiết từ giáo án nguồn sau bước rà soát.',
  explanation: 'Ví dụ này được tạo từ giáo án nguồn; giáo viên kiểm tra lại tính chính xác trước khi phát cho học sinh.',
  objectiveIds: [objectiveId],
  timeLimitSeconds: 180,
  hints: ['Xác định dữ kiện đã cho.', 'Liên hệ với công thức/khái niệm vừa học.', 'Trình bày từng bước, không nhảy kết luận.'],
  responseMode: 'short_text',
});

const makePracticeTask = (objectiveId: string, difficulty: 'easy' | 'medium' | 'hard', sourceHint: string, index: number) => ({
  id: uid('task'),
  prompt: `${difficulty === 'easy' ? 'Củng cố' : difficulty === 'medium' ? 'Luyện tập chuẩn' : 'Mở rộng'} ${index + 1}: ${sourceHint}`,
  expectedAnswer: 'Giáo viên rà soát đáp án theo giáo án nguồn.',
  hints: ['Đọc kỹ yêu cầu.', 'Gạch chân dữ kiện quan trọng.', 'Kiểm tra lại kết quả cuối cùng.'],
  objectiveIds: [objectiveId],
  difficulty,
});

const makeRoute = (route: LearningRoute, objectiveId: string, title: string, sourceHint: string): LearningRouteContent => ({
  route,
  explanation: route === 'foundation'
    ? `Tuyến Foundation: diễn giải chậm, trực quan, chia nhỏ bước cho ${title}. Nội dung nguồn: ${sourceHint}`
    : route === 'standard'
      ? `Tuyến Standard: học theo tiến trình chuẩn, ví dụ mẫu rồi luyện tập cho ${title}. Nội dung nguồn: ${sourceHint}`
      : `Tuyến Challenge: mở rộng, tổng quát hoá và bài tập thử thách cho ${title}. Nội dung nguồn: ${sourceHint}`,
  workedExamples: [makeWorkedExample(objectiveId, title, sourceHint)],
  practiceTasks: [makePracticeTask(objectiveId, route === 'foundation' ? 'easy' : route === 'standard' ? 'medium' : 'hard', sourceHint, 0)],
  aiTutorPrompt: `Hỗ trợ học sinh ở tuyến ${route} học mảnh kiến thức "${title}". Ưu tiên gợi mở, không đưa ngay đáp án.`,
});

const buildDefaultSimulationSpec = (title: string, objectiveId: string, sourceHint: string) => {
  const normalizedText = `${title} ${sourceHint}`.toLowerCase();
  const isSpatialGeometry = /không gian|hình chóp|hình lăng trụ|tứ diện|mặt phẳng|đường thẳng vuông góc|góc giữa|khoảng cách/.test(normalizedText);
  const isPlaneGeometry = /hình học phẳng|tam giác|đường tròn|tứ giác|đa giác|tọa độ|vectơ|vector|đường thẳng/.test(normalizedText);

  if (!isSpatialGeometry && !isPlaneGeometry) return undefined;

  const baseSpec = isSpatialGeometry ? sampleGeometry3DPyramidSimulation : sampleGeometry2DTriangleSimulation;
  return {
    ...baseSpec,
    id: uid(isSpatialGeometry ? 'sim-3d' : 'sim-2d'),
    title: isSpatialGeometry ? `Mô phỏng 3D xoay được — ${title}` : `Mô phỏng SVG tương tác — ${title}`,
    description: isSpatialGeometry
      ? `Mô hình 3D để học sinh xoay, thu phóng và quan sát quan hệ không gian trong mảnh kiến thức: ${title}.`
      : `Mô hình hình học phẳng để học sinh kéo điểm và quan sát bất biến/đại lượng thay đổi trong mảnh kiến thức: ${title}.`,
    objectiveIds: [objectiveId],
    studentTask: isSpatialGeometry
      ? `Xoay mô hình, bật/tắt mặt và đường phụ để rút ra nhận xét cho mảnh kiến thức “${title}”.`
      : `Kéo điểm trên mô hình và ghi lại nhận xét cho mảnh kiến thức “${title}”.`,
  };
};

const makeUnit = (title: string, objectiveId: string, sourceHint: string, index: number): KnowledgeUnit => ({
  id: uid('unit'),
  title,
  objectiveIds: [objectiveId],
  estimatedMinutes: index === 0 ? 8 : 10,
  routes: routeOptions.map(route => makeRoute(route, objectiveId, title, sourceHint)),
  quickCheck: makeAssessment('quick_check', `Quick check — ${title}`, [objectiveId], [sourceHint], 2),
  maxRemediationAttempts: 2,
  supportTasks: [makePracticeTask(objectiveId, 'easy', sourceHint, 0)],
  enrichmentTasks: [makePracticeTask(objectiveId, 'hard', sourceHint, 0)],
  externalToolIds: [],
  simulationSpec: buildDefaultSimulationSpec(title, objectiveId, sourceHint),
});

const inferTitle = (source: AdaptiveLessonSource, reviewedPlan: string): string => {
  if (source.title?.trim()) return source.title.trim();
  const heading = reviewedPlan.split('\n').find(line => /^#\s+/.test(line.trim()) || /tiêu đề|tên bài/i.test(line));
  return cleanLine(heading || '') || 'Bài học phân hoá mới';
};

export const buildAdaptiveLessonFromReviewedPlan = (
  source: AdaptiveLessonSource,
  reviewedPlan: string,
  teacherId: string,
): AdaptiveLesson => {
  const now = new Date().toISOString();
  const headings = extractHeadings(reviewedPlan);
  const fallbackObjectives = ['Nắm được kiến thức trọng tâm của bài', 'Vận dụng kiến thức vào bài tập cơ bản', 'Tự kiểm tra và điều chỉnh cách học'];
  const objectiveTitles = extractBulletsAfter(reviewedPlan, ['mục tiêu', 'learning objectives'], fallbackObjectives).slice(0, 5);
  const objectives = objectiveTitles.map(makeObjective);
  const objectiveIds = objectives.map(objective => objective.id);
  const unitTitles = extractBulletsAfter(reviewedPlan, ['mảnh kiến thức', 'knowledge chunks', 'chunk'], headings.slice(0, 4).length ? headings.slice(0, 4) : objectiveTitles).slice(0, 5);
  const sourceHints = extractBulletsAfter(reviewedPlan, ['câu hỏi', 'bài tập', 'quick check'], unitTitles).slice(0, 8);

  return {
    id: `adaptive-${Date.now()}`,
    title: inferTitle(source, reviewedPlan),
    subjectId: 'math',
    grade: normalizeGrade(source.grade),
    durationMinutes: 40,
    status: 'draft',
    teacherId,
    createdAt: now,
    updatedAt: now,
    curriculumRef: {
      programType: 'CUSTOM',
      week: source.week || '',
      period: 1,
      textbook: source.sourceLabel || 'Giáo án nguồn',
    },
    preparation: {
      readingInstructions: 'Học sinh đọc trước nội dung giáo viên giao, ghi lại phần chưa hiểu và chuẩn bị làm pre-test đầu giờ.',
      guidingQuestions: objectiveTitles.slice(0, 4).map(title => `Em đã hiểu gì về: ${title}?`),
      estimatedMinutes: 10,
    },
    fiveStepFlow: {
      steps: [
        { id: uid('step'), name: 'Kết nối', purpose: 'Kích hoạt kiến thức nền từ giáo án nguồn.', estimatedMinutes: 3, teacherRole: 'Nêu tình huống mở đầu và mục tiêu học.', studentAction: 'Trả lời câu hỏi khởi động.', systemSupport: 'Hiển thị mục tiêu và câu hỏi gợi mở.' },
        { id: uid('step'), name: 'Chẩn đoán', purpose: 'Phân tuyến học sinh bằng pre-test.', estimatedMinutes: 7, teacherRole: 'Theo dõi kết quả chẩn đoán.', studentAction: 'Làm test đầu giờ.', systemSupport: 'Chấm theo mục tiêu và đề xuất tuyến học.' },
        { id: uid('step'), name: 'Hình thành kiến thức', purpose: 'Học theo mảnh kiến thức và tuyến phù hợp.', estimatedMinutes: 15, teacherRole: 'Hỗ trợ nhóm cần can thiệp.', studentAction: 'Học nội dung, xem ví dụ, làm nhiệm vụ.', systemSupport: 'Cá nhân hoá tuyến Foundation/Standard/Challenge.' },
        { id: uid('step'), name: 'Luyện tập và điều chỉnh', purpose: 'Quick check sau từng mảnh kiến thức.', estimatedMinutes: 10, teacherRole: 'Can thiệp khi học sinh sai lặp lại.', studentAction: 'Làm quick check và học lại khi cần.', systemSupport: 'Gợi ý, remediate hoặc chuyển tiếp.' },
        { id: uid('step'), name: 'Phản tư', purpose: 'Exit ticket và khuyến nghị cuối bài.', estimatedMinutes: 5, teacherRole: 'Chốt kiến thức và giao nhiệm vụ tiếp nối.', studentAction: 'Hoàn thành exit ticket.', systemSupport: 'Tổng hợp kết quả và khuyến nghị.' },
      ],
    },
    objectives,
    diagnosticTest: makeAssessment('diagnostic', 'Pre-test đầu giờ', objectiveIds, sourceHints, Math.min(5, Math.max(3, objectiveIds.length))),
    knowledgeUnits: unitTitles.map((title, index) => makeUnit(title, objectiveIds[index % objectiveIds.length] || objectiveIds[0], sourceHints[index % sourceHints.length] || title, index)),
    exitTicket: makeAssessment('exit_ticket', 'Exit ticket cuối bài', objectiveIds, sourceHints, 3),
    pacingPolicy: {
      minExitTicketMinutes: 5,
      aheadThresholdMinutes: 5,
      behindThresholdMinutes: 4,
      stuckAfterRemediationAttempts: 2,
      enrichmentTriggerMastery: 0.85,
      supportTriggerMastery: 0.55,
    },
    completionReward: {
      toolId: 'gamedoikhang',
      message: defaultRewardMessage,
    },
  };
};

export const buildAdaptiveReviewPrompt = (source: AdaptiveLessonSource): string => `Bạn là chuyên gia thiết kế bài học phân hoá/adaptive môn Toán.

NHIỆM VỤ: Nghiên cứu giáo án nguồn, đánh giá mức độ sẵn sàng và tái thiết kế thành bản chuẩn bị tạo bài học phân hoá. Giáo án nguồn CÓ THỂ KHÔNG theo cấu trúc bài học phân hoá, có thể thiếu pre-test, tuyến học, quick check, hình ảnh minh hoạ, bài tập hoặc exit ticket. Khi thiếu, bạn BẮT BUỘC phải tự bổ sung/điều chỉnh dựa trên mục tiêu, nội dung và chuẩn kiến thức suy ra từ giáo án gốc. Không chỉ nhận xét thiếu; phải tạo luôn phiên bản hoàn chỉnh để giáo viên duyệt.

THÔNG TIN NGUỒN:
- Tên nguồn: ${source.sourceLabel || source.title || 'Giáo án tải lên'}
- Tiêu đề: ${source.title || 'Chưa rõ'}
- Lớp: ${source.grade || 'Chưa rõ'}
- Tuần: ${source.week || 'Chưa rõ'}

GIÁO ÁN NGUỒN:
---
${source.content.slice(0, 24000)}
---

YÊU CẦU RÀ SOÁT VÀ BỔ SUNG:
1. Phân tích giáo án nguồn để xác định: mục tiêu, kiến thức trọng tâm, ví dụ, câu hỏi, bài tập, học liệu/hình ảnh nếu có.
2. Nếu giáo án nguồn chưa có cấu trúc phân hoá, hãy tự thiết kế bổ sung đầy đủ theo chuẩn bài học phân hoá bên dưới; không được chỉ nhận xét thiếu.
3. Nếu giáo án nguồn thiếu dữ liệu, được phép suy luận sư phạm hợp lý từ tên bài, lớp, nội dung còn lại và chương trình Toán phổ thông; ghi rõ phần nào là “AI đề xuất bổ sung”.
4. Giữ lại những phần tốt của giáo án gốc, nhưng được phép chỉnh thứ tự, chia nhỏ, thay ví dụ hoặc thêm câu hỏi để phù hợp bài học phân hoá.
5. Không xuất JSON, không viết mã; đầu ra là bản thiết kế nội dung để giáo viên duyệt trước khi hệ thống tạo bài học.

CHUẨN BÀI HỌC PHÂN HOÁ BẮT BUỘC:
I. UI/UX và trải nghiệm học tập
- Màn hình học tập dùng bố cục 7:3: 70% bên trái là bài giảng tương tác/giải quyết vấn đề; 30% bên phải là “Vở Ghi Chép” tự động lưu định lý, công thức, kết luận cốt lõi khi học sinh vượt qua từng chướng ngại.
- Có đồng hồ kép: đồng hồ tổng 40:00 và đồng hồ cục bộ cho từng phần, ví dụ 05:00 cho pre-test.
- Có mục lục thông minh điều hướng giữa Bước 0 đến Bước 5, tự ẩn khi click ra ngoài.
- Đồ họa chống lỗi: hình phẳng ưu tiên mô tả để dựng bằng <svg> nội tuyến; bài hình học không gian phải mô tả được cấu trúc 3D xoay được bằng engine Three.js/WebGL nội bộ; hạn chế link ảnh ngoài.
- Chuẩn bị đầy đủ học liệu số/mô phỏng tương tác cho học sinh, đặc biệt với hình học phẳng và hình học không gian.

II. Khung kịch bản sư phạm
- Bước 0 — Pre-test: 5 phút, ít nhất 5 câu đa dạng gồm trắc nghiệm 4 phương án, đúng/sai, trả lời ngắn; đo nhận biết, thông hiểu, vận dụng từ thấp đến cao dựa trên nội dung học sinh đọc trước. Sau nộp phải có điểm, đúng/sai, giải thích từng phương án và đề xuất tuyến Foundation/Standard/Challenge.
- Bước 1 — Khởi động & Gắn kết (Engage): có câu chuyện lịch sử hoặc tình huống thực tế hấp dẫn; có trải nghiệm bế tắc bằng công cụ tương tác; học sinh tự điền kỳ vọng; hệ thống đối chiếu và in mục tiêu theo 3 cấp Cơ bản/Trọng tâm/Nâng cao.
- Bước 2 — Kiến tạo tri thức: dùng tư duy Socratic, bẻ bài toán lớn thành câu hỏi nhỏ; Trial & Error không khóa luồng khi sai; mỗi câu trả lời đều có phản hồi bản chất rồi mở bước tiếp theo; sau từng nội dung lý thuyết có quick check; nếu sai thì mở lại nội dung lý thuyết để diễn giải lại; cuối mỗi hoạt động chốt định lý/công thức và chuyển sang Vở Ghi Chép; AI ghi nhận thao tác, thời gian, quick check để xếp bài tập ở Bước 3.
- Bước 3 — Áp dụng luyện tập: dựa trên dữ liệu Bước 0 và Bước 2 để sinh luyện tập theo năng lực Trung bình/Khá/Giỏi; gồm Phần 1: 3 câu trắc nghiệm 4 phương án, 5 điểm/câu; Phần 2: 1 bối cảnh kèm 4 ý Đúng/Sai, 10 điểm/ý; Phần 3: 1 câu trả lời ngắn, 20 điểm; có remediation loop 4 tầng: sai lần 1 nhắc lý thuyết nền trừ 1 điểm, lần 2 gợi ý mức 1 trừ 2 điểm, lần 3 gợi ý mức 2 trừ 3 điểm, lần 4 đáp án chi tiết và chuyển câu 0 điểm.
- Bước 4 — Mở rộng: bài toán thực tiễn đặt học sinh vào vai chuyên gia/kỹ sư xử lý sự cố.
- Bước 5 — Tổng kết: sơ đồ tư duy dạng chuỗi trực quan; checklist mục tiêu ban đầu; thanh trượt tự đánh giá 1-10; hộp thư đặt câu hỏi bổ sung; Time-Filler nếu chưa hết 40 phút thì lần lượt mở 1 tài liệu đọc thêm, 1 bài tập nâng cao khó, 1 bài tập vận dụng thực tế.

III. Toán học và kỹ thuật trình bày
- Dùng MathJax/LaTeX: công thức inline bọc $...$, công thức khối bọc $$...$$.
- Ký hiệu toán phải chuẩn; trong Tổ hợp - Xác suất, giao hai biến cố viết liền như $AB$, không dùng ký hiệu giao tập hợp.
- Nội dung phải đủ để đóng gói thành bài học độc lập, mượt, có vòng lặp điều kiện và bộ câu hỏi hoàn chỉnh.

ĐỊNH DẠNG OUTPUT BẮT BUỘC BẰNG MARKDOWN:
# [Tên bài học]

## 1. Nhận xét rà soát nhanh
- Giáo án nguồn đang thuộc loại: [đã có cấu trúc phân hoá / giáo án thường / thiếu cấu trúc / nguồn rời rạc]
- Điểm phù hợp giữ lại:
- Phần còn thiếu hoặc chưa hợp lý:
- Phần AI đề xuất bổ sung/điều chỉnh:
- Cảnh báo chuyên môn nếu có:

## 2. Thiết kế UI/UX bài học
- Bố cục 7:3: nội dung cột trái, Vở Ghi Chép cột phải.
- Đồng hồ kép: tổng 40:00 và thời lượng cục bộ từng bước.
- Mục lục thông minh Bước 0-5.
- Danh sách SVG/mô phỏng nội tuyến cần dựng.
- Danh sách mô phỏng 3D xoay được cần dựng bằng Three.js/WebGL nội bộ nếu bài có hình học không gian.
- Học liệu số/tương tác cần chuẩn bị.

## 3. Bước 0 — Pre-test chẩn đoán 5 phút
| Câu | Loại câu | Mức độ | Nội dung | Phương án/Đáp án | Giải thích từng phương án hoặc tiêu chí | Mục tiêu đo | Dữ liệu phân tuyến |
|---:|---|---|---|---|---|---|---|

## 4. Quy tắc phân tuyến sau Pre-test
| Điều kiện | Tuyến | Nội dung bài học ưu tiên | Can thiệp AI |
|---|---|---|---|
| ... | Foundation | ... | ... |
| ... | Standard | ... | ... |
| ... | Challenge | ... | ... |

## 5. Bước 1 — Khởi động & Gắn kết
- Câu chuyện/tình huống thực tế:
- Công cụ tương tác gây “bế tắc”:
- Kỳ vọng học sinh tự điền:
- Mục tiêu Cơ bản/Trọng tâm/Nâng cao:

## 6. Bước 2 — Kiến tạo tri thức Socratic
### Mảnh kiến thức 1: ...
- Câu hỏi dẫn dắt siêu nhỏ:
- Trial & Error: phản hồi khi đúng/sai:
- Quick check sau lý thuyết:
- Remediate khi sai:
- Chốt vào Vở Ghi Chép:
- Dữ liệu AI cần ghi nhận:

## 7. Bước 3 — Áp dụng luyện tập thích ứng
### Mức Trung bình
- Phần 1: 3 câu trắc nghiệm 4 phương án, 5 điểm/câu.
- Phần 2: 1 bối cảnh + 4 ý Đúng/Sai, 10 điểm/ý.
- Phần 3: 1 câu trả lời ngắn, 20 điểm.
- Remediation loop 4 tầng:

### Mức Khá
- Phần 1: ...
- Phần 2: ...
- Phần 3: ...
- Remediation loop 4 tầng:

### Mức Giỏi
- Phần 1: ...
- Phần 2: ...
- Phần 3: ...
- Remediation loop 4 tầng:

## 8. Bước 4 — Mở rộng thực tiễn
- Vai trò học sinh:
- Bối cảnh chuyên gia/kỹ sư:
- Bài toán mở rộng:
- Sản phẩm cần nộp:

## 9. Bước 5 — Tổng kết và Time-Filler
- Sơ đồ tư duy dạng chuỗi trực quan:
- Checklist mục tiêu:
- Thanh trượt tự đánh giá 1-10:
- Hộp thư câu hỏi bổ sung:
- Time-Filler nếu còn thời gian: tài liệu đọc thêm → bài tập nâng cao → bài tập vận dụng thực tế.

## 10. Tiêu chuẩn Toán học, mô phỏng và đóng gói
- Công thức MathJax/LaTeX cần dùng:
- Quy chuẩn ký hiệu đặc biệt:
- Yêu cầu độc lập, không phụ thuộc link ảnh ngoài:
- Nếu có hình học phẳng: đặc tả mô phỏng SVG gồm điểm, đoạn, đa giác/đường tròn, điểm kéo được, câu hỏi quan sát và kết luận ghi vào Vở Ghi Chép.
- Nếu có hình học không gian: đặc tả mô phỏng 3D xoay được gồm danh sách điểm 3D, cạnh, mặt phẳng/mặt đa giác, đường khuất, đường cao/đường phụ, thao tác xoay/zoom/bật tắt mặt và câu hỏi quan sát.
- Gợi ý schema triển khai nội bộ: geometry2d dùng engine svg; geometry3d dùng engine threejs; mỗi mô phỏng cần title, description, placement, objectiveIds, studentTask, interactions, questions, notebookEntries.

## 11. Bản đồ chuyển đổi sang bài học phân hoá
| Thành phần | Nội dung đã duyệt | Ghi chú triển khai |
|---|---|---|
`; 
