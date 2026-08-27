# HANDOFF — Soạn giáo án / lớp học / chấm AI

**Cập nhật:** 2026-08-26
**Repo:** `soangiaoan` · **Branch chuẩn:** `main`
**Production URL:** https://giaoandewey.vercel.app

Đây là snapshot hiện tại. Lịch sử các lô cũ xem trong [`docs/HANDOFF-ARCHIVE.md`](docs/HANDOFF-ARCHIVE.md) và `git log`.

## 0. Lô báo cáo lớp và cộng tác giáo viên — 2026-08-27

**Nền tảng commit code:** `7c6964f` · **Spec:** `f731b7c` · **Lô bổ sung:** commit phát hành hiện tại trên `codex/class-report-collaboration`

### Lô bổ sung báo cáo, xem câu hỏi và ảnh bài nộp — 2026-08-27

- Khuyến nghị dạy học nay nêu rõ dữ liệu ghi nhận, việc làm trên lớp và cách kiểm tra lại; nhãn trung tính như “Không có” không bị tính thành lỗi.
- Thêm ma trận học sinh × bài giao, gồm trạng thái chưa nộp/đang làm/chờ chấm/đã duyệt, điểm, số lượt nộp, tỷ lệ hoàn thành và điểm trung bình chính thức. Ma trận dùng lại snapshot báo cáo đã tải, không gọi thêm API và không ghi dữ liệu.
- Trong thống kê theo câu, giáo viên có thể di chuột hoặc bấm số câu để xem nội dung câu thật. Đề online dùng cấu hình đề; đề upload có chữ được tách theo nhãn câu; nguồn không đủ cấu trúc hiện thông báo trung thực và liên kết đề gốc, không suy đoán.
- Nội dung câu hỏi, đáp án tham chiếu và nhận xét đi qua renderer Markdown/KaTeX hiện có để công thức hiển thị đúng.
- Ảnh bài nộp của từng học sinh mở trong một modal duy nhất có ảnh Trước/Sau, số thứ tự, phím mũi tên và Esc; PDF/Word vẫn mở theo liên kết tệp riêng.
- Không migration, không đổi schema/ID, không ghi/xóa Firestore/Storage và không đụng điểm, nhận xét, bài giao hoặc bài nộp hiện có của lớp 11 Columbus.
- Đã xác minh: focused 4 file/37 test PASS, `lint`, `lint:api`, `build`, `git diff --check` PASS. Build chỉ còn cảnh báo chunk/dynamic import vốn có.
- Chưa chạy authenticated browser E2E trong phiên này; sau khi deployment Ready/Production, chủ lớp có thể tự QA luồng báo cáo và viewer bằng dữ liệu thật ở chế độ đọc.

### Hotfix tải báo cáo — 2026-08-27

- Ổn định danh sách tên lớp cũ khi lớp chưa từng đổi tên, tránh `useEffect` tạo vòng lặp gọi lại `/api/classroom` sau mỗi lần render.
- Giới hạn thời gian chờ từng nguồn đọc báo cáo ở 20 giây; khi nguồn treo, giao diện báo lỗi thay vì quay vô hạn. Đây là read-only guard, không hủy/xóa/sửa dữ liệu.
- Regression test đã có cho cả hai lỗi; không migration, không thay đổi ID, Firestore/Storage, điểm, nhận xét, bài giao hoặc bài nộp của bất kỳ lớp nào.
- Đã xác minh: test báo cáo 15/15, test nhóm lớp/chấm 302/302, `lint`, `lint:api`, `build` và `git diff --check` PASS. Full suite/E2E sẽ chạy tiếp sau khi hotfix lên main.

### Đã đổi và vì sao

