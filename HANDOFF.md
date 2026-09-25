# HANDOFF — Soạn giáo án / lớp học / chấm AI
**Cập nhật:** 2026-09-25
**Repo:** `soangiaoan` · **Nhánh chuẩn:** `main`
**Production URL:** https://giaoandewey.vercel.app

Snapshot trạng thái hiện tại. Lịch sử dài đã chuyển vào [`docs/HANDOFF-ARCHIVE.md`](docs/HANDOFF-ARCHIVE.md); chi tiết commit xem `git log`.

## Ví AI trả trước + khoá AI riêng + mã giảm giá — 2026-09-25

Chủ dự án chốt: nhóm (chủ dự án + cô Hạnh, Vân, Hồng) dùng thẳng khoá chung — **các cô VẪN trừ ví** (chỉ chủ dự án miễn), tháng 10 miễn phí bằng mã THANG10 100%, từ 11/2026 thu bình thường; GV khác dùng khoá Gemini RIÊNG (cất `teacherAiKeys`, chỉ máy chủ đọc). Không có/hết khoá → AI dừng, bài HS nằm chờ (`aiBlocked`), GV được báo khi đăng nhập; bất kỳ lúc nào GV có thể đồng ý dùng khoá chung và TRẢ TRƯỚC qua ví (SePay), trừ dần theo đúng giá Google. Trần tiền/tháng tuỳ chọn cho mọi GV. Mã giảm giá 10–100%.
- **Công tắc** `adminSettings/aiAccess.enabled`: **ĐÃ BẬT 25/09/2026** (tắt = ai cũng dùng khoá chung miễn phí). Nhóm đã lưu: Hạnh, Hồng, Vân (cả 3 tài khoản van.vucam@ / vucamvan97@ / vucamvan311@). Mã **THANG10** 100% 25/09–31/10 đã gán 5 tài khoản đó. Chủ dự án (congapro60@gmail.com) luôn thuộc nhóm + miễn ví (`exemptUids`); 2 tài khoản khác của chủ dự án (cuong.vuviet@, 250303013401@husc) là giáo viên thường.
- Thuần: `aiKeyPolicy.ts` (chọn khoá: bật tính phí thì KHOÁ RIÊNG luôn chạy trước — kể cả người trong nhóm; hỏng/hết thì nhóm tự về khoá chung, người ngoài phải đã đồng ý; phân loại lỗi khoá Gemini: 429/quota = hết lượt 60 phút, 400/401/403 khoá sai = hỏng; 503/500 KHÔNG đẩy sang trả tiền), `aiWallet.ts` (mã nạp `SPAI…`, tính tiền từng lượt `round(costUsd×tỷ giá)×(100−%giảm)`, sao kê tháng = đầu kỳ + nạp + điều chỉnh − trừ).
- Máy chủ: `_ai-keys.ts` (`ensureGeminiKey` → 402 `AI_KEY_REQUIRED{reason}`), `_ai-wallet.ts` (webhook `POST /api/classroom?hook=sepay`, header `Authorization: Apikey <SEPAY_WEBHOOK_KEY>`, chống cộng trùng theo id giao dịch, sai mã → `aiTopupsUnmatched` để gán tay), `_ai-billing.ts` (sao kê kèm minh chứng: lớp · bài · HS · token · tỷ giá lưu trên TỪNG lượt). `_ai-usage.ts` trừ ví ngay khi ghi lượt.
- Giao diện GV: tab **Chi phí AI** (`AiBillingTab`: ví + QR nạp tự dò 5 giây, mã giảm giá, trần, khoá riêng, đồng ý trả phí, chấm lại bài đang chờ, sao kê + PDF). `aiKeyGate.ts` bọc `fetch` cho `/api/grade-homework|classroom|generate-simulation`: gặp 402 → mở `AiKeyGateModal`, xử lý xong bấm "Thử lại" là yêu cầu cũ tự gửi lại; nhiều yêu cầu chỉ mở 1 hộp. `AiBlockedBanner` (`aiBanner.ts` thuần) báo khi đăng nhập: bài chờ, GV ngoài nhóm CHƯA chọn khoá riêng/đồng ý, ví cạn (chỉ khi ví thật sự bị trừ); "Để sau" ẩn trong phiên.
- Quản trị mục 6–10 (`AiBillingAdminPanel`): nhóm dùng khoá chung + công tắc, tài khoản nhận tiền (`PaymentAccountsSection`: NHIỀU tài khoản, mỗi cái kèm ảnh QR tự tải — máy chủ lưu Storage `payment-qr/` bằng link có token; chọn 1 tài khoản đang dùng) + trạng thái webhook, mã giảm giá (tạo/tắt/gán theo email), ví + điều chỉnh (lý do ≥5 ký tự, GV thấy trên sao kê), giao dịch chưa khớp, sao kê tháng từng GV.
- QR giáo viên quét do web tự tạo (qr.sepay.vn, điền sẵn số tiền + nội dung SPAI…); ảnh QR tải lên là dự phòng (tự gõ nội dung), QR tự tạo lỗi thì tự chuyển sang ảnh. Tài khoản nhận PHẢI đã liên kết SePay. Web không đọc tài khoản từ SePay (cần token API SePay — không đáng).
- **Chủ dự án tự làm** (AI không nhập khoá/số tài khoản): webhook SePay + biến Vercel `SEPAY_WEBHOOK_KEY` + Redeploy; nhập tài khoản nhận tiền.
- Test: aiKeyPolicy, aiWallet 9, ai-keys 7, ai-wallet 5, gateway 8, aiKeyGate 4; toàn bộ 186 file/2.121 test; lint, lint:api, build pass.
## Tự chấm + tự duyệt sau 60 phút — 2026-09-25

