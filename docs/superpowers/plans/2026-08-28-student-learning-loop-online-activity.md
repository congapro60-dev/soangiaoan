# Student Learning Loop Online Activity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn thiện vòng lặp học tập của học sinh: giáo viên phát hiện nhu cầu từ báo cáo, tạo hoạt động hỗ trợ có mục tiêu, phát hành cùng một nội dung dưới dạng online và PDF/DOCX, học sinh làm/chấm, giáo viên duyệt/sửa, rồi kết quả chính thức cập nhật tiến trình và hồ sơ năng lực. Luồng nộp ảnh/PDF/Word, bài chấm và dữ liệu hiện có của 11 Columbus cùng các lớp khác phải tiếp tục đọc được và không bị thay đổi ngoài các field additive cần thiết.

**Architecture:** `Exam` là nguồn nội dung chuẩn có phiên bản; `AssignmentDoc` là bản ghi giao; `ExamSubmission` và `SubmissionDoc` vẫn nằm ở collection hiện tại. Một adapter thuần chiếu ba nguồn thành `StudentActivityView`, không tạo collection câu hỏi thứ tư. Luồng học sinh trong lớp đi qua `api/classroom` với `studentLinks`/ID token để máy chủ suy ra identity, deadline và số lần làm. Luồng thi công khai `/exam/:code` giữ nguyên. Chấm điểm dùng lifecycle provisional → teacher review/automatic policy → official; mọi sửa/chấm lại/xóa điểm tạo history và không xóa bài làm/file gốc. Xuất PDF/DOCX tái sử dụng `api/export-lesson.ts` và các exporter hiện có, cùng `contentVersion`/`contentHash` với đề online.

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind v4 + Firebase Auth/Firestore/Storage + Firebase Admin/Vercel functions hiện có + Vitest + Firestore Rules emulator + `vietnamese-education-copy` cho copy giáo dục + gate công thức `src/lib/adaptive/mathText.ts`.

---

## Quy tắc triển khai bắt buộc

- Làm trên worktree/branch hiện tại `C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration`, không sửa checkout bẩn `C:\Users\ADMIN\Downloads\smart-lesson-plan-ai`.
- Trước mỗi task: viết test đỏ cho logic mới, chạy đúng test mục tiêu, rồi mới sửa implementation.
- Không sửa trực tiếp dữ liệu production, không chạy backfill, không đổi/xóa bài nộp, điểm, ảnh hoặc file của 11 Columbus và lớp khác.
- Không tạo Vercel function mới nếu mở rộng an toàn được `api/classroom.ts`, `api/exam.ts` hoặc `api/export-lesson.ts`.
- Không tin `studentName`, `studentClass`, `studentId`, `classId`, deadline hoặc `maxAttempts` do trình duyệt gửi; các giá trị này phải được suy ra/kiểm tra ở máy chủ.
- Student projection không được chứa answer key, rubric, `gradingInstructions`, `noteForTeacher`, `teacherNote` hoặc lịch sử chấm nội bộ.
- Các trường mới đều optional khi đọc; record legacy được map lazy, không ghi ngược nếu giáo viên chưa chủ động cập nhật.
- Mọi text có công thức phải đi qua `src/lib/adaptive/mathText.ts`; không viết regex xử lý công thức mới ở component/API.
- Khi có nội dung/nhận xét/khuyến nghị tiếng Việt: dùng register giáo viên–học sinh đúng ngữ cảnh và chạy gate của `vietnamese-education-copy`; không biến tín hiệu một bài thành kết luận năng lực chắc chắn.

## Task 1: Contract metadata, snapshot và activity adapter

**Files:**

- Modify: `src/lib/classroom/types.ts`
- Modify: `src/types.ts`
- Create: `src/lib/classroom/activityModel.ts`
- Create: `src/lib/classroom/activityModel.test.ts`
- Create: `src/lib/classroom/activitySnapshot.ts`
- Create: `src/lib/classroom/activitySnapshot.test.ts`