- Thêm nút **Tạo báo cáo** để giáo viên chủ động tính lại báo cáo cho mọi bài đã giao, kể cả bài chưa có học sinh nộp; khi một nguồn lỗi, snapshot đang hiển thị không bị thay bằng số liệu rỗng.
- Báo cáo giữ projection lượt mới nhất, bài ảnh/AI và bài online; không giới hạn theo số học sinh nộp, không lưu thêm report document và không đụng dữ liệu chấm/bài nộp hiện có.
- Thêm cổng server-side cho giáo viên cộng tác: mời bằng email tài khoản, đồng giáo viên, chuyển quyền sau khi chấp nhận, rời lớp và xóa thành viên; chủ gốc được bảo vệ và thao tác xóa thành viên không xóa bài nộp/ảnh.
- Đưa đọc lớp, bài giao, bài nộp, chấm AI, sửa tay, duyệt, xóa điểm và chấm lại qua kiểm tra quyền lớp; giữ nguyên `classId`, `teacherId` namespace legacy và đường học sinh hiện có để bảo vệ dữ liệu 11 Columbus.
- Cho phép đổi tên lớp, học sinh và bài giao mà không đổi ID; lưu tên lớp cũ để ghép bài online legacy sau khi đổi tên. Sửa điểm/nhận xét vẫn lưu history và buộc duyệt lại.
- Giao đề online cho lớp dùng projection không chứa câu hỏi/đáp án, đồng thời co-owner lấy đúng namespace đề của lớp thay vì namespace riêng.

### Còn dở và cố tình bỏ qua

- Chưa có email gửi ra ngoài; lời mời hiện nằm trong ứng dụng và chỉ hiện cho tài khoản đăng nhập đúng email. Đây là lựa chọn có chủ đích để không thêm dịch vụ gửi thư/secret vào lô này.
- Chưa chạy được authenticated E2E trên production: Chrome connector không khả dụng trong phiên này. Local unauthenticated smoke không có console error nhưng không thay thế xác nhận tài khoản thật.
- Ox Alpha Free/OpenCode đã được gọi bằng `opencode/x-preview-f-free` nhưng provider trả `Unexpected server error` ở `err_81d184c4` và `err_a6cfdca1`; không dùng làm verdict QA PASS. Subagent review cũng hết quota.
- Không thay đổi Firestore/Storage rules, không migration/bulk mutation và không thao tác dữ liệu thật của lớp 11 Columbus trong lô này; các thao tác cộng tác giáo viên đi qua API Admin hiện có.

### Ngưỡng sắp cắn người sau khi deploy

- Chỉ dùng các nút cộng tác sau khi deployment của `cb7d9e9` ở trạng thái **Ready / Production**; kiểm tra alias production trước khi thao tác dữ liệu thật.
- Tài khoản giáo viên được mời phải đăng nhập đúng email nhận lời mời; chuyển quyền chỉ hoàn tất sau khi người nhận bấm chấp nhận.
- Sau khi deploy, kiểm tra read-only lớp 11 Columbus trước; không dùng bài thật đang nộp làm fixture cho xóa điểm/xóa lượt/chấm lại.
- Báo cáo online legacy không có `studentId` chỉ ghép an toàn khi tên và tên lớp (kể cả `previousNames`) không mơ hồ; trường hợp mơ hồ phải hiện thiếu dữ liệu thay vì tự gán.

### Lệnh nghiệm thu lô

```powershell
$worktree = "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\class-report-collaboration"
npm --prefix $worktree run test -- --run
npm --prefix $worktree run lint
npm --prefix $worktree run lint:api
npm --prefix $worktree run build
git -C $worktree diff --check
```

## 1. Trạng thái đã bàn giao

`main` trước lô phát hành này ở `b0a9a478`; commit sắp đẩy là `ca9fd1a` (kèm spec commit `074f288`), gồm nền tảng các lô trước và các thay đổi classroom sau:

- `afaa725`: chi tiết chấm AI theo từng câu, nguồn đề giáo viên, lệnh phạm vi chấm và các hàng rào duyệt.
- `9a28f6f`: dọn file Storage trước khi xoá bài; URL hỏng trả lỗi cụ thể và giữ document để sửa/thử lại.
- `c1d4343`: lệnh phạm vi AI áp dụng xuyên suốt bài giao.
- `5beffd1`: cập nhật handoff cho lô trên.

### Lô `5574227` → `7c80579` — vòng đời nộp bài và kết quả chấm an toàn dữ liệu

