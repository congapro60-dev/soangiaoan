# Checklist chung Codex / Claude — 14/10/2026

## OMR dò bóng tô — trạng thái

### Vòng 3 — thực hiện lệnh supervisor 22/10/2026

- [x] Nhận chuẩn nguyên lý 6/7 của vòng 2; không mở lại kết luận đã duyệt. Không commit/switch.
- [x] Khóa nhóm theo bước ngang/dọc, nội suy đủ 10 hàng, hàng trống trả null; kiểm ảnh nén Chrome 9222.
- [ ] Nối detectedAnswers vào luồng nộp và chấm; kiểm dữ liệu đầu vào, ưu tiên câu chắc, cờ GV khi không chắc.
- [ ] Unit synthetic + API + kiểm ảnh thật; ghi kết quả từng câu.
- [ ] Full test, lint, lint:api, build, function-count ≤12; ghi exit code và giới hạn.

Phạm vi: đúng pack; script probe được phép lưu tại `tasks/omr-sample/probe.mjs` theo chỉnh lệnh. Các thay đổi có sẵn giữ nguyên.

#### Bằng chứng vòng 3

- `node tasks/omr-sample/probe.mjs`: exit 0, Chrome `http://127.0.0.1:9222`, ảnh gốc `tasks/omr-sample/bai-tuan-nam.jpg`, canvas 1152×1536, JPEG 0,82. Chạy chính hàm production, không dùng bản thuật toán riêng của probe. `filePathMatches: true`: hàm nhận File blob trả giống hàm ImageData.
- Kết quả đủ 40 hàng, không trượt số khi mất component Q8/Q9: Q1=A, Q2=C, Q3=B, Q4=null, Q5=B, Q6=D, Q7=C, Q8=C, Q9=D, Q10=C, Q11=B, Q12=C; Q13–Q40=null. Mọi đáp án khác null confidence=0,95; null confidence=0. Chuẩn 7 câu: 6/7 khớp chắc, Q4 giữ không chắc đúng lệnh.
- Đối chiếu ảnh gốc: khối trái in 1–10, khối kế in 11–20, tiếp 21–30 và 31–40. Không dùng bốn góc định vị; lưới lấy từ các vòng ô cùng hàng, thứ tự khối theo x. Chỉ hỗ trợ mẫu 4×10 A–D này; Phần II/III không tự đoán.
- Bộ lọc bước ngang 46–51 px tại rộng 1152 (dung sai quanh mẫu đo 47–48,5); pitch dọc 23–25 px. Loại vùng y<25% chiều cao; yêu cầu bốn khối đồng hàng, mỗi khối ≥6/10 hàng. Pitch lấy median khoảng cách đã chia bội; nội suy hàng giữa/hai hàng cuối; không nối hàng theo chỉ số component.
- Ngưỡng tối 130 và bỏ đỏ giữ nguyên chứng cứ vòng 2: tỷ lệ ≥0,8 và cách bóng thứ hai >0,35 mới confidence=0,95. Tỷ lệ 0,3–0,8 trả ứng viên confidence=0; dưới 0,3 trả null, không đoán A. Mẫu Q4 ~0,097 không được nhận; sáu câu chuẩn còn lại ~0,95–1 được nhận.
- Synthetic mới: 5/5 đạt (bỏ đỏ, ô trắng, khối 10 hàng, thiếu bốn hàng gồm hai hàng cuối, nghiêng nhẹ, nhiều bóng, bóng mờ, vùng đầu trang, gap sai, thiếu quá nhiều hàng). Client mới: 2/2 đạt (gửi File và detectedAnswers; không dò được gửi []). Bộ test nén/UI hiện hữu đã chạy đạt.
- Bổ sung test File lỗi/không có ảnh: synthetic + fallback hiện 6/6 đạt. Probe chạy lại sau giới hạn canvas tối đa 1536 vẫn exit 0, `filePathMatches=true`; output lưu `C:\Users\ADMIN\AppData\Local\Temp\opencode\omr-round3-chrome.json`. Chrome cũ đóng giữa phiên gây ECONNREFUSED một lần; đã mở profile QA riêng bằng port 9222 đúng pack rồi kiểm lại đạt, không ghi dữ liệu lớp thật.
- Full test lần đầu timeout harness 120 giây, không coi đạt. Chạy lại `npm run test -- --maxWorkers=2`: exit 0, **322 files / 3381 tests đạt**, 223,78 giây; log `C:\Users\ADMIN\AppData\Local\Temp\opencode\omr-round3-tests.log`. Đây là snapshot trước khi API worker chốt test mới; sẽ chạy lại gate cuối.

#### New proposals — vòng 3

Không triển khai ngoài phạm vi. Hỗ trợ mẫu phiếu khác/Phần II–III hoặc OCR chữ số cần pack riêng; hiện dùng fallback và cảnh báo GV.

### Tiếp tục theo pack cập nhật — 22/10/2026

**Trạng thái hiện tại: blocked ở bước xác nhận lưới; chưa triển khai production.** Đây là giới hạn của phép dò thử, KHÔNG phải kết luận phiếu thật không dò được. Trạng thái thiếu mẫu bên dưới chỉ là lịch sử, không còn áp dụng.

- [x] Đọc lại pack, trạng thái cũ, HANDOFF và lessons; giữ nguyên thay đổi có sẵn trong `tasks/todo.md`.
- [x] Đã có bốn ảnh thật trong `tasks/omr-sample/`; không còn blocker thiếu ảnh. Không dùng giả định bốn góc của lượt trước.
- [x] Kiểm canvas Chrome trên ảnh nén 1152×1536, JPEG 0,82, qua `http://127.0.0.1:9222`; ảnh đầu vào `tasks/omr-sample/bai-tuan-nam.jpg` (1200×1600). Không dùng bốn ô định vị.
- [ ] Nghiệm thu lưới: phép dò thử nhận 8/10 hàng ở khối trái, mất Q8/Q9; chưa nhận dạng/khóa số câu theo cột số thứ tự như pack. Không coi phép thử là hàm OMR hoàn chỉnh dù sáu câu mẫu có bóng rõ khớp chuẩn.
- [ ] Test tổng hợp trước; dò theo hàng/cột, bỏ nét đỏ, confidence thấp khi thiếu hoặc nhiều bóng.
- [ ] Nối `detectedAnswers` qua luồng nộp hiện hữu, kiểm dữ liệu ở server, ưu tiên đáp án chắc và giữ cờ GV kiểm tra khi fallback.
- [ ] Chạy test toàn bộ, flaky riêng nếu cần, lint, lint:api, build và function-count; ghi bằng chứng cuối.

Rủi ro chính: nhầm vùng mã dự thi với câu trả lời, nhầm bóng trắng có chữ in với bóng tô. Cần xác nhận lưới và độ tương phản cục bộ, không chỉ đếm pixel tối tuyệt đối. Phạm vi thay đổi giữ đúng pack; không thêm dependency/API function hoặc vòng xác nhận.

#### Bằng chứng Chrome

| Câu | Chuẩn supervisor | Dò thử | Confidence thử | Tỉ lệ tối ô chọn sau bỏ đỏ |
| --- | --- | --- | --- | --- |
| 1 | A | A | 0,95 | 0,991 |
| 2 | C | C | 0,95 | 1,000 |
| 3 | B | B | 0,95 | 1,000 |
| 4 | A | A nhưng không chắc | 0 | 0,097 |
| 5 | B | B | 0,95 | 1,000 |
| 11 | B | B | 0,95 | 0,950 |
| 12 | C | C | 0,95 | 1,000 |

