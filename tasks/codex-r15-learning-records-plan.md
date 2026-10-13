# R15 — Hồ sơ tiến bộ và kết nối GiaoAnDewey

Ngày: 13/10/2026. Trạng thái mới nhất: **R15.1–R15.2 và bộ nhận thủ công R15.3 đã triển khai local; chờ lựa chọn phát hành/pilot. R15.4 chưa làm.** Báo cáo kiểm chứng `tasks/codex-r15-report.md`; lịch sử lập kế hoạch phía dưới giữ nguyên làm đối chiếu.
Yêu cầu: lưu kết quả từng HS thành hệ thống để GV theo dõi, xây dựng kế hoạch học tập, kết nối GiaoAnDewey.
Kế hoạch này bổ sung R15 trong `tasks/plan-hoan-thien-game-va-day-hoc.md`; không thay các gate nghiệm thu lớp thật của R14.

## 1. Kết quả cần đạt

GV mở **Hồ sơ học tập**, chọn lớp, biết ngay: em nào cần hỗ trợ, mục tiêu nào còn thiếu minh chứng, nên làm gì tiếp. Chọn một HS để xem tiến bộ qua nhiều tiết, mở minh chứng gốc và duyệt kế hoạch học tiếp. HS vẫn dùng mã/PIN theo lớp, không thêm tài khoản ChatGPT hoặc câu hỏi bắt buộc.

Sau đó GV có thể đưa hồ sơ đã chọn sang GiaoAnDewey, kiểm tra ghép đúng người/mục tiêu trước khi nhập. Đồng bộ tự động chỉ làm sau khi quy trình nhập thử đạt nghiệm thu.

**Góc nhìn chuyên môn:** số lần chơi, sao, thứ hạng, tốc độ và mảnh Khám phá không chứng minh năng lực Toán. Quyết định hỗ trợ cần dựa vào bài làm cá nhân, trạng thái chấm, mức hỗ trợ và lần kiểm tra lại.

**Góc nhìn phản biện:** chưa cần dựng thêm một hệ thống quản lý HS độc lập. Tận dụng D1 và hồ sơ hiện có; chứng minh GV dùng được dữ liệu để quyết định dạy học trước khi đầu tư đồng bộ hai chiều hoặc AI dự báo.

## 2. Hiện trạng và các điểm phải xác minh

- Site đã có `lesson_classes`, `lesson_class_members`, `lesson_sessions`, `lesson_class_evidence`, hộ chiếu HS. Màn GV hiện chủ yếu quản lý lớp và theo dõi một phiên.
- `class_member_id` ổn định trong lớp, chưa phải định danh xuyên lớp/năm học. Không tự gộp hai HS cùng tên.
- `lib/lesson/class-service.js` tổng hợp hộ chiếu theo `objective_code`, rồi `task_id`. Các mã cục bộ trùng nhau giữa bài có thể gộp/ghi đè sai; phải tái hiện bằng kiểm thử trước khi mở rộng tổng hợp.
- Đường `getPassport` và `syncSessionEvidence` chưa có điều kiện loại `state.mode === 'preview'` rõ ràng tại chính hai hàm. Cần kiểm tra khả năng phiên thử liên kết lớp và chặn tại nguồn; chưa kết luận đã có dữ liệu thật bị nhiễm.
- GET hộ chiếu hiện đọc nhiều state phiên và đồng bộ khi đọc. Không nhân cách này lên toàn bộ lớp/lịch sử.
- GiaoAnDewey source có `studentLearningProfiles`, `adaptiveSessionProgress`; ID adaptive hiện là `teacherId + '_' + normalizedStudentCode`, không mặc nhiên là ID HS toàn trường.
- `api/adaptive-progress.ts` đọc hồ sơ dựa trên teacherId/studentId và cổng đang mở; chưa thấy kiểm chứng danh tính người gọi trong handler đã đọc. Firestore Rules adaptive có nhánh ghi ẩn danh. Đây là điểm chặn tái sử dụng cho tích hợp; chưa phải kết luận về cấu hình bảo vệ production.
- `api/adaptive-progress-profile.ts` tăng số phiên khi merge và chỉ dựng objectiveMemory từ mục tiêu đầu vào. Không dùng nguyên hàm này làm bộ nhận bản ghi lặp/chỉnh sửa xuyên nguồn.
- Chưa xác minh module tiếp nhận hiện hành giữa adaptive và runtime lớp học mới trên GiaoAnDewey. Chốt bằng đường UI đang dùng, API, Rules và bản triển khai thực; không chọn collection chỉ vì tên phù hợp.

