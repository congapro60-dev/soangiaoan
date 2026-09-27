# AI Grading JSON Recovery and Student Math Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tự phục hồi có kiểm soát lỗi JSON do LaTeX trong AI chấm bài tập về nhà, chỉ retry model tối đa một lần khi còn lỗi có thể phục hồi, giữ nguyên submission/điểm hợp lệ hiện có, và hiển thị công thức trong “Bài làm của em”, đáp án cùng nhận xét bằng KaTeX để học sinh đọc được.

**Architecture:** Giữ nguyên endpoint `/api/grade-homework`, claim transaction, lifecycle/history và quota hiện có. Tách rõ bốn tầng: parse strict → deterministic repair có trạng thái trong chuỗi JSON → validate homework-grade contract → commit; nếu parse/schema/empty/MAX_TOKENS còn thất bại thì chạy một retry với cùng evidence và prompt JSON ngắn hơn. Ở UI, chuẩn hóa công thức tại thời điểm render qua module `mathText` dùng chung, không rewrite dữ liệu Firestore.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Firebase Admin/Firestore, Vercel API, Gemini Vision JSON mode, `react-markdown`, `remark-math`, `rehype-katex`, PowerShell.

---

## Ranh giới phải giữ nguyên

- Làm việc trong worktree `C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\classroom-math-render-duplicate`, branch `codex/fix-classroom-math-render-duplicate`.
- Không dùng dữ liệu thật của lớp 11 Columbus làm fixture, không tạo submission thử, không sửa/xóa/chấm/duyệt dữ liệu production trong lúc test.
- Không thêm Vercel Function, collection diagnostics, migration, Firestore rules/indexes hoặc bulk rewrite dữ liệu.
- Không đổi semantics tolerant của `parseLooseJson` đối với các caller cũ; đường commit homework mới phải gọi API strict riêng.
- Không nhân đôi quota, submission, evidence, `submissionGradeHistory` hoặc commit grade khi retry.
- Giữ `teacherApproved = false` cho mọi grade do AI tạo; giữ claim token và transaction lifecycle làm hàng rào chống worker cũ ghi đè.

## Bản đồ file và trách nhiệm

| File | Thay đổi dự kiến | Tiêu chí kiểm chứng |
|---|---|---|
| `src/utils/jsonRepair.ts` | Parser stateful, metadata recovery, compatibility wrapper | Unit test escape hợp lệ, LaTeX trần, `\\u`, control character và JSON cấu trúc hỏng |
| `src/lib/adaptive/mathText.ts` | Bọc đoạn LaTeX trần theo token, giữ delimiter hiện có | Golden test mẫu `DE \\in (CDE) và AB \\in (SAB)` không bọc cả câu tiếng Việt |
| `src/components/features/classroom/NhanXetMarkdown.tsx` | Chạy chuẩn hóa math trước Markdown/KaTeX | SSR không còn lệnh LaTeX trần ở text hiển thị |
| `src/components/features/classroom/QuestionResultsList.tsx` | Giữ một renderer cho `studentAnswer`, `expectedAnswer` và các trường giải thích | Student answer và đáp án đều tạo markup KaTeX |
| `src/components/features/classroom/student/StudentAssignmentCard.tsx` | Xác nhận cổng học sinh dùng component chung và copy lỗi an toàn | Test/UI smoke không lộ raw server error |
| `src/lib/classroom/gradingPrompt.ts` | Strict parse/normalize/validate, kiểu recovery, retry suffix | Test contract từ chối score/field/question sai |
| `api/_grading-core.ts` | Lỗi Gemini có category/finish reason typed để phân loại retry | Unit test retryable và non-retryable |
| `api/grade-homework.ts` | Một attempt helper, một retry, commit một lần, safe error | Lifecycle tests về call count, quota, history, claim race |
| `src/lib/classroom/types.ts` | `SubmissionGrade.gradingRecovery?` | Typecheck và projection test |
| `api/classroom.ts` | Cho phép metadata ở teacher grade; loại khỏi student projection | Student projection không có metadata/note nội bộ |
| `src/components/features/classroom/AssignmentPanel.tsx` | Badge teacher-only và copy lỗi ổn định | Giáo viên thấy hành động tiếp theo, học sinh không thấy chi tiết kỹ thuật |
| `api/__tests__/grade-homework.regrade.test.ts` | Mock sequence cho recovery/retry/failure | Không ghi đè grade cũ, không tạo history trùng |
| `api/__tests__/classroom-delete-handlers.test.ts` | Regression privacy cho `gradingRecovery` | Projection chỉ trả field công khai |
| `src/components/features/classroom/QuestionResultsList.test.tsx` | UI regression cho bài làm raw LaTeX và LaTeX có delimiter | SSR kiểm tra KaTeX ở cả hai cột |
| `src/lib/adaptive/mathText.test.ts` | Golden tests cho renderer dùng chung | Không phá công thức đã chuẩn hoặc text tiếng Việt |
| `HANDOFF.md` | Ghi evidence sau QA, không ghi nhận deploy nếu chưa có deployment mới | Review thủ công và `git diff --check` |