- Sáu kết quả chắc khớp 6/7; Q4 chọn A chỉ vì có tín hiệu cao nhất rất yếu, KHÔNG chứng minh bóng A. Không bác đáp án chuẩn supervisor, không kết luận Q4 chỉ có nét đỏ.
- Dò thử connected components + nhóm bốn ô có khoảng cách tương tự; loại đỏ khi `r > g + 15 && r > b + 10`. Ngưỡng tối 170 thất bại: ô trắng nền xám cũng có tỉ lệ 0,938–0,982. Ngưỡng thử 130 tách được sáu bóng rõ; chưa kiểm bền vững ánh sáng/nghiêng/Phần II.
- Nhóm ô mã dự thi cũng tạo ứng viên 10 hàng ở `(802;147,5)` và `(823,5;147)` trên ảnh nén; bộ lọc bốn khối đồng hàng loại được trong mẫu này, nhưng chưa thay thế việc đọc cột số. Khối trái `(128;588,5)` chỉ còn tám hàng; khối câu 11 `(366,5;586,5)` đủ mười hàng.
- Script thử ngoài repo: `C:\Users\ADMIN\AppData\Local\Temp\opencode\omr-probe.mjs`; output từng câu: `C:\Users\ADMIN\AppData\Local\Temp\opencode\omr-probe-result.json`. Chạy lại tại worktree: `Get-Content "C:\Users\ADMIN\AppData\Local\Temp\opencode\omr-probe.mjs" -Raw | node --input-type=module`. Data URL chỉ dùng nạp fixture trong trang blank; chưa đổi đường File blob của ứng dụng.
- Chỉ sửa checklist trong repo; không sửa source/test. Cổng test/lint/lint:api/build/function-count **chưa chạy**, không ghi PASS. Không tạo nhánh, switch, commit, push, merge hoặc sửa `_assistant-confirmations.ts`.

#### New proposals — chưa làm

- Tiếp tục nghiên cứu khóa hàng bằng cột số thực, không nhận số câu qua chỉ số khối hoặc tọa độ cố định. Cần supervisor duyệt tiếp sau blocker theo điều 19; không đề nghị thay mẫu phiếu hoặc thêm dependency.

### Lịch sử lượt trước — đã hết blocker thiếu mẫu

**Trạng thái: blocked — 22/10/2026.** Dừng theo `tasks/dispatch-codex-omr.md:19`: mẫu phiếu tìm thấy trong repo khác giả định của pack; chưa đủ căn cứ xác định lưới phiếu Tuấn Nam. Không tự chế lưới thay thế.

- [x] Đọc `HANDOFF.md`, mục “ĐO TỈ LỆ ĐỌC BÓNG TÔ”, trước Decision Pack; đọc `tasks/lessons.md`.
- [x] Kiểm tra Git ban đầu: `git status --short` chỉ có `?? tasks/dispatch-codex-omr.md`; không sửa file bàn giao này. Không tạo nhánh, switch, commit, push hoặc merge.
- [x] Kiểm tra mẫu phiếu hiện hữu: `src/utils/answerSheetTemplate.ts:1–227` sinh “Phiếu Trả Lời” nhưng không có bốn ô vuông định vị. Phần I (`:139–150`) hướng dẫn khoanh tròn A/B/C/D, xếp 40 câu bằng CSS grid bốn cột; phần II (`:154–189`) yêu cầu ghi chữ Đ/S vào ô bảng, không phải khối bóng tô Đúng/Sai như pack.
- [x] Tìm tài liệu/lưới OMR: tìm `OMR|fiducial|registration.mark|ô vuông đen|bóng tô|detectedAnswers` trong `*.ts`, `*.tsx`, `*.md` chỉ thấy HANDOFF và Decision Pack. Quét `**/*.{png,jpg,jpeg,webp,pdf}` trả bảy tệp, không có ảnh phiếu Tuấn Nam; `screenshot.png` là ảnh IDE, không phải phiếu. Chưa kiểm được phiếu thật sau nén 1536px; không kết luận phiếu thật thiếu ô định vị.
- [ ] Dò bóng trên canvas, bỏ pixel đỏ, chuẩn hoá theo bốn góc: bị chặn vì chưa có mẫu/lưới của phiếu đích. Sinh ảnh tổng hợp từ lưới tự đặt chỉ chứng minh thuật toán trên mẫu tự đặt, không chứng minh đúng phiếu đích.
- [ ] Truyền/kiểm tra `detectedAnswers`, ưu tiên đáp án đáng tin, cờ GV kiểm tra: chưa sửa; tránh đưa hợp đồng dữ liệu dở dang vào luồng chấm.
- [ ] Unit OMR + API: chưa viết/chạy; chưa có ảnh test đầu vào/đầu ra.
- [ ] `npm run test` toàn bộ; nếu flaky thì chạy riêng `src/lib/adaptive/adaptiveToDewey.test.ts`: chưa chạy do dừng trước triển khai; không ghi nhận PASS.
- [ ] `npm run lint`, `npm run lint:api`, `npm run build`, test `function-count` (≤12): chưa chạy do dừng trước triển khai; không ghi nhận PASS.

**Để tiếp tục:** supervisor cung cấp ảnh phiếu đích hoặc đặc tả lưới có vị trí bốn ô định vị, thứ tự câu/phần, vị trí A/B/C/D và Đúng/Sai. Nếu muốn hỗ trợ mẫu `answerSheetTemplate.ts` hiện hữu thì cần Decision Pack mới; file này ngoài danh sách được sửa.

### New proposals

Không triển khai đề xuất ngoài phạm vi. Không sửa mẫu phiếu, không thêm dependency/API function, không đổi cơ chế chấm hoặc quyền duyệt.

## Rà soát 5 luồng và kế hoạch sửa — 19/10/2026

Kế hoạch hiện hành: `docs/superpowers/plans/2026-10-15-smartplan-production-fixes-handoff.md` (phần cập nhật 19/10 ở đầu tệp). Chỉ cập nhật tài liệu trong worktree riêng; không sửa WIP checkout gốc.

- [x] Xác minh production/main cùng `b913b1c`; rà source đúng commit, kiểm vùng chồng lấn Claude.
- [x] Rà giáo án, đề offline, thi online, dự giờ, thư viện bằng ba reviewer độc lập theo phạm vi; root kiểm chéo lỗi chính.
- [x] Unit 3.293/3.293, Rules 310/310, app/API typecheck và build đạt; entry 684,52 kB.
- [x] Tái hiện bằng hàm/render thật: drift chấm TF, review giữ key cũ, TF invalid, mất bất đẳng thức LaTeX, raw iframe/srcDoc.
- [x] Ghi một kế hoạch có thứ tự sửa, file, trigger, tiêu chí nghiệm thu và bàn giao overlap.
- [ ] Browser E2E 5 luồng: công cụ không nhận tab phiên khác; tab QA Edge/IAB timeout. Chưa kiểm AI thật/nội dung mới/file xuất hiện tại.
- [ ] Triển khai và nghiệm thu 12 gói trong kế hoạch; chưa sửa app, commit, push hoặc deploy ở lượt rà soát 19/10.

## Xác nhận câu máy đọc chưa chắc: gửi một lượt — 22/10/2026

Chủ dự án báo: bảng "Máy cần em xác nhận" bắt bấm "Xác nhận câu này" từng câu rồi mỗi câu chờ tải lại, làm 14 câu rất lâu; ảnh bài chấm chiếm nửa trên nên ô chọn đáp án bị đẩy khỏi màn hình.

