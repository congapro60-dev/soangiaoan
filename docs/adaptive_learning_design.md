# Thiết kế khung kỹ thuật và dữ liệu — Adaptive Learning Toán THPT

## 1. Mục tiêu giai đoạn hiện tại

Tài liệu này thiết kế khung nền cho một web học tập phân hoá môn Toán THPT, tích hợp dần với hệ thống soạn giáo án và kiểm tra hiện có.

Mục tiêu trước mắt chưa phải là chọn một bài cụ thể, mà là chuẩn hoá:

- Mô hình dữ liệu.
- Luồng học sinh trong tiết 40 phút.
- Luồng giáo viên tạo và giám sát bài học.
- Cơ chế chẩn đoán, phân tuyến, giảng lại và chuyển bước.
- Điểm tích hợp với codebase hiện tại.
- Lộ trình MVP có thể triển khai từng phần.

## 2. Nguyên tắc thiết kế

### 2.1. AI hỗ trợ, giáo viên kiểm soát

AI không nên là nguồn chân lý duy nhất. Hệ thống cần phân tách rõ:

- Nội dung chuẩn do giáo viên hoặc tổ chuyên môn kiểm duyệt.
- Câu hỏi kiểm tra được lưu trong ngân hàng có đáp án và lời giải.
- AI chỉ cá nhân hoá lời giải thích, phản hồi, gợi ý học tập và báo cáo.

### 2.2. Phân hoá theo mục tiêu nhỏ, không theo điểm tổng

Một bài học cần tách thành các mục tiêu học tập nhỏ. Mỗi câu hỏi phải gắn với một hoặc nhiều mục tiêu. Kết quả học sinh được phân tích theo mục tiêu, không chỉ theo tổng số câu đúng.

### 2.3. Không lặp vô hạn

Nếu học sinh không hiểu sau tối đa 2 lần giảng lại ở cùng một mục tiêu, hệ thống phải đánh dấu cần giáo viên hỗ trợ, thay vì tiếp tục tạo nội dung dài hơn.

### 2.4. Thiết kế cho tiết 40 phút

Mỗi màn hình học sinh phải ngắn, ít thao tác. Một tiết chỉ nên có 2–4 mục tiêu học tập chính, 1 bài test đầu giờ, 2–4 cụm nội dung nhỏ và 1 exit ticket.

## 3. Vai trò người dùng

### 3.1. Giáo viên

- Tạo bài học thích ứng.
- Nhập hoặc import phân phối chương trình.
- Khai báo mục tiêu học tập.
- Tạo/duyệt câu hỏi test đầu giờ.
- Tạo/duyệt nội dung theo 3 tuyến học.
- Theo dõi dashboard lớp trong tiết học.
- Can thiệp với học sinh bị kẹt.

### 3.2. Học sinh

- Xem nội dung cần đọc trước ở nhà.
- Làm bài test đầu giờ 5–7 phút.
- Nhận chẩn đoán ngắn gọn.
- Học theo tuyến cá nhân hoá.
- Làm kiểm tra nhanh sau từng mảnh kiến thức.
- Làm exit ticket cuối tiết.

### 3.3. Tổ chuyên môn / quản lý

- Duyệt thư viện bài học.
- Chuẩn hoá template 5 bước.
- Theo dõi chất lượng theo khối, lớp, chủ đề.

Trong MVP có thể chỉ triển khai giáo viên và học sinh.

## 4. Mô hình dữ liệu cấp cao

### 4.1. AdaptiveLesson

Đại diện cho một bài học thích ứng.

```ts
interface AdaptiveLesson {
  id: string;
  title: string;
  subjectId: 'math';
  grade: '10' | '11' | '12';
  curriculumRef?: CurriculumReference;
  durationMinutes: 40;
  status: 'draft' | 'published' | 'archived';
  teacherId: string;
  createdAt: string;
  updatedAt: string;
  preparation: LessonPreparation;
  fiveStepFlow: FiveStepFlow;
  objectives: LearningObjective[];
  knowledgeUnits: KnowledgeUnit[];
  diagnosticTest: AdaptiveAssessment;
  exitTicket: AdaptiveAssessment;
}
```

### 4.2. CurriculumReference

Liên kết bài học với phân phối chương trình.