- Học sinh có thể bổ sung ảnh/file cho cùng bài; server ghép evidence cũ + mới, tạo revision và chấm lại toàn bộ evidence.
- Giáo viên có thể xóa riêng điểm mà vẫn giữ submission, ảnh/file, Storage và nội dung học sinh; xóa cả lượt nộp vẫn là thao tác riêng.
- Sửa điểm bằng tay lưu lịch sử append-only và buộc duyệt lại; AI chấm lại lưu kết quả cũ vào history, tạo kết quả mới chưa duyệt; AI lỗi giữ nguyên kết quả cũ.
- Duyệt/bỏ duyệt điểm đi qua server transaction; kiểm tra chéo `teacherId`, `classId`, `studentCode`, `assignmentId` và khóa các thao tác xung đột khi trạng thái là `grading`.
- Claim token + transaction finalize ngăn worker AI cũ ghi đè sau stale recovery, sửa tay hoặc xóa điểm; history dùng revision id ổn định để retry không nhân bản.
- Không có migration/bulk mutation production; không tạo Vercel Function mới. `api/_grade-lifecycle.ts` là helper, còn action chạy trong các function hiện có.

### Lô `c1d4343` — lệnh phạm vi AI của bài giao

- Ô lệnh nằm ngay cạnh **Đề gửi học sinh**, không hiện trong portal học sinh.
- `gradingInstructions` được truyền qua form → `gradingApi.ts` → `api/grade-homework.ts` → cả prompt giải đáp án và prompt hướng dẫn chấm.
- Assignment lưu lệnh; các lần nộp mới, nộp lại và chấm lại đọc bản mới nhất từ Firestore.
- Khi có lệnh, prompt chỉ giải/chia điểm phần được giao; phần bỏ qua không có đáp án nháp, mốc điểm, lỗi thường gặp hoặc `weakTopics` giả.
- Prompt xử lý phạm vi mơ hồ/mâu thuẫn bằng cảnh báo để giáo viên soát; không dùng regex hậu xử lý để cắt đáp án.
- OpenCode Ox Alpha implementer làm TDD RED → GREEN. OpenCode Ox Alpha QA độc lập phát hiện và sửa hai mâu thuẫn cũ: “giải từng câu” và “chia điểm cho từng câu”.

### Lô `074f288` → `ca9fd1a` — lọc lịch sử lượt nộp và sửa công thức nhận xét

- Màn hình giáo viên mặc định hiển thị đúng lượt nộp mới nhất của mỗi học sinh; có nút **Chỉ lượt mới nhất / Hiện cả lịch sử** để chuyển phạm vi xem.
- Lượt cũ không bị ghi đè hoặc tự động xóa. Giáo viên vẫn có thể mở lịch sử và chọn đúng lượt cũ để xóa có chủ đích.
- **Chọn lượt đang hiển thị** chỉ chọn các dòng thuộc projection hiện tại; chấm AI/duyệt tiếp tục chỉ xử lý lượt mới nhất, tránh chấm hoặc xóa nhầm dòng đang ẩn.
- Báo cáo/current calculations tiếp tục dùng projection mới nhất, không tính trùng các lần nộp; không đổi schema, API, Firestore rules, Storage hoặc dữ liệu 11 Columbus.
- Hai trường **Bài làm của em** và **Đáp án / mốc cần đạt** đi qua renderer Markdown/KaTeX để công thức Toán không còn hiện nguyên `$...$`/lệnh LaTeX.

## 2. Bằng chứng kiểm thử lô mới nhất

- Targeted lifecycle/hardening: **5 files / 37 tests pass**.
- Full Vitest: **83 files / 1.131 tests pass**.
- Firestore rules: **7 files / 242 tests pass**.
- `npm run lint`: pass.
- `npm run lint:api`: pass.
- `npm run build`: pass; chỉ còn warning chunk/dynamic import vốn có.
- `git diff --check`: pass.
- Ox Alpha Free/OpenCode audit trước của lô lifecycle: model `opencode/x-preview-f-free` — **PASS 7/7 hạng mục**. Lượt audit mới cho combined diff đã gọi đúng model/variant `max` nhưng provider trả `Endpoint is unavailable`, nên không dùng verdict PASS mới.
- Production smoke trước deploy: đã mở production và đọc lại lớp `11Columbus`/Bài nộp, thấy dữ liệu thật, 20/26 học sinh đã nộp và nhiều lượt nộp của cùng học sinh; chỉ điều hướng/đọc, không tạo/sửa/xóa/chấm dữ liệu.

