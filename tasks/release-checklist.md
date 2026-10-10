# Release readiness checklist — Mật Mã Đa Giới

## Yêu cầu phát hành hiện tại — 10/10/2026, chờ xác nhận đích

### Chốt đích qua bằng chứng lời chủ hệ thống — release 2

Đã đọc transcript JSONL đúng phiên Claude `3f3b08c0-6db6-4c30-a2ea-c77b5e06433d`: câu hỏi 08:23:19 UTC chỉ định Site `mat-ma-da-gioi`, giữ private tới khi chủ hệ thống nói “mở cho học sinh”; user trả lời 08:39:55 UTC “1. Phát hành”. Chốt Site riêng, owner-only; không đổi V7. Lệnh relay được đối chiếu bằng lời user thực, không tự coi lời model là quyền.

- Owner login qua giao diện SIWC chính thức thành công; `/exams` hiển thị Vu Cuong, chưa có exam. CUA Edge lỗi token không áp dụng IAB; IAB hiện dùng được.
- Snapshot mới ngoài repo: `C:/Users/ADMIN/.codex/backups/signal-station-site/release2-production-20261010/user-table-snapshot.json`, SHA-256 `52ab0961414fb57a73d9cace002662d0fd6fbe6b7b34d37f59e41bd5c2bffd92`. Đủ 23 user tables/1 account,0 omission/truncation/has_more. `reconstructed-production.sqlite` SHA-256 `5e35a3f314bd815653dd32656574f17984d31a2aeec028b8cbeca2c7dc566268`: DDL dựng từ source version1 đã deploy, tên bảng/cột khớp native readback; nạp đủ rows, integrity/FK ok. Đây là snapshot dữ liệu logic + phục hồi offline, không phải export vật lý D1 của provider.
- **Giới hạn:** native API không trả system migration ledger/DDL hoặc R2 object manifest. Không ghi ledger đã đọc hay R2 rỗng. `lesson_sources`0 hàng; migrations0014–0016 chỉ D1 append-only. R2/baseline version không thay binding; không có yêu cầu xóa/chuyển bucket.
- Source helper bắt buộc commit/push source vào repository Sites của project riêng để `commit_sha` và archive có provenance. Chỉ thực hiện trong bản sao release; không commit/push checkout chung hoặc remote khác. Đã được nêu trước thao tác.
- Rollback chuẩn bị: owner-only `sites_deploy_private_site_version({project_id:"appgprj_6ac8d74b14f8819193caded9533bb337",version_id:"appgprj_6ac8d74b14f8819193caded9533bb337~appgver_c9800c88b52c8191ac4f625c7ea3a7a0"})`; theo dõi deployment ID trả về tới succeeded. Giữ D1 schema mở rộng và rows mới; không restore snapshot đè bài thi mới, không drop0014–0016. Khôi phục dữ liệu cần lệnh riêng và tooling provider.

Chủ hệ thống trực tiếp cho phép: chấp nhận snapshot V7 bị cắt; tạm owner-only, phát hành, QA Kiểm tra + phiên học + 12 map; đạt thì public, không đạt giữ private. Không xin lại quyền phát hành. Tuy nhiên lời nhắc một phòng/sáu đội thuộc V7, còn checklist batch3 chỉ định Site riêng. Đã hỏi chủ hệ thống chọn một trong hai trước mọi production mutation.

Native readback trong lượt này: V7 `appgprj_6abd9dee373c81918861834328bbaf0f` public revision5/version9; Site riêng `appgprj_6ac8d74b14f8819193caded9533bb337` owner-only custom revision1/version1. Cả hai role owner, email đúng `cuong.vuviet@thedeweyschools.edu.vn`. Site riêng vẫn baseline commit/version/deployment như mục dưới. D1 Site riêng23 bảng: accounts1,22 bảng khác0; toàn bộ bounded reads đầy đủ, không truncation/has_more. Chưa xuất recovery backup/DDL/ledger; R2 manifest chưa có API. AI app `LESSON_AI_ENABLED=false` revision1.

Batch3 polish đã hoàn tất local:754/754 tests, typecheck/lint/build0, DOCX/PIN/journey/deleteE2E0; sáu ảnh trực tiếp đã xem. Manifest mới `tasks/codex-batch3-polish-source-manifest.json`; không dùng manifest batch3 cũ làm freeze sau polish. QA runtime Codex PID27608 đã dừng. Không commit/push/save/deploy/migration/audience/environment mutation trong lượt này; chưa ghi `release done`. CUA inventory trả `Codex auth token is unavailable`, không có browser owner-session để QA production hiện tại. Không thay bằng test-only headers trên production.

## Đợt phát hành tiếp theo — chuẩn bị 10/10, CHƯA publish

**Đích duy nhất:** Site riêng `appgprj_6ac8d74b14f8819193caded9533bb337`, URL `https://mat-ma-da-gioi.cuong-vuviet.chatgpt.site`. Không dùng project V7 trong manifest checkout hiện tại. Chờ lệnh phát hành mới trực tiếp từ chủ hệ thống; hồ sơ này không cấp quyền deploy/push/audience.