- [x] `ClarifyPanel`: đáp án nằm ở state của bảng (không phải từng ô), nút "Lưu tất cả" gửi MỌI câu đã trả lời trong MỘT lệnh `clarifyAnswers` (máy chủ đã chấm cả lượt trong một giao dịch, giới hạn 100 câu/lần).
- [x] "Để thầy cô xem hết" gửi `skip` cả lượt; lỗi tách ra theo từng câu bị từ chối chứ không chặn cả lượt.
- [x] Câu gõ A/B/C/D, Đúng/Sai, số xếp thành danh sách gọn (mỗi câu một dòng, không ảnh); câu tự luận (cần ảnh) đứng trên cùng; câu tự luận vẫn gửi ngay khi chụp/thử lại như cũ.
- [x] Nháp vẫn ghi localStorage theo từng câu (đổi vai trò vẫn không lẫn nháp).
- [x] Test: 5/5 `ClarifyPanel.test.tsx` (thêm test câu tự luận đứng trước danh sách đáp án), 46/46 thư mục `student/`, 39/39 `api/__tests__/clarify.test.ts` + `clarification.test.ts`; `npm run lint` (tsc) và `npm run build` sạch.
- [ ] Chưa push/deploy: chờ chủ dự án xem trên bản chạy máy.

## Triển khai tiếp 21/10/2026

- [x] Sửa 5 nhóm P1: cách ly UID, attempt server, scorer, dự giờ giữ dữ liệu, Rules chặn ghi trực tiếp.
- [x] Sửa cấu hình thi, TF đơn, nhập MCQ, LaTeX/Word thư viện, Excel dự giờ.
- [x] `npm run lint`, `npm run lint:api`, full unit `314/314`, Rules `310/310`, build exit 0.
- [ ] Browser E2E thật, AI/content QA, Firebase Rules production deploy, Vercel deployment và smoke sau deploy.
- [ ] Review diff cuối, commit/push theo cổng; không đụng WIP checkout gốc hoặc vùng Claude.

Review: test hiện hữu đạt nhưng vẫn có lỗi sai điểm, cách ly tài khoản và giữ dữ liệu; không được báo toàn web đã QA đầy đủ. Kế hoạch ghi riêng bằng chứng source/local, browser bị chặn và Rules production chưa xác minh.

## Kiểm dấu trên ảnh và chạy lại bài đã nộp — 15/10/2026

Người dùng cung cấp ảnh QA của Claude, yêu cầu kiểm lỗi và chạy lại toàn bộ bài HS đã gửi theo thiết kế mới. Không gọi model lập trình bên ngoài; subagent native Astra yêu cầu nhưng lỗi credential, root tiếp tục.

- [x] Đối chiếu transcript đúng phiên Claude và main 6d231ac. 15 lỗi + mathText đã có; các QA thật/SSM chưa được coi đã xong.
- [x] Inventory chỉ đọc đúng chủ 3 lớp: 468 lượt, 1.130 ảnh; 7 lượt có geometry; 31 lượt không gắn assignment. Snapshot riêng ngoài Git, không ghi PIN/token/dữ liệu HS vào checklist.
- [x] Tái hiện mẫu Đề cương số 4: 7 ảnh, 21 câu, không geometry. Root cause: schema mẫu thiếu fields; location fallback thiếu; UI bỏ `readingRegions` sau câu unreadable.
- [x] Sửa nguyên nhân; 185 focused tests pass. Giữ sửa tay/ảnh gốc; source fingerprint chặn đáp án đổi giữa chừng; fresh manual edit claim chặn overwrite.
- [x] Mẫu production `GHKI - Đề cương số 4`: 1/1 thành công, 23 vùng; điểm 8.85 và chưa duyệt giữ nguyên.
- [x] Batch 436: 127 graded, 292 failed_preserved, 17 failed; retry queue complete 309/309: graded 66, failed_preserved 229, failed 14. Điểm cũ giữ nguyên.
- [x] Claude 16/10 resume bằng khóa mới; queue đã complete. 14 lượt failed và 229 lượt giữ điểm cần follow-up riêng.
- [x] Nguyên nhân: khóa `htzg` exhausted 13:16:43Z; refresh không pause vì lỗi khóa trả `gradePreserved` thay vì 429 → cần sửa runner (pause khi khóa hết hạn mức) trước đợt sau.
- [x] Soát 3 bài (2 lớp — bài graded chỉ thuộc 2 lớp): dấu gắn đúng ảnh của bài, không sửa tay, ảnh đủ. Chưa có điểm/duyệt trước refresh để đối chiếu; chưa xem nét đứt trên UI.
- [ ] Chủ dự án quyết: tạo job mới cho 243 bài lỗi (có ngưỡng dừng khi lỗi liên tiếp) hay dừng.
- [x] (Claude 16/10) Kiểm dữ liệu thật: 133/141 bài từ 13/10 có dấu; mắt soát Đề cương số 4 đạt (TF lệch nhẹ, tự luận vòng to). Sửa ảnh/danh sách lệch nhãn "Cần đối chiếu"; đã duyệt hiện theo kết quả.
- [x] HANDOFF/main cập nhật; source `00b82b2`, CI 3.163/3.163.

## Căn cột danh sách bài nộp GV — 15/10/2026

- [x] Cùng lưới cột cho tên, trạng thái, hạn, lưu ý, điểm, duyệt, giờ/tệp; giữ chọn bài/mở chi tiết/mã đề. Hàng chưa nộp cũng giữ cột.
- [x] Nhãn ngắn một dòng, chú thích đầy đủ; tên dài và nhiều cảnh báo không đẩy lệch cột. Container dưới 56rem chuyển bố cục gọn.
- [x] QA trình duyệt fixture 1100px có/không mã đề: 7 cột cùng tọa độ qua 6 hàng, không tràn. Màn 390px không tràn nhãn/ngang. Lint, 17 test liên quan, build cuối đạt. Không ghi dữ liệu lớp thật; lần kiểm 320px timeout, không coi PASS.
- [x] Review Astra xhigh không còn blocker; cập nhật HANDOFF. Commit/push main theo quyền đã duyệt, trạng thái Git là bằng chứng cuối.

## Bản chấm tay và bài chữa nộp hộ — 15/10/2026

Spec đã duyệt: docs/superpowers/specs/2026-10-15-handmarked-correction-design.md; plan docs/superpowers/plans/2026-10-15-handmarked-correction-plan.md. User xác nhận, bổ sung HS/PH cùng xem bài chữa đúng người; GV/PH được opt-in AI như HS.
- [x] Backend: private ảnh/PDF chấm tay, mặc định ẩn, toggle/audit, file read đúng quyền.
- [x] Backend: correction GV/PH lưu/xem/AI, provenance; không sửa grade gốc. Focused API 63/63; lịch sử ảnh HS/PH không biến mất khi ẩn điểm. Manual-only không đưa điểm ẩn vào AI.
- [x] UI: GV upload/toggle, HS/PH xem ảnh trực tiếp; card bài chữa nộp hộ và AI chung. Sửa nhận xét cũ còn hiện khi nguồn đổi, giữ bản nháp.
- [x] Test quyền/race/replay/lock/projection; lint app/API hai compiler, build, Rules. Full 3.146/3.146; Rules 309/309; final build exit 0.
- [x] Review native Astra xhigh theo yêu cầu mới nhất, gồm merge main 2407c50. Dừng gọi model bên ngoài.
- [x] Push main source `33b21cd`. Full 3.146/3.146, Rules 309/309 đã đạt; API Typecheck CI thành công. Vercel tự build qua Git, không deploy thủ công.
- [ ] QA browser GV/HS/PH thật, mobile/iPad: công cụ timeout; không ghi nhận PASS thật. Chi tiết `tasks/qa-handmarked-corrections-20261015.md`.
## Tiếp quản Muse — QA_FIX_PLAN_soangiaoan.md