## Task 1 — Viết test đỏ cho parser, contract và math display

**Mục tiêu:** Chốt hành vi trước khi sửa code. Các test mới phải fail vì API/hành vi chưa có, không sửa implementation để làm test xanh giả.

- [ ] Trong `src/utils/jsonRepair.test.ts`, thêm các ca sau:

  ```ts
  it('parse JSON strict và đánh dấu không cần repair', () => {
    const result = parseJsonWithRecovery<{ feedback: string }>('{"feedback":"Em làm đúng."}');
    expect(result.value).toEqual({ feedback: 'Em làm đúng.' });
    expect(result.parseMode).toBe('strict');
    expect(result.repairKinds).toEqual([]);
  });

  it('repair LaTeX trần trong chuỗi nhưng không sửa backslash ngoài chuỗi', () => {
    const result = parseJsonWithRecovery<{ feedback: string; score: number }>(
      '{"feedback":"$D \\in SA \\subset (SAB) \\Rightarrow D \\in (SAB)$","score":8}',
    );
    expect(result.value.feedback).toContain('\\in');
    expect(result.value.feedback).toContain('\\Rightarrow');
    expect(result.parseMode).toBe('repaired');
    expect(result.repairKinds).toContain('latex_backslash');
  });

  it('giữ nguyên escape JSON hợp lệ và unicode escape đủ bốn ký tự hex', () => {
    const result = parseJsonWithRecovery<{ text: string }>(
      '{"text":"dòng \\n mới, tab \\t, quote \\"ok\\", slash \\\\, chữ \\u00E1"}',
    );
    expect(result.value.text).toContain('\n');
    expect(result.value.text).toContain('á');
    expect(result.value.text).toContain('"ok"');
  });

  it('repair control newline thô trong chuỗi và từ chối quote hoặc object bị cắt', () => {
    const rawControlNewline = '{"text":"dòng một' + '\n' + 'dòng hai"}';
    expect(parseJsonWithRecovery(rawControlNewline).value.text).toContain('\n');
    expect(() => parseJsonWithRecovery('{"text":"thiếu quote}')).toThrow(JsonRecoveryError);
    expect(() => parseJsonWithRecovery('{"score":8')).toThrow(JsonRecoveryError);
  });
  ```

- [ ] Trong `src/lib/adaptive/mathText.test.ts`, thêm golden cases phản ánh đúng ảnh QA:

  ```ts
  it('bọc công thức LaTeX trần trong bài làm nhưng giữ liên từ tiếng Việt ngoài math', () => {
    const out = sanitizeDisplayText(
      'DE \\in (CDE) và AB \\in (SAB) => DE \\cap AB = {F} => F là điểm chung của (CDE) và (SAB)',
    );
    expect(out).toContain('$DE \\in (CDE)$');
    expect(out).toContain('$AB \\in (SAB)$');
    expect(out).toContain('$DE \\cap AB = {F}$');
    expect(out).toContain('F là điểm chung');
    expect(out).not.toMatch(/\\(?:in|cap|subset|Rightarrow)(?![^$]*\$)/);
  });

  it('không thay đổi công thức đã có delimiter và không bọc câu tiếng Việt thuần', () => {
    const math = '$D \\in SA \\subset (SAB)$';
    expect(sanitizeDisplayText(math)).toBe(math);
    expect(sanitizeDisplayText('Em cần bổ sung bước giải thích.')).toBe('Em cần bổ sung bước giải thích.');
  });
  ```