Chủ dự án chốt: bài nộp quá 60 phút GV chưa chấm → AI tự chấm; đã chấm quá 60 phút chưa duyệt → tự duyệt (`approvalSource: 'auto_timeout'`, nhãn "Tự duyệt sau 60 phút"). Mọi lớp, GV chủ lớp TẮT được (checkbox trong tab Bài giao/Bài nộp → `classes/{id}.autoGradeAfterHour=false`). Bài máy đọc chưa chắc KHÔNG tự duyệt; bài lỗi (`error`) để GV xử lý.
- Thuần `autoGrade.ts` (`planAutoSweep`: chỉ lượt mới nhất; 60 phút tính từ lúc nộp / lúc chấm). Máy chủ: `POST /api/grade-homework?cron=auto` + `Authorization: Bearer <AUTO_GRADE_CRON_SECRET>` (thiếu biến → 503). Mỗi lần gọi: duyệt hết bài quá hạn + chấm tối đa 1 bài (hàm 60s, ngân sách chấm 45s); tiền tính cho GV chủ lớp (ngữ cảnh `autoGrade`).
- Hẹn giờ: `.github/workflows/auto-grade.yml` 30 phút/lần, gọi lặp ≤20 lần tới khi `remaining:0`. Chưa có secret thì bỏ qua (không lỗi).
- **Chủ dự án tự làm**: tạo chuỗi bí mật → GitHub repo Settings → Secrets → Actions `AUTO_GRADE_CRON_SECRET`; Vercel env cùng tên + Redeploy. Test `grade-homework.auto.test.ts` 3, `autoGrade.test.ts` 4.

## Nộp bài HS an toàn hơn + "Chấm & duyệt tất cả" cho cả lớp — 2026-09-25

- Trang HS: ảnh đã chọn mà chưa bấm "Nộp N tệp" chỉ nằm trên máy em → khung đỏ "Ảnh chưa gửi", trình duyệt hỏi lại khi đóng/tải lại (`beforeunload`). Hộp sau khi nộp đổi thành "Thầy cô đã nhận bài ✓" — đóng hộp vẫn là đã nộp (bài lưu TRƯỚC khi hộp hiện; trạng thái Chờ chấm).
- GV (tab Bài nộp/Bài giao): khung "Việc tồn của cả lớp" + nút **Chấm & duyệt tất cả** — `classBacklog` (thuần, `submissionSelection.ts`) gom lượt MỚI NHẤT của mọi bài giao nộp ảnh: chấm AI bài chưa chấm rồi duyệt; bài máy đọc chưa chắc giữ lại trừ khi tick. Chạy tuần tự trên client (đóng tab giữa chừng thì phần còn lại vẫn tồn, bấm lại được).

## Cầu nối SSM Edufit (đợt 1: chỉ đọc) — 2026-09-24

