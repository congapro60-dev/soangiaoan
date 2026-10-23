# Lessons Learned

> Updated after every correction. Reviewed at session start.

## 2026-10-23 (tối) - Test ViLao gemini-3.8-flash chấm bài: subscribe, A/B, hoá đơn

- **Regex C7 lại fail lần 2 dù lesson cũ có báo trước**: label "Câu 7" chứa 'â' mà pattern `C[aả]u 7` không ăn. Quy tắc cứng: KHÔNG copy regex C7 vào runner mới — lấy `qs[6]` khi đủ 19 dòng đúng thứ tự (sanity check /Phần I/ + không II/III). Thấy `cau7=missing` trong rec thì luôn verify lại từ rows trước khi kết luận.
- **'Phần I' là substring của 'Phần II'/'Phần III'** — cộng điểm theo phần bắt buộc dùng regex ranh giới: P1 `/Phần I(?!I)/`, P2 `/Phần II(?!I)/`, P3 `/Phần III/`; `.includes('Phần I')` sai luôn.
- **Subscribe model ViLao qua UI fail im lặng từ listing thứ 2 trở đi** (toast "Đã đăng ký" nhưng server không lưu; UI có checkbox xác nhận phí tối thiểu nhưng vẫn không persist). Endpoint đúng: `POST /api/v1/user/llm/keys/{keyId}/subscribe` body `{provider_id, model_id}` → 201; `/subscriptions` → 404. Verify bằng `GET https://api.vilao.ai/v1/models` với Bearer key — đây là nguồn sự thật.
- **PS 5.1 `-Encoding UTF8` ghi BOM → curl `-d @file` nhận JSON hỏng**, server báo "Model field is required" gây hiểu nhầm. Chạy HTTP bằng script node .mjs (global fetch, không BOM); tránh curl body JSON trong PowerShell.
- **Gateway ViLao KHÔNG ép JSON như Google native** dù nhận `response_format: json_object`: model vẫn bọc ```json fence, dùng trailing comma làm JSON invalid (1/3 run -high), tự chèn thêm dòng "Tổng kết" vào questionScores (1/4 run chib → sum 14,75). Mọi lane qua gateway cần parser khoan dung (strip fence + bỏ trailing comma) + guard đúng 19 dòng, giữ gate score=Σ + C7=0.
- **min_price_per_request là floor thật trên hoá đơn**: lane -high bị tính 15₫/req dù token thực 8,3₫ (có cảnh báo UI "dù request ít token vẫn tính ít nhất 15₫"); chib floor 3₫, bài chấm thật 3,95–5,84₫. Chọn lane phải xét cả floor, không chỉ đơn giá.
- **Usage API ViLao trả `data` là MẢNG TRẦN** (`{data: [...]}`), không phải `{data: {items: []}}` — parse sai shape sẽ tưởng không có bản ghi. 502 upstream không bị tính tiền (total_cost=0), retry thoải mái.
- Đã tổng hợp lại toàn bộ raw bằng `reanalyze.mjs` (parser khoan dung) — file này tái sử dụng được cho các lane gateway sau này.

### Đợt 2 (đêm 23/10) — batch 5 bài × 2 runs, nén ảnh, probe Google

- **Field `score` của model trôi khỏi Σ(questionScores) ở MỌI lane và MỌI hãng** (ViLao chib 4/4 run đợt 1, 7/10 đợt 2; `-high` 2/2; Google direct 1/1 — chỉ thinkingON có 1 run đúng). Chấp nhận như đặc tính model, không phải lỗi lane: code production tính điểm hiển thị = Σdòng, coi field score chỉ là tham khảo. Gate giữ nguyên.
- **Nén ảnh về 1280px KHÔNG giảm token đầu vào** (8230 vs ~8247 với 3 trang): Gemini tile hoá 768px và tự downscale ảnh lớn trước khi đếm token. Bỏ hướng tiết kiệm chi phí bằng resize phía client; nén chỉ giúp upload nhanh.
- **Flex processing KHÔNG có trên Gemini Developer API v1beta** (3.7/3.8-flash): `processingMode`/`serviceTier`/`priority` đều "Cannot find field", không có suffix model `-flex` — đó là tính năng Vertex AI. Cheaper direct path duy nhất khả thi: `batchGenerateContent` (mọi flash model đều hỗ trợ) giảm ~50% cho chấm không realtime.
- **Key Google direct đang FREE TIER 20 req/ngày/model** (429 "retry in 20h48m"): chấm >20 bài/ngày phải bật billing. Free tier còn có nghĩa vụ cho Google dùng dữ liệu train → không hợp ảnh học sinh. Probe nhanh lỗi 4xx là cách rẻ nhất khám phá field hợp lệ — validation error tiết lộ tên field đúng (`generation_config` snake_case của Interactions API).
- **Interactions API v1beta TỒN TẠI** ở Google direct (route bắt lỗi tham số, không 404) nhưng chưa test được shape vì quota cạn — việc để sau.
- **Chọn bài test mở rộng bằng `cand_urls_*.json` + `live_refresh.txt` đọc Firestore READ-ONLY** hoạt động trơn: 34 assignment/400+ bài nộp, lọc nUrls≥3 + có grade số → batch_config.json có cả rubric/answerKey/teacherQResults + ảnh tải về. Nhớ loại bài đã chấm mốc khỏi pool.
- **Điểm mốc từ doc submission chỉ đáng tin khi `teacherApproved=true`** — bài chưa duyệt chứa điểm AI cũ làm mốc gây kết luận sai (042d55 "6,7" là điểm hệ thống cũ). Luôn lọc approved khi so AI vs "thầy".
- **Prompt V2 tham số hoá được theo đề**: thay khối "CẤU TRÚC ĐỀ" + số dòng theo teacherQResults (19/20/22) là model tự đúng cấu trúc 10/10 run với đề Toán 11, phiếu BT — không cần prompt mới từng dạng. Mô tả Phần II (đúng/sai 4 ý) giữ nguyên ở mọi đề.
- **PowerShell 5.1 không có `&&`** giữa các lệnh (chỉ PS 7+): dùng `;` hoặc gọi lệnh riêng. node -e script inline trong PS: cẩn thận escape quote lồng nhau.

### Đợt 3 (đêm 23/10) — cắm code production chấm giá rẻ + subscribe key mới

- **Console ViLao cùng gốc `vilao.ai/api/v1`, KHÔNG phải `api.vilao.ai`** — `api.vilao.ai` chỉ dành cho inference OpenAI-compatible (`/v1/chat/completions`, `/v1/models`). Cách tìm endpoint console nhanh nhất: `performance.getEntriesByType('resource')` trong tab console đã đăng nhập, lọc `/api/` — đừng đoán path rồi thử lần lượt (404 im lặng).
- **Reveal key trả field `plain_key`** — viết code đọc reveal trong tab phải return BẢN CHE trước, đừng return nguyên body: secret một lần in vào context là không thu lại được.
- **Subscribe key mới xong phải verify bằng inference API**: `POST /api/v1/user/llm/keys/{id}/subscribe` `{provider_id: UUID chib, model_id}` → 201, rồi `GET https://api.vilao.ai/v1/models` Bearer sk-key phải liệt kê `gemini-3.8-flash` — đây là nguồn sự thật, không tin toast.
- **Test neo hành vi cũ phải được viết lại khi CHÍNH SÁCH đã đổi có chủ đích** — 5 test `gradingPrompt.test.ts` kẹp điểm theo field `score` là đúng chính sách cũ "tin score"; quyết định 23/10 đổi thành "điểm = Σ dòng" nên viết lại test + comment gốc quyết định trong test. Phân biệt với "sửa test cho pass": policy đổi thì test cũ HỎNG, giữ lại là sai.
- **Select-String pattern chứa backtick làm PowerShell chết "The string is missing the terminator"** — dính đúng lỗi lesson cũ (PS escape). Pattern có ```json thì bỏ qua ghép pattern, hoặc tìm bằng từ khoá không có backtick.
- **Tool shell timeout bị cap ~120s** dù truyền tham số lớn hơn — build full (vite) và full vitest của repo này đều vượt 120s → chạy `background: true` ngay từ đầu, đừng thử foreground rồi chờ chết.

### Đợt 3.1 (đêm 23/10) — tinh chỉnh guard Σ sau full vitest

- **Đổi chính sách parse/normalize thì phải quét test ở TẤT CẢ các tầng, không chỉ file unit test của module** — tôi cập nhật 5 test trong `gradingPrompt.test.ts` nhưng quên `api/__tests__/grade-homework.variants.test.ts` (test integration tự dựng fixture đi qua toàn bộ handler); dính undo 3 test đỏ, và lần vá đầu còn làm thêm 1 test (định danh thầy chấm tay) đỏ theo vì đoán sai cơ chế thay vì đọc code. QUY TẮC: sau khi đổi policy, grep tên hàm/field bị đổi policy trong `api/__tests__` + `src/**/*.test.ts` để tìm mọi fixture neo hành vi cũ, rồi hãy chạy full suite.
- **Trước khi luật hoá chính sách tính điểm mới, grep xem production CÓ SẴN triết lý đó ở đường đi nào chưa** — `recomputeTotal` (`src/lib/classroom/questionRescore.ts`) đã code sẵn "dòng phủ thang (ΣmaxScore ≈ maxScore) → Σ; không phủ → giữ điểm" cho bước chấm lại đáp án khách quan. Σ vô điều kiện của tôi đè mất kịch bản "AI đọc tổng điểm GV ghi tay trên bài" (luồng bài kiểm tra định kì: đối chiếu sổ điểm, `paperScore`, HS tự khai). Giải pháp đúng là áp đúng guard đó vào tầng parse, không phát minh ngưỡng riêng.
- **Ngưỡng epsilon phải chép từ code gốc có sẵn (0,01), không tự nghĩ** — hai tầng (parse + recomputeTotal) phải ra CÙNG quyết định cho cùng input, nếu không will flip-flop giữa hai tầng.
- **`git stash` + chạy 1 file test + `stash pop` là bằng chứng rẻ nhất cho "fail này có sẵn từ commit gốc"** — đã chứng minh `student-adaptive.test.ts` fail tại `2f177ae` thuần (không liên quan thay đổi của tôi) trong ~30 giây, nhờ đó không phải đi vá ngoài phạm vi duyệt. Chú ý: `git stash push` không chứa pathspec file untracked sẽ lỗi từng file — stash cả set tracked rồi thôi.

## 2026-10-23 (chiều) - Phẫu thuật dữ liệu bài nộp: nối 2 tờ ghép điểm Hải Phong

- **Bản mới chọn "lượt hiện tại" theo createdAt mới nhất** (không xét `supplementOf`) — cả view thầy (`currentSubmissionsForAssignment`) lẫn view HS (`latestSubmissionByAssignment`). 2 lượt nộp cách nhau vài chục giây của cùng HS → lượt sau (chưa duyệt) nuốt lượt trước (đã duyệt) → HS mất điểm hiển thị, thầy thấy nút duyệt treo. Soi `createdAt` của submissions trước khi kết luận về hiển thị.
- **Firestore rules cấm client ghi trực tiếp `submissions`** (PATCH/DELETE REST → 403, đọc thì OK). Mọi sửa dữ liệu phải qua action của app theo trình tự: `issueSubmissionUpload` → PUT resumable URL → `submitActorSubmission` (có `supplementOf` thì `mergeSubmissionEvidence` tự gộp ảnh cũ + mới, dedupe theo URL) → `setSubmissionExamCode` → `saveSubmissionGrade` → `approveSubmissionGrade` (approve kiểm tra `updatedAt` — phải gọi ngay sau save, không chen write giữa chừng).
- **`saveSubmissionGrade` không trồng được bảng câu mới**: `mergeTeacherQuestionResults` chỉ `previous.map` (đè lên bảng đã có). Bài chưa có bảng → gửi 20 hàng vẫn ra rỗng. Bảng câu chi tiết chỉ sống trong doc gốc (History).
- **`deleteSubmission` (app) xoá cả Storage objects** — doc khác đang tái dùng URL ảnh đó sẽ vỡ ảnh. Nối bài bằng `supplementOf` khiến doc mới giữ URL ảnh của doc gốc → **KHÔNG xóa các lượt cũ trong History** (hazard hiện hữu của Hải Phong: `1da12eb5`, `5988c78a`, `f0bb7b6c`).
- Approve grade sync evidence theo `sourceId=submissionId` (`syncApprovedGradeEvidence`) — approve doc mới không xoá evidence doc cũ; topic có thể đếm từ 2 nguồn cùng nội dung, chấp nhận được.
- PS 5.1 + file UTF-8 không BOM chứa tiếng Việt → parse lỗi chương trình; luôn chuyển script sang UTF-8 **có BOM** trước khi chạy (`WriteAllText` với `UTF8Encoding($true)`).

## 2026-10-23 - Đọc số trên ảnh bài nộp: số đoán không được vào bảng như số chắc

- Trong một phiên tôi đã đọc sai HAI lần cùng một kiểu trên ảnh phiếu HS: điểm bút đỏ "7" thành "7,6/7,4", mã đề viết tay "101" thành "201". Ảnh mờ/nghiêng/chữ dốc là điều kiện đủ để tôi tự tin sai. QUY TẮC: giá trị viết tay đọc từ ảnh phải gắn độ tin cậy; còn mơ hồ thì crop phóng to và hỏi GV chốt, tuyệt đối không để giá trị đoán vào bảng đối chiếu như dữ liệu đã xác thực.
- Quy tắc GV chốt cho phiếu mâu thuẫn giữa ô tô chì và số viết tay trên cùng một phiếu: ưu tiên KẾT QUẢ TÔ CHÌ (ca st2257). Luồng chấm lại phải dùng đúng thứ tự ưu tiên này.

## 2026-10-19 — Cổng Ban Toán phải kiểm kết quả thật

- Theo lựa chọn mới: sửa trực tiếp tại checkout bằng model hiện tại; không dùng skill điều phối, OpenCode hoặc 9router. Không suy model phục vụ thực tế từ tên yêu cầu.
- Độ dài bản sửa không chứng minh giữ nội dung. Auto-repair chỉ nhận patch, giữ định danh/công thức/nguồn/bảng/phiếu đã có, kiểm lại toàn bộ; lỗi thì giữ bản gốc trong editor, không báo thành công.
- Heading hoặc dấu `**` không phải căn cứ điều chỉnh/phiếu/đáp án. Test phải kiểm nội dung có ý nghĩa và phân biệt phiếu HS với đáp án GV; Quick Check/Sơ kết là mục con trong tiến trình, không được làm rơi bảng.
- Cổng xuất phải nằm ngoài nhánh fallback Word/PDF, nếu không lỗi kiểm định vẫn có thể xuất qua đường dự phòng. Test xanh chỉ chứng minh các điều kiện đã kiểm, không chứng minh giáo án đã đủ chiều sâu.

## 2026-10-15 — Lựa chọn model trong lượt soạn TDS

- Giáo án sinh trực tiếp trên `giaoandewey` tốt hơn lô DOCX cũ vì web dùng `useLessonCreator` với `TOAN_COMMON_FORMAT`, format theo loại tiết và `buildToanClassroomMovesPrompt`; lô hàng loạt dùng generator/spec/enhancement khác, dễ chèn lời thoại vận hành và câu khuôn vào cột bảng. Khi nhân rộng, lấy Markdown từ đường web làm nguồn chuẩn rồi mới parse/export DOCX; không sửa cột bảng bằng thay thế mù.
- Đường web Ban Toán có hai nhánh: bulk/direct viết một lượt bằng `detailPrompt`, còn single trước đây chạy Planning → Content → Format. Nhánh single làm mất ngữ cảnh vì Planning giữ `referenceContext` nhưng Content không nhận lại, rồi FormatAgent có thể rút nội dung mà chỉ bị chặn khi còn dưới 50%. Ban Toán nay phải author trực tiếp qua ContentAgent, truyền `requirement` + `referenceContext`, bỏ Planning/Format; parser/exporter xử lý layout deterministic.

- Người dùng bác bỏ giáo án công nghiệp dù đủ số lượng/cấu trúc: trước soạn phải đọc nội dung thật SGK, SBT, tiêu chí và mẫu local, lần theo tính năng mẫu Ban Toán trong app. Mỗi bài cần một chướng ngại nhận thức, chuỗi câu hỏi có đáp án dự kiến, hai lộ trình hỗ trợ với bước rút dần và bằng chứng để GV quyết định tiếp. Không thay thiết kế sư phạm bằng khung câu hỏi chung hoặc nhãn CIS.
- Tham số yêu cầu Astra không chứng minh model thực phục vụ. Khi lỗi trả về gpt-6-luna/9router trái lựa chọn người dùng, dừng agent và báo sai lệch; không tiếp tục gọi đó là native Astra.

- Khi người dùng chỉ định native `gpt-6-astra` effort `xhigh` cho phiên và subagent, dừng lời gọi model ngoài; bàn giao checkpoint rồi chuyển subagent sang đúng model. Không tiếp tục mặc định OpenCode/9router từ chỉ dẫn cũ.
- Không suy chất lượng nội dung từ XML/OMML xanh: B03 đã lọt lỗi dấu tích phân, phép tính thể tích/thống kê và nội dung kiểm tra tự suy diễn. Phải kiểm đáp án và giả thiết riêng; các tiết kiểm tra cần kịch bản tổ chức kiểm tra, không dùng hoạt động nhóm hay phiếu luyện tập.

---

## TypeScript

- **setBulkProgress reset must include all fields** — `{ current: 0, total: 0, currentTitle: '' }` not just `{ current: 0, total: 0 }`. Local Vite build passes but GitHub CI (strict tsc) catches it. Always run `npx tsc --noEmit` before committing. *(2026-04-21)*

- **`replace_all: false` fails when string appears twice** — When using Edit tool, if `old_string` matches more than once the edit fails. Add more surrounding context to make it unique. *(2026-04-21)*

## Firebase

- **`browserSessionPersistence` logs users out on tab close** — Use `browserLocalPersistence` (Firebase default) unless logout-on-close is intentional. *(2026-04-21)*

- **Firestore writes need try/catch + user feedback** — Silent failures destroy trust. Always wrap `setDoc`/`deleteDoc` in try/catch and show error toast on failure. *(2026-04-21)*

## React / State

- **Rename in view mode must sync to Firestore** — When updating `data.gradingSessions` via `setData`, also call `persistSession(updatedSession)` to write through to Firestore. Local state update alone is lost on reload. *(2026-04-21)*

- **Bulk loop needs cancel ref reset at start** — Set `cancelBulkRef.current = false` before the loop begins, otherwise a previous cancel bleeds into the next run. *(2026-04-21)*

## Git Workflow

- **NEVER push to `main` without explicit user order** — All development stays on feature branch. Only push to `main` when user explicitly says "push to main" / "merge" / "ra lệnh". The stop-hook warning is not a reason to push to main automatically. *(2026-04-28)*

## Adaptive / Nội dung Toán học

- **MỌI text hiển thị có công thức phải qua `mathText.sanitizeDisplayText()` — CẤM viết regex xử lý công thức mới ngoài `src/lib/adaptive/mathText.ts`** — 8 đợt QA lỗi công thức (E3/E4/E7/F1/F2/F9) đều cùng gốc: nhiều regex chồng nhau không nhận biết vùng `$...$`, chèn `$` vào TRONG vùng math có sẵn → tách đôi công thức. Nguyên tắc module: tokenize math/text trước, transform chỉ chạy trên đúng loại vùng, `assertClean` hậu-kiểm. QA bắt được chuỗi lỗi mới → THÊM golden test vào `mathText.test.ts`, không chỉ vá regex. *(2026-07-07)*

- **Sửa spec hiển thị = sửa CẢ HAI nhánh (bài mới structured + fallback bài cũ)** — F5: đổi nhãn gói Luyện tập chỉ sửa nhánh `practiceSet`, nhánh fallback giữ nhãn cũ → bài tạo trước fix vĩnh viễn trông "chưa fix", user mất niềm tin. Verify phải render cả 2 nhánh. *(2026-07-07)*

- **State học sinh trong localStorage phải scope theo HỌC SINH + có version trong key** — F3: key vở ghi theo máy (`v2-<lessonId>`) làm học sinh phòng tin học thấy vở của nhau, VÀ note cũ "ma" che mất fix mới → QA tưởng fix hỏng, dev tưởng QA sai (lặp nhiều đợt vì F4/F13 đều là bóng ma storage). Đổi format note = bump version key. *(2026-07-07)*

- **Điều hướng tự do (TOC mở khóa) → giá trị dẫn xuất phải render trong `navTo()`, không chỉ ở luồng tuần tự** — F7: điểm Tổng kết chỉ cập nhật trong `finishLesson`, nhảy TOC vào summary thấy 0 điểm. Mở khóa điều hướng thì mọi số liệu màn đích phải tính lại lúc vào màn. *(2026-07-07)*

- **Pipeline sinh học liệu không được nuốt lỗi im lặng** — D6: TikZ fail thì retry 1 lần KÈM thông báo lỗi Kroki cho AI tự sửa; warning phải ghi nguyên nhân gốc (429 vs cú pháp); lỗi relay phải kèm body. Cảnh báo chung chung = không ai sửa được. *(2026-07-07)*

- **Chọn loại mô phỏng theo ĐÚNG phân môn Toán, không suy từ keyword rời** — Bài Xác suất bị nhét mô hình hình học 3D vì regex bắt cụm "không gian mẫu" thành "không gian" (hình học). Token rời như "không gian", "mặt phẳng", "đường thẳng", "tọa độ" xuất hiện ở nhiều phân môn → đoán loại học liệu bằng chúng là sai bản chất. Nguyên tắc: (1) để AI tự chọn học liệu theo phân môn qua bảng "phân môn → loại học liệu" trong prompt; (2) heuristic code chỉ là fallback BẢO THỦ — chỉ dựng hình học khi có tên hình cụ thể (hình chóp/tam giác/đường tròn…), mơ hồ thì trả undefined; (3) chặn trước các phân môn phi-hình-học (xác suất/thống kê/tổ hợp/giải tích) trước khi xét hình học. Vị trí: `adaptiveFromLessonPlan.ts` `buildDefaultSimulationSpec` + `buildGeometry3DSimulationSpecFromJson` + prompt unit/sim. *(2026-06-24)*

## Firestore Rules

- **Cổng học sinh là link công khai → rule phải cho đọc ẩn danh có điều kiện** — `adaptiveLessons` chỉ `allow read: if request.auth != null` chặn học sinh ẩn danh (quét QR) → cổng "Không tìm thấy bài học". Doc bật cổng (ghi bởi AdaptiveLearningTab) là dạng bọc có `portalEnabled: true`. Fix: `allow read: if request.auth != null || resource.data.get('portalEnabled', false) == true;` (chỉ lộ bài đã bật cổng). Dùng `.get(key, default)` để không lỗi eval khi field vắng. Nhớ `firebase deploy --only firestore:rules`. *(2026-06-24)*

## Workflow / Testing

- **Test bài học phân hóa PHẢI đóng vai học sinh học thật, không chỉ soi DOM** — Đếm số `.sim-frame`/`.vc-gallery` qua DOM KHÔNG phát hiện được: gợi ý/đáp án là placeholder, MathJax không render trong iframe mô phỏng, bước câu hỏi nhồi nguyên khối, nút "Hoàn thành" bị đơ, Vở ghi sai cấu trúc. Phải thực sự: bấm hết nút, đọc nội dung từng gợi ý/đáp án, đi hết các bước/hoạt động, kiểm điều hướng, đọc Vở ghi. Đây là cách user phát hiện 7 lỗi mà 2 vòng test trước (DOM-only) bỏ sót. *(2026-06-26)*

- **Khi viết prompt kiểm thử cho cowork → PHẢI bật dev server trước** — Cowork là sandbox Linux, không chạy được Vite bản Windows (sai platform binary). Tôi chạy trên máy Windows thật nên dùng PowerShell khởi động `npm --prefix "..." run dev` (background, port 3000) TRƯỚC khi đưa prompt, rồi nói rõ "server đã chạy sẵn ở http://localhost:3000, đừng tự chạy". Không bắt cowork tự dựng server. *(2026-06-23)*

## OMML / Word Equation (inject vào docx)

- **`<m:oMathPara>` KHÔNG được đặt trực tiếp trong `<w:tc>`** — Inject `<m:oMathPara>` thay thế `<w:p>` khi placeholder nằm trong table cell → công thức render sai, bị cắt. Cấu trúc đúng trong table cell: `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><m:oMath>...</m:oMath></w:p>`. `<m:oMathPara>` chỉ dùng ở body level (ngoài bảng). *(2026-07-09)*

- **Detect `</w:tc>` phải dùng exact 7 ký tự, không phải 6** — `</w:tc` (6 chars) khớp cả `</w:tcPr>`, `</w:tcMar>`, `</w:tcBorders>` → depth giảm sai, toàn bộ placeholder bị nhầm là "ngoài bảng". Fix: `xml[i:i+7] == '</w:tc>'`. *(2026-07-09)*

- **Dùng Pandoc để generate OMML thay vì viết tay** — Pandoc convert LaTeX→docx→extract `<m:oMath>` từ document.xml. Quality cao hơn nhiều (handles subscripts, accents, operators, vectors đúng). Chạy: `pandoc eq.md -o eq.docx` rồi unzip và đọc `word/document.xml`. *(2026-07-09)*

- **Namespace `xmlns:m` phải có trong `<w:document>`** — Nếu thiếu thì inject trước: `xml.replace('<w:document ', '<w:document xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" ', 1)`. *(2026-07-09)*

- **JS backslash escape trong LaTeX string — 4-backslash rule (CRITICAL)** — Khi viết LaTeX có backslash vào JS string literal qua Python transformation script: dùng `'\\\\vec{n}'` (4 backslash trong Python) → file chứa `\\vec{n}` (2 backslash) → JS runtime đọc thành `\vec{n}` (đúng). Dùng `'\\vec{n}'` (2 backslash trong Python) → file chứa `\vec{n}` (1 backslash) → JS parse `\v` thành vertical tab (U+000B) + `ec{n}` → KaTeX nhận sai input → output `ecn(a;b)` thay vì đúng. Tương tự `\o` bị parse thành `o` (không phải `\o`). Phát hiện: `re.findall(r'\$\\(?!\\)([a-zA-Z])', src)` — nếu có kết quả là bug. *(2026-07-09)*

- **`mathml2omml` là named export, KHÔNG phải default** — `const mml2omml = require('mathml2omml')` → TypeError. Đúng: `const { mml2omml } = require('mathml2omml')`. *(2026-07-09)*

- **KaTeX MathML preprocessing trước khi truyền vào mml2omml** — `mml2omml` không xử lý được `<semantics>` và `<annotation>` từ KaTeX output → throw "Type not supported: annotation". Phải extract chỉ phần `<math ...>...</math>` raw (dùng regex `/<math[\s\S]*?<\/math>/`), loại bỏ `<semantics>`/`<annotation>` trước khi gọi mml2omml. *(2026-07-09)*

- **`<m:chr m:val="⃗"/>` (U+20D7) là OMML đúng — KHÔNG phải bug Unicode** — `mml2omml` tạo ra ký tự combining enclosing upward pointing triangle (U+20D7) trong `<m:acc>` element để biểu diễn vector arrow. Đây là cách đúng của OMML. Kiểm tra "Unicode ngoài OMML" cần exclude các chuỗi `<m:...>` khi đếm. *(2026-07-09)*

- **Pipeline OMML hoàn chỉnh trong build script (không cần inject step)** — Thay vì placeholder → inject, có thể tích hợp toàn bộ pipeline `katex → mml2omml → xml-js → convertToXmlComponent` trực tiếp trong Node.js build script dùng docx library. `convertToXmlComponent` từ docx v9.7.1 nhận xml-js parsed object (`{ type:'element', name, attributes, elements }`) và trả về `ImportedXmlComponent` serializable. Cần `sanitizeOmmlTextNodes()` để escape `< > &` trong `<m:t>` nodes trước khi xml2js parse. *(2026-07-09)*

## Đọc tài liệu vs. đọc code

- **File kế hoạch (`*_plan.md`) KHÔNG phải bằng chứng về trạng thái code — phải grep code trước khi báo cáo "chưa fix"** — Tôi đọc `tasks/adaptive_lesson_fix_plan.md` (viết 2026-06-18) rồi kết luận với user "6 bug adaptive chưa được fix". Thực tế cả 6 đã fix xong từ lâu qua 9 đợt QA (`1aab05a` → `993098a`), nhiều chỗ còn làm sâu hơn plan (blueprint 2 pha ép 1 unit/mục tiêu, `guiding_answers` ngoài `guiding_questions`, registry công cụ ngoài). User phải tự phản biện "tôi tưởng fix rồi chứ?" mới lộ ra. Plan doc mô tả Ý ĐỊNH tại thời điểm viết, không có ai cập nhật lại sau khi làm xong → mặc định coi là STALE. Quy tắc: trước khi nói bất kỳ thứ gì "chưa làm/còn dở", grep ít nhất 1 symbol đặc trưng của mỗi hạng mục trong `src/`, và xem `git log -- <file>`. Nếu chỉ đọc doc thì phải nói rõ "theo tài liệu X, chưa verify code". *(2026-07-22)*

## Đóng gói / Chuyển giao phiên làm việc

- **Luôn viết `tasks/session_*.md` sau phiên phức tạp** — File này là "bản đồ" cho phiên mới: file đầu ra ở đâu, build pipeline như thế nào, bug đã fix, vấn đề còn lại. Cả Cowork lẫn Claude Code đều đọc được. Xem ví dụ: `tasks/session_khdh_bai19.md`. *(2026-07-09)*

## UX Patterns

- **API key banner must name the active provider** — Generic "no API key" message is confusing when user has keys for other providers. Check active provider specifically. *(2026-04-21)*

- **Empty states are mandatory** — Every list/grid must handle `length === 0` with icon + message + CTA. Blank space = broken to new users. *(2026-04-21)*

- **File upload needs size guard** — No size limit = browser hangs on large files with no feedback. Default max: 20MB with clear error toast. *(2026-04-21)*

## E2E trong Browser pane (Claude Code)

- **Browser pane không chụp được screenshot nhưng DOM tools vẫn sống** — `computer{screenshot}` timeout 30s liên tục, nhưng `read_page`/`get_page_text`/`javascript_tool`/`form_input` hoạt động bình thường. Đừng bỏ cuộc vì screenshot hỏng; verify bằng text/DOM. Click theo `ref` có thể trượt sau khi UI re-render — click qua JS (`[...document.querySelectorAll('button')].find(...)`) ổn định hơn. *(2026-07-16)*

- **Test AI flow trên localhost cần proxy /api → production** — Vite dev KHÔNG serve Vercel Function trong `api/` → relay 404. Đã thêm `server.proxy['/api'] → https://giaoandewey.vercel.app` trong vite.config.ts. Demo mode + đổi `settings.selectedProvider` trong localStorage (`smart_lesson_plan_data`) là đường vào không cần login. Khi relay/pool chết thật sự, stub `window.fetch` cho `/api/gemini-relay` để E2E toàn pipeline (parse → gate → repair → PPTX) mà không phụ thuộc model. *(2026-07-16)*