```ts
interface CurriculumReference {
  distributionId?: string;
  programType?: 'MOET' | 'TDS' | 'CUSTOM';
  week?: string;
  period?: number;
  textbook?: string;
  chapter?: string;
  lessonCode?: string;
}
```

### 4.3. LessonPreparation

Nội dung học sinh cần chuẩn bị trước ở nhà.

```ts
interface LessonPreparation {
  textbookPages?: string;
  readingInstructions: string;
  guidingQuestions: string[];
  estimatedMinutes: number;
}
```

### 4.4. FiveStepFlow

Template 5 bước sư phạm. Tên bước có thể chỉnh theo quy trình chính thức của trường.

```ts
interface FiveStepFlow {
  steps: FiveStepItem[];
}

interface FiveStepItem {
  id: string;
  name: string;
  purpose: string;
  estimatedMinutes: number;
  teacherRole: string;
  studentAction: string;
  systemSupport: string;
}
```

### 4.5. LearningObjective

Mục tiêu học tập nhỏ, dùng để chẩn đoán và phân hoá.

```ts
interface LearningObjective {
  id: string;
  code: string;
  title: string;
  description: string;
  bloomLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  masteryThreshold: number;
  prerequisiteObjectiveIds: string[];
  commonMisconceptions: CommonMisconception[];
}
```

### 4.6. CommonMisconception

Lỗi sai thường gặp gắn với mục tiêu.

```ts
interface CommonMisconception {
  id: string;
  title: string;
  description: string;
  remediationHint: string;
}
```

### 4.7. KnowledgeUnit

Một mảnh kiến thức nhỏ trong bài học.

```ts
interface KnowledgeUnit {
  id: string;
  title: string;
  objectiveIds: string[];
  estimatedMinutes: number;
  routes: LearningRouteContent[];
  quickCheck: AdaptiveAssessment;
  maxRemediationAttempts: number;
}
```

### 4.8. LearningRouteContent

Nội dung theo tuyến học.

```ts
interface LearningRouteContent {
  route: 'foundation' | 'standard' | 'challenge';
  explanation: string;
  workedExamples: WorkedExample[];
  practiceTasks: PracticeTask[];
  aiTutorPrompt?: string;
}
```

### 4.9. WorkedExample và PracticeTask

```ts
interface WorkedExample {
  id: string;
  title: string;
  problem: string;
  solution: string;
  explanation: string;
  objectiveIds: string[];
}

interface PracticeTask {
  id: string;
  prompt: string;
  expectedAnswer?: string;
  hints: string[];
  objectiveIds: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}
```

### 4.10. AdaptiveAssessment

Dùng cho test đầu giờ, quick check và exit ticket.

```ts
interface AdaptiveAssessment {
  id: string;
  title: string;
  purpose: 'diagnostic' | 'quick_check' | 'exit_ticket';
  durationMinutes: number;
  questions: AdaptiveQuestion[];
}
```

### 4.11. AdaptiveQuestion

```ts
interface AdaptiveQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  explanation: string;
  objectiveIds: string[];
  misconceptionIds?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  timeLimitSeconds?: number;
}
```

### 4.12. AdaptiveSession

Một phiên học thật của một lớp hoặc nhóm học sinh.

```ts
interface AdaptiveSession {
  id: string;
  lessonId: string;
  classId?: string;
  teacherId: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  startedAt?: string;
  endedAt?: string;
  participants: StudentParticipant[];
  createdAt: string;
}
```

### 4.13. StudentParticipant

```ts
interface StudentParticipant {
  studentId: string;
  studentName: string;
  studentClass?: string;
  currentRoute: 'foundation' | 'standard' | 'challenge';
  currentUnitId?: string;
  status: 'not_started' | 'diagnostic' | 'learning' | 'quick_check' | 'needs_teacher' | 'completed';
  lastActiveAt?: string;
}
```

### 4.14. StudentAdaptiveProgress

Hồ sơ tiến độ của học sinh trong một phiên.

```ts
interface StudentAdaptiveProgress {
  id: string;
  sessionId: string;
  lessonId: string;
  studentId: string;
  route: 'foundation' | 'standard' | 'challenge';
  objectiveStates: ObjectiveMasteryState[];
  assessmentAttempts: AssessmentAttempt[];
  remediationEvents: RemediationEvent[];
  teacherFlags: TeacherFlag[];
  startedAt: string;
  completedAt?: string;
}
```

