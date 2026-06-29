import { normalizeAdaptiveSimulationSpec } from './simulationValidation';
import { sampleGeometry2DTriangleSimulation, sampleGeometry3DPyramidSimulation } from './simulationTypes';
import type { AdaptiveSimulationSpec, HtmlSimulationSpec } from './simulationTypes';
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

export interface AdaptiveLessonQualityIssue {
  severity: 'warning' | 'error';
  code: string;
  message: string;
  path?: string;
}

const routeOptions: LearningRoute[] = ['foundation', 'standard', 'challenge'];
const defaultRewardMessage = 'Em đã học xong! Thử thách bạn cùng lớp trong Đấu Trường Tri Thức?';
const PUBLISH_PLACEHOLDER_RE = /(đáp án đúng|phương án nhiễu|phương án đúng|giáo viên\s+(rà soát|bổ sung|cập nhật|kiểm tra)|bổ sung lời giải|câu hỏi đang được chuẩn bị|placeholder|lorem ipsum|xem lại lời giải chi tiết trong giáo án nguồn)/i;
const MIN_REAL_TEXT_LENGTH = 12;

const hasPlaceholderText = (value?: string): boolean => PUBLISH_PLACEHOLDER_RE.test(value || '');
const hasRealText = (value?: string): boolean => Boolean(value && value.trim().length >= MIN_REAL_TEXT_LENGTH && !hasPlaceholderText(value));
const hasRealOptions = (question: AdaptiveQuestion): boolean => {
  const options = question.options || [];
  return options.length >= 4 && options.slice(0, 4).every(option => Boolean(option && option.trim().length >= 2 && !hasPlaceholderText(option))) && Boolean(question.correctAnswer && options.includes(question.correctAnswer));
};

const validateQuestionForPublish = (question: AdaptiveQuestion, path: string, issues: AdaptiveLessonQualityIssue[]): void => {
  if (!hasRealText(question.prompt)) issues.push({ severity: 'warning', code: 'invalid_question_prompt', message: 'Câu hỏi còn thiếu nội dung thật hoặc còn placeholder.', path: `${path}.prompt` });
  if (!hasRealOptions(question)) issues.push({ severity: 'warning', code: 'invalid_question_options', message: 'Câu hỏi phải có 4 phương án thật và đáp án đúng khớp một phương án.', path: `${path}.options` });
  if (!hasRealText(question.explanation)) issues.push({ severity: 'warning', code: 'weak_question_explanation', message: 'Giải thích đáp án còn thiếu hoặc chung chung.', path: `${path}.explanation` });
};

export const validateAdaptiveLessonPublishReadiness = (lesson: AdaptiveLesson): AdaptiveLessonQualityIssue[] => {
  const issues: AdaptiveLessonQualityIssue[] = [];
  if (!hasRealText(lesson.title)) issues.push({ severity: 'warning', code: 'missing_title', message: 'Tiêu đề bài học còn trống hoặc không hợp lệ.', path: 'title' });
  if (!lesson.objectives?.length) issues.push({ severity: 'warning', code: 'missing_objectives', message: 'Bài học cần có ít nhất một mục tiêu học tập.', path: 'objectives' });
  if ((lesson.diagnosticTest?.questions || []).length < 5) issues.push({ severity: 'warning', code: 'insufficient_diagnostic', message: 'Pre-test cần tối thiểu 5 câu hỏi thật.', path: 'diagnosticTest.questions' });
  (lesson.diagnosticTest?.questions || []).forEach((question, index) => validateQuestionForPublish(question, `diagnosticTest.questions[${index}]`, issues));
  if (!lesson.knowledgeUnits?.length) issues.push({ severity: 'warning', code: 'missing_units', message: 'Bài học cần có ít nhất một mảnh kiến thức.', path: 'knowledgeUnits' });
  (lesson.knowledgeUnits || []).forEach((unit, unitIndex) => {
    if (!hasRealText(unit.title)) issues.push({ severity: 'warning', code: 'invalid_unit_title', message: 'Mảnh kiến thức thiếu tiêu đề thật.', path: `knowledgeUnits[${unitIndex}].title` });
    routeOptions.forEach(route => {
      const routeContent = unit.routes?.find(item => item.route === route);
      if (!routeContent || !hasRealText(routeContent.explanation)) issues.push({ severity: 'warning', code: 'missing_route_explanation', message: `Tuyến ${route} thiếu phần giải thích thật.`, path: `knowledgeUnits[${unitIndex}].routes.${route}.explanation` });
      (routeContent?.workedExamples || []).forEach((example, exampleIndex) => {
        if (!hasRealText(example.problem) || !hasRealText(example.solution)) issues.push({ severity: 'warning', code: 'invalid_worked_example', message: `Ví dụ tuyến ${route} còn thiếu đề bài/lời giải thật.`, path: `knowledgeUnits[${unitIndex}].routes.${route}.workedExamples[${exampleIndex}]` });
      });
    });
    if ((unit.quickCheck?.questions || []).length < 2) issues.push({ severity: 'warning', code: 'insufficient_quick_check', message: 'Mỗi mảnh kiến thức cần tối thiểu 2 câu quick check.', path: `knowledgeUnits[${unitIndex}].quickCheck.questions` });
    (unit.quickCheck?.questions || []).forEach((question, questionIndex) => validateQuestionForPublish(question, `knowledgeUnits[${unitIndex}].quickCheck.questions[${questionIndex}]`, issues));
  });
  if ((lesson.exitTicket?.questions || []).length < 3) issues.push({ severity: 'warning', code: 'insufficient_exit_ticket', message: 'Exit ticket cần tối thiểu 3 câu hỏi thật.', path: 'exitTicket.questions' });
  (lesson.exitTicket?.questions || []).forEach((question, index) => validateQuestionForPublish(question, `exitTicket.questions[${index}]`, issues));
  return issues;
};

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
  options: ['A. 4', 'B. -4', 'C. 2', 'D. -2'],
  correctAnswer: 'A. 4',
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

  // NGUYÊN TẮC: heuristic này chỉ là fallback và phải BẢO THỦ — chỉ dựng mô phỏng hình học
  // khi tín hiệu phân môn RẤT RÕ. Mơ hồ thì trả undefined để AI sinh học liệu đúng phân môn,
  // tránh lỗi "nhận nhầm phân môn" (vd "không gian mẫu" của Xác suất ≠ hình học không gian).

  // Chặn trước các phân môn KHÔNG phải hình học (xác suất/thống kê/tổ hợp/đại số/giải tích).
  const isNonGeometryTopic = /xác suất|biến cố|không gian mẫu|tổ hợp|chỉnh hợp|hoán vị|kỳ vọng|phương sai|tần suất|tần số|thống kê|nhị thức|cấp số|lượng giác|logarit|lôgarit|mũ|đạo hàm|nguyên hàm|tích phân|giới hạn|dãy số/.test(normalizedText);
  if (isNonGeometryTopic) return undefined;

  // Tín hiệu hình học KHÔNG GIAN mạnh (khối/quan hệ 3D cụ thể) — bỏ token rời "không gian"/"mặt phẳng".
  const isSpatialGeometry = /hình học không gian|hình chóp|hình lăng trụ|tứ diện|hình hộp|hình lập phương|hình cầu|hình nón|hình trụ|đường thẳng vuông góc với mặt phẳng|góc giữa (hai mặt phẳng|đường thẳng và mặt phẳng)|khoảng cách (từ[^.]*đến mặt phẳng|giữa hai đường thẳng)/.test(normalizedText);
  // Tín hiệu hình học PHẲNG mạnh (tên hình cụ thể) — bỏ token rời "đường thẳng"/"tọa độ".
  const isPlaneGeometry = /hình học phẳng|tam giác|đường tròn|tứ giác|đa giác|hình bình hành|hình thang|hình vuông|hình chữ nhật|elip|parabol|hyperbol|hypebol/.test(normalizedText);

  if (!isSpatialGeometry && !isPlaneGeometry) return undefined;

  const baseSpec = isSpatialGeometry ? sampleGeometry3DPyramidSimulation : sampleGeometry2DTriangleSimulation;
  return normalizeAdaptiveSimulationSpec({
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
  });
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

const getSection = (markdown: string, headingPattern: RegExp): string => {
  const lines = markdown.split('\n');
  const start = lines.findIndex(line => headingPattern.test(line.trim()));
  if (start < 0) return '';
  const startLevel = (lines[start].match(/^#+/)?.[0].length || 2);
  const collected: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const level = lines[i].match(/^(#+)\s+/)?.[1].length;
    if (level && level <= startLevel) break;
    collected.push(lines[i]);
  }
  return collected.join('\n').trim();
};

const getLineValue = (text: string, labels: string[]): string => {
  const lines = text.split('\n');
  for (const label of labels) {
    const found = lines.find(line => line.toLowerCase().includes(label.toLowerCase()));
    if (found) return cleanLine(found.replace(new RegExp(`^[-*]?\\s*${label}\\s*[:：-]?`, 'i'), '')).trim();
  }
  return '';
};

const parseMarkdownRows = (section: string): string[][] => section
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.startsWith('|') && line.endsWith('|') && !/^\|\s*-+/.test(line))
  .slice(1)
  .map(line => line.slice(1, -1).split('|').map(cell => cell.replace(/<br\s*\/?>/gi, '\n').trim()))
  .filter(row => row.some(cell => cell && !/^-+$/.test(cell)));

const parseOptionsAndCorrect = (raw: string): { options: string[]; correctAnswer: string } => {
  const text = raw.replace(/\s+/g, ' ').trim();
  const optionMatches = [...text.matchAll(/([A-D])\s*[.)]\s*(.*?)(?=\s+[A-D]\s*[.)]|\s*(?:đáp án|correct)\s*[:：]|$)/gi)];
  let options = optionMatches.map(match => `${match[1].toUpperCase()}. ${match[2].trim()}`).filter(item => item.length > 3);
  if (options.length < 4) {
    options = text.split(/;|\n/).map((item, index) => `${String.fromCharCode(65 + index)}. ${item.trim()}`).filter(item => item.length > 3).slice(0, 4);
  }
  while (options.length < 4) options.push(`${String.fromCharCode(65 + options.length)}. Giáo viên bổ sung phương án`);

  const explicit = text.match(/(?:đáp án|correct)\s*[:：]?\s*([A-D])/i)?.[1]?.toUpperCase();
  const starred = text.match(/([A-D])\s*[.)][^;|]*(?:\*|✓|đúng)/i)?.[1]?.toUpperCase();
  const correctLetter = explicit || starred || 'A';
  const correctAnswer = options.find(option => option.startsWith(`${correctLetter}.`)) || options[0];
  return { options: options.slice(0, 4), correctAnswer };
};

const makeQuestionFromReviewedText = (
  purpose: AdaptiveAssessment['purpose'],
  objectiveId: string,
  index: number,
  prompt: string,
  optionsAndAnswer: string,
  explanation: string,
  difficulty?: string,
): AdaptiveQuestion => {
  const parsed = parseOptionsAndCorrect(optionsAndAnswer);
  const difficultyText = `${difficulty || ''} ${prompt}`.toLowerCase();
  const normalizedDifficulty = /khó|hard|vận dụng cao|giỏi|challenge/.test(difficultyText)
    ? 'hard'
    : /trung bình|medium|vận dụng|khá/.test(difficultyText)
      ? 'medium'
      : 'easy';

  return {
    id: uid('q'),
    type: 'multiple_choice',
    prompt: prompt.trim() || `${purpose === 'quick_check' ? 'Quick check' : 'Câu'} ${index + 1}`,
    options: parsed.options,
    correctAnswer: parsed.correctAnswer,
    explanation: explanation.trim() || 'Giải thích lấy từ giáo án phân hoá đã duyệt.',
    objectiveIds: [objectiveId],
    difficulty: normalizedDifficulty,
    points: 1,
  };
};

const buildAssessmentFromReviewedSection = (
  section: string,
  purpose: AdaptiveAssessment['purpose'],
  title: string,
  objectiveIds: string[],
  fallbackHints: string[],
  count: number,
): AdaptiveAssessment => {
  const rows = parseMarkdownRows(section);
  const questions = rows
    .map((row, index) => makeQuestionFromReviewedText(
      purpose,
      objectiveIds[index % Math.max(objectiveIds.length, 1)] || objectiveIds[0] || uid('obj'),
      index,
      row[3] || row[1] || row[0] || '',
      row[4] || '',
      row[5] || row[4] || '',
      row[2] || '',
    ))
    .filter(question => question.prompt.length > 5);

  if (questions.length >= count) {
    return { id: uid(purpose), title, purpose, durationMinutes: purpose === 'quick_check' ? 5 : purpose === 'exit_ticket' ? 6 : 7, questions: questions.slice(0, count) };
  }

  const fallback = makeAssessment(purpose, title, objectiveIds, fallbackHints, count);
  return { ...fallback, questions: [...questions, ...fallback.questions.slice(questions.length)].slice(0, count) };
};