## Error UX

- **Catch chung nuốt mất thông báo lỗi có hướng dẫn** — Lỗi chính sách (thiếu API key) throw message tiếng Việt đầy hướng dẫn nhưng user chỉ thấy "Lỗi cấu trúc hoặc kết nối AI" vì catch trong exportUtils hiển thị text cứng. Pattern fix: lỗi policy đặt `err.name` riêng (`MissingApiKeyError`) + export helper `isMissingApiKeyError()`, catch nào hiển thị toast thì surface nguyên văn `e.message` khi match. E2E phải kiểm ĐÚNG text user thấy, không chỉ kiểm console. *(2026-07-21)*

- **Pipeline nhiều bước AI: bước "trang điểm" cuối phải degrade gracefully, không được ném mất thành quả** — Planning → Content → Format đều gọi AI; call thứ 3 dễ dính 429 nhất (quota đã bị 2 call trước ăn). Format throw → user mất trắng giáo án đã sinh + editor kẹt ở placeholder "(Hệ thống đang chuẩn hóa...)". Quy tắc: bước nào chỉ cải thiện hình thức (format/polish/QA-repair) thì lỗi → trả bản trước đó, và mọi placeholder "đang xử lý..." bơm vào editor phải được thay thế trong MỌI nhánh thoát (kể cả catch). *(2026-07-21)*