- [ ] **Step 1: Viết test đỏ cho compatibility và dedupe.** Tạo fixture cho assignment upload legacy, assignment exam legacy, practice set/attempt, exam/submission mới và submission bổ sung. Assert rằng adapter trả purpose/delivery/grading mặc định hợp lý, map được `contentVersion` fallback ổn định, chọn đúng lượt chính thức mới nhất, giữ số lần làm/lịch sử và không làm mất record thiếu field.
- [ ] **Step 2: Chạy test đỏ.** Dùng `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration" exec vitest run src/lib/classroom/activityModel.test.ts src/lib/classroom/activitySnapshot.test.ts`; failure phải chỉ ra type/helper chưa tồn tại, không dùng snapshot production.
- [ ] **Step 3: Bổ sung type optional.** Thêm các union `ActivityPurpose`, `DeliveryMode`, `GradingPolicy`, `GradeState`, `GradingSource` và metadata `purpose`, `deliveryMode`, `skillIds`, `sourceReportId`, `gradingPolicy`, `contentVersion`, `exportBundle`, `targetStudentIds` vào `AssignmentDoc`/`ClassAssignment`; thêm metadata version/skill/export vào `Exam`; thêm class/assignment/attempt/purpose/lifecycle vào `ExamSubmission`. Giữ nguyên tên và kiểu field legacy.
- [ ] **Step 4: Implement adapter thuần.** Tạo `StudentActivityView` và `buildStudentActivityViews`/helper tương đương để hợp nhất upload, online và practice; trạng thái phải phân biệt `chưa làm`, `đang làm`, `đã nộp`, `chờ giáo viên`, `đã chính thức`, `cần thử lại`. `contentVersion` fallback không ghi Firestore; score official/provisional tách riêng; target student lọc sau khi đã xác minh membership.
- [ ] **Step 5: Implement snapshot identity.** Chuẩn hóa câu hỏi, skill IDs, rubric/answer-key hash ở phía giáo viên/server; tạo `contentVersion` và `contentHash` ổn định. Khi `isImmutableAfterPublish` đã bật, patch nội dung phải trả lỗi hướng dẫn tạo bản sao phiên bản mới; snapshot cũ vẫn được đọc/chấm.
- [ ] **Step 6: Chạy lại test task 1 và các test hiện có.** Chạy `portalViewModel.test.ts`, `classReportModel.test.ts`, `classProgressModel.test.ts`, `profileMerge.test.ts`, `questionCatalog.test.ts`; kiểm tra `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration" run lint`.
- [ ] **Step 7: Commit.** Commit `feat(classroom): add versioned student activity contracts`.

## Task 2: Một snapshot cho online và PDF/DOCX backup

**Files:**

- Modify: `src/components/tabs/ExamsTab.tsx`
- Modify: `src/components/features/testing/ExamDocsModal.tsx`
- Modify: `src/components/features/testing/StudentPreviewModal.tsx`
- Modify: `src/utils/examWordExport.ts`
- Modify: `src/utils/examLatexExport.ts`
- Modify: `src/utils/pdfExport.ts`
- Modify: `api/export-lesson.ts`
- Modify: `src/lib/classroom/teacherService.ts`
- Modify: `api/_classroom-teacher.ts`
- Create: `src/lib/classroom/activityExport.ts`
- Create: `src/lib/classroom/activityExport.test.ts`