## 3. Rủi ro và việc còn lại

- AI vẫn là mô hình xác suất: đáp án và rubric phải được giáo viên soát trước khi giao/chấm.
- Đáp án/rubric đã sinh trước khi nhập hoặc sửa lệnh không tự sinh lại; bấm lại nút AI hoặc sửa tay.
- `gradingInstructions` vẫn nằm trong document assignment. UI không hiển thị cho học sinh, nhưng đây chưa phải field-level secret; muốn tách tuyệt đối phải có private grading config riêng.
- Chưa claim authenticated E2E destructive trên production vì phiên browser chưa có bằng chứng chắc chắn của Firebase Auth; QA web hiện là read-only smoke.
- Sau khi deploy cần xác nhận Vercel deployment của commit `ca9fd1a` ở trạng thái Ready/Production trước khi dùng bộ lọc/xóa lượt trên dữ liệu thật.
- Đồng bộ profile/evidence sau approve là bước hậu transaction và có endpoint recovery; nếu process chết giữa hai bước, cần chạy recovery thay vì sửa tay dữ liệu.
- Các URL Storage cũ không nhận diện an toàn sẽ làm thao tác xoá thất bại có chủ ý thay vì xoá nhầm.

## 4. Kiểm tra production cần owner thực hiện

1. Xác nhận deployment Vercel commit `ca9fd1a` là **Ready / Production**; không chạy thao tác dữ liệu thật trước bước này.
2. Với fixture hoặc bài test riêng, xác nhận bổ sung ảnh → chấm lại toàn bộ → sửa điểm → duyệt lại → xóa điểm; không dùng bài đang nộp của 11 Columbus làm fixture.
3. Xác nhận `GRADING_GEMINI_API_KEY`, Anonymous Auth, Storage rules và Firestore indexes trên Firebase/Vercel.
4. Kiểm thử portal học sinh trên màn hình 320/375px, upload ảnh/PDF, lỗi mạng, retry và trạng thái nộp lại.

## 5. Lệnh nghiệm thu

Chạy từ PowerShell tại repo:

```powershell
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run test
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run test:rules
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run lint
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run lint:api
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run build
git diff --check
```

## 6. File trọng tâm

| Luồng | File |
|---|---|
| Form giao bài | `src/components/features/classroom/AssignmentFormModal.tsx` |
| Bảng bài giao/sửa assignment | `src/components/features/classroom/AssignmentPanel.tsx` |
| Lưu assignment | `src/lib/classroom/submissionService.ts` |
| Prompt chung | `src/lib/classroom/gradingPrompt.ts` |
| Client AI | `src/services/gradingApi.ts` |
| API chấm/giải/rubric | `api/grade-homework.ts` |
| Kiểu dữ liệu | `src/lib/classroom/types.ts` |
| Portal học sinh | `src/pages/StudentPortalPage.tsx`, `src/components/features/classroom/student/` |
| Rules | `firestore.rules`, `storage.rules` |

## 7. Quy ước

- Không dùng `git add .` trong worktree có thay đổi ngoài phạm vi.
- Không tuyên bố deploy production nếu chưa kiểm tra deployment thực tế.
- Với prompt có phạm vi, test phải kiểm cả chỉ dẫn mới và sự vắng mặt của chỉ dẫn tổng quát mâu thuẫn.

## 11. Lô V3 Live Lesson realtime G10 P31 — 2026-08-26

### Đã đổi và vì sao

- Đồng bộ `firestore.rules` với runtime pilot canonical: đủ 8 bước, gồm `route`; trước đó Rules chỉ cho 7 bước nên tạo phiên production báo `Missing or insufficient permissions`.
- TV chỉ subscribe `public/stats` khi giáo viên bật thống kê; document thống kê chưa tồn tại được đọc an toàn theo feature flag nhưng document đã có vẫn phải qua schema đầy đủ.
- Mutation điều khiển phiên đọc lại snapshot server sau `serverTimestamp`; retry ngắn có điều kiện khi `updatedAt` chưa materialize.
- Mọi listener `onSnapshot` bỏ qua snapshot cục bộ `hasPendingWrites=true`, tránh hiển thị lỗi giả trong lúc Firestore đang xác nhận ghi.
- Bổ sung regression tests cho Rules, TV và service; không mở thêm field/quyền ngoài contract V3.