## Cowork vs. tự làm

- **Tự chạy được thì đừng bảo cowork làm** — Với Browser pane (mở web, click, đọc DOM/network, chạy JS), tôi tự E2E được HẦU HẾT luồng public: cổng học sinh (chỉ mở URL + nhập ô), demo mode giáo viên, kiểm response API bằng fetch. Chỉ cần cowork/user khi thao tác đòi credential thật (Vercel dashboard, đăng nhập Google OAuth, mua/nạp key có tính phí). Đừng mặc định viết prompt cowork cho việc mình làm được. *(2026-07-21)*

## Đường dẫn tiếng Việt trên Windows

- **Thư mục tiếng Việt trong repo dùng Unicode NFD → Read/Glob bằng đường dẫn tự gõ luôn báo "File does not exist"** — Các thư mục như `chấm điểm dự giờ/`, `các yêu cầu về Toán cần đạt/` lưu dấu ở dạng tổ hợp (NFD), còn chuỗi mình gõ ra là NFC → không khớp byte. `Get-ChildItem -LiteralPath` với chuỗi tự gõ cũng fail. Cách vào được: `Get-ChildItem -Directory | Where-Object { $_.Name -like "ch*m *i*m d* gi*" }` rồi dùng `.FullName`, hoặc copy sang scratchpad với tên ASCII rồi đọc. `Grep`/`Glob` vẫn quét được nội dung vì chúng duyệt cây thư mục chứ không so khớp chuỗi gõ tay. *(2026-07-28)*

- **File tham khảo đuôi `.ts` nằm ngoài `src/` vẫn bị `npm run lint` bắt** — `tsconfig.json` chỉ exclude `api`, `soangiaoan`, `.agents`… nên mọi `*.ts` ở thư mục khác đều vào diện type-check. File mẫu chưa khớp repo phải đổi đuôi thành `.txt`. Lưu ý `npm run build` (vite build) KHÔNG chạy tsc → build xanh không có nghĩa là lint xanh; phải chạy cả hai. *(2026-07-28)*

- **Firestore emulator cần Java, máy này chưa có** — `firebase emulators:exec` chết ở `Could not spawn java -version`. Đã cài `winget install Microsoft.OpenJDK.21` (machine scope; `--scope user` không có installer). PATH chưa cập nhật trong session đang chạy → phải prepend `C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot\bin` vào `$env:PATH` trước khi gọi `npm run test:rules`. *(2026-07-28)*

## Firestore rules & indexes

- **Nối `"indexes"` vào `firebase.json` biến `firestore.indexes.json` thành nguồn sự thật — deploy sẽ XOÁ index không khai** — File index nằm im trong repo suốt thời gian `firebase.json` chưa trỏ tới nó, nên nó drift: khai 3 index trong khi app chạy 7 query `where + orderBy`. Ngay khi thêm key `"indexes"`, `firebase deploy --only firestore:indexes` coi 4 index kia là thừa và hỏi xoá → gõ Y (hoặc `--force`) là vỡ Thư viện/Đề đã lưu/Lịch sử chấm bài trên production. QUY TẮC: (1) trước khi bật deploy index lần đầu, grep toàn repo `orderBy(` và đối chiếu đủ với file; (2) thêm query `where(A) + orderBy(B)` mới thì khai index cùng lúc; (3) luôn ĐỌC danh sách CLI hỏi xoá, đừng gõ Y theo phản xạ. *(2026-07-29)*

- **`request.query.where` KHÔNG tồn tại trong Firestore rules** — `request.query` chỉ có `limit`, `offset`, `orderBy`. Viết `'field' in request.query.where` để ép client lọc là sai cú pháp → rule ném evaluation error → deny sạch, và emulator chỉ báo "evaluation error at L…" chứ không nói rõ. Đúng idiom: rule `list` được chấm trên TỪNG document ứng viên, nên viết thẳng `resource.data.field == request.auth.uid` — Firestore tự bắt client phải thêm `where` tương ứng, nếu không cả truy vấn bị từ chối. Hệ quả cho code client: query thiếu `where`, thiếu `limit`, hay `limit` vượt ngưỡng đều trả `permission-denied` — dễ bị chẩn đoán nhầm là "rules hỏng". *(2026-07-29)*

## Dự giờ Danielson

- **Tiếng Việt trong file Office lưu dạng NFD → mọi phép so chuỗi trượt âm thầm** — Đọc `.xlsx`/`.docx` bằng SheetJS/mammoth ra chuỗi tổ hợp (NFD): `'Khoảng cách'` từ file KHÔNG bằng `'Khoảng cách'` mình gõ (NFC), dù in ra nhìn y hệt. Test báo `expected 'Khoảng cách…' to contain 'Khoảng cách'` — đọc như vô lý. QUY TẮC: `.normalize('NFC')` ngay tại HÀM ĐỌC VÀO, không rải rác ở chỗ so sánh. Trước đây chỉ gặp ở tên thư mục; nó áp cho cả NỘI DUNG file. *(2026-07-29)*

- **Muốn xuất Excel giữ nguyên định dạng thì đừng dựng file mới — điền vào chính file mẫu** — Bản cộng đồng của `xlsx` (SheetJS) ĐỌC được style nhưng GHI ra thì mất sạch màu/viền/độ rộng cột. Cách giữ 100% định dạng: để file mẫu trong `public/`, mở bằng JSZip, chỉ thay giá trị ô trong `xl/worksheets/sheetN.xml`, giữ nguyên thuộc tính `s=` của ô và không đụng `styles.xml`. Ghi chuỗi dạng `t="inlineStr"` để khỏi quản lý chỉ số `sharedStrings.xml`. Nhớ `generateAsync({compression:'DEFLATE'})` — mặc định STORE làm file phình gấp 4. Nghiệm thu bằng mắt: LibreOffice → PDF → PNG rồi tự nhìn. *(2026-07-29)*

- **Quy tắc nghiệp vụ "không cho điểm theo cảm giác" phải cưỡng chế bằng code, không để trong tài liệu** — Tài liệu tổ Toán ghi rõ điểm lẻ 0,5 cần minh chứng chạm ngưỡng, nhưng nếu UI chỉ là thanh chọn điểm thì không ai thực hiện. Cách làm: chọn điểm lẻ → bắt buộc mở ô minh chứng, trống thì chặn nút Lưu; và ép luôn ở tầng AI (đề xuất điểm lẻ mà không nêu được căn cứ thì tự hạ về mức nguyên). Tương tự, "không đánh giá" phải là NÚT RIÊNG khác 0 điểm — gộp hai thứ này là làm oan người bị đánh giá. *(2026-07-29)*

- **Đọc kỹ tài liệu gốc trước khi số hóa: bản trường đang dùng có thể là bản rút gọn** — Excel dự giờ của trường có 15 cấu phần, bản Danielson đầy đủ có 22 (thiếu 2b và cả Phần IV). Bê nguyên Excel thì mất khung; bê nguyên khung thì lệch thói quen của trường. Giải: dữ liệu giữ đủ 22, thêm hằng `BO_DU_GIO` cho bộ rút gọn và cho người dùng chọn. Khi có nhiều nguồn, hỏi rõ nguồn nào là CHUẨN, nguồn nào là BIẾN THỂ. *(2026-07-29)*

- **Dữ liệu sinh tự động từ .docx/.xlsx phải có test toàn vẹn NGAY, không đợi người dùng phát hiện** — Sinh `khungDanielson.ts` từ bản .docx của trường, hai lỗi lọt tới tận giao diện: mục 2b còn nguyên văn tiếng Anh chưa dịch, mục 3a mức 4 chép nhầm lặp lại mức 1. Lỗi thứ hai nguy hiểm hơn vì không lộ ra bằng mắt — "Xuất sắc" và "Chưa đạt" mô tả giống hệt nhau. QUY TẮC: cùng lúc với script sinh dữ liệu, viết luôn test bất biến (các mục phải KHÁC nhau, đúng ngôn ngữ, là câu hoàn chỉnh, đủ số lượng). File nguồn của khách hàng CÓ lỗi — đừng giả định nó sạch. Khi có 2 nguồn cho cùng một dữ liệu thì đối chiếu chéo, chỗ nào lệch thì đọc cả hai rồi mới chọn. *(2026-07-29)*

- **Cho người khác ghi vào document của mình: khoá bằng `diff().affectedKeys().hasOnly()`, đừng khoá bằng giao diện** — Giáo viên cần tự đánh giá trên biên bản dự giờ do người khác lập. Rules: `allow update: if laGiaoVienDuocDu() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['tuDanhGia','updatedAt'])`. Nhớ viết ca test "vừa ghi trường được phép vừa lén sửa trường khác" — đó là đường lách hiển nhiên nhất mà rule sai hay bỏ sót. Và đọc trường có thể vắng bằng `resource.data.get('field','')`, không đọc thẳng: document tạo trước khi thêm trường sẽ làm rule ném lỗi thay vì trả false. *(2026-07-29)*

