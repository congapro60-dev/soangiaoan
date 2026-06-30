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

## Đợt 3 (test bài MỚI adaptive-1782659614777)

ĐÃ XÁC NHẬN FIX: A7 (hết đơ, đi tiếp được), A3/A6 (gợi ý/đáp án THẬT — "Bước 1: Gọi B…"), A4 (câu tách bước).

### BUG-B1 — Màn Khởi động có 2 BÀI TOÁN khác nhau (Ảnh 1) 🟠
- storyHook = trò chơi rút thẻ (3 đỏ 2 xanh); realityCheckMessage = xét nghiệm y khoa P(Bệnh|Dương tính). → 2 tình huống không liên quan trong 1 màn Khởi động.
- Gốc: blueprint sinh story_hook và reality_check_message độc lập → lệch nhau. Cần ép coherent (cùng 1 tình huống) hoặc gộp.

### BUG-B2 — Khu vực mô phỏng quá BÉ, phải kéo 2 chiều mới xem hết (Ảnh 1,2,3) 🟠
- Mô phỏng bị bọc trong ô nhỏ (lại nằm trong cột hẹp ở engage), nội dung tràn → phải scroll trong-ngoài.
- Hướng (user gợi ý): để mô phỏng rộng/ngoài cho rõ, hoặc bố trí container đủ lớn để nhìn hết; engage không nhồi sim vào cột hẹp.

### BUG-B3 — Công thức trong mô phỏng VẪN lỗi + LỘ mã script MathJax (Ảnh 2,3) 🔴
- Ảnh 2: sim hiện raw "$P(A \mid B)$", "$\Omega$".
- Ảnh 3: LỘ nguyên đoạn config MathJax tôi nhồi: "…]],},svg:['\(',\) {fontCache:'global'}};" hiện thành text.
- Gốc: injectSimRuntime (nhồi <script> MathJax vào srcdoc) KHÔNG hoạt động đúng — script bị render thành text / không typeset. Regression do tôi.
- Hướng đúng (Gemini): sim KHÔNG dùng LaTeX/MathJax — ép Unicode/HTML (P(A|B), ×, ², √, ∩, phân số HTML). BỎ injectSimRuntime. Sinh lại bài → sạch.

### BUG-B4 — Mô phỏng lằng nhằng, khó hiểu 🟡
- User: tham khảo SGK Kết nối tri thức 10/11/12, chọn mô phỏng phù hợp, dễ hiểu, đơn giản. Cân nhắc prompt sim.

### BUG-B5 — Các BƯỚC cần xuống dòng, mỗi bước 1 dòng (Ảnh 4) 🟠
- Gợi ý/đáp án & lời giải dạng "Bước 1: … Bước 2: … Bước 3: …" đang dồn 1 đoạn. Cần mỗi bước 1 dòng cho dễ đọc.

### BUG-B6 — Vở Ghi Chép thiếu cấu trúc (Ảnh 5) 🔴
- Hiện chỉ có "I. Mục tiêu bài học", thiếu II→V.
- Cấu trúc user yêu cầu: **I. Mục tiêu bài học → II. Nội dung (các đầu mục theo từng phần lý thuyết) → III. Luyện tập → IV. Vận dụng → V. Tổng kết.**
- Gốc: notebook chỉ addNote rời (mục tiêu + chốt từng mảnh) không có khung I–V.

## TRẠNG THÁI SỬA (đợt 3) — đã code + tsc sạch, chờ test trên production
- [x] **B1** — blueprint ép `reality_check_message` cùng tình huống `story_hook` (không 2 bài toán). *(cần bài MỚI)*
- [x] **B2** — engage sim full-width (gỡ khỏi cột 2); sim height 600; prompt ép responsive width 100%, không cuộn ngang. *(render-time + bài mới)*
- [x] **B3** — GỠ injectSimRuntime (đang lộ mã); prompt sim CẤM LaTeX → dùng Unicode/HTML. *(cần bài MỚI để hết $ thô)*
- [x] **B4** — prompt sim: đơn giản, bám SGK Kết nối tri thức, một thao tác chính. *(cần bài MỚI)*
- [x] **B5** — `formatStepLines` tách "Bước N:"/"Kết luận:" mỗi dòng + CSS `white-space:pre-line` cho feedback/theory/note. *(render-time)*
- [x] **B6** — Vở ghi 5 mục I–V (renderNotebook); `addNote(content, section)`; điền: I mục tiêu, II nội dung (theo từng mảnh + tiêu đề), III luyện tập (Olympia), IV vận dụng (extend), V tổng kết (finish); notebookKey v2. *(render-time)*

