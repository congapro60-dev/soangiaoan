# Tiếp quản Muse — 14/10/2026

Nguồn: `C:/Users/ADMIN/Downloads/QA_FIX_PLAN_soangiaoan.md`. Người dùng xác nhận Muse đã dừng, Codex tiếp quản; đã cho phép sửa và push main. Nhánh `codex/muse-qa-followup`, base Muse `a2f30d1` fast-forward từ `65baf3f`; giữ nguyên các commit trước.

## Kết luận kiểm tra

- Baseline Muse: 3069/3075 test đạt. Bốn lỗi mock API thi online chưa cập nhật; hai lỗi thật do maxDuration 60s không khớp 300s.
- Vercel được xác minh qua API đăng nhập: team Hobby, project `resourceConfig.fluid=true`. Tài liệu https://vercel.com/docs/functions/configuring-functions/duration cho phép Hobby Fluid 300s. Khôi phục hai endpoint AI; không đổi gói, không chia batch theo giả định 60s sai.
- API chấm GV-only làm HS bị 401. Sửa nonce riêng của bài công khai hoặc token GV đúng chủ đề; giao dịch chấm một lần, bỏ điểm client, giữ kết quả GV đã xác minh.
- Dữ liệu tự luận cũ thiếu nguồn chấm không phân biệt được điểm thật với điểm giả. Giữ dữ liệu gốc; chặn tự động ghi lại, yêu cầu GV đối chiếu.
- Leaderboard bỏ ID bài bạn, lọc trước khi lấy 10 dòng; tối đa 500 ứng viên, có cảnh báo giới hạn. Throttle chỉ tìm mã, TTL và giới hạn 2000 IP; không tuyên bố bảo vệ phân tán toàn hệ thống.
- SSM chọn đúng phiên đang mở, xác minh email/workspace, mã HS khớp chính xác; từ chối ô mơ hồ hoặc nội dung khác. Lịch/BTVN chỉ điền textarea GV đã chọn. Không bấm Lưu/Submit.
- Cloud link theo UID/quyền lớp; thêm roster bằng giao dịch máy chủ, không ghi đè HS cũ, không báo thành công trước khi ghi xong.

## Phạm vi giữ gọn

- Firebase SDK config công khai; khóa AI/Admin không đặt trong `VITE_*`. Không fail-fast production: deployment hiện dùng config mặc định, chưa có biến VITE Firebase.
- `#717782` trên trắng đạt AA 4.503; text phụ chuyển token `--dewey-muted`, không thiết kế lại toàn bộ màu.
- Không tách `useAppState` chỉ vì file dài; chưa có lỗi cụ thể cần refactor.
- Chưa tái hiện hero zoom trong source; không sửa hiệu ứng phỏng đoán.
- Footer bỏ link `#` và email chưa xác minh. Tài khoản khách thật lưu trên hệ thống; toast phải mô tả đúng.

## Phân công

- Exam: `proxy_risk_review`; nguồn đã đóng băng, 31 test tập trung đạt.
- SSM: `review_proxy_backend`; extension, service/UI, roster API, Rules. Nguồn đóng băng; 27 test tập trung và 1 test package đạt.
- Review độc lập: `final_ui_audit`; tái hiện đường giả điểm, xác minh sửa và đọc lại SSM. Không còn blocker trên snapshot đã đọc.
- Root: Vercel, minor UI, kiểm cuối, trình duyệt, push/checklist. Không có hai writer cùng file.

## Checklist nghiệm thu

- [x] Đọc plan Muse, lessons, nguồn thật; giữ WIP và commit Muse.
- [x] Sửa exam; chặn điểm giả, idempotence, quyền xem, giữ bài cũ cần GV xác minh.
- [x] SSM test tập trung, đóng băng nguồn; ZIP 0.3.1 gồm sáu file nguồn.
- [x] Cảnh báo dev proxy kiểm HTTP: production có banner, target local không có.
- [x] Full test, lint app/API, build; ZIP khớp nguồn cuối.
- [x] Rules Firestore/Storage emulator, gồm exam marker và cloud link.
- [x] Review khác hãng trên nguồn cuối; xử lý finding thật.
- [x] Deploy Rules/index trước API mới để client không giả marker; index READY, không xóa index cũ.
- [ ] Commit/push main fast-forward; CI và Git deployment, không deploy Vercel thủ công.
- [ ] QA production chỉ đọc GV/HS/PH khi có phiên; ghi giới hạn SSM thật/cross-machine.
- [ ] Cập nhật plan Muse, HANDOFF, todo theo kết quả thật.

## Bằng chứng và giới hạn