SSM (`ssm.edufit.vn`) là hệ thống nội bộ Edufit của trường, không có API công khai; chủ dự án báo lãnh đạo đã cho phép đồng bộ. Hướng đã chọn: **tiện ích Edge** `extension/ssm-bridge/` (MV3), dùng phiên SSM của chính giáo viên ngay trong trình duyệt. Vé SSM KHÔNG lên app/Vercel/Firestore (lộ vé = vào SSM với quyền GV tới ~2027).
- Đường đi: app `postMessage` → `app-relay.js` (chỉ `giaoandewey.vercel.app` + `localhost:3000`) → `background.js` (danh sách lệnh GET cố định: ping/profile/schoolYears/teacherClasses/classStudents) → `ssm-session.js` trong tab SSM đang mở → `api-ssm.edufit.vn/api/`.
- App: `src/lib/ssm/ssmBridge.ts` (gọi tiện ích, lưu lớp đã ghép ở localStorage theo từng GV), `ssmModel.ts` (thuần: đọc phòng thủ, so Mã HS), `SsmLinkPanel` ở tab **Học sinh**: kiểm mail SSM = mail app → chọn lớp SSM (đoán theo tên) → so danh sách theo Mã HS. **Chỉ so, không sửa lớp.** Chưa cài → hiện nút tải `/downloads/ssm-bridge.zip` (sinh bởi `prebuild` = `scripts/pack-ssm-bridge.mjs`, không commit zip).
- **Bẫy đã dính:** vé đúng là localStorage `access_token` (KHÔNG phải `sso_access_token` → 401) và BẮT BUỘC header `workspace` (= localStorage `workspace`, vd `branch_23`); thiếu header thì API trả danh sách RỖNG, không báo lỗi. Header HTTP chỉ nhận ASCII. Mã HS SSM = ô `student_code` (dạng `GB…`/8 số/`S…`, trùng file Drive). API SSM phân trang 20 dòng mặc định → `classStudents` xin `skipPagination=true&limit=500`.
- **Chưa làm:** điểm LO/TDS theo Quarter (SSM tự tính điểm quý từ LO; app phải LẤY NGUYÊN số SSM, không tự tính) — chờ Q1 có điểm để xem cấu trúc `/api/v2|v3/evaluation/...`; ghi báo giảng/BTVN (đợt 2); điểm danh theo tiết (đợt 3). Kế hoạch: `tasks/todo-ssm-bridge.md`. Mọi lệnh GHI lên SSM phải có xem trước + GV xác nhận (phụ huynh nhận ngay).
- Nghiệm thu: `npx vitest run extension src/lib/ssm` (20 test); E2E Edge thật (headless, vé giả → SSM thật trả 401): `npm run dev` rồi `node scripts/qa/e2e-ssm-bridge.mjs` (7 PASS). Chưa chạy luồng có dữ liệu thật trọn vẹn từ Edge của GV.

## Bài luyện thêm của học sinh: căn cứ lỗi BTVN, 6 câu 3 mức, đề nối tiếp — 2026-09-24