LƯU Ý: render-time (B5/B6/B2-layout) áp dụng cả bài cũ sau khi Vercel deploy; B1/B3/B4 (sinh nội dung) cần TẠO BÀI MỚI mới thấy.

## Đợt 4 (test bài mới 1782659614777 trên production)

XÁC NHẬN OK: B6 (vở ghi có mục I/II…), B1 (engage 1 tình huống rút sản phẩm), A7 (đi hết bài).

### BUG-C1 — Lời giải/Kết luận/Ghi bảng viết LIỀN 1 mạch, không xuống dòng (Ảnh 1,2) 🔴
- formatStepLines chỉ tách "Bước N:"/"Kết luận:" — nhưng đáp án thật dùng "Gọi…", "Ta có", "Sau khi…", "Áp dụng…" nên KHÔNG tách. Phải: (a) ép AI xuất mỗi bước 1 dòng (\n) ở guiding_answers/worked_example.solution/knowledge_conclusion; (b) mở rộng formatStepLines tách trước các cụm bước phổ biến.

### BUG-C2 — Hình TikZ vẫn lỗi đỏ "Error 400 Package tikz" (Ảnh 3) 🔴
- TikZ AI sinh có lỗi cú pháp LaTeX → Kroki trả lỗi (hiện SVG đỏ). Validate "có tikzpicture" chưa đủ. Phải: prefetch URL Kroki, kiểm body có lỗi → BỎ ảnh; hoặc bỏ hẳn TikZ.

### BUG-C3 — Olympia (Luyện tập): nhiều vấn đề (Ảnh 4,5) 🔴
- Số câu/gói sai: phải mỗi gói 3–4 câu (theo quy ước).
- Giao diện xấu: 3 cột rối; phải để HÀNG NGANG các gói, bấm gói nào MỚI hiện câu của gói đó.
- Khóa gói: hiện mặc định gói 1, khóa 2&3 — phải cho HỌC SINH TỰ CHỌN gói bất kỳ (không khóa).
- Công thức trong câu hỏi gói bị lỗi (cần kiểm typeset).

## TRẠNG THÁI SỬA (đợt 4) — code + tsc sạch, chờ test production
- [x] **C1** — `formatStepLines` mở rộng (tách trước Gọi/Ta có/Sau khi/Áp dụng/Suy ra/Do đó/Vậy/Kết luận…) + ép AI xuất mỗi bước 1 dòng (\n) trong guiding_answers/solution/knowledge_conclusion. Verify: 1 đoạn → 5 dòng.
- [x] **C2** — `loadDeweyAssets` fetch Kroki, kiểm SVG hợp lệ (loại body báo lỗi/400) → nhúng SVG inline; ảnh lỗi bị BỎ thay vì hiện đỏ.
- [x] **C3** — Olympia: chia đều 3–4 câu/gói (sort độ khó); giao diện HÀNG NGANG (oly-tabs) bấm gói mới hiện câu; BỎ khóa (chọn gói bất kỳ); nút "Sang vận dụng" luôn hiện. (Số câu/gói tuỳ số quick check: 5–6 mảnh ×2 ≈ 10–12 câu → 4/3/3.)
- LƯU Ý: C1/C2 và chất lượng Olympia (nội dung) cần bài MỚI; layout Olympia + vở ghi + xuống dòng là render-time (bài cũ thấy sau deploy).

## Đợt 5 (test bài mới 1782659614777 trên production)