User xác nhận Muse đã dừng, Codex tiếp quản. Base a2f30d1, feature branch codex/muse-qa-followup.
- [x] Đọc toàn bộ ghi chú; fast-forward main Muse, giữ sạch nguồn cũ.
- [x] Xác minh Vercel project Hobby + Fluid Compute: 300s hợp lệ; khôi phục hai endpoint AI, không đổi gói.
- [x] Sửa quyền chấm HS/GV và dữ liệu public thi online; nonce, điểm giả, idempotence, quyền xem; bài cũ cần GV xác minh được giữ nguyên.
- [x] Sửa SSM đúng tài khoản/ô nhập/mã HS; cloud link theo UID/quyền lớp; roster thêm mới không ghi đè/nuốt lỗi.
- [x] Minor: proxy dev, demo copy đúng, AI Tutor accessibility, tương phản; không refactor god-hook chỉ vì kích thước.
- [x] Full 3102/3102, lint app/API/build exit 0; Rules 308/308; review native/Gemini PASS. ZIP 0.3.1 đủ sáu file khớp nguồn.
- [x] Firebase Rules/index deploy exit 0 trước API mới; index leaderboard READY, không xóa index. Cấu hình chặn giả marker được triển khai trước push.
- [x] Push main source cuối 9026b9c, CI SUCCESS, Vercel Git deployment READY, log hết TS2339; ZIP public 0.3.1. GV thật đọc được; SSM không tự Save/Submit.
- [x] Cập nhật file Muse và HANDOFF/checklist theo bằng chứng; phân biệt code/test/production/SSM thật.
- [x] Chốt sửa 15 điều kiện boolean gây TS2339 dưới compiler Vercel non-strict; compiler hai chế độ + 105 test liên quan + build/review native/Gemini đạt. CI kiểm cả hai chế độ.
- [ ] QA Auto-Wake/điền tiện ích 0.3.1 và cross-machine thật. Công cụ chặn edge://extensions; không tự cập nhật tiện ích qua đường vòng.

## Phần tiếp: chấm trên ảnh / lời giải / nộp hộ / khóa chốt / bài chữa

Nguồn chuẩn `tasks/annotated-review-proxy-plan.md`; bằng chứng `tasks/qa-annotated-review-20261014.md`.
User đã duyệt, gồm nhận xét bài chữa chi tiết như GV; đích commit/pushmain, không deploy thủ công.
- [x] B1 actor/lock/upload/feedback backend:3vai, closed≠locked, immutable revision, parentPIN, grants, Rules.
- [x] B2 math/geometry/solution lifecycle+cache: golden ảnh4, mọi câu/TF a–d, giữ sửa tay/invalidate nguồn.
- [x] B3 UI ba vai+viewer+feedback: directupload ngoài list, hạn ngày+giờ,20dòng, màu+lọc, shared detail/forms.
- [x] B4 Chụp ảnh bài chữa+explicit AI chi tiết không chấm điểm; stale/expired/malformedlease retry, sharedsolution+clarifyphotos.
- [x] Full3027/3027(286files); Rules306/306(9files); native41+UI39checks; Gemini backend/grading/correction PASS; UI2falsefindings rejected by native source/test.
- [x] Browser29checks390/820/1024 fixture0pageerrors; không tràn ngang; phản hồi/draft/correction/PHretry/directscroll đạt.
- [x] Lint app/API/build exit0 sau source cuối; bundle index1545.01kB, cảnh báo kích thước có sẵn.
- [x] Source commit/push main `024a5a864c0135993b13903b57067936d9c43a5f`; push exit0, ls-remote khớp, worktree sạch.
- [x] Source024a5a8: API Typecheck38507174194 SUCCESS; QualityGate38507174122 SUCCESS. Vercel giaoandewey auto deployment SUCCESS; không manualdeploy. Rules/realaccountsQA còn lại.
- [x] Cập nhật plan/checklist/HANDOFF để Claude qua MCPbridge tiếp quản.
- [x] User14/10 yêu cầu làm nốt: authorized Firestore+Storage Rules deploy; firebase deploy --only firestore:rules,storage --project smartplan-ai-14200 exit0.
- [x] Sau Rules: homepage200, correction unauth401, Firestore direct unauth403; không thay bài/điểm production.
- [x] CI latest5f1380e full3029/3029(286files) và lint SUCCESS.
- [x] Prompt bài chữa với model thật+3ca ảnh tự tạo: achieved826ký tự, needs_work859, uncertain299; không score. Evidence tasks/qa-correction-live-model-20261014.md.
- [x] Appupdate26.1007.71326 khôi phục Browser IAB; GV thật3lớp, HS11sessionretained, read-onlyscreens/filters/scoreboard/stats/portfolio/reports/drafts/nooverflow390/820 đạt.
- [x] Historical3samplesgeometry+3assignmentcommoncachefilled; catalogtimeoutfixed; no regrade/scoreapprovalchange.
- [x] Historicalfix sourcegate: full3040/3040(288files),focused24/native21/UI3,lintapp/API/build exit0, GeminihistoricalPASS; Rulesunchanged.
- [x] Sourcef58109a pushmainexit0remoteSHAexact; APItypecheckSUCCESS.
- [x] f581Gitdeploy+CIReady;3geometrysamplesrealannotationssaved, grades4/5.9/8.5remainapproved. Caches10=19/19,12=22/22,11=18/22missing4TF. HS/PH11see17marks.
- [x] Math/viewer/TFsourcegate full3073/lintapp/API/build/native/GeminiPASS; actual3graderenderfixtureschecked.
- [x] Source947fc00 pushmainexit0,remoteSHAexact; mathfence+inactive-dot+TFparse.
- [x] 947fcQualityGate38541940949SUCCESS.
- [x] 947fcgiaoandeweyREADY+CI; realKaTeXerrors0all22grade12/22grade11; viewer17ellipses16dots1numbered, HS390nooverflow/matherrors0.
- [x] TF11regen22/22ready including4missing, actual4stepdetailedreadsameGV/HS.
- [x] Staleclassrefreshone-lineguard9944ae3pushremoteexact,lint/buildpassed.
- [x] 9944QualityGate38543907179SUCCESS; remote main9944ae3exact.
- [x] 9944giaoandeweyGitautodeployREADY dpl_3qta11hQqZSWUU8yYmdTbJnJL8Ar,productionaliasReady;CI/remoteexact.947fc viewer/mathnativeproofverified.
- [x] PHthậtcùngHS11: report+11assignments/search/deadline/directsupplementform/scroll/image/nooverflow820 đạt; chưaupload.
- [ ] Bài chữaHS upload/eval vàfeedbacksendchưatestendtoend (không có bài chữa thực tế được chọn).

Source không đổi sau5f1380e; Rules source024a5a8 đã deploy. Giới hạn: browserplugin missing/ComputerUsepipe os error2;
Chrome actual-component fixture không thay realaccounts/AIquality. Gemini4Argon router keyinvalid/ag404;
UI code Gemini3.8Flash-low đã áp/review/test. Không bật trả phí hoặc đổi cấu hình.

Quality Gate GitHub7d7c889 SUCCESS; API Typecheck7c88a50 SUCCESS (xác minh14/10).

Nguồn chuẩn: `tasks/student-workspace-redesign-plan.md`; quyền triển khai + commit/push main đã có.
Người dùng chỉnh rõ: “push lên main”, không deploy/promote thủ công. Theo dõi Git integration nếu tự triển khai.
Worktree `C:\Users\ADMIN\.codex\worktrees\4c87\smart-lesson-plan-ai`, nhánh `codex/student-submitted-photos`.
Đọc HANDOFF.md trước khi phối hợp; không nhận file có writer đang chạy.