1. Đóng băng đúng mã đã QA; lập source/build manifest. Dùng bản sao release riêng, xác nhận `.openai/hosting.json` đúng project mới. Loại credentials, localD1, snapshots, QAlogs và PIN/token khỏi archive. Build/packaging Windows phải giữ provenance bản sao; không upload output của project khác.
2. Đọc native Site/version/deployment/audience/env hiện tại trước thay đổi. Baseline lịch sử: version1 `appgprj_6ac8d74b14f8819193caded9533bb337~appgver_c9800c88b52c8191ac4f625c7ea3a7a0`, deployment `appgdep_6ac8d8aec8788191803420d8cbafe080`, commit `6d1b24e64ab28c50b6484d6fec16ea9686bd241d`. Phải xác minh lại, không coi lịch sử là rollback hiện tại.
3. **Trước ghi production:** backup đầy đủ D1/manifest R2 nếu tooling cho phép, lưu ngoài repo, hashes và phép restore kiểm được. Export không đủ/truncated phải dừng xin quyết định riêng; miễn snapshot cũ cho V7 không tự áp dụng dữ liệu Site mới. Không dùng localQAbackup làm productionbackup. Ghi ledger migrations đã áp dụng; gặp schema/ledger khác dự kiến thì dừng.
4. Diễn tập **0014,0015,0016** trên bản sao backup đúng schema trước phát hành; append-only mới không rebuild bảng. 0014 `manual_comment`;0015 code/seed/view;0016 PIN hashes/rate limit/review sessions (chốt tên/schema theo batch3). Kiểm rows/FK/integrity, khả năng bản runtime trước vẫn đọc schema mở rộng. Sites chạy migration trước uploadWorker; upload lỗi vẫn có thể đổi D1. Không apply migration ngược bằng DROP/xóa dữ liệu.
5. Thu hẹp audience owner-only trong lần phát hành nếu lệnh chủ hệ thống yêu cầu. Giữ AI app disabled, không provider thật. Chạy workflow/save-version/private-deploy đúng projectID; kiểm terminal deployment status rồi mới smoke. Mọi commit/push do workflow phải được nêu cụ thể trong lệnh phát hành, không suy quyền từ QA local.
6. Sau deploy: owner đăng nhập đúng identity; hai mã đề/asset isolation; trước đóng phòng mọi pupil kể cả đã nộp không keys/solutions/itemcorrectness; rawảnhgiải denied. Sau đóng mở review đúng thứ tự, điểm/nhận xét. PIN trên máy khác chỉ đọc, trướcclose/none denied, thửsai rate-limit, tokenxem không answer/photo/submit. Mapjourney desktop375px 3D/2D, gridfallback,12worlds unchanged. Xóa synthetic phòngowned đãkếtthúc, staleconfirm/wrongowner/running denied, dữliệuphòngkhácgiữnguyên. Kiểm ledger0014–0016 và bindingR2 bằng appprivateaccess; report phần công cụ không chứng minh được.
7. **Rollback:** đọc `sites_get_site_version({project_id:"appgprj_6ac8d74b14f8819193caded9533bb337",version_id:<baselineID đã xác minh>})`. Khi access vẫn owner-only, gọi `sites_deploy_private_site_version` cùng project/versionID; nếu audience khác, kiểm `get_site` rồi dùng `sites_deploy_site_version` chỉ khi lệnh rollback cho phép audience đó. Theo dõi `sites_get_deployment_status` đến succeeded rồi kiểm route/auth. Baseline lịch sử ở bước2; không hardcode runtime mới chưa được xác minh. Đây chỉ rollback Worker/assets. DB giữ schema append-only; dùng backup đầy đủ để restore chỉ khi có lệnh phục hồi dữ liệu riêng và xác định những ghi mới sẽ bị mất. Nếu tooling không hỗ trợ restore/ledger thì giữ private, báo giới hạn. Không rollback về project V7 hoặc đổi DBbindings để né lỗi.
8. Audience public chỉ sau QA + lệnh đã duyệt phạm vi hiện tại. Lưu URL/version/deployment mới, hashes, checks, rollback và chủ hệ thống nghiệm thu. Chưa có bất kỳ hành động release nào trong batch3.

Trạng thái các bằng chứng batch3 sẽ bổ sung khi gate cuối đạt; hồ sơ hiện là trình tự thực hiện, không phải xác nhận production.

### Bằng chứng chuẩn bị đã chốt — 10/10/2026

Batch3 local752/752,typecheck/lint/build0; PDF+DOCX/PIN/map/delete E2E0, reviewerGemini/ClaudePASS; report `tasks/codex-batch3-report.md`. Migration0016 thực tế `0016_exam_review_access.sql`:3cộtattempt và bảng`exam_review_sessions`, hash/token riêng. Nativeget_site/get_site_version read-only xácnhận projectmới/currentversion1/custom1owner0groups và exactbaselineIDs/commit/deployment ởtrên. Khôngproductionbackup/migration/deploy/audiencechange. Cần chạy đầy đủ quy trình phát hành khi owner ra lệnhmới, không dùng QA local thay releaseproof.

## Site riêng đã phát hành private — 09/10/2026

- **URL live private:** `https://mat-ma-da-gioi.cuong-vuviet.chatgpt.site`.
- Project mới: `appgprj_6ac8d74b14f8819193caded9533bb337`; owner-only custom access, không group/viewer khác.
- Version1: `appgprj_6ac8d74b14f8819193caded9533bb337~appgver_c9800c88b52c8191ac4f625c7ea3a7a0`.
- Deployment: `appgdep_6ac8d8aec8788191803420d8cbafe080`, native status **succeeded**, env revision1.
- Commit workflow tạo và push vào repository project **mới**: `6d1b24e64ab28c50b6484d6fec16ea9686bd241d`.
- Bản sao release: `.sites-runtime/release-checkout-20261009`. Chỉ manifest bản sao đổi ID; frozen source và project V7 giữ nguyên. Archive `.sites-runtime/new-site-release-20261009.tar.gz`, 24,453,103 bytes, chứa manifest mới và journal14 migrations0000–0013.
- Build `node scripts/run-framework.mjs build` trong copy: exit0. Windows build-helper bị lỗi đường dẫn; dùng build của cùng copy mới đã thành công, workflow `commands:[]` tái dùng đúng output. Packager cần `TAR_OPTIONS=--force-local` và archivePath dùng forward slash để tar không diễn giải `C:` thành remote host; retry thành công, không sửa plugin/source.

### QA đã thực hiện

| Kiểm | Kết quả |
|---|---|
| Native get_site/status | PASS: role owner, private, version1, deployment succeeded |
| D1 app schema | PASS:23 bảng, đủ accounts/rooms/lesson_*/exam*. Native bounded read mỗi bảng: tất cả0 hàng, không truncation/has_more; dữ liệu1room/6team của V7 không có trên Site mới |
| Migration proof | Archive có journal0000–0013; deploy succeeded, schema cuối có đủ23 bảng. **Applied ledger hệ thống không được user-table overview/connector trả về, chưa đọc trực tiếp**; không ghi “đã đọc ledger từng entry” |
| Storage declaration | Manifest/built config khai báo DB/LESSON_SOURCES; deploy succeeded. D1 khác V7 bằng inventory/empty rows. **R2 physical bucket ID/list/read/write isolation chưa có tool/owner-session để xác minh trực tiếp** |
| AI | PASS: `LESSON_AI_ENABLED=false`; không provider call |
| Private anonymous access | PASS: không credential trả401 cho /,/exam,/api/exams,/map3d.js; đúng owner-only gateway |
| Identity-less private request qua token có sẵn do native get_site cung cấp | PASS: /,/exam,/play,/presenter,/hosts200; không mint/rotate bypass token. Đây không phải phiên owner authenticated |
| Teacher routes chưa login | PASS: /exams và /lessons307 tới `/signin-with-chatgpt`; không giả owner identity |
| Map demo | PASS HTTP: /lesson-map.html?demo=8&world=academy307 tới /lesson-map?demo=8&world=academy, canonical page200 text/html. Chưa WebGL/real-device test trên URL mới |
| Static assets | PASS200text/javascript: map3d.js/themes/kits,5kit modules,Three module,PDF worker; không HTML login giả asset |
| API boundaries | PASS: /api/exams401 JSON AUTH_REQUIRED; POST/api/exam-play join mã ZZZZZZ404 JSON ROOM_NOT_FOUND, không ghi data; /api/lessons/sources401 |
| Worker logs |14 events read sau QA, outcomesok, không error-level exception. Error filter trả normal401/404 info event, không coi là server crash |
| Owner Exam E2E | NOT POSSIBLE: chưa có session owner trên browser/tool. Không tạo exam/pupil/essay/CSV production, không giả header danh tính |
| Owner runtime ID | SITE_OWNER_USER_ID lấy từ owner account identity native Site mới, không copy envV7; **authenticated request header thực chưa được xác minh** |