### 4.15. ObjectiveMasteryState

```ts
interface ObjectiveMasteryState {
  objectiveId: string;
  status: 'not_seen' | 'weak' | 'near_mastery' | 'mastered' | 'advanced';
  confidence: number;
  evidenceQuestionIds: string[];
  lastUpdatedAt: string;
}
```

### 4.16. AssessmentAttempt

```ts
interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  purpose: 'diagnostic' | 'quick_check' | 'exit_ticket';
  submittedAt: string;
  durationSeconds: number;
  answers: AdaptiveAnswer[];
  objectiveScores: ObjectiveScore[];
  recommendedRoute?: 'foundation' | 'standard' | 'challenge';
  aiSummary?: string;
}
```

### 4.17. AdaptiveAnswer và ObjectiveScore

```ts
interface AdaptiveAnswer {
  questionId: string;
  answer: string;
  isCorrect?: boolean;
  score: number;
  detectedMisconceptionIds?: string[];
  feedback?: string;
}

interface ObjectiveScore {
  objectiveId: string;
  score: number;
  maxScore: number;
  masteryEstimate: number;
}
```

### 4.18. RemediationEvent

Lưu lại các lần AI giảng lại.

```ts
interface RemediationEvent {
  id: string;
  unitId: string;
  objectiveIds: string[];
  attemptNumber: number;
  reason: string;
  strategy: 'visual' | 'step_by_step' | 'socratic' | 'worked_example' | 'analogy';
  aiGeneratedContent: string;
  createdAt: string;
}
```

### 4.19. TeacherFlag

```ts
interface TeacherFlag {
  id: string;
  severity: 'info' | 'warning' | 'urgent';
  reason: string;
  objectiveIds: string[];
  createdAt: string;
  resolvedAt?: string;
}
```

## 5. Luồng học sinh trong tiết 40 phút

### 5.1. Trước tiết học

1. Học sinh mở trang bài học.
2. Đọc hướng dẫn chuẩn bị.
3. Xem câu hỏi định hướng.
4. Không cần làm bài dài trước tiết để tránh quá tải.

### 5.2. Đầu giờ: test chẩn đoán 5–7 phút

1. Học sinh vào phiên học do giáo viên mở.
2. Hệ thống hiển thị bài test đầu giờ.
3. Mỗi câu hỏi gắn với mục tiêu học tập.
4. Khi nộp bài, hệ thống tính điểm theo mục tiêu.
5. AI hoặc rule engine đưa ra tuyến học ban đầu.

### 5.3. Phân tuyến

- foundation: cần củng cố nền tảng.
- standard: học theo chuẩn chương trình.
- challenge: chuyển nhanh sang nhiệm vụ vận dụng cao.

Không hiển thị nhãn tiêu cực cho học sinh.

### 5.4. Học theo mảnh kiến thức

Với mỗi mảnh kiến thức:

1. Học sinh nhận nội dung theo tuyến hiện tại.
2. Xem ví dụ mẫu.
3. Làm bài luyện tập ngắn.
4. Làm quick check 2–3 câu.
5. Nếu đạt, chuyển sang mảnh tiếp theo.
6. Nếu chưa đạt, hệ thống giảng lại bằng chiến lược khác.
7. Nếu chưa đạt sau 2 lần, đánh dấu cần giáo viên hỗ trợ.

### 5.5. Cuối tiết: exit ticket

1. Học sinh làm 2–4 câu tổng kết.
2. Hệ thống ghi nhận tiến bộ so với test đầu giờ.
3. Học sinh nhận khuyến nghị tự học ngắn.
4. Giáo viên nhận dashboard tổng hợp.

## 6. Thuật toán phân tuyến MVP

Ở giai đoạn đầu, nên dùng rule engine minh bạch thay vì AI hoàn toàn.

### 6.1. Tính mastery theo mục tiêu

Với mỗi mục tiêu:

```ts
masteryEstimate = objectiveScore / objectiveMaxScore
```

Sau đó quy đổi:

- Dưới 0.4: weak.
- Từ 0.4 đến dưới 0.7: near_mastery.
- Từ 0.7 đến dưới 0.9: mastered.
- Từ 0.9 trở lên và có câu khó đúng: advanced.

### 6.2. Chọn tuyến học ban đầu

```ts
if (weakObjectiveCount >= 2 || prerequisiteFailed) route = 'foundation';
else if (advancedObjectiveCount >= 2 && weakObjectiveCount === 0) route = 'challenge';
else route = 'standard';
```

### 6.3. Điều chỉnh sau quick check

```ts
if (quickCheckScore >= 0.8) moveToNextUnit();
else if (remediationAttempts < 2) remediateWithDifferentStrategy();
else flagNeedsTeacherSupport();
```

## 7. Dashboard giáo viên MVP

Màn hình giáo viên trong tiết học nên có các khối sau:

### 7.1. Tổng quan lớp

- Số học sinh đã vào phiên.
- Số học sinh đã hoàn thành test đầu giờ.
- Phân bố tuyến foundation / standard / challenge.
- Tỷ lệ hoàn thành từng mảnh kiến thức.

### 7.2. Bản đồ mục tiêu học tập

Mỗi mục tiêu hiển thị:

- Tỷ lệ mastered.
- Tỷ lệ weak.
- Câu hỏi sai nhiều nhất.
- Lỗi sai thường gặp.

### 7.3. Danh sách cần can thiệp

Hiển thị học sinh:

- Sai cùng một mục tiêu nhiều lần.
- Đã bị giảng lại 2 lần mà chưa đạt.
- Không hoạt động trong một khoảng thời gian.
- Có dấu hiệu làm quá nhanh bất thường.

### 7.4. Báo cáo sau tiết

- Mục tiêu lớp đạt tốt.
- Mục tiêu lớp còn yếu.
- Học sinh cần giao bài bổ trợ.
- Gợi ý điều chỉnh tiết sau.

## 8. Gợi ý cấu trúc Firestore

Có thể dùng các collection sau:

```text
adaptiveLessons/{lessonId}
adaptiveSessions/{sessionId}
adaptiveSessions/{sessionId}/progress/{studentId}
adaptiveQuestionBank/{questionId}
adaptiveLessonTemplates/{templateId}
studentLearningProfiles/{studentId}
classes/{classId}
```

### 8.1. adaptiveLessons

Lưu bài học thích ứng đã được giáo viên tạo/duyệt.

### 8.2. adaptiveSessions

Lưu phiên học thật theo lớp và thời gian.

### 8.3. adaptiveSessions/{sessionId}/progress/{studentId}

Lưu tiến độ chi tiết của từng học sinh trong một phiên.

### 8.4. adaptiveQuestionBank

Lưu ngân hàng câu hỏi có metadata theo mục tiêu, mức độ, lỗi sai.

### 8.5. studentLearningProfiles

Giai đoạn sau dùng để lưu hồ sơ năng lực dài hạn qua nhiều bài.

## 9. Điểm tích hợp với codebase hiện tại

Codebase hiện tại đã có các mảnh phù hợp để mở rộng:

- `src/types.ts`: nơi nên bổ sung các type cho adaptive learning.
- `src/App.tsx`: nơi khai báo tab mới và route giao diện chính.
- `src/components/layout/Sidebar.tsx`: nơi thêm menu “Học phân hoá”.
- `src/components/layout/Header.tsx`: nơi thêm tiêu đề tab mới.
- `src/hooks/useAppState.ts`: nơi sau này có thể load/sync dữ liệu adaptive lesson nếu dùng chung state.
- `src/components/tabs/TestingTab.tsx`: có thể tái sử dụng logic tạo câu hỏi/đề kiểm tra.
- `src/pages/StudentExamPage.tsx`: có thể tham khảo để làm giao diện học sinh làm test.
- `src/pages/StudentResultPage.tsx`: có thể tham khảo để làm kết quả chẩn đoán.

Khuyến nghị kỹ thuật: tạo module mới độc lập trong `src/components/features/adaptive` và `src/components/tabs/AdaptiveLearningTab.tsx`, không trộn ngay vào module soạn giáo án hoặc thi online.

## 10. Cấu trúc thư mục đề xuất