- IAB đọc dashboard GV thật; giữ tab PH người dùng. Click/Enter timeout CDP; chưa xác minh luồng mới trên production.
- Edge trả `Codex auth token is unavailable`; chưa kiểm SSM thật, chưa cập nhật tiện ích hoặc ghi dữ liệu SSM.
- 9router: Gemini Flash canary trả lời; Gemini Pro 503 hai lần (unknown), Claude Sonnet canary trả lời. Review Flash có hai finding trái source/Rules, bác bằng kiểm tra nguồn. Sonnet review đầu hết output token; lượt sau timeout, chưa có kết luận.
- Không tự gửi tin nhắn, nộp bài thử, thay điểm hoặc bấm Lưu/Submit SSM để lấy bằng chứng.

## Gate cuối — 14/10/2026

- Full test: `npm run test -- --maxWorkers=2`, 3102/3102, 293 file, exit 0. Lượt song song ban đầu thiếu RAM: sáu timeout và một worker timeout; chạy lại không nới timeout, không sửa test để né lỗi.
- Lint app/API exit 0. Build exit 0 (3m15s), index bundle 1548.64 kB; cảnh báo chunk lớn và sax/stream có sẵn, không che cảnh báo.
- Rules Firestore/Storage: 308/308, 10 file, exit 0. Lượt đầu Java khởi động timeout; chạy lại `JAVA_TOOL_OPTIONS=-Xmx512m` thành công. Rules SSM biên dịch và kiểm owner/co-owner/revocation/UID/schema thật.
- ZIP trong dist: 0.3.1, đủ 6 file, byte khớp từng source; production HTML không có dev banner.
- Review độc lập native không còn blocker; Gemini Flash exam/SSM PASS trên nguồn cuối. Claude Sonnet canary OK nhưng review thiếu output rồi timeout, không tính là PASS. Gemini Pro 503 hai lần, trạng thái unknown.
- Hai finding SSM lượt review đầu không đúng: callback ClassesTab gọi syncSsmRosterMissing trước cập nhật state; Rules compiler/emulator xác nhận grouping đúng. Bổ sung context caller cho review sau, verdict PASS.
- Firebase deploy Rules/index exit 0, compiler cloud đạt; index `examId ASC + totalScore DESC` xác minh trực tiếp collectionGroup examSubmissions trạng thái READY. Không xóa index.
- CUA đã khôi phục thao tác IAB/Edge: GV thật có 3 lớp/53 HS, mở tab thi online (0 đề) và SSM. Extension cũ báo chưa mở SSM khi thử đọc; không ghép/đồng bộ hoặc Lưu/Submit. Auto-Wake bản mới vẫn cần tiện ích 0.3.1 trên Edge thật.
- Preview đúng dist trên 127.0.0.1:3016: landing không có dead link #, hero 60px trước/sau cuộn, transform none. Viewport override Edge không đổi kích thước thực (1496px), đã reset; không tính mobile/iPad PASS.
- Còn bước commit/push main, CI/Ready và QA sau deployment. Không tuyên bố kiểm end-to-end SSM/cross-machine hoặc nộp bài thi mới trên production.


## Sau push source 3ed54c5

- Main `3ed54c5cd7bc0a466c78f9fdb7dd297d8769460c`, remote khớp. Quality Gate 38595269017 và API Typecheck 38595268822 SUCCESS. Vercel Git deployment dpl_3hyvGMyFh9R54M3NGQzeuk4PT9aL READY; web 200, ZIP public 0.3.1 gồm sáu file.
- Vercel log còn TS2339 có sẵn do compiler không bật strictNullChecks; CI strict=true không tái hiện. `tsc --noEmit -p tsconfig.api.json --strict false` tái hiện lỗi. Sửa 15 điều kiện phân nhánh boolean sang === false/true trong 10 file API, giữ nghiệp vụ. Hai compiler config đạt; 105 test liên quan đạt. CI API thêm chế độ non-strict để khóa regression. Review Gemini PASS, review native/build cuối đang chạy.
- Browser kiểm duyệt tự động chặn mở edge://extensions (chỉ cho HTTP/HTTPS). Không thử đường vòng, không tự cập nhật tiện ích. QA Auto-Wake/điền 0.3.1 và cross-machine còn cần tiện ích thật được cập nhật.

- Compiler compatibility final: native/Gemini review PASS; 105/105 focused tests, strict=true và strict=false API compile exit 0, build exit 0 (1m02s). Rules/UI source không đổi; không chạy lại Rules hoặc sửa timeout để né lỗi.
- Production 3ed54c5 thực tế trên Edge: AI Tutor có tên “Mở/Đóng trợ lý AI Tutor”, expanded đổi đúng, mở/đóng đạt; không gửi prompt AI.