- [ ] **Step 1: Viết test đỏ cho export contract.** Với một exam có công thức, test payload online/student PDF/student DOCX/teacher key; assert bốn output dùng cùng `contentVersion`/`contentHash`, student output không có `correctAnswer`/rubric, teacher output có đáp án/rubric, và thay đổi câu hỏi tạo version/hash mới chứ không ghi đè version cũ.
- [ ] **Step 2: Chạy test đỏ.** Dùng `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration" exec vitest run src/lib/classroom/activityExport.test.ts`; xác nhận failure trước implementation.
- [ ] **Step 3: Tạo export service thuần.** `buildActivityExportBundle` nhận snapshot canonical, trả payload cho online, student backup và teacher key; trạng thái `pending/ready/error`, tên file, thời điểm, hash và thông báo lỗi có nguyên nhân. Không sinh lại câu hỏi bằng AI ở bước export.
- [ ] **Step 4: Nối exporter hiện có.** Tái sử dụng `exportExamToDocx`, `exportAnswerKeyWord`, `exportAnswerSheetPDF`, `api/export-lesson.ts` và pipeline KaTeX/MathML hiện có. Nếu cần mở rộng API, chỉ thêm input/response tương thích; không tạo endpoint mới. Gắn `exportBundle` vào bản ghi exam/assignment bằng action giáo viên có kiểm quyền và không thay file đã phát hành.
- [ ] **Step 5: Nối UI preview.** `ExamDocsModal`/`StudentPreviewModal` phải cho giáo viên xem riêng bản học sinh và bản giáo viên, chỉ báo `ready` khi các định dạng được yêu cầu tạo thành công; có nút thử lại cùng snapshot, lỗi xuất hiển thị nguyên nhân và không xóa đề/bài giao.
- [ ] **Step 6: QA nội dung representative.** Render ít nhất một đề Toán có phân số, tập hợp, suy luận và chỉ số vào PNG/PDF/DOCX; kiểm tra không còn LaTeX thô, không tràn A4, không lộ đáp án học sinh. Chạy gate `mathText.sanitizeDisplayText`/golden tests và rà soát copy tiếng Việt.
- [ ] **Step 7: Chạy test/lint và commit.** Chạy export tests, `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration" run lint:api`, `run build`; commit `feat(exams): export versioned activity backups`.

## Task 3: Luồng làm bài online trong cổng lớp với server identity

**Files:**

- Create: `src/lib/classroom/studentExamPolicy.ts`
- Create: `src/lib/classroom/studentExamPolicy.test.ts`
- Create: `api/_classroom-online.ts`
- Modify: `api/classroom.ts`
- Modify: `src/services/studentPortalApi.ts`
- Create: `src/services/studentExamApi.ts`
- Create: `src/services/studentExamApi.test.ts`
- Create: `src/pages/StudentClassExamPage.tsx`
- Modify: `src/main.tsx`
- Modify: `src/pages/StudentPortalPage.tsx`
- Modify: `src/components/features/classroom/student/StudentPortalDashboard.tsx`
- Modify: `src/components/features/classroom/student/StudentAssignmentCard.tsx`
- Modify: `firestore.rules`
- Modify: `tests/rules/lopHoc.rules.test.ts`
- Create: `api/__tests__/classroom-student-exam.test.ts`

- [ ] **Step 1: Viết test đỏ cho policy thuần.** Bao phủ: student link đúng/sai, assignment không thuộc lớp, assignment đóng, trước/sau cửa sổ đề, hết số lần, resume attempt đang làm, submit lặp cùng nonce, đổi student ID trên client và bài target nhóm hỗ trợ. Assert lỗi có thể hiển thị cho học sinh, không trả answer key.
- [ ] **Step 2: Chạy test đỏ.** Dùng `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration" exec vitest run src/lib/classroom/studentExamPolicy.test.ts src/services/studentExamApi.test.ts api/__tests__/classroom-student-exam.test.ts`.
- [ ] **Step 3: Implement server handlers.** Trong `api/_classroom-online.ts`, thêm các action `studentExamStart`, `studentExamSave`, `studentExamSubmit`, `studentExamResume`; `api/classroom.ts` chỉ dispatch. Mỗi request xác thực ID token, đọc `studentLinks/{uid}`, roster, assignment và exam bằng Admin SDK; server tự gắn `classId`, `assignmentId`, `studentId`, `studentName`, `studentClass`, `attemptNumber`, `activityPurpose` và version.
- [ ] **Step 4: Enforce attempt policy bằng transaction/nonce.** Tạo/resume đúng một attempt cho cùng activity/version; khóa sau submit; kiểm tra deadline, `maxAttempts`, assignment `isOpen`, exam window ở server; retry mạng và double-click không sinh attempt thứ hai. Autosave chỉ cập nhật attempt `in_progress` của đúng student.
- [ ] **Step 5: Tạo client API và trang lớp.** `studentExamApi.ts` chỉ gửi token và payload câu trả lời; không gửi identity để quyết định quyền. `StudentClassExamPage` dùng renderer chung với `StudentExamPage`, có mục tiêu/hướng dẫn/thời lượng, autosave/resume, trạng thái mất mạng, nộp thành công và trạng thái chấm. Giữ nguyên hành vi public `/exam/:code` và không đổi dữ liệu legacy.
- [ ] **Step 6: Nối dashboard/card.** Với `AssignmentDoc.type === 'exam'`, hiển thị `Làm bài online` hoặc `Tiếp tục`; chỉ mở bài đúng assignment. Hiển thị số lần, hạn nộp, điểm tạm/chính thức và bước tiếp theo; assignment upload vẫn giữ luồng nhiều ảnh/PDF/Word hiện có.
- [ ] **Step 7: Kiểm thử Rules/API.** Luồng lớp dùng server API nên không mở quyền ghi rộng cho anonymous. Nếu cần rule đọc/ghi compatibility cho public exam, giữ giới hạn hiện có và thêm test cross-class/cross-student/answer-key leak; chạy `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration" run test:rules` với Java 21 nếu môi trường có emulator.
- [ ] **Step 8: Chạy test/lint/build và commit.** Commit `feat(student): connect classroom online attempts`.