## 3. Phạm vi từng đợt

| Đợt | Sản phẩm | Điều kiện hoàn thành |
|---|---|---|
| R15.1 | Minh chứng đáng tin và Hồ sơ học tập GV ngay trên Site | Đúng người/mục tiêu, xuyên tiết, riêng tư, tải có giới hạn |
| R15.2 | Kế hoạch học tiếp do GV duyệt | Mỗi đề xuất dẫn tới minh chứng, có mục tiêu và cách kiểm tra lại |
| R15.3 | Ghép định danh, xuất JSON/CSV, nhập thử GiaoAnDewey | Xem trước, chống trùng, sửa sai, kiểm quyền hai đầu |
| R15.4 | Đồng bộ một chiều Site → GiaoAnDewey | Có xác thực kết nối, thử lại an toàn, thu hồi, quan sát lỗi |

R15.1–R15.2 là bản đầu nên triển khai. Không phụ thuộc việc hoàn tất kết nối GiaoAnDewey. Chưa làm đồng bộ hai chiều, xếp hạng năng lực toàn trường, dự đoán điểm, tự giao thêm bài hay sửa học liệu đã duyệt.

## 4. Luồng GV và HS

1. GV: `/hosts` → mục phụ **Hồ sơ học tập** → chọn lớp và khoảng thời gian. Giữ ba lựa chọn tổ chức tiết/game/quyền hiện có; không thêm nút vào HUD HS.
2. Mặc định bảng gọn: HS, mục tiêu cần hỗ trợ, minh chứng mới nhất, bước tiếp theo. Bộ lọc: cần hỗ trợ / chờ chấm / chưa đủ minh chứng / tất cả. Không gọi thiếu dữ liệu là yếu.
3. Chọn HS → mục tiêu → dòng thời gian. Nhãn rõ: tự làm, có hỗ trợ, chờ GV chấm, quan sát trên lớp; xem bài/nhận xét ở chi tiết được phân quyền. Công thức dùng MathText hiện có.
4. Bấm **Gợi ý kế hoạch** → bản nháp ngắn theo mục tiêu, GV sửa rồi **Duyệt**. Không tự gửi cho HS. Nếu có chức năng giao bài, dùng quy trình giao bài hiện hữu sau hành động riêng của GV.
5. HS xem tiến bộ của mình trong hộ chiếu; chỉ hiện thông tin đã được phép công bố. Không xem nhận xét riêng GV, kết quả bạn khác hoặc điểm đang chờ duyệt.
6. Sau này mục **Kết nối GiaoAnDewey** nằm trong hồ sơ/cài đặt GV, không chen vào luồng mở phòng hoặc đăng nhập HS.

## 5. Quy tắc dữ liệu

### Định danh và nguồn đúng

- Site giữ bài làm và lịch sử đánh giá gốc. GiaoAnDewey nhận bản chiếu có nguồn gốc; không ghi đè bài gốc từ nơi nhận.
- Tạm dùng `(sourceSiteId, classId, memberId)` cho người học nguồn. Ghép tới HS đích bằng ID trong danh sách do GV có quyền quản lý; tên chỉ để đối chiếu.
- Giả định cần xác nhận ở R15.3: danh sách HS GiaoAnDewey là danh sách đích được GV chọn. Không mặc định ID adaptive là mã trường. Hồ sơ và lần tham gia lớp/năm học phải tách được; chuyển lớp cần ghép có xác nhận, lịch sử giữ nguyên nguồn.
- Mục tiêu cục bộ có namespace gói/bài và phiên bản. Muốn gộp xuyên bài phải có mapping GV duyệt tới mục tiêu chương trình có phiên bản. Chưa ghép thì giữ riêng, không đoán từ `LO1` hoặc câu chữ giống nhau.

