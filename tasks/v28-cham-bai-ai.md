# V28 — AI chấm bài tự luận: nền "nộp là hoàn thành" + công tắc AI chấm rộng

> Chốt với user 23/10/2026: không để GV chấm tay hàng "Chờ chấm". Hướng B làm nền (bài luyện tập nộp là hoàn thành, AI chỉ nhận xét) + công tắc A (AI chấm cả bài luyện tập) trong cấu hình tiết học. Key AI trên site thật CHƯA cấu hình — cần hướng dẫn dán key Gemini.

## 1. Hiện trạng đã kiểm (file:line, branch universal-content-release)

- **Hạ tầng AI server đã có sẵn, bền vững về kiến trúc**:
  - `lib/ai-settings.js` — key lưu DB `system_settings['lesson_ai']`, KHÔNG bao giờ trả về browser (chỉ 4 số cuối). Endpoint + model **cấu hình được**: mặc định `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` + `gemini-flash-latest` (chuẩn OpenAI-compatible — OpenRouter cắm được bằng cách đổi endpoint/model, không sửa code). Có `testAI()` health-check, env override `LESSON_AI_API_KEY`.
  - UI cấu hình: `components/AISettingsCard.tsx` ↔ `/api/ai-settings`, mount ở `app/lessons/page.tsx` + `app/exams/page.tsx`.
- **AI chấm tự động ĐÃ chạy cho vé ra cửa**:
  - Route `app/api/lesson-sessions/assessment/route.js` — action `preview` / `propose` / `automatic` (batch ≤20, idempotent theo requestId, chống replay).
  - `lib/lesson/assessment-ai.js` — snapshot: mỗi learner×task mới nhất, **redact tên HS → [HS]** trước khi gửi AI, bắt buộc rubric criteria, kiểm kích thước batch ≤128KB. Job lưu bảng `lesson_assessment_jobs`.
  - `components/lesson/LearningEvidencePanel.tsx:44-53` — useEffect **tự gọi `automatic`** khi có phiếu pending; thông báo "N phiếu đã được AI chấm tự động / M phiếu cần giáo viên rà soát". Nguyên tắc hiện có: "Kết quả AI được ghi tự động khi đủ tin cậy; kết quả mơ hồ chuyển cần rà soát; AI không tự cấp năng lực."
  - Lỗi đã xử lý full: `AI_PROVIDER_OFF` (chưa key), `AI_QUOTA_EXCEEDED`, `AI_IN_PROGRESS`, `ASSESSMENT_SOURCE_CHANGED` → bài không mất, chờ chấm tay.
- **Nguyên nhân hàng "Chờ chấm" trong cockpit** (`app/lessons/lesson-dashboard.tsx:5714-5808`): `lib/lesson/assessment-ai.js:14` **loại `source === 'practice'`** — bài luyện tập giữa bài (task-1-1/2-1/3-2…) KHÔNG được AI chấm → backlog thủ công cho GV (Đạt/Chưa đạt + nhận xét tay từng em). Vé ra cửa thì AI đã bao phủ.

## 2. Thiết kế chốt (B nền + công tắc A)

- **B — nền không phụ thuộc AI**: submission của task luyện tập type `open`, khi nộp:
  - `assessmentStatus` → `submitted` (hoàn thành immediately, ✅ đã nộp) — KHÔNG vào hàng "Chờ chấm".
  - Vẫn tạo hàng AI nhận xét (không reach/pass/fail): gọi `automatic` như vé cuối giờ nhưng mode `comment_only`; AI hết hạn mức/mạng lỗi → bài vẫn hoàn thành, nhận xét để trống (không ảnh hưởng tiến độ tiết).
  - Không cấp thành thạo từ bài luyện tập (giữ đúng nguyên tắc "AI không tự cấp năng lực" — minh chứng độc lập vẫn là vé cuối giờ + task đóng).
- **Công tắc A — "AI chấm cả bài luyện tập"** (mặc định TẮT):
  - Bật theo tiết học (setting trong lesson/cockpit GV): AI automatic chấm practice như vé cuối giờ — Đạt/Cần hoàn thiện + nhận xét; mơ hồ → `needs_review` cho GV.
  - Kỹ thuật: añad flag vào body `automatic` (vd `includePractice: true`) hoặc per-lesson config; snapshot thêm practice submissions khi flag bật.
- **Vé cuối giờ**: giữ nguyên cơ chế hiện tại (AI chấm + GV rà `needs_review`).
- **Provider**: giữ Gemini Flash (`gemini-flash-latest`) làm chính; OpenRouter là dự phòng (đổi endpoint+model trong Cài đặt AI, không sửa code). 9router/OpenCode/Vilao/xkiro chỉ dùng DEV, không làm runtime chấm bài HS.

## 3. Việc cần làm (sau khi QA v27 đóng, làm cùng nhánh v28)

1. **Serialize/state**: thêm khái niệm `assessmentMode` cho practice open submissions (`comment_only` / `graded` / pending-as-now) trong `lib/lesson/*` + migration *nhẹ* cho tiết đang giữa chừng (chỉ áp tiết mới nếu migration phức tạp).
2. **assessment-ai.js**: snapshot nhận flag `includePractice` + mode `comment_only` (prompt AI khác: chỉ nhận xét + mức tin cậy, không pass/fail). **Thêm dòng giải nghĩa quy ước ghi học thẳng của HS** (theo `tasks/v28-bang-ky-hieu-toan.md`): `AB→` = vectơ AB, `(SBC)` = mặt phẳng, `lim(x→+∞)`, `Cₙᵏ`/`Aₙᵏ`, `∫ₐᵇ`, `√( )`, chỉ số trên/dưới Unicode (`x² ² ⁿ ₀ ₙ`), `|x|`, `Ā` = biến cố đối — để AI đọc đúng bài làm chữ thẳng trước khi chấm.
3. **assessment route**: truyền flag qua; giữ nguyên idempotency/olở đường lỗi.
4. **Cockpit**: hàng "Chờ chấm" chỉ còn vé cuối giờ + practice khi công tắc A bật; dòng đếm "Đã AI chấm / Cần rà" như LearningEvidencePanel hiện có.
5. **Cấu hình key** (bước NGAY, không đợi code): hướng dẫn user lấy key Gemini (aistudio.google.com/apikey) dán vào Cài đặt AI trên trang `/lessons` (owner). Sau đó kiểm chứng AI chấm tự động vé cuối giờ chạy trên phòng QA (KHÔNG đụng phòng thật 7E42C2).
6. **Verify**: build sạch; QA 2HS: nộp luyện tập → hàng chờ không tăng, nhận xét AI xuất hiện (khi có key); bật công tắc A → AI chấm đạt/chưa đạt practice; tắt key/quota → luyện tập VẪN hoàn thành, vé cuối giờ chờ GV.

## 4. Ràng buộc

- KHÔNG đụng `lib/exam/**`.
- Key AI là thông tin mật — chỉ user tự dán; assistant không nhận/nhờ gửi key qua chat.
- Nguyên tắc giữ lại: AI không tự cấp năng lực; mơ hồ → GV rà.
