# BÁO CÁO RÀ SOÁT CODE & LOGIC TOÀN BỘ CHỨC NĂNG — 2026-07-13

> Phạm vi: 12 tab trong `src/components/tabs/` + 10 hook trong `src/hooks/` + các util liên quan
> (guardrailUtils, contextBudget, App.tsx wiring). Rà soát tĩnh bằng đọc code, chưa chạy sửa gì.

---

## A. LỖI NGHIÊM TRỌNG (nên sửa sớm)

### A1. Lộ DeepSeek API key lên Firestore — `useAppState.ts:240`
`updateSettings` khi đồng bộ settings lên cloud chỉ loại 4 key:
```ts
const { geminiApiKey: _k1, claudeApiKey: _k2, openaiApiKey: _k3, grokApiKey: _k4, ...settingsToSync } = updated;
```
**Thiếu `deepseekApiKey`** → key DeepSeek của người dùng bị ghi lên document `userSettings` (đường ĐỌC ở dòng 109 strip đủ 5 key, chứng tỏ ý định là không lưu key nào). Fix: thêm `deepseekApiKey: _k5` vào destructure.

### A2. Tab Lớp học: dữ liệu KHÔNG được lưu — mất sạch khi reload — `ClassesTab.tsx`
`addClass`/`addStudent` chỉ `setData` vào state React. Trong khi:
- `buildLocalCache` (useAppState.ts:11) chỉ cache `settings` + `authorName`;
- `fetchCloudData` không fetch collection classes nào.

→ Tạo lớp, thêm học sinh xong bấm F5 là **mất toàn bộ**. Tính năng trông hoạt động nhưng thực chất là demo. Ngoài ra các nút "Giao bài", "Báo cáo", menu 3 chấm trên card lớp **không có onClick** (nút chết).

### A3. Chế độ Soạn hàng loạt: nút "Lưu tất cả" bị guardrail chặn — `CreatorTab.tsx:252`
```ts
withGuardrail(props.currentPlan.content, ..., props.generationMode === 'single' ? saveLessonPlan : saveBulkPlans)
```
Ở bulk mode, kết quả nằm trong `bulkResults`, còn `currentPlan.content` thường **rỗng** → `withGuardrail` (guardrailUtils.ts:10) chặn với thông báo "Nội dung rỗng" và `saveBulkPlans` **không bao giờ chạy** (trừ khi trước đó user vừa soạn đơn lẻ nên content còn sót — càng dễ gây nhầm). Fix: bulk mode kiểm tra `bulkResults.length` thay vì `currentPlan.content`.

### A4. Quản lý bài học (Adaptive): crash trắng trang nếu bài học không có knowledgeUnits — `AdaptiveLearningTab.tsx:492-500`
```ts
const firstUnit = lesson.knowledgeUnits[0];
... firstUnit.maxRemediationAttempts ... firstUnit.routes.find(...) || firstUnit.routes[1]
```
Không có guard nào. Bài mẫu luôn có unit, nhưng bài **tải từ Firestore** (`adaptiveLessons/<uid>`) có thể thiếu/rỗng `knowledgeUnits` → TypeError → cả tab chết. Fallback `routes[1]` cũng giả định luôn có ≥2 tuyến.

---

## B. LỖI LOGIC / RỦI RO THIẾT KẾ

### B1. `useAppState.deleteFile` + `updateTemplateFileSkeleton` (dòng 318-363): side-effect trong state updater
Gán `nextFiles` bên trong callback của `setData(prev => ...)` rồi đọc ngay sau đó để ghi Firestore. React **không đảm bảo** updater chạy đồng bộ (khi có update đang queue, concurrent rendering) → có lúc `nextFiles` còn `null` → xoá file/sửa skeleton chỉ đổi UI, **không sync cloud**, reload là quay lại như cũ. Nên tính `nextFiles` từ `data` hiện tại bên ngoài updater.