### Hợp đồng trao đổi tối thiểu, phiên bản 1

| Nhóm | Trường cần thiết |
|---|---|
| Gói xuất | schemaVersion, sourceSiteId, exportId, exportedAt, phạm vi lớp/thời gian, mappingVersion |
| Danh tính | sourceClassId, sourceMemberId, targetStudentId khi đã ghép |
| Minh chứng | sessionId, packageHash, taskId/taskFamilyId, submissionId, objectiveCode và namespace, canonicalObjectiveId khi đã ghép |
| Đánh giá | assessed, assisted, ok khi đã chấm, countsForMastery, kind, thời gian, revision nguồn |
| Vòng đời | evidenceId ổn định, operation upsert/retract, revision, trạng thái nguồn và lý do thu hồi |

- Khóa minh chứng gồm nguồn + người học + phiên + gói + nhiệm vụ + bài nộp + mục tiêu; revision không nằm trong khóa, dùng để thay bản cũ. Nhận lại cùng revision không tăng số phiên/lượt học; bản cũ tới sau không ghi đè bản mới.
- Giữ các lần nộp làm lịch sử nhưng không coi làm lại cùng một câu/biến thể là nhiều minh chứng độc lập. Chính sách chọn bằng chứng và status phải có phiên bản, kiểm thử bằng ví dụ cụ thể.
- Chờ chấm có trạng thái riêng, không đổi thành sai/0 điểm. Tách thời điểm chấm và quyền công bố; assessed không tự đồng nghĩa HS được xem.
- Chấm lại, bổ sung hỗ trợ, rút bài, thu hồi gói và sửa mapping phải tính lại bản chiếu. Thay người nhận do ghép sai phải thu hồi bản chiếu sai trước khi ghi cho người đúng.
- Không xuất PIN, token, khóa AI, URL riêng, nhận xét nội bộ hoặc ảnh bài làm theo mặc định. Raw answers chỉ mở trong hệ thống nguồn với quyền phù hợp.
- Không tự quy đổi minimum_mastery sang điểm số/masteryEstimate của hệ khác. Giữ trạng thái, chính sách và nguồn bằng chứng.
- JSON là định dạng trao đổi; CSV chỉ để GV đọc/báo cáo, chống công thức CSV bắt đầu bằng `=`, `+`, `-`, `@`. File nhập được kiểm schema/kích thước/giới hạn bản ghi; không tin ownerId trong file.
- File JSON do người dùng tải lên không chứng minh nguồn xác thực: gắn nhãn nhập thủ công, lưu người nhập, chỉ dùng sau xem trước/duyệt. Không giả tạo diagnosticAttempt/route để nhét vào schema adaptive.

## 6. Checklist triển khai và kiểm chứng

### R15.0 — kế hoạch (lượt hiện tại)

- [x] Đối chiếu source Site, bộ nhận adaptive, Rules; ghi hạn chế và giả định.
- [x] Chốt thứ tự đợt, UI, hợp đồng dữ liệu, tiêu chí nghiệm thu.
- [x] Ghi checklist và bàn giao vào plan chung/HANDOFF/todo.
- [x] Chủ hệ thống giao “Phát hành đi và sau đó làm R15”, cho triển khai sau R16/R17. Lựa chọn phát hành R15 hỏi riêng theo19.9.

### R15.1 — hồ sơ GV và độ tin cậy minh chứng