- [ ] Trong `src/components/features/classroom/QuestionResultsList.test.tsx`, thay fixture student answer bằng một mẫu không có dấu `$` và giữ thêm một case có `$`. Render bằng `renderToStaticMarkup`; assert vùng “Bài làm của em” và “Đáp án / mốc cần đạt” đều chứa markup `class="katex"`, đồng thời không assert dựa trên ảnh thật.
- [ ] Trong `src/lib/classroom/gradingPrompt.test.ts`, thêm test contract với score `12` trên thang `10`, thiếu `feedbackForStudent`, `questionResults` có câu trùng và `NaN`; tất cả phải bị strict commit parser từ chối. Giữ nguyên các test cũ đang chứng minh `parseHomeworkGrade` tolerant vẫn kẹp điểm và tạo mảng mặc định.
- [ ] Trong `api/__tests__/grade-homework.regrade.test.ts`, mở rộng harness fetch để trả lần lượt: malformed JSON có `\\in`, schema-invalid JSON rồi valid JSON, hai response schema-invalid, và lỗi `SAFETY`. Trước implementation, các test mới phải fail hoặc chưa biên dịch vì helper chưa tồn tại.
- [ ] Chạy RED có giới hạn và ghi nhận kết quả:

  ```powershell
  npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\classroom-math-render-duplicate" run test -- src/utils/jsonRepair.test.ts src/lib/adaptive/mathText.test.ts src/components/features/classroom/QuestionResultsList.test.tsx src/lib/classroom/gradingPrompt.test.ts api/__tests__/grade-homework.regrade.test.ts
  ```

- [ ] Commit chỉ các test đỏ bằng lệnh `git add -- src/utils/jsonRepair.test.ts src/lib/adaptive/mathText.test.ts src/components/features/classroom/QuestionResultsList.test.tsx src/lib/classroom/gradingPrompt.test.ts api/__tests__/grade-homework.regrade.test.ts` rồi chạy `git commit -m "test(classroom): reproduce AI grading JSON and math display failures"`. Không sửa source production trong commit này.

## Task 2 — Implement parser phục hồi JSON có trạng thái

**Mục tiêu:** Cứu lỗi `Bad escaped character` do LaTeX trong string mà không biến một JSON hỏng cấu trúc thành grade giả; phần math display sẽ được triển khai ở Task 5 sau khi có contract parser ổn định.

- [ ] Trong `src/utils/jsonRepair.ts`, định nghĩa API typed:

  ```ts
  export type JsonParseMode = 'strict' | 'repaired';
  export type JsonRepairKind = 'latex_backslash' | 'invalid_unicode_escape' | 'control_character';

  export interface JsonRecoveryResult<T> {
    value: T;
    parseMode: JsonParseMode;
    repairKinds: JsonRepairKind[];
  }

  export class JsonRecoveryError extends Error {
    readonly cause?: unknown;
    constructor(message: string, cause?: unknown) {
      super(message);
      this.name = 'JsonRecoveryError';
      this.cause = cause;
    }
  }

  export declare function parseJsonWithRecovery<T = unknown>(raw: string): JsonRecoveryResult<T>;
  ```

  Đây là signature contract; phần thân thật phải thực hiện strict parse trước rồi mới chạy state machine bên dưới.

- [ ] Implement scanner một lần trên chuỗi raw với `inString` và `escaped`:
  - Ngoài string, chỉ chuyển trạng thái khi gặp dấu quote; không thay backslash, quote hoặc control character của JSON structure.
  - Trong string, giữ nguyên `\\"`, `\\\\`, `\\/`, `\\b`, `\\f`, `\\n`, `\\r`, `\\t`.
  - Với `\\u`, chỉ giữ nguyên khi bốn ký tự tiếp theo đều là hex; nếu không, ghi ra `\\\\` literal và thêm `invalid_unicode_escape`.
  - Với `\\` trước chữ cái LaTeX như `in`, `subset`, `Rightarrow`, `frac`, `sqrt`, `underline`, `text`, `cap`, `cup`, `notin`, ghi ra `\\\\` rồi giữ chữ cái, thêm `latex_backslash`.
  - Với raw `\r`, `\n`, `\t` trong string, chuyển thành escape JSON tương ứng và thêm `control_character`.
  - Không tự chèn quote, không tự thêm dấu `}`/`]`, không cắt raw response, không sửa dấu phẩy hay cấu trúc object; sau repair vẫn gọi `JSON.parse` và ném `JsonRecoveryError` nếu fail.
  - Dedupe `repairKinds` theo thứ tự xuất hiện; strict success trả mảng rỗng.

