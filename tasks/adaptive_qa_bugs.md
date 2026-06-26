# QA bài học phân hóa — Bug log (phiên 2026-06-26)

> Ghi nhận theo thứ tự ảnh user gửi. CHƯA sửa — chờ gửi đủ rồi mới fix.
> Bài test: `adaptive-1782374276838` (bài CŨ, tạo trước fix engage-sim).

## Đợt 1

### BUG-A1 — Màn Khởi động không có mô phỏng (Ảnh 1)
- Hiện tượng: màn "Nhiệm vụ mở đầu" (chuyện Monty Hall) không có hình/mô phỏng nào.
- Chẩn đoán sơ bộ: bài này tạo TRƯỚC fix nên chưa có `engage.interactiveSimHtml`. Nhưng theo yêu cầu, Khởi động BẮT BUỘC phải có hoạt động mô phỏng → cần đảm bảo bài mới luôn sinh được (và/hoặc có fallback), không để trống.
- File liên quan: `adaptiveFromLessonPlan.ts` (buildEngageSimulationPrompt, Step 2b), `adaptiveToDewey.ts` (buildEngageIllustration).

### BUG-A2 — Công thức LaTeX KHÔNG render trong mô phỏng (Ảnh 2, 3, 4) 🔴
- Hiện tượng: trong các mô phỏng hiện chữ thô `$P(A|B)$`, `$\frac{...}{...}$`, "Kích thước $P(A)$", "$P(A|B) = \frac{0.023}{0.106} = 0.219$"… không thành công thức đẹp.
- Chẩn đoán sơ bộ: mô phỏng do AI sinh nằm trong iframe `sandbox` (srcdoc) **KHÔNG nạp MathJax** → mọi `$...$`/`\frac` hiện raw. (MathJax chỉ có ở khung bài Dewey ngoài, không vào trong iframe mô phỏng.)
- Hướng (chưa làm): cấm sim dùng LaTeX → ép dùng Unicode/HTML thường (×, ², ⁿ, √, ∩, P(A|B), phân số bằng HTML), HOẶC nhúng MathJax vào srcdoc mô phỏng. Nghiêng phương án CẤM LaTeX trong sim (giống Gemini). Sửa: `buildUnitSimulationPrompt` + `buildEngageSimulationPrompt` + `sanitizeGeneratedSimulationHtml`.

### BUG-A3 — Gợi ý/đáp án ở bước "Thử và sửa" rỗng (Ảnh 5) 🔴
- Hiện tượng: bước câu hỏi dẫn dắt, bấm "Kiểm tra gợi ý" chỉ hiện "Tốt! Tiếp tục với câu hỏi tiếp theo." — không có gợi ý thật, và không thấy đáp án ở đâu.
- Chẩn đoán sơ bộ: trong `adaptiveToDewey.ts`, các `guidingQSteps` đặt `feedback` cứng = 'Tốt! Tiếp tục với câu hỏi tiếp theo.' và không có đáp án/gợi ý thật cho từng câu hỏi dẫn dắt.
- Hướng (chưa làm): mỗi câu hỏi dẫn dắt cần kèm gợi ý + đáp án mẫu thật (sinh từ AI), hiển thị sau khi học sinh trả lời.

## Đợt 2

### BUG-A4 — Một bước "Thử và sửa" nhồi NGUYÊN khối câu hỏi + gợi ý cóp lại câu hỏi (Ảnh 6, 7) 🔴
- Hiện tượng: 1 bước hiện 1 đoạn cực dài: "Câu hỏi gợi mở: ... Câu hỏi dẫn dắt: 1. Câu 1 — Quan sát... 2... 3... 4... 5... Quan sát/hình minh hoạ:... Nhiệm vụ thao tác:..." — gộp hết vào 1 câu hỏi. Gợi ý thì cóp gần như nguyên câu hỏi.
- Chẩn đoán sơ bộ: `adaptiveToDewey.ts` dùng `rc.explanation` (do `buildSocraticRouteExplanation` nối hook + 5 guiding_questions + visual_instruction + student_task + conclusion) làm prompt của bước `step-explain` → 1 bước khổng lồ. Lại trùng với các bước guiding riêng. Feedback echo lại nội dung.
- Hướng: mỗi câu hỏi dẫn dắt = 1 bước riêng, ngắn; không đổ nguyên khối explanation làm câu hỏi; gợi ý/đáp án phải khác câu hỏi.