```text
soangiaoan/src/components/tabs/AdaptiveLearningTab.tsx
soangiaoan/src/components/features/adaptive/AdaptiveLessonBuilder.tsx
soangiaoan/src/components/features/adaptive/AdaptiveTeacherDashboard.tsx
soangiaoan/src/components/features/adaptive/AdaptiveStudentPreview.tsx
soangiaoan/src/components/features/adaptive/ObjectiveMapEditor.tsx
soangiaoan/src/components/features/adaptive/QuestionTaggingPanel.tsx
soangiaoan/src/lib/adaptive/diagnosticEngine.ts
soangiaoan/src/lib/adaptive/sampleAdaptiveLesson.ts
soangiaoan/src/lib/adaptive/types.ts
soangiaoan/src/lib/adaptive/progressEngine.ts
```

Ở MVP, có thể chưa cần Firestore ngay. Có thể dùng dữ liệu mẫu trong `sampleAdaptiveLesson.ts` để kiểm thử luồng sư phạm trước.

## 11. AI module đề xuất

### 11.1. DiagnosticSummaryAI

Đầu vào:

- Kết quả câu hỏi.
- Điểm theo mục tiêu.
- Lỗi sai phát hiện.

Đầu ra:

- Nhận xét ngắn cho học sinh.
- Gợi ý tuyến học.
- Cảnh báo cho giáo viên nếu cần.

### 11.2. RemediationTutorAI

Đầu vào:

- Mục tiêu chưa đạt.
- Câu sai.
- Lỗi sai.
- Chiến lược giảng lại cần dùng.

Đầu ra:

- Một đoạn giảng lại ngắn.
- Một ví dụ mẫu.
- Một câu kiểm tra lại.

### 11.3. TeacherInsightAI

Đầu vào:

- Dữ liệu cả lớp.
- Tỷ lệ sai theo mục tiêu.
- Danh sách học sinh bị kẹt.

Đầu ra:

- Tóm tắt lớp trong 5–7 dòng.
- Đề xuất giáo viên nên can thiệp nhóm nào trước.

## 12. Ranh giới MVP

MVP kỹ thuật đầu tiên nên chỉ làm:

1. Một tab “Học phân hoá”.
2. Một bài học mẫu dạng dữ liệu tĩnh.
3. Mô hình mục tiêu học tập.
4. Bài test đầu giờ mẫu.
5. Engine phân tuyến bằng rule.
6. Giao diện teacher preview.
7. Giao diện student preview mô phỏng.
8. Dashboard đơn giản từ dữ liệu giả lập.

Chưa nên làm ngay:

- Hồ sơ năng lực dài hạn.
- Import toàn bộ SGK.
- Tự động sinh toàn bộ bài học chưa kiểm duyệt.
- Lớp học realtime phức tạp.
- Phân quyền tổ chuyên môn.

## 13. Các bước triển khai tiếp theo

### Bước 1

Bổ sung type dữ liệu adaptive learning, ưu tiên đặt trong module riêng để tránh làm `src/types.ts` quá lớn.

### Bước 2

Tạo `diagnosticEngine.ts` gồm các hàm:

- gradeAssessment.
- calculateObjectiveScores.
- estimateMasteryState.
- recommendLearningRoute.
- decideNextUnitAction.

### Bước 3

Tạo một bài học mẫu trung tính, chưa cần chọn bài thật. Nội dung có thể dùng placeholder theo cấu trúc Toán THPT.

### Bước 4

Tạo tab “Học phân hoá” với 3 khu vực:

- Khung dữ liệu bài học.
- Mô phỏng học sinh.
- Dashboard giáo viên.

### Bước 5

Sau khi khung chạy được, mới chọn bài Toán cụ thể để thay dữ liệu mẫu.

## 14. Kết luận kiến trúc

Khung kỹ thuật nên đi theo hướng module độc lập, rule engine trước, AI sau. Nền tảng dữ liệu quan trọng nhất là liên kết giữa mục tiêu học tập, câu hỏi, lỗi sai, tuyến học và trạng thái mastery của học sinh. Khi khung này ổn, hệ thống có thể mở rộng dần sang nhiều bài, nhiều khối, nhiều lớp mà không phải viết lại kiến trúc.