- [ ] Giữ `parseLooseJson` là compatibility wrapper gọi parser mới và trả `result.value`, để các consumer cũ tiếp tục được hưởng repair LaTeX mà không nhận metadata ngoài contract cũ. Không đổi các caller ngoài phạm vi classroom sang validator strict trong task này.
- [ ] Chạy GREEN riêng cho parser:

  ```powershell
  npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\classroom-math-render-duplicate" run test -- src/utils/jsonRepair.test.ts
  ```

- [ ] Chạy `git diff --check`, sau đó commit bằng `git add -- src/utils/jsonRepair.ts src/utils/jsonRepair.test.ts` và `git commit -m "fix(classroom): recover malformed LaTeX JSON safely"`.

## Task 3 — Tách strict homework-grade contract khỏi parser tolerant

**Mục tiêu:** Không commit grade chỉ vì JSON parse được. Dữ liệu AI phải đúng kiểu, đúng thang điểm và đủ cấu trúc để giáo viên có thể kiểm tra.

- [ ] Trong `src/lib/classroom/gradingPrompt.ts`, thêm các type sau cạnh `HomeworkGrade` và import metadata từ `src/utils/jsonRepair.ts`:

  ```ts
  export interface HomeworkGradeRecovery {
    parseMode: JsonParseMode;
    repairKinds: JsonRepairKind[];
    retryCount: 0 | 1;
  }

  export interface HomeworkGradeParseResult {
    grade: HomeworkGrade;
    recovery?: HomeworkGradeRecovery;
  }

  export class HomeworkGradeContractError extends Error {
    readonly retryable = true;
    constructor(message: string) {
      super(message);
      this.name = 'HomeworkGradeContractError';
    }
  }
  ```

- [ ] Tách phần trích JSON hiện có thành helper nội bộ `extractHomeworkJson(raw: string): string`; helper chỉ nhận object JSON trong code fence hoặc object đầu tiên như behavior cũ, không dùng regex để sửa escape.
- [ ] Giữ nguyên `parseHomeworkGrade(raw, maxScore, gradedWithoutAnswerKey): HomeworkGrade` cho các caller cũ và test cũ. Hàm này có thể tiếp tục dùng `parseLooseJson`, clamp điểm và tạo mảng rỗng theo compatibility contract.
- [ ] Thêm `parseHomeworkGradeForCommit(raw, maxScore, gradedWithoutAnswerKey, retryCount = 0): HomeworkGradeParseResult`. Hàm này phải:
  - gọi `parseJsonWithRecovery` trên JSON object đã extract;
  - yêu cầu root là object không phải array/null;
  - yêu cầu `score`, `maxScore`, `feedbackForStudent`, `noteForTeacher`, `strengths`, `weaknesses`, `weakTopics` và `questionResults` đúng kiểu; không nhận số dưới dạng string ở đường commit;
  - yêu cầu `maxScore` của AI khớp thang assignment trong sai số `0.000001`, `score` hữu hạn và nằm trong `[0, maxScore]`; không clamp và không thay điểm thiếu bằng `0`;
  - kiểm tra từng `questionResults`: object, `questionNumber` khác rỗng và không trùng, status thuộc enum, score/maxScore hữu hạn không âm, score không vượt maxScore, các trường text đúng kiểu, `confidence` nếu có nằm trong `[0, 1]`, boolean flag đúng kiểu;
  - giữ `gradedWithoutAnswerKey` từ context server, không tin field tương tự do AI tự gửi;
  - ném `HomeworkGradeContractError` cho thiếu field, sai kiểu, NaN/Infinity, score ngoài thang, câu trùng hoặc question result không hợp lệ;
  - trả `recovery` chỉ khi `parseMode === 'repaired'` hoặc `retryCount === 1`; recovery strict lần đầu không thêm metadata.
- [ ] Thêm hàm `buildHomeworkGradingRetryPrompt(input: HomeworkGradingInput): string` hoặc hằng suffix trong cùng file. Suffix phải nói rõ: trả JSON thuần, không code fence, giữ đúng schema, escape mọi backslash trong string JSON, vẫn viết công thức LaTeX nhưng không đổi phạm vi chấm; không đưa raw output lỗi vào prompt.
- [ ] Bổ sung test:
  - JSON có raw `\\in` và các trường đủ → parse thành công với `parseMode = repaired`;
  - JSON strict đủ trường → không có recovery;
  - root array, thiếu feedback, score string, score `12`/`10`, NaN, question duplicate → ném `HomeworkGradeContractError`;
  - `parseHomeworkGrade` cũ vẫn giữ các assertion clamp/default hiện có.