### BUG-A5 — Vở Ghi Chép sai cấu trúc "ghi bảng" của giáo án (Ảnh 8) 🔴
- Hiện tượng: Vở ghi dump lời giải "Bước 1... Bước 2... Bước 4: Áp dụng công thức..." chứ không theo cấu trúc ghi bảng (công thức/định nghĩa/kết luận cốt lõi) user đã lập trình trước.
- Chẩn đoán sơ bộ: `formulaForNotebook = normalizeLatexText(rc.explanation,...).slice(0,220)` → cắt cụt đoạn giải thích, không phải công thức chốt. Cần lấy `knowledge_conclusion`/công thức cốt lõi, đúng khuôn ghi bảng.
- Cần xem lại: cấu trúc Vở ghi user mong muốn (ghi bảng theo giáo án) — hỏi/đối chiếu code cũ.

### BUG-A6 — Gợi ý/đáp án luyện tập là PLACEHOLDER (Ảnh 9) 🔴
- Hiện tượng: bấm "Kiểm tra gợi ý" hiện "Giáo viên rà soát đáp án theo giáo án nguồn." + "Từ khóa tham khảo: Đọc kỹ yêu cầu., Gạch chân dữ kiện quan trọng., Kiểm tra lại kết quả cuối cùng." — toàn placeholder.
- Chẩn đoán sơ bộ: `buildUnitFromJsonData` → `makeRouteContent` đặt `practiceTasks: [makePracticeTask(...)]` (placeholder cứng) ngay cả ở nhánh AI. → practice-task steps luôn là placeholder.
- Hướng: AI sinh practice task thật (đề + gợi ý + đáp án) hoặc bỏ bước practice nếu không có nội dung thật.

### BUG-A7 — Bấm "Hoàn thành hoạt động" bị ĐƠ, không sang phần tiếp (Ảnh 10) 🔴 CHẶN
- Hiện tượng: nhấn "Hoàn thành hoạt động" không phản hồi, không tự chuyển hoạt động tiếp theo.
- Chẩn đoán sơ bộ: lỗi JS trong script Dewey (`src/lib/dewey/adaptiveEngine.ts`) ở luồng `completeKnowledgeUnit`/`goNextActivity`/`unlockNextSocratic`. Cần debug console trong iframe khi bấm.
- Ảnh hưởng: chặn học sinh đi tiếp → nghiêm trọng.

## TRẠNG THÁI SỬA (đợt 1)
- [x] **A7** — formula → `data-notebook-formula` (template) + `completeKnowledgeUnit(unitId, button)` đọc từ data (engine). Verify: bấm thật trên localhost, panel hiện + chuyển màn OK, hết đơ.
- [x] **A2** — `injectSimRuntime` nhồi MathJax + MutationObserver vào mọi sim-frame (template + engage). Áp dụng cả bài cũ. Verify: srcdoc có MathJax+observer.
- [x] **A4** — bỏ bước `step-explain` nhồi blob; mỗi guiding question = 1 bước ngắn riêng.
- [x] **A3** — thêm `guiding_answers` (AI sinh) → mỗi câu dẫn dắt có đáp án/gợi ý THẬT (bài mới); bài cũ fallback explanation sạch.
- [x] **A6** — bỏ practice placeholder (`practiceTasks: []`); luyện tập thật ở Olympia/quick check.
- [x] **A5** — Vở ghi = `knowledgeConclusion` (bài mới) / lời giải ví dụ (bài cũ), bỏ ghi chú "Song ánh" cứng sai bài.
- [x] **A1** — mô phỏng khởi động sinh từ storyHook (đã làm phiên trước; bài mới có).
- ⏳ Cần user test lại trên bài MỚI để xác nhận A1/A3/A5 chất lượng (cần API; quota 429 có thể chậm).

## Bài học về CÁCH TEST (rút kinh nghiệm)
- Test phải ĐÓNG VAI học sinh học thật: bấm hết nút, đọc nội dung gợi ý/đáp án, kiểm điều hướng giữa các bước/hoạt động, xem Vở ghi — KHÔNG chỉ đếm DOM (sim-frame/gallery). Nhiều lỗi (A3–A7) chỉ lộ khi thao tác thật.