**Chưa mở public.** Rule giao yêu cầu QA đạt và chỉ cho bỏ qua E2E nếu không act-as-owner. Applied ledger trực tiếp và R2 isolation/app access còn thiếu bằng chứng riêng; giữ private thay vì gán PASS cho các mục chưa kiểm. Blocker là khả năng đọc ledger/storage/owner session, không có lỗi source/server mới phát hiện. Cần owner đăng nhập kiểm `/exams`/`/lessons`, và Settings/storage có ledger/R2 proof hoặc quyết định rõ mức bằng chứng thay thế được chấp nhận trước mở học sinh.

### Owner kiểm trước trên URL mới

1. Đăng nhập cùng email trường, mở `/exams`; nếu bị từ chối sau login, ghi triệu chứng/identity và chỉnh env tối thiểu sau xác minh, không đoán.
2. Tạo bài từ PDF Toán11 đã duyệt; đối chiếu đáp án do giáo viên chốt, không coi file AI đề xuất là đáp án được duyệt. Mở phòng; thử `/exam?code=...` với hai tên giả/session riêng; nộp, chấm tự luận, CSV.
3. Mở `/lessons` và thử source giả để xác nhận R2 riêng; xem ledger/schema ở Settings. Không mở public khi một check lỗi.

### Rollback Site mới

Site mới là version1, chưa có version runtime trước nó. Nếu lỗi, giữ private/ngừng dùng URL mới; V7 `https://toan-thpt.cuong-vuviet.chatgpt.site` vẫn public version9/b21 với deployment cũ. Không migrate/copy dữ liệu hoặc đổi audience/runtime V7 để rollback Site mới. Snapshot V7 ngoài repo chỉ là historical partial copy đã chấp nhận, không được chuyển vào Site mới.

---

## Khả thi Site riêng — đọc-only 09/10/2026

**Có thể tạo Site mới với URL/D1/R2 riêng bằng các tool hiện có. Chưa được giao thực hiện việc tạo mới.** Cần thay `project_id` trong manifest **bản sao phát hành riêng**, không sửa checkout/source đã freeze của Site V7. Chỉ đổi `--project-id` không đủ: `site-workflow.mjs` kiểm manifest khớp project và từ chối nếu khác.

### Trạng thái trước khi đổi hướng

Sau khi chủ hệ thống đồng ý hai ngoại lệ, đã lưu snapshot chấp nhận bị cắt ngoài repo và tạm chuyển Site V7 sang owner-only (access revision4). **Đã khôi phục audience public, revision5**, bằng `sites_update_site_access({project_id:"appgprj_6abd9dee373c81918861834328bbaf0f",access_mode:"public"})`; `sites_get_site` xác nhận public. Baseline vẫn saved version9, commit `b21f4c9b2ea9cc26e7b53182f79e027ed6e84cb1`, deployment `appgdep_6ac0e26123e08191aeb4e4b616293616` succeeded, env revision6. Anonymous GET `https://toan-thpt.cuong-vuviet.chatgpt.site/` trả **200**, `text/html; charset=utf-8`, 10,115 bytes, có nội dung game. Chưa save/deploy/migrate; không sửa runtime/env/DB/R2. Workflow build vấp đường dẫn Windows trước commit; phiên kế tiếp đã hủy khi đánh giá Site riêng. Việc audience từng bị thu hẹp là lịch sử có thật; không coi là V7 chưa từng bị chạm.

### Các bước nếu chủ hệ thống chọn Site riêng

1. Xác nhận URL slug/tên Site mới; `sites_create_site({slug:<slug mới>,title:<tên>,creation_intent:"user_requested"})` đúng một lần, không bật publish-on-push/plugin ngoài nhu cầu. Site mới mặc định private; giữ nguyên project cũ.
2. Giữ nguyên `id`/credential trả về. Tạo bản sao release sạch/isolated ngoài checkout freeze; loại logs/snapshot/secret, giữ nguyên runtime code, migrations, assets. Đăng ký ID trong **bản sao** bằng `node <Sites-plugin>/scripts/set-project-id.mjs --project-id <id mới>`; manifest mới giữ `d1:"DB"`, `r2:"LESSON_SOURCES"`. Không dùng credential/kho Git của project cũ. Đây là thay đổi metadata nguồn, cần được đồng ý cùng việc tách Site; code nghiệp vụ không đổi.
3. `sites_update_environment_variables` cho **ID mới** với email chủ hệ thống và `SITE_OWNER_USER_ID` đúng danh tính authenticated trên Site mới; không suy ID này từ UUID allowlist hoặc copy mù env cũ. AI giữ disabled. Sites provisioning từ manifest tạo/nối storage theo project; kiểm tool/database overview sau deploy để xác nhận D1/R2 mới, không trỏ sang storage V7.
4. Chạy `site-workflow.mjs --project-id <id mới>` trong checkout mới; stdin chứa credential mới, source/open result tương ứng, archivePath mới. Build/packaging mới phải khớp manifest/commit mới; không tái dùng archive chứa project_id cũ. Script commit/push riêng repository mới; nếu packaging Windows không chạy được thì báo blocker, không đổi nền tảng ngầm.
5. `sites_save_version_and_deploy_private` dùng ID/commit/archive mới, `sites_get_deployment_status` tới terminal. DB mới chạy migration **0000–0013** từ đầu, không chỉ 0008–0013; không copy một phòng/sáu team V7.
6. QA private trên URL mới: schema/ledger, identity, R2, Exam/lesson/12 maps, public/auth boundaries đúng policy. Đạt thì `sites_update_site_access({project_id:<id mới>,access_mode:"public"})` theo quyền chủ hệ thống đã cho phạm vi hiện có; kiểm URL mới public. Không đổi Site cũ ở các bước tạo/deploy mới.

### Rủi ro và đề nghị

- URL/đăng nhập mới; verify identity env và storage isolation, migration0–13 trên DB rỗng, archive provenance, route/auth QA. Phòng/đội cũ không chuyển sang URL mới; giữ V7 làm đường quay lại, không hứa chuyển session đang chạy.
- Owner cần chốt “Site riêng” + slug/tên và đăng nhập kiểm URL mới khi yêu cầu; không cần tài khoản Cloudflare hay chuyển Vercel nếu Sites provisioning đủ quyền/quota. Khôi phục V7public là mutation riêng cần nêu rõ cùng quyết định đổi hướng.
- Đề nghị: **Site riêng** nếu ưu tiên giữ trải nghiệm V7 cho lớp thật; không phụ thuộc snapshot bị cắt để bảo vệ DB cũ. In-place ít bước hơn nhưng thay runtime V7 và có khoảng owner-only. Vercel cần port D1/R2/auth, không phải nhánh phát hành nhanh của bản freeze.
- Ước lượng thao tác sau khi chốt và tooling hoạt động: Site riêng khoảng **20–45 phút**; in-place khoảng **10–25 phút**. Chưa bao gồm lỗi provisioning/packager/quota/identity hoặc kiểm lớp thật; đây là ước lượng, không phải ETA đã đo. Trên máy hiện có lỗi build-helper Windows, nên thời gian thực có thể dài hơn.