### BUG-D1 — Luyện tập: chọn SAI 1 lần là LÒI lời giải đầy đủ luôn (Ảnh 1) 🔴
- Hiện tượng: bấm sai 1 câu Olympia → feedback "Mở thêm một tầng hỗ trợ rồi thử lại" NHƯNG ngay dưới hiện nguyên bài chữa (P(T1)=5/8 … P(T1Đ2)=15/56). Logic "4 tầng gợi ý" (sai mới mở dần, chưa lộ đáp án) mất.
- Chẩn đoán (đã xác minh code):
  - Engine `adaptiveEngine.ts:351` VẪN mở từng tầng đúng: sai 1→`.theory-box`, 2→`.hint1-box`, 3→`.hint2-box`, 4→`.hint3-box`+`.solution-box`. Hạ tầng đúng.
  - NHƯNG `toAdaptiveQ` (`adaptiveToDewey.ts:83-87`) nhồi CẢ 5 tầng = cùng `q.explanation` (lời giải đầy đủ) → mở tầng nào cũng ra full đáp án.
  - Gốc thượng nguồn: `AdaptiveQuestion`/`QuestionJson` chỉ có 1 trường `explanation`; pipeline AI CHƯA bao giờ sinh "4 tầng hỗ trợ" (dù spec giáo án `useLessonCreator.ts:470` yêu cầu). `sampleContent.ts:257` chứng minh model Dewey hỗ trợ tầng riêng biệt.
- Quyết định (user chọn "Cả hai"): AI sinh 3 gợi ý tiến dần cho bài mới + tự TÁCH lời giải làm fallback cho bài cũ/khi thiếu. Tầng đầu (theory) tuyệt đối KHÔNG lộ đáp số.

### BUG-D2 — Mục lục KHÓA tuần tự, phải làm hết Luyện tập mới mở Vận dụng/Tổng kết (Ảnh 2) 🔴
- Hiện tượng: ở Luyện tập, "Vận dụng thực tế" và "Tổng kết" bị xám/khóa; phải hoàn thành cả 3 gói Olympia mới mở.
- Yêu cầu user: tới được Luyện tập = mở khóa toàn bộ mục lục; hoặc mở khóa hết TỪ ĐẦU cho mượt — KHÔNG khóa gì cả.
- Chẩn đoán: `template.ts:39-48` đặt `locked:true` cho units/olympia/extend/summary; `navTo` (`adaptiveEngine.ts:80`) chặn item `locked`; CSS `.toc-item.locked{pointer-events:none}`.
- Hướng: bỏ khóa toàn bộ TOC từ đầu (render-time, áp dụng mọi bài).

## TRẠNG THÁI SỬA (đợt 5) — code + tsc sạch, verify script PASS, chờ test production
- [x] **D1** — `AdaptiveQuestion.hints?` + `QuestionJson.hints?` (AI sinh 3 gợi ý tiến dần, rule 6b trong prompt). `toAdaptiveQ` map 4 tầng: ưu tiên hints AI, thiếu thì `synthesizeHintTiers` tách lời giải theo bước; tầng 1 (theory) LUÔN là nhắc lý thuyết chung, KHÔNG lộ đáp số; solution chỉ hiện ở sai lần 4. Verify (script render): câu không-hints → 4 tầng phân biệt, tầng 1 không chứa đáp số; câu có-hints → 3 hints AI map đúng theory/hint1/hint2.
- [x] **D2** — `template.ts:38-49` mở khóa toàn bộ TOC từ đầu (`locked:false` cho mọi mục). Verify: `toc-item locked` = 0. Render-time → áp dụng cả bài cũ sau deploy.
- LƯU Ý: D1 fallback (tự tách) áp dụng NGAY cho mọi bài (kể cả bài cũ) sau deploy — sai 1 lần hết lòi bài chữa. Hints AI chất lượng cao chỉ có ở BÀI MỚI (cần quota). D2 render-time, bài cũ thấy sau deploy.