## Task 4: Chấm server và duyệt/sửa kết quả online

**Files:**

- Modify: `api/exam.ts`
- Modify: `api/_classroom-online.ts`
- Modify: `api/_grade-lifecycle.ts`
- Create: `src/lib/classroom/onlineGradeLifecycle.ts`
- Create: `src/lib/classroom/onlineGradeLifecycle.test.ts`
- Modify: `src/lib/classroom/teacherService.ts`
- Modify: `src/pages/TeacherGradingPage.tsx`
- Modify: `src/pages/AnswerReviewPage.tsx`
- Modify: `src/pages/StudentResultPage.tsx`
- Modify: `src/components/tabs/ExamsTab.tsx`
- Modify: `src/components/features/classroom/GradeReviewModal.tsx`
- Modify: `src/components/features/classroom/QuestionResultsList.tsx`
- Modify: `src/components/features/classroom/NhanXetMarkdown.tsx`
- Create: `api/__tests__/classroom-online-grade-lifecycle.test.ts`

- [ ] **Step 1: Viết test đỏ cho vòng đời điểm.** Bao phủ objective-only automatic → official; mixed objective/essay → provisional/pending teacher; AI suggestion; teacher sửa điểm từng câu/nhận xét tổng; approve; regrade; delete current grade; conflict/retry; history idempotency. Assert bài làm và evidence cũ không bị xóa, `teacherApproved` chỉ true khi giáo viên duyệt.
- [ ] **Step 2: Chạy test đỏ.** Dùng `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration" exec vitest run src/lib/classroom/onlineGradeLifecycle.test.ts api/__tests__/classroom-online-grade-lifecycle.test.ts`.
- [ ] **Step 3: Chuẩn hóa grade adapter.** Map `ExamSubmission.answers` sang shape question-result dùng chung; lưu `gradeState`, `gradingSource`, `approvalMode`, `teacherApprovedAt`, `supersedesSubmissionId`; dùng history key idempotent và transaction conflict check tương đương `_grade-lifecycle.ts`. Không dùng sửa answer key để giả lập sửa điểm học sinh.
- [ ] **Step 4: Bổ sung action giáo viên có kiểm quyền.** Mở rộng `api/classroom`/`api/_classroom-online.ts` cho xem class-scoped attempt, lưu sửa theo câu, approve, AI regrade, manual regrade và xóa điểm hiện hành nhưng giữ attempt/history. Teacher access phải qua `readClassAccess`; co-owner chỉ được thao tác đúng quyền lớp.
- [ ] **Step 5: Nối màn hình review.** `TeacherGradingPage` nhận `classId`/`assignmentId` khi mở từ classroom, dùng projection class-scoped; route thi cá nhân cũ vẫn chạy. Giáo viên nhìn câu hỏi, bài làm, điểm auto/AI, sửa điểm và nhận xét từng câu/tổng, đánh dấu cần xem lại, duyệt và xem lịch sử. `QuestionResultsList`/`NhanXetMarkdown` hiển thị công thức chuẩn qua pipeline hiện tại.
- [ ] **Step 6: Nối student result.** Học sinh chỉ thấy nội dung câu hỏi/câu trả lời/feedback theo `allowReview` và `showResultWhen`; phân biệt đang chấm, chờ giáo viên, điểm tạm, điểm chính thức; không thấy rubric, answer key riêng tư hoặc teacher note.
- [ ] **Step 7: Chạy targeted tests, lint API/build và commit.** Commit `feat(grading): add online grade review lifecycle`.