### Bằng chứng nghiệm thu

- Full Vitest chạy riêng: **97 files / 1.309 tests PASS**.
- `npm run lint`, `npm run lint:api`, `npm run build`, `git diff --check`: PASS; build chỉ còn cảnh báo chunk/dynamic import hiện hữu.
- Rules emulator trước promotion: **8 files / 266 tests PASS**; `firebase deploy --only firestore:rules --project smartplan-ai-14200` compile/release thành công và báo bản cloud đã up-to-date.
- Vercel production: deployment `dpl_DAWLo3R3yuNom98BnDXgqUoNks3u`, **READY**, alias `https://giaoandewey.vercel.app`.
- Smoke phiên `LPw7TMjrxj4jnpoZLEpq`: tạo phiên thành công; GV/TV không còn lỗi quyền, stats listener hoặc timestamp; bật/tắt/bật lại thống kê thành công; TV hiện “Đang chờ thống kê tổng hợp…” khi chưa có bài nộp; phiên được trả về cue P00.

### Còn dở / cố tình bỏ qua

- Cổng học sinh đã tải đúng route và không còn lỗi quyền; smoke cùng trình duyệt đang đăng nhập GV nên bị nhắc đăng xuất. Cần kiểm thử nộp câu trả lời thật trên thiết bị/tài khoản học sinh riêng trước khi mở rộng đại trà.
- Không xử lý cảnh báo npm audit/chunk lớn trong lô này vì không liên quan lỗi live lesson và có thể tạo thay đổi dependency ngoài phạm vi.
- Không dùng `git push --no-verify`; hook handoff phải tiếp tục bảo vệ các lần phát hành sau.

### Lệnh nghiệm thu lô V3

```powershell
$worktree = "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\g10-p31-firestore-production"
npm --prefix $worktree run test
npm --prefix $worktree run lint
npm --prefix $worktree run lint:api
npm --prefix $worktree run build
npm --prefix $worktree exec -- vitest run src/services/liveLessonService.test.ts
git diff --check
```

## 8. Lô sửa JSON/LaTeX chấm bài — QA bổ sung 2026-08-25

- Nhánh đang kiểm thử: `codex/fix-classroom-math-render-duplicate`, HEAD `1cb9830` (`fix(classroom): normalize markdown math delimiters`). Chưa push `main`, chưa deploy và không chạm dữ liệu thật của 11 Columbus.
- Parser JSON chấm AI ưu tiên parse strict, phục hồi có kiểm soát lỗi escape LaTeX/ký tự Unicode không hợp lệ/ký tự điều khiển; hợp đồng điểm nghiêm ngặt; chỉ retry tối đa một lần với lỗi có thể phục hồi.
- Khi retry hoặc chấm lại thất bại: không nhân quota/lịch sử, giữ điểm cũ nếu có; bản học sinh không nhận thông tin nội bộ của giáo viên/provider; lỗi được hiển thị an toàn.
- Công thức trong **Bài làm của em**, **Đáp án / mốc cần đạt** và nhận xét đi qua Markdown/KaTeX; đã chuẩn hóa cả `$...$`, `$$...$$`, `\(...\)`, `\[...\]`.
- Bằng chứng: full Vitest **83 files / 1.184 tests pass**; focused parser/contract/math/UI/privacy **152 tests pass**; `npm run lint`, `npm run lint:api`, `npm run build`, `git diff --check` đều pass. Build chỉ còn các cảnh báo chunk/dynamic import hiện hữu.
- QA độc lập OpenCode/Ox Alpha Free (`opencode/x-preview-f-free`): **PASS**; xác nhận các hạng mục parser, contract, retry, quota/history/điểm cũ, privacy và render công thức. Còn 3 rủi ro P2 đã ghi nhận: batch regrade được phép ghi đè điểm đã duyệt theo chủ đích, bắt JSON nhiều object dùng greedy brace match, và quota không hoàn lại khi chi phí AI đã phát sinh.
- Báo cáo tổng hợp theo từng bài (phân bố điểm, tỷ lệ đúng từng câu, lỗi phổ biến, chủ đề yếu và khuyến nghị) **chưa thuộc lô này**; báo cáo học sinh hiện có và dữ liệu `questionResults`/`weakTopics` là nền cho milestone analytics riêng.