Chủ dự án báo: công thức vỡ nặng, ít bài, không đa dạng, không rõ căn cứ. Gốc: prompt cũ chỉ gửi ≤3 TÊN chủ đề yếu, ra 3 câu, KHÔNG dặn LaTeX/nhân đôi `\` → `JSON.parse` biến `\frac`→form-feed+"rac", `\times`→tab (không báo lỗi); trang HS in câu hỏi chữ thô. Sửa:
- `practiceBasis.ts` (thuần): `collectHomeworkMistakes` (câu sai/đúng một phần trong BTVN đã chấm của CHÍNH lớp/GV hiện tại, mới nhất trước, gộp lỗi trùng, ≤6), `collectPracticeMistakes` (câu chưa trọn điểm ở lượt luyện đã chấm gần nhất, ≤3), `recentPracticeQuestions` (3 đề gần nhất → cấm lặp), `repairLatexEscapes` (chỉ sửa khi cả từ là lệnh LaTeX quen thuộc; `\nTa`, `\\frac` giữ nguyên).
- `buildPracticePrompt({grade,topics,mistakes,avoidQuestions,count=6})`: 2 nhận biết/thông hiểu + 3 vận dụng + 1 vận dụng cao, đa dạng dạng bài, bắt LaTeX + nhân đôi `\`; mỗi câu có `level` + `basis` (câu trung tính "Luyện: … (từ BTVN … · Câu …)", kiểm lộ đáp án như hint). `loadPracticeBasis` ở `api/grade-homework.ts`; maxOutputTokens 12288. Không có chủ đề lẫn lỗi → không tạo.
- Trang HS: câu hỏi/gợi ý/nhận xét/đáp án dựng bằng `NhanXetMarkdown` (KaTeX), nhãn mức + dòng căn cứ; nút sau khi chấm đổi tên "Tạo đề tiếp".
- **Giàn giáo từng bước** (`steps`, 3–4 bước, bước cuối dừng trước kết quả, mỗi bước qua bộ chặn lộ đáp án): `PracticeScaffold` ẩn sẵn, em bấm mở DẦN từng bước. maxOutputTokens 16384.
- QA production (em Bảo Khánh 10Olinda, không nộp bài để khỏi đụng hồ sơ): 6 câu đúng 2/3/1 mức, căn cứ ghi rõ BTVN + số bài, KaTeX dựng cả hệ có ngoặc nhọn trên màn điện thoại. Phát hiện gợi ý câu nhiều ý lộ kết quả ý a → thêm luật HINT (`f413d1b`); bộ chặn lộ đáp án chỉ bắt đáp án CUỐI. Lượt 2 (sau `6684403`): đề mới khác hẳn đề cũ (cấm lặp chạy), giàn giáo mở dần 1/3→2/3→3/3 không lộ đáp án; phương án A–D dính một đoạn → prompt bắt mỗi phương án/ý một đoạn "\n\n".
- **Bẫy:** đề đã tạo TRƯỚC bản này vẫn còn ký tự hỏng trong Firestore — HS bấm "Tạo đề tiếp" là có đề mới sạch. Test: practiceBasis 4, gradingPrompt +4, practice API +1. `ai-gateway-handler` SSE đôi khi quá 5s khi chạy cả bộ (chạy riêng pass) — không liên quan.

## Sổ điểm lớp (GĐ3) — 2026-09-24

Một document `scoreBooks/{classId}` (`src/lib/classroom/scoreBook.ts` thuần + `api/_score-book.ts`), **chỉ máy chủ đọc/ghi** — rules mặc định chặn nên KHÔNG phải phát hành lại `firestore.rules`. Vì sao 1 document/lớp: lớp ≤ vài chục HS, xa trần 1MB, đọc 1 lần ra cả bảng. Giáo viên thuộc lớp (`teacherContext`, cả đồng chủ lớp): `teacherScoreBook`, `saveHs1Column` (tạo/sửa 1 cột + điểm cả lớp, ô trống = xoá, 0–10 tối đa 2 số lẻ, sai 1 ô là từ chối cả lô), `deleteHs1Column`, `saveExamScores` (THAY toàn bộ phần thi — Sheet là nguồn gốc). Học sinh: `studentScoreBook` lấy classId/studentId từ `studentLinks`, KHÔNG nhận từ client. studentId ngoài danh sách lớp bị bỏ qua khi ghi.
- GV: tab **Sổ điểm** (`ScoreBookPanel`) — đồng bộ đọc file điểm MỘT lần cho cả lớp (`examService.fetchClassExamScores`, khớp Mã HS, báo tên em không khớp), nối file ngay tại đây nếu lớp chưa nối; bảng MOET | TDS | hệ số 1 + TB, bấm tiêu đề cột để sửa/xoá.
- HS: mục **Bảng điểm của em** (`StudentScoreBoard`): BTVN/đề online = `officialActivities` (đã duyệt, không chép vào sổ), thi định kì, điểm quý, hệ số 1. Lỗi tải sổ điểm không chặn nộp bài.
- Báo cáo PH: `StudentReport` + PDF đọc thi định kì + hệ số 1 từ sổ điểm (bỏ đọc Sheet từng em); mục đổi tên "Điểm kiểm tra & thi định kì" khi có hệ số 1.
- **Bẫy:** điểm thi HS thấy là bản CHÉP lúc GV bấm đồng bộ — sửa Sheet xong phải bấm lại. Ghi sổ là đọc-sửa-ghi cả document (không transaction): 2 GV lưu cùng lúc thì bản sau thắng.
- Nghiệm thu: `npx vitest run src/lib/classroom/scoreBook.test.ts api/__tests__/score-book.test.ts src/lib/classroom/parentReportPrintDoc.test.ts`; toàn bộ `npm test` 180 file/2.080 test; `npm run lint`, `npm run lint:api`, `npm run build`.

## Trang quản trị (GĐ2) — 2026-09-24

Tab **Quản trị** chỉ hiện với `congapro60@gmail.com` (`src/lib/admin/adminConfig.ts`); máy chủ kiểm lại (email Google đã xác minh) trong `api/_admin.ts`, gắn vào endpoint `classroom` (action `admin*`, không thêm function). Chỉ ĐỌC dữ liệu giáo viên khác. Gồm: người dùng (Auth listUsers; học sinh ẩn danh chỉ đếm), lớp theo GV (bài giao/nộp/AI đã chấm, nối Sheet), cài đặt tính tiền (`adminSettings/billing`: tỷ giá — nút lấy VCB bán ra từ feed XML; tổng Google thực thu TRƯỚC bộ đếm), chi phí AI theo GV + CSV. Bảng giá `aiPricing.ts` theo NGÀY (nguồn chính thức, Flash ×2 từ 2027-01-01, 3.1 Pro >200k). `billing.ts`: quy lượt về GV chịu tiền (bài nộp→bài giao→lớp→studentLinks→người gọi), ước tính = chia tổng Google trước bộ đếm theo số lượt AI chấm (largest remainder). Test: billing 9 + admin 8 + classSetup 7. **Mục 5 "Chuẩn bị lớp từ folder Drive"** (`ClassSetupPanel`, `classSetup.ts`): quét folder `CLASS_FILES_FOLDER_ID` bằng quyền Google chủ dự án, khớp file "26-27-<Lớp>-<GV>" ↔ tài khoản (ưu tiên TK đã có lớp/đã nối file, rồi email trường), lớp đã có → `adminLinkExamSheet` (chỉ nối file), chưa có → `adminCreateClassForTeacher` (roster từ tab MOET, joinCode không trùng, chặn 409 trùng khoá lớp). Sửa kèm: thu hồi học sinh ĐẾM LẠI `studentCount`.

## Đếm token AI (khoá chung) để tính tiền — GĐ1 — 2026-09-24

Kế hoạch 3 GĐ ở `tasks/todo.md` (GĐ2 trang quản trị congapro60@gmail.com + bảng kê tiền; GĐ3 sổ điểm). GĐ1 xong: `api/_ai-usage.ts` ghi mỗi lượt gọi AI bằng KHOÁ CHUNG vào collection `aiUsage` (client bị rules mặc định chặn): token vào/ra/suy nghĩ/cache + model + feature + uid/email/ẩn danh + refs (classId/submissionId/assignmentId…) + day/month giờ VN. Chỉ lưu token thô — tiền tính lúc hiển thị theo bảng giá. Ngữ cảnh qua AsyncLocalStorage, token giải mã LƯỜI (chỉ khi có lượt AI). Gắn: `callGeminiVision` (ghi TRƯỚC khi ném lỗi — Google tính cả lượt bị cắt), handler `grade-homework` + `classroom`, `generate-simulation`, cổng GLM (stream bật `include_usage`). Ghi hỏng không làm hỏng lượt chấm. **Trước 2026-09-24 KHÔNG có số theo người** — chỉ ước tính từ quota/bài đã chấm, đối chiếu tổng AI Studio (project Albot, trần ₫1tr/tháng). Test: `ai-usage` 6 + toàn bộ API 257 pass.

## Bản phụ huynh: báo cáo PDF chuyên nghiệp + điểm thi định kì — 2026-09-23

Bản gửi phụ huynh (`StudentReport` viewMode=parent + `parentReportPrintDoc.ts`):
- **Nội dung an toàn** từ `parentSafeReport.ts` (chỉ bài đã duyệt, không lọt số bài/đáp án): `overallSummary` (band điểm + xu hướng), điểm mạnh/cần rèn theo chủ đề, `parentActions`/`teacherActions` thuần số liệu.
- **Xuất PDF như giáo án**: `exportParentReportToPdf` dựng node ẩn → `utils/pdfExport.ts::exportElementToPdf` (html2canvas-pro+jsPDF, `pdf.save()`) tải thẳng .pdf. KHÔNG `window.print()`/`window.open`.
- **Thiết kế phiếu tiến độ IB** (mẫu The Dewey): bảng thông tin, dải tổng kết màu, đề mục đánh số in đậm, 3 biểu đồ SVG/CSS thuần (đồng hồ điểm có thang mức, xu hướng, tiến độ), kết quả từng bài kiểu dòng môn học. Style scope `#parent-report-pdf-root`, escape HTML.
- **Mục "Năng lực Toán học"**: `buildStudentCompetencyPortfolio` (bài đã duyệt) → nhóm 4 mức khung trường → `ParentCompetencySummary`.
- **Mục "Điểm thi định kì"** (từ GĐ3 đọc qua Sổ điểm, xem trên; phần dưới là cách đọc file): đọc 2 tab MOET/TDS trong **file điểm riêng của lớp** (`class.examSheet.spreadsheetId`, nối qua action `setClassExamSheet`; KHÔNG dùng `sheetSync` vì BTVN 10/12 nối file chung không có MOET/TDS — lỗi bản đầu) qua Sheets API `values:batchGet` UNFORMATTED (quyền Google GV như BTVN). `examScores.ts` khớp **Mã HS**, chỉ lấy cột "Điểm…" (MOET thang 10: KSĐN/giữa-cuối HKI-HKII; TDS Quý 1-4 + điểm chữ), BỎ cột công thức/kế hoạch nội bộ. GV bấm nút "Tải điểm thi" (tránh popup OAuth bất ngờ) → hiện mục + vào PDF. Nghiệm thu: examScores 6 + parentReportPrintDoc 7 test; smoke live PDF có điểm thi; `lint`+`build` OK. GV dán link file `26-27-<lớp>` 1 lần/lớp (app kiểm có tab MOET/TDS mới lưu). Test API `classroom-sheet-sync` +3.

