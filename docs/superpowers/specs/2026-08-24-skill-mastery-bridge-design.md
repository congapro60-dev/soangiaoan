# Skill & Mastery Bridge Design — 2026-08-24

## Trạng thái

Đây là design spec cho milestone A đã được người dùng chọn. Spec này khóa ranh giới kiến trúc và tiêu chí chấp nhận; chưa phải implementation plan và chưa sửa production code.

## Mục tiêu

Tạo một định danh kỹ năng ổn định để cùng một năng lực có thể được nhận diện trong:

- bài tập lớp học và `questionResults`;
- practice set/attempt;
- module adaptive có `LearningObjective`;
- hồ sơ học sinh và dashboard.

Sau milestone này, hệ thống phải trả lời được câu hỏi: “Minh chứng này đang nói về kỹ năng nào, mức độ hiện tại bao nhiêu, độ tin cậy ra sao và lần đánh giá tiếp theo có thể dùng nó như thế nào?”

Milestone này chưa cố biến sản phẩm thành một gia sư hoàn chỉnh. Nó xây nền dữ liệu và reducer đủ đáng tin để các milestone adaptive practice, mục tiêu cá nhân và báo cáo dùng chung một ngôn ngữ.

## Bối cảnh hiện tại

- Classroom profile hiện có `ProfileTopic` với `topic`, `level` và evidence refs; dữ liệu legacy chỉ có `evidenceSubmissionIds`.
- Practice đã có public question set, private answer key, attempt, canonical scores và formative evidence, nhưng hiện target bằng chuỗi topic.
- Adaptive module đã có `LearningObjective`, prerequisite, misconception, `ObjectiveScore`, mastery estimate và `StudentLearningProfile`.
- Hai miền hiện không có khóa nối ổn định: một bên dùng topic tự do, một bên dùng objective ID theo lesson.
- Assignment 11 Columbus là fixture pilot đang được bảo vệ; không reset, xóa hoặc migrate phá hủy dữ liệu hiện có.

## Quyết định kiến trúc

### 1. Một định danh kỹ năng dùng chung, không tạo thêm một “hòn đảo profile”

Tạo shared learning layer tại `src/lib/learning/`:

- `skillTypes.ts`: contract dùng chung;
- `skillCatalog.ts`: catalog nhỏ, versioned cho pilot;
- `skillMastery.ts`: reducer thuần, không phụ thuộc Firebase/React;
- `skillBridge.ts`: adapter giữa classroom topic/evidence và adaptive objective.

`StudentProfileDoc.skills` là bản tóm tắt canonical cho classroom. `StudentProfileDoc.topics` tiếp tục tồn tại như compatibility view cho dữ liệu cũ và UI cũ.

`LearningObjective` chỉ được bổ sung `skillId?: string`. Nó vẫn là objective của một lesson; `skillId` là khóa năng lực dùng chung. Objective không có `skillId` được coi là chưa nối, không được đoán bằng AI.

`studentLearningProfiles` vẫn được giữ cho adaptive session projection trong milestone đầu. Bridge dùng cùng `skillId` để ánh xạ objective memory sang skill state; không copy thêm một bộ mastery có tên khác.

### 2. Catalog pilot nhỏ, mapping bảo thủ

Catalog ban đầu chỉ có 3–5 kỹ năng được chọn từ Assignment 11 Columbus và lesson adaptive tương ứng. Mỗi kỹ năng có:

- `skillId` ổn định, không dùng `OBJ-1` làm định danh toàn cục;
- tên và mô tả ngắn;
- alias tiếng Việt dùng để nối topic legacy;
- prerequisite;
- misconception codes;
- mastery threshold.

Chỉ mapping khi alias khớp duy nhất hoặc assignment/objective có `skillId` rõ ràng. Topic không khớp hoặc khớp nhiều kỹ năng vẫn được giữ trong `topics` nhưng không được tự động đưa vào mastery. Không dùng một LLM call mới chỉ để đoán mapping.

### 3. Mastery là bằng chứng tích lũy, không phải điểm một lần