- [x] Kế hoạch được duyệt, giữ toàn bộ WIP ảnh/bút đỏ; ghi quyền phát hành.
- [x] Backend index/detail/report đúng quyền, toàn bộ lịch sử; writer backend đóng băng; tests35+46 và10 mới nhất đạt.
- [x] UI 5 mục, bài gọn, search/filter/paging20, clarify đúng bài; writer UI chốt guard phiên, QA browser còn lại.
- [x] Lời chữa/math có ý/bước, aligned; root; tests137/137, tiếp tục QA trực quan.
- [x] Test toàn bộ2931/2931 (275 files), lint app/API, build; Rules303/303 (8 files); exit0.
- [x] QA browser390/430/820/1024/1366 +300/500; review native/Gemini PASS, không finding chặn.
- [x] Commit/push main: source7c88a50d4765fdcbbf6c8384aa97194c41ea6ab9; git ls-remote xác nhận đúng SHA, push exit0.
- [x] Cập nhật bằng chứng/checklist/HANDOFF để Claude tiếp quản. Commit tiếp chỉ chốt tài liệu, source không đổi.

Bridge chưa có phiên sống. Canary: ChatGPT cx/gpt-6-luna OK; Claude 429 (reset dự kiến 05:59 ICT); Gemini ag/pro 404, gc/pro 403. UI/backend native Codex; review khác hãng đang chờ khả dụng.

Review đã đóng: identity snapshot TRƯỚC live merge; nested report sai kiểu/enum bị từ chối;
nhãn pending chỉ blank chờ GV; closed mutation bị chặn server. Math giữ bảng/trích dẫn/danh sách và dấu câu.

QA cập nhật: browser fixture thật 390/820 đã đạt nav/paging/search/date/scoped clarify/draft/upload/report/math,
không tràn ngang. Reviewer native source PASS, Gemini UI PASS + backend adjudication PASS (finding sai được đối chiếu source/test).
Full suite2920 đạt trước guard đóng bài; bản cuối2931/2931 đã đạt. Một test22 lần scrypt timeout5s khi tải cao;
riêng test đó36/36 đạt,2821ms. Chỉ tăng timeout test đó15s, không sửa mã xác thực hoặc bỏ kiểm quyền.
Cổng push main: passed; base a7b7f93, push fast-forward7c88a50 đã xác minh. API Typecheck/Quality Gate đang chạy trên GitHub.
Không gọi deploy/promote thủ công. QA production phiên mới / độ đúng AI định vị là việc còn lại, không coi push là đã QA production.

# Tiep quan phat hanh 2026-10-10

- [x] Xac minh phien Claude qua URL trong commit a7b7f93; HEAD va origin/main trung nhau.
- [x] Build production dung a7b7f93; kiem API tren giaoandewey.vercel.app truoc khi deploy Rules.
- [x] Deploy chi firestore:rules vao smartplan-ai-14200; kiem lai API va quyen doc cong khai.
- [x] Ghi bang chung phat hanh; giu nguyen bai nop thu va du lieu lop.

Ket qua: deployment dpl_DErfLFfEcSED2fTHaTVpdjUZquHP READY, target production,
commit a7b7f93b6accf679ed90dbf1c91f1201fa8ce8e3. Firebase deploy exit 0.
Sau deploy: trang chu HTTP 200; API submissionId khong ton tai HTTP 404 dung thong bao;
doc truc tiep Firestore khong dang nhap HTTP 403 PERMISSION_DENIED.
Gioi han: chua kiem thu lai bang phien GV/HS that; khong chay lai unit/emulator suite.
Build Vercel READY nhung log co TS2339 tai api/generate-simulation.ts:232 (HoldResult.reason).
Runtime probe co canh bao DEP0169 url.parse(); khong coi log hoan toan sach.

# Kế hoạch 2026-10-06: Báo cáo PH — khối "Bản đồ theo bài SGK"

Chủ dự án duyệt bản mẫu: mỗi bài SGK một thẻ màu, "Ưu tiên ôn trước", chú thích mỗi mức một dòng;
dễ nhìn trên điện thoại, iPad, laptop; xuống dòng theo cụm nghĩa.

## Sự thật đã kiểm
- Mỗi YCCĐ đã có nhãn `sgk` ("Bài 2", "Bài 3–4", "Chương V") → gom theo bài không cần dữ liệu mới.
- Thầy cô sửa mức / ghi chú / bỏ dòng YCCĐ trước khi lưu → khối theo bài phải tính TỪ CÁC DÒNG đã soát.
- Dòng chỉ lưu `evidence` + `percent`: một câu ghép vào 2 YCCĐ cùng bài sẽ bị đếm 2 lần → lưu thêm danh sách câu.
- Báo cáo công bố lưu nguyên `printInput` (giới hạn 300k ký tự) → trường mới đi theo, cổng PH dựng lại được.
- Kiểm 3 khổ bản hiện tại: "50–79%" bị cắt ở dấu gạch (iPad/laptop), "“Chưa đạt”" bị tách (điện thoại).

## Làm
- [x] `parentRequirements.ts`: dòng YCCĐ thêm `questions` (mã câu + điểm); sinh ở `aggregateRequirementLines`,
      giữ ở `sanitizeRequirementLines`; hàm thuần `buildLessonMap` (gom theo bài, đếm câu không trùng, bài cũ thiếu
      `questions` thì ước lượng thận trọng) + thứ tự ưu tiên ôn.
- [x] `parentReportPrintDoc.ts`: khối bản đồ ngay dưới đoạn tổng quan (bản web + PDF); có bản đồ thì bỏ thẻ
      "Điểm mạnh / Cần chú ý" trùng nội dung; sửa 2 chỗ ngắt dòng; thẻ không bị cắt khi sang trang PDF.
- [x] Màn soát của giáo viên: xem trước khối theo bài ngay trên danh sách YCCĐ.
- [x] Test thuần + test bản in; kiểm 3 khổ (390 / 820 / 1366) + PDF 780 bằng trình duyệt thật.
- [x] test + lint + lint:api + build; commit, đẩy nhánh.

## Kết quả (06/10)
- Mức của bài tính từ điểm các câu (giống mức từng dòng), KHÔNG theo mức thầy cô đổi tay ở từng dòng —
  để con số "Đạt x%" luôn khớp chú thích. Thầy cô chỉnh bản đồ bằng cách bỏ dòng ghép sai (xem trước ngay trên màn soát).
- Báo cáo đã lưu trước hôm nay: bản đồ vẫn hiện, chỉ tỉ lệ (không in số câu vì có thể đếm trùng).
- Có bản đồ thì bỏ "Tóm tắt nhanh" (trùng nội dung); gợi ý ở nhà trỏ sang "Bản đồ theo bài SGK".
- Kiểm bằng trình duyệt thật: 390 / 820 / 1366 px + PDF xuất thật (html2canvas): không tràn ngang, mọi nhãn/chip
  một dòng, thẻ không bị cắt khi sang trang. Sửa luôn "Mã HS" bị tách dòng ở đầu báo cáo, "50–79%" bị cắt ở dấu gạch.
- Dữ liệu chương trình: YCCĐ lớp 12 Bài 16 mang tên chủ đề "Phương trình đường thẳng trong không gian" (trùng Bài 15)
  — tên bài theo chủ đề CT, chưa có bảng tên bài SGK.

## Bài kiểm tra định kì có mã đề (làm 06/10 — AI tự đọc mã đề, chủ dự án chọn)
Chủ dự án (06/10): khối 12 có 4–8 mã, MỘT file gộp hết các mã; khối khác 1–4 mã, MỖI mã MỘT file.
GV chấm tay trước, HS chụp bài đã chấm nộp lên luồng HS như BTVN.