## Bản phụ huynh + hồ sơ: 5 lỗi làm chặt — 2026-09-18

Nối tiếp lô bản phụ huynh. Fix 5 lỗi người dùng nêu:
1. `parentSafeReport` bỏ hẳn `grade.feedback` khỏi DTO phụ huynh (nhận xét cho HỌC SINH, hay nhắc số câu) — xoá field `feedback` khỏi `ParentSafeAssignmentResult`.
2. `profileTopics()` giờ yêu cầu bằng chứng THẬT: chủ đề chỉ hiện nếu có ≥1 `evidenceSubmissionId` là submission còn tồn tại, đúng học sinh, đã `teacherApproved` (dựng `approvedSubmissionIds` từ input).
3. Tách helper `topicHygiene.ts::namesSpecificProblem` (bắt `Bài 2`, `Bài số 2`, `Câu hỏi 4`, `BT2`, `2a`, `ý a`…). Dùng ở CẢ hai tầng: **gốc** trong `profileMerge` (mergeTopics/addEvidence lọc tên theo số bài khỏi weakTopics/strengths + hồ sơ cũ) và **hiển thị** trong parent report.
4. Prompt (`gradingPrompt`): `feedbackForStudent` ghi rõ CHỈ học sinh đọc (bản phụ huynh tổng hợp theo chủ đề, không dùng chữ này); thêm hướng dẫn `strengths` là cụm danh từ chung, không nêu số bài.
5. `buildParentSafeReport`: chọn lượt ĐÃ DUYỆT gần nhất cho từng bài — lượt mới error/grading không xoá điểm chính thức của lượt cũ đã duyệt.
Nghiệm thu: parentSafeReport 5 + profileMerge 38 + topicHygiene 2 + gradingPrompt 97 + skill-profile 5 pass; `lint`+`build` OK. **Còn:** hồ sơ cũ đã lưu tên xấu chỉ sạch khi bài được gộp lại (chấm/duyệt lại); tầng hiển thị vẫn lọc để an toàn.