- [ ] Chạy targeted tests:

  ```powershell
  npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\classroom-math-render-duplicate" run test -- src/lib/classroom/gradingPrompt.test.ts src/utils/jsonRepair.test.ts
  ```

- [ ] Commit sau khi test xanh bằng `git add -- src/lib/classroom/gradingPrompt.ts src/lib/classroom/gradingPrompt.test.ts` và `git commit -m "feat(classroom): validate homework grade payload before commit"`.

## Task 4 — Retry Gemini đúng một lần và commit grade đúng một lần

**Mục tiêu:** Tự cứu parse/schema/empty/MAX_TOKENS với cùng evidence, nhưng không retry lỗi không liên quan đến JSON và không làm tăng quota/history.

- [ ] Trong `api/_grading-core.ts`, thêm error type có category đủ để caller không phải parse chuỗi tiếng Việt:

  ```ts
  export type GeminiFailureKind =
    | 'http'
    | 'empty'
    | 'max_tokens'
    | 'safety'
    | 'recitation'
    | 'provider';

  export class GeminiResponseError extends Error {
    constructor(readonly kind: GeminiFailureKind, message: string, readonly finishReason?: string) {
      super(message);
      this.name = 'GeminiResponseError';
    }
  }
  ```

  `callGeminiVision` phải giữ message tiếng Việt an toàn hiện có nhưng ném type tương ứng cho HTTP, empty, `MAX_TOKENS`, `SAFETY`, `PROHIBITED_CONTENT`, `RECITATION` và finish reason khác. Không gửi raw response provider ra client.

- [ ] Trong `api/grade-homework.ts`, giữ `claimSubmissionForGrading` ở ngoài vòng attempt và chỉ tải ảnh/evidence một lần. Tách helper nội bộ có shape rõ:

  ```ts
  interface GradeAttemptResult {
    grade: {
      score: number;
      maxScore: number;
      feedback: string;
      noteForTeacher: string;
      strengths: string[];
      weaknesses: string[];
      questionResults: QuestionResult[];
      weakTopics: string[];
      gradedWithoutAnswerKey: boolean;
      gradedAt: string;
      teacherApproved: false;
      gradingRecovery?: GradingRecovery;
    };
    recovery?: HomeworkGradeRecovery;
  }
  ```

  Helper phải gọi `callGeminiVision` rồi `parseHomeworkGradeForCommit`, nhưng chưa commit Firestore. `gradeOneSubmission` chỉ gọi `commitAiGradeIfClaimed` sau khi một attempt thành công.

- [ ] Phân loại retry ở `gradeOneSubmission`:
  - retryable: `HomeworkGradeContractError`, `JsonRecoveryError` sau khi recovery không parse được, `GeminiResponseError.kind === 'empty'` hoặc `'max_tokens'`;
  - non-retryable: auth/HTTP provider/quota, `safety`, `recitation`, ảnh không đọc được, assignment mismatch, claim mất hoặc lỗi Firestore;
  - mọi loại khác chỉ chạy lần đầu và restore claim theo lifecycle cũ.
