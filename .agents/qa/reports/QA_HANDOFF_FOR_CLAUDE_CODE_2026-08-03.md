# Handoff cho Claude Code — Chuẩn hóa QA và E2E an toàn

**Ngày audit:** 2026-08-03  
**Mục tiêu:** sửa hệ thống QA, test infrastructure và tài liệu vận hành; **không** sửa tính năng ứng dụng, Firestore production hay dữ liệu người dùng trong hạng mục này.  
**Trạng thái hiện tại:** chưa đủ điều kiện dùng E2E làm release gate.

## 0. Baseline và ràng buộc bắt buộc

- Commit đã audit: `6b70a717af28f69dbc55215ce7d1af883509b2f0`
- Branch hiện tại: `feat/toan-final-template`
- Worktree đang dirty, gồm thay đổi Dự giờ, tài liệu, file DOCX và artifact QA. **Không reset, checkout, clean, xóa, đổi tên hoặc commit các thay đổi có sẵn.**
- Chạy lệnh npm trên PowerShell theo dạng:

  ```powershell
  npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai" run <script>
  ```

- Không deploy Firebase/Vercel, không dùng Admin SDK trên production, không tạo/xóa dữ liệu production, không tự mở Chrome profile cá nhân.
- Nếu cần API key, Google login, test account, staging hoặc quyền production-write: dừng tại gate tương ứng và báo owner. Không hard-code, in log, inject vào `localStorage`, hay đưa vào report.

## 1. Ba câu hỏi phản biện bắt buộc trước khi code

### Câu hỏi cần owner quyết định

1. Phạm vi Claude Code chỉ là **QA infrastructure/docs**, hay có quyền sửa luôn các lỗi sản phẩm/security được test phát hiện? Mặc định của handoff này là **chỉ QA infrastructure/docs**.
2. Có Firebase project/emulator hoặc staging riêng cho test ghi dữ liệu không? Nếu chưa có, chỉ triển khai `local-readonly` và `prod-readonly`; không giả lập E2E write bằng production.
3. Owner có chấp thuận thêm runner E2E được version-pin (khuyến nghị `@playwright/test`) và các fixture vô danh vào repo không? Nếu không, chỉ sửa tài liệu/cổng an toàn, không tuyên bố E2E đã được phục hồi.
4. Nếu cần production-write validation, ai cấp phê duyệt theo từng lượt và quy tắc cleanup nào được chấp nhận? Không có phê duyệt = `NOT RUN`, không phải PASS.

### Góc nhìn top 0.1%

Vấn đề không phải chỉ là sửa đường dẫn `npm run test:e2e`. Đây là lỗi **governance và contract của hệ thống kiểm thử**: một script phải biết rõ môi trường, quyền dữ liệu, fixture, evidence, cleanup và exit semantics trước khi nó được gọi là release gate. Test browser cá nhân, fallback sang production và “skip rồi PASS” làm kết quả không thể tái lập hoặc tin cậy.

### Thách thức giả định ban đầu

Đừng “làm cho lệnh E2E chạy xanh” bằng cách đổi path sang script cũ. Điều đó biến một lỗi thấy rõ thành false PASS nguy hiểm hơn. Mục tiêu đúng là tạo một đường kiểm thử **deterministic, tracked, non-destructive by default**; các script cũ chỉ là artifact lịch sử cho đến khi được đánh giá lại từng phần.

## 2. Sự thật đã xác minh

| Hạng mục | Hiện trạng | Hệ quả cần sửa |
|---|---|---|
| `test:e2e` | `package.json` trỏ `node live_dom_test.js` ở root, nhưng file root không tồn tại | Không dùng làm gate; chỉ thay script sau khi runner mới đã có test thật |
| Unit test | `npm run test` loại `tests/rules/**` | Rules phải luôn chạy riêng qua emulator |
| Rules test | Chỉ phủ chủ yếu `duGio` và hai smoke case `lessonPlans` | Cần mở rộng coverage theo collection/risk matrix |
| Local UI | Vite proxy `/api` sang production | Local UI write/AI call có thể vẫn tác động production; local không mặc nhiên an toàn |
| Browser docs | Một guide yêu cầu Playwright/profile thật, guide khác/script dùng Puppeteer/CDP | Chọn một runner, clean profile và một source of truth |
| Script legacy | Có force-kill Chrome, xóa `LOCK`, `skip`, eval JS, inject API key, hard-code production và publish/submit data | Không được chạy mặc định, không là release gate |
| Build budget | `HANDOFF.md` nói warning không block nếu build exit 0, protocol nói entry >1 MB là hard fail | Chuẩn hóa một policy và tự động đo size |
| Handoff/reports | Có nhiều PASS lịch sử theo commit/môi trường khác nhau | Không dùng làm PASS hiện tại nếu thiếu SHA, environment và artifact mới |