## V7.2 live classroom — Tuần 5 + Tuần 6 — 2026-09-18

Đã hoàn tất mã nguồn trên nhánh `codex/p31-classroom-ready`, commit triển khai chính `b25e740` và merge với `origin/main` hiện tại. Mục tiêu là đưa mô hình activity-first V7.2 vào 24 bài Tuần 5 và 24 bài Tuần 6 của khối 10/11/12.

- Adapter generic dùng timeline 14 nhịp/40 phút, nội dung source-aware, mục tiêu MUST/SHOULD/COULD, route M/S/C, AI Error, post-check, exit ticket, preview riêng tư và practice A/B/C/D/Challenge.
- P31 `10-5-31` vẫn dùng contract thủ công để giữ media/kịch bản đặc thù; phần practice và dashboard đã theo V7.2 nhưng timeline P31 vẫn là timeline custom 11 nhịp.
- Firestore Rules đã mở allowlist cho checkpoint V7.2, giới hạn 16 step, clock fields và group-progress `cp-practice-a`.
- QA: full Vitest **171 files / 2.016 tests PASS**, `lint` PASS, `lint:api` PASS, build PASS; Rules **8 files / 303 tests PASS**, pilot **1/1 PASS**. Browser smoke local pass P31 và đại diện `10-5-32`, `11-5-26`, `12-5-26` với GV–TV–3 HS, practice aggregate, privacy và browser-error gate.