const splitUnitBlocks = (section: string): { title: string; body: string }[] => {
  const lines = section.split('\n');
  const blocks: { title: string; body: string }[] = [];
  let current: { title: string; bodyLines: string[] } | null = null;

  for (const line of lines) {
    const heading = line.match(/^#{3,5}\s*(?:Mảnh kiến thức\s*\d*\s*[:：-]?\s*)?(.+)/i);
    if (heading) {
      if (current) blocks.push({ title: cleanLine(current.title), body: current.bodyLines.join('\n').trim() });
      current = { title: heading[1].trim(), bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    }
  }
  if (current) blocks.push({ title: cleanLine(current.title), body: current.bodyLines.join('\n').trim() });
  return blocks.filter(block => block.title && block.body);
};

const extractRouteExplanation = (body: string, route: LearningRoute): string => {
  const labels = route === 'foundation'
    ? ['foundation', 'cơ bản', 'học sinh yếu', 'mức trung bình']
    : route === 'standard'
      ? ['standard', 'trọng tâm', 'chuẩn', 'mức khá']
      : ['challenge', 'nâng cao', 'giỏi', 'mở rộng'];
  return getLineValue(body, labels) || [
    getLineValue(body, ['câu hỏi dẫn dắt siêu nhỏ']),
    getLineValue(body, ['trial & error']),
    getLineValue(body, ['chốt vào vở ghi chép']),
  ].filter(Boolean).join('\n');
};

const buildUnitFromReviewedBlock = (block: { title: string; body: string }, objectiveId: string, index: number): KnowledgeUnit => {
  const quickCheckSection = getLineValue(block.body, ['quick check sau lý thuyết', 'quick check']) || block.body;
  const quickCheck = buildAssessmentFromReviewedSection(quickCheckSection, 'quick_check', `Quick check — ${block.title}`, [objectiveId], [block.title], 2);
  const sourceHint = [
    getLineValue(block.body, ['câu hỏi dẫn dắt siêu nhỏ']),
    getLineValue(block.body, ['chốt vào vở ghi chép']),
    block.title,
  ].filter(Boolean).join(' — ');

  return {
    id: uid('unit'),
    title: block.title,
    objectiveIds: [objectiveId],
    estimatedMinutes: index === 0 ? 8 : 10,
    routes: routeOptions.map(route => ({
      route,
      explanation: extractRouteExplanation(block.body, route) || sourceHint || block.title,
      workedExamples: [makeWorkedExample(objectiveId, block.title, sourceHint || block.title)],
      practiceTasks: [makePracticeTask(objectiveId, route === 'foundation' ? 'easy' : route === 'standard' ? 'medium' : 'hard', sourceHint || block.title, 0)],
      aiTutorPrompt: `Hỗ trợ học sinh ở tuyến ${route} học mảnh kiến thức "${block.title}". Chỉ dùng nội dung đã có trong giáo án phân hoá, không tự bịa thêm dữ kiện.`,
    })),
    quickCheck,
    maxRemediationAttempts: 2,
    supportTasks: [makePracticeTask(objectiveId, 'easy', sourceHint || block.title, 0)],
    enrichmentTasks: [makePracticeTask(objectiveId, 'hard', sourceHint || block.title, 0)],
    externalToolIds: [],
    simulationSpec: buildDefaultSimulationSpec(block.title, objectiveId, sourceHint || block.title),
  };
};

export const buildAdaptiveLessonFromReviewedPlan = (
  source: AdaptiveLessonSource,
  reviewedPlan: string,
  teacherId: string,
): AdaptiveLesson => {
  const now = new Date().toISOString();
  const title = inferTitle(source, reviewedPlan);
  const objectivesSection = `${getSection(reviewedPlan, /^##\s*5\./i)}\n${getSection(reviewedPlan, /^##\s*4\./i)}`;
  const fallbackObjectives = ['Nắm được kiến thức trọng tâm của bài', 'Vận dụng kiến thức vào bài tập cơ bản', 'Tự kiểm tra và điều chỉnh cách học'];
  const objectiveTitles = [
    getLineValue(objectivesSection, ['mục tiêu cơ bản']),
    getLineValue(objectivesSection, ['mục tiêu trọng tâm']),
    getLineValue(objectivesSection, ['mục tiêu nâng cao']),
    ...extractBulletsAfter(reviewedPlan, ['mục tiêu', 'learning objectives'], fallbackObjectives),
  ].filter((item, index, arr): item is string => Boolean(item && arr.indexOf(item) === index)).slice(0, 5);
  const finalObjectiveTitles = objectiveTitles.length ? objectiveTitles : fallbackObjectives;
  const objectives = finalObjectiveTitles.map(makeObjective);
  const objectiveIds = objectives.map(objective => objective.id);

  const preTestSection = getSection(reviewedPlan, /^##\s*3\./i);
  const unitSection = getSection(reviewedPlan, /^##\s*6\./i);
  const exitSection = getSection(reviewedPlan, /^##\s*9\./i);
  const sourceHints = extractBulletsAfter(reviewedPlan, ['câu hỏi', 'bài tập', 'quick check'], finalObjectiveTitles).slice(0, 8);
  const unitBlocks = splitUnitBlocks(unitSection);
  const unitTitles = unitBlocks.length ? [] : extractBulletsAfter(reviewedPlan, ['mảnh kiến thức', 'knowledge chunks', 'chunk'], finalObjectiveTitles).slice(0, 5);

  const engageSection = getSection(reviewedPlan, /^##\s*5\./i);
  const storyHook = getLineValue(engageSection, ['câu chuyện/tình huống thực tế']);
  const guidingQuestion = getLineValue(unitSection, ['câu hỏi dẫn dắt siêu nhỏ']) || getLineValue(engageSection, ['công cụ tương tác gây “bế tắc”', 'công cụ tương tác gây bế tắc']);

  return {
    id: `adaptive-${Date.now()}`,
    title,
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
      readingInstructions: storyHook || 'Học sinh đọc trước nội dung giáo viên giao, ghi lại phần chưa hiểu và chuẩn bị làm pre-test đầu giờ.',
      engage: {
        storyHook,
        guidingQuestion,
        studentExpectationPrompt: getLineValue(engageSection, ['kỳ vọng học sinh tự điền']),
        routeGoals: {
          foundation: finalObjectiveTitles[0],
          standard: finalObjectiveTitles[1] || finalObjectiveTitles[0],
          challenge: finalObjectiveTitles[2] || finalObjectiveTitles[0],
        },
      },
      guidingQuestions: [storyHook, guidingQuestion, ...finalObjectiveTitles].filter(Boolean).slice(0, 6),
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
    diagnosticTest: buildAssessmentFromReviewedSection(preTestSection, 'diagnostic', 'Pre-test đầu giờ', objectiveIds, sourceHints, 5),
    knowledgeUnits: unitBlocks.length
      ? unitBlocks.slice(0, 6).map((block, index) => buildUnitFromReviewedBlock(block, objectiveIds[index % objectiveIds.length] || objectiveIds[0], index))
      : unitTitles.map((unitTitle, index) => makeUnit(unitTitle, objectiveIds[index % objectiveIds.length] || objectiveIds[0], sourceHints[index % sourceHints.length] || unitTitle, index)),
    exitTicket: buildAssessmentFromReviewedSection(exitSection, 'exit_ticket', 'Exit ticket cuối bài', objectiveIds, sourceHints, 3),
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
    generationSource: 'regex_fallback',
    generationWarnings: ['Bài học được bóc tách trực tiếp từ giáo án phân hoá đã duyệt; hệ thống không gọi AI lần hai để tự sinh nội dung mới.'],
  };
};

// ============================================================
// PA2 + PA1: Structured JSON content generation
// Replaces regex-based parsing with AI-output JSON for accurate
// question content, 3-route explanations, and worked examples.
// ============================================================

interface QuestionJson {
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
  hints?: string[];
  difficulty?: string;
}

interface ObjectiveJson {
  title: string;
  bloom?: string;
  threshold?: number;
}

interface UnitJson {
  title: string;
  hook_question?: string;
  guiding_questions?: string[];
  guiding_answers?: string[];
  student_task?: string;
  knowledge_conclusion?: string;
  visual_instruction?: string;
  explanation_foundation: string;
  explanation_standard: string;
  explanation_challenge: string;
  worked_example?: { problem: string; solution: string; hints?: string[] };
  quick_check_questions?: QuestionJson[];
  externalToolIds?: string[];
  tikz_code?: string;
  objective_index?: number;
  estimated_minutes?: number;
  simulation_html?: {
    title?: string;
    description?: string;
    srcDoc?: string;
    height?: number;
    libraries?: string[];
    safetyNotes?: string[];
  };
  simulation_3d?: {
    title?: string;
    description?: string;
    camera?: { x: number; y: number; z: number };
    points: Array<{ id: string; label: string; x: number; y: number; z: number; color?: string }>;
    segments: Array<{ from: string; to: string; dashed?: boolean; color?: string }>;
    faces: Array<{ pointIds: string[]; fill?: string; opacity?: number }>;
  };
}

interface EngageJson {
  story_hook?: string;
  reality_check_message?: string;
  reading_instructions?: string;
  guiding_question?: string;
  guiding_question_box?: string;
  big_title?: string;
  student_expectation_prompt?: string;
  foundation_goal?: string;
  standard_goal?: string;
  challenge_goal?: string;
  visual_cards?: Array<{ title: string; alt: string; caption?: string; svg?: string; imageDataUrl?: string }>;
}

interface AdaptiveContentJson {
  title?: string;
  objectives?: ObjectiveJson[];
  engage?: EngageJson;
  units?: UnitJson[];
  diagnostic_questions?: QuestionJson[];
  exit_ticket_questions?: QuestionJson[];
}

type AdaptiveContentValidationIssue = {
  severity: 'warning' | 'error';
  code: string;
  message: string;
};

class AdaptiveContentValidationError extends Error {
  issues: AdaptiveContentValidationIssue[];

  constructor(issues: AdaptiveContentValidationIssue[]) {
    super(`AI adaptive content validation failed: ${issues.map(issue => `${issue.code}: ${issue.message}`).join('; ')}`);
    this.name = 'AdaptiveContentValidationError';
    this.issues = issues;
  }
}

const META_LEAK_RE = /(ui\/?ux|bố cục\s*7\s*[:：]\s*3|7\s*[:：]\s*3|socratic|đồng hồ kép|mục lục thông minh|vở ghi chép|thiết kế giao diện|trải nghiệm học tập)/i;
const PLACEHOLDER_RE = /(đáp án đúng|phương án nhiễu|phương án đúng|câu hỏi\s*\d*\s*$|giáo viên cập nhật|bổ sung câu hỏi|placeholder|lorem ipsum)/i;
const MATH_SIGNAL_RE = /(\$[^$]+\$|\\frac|\\sqrt|\\Delta|\\displaystyle|\^\d|_\d|=|\b(elip|ellipse|parabol|hyperbol|hypebol|conic|tiêu điểm|đường chuẩn|phương trình|tọa độ|tham số)\b)/i;

const collectText = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectText);
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).flatMap(collectText);
  return [];
};

const compactText = (value: unknown): string => collectText(value).join(' ').replace(/\s+/g, ' ').trim();

const sourceKeywordSignals = (source: AdaptiveLessonSource): string[] => {
  const raw = `${source.title || ''} ${source.content || ''}`.toLowerCase();
  const candidates = [
    'conic', 'elip', 'ellipse', 'parabol', 'hyperbol', 'hypebol', 'tiêu điểm', 'đường chuẩn', 'phương trình',
    'đường tròn', 'vectơ', 'vector', 'tọa độ', 'hàm số', 'đạo hàm', 'tích phân', 'xác suất', 'tổ hợp',
    'logarit', 'mũ', 'lượng giác', 'hình học', 'không gian', 'mặt phẳng', 'đường thẳng',
  ];
  return candidates.filter(keyword => raw.includes(keyword));
};

const hasRealQuestionContent = (question: QuestionJson | undefined): boolean => {
  if (!question || typeof question.prompt !== 'string') return false;
  if (PLACEHOLDER_RE.test(question.prompt) || question.prompt.trim().length < 18) return false;
  if (!Array.isArray(question.options) || question.options.length !== 4) return false;
  if (question.options.some(option => !option || option.trim().length < 2 || PLACEHOLDER_RE.test(option))) return false;
  if (typeof question.correct !== 'number' || question.correct < 0 || question.correct > 3) return false;
  return true;
};

const validateHtmlMiniApp = (unit: UnitJson, unitIndex: number, issues: AdaptiveContentValidationIssue[]): void => {
  if (unit.simulation_3d) {
    if (!Array.isArray(unit.simulation_3d.points) || unit.simulation_3d.points.length === 0) {
      issues.push({ severity: 'warning', code: 'invalid_simulation_3d', message: `Mô phỏng 3D ở mảnh ${unitIndex + 1} không có điểm (points).` });
    }
    return;
  }

  const html = unit.simulation_html;
  if (!html) return;
  const srcDoc = typeof html.srcDoc === 'string' ? html.srcDoc.trim() : '';
  if (!srcDoc) {
    issues.push({ severity: 'warning', code: 'missing_simulation_html', message: `Mảnh kiến thức ${unitIndex + 1} có simulation_html nhưng thiếu srcDoc.` });
    return;
  }
  if (!/(<svg|<canvas|input\s+type="range|addEventListener|function\s+draw|requestAnimationFrame)/i.test(srcDoc)) {
    issues.push({ severity: 'warning', code: 'non_interactive_simulation', message: `Mô phỏng ở mảnh ${unitIndex + 1} chưa có dấu hiệu tương tác/canvas/SVG.` });
  }
  if (srcDoc.length < 600) {
    issues.push({ severity: 'warning', code: 'thin_simulation_html', message: `Mô phỏng ở mảnh ${unitIndex + 1} quá ngắn, có thể chỉ là minh hoạ tĩnh.` });
  }
};

const toWarningMessage = (issue: AdaptiveContentValidationIssue): string => `${issue.code}: ${issue.message}`;

const buildFallbackLessonWithWarnings = (
  source: AdaptiveLessonSource,
  reviewedPlan: string,
  teacherId: string,
  warnings: string[],
): AdaptiveLesson => ({
  ...buildAdaptiveLessonFromReviewedPlan(source, reviewedPlan, teacherId),
  generationSource: 'regex_fallback',
  generationWarnings: [
    'AI trả về JSON không đạt chuẩn nên hệ thống đã dùng bộ dựng dự phòng từ giáo án đã rà soát.',
    ...warnings,
  ],
});

const validateAdaptiveContentJson = (content: AdaptiveContentJson, source: AdaptiveLessonSource): void => {
  const issues: AdaptiveContentValidationIssue[] = [];
  const allText = compactText(content);
  const sourceSignals = sourceKeywordSignals(source);

  if (!Array.isArray(content.objectives) || content.objectives.length < 3) {
    issues.push({ severity: 'warning', code: 'missing_objectives', message: 'Cần ít nhất 3 mục tiêu học tập cụ thể.' });
  }
  if (!content.engage || compactText(content.engage).length < 120) {
    issues.push({ severity: 'warning', code: 'weak_engage', message: 'Hoạt động mở đầu còn thiếu hoặc quá sơ sài.' });
  }
  const minUnits = Math.max(3, (content.objectives?.length || 3));
  if (!Array.isArray(content.units) || content.units.length < minUnits) {
    issues.push({ severity: 'warning', code: 'missing_units', message: `Cần ít nhất ${minUnits} mảnh kiến thức (tương ứng ${content.objectives?.length || 3} mục tiêu).` });
  }
  if (Array.isArray(content.units) && Array.isArray(content.objectives) && content.units.length < content.objectives.length) {
    console.warn(`[Adaptive] AI returned ${content.units.length} units for ${content.objectives.length} objectives`);
  }
  if (!Array.isArray(content.diagnostic_questions) || content.diagnostic_questions.length !== 5) {
    issues.push({ severity: 'warning', code: 'invalid_diagnostic_count', message: 'Pre-test phải có đúng 5 câu.' });
  }
  if (!Array.isArray(content.exit_ticket_questions) || content.exit_ticket_questions.length !== 3) {
    issues.push({ severity: 'warning', code: 'invalid_exit_ticket_count', message: 'Exit ticket phải có đúng 3 câu.' });
  }
  if (META_LEAK_RE.test(compactText(content.objectives)) || META_LEAK_RE.test(compactText(content.engage))) {
    issues.push({ severity: 'warning', code: 'meta_leak', message: 'Nội dung học sinh bị lẫn thuật ngữ hệ thống/UI như UI/UX, Socratic, 7:3.' });
  }
  if (PLACEHOLDER_RE.test(allText)) {
    issues.push({ severity: 'warning', code: 'placeholder_content', message: 'JSON còn placeholder hoặc đáp án mẫu chung chung.' });
  }
  if (sourceSignals.length > 0 && !sourceSignals.some(signal => allText.toLowerCase().includes(signal))) {
    issues.push({ severity: 'warning', code: 'source_drift', message: `Nội dung sinh ra không bám các tín hiệu chính của giáo án nguồn: ${sourceSignals.slice(0, 6).join(', ')}.` });
  }

  const allQuestions = [
    ...(Array.isArray(content.diagnostic_questions) ? content.diagnostic_questions : []),
    ...(Array.isArray(content.exit_ticket_questions) ? content.exit_ticket_questions : []),
    ...(Array.isArray(content.units) ? content.units.flatMap(unit => unit.quick_check_questions || []) : []),
  ];
  const invalidQuestionIndex = allQuestions.findIndex(question => !hasRealQuestionContent(question));
  if (invalidQuestionIndex >= 0) {
    issues.push({ severity: 'warning', code: 'invalid_question', message: `Câu hỏi số ${invalidQuestionIndex + 1} thiếu nội dung thật, thiếu 4 đáp án hoặc còn placeholder.` });
  }
  if (allQuestions.length >= 5 && allQuestions.filter(question => MATH_SIGNAL_RE.test(compactText(question))).length < Math.ceil(allQuestions.length * 0.6)) {
    issues.push({ severity: 'warning', code: 'weak_math_content', message: 'Quá ít câu hỏi có công thức/số liệu/tín hiệu Toán học cụ thể.' });
  }

  (content.units || []).forEach((unit, index) => {
    const unitText = compactText(unit);
    if (!unit.title || unitText.length < 250) {
      issues.push({ severity: 'warning', code: 'thin_unit', message: `Mảnh kiến thức ${index + 1} thiếu tiêu đề hoặc nội dung tuyến học quá mỏng.` });
    }
    if (!unit.hook_question || !Array.isArray(unit.guiding_questions) || unit.guiding_questions.length < 3 || !unit.knowledge_conclusion) {
      issues.push({ severity: 'warning', code: 'missing_socratic_scaffold', message: `Mảnh kiến thức ${index + 1} phải có câu hỏi gợi mở, ít nhất 3 câu hỏi dẫn dắt và phần chốt kiến thức ngắn.` });
    }
    if ((unit.guiding_questions || []).some(question => question.trim().length < 18 || !/[?？]$/.test(question.trim()))) {
      issues.push({ severity: 'warning', code: 'weak_guiding_question', message: `Câu hỏi dẫn dắt ở mảnh ${index + 1} phải là câu hỏi cụ thể, đủ rõ và kết thúc bằng dấu hỏi.` });
    }
    const conclusionLength = (unit.knowledge_conclusion || '').trim().length;
    if (conclusionLength > 900) {
      issues.push({ severity: 'warning', code: 'bloated_knowledge_conclusion', message: `Phần chốt kiến thức ở mảnh ${index + 1} quá dài; cần tách thành nhiều mảnh nhỏ hơn.` });
    }
    if ((unit.quick_check_questions || []).length !== 2) {
      issues.push({ severity: 'warning', code: 'invalid_quick_check_count', message: `Mảnh kiến thức ${index + 1} phải có đúng 2 câu quick check.` });
    }
    validateHtmlMiniApp(unit, index, issues);
  });

  const blockingIssues = issues.filter(issue => issue.severity === 'error');
  if (blockingIssues.length > 0) throw new AdaptiveContentValidationError(blockingIssues);
};

const extractJsonFromText = (text: string): string => {
  let cleaned = text.replace(/```(?:json)?\s*([\s\S]*?)```/i, '$1').trim();
  cleaned = cleaned.replace(/^[^\{\[]+/, '').replace(/[^\}\]]+$/, '');
  if (!cleaned) throw new Error('Không tìm thấy JSON object hoặc mảng trong phản hồi AI');
  return cleaned;
};

const repairJsonString = (raw: string): string => {
  let inString = false;
  let escaped = false;
  let fixed = '';

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (escaped) {
      if (ch === 'u') {
        const hex4 = raw.slice(i + 1, i + 5);
        if (/^[0-9a-fA-F]{4}$/.test(hex4)) {
          fixed += `\\u${hex4}`;
          i += 4;
        } else {
          fixed += `\\\\u`;
        }
      } else if ('"\\/bfnrt'.includes(ch)) {
        fixed += `\\${ch}`;
      } else {
        fixed += `\\\\${ch}`;
      }
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (ch === '"') inString = !inString;

    if (inString && ch === '\n') fixed += '\\n';
    else if (inString && ch === '\r') fixed += '\\r';
    else if (inString && ch === '\t') fixed += '\\t';
    else fixed += ch;
  }

  if (escaped) fixed += '\\\\';
  return fixed
    .replace(/\$displaystyle/g, '$\\displaystyle')
    .replace(/,\s*([}\]])/g, '$1');
};

const parseAdaptiveContentJson = (contentJsonText: string): AdaptiveContentJson => {
  const rawJsonString = extractJsonFromText(contentJsonText);
  const candidates = [rawJsonString, repairJsonString(rawJsonString)];
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('JSON root không phải object');
      return parsed as AdaptiveContentJson;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Không parse được JSON từ AI');
};

const buildQuestionFromJson = (
  qJson: QuestionJson,
  purpose: AdaptiveAssessment['purpose'],
  objectiveId: string,
  index: number,
): AdaptiveQuestion => {
  const options = Array.isArray(qJson.options) && qJson.options.length >= 2
    ? qJson.options
    : ['A. Đáp án A', 'B. Đáp án B', 'C. Đáp án C', 'D. Đáp án D'];
  const correctIndex = typeof qJson.correct === 'number' && qJson.correct >= 0 && qJson.correct < options.length
    ? qJson.correct : 0;
  const difficultyValues = ['easy', 'medium', 'hard'] as const;
  const difficulty: 'easy' | 'medium' | 'hard' = difficultyValues.includes(qJson.difficulty as 'easy' | 'medium' | 'hard')
    ? (qJson.difficulty as 'easy' | 'medium' | 'hard')
    : index === 0 ? 'easy' : index === 1 ? 'medium' : 'hard';
  return {
    id: uid('q'),
    type: 'multiple_choice',
    prompt: qJson.prompt || `Câu ${index + 1}. (Giáo viên cập nhật câu hỏi cụ thể.)`,
    options,
    correctAnswer: options[correctIndex],
    explanation: qJson.explanation || 'Xem lại nội dung bài học.',
    hints: Array.isArray(qJson.hints) ? qJson.hints.map(h => String(h).trim()).filter(Boolean) : undefined,
    objectiveIds: [objectiveId],
    difficulty,
    points: 1,
  };
};

const buildAssessmentFromJsonQuestions = (
  purpose: AdaptiveAssessment['purpose'],
  title: string,
  questions: QuestionJson[],
  objectiveIds: string[],
  minCount: number,
  maxCount: number,
): AdaptiveAssessment => {
  const padded = [...questions];
  while (padded.length < minCount) {
    padded.push({
      prompt: `Câu ${padded.length + 1}. (Giáo viên cập nhật câu hỏi cụ thể trước khi phát bài.)`,
      options: ['A. Đúng', 'B. Sai', 'C. Có thể đúng', 'D. Không xác định'],
      correct: 0,
      explanation: 'Giáo viên bổ sung giải thích.',
    });
  }
  return {
    id: uid(purpose),
    title,
    purpose,
    durationMinutes: purpose === 'quick_check' ? 5 : purpose === 'exit_ticket' ? 6 : 7,
    questions: padded.slice(0, maxCount).map((q, i) =>
      buildQuestionFromJson(
        q, purpose,
        objectiveIds[i % Math.max(objectiveIds.length, 1)] || objectiveIds[0] || uid('obj'),
        i,
      )
    ),
  };
};

const allowedHtmlSimulationLibraries: NonNullable<HtmlSimulationSpec['libraries']> = [
  'vanilla-canvas',
  'svg',
  'mathjax',
  'katex',
  'p5',
  'matterjs',
  'threejs',
  'jsxgraph',
  'geogebra',
  'desmos',
];

const normalizeHtmlSimulationLibraries = (libraries?: string[]): NonNullable<HtmlSimulationSpec['libraries']> => {
  if (!Array.isArray(libraries)) return ['vanilla-canvas'];
  const filtered = libraries.filter((library): library is NonNullable<HtmlSimulationSpec['libraries']>[number] =>
    allowedHtmlSimulationLibraries.includes(library as NonNullable<HtmlSimulationSpec['libraries']>[number])
  );
  return filtered.length ? filtered : ['vanilla-canvas'];
};

const buildHtmlSimulationSpecFromJson = (unit: UnitJson, objectiveId: string): AdaptiveSimulationSpec | undefined => {
  if (unit.simulation_3d) return undefined; // Handled by buildGeometry3DSimulationSpecFromJson
  const html = unit.simulation_html;
  if (!html) return buildDefaultSimulationSpec(unit.title, objectiveId, unit.title);
  
  const srcDoc = typeof html.srcDoc === 'string' ? html.srcDoc.trim() : '';
  if (!srcDoc) return buildDefaultSimulationSpec(unit.title, objectiveId, unit.title);

  return {
    id: uid('sim-html'),
    title: html.title?.trim() || `Mô phỏng tương tác — ${unit.title}`,
    description: html.description?.trim() || `Mini-app HTML/Canvas giúp học sinh thao tác trực tiếp với mảnh kiến thức: ${unit.title}.`,
    kind: 'htmlMiniApp' as const,
    engine: 'html' as const,
    placement: 'step2' as const,
    objectiveIds: [objectiveId],
    studentTask: `Thao tác với mô phỏng, thay đổi tham số và ghi lại nhận xét cho mảnh kiến thức “${unit.title}”.`,
    interactions: ['Kéo/thả hoặc điều chỉnh thanh trượt', 'Quan sát hình vẽ cập nhật theo thời gian thực', 'Đọc số đo/kết quả trên màn hình'],
    questions: [
      {
        id: uid('sim-q'),
        prompt: `Khi thay đổi tham số trong mô phỏng, đại lượng hoặc quan hệ nào của “${unit.title}” giữ nguyên?`,
        expectedObservation: 'Học sinh nêu được bất biến/quy luật chính sau khi thao tác với mô phỏng.',
      },
    ],
    notebookEntries: [
      {
        id: uid('sim-note'),
        title: `Ghi chú quan sát — ${unit.title}`,
        content: 'Ghi lại ít nhất một nhận xét định tính và một nhận xét có số liệu/công thức từ mô phỏng.',
      },
    ],
    html: {
      srcDoc,
      height: typeof html.height === 'number' ? html.height : 600,
      offlineSingleFile: true,
      libraries: normalizeHtmlSimulationLibraries(html.libraries),
      safetyNotes: Array.isArray(html.safetyNotes)
        ? html.safetyNotes
        : ['Render qua iframe sandbox="allow-scripts"; không truy cập parent DOM.'],
    },
  };
};

const buildGeometry3DSimulationSpecFromJson = (unit: UnitJson, objectiveId: string): AdaptiveSimulationSpec | undefined => {
  const geo3d = unit.simulation_3d;
  if (!geo3d) return undefined;

  // Phân môn không phải hình học không gian thì bỏ mô hình 3D dù AI lỡ phát simulation_3d
  // (vd nhầm "không gian mẫu" của Xác suất thành hình học không gian).
  const topicText = `${unit.title || ''} ${unit.visual_instruction || ''}`.toLowerCase();
  if (/xác suất|biến cố|không gian mẫu|tổ hợp|chỉnh hợp|hoán vị|kỳ vọng|phương sai|tần suất|tần số|thống kê|nhị thức|cấp số|lượng giác|logarit|lôgarit|đạo hàm|nguyên hàm|tích phân|giới hạn|dãy số/.test(topicText)) return undefined;

  // 3D MVP limits & validation
  const maxPoints = 1000;
  const maxSegments = 2000;
  const maxFaces = 1000;

  const validPoints = new Map<string, any>();
  
  const rawPoints = Array.isArray(geo3d.points) ? geo3d.points.slice(0, maxPoints) : [];
  for (const p of rawPoints) {
    if (!p.id || validPoints.has(p.id)) continue; // Unique ID check
    if (!Number.isFinite(p.x) || Math.abs(p.x) > 10000 ||
        !Number.isFinite(p.y) || Math.abs(p.y) > 10000 ||
        !Number.isFinite(p.z) || Math.abs(p.z) > 10000) continue; // Coordinate bounds check
    validPoints.set(p.id, {
      id: p.id, label: p.label || p.id, x: p.x, y: p.y, z: p.z, color: p.color || '#2563eb'
    });
  }

  if (validPoints.size === 0) {
    console.warn(`[3D Validation] No valid points found for unit "${unit.title}". Falling back to other simulation types.`);
    return undefined;
  }

  const rawSegments = Array.isArray(geo3d.segments) ? geo3d.segments.slice(0, maxSegments) : [];
  const validSegments = rawSegments.filter(s => validPoints.has(s.from) && validPoints.has(s.to)).map((s, i) => ({
    id: `seg-${i}`, from: s.from, to: s.to, dashed: Boolean(s.dashed), color: s.color || '#0f172a'
  }));

  const rawFaces = Array.isArray(geo3d.faces) ? geo3d.faces.slice(0, maxFaces) : [];
  const validFaces = rawFaces.map((f, i) => {
    const pIds = Array.isArray(f.pointIds) ? f.pointIds.filter(id => validPoints.has(id)) : [];
    return {
      id: `face-${i}`, pointIds: pIds, fill: f.fill || '#60a5fa', opacity: f.opacity ?? 0.15
    };
  }).filter(f => f.pointIds.length >= 3); // Must have at least 3 valid points

  return {
    id: uid('sim-3d'),
    title: geo3d.title?.trim() || `Mô phỏng không gian 3D — ${unit.title}`,
    description: geo3d.description?.trim() || `Mô hình 3D tương tác giúp quan sát hình học không gian cho bài: ${unit.title}.`,
    kind: 'geometry3d' as const,
    engine: 'threejs' as const,
    placement: 'step2' as const,
    objectiveIds: [objectiveId],
    studentTask: `Xoay mô hình, quan sát các điểm và góc độ khác nhau để nhận diện tính chất của mảnh kiến thức “${unit.title}”.`,
    interactions: ['Kéo để xoay mô hình', 'Cuộn chuột để phóng to/thu nhỏ', 'Bật/tắt các lớp nét đứt hoặc mặt phẳng'],
    questions: [
      {
        id: uid('sim-q-3d'),
        prompt: `Từ góc nhìn trực diện, quan hệ vị trí của các cạnh trong mô hình thể hiện thế nào?`,
        expectedObservation: 'Học sinh nhận diện được tính vuông góc, song song hoặc chéo nhau.',
      },
    ],
    notebookEntries: [
      {
        id: uid('sim-note-3d'),
        title: `Ghi chú hình học không gian — ${unit.title}`,
        content: 'Ghi lại quan sát về mối quan hệ giữa các điểm, đường thẳng, và mặt phẳng trong mô hình 3D.',
      },
    ],
    geometry3d: {
      showAxes: true,
      autoRotate: false,
      camera: geo3d.camera || { x: 5, y: 4, z: 6 },
      points: Array.from(validPoints.values()),
      segments: validSegments,
      faces: validFaces,
    },
  };
};

const buildUnitFromJsonData = (unit: UnitJson, objectiveId: string, index: number): KnowledgeUnit => {
  const quickCheck = buildAssessmentFromJsonQuestions(
    'quick_check', `Quick check — ${unit.title}`,
    unit.quick_check_questions || [], [objectiveId], 2, 2,
  );

  const workedExampleData = (): WorkedExample => ({
    id: uid('example'),
    title: `Ví dụ minh hoạ — ${unit.title}`,
    problem: unit.worked_example?.problem || `Ví dụ bài toán về: ${unit.title}.`,
    solution: unit.worked_example?.solution || 'Xem lại lời giải chi tiết trong giáo án nguồn.',
    explanation: unit.worked_example?.solution || `Ví dụ minh hoạ cho mảnh kiến thức: ${unit.title}.`,
    objectiveIds: [objectiveId],
    timeLimitSeconds: 180,
    hints: unit.worked_example?.hints || [
      'Đọc kỹ đề bài và xác định dạng toán.',
      'Liên hệ với lý thuyết vừa học.',
      'Trình bày từng bước, không nhảy kết luận.',
    ],
    responseMode: 'short_text',
  });

  const unitGuidingQuestions = (unit.guiding_questions || []).filter(q => q.trim().length > 0);
  const unitGuidingAnswers = (unit.guiding_answers || []).map(a => (a || '').trim());

  const makeRouteContent = (route: LearningRoute): LearningRouteContent => {
    // explanation SẠCH theo tuyến (không nhồi câu hỏi/nhiệm vụ vào — tránh "bước khổng lồ").
    const explanation = (route === 'foundation'
      ? (unit.explanation_foundation || unit.explanation_standard)
      : route === 'challenge'
        ? (unit.explanation_challenge || unit.explanation_standard)
        : unit.explanation_standard) || `Tuyến ${route}: ${unit.title}`;
    return {
      route,
      explanation: explanation.trim(),
      guidingQuestions: unitGuidingQuestions.length > 0 ? unitGuidingQuestions : undefined,
      guidingAnswers: unitGuidingAnswers.some(Boolean) ? unitGuidingAnswers : undefined,
      workedExamples: [workedExampleData()],
      // KHÔNG dùng practice placeholder (tránh gợi ý/đáp án giả). Luyện tập thật nằm ở Olympia/quick check.
      practiceTasks: [],
      aiTutorPrompt: `Hỗ trợ học sinh ở tuyến ${route} học mảnh kiến thức "${unit.title}" bằng chuỗi câu hỏi dẫn dắt siêu nhỏ. Không đưa ngay định nghĩa/công thức; chỉ chốt sau khi học sinh đã quan sát, dự đoán và trả lời từng bước.`,
    };
  };

  return {
    id: uid('unit'),
    title: unit.title,
    objectiveIds: [objectiveId],
    estimatedMinutes: unit.estimated_minutes || (index === 0 ? 8 : 10),
    hookQuestion: unit.hook_question?.trim() || undefined,
    knowledgeConclusion: unit.knowledge_conclusion?.trim() || undefined,
    routes: routeOptions.map(makeRouteContent),
    quickCheck,
    maxRemediationAttempts: 2,
    supportTasks: [],
    enrichmentTasks: [],
    externalToolIds: unit.externalToolIds || [],
    tikzCode: unit.tikz_code?.trim() || undefined,
    simulationSpec: buildGeometry3DSimulationSpecFromJson(unit, objectiveId) || buildHtmlSimulationSpecFromJson(unit, objectiveId),
  };
};

/**
 * Builds an AdaptiveLesson from structured JSON output by the AI content-generation step (PA1+PA2).
 * Falls back to regex-based `buildAdaptiveLessonFromReviewedPlan` if JSON is invalid or missing.
 */
export const buildAdaptiveLessonFromContentJson = (
  source: AdaptiveLessonSource,
  reviewedPlan: string,
  contentJsonText: string,
  teacherId: string,
): AdaptiveLesson => {
  let content: AdaptiveContentJson;
  try {
    content = parseAdaptiveContentJson(contentJsonText);
    validateAdaptiveContentJson(content, source);
  } catch (err) {
    const warningMessages = err instanceof AdaptiveContentValidationError
      ? err.issues.map(toWarningMessage)
      : [`json_parse_error: ${err instanceof Error ? err.message : String(err)}`];
    console.warn('Không dùng được JSON nội dung từ AI, chuyển sang bản dựng dự phòng:', warningMessages, contentJsonText);
    return buildFallbackLessonWithWarnings(source, reviewedPlan, teacherId, warningMessages);
  }

  const now = new Date().toISOString();
  const title = content.title?.trim() || inferTitle(source, reviewedPlan);

  const rawObjectives = Array.isArray(content.objectives) && content.objectives.length
    ? content.objectives
    : [{ title: 'Nắm được kiến thức trọng tâm của bài', bloom: 'understand' }];

  const bloomLevelValues = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
  const objectives = rawObjectives.slice(0, 6).map((obj, index) => ({
    id: uid('obj'),
    code: `OBJ-${index + 1}`,
    title: obj.title || `Mục tiêu ${index + 1}`,
    description: obj.title || `Mục tiêu ${index + 1}`,
    bloomLevel: (bloomLevelValues.includes(obj.bloom ?? '') ? obj.bloom : index < 2 ? 'understand' : 'apply') as BloomLevel,
    masteryThreshold: typeof obj.threshold === 'number' ? obj.threshold : (index < 2 ? 0.7 : 0.75),
    prerequisiteObjectiveIds: [],
    commonMisconceptions: [],
  }));
  const objectiveIds = objectives.map(o => o.id);

  const engage = content.engage && typeof content.engage === 'object' ? content.engage : undefined;
  const objectiveByBloom = (level: BloomLevel, fallbackIndex: number) =>
    objectives.find(o => o.bloomLevel === level)?.title || objectives[fallbackIndex]?.title || objectives[0]?.title || title;

  const diagnosticTest = buildAssessmentFromJsonQuestions(
    'diagnostic', 'Pre-test đầu giờ',
    Array.isArray(content.diagnostic_questions) ? content.diagnostic_questions : [],
    objectiveIds, 5, 7,
  );

  const exitTicket = buildAssessmentFromJsonQuestions(
    'exit_ticket', 'Exit ticket cuối bài',
    Array.isArray(content.exit_ticket_questions) ? content.exit_ticket_questions : [],
    objectiveIds, 3, 3,
  );

  const rawUnits = Array.isArray(content.units) && content.units.length ? content.units : [];
  const knowledgeUnits = rawUnits.length
    ? rawUnits.slice(0, 6).map((unit, index) =>
        buildUnitFromJsonData(
          unit,
          objectiveIds[index % Math.max(objectiveIds.length, 1)] || objectiveIds[0],
          index,
        )
      )
    : objectives.slice(0, 3).map((obj, index) => makeUnit(obj.title, obj.id, source.title || title, index));

  return {
    id: `adaptive-${Date.now()}`,
    title,
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
      readingInstructions:
        engage?.reading_instructions?.trim() ||
        engage?.reality_check_message?.trim() ||
        `Đọc trước nội dung "${title}", ghi lại những điểm còn chưa hiểu để làm pre-test đầu giờ.`,
      engage: {
        storyHook: engage?.story_hook?.trim(),
        realityCheckMessage: engage?.reality_check_message?.trim(),
        guidingQuestion: engage?.guiding_question?.trim(),
        guidingQuestionBox: engage?.guiding_question_box?.trim(),
        bigTitle: engage?.big_title?.trim(),
        studentExpectationPrompt: engage?.student_expectation_prompt?.trim(),
        routeGoals: {
          foundation: engage?.foundation_goal?.trim() || objectiveByBloom('understand', 0),
          standard: engage?.standard_goal?.trim() || objectiveByBloom('apply', 1),
          challenge: engage?.challenge_goal?.trim() || objectiveByBloom('analyze', 2),
        },
        visualCards: (engage?.visual_cards || [])
          .filter(card => card?.title && (card?.svg || card?.imageDataUrl))
          .map(card => ({
            id: uid('vcard'),
            title: card.title.trim(),
            alt: card.alt?.trim() || card.title.trim(),
            caption: card.caption?.trim(),
            imageDataUrl: card.imageDataUrl ||
              (card.svg ? `data:image/svg+xml;utf8,${encodeURIComponent(card.svg)}` : ''),
          })),
      },
      guidingQuestions: [
        engage?.story_hook?.trim(),
        engage?.guiding_question?.trim(),
        engage?.guiding_question_box?.trim(),
        engage?.student_expectation_prompt?.trim(),
        engage?.foundation_goal?.trim(),
        engage?.standard_goal?.trim(),
        engage?.challenge_goal?.trim(),
      ].filter((item): item is string => Boolean(item && item.length > 0)),
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
    diagnosticTest,
    knowledgeUnits,
    exitTicket,
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
    generationSource: 'ai_json',
  };
};

/**
 * Focused prompt asking AI to output structured JSON with real questions and 3-route content.
 * Used as the second AI call after teacher approves the pedagogical review (PA1+PA2).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getRelevantToolsForLesson = (source: AdaptiveLessonSource): Array<{ id: string; name: string; topic: string }> => {
  try {
    // Dynamic import at build time via Vite's static analysis
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tools: Array<{ id: string; name: string; topic: string; gradeLevel?: number; isEmbeddable?: boolean }> =
      require('../../data/externalToolsData.json');
    const titleWords = (source.title || '').toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const contentSnippet = (source.content || '').toLowerCase().slice(0, 3000);
    const gradeNum = parseInt(source.grade || '10', 10);
    return tools
      .filter(t => {
        if (!t.isEmbeddable) return false;
        const topicLower = (t.topic || '').toLowerCase();
        const gradeMatch = !t.gradeLevel || t.gradeLevel === gradeNum;
        const keywordMatch = titleWords.some(kw => topicLower.includes(kw)) ||
          contentSnippet.includes((t.name || '').toLowerCase().slice(0, 10));
        return gradeMatch && keywordMatch;
      })
      .slice(0, 10)
      .map(t => ({ id: t.id, name: t.name, topic: t.topic }));
  } catch {
    return [];
  }
};

export const buildAdaptiveContentPrompt = (source: AdaptiveLessonSource, reviewedPlan: string): string => {
  const relevantTools = getRelevantToolsForLesson(source);
  const toolsSection = relevantTools.length > 0
    ? `\nCÔNG CỤ TƯƠNG TÁC CÓ SẴN (dùng id chính xác trong externalToolIds):\n${relevantTools.map(t => `- "${t.id}" — ${t.name} (${t.topic})`).join('\n')}\n`
    : '';
  return `Bạn là chuyên gia thiết kế nội dung bài học Toán phân hoá.

THÔNG TIN BÀI HỌC:
- Tên bài: ${source.title || 'Chưa rõ'}
- Lớp: ${source.grade || '10'}

GIÁO ÁN NGUỒN:
---
${source.content.slice(0, 12000)}
---

BẢN THIẾT KẾ SƯ PHẠM ĐÃ RÀ SOÁT:
---
${reviewedPlan.slice(0, 5000)}
---
${toolsSection}

NHIỆM VỤ: Tạo nội dung bài học phân hoá cụ thể dựa trên giáo án trên.
Câu hỏi phải dùng nội dung toán học thật — có công thức, số liệu cụ thể — KHÔNG phải placeholder.

OUTPUT: Trả về DUY NHẤT một JSON object hợp lệ theo schema dưới đây. Không có text trước hoặc sau JSON.

{
  "title": "Tên bài học đầy đủ",
  "objectives": [
    {"title": "Mục tiêu học tập cụ thể 1", "bloom": "understand", "threshold": 0.70},
    {"title": "Mục tiêu 2", "bloom": "apply", "threshold": 0.75},
    {"title": "Mục tiêu 3", "bloom": "analyze", "threshold": 0.75}
  ],
  "engage": {
    "story_hook": "Câu chuyện/tình huống mở đầu đúng nội dung bài học, nêu rõ khái niệm toán học trọng tâm; với bài Ba đường conic phải nhắc đến elip, hypebol, parabol hoặc quỹ đạo/tiêu điểm/đường chuẩn.",
    "reality_check_message": "Cú sốc thực tế hoặc nhiệm vụ quan sát có số liệu/công thức cụ thể liên quan trực tiếp bài học; KHÔNG viết mô tả UI chung chung.",
    "guiding_question": "Câu hỏi lớn dẫn vào bài học, có thuật ngữ toán của bài.",
    "guiding_question_box": "Câu hỏi trong hộp gợi mở để học sinh dự đoán/so sánh trước khi học.",
    "big_title": "Tiêu đề lớn của màn Khởi động, đúng tên bài và vấn đề toán học.",
    "student_expectation_prompt": "Gợi ý học sinh tự viết kỳ vọng học tập cho bài này.",
    "foundation_goal": "Mục tiêu Cơ bản đúng bài học.",
    "standard_goal": "Mục tiêu Trọng tâm đúng bài học.",
    "challenge_goal": "Mục tiêu Nâng cao đúng bài học.",
    "reading_instructions": "Hướng dẫn chuẩn bị trước giờ học, trích/paraphrase từ mục 'Đọc trước'/'Chuẩn bị' trong giáo án nguồn. KHÔNG bịa ngữ cảnh mới.",
    "visual_cards": [
      {"title": "Tiêu đề minh họa 1 — đúng chủ đề bài", "alt": "Mô tả ngắn", "caption": "Chú thích giải thích ứng dụng thực tế", "svg": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'><!-- SVG minh họa đúng chủ đề bài, màu sắc đẹp, có text --></svg>"},
      {"title": "Tiêu đề minh họa 2", "alt": "Mô tả ngắn", "caption": "Chú thích", "svg": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'><!-- SVG --></svg>"},
      {"title": "Tiêu đề minh họa 3", "alt": "Mô tả ngắn", "caption": "Chú thích", "svg": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'><!-- SVG --></svg>"},
      {"title": "Tiêu đề minh họa 4", "alt": "Mô tả ngắn", "caption": "Chú thích", "svg": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'><!-- SVG --></svg>"}
    ]
  },
  "units": [
    {
      "title": "Tên mảnh kiến thức 1 — chỉ một ý nhỏ, không gộp nhiều định nghĩa/công thức/tính chất",
      "objective_index": 0,
      "estimated_minutes": 10,
      "hook_question": "Một câu hỏi gợi mở ngắn để học sinh dự đoán trước khi đọc lý thuyết.",
      "guiding_questions": [
        "Câu hỏi 1 — Quan sát: Em thấy điều gì đặc biệt ở hình/dữ kiện này?",
        "Câu hỏi 2 — So sánh: Khi thay đổi X thì Y thay đổi như thế nào?",
        "Câu hỏi 3 — Phát hiện quy luật: Có điều gì giữ nguyên không đổi trong mọi trường hợp?",
        "Câu hỏi 4 — Áp dụng thử: Nếu áp dụng nhận xét trên vào bài toán cụ thể, ta tính được gì?",
        "Câu hỏi 5 — Chốt công thức: Em có thể tự phát biểu công thức/định nghĩa bằng lời của mình không?"
      ],
      "student_task": "Nhiệm vụ thao tác/nghĩ thử: học sinh kéo mô phỏng, thử số liệu hoặc viết dự đoán trước khi xem chốt kiến thức.",
      "visual_instruction": "Mô tả hình minh hoạ hoặc mô phỏng cần quan sát: điểm/đường/thanh trượt/đại lượng thay đổi và đại lượng giữ nguyên.",
      "knowledge_conclusion": "Chốt kiến thức ngắn gọn sau chuỗi câu hỏi; chỉ nêu một định nghĩa/công thức/tính chất cốt lõi của mảnh này.",
      "explanation_foundation": "Gợi ý tuyến Cơ bản: diễn giải trực quan, chậm, không nhồi toàn bộ lý thuyết; hỗ trợ trả lời từng câu hỏi dẫn dắt.",
      "explanation_standard": "Gợi ý tuyến Trọng tâm: kết nối câu trả lời của học sinh với công thức/định nghĩa chuẩn SGK của riêng mảnh này.",
      "explanation_challenge": "Gợi ý tuyến Nâng cao: yêu cầu giải thích vì sao công thức/tính chất đúng hoặc mở rộng một bước, vẫn không gộp sang mảnh khác.",
      "worked_example": {
        "problem": "Bài toán ví dụ cụ thể với số liệu từ nội dung bài, dùng LaTeX nếu cần",
        "solution": "Bước 1: ... Bước 2: ... Bước 3: ... Kết luận: ...",
        "hints": ["Gợi ý 1: Xác định dạng bài", "Gợi ý 2: Áp dụng công thức...", "Gợi ý 3: Kiểm tra điều kiện"]
      },
      "quick_check_questions": [
        {
          "prompt": "Câu hỏi trắc nghiệm thật với số liệu cụ thể",
          "options": ["A. 5", "B. 10", "C. 15", "D. 20"],
          "correct": 1,
          "explanation": "Đáp án B vì...",
          "hints": ["Tầng 1 — nhắc lý thuyết/công thức cần dùng, CHƯA tính, KHÔNG lộ đáp số", "Tầng 2 — chỉ ra bước đầu tiên cần làm", "Tầng 3 — gần xong: nêu cách ráp các bước nhưng vẫn để học sinh tự ra đáp số"]
        },
        {
          "prompt": "Câu 2 của quick check",
          "options": ["A. -5", "B. -10", "C. -15", "D. -20"],
          "correct": 3,
          "explanation": "Giải thích dựa trên công thức/định nghĩa của bài.",
          "hints": ["Tầng 1 — nhắc khái niệm liên quan", "Tầng 2 — gợi bước làm đầu", "Tầng 3 — gợi ý gần đáp án"]
        }
      ],
      "simulation_html": {
        "title": "Mô phỏng tương tác 2D (Chỉ dùng nếu có yêu cầu kéo/thả tương tác)",
        "description": "Mini-app cho học sinh kéo thanh trượt/điểm và quan sát đại lượng toán học thay đổi.",
        "srcDoc": "<!doctype html><html><body><svg id=\"scene\" width=\"720\" height=\"360\"></svg><input id=\"slider\" type=\"range\" min=\"0\" max=\"100\" value=\"50\"><script>const svg=document.getElementById('scene');const slider=document.getElementById('slider');function draw(){svg.innerHTML='';/* vẽ mô phỏng theo nội dung bài */}slider.addEventListener('input',draw);draw();</script></body></html>",
        "height": 600,
        "libraries": ["svg"],
        "safetyNotes": ["HTML chạy trong iframe sandbox; không dùng link ngoài, không truy cập parent DOM."]
      },
      "simulation_3d": {
        "title": "Mô hình 3D xoay được (Chỉ dùng cho hình học không gian)",
        "description": "Học sinh xoay/zoom để quan sát.",
        "camera": { "x": 5, "y": 4, "z": 6 },
        "points": [
          { "id": "A", "label": "A", "x": 0, "y": 0, "z": 0, "color": "#2563eb" },
          { "id": "S", "label": "S", "x": 0, "y": 4, "z": 0, "color": "#ef4444" }
        ],
        "segments": [
          { "from": "S", "to": "A", "dashed": false, "color": "#0f172a" }
        ],
        "faces": [
          { "pointIds": ["S", "A"], "fill": "#60a5fa", "opacity": 0.2 }
        ]
      }
    }
  ],
  "diagnostic_questions": [
    {"prompt": "Câu 1. (mức nhận biết, có số liệu cụ thể)", "options": ["A. 1", "B. 2", "C. 3", "D. 4"], "correct": 0, "explanation": "...", "difficulty": "easy"},
    {"prompt": "Câu 2.", "options": ["A. 1", "B. 2", "C. 3", "D. 4"], "correct": 2, "explanation": "...", "difficulty": "easy"},
    {"prompt": "Câu 3.", "options": ["A. 1", "B. 2", "C. 3", "D. 4"], "correct": 1, "explanation": "...", "difficulty": "medium"},
    {"prompt": "Câu 4.", "options": ["A. 1", "B. 2", "C. 3", "D. 4"], "correct": 3, "explanation": "...", "difficulty": "medium"},
    {"prompt": "Câu 5. (mức vận dụng)", "options": ["A. 1", "B. 2", "C. 3", "D. 4"], "correct": 2, "explanation": "...", "difficulty": "hard"}
  ],
  "exit_ticket_questions": [
    {"prompt": "Exit ticket 1", "options": ["A. 1", "B. 2", "C. 3", "D. 4"], "correct": 0, "explanation": "..."},
    {"prompt": "Exit ticket 2", "options": ["A. 1", "B. 2", "C. 3", "D. 4"], "correct": 1, "explanation": "..."},
    {"prompt": "Exit ticket 3", "options": ["A. 1", "B. 2", "C. 3", "D. 4"], "correct": 2, "explanation": "..."}
  ]
}