## 9. Lô báo cáo tổng hợp theo từng bài giao — 2026-08-25

- Nhánh triển khai: `main`; đã fast-forward và push thành công tới `origin/main` ở `c50e09a` (`docs(classroom): record assignment analytics handoff`), bao gồm code hardening `680aaed`. HTTP smoke `https://giaoandewey.vercel.app` trả 200; Vercel CLI không có trong môi trường nên chưa xác nhận được trạng thái deployment `Ready` theo commit. Không đọc/ghi hay thay đổi dữ liệu production.
- Màn hình **Báo cáo** của từng lớp nay có bộ chọn từng bài và báo cáo chỉ đọc cho cả hai nguồn: bài nộp ảnh/AI và đề online.
- Mỗi bài có: sĩ số, đã nộp, đã chấm, đã duyệt, chưa nộp, điểm trung bình chính thức, phân bố điểm, tỷ lệ đúng và tỷ lệ điểm theo từng câu, năm trạng thái câu hỏi (**Đúng / Đúng một phần / Sai / Không đọc được / Chưa làm**), lỗi phổ biến, chủ đề cần củng cố và khuyến nghị dạy học.
- Chỉ lượt mới nhất của mỗi học sinh được tính. Bài nộp ảnh/AI chỉ vào số liệu chính thức khi `graded` và giáo viên đã duyệt; đề online chỉ vào số liệu chính thức khi `graded`. Điểm online dùng thang điểm canonical từ cấu hình đề.
- Ghép học sinh online theo ID kèm kiểm tra tên; nếu không có ID chỉ nhận đúng một kết quả khớp tên đã chuẩn hóa, không tự chọn dòng đầu khi trùng tên. Lớp không khớp bị loại khỏi báo cáo.
- CSV chỉ xuất số liệu tổng hợp; không xuất `studentKey`, bài làm, đáp án, ghi chú riêng của giáo viên hay dữ liệu từng học sinh.
- Bằng chứng kiểm thử: focused **2 files / 23 tests pass**; full Vitest **85 files / 1.207 tests pass**; `npm run lint`, `npm run lint:api`, `npm run build`, `git diff --check` đều pass. Build chỉ còn cảnh báo chunk/dynamic import vốn có.
- QA độc lập Ox Alpha Free/OpenCode (`opencode/x-preview-f-free`) trên đúng HEAD code `680aaed`: **PASS**, không có P0/P1/P2. Ba lưu ý P3: dữ liệu online legacy thiếu lớp có giới hạn không thể phân biệt trùng tên khác lớp; câu online chưa có điểm đang được xếp vào `Chưa làm`; CSV điểm trung bình đã được chuẩn hóa hiển thị theo `%`.

## 10. Lô tương thích công thức legacy trong nhận xét chấm — 2026-08-25

- Commit code `9267b59` bổ sung lớp tương thích hiển thị cho dữ liệu chấm cũ bị mất dấu `\\`: phục hồi có điều kiện các toán tử dạng chữ `in`, `notin`, `subset`, `supset`, `cap`, `cup` thành LaTeX/KaTeX trong `src/lib/adaptive/mathText.ts`.
- Lý do: một số nhận xét cũ của lớp 11 Columbus hiện `D in SA`, `SA subset (SAB)` thay vì công thức; đây là lỗi biểu diễn payload legacy, không phải điểm hay đáp án mới bị thay đổi.
- Phạm vi cố ý không chạm: không backfill Firestore, không sửa/xóa/regrade submission, không thay điểm, không thay API/Storage/rules; `repairMathString` vẫn giữ nguyên chuỗi legacy ở đường lưu dữ liệu.
- Hàng rào: chỉ chuyển đổi khi hai vế có hình dạng ký hiệu Toán; câu thường như `Học sinh in bài rồi.`, `Fill in the blanks.` và `Please log in now.` giữ nguyên. Chuỗi LaTeX hợp lệ hiện có vẫn đi qua như trước.
- Bằng chứng: targeted **27/27**; full Vitest **85 files / 1.208 tests**; `npm run lint`, `npm run lint:api`, `npm run build`, `git diff --check` pass; Ox Alpha Free/OpenCode (`opencode/x-preview-f-free`) QA **PASS**.
- Còn cần xác nhận sau deploy: mở lại một nhận xét cũ của 11 Columbus và kiểm tra trực quan cả **Bài làm của em** lẫn **Đáp án / mốc cần đạt**; chỉ refresh/đọc, không chạy chấm lại hàng loạt.
- Ngưỡng còn lại: heuristic không thể khôi phục chắc chắn mọi chuỗi legacy có biến chữ thường hoặc câu bị mất nhiều cấu trúc; các ca không đủ hình dạng vẫn được giữ nguyên để tránh sửa nhầm văn bản.