**Giới hạn cần giữ:** chưa chạy browser choreography riêng cho toàn bộ 48 bài; contract/privacy matrix bao phủ 48 source keys và browser smoke đại diện mỗi khối. Giáo án/snapshot chỉ là nguồn nội dung; không dùng để ép UI thành chuỗi slide.

**Ngưỡng sắp cắn người:** QA harness phải chạy Firebase Emulator bằng project demo, ví dụ `firebase emulators:exec --project demo-p31-classroom --only firestore,auth "node scripts/qa/p31-classroom.mjs"`; nếu bỏ `--project`, Auth Emulator lấy project mặc định `smartplan-ai-14200` và token bị Rules fixture từ chối. Artifact QA nằm trong `artifacts/`, không đưa vào commit.

**Lệnh nghiệm thu:** `npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" test`; `npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run test:rules`; `npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run test:pilot`; `npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run lint`; `npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run lint:api`; `npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run build`.

Release đã hoàn tất: `main` đã nhận `994bd59` (sau đó `origin/main` có thêm follow-up `248634f`), Firestore Rules đã release vào `smartplan-ai-14200`, và Vercel production `https://giaoandewey.vercel.app` đang trỏ deployment `giaoandewey-qx94sd69v` ở trạng thái READY. QA artifact giữ cục bộ trong `artifacts/`, không commit.

## Hồ sơ năng lực — GĐ2 + GĐ3: khung + AI gắn nhãn + giao diện xem — 2026-09-17

Tiếp GĐ1. Toàn bộ ở `src/lib/classroom/competency/` (thuần, có test) + một view.

- **Khung (GĐ2a):** `framework.ts` — 29 năng lực Toán 10/11/12 trích template trường (`id` ổn định, KHOÁ; đổi id = vỡ nhãn/hồ sơ). App chỉ giữ CẤU TRÚC; 4 mô tả mức nằm trong file trường, chỉ điền khi xuất.
- **Tổng hợp (GĐ2a):** `competencyModel.ts` `aggregateCompetencies` — chỉ tính bài **teacherApproved**, quy điểm về thang 10, lấy tối đa 3 bài gần nhất tính mức (4 bậc, ngưỡng mặc định 9/7/5), giữ đủ minh chứng. **Bổ sung** `profileMerge`, KHÔNG thay.
- **AI gắn nhãn (GĐ2b):** mở rộng `buildQuestionCatalog` (`api/grade-homework.ts` + `gradingPrompt.ts`) — CÙNG lượt đọc đề, AI đề xuất `competencyTags` cho cả bài từ đúng khung khối (đọc `grade` của lớp). Chỉ nhận id trong khung (loại id bịa), kèm `confidence`+`reason`. Lưu `assignments/{id}.competencyTags`. **Không thêm Vercel function.**
- **Giao diện xem (GĐ3):** `portfolioModel.ts` nối bài nộp × nhãn của bài giao → `aggregateCompetencies`; `CompetencyPortfolio.tsx` hiện trong khung xem 1 học sinh (`StudentReport`, bản giáo viên) theo mảng→chủ đề→năng lực, badge mức + minh chứng; năng lực chưa có bài vẫn hiện. **QA production**: view render đúng (Lớp 10, nhóm mảng, badge, đếm tiến độ).
- **Duyệt nhãn (GĐ3b):** `CompetencyTagEditor.tsx` trong khung mở rộng bài giao (`AssignmentPanel`): "Gắn nhãn bằng AI" (buildQuestionCatalog force) + thêm/bỏ tay + "Lưu nhãn". Lưu → `handleSetAssignmentCompetencyTags` lọc id theo khung, đặt `competencyTagsApproved=true`. Đọc đề lại KHÔNG đè nhãn đã duyệt (guard). **Chỉ nhãn đã lưu mới vào hồ sơ HS.**
- **Ngưỡng sắp cắn người:** `competencyTags` tự sinh khi `buildQuestionCatalog` chạy MỚI (bài mới, hoặc bấm "Gắn nhãn bằng AI"); bài cũ đã có danh mục câu → phải bấm nút mới sinh. Trang **Báo cáo lớp đông** (19HS×9 bài) có thể treo renderer khi tải (nặng có sẵn, KHÔNG do lô này) — dùng nút trong bài giao để gắn nhãn thay vì đi qua report. Ràng buộc giữ nguyên: chỉ đụng BTVN.
- **QA production (đã chạy)**: bấm "Gắn nhãn bằng AI" trên bài vectơ → AI trả đúng "Vectơ và các phép toán" (id khối 10) → "Lưu nhãn" OK. **Lỗi lộ khi QA**: `teacherAssignmentProjection` (api/_classroom-teacher.ts) BỎ SÓT `competencyTags` → editor tải lại + hồ sơ luôn trống dù đã lưu. Đã thêm `competencyTags`+`competencyTagsApproved` vào projection (+ test khoá). Lỗi này lọt hết test cũ — chỉ lộ khi QA thật.
- **Xuất file (GĐ4):** nút "Xuất hồ sơ ra file trường" trong `CompetencyPortfolio`. `portfolioExport.ts` (thuần + test): **copy file mẫu** (`PORTFOLIO_TEMPLATE_ID`) → Google Sheet mới "Sxxxxx - Tên", điền B1/B2, **bôi vàng** ô mức đạt của từng năng lực (khớp dòng theo cột A "Nội dung", gate theo khối). Dùng Drive token của GV (scope `auth/drive`), không thêm Vercel function. Trường ghi mức bằng bôi vàng (dòng 3 file mẫu), không phải chữ. Mỗi lần xuất tạo bản sao mới, KHÔNG đụng file cũ.
- **Ngưỡng GĐ4:** `PORTFOLIO_TEMPLATE_ID` hardcode = file mẫu của trường; GV phải có quyền xem file đó (files.copy). Bản sao đổ vào Drive gốc của GV (chưa chọn folder). Chủ đề khớp theo TEXT cột A — đổi tên chủ đề trong file mẫu mà không đổi `framework.ts` thì trượt (báo unmatched, không bôi ẩu).
- Nghiệm thu: competency 24 test (framework/model/portfolio/export) + gradingPrompt 97 + grade-homework.competency 4 + projection 2 + full `lint`(tsc) 0, `build` PASS.