### BUG-D3 — Luyện tập & Vận dụng TOÀN CHỮ, không hình minh hoạ (nhàm chán)
- Hiện tượng: vào Luyện tập (Olympia) chỉ thấy câu hỏi; Vận dụng chỉ thấy chữ — không hình/mô phỏng nào.
- Yêu cầu user: bổ sung hình minh hoạ "tự vẽ" phù hợp vào MỘT SỐ câu luyện tập; Vận dụng có mô phỏng thì tạo, không thì cho ảnh minh hoạ — đừng để toàn chữ.
- Chẩn đoán: `renderAdaptiveQuestion` (template) không có slot hình; `renderExtend` chỉ render text; `DeweyAdaptiveQuestion`/`DeweyExtendStory` thiếu field hình. Pipeline đã có sẵn hình "tự vẽ" theo mảnh (`tikzSvgByUnitId` — TikZ SVG đã xác thực) + mô phỏng (`simulationHtmlByUnitId`) nhưng CHỈ dùng ở màn học mảnh, không tái dùng cho Luyện tập/Vận dụng.
- Quyết định (user chọn "Cả hai"): render-time TÁI DÙNG hình/mô phỏng các mảnh vào Olympia + Vận dụng (thấy ngay, mọi bài); bài MỚI vẫn sinh học liệu trực quan riêng theo mảnh (rule 17) nên pool phong phú.

## TRẠNG THÁI SỬA (đợt 6) — code + tsc sạch, verify script PASS, chờ test production
- [x] **D3** — `DeweyAdaptiveQuestion.illustrationHtml?` + `DeweyExtendStory.illustrationHtml?`; template render `.question-figure`/`.extend-figure` (CSS htmlShell). `adaptiveToDewey`: gắn hình TikZ của mỗi mảnh vào CÂU ĐẦU thuộc mảnh đó ở Olympia (chỉ "một số câu", không trùng); Vận dụng ưu tiên iframe mô phỏng của một mảnh, không có thì hình TikZ. Degrade an toàn khi không có asset. Prompt rule 17 thêm lưu ý học liệu được tái dùng ở Luyện tập/Vận dụng nên phải đúng phân môn. Verify (render): 2/6 câu có hình (1/mảnh-có-hình); Vận dụng dùng sim; không asset → không lỗi/không hình.
- LƯU Ý: render-time → áp dụng cả bài CŨ sau deploy (miễn bài có TikZ/sim hợp lệ). Bài xác suất ít hình hình học → có thể chỉ vài câu có hình; bài MỚI sinh đủ học liệu mỗi mảnh sẽ phong phú hơn.

### BUG-D4 — Học xong sớm/còn dư giờ KHÔNG có hoạt động bổ sung (tính năng cũ chỉ là khung rỗng)
- Yêu cầu user (logic cũ): xong sớm → 1 bài nâng cao + 1 bài vận dụng thực tế + 1 vấn đề thực tế để đọc + link YouTube liên quan.
- Chẩn đoán (đã xác minh): tính năng gần như KHÔNG chạy:
  1. Hộp `time-filler-options` CHỈ hiện khi đồng hồ tổng về 00:00 (`goSummaryForTimeout`) — đúng kịch bản "xong sớm còn dư giờ" thì KHÔNG bao giờ hiện.
  2. Nút `data-filler-type` (`remaining_olympia`/`extension_story`) KHÔNG có handler click → bấm vô tác dụng.
  3. Nội dung chỉ là 2 nhãn placeholder (`adaptiveToDewey.ts`), không phải 4 thứ user nhớ.
  4. Không có nguồn dữ liệu: `enrichmentTasks=[]` cho bài AI; KHÔNG có field YouTube/video; `extension_story` không trỏ tới gì.
- Kết luận: logic chưa từng được nối hoàn chỉnh (khung UI + nhãn mẫu). Quyết định user: nội dung "Cả hai" (tái dùng + AI sinh); hiển thị "Chỉ khi bấm 'Hoàn tất sớm'".