### Lệnh nghiệm thu lô công thức legacy

```powershell
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run test
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run lint
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run lint:api
npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai-codex-classroom-grading" run build
git diff --check
```

## 12. Lô G10 P31 THINK → AI → VERIFY — 2026-08-26

### Đã đổi và vì sao

- Commit code `ec1c26f` cập nhật đúng luồng **Bài học phân hoá → Mở tiết trực tiếp**: P12 dùng màn hình `S8A` làm cổng THINK để học sinh chọn `Là nghiệm / Không là nghiệm / Chưa chắc`; P13–P15 mới chuyển sang `S8B` để xem lời giải AI, tìm lỗi, phân loại, sửa và chứng minh. Không tăng thời lượng 40 phút và không đưa kịch bản giáo viên lên TV.
- Thêm response step `ai-think-w01`, lựa chọn `Unsure` trong aggregate an toàn và kiểm tra contract/progress bridge; Firestore Rules chặn ghi `ai-error-w01` nếu cùng học sinh chưa ghi THINK trước đó. Đồng thời thu gọn/giới hạn map thống kê để tránh vượt trần biểu thức Rules.
- Sau khi đóng phiên, laptop giáo viên có form **Minh chứng sau giờ** lưu theo `sessionId` ở localStorage: loại lỗi AI, lỗi Quick check, ưu tiên tiết sau, ba cờ minh chứng tương tác người–người và ghi chú tối đa 500 ký tự. Form không hiện trên TV/học sinh và không thay thế hồ sơ đánh giá chính thức.
- Launcher có thông báo hành động được khi gặp `permission-denied`, phân biệt lớp server chưa đồng bộ/khác UID/Rules chưa release với dữ liệu lớp cũ trên máy.

### Bằng chứng nghiệm thu

- Focused live-lesson: **12 files / 100 tests PASS**.
- Full Vitest: **98 files / 1.316 tests PASS**.
- Firestore Rules emulator: **8 files / 267 tests PASS**, bao gồm THINK trước AI Error.
- `npm run lint`, `npm run lint:api`, `npm run build`, `git diff --check`: PASS; build chỉ còn cảnh báo chunk/dynamic import hiện hữu.
- Rules production đã release thành công lên Firebase project `smartplan-ai-14200` bằng `firebase deploy --only firestore:rules --project smartplan-ai-14200`.

### Còn dở / cố tình bỏ qua

- Chưa triển khai hồ sơ lỗi tích luỹ C/P/R/M/A cho từng học sinh; cần pilot quan sát trước để tránh biến một hoạt động tư duy thành hệ thống chấm nhãn.
- Chưa thêm Kahoot/Mentimeter hay AI call mới; các công cụ đó không cần thiết cho mục tiêu và sẽ tăng điểm tích hợp trong tiết demo.
- Minh chứng sau giờ hiện chỉ lưu cục bộ trên laptop giáo viên, cố ý không đẩy dữ liệu nhận diện học sinh lên Firestore trong lô này.
- Sau push cần xác nhận Vercel Production `READY` và smoke bằng tài khoản giáo viên thật; emulator không chứng minh được phiên đăng nhập production.

### Ngưỡng sắp cắn người

- Muốn tạo phiên thật phải đăng nhập Firebase Auth bằng đúng tài khoản giáo viên và chọn `classes/{classId}` đã đồng bộ trên server với `teacherId` trùng UID; lớp mock/local hoặc session cũ không đủ quyền.
- TV/Vcast chỉ nhận public state/stats tổng hợp, không nhận câu trả lời cá nhân; phải mở session mới sau khi Rules và web cùng release, rồi dùng đúng URL `mode=tv`.
- Session cũ thiếu `ai-think-w01` không được tái sử dụng cho pilot mới; khi đổi contract hãy tạo phiên mới.