### B2. Guardrail tìm skeleton sai nguồn — `CreatorTab.tsx:252,262,263,265`
`props.lessonDocs.find(d => d.id === props.currentPlan.templateId)` — `templateId` là id của **template** (`data.templates`), còn `lessonDocs` là tài liệu tham khảo tải lên → điều kiện gần như không bao giờ khớp → mọi lần lưu/xuất, guardrail chạy **không có skeleton** (bỏ qua bước kiểm cấu trúc). Đúng nguồn phải là `data.templates.find(t => t.id === templateId)?.files...`.

### B3. Tab Thi online chỉ "biết" Gemini — `ExamsTab.tsx:191,265`
- `missingApiKey = !data.settings.geminiApiKey` — user dùng Claude/OpenAI vẫn bị banner "chưa nhập API Key".
- `parseMarkdownToOnlineExam(entry.content, data.settings.geminiApiKey || '')` — tạo đề từ lịch sử chỉ truyền key Gemini, không đi qua `aiProviders` đa nhà cung cấp như phần còn lại của app.

### B4. Adaptive: mỗi giáo viên chỉ có ĐÚNG 1 bài học phân hoá + lessonId ghi sai
- Doc id = `user.uid` (`getAdaptiveLessonDocId`) → lưu bài mới là **ghi đè** bài cũ (giới hạn MVP, nhưng UI không nói rõ).
- `handleSaveTeacherDraft` luôn ghi `lessonId: sampleAdaptiveLesson.id` bất kể bài đang lưu là bài gì (AdaptiveLearningTab.tsx:648) — lệch với `lesson.id` thật; mọi thứ key theo lessonId (vd vở ghi `dewey-notebook-v3-<lessonId>-<studentCode>`) có nguy cơ lẫn bài.
- Nút "Khôi phục mẫu" reset về bài mẫu **không hỏi xác nhận** — 1 click là mất bản đang chỉnh (nếu lỡ bấm Lưu tiếp là ghi đè luôn bản cloud).
- `void verifyFirebaseAdminHealth()` fire-and-forget: nếu throw sẽ thành unhandled promise rejection.

### B5. Bảng Kiểm tra: localStorage không có try/catch + nội dung phình to — `TestingTab.tsx:124-129,67`
- `localStorage.setItem(LAST_RESULT_KEY, testResult)` và `saveHistory` (20 entry, mỗi entry cả đề thi) **không bọc try/catch** → đề dài dễ ném `QuotaExceededError` ngay trong useEffect → crash tab.
- `extractTextFromFile` với .docx nhúng ảnh **base64** vào content; audit/shuffle nối toàn bộ file **không qua `truncateToContextBudget`** → prompt có thể cực lớn (tốn token/lỗi context), trong khi luồng Creator có truncate.
- Nhỏ: `clearResult` gọi `removeItem(LAST_RESULT_KEY)` 2 lần (dòng 159-160, copy-paste).

### B6. Chấm điểm AI (GradingTab) — chắc chắn nhất trong app, còn vài điểm nhỏ
- `createSessionSnapshot` sinh `createdAt: new Date()` **mỗi lần persist** (kể cả debounce khi đang chấm) → createdAt của phiên trôi liên tục, thứ tự lịch sử (orderBy createdAt) đổi chỗ.
- Mảng `updated` chụp `results` lúc bắt đầu chấm → user đổi tên học sinh giữa chừng sẽ bị ghi đè bởi các `setResults([...updated])` sau đó.
- AbortController chỉ dừng vòng lặp, không truyền signal vào `gradeSubmission` → request đang bay vẫn chạy hết.
- `handleCheckPlagiarism` không chặn khi danh sách kết quả rỗng.

### B7. Demo login tạo user giả — `useAuth.ts:45`
`handleDemoLogin` set mock user `uid: 'demo-agent-001'` không có Firebase token thật → **mọi thao tác ghi Firestore trong chế độ demo sẽ fail theo rules**, và phần lớn catch chỉ `console.error` → demo mode "lưu" gì cũng mất im lặng.