## TRẠNG THÁI SỬA (đợt 7) — code + tsc sạch, verify script PASS, chờ test production
- [x] **D4** — Bỏ hộp `time-filler-options` chết. Thêm `DeweySummary.bonusChallenge` (4 phần) + nút "Mình còn thời gian — Thử thách thêm" → `revealBonus()` (engine) hiện khối ẩn ở màn Tổng kết. `adaptiveToDewey` dựng bonus: ưu tiên `lesson.bonusChallenge` (AI), thiếu thì TÁI DÙNG — bài nâng cao = ví dụ mẫu khó nhất, vận dụng = extend/exit-ticket, đọc = storyHook, video = link TÌM KIẾM YouTube theo tên bài (an toàn, không bịa link chết). AI path: `bonus_challenge` trong `buildAssessmentsPrompt` + `AssessmentsJson`/`mapBonusChallenge`/`AdaptiveLesson.bonusChallenge` (pipeline). Portal iframe thêm `allow-popups` để mở được link YouTube. Verify: tái dùng đúng nguồn; AI ưu tiên; render đủ nút/khối/4 mục/link; engine có revealBonus.
- LƯU Ý: tái dùng → THẤY NGAY mọi bài sau deploy (bài nâng cao lấy ví dụ mẫu khó nhất). Nội dung AI riêng (4 phần đúng bài) chỉ ở BÀI MỚI (cần quota). Link YouTube là link tìm kiếm (mở tab kết quả), không phải video cụ thể.

## Đợt 8 (test bài MỚI "Ba đường Conic" — adaptive-1782757543729) — CHƯA SỬA, chờ user test nốt

> Ghi chú: bài conic ĐÃ tạo được (lỗi "Có lỗi xảy ra khi sinh giáo án" lúc đầu là tạm thời, đường sinh markdown `runMultiAgentPipeline` — nhiều khả năng quota 429, KHÔNG phải code adaptive).

### BUG-E1 — TikZ mảnh Elip lỗi "Error 400: Undefined control sequence" hiện ĐỎ trong builder (Ảnh 1) 🔴
- Hiện tượng: ở "Quản lý bài học" → panel "Hình ảnh & mô phỏng đã sinh (xem trước khi xuất bản)", mảnh "Định nghĩa…Elip" hiện khối đỏ: `Error 400: ! Undefined control sequence. l.6 \begin{tikzpicture}[scale=0.7]\n (exit code 1)`. (Mô phỏng HTML/Canvas của mảnh thì render TỐT.)
- Chẩn đoán sơ bộ: chuỗi `\n` LITERAL nằm trong tikz_code → LaTeX coi `\n` là lệnh không xác định → Kroki 400. Gốc: AI double-escape newline (`\\n` → sau JSON.parse thành `\n` literal). `buildTikzKrokiUrl` (đợt 1.0d) xử lý `\\begin{tikzpicture}` double-escape nhưng CHƯA xử lý `\n`/`\\n` literal. NGOÀI RA: panel builder hiển thị thẳng lỗi Kroki (khác cổng học sinh — đợt 4 C2 đã lọc SVG lỗi qua `fetchValidTikzSvg`; builder preview chưa lọc tương tự).
- Hướng (chưa làm): (a) `buildTikzKrokiUrl`/sanitizer gỡ `\n` literal (đổi thành newline thật hoặc bỏ); (b) builder preview lọc lỗi như cổng học sinh (không hiện ảnh đỏ).

### BUG-E2 — TikZ mảnh Hyperbol lỗi y hệt E1 (Ảnh 2) 🔴
- Hiện tượng: mảnh "Xác định tiêu điểm…Hyperbol" hiện `Error 400: ! Undefined control sequence. l.6 \begin{tikzpicture}[scale=0.6]\n (exit code 1)`. (Mô phỏng HTML render tốt.)
- CÙNG GỐC với E1 (tikz_code có `\n` literal + builder không lọc). Sửa chung E1.