QUY TẮC BẮT BUỘC:
1. Câu hỏi phải có nội dung toán thật, có số và công thức cụ thể — KHÔNG viết "Câu hỏi 1" hay text placeholder.
2. Mỗi câu có đúng 4 đáp án A/B/C/D. "correct" là index (0=A, 1=B, 2=C, 3=D). Đáp án đúng ở vị trí ngẫu nhiên.
3. Phương án sai phải là "mồi" hợp lý — học sinh yếu có thể nhầm.
4. Dùng LaTeX cho công thức: bọc $...$ inline, $$...$$ block. BẮT BUỘC bọc MỌI biểu thức, phương trình, điểm (VD: $p=10$, $F_1(-4;0)$) trong dấu $. Dùng $\displaystyle ...$ cho các công thức có phân số để không bị nhỏ. KHÔNG viết công thức dạng plain text.
5. Tạo đúng 1 object engage có nội dung Khởi động thật của bài học. Cấm lấy các yêu cầu UI/UX như "bố cục 7:3", "đồng hồ kép", "mục lục thông minh" làm nội dung học sinh đọc ở màn Khởi động.
6. Tạo đúng 5 diagnostic_questions (2 easy, 2 medium, 1 hard), 2 quick_check_questions mỗi unit, 3 exit_ticket_questions.
6b. MỖI quick_check_question BẮT BUỘC có "hints" = đúng 3 gợi ý tiến dần (tầng 1 → tầng 3) cho cơ chế hỗ trợ khi học sinh trả lời sai: tầng 1 chỉ nhắc lý thuyết/công thức cần dùng và TUYỆT ĐỐI KHÔNG lộ đáp số; tầng 2 gợi bước làm đầu tiên; tầng 3 gợi gần đáp án nhưng vẫn để học sinh tự tính ra kết quả cuối. 3 gợi ý phải KHÁC nhau và KHÁC với "explanation" (explanation là lời giải đầy đủ chỉ hiện sau khi sai 4 lần).
7. BẮT BUỘC SINH ÍT NHẤT 3 MẢNH KIẾN THỨC (units). Số units tối thiểu = max(3, số objectives). Nếu objectives có 3 mục tiêu → ít nhất 3 units, mỗi unit gắn với 1 objective qua "objective_index" (index bắt đầu từ 0). Nếu source có nhiều HĐ/bước, mỗi HĐ trọng tâm → 1 unit riêng. Mỗi unit vẫn là một đơn vị nhỏ: chỉ một định nghĩa HOẶC một công thức HOẶC một tính chất. Thêm "objective_index": 0 và "estimated_minutes": 10 vào mỗi unit.
8. Mỗi unit BẮT BUỘC có hook_question, ÍT NHẤT 5 guiding_questions theo chuỗi Socratic (quan sát → so sánh → phát hiện quy luật → áp dụng thử → chốt công thức), student_task, visual_instruction và knowledge_conclusion. Trình tự sư phạm: hỏi gợi mở → quan sát hình/mô phỏng → chuỗi câu hỏi dẫn dắt → học sinh dự đoán/trả lời → chốt kiến thức ngắn. KHÔNG đưa nguyên đoạn lý thuyết dài ngay từ đầu.
9. knowledge_conclusion phải ngắn, tối đa khoảng 5-7 câu hoặc một công thức trọng tâm. Phần explanation_ chỉ là gợi ý theo tuyến học để giúp học sinh trả lời chuỗi câu hỏi, không được lặp lại một bài giảng dài.
10. 3 trường explanation_ của mỗi unit phải có nội dung thực sự khác nhau về độ sâu và cách tiếp cận.
11. Mỗi unit NẾU CẦN MÔ PHỎNG:
    - NẾU là hình học không gian 3D: DÙNG 'simulation_3d'. Trả về đúng mảng tọa độ 'points' (x,y,z), mảng 'segments' (từ điểm nào tới điểm nào) và 'faces'. KHÔNG ĐƯỢC tự viết mã WebGL/Three.js.
    - NẾU là tương tác 2D cần kéo thả: Chọn công cụ phù hợp qua 'externalToolIds' thay vì dùng 'simulation_html'. KHÔNG sinh SVG hay iframe trong 'srcDoc'.
    - NẾU chỉ cần hình minh họa 2D tĩnh: Bỏ qua simulation, chỉ cần dùng mã TikZ ở bước thiết kế sư phạm.