- [ ] Với retryable failure lần đầu, gọi Gemini lần hai với đúng `ctx.assignmentImages`, `ctx.answerKeyImages`, `images`, `studentText` và cùng `maxScore`; chỉ thêm retry suffix. Không truyền `raw` lần đầu vào prompt lần hai.
- [ ] Giới hạn bằng biến `retryCount`/`attemptIndex`: tổng số lời gọi model của một submission trong request không vượt `2`. Nếu lần đầu parse được sau deterministic repair thì dừng, không retry.
- [ ] Gắn `gradingRecovery` vào grade chỉ khi `parseMode = repaired` hoặc retry thành công. `retryCount` bằng `0` cho syntax repair lần đầu và bằng `1` khi retry. `repairKinds` chỉ gồm enum đã kiểm soát.
- [ ] Khi cả hai attempt thất bại, giữ ảnh/file/text và grade cũ; nếu chưa có grade thì `status = error` với copy ổn định, không dùng `error.message` thô. Copy giáo viên là: `AI gặp lỗi định dạng khi đọc kết quả chấm. Bài và ảnh vẫn được giữ nguyên; hệ thống đã tự thử phục hồi. Thầy/cô có thể chấm lại bằng AI hoặc sửa điểm bằng tay.`
- [ ] Không gọi `commitAiGradeIfClaimed`, `removeSubmissionGradeEvidence` hoặc history writer sau attempt thất bại. Giữ hành vi stale claim/manual edit/delete hiện có.
- [ ] Giữ quota ở caller (`handleGradeOne`/`handleGradeAssignment`) như một lần cho submission/task; retry không gọi `bumpQuota` lần hai. Batch phải tiếp tục với submission khác.
- [ ] Mở rộng `api/__tests__/grade-homework.regrade.test.ts` với các assertion cụ thể:
  - response đầu có raw LaTeX hợp lệ sau repair → fetch model 1 lần, grade mới commit chưa duyệt, có recovery `syntax_repaired`;
  - response đầu schema-invalid, response hai strict-valid → fetch model 2 lần, grade mới commit, retry count `1`, quota chỉ tăng một nhiệm vụ;
  - cả hai schema-invalid → fetch model 2 lần, grade cũ giữ nguyên, không có history/evidence mới;
  - `SAFETY` → fetch model 1 lần, không retry;
  - claim mất trước commit → không grade/history mới dù attempt parse thành công;
  - batch có một submission lỗi → các submission còn lại vẫn xử lý.
- [ ] Chạy test API và typecheck API:

  ```powershell
  npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\classroom-math-render-duplicate" run test -- api/__tests__/grading-core.test.ts api/__tests__/grade-homework.regrade.test.ts api/__tests__/classroom-grade-lifecycle.test.ts
  npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\classroom-math-render-duplicate" run lint:api
  ```

- [ ] Commit bằng `git add -- api/_grading-core.ts api/grade-homework.ts api/__tests__/grading-core.test.ts api/__tests__/grade-homework.regrade.test.ts` và `git commit -m "feat(classroom): retry recoverable AI grading responses once"`.

## Task 5 — Hiển thị recovery an toàn và công thức chuẩn ở cả hai phía

**Mục tiêu:** Giáo viên biết AI đã tự phục hồi; học sinh chỉ thấy kết quả/copy phù hợp và đọc được công thức trong bài làm, đáp án, giải thích.

- [ ] Trong `src/lib/classroom/types.ts`, thêm type và field optional:

  ```ts
  export interface GradingRecovery {
    mode: 'syntax_repaired' | 'retry_recovered';
    retryCount: 0 | 1;
    repairKinds: string[];
  }

  export interface SubmissionGrade {
    // các field hiện có giữ nguyên
    gradingRecovery?: GradingRecovery;
  }
  ```

  Không biến field này thành bắt buộc để các grade cũ đọc được.

- [ ] Trong `api/classroom.ts`, giữ allow-list teacher/server đầy đủ nhưng không copy `gradingRecovery`, `noteForTeacher`, `teacherNote` hoặc field diagnostics nào vào `projectStudentSubmission`. Bổ sung test trong `api/__tests__/classroom-delete-handlers.test.ts` với grade có cả `gradingRecovery`, `noteForTeacher`, `teacherNote`; assert student response không chứa cả ba field nhưng vẫn có score, feedback và `questionResults` công khai.
- [ ] Trong `src/components/features/classroom/AssignmentPanel.tsx`, khi grade có `gradingRecovery`, hiển thị badge teacher-only `AI đã tự phục hồi định dạng`; không hiển thị `repairKinds`, retry count hoặc raw parser error cho học sinh. Khi `s.errorMessage` là lỗi chấm không hoàn tất, chỉ hiển thị copy hành động an toàn, không in `Bad escaped character`, `position`, raw JSON hoặc response provider.
- [ ] Trong `src/lib/adaptive/mathText.ts`, hoàn thiện đường render dùng chung trước khi sửa component:
  - mở rộng danh sách lệnh nhận diện cho mẫu classroom gồm `in`, `notin`, `subset`, `supset`, `cap`, `cup`, `Rightarrow`, `Leftrightarrow`, `to`, `le`, `ge`, `ne`, `frac`, `sqrt`, `underline`, `text`, `mathrm`, `mathbf`;
  - tokenize `$...$` trước và không chèn delimiter vào vùng math đã có;
  - trong vùng text, bọc từng đoạn math trần có cấu trúc gồm identifier/toán tử/lệnh LaTeX, ngoặc cân bằng và dấu `=`/`=>`, dừng trước liên từ hoặc câu chữ tiếng Việt (`và`, `nên`, `vì`, `do đó`, `suy ra`, `là`) để không bọc cả câu;
  - chuyển `=>` thành `\\Rightarrow` chỉ trong đoạn đã xác định là math;
  - giữ tiền tố văn bản như `Vì `, `Suy ra ` và hậu tố như ` là điểm chung` ở text token;
  - khi lệnh không có KaTeX support, giữ nguyên nội dung qua `throwOnError: false`/fallback Markdown, không render HTML từ chuỗi AI.