- [x] Viết kiểm thử tái hiện hai gói cùng objectiveCode/taskId, preview, bài chờ chấm, biến thể và bài được trợ giúp. Đối chiếu hộ chiếu cũ trước khi sửa.
- [x] Sửa tổng hợp tối thiểu class-service và learning-records; giữ2min+recheck, dedupfamily xuyênphiên; namespacehash/code.
- [x] Thêm truy vấn GV có owner/class scope, phân trang và lọc thời gian vào service/API lớp hiện hữu `app/api/lesson-classes/route.js`. Read không quét và ghi lại toàn bộ state. Backfill một phiên có cursor/checkpoint, chạy lặp an toàn và báo tiến độ.
- [x] Trang learning-records nối host; chọnlớp,MathText,chi tiết tải khi mở, KaTeXCSSverified375.
- [x] Migration0023 additive sync/plans/versions, schema/journal/snapshot; fixture đo9query195KBp95~55ms SQLite; không cần indexthêm.
- [x] Test owner/GVkhác/bearerHS/deleted/revoked/forgedID vàraces; Worker/D1/R2syntheticquyềnAPI, không chỉCSS.
- [ ] QA 150 HS × 20 tiết dữ liệu giả: phân trang tối đa 50 HS/lần, không tải raw state toàn lịch sử. Ghi số query, payload, thời gian p95; mục tiêu màn đầu dưới 2 giây trong môi trường QA được nêu rõ. Nếu không đạt, tối ưu trước hoặc ghi giới hạn được duyệt; không gọi đây là QA lớp thật.

### R15.2 — kế hoạch học tiếp

- [x] Quy tắc chọn diagnostic/recheck/support/core/extension từ gói approved, pendingGVgrade; không cótask phùhợp nêuGVbổsung.
- [x] Mỗi đề xuất mục tiêu, evidence/date/link,tênnhiệm vụ+đề+options nguyênvăn,thờilượng,recheck; chưa cóGVbổsung,≤30approvedpackages.
- [x] GV sửa/duyệt, immutableversion/actor,SQLsourceCAS/stale,historyUI,Trashrestore.
- [x] Thiếuevidence/supported/mastery/pendingsynthetictests+actualWorker; khôngnhãntínhcách/khuyết tật/Khámphá.
- [ ] Chỉ bổ sung AI diễn đạt khi quy tắc đã hữu ích và có yêu cầu; lỗi AI không chặn hồ sơ hoặc gợi ý cơ bản. Nội dung sinh luôn là nháp.

### R15.3 — xuất/nhập có kiểm soát

- [x] Đích productiona7b7f93verifiedVercel,rosterclasses/{classId}/students/{studentId},teacherContext/readClassAccess. Khôngtáidùng adaptive. Auditmới codex-r15-current-receiver-audit-20261013.md.
- [x] Receivercôlập /api/classroom+server-privateexternalcollections, teachertransactionauth; khôngfakeadaptive/skillscore.
- [ ] GVchọnHSlocalmapping/previewđạt; mục tiêu giữ namespacechưa canonicalmapping vàchưa pilotaccountthật. Khôngtựđổiđiểm.
- [ ] Xuất phạm vi được chọn từ Site; nhập theo lô có checkpoint, chống trùng/revision, nhật ký và thu hồi riêng batch nhập. Retry sau lỗi giữa chừng không nhân dữ liệu; không xóa hồ sơ gốc hoặc dữ liệu khác khi rollback.
- [ ] Kiểm sửa file giả owner, đổi lớp, HS cùng tên, đổi năm học, mã mục tiêu trùng, nhập hai lần, bản cũ tới sau, chấm lại và sửa mapping. Rules test/emulator và API test đều phải đạt; Admin SDK không được dựa vào Rules để thay kiểm quyền trong handler.

### R15.4 — kết nối tự động một chiều