12. Nội dung học sinh đọc KHÔNG được lẫn thuật ngữ quy trình/hệ thống như UI/UX, bố cục 7:3, đồng hồ kép, mục lục thông minh, Socratic, Vở Ghi Chép, schema.
13. RẤT QUAN TRỌNG: Vì output là JSON, bạn phải DOUBLE ESCAPE mọi dấu backslash trong LaTeX. Ví dụ: viết \\frac thay vì \frac, \\sqrt thay vì \sqrt, \\Delta thay vì \Delta. Nếu không JSON.parse sẽ báo lỗi.
14. Trả về đúng JSON hợp lệ, không markdown, không giải thích ngoài JSON.
15. engage.reading_instructions PHẢI trích hoặc paraphrase từ mục "Đọc trước"/"Chuẩn bị"/"Ôn tập" trong giáo án nguồn. KHÔNG bịa ngữ cảnh hoặc tên chủ đề không liên quan.
16. engage.visual_cards BẮT BUỘC có đúng 4 thẻ SVG minh họa đúng chủ đề bài học này. Mỗi SVG phải: (a) có viewBox="0 0 640 420", (b) dùng gradient màu đẹp làm nền, (c) có text tiêu đề và chú thích bằng tiếng Việt, (d) minh họa một ứng dụng/khái niệm thực tế liên quan BÀI NÀY — TUYỆT ĐỐI không dùng hình Conic/Elip/Parabol/Hyperbol nếu bài không liên quan conic.
17. Mỗi unit BẮT BUỘC có ít nhất 1 học liệu trực quan. Ưu tiên theo thứ tự: (a) nếu có tool trong danh sách CÔNG CỤ CÓ SẪN phù hợp chủ đề → đặt id vào "externalToolIds"; (b) nếu cần hình 2D tĩnh → đặt mã TikZ hợp lệ vào "tikz_code" (BẮT BUỘC có \\begin{tikzpicture}...\\end{tikzpicture}, double-escape backslash vì trong JSON); (c) nếu hình học không gian → dùng "simulation_3d". KHÔNG để unit không có học liệu nào. Hình/mô phỏng này còn được TÁI DÙNG ở phần Luyện tập và Vận dụng nên hãy chọn học liệu thật sự minh hoạ được khái niệm cốt lõi của mảnh (đúng phân môn, KHÔNG vẽ hình hình học cho bài đại số/xác suất/giải tích).`;
};

export const buildAdaptiveReviewPrompt = (source: AdaptiveLessonSource): string =>
  `Bạn là chuyên gia rà soát và thiết kế lại giáo án Toán thành bài học phân hoá 40 phút.