### File/chứng cứ liên quan

- `package.json:8-15`
- `vitest.config.ts:9-11`; `vitest.rules.config.ts:10-15`; `firebase.json:9-14`
- `vite.config.ts:15-25,27-50`
- `.agents/qa/QA_TESTING_PROTOCOL.md:7-176`
- `.agents/qa/BROWSER_TESTING_GUIDE.md:25-50`
- `.agents/qa/e2e_testing_guide.md:18-64`
- `.agents/qa/scripts/start_chrome.js:15-43`
- `.agents/qa/scripts/run_test.js:4-67,172-187,377-403`
- `HANDOFF.md:708-734,761-789,841`

## 3. Outcome cần bàn giao

Claude Code chỉ được báo hoàn tất khi có đủ các outcome sau:

1. Một quy trình QA có **một nguồn sự thật** cho runner, mode môi trường, gate và kết quả.
2. Không còn package script nào báo E2E PASS khi file thiếu, test bị skip, browser/HTTP lỗi hoặc cleanup chưa xác nhận.
3. E2E mới (nếu owner cho phép) nằm trong source control, chạy với browser context/profile QA sạch, không chiếm hoặc đóng Chrome người dùng.
4. Mọi write test đều bị khóa bằng mode/flag rõ ràng, fixture prefix và evidence cleanup.
5. Báo cáo QA phân biệt rõ `PASS`, `FAIL`, `BLOCKED`, `NOT RUN`, `INCONCLUSIVE`; kết luận release chỉ dựa trên required gates.

## 4. Thiết kế quy trình đích

### 4.1. Các mode không được suy diễn hoặc fallback

| Mode | Được phép | Cấm |
|---|---|---|
| `local-readonly` | static checks, render/UI smoke không ghi, route/layout/accessibility | AI call, save/publish/submit, fallback sang production write |
| `emulator-write` | fixture vô danh, Rules/API/data write, cleanup tự động | production endpoint, dữ liệu/cookie thật |
| `staging-write` | E2E write có prefix và manifest cleanup | production fallback, profile cá nhân, credential hard-code |
| `prod-readonly` | smoke bằng test account do owner cấp | tạo/sửa/xóa/publish/submit, Admin SDK/REST write |
| `prod-write-approved` | chỉ flow được owner phê duyệt, UI cleanup trong cùng session | chạy nếu thiếu approval ID, test account, prefix hoặc cleanup evidence |

Không tạo `staging-write` nếu project chưa có staging. Khi đó test đó phải hiện `NOT RUN` hoặc `BLOCKED` một cách trung thực.

### 4.2. Thứ tự gate bắt buộc

```text
Baseline repo
  -> lint app + lint API
  -> unit tests
  -> Firestore Rules emulator tests
  -> build + bundle budget
  -> local-readonly UI smoke
  -> emulator/staging functional E2E (nếu được cấp quyền)
  -> prod-readonly smoke
  -> prod-write-approved (chỉ khi owner cho phép)
```

Fail một gate phải dừng các scenario phụ thuộc, nhưng vẫn chạy các scenario độc lập, không ghi dữ liệu. Kết luận tổng thể phải là `NOT APPROVED` khi còn required FAIL/BLOCKED.

### 4.3. Browser runner

Khuyến nghị dùng **một runner duy nhất: `@playwright/test` được version-pin**. Không dùng Puppeteer/Playwright MCP/CDP song song làm source of truth.

Runner phải:

- tạo browser context/profile test sạch; không dùng Chrome profile `Default`, stealth plugin hoặc port `9222` của người dùng;
- nhận URL target bắt buộc từ environment; không tự fallback localhost sang production;
- đặt timeout hữu hạn, artifact path riêng cho mỗi run, screenshot/trace/video khi fail;
- trả non-zero khi assertion, setup, cleanup hoặc browser/network error;
- không có `eval`, `skip` tương tác hoặc success message sau skipped scenario;
- không log secret, token, student code, localStorage hay PII.