---

## Đề nghị đổi điều kiện từ Claude — chờ quyết định chủ hệ thống

- Claude đề nghị coi snapshot `teams` bị cắt bốn cell là backup được chấp nhận và mở public sau QA. Đây là quyết định do Claude đề xuất; chưa có xác nhận trực tiếp của chủ hệ thống trong lượt này để thay điều kiện backup trong lệnh đã dán.
- Transcript đọc được qua Claude bridge vẫn xác nhận owner-only trước, “backup không được thì dừng”, và lời “đọc codex và chỉ đạo nó làm tiếp”; chưa trả về câu mới về mở public/miễn backup đầy đủ. Câu “đầy đủ như plan” do Claude chuyển lại cần chốt phạm vi vì OCR, AI production, đa ngôn ngữ và các mục khác chưa hoàn tất.
- Đã kiểm `git show b21f4c9:.openai/hosting.json`: baseline có `r2:null`. Điều này xác minh baseline không khai báo binding R2, không thay phép liệt kê object của bucket provider.
- SQL 0008–0013 không sửa bảng V7, 0009 dựng lại bảng lesson mới; đây là yếu tố giảm rủi ro đã ghi. Snapshot thiếu cell vẫn chưa thể gọi là bản backup đủ để restore.
- Đã gửi hai câu hỏi trực tiếp cho chủ hệ thống: giữ backup đầy đủ/chấp nhận snapshot bị cắt; giữ owner-only/mở public sau QA phạm vi hiện có. Chờ câu trả lời, không coi im lặng hoặc lời relay của model khác là miễn điều kiện.
- QA đề nghị phải sửa tiêu chí trước khi dùng: owner-only có thể từ chối/redirect request không đăng nhập đúng chính sách, nên không yêu cầu vô điều kiện `/`, `/exam`, `/play`, `/presenter` đều 200 khi chưa login. Đếm bảng V7 trước test; thao tác owner tạo exam có thể tạo account/audit được ứng dụng cho phép, không tự coi thay đổi đó là migration phá dữ liệu. Exam chưa có thao tác xóa được xác minh, nên không hứa test exam có thể xóa chỉ từ tên `[KIỂM THỬ] xóa được`.

Chưa thực hiện mutation, chưa ghi `release done`; giữ source freeze. Phạm vi phát hành owner-only đã được chủ hệ thống cấp vẫn có hiệu lực sau khi gate backup được giải quyết.

---

## Tiếp tục qua backup logic — 09/10/2026: vẫn dừng trước mutation

- Đã đọc transcript đúng phiên Claude: chủ hệ thống xác nhận “Phát hành”, owner-only trước, rồi “đọc codex và chỉ đạo nó làm tiếp”. Quyền phát hành cùng phạm vi được giữ; không cần xin lại.
- Kiểm native Sites lần nữa: cùng project, role owner, baseline version 9 đang live, audience public, không thêm viewer/group khác. `DB` vẫn đúng mười bảng V7, chưa xuất hiện `lesson_*` hoặc `exam*`.
- Đã đọc từng bảng qua `sites_read_database_table_rows`, `limit:25`; chỉ tiếp tục bằng `model_projection.next_offset` nếu tool trả cursor. Kết quả được giữ trong bộ nhớ công cụ, không in row payload/token/secret ra chat/log.

| Bảng | Hàng nhận | Trạng thái |
|---|---:|---|
| accounts | 0 | đầy đủ, không omission/truncation |
| admin_audit | 0 | đầy đủ |
| community_players | 0 | đầy đủ |
| host_invites | 0 | đầy đủ |
| room_memberships | 0 | đầy đủ |
| rooms | 1 | đầy đủ |
| skill_actions | 0 | đầy đủ |
| system_hosts | 0 | đầy đủ |
| system_settings | 0 | đầy đủ |
| teams | 6 | **không đầy đủ:** `truncated:true`, `truncated_values:4`, `omitted_columns:0`, `omitted_rows:0`, `next_offset:null` |

**Blocker cụ thể:** bốn cell của `teams` đã bị tool cắt. Không có cursor để lấy tiếp phần cell còn lại; pagination chỉ phân trang hàng, không chứng minh lấy đủ cell đã bị cắt. Không dùng JSON này thay backup, không viết file và SHA-256 để tạo ấn tượng backup có thể phục hồi. Không kết luận “dữ liệu có nguy cơ bằng không”: production đã có một room/sáu team; các bảng lesson mới rỗng không thay điều kiện lấy trọn dữ liệu V7. Schema overview chỉ có tên bảng/cột, không cung cấp toàn bộ DDL/ledger/constraints.

R2: chưa có API list objects/manifest hoặc console khả dụng. Việc V7 chưa có `lesson_sources` không chứng minh bucket `LESSON_SOURCES` không tồn tại hoặc không có object. Ghi là **chưa xác minh**, không ghi “rỗng”.

Không đổi audience/env, mint credential, commit/push, save/deploy, migration hoặc tạo test data production. Chưa private release, chưa `release done`; rollback baseline IDs ở mục dưới giữ nguyên. Cần full export không cắt cell hoặc recovery snapshot có provenance/restore trước tiếp tục. Không đổi frozen source để tạo endpoint backup.

---

## Lệnh phát hành 09/10/2026 — dừng trước mutation

Chủ hệ thống đã trực tiếp yêu cầu owner-only release của bản freeze 646 tests. Quyền phát hành đã có; **chưa publish**, chưa ghi `release done` vì điều kiện backup production chưa đáp ứng.

### Bằng chứng read-only hiện tại