THÔNG TIN BÀI HỌC:
- Tên bài: ${source.title || 'Chưa rõ'}
- Lớp: ${source.grade || '10'}
- Tuần: ${source.week || 'Chưa rõ'}
- Nguồn: ${source.sourceLabel || 'Giáo án nguồn'}

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
6. HỌC LIỆU TRỰC QUAN — BẮT BUỘC ghi rõ để giáo viên duyệt TRƯỚC khi sinh: với MỖI mảnh kiến thức nêu đúng 1 dòng "Học liệu trực quan:" gồm (a) LOẠI — chọn đúng theo phân môn Toán: mô phỏng tương tác HTML (kéo/thả, thanh trượt) / hình SVG tĩnh / hình TikZ / mô hình 3D xoay (CHỈ cho hình học không gian) / công cụ ngoài; (b) MÔ TẢ ngắn nó vẽ gì, đại lượng nào thay đổi, đại lượng nào giữ nguyên. Lưu ý phân môn: Xác suất/Thống kê/Tổ hợp → sơ đồ cây/bảng 2 chiều/Venn/mô phỏng phép thử, TUYỆT ĐỐI không mô hình 3D (kể cả khi có cụm "không gian mẫu"); Hình học phẳng → SVG/TikZ; Hình học không gian → 3D; Hàm số/Giải tích → đồ thị động. Ở mục 2 cũng liệt kê gộp toàn bộ học liệu này.