Reducer nhận các evidence đã chuẩn hóa. Chính sách pilot:

- approved homework và transfer assessment là evidence mạnh;
- practice là formative evidence, có trọng số thấp hơn;
- một practice attempt không được tự mình chuyển trạng thái thành `mastered`/`advanced`;
- trạng thái `weak` cần tối thiểu hai evidence độc lập, giữ nguyên nguyên tắc hiện tại của profile;
- nếu thiếu evidence chất lượng cao, mastery estimate có thể tăng nhưng status bị chặn ở `developing`;
- evidence không được xóa chỉ vì bài sau không nhắc tới kỹ năng.

Reducer phải deterministic, kẹp mọi score/confidence về `[0, 1]`, phân biệt `evidenceCount` với `sourceKinds`, và tính `trend` từ các evidence gần nhất. Các trọng số là policy constants có test, không được gọi là một mô hình psychometric đã được hiệu chuẩn.

## Contract dữ liệu dự kiến

Các interface dưới đây là contract thiết kế; tên field phải được giữ nhất quán khi chuyển sang implementation plan.

```ts
export type SkillStatus =
  | 'not_seen'
  | 'weak'
  | 'developing'
  | 'mastered'
  | 'advanced';

export type SkillEvidenceSource = 'homework' | 'practice' | 'transfer';
export type SkillSignal = 'weak' | 'partial' | 'strong';
export type SkillTrend = 'up' | 'flat' | 'down';

export interface SkillDefinition {
  skillId: string;
  domain: string;
  title: string;
  description: string;
  aliases: string[];
  prerequisiteSkillIds: string[];
  misconceptionCodes: string[];
  masteryThreshold: number;
}

export interface SkillEvidence {
  evidenceId: string;
  skillId: string;
  source: SkillEvidenceSource;
  signal: SkillSignal;
  scoreRatio?: number;
  confidence: number;
  misconceptionCodes?: string[];
  assignmentId?: string;
  submissionId?: string;
  attemptId?: string;
  assessedAt: string;
  approved?: boolean;
}

export interface StudentSkillState {
  skillId: string;
  masteryEstimate: number;
  confidence: number;
  status: SkillStatus;
  evidenceCount: number;
  sourceKinds: SkillEvidenceSource[];
  misconceptionCounts: Record<string, number>;
  trend: SkillTrend;
  lastEvidenceAt: string;
}
```

Optional compatibility fields are added, not renamed:

- `ProfileTopic.skillId?: string`;
- `ProfileEvidenceRef.skillId?: string`;
- `StudentProfileDoc.skills?: StudentSkillState[]`;
- `LearningObjective.skillId?: string`;
- `PracticeSetDoc.skillIds?: string[]`;
- `PracticeQuestionPublic/Key.skillIds?: string[]`;
- `PracticeAttemptDoc.skillIds?: string[]`;
- `PracticeQuestionResult.skillIds?: string[]`.

The public practice response may carry skill IDs or safe skill titles, but must never carry the private answer key. Existing topic strings and all current private/public boundaries remain intact.

## Luồng dữ liệu

### Homework đã được duyệt

```text
approved grade
  -> normalize weakTopics/strengths/question evidence
  -> skillBridge.mapTopicToSkill()
  -> SkillEvidence[]
  -> skillMastery.reduce()
  -> studentProfiles.skills + legacy topics
```

AI draft chưa được teacher approve không được tạo authoritative skill evidence. Unknown topic vẫn được lưu trong legacy profile để không mất thông tin, nhưng không làm thay đổi `StudentSkillState`.

### Practice

```text
studentProfiles.skills
  -> choose tagged pilot skill
  -> generate practice set with skillIds
  -> student submits attempt
  -> canonical private-key grading
  -> formative SkillEvidence
  -> reduce skill state
```

Practice evidence được ghi idempotent theo `attemptId`. Retry không được tăng `evidenceCount` hai lần. Practice có thể cải thiện estimate/trend nhưng không tự cấp mastery cao nhất nếu chưa có approved homework hoặc transfer evidence.

### Adaptive objective