### BUG-E3 — Công thức ở câu hỏi Test đầu giờ bị lỗi (Ảnh 3) 🔴
- Hiện tượng: Test đầu giờ, Câu 5 (Elip), đáp án B hiện RAW: `M\left(± 25/12;\frac{√119}{4}\right)$` — LaTeX không typeset (thấy `\left`,`\frac`,`\right`). Đáp án A/C/D render đẹp.
- Chẩn đoán sơ bộ: option B thiếu dấu `$` MỞ (chỉ có `$` đóng) → MathJax không xử lý → hiện raw. AI sinh delimiter lệch ở 1 phương án; `normalizeLatexText`/`cleanOptions` chưa tự cân đối/sửa `$` hoặc bọc `\left…\right`.
- Hướng (chưa làm): sanitizer cân đối `$`, tự bọc cụm `\left/\frac/\sqrt` lẻ; hoặc ép AI bọc đủ `$…$` mọi phương án.

### BUG-E4 — Công thức ở phần các mảnh kiến thức bị lỗi (^2 hiện thô) (Ảnh 4, 5) 🔴
- Hiện tượng: trong mảnh ("Thử và sửa" Câu 3 + Kết luận + Ghi vào vở): `Mối quan hệ … a²=b^2+c² (hay c²=a^2-b²)` — lẫn lộn: `a²` render được nhưng `b^2`,`a^2` hiện thô caret `^2`. Notebook/Ghi vở cũng `a^2 =b^2 +c²`.
- Chẩn đoán sơ bộ: AI xuất `b^2`,`a^2` dạng plain caret (không bọc `$…$`); `normalizeLatexText` đổi được vài cụm sang unicode (a²) nhưng bỏ sót `b^2`/`a^2` sau dấu `=`/khoảng trắng → không đồng nhất, không vào MathJax.
- Hướng (chưa làm): mở rộng `normalizeLatexText` chuyển `[a-z]\^2` → unicode ² (hoặc bọc `$`) đồng nhất; xét cả `^{...}`.

### BUG-E5 — Ghi bảng mục II: từng nội dung kiến thức phải đánh SỐ THỨ TỰ 1. 2. 3. (Ảnh 5) 🔴
- Hiện tượng: trong Vở ghi mục "II. Nội dung", các mảnh kiến thức KHÔNG được đánh số tuần tự (1., 2., 3.) cho từng mảnh. (Số 1–4 đang thấy là numbering NỘI BỘ trong 1 conclusion của mảnh, không phải số thứ tự từng mảnh.)
- Yêu cầu user (logic ghi bảng): mục II liệt kê từng nội dung kiến thức (mỗi mảnh) đánh dấu **1.** rồi **2.** rồi **3.** … — đây là correction LẶP LẠI về logic viết bảng (xem [[ghi-bang-logic]]).
- Chẩn đoán sơ bộ: engine `addNote(content,'noidung')` (renderNotebook mục II) append rời, không prefix số thứ tự per-mảnh. Cần đánh số tăng dần mỗi khi thêm 1 mảnh vào mục II.
- Hướng (chưa làm): khi thêm note mục II cho mỗi mảnh → tự prefix `N.` tăng dần (đếm số mảnh đã thêm).

## TRẠNG THÁI SỬA (đợt 8)
- [ ] **E1+E2** — TikZ `\n` literal → Kroki 400; gỡ `\n` literal trong `buildTikzKrokiUrl`/sanitizer + builder preview lọc lỗi như cổng học sinh.
- [ ] **E3** — cân đối `$` / bọc `\left…\right` lẻ ở phương án test đầu giờ.
- [ ] **E4** — `normalizeLatexText` chuyển `x^2`/`x^{...}` đồng nhất (unicode hoặc bọc `$`).
- [ ] **E5** — Vở ghi mục II đánh số thứ tự 1. 2. 3. cho từng mảnh.

## Đợt 8 (tiếp) — lỗi + REDESIGN phần Luyện tập (conic) — CHƯA SỬA, chờ user chốt