- `sites_get_site`: project `appgprj_6abd9dee373c81918861834328bbaf0f`, active, người gọi role owner; Site hiện **public**, có một owner, không group/viewer/editor khác. Audience chưa đổi.
- URL live hiện hữu: `https://toan-thpt.cuong-vuviet.chatgpt.site` — đây là baseline đang public, **không phải URL private release mới**.
- Baseline runtime V7 theo tên trong kế hoạch tương ứng **saved Site version 9**, commit `b21f4c9b2ea9cc26e7b53182f79e027ed6e84cb1`; không nhầm với saved Site version number 7.
- Saved version ID: `appgprj_6abd9dee373c81918861834328bbaf0f~appgver_1f3bd87ffc748191977f40d31593ed46`.
- Deployment ID: `appgdep_6ac0e26123e08191aeb4e4b616293616`; `sites_get_deployment_status`: succeeded, cùng URL, env revision 6.
- Native archive SHA-256: `9991d0a9776fb200c2dfd4413d7bd990233f271078b71d5326806470336850e8`, 30,310,400 bytes, 502 files; version/commit provenance đã đọc bằng `sites_get_site_version`.
- `sites_read_database_overview`: binding `DB`; 10 bảng ứng dụng hiện có: `accounts`, `admin_audit`, `community_players`, `host_invites`, `room_memberships`, `rooms`, `skill_actions`, `system_hosts`, `system_settings`, `teams`. Không suy ledger từ danh sách bảng; chưa đọc được applied-migration ledger.
- Runtime env revision 6 có `SITE_OWNER_EMAIL`, `SITE_OWNER_USER_ID`; email đúng. Không có cấu hình lesson AI bật. ID runtime chưa được đối chiếu với authenticated request thật; ID allowlist Sites và runtime không cùng chuỗi, nên không tự sửa hoặc coi là cùng loại ID. Không ghi giá trị ID/env/secret vào hồ sơ.

### Vì sao phải dừng

Connector được kiểm trong phiên này không có export/dump/backup D1, restore recovery point, list/export R2 hoặc arbitrary SQL. `read_database_table_rows` không thay full consistent backup/schema/migration ledger. CUA inventory không có tab Settings khả dụng; browser discovery báo `Codex auth token is unavailable`. Chưa có quyền console hay công cụ được xác minh để lấy bản backup production hiện thời và R2 manifest. Backup local 04/10 không thay backup production hiện tại. Không tạo endpoint xuất dữ liệu hoặc sửa frozen source để vượt điều kiện này.

Theo Task 1 của lệnh chủ hệ thống, dừng **trước** thay audience/env, tạo write credential, commit/push workflow, save/deploy, remote migration và mọi test ghi production. Chưa tạo private URL; source/test freeze giữ nguyên, Claude cần tiếp tục giữ freeze.

### Rollback cụ thể đã chuẩn bị — không thực hiện

Sau một release trong tương lai, muốn quay runtime về baseline V7 trên chính Site này:

```javascript
// Chỉ gọi khi audience đã được xác minh owner-only và rollback cần thực hiện.
sites_deploy_private_site_version({
  project_id: "appgprj_6abd9dee373c81918861834328bbaf0f",
  version_id: "appgprj_6abd9dee373c81918861834328bbaf0f~appgver_1f3bd87ffc748191977f40d31593ed46"
});
// Copy deployment id từ response mới, không dùng lại ID lần deploy cũ.
sites_get_deployment_status({ project_id: "appgprj_6abd9dee373c81918861834328bbaf0f", deployment_id: "<id trả về khi rollback>" });
```

1. Dừng mở phiên mới và bảo toàn bài thi phát sinh; chọn đúng version ID ở trên.
2. Deploy lại version này, giữ migrated D1/R2; không reverse 0009/drop bảng hoặc ghi đè bằng backup cũ.
3. Kiểm auth/phòng/game cũ; nếu V7 không tương thích DB đã migrate, giữ dừng thao tác ghi và phục hồi DB riêng từ backup production đã xác minh. Re-deploy runtime không tự rollback D1.

### Điều kiện tiếp tục

Cần công cụ/phiên Settings hoặc console có quyền export **D1 production hiện thời + schema/applied ledger** và lấy manifest R2 đúng project; hoặc một recovery snapshot hiện thời có provenance và đường restore đã kiểm. Người dùng nhập đăng nhập/credential qua giao diện chính thức, không gửi secret trong chat. Khi có khả năng backup, hoàn tất backup trước, sau đó mới chuyển audience từ public sang owner-only theo quyền đã được chủ hệ thống cấp và tiếp tục workflow. Không cần xin lại quyền phát hành cùng phạm vi.

---

## Khi chủ hệ thống nói “phát hành”

**Kế hoạch thao tác, chưa thực hiện.** Source freeze của Claude ghi trong `tasks/coordination.md`: 646/646 tests, typecheck/lint/build exit 0, Exam E2E PASS. Mốc này thay checkpoint local cũ cho bản hiện tại; production backup, audience, danh tính và rollback vẫn phải xác minh. Chỉ hai tệp tài liệu được sửa sau freeze; không dùng HEAD `b21f4c9` để phát hành WIP mới.

### Trình tự cụ thể

1. **Đọc và khóa đúng đích:** `sites_get_site({project_id:"appgprj_6abd9dee373c81918861834328bbaf0f"})`; `sites_list_site_versions({project_id,limit:20})`, rồi `sites_get_site_version({project_id,version_id:<id trả về>})`. Ghi audience/owner/workspace, version và deployment ID V7 đang live. Kiểm source/build manifest sau freeze; không reset/stash/clean hoặc thay source đang duyệt.
2. **Gate trước mutation:** `sites_read_database_overview({project_id,binding_name:"DB"})`; xem schema và applied-migration ledger bằng Settings database viewer, chỉ dùng tên trả về. Backup/export D1 hiện tại và R2 object manifest qua console/quyền quản lý thực sự có; ghi recovery point. Connector hiện không có API export D1/R2 hoặc SQL tùy ý, nên thiếu quyền/backup thì dừng ở bước này. Không dùng database ID placeholder trong `dist/server/wrangler.json` để chạy Wrangler remote.
3. **Danh tính runtime:** `sites_get_environment_variables({project_id})`; kiểm kín `SITE_OWNER_EMAIL=cuong.vuviet@thedeweyschools.edu.vn` và `SITE_OWNER_USER_ID` tương ứng tài khoản xác thực. Chỉ nếu thiếu/sai, dùng `sites_update_environment_variables` đúng hai key đã xác minh; thao tác này **đổi cấu hình production**, cần deploy version để áp dụng. Giữ AI tắt nếu chưa có quyết định provider riêng.
4. **Chuẩn bị source/archive:** `sites_create_source_repository_write_credential({project_id})`, không bật publish-on-push. Theo skill Sites, chạy lệnh dưới trong đúng checkout với `exec_command(tty:true,yield_time_ms:1000)`; sau thông báo sẵn sàng, gửi JSON qua `write_stdin`. Credential chỉ ở bộ nhớ/stdin, không đưa vào shell, tài liệu hoặc log.

   ```powershell
   node "C:\Users\ADMIN\.codex\plugins\cache\openai-curated-remote\sites\0.1.75\scripts\site-workflow.mjs" --project-id appgprj_6abd9dee373c81918861834328bbaf0f
   ```

   JSON stdin gồm `credential` do tool trả về và `archivePath` tuyệt đối, ví dụ `C:\Users\ADMIN\.codex\worktrees\6dec\signal-station-site\.sites-runtime\release-20261009.tar.gz`; giữ `source` nếu đã có kết quả open của workflow. `commands` chỉ chứa check/build còn cần theo hash đầu vào; khi cần đóng gói lại, dùng `[["node","C:/Users/ADMIN/.codex/plugins/cache/openai-curated-remote/sites/0.1.75/scripts/build-site.mjs"]]`. Script **commit/push source**, kiểm provenance và đóng gói; chỉ chạy sau lệnh phát hành, phối hợp Claude cho bước build, không tự nhận archive cũ hợp lệ với commit mới. Giữ WIP ngoài release, log và dữ liệu nhạy cảm khỏi source snapshot; nếu workflow báo remote/source khác, dừng để đối chiếu. Copy nguyên `project_id`, `commit_sha`, `archive` từ kết quả thành công.