Không xóa script legacy trong hạng mục này. Đánh dấu chúng là `legacy / do-not-run-as-gate` trong tài liệu; chỉ xóa/chuyển chúng sau review riêng.

## 5. Hạng mục Claude Code cần thực hiện

### P0 — chặn false PASS và thao tác không an toàn

1. Audit các script/package scripts hiện có. Không để `test:e2e` trỏ đến file thiếu hoặc artifact legacy.
2. Chỉ đăng ký lại `test:e2e` sau khi runner tracked có ít nhất một smoke test thực, assertion và exit semantics đúng.
3. Không chạy hoặc gọi từ package script các file sau: `.agents/qa/scripts/start_chrome.js`, `run_test.js`, `conic_differentiated_test.js`, `full_e2e_test.js`, `e2e_giaoandewey.js`, `qa_script.js`, `live_dom_test.js`, `test/e2e-production-test.mjs`.
4. Ghi nhận rõ mọi test bị skip thành `NOT RUN`/`INCONCLUSIVE`; CI/release verdict không được coi chúng là PASS.
5. Không dùng production REST write, Firebase Admin SDK, hard-code teacher/student IDs, injected API key hoặc localStorage credential.

### P1 — tài liệu và manifest chuẩn

Tạo/cập nhật các tài liệu dưới `.agents/qa/`:

- `QA_RUNBOOK.md`: source of truth về mode, quyền, thứ tự gate, command matrix, test data, cleanup, evidence và verdict.
- `QA_RUN_MANIFEST_TEMPLATE.md`: SHA/branch/dirty tree, environment, test-account class, approval ID, fixture IDs, API budget, artifacts, cleanup status, outcomes.
- `QA_REPORT_TEMPLATE.md`: format issue (priority, repro, expected/actual, evidence, impact, owner, retest) và release verdict.
- Cập nhật `QA_TESTING_PROTOCOL.md`: giữ acceptance matrix theo module; bỏ lệnh/script stale và thay “dừng toàn bộ ở lỗi đầu tiên” bằng isolation + continued independent testing.
- Cập nhật `BROWSER_TESTING_GUIDE.md`: không profile thật/CDP mặc định; mô tả runner duy nhất, clean browser context và evidence.
- Cập nhật `e2e_testing_guide.md`: đánh dấu lịch sử/legacy, không hướng dẫn chạy root scripts hoặc “sửa nhanh code” trong một QA-only run.
- Cập nhật ngắn phần QA của `HANDOFF.md`: link runbook, command matrix thật, tình trạng E2E, known risks; giữ lịch sử nguyên vẹn, không viết lại toàn bộ HANDOFF.

### P1 — test infrastructure tracked (chỉ khi owner đồng ý thêm dependency)

1. Đặt tests/config/fixtures vào source control, ví dụ `tests/e2e/`; không đặt runner release trong thư mục ignored artifact.
2. Thêm `@playwright/test` và browser install theo version lockfile; không dùng `@latest` trong command CI.
3. Tạo scripts có nghĩa rõ ràng, chỉ khi chúng chạy được:

   ```text
   test:e2e:local:readonly
   test:e2e:emulator
   test:e2e:staging
   test:e2e:prod:smoke
   test:e2e:prod:write-approved
   ```

4. `prod:write-approved` phải fail closed nếu thiếu `QA_TARGET=production`, `QA_ALLOW_WRITE=1`, approval ID, test account, prefix `QA_YYYYMMDD_` hoặc cleanup manifest.
5. Test write phải ghi mọi object tạo ra vào manifest; cleanup qua UI/API test environment được phép; re-query/xác minh sau cleanup. Không cleanup production bằng Admin SDK.

### P1 — security contract coverage

Mở rộng Rules/API contract tests theo từng collection/risk, tối thiểu:

- `adaptiveLessons`, `personalizationCache`, `adaptiveSessionProgress`, `studentLearningProfiles`
- `exams`, `savedExams`, `examSubmissions`
- `fallbackEvents`, `lessonSimulations`, `gradingSessions`, `externalTools`
- `userTemplates`, `userSettings`, `distributions`, `lessonPlans`, `duGio`