## Hạn BTVN lấy từ app + chống #ERROR! khi ghi hạn — 2026-09-14

QA production tính năng đồng bộ BTVN phát hiện: **hạn ở dòng 5 hiện `#ERROR!`** trên cả 7 cột tab `10. OLINDA`. Nguyên nhân gốc: app ghi hạn bằng công thức `=DATE(2026,9,16)+TIME(8,0,0)` dùng dấu **phẩy**, nhưng file đặt ngôn ngữ Việt lại đòi dấu **chấm phẩy** → công thức vỡ. App đọc lại ra "không có hạn" → **không tính được Nộp muộn / Chưa làm**, chỉ điền Đủ cho em nộp đúng hạn.

**Đã sửa (commit `c70b290`):**

- `deadlineFormula` → **`deadlineSerial`**: ghi hạn thành **SỐ ngày kiểu Sheets (serial)** kèm định dạng `DATE_TIME` (`buildSheetRequests`). Số không lệ thuộc dấu phân cách nên chạy đúng mọi ngôn ngữ; ô vẫn hiển thị ngày giờ.
- `planSheetSync` **ưu tiên hạn từ app** cho cả cột đã có sẵn (trước chỉ dùng dòng 5 của sheet). Nếu app có hạn mà ô dòng 5 đang trống/lỗi/khác thì ghi đè bằng hạn app. Thêm đếm `deadlineWrites` + dòng "sửa X hạn" trong bản xem trước.

**Ngưỡng sắp cắn người:**

- Ghi hạn là **số + numberFormat**, KHÔNG phải công thức nữa. Ai đổi lại sang `formulaValue` sẽ tái hiện `#ERROR!` trên file ngôn ngữ Việt.
- Ghi đè hạn dòng 5 chỉ khi app có hạn và ô lệch >1 phút — hạn app là chuẩn (chủ dự án chốt). Nếu tổ trưởng tự đặt hạn khác trong sheet thì sẽ bị hạn app ghi đè; đây là ý muốn.
- File 1 (11 Columbus) nếu dòng 5 đang là công thức chạy được và trùng hạn app thì **không** bị ghi đè (surgical).
- Nghiệm thu bản này: `sheetSync.test.ts` **41 tests PASS**, `lint` 0, `lint:api` 0, `build` PASS. (6 fail liveLesson lúc đó đã sửa ở mục CI phía trên.)