CHUẨN BÀI HỌC PHÂN HOÁ BẮT BUỘC:
I. UI/UX và trải nghiệm học tập
- Màn hình học tập dùng bố cục 7:3: 70% bên trái là bài giảng tương tác/giải quyết vấn đề; 30% bên phải là “Vở Ghi Chép” tự động lưu định lý, công thức, kết luận cốt lõi khi học sinh vượt qua từng chướng ngại.
- Có đồng hồ kép: đồng hồ tổng 40:00 và đồng hồ cục bộ cho từng phần.
- Có mục lục thông minh điều hướng giữa Bước 0 đến Bước 5.
- Đồ họa chống lỗi: hình phẳng ưu tiên mô tả để dựng bằng SVG nội tuyến; bài hình học không gian phải mô tả được cấu trúc 3D xoay được bằng engine Three.js/WebGL nội bộ.
- Chuẩn bị đầy đủ học liệu số/mô phỏng tương tác cho học sinh.

II. Khung kịch bản sư phạm
- Bước 0 — Pre-test: 5 phút, ít nhất 5 câu đo nhận biết, thông hiểu, vận dụng từ thấp đến cao. Sau nộp phải có điểm, đúng/sai, giải thích từng phương án và đề xuất tuyến Foundation/Standard/Challenge.
- Bước 1 — Khởi động & Gắn kết: có câu chuyện lịch sử hoặc tình huống thực tế; có trải nghiệm bế tắc bằng công cụ tương tác; học sinh tự điền kỳ vọng; hệ thống in mục tiêu theo 3 cấp.
- Bước 2 — Kiến tạo tri thức: mọi đơn vị kiến thức phải được chia nhỏ; mỗi mảnh chỉ xử lý một ý cốt lõi và đi theo chuỗi hỏi gợi mở → quan sát hình/mô phỏng → câu hỏi dẫn dắt siêu nhỏ → học sinh dự đoán/trả lời → chốt công thức/định nghĩa/tính chất ngắn; Trial & Error không khóa luồng, quick check sau từng nội dung, remediate khi sai, chốt công thức/định lý vào Vở Ghi Chép.
- Bước 3 — Áp dụng luyện tập: sinh luyện tập theo năng lực Trung bình/Khá/Giỏi; có remediation loop 4 tầng.
- Bước 4 — Mở rộng: bài toán thực tiễn đặt học sinh vào vai chuyên gia/kỹ sư xử lý sự cố.
- Bước 5 — Tổng kết: sơ đồ tư duy, checklist mục tiêu, tự đánh giá, hộp thư câu hỏi, Time-Filler nếu còn thời gian.

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
- Bố cục 7:3:
- Đồng hồ kép:
- Mục lục thông minh:
- Danh sách SVG/mô phỏng nội tuyến cần dựng:
- Danh sách mô phỏng 3D xoay được nếu có:
- Học liệu số/tương tác cần chuẩn bị:

## 3. Bước 0 — Pre-test chẩn đoán 5 phút
| Câu | Loại câu | Mức độ | Nội dung | Phương án/Đáp án | Giải thích từng phương án hoặc tiêu chí | Mục tiêu đo | Dữ liệu phân tuyến |
|---:|---|---|---|---|---|---|---|

## 4. Quy tắc phân tuyến sau Pre-test
| Điều kiện | Tuyến | Nội dung bài học ưu tiên | Can thiệp AI |
|---|---|---|---|

## 5. Bước 1 — Khởi động & Gắn kết
- Câu chuyện/tình huống thực tế:
- Công cụ tương tác gây “bế tắc”:
- Kỳ vọng học sinh tự điền:
- Mục tiêu Cơ bản/Trọng tâm/Nâng cao:

## 6. Bước 2 — Kiến tạo tri thức Socratic
### Mảnh kiến thức 1: ...
- Phạm vi mảnh: chỉ một định nghĩa/công thức/tính chất nhỏ; nếu có nhiều ý phải tách tiếp thành Mảnh 2, Mảnh 3...
- Câu hỏi gợi mở đầu mảnh:
- Học liệu trực quan (LOẠI + MÔ TẢ): nêu rõ loại (mô phỏng tương tác HTML / SVG tĩnh / TikZ / 3D xoay / công cụ ngoài) đúng phân môn và nó vẽ gì, đại lượng nào thay đổi/giữ nguyên.
- Câu hỏi dẫn dắt siêu nhỏ: ít nhất 3 câu, đi từ quan sát đến phát hiện quy luật rồi mới đến công thức/định nghĩa.
- Nhiệm vụ học sinh dự đoán/thử sai trên hình hoặc mô phỏng:
- Trial & Error: phản hồi khi đúng/sai:
- Quick check sau khi chốt kiến thức:
- Remediate khi sai:
- Chốt vào Vở Ghi Chép: ngắn, đúng một ý cốt lõi.
- Dữ liệu AI cần ghi nhận:

## 7. Bước 3 — Áp dụng luyện tập thích ứng
### Mức Trung bình
- Phần 1:
- Phần 2:
- Phần 3:
- Remediation loop 4 tầng:

### Mức Khá
- Phần 1:
- Phần 2:
- Phần 3:
- Remediation loop 4 tầng:

### Mức Giỏi
- Phần 1:
- Phần 2:
- Phần 3:
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
- Time-Filler nếu còn thời gian:

## 10. Tiêu chuẩn Toán học, mô phỏng và đóng gói
- Công thức MathJax/LaTeX cần dùng:
- Quy chuẩn ký hiệu đặc biệt:
- Yêu cầu độc lập, không phụ thuộc link ảnh ngoài:
- Đặc tả mô phỏng SVG/3D nếu cần:

## 11. Bản đồ chuyển đổi sang bài học phân hoá
| Thành phần | Nội dung đã duyệt | Ghi chú triển khai |
|---|---|---|
`;

// ============================================================
// Multi-call pipeline: Blueprint → Visual Cards → Assessments → Units
// Mỗi call nhỏ, cô lập lỗi — fail 1 bước không crash toàn bộ.
// ============================================================

interface BlueprintJson {
  title?: string;
  objectives?: ObjectiveJson[];
  engage?: Omit<EngageJson, 'visual_cards'>;
  unit_outline?: Array<{ title: string; objective_index: number }>;
}

interface VisualCardsJson {
  visual_cards?: Array<{ title: string; alt: string; caption?: string; svg?: string; imageDataUrl?: string }>;
}

interface AssessmentsJson {
  diagnostic_questions?: QuestionJson[];
  exit_ticket_questions?: QuestionJson[];
}

export type AdaptivePipelineProgress = (message: string) => void;

const buildBlueprintPrompt = (source: AdaptiveLessonSource, reviewedPlan: string): string =>
  `Bạn là chuyên gia thiết kế bài học Toán phân hoá.

THÔNG TIN: Bài "${source.title || 'Chưa rõ'}" - Lớp ${source.grade || '10'}

GIÁO ÁN NGUỒN (trích):
---
${source.content.slice(0, 8000)}
---

BẢN RÀ SOÁT ĐÃ DUYỆT (trích):
---
${reviewedPlan.slice(0, 4000)}
---

NHIỆM VỤ: Tạo khung bài học phân hoá. Trả về DUY NHẤT một JSON hợp lệ, không giải thích.

{
  "title": "Tên bài đầy đủ",
  "objectives": [
    {"title": "Mục tiêu học tập cụ thể 1", "bloom": "understand", "threshold": 0.70},
    {"title": "Mục tiêu 2", "bloom": "apply", "threshold": 0.75},
    {"title": "Mục tiêu 3", "bloom": "analyze", "threshold": 0.75}
  ],
  "engage": {
    "story_hook": "MỘT tình huống/câu chuyện thực tế mở đầu DUY NHẤT liên quan nội dung toán của bài.",
    "reality_check_message": "Cú sốc/điểm bất ngờ NẰM TRONG CHÍNH tình huống story_hook ở trên (cùng bối cảnh, cùng nhân vật/đối tượng) — KHÔNG được nêu một tình huống/bài toán KHÁC. Chỉ làm sâu thêm story_hook để gây tò mò.",
    "guiding_question": "Câu hỏi lớn dẫn vào bài, bám đúng tình huống story_hook, có thuật ngữ toán của bài.",
    "guiding_question_box": "Câu hỏi trong hộp gợi mở để học sinh dự đoán/so sánh trước khi học.",
    "big_title": "Tiêu đề lớn màn Khởi động, đúng tên bài và vấn đề toán học.",
    "student_expectation_prompt": "Gợi ý học sinh tự viết kỳ vọng học tập.",
    "foundation_goal": "Mục tiêu Cơ bản đúng bài học.",
    "standard_goal": "Mục tiêu Trọng tâm đúng bài học.",
    "challenge_goal": "Mục tiêu Nâng cao đúng bài học.",
    "reading_instructions": "Hướng dẫn chuẩn bị trước giờ học, trích/paraphrase từ giáo án nguồn."
  },
  "unit_outline": [
    {"title": "Tên mảnh kiến thức 1 — một ý nhỏ duy nhất", "objective_index": 0},
    {"title": "Mảnh 2 — ý nhỏ khác", "objective_index": 1},
    {"title": "Mảnh 3", "objective_index": 2}
  ]
}

QUY TẮC:
1. objectives: tối thiểu 3, tối đa 6. Mỗi mục tiêu cụ thể, có thuật ngữ toán của bài.
2. unit_outline: tối thiểu max(3, số objectives) mục. Mỗi mục chỉ một ý nhỏ (một định nghĩa HOẶC một công thức HOẶC một tính chất).
3. objective_index là index (từ 0) vào mảng objectives.
4. reading_instructions trích/paraphrase từ mục "Đọc trước"/"Chuẩn bị" trong giáo án nguồn — không bịa.
5. Không lẫn thuật ngữ UI/UX vào nội dung học sinh đọc.
6. Double-escape LaTeX trong JSON (\\\\frac thay vì \\frac).
7. Trả về đúng JSON hợp lệ. Không markdown, không giải thích ngoài JSON.`;

const buildVisualCardsPrompt = (source: AdaptiveLessonSource, objectives: ObjectiveJson[]): string =>
  `Bạn là chuyên gia thiết kế hình ảnh minh họa cho bài học Toán.

BÀI HỌC: "${source.title || 'Chưa rõ'}" - Lớp ${source.grade || '10'}
MỤC TIÊU: ${objectives.map((o, i) => `${i + 1}. ${o.title}`).join('; ')}

NHIỆM VỤ: Tạo đúng 4 thẻ hình ảnh SVG minh họa cho bài học này.
Trả về DUY NHẤT một JSON hợp lệ, không giải thích.