## Task 5: Tạo hoạt động hỗ trợ có thể giao từ báo cáo

**Files:**

- Create: `src/lib/classroom/supportActivityModel.ts`
- Create: `src/lib/classroom/supportActivityModel.test.ts`
- Create: `src/components/features/classroom/SupportActivityModal.tsx`
- Modify: `src/components/features/classroom/ClassAssignmentReport.tsx`
- Modify: `src/lib/classroom/classReportModel.ts`
- Modify: `src/components/features/classroom/AssignmentPanel.tsx`
- Modify: `src/lib/classroom/teacherService.ts`
- Modify: `api/_classroom-teacher.ts`
- Modify: `api/classroom.ts`
- Modify: `src/lib/aiProviders.ts` only if an existing typed call needs a narrow adapter
- Modify: `src/services/gradingApi.ts` only if an existing API client is reused
- Create: `src/components/features/classroom/SupportActivityModal.test.tsx`

- [ ] **Step 1: Viết test đỏ cho quyết định sư phạm.** Fixture report phải chứng minh hoạt động được tạo từ evidence: tỷ lệ sai/câu, lỗi, chủ đề, nhóm học sinh, skill IDs. Assert sample ít không đưa ra kết luận chắc chắn; bài không có official evidence không được tự tạo khuyến nghị chính thức; AI draft không thể tự giao; target student ngoài lớp bị loại.
- [ ] **Step 2: Chạy test đỏ.** Dùng `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration" exec vitest run src/lib/classroom/supportActivityModel.test.ts src/components/features/classroom/SupportActivityModal.test.tsx`.
- [ ] **Step 3: Implement prompt/model thuần.** `buildSupportActivityDraftInput` biến một lỗi/chủ đề thành mục tiêu đo được, thời lượng, 2–6 câu theo mức hỗ trợ, đáp án, rubric, phiếu thoát, nhóm đích và tiêu chí đạt. Phần “Việc làm trên lớp” phải có thao tác cụ thể, thời lượng, vật liệu, cách phân nhóm, câu hỏi kiểm tra và ngưỡng chuyển bước; không chỉ ghi “củng cố thêm”.
- [ ] **Step 4: Nối AI draft có kiểm soát.** Dùng `callAI` hiện có với settings của giáo viên; parse/repair giới hạn; lỗi giữ bản nháp và hiển thị lỗi gốc. AI không được ghi Firestore, không giao bài, không ghi điểm official. Nếu không có API key, modal cho giáo viên sửa thủ công hoặc hủy với hướng dẫn rõ.
- [ ] **Step 5: Nối modal giáo viên.** Cho chọn lỗi/chủ đề/câu nguồn, xem evidence, chọn mục đích `practice`/`remediation`/`assignment`/`assessment`, sửa tiêu đề/mục tiêu/câu/điểm/rubric/nhận xét/đối tượng, xem trước student và teacher key. Nút `Duyệt và giao` bị khóa khi thiếu snapshot hoặc backup được giáo viên yêu cầu chưa `ready`.
- [ ] **Step 6: Persist canonical activity.** Server tạo exam version và assignment exam từ cùng snapshot, ghi `sourceReportId`, `skillIds`, `purpose`, `gradingPolicy`, `targetStudentIds`, `exportBundle`; không sửa report cũ, không sửa answer key của đề đã phát hành, không tự giao cho học sinh ngoài nhóm.
- [ ] **Step 7: Rà soát tiếng Việt giáo dục và công thức.** Chạy `vietnamese-education-copy` cho tiêu đề, mục tiêu, nhận xét, khuyến nghị và phiếu học sinh; kiểm tra xưng hô giáo viên–học sinh; chạy math display tests cho nội dung Toán. Commit `feat(classroom): create actionable support activities`.