```text
LearningObjective.skillId
  -> adapter maps objective score/misconception
  -> same SkillEvidence contract
  -> StudentProfileDoc.skills summary
```

Objective không có `skillId` vẫn chạy theo contract adaptive cũ; bridge không suy luận ngược từ title/code nếu không có mapping rõ.

## Tương thích và migration

- Không chạy destructive migration và không reset hồ sơ hiện có.
- Hồ sơ cũ được đọc bình thường; `skills` được tạo lazy khi có evidence mới đã map được.
- `evidenceSubmissionIds` và `evidenceRefs` tiếp tục được normalize như hiện tại.
- `topics` vẫn là fallback hiển thị cho các topic chưa map.
- Không thêm Vercel Serverless Function; dùng các handler/API hiện có.
- Firestore rules giữ nguyên nguyên tắc: học sinh chỉ đọc profile của mình và không được ghi profile.
- Khi profile có cả topic và skill state, topic không được dùng để ghi đè skill state nếu mapping không rõ.

## Ranh giới milestone

### Có trong milestone

- shared skill contract và catalog pilot 3–5 kỹ năng;
- deterministic topic/objective adapter;
- mastery reducer và tests;
- ghi skill state cùng profile classroom;
- gắn skill IDs vào practice set/attempt;
- nối một lesson adaptive có objective được tag;
- dashboard học sinh hiển thị skill status, confidence/trend và evidence source ở mức an toàn;
- kiểm thử legacy, resubmission, idempotency, approval và privacy.

### Chưa có trong milestone

- taxonomy toàn bộ chương trình Toán;
- AI tự phát minh skill hoặc tự map topic mơ hồ;
- mục tiêu cá nhân có deadline;
- thuật toán chọn chuỗi bài tối ưu nhiều bước;
- transfer assessment phong phú cho mọi dạng bài;
- báo cáo phụ huynh và thông báo;
- thay thế hoàn toàn `studentLearningProfiles` trong một lần;
- deploy production.

## Tiêu chí chấp nhận

Milestone chỉ được coi là đạt khi tất cả điều sau có bằng chứng:

1. Cùng một pilot skill có cùng `skillId` trong classroom evidence, practice attempt và adaptive objective.
2. Topic legacy khớp alias duy nhất được nối; topic unknown/ambiguous không bị nối sai và vẫn được giữ lại.
3. Một bài không kiểm tra skill X không làm skill X biến mất hoặc tăng mastery.
4. Resubmission cùng assignment và retry cùng attempt không làm tăng evidence count ngoài ý muốn.
5. Practice score có thể cập nhật estimate/trend nhưng không tự đưa skill lên `mastered` khi thiếu evidence chất lượng cao.
6. Approved homework mới tạo homework evidence; AI draft chưa duyệt không tạo kết luận chính thức.
7. Học sinh chỉ thấy summary skill an toàn; không thấy answer key, rubric, teacher note hoặc private evidence payload.
8. Existing profile tests, practice tests, rules tests và build tiếp tục pass; có thêm reducer/adapter/API tests cho các tiêu chí trên.
9. Có một browser E2E authenticated cho pilot trước khi tuyên bố production-ready; unit/rules xanh một mình không đủ.

## Phương án rollout

1. Chạy catalog/adapter/reducer ở test fixtures của Assignment 11 Columbus, chưa bật cho dữ liệu production khác.
2. Bật bridge chỉ cho record có `skillId` rõ; record cũ không bị thay đổi.
3. So sánh skill state với topic profile và adaptive objective trong một pilot nhỏ có giáo viên kiểm tra.
4. Chỉ sau khi evidence mapping và mastery direction hợp lý mới mở rộng catalog hoặc bật adaptive next-step selection.

## Kết luận thiết kế

Milestone này ưu tiên một nguồn ngôn ngữ năng lực chung và một reducer có thể kiểm chứng. Nó cố ý không bắt đầu bằng biểu đồ, báo cáo phụ huynh hay thêm prompt AI, vì những phần đó chỉ có giá trị sau khi `skillId`, evidence quality và mastery semantics đã ổn định.