### Sự thật đã kiểm
- Mỗi bài giao chỉ có MỘT `answerKey` + MỘT `sourceText`; ngữ cảnh chấm dựng một lần cho cả bài (`gradeContextFor`).
- HS nộp bài ghi thẳng Firestore, rules giới hạn đúng danh sách trường → thêm "mã đề" vào bài nộp = sửa rules
  + chủ dự án chạy `firebase deploy --only firestore:rules`.
- Báo cáo PH không phân biệt loại bài: bài KT nộp lên sẽ vào điểm TB BTVN, "Kết quả từng bài", "bài chưa nộp",
  hồ sơ năng lực — trong khi điểm thi đã có ở mục "Điểm thi định kì" (Sheet).
- Ghép câu → YCCĐ dựa trên kết quả chấm từng câu (giải thích, đáp án, bài làm), không cần nội dung đề từng mã.
- Bài đã chấm tay có nét bút giáo viên (chữa đáp án đúng cạnh câu sai) → AI dễ đọc nhầm thành bài làm của em.

### Giai đoạn
- [x] P1 Dữ liệu + báo cáo: bài giao đánh dấu "Kiểm tra định kì" (gắn cột điểm Sheet tương ứng) + danh sách mã đề
      (mã, đề, đáp án). Projection GV/HS. Báo cáo: không vào điểm TB BTVN / từng bài / chưa nộp / hồ sơ năng lực;
      vào bản đồ theo bài với nguồn "KT".
- [x] P2 GV đẩy đề: một ô kéo-thả mọi file; tách theo mã (đầu mục "Mã đề …" trong file gộp, hoặc mỗi file một mã);
      AI rút đáp án từng mã; bảng xác nhận (mã · số câu · đáp án) sửa được trước khi giao.
- [x] P3 HS nộp + chấm: mã đề của bài nộp; chấm theo đúng đề/đáp án của mã đó; lời dặn AI bỏ qua nét chấm của GV;
      điểm GV trong Sheet là chính thức, tổng AI lệch > 0,5 → cờ soát.
- [x] P4 Test + QA trình duyệt (file gộp 8 mã, 4 file rời) + lint/build.

### Kết quả (06/10)
- Kiểm bằng trình duyệt thật (hộp "Giao bài" thật, chỉ thay lượt AI rút đáp án + sổ điểm bằng bộ giả vì môi trường
  không có khoá Gemini): file gộp 8 mã khối 12 (.docx) → đủ 8 mã, không đề nào lẫn chữ mã khác/bảng đáp án;
  4 file rời (3 .docx + 1 PDF) + file đáp án riêng → đủ 4 mã, đáp án đúng cột; mã thiếu đáp án → chặn giao.
  390 / 820 / 1366 px: không tràn ngang, không nhãn nào bị ngắt dòng.
- CHƯA kiểm với Gemini thật: AI rút đáp án từ bảng, AI đọc mã đề trên ảnh bài đã chấm bút đỏ. Cần QA trên production.
- [x] (chủ dự án đồng ý) Cổng học sinh: bài định kì không hiện điểm AI (thẻ bài, hộp chi tiết, dòng thời gian,
      điểm TB, bảng điểm, thông báo, điểm từng câu) — chỉ hiện đúng/sai + nhận xét từng câu.
- [x] Thống kê từng câu của lớp: bài ≥ 2 mã gom theo (mã, câu), nhãn "Mã 1201 · Câu 5".
- Giới hạn còn lại: khung "xem đề" của thống kê chưa lấy được nội dung câu dạng "Phần I – Câu 1" (bộ đọc đề
  `extractQuestionCatalogFromText` chưa hiểu Phần I/II/III đánh số lại) — số liệu không ảnh hưởng.

# Kế hoạch 2026-10-01: Sửa chấm sai từng câu (BTVN)

Chủ dự án chốt: bài đã duyệt GIỮ đã duyệt khi sửa đáp án cả lớp; Đúng/Sai theo thang THPT
(đúng 1 ý 0,1 · 2 ý 0,25 · 3 ý 0,5 · 4 ý trọn điểm câu).

## Sự thật đã kiểm
- "Sửa điểm" cũ chỉ sửa điểm tổng; bảng từng câu chỉ xem → em thấy bảng câu mâu thuẫn điểm tổng.
- `grade.score` là điểm AI tự cộng, KHÔNG luôn bằng tổng điểm các câu (có bài AI quy đổi thang).
- Chấm lại (nhanh/kĩ) ghi đè toàn bộ kết quả câu, kể cả chỗ GV đã sửa.

## Làm
- [x] `src/lib/classroom/questionRescore.ts` (thuần): nhận dạng trắc nghiệm / Đúng-Sai (1 ý hoặc cả câu) / trả lời ngắn,
      chấm lại không cần AI; tính lại điểm tổng (bằng tổng câu, hoặc cộng phần chênh theo tỉ lệ khi AI quy đổi thang);
      áp đáp án đã sửa; giữ câu GV đã sửa khi AI chấm lại. Test đủ ca.
- [x] Hộp "Sửa điểm": bảng từng câu sửa được (Em làm / Đáp án / Điểm), câu khách quan tự chấm lại, tổng tự cộng.
- [x] Máy chủ `saveSubmissionGrade` nhận `questionResults` (kiểm khớp câu, kẹp điểm), đánh dấu `teacherEdited`.
- [x] "Sửa đáp án câu này cho cả lớp": lưu `answerKeyFixes` trên bài giao, chấm lại tất định câu đó ở mọi bài đã chấm,
      câu tự luận → gắn cờ cần soát; bài đã duyệt giữ duyệt + đồng bộ lại hồ sơ; có lịch sử.
- [x] AI chấm (lần sau/bài nộp muộn): prompt nhận đáp án đã sửa + áp lại tất định; giữ câu GV đã sửa.
- [x] Prompt phòng ngừa: ô tô bị tẩy/gạch là huỷ, không chắc → needsTeacherReview; định dạng chuẩn
      trắc nghiệm "C", Đúng/Sai "a) Đ; b) S; c) Đ; d) S", trả lời ngắn chỉ ghi số; thang THPT cho Đúng/Sai.
- [ ] Test + lint + lint:api + build; HANDOFF; đẩy main; tự QA trên web thật.
- [ ] (Sau) "AI chấm lại câu này" kèm lời dặn của GV cho câu tự luận.

# Kế hoạch 2026-09-30: Báo cáo PH — "Điểm mạnh & cần rèn" theo YÊU CẦU CẦN ĐẠT

Chủ dự án: rút gọn, viết chính xác bằng ngôn ngữ Toán học (gia sư/cố vấn đọc là biết con kém/tốt ở đâu);
số dòng phụ thuộc YCCĐ; tra CT GDPT 2018 + SGK Kết nối tri thức + LO TDS.

## Sự thật đã kiểm
- CT GDPT 2018 (TT 32) rút chữ được; SGK KNTT là PDF scan — ô "Kiến thức, kĩ năng" ≈ YCCĐ của CT chia theo bài.
- LO TDS khối 10 (19 LO, mức chủ đề) lấy từ file mẫu điểm SSM user đã gửi — thô hơn YCCĐ, để dành gắn sau.
- Hiện tại danh sách lấy từ `profile.topics` (chữ tự do AI ghi mỗi lần chấm) → trùng ý, lẫn tầng, ~26 dòng.
- Bằng chứng thật có sẵn: `grade.questionResults` (từng câu: status/score/errorType/explanation).