### B8. Hai hệ thống đếm usage trùng lặp
`useApiUsage.ts` (key `usage_<provider>_<model>`) và `useTokenTracker.ts` (key `api_usage_<provider>_<model>_<date>`) làm cùng một việc, cùng export `estimateTokenCount`. useTokenTracker tạo key mới mỗi ngày và **không tự dọn key cũ** → rác localStorage tích luỹ. Nên hợp nhất còn một.

### B9. Hook creator còn đường chết
`distributionFile` + nhánh bulk-chỉ-có-`bulkCommand` trong `useLessonCreator.handleCreateLesson` không thể kích hoạt từ UI (LessonControls chỉ set `selectedDistributionId`; nút bulk disabled khi chưa chọn) — dead code path, nên dọn hoặc nối lại UI upload PPCN trực tiếp.

---

## C. NÚT CHẾT / UI GÂY HIỂU LẦM

| Vị trí | Vấn đề |
|---|---|
| ChatTab (AI Tutor) | Nút "Lịch sử hội thoại", "Tùy chọn", "Đính kèm tệp" không có onClick. Không auto-scroll xuống tin mới. Lịch sử chat không lưu (đổi tab là mất). |
| ClassesTab | "Giao bài", "Báo cáo", menu 3 chấm — không có onClick. |
| AIToolsTab:163 | Nút "Cài đặt" ở banner thiếu API key chỉ show toast "Mở Hồ sơ và cài đặt..." chứ không mở Settings modal. |
| ExamsTab card đề thi | Thanh "tiến độ" = số câu của đề / tổng số câu mọi đề (vô nghĩa) + avatar học sinh 'G','H' hardcode giả — trang trí nhưng dễ hiểu lầm là dữ liệu thật. |
| CreatorTab | `SimulatedProgress` hiển thị % giả lập (không phản ánh tiến độ AI thật). |
| TemplatesTab | Xoá **file** trong bộ mẫu không có confirm (xoá cả bộ mẫu thì App.tsx có Swal confirm). |

## D. NHẸ / CODE SMELL

- `AIToolsTab.tsx:121` — `result.trim()` khi `callAI` có thể trả null → throw (đã có catch nhưng message khó hiểu).
- Chat/Creator/Upgrade render markdown AI với `rehypeRaw` → HTML thô từ AI được render thẳng (rủi ro XSS thấp nhưng có).
- `useSavedExams.estimateQuestionCount` — regex đếm cả heading đánh số → có thể sai số câu.
- `useLessonPlanActions.saveBulkPlans` — lỗi giữa chừng: một phần đã ghi Firestore nhưng state local không cập nhật phần đã ghi, chỉ toast chung "Lỗi lưu hàng loạt".
- `LessonUpgradeTab` — prop `isLoading`/`setIsLoading` nhận vào nhưng không dùng; `generateProduct` không check API key trước khi gọi.
- `exportToExcel` (Exams/Grading) — tên file lấy thẳng title có thể chứa ký tự cấm trong tên file Windows.
- `generateExamCode()` không kiểm tra trùng mã với đề đã có.

## E. ĐIỂM TỐT (giữ nguyên)

- GradingTab: retry + backoff cho 429, worker pool 3 luồng, debounce persist, AbortController, cleanup useEffect — bài bản nhất app.
- ExamsTab `AnswerEditModal`: sửa đáp án xong tự tính lại điểm mọi bài đã nộp — luồng đúng.
- useAppState: phân trang Firestore, strip API key khi ĐỌC settings, strip content file lớn trước khi lưu gradingSessions.
- TestingTab: lịch sử tự hết hạn 7 ngày, giới hạn 20 entry, upload có giới hạn 20MB, reset input sau upload.
- useExams/useSavedExams: normalize dữ liệu cũ (default fields) khi đọc.

---

## THỨ TỰ SỬA ĐỀ XUẤT

1. **A1** (1 dòng — lộ key) → 2. **A3** (bulk save bị chặn — 1 điều kiện) → 3. **A2** (persist classes lên Firestore hoặc gỡ/đánh dấu demo) → 4. **A4** (guard knowledgeUnits rỗng) → 5. B1, B2 (sync template + guardrail skeleton) → 6. B5 (try/catch localStorage + truncate) → còn lại theo dịp.