- [ ] Trong `src/components/features/classroom/NhanXetMarkdown.tsx`, gọi `sanitizeDisplayText(text)` một lần trước `ReactMarkdown`; giữ `remarkGfm`, `remarkMath`, `rehypeKatex` và CSS hiện có. Không tạo renderer thứ hai trong `QuestionResultsList`.
- [ ] Trong `src/components/features/classroom/QuestionResultsList.tsx`, tiếp tục truyền `studentAnswer`, `expectedAnswer`, `explanation`, `correction`, `nextPractice` qua `NhanXetMarkdown`; chỉ sửa nếu cần để không có nhánh `TextBlock` nào render raw LaTeX bằng `<p>`.
- [ ] Trong `src/components/features/classroom/student/StudentAssignmentCard.tsx` và `StudentReport.tsx`, xác nhận `feedback` và `QuestionResultsList` đều đi qua đường chung. Nếu view model có copy lỗi riêng, dùng câu học sinh: `Bài đã được nhận nhưng kết quả chấm chưa hoàn tất. Em chưa cần nộp lại ảnh; thầy/cô sẽ chấm lại hoặc kiểm tra bài.`
- [ ] Bổ sung test UI:
  - `QuestionResultsList.test.tsx`: raw student answer và expected answer theo mẫu ảnh đều có `class="katex"`; case `$...$` giữ một công thức không bị chèn delimiter lần hai;
  - `src/lib/adaptive/mathText.test.ts`: text tiếng Việt thuần không đổi, delimiter `\(...\)`/`\[...\]` được chuẩn hóa, `DE \\in ...` không còn command trần ngoài math;
  - test student projection: không có recovery/internal note nhưng nội dung math công khai vẫn tồn tại để renderer xử lý.
- [ ] Chạy targeted UI/privacy checks:

  ```powershell
  npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\classroom-math-render-duplicate" run test -- src/lib/adaptive/mathText.test.ts src/components/features/classroom/QuestionResultsList.test.tsx api/__tests__/classroom-delete-handlers.test.ts
  npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\classroom-math-render-duplicate" run lint
  ```

- [ ] Commit bằng `git add -- src/lib/classroom/types.ts api/classroom.ts api/__tests__/classroom-delete-handlers.test.ts src/lib/adaptive/mathText.ts src/lib/adaptive/mathText.test.ts src/components/features/classroom/NhanXetMarkdown.tsx src/components/features/classroom/QuestionResultsList.tsx src/components/features/classroom/QuestionResultsList.test.tsx src/components/features/classroom/student/StudentAssignmentCard.tsx src/components/features/classroom/StudentReport.tsx src/components/features/classroom/AssignmentPanel.tsx` và `git commit -m "feat(classroom): surface safe grading recovery and math rendering"`.

## Task 6 — Full verification, controlled browser QA và handoff

**Mục tiêu:** Chỉ kết luận hoàn tất sau khi test code, lifecycle, privacy, build và browser fixture cùng xác nhận; không biến production 11 Columbus thành nơi thử nghiệm.

- [ ] Chạy toàn bộ test Vitest trong worktree:

  ```powershell
  npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\classroom-math-render-duplicate" run test
  ```

  Ghi số file/test pass và nếu có fail thì quay lại task gây lỗi, không bỏ qua bằng filter.

- [ ] Chạy Firestore rules, TypeScript, API typecheck, build và whitespace check:

  ```powershell
  npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\classroom-math-render-duplicate" run test:rules
  npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\classroom-math-render-duplicate" run lint
  npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\classroom-math-render-duplicate" run lint:api
  npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\classroom-math-render-duplicate" run build
  git diff --check
  ```