Mỗi collection phải có positive and negative cases: anonymous, owner, authenticated non-owner, public/shared scope, immutable fields, list/query constraint, create/update/delete. Không biến “intentional policy sentinel” trong `duGio.rules.test.ts` thành xanh giả; đọc comment và policy trước.

Kiểm thử security browser/API phải có negative assertions cho message bridge, XSS/SVG/sandbox, IDOR/cross-account access, cache poisoning và exam submission authorization. Đừng coi `postMessage('*')` hoặc thay đổi state là PASS nếu origin/source/schema chưa được kiểm đúng.

### P2 — module coverage matrix

Lập inventory từ code hiện tại, rồi viết matrix cho:

- Dashboard, Authentication/Settings, Classes
- Creator, Templates, Library/community sharing
- Testing, Exams, Grading, Chat, AI Tools
- Adaptive Lesson Builder + Student Portal
- Lesson Upgrade, Dự giờ Danielson
- File import/export: DOCX, PDF, PPTX, XLSX, SCORM

Mỗi module required có: smoke, happy path, failure path, reload/persistence, authorization/data isolation, console/network evidence, desktop + 390px, keyboard/focus. Với AI: no-key, invalid-key/quota, success path chỉ trong approved environment/budget.

Adaptive Portal phải được học thật theo vai học sinh: pre-test -> từng unit -> hint/answer -> iframe interactions -> điều hướng -> notebook -> exit ticket -> persistence. Không chỉ đếm DOM hay xác nhận iframe hiện ra.

Artifact export không chỉ xác nhận download. DOCX/PDF/PPTX/XLSX/SCORM cần mở/parse/render để kiểm văn bản, bảng, ảnh, công thức, page/slide count và layout.

### P2 — build/performance policy

- Chuẩn hóa: warning Vite >500 KB = warning; entry/runtime >1,000 KB = failed performance gate trừ khi owner chấp thuận baseline mới có lý do.
- Thêm đo/parse artifact build vào command hoặc CI để kết quả không phụ thuộc câu chữ trong HANDOFF.
- Báo riêng compile status với performance-gate status; build exit 0 không mặc nhiên là release PASS.

## 6. Tiêu chí nghiệm thu cho Claude Code

- [ ] Không thay đổi hoặc xóa thay đổi worktree có sẵn; diff chỉ chứa QA docs/tests/config được phê duyệt.
- [ ] `lint`, `lint:api`, `test`, `test:rules`, `build` chạy độc lập và có output thật trong báo cáo.
- [ ] Không còn `test:e2e` giả/hỏng; runner mới nếu có phải fail non-zero khi thiếu file, assertion fail, network/browser error hoặc cleanup fail.
- [ ] Test/browser mặc định không đụng Chrome profile cá nhân, production write, API key hay PII.
- [ ] Documentation có một command matrix hiện hành, không tham chiếu root script không tồn tại.
- [ ] Mọi E2E/write scenario có mode, target, approval, fixture prefix, artifact và cleanup proof.
- [ ] Báo cáo cuối có SHA, environment, actual test count, bundle result, PASS/FAIL/BLOCKED/NOT RUN, issue list và release verdict.
- [ ] Không claim `APPROVED` nếu security coverage, required E2E hoặc cleanup vẫn `BLOCKED/NOT RUN`.

## 7. Công việc nằm ngoài scope nhưng phải được nêu rõ

Các rủi ro sản phẩm trong `HANDOFF.md` (ví dụ Firestore public write/cache, private lesson list exposure, authorization endpoint/exam, message validation) không được âm thầm “đóng” chỉ bằng việc tạo checklist. Nếu xác minh còn tồn tại, tạo issue riêng với repro/emulator evidence; chỉ sửa app/rules sau khi owner cấp scope riêng.

## 8. Cách Claude Code báo lại

1. Liệt kê file thay đổi và vì sao từng file cần thay đổi.
2. Nêu quyết định nào bị BLOCKED vì thiếu staging, credential, API budget hoặc owner approval.
3. Đính kèm output các gate đã chạy; không dùng kết quả lịch sử.
4. Báo rõ test nào không được chạy và lý do, thay vì giả định PASS.
5. Dừng và xin xác nhận nếu task bắt đầu đụng production, dữ liệu thật, secret hoặc product security behavior.