{
  "visual_cards": [
    {"title": "Tiêu đề minh họa 1 — đúng chủ đề bài", "alt": "Mô tả ngắn", "caption": "Chú thích giải thích ứng dụng thực tế", "svg": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'><!-- SVG minh họa --></svg>"},
    {"title": "Minh họa 2", "alt": "...", "caption": "...", "svg": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'>...</svg>"},
    {"title": "Minh họa 3", "alt": "...", "caption": "...", "svg": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'>...</svg>"},
    {"title": "Minh họa 4", "alt": "...", "caption": "...", "svg": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 420'>...</svg>"}
  ]
}

QUY TẮC:
1. Đúng 4 thẻ SVG.
2. Mỗi SVG: (a) viewBox="0 0 640 420", (b) nền gradient đẹp, (c) text tiêu đề và chú thích tiếng Việt, (d) minh họa ứng dụng/khái niệm thực tế liên quan BÀI NÀY.
3. Không dùng hình Conic/Elip/Parabol/Hyperbol nếu bài không liên quan conic.
4. SVG phải valid XML. Không dùng &amp;, &lt; trong text — dùng ký tự thật.
5. Không nhúng LaTeX hay MathJax vào SVG — dùng Unicode hoặc ký hiệu thường.
6. TUYỆT ĐỐI tự vẽ bằng thẻ SVG; CẤM dùng <image>/<img> trỏ URL ngoài hay link ảnh internet (chống vỡ hình).
7. Trả về đúng JSON hợp lệ. Không markdown, không giải thích ngoài JSON.`;

const buildAssessmentsPrompt = (source: AdaptiveLessonSource, objectives: ObjectiveJson[], unitTitles: string[]): string =>
  `Bạn là chuyên gia thiết kế bài kiểm tra Toán phân hoá.

BÀI HỌC: "${source.title || 'Chưa rõ'}" - Lớp ${source.grade || '10'}
MỤC TIÊU: ${objectives.map((o, i) => `${i + 1}. ${o.title}`).join('; ')}
CÁC MẢNH KIẾN THỨC: ${unitTitles.join(', ')}

NHIỆM VỤ: Tạo bộ câu hỏi pre-test và exit ticket. Trả về DUY NHẤT một JSON hợp lệ, không giải thích.

{
  "diagnostic_questions": [
    {"prompt": "Câu 1. (nhận biết, có số liệu cụ thể)", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correct": 0, "explanation": "Đáp án A vì...", "difficulty": "easy"},
    {"prompt": "Câu 2.", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correct": 2, "explanation": "...", "difficulty": "easy"},
    {"prompt": "Câu 3.", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correct": 1, "explanation": "...", "difficulty": "medium"},
    {"prompt": "Câu 4.", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correct": 3, "explanation": "...", "difficulty": "medium"},
    {"prompt": "Câu 5. (vận dụng)", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correct": 2, "explanation": "...", "difficulty": "hard"}
  ],
  "exit_ticket_questions": [
    {"prompt": "Exit ticket 1", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correct": 0, "explanation": "..."},
    {"prompt": "Exit ticket 2", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correct": 1, "explanation": "..."},
    {"prompt": "Exit ticket 3", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correct": 2, "explanation": "..."}
  ]
}

QUY TẮC:
1. Câu hỏi có nội dung toán thật, số và công thức cụ thể — KHÔNG viết "Câu hỏi 1" hay placeholder.
2. Đúng 4 đáp án A/B/C/D. "correct" là index 0-3. Đáp án đúng ở vị trí ngẫu nhiên, không phải luôn là A.
3. Phương án sai là "mồi" hợp lý — học sinh yếu có thể nhầm.
4. Giải thích đủ để học sinh tự hiểu sai ở đâu.
5. Double-escape LaTeX: \\\\frac thay vì \\frac, \\\\sqrt thay vì \\sqrt.
6. Trả về đúng JSON hợp lệ. Không markdown, không giải thích ngoài JSON.`;

const buildUnitDetailPrompt = (
  source: AdaptiveLessonSource,
  reviewedPlan: string,
  unitTitle: string,
  objectiveTitle: string,
  unitIndex: number,
  totalUnits: number,
  relevantTools: ReturnType<typeof getRelevantToolsForLesson>,
): string => {
  const toolsSection = relevantTools.length > 0
    ? `\nCÔNG CỤ TƯƠNG TÁC CÓ SẴN (dùng id chính xác trong externalToolIds):\n${relevantTools.map(t => `- "${t.id}" — ${t.name} (${t.topic})`).join('\n')}\n`
    : '';
  return `Bạn là chuyên gia thiết kế mảnh kiến thức Toán phân hoá.

BÀI HỌC: "${source.title || 'Chưa rõ'}" - Lớp ${source.grade || '10'}
MẢNH KIẾN THỨC ${unitIndex + 1}/${totalUnits}: "${unitTitle}"
MỤC TIÊU GẮN VỚI MẢNH NÀY: "${objectiveTitle}"
${toolsSection}
GIÁO ÁN NGUỒN (trích liên quan):
---
${source.content.slice(0, 5000)}
---

BẢN RÀ SOÁT (trích phần liên quan):
---
${reviewedPlan.slice(0, 2500)}
---

NHIỆM VỤ: Thiết kế chi tiết mảnh kiến thức "${unitTitle}". Trả về DUY NHẤT một JSON hợp lệ, không giải thích.

{
  "title": "${unitTitle}",
  "hook_question": "Một câu hỏi gợi mở ngắn để học sinh dự đoán trước khi đọc lý thuyết.",
  "guiding_questions": [
    "Câu 1 — Quan sát: Em thấy điều gì đặc biệt ở hình/dữ kiện này?",
    "Câu 2 — So sánh: Khi thay đổi X thì Y thay đổi như thế nào?",
    "Câu 3 — Phát hiện quy luật: Có điều gì giữ nguyên không đổi?",
    "Câu 4 — Áp dụng thử: Nếu áp dụng nhận xét trên vào bài toán cụ thể, ta tính được gì?",
    "Câu 5 — Chốt công thức: Em có thể tự phát biểu công thức/định nghĩa bằng lời của mình không?"
  ],
  "guiding_answers": [
    "Đáp án/gợi ý ngắn cho câu 1 (đúng nội dung, không lặp lại câu hỏi).",
    "Đáp án/gợi ý ngắn cho câu 2.",
    "Đáp án/gợi ý ngắn cho câu 3.",
    "Đáp án/gợi ý ngắn cho câu 4.",
    "Đáp án/gợi ý ngắn cho câu 5."
  ],
  "student_task": "Nhiệm vụ thao tác/nghĩ thử: học sinh kéo mô phỏng, thử số liệu hoặc viết dự đoán.",
  "visual_instruction": "Mô tả hình minh hoạ hoặc mô phỏng cần quan sát.",
  "knowledge_conclusion": "Chốt kiến thức ngắn — tối đa 5-7 câu hoặc một công thức trọng tâm.",
  "explanation_foundation": "Tuyến Cơ bản: diễn giải trực quan, chậm, hỗ trợ trả lời từng câu hỏi dẫn dắt.",
  "explanation_standard": "Tuyến Trọng tâm: kết nối câu trả lời với công thức/định nghĩa chuẩn SGK.",
  "explanation_challenge": "Tuyến Nâng cao: giải thích VÌ SAO công thức đúng hoặc mở rộng một bước.",
  "worked_example": {
    "problem": "Bài toán ví dụ cụ thể với số liệu từ nội dung bài, dùng LaTeX nếu cần.",
    "solution": "Bước 1: ... Bước 2: ... Kết luận: ...",
    "hints": ["Gợi ý 1", "Gợi ý 2", "Gợi ý 3"]
  },
  "quick_check_questions": [
    {"prompt": "Câu quick check 1 có số liệu cụ thể", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correct": 1, "explanation": "...", "hints": ["Tầng 1 — nhắc lý thuyết, chưa lộ đáp số", "Tầng 2 — gợi bước đầu", "Tầng 3 — gợi gần đáp án"]},
    {"prompt": "Câu quick check 2", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correct": 3, "explanation": "...", "hints": ["Tầng 1", "Tầng 2", "Tầng 3"]}
  ],
  "externalToolIds": [],
  "tikz_code": "",
  "simulation_3d": null
}

QUY TẮC:
1. Câu hỏi (quick_check, guiding_questions) có nội dung toán thật — KHÔNG placeholder.
2. Đúng 2 câu quick_check với 4 đáp án mỗi câu. "correct" là index 0-3.
3. guiding_questions: đúng 5 câu theo chuỗi Socratic (quan sát → so sánh → phát hiện quy luật → áp dụng → chốt). Mỗi câu NGẮN, chỉ hỏi MỘT ý.
3b. guiding_answers: đúng 5 phần tử, cùng thứ tự với guiding_questions — là ĐÁP ÁN/GỢI Ý THẬT cho từng câu (học sinh xem sau khi tự trả lời). KHÔNG được lặp lại nguyên văn câu hỏi; phải có nội dung trả lời cụ thể.
3c. TRÌNH BÀY KHOA HỌC: với mọi lời giải/đáp án/kết luận nhiều bước (guiding_answers, worked_example.solution, knowledge_conclusion) — MỖI BƯỚC/Ý TRÊN MỘT DÒNG RIÊNG, ngăn bằng ký tự xuống dòng "\\n" trong chuỗi JSON. KHÔNG viết liền một mạch. Ví dụ solution: "Gọi B là...\\nTa có P(B)=...\\nÁp dụng công thức: P(AB)=...\\nKết luận: ...".
4. knowledge_conclusion tối đa 5-7 câu hoặc một công thức. Không viết bài giảng dài. Đây là phần chốt sẽ vào Vở ghi; nếu nhiều ý thì mỗi ý một dòng (\\n).
5. 3 trường explanation_ phải thực sự khác nhau về độ sâu và cách tiếp cận.
6. CHỌN HỌC LIỆU ĐÚNG PHÂN MÔN TOÁN của mảnh này (đọc kỹ nội dung, ĐỪNG suy từ một từ rời rạc):
   - Xác suất / Thống kê / Tổ hợp (kể cả khi có cụm "KHÔNG GIAN MẪU", "biến cố", "tần suất"): dùng sơ đồ cây, bảng 2 chiều, biểu đồ Venn, hoặc mô phỏng phép thử. TUYỆT ĐỐI KHÔNG dùng "simulation_3d".
   - Hình học KHÔNG GIAN (hình chóp, lăng trụ, tứ diện, góc/khoảng cách trong không gian): dùng "simulation_3d" (points/segments/faces). KHÔNG tự viết WebGL/Three.js.
   - Hình học PHẲNG / tọa độ / vectơ / conic: hình SVG/TikZ kéo điểm.
   - Hàm số / đạo hàm / tích phân / lượng giác: đồ thị động (TikZ/đồ thị), KHÔNG dùng 3D.
   - Đại số / số học: bảng, sơ đồ, ví dụ số minh hoạ.
   "không gian mẫu" thuộc XÁC SUẤT, KHÔNG phải hình học không gian — không bao giờ ra mô hình 3D cho nó.
7. NẾU có tool phù hợp trong danh sách CÔNG CỤ CÓ SẴN: đặt id vào "externalToolIds".
8. NẾU cần hình 2D tĩnh: đặt mã TikZ vào "tikz_code" (double-escape backslash).
9. KHÔNG dùng simulation_html.srcDoc — quá rủi ro lỗi JSON escape.
10. Double-escape LaTeX: \\\\frac thay vì \\frac, \\\\sqrt thay vì \\sqrt.
11. Trả về đúng JSON hợp lệ. Không markdown, không giải thích ngoài JSON.`;
};

// --- Phase 2: dedicated raw-HTML interactive simulation per unit ---
// Xuất HTML THÔ (không bọc JSON) để tránh lỗi escape; vanilla JS, không thư viện ngoài.
const buildUnitSimulationPrompt = (
  source: AdaptiveLessonSource,
  unitTitle: string,
  visualInstruction: string,
): string =>
  `Bạn là lập trình viên front-end chuyên dựng mô phỏng Toán tương tác.

BÀI: "${source.title || 'Chưa rõ'}" - Lớp ${source.grade || '10'}
MẢNH KIẾN THỨC: "${unitTitle}"
Ý TƯỞNG MÔ PHỎNG CẦN DỰNG: ${visualInstruction || `Cho học sinh thao tác trực quan để hiểu "${unitTitle}".`}

NHIỆM VỤ: Viết MỘT file HTML hoàn chỉnh, tự chứa, mô phỏng tương tác cho mảnh kiến thức trên.

QUY TẮC BẮT BUỘC:
1. Trả về DUY NHẤT mã HTML thô, bắt đầu bằng <!doctype html>. KHÔNG markdown, KHÔNG giải thích, KHÔNG bọc trong JSON.
2. Hình vẽ phải là <svg> nội tuyến hoặc <canvas> do chính bạn lập trình toạ độ. TUYỆT ĐỐI KHÔNG dùng <img> trỏ URL ngoài, KHÔNG tải thư viện ngoài (không GeoGebra/Desmos/p5/Three.js/CDN).
3. Phải TƯƠNG TÁC THẬT bằng JavaScript thuần: ít nhất một trong các kiểu — thanh trượt (<input type="range">), nút bấm, kéo/thả điểm — và hình/số liệu cập nhật trực tiếp khi thao tác.
4. Hiển thị rõ đại lượng thay đổi và đại lượng/quy luật giữ nguyên, đúng nội dung "${unitTitle}".
5. MÔ PHỎNG PHẢI ĐÚNG PHÂN MÔN của mảnh: Xác suất/Thống kê/Tổ hợp → sơ đồ cây, bảng 2 chiều, Venn, mô phỏng phép thử (gieo xúc xắc/rút bi…); Hình học phẳng → hình SVG kéo điểm; Hàm số/giải tích → đồ thị động. KHÔNG dựng mô hình khối 3D cho bài Xác suất (kể cả khi có cụm "không gian mẫu").
6. CÔNG THỨC: TUYỆT ĐỐI KHÔNG dùng LaTeX/MathJax (không $...$, không \\frac, không \\(...\\)). Viết bằng Unicode/HTML thường: P(A|B), ∩, ∪, ×, ², ³, √, ≤, ≥, ≠, Ω; phân số viết "a/b" hoặc dùng <sup>/<sub>. (iframe mô phỏng KHÔNG có MathJax nên LaTeX sẽ hiện mã thô.)
7. ĐƠN GIẢN, DỄ HIỂU: bám sát cách trình bày SGK (Kết nối tri thức 10/11/12). Chỉ MỘT ý/thao tác chính, không nhồi nhiều thứ rối mắt.
8. RESPONSIVE & VỪA KHUNG: body { margin:0; font-size:16px; } gói trong 1 cột dọc, width:100% (max-width:100%); KHÔNG đặt chiều rộng cố định lớn; mọi nội dung phải nhìn hết mà KHÔNG cần cuộn ngang. Chiều cao tổng ≤ ~560px.
9. CSS nội tuyến trong <style>; toàn bộ JS trong <script>. Chạy offline được. Tối đa ~200 dòng.`;

// Bóc HTML thô từ phản hồi AI, xác nhận là mini-app tương tác hợp lệ; nếu không đạt trả ''.
const sanitizeGeneratedSimulationHtml = (text: string): string => {
  let html = text.replace(/```(?:html)?\s*([\s\S]*?)```/i, '$1').trim();
  const start = html.search(/<!doctype html|<html|<svg|<canvas/i);
  if (start > 0) html = html.slice(start);
  html = html.trim();
  if (html.length < 200) return '';
  const hasVisual = /<svg|<canvas/i.test(html);
  const hasInteraction = /addEventListener|oninput|onclick|type="range"|type='range'/i.test(html);
  const hasScript = /<script[\s>]/i.test(html);
  if (!hasVisual || !hasInteraction || !hasScript) return '';
  if (/<img\s|src=["']https?:|cdn\.|geogebra|desmos|three\.js|p5\.js/i.test(html)) return '';
  return html;
};

// Mô phỏng cho màn KHỞI ĐỘNG — sinh TỪ chính tình huống mở đầu (storyHook) để hình & nội dung luôn khớp.
const buildEngageSimulationPrompt = (
  source: AdaptiveLessonSource,
  storyHook: string,
  realityCheck: string,
  guidingQuestion: string,
): string =>
  `Bạn là lập trình viên front-end dựng hoạt động mô phỏng khởi động cho bài Toán.

BÀI: "${source.title || 'Chưa rõ'}" - Lớp ${source.grade || '10'}
TÌNH HUỐNG MỞ ĐẦU (storyHook) — mô phỏng PHẢI tái hiện ĐÚNG tình huống này:
"${storyHook}"
${realityCheck ? `Cú sốc/nhiệm vụ quan sát: "${realityCheck}"` : ''}
${guidingQuestion ? `Câu hỏi dẫn dắt: "${guidingQuestion}"` : ''}

NHIỆM VỤ: Viết MỘT file HTML hoàn chỉnh, tự chứa, mô phỏng tương tác tái hiện ĐÚNG tình huống mở đầu ở trên,
để học sinh thao tác và cảm nhận "vấn đề" trước khi học (tạo bế tắc/tò mò).

QUY TẮC BẮT BUỘC:
1. Trả về DUY NHẤT mã HTML thô, bắt đầu bằng <!doctype html>. KHÔNG markdown, KHÔNG giải thích, KHÔNG bọc JSON.
2. Mô phỏng phải KHỚP nội dung storyHook (đúng bối cảnh, đúng đối tượng, đúng phép thử) — KHÔNG vẽ hình chung chung lệch tình huống.
3. Hình vẽ là <svg> nội tuyến hoặc <canvas> tự lập trình toạ độ. TUYỆT ĐỐI KHÔNG <img> URL ngoài, KHÔNG thư viện ngoài/CDN.
4. TƯƠNG TÁC THẬT bằng JS thuần: nút bấm/thanh trượt/chọn — và kết quả (số liệu/hình) cập nhật trực tiếp để bộc lộ vấn đề.
5. Đúng phân môn: Xác suất → mô phỏng phép thử (rút/gieo/chọn) hiện tần suất; KHÔNG dựng khối 3D cho xác suất.
6. CÔNG THỨC: TUYỆT ĐỐI KHÔNG dùng LaTeX/MathJax ($...$, \\frac, \\(...\\)) — dùng Unicode/HTML (P(A|B), ∩, ×, ², √, Ω; phân số "a/b" hoặc <sup>/<sub>). iframe không có MathJax.
7. ĐƠN GIẢN như SGK Kết nối tri thức: một thao tác chính, dễ hiểu, không rối.
8. RESPONSIVE: body{margin:0;font-size:16px} 1 cột width:100%, KHÔNG rộng cố định lớn, nhìn hết KHÔNG cuộn ngang, cao ≤ ~560px.
9. CSS trong <style>, JS trong <script>, chạy offline. Tối đa ~200 dòng.`;

export const runAdaptivePipeline = async (
  source: AdaptiveLessonSource,
  reviewedPlan: string,
  callAIFn: (prompt: string) => Promise<string>,
  teacherId: string,
  onProgress?: AdaptivePipelineProgress,
  options?: { generateSimulations?: boolean },
): Promise<AdaptiveLesson> => {
  const generateSimulations = options?.generateSimulations !== false;
  const warnings: string[] = [];
  const now = new Date().toISOString();

  // --- Step 1: Blueprint (required — fallback to regex if fails) ---
  onProgress?.('Đang phân tích cấu trúc bài học...');
  let blueprint: BlueprintJson;
  try {
    const raw = await callAIFn(buildBlueprintPrompt(source, reviewedPlan));
    blueprint = parseAdaptiveContentJson(raw) as BlueprintJson;
    if (!blueprint.title && !blueprint.objectives && !blueprint.unit_outline) throw new Error('Blueprint JSON rỗng');
  } catch (err) {
    warnings.push(`blueprint_failed: ${err instanceof Error ? err.message : String(err)}`);
    return buildFallbackLessonWithWarnings(source, reviewedPlan, teacherId, [
      'Pipeline bước 1 (Blueprint) thất bại — dùng bộ dựng dự phòng từ bản rà soát.',
      ...warnings,
    ]);
  }

  const title = blueprint.title?.trim() || inferTitle(source, reviewedPlan);

  const bloomLevelValues = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
  const rawObjectives: ObjectiveJson[] = Array.isArray(blueprint.objectives) && blueprint.objectives.length >= 1
    ? blueprint.objectives
    : [
        { title: 'Nắm được kiến thức trọng tâm của bài', bloom: 'understand' },
        { title: 'Vận dụng kiến thức vào bài tập cơ bản', bloom: 'apply' },
        { title: 'Giải quyết bài toán nâng cao', bloom: 'analyze' },
      ];

  const objectives = rawObjectives.slice(0, 6).map((obj, index) => ({
    id: uid('obj'),
    code: `OBJ-${index + 1}`,
    title: obj.title || `Mục tiêu ${index + 1}`,
    description: obj.title || `Mục tiêu ${index + 1}`,
    bloomLevel: (bloomLevelValues.includes(obj.bloom ?? '') ? obj.bloom : index < 2 ? 'understand' : 'apply') as BloomLevel,
    masteryThreshold: typeof obj.threshold === 'number' ? obj.threshold : (index < 2 ? 0.7 : 0.75),
    prerequisiteObjectiveIds: [],
    commonMisconceptions: [],
  }));
  const objectiveIds = objectives.map(o => o.id);

  const minUnits = Math.max(3, objectives.length);
  const rawOutlines: Array<{ title: string; objective_index: number }> = Array.isArray(blueprint.unit_outline) && blueprint.unit_outline.length > 0
    ? blueprint.unit_outline
    : objectives.slice(0, minUnits).map((obj, i) => ({ title: obj.title, objective_index: i }));

  // Pad to minimum if AI returned too few
  const unitOutlines = [...rawOutlines];
  while (unitOutlines.length < minUnits) {
    const i = unitOutlines.length;
    unitOutlines.push({ title: `Mảnh kiến thức ${i + 1} — ${objectives[i % objectives.length].title}`, objective_index: i % objectives.length });
  }

  // --- Step 2: Visual cards (optional — failure is graceful) ---
  onProgress?.('Đang tạo hình ảnh minh họa bài học...');
  let visualCards: import('./types').EngageVisualCard[] = [];
  try {
    const raw = await callAIFn(buildVisualCardsPrompt(source, rawObjectives));
    const parsed = parseAdaptiveContentJson(raw) as VisualCardsJson;
    visualCards = (parsed.visual_cards || [])
      .filter(card => card?.title && card?.svg)
      .map(card => ({
        id: uid('vcard'),
        title: card.title.trim(),
        alt: card.alt?.trim() || card.title.trim(),
        caption: card.caption?.trim(),
        imageDataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(card.svg!)}`,
      }));
    if (visualCards.length === 0) warnings.push('visual_cards_empty: AI tạo hình ảnh nhưng không có thẻ hợp lệ nào.');
  } catch (err) {
    warnings.push('visual_cards_failed: Không tạo được hình minh họa — bài học vẫn đầy đủ nội dung.');
  }

  // --- Step 2b: Mô phỏng KHỞI ĐỘNG (sinh từ storyHook → khớp tình huống mở đầu) ---
  let engageSimHtml = '';
  const engageStoryHook = blueprint.engage?.story_hook?.trim() || '';
  if (generateSimulations && engageStoryHook) {
    onProgress?.('Đang dựng hoạt động mô phỏng khởi động...');
    try {
      const rawSim = await callAIFn(buildEngageSimulationPrompt(
        source,
        engageStoryHook,
        blueprint.engage?.reality_check_message?.trim() || '',
        blueprint.engage?.guiding_question?.trim() || '',
      ));
      engageSimHtml = sanitizeGeneratedSimulationHtml(rawSim);
      if (!engageSimHtml) warnings.push('engage_sim_skipped: mô phỏng khởi động không đạt chuẩn tương tác, đã bỏ qua.');
    } catch {
      warnings.push('engage_sim_failed: không dựng được mô phỏng khởi động.');
    }
  }

  // --- Step 3: Assessments (essential but degradable) ---
  onProgress?.('Đang tạo bộ câu hỏi kiểm tra...');
  let diagnosticQuestions: QuestionJson[] = [];
  let exitTicketQuestions: QuestionJson[] = [];
  try {
    const raw = await callAIFn(buildAssessmentsPrompt(source, rawObjectives, unitOutlines.map(u => u.title)));
    const parsed = parseAdaptiveContentJson(raw) as AssessmentsJson;
    diagnosticQuestions = Array.isArray(parsed.diagnostic_questions) ? parsed.diagnostic_questions : [];
    exitTicketQuestions = Array.isArray(parsed.exit_ticket_questions) ? parsed.exit_ticket_questions : [];
    if (diagnosticQuestions.length < 5) warnings.push(`assessments_thin: Pre-test chỉ có ${diagnosticQuestions.length}/5 câu.`);
    if (exitTicketQuestions.length < 3) warnings.push(`exit_ticket_thin: Exit ticket chỉ có ${exitTicketQuestions.length}/3 câu.`);
  } catch (err) {
    warnings.push('assessments_failed: Bộ câu hỏi sẽ dùng placeholder — cần chỉnh sửa trước khi xuất bản.');
  }

  // --- Step 4: Units (one per unit, independent failure) ---
  const relevantTools = getRelevantToolsForLesson(source);
  const knowledgeUnits: KnowledgeUnit[] = [];

  for (let i = 0; i < unitOutlines.length; i++) {
    const outline = unitOutlines[i];
    const objectiveIndex = typeof outline.objective_index === 'number'
      ? Math.min(outline.objective_index, objectives.length - 1)
      : i % objectives.length;
    const objectiveId = objectiveIds[objectiveIndex] || objectiveIds[0];
    const objectiveTitle = rawObjectives[objectiveIndex]?.title || rawObjectives[0]?.title || title;

    onProgress?.(`Đang tạo mảnh kiến thức ${i + 1}/${unitOutlines.length}: "${outline.title}"...`);
    let builtUnit: KnowledgeUnit;
    let visualInstruction = '';
    try {
      const raw = await callAIFn(buildUnitDetailPrompt(source, reviewedPlan, outline.title, objectiveTitle, i, unitOutlines.length, relevantTools));
      const parsed = parseAdaptiveContentJson(raw) as UnitJson;
      parsed.title = parsed.title?.trim() || outline.title;
      parsed.objective_index = objectiveIndex;
      parsed.estimated_minutes = parsed.estimated_minutes || (i === 0 ? 8 : 10);
      visualInstruction = parsed.visual_instruction?.trim() || '';
      builtUnit = buildUnitFromJsonData(parsed, objectiveId, i);
    } catch (err) {
      warnings.push(`unit_${i + 1}_failed: "${outline.title}" — dùng mảnh kiến thức dự phòng.`);
      builtUnit = makeUnit(outline.title, objectiveId, outline.title, i);
    }

    // Mô phỏng tương tác (call riêng, xuất HTML thô) — giữ 3D ở đường React, không nhồi vào srcdoc.
    if (generateSimulations && builtUnit.simulationSpec?.kind !== 'geometry3d') {
      onProgress?.(`Đang dựng mô phỏng tương tác cho mảnh ${i + 1}/${unitOutlines.length}...`);
      try {
        const rawSim = await callAIFn(buildUnitSimulationPrompt(source, builtUnit.title, visualInstruction));
        const simSrcDoc = sanitizeGeneratedSimulationHtml(rawSim);
        if (simSrcDoc) {
          builtUnit.simulationSpec = buildHtmlSimulationSpecFromJson(
            { title: builtUnit.title, simulation_html: { srcDoc: simSrcDoc, height: 460 } } as UnitJson,
            objectiveId,
          );
        } else {
          warnings.push(`sim_${i + 1}_skipped: mô phỏng mảnh "${builtUnit.title}" không đạt chuẩn tương tác, đã bỏ qua.`);
        }
      } catch {
        warnings.push(`sim_${i + 1}_failed: không dựng được mô phỏng cho mảnh "${builtUnit.title}".`);
      }
    }

    knowledgeUnits.push(builtUnit);
  }

  // --- Assemble ---
  const engage = blueprint.engage && typeof blueprint.engage === 'object' ? blueprint.engage : undefined;
  const objectiveByBloom = (level: BloomLevel, fallbackIndex: number) =>
    objectives.find(o => o.bloomLevel === level)?.title || objectives[fallbackIndex]?.title || objectives[0]?.title || title;

  return {
    id: `adaptive-${Date.now()}`,
    title,
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
      readingInstructions:
        engage?.reading_instructions?.trim() ||
        engage?.reality_check_message?.trim() ||
        `Đọc trước nội dung "${title}", ghi lại những điểm còn chưa hiểu để làm pre-test đầu giờ.`,
      engage: {
        storyHook: engage?.story_hook?.trim(),
        realityCheckMessage: engage?.reality_check_message?.trim(),
        guidingQuestion: engage?.guiding_question?.trim(),
        guidingQuestionBox: engage?.guiding_question_box?.trim(),
        bigTitle: engage?.big_title?.trim(),
        studentExpectationPrompt: engage?.student_expectation_prompt?.trim(),
        routeGoals: {
          foundation: engage?.foundation_goal?.trim() || objectiveByBloom('understand', 0),
          standard: engage?.standard_goal?.trim() || objectiveByBloom('apply', 1),
          challenge: engage?.challenge_goal?.trim() || objectiveByBloom('analyze', 2),
        },
        visualCards: visualCards.length > 0 ? visualCards : undefined,
        interactiveSimHtml: engageSimHtml || undefined,
      },
      guidingQuestions: [
        engage?.story_hook?.trim(),
        engage?.guiding_question?.trim(),
        engage?.guiding_question_box?.trim(),
        engage?.student_expectation_prompt?.trim(),
      ].filter((item): item is string => Boolean(item && item.length > 0)),
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
    diagnosticTest: buildAssessmentFromJsonQuestions('diagnostic', 'Pre-test đầu giờ', diagnosticQuestions, objectiveIds, 5, 7),
    knowledgeUnits,
    exitTicket: buildAssessmentFromJsonQuestions('exit_ticket', 'Exit ticket cuối bài', exitTicketQuestions, objectiveIds, 3, 3),
    pacingPolicy: {
      minExitTicketMinutes: 5,
      aheadThresholdMinutes: 5,
      behindThresholdMinutes: 4,
      stuckAfterRemediationAttempts: 2,
      enrichmentTriggerMastery: 0.85,
      supportTriggerMastery: 0.55,
    },
    completionReward: { toolId: 'gamedoikhang', message: defaultRewardMessage },
    generationSource: 'ai_json',
    generationWarnings: warnings.length > 0 ? warnings : undefined,
  };
};