### Lệnh nghiệm thu lô THINK → VERIFY

```powershell
$worktree = "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\live-lesson-think-v3"
$javaBin = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot\bin"
$env:PATH = "$javaBin;$env:PATH"
npm --prefix $worktree run test
npm --prefix $worktree run test:rules
npm --prefix $worktree run lint
npm --prefix $worktree run lint:api
npm --prefix $worktree run build
git -C $worktree diff --check
```

## Lô Task 13 — UX ba cổng live lesson — 2026-08-26

### Đã đổi và vì sao

- `41ebc6d`: link HS sinh từ lớp GV đã chọn, mang `classId` + `joinCode`; HS tải roster đúng lớp, chọn tên và chỉ nhập PIN. Roster được kiểm lại `classId` trước khi hiển thị; link cũ thiếu ngữ cảnh bị chặn rõ ràng.
- `1264560`: cổng GV chuyển sang mobile-first cho điện thoại: cue hiện tại là vùng thao tác chính, bảng/HS/vở nằm trong panel mở rộng, điều khiển Trước/Pause/Sau cố định ở đáy màn hình.
- `bc20e8e`: cổng TV dùng khung `100dvh`, không cuộn, năm chỉ số pilot nằm cùng một hàng; launcher chặn lớp thiếu `joinCode` để không tạo link HS hỏng.
- `c70e8a6`: ghi đặc tả và kế hoạch UX ba cổng; không đổi schema Firestore, không tạo collection mới, không đưa kịch bản GV lên TV.

### Bằng chứng nghiệm thu

- Focused live suite: **5 files / 29 tests PASS** trước commit cuối; sau bổ sung guard mã lớp, full suite ghi nhận **98 files / 1.323 tests PASS**.
- `npm run lint`: PASS; `npm run lint:api`: PASS.
- `npm run build`: PASS; chỉ còn cảnh báo Vite chunk/dynamic import vốn có.
- `git diff --check`: PASS.
- Browser smoke local đã tới route live nhưng session lịch sử bị Firestore từ chối `Missing or insufficient permissions`; chưa claim visual PASS từ session đó.
- `main` đã push ở `35ac4d8`; Vercel deployment `dpl_5PwBUAn4bsV2rEeVvumZEQnC7mjg` báo `READY / Production`, alias `https://giaoandewey.vercel.app`; HTTP smoke `/` và route live đều trả 200.

### Còn dở / cố tình bỏ qua

- Chưa chạy authenticated smoke trên một session mới bằng tài khoản GV production và thiết bị HS riêng; session lịch sử không đủ làm bằng chứng vì có thể đã hết hạn/không thuộc quyền hiện tại.
- Không bỏ guard chặn dùng cổng HS trên cùng trình duyệt đang giữ phiên GV; GV dùng điện thoại riêng và HS dùng thiết bị riêng theo thiết kế an toàn.
- Không thêm Kahoot/Mentimeter/AI call hay collection mới; các phần đó không cần cho tiết demo và làm tăng điểm hỏng tích hợp.
- Không xử lý cảnh báo chunk lớn của Vite trong lô này vì không liên quan hành vi ba cổng.

### Ngưỡng sắp cắn người

- Khi tạo phiên, lớp phải là `ClassDoc` server-side thuộc đúng UID GV và phải có `joinCode`; lớp cũ chưa đồng bộ sẽ bị chặn với hướng dẫn hành động.
- Link HS chỉ hợp lệ khi có cả `classId` và `joinCode`; không dùng lại link HS cũ thiếu hai tham số này.
- TV chỉ hiển thị public state và thống kê tổng hợp; câu trả lời cá nhân vẫn không được chiếu.

### Lệnh nghiệm thu lô Task 13

```powershell
$worktree = "C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\live-lesson-think-v3"
npm --prefix $worktree run test
npm --prefix $worktree run lint
npm --prefix $worktree run lint:api
npm --prefix $worktree run build
git -C $worktree diff --check
```