5. **Phát hành owner-private:** chỉ khi bước 1 xác minh owner là viewer duy nhất, không có group/khách khác, gọi `sites_save_version_and_deploy_private({project_id,commit_sha,archive})`. Nếu version có archive đúng hash đã saved, dùng `sites_deploy_private_site_version({project_id,version_id})`, không save lại. Nếu site đang public/shared hoặc chưa xác minh owner-only, không dùng private tool làm phép thử; cần quyết định audience riêng của chủ hệ thống, không tự chuyển quyền truy cập hoặc fallback sang public.
6. **Theo dõi và đối chiếu:** `sites_get_deployment_status({project_id,deployment_id:<id trả về>})` đến terminal; URL chỉ lấy từ kết quả `succeeded`. Sites áp dụng và ghi ledger từng migration chưa có **trước Worker upload**: 0008 → 0009 → 0010 → 0011 → 0012 → 0013, không replay file đã áp dụng. Đây là bước **ghi schema/dữ liệu production D1**, riêng 0009 dựng lại ba bảng; publish lỗi vẫn có thể đã đổi DB. Kiểm boundary applied/unapplied khi lỗi; không sửa migration đã áp dụng hoặc chạy rollback SQL tự đoán.
7. **Nghiệm thu riêng tư:** owner dùng `/exams`, `/exam`, `/lessons`, `/play`, `/presenter`; dùng tên/file giả. Nhập đề, join, trả lời, ảnh, chấm/CSV sẽ **ghi production D1**; tải giáo án qua Lesson Studio sẽ **ghi R2 `LESSON_SOURCES` và metadata D1**. Sites tạo/nối binding R2 từ manifest trong publish; không chép kho local `.wrangler` lên production, không mặc định khôi phục/xóa objects. Exam hiện lưu ảnh đề/tự luận trong D1, không dùng R2. Gate host thứ hai/student thật chỉ chạy sau quyết định cấp quyền tương ứng; owner-private không cho các tài khoản đó vào và chưa đủ để tổ chức thi cả lớp.

Tên tool ở trên viết tắt namespace `mcp__codex_apps__sites_*`. Tất cả Sites URL deployment đều là **production**, không có staging riêng chỉ vì gọi “private”. Ghi trạng thái từng bước; không gọi private/public deployment trước lệnh của chủ hệ thống.

### Cần chủ hệ thống cung cấp

- Xác nhận phát hành **owner-private để kiểm trước** hay mở cho lớp thi; nếu mở cho lớp, chốt danh sách tài khoản/nhóm được truy cập và việc đổi audience hiện tại. Không cần gửi lại project ID/link đã có nếu connector xác minh khớp.
- Phiên đăng nhập chủ site đúng workspace; khi kiểm rộng hơn, một tài khoản host thứ hai và hai tài khoản học sinh thử, cùng thiết bị thật. ID owner lấy từ danh tính xác thực; không yêu cầu dán password/token.
- Quyền console/backup D1–R2 hoặc recovery point đã xác minh, phiên bản V7 đang live; PDF và đáp án cuối đã giáo viên duyệt trước dùng với lớp thật.

### Quay lại V7 — ba bước

1. Dừng mở phiên mới; ghi lại dữ liệu bài thi phát sinh, chọn đúng saved `version_id` V7 từ history/provenance đã xác minh.
2. Deploy version V7 qua tool phù hợp audience; giữ migrated D1/R2 và dữ liệu mới, không drop bảng/reverse 0009 hoặc ghi đè bằng backup cũ.
3. Kiểm gameplay/phòng cũ/quyền truy cập; nếu V7 không tương thích schema mới, dừng truy cập thao tác ghi và phục hồi vào DB riêng theo recovery point, không làm mất bài thi mới.

---

- Ngày: 2026-10-09.
- Phạm vi: dossier + rehearsal offline; không publish, remote migration, production write, provider call, server, build, commit hoặc push.
- Repo: `C:\Users\ADMIN\.codex\worktrees\6dec\signal-station-site`.
- Site theo plan: `https://toan-thpt.cuong-vuviet.chatgpt.site`; production V7 là thông tin trong plan/HANDOFF, chưa xác minh live trong lượt này.
- **Kết luận: rehearsal SQLite offline PASS; private release chưa đủ điều kiện.**

## 1. Bằng chứng source và migration

- [x] Ghi checkpoint: branch `codex/mat-ma-da-gioi`, HEAD `b21f4c9b2ea9cc26e7b53182f79e027ed6e84cb1`; WIP giữ nguyên.
- [x] Helper `scripts/qa/codex-release-migration.mjs` ghi HEAD, status và hash tracked diff trước/sau vào `tasks/codex-release-migration-20261009.json`. Hash không bao gồm nội dung untracked; source đang cùng phát triển, **chưa freeze**.
- [x] Migrations theo journal đúng thứ tự 0008 → 0009 → 0010 → 0011 → 0012 → 0013.
- [x] Mở hai backup bằng `new DatabaseSync(source, { readOnly: true })`; dùng stdlib `node:sqlite.backup` tạo bản sao trong OS temp. SHA-256 source trước/sau bằng nhau; temp copy đã xóa; không mở live `.wrangler` DB.
- [x] Chạy mỗi migration trong transaction trên bản sao, `PRAGMA foreign_keys=ON`; `integrity_check=ok`, `foreign_key_check` không có dòng lỗi sau **mỗi bước**.
- [x] So sánh toàn bộ cột cũ và hash multiset rows của mọi bảng ứng dụng đang tồn tại trước/sau mỗi bước; count/hash bằng nhau. Không xuất row payload, tên học sinh, token, answer key hoặc secrets.
- [x] So schema/table/index/trigger từng bước với schema mới dựng từ journal; artifact ghi tên object, hash SQL/schema. Cuối chuỗi so 23 bảng với `drizzle/meta/0013_snapshot.json`: cột/type/nullability/PK/index uniqueness và FK đều khớp.
- [x] Fixture in-memory pre-0009 có session/learner/receipt thật ở mức SQLite; xác nhận mỗi bảng 1 → 1, các trường cũ giữ nguyên, `plan_row_id/plan_hash` mới là NULL. Kiểm thêm immutable triggers, matching composite plan FK, duplicate source hash sau 0011, insert source/job/exam, invalid answer FK bị chặn.
- [ ] Backup D1 production hiện thời + metadata/object manifest R2 trước migration thực.
- [ ] D1/Cloudflare migration runner thật, applied-migration ledger và transaction behavior trên private release. Node SQLite PASS chưa chứng minh D1 runtime.