### BUG-E6 — Luyện tập CHẤM SAI đáp án (mặc định đáp án A) (Ảnh 1) 🔴 NGHIÊM TRỌNG
- Hiện tượng: câu "phương trình nào là chính tắc của Elip?" chọn A (`x²/9 − y²/4 = 1`, là HYPERBOL) lại báo "Chính xác! +10 điểm". Đáp án đúng phải là B/C.
- Chẩn đoán (đã xác minh code): `cleanOptions` (`adaptiveToDewey.ts:69-72`) chuẩn hoá phương án qua `normalizeLatexText`, nhưng `toAdaptiveQ` tính `cidx = Math.max(opts.indexOf(q.correctAnswer ?? ''), 0)` so phương án ĐÃ chuẩn hoá với `correctAnswer` THÔ → với phương án chứa công thức (conic) normalize đổi chuỗi → `indexOf` = −1 → `cidx` = 0 → **mặc định A**. Cùng lỗi ở pretest (`adaptiveLessonToDeweyContent`, correctIndex). Lỗi CÓ TRƯỚC đợt 5.
- Hướng (chưa làm): so khớp `correctAnswer` ĐÃ chuẩn hoá với `opts` chuẩn hoá (normalize cả hai vế); nếu vẫn không khớp thì giữ index gốc từ JSON (`qJson.correct`) thay vì default 0.

### BUG-E7 — Phương án trắc nghiệm còn RAW markdown/LaTeX (`**A.**`, `\frac…`) (Ảnh 2, 3) 🔴
- Hiện tượng: ảnh 2 phương án hiện `- **A.** 10`, `- **B.** 5` (markdown thô + gạch đầu dòng). Ảnh 3 (gói 30đ) phương án `\frac{x^2}{16} - \frac{y^2}{9} = 1` không typeset.
- Chẩn đoán: `cleanOptions` chỉ `normalizeLatexText`, KHÔNG bóc markdown (`**`, `- `, tiền tố `A.`) và không bọc `$…$` cho cụm LaTeX lẻ → MathJax bỏ qua.
- Hướng (chưa làm): sanitizer phương án: bóc `**`, `- `, tiền tố `A./B.`; bọc `$` cho `\frac/\sqrt/^`; đồng bộ với E3/E4.

### BUG-E8 — Vận dụng: mô phỏng KHÔNG khớp đề (đề Parabol nhưng sim là Elip) (Ảnh 4) 🟠
- Hiện tượng: câu Vận dụng "Cho Parabol (P): y²=2px…" nhưng mô phỏng nhúng bên dưới là "Định nghĩa & Phương trình Elip" → lệch nội dung.
- Gốc: đợt 6 (D3) cho màn Vận dụng TÁI DÙNG mô phỏng của MỘT mảnh bất kỳ (mảnh đầu có sim) → không khớp đề Vận dụng. Tái dùng mù quáng.
- Hướng (chưa làm): Vận dụng chỉ nhúng mô phỏng/hình KHỚP đề; không khớp thì thà bỏ (theo E10).

### E9 — REDESIGN phần Luyện tập (user quy ước lại) 📐 (spec, chưa làm)
- **Bỏ tên "Olympia"** — chỉ gọi "Luyện tập".
- **Gói 1 — "Nhận biết" (we must)** (thay "10 điểm"): **4 câu trắc nghiệm 4 phương án**, mỗi câu **5đ** nếu đúng (max 20).
- **Gói 2 — "Thông hiểu" (we should)** (thay "20 điểm"): **2 câu Đúng/Sai, mỗi câu 4 ý**, mỗi câu **10đ**. Chấm từng phần: **1 ý đúng=1đ, 2 ý=2.5đ, 3 ý=5đ, 4 ý=10đ** (max 20).
- **Gói 3 — "Vận dụng" (we can)** (thay "30 điểm"): **2 câu trả lời ngắn (5đ/câu)** + **1 câu tự luận (10đ)** có 2–4 ý (AI tự chia điểm) (max 20).
- **Hỗ trợ theo loại câu (đã chốt với user):**
  - **Trắc nghiệm 4 phương án (Nhận biết) + Trả lời ngắn (Vận dụng): 4 tầng**, mở dần khi sai tới khi điền đúng. **Đúng ở lần 1/2/3 → hiện LUÔN lời giải chi tiết rồi mới sang câu tiếp.**
  - **Đúng/Sai (Thông hiểu): KHÔNG 4 tầng** (mỗi ý chỉ 2 lựa chọn). Mỗi ý có nút **"hiện gợi ý"** riêng (cho HS chưa biết làm). Nộp → **hiện đáp án từng ý LUÔN** (dù chọn đúng hay sai) + chấm từng phần (1/2.5/5/10).
  - **Tự luận (Vận dụng): 2 tầng**: tầng 1 ấn hiện **gợi ý từng ý**; ấn tiếp (tầng 2) hiện **đáp án chi tiết để HS TỰ CHẤM** (không AI chấm text tự do).