- **Regex dọn khoảng trắng trong JSX ăn cả dấu cách có nghĩa** — Gỡ 122 lớp `dark:` bằng `replace(/([\"'\`])\s+/g,'$1')` đã biến `type="button" onClick=` thành `type="button"onClick=` (lỗi cú pháp) và `{' '}` thành `{''}` (mất dấu cách hiển thị), kèm mất dấu cách đầu trong các chuỗi như `' · tin cậy '`. Sửa hàng loạt bằng regex thì CHỈ khớp đúng thứ cần xoá, đừng gộp thêm bước "dọn dẹp" khoảng trắng. Hỏng rồi thì `git checkout HEAD -- <file>` làm lại sạch hơn là đi vá từng chỗ. *(2026-07-29)*

## Soạn giáo án (ban Toán) — bài học từ đợt rà Bài 19 (2026-07)

- **Đề bài sai phạm vi thì ĐỔI ĐỀ, đừng vá** — Tiết 1 (mới học VTPT) có bài cực trị cần PT đoạn chắn và bài "qua 2 điểm" cần VTCP. Phản xạ sai là thêm gợi ý để HS vẫn làm được; đúng ra phải thay hẳn đề bằng bài chỉ dùng công cụ đã học. User: *"phải biết buông bỏ… chứ ko phải cứ bám vào 1 đề bài bị sai rồi nghĩ ra cách fix"*. Trước khi sửa một chi tiết, hỏi: chi tiết này có thuộc về tiết này không? *(2026-07-30)*

- **Sửa nội dung bài học = phải rà CẢ phiếu học tập ở phụ lục** — đổi bài tập/bối cảnh mà quên phụ lục thì phiếu phát cho HS vẫn là bài cũ. Mỗi lần đổi đề phải quét lại: mục tiêu, bảng phân hóa, kịch bản, BTVN, và phụ lục. *(2026-07-30)*

- **Prompt đã có luật vẫn không đủ — lỗi kiểm được thì phải đưa vào cổng chất lượng** — `toanFormats.ts` đã ghi rõ "KHÔNG lấn nội dung tiết sau (vd… không dạy vectơ chỉ phương)" mà AI vẫn vi phạm đúng chỗ đó. Phân biệt: lỗi *sinh ra* (văn phong, độ dày) → prompt uốn được; lỗi *kiểm được* (tổng thời gian, ô trống, thuật ngữ chưa giới thiệu, khối lặp) → chỉ luật deterministic trong `mathStandards.ts` mới chặn được. Thêm ví dụ few-shot KHÔNG sửa được nhóm thứ hai. *(2026-07-30)*

- **Ví dụ few-shot dài gây lây nhiễm bối cảnh** — nhét nguyên một tiết mẫu (GPS/metro, tọa độ A(2;3)…) vào prompt thì tiết khác dễ bị kéo nguyên bối cảnh/số liệu sang. Dấu vết có thật: "Trạm trung tâm I" ma trong BTVN Tiết 2, ga "Ngọc Hồi" sai tuyến. Ưu tiên: luật + 1 hoạt động mẫu/loại, rồi ĐO bằng cách sinh thử và chấm cổng, tăng liều đúng chỗ yếu. *(2026-07-30)*

- **Hằng số style phải thống nhất giữa MỌI đường xuất** — tỉ lệ cột bảng hoạt động tồn tại ở 2 nơi và lệch nhau: `buildSchoolFormDocx.COL3` (9/50/41) vs `toanStyleRules.TOAN_ACTIVITY_COL_RATIOS` (~11/54/35). Sửa một nơi là user vẫn thấy sai ở đường kia. Khi đổi hằng số hình thức, grep cả repo. *(2026-07-30)*

- **Quét tìm khối lặp phải đi từng vị trí, không lấy mẫu theo bước nhảy** — bản đầu của `no-duplicate-block` lấy mẫu mỗi 20 ký tự nên chỉ bắt được khi khoảng cách lặp là bội số của 20; khối lặp lệch pha lọt lưới. Dùng bước 1 + hash cửa sổ. Ngưỡng 160 ký tự để không báo nhầm câu hỏi cốt lõi (~100) lặp lại hợp lệ. *(2026-07-30)*

- **Công cụ Edit ghi file bằng CRLF trong khi repo dùng LF** — làm diff phình từ ~500 lên ~1900 dòng đổi. Sau khi sửa file bằng Edit/Write, kiểm `grep -c $'\r' <file>` và chuẩn hóa về LF trước khi `git add`. *(2026-07-30)*

- **Sandbox Linux không chạy được vitest/tsc của repo này** — `node_modules` cài trên Windows nên thiếu `@rollup/rollup-linux-x64-gnu`; `tsc --noEmit` toàn project trên mount mạng chạy >20 phút không xong. Cách thay thế: `tsc --noEmit --skipLibCheck` nhắm đúng vài file đã sửa (nhanh, vẫn strict), và kiểm logic thuần bằng harness Node độc lập. Build/test đầy đủ phải chạy trên máy Windows của user. *(2026-07-30)*

## Cổng chất lượng & quy trình đẩy lên main (2026-07-31)