## Task 6: Student activity timeline, practice và skill/mastery bridge

**Files:**

- Modify: `api/classroom.ts`
- Modify: `src/services/studentPortalApi.ts`
- Modify: `src/lib/classroom/portalViewModel.ts`
- Modify: `src/lib/classroom/profileMerge.ts`
- Modify: `src/lib/classroom/skillViewModel.ts`
- Modify: `src/lib/classroom/classProgressModel.ts`
- Modify: `src/pages/StudentPortalPage.tsx`
- Modify: `src/components/features/classroom/student/StudentPortalDashboard.tsx`
- Modify: `src/components/features/classroom/student/StudentAssignmentCard.tsx`
- Create: `src/lib/classroom/studentProgressModel.ts`
- Create: `src/lib/classroom/studentProgressModel.test.ts`
- Create: `api/__tests__/classroom-student-projection.test.ts`

- [ ] **Step 1: Viết test đỏ cho projection và mastery.** Assert dashboard hợp nhất upload/online/practice; mỗi hoạt động có số lượt làm, điểm official/provisional, trạng thái và bước tiếp theo; `studentSubmissions` không lộ teacher note/answer key; evidence practice có trọng số formative; cùng `submissionId`/`attemptId` không nhân đôi mastery.
- [ ] **Step 2: Chạy test đỏ.** Dùng `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration" exec vitest run src/lib/classroom/studentProgressModel.test.ts api/__tests__/classroom-student-projection.test.ts src/lib/classroom/portalViewModel.test.ts src/lib/classroom/profileMerge.test.ts`.
- [ ] **Step 3: Mở rộng server projection an toàn.** `studentAssignments` trả metadata hoạt động, online URL/assignment ID và export student URLs nếu có; `studentSubmissions` trả summary online đã lọc theo student link, không trả raw answer key/rubric/teacher history. Query có giới hạn và không làm tăng API ngoài cần thiết.
- [ ] **Step 4: Implement progress model.** Tính `skills vững`, `đang hình thành`, `cần hỗ trợ`, xu hướng, hoạt động đã làm, điểm chính thức, điểm luyện tập, mục tiêu hiện tại và next action. Bài chưa duyệt không tạo authoritative mastery; bài luyện không thay thế điểm chính thức; dữ liệu raw vẫn ở attempt/submission.
- [ ] **Step 5: Nối dashboard học sinh.** Bổ sung các khu vực `Cần làm`, `Luyện theo mục tiêu`, `Đang tiến bộ`, timeline và chi tiết mục tiêu; giữ các thao tác upload nhiều ảnh, bổ sung ảnh, mở file, xem feedback và retry. Trạng thái rỗng phải có hướng dẫn, không để blank space.
- [ ] **Step 6: Nối skill bridge.** Sau official evidence/teacher approval, gọi logic profile hiện có theo khóa submission/attempt; sửa/xóa/chấm lại phải rebuild đúng evidence, không hạ/xóa topic do bài khác. Kiểm tra student ID từ roster link, không suy ra từ ID adaptive tùy tiện.
- [ ] **Step 7: Chạy test classroom, lint/build và commit.** Commit `feat(student): unify activity progress and mastery`.

## Task 7: Ma trận lớp, báo cáo actionable và báo cáo phụ huynh an toàn

**Files:**