- [ ] Chạy controlled browser E2E bằng fixture local/test harness, không dùng submission thật:
  - fixture 1: model trả raw LaTeX JSON parse được sau repair → thấy grade, badge teacher-only, học sinh thấy công thức rendered;
  - fixture 2: model trả schema-invalid rồi valid → network/mock log đúng hai call, UI chỉ có một grade/history/quota task;
  - fixture 3: cả hai lần schema-invalid → ảnh và grade cũ còn nguyên, teacher thấy nút chấm lại/sửa tay, student thấy copy an toàn;
  - fixture 4: `SAFETY` → không retry;
  - fixture 5: student projection → không có `noteForTeacher`, `teacherNote`, `gradingRecovery`, raw parser error;
  - kiểm tra viewport 320px và 375px để `QuestionResultsList` không làm tràn công thức; công thức dài phải cuộn ngang trong vùng math theo CSS hiện có.
- [ ] Nếu dùng Chrome phiên đăng nhập thật cho smoke, chỉ điều hướng/đọc fixture hoặc bản production sau khi deployment đã tồn tại; không bấm chấm, duyệt, sửa, xóa, upload trên lớp 11 Columbus. Nếu Ox Alpha/OpenCode CLI khả dụng, giao một lượt QA độc lập cho Ox Alpha Free với checklist trên và yêu cầu trả evidence/call count/privacy, không chỉ verdict.
- [ ] Cập nhật `HANDOFF.md` bằng evidence thực tế:
  - commit/branch chứa implementation;
  - số liệu test/rules/lint/build;
  - kết quả Ox Alpha/OpenCode QA và nếu provider không khả dụng thì ghi rõ `BLOCKED`, không ghi PASS;
  - browser fixture đã chạy;
  - xác nhận không mutation dữ liệu 11 Columbus;
  - các giới hạn còn lại: AI vẫn cần giáo viên duyệt, production smoke authenticated chỉ read-only nếu chưa có fixture deployed.
- [ ] Chạy review cuối:

  ```powershell
  git status --short --branch
  git log --oneline -8
  git diff main...HEAD --stat
  git diff main...HEAD --check
  rg -n -S "Bad escaped character|position [0-9]+|raw response|noteForTeacher|teacherNote|gradingRecovery" src api --glob '*.ts' --glob '*.tsx'
  ```

  Kết quả cuối phải chứng minh các chuỗi kỹ thuật chỉ nằm trong test/log nội bộ hoặc mapping an toàn, không render raw cho học sinh.
- [ ] Không push `main`, không deploy và không thao tác production trong task plan này nếu chưa có yêu cầu tích hợp riêng sau khi tất cả gate xanh. Khi được yêu cầu tích hợp, dùng skill finishing-development-branch, kiểm tra remote/main và deployment mới trước khi báo hoàn tất.

## Thứ tự commit dự kiến

1. `test(classroom): reproduce AI grading JSON and math display failures`
2. `fix(classroom): recover malformed LaTeX JSON safely`
3. `feat(classroom): validate homework grade payload before commit`
4. `feat(classroom): retry recoverable AI grading responses once`
5. `feat(classroom): surface safe grading recovery and math rendering`
6. `docs(classroom): record AI grading recovery QA`

Mỗi commit phải buildable hoặc có test/typecheck phù hợp với phạm vi của commit; không gộp một commit khổng lồ trước khi biết task nào gây lỗi.

## Tiêu chí nghiệm thu cuối

- Lỗi `Bad escaped character` do LaTeX trong feedback/question result được deterministic repair hoặc retry tối đa một lần; không làm mất bài/ảnh/grade cũ.
- JSON parse được chưa đủ để commit: contract strict chặn score ngoài thang, field sai kiểu, NaN/Infinity, câu trùng và cấu trúc thiếu.
- Retry không lặp vô hạn, không retry safety/provider/auth/quota/image/assignment mismatch, không nhân đôi quota/history/evidence.
- Học sinh đọc được công thức trong `Bài làm của em`, đáp án và nhận xét; dữ liệu cũ có LaTeX trần cũng được hiển thị tốt mà không rewrite Firestore.
- Học sinh không nhận `noteForTeacher`, `teacherNote`, `gradingRecovery`, raw JSON, finish reason hoặc vị trí lỗi.
- Full Vitest, rules, lint, lint:api, build và `git diff --check` đều pass; QA browser dùng fixture kiểm soát; production 11 Columbus chỉ được đọc nguyên trạng.