- **Thanh điểm GIỮ NGUYÊN** (đã chốt): mỗi gói max 20, tổng 60 — như hiện tại.
- Hiện trạng code: `DeweyAdaptiveQuestion` đã có `true_false_group` + `short_answer`; engine có chấm true_false (chưa chấm TỪNG PHẦN 1/2.5/5/10) và short_answer. CẦN LÀM: (a) pipeline thôi ép tất cả về `multiple_choice` — sinh đúng loại theo gói; (b) thêm loại "tự luận" (essay 2–4 ý, hiển thị + tự chấm, hỗ trợ 2 tầng); (c) chấm từng phần Đúng/Sai (1/2.5/5/10); (d) 4 tầng hỗ trợ cho cả true_false/short_answer; (e) "đúng cũng hiện lời giải chi tiết trước khi sang câu".

### E10 — Mô phỏng/hình minh hoạ: ĐƠN GIẢN, HẤP DẪN, KHỚP đề (định hướng) 🎨 (research, chưa làm)
- User: "tạo rất nhiều mô phỏng phức tạp nhưng KHÔNG hay/không hấp dẫn. Bài conic này chỉ mô phỏng ở phần KHỞI ĐỘNG là được." Yêu cầu: mô phỏng/hình cần **đơn giản, hấp dẫn, PHÙ HỢP đề/nội dung**.
- Hệ quả: xem lại prompt sinh mô phỏng từng mảnh (đang phức tạp/lệch); cân nhắc giảm sim phức tạp ở mảnh, ưu tiên 1 mô phỏng khởi động tốt + hình minh hoạ đơn giản đúng nội dung. Liên quan E8 (tái dùng sim lệch đề).

## TRẠNG THÁI SỬA (đợt 8)
- [x] **E6** (chấm sai → mặc định A) — `resolveCorrectIndex` (batch 1, `92f3780`).
- [x] **E7** (option raw markdown) — `stripInlineMarkdown` (batch 1).
- [x] **E3** (option thiếu `$` mở) — `ensureMathDelimiters` (batch 1).
- [x] **E4** (`^2` thô) — `convertBareCarets` → unicode (batch 1).
- [x] **E5** (vở ghi II đánh số 1.2.3.) — `addNote(...,numbered)` (batch 2, `469d651`).
- [x] **E1+E2** (TikZ `\n` literal + builder ảnh đỏ) — gỡ `\n` literal + builder nhúng SVG đã xác thực (batch 2).
- [x] **E8** (sim Vận dụng lệch đề) — chỉ nhúng sim/hình của mảnh có TOKEN ĐẶC TRƯNG khớp đề vận dụng (vd "parabol"); không khớp → không nhúng. Verify: đề Parabol → sim Parabol (không phải Elip); đề chung → không nhúng.
- [ ] **E9** (redesign Luyện tập: 3 gói Nhận biết/Thông hiểu/Vận dụng + chấm từng phần + tự luận 2 tầng + 4 tầng các loại + đúng cũng hiện lời giải) — chưa (lớn).
- [ ] **E10** (mô phỏng đơn giản/khớp đề) — chưa.

## Bài học về CÁCH TEST (rút kinh nghiệm)
- Test phải ĐÓNG VAI học sinh học thật: bấm hết nút, đọc nội dung gợi ý/đáp án, kiểm điều hướng giữa các bước/hoạt động, xem Vở ghi — KHÔNG chỉ đếm DOM (sim-frame/gallery). Nhiều lỗi (A3–A7) chỉ lộ khi thao tác thật.