- Modify: `src/components/features/classroom/ClassStudentProgressMatrix.tsx`
- Modify: `src/components/features/classroom/ClassAssignmentReport.tsx`
- Modify: `src/components/features/classroom/StudentReport.tsx`
- Modify: `src/lib/classroom/classReportModel.ts`
- Create: `src/lib/classroom/parentSafeReport.ts`
- Create: `src/lib/classroom/parentSafeReport.test.ts`
- Modify: `src/components/features/classroom/ClassWorkspaceNav.tsx`
- Modify: `src/services/studentPortalApi.ts` only if a safe report projection is required
- Reuse: `api/export-lesson.ts`
- Create/modify: `src/components/features/classroom/StudentReport.test.tsx`

- [ ] **Step 1: Viết test đỏ cho ma trận và privacy.** Fixture nhiều attempt/lượt nộp của cùng học sinh phải cho đúng số lượt, bài thiếu, điểm official mới nhất và link vào chi tiết; report parent-safe chỉ lấy evidence đã duyệt, không có bạn học, teacher note, answer key hoặc raw answer.
- [ ] **Step 2: Chạy test đỏ.** Dùng `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration" exec vitest run src/lib/classroom/parentSafeReport.test.ts src/components/features/classroom/StudentReport.test.tsx src/components/features/classroom/ClassAssignmentReport.test.tsx src/lib/classroom/classReportModel.test.ts`.
- [ ] **Step 3: Nâng ma trận lớp.** Thêm bộ lọc học sinh/bài/mục đích/trạng thái, cột số lượt làm và điểm official, chỉ báo thiếu bài/chờ duyệt/cần hỗ trợ; click mở đúng assignment/attempt/review trong cùng tab hoặc modal, không mở tab ảnh lặp lại.
- [ ] **Step 4: Nâng report theo bài.** Giữ phân bố điểm, tỷ lệ đúng từng câu, lỗi/chủ đề; mỗi dòng câu có popup nội dung câu từ catalog/Exam/source OCR, fallback trung thực nếu không đọc được. Mỗi insight có `Dữ liệu ghi nhận → Việc cần làm → Tài liệu/hoạt động → Cách kiểm tra lại → Nút tạo hoạt động hỗ trợ`.
- [ ] **Step 5: Tạo báo cáo học sinh/parent-safe.** `parentSafeReport.ts` lọc theo `teacherApproved`/official policy, có điểm mạnh, điểm cần rèn, tiến bộ, hoạt động đã hoàn thành và bước tiếp theo. Cho giáo viên xem trước rồi xuất PDF/DOCX từ dữ liệu đã lọc; không triển khai parent login/link công khai trong task này.
- [ ] **Step 6: Rà soát copy và formula.** Dùng `vietnamese-education-copy` cho nhãn “đang hình thành/cần hỗ trợ”, nhận xét và khuyến nghị; không dùng kết luận xếp loại cho dữ liệu bài luyện. Chạy math display golden tests cho popup câu hỏi, bài làm và báo cáo.
- [ ] **Step 7: Chạy test/lint/build và commit.** Commit `feat(classroom): add actionable progress reports`.

## Task 8: Rules/index/data-safety audit và regression

**Files:**

- Modify: `firestore.rules` only where the server/projection contract requires it
- Modify: `tests/rules/lopHoc.rules.test.ts`
- Modify: `tests/rules/thiOnline.rules.test.ts`
- Modify: `firestore.indexes.json` only after query audit proves an index is required
- Modify: `tasks/todo.md`
- Create: `tasks/session_2026-08-28-student-learning-loop.md`

- [ ] **Step 1: Viết test đỏ cho security/data preservation.** Bao phủ student A đọc/ghi bài của student B, học sinh đọc answer key/rubric, giáo viên ngoài lớp đọc attempt, co-owner thao tác vượt quyền, anonymous public exam compatibility, direct query thiếu where/limit và canonical full-map writes không gây evaluator error.
- [ ] **Step 2: Chạy rules suite.** Prepend Java 21 vào PATH nếu cần rồi chạy `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration" run test:rules`; ghi rõ nếu môi trường thiếu Java/emulator, không biến test bị chặn thành PASS.
- [ ] **Step 3: Audit indexes trước khi sửa.** Grep toàn repo mọi `where(` + `orderBy(`, đối chiếu `firestore.indexes.json`; không nối cấu hình index mới hoặc deploy để Firestore hỏi xóa index nếu chưa có manifest đầy đủ.
- [ ] **Step 4: Kiểm tra dữ liệu additive.** Dùng fixture/export metadata để xác nhận mọi document legacy vẫn parse; kiểm tra app không gọi delete/update đối với bài nộp/file cũ trong rollout. Không chạy script migration production.
- [ ] **Step 5: Ghi handoff.** Cập nhật `tasks/todo.md` với commit, test command, phần đã verify/chưa verify; tạo session handoff mô tả route lớp, API actions, backup export, rollback bằng cách tắt feature mới và các giới hạn E2E.
- [ ] **Step 6: Commit tài liệu/gates.** Commit `docs(classroom): record learning loop safety gates`.