### Coverage thực tế

| Nguồn rehearsal | Schema phát hiện | Migration thực chạy trên bản sao | Row preservation đáng chú ý |
|---|---|---|---|
| `.sites-runtime/local-before-lesson-20261004.sqlite` — 167936 bytes | Đúng schema 0007; không có lesson tables | 0008–0013 | `accounts` 1 → 1; `rooms` 1 → 1; `teams` 1 → 1; mọi bảng ứng dụng cũ giữ cột/rows |
| `.sites-runtime/local-before-plan-0009-20261004.sqlite` — 262144 bytes | Đúng schema 0008; chưa có plan/source/job/exam tables | 0009–0013; **0008 không replay lần hai** | `lesson_sessions` 1 → 1; `lesson_learners` 1 → 1; `lesson_event_receipts` 0 → 0; package 1 → 1; audit 1 → 1; rooms 2 → 2 |
| In-memory dựng từ 0000–0008, seed trước 0009 | Pre-0009, không phải dữ liệu production | 0009–0013 | session/learner/receipt đều 1 → 1; receipt không rỗng bổ sung coverage backup thực |

Hai backup không có `__drizzle_migrations`; helper phát hiện bằng table/index/column rồi yêu cầu khớp schema đầy đủ ở stage tương ứng. Không suy applied history chỉ từ tên backup.

### Tác động SQL — không gọi cả chuỗi “chỉ thêm”

| Migration | Tác động chính | Bảo toàn đã kiểm |
|---|---|---|
| 0008 | Tạo 5 lesson tables, unique indexes, package immutable triggers | Bảng/row V7 giữ nguyên trên backup pre-lesson |
| 0009 | Tạo `lesson_session_plans`; drop 6 indexes, rename/rebuild `lesson_sessions`, `lesson_learners`, `lesson_event_receipts`; copy toàn bộ cột cũ; drop 3 bảng tạm; recreate indexes, thêm plan index/FK/immutable triggers | Row/count/hash các bảng gốc bằng nhau; FK children trỏ bảng mới; không còn `*_pre_0009`; session cũ giữ NULL plan fields |
| 0010 | Tạo `lesson_sources`, `lesson_package_sources`, indexes/FKs | Bảng/rows đang có không đổi |
| 0011 | Drop/recreate `idx_lesson_source_hash`: UNIQUE thành non-unique trên `(owner_account_id,sha256)` | Không đổi rows; fixture chấp nhận 2 sources cùng owner/hash, request unique vẫn được schema contract kiểm |
| 0012 | Tạo `lesson_generation_jobs`, indexes/FKs | Bảng/rows đang có không đổi |
| 0013 | Tạo `exams`, `exam_attempts`, `exam_answers`, `exam_assets`, indexes/FKs | Bảng/rows đang có không đổi; đủ bảng FK targets sau toàn bộ migration; insert hợp lệ pass, invalid answer FK bị chặn |

Hashes đầy đủ của SQL và backup nằm trong artifact JSON. Backup source SHA-256:

- `local-before-lesson-20261004.sqlite`: `322abab1ebb5098274a276ba2b68d8400d0b6a4600abb6ae322437f816f97c4f`.
- `local-before-plan-0009-20261004.sqlite`: `c1e364f6267614e10c7c2d863b59dbaebef1c5752e8569084cb9166d0b34431d`.

## 2. Binding và dữ liệu

- [x] Source `.openai/hosting.json`: `project_id=appgprj_6abd9dee373c81918861834328bbaf0f`, `d1=DB`, `r2=LESSON_SOURCES`.
- [x] Source dùng `env.DB` trong `lib/storage.js`, `getEnv().LESSON_SOURCES` trong lesson source/proposal routes.
- [ ] Xác minh project/account/workspace hiện hữu khớp Site và quyền quản lý production.
- [ ] D1 release có đủ `accounts`, `rooms`, `lesson_*`, `exams`, `exam_attempts`, `exam_answers`, `exam_assets`; không nhân bản nhầm DB.
- [ ] R2 `LESSON_SOURCES` tồn tại, worker binding đúng, object private; owner đọc original, host khác/student không đọc; không đưa file nguồn vào log.
- [ ] Package/session dùng version/hash bất biến; live mode yêu cầu approved package + matching approved session plan. SQLite constraint checks không chứng minh toàn bộ runtime authorization.
- [ ] Presenter projection không lộ learner names/passports/answer keys.

## 3. Environment và secrets — chỉ ghi tên

| Tên source sử dụng | Gate cần xác minh trên release |
|---|---|
| `SITE_OWNER_EMAIL`, `SITE_OWNER_USER_ID` | Cùng danh tính owner từ Sites authenticated headers; một trường riêng chưa đủ root |
| `DB` | D1 binding release đọc/ghi đúng DB, đúng schema |
| `LESSON_SOURCES` | R2 binding release, original download/private access |
| `LESSON_AI_ENABLED`, `LESSON_AI_ENDPOINT`, `LESSON_AI_MODEL`, `LESSON_AI_API_KEY` | AI config tùy chọn; khi bật phải có endpoint/model/key hợp lệ, teacher consent và pedagogy gate |
| `LESSON_AI_ALLOW_LOCAL` | Chỉ cho rehearsal endpoint loopback nếu chủ hệ thống đã cho phép; production dùng HTTPS |

- [x] Kiểm tên trong `lib/access-control.js`, `lib/storage.js`, `lib/lesson/generation-provider.js` và routes; không đọc/in giá trị env/secrets.
- [ ] Xác minh các binding/identity names đã cấu hình thật trên release.
- [ ] AI không bật trước khi teacher xác nhận nội dung gửi đi; không gọi provider để thử với giáo án/học sinh thật.
- [ ] Log/build artifacts không chứa source/answer key/learner token/API key.

## 4. Verification source freeze trước publish