- **Thêm luật `high` mới vào bộ kiểm thì phải rà LẠI mọi fixture cũ đang khẳng định `passed === true`** — `time-continuity` (thêm ở `d21cda5`) đòi mốc phút dạng `P0 – P5`; mẫu `COMPLETE_KNOWLEDGE` trong `toanLessonQuality.test.ts` viết trước đó chỉ ghi giờ đồng hồ `(10:49 - 11:00)` nên bị bắt fail → `passed` thành `false` → `main` đỏ liên tiếp 4 run (#442–#445). Các commit `du-gio` đỏ theo vì thừa hưởng, không phải lỗi của chúng. QUY TẮC: luật mới severity `high` → `grep` ngay các test có `.passed).toBe(true)` / `failures).toHaveLength(0)` và cập nhật fixture cùng commit. Hướng sửa mặc định là SỬA FIXTURE cho khớp luật, không nới luật — vì luật đang khớp với chuẩn mà tầng prompt (`toanFormats.ts`) đã yêu cầu AI tuân theo. *(2026-07-31)*

- **Chạy vài file test tự chọn là cách chắc chắn để CI vẫn đỏ** — `DAY-LEN-MAIN.bat` chỉ chạy 5 file test tự chọn nên cục bộ xanh mà CI đỏ, lặp lại 4 lần. Trước khi push phải chạy ĐÚNG hai lệnh workflow chạy: `npm run lint` (tsc toàn dự án) rồi `npm run test -- --run` (toàn bộ file test). Muốn chắc hơn nữa: dựng worktree sạch tại `origin/main`, chép bản vá vào, chạy lại hai lệnh đó — đúng thứ CI thấy. *(2026-07-31)*

- **`git add` liệt kê tay từng đường dẫn thì sẽ bỏ sót** — chính chỗ này làm bản sửa `toanLessonQuality.test.ts` nằm lại trong thư mục làm việc suốt nhiều lượt push. Dùng `git add -u` (mọi file đã theo dõi bị sửa) + `git add src tasks HANDOFF.md` (file MỚI trong mã nguồn), đừng dùng `git add -A` ở gốc repo vì sẽ hốt cả `scratch_*`, `outputs/`, `*.docx`. *(2026-07-31)*

- **Kiểm ngưỡng độ dài prompt phải đo đúng biến thể được GỬI ĐI** — test cũ bắt `buildToanClassroomMovesPrompt()` (không lọc) dưới 6000 ký tự trong khi `useLessonCreator` LUÔN gọi kèm loại kế hoạch, nên bản không lọc chẳng bao giờ tới tay AI. Đo nhánh không chạy là vừa đỏ oan vừa không nói lên gì về token thật. LƯU Ý CÒN LẠI: biến thể `luyen_tap` hiện 5971/6000 ký tự — thêm 1 nước đi nữa là vỡ ngưỡng, cần cân lại budget khi mở rộng thư viện. *(2026-07-31)*

- **`.git/index.lock` kẹt do VS Code giữ** — thao tác git báo `Unable to create index.lock: File exists`. Kiểm không có tiến trình `git` nào đang chạy rồi xoá `.git/HEAD.lock` và `.git/index.lock`; đóng VS Code trước cho chắc. *(2026-07-31)*

- **Bash tool KHÔNG hiểu here-string PowerShell `@'...'@`** — dùng nó cho `git commit -m` làm lọt ký tự `@` vào đầu dòng tiêu đề và một dòng `@` thừa ở cuối message. Trong Bash dùng heredoc `git commit -F - <<'MSG' … MSG`; here-string `@'…'@` chỉ dành cho tool PowerShell. *(2026-07-31)*

## Dự giờ Danielson — đợt sửa nguồn minh chứng (2026-08-03)

- **Ký tự điều khiển VIẾT THẲNG trong regex làm git coi cả file là binary** — `lamSach.ts` chứa `\u0000` thật trong lớp ký tự nên `git diff --cached --stat` báo `Bin 0 -> 5635 bytes`: diff không đọc được, không review được, và file dễ vỡ khi qua công cụ khác (đúng họ với bẫy 12 byte NUL của `renderWordCore.ts`). QUY TẮC: trong regex luôn dùng mã thoát `\uXXXX` chứ đừng dán ký tự vô hình vào mã nguồn. Kiểm nhanh sau khi ghi file: `git diff --stat` thấy `Bin` là hỏng. *(2026-08-03)*

- **Đừng nhúng script Node nhiều lớp escape vào `bash -c`** — `node -e "…\\u200B…"` qua hai lớp bóc dấu (bash rồi JS) ra kết quả khác hẳn ý định; script chạy "thành công", in ra số liệu, mà file không hề đổi. Mất một lượt mới phát hiện. Dùng heredoc `python - <<'PY'` (nháy đơn nên không bóc gì) hoặc ghi hẳn ra file `.js` rồi `node file.js`. Và luôn **đọc lại đúng dòng vừa sửa** để xác nhận, đừng tin dòng log của chính script. *(2026-08-03)*

- **Prompt tự mâu thuẫn thì AI tuân theo luật BẮT BUỘC, không theo nhãn mô tả** — Phần I được truyền giáo án kèm biên bản gắn nhãn "(đối chiếu)", trong khi `LUAT_CHUNG` dán đầu MỌI phần ghi luật bắt buộc số 1: *"mọi bằng chứng phải trích nguyên văn từ biên bản"*. AI trích biên bản là đúng chữ. Bài học: khi một tham số đổi theo ngữ cảnh (nguồn minh chứng theo từng phần) thì **phải tham số hóa cả luật**, đừng chỉ đổi dữ liệu truyền vào. Gỡ dữ liệu mà quên luật thì AI mất nguồn hợp lệ và trả `null` hàng loạt — hỏng theo kiểu khác. *(2026-08-03)*

- **Người dùng nói "hình như theo quy định…" là tín hiệu PHẢI tra tài liệu gốc, không phải để gật** — GV hỏi có phải mỗi minh chứng chỉ được thuộc một tiêu chí. Tra `Nguyên tắc chấm điểm Danielson - Tổ Toán.docx` thì ngược lại: chữ "bảng con" được dùng làm minh chứng cho **cả 3C lẫn 3D**, và tài liệu ghi "TÍCH LŨY MINH CHỨNG (đếm số lượng)". Gật theo là bẻ gãy hai tiêu chí. Nỗi lo thật của họ có cơ sở nhưng đặt sai chỗ — rủi ro là *một quan sát mỏng đỡ điểm cho nhiều tiêu chí*, nên hàng rào đúng là "mỗi tiêu chí phải có ít nhất một trích dẫn nói trúng hành vi của chính nó". *(2026-08-03)*

- **Tự động hóa trên hồ sơ đánh giá CON NGƯỜI phải chia tầng theo mức can thiệp** — yêu cầu "app tự vá nội dung biên bản" gộp ba thứ khác hẳn nhau về đạo đức: (A) dọn ký tự rác — máy móc, tự làm được; (B) sửa chính tả — đổi chữ là có thể đổi nghĩa ("chưa" ↔ "chứa"), phải có người duyệt; (C) điền chỗ trống — ô trống là DỮ KIỆN ("chưa ghi nhận được"), điền vào là bịa bằng chứng chấm đồng nghiệp, và mâu thuẫn thẳng luật đã có trong `phanTich.ts`. Với tầng B, hàng rào nằm ở **bộ lọc đầu ra của AI** chứ không phải ở prompt: loại thẳng đề xuất đổi số từ, lệch quá 2 ký tự/từ, hay trích đoạn không có thật trong ô. Và giao diện **không được tick sẵn** — chọn sẵn hộ là biến "có duyệt" thành "tự áp". *(2026-08-03)*

## QA infrastructure — xử lý báo cáo audit từ agent khác (2026-08-04)

- **Test bảo mật xanh ngay lần đầu là tín hiệu ĐÁNG NGHI, không phải đáng mừng** — 150 ca rules mới viết mà 185/185 xanh ngay lượt chạy đầu thì chưa chứng minh được gì: một `assertFails` có thể xanh vì request sai định dạng, chứ không phải vì rules chặn đúng. Cách kiểm rẻ nhất là **đột biến**: nạp bản `firestore.rules` ĐÃ VÁ thử vào emulator rồi xác nhận đúng những ca `[LỖ HỔNG]` đó chuyển sang DENY. Làm thế mới biết ca test có răng. Ở đợt này nó bắt được ngay một ca "vô dụng". *(2026-08-04)*

- **`.replace()` chuỗi nhiều dòng lên file CRLF thất bại IM LẶNG** — `firestore.rules` lưu CRLF, chuỗi template trong `.mjs` dùng LF, nên phép thay thế nhiều dòng không khớp và trả về nguyên văn không báo lỗi. Kết quả: script tưởng đã vá 3 chỗ nhưng chỉ vá được 2, rồi kết luận sai rằng một ca test là vô dụng. QUY TẮC: `readFileSync(...).replace(/\r\n/g, '\n')` trước mọi phép so khớp nhiều dòng, VÀ luôn khẳng định số phép thay thế thực sự áp được (`if (sau === truoc) throw`) thay vì tin là nó chạy. Cùng họ với bẫy escape nhiều lớp ở trên. *(2026-08-04)*

- **Báo lỗi từ agent khác phải kiểm từng dòng, kể cả khi phần gốc đúng** — bản audit QA của codex chẩn đoán đúng `test:e2e` hỏng, nhưng sai hai chi tiết: (a) xếp nó vào diện "false PASS" trong khi nó exit 1, fail cứng — false PASS nằm ở chỗ khác (`run_test.js` skip-rồi-báo-thành-công); (b) coi việc `vitest.config.ts` loại `tests/rules/**` là "hệ quả cần sửa", trong khi đó là chủ ý đã ghi chú sẵn ở dòng 9-11, sửa vào là làm `npm run test` đỏ khi máy không có Java. Đúng họ với ca `mathStandards.test.ts` ngày 2026-07-31: **bản báo lỗi chẩn đoán đúng phần gốc vẫn kèm chi tiết sai**. *(2026-08-04)*

- **Tài liệu QA không bắt được lỗi nào — đừng đổi công sức lấy giấy tờ** — bản audit đề xuất 7 file tài liệu mới, 1 dependency E2E, 5 npm script và ma trận phủ 20 module. Thứ duy nhất thật sự chặn được thiệt hại là mở rộng `tests/rules/`: chạy trên emulator, không đụng production, không thêm dependency, và **tự phơi ra ba lỗ hổng** mà HANDOFF chỉ mới chép thành checklist. Thêm Playwright thì ngược lại: dependency nặng đổi lấy một smoke test "trang tải không lỗi console" — thứ đã kiểm được bằng mắt. Khi nhận một danh sách việc dài, hỏi trước: *mục nào trong này thực sự làm hỏng-thì-biết?* *(2026-08-04)*

## TDS DOCX fidelity (2026-08-17)
- Khi người dùng yêu cầu bám mẫu giáo án, không được tạo template tổng quát: phải phân tích trực tiếp DOCX canonical ở khối 10/11, giữ cấu trúc section, table, style, lề và nhịp hoạt động; kiểm tra số bảng/OMML trước khi bàn giao.
- Trước khi thay bản cũ, phải tạo bản nháp riêng, đối chiếu trực quan/nội tại với mẫu và chỉ đặt bản đạt vào thư mục tuần tương ứng.


## TDS production pipeline — pre-batch 2026-08-19

- DOCX có tên tiếng Việt phải được đọc qua bản sao tạm ASCII khi gọi công cụ ZIP trên Windows; checksum luôn tính trên exact DOCX gốc.
- Timeline parser chỉ nhận interval trong ngữ cảnh thời lượng/cột Thời gian thực và phải loại period ID, tên file, handoff liên tiết; interval lặp do bảng/paragraph cần được merge trước khi kiểm coverage.
- Production gates phải chuẩn hóa Unicode minus và dấu phân cách số trước khi kiểm mathematical core; không dùng literal token brittle.
- `Môn học = TDS` của P52–P54 được giữ vì PPCT source là TDS, subject rỗng và `isElective=true`; không suy diễn thành Toán từ tên Unit Plan.
- Chỉ promote DOCX khi verifier `overall_pass=true`; raw/debug/report không được copy vào thư mục bàn giao.

## 2026-08-20 — Source validation và canonical identity
- Không được coi `ppct_record_id`, `previous_lesson`, `next_lesson` hoặc `unit_plan_location` là hợp lệ chỉ vì chuỗi không rỗng; phải resolve tới record/slot/heading thật và đối chiếu grade/week/period/subject/isElective.
- `required_concepts`, `required_tasks` và `benchmarks` là ba nhóm core độc lập; report riêng từng nhóm thiếu và fail-closed khi một nhóm thiếu.
- Promotion phải dùng canonical lesson ID đầy đủ (`g10_w08_p055`, `g11_w12_p...`); bare period chỉ là định danh mơ hồ vì các khối có thể trùng số tiết.
- Generalization test phải phân biệt lỗi verifier với lỗi chất lượng DOCX lịch sử; không nâng case lịch sử thành GOLD.

## Lớp học · học sinh (2026-08-20)

- **Đừng kết luận đang đăng nhập tài khoản nào từ tên hiển thị trên header** — tôi thấy "Vũ Việt Cường / Giáo viên" rồi báo với owner là tab đang mở tài khoản Google thật, và tự chặn mọi thao tác ghi. Thực ra đó chỉ là `data.authorName` đọc từ localStorage; phiên thật là mock demo offline (`uid: 'demo-agent-001'`) do Anonymous Auth chưa bật. Cách kiểm đúng, rẻ và chắc: đọc `indexedDB` kho `firebaseLocalStorageDb` — rỗng nghĩa là **không có phiên Firebase nào**, mọi lệnh Firestore sẽ `permission-denied`. Dấu hiệu đi kèm: `lessonPlans` đọc được (rule chỉ đòi `request.auth != null`... nhưng vẫn hỏng nếu không auth) trong khi `userSettings` ghi hỏng. *(2026-08-20)*

- **Mã sinh tự động phải hợp lệ với chính bộ ký tự mình vừa định nghĩa** — `createJoinCode` cố ý loại `0 O 1 I L 5 S 8 B` cho dễ đọc to trong lớp, nhưng fixture test lại dùng `'ABCDEF'` (có `B`) nên `isValidJoinCode` trả false và test đỏ. Test bắt được lỗi của chính test — đó là dấu hiệu tốt. Khi định nghĩa bảng chữ cái hạn chế, sinh luôn fixture từ bảng đó thay vì gõ tay. *(2026-08-20)*

- **PIN/bí mật phải nằm ở DOCUMENT RIÊNG, không nằm chung document với dữ liệu hiển thị** — Firestore rules chặn được cả document chứ không giấu được từng trường. Để giáo viên đọc được danh sách học sinh mà không đọc được PIN, PIN phải ở `classes/{id}/studentSecrets/{studentId}` với `allow read, write: if false` (chỉ Admin SDK vào được). Cùng lý do, danh sách học sinh KHÔNG mở cho người chưa đăng nhập dù biết mã lớp — màn "chọn tên mình" phải đi qua server, nếu không ai có mã lớp cũng lấy trọn danh sách tên trẻ em. *(2026-08-20)*

- **Dữ liệu cá nhân của học sinh nằm trong thư mục repo phải vào `.gitignore` NGAY, và pattern phải dùng wildcard** — file danh sách lớp của trường chứa họ tên, email kèm mật khẩu mặc định, tên/SĐT phụ huynh, địa chỉ nhà. Repo đang có 272 mục untracked nên một lệnh `git add -A` là đẩy hết lên GitHub. Tên thư mục tiếng Việt lưu dạng NFD nên pattern gõ tay bằng NFC KHÔNG khớp — phải viết `Danh s*ch l*p d*y*/` rồi xác nhận bằng `git check-ignore -v "$(ls -d Danh*/)"`. *(2026-08-20)*


## 2026-08-20 — False negative ở gate đồng bộ Activity–Phiếu–Teacher Key

Một gate content có thể tạo **false negative** nếu chỉ kiểm presence của các đáp án mong đợi mà không kiểm cấu trúc vùng văn bản hoặc không tạo fixture mismatch thực sự. Với các contract kiểm đồng bộ giữa Activity, Phiếu học sinh và Teacher Key, verifier phải fail-closed khi thiếu marker đầu/cuối của từng section; fixture âm phải làm lệch một giá trị ở đúng một vùng, để chứng minh gate phát hiện `activity` khác `teacher_key` thay vì chỉ kiểm forbidden text.

Quy tắc áp dụng: `activity_teacher_key_math_consistency_pass` chỉ PASS khi Activity, Student Worksheet và Teacher Key đều được cắt đúng vùng; mọi required answer phải xuất hiện đúng ở các vùng được chỉ định; forbidden text không xuất hiện; và fixture mismatch độc lập phải FAIL. Khi sửa lỗi nội dung Toán, phải regenerate từ generator/rule, cập nhật lesson map/contract, render exact DOCX và chạy lại cả positive lẫn negative regression.

## Lỗi "Đồng bộ thất bại" — batch write và rules (2026-08-20)

- **Firestore chấm TỪNG phép ghi trong một batch dựa trên trạng thái database TRƯỚC batch** — nên ghi document cha và document con trong cùng một `writeBatch` sẽ hỏng nếu luật của con phải `get()` document cha. Ca thật: `migrateLegacyClasses` ghi `classes/{id}` và `classes/{id}/students/{id}` chung một batch; luật của `students` là `laChuLop(classId)` → `get()` vào chỗ trống → **cả batch bị deny**, người dùng thấy "Missing or insufficient permissions". Cách sửa: **hai giai đoạn**, commit cha xong rồi mới commit con. *(2026-08-20)*

- **35 ca test rules xanh vẫn không bắt được lỗi này, vì test dựng kịch bản KHÁC thật** — mọi ca đều `beforeEach` tạo sẵn document lớp rồi mới thử ghi học sinh, tức luôn ở trạng thái "cha đã tồn tại". Đường thật thì cha và con sinh ra cùng lúc. QUY TẮC: khi viết test rules cho một luồng ghi, phải mô phỏng đúng **thứ tự và cách gói** mà code thật dùng (batch hay từng lệnh, cùng lúc hay tuần tự), không chỉ mô phỏng quyền. *(2026-08-20)*

- **Dải nhắc hiện đúng số liệu là bằng chứng rules ĐÃ deploy** — trước khi nghi "chưa deploy rules", nhìn xem có phép ĐỌC nào đang chạy được không. Ở ca này banner hiện "3 lớp chưa đồng bộ", tức truy vấn `list` trên `classes` đã qua rules, nên lỗi chắc chắn nằm ở phép ghi chứ không phải ở việc deploy. Chẩn đoán sai chỗ này là đi deploy lại rồi vẫn hỏng. *(2026-08-20)*

- **Phép chuyển dữ liệu nhiều giai đoạn phải TỰ VÁ được khi hỏng giữa chừng** — bản đầu bỏ qua lớp đã tồn tại, nên nếu giai đoạn 1 xong mà giai đoạn 2 hỏng thì lớp nằm đó rỗng học sinh và bấm lại cũng không cứu. Sửa: giai đoạn 2 ghi cho MỌI lớp (id cố định nên ghi lại vô hại), và phép đếm "chưa đồng bộ" phải đếm cả lớp đã lên nhưng rỗng học sinh — nếu không thì dải nhắc tắt và người dùng mắc kẹt không có nút nào để sửa. *(2026-08-20)*

## TDS CIS/HQT — Color coding evidence

- **Color-code phải áp dụng ở cấp câu evidence trong tiến trình, không chỉ đổi màu nhãn** — [PHÂN HÓA], [ĐGTX], [CÔNG DÂN SỐ], [CÔNG DÂN TOÀN CẦU] và toàn bộ câu minh chứng phía sau nhãn phải cùng màu chữ; phần Toán/routine còn lại giữ màu đen. Không tô nền cả hoạt động dài. Nếu hai evidence chồng nhau, tách thành hai câu có nhãn riêng. Bảng MINH CHỨNG HQT/CIS chỉ là index, không thay cho evidence inline. Rule of 3 áp dụng tối thiểu 3 evidence explicit/tuần cho Differentiation và Formative Assessment; DC/GC theo dõi 2–3 lessons/tuần qua Weekly CIS Evidence Map. *(2026-08-20)*

- **Danielson 1a–1f chỉ là working operational mapping** — ghi vị trí/minh chứng tương ứng, không gọi là rubric PR chính thức của tổ; mapping phải bao phủ content/pedagogy, students, outcomes, resources, coherent instruction và assessment. *(2026-08-20)*


## Layout fidelity — 2026-08-20

Khi người dùng yêu cầu đồng nhất theo mẫu Toán local, không được coi việc có cùng thứ tự nội dung là đủ. Baseline phải được kiểm ở cả ba tầng: tên tiêu đề và header metadata; các dải màu/section heading và bảng mục tiêu 3 mức; mật độ lời thoại, bảng 3 cột hoạt động và cách trình bày bảng CIS/HQT. Không đưa artifact nội bộ như `PPCT local`, `CANDIDATE — STAGING ONLY`, `CIS_EVIDENCE_GAP` hoặc trạng thái `pass` vào DOCX final. Mọi thay đổi layout phải regenerate ở staging, render trực quan và chỉ promotion sau khi người dùng duyệt.

## Gọi Gemini 2.5 — trần token và finishReason (2026-08-20)

- **`maxOutputTokens` của Gemini 2.5 tính CẢ token "suy nghĩ" của model** — đặt 2048 cho tác vụ giải cả một đề thì phần suy nghĩ ăn gần hết ngân sách, câu trả lời thật bị cắt cụt hoặc rỗng. Ngân sách phải theo ĐỘ DÀI ĐẦU RA THẬT của từng tác vụ: chấm một bài ~4k, sinh bài luyện ~6k, giải cả đề ~16k. Ca thật: người dùng bấm "Để AI giải đề" và nhận về `AI không trả về JSON hợp lệ`. *(2026-08-20)*

- **Không đọc `finishReason` thì MỌI trục trặc đều hiện ra thành lỗi đọc JSON** — response bị cắt vì `MAX_TOKENS` để lại chuỗi thiếu dấu `}`, regex `\{[\s\S]*\}` không khớp, và nơi gọi báo "không trả về JSON hợp lệ". Đổ oan cho khâu đọc trong khi thủ phạm là ngân sách token. QUY TẮC: mọi lời gọi LLM phải đọc `finishReason` và dịch sang câu nói ĐÚNG nguyên nhân (`MAX_TOKENS` / `SAFETY` / `RECITATION`) TRƯỚC khi thử phân tích nội dung. *(2026-08-20)*

- **Bật `responseMimeType: 'application/json'` khi cần JSON** — model bị ràng buộc trả JSON hợp lệ, khỏi bọc ```json và khỏi thêm lời dẫn. Rẻ hơn nhiều so với đi vá regex bóc JSON. *(2026-08-20)*

- **Thông báo lỗi hiện cho người dùng cuối không được viết bằng tiếng lập trình viên** — giáo viên đọc "AI không trả về JSON hợp lệ" rồi hỏi lại "lỗi jason gì này". Chính câu hỏi đó là bằng chứng thông báo viết hỏng. Lỗi kỹ thuật thì log cho lập trình viên, còn màn hình phải nói người dùng làm gì tiếp. *(2026-08-20)*

## Truy vấn Firestore và index tổ hợp (2026-08-20)

- **Index tổ hợp 3 trường KHÔNG phục vụ được truy vấn 2 trường cùng họ** — đã khai `assignments: classId + isOpen + createdAt` cho truy vấn phía học sinh, rồi tưởng truy vấn phía giáo viên `where(classId) + orderBy(createdAt)` dùng ké được. Không: Firestore đòi đúng cặp `classId ASC, createdAt DESC`, thiếu là cả truy vấn hỏng. Người dùng giao bài xong mở ra thấy bảng trống. QUY TẮC: mỗi cặp `where + orderBy` là MỘT index riêng, đếm đủ từng đường gọi chứ đừng suy ra từ index đã có. *(2026-08-20)*

- **Với tập kết quả nhỏ, bỏ `orderBy` rồi sắp xếp trong máy là lựa chọn tốt hơn index** — vài chục bài giao mỗi lớp thì sắp xếp trong JS không đáng kể, đổi lại bớt được một index phải khai, phải deploy, phải nhớ giữ đồng bộ, và phải chờ Firestore dựng xong. Chỉ giữ `orderBy` phía máy chủ khi thật sự cần `limit` trên tập lớn. *(2026-08-20)*

- **`.catch(() => [])` và `.catch(console.error)` trong hàm nạp dữ liệu là bẫy chẩn đoán** — lỗi thiếu index bị nuốt, giao diện hiện "chưa có bài nào" y hệt lúc thật sự chưa có bài. Người dùng tưởng dữ liệu không được lưu, còn mình đi tìm nhầm chỗ. Hàm nạp dữ liệu phải phân biệt được BA trạng thái: đang tải, rỗng thật, và hỏng — trạng thái hỏng bắt buộc hiện nguyên văn lỗi ra màn hình. *(2026-08-20)*

## Firestore chấm luật cho TRUY VẤN, không chấm từng document (2026-08-21)

- **Firestore đòi truy vấn TỰ CHỨNG MINH được là thoả luật — nó KHÔNG lọc bớt document không được phép.** Luật `allow list: if resource.data.teacherId == request.auth.uid` mà truy vấn lại là `where('classId','==',X)` thì bị từ chối thẳng với `Missing or insufficient permissions`, dù mọi document trả về đều có `teacherId` đúng. Phải đưa chính điều kiện của luật vào truy vấn: `where('teacherId','==',uid) + where('classId','==',X)`. QUY TẮC: mỗi trường mà luật `list` kiểm tra PHẢI xuất hiện thành ràng buộc bằng nhau trong truy vấn. *(2026-08-21)*

- **Toàn ràng buộc bằng nhau thì KHÔNG cần index tổ hợp** — Firestore tự trộn các index một trường. Nên thêm `where('teacherId')` để qua luật là miễn phí về index; chỉ khi thêm `orderBy` hoặc so sánh khoảng mới phải khai index. Đây là lý do nên sắp xếp trong máy với tập kết quả nhỏ. *(2026-08-21)*

- **Chẩn đoán sai vì đoán thay vì tái lập** — thấy bảng trống, tôi kết luận "thiếu index tổ hợp" dựa trên suy luận, sửa theo hướng đó, báo người dùng là đã xong. Người dùng mở lên vẫn hỏng, và thông báo lỗi thật lại nói `permissions` chứ không phải index. QUY TẮC: trước khi tuyên bố nguyên nhân, phải TÁI LẬP được lỗi bằng test chạy thật trên emulator. Suy luận từ đọc code không đủ, kể cả khi nghe rất hợp lý. *(2026-08-21)*

- **Test rules phải chạy ĐÚNG truy vấn client gọi, không phải truy vấn tương đương về mặt quyền** — bộ 35 ca cũ toàn dùng `where('teacherId')` nên xanh hết, trong khi app thật gọi `where('classId')` và hỏng. Cách phòng: liệt kê mọi `getDocs(query(...))` trong `src/` rồi dựng một ca test cho từng cái, sao chép nguyên hình dạng truy vấn. *(2026-08-21)*

## Ghi được mà không đọc lại được (2026-08-21)

- **Mỗi màn hình GHI dữ liệu phải có màn hình ĐỌC tương ứng, dựng cùng lúc.** Form giao bài có 6 ô nhập và 3 nút AI; phần hiển thị bài đã giao chỉ có MỘT dòng chữ. Giáo viên giao bài xong không mở lại xem được đề, đáp án, hướng dẫn chấm — cũng không sửa, không xoá được. Phép thử trước khi coi là xong: *"Người dùng vừa lưu thứ này xong, mai họ mở lại xem và sửa bằng cách nào?"* Chưa trả lời được là chưa xong. *(2026-08-21)*

- **Hàng rào an toàn phải kiểm được ở MỌI thời điểm, không chỉ lúc tạo.** Tôi bắt "đáp án AI giải ra phải để giáo viên soát" rồi làm hệ thống mà soát xong bấm Lưu là không mở lại được. Hàng rào chỉ tồn tại đúng một khoảnh khắc thì trên thực tế không tồn tại. Nếu đã tuyên bố "con người phải duyệt", đường duyệt lại phải mở vĩnh viễn. *(2026-08-21)*

- **Công sức bỏ ra đang tỉ lệ với ĐỘ THÚ VỊ của bài toán, đáng lẽ phải tỉ lệ với TẦN SUẤT người dùng chạm vào.** "AI tự giải đề" hay nên được prompt riêng, test riêng, dải cảnh báo riêng. "Dòng hiển thị bài đã giao" nhạt nên đúng là một dòng. Giáo viên chạm vào cái nhạt mỗi ngày. *(2026-08-21)*

- **938 unit test xanh mà không bắt được lỗi nào người dùng gặp** — vì tôi chọn phép kiểm theo cái nào DỄ VIẾT, không theo cái nào giống việc người dùng làm. Test hàm thuần rẻ nên viết được 938 cái; phép kiểm đắt và phiền (tạo lớp → giao bài → xem lại → nộp → chấm) thì né mọi lần, và toàn bộ lỗi đến tay người dùng đều nằm đúng ở đó. Có sẵn phiên trình duyệt thật của người dùng mà chỉ dùng để tra dữ liệu, không dùng để đi thử luồng. *(2026-08-21)*

## Quyền push của app OpenCode (2026-08-22)

- **"Không tự push" không có nghĩa là cấm push** — app phải cho phép commit/push khi người dùng yêu cầu hoặc bấm nút xác nhận. Chỉ tự động dừng trước bước push; vẫn phải stage đúng file của task, không dùng `git add .` để kéo theo thay đổi ngoài phạm vi. *(2026-08-22)*

## Soạn lại giáo án theo mẫu thay vì vá bản cũ (2026-08-22)

- Khi người dùng xác nhận muốn “soạn giáo án theo mẫu Ban Toán” và không cần bản cũ để đối chiếu, phải coi đó là yêu cầu thay thế artifact: dựng staging từ mẫu chuẩn, backup trước, rồi promotion đúng danh sách file; không tự sửa cấu trúc cũ hoặc chạm `src/`/PPCT JSON nếu không được yêu cầu.
- XML pass chưa đủ cho DOCX: phải render từng file vào thư mục riêng, kiểm đủ số trang và xem hình đại diện/contact sheet; nếu font ảnh làm glyph thành ô vuông thì sửa asset trước khi promotion.

## PIN học sinh — "bảo mật hơn nhu cầu" là tự làm khó người dùng (2026-08-22)

- **Thiết kế hash-only cho mã 4 số khiến giáo viên không xem lại được PIN, user phải yêu cầu ba lần mới nghe** — lần đầu tôi thay bằng nút "cấp lại", user nhắc lại; lần hai tôi vẫn giữ hash-only và chỉ đổi chỗ nút, user bực: "sao ấn vào nó lại hiện đổi mã PIN? Tôi muốn NHÌN THẤY mã pin hiện tại". Sự thật kỹ thuật: scrypt băm mã 4 số KHÔNG chống nổi vét cạn (10.000 khả năng), giá trị thật của hash chỉ là không lộ trong console DB — lưu thêm bản thô (`pinPlain`) cạnh hash trong `studentSecrets`, trả về qua API xác thực chủ lớp (`viewPin`), client vẫn bị rules chặn đọc trực tiếp. Rủi ro cộng thêm ~0, giá trị sử dụng lớn (GV phát mã, hỗ trợ học sinh quên mã ngay tại lớp). QUY TẮC: (1) cân bằng bảo mật theo GIÁ TRỊ THỰC của bí mật — mã 4 số dùng trong lớp học không phải mật khẩu ngân hàng; (2) khi user yêu cầu một hành vi mà thiết kế hiện tại chặn, đừng chỉ giải thích giới hạn rồi vá quanh — hỏi lại "chủ dự án có chấp nhận đánh đổi này không", được chốt thì sửa TẦNG LƯU TRỮ chứ đừng vá UI; (3) mã cấp trước ngày chuyển đổi không đọc ngược được → UI phải có đường mời cấp lại một lần.

## 2026-08-22 — Kịch bản giáo án phải bắt đầu từ trạng thái lớp thực tế

- Khi thiết kế tiết học có bảng trắng, TV và thiết bị học sinh, không được ngầm giả định bảng đã được viết sẵn hoặc tài nguyên đã mở sẵn nếu người dùng không nói như vậy. Phải nêu rõ trạng thái ban đầu, kể cả bảng lớn/bảng phụ đều trắng.
- Mỗi công cụ phải có chỉ dẫn vận hành cụ thể: ai thao tác, hiển thị/viết nội dung gì, ở mốc nào, mất bao lâu, chuyển sang trạng thái nào, học sinh ghi gì vào vở và người dự giờ thu được minh chứng gì.
- Nếu giáo án dành cho một giáo viên bất kỳ, phải có kịch bản thực chiến theo thời gian, bao gồm lời dẫn then chốt, thứ tự viết bảng, nội dung TV, nội dung thiết bị, nội dung vở và phương án dự phòng; không chỉ mô tả ý tưởng hoặc danh sách tài nguyên.

## 2026-08-22 — Cột GV–HS phải là kịch bản dạy học, không phải nhãn minh chứng

- Có WALT/WILF, bảng CIS và một dòng `CIS-NEO` chưa chứng minh giáo án đã dạy được; nếu cột `Giáo viên và Học sinh` không ghi lời GV, câu hỏi cụ thể, phản hồi dự kiến, thời gian chờ, lỗi và hành động tiếp theo thì người dạy vẫn không thể cầm vào dạy.
- Khi bám mẫu Ban Toán, phải đối chiếu trực tiếp mật độ lời thoại và chuỗi câu hỏi của giáo án Khối 10, đặc biệt các câu có nhãn `[PHÁT HIỆN]`, `[SO SÁNH]`, `[SUY LUẬN]`, `[KHÁI QUÁT]`, `[PHẢN BIỆN]`, `[SÁNG TẠO]`; không dùng câu hỏi chung chung thay cho câu hỏi gắn với dữ kiện của tiết.
- Mỗi cụm hỏi phải thể hiện quy trình hỏi một câu/lần, chờ ít nhất 3 giây, gọi ngẫu nhiên, hỏi đào sâu và chuyển lượt cho HS khác; câu phản biện/sáng tạo cần chờ dài hơn và yêu cầu bằng chứng. Tiết luyện tập phải nói rõ dấu hiệu chọn chiến lược và dùng đủ 4 bước Polya; tiết hình thành kiến thức phải cho HS tự rút ra quy tắc trước khi GV chuẩn hóa.

## 2026-08-22 — Không tự thêm thiết bị hoặc học cụ chưa được người dùng xác nhận

- Người dùng xác nhận lớp chỉ có TV, bảng lớn, bảng phụ, thiết bị cá nhân và vở; không có bảng con. Không được suy diễn "bảng con" từ giáo án mẫu hoặc biến nó thành đầu ra mặc định của hoạt động. Khi cần phản hồi đồng loạt, phải thiết kế bằng thiết bị cá nhân, vở, bảng lớn/bảng phụ hoặc phương án khác đã được xác nhận.

## 2026-08-22 — Cầu nối CIS phải nhìn thấy được nhưng không biến thành diễn kịch

- Với người dự giờ nước ngoài có phiên dịch, mỗi hoạt động cần một dòng song ngữ ngắn nêu rõ `NOW/ĐANG LÀM`, `PRODUCT/SẢN PHẨM`, `CHECK/KIỂM`, `NEXT/TIẾP`; đây là quy trình dạy học thật, không phải lời dẫn riêng cho quan sát viên.
- Nội dung số phải chỉ ra nguồn, thao tác, cách đối chiếu, cách trích dẫn và bảo vệ dữ liệu; luôn có đường lui bằng vở/phiếu khi mạng hoặc tài khoản không sẵn sàng. Không tự chọn nền tảng online khi chưa có xác nhận về mạng, tài khoản và quyền riêng tư.
- Kiểm XML chưa đủ cho DOCX: sau khi ghi đè phải render toàn bộ, bắt trang trắng và xem mẫu đại diện. Với tài liệu có section ngang/dọc, nhiều kích thước ảnh render có thể là chủ ý; chỉ kết luận lỗi khi có bằng chứng nội dung/bố cục.

## FileList gắn sống với ô input — gốc rễ thật của cả chuỗi "nộp ảnh không được" (2026-08-22)

- **`const files = e.target.files; e.target.value = '';` là XOÁ SẠCH files trước khi kịp dùng** — FileList trả về từ `input.files` là view SỐNG theo control: reset `value` là `length` về 0 ngay, handler sau đó không bao giờ chạy. Đây mới là nguyên nhân "bấm nộp xong không thấy gì" ở cổng học sinh; tôi đã chẩn đoán sai HAI LẦN trước khi người khác soi ra: lần 1 đổ cho storage.rules chặn 6MB/thiếu nén, lần 2 đổ cho thiếu trạng thái xác nhận. Dấu hiệu lẽ ra phơi sớm: user nói "không thấy gì cả" — kể cả thanh tiến trình cũng không hiện nghĩa là HÀM XỬ LÝ chưa từng chạy, chứ không phải chạy mà UI không phản ánh. QUY TẮC: trong onChange của input file, SAO CHÉP `Array.from(e.target.files ?? [])` thành mảng TRƯỚC khi đụng vào `value` (đối tượng `File` độc lập với input nên vẫn dùng tốt); và khi user báo "không có gì xảy ra", kiểm chứng hàm xử lý có được gọi tới không (log đầu hàm) TRƯỚC khi đi soi tầng dưới như rules/mạng.

## 2026-08-22 — Cầu nối CIS song ngữ chỉ thuộc phần ghi bảng

- Không chèn các nhãn/thuật ngữ tiếng Anh vào cột Giáo viên và Học sinh, mục tiêu, học liệu hay bảng minh chứng chỉ để người dự giờ hiểu. Tiếng Anh chỉ xuất hiện trong phần Nội dung ghi bảng/CIS bridge; tên thương hiệu Slido, Padlet, AnswerGarden là ngoại lệ nhận diện công cụ.
- Nội dung ghi bảng phải là kịch bản trình bày có thứ tự: đánh số mục, chỉ rõ nội dung nào chiếu TV, viết bảng lớn, viết bảng phụ, nội dung học sinh ghi vào vở và sản phẩm đưa lên công cụ số. Không dùng một câu “ghi bảng” chung chung thay cho trình tự này.
- Slido là mặc định nhưng luôn phải có fallback offline; Padlet chỉ dùng cho lời giải dài, AnswerGarden chỉ dùng cho từ khóa ngắn. Không tuyên bố đã tạo board online nếu chưa có tài khoản/quyền truy cập thật.
- Hỗ trợ ngôn ngữ phải bắt đầu từ hồ sơ lớp: khối 10 có học sinh Hàn Quốc và học sinh tiếng Việt yếu; khối 11 có học sinh từng sống lâu ở Nhật/Mỹ; khối 12 không có nhóm quốc tịch đặc thù. Điều chỉnh đầu vào/khung diễn đạt/ghép nhóm, không hạ chuẩn Toán và không đồng nhất giao tiếp hằng ngày với tiếng Việt học thuật.
- Giấy A0 đã được người dùng cho phép khi thực sự tăng chất lượng hoạt động nhóm; mỗi lần dùng phải ghi rõ nhóm làm gì, treo/chiếu ở đâu, sản phẩm nào được thu và nếu thiếu A0 thì thay bằng phiếu/vở/bảng phụ thế nào.

## 2026-08-22 — Tuyến hiển thị phải được thiết kế như một phần của hoạt động

- Không chỉ ghi tên công cụ số. Mỗi pha phải nêu rõ TV chiếu gì, màn hình GV điều khiển/duyệt gì, màn hình HS thao tác gì, cách nối HDMI/USB-C hoặc Win+K, cách đưa mã/QR/liên kết cho HS và phương án giấy khi mất mạng/thiếu thiết bị.
- Trên TV chỉ chiếu nội dung chung và kết quả đã ẩn tên/được duyệt; màn hình GV giữ quyền kiểm duyệt; HS luôn giữ bản ghi trong vở/phiếu để công cụ không trở thành điều kiện duy nhất của mục tiêu Toán.
- Slido mặc định cho câu ngắn, Padlet cho lời giải dài, AnswerGarden cho từ khóa; mỗi tiết phải có thẻ vận hành riêng với câu hỏi, bước chuẩn bị, quyền truy cập và hành động sau khi thu phản hồi. Không tuyên bố đã tạo bảng online nếu chưa có tài khoản thật.

## 2026-08-22 — OpenCode phải phân biệt Plan và Build

- `Plan` chỉ dùng để đọc yêu cầu, phân tích và lập kế hoạch; muốn OpenCode sửa/tạo file phải chuyển sang `Build` trước khi gửi lệnh. Không được suy đoán từ tiêu đề phiên hoặc dòng trạng thái mặc định rằng agent đã ở Build; phải kiểm tra mode thực tế trong giao diện.

## 2026-08-22 — Cổng đọc nguồn trước khi sửa hàng loạt giáo án

- Với yêu cầu sửa hàng loạt giáo án, không được coi việc kiểm kê manifest/JSON hoặc đọc prompt cũ là đã hiểu yêu cầu. Phải dừng authoring/staging/promotion, đọc đệ quy nội dung thật của thư mục yêu cầu, PPCT/unit plan, `docs` và các nguồn DOCX/PDF/XLSX/ảnh; sau đó lập ma trận nguồn gồm quy định bắt buộc, ưu tiên khi mâu thuẫn, cách kiểm và điểm chưa rõ. Chỉ khi ma trận hoàn tất mới được lập pilot; nếu nguồn không đọc được hoặc còn mâu thuẫn material thì phải dừng và báo đúng đường dẫn.

## 2026-08-22 — Tách nội dung ghi bảng khỏi kịch bản vận hành

- Cột `Nội dung ghi bảng` chỉ được chứa chữ, công thức, quy trình, tiêu chí và cầu nối CIS thực sự xuất hiện trên bảng; không chèn tuyến TV–GV–HS, mã/QR, màn hình điều khiển, công cụ hay phương án dự phòng vào cột này.
- Kịch bản chi tiết vận hành công cụ, phân tuyến hiển thị, kết nối thiết bị, A0 và fallback phải nằm ở phụ lục cuối để thân giáo án giữ mẫu Ban Toán và dễ đọc khi dự giờ.
- Không khóa hàng hoạt động bằng `cantSplit: true` khi nội dung dài; phải tách chuỗi có dòng mới thành các đoạn Word riêng để tránh khoảng trắng lớn cuối trang và giúp xuống dòng đúng ý.
- Với tiết luyện tập, không ghép động từ mục tiêu với một `focus` vốn đã bắt đầu bằng “Lựa chọn và vận dụng” hoặc “Tự chọn nhiệm vụ luyện tập”; dùng câu mục tiêu độc lập, tránh lặp nghĩa.
- Quy ước màu minh chứng phải được giữ trực tiếp trong giáo án; khi tách dòng, mỗi dòng vẫn phải đi qua bộ nhận diện màu CIS để không biến màu thành chú thích rời.

## 2026-08-23 — Hoạt động Lỗi AI phải dùng thời lượng và khung hiện có

- Khi đưa “Lỗi AI trong tuần” vào 48 giáo án, phải thay một lượt hỏi/phản biện trong P0–P40, không tạo hàng hoặc thời lượng mới. Bản vi mô chỉ cần chỉ ra dòng/điều kiện và một bước sửa; bản đầy đủ mới đi đủ tìm lỗi → phân loại → sửa → phép kiểm → giải thích giới hạn đầu ra.
- PPTX dùng lại slide “Chuỗi câu hỏi và tiến trình” để hiển thị prompt/sản phẩm ngắn; không thêm slide chỉ vì có thêm một hoạt động, tránh làm bộ trình chiếu phình và lệch đặc tả.

## 2026-08-24 — Phân biệt chú giải màu với minh chứng màu thật

- Không được coi việc màu xanh lá chỉ xuất hiện ở chú giải là lỗi nếu tiết đó không có bối cảnh Công dân toàn cầu phù hợp. Contract nguồn quy định Công dân số/Công dân toàn cầu chỉ gán cho tiết thật sự phù hợp; tiết còn lại phải ghi rõ không phải trọng tâm và giữ màu đen.
- Khi QA màu, phải kiểm đồng thời: nhãn + câu evidence + bối cảnh/mục đích Toán + màu run. Không dùng tiêu chí “48/48 có một run xanh lá” vì sẽ ép nội dung ngoài phạm vi.
- Nếu khối ngôn ngữ đã có một bản tóm tắt trong `Phân hóa mục tiêu` và một khối chi tiết riêng, phải giữ một nơi duy nhất; bản chi tiết gồm rào cản, mục tiêu, đầu vào, tương tác, đầu ra, minh chứng tiến bộ, rút dần và phối hợp khi cần.

## 2026-08-24 — Scope QA phải tách giáo án khỏi weekly map

- Một thư mục tuần trong production có thể chứa cả giáo án và file `WEEKLY_CIS_EVIDENCE_MAP_*.docx` cũ. Manifest promotion phải khóa theo mẫu tên giáo án và đếm đúng 8 file mỗi khối–tuần; không để artifact quản trị ngoài phạm vi làm đỏ QA của lô đang sửa.
- Khi hậu kiểm production, dùng chính manifest 48 đường dẫn để audit XML/OMML và đối chiếu SHA; không chạy checker đệ quy trên cả thư mục tuần nếu checker không có bộ lọc artifact.

## 2026-08-24 — Nhãn ngoặc vuông phải đậm tổng quát và render Unicode phải có lớp che chắn

- Khi người dùng yêu cầu bôi đậm mọi nhãn dạng `[ ... ]`, phải nhận diện tổng quát cả nhãn NB/TH/VD, hoạt động, phân hóa, ĐGTX và CIS; chỉ loại trừ ngoặc vuông thuộc biểu thức/LaTeX. Bôi đậm không được làm mất màu run CIS.
- LibreOffice/pdf2image trên Windows có thể làm hỏng tên tạm có dấu như `Tiết_tự_chọn`; QA phải dùng `qa/tools/render_docx_unicode_safe.py`, chuyển cả đầu vào và thư mục render trung gian sang tên ASCII rồi sao chép PNG về thư mục đích.

## 2026-08-24 — Đầu mục ghi bảng phải đậm ở đúng cấp và không kéo công cụ vào bảng

- Khi người dùng yêu cầu cấu trúc I/II/III → 1/2/3 → a/b/c, phải kiểm run Word thực tế của cột `Nội dung ghi bảng`, không chỉ kiểm văn bản có đúng thứ tự; prefix đầu mục phải có `w:b` thật, còn phần giải thích sau dấu hai chấm có thể để chữ thường để bảng không bị nặng.
- Tên công cụ, mã/QR, thiết bị và phương án vận hành chỉ thuộc phụ lục. Nếu một câu hỏi/lỗi/đáp án Toán có nhắc công cụ và được tái sử dụng vào bảng, phải đổi sang diễn đạt toán học thuần túy hoặc chuyển câu đó xuống phụ lục.
- Validator `vietnamese-education-copy` cần chạy trên phần văn bản Word thường; không đưa ký hiệu kết hợp OMML vào cùng lượt kiểm NFC vì sẽ tạo cảnh báo giả cho các toán tử như phủ định quan hệ tập hợp. Cảnh báo LAW001 còn lại cần đọc theo ngữ cảnh Toán, không sửa thuật ngữ “duy nhất”/“tốt nhất” khi đó là nghĩa toán học hoặc yêu cầu phản biện có điều kiện.
- Khi render một lô nhiều file, thư mục ảnh phải khóa theo từng DOCX (không chỉ theo tuần) để tránh ghi đè ảnh và báo cáo giả về số lượng render.

## 2026-08-25 — Số La Mã của bảng phải phản ánh mẫu bảng giáo viên thực sự dùng

- Không tự suy ra cấu trúc bảng từ mạch nhận thức rồi đặt câu hỏi/dữ kiện thành các đầu mục La Mã riêng nếu giáo viên đã có mẫu cố định. Với Ban Toán, phần khởi động và dẫn vào bài để trống; sau đó ghi **Tên bài học → I. Mục tiêu → II. Nội dung → III. Luyện tập → IV. Mở rộng/Vận dụng → V. Sơ kết/BTVN**.
- Câu hỏi định hướng đầy đủ nằm trong I. Mục tiêu; cầu nối CIS song ngữ đặt trong hàng P5–P8 của I. Mục tiêu và giữ ở góc bảng, không đẩy xuống V hoặc tạo thêm đầu mục VIII. Bộ kịch bản khám phá vẫn phải giữ trong cột GV–HS/phụ lục, không đưa vào bảng.

## 2026-08-25 — Ô bảng trống không có nghĩa là ô GV–HS được bỏ kịch bản

- Khởi động và dẫn vào bài chỉ để trống cột `Nội dung ghi bảng`; cột `Giáo viên và Học sinh` vẫn phải có lời dẫn, câu hỏi, chờ, phản hồi dự kiến và hành động tiếp theo.
- Câu hỏi định hướng đầy đủ phải xuất hiện ở kịch bản chuyển tiếp và mục tiêu, được bôi đậm trực tiếp bằng nhãn `[CÂU HỎI ĐỊNH HƯỚNG]`; không rút gọn thành một câu mô tả chung.

## 2026-08-25 — Bảng thực chiến phải phân biệt thứ giáo viên viết với thứ học sinh nhìn/làm

- Khi rà `Nội dung ghi bảng`, phải đứng ở vị trí giáo viên: bảng lớn chỉ giữ mốc học sinh cần chép và dùng để theo dõi mạch bài; đề dài, lời giải mẫu, hướng dẫn vận hành và kết quả công cụ đi qua TV/phiếu/bảng phụ/phụ lục.
- Không được bỏ câu hỏi định hướng hoặc mục tiêu đầy đủ khỏi bảng chỉ vì chúng dài; thay vào đó, giữ nguyên hai mục này ở I. Mục tiêu và thu gọn các mục thao tác còn lại thành đầu mục Bài 1/Bài 2/Bài 3/Bài 4, kèm rõ Phiếu 1/Phiếu 2/A0.
- Contract phải kiểm cả nội dung và tuyến sử dụng thực tế: nguồn đề, nơi HS làm, màn hình nào hiển thị, phương án giấy khi mất mạng; promotion phải audit đúng manifest, vì thư mục tuần có thể chứa tài liệu quản trị cũ ngoài lô.
- **Không biến yêu cầu hình ảnh trong KHDH thành quota số ảnh** — Hình chỉ đạt khi có chức năng trong tiến trình: giúp hình thành khái niệm, tạo dạng bài đọc/chuyển đổi biểu diễn, làm bước đệm, cung cấp bối cảnh CDTC/liên văn hóa/công dân số, hoặc tạo sản phẩm quan sát được. Hồ sơ phải ghi mục đích sư phạm, năng lực hỗ trợ, thời điểm dùng, câu hỏi, thao tác GV-HS và sản phẩm; số hình là hệ quả của thiết kế. Cấm dùng một asset cho nhiều bài khác nội dung. *(2026-09-15)*

## 2026-08-25 — Cầu nối CIS và hỗ trợ ngôn ngữ phải nằm trong luồng hoạt động

- Cầu nối CIS song ngữ phải được đặt trong hàng Xác định mục tiêu P5–P8 của `Nội dung ghi bảng` và giữ ở góc bảng; không giấu ở hàng Sơ kết.
- Hỗ trợ ngôn ngữ chỉ ở Thông tin chung hoặc Phụ lục là chưa đủ: mỗi hàng GV–HS phải có thao tác cụ thể về từ khóa, khung câu, hình/ký hiệu, trao đổi cặp đôi và bản nháp/bản nộp; bảng phụ chỉ giữ bản rút gọn theo pha.
- Khi mục tiêu được yêu cầu vừa ở Thông tin chung vừa ở Nội dung ghi bảng, bộ kiểm phải kiểm sự hiện diện ở hai tuyến thay vì coi lần xuất hiện thứ hai là lỗi lặp.
- Khi promotion dùng Windows PowerShell 5.1 để đọc manifest sinh bởi PowerShell 7, manifest phải ghi UTF-8 BOM để không làm hỏng tên tệp Unicode như `Tiết_tự_chọn`.

## 2026-08-26 — THINK gate phải giữ nguyên cả ở fallback giấy

- Khi thêm AI Error of the Week, không chỉ kiểm UI portal và slide; phải kiểm cả phiếu offline/mẫu ghi vở. Nếu lời giải AI in sẵn trên tài liệu học sinh, học sinh có thể thấy đáp án trước dự đoán và làm hỏng chuỗi THINK → AI → VERIFY.
- Bản học sinh chỉ giữ câu hỏi, lựa chọn dự đoán và căn cứ ban đầu; lời giải đầy đủ chỉ ở teacher key hoặc được GV chiếu sau khi HS đã chốt dự đoán. Đây là chỉnh quyền nhìn thấy thông tin, không thêm pha hay thời lượng.

## 2026-08-27 — Bàn giao V4 giữa tài khoản và agent phải tách pha, khóa đúng worktree

- Khi chuyển sang tài khoản/phiên Claude khác, không dựa vào lịch sử chat; phải đọc lại `AGENTS.md`, đặc tả và kế hoạch bằng đường dẫn tuyệt đối. Đường dẫn worktree đúng là `C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\g10-p31-firestore`, không phải `C:\Users\ADMIN.config\...`.
- Prompt bàn giao phải tách thành hai lượt: lượt 1 chỉ đọc và báo cáo baseline; lượt 2 chỉ bắt đầu Task đã được xác nhận. Không ghép lệnh test trên cùng một dòng hoặc yêu cầu “chưa code” và “code Task 1” trong cùng lượt.
- Claude/OpenCode phải dừng ở từng checkpoint; QA độc lập kiểm tra đúng worktree, branch, base/HEAD, diff và output test trước khi cho phép sang Task kế tiếp. Không push/deploy trước khi có QA sign-off.

## 2026-08-28 — Phân hóa phải được quan sát từ giáo án ra lớp

- Không coi nhãn `[PHÂN HÓA]` hoặc bảng mục tiêu ba mức là đủ: mỗi mức phải gắn với nhiệm vụ, tài nguyên, sản phẩm và thao tác GV quan sát/điều chỉnh ngay trong hàng hoạt động.
- Khi BGH yêu cầu triển khai trong bối cảnh thật, giáo án phải nêu rõ ghép nhóm/cặp có chủ đích, lựa chọn đánh giá formative, phương án B khi lỗi thiết bị/tài khoản và bố trí bàn; các nội dung chỉ nằm ở phụ lục không đủ làm minh chứng nhanh khi dự giờ.

- **Header bảng hoạt động không được đứng mồ côi ở cuối trang** — `keepNext` ở band bên ngoài không đủ giữ hàng tiêu đề của bảng đi cùng hàng dữ liệu đầu tiên. Khi thêm nội dung dài vào cột GV–HS, phải render lại ít nhất một mẫu có nguy cơ tách trang, đặt `keepNext` cho các đoạn tiêu đề trong header bảng, rồi render toàn bộ lô để kiểm không phát sinh trang gần trắng. *(2026-08-29)*

## 2026-08-30 — Pilot V4 phải khóa một nguồn và đồng nhất thuật ngữ

- Khi manifest V4 dùng cùng bài với DOCX, câu hỏi định hướng và thuật ngữ bối cảnh phải lấy từ nguồn `LessonSpec`/hàm sinh chung; không để bản rút gọn hoặc từ đồng nghĩa làm lệch nội dung giữa hai đầu ra.
- P31 dùng đúng `số chiếc bánh`, `số chai nước` và `số lượng đồ vật`; contract xanh chưa đủ nếu render hoặc manifest còn câu chữ gượng, dấu câu kép hoặc thuật ngữ khác nguồn.
- Chỉ kết luận pilot đạt sau khi kiểm riêng: manifest contract, WordXML/OMML, màu nhãn, thứ tự cột ghi bảng, render PNG và build; pilot staging không đồng nghĩa đã promotion 48 bài.

## 2026-08-30 — Mục II phải có kiến thức chép vở và không được phá công thức

- `II. NỘI DUNG` không được chỉ là tiêu đề hoặc khung vận hành: phải sinh từ `boardKnowledge` chuẩn của bài, hoặc từ công thức/quy tắc/điều kiện/phép kiểm của `LessonSpec` để HS có nội dung ghi vở.
- Với tiết luyện tập, HĐ1 phải giữ `III. LUYỆN TẬP → Bài 1 → Bài 2`; không lặp đầu mục khi sang HĐ2. Khung `KIỂM LỖI AI` trong HĐ1 phải dùng số mục tiếp theo, không trùng `4. Chú ý`.
- Không dùng regex sửa lỗi LaTeX có thể chạy xuyên qua ranh giới hai công thức/dòng văn bản. Khi cần phục hồi `\\ne`, phải xác định đang ở trong một đoạn `$...$`; tuyệt đối không biến xuống dòng trước mục `e.` thành ký hiệu Toán.

## 2026-08-30 — Bài lấy từ SBT phải có định danh tra cứu ngay tại đề

- Với mọi bài tập/ví dụ trong 27 tiết Luyện tập, nếu dùng hoặc điều chỉnh từ SBT Ban Toán thì ghi ngay sau đề theo dạng `(bài/câu X SBT trang Y)`; không chỉ ghi chung trong phụ lục.
- Giữ đúng loại định danh của tài liệu: chương dùng `Câu` thì không tự đổi thành `Bài`; câu tự thiết kế không gắn nguồn SBT.
- Contract phải kiểm mỗi tiết có ít nhất một nguồn SBT và số bài/câu, số trang xuất hiện trong DOCX thực tế, không chỉ trong object nguồn.

## 2026-09-01 — Cờ đúng/sai tường minh phải thắng điểm suy ra

- Khi bộ đọc kết quả AI nhận đồng thời `correct: false` và `score` vượt thang, không được dùng phép OR với ngưỡng điểm để đổi cờ thành `true`. Chuẩn hóa cờ boolean trước: boolean thật hoặc chuỗi `true`/`false` đã trim, rồi chỉ suy ra từ điểm khi cờ vắng hoặc không hợp lệ; kẹp điểm là phép xử lý độc lập. Contract phải có cả boolean và chuỗi `false` với điểm vượt thang.

## 2026-09-03 — Firestore undefined: builder canonical phải sạch, đừng dựa vào strip ở tầng ghi

- **`removeUndefinedFields` ở `src/lib/firebase.ts` là hàng rào CHỈ của đường client — đường Admin SDK trong `api/` KHÔNG có nó** — lỗi production `Cannot use "undefined" as a Firestore value (found in field "topics.0.evidenceRefs.0.confidence")` xảy ra vì `normalizeEvidenceRefs()` (origin/main) luôn tạo key optional `assignmentId`/`confidence` kể cả khi `undefined`, rồi `syncApprovedGradeEvidence()` ghi thẳng qua Admin SDK. Cùng builder đó trên đường client lại "sạch" vì `setDoc(removeUndefinedFields(...))` (đệ quy) đã cắt. Bài học: một field optional chỉ được GẮN KEY khi có giá trị hợp lệ (`confidence` giữ 0, loại NaN/Infinity; `assignmentId` bỏ chuỗi rỗng); không được coi lớp strip lúc ghi là hàng rào — thêm defense-in-depth `stripUndefinedDeep` riêng cho server ngay trước mọi `ref.set`. *(2026-09-03)*

- **Test bắt undefined phải quét đệ quy, KHÔNG dùng `JSON.stringify`** — JSON tự bỏ key `undefined` nên test dựa vào nó sẽ xanh dối. Viết scanner đệ quy trả về đường dẫn field (khớp đúng `0.evidenceRefs.0.confidence`), và có test tự-kiểm scanner. Fake Firestore trong test phải `throw` khi gặp `undefined` giống Admin SDK thật, đừng dùng `JSON.parse(JSON.stringify())` (nuốt undefined → test vô dụng). Đột biến (tạm bỏ fix) để xác nhận test đỏ đúng chỗ. *(2026-09-03)*

- **Cùng một lỗi có thể nằm ở hai nhánh cấu trúc khác nhau — grep code cả hai trước khi kết luận vị trí sửa** — `origin/main` có `normalizeEvidenceRefs()`+`buildTopic()` (re-normalize trong builder); nhánh `feat/toan-final-template` đã viết lại thành `normalizeRefs()`+`toTopic()` với `toTopic` là điểm nghẽn ghi DUY NHẤT. Sửa main không tự khớp local; phải xác định điểm nghẽn của TỪNG nhánh (ở local là `toTopic`, sửa 1 chỗ phủ mọi output). Khi hai nhánh diverge, hotfix main không tự sống sót qua merge — phải vá cả hai và giữ builder tương đương. *(2026-09-03)*
## 2026-09-07 - Raw LaTeX/\$ lọt vào DOCX staging: nguyên nhân và cách bắt

- **\\$\\ trong spec là BUG - helper \m()\ đã nén \\$...\$\ sẵn** - Trong \*Specs.ts\, \const m = (latex) => \\\\$\\$\\. Bọc thêm \\$\$\ quanh \m(...)\ (\\$\\$\$\) tạo ra ba dấu \\$\ hai đầu, khiến phần mở rộng chuyển OMML bỏ sót một \\$\ và rò \\$\/LaTeX thô vào \w:t\ của DOCX. Đã sửa ở \sb11RG11B06ASpecs.ts:195,233\ và \sb11RG11B06BSpecs.ts:229\. Quy tắc: chỉ dùng \m()\ một lớp; \\$\$\ chỉ xuất hiện trong định nghĩa helper, không bao giờ trong nội dung. *(2026-09-07)*
- **LaTeX mất cân bằng ngoặc (\\\frac{2}{x\ thiếu \}\, \\\sqrt{10}}\ thừa \}\) làm converter bỏ OMML hóa → chuỗi LaTeX thô nằm nguyên trong \w:t\** - Kiểm lỗi: \\\frac{2}{x\ (thiếu \}\) tại \sb11RG11B06CSpecs.ts:62\; \\\sqrt{10}}\ (thừa \}\) tại \ASpecs.ts:299\; \\\text{...}}\ (thừa \}\) tại \DSpecs.ts:399\. Cách chẩn: mở DOCX, scan \w:t\ bằng regex cấm (\\\\$|\\\\(?:frac|sin|sqrt|text|...)}\b\); regex scanner Python phải khớp \\\\\\ → \\\\\\ (một backslash literal) trong chuỗi \-c\ của PWSh: viết \'\$|\\\\(?:...'\ đúng 2 backslash, không \\\\\\ (4 backslash). *(2026-09-07)*

## 2026-10-16 - Monitor job production im lặng vì lệnh đọc log hỏng

- **Monitor phải tự báo khi lệnh đọc thất bại, không chỉ khi có dòng khớp** - `gh api .../jobs/{id}/logs` từ chối in vì log có ký tự điều khiển ANSI ("terminal escape sequences"), `2>/dev/null` nuốt lỗi, grep ra rỗng → monitor im 30 phút trong khi job refresh chạy 243 bài lỗi liên tiếp mà không ai hủy. Quy tắc: (1) chạy thử lệnh đọc một lần bằng tay trước khi đưa vào monitor; (2) dùng `gh run view --log` hoặc thêm `--allow-escape-sequences`; (3) lệnh rỗng/lỗi phải in dòng "READ FAILED"; (4) với job tốn tiền AI, thêm điều kiện dừng theo tỉ lệ lỗi (vd 3 bài lỗi liên tiếp → hủy run + pause job). *(2026-10-16)*