- [ ] Thiết kế xác nhận cả hai tài khoản GV: challenge dùng một lần, hết hạn, ràng buộc phiên đăng nhập và scope lớp; không ghép bằng email/tên, không chia sẻ PIN hoặc khóa quản trị Firebase.
- [ ] Đồng bộ server qua cursor sau bản đã xác nhận, credential phạm vi tối thiểu có xoay/thu hồi; retry có giới hạn, lỗi từng lô nhìn thấy, không bỏ qua im lặng. Không tạo nền tảng queue mới nếu cơ chế hiện có đủ.
- [ ] Hiển thị lần cập nhật cuối, số bản chờ/lỗi, nút thử lại/ngắt kết nối. Ngắt kết nối dừng chuyển mới; xóa dữ liệu đã nhập là hành động riêng có phạm vi và xác nhận.
- [ ] Chốt thời hạn giữ dữ liệu với chủ hệ thống trước dùng dữ liệu thật; chưa chốt thì không tự xóa/backfill toàn bộ. Xóa theo yêu cầu phải bao gồm bản chiếu và tệp xuất do hệ thống còn quản lý; nêu rõ tệp GV đã tải ra ngoài không thể tự thu hồi.
- [ ] Pilot một lớp được chỉ định; so từng HS/mục tiêu/phiên giữa hai đầu trước mở rộng. Không sửa điểm/học liệu đang dùng để phục vụ QA.

## 7. Cổng nghiệm thu và phát hành

- Mỗi đợt: focused tests + full tests/typecheck/lint/build của repo bị sửa, review độc lập theo `dieu-phoi-ai` khi triển khai. Lượt này chỉ tài liệu, không lấy kết quả 1247 tests R14 làm bằng chứng R15.
- Site dùng các scripts `test`, `typecheck`, `lint`, `build` trong package.json; GiaoAnDewey chạy `npm --prefix "C:/Users/ADMIN/Downloads/smart-lesson-plan-ai" run build` và suite API/Rules tương ứng với thay đổi.
- Browser QA GV từ /hosts tới hồ sơ và HS tới hộ chiếu; desktop/mobile, bàn phím, công thức, phân trang, trạng thái không có dữ liệu. Kiểm bằng tài khoản GV/HS thật trong phạm vi cho phép trước khẳng định quyền production đạt.
- Mỗi đợt có report, source hash, checklist, migration/rollback nếu có. Phát hành đúng Site qua candidate đã xác minh; **không deploy `.openai/hosting.json` ở root worktree** vì trỏ Site khác.
- Rollback UI/API không xóa minh chứng. Migration chỉ cộng thêm khi cần, giữ khả năng đọc bản cũ; thử khôi phục trên dữ liệu giả trước release.
- Chưa có bằng chứng runtime GiaoAnDewey thì đánh dấu còn chờ, không tuyên bố đã kết nối. Chỉ phát hành sau duyệt theo plan chung 19.9; duyệt R14 không tự mở rộng sang R15.

## 8. Bàn giao và tự rà soát

- [x] Phân biệt lưu dữ liệu sẵn có với dashboard/tích hợp chưa có.
- [x] Không ghép HS bằng tên; không coi ID theo GV/lớp là ID toàn trường.
- [x] Không gộp mã mục tiêu cục bộ; không đếm lại retry/biến thể thành tiến bộ.
- [x] Đã đưa preview, chấm lại, rút minh chứng, nhập lặp, privacy và tải lịch sử vào acceptance.
- [x] Không tái dùng bộ nhận adaptive trước khi xác minh runtime và phân quyền.
- [x] Chỉ viết kế hoạch. Không sửa code, migration, dữ liệu HS, kết nối hoặc deployment ở lượt này.

Claude tiếp tục từ báo cáo `tasks/codex-r15-report.md` và cuối plan chung/HANDOFF. R15.1–2 localđãdone, receiverlocalimplemented; không làm lại. Chờreleasechoice/pilotmappedclass và R15.4 sau pilot; canonicalobjective mapping cònchưa. Audit cũ adaptive được supersede bởi codex-r15-current-receiver-audit-20261013.md.