## Làm (xong 01/10 — QA Codex PASS; còn: YCCĐ lớp 11, 12)
- [x] `src/lib/curriculum/yccdToan.ts` — YCCĐ lớp 10 (75 mục, lời CT; mục phép toán vectơ tách theo bài SGK). Lớp 11, 12 sau.
- [x] Facts gửi AI: bài đã duyệt trong kì → từng câu (token b1q2, % điểm, loại lỗi, giải thích ngắn).
- [x] AI (chung một lượt với nhận xét) trả JSON: nhận xét + ghép câu→YCCĐ + ghi chú lỗi/điểm mạnh bằng thuật ngữ.
      Máy chủ kiểm id YCCĐ/token, TỰ TÍNH mức từ điểm các câu làm căn cứ (≥80% vững, ≥50% đang hình thành, còn lại chưa đạt).
- [x] Lưu cùng nhận xét (`parentReportNotes`), GV sửa mức/ghi chú/xoá dòng; xuất cả lớp dùng bản đã lưu.
- [x] PDF: mục "Kết quả theo yêu cầu cần đạt" nhóm theo chủ đề; chưa có bản AI → danh sách cũ gộp trùng, tối đa 6.
- [x] Test + build + nghiệm thu trên web thật (Bảo Khánh, 10Olinda, tháng 9).

# Kế hoạch 2026-09-23: Quản trị + đếm token/chi phí + sổ điểm

Chủ dự án chốt: (1) làm trang quản trị cho tài khoản congapro60@gmail.com, (2) sổ điểm đủ (đồng bộ điểm thi + nhập điểm HS1),
(3) rà soát + chuẩn bị lớp cho cô Vân/Hạnh/Hồng qua trang quản trị, KHÔNG ghi đè dữ liệu có sẵn (cô Hạnh).

## Sự thật đã kiểm (không đoán)
- Chưa có ghi token ở đâu cả. Gọi AI bằng KEY CHUNG của chủ dự án (tốn tiền chủ): `_grading-core.ts` (chấm BTVN,
  GRADING_GEMINI_API_KEY/GEMINI_API_KEY), `generate-simulation.ts` (GEMINI_API_KEY), `_ai-gateway-core.ts` (AI_GATEWAY_API_KEY, GLM 5.2).
  Soạn giáo án/tạo đề chạy ở trình duyệt bằng key riêng người dùng → người dùng tự trả.
- Lịch sử đăng nhập có sẵn trong Firebase Auth (metadata createdAt/lastSignIn) → đọc bằng Admin SDK phía máy chủ.
- Không có trang quản trị nào; giới hạn 12 Vercel Function → thêm action vào endpoint có sẵn.

## GĐ1 — Bộ đếm token (làm trước: mỗi ngày trễ là mất dữ liệu)
- [ ] `api/_ai-usage.ts`: `recordAiUsage({uid,email,role,classId,ownerTeacherId,feature,model,inputTokens,outputTokens,cachedTokens})`
      → collection `aiUsage` (chỉ máy chủ ghi; rules chặn client). Lỗi ghi KHÔNG làm hỏng lượt chấm.
- [ ] Gắn vào 3 chỗ gọi key chung, lấy số từ `usageMetadata` (Gemini) / `usage` (gateway). Lượt HS nộp → tính cho GV chủ lớp.
- [ ] Test: ghi đúng số token, thiếu usage vẫn không vỡ; rules chặn client đọc/ghi `aiUsage`.

## GĐ2 — Trang quản trị (chỉ congapro60@gmail.com, email Google đã xác minh, kiểm ở MÁY CHỦ)
- [ ] Người dùng: email, vai trò, ngày tạo, lần đăng nhập cuối (Auth listUsers).
- [ ] Lớp theo giáo viên: sĩ số, số bài giao, số bài nộp/đã chấm AI (đọc-only).
- [ ] Token & tiền theo người/lớp/tháng: USD theo bảng giá chính thức (ghi nguồn + ngày), quy VND theo tỷ giá (sửa được, ghi ngày).
      Có cả dòng của chủ dự án. Quá khứ trước GĐ1: dòng "ƯỚC TÍNH" = số bài đã chấm × token TB đo được.
- [ ] Xuất bảng kê (CSV) từng người để thu tiền.
- [ ] Chuẩn bị lớp cho các cô: xem lớp đã có; tạo lớp mới từ danh sách file Drive — BỎ QUA lớp đã tồn tại.

## GĐ3 — Sổ điểm (HS xem, báo cáo PH dùng chung) — kế hoạch chi tiết 2026-09-24
Quyết định: 1 document `scoreBooks/{classId}` (≤ vài chục HS, xa trần 1MB), CHỈ máy chủ đọc/ghi (rules mặc định chặn →
KHÔNG phải phát hành lại firestore.rules). HS đọc qua action `studentScoreBook` (lọc đúng dòng của mình theo studentLinks,
như `studentSubmissions`). BTVN KHÔNG chép vào sổ — lấy thẳng từ bài đã duyệt (một nguồn sự thật).
- [x] `src/lib/classroom/scoreBook.ts` (thuần): kiểu dữ liệu, kiểm điểm HS1 (0–10, ≤2 số lẻ), làm sạch điểm thi,
      `studentScoreView`. BTVN dùng thẳng `officialActivities` (không cần hàm riêng). Test 6.
- [x] `examService.fetchClassExamScores(sheet, roster)`: đọc file điểm 1 lần cho cả lớp, khớp Mã HS.
- [x] `api/_score-book.ts`: `teacherScoreBook`, `saveHs1Column`, `deleteHs1Column`, `saveExamScores`, `studentScoreBook`. Test 5.
- [x] GV: tab "Sổ điểm" trong lớp — đồng bộ MOET/TDS, bảng nhập/sửa/xoá cột điểm hệ số 1.
- [x] HS: mục "Bảng điểm của em" (BTVN, thi định kì MOET, điểm quý TDS, hệ số 1).
- [x] Báo cáo PH (màn hình + PDF) đọc điểm thi + HS1 từ sổ điểm.
- [x] Nghiệm thu: 180 file/2.080 test, lint, lint:api, build; production `a423c72`.

### Review GĐ3 (production 24/09)
- 11Columbus: đồng bộ 26/26 em khớp Mã HS (Khảo sát đầu năm). 12LoTrinh1: 8/8, có Tuấn Nam (3.6) sau chuyển lớp.
- Cột HS1 thử: ô "11" bị tô đỏ + chặn lưu; sửa 9 lưu được, TB đúng; bản phụ huynh hiện MOET + HS1; mở lại cột điền sẵn điểm; xoá cột sạch trên máy chủ.
- 10Olinda: 18/19 — sửa Mã HS tạm `10OLINDA-19` của Bảo Khánh thành GB0120040234 (theo Sheet) rồi đồng bộ lại → 7. Trần Hữu Bảo Nam: ô KSĐN trên Sheet trống.
- CHƯA: cổng học sinh chưa thử bằng phiên HS thật (đăng nhập HS sẽ đá phiên GV) — dựa test API.

## Cần chủ dự án chốt trước GĐ2
- Tính tiền cho ai khi HỌC SINH nộp bài được chấm: giáo viên chủ lớp (đề xuất).
- Tỷ giá: Vietcombank bán ra ngày chốt (đề xuất), sửa tay được.