| Lệnh (cwd repo ở đầu checklist) | Lượt này | Ý nghĩa |
|---|---|---|
| `node scripts/qa/codex-release-migration.mjs` | exit 0; artifact JSON | Offline migration/assert checks; không phải release certificate |
| `npx --no-install eslint scripts/qa/codex-release-migration.mjs --quiet` | exit 0 | Lint riêng helper |
| `git diff --check -- tasks/release-checklist.md scripts/qa/codex-release-migration.mjs tasks/codex-release-plan.md` | exit 0 | Tracked diff check; các file này hiện untracked nên chưa kiểm nội dung mới |
| `git diff --no-index --check -- /dev/null <file>` cho checklist/helper/plan | Mỗi lệnh exit 1; không có whitespace diagnostics sau sửa EOF | Với `--no-index`, 1 là file có khác `/dev/null`; chỉ còn cảnh báo LF/CRLF, không phải lint/test failure |
| `npm test`, `npm run typecheck`, `npm run lint -- --quiet`, `npm run build` | Không chạy; Claude sở hữu full gate/build/server | Phải chạy lại sau freeze; không tái sử dụng kết quả 598 tests từ plan 18.6 làm final gate |

- [ ] Claude xác nhận source freeze, gửi commit/diff + content hashes của untracked.
- [ ] Claude chạy full gate mới trên đúng source freeze.
- [ ] Targeted exam fixes recheck trên freeze; `tasks/codex-exam-review.md` hiện ghi 3 P1 + 2 P2 ĐÃ SỬA và coordination ghi 37/37 + lint exit 0; đó là checkpoint khác, chưa rerun trong dossier.
- [ ] Cold teacher rehearsal không dùng test-only identity giả để thay bằng chứng authenticated private Site.

## 5. Private smoke cần chạy với tài khoản thật

Từng ô chỉ tick sau khi ghi private URL/release ID, thời gian, account role, expected/actual và artifact đã loại secrets. Dùng synthetic source/learner; screenshot/API evidence không để lộ token/key.

| Role | Exam | Lesson / presenter | Expected privacy/permission |
|---|---|---|---|
| Owner/teacher | Import PDF, sửa crop/key, create/open/start, theo dõi, extend/close, chấm essay, CSV; late/replayed save sau submit/close bị từ chối | Upload/review/proposal/approve + create preview/live theo plan; cockpit điều khiển; owner presenter | Own original/results/assets; projection ẩn learner private data |
| Host thứ hai | Tạo/đọc exam của mình; thử ID exam/attempt/photo/CSV owner khác | Gói/source owner khác; lesson room chưa được cấp quyền | Exam hiện owner-only: host thứ hai không có quyền exam người khác; denied response, không payload private |
| Cohost lesson được cấp quyền | Không suy cohost lesson thành cohost exam | Đọc/điều khiển đúng lesson room; presenter; revoked rồi retry cùng phiên | Chỉ đúng quyền room; original source vẫn owner-scoped; revoked denied |
| Student A/B | Join/mascot; MCQ/TF/short/essay, photo, reload/offline/retry/submit; A thử token/photo/attempt của B | Join/map/hint/group/individual recheck/extension/exit | Public question + own answer/photo/result theo policy; không key/rubric, private roster hoặc original |
| Outsider/revoked | Thử teacher routes, expired/replaced learner token | Presenter token cũ sau rotation; user đã revoke; cookie fallback | 401/403/404 theo route; không bypass hoặc private payload |

- [ ] Owner smoke private URL.
- [ ] Host thứ hai + lesson cohost + revoked smoke private URL.
- [ ] Student A/B + outsider smoke private URL.
- [ ] 40 học sinh: concurrent autosave + offline queue + submission/close + clock/CSV, không mất bài.
- [ ] Thiết bị thật/TV; responsive 360×640, 390×844, 768×1024, 1920×1080: không scroll ngang, formula không cắt, target tối thiểu 44 px.
- [ ] 3D đo lại source mới sau wider-map/filter/map changes. Plan 18.5 là số đo lịch sử trên Iris Plus; chưa thay cho kết quả mobile/iPad thật hoặc source mới.

## 6. Rollback V7 — bằng chứng hiện có và giới hạn

- [x] Local HEAD có commit `b21f4c9b2ea9cc26e7b53182f79e027ed6e84cb1` (`Publish Mật Mã Đa Giới`); tên commit không chứng minh remote đang phục vụ đúng version.
- [x] Local recovery files tồn tại và hash đã đọc:
  - `.sites-runtime/source-b21f4c9.tar`: 15237120 bytes, SHA-256 `30be3783a7892c3552e80900eab9353db5198afd042a3511491b25faedc131be`.
  - `.sites-runtime/mat-ma-da-gioi-policy.tar.gz`: 26270598 bytes, SHA-256 `60fe16baa6c819634c7b7a2ab301dad7355f1f95cf134fd30637a37636880079`.
- [ ] Xác minh tar restore/build trong isolated checkout; hash tồn tại chưa chứng minh artifact deployable.
- [ ] Ghi runtime/deployment ID V7 đang phục vụ Site thật và source hash tương ứng; lưu owner/account/workspace.
- [ ] Backup production D1 + R2 manifest trước mutation; local 04/10 backups không thay current production backup.
- [ ] Diễn tập V7 đọc migrated schema trong bản sao. Rehearsal này chỉ chứng minh SQL/schema/data, **chưa chạy runtime V7 trên migrated DB**.

Quy trình rollback cần duyệt và rehearsal:

1. Dừng mở exam/lesson mới; khóa mutation phiên mới; ghi lại dữ liệu phát sinh sau migration.
2. Chuyển Site runtime về artifact V7 đã xác minh; giữ nguyên migrated DB/R2 và dữ liệu lesson/exam mới. Không drop tables, chạy reverse 0009 hoặc đưa toàn DB về backup cũ.
3. Smoke gameplay V7/phòng cũ/`/hosts`; kiểm mode cũ không thành lesson, owner/auth/cohost vẫn đúng. `/play`/`/presenter` mới có thể không tồn tại ở V7: cần phương án bảo toàn/tạm dừng phiên mới thay vì giả định V7 tiếp tục chạy chúng.
4. Nếu runtime V7 không tương thích, giữ maintenance; khôi phục D1 vào DB mới từ backup rồi reconcile dữ liệu mới theo phương án đã duyệt, không ghi đè DB đang chứa bài thi mới.

## 7. Gates còn mở trước private release

- [ ] Source freeze + full current gate của Claude.
- [x] Offline rehearsal 0008–0013, dữ liệu app cũ giữ nguyên, FK/integrity sạch.
- [ ] Current production backup + verified project/bindings/env identity + real D1 applied ledger.
- [ ] Private teacher/second-host/cohost/student/outsider smoke, device/TV và 40 pupil rehearsal.
- [ ] V7 runtime compatibility + restore/rollback rehearsal, giữ dữ liệu mới.
- [ ] Teacher acceptance nội dung/đáp án; AI consent/pedagogy gate nếu bật AI.
- [ ] Chủ hệ thống ra lệnh publish riêng trong chat.

**Góc nhìn release:** local migration PASS loại một gate; dữ liệu production, danh tính authenticated, runtime rollback và bài làm học sinh quyết định phát hành. Khi có bằng chứng mới cho các gate trên, cập nhật từng ô; không suy release PASS từ test count hoặc nhãn “bản dùng được”.