## Task 9: Verification và authenticated E2E trước khi gọi production-ready

**Files:**

- Modify: `tasks/todo.md`
- Modify: `tasks/session_2026-08-28-student-learning-loop.md`

- [ ] **Step 1: Chạy toàn bộ kiểm thử cục bộ.** Chạy lần lượt `npm --prefix "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration" run test`, `run lint`, `run lint:api`, `run build`; lưu output/commit vào handoff. Build xanh không thay thế lint/typecheck.
- [ ] **Step 2: Chạy representative export/render QA.** Kiểm tra PDF/DOCX student/teacher, công thức Toán, tiếng Việt, mobile layout, empty/loading/error states, popup câu hỏi và viewer ảnh trái/phải trong cùng một tab/modal.
- [ ] **Step 3: Chạy authenticated E2E trên lớp test do người dùng chỉ định.** Đăng nhập giáo viên và học sinh test, tạo bài support chưa ảnh hưởng 11 Columbus, mở dashboard học sinh, làm online, refresh/resume, nộp, chấm objective/AI/manual, sửa/duyệt, cập nhật report/profile, tải backup PDF/DOCX. E2E phải kiểm text/trạng thái người dùng nhìn thấy, không chỉ DOM count.
- [ ] **Step 4: Chạy regression legacy.** Mở assignment upload cũ có nhiều ảnh, bổ sung ảnh, xóa/chấm lại; mở exam public legacy; mở report lớp cũ; xác nhận dữ liệu, file URL, điểm, history và tên lớp/học sinh/bài không đổi. Không dùng 11 Columbus để tạo dữ liệu test hoặc xóa dữ liệu.
- [ ] **Step 5: Ghi kết luận evidence-based.** Chỉ gọi `production-ready` khi unit/component/API/rules/export/authenticated E2E và build/lint đều có output hiện tại. Nếu thiếu credential/E2E hoặc emulator thì ghi `chưa xác minh`, không suy đoán.
- [ ] **Step 6: Không push/deploy ở plan này.** Chỉ sau khi các gate đạt và người dùng ra lệnh riêng mới merge/push main; trước lúc đó giữ branch feature và không chạm production data.

## Definition of Done

- Hoạt động mới có thể tạo từ report, giáo viên sửa/duyệt, giao online, tải student PDF/DOCX và teacher key từ cùng snapshot/version/hash.
- Học sinh làm từ cổng lớp bằng identity server-confirmed; autosave/resume/retry, deadline và max attempts được enforce phía server.
- Upload ảnh/PDF/Word legacy vẫn hoạt động; lịch sử nhiều lần nộp và ảnh viewer không bị mất.
- Chấm objective/AI/manual phân biệt rõ provisional/official; giáo viên sửa điểm/nhận xét từng câu và tổng; mọi thay đổi có history.
- Dashboard học sinh có hoạt động, số lượt, điểm, mục tiêu, kỹ năng và next action; practice không tự thay thế điểm chính thức.
- Giáo viên có ma trận học sinh × bài, report theo bài actionable, popup nội dung câu hỏi và nút tạo hoạt động hỗ trợ; parent-safe export không lộ dữ liệu riêng tư.
- Không có destructive migration; record/file/grade production cũ giữ nguyên định danh; rules không có evaluator error; `npm run test`, `lint`, `lint:api`, `build` và E2E hiện tại đều có bằng chứng.