# Kế hoạch 2026-09-24 (tiếp): khoá AI riêng + trần chi tiêu + hoá đơn tháng
Chủ dự án chốt: nhóm (chủ dự án + Hạnh, Vân, Hồng) dùng thẳng khoá chung; GV khác dùng khoá Gemini riêng, hết/không có
khoá → AI dừng, bài HS nằm chờ + báo khi đăng nhập; bất kỳ lúc nào GV có thể đồng ý dùng khoá chung và bị tính tiền.
Khoá cất vùng chỉ máy chủ. Trần tiền/tháng TUỲ CHỌN với mọi GV (chạm trần → AI dừng, GV nâng trần là chạy tiếp).
Hoá đơn TỰ PHÁT HÀNH ngày 1 (lập khi có người mở lần đầu sau khi hết tháng), xem trong app + tải PDF, kèm minh chứng từng lượt.
- [x] `aiKeyPolicy.ts` (thuần) + test; `_ai-keys.ts`; chọn khoá trong `callGeminiVision`/mô phỏng/cổng GLM; 402 AI_KEY_REQUIRED.
- [x] Bài HS bị chặn → `aiBlocked` giữ trạng thái cũ; bảng kê bỏ lượt khoá riêng (`keySource`).
- [x] Bộ đếm chi tiêu tháng `aiSpend/{uid}_{YYYY-MM}` + trần `monthlyCapVnd` (lý do chặn `cap_reached`).
- [x] ĐỔI MÔ HÌNH (chủ dự án chốt 09-24): trả trước qua ví SePay, trừ dần từng lượt; sao kê tháng thay hoá đơn trả sau
      (đầu kỳ + nạp + điều chỉnh − trừ, minh chứng từng lượt, tỷ giá lưu trên từng lượt); mã giảm giá 10–100%.
- [x] Giao diện GV: tab "Chi phí AI" (ví + QR, mã giảm giá, trần, khoá riêng, đồng ý, chấm lại bài chờ, sao kê + PDF),
      hộp chọn khi bị chặn (tự thử lại), banner khi có bài chờ / ví cạn.
- [x] Quản trị mục 6–10: công tắc + nhóm, tài khoản nhận tiền + webhook, mã giảm giá, ví + điều chỉnh, giao dịch chưa khớp, sao kê.
- [x] Test + lint + build (186 file / 2.121 test).
- [x] QA production 25/09: tab Chi phí AI + Quản trị mục 1–10 chạy; lưu nhóm (Hạnh, Hồng, 3 tài khoản của Vân);
      mã THANG10 100% 25/09–31/10 gán 5 tài khoản; BẬT tính phí; "Chấm cả lớp" của chủ dự án qua cổng bình thường.
- [x] Mục 7 làm lại theo ý chủ dự án: nhiều tài khoản nhận tiền + ảnh QR tự tải, chọn tài khoản đang dùng.
- [x] Sửa: khoá riêng luôn chạy trước kể cả người trong nhóm (trước đây bị bỏ qua → trừ ví oan).
- [ ] Chủ dự án tự làm: thêm tài khoản nhận tiền (mục 7), webhook SePay + biến Vercel `SEPAY_WEBHOOK_KEY` — xong trước 01/11.

# Kế hoạch 2026-09-29: báo cáo PH theo kì (tháng / GK1 / CK1 / GK2 / CK2 / cả năm)
Chủ dự án chốt: chọn tay "từ ngày … đến ngày …" mỗi lần xuất; điểm thi định kì hiện TẤT CẢ cột (không phân kì →
không tính ĐTB môn TT22); nhận xét GV = AI soạn nháp, GV sửa, lưu lại; xuất từng em + cả lớp (ZIP).
- [x] `reportPeriod.ts` (thuần): loại báo cáo, khoảng mặc định (chỉ để điền sẵn), lọc bài giao/bài nộp/HS1 theo khoảng,
      chuỗi điểm theo tháng, so sánh (tháng trước / nửa đầu–nửa sau / HK1–HK2) + test.
- [x] Bản in: tiêu đề + khoảng thời gian, khối so sánh, biểu đồ theo tháng (kì/năm), mục "Nhận xét của giáo viên".
- [x] Máy chủ: `draftParentComment` (AI, tính cho GV chủ lớp) + lưu/đọc nhận xét `parentReportNotes` (chỉ qua API).
- [x] Giao diện từng em (chọn loại + khoảng, AI soạn nháp, sửa, lưu, tải PDF) + xuất cả lớp ZIP ở tab Báo cáo.
- [x] Test + lint + build + QA production.

- [ ] SSM native follow-up: đọc lớp/cache + Auto-Wake + từ chối ô thiếu trên0.3.1 thật đạt.0.3.2 CKEditor đã main/Ready, CI3104đạt. Chờ user cập nhật0.3.2 để kiểm editor; Excel/roster/cloudsync/cross-machine thật chưa kiểm. Không Save/Submit.

## 2026-10-19 - Bot Cuong Vu

- [x] Zalo Bot Platform channel, private identity and webhook on existing Vercel endpoint.
- [x] Local security/regression tests, lint and build.
- [ ] Real bot creation, secure configuration, deployment and private canary.

Plan: `docs/superpowers/plans/2026-10-19-zalo-bot-platform.md`.
Natural-language assistant remains incomplete; transport tests are not live proof.

## Fix luồng điểm LO SSM — API shape mới (24/10/2026)

### Vấn đề
- SSM panel bấm "Tải bảng điểm từ SSM" → luôn "0 LO, 0 học sinh", không lỗi.
- Bắt network trang chấm IA1 thật (`ssm.edufit.vn/.../evaluate/9681/criteria/2219/assessment-form/15328/subject/12/quarter/15`) cho thấy SSM đã đổi luồng API:
  1. `class-subject-assessment?af&crit&class` → giờ CHỈ trả metadata (`quarter_has_branch_id`, `result_assessment_form_id`, `is_approved`…), KHÔNG còn `assessment_forms` lẫn `students`.
  2. Cây LO + thang điểm: `GET v2/evaluation/criteria-has-assessment-form/{criteriaId}?assessment_form_id={formId}` (proxy cũ gọi `{formId}` → 422; thang giờ nằm ở ROOT của response).
  3. Học sinh + điểm: `GET v2/evaluation/student-by-subject?af&crit&class&subject_id` (endpoint mới, chưa map).
- Shape confirm từ response thật (24/10/2026):
  - criteria-tree: `{data: {…, assessment_forms: {data: {id, name:'IA1', ratio, focal_points: {data:[…]}}}, scoring_scale: {data: {id:21, name:'Thang4_26-27', score_configs: {data:[{id:84, point:"N", is_number:false},{id:85, point:4, is_number:true}…]}}}}}`.
  - students: `{class_id, subject_id, students: [{id, full_name, code, point(null khi chưa chấm)}]}`.

### Đã làm (commit `7b2b412` — lần đầu `ba44405`, rebase lên `af1b84b`, đã push 24/10)
- [x] `api/_ssm-proxy.ts`: map đúng `criteriaAssessment` (criteriaId + formId, giữ fallback cũ) + thêm op `studentBySubject`.
- [x] `src/lib/ssm/ssmBridge.ts`: `readSsmCriteriaAssessment(criteriaId, formId)` + thêm `readSsmStudentsBySubject`.
- [x] `src/lib/ssm/loSsmParser.ts`: scale từ root (fallback legacy assessment_forms) + thêm `mergeSsmLoad(meta, tree, students)`.
- [x] `SsmPanel.tsx`: load & verify dùng 3 endpoints qua `fetchSsmCriteriaPayload` + `mergeSsmLoad`.
- [x] Tests: fixture shape mới (META_V2/TREE_V2/STUDENTS_V2) + test mergeSsmLoad — 9/9 pass; build + tsc app + lint:api đều exit 0.

### Còn lại
- [ ] QA trên preview sau deploy: tải IA1 (kỳ vọng "N LO, 26 học sinh") → gợi ý AI → xem trước diff → xác nhận đẩy → đọc lại verify 100%.
- [ ] Rủi ro mở: endpoint GHI điểm (`writeLoGrades`) có thể cũng đã đổi shape — nếu lỗi khi đẩy, bắt network POST trang chấm SSM rồi sửa proxy.

