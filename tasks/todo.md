# Todo — hiện trạng 27/10/2026

## v33 — chờ Codex deploy (không code thêm)

- [x] Fix P1 (assessment-ai, runtime, TaskInput) + responsive luồng HS
- [x] Verify: tsc 0 lỗi, build pass, 12 đo sw=iw ở 375/390/430, 0 console error
- [x] HANDOFF.md record V33 + archive V27–V30
- [x] Prompt Codex: `tasks/codex-prompt-v33.md` (10 file commit, build-site.mjs, archive mới `release-20261027-v33.tar.gz`)
- [x] Codex chạy deploy → version 33 · appgdep_6adff81976e88191b1a0fc91de31646a · commit 1e93e92
- [x] Kiểm độc lập sau deploy: chunk + CSS live khớp SHA256 archive (46DC675C… / C8F8BCA1…), đã ghi chú vào HANDOFF record V33
- [ ] Nợ QA v32 còn lại sau deploy (tasks/qa-v32-realpath-20261026/REPORT.md): touch thật (Việc 2), RSC (Việc 3), số dư (Việc 4), dọn fixture C0DDB7 + nháp .2350 vào Trash (Việc 5). P1/P2 của report đã được v33 sửa.
- [x] P1 chuông đóng sớm — ĐÃ SỬA (27/10): guard `questInteractionPending` đồng nhất ở 4 điểm close (`runtime.js` prologue 713 + 3 postlude ANSWER/PICK/BUZZ) + helper mới `self-pace.js`. Test hồi quy 2 HS bấm chuông → HS sau vẫn nhận nhiệm vụ (38/38 file api-integration). Phát hiện thêm: prologue 713 là đường close thứ 4 mà REPORT chưa nêu.
- [x] 5 test luyện lại — ĐÃ CẬP NHẬT theo flow V28 (13/13 file revisit): nộp = hoàn thành (`submitted`/`comment_pending`), GV ASSESS → `INVALID_ASSESSMENT`, bằng chứng chỉ tính khi `assessed` (công tắc A bật trong test 198), giữ khẳng định đóng băng đề/không thưởng/cách ly view/phát hiện giả mạo.
- [x] 17 test mock UI — subagent đã sửa (17/17 PASS, 9 file test, +37/−8 dòng, không đụng production; chi tiết `tasks/qa-v33-failures-20261027/MOCK-FIXES.md`; đính chính: 2 test task-input-* là thiếu QUICK_CHIPS, không phải VM loader).

## v34 — "Mã lực mua quyền chọn" (spec đã chốt với user 27/10/2026)

> Quyết định user: phương án C thay xúc xắc ở chế độ chiến dịch; mã lực = điểm hiện có;
> khởi hành 240đ/đội; giá 30đ mỗi bước tự chọn; xúc xắc + 7 skill giữ nguyên ở chế độ thi đua.
> Bối cảnh: `lib/race.js` (STATIONS=[0,8,16,24,32], EVENT_CELLS=[4,10,14,20,26,30], túi số seeded,
> skill boost/double đọc từ `effects.history`); điểm chiến dịch: nhiệm vụ +100, bonus +40, ô sự kiện +40
> (~800–1000đ tối đa/đội); shop client `public/app.js` (skillCosts 20–70).

### Phase A — Server (làm trước)

- [x] A1. Thêm skill `choose` ("Tự chọn bước"): mua k bước (1–6) tốn `30*k`, ghi `effects.history` `{kind:'choose', steps:k, cost:30k}`.
  - Ghi qua row `skill_actions` (kind='choose', cost=30k, target_id=actor_id) → `effects.history`/wallet/spent tự tính lại; INSERT đặt CUỐI batch với guard revision mới + score DB.
- [x] A2. Grant khởi hành: khi khởi tạo race ở campaign mode, `s.score += 240` + event `start-grant` (240đ = đúng 8 bước tới trạm đầu ô 8).
  - Trong `initRace` (early-return nên idempotent); reset-room grant lại (test reset expect 240).
- [x] A3. Hành động di chuyển mới (thay `roll` trong campaign): validate 1–6, trừ điểm, di chuyển theo đúng logic roll hiện tại (túi số/bỏ qua khi dùng choose; tái dùng code di chuyển, không nhân bản).
  - Pure `choose(s,steps,now)` + `advance()` tách từ roll; choose không rút túi, không extra-die, không cooldown 6s, vẫn hưởng boost-carry; action 'choose' ở route.
- [x] A4. Chặn `roll` ở campaign mode (thi đua giữ nguyên); ẩn/vô hiệu `double` trong campaign.
  - Guard route `CAMPAIGN_ROLL_LOCKED` (ngoại lệ pact-pass individual pending); `CAMPAIGN_DOUBLE_LOCKED` trong skill handler.
- [x] A5. Verify server: unit test giá (30k), grant 240, chặn roll, di chuyển đúng vị trí + carry.
  - `tests/race-choose.test.mjs` 7/7; full suite 1424/1424 PASS; typecheck 0 lỗi; build OK (27/10/2026).

### Phase B — Client (public/app.js + style.css)

- [x] B1. Race console: thay nút "Lăn xúc xắc" bằng panel chọn bước 1–6, hiện giá từng mức + mã lực hiện có; đủ điểm mới bật nút. → 27/10: `stepBuyPanel()` + nhánh bonusPanel (campaign không nợ giao kèo → panel bước; individual nợ giao kèo → giữ nút roll trả nợ, 6s cadence); dispatch `case 'choose'`; toast "Mua N bước · Ô X → Y"; `updateRaceClock` khóa nút theo busy/freeze/lượt/giá. Sửa 13: `refresh()` render lại khi `state.score` đổi (text ví/dice stale khi server tự đổi điểm).
- [x] B2. Shop: thêm "Tự chọn bước"; ẩn "Xúc xắc kép" trong campaign; cập nhật skillNames/skillCosts. → 27/10: card note `.skill-note` "Tự chọn bước · 30 điểm/bước" (không nút mua — server không có SKILLS.choose); campaign ẩn card `double`, giữ `time`/`boost` (đều hợp lệ: boost cộng carry lần mua kế); smoke browser xác nhận.
- [x] B3. Rules dialog + briefing: mô tả luật mới (mã lực, khởi hành 240đ, 30đ/bước, dừng chân chờ GV khi hết mã lực). → 27/10: 3 fragment raceRules, mapTurnText, turnHistory, raceHistory (`choose`/`start-grant`, "N lượt đã mua").
- [x] B4. Màn "hết mã lực": thông báo rõ ràng cho HS + trạng thái nhìn thấy trên dashboard GV. → 27/10 smoke score=20: 6 nút disabled, helper "Đã hết mã lực…", dice + console + panel đều "20 điểm mã lực" (nhờ Sửa 13).

### Phase B — Smoke browser (mock server route VM + public thật, 27/10)

- [x] S1. Mua 3 bước: Ô 0→3, −90đ (340→250), toast + lịch sử "1 lượt đã mua · Ô 3/32" + "Mã lực khởi hành · +240 điểm".
- [x] S2. Câu Toán thưởng mở → panel bước ẩn đúng luật (`ready()`); trả đúng đỉnh x²−8x+20=4 → reward points +60 (250→310) → panel bước quay lại.
- [x] S3. Mua 6: Ô 3→8 · "Giữ 1 bước dư · Gió thuận · −30 giây xếp hạng" → tới trạm, console ẩn đúng, màn chọn nhiệm vụ.
- [x] S4. Hết mã lực (score=20): 6 nút disabled + helper đổi + mọi chỗ hiển thị 20 điểm (sau Sửa 13).
- [ ] S5. Screenshot + responsive 375/390/430: chưa chụp được — browser.screenshot cần cửa sổ desktop visible (đang ẩn), chrome-devtools bị lock profile. DOM/CSS assertions đã pass; chụp bù khi browser visible.

### Phase C — Kiểm chứng

- [x] C1. `npm run build` + tsc 0 lỗi; test cũ không hồi quy (23 fail đã phân tích trong tasks/qa-v33-failures-20261027/REPORT.md — P1 chuông phải sửa trước, 17 mock là nợ hạ tầng test). → 27/10: full suite **1417/1417 PASS** (gồm test hồi quy chuông mới), tsc 0 lỗi, build pass. Sau Sửa 13: 27/27 test UI tĩnh + `node --check` + build lại OK.
- [x] C2. QA: phòng campaign thật, HS mua bước → di chuyển → giải nhiệm vụ +100đ → mua tiếp; hết mã lực dừng đúng chỗ. → 27/10: thay puppeteer bằng mock server (route VM thật như tests + static public/, port 3100, `/qa-ctrl` ép state); S1–S4 pass (S5 screenshot còn nợ môi trường).
- [ ] C3. Verify responsive 375/390/430 — gộp vào S5 khi browser visible (CSS mới chỉ có media 480px cho `.step-options` 3 cột + `.skill-note`).
- [x] C3b. QA Codex single-source (claude lane chết — OAuth hết hạn; chỉ Codex chạy). Verdict: CẦN SỬA mục 1, 3, 8; mục 11 verify bị sandbox EPERM (`lstat C:\Users\ADMIN\.codex` — lỗi môi trường, không phải sản phẩm). Đã xác minh độc lập cả 3 (đều đúng) rồi sửa:
  - Mục 1 race trừ điểm: `lib/race.js` `choose()` nhúng `rid` vào event di chuyển; `route.js` chooseInsert thêm `EXISTS(json_each…'$.rid')` — INSERT chỉ commit khi chính lượt di chuyển đã ghi. Test Fix 1a/1b: revision bị skill mua chiếm đồng thời → UPDATE 0 + INSERT 0 changes, không mất điểm.
  - Mục 3 né giao kèo: guard `PACT_DEBT` 409 ở route.js khối choose (individual, promised>paid) — chỉ `roll()` thanh toán. Test Fix 3 (route VM thật): choose → 409 PACT_DEBT, không di chuyển/không trừ → roll skip trả nợ → choose 200 cost 60.
  - Mục 8 text sai: fragment "Kỹ năng di chuyển" tách theo chế độ — campaign bỏ "Xúc xắc kép 70 điểm", duel giữ nguyên text cũ. Test Fix 8 tĩnh.
  - Verify mục 11 chạy lại bên ngoài sandbox: `node --check` sạch; test hồi quy 11/11 pass; full suite **1456 pass / 1 fail** — fail duy nhất `exam-service.test.mjs:1181` flaky concurrency, chạy riêng 84/84 pass, ngoài phạm vi v34; `npm run build` pass.
- [x] C3c. QA Codex dot 2 tổng thể 1 thể (27/10): Fix A/B/C xác nhận ĐÚNG GỐC, không lỗ hổng mới; R1–R4 (json_each/D1, playMode lạ, template literal, rid fail-closed) đều SẠCH. Verdict CẦN SỬA mục 8 với 2 hồi quy P2 — đã xác minh độc lập (đều đúng) rồi sửa:
  - P2-1 `result()` app.js:598 — exclusion list thiếu `choose`/`start-grant` → nhật ký kết quả gán nhầm "Đã mở cửa thoát", cost (điểm) bị format thời gian. Đã thêm vào list (raceHistory đã render riêng).
  - P2-2 `teamDetail()` app.js:610 — tìm thời điểm đến cổng chỉ khớp event `roll` → campaign mất dòng "Thời gian giải" trạm sau xuất phát. Đã nhận cả `choose` (an toàn: roll trả nợ chỉ push `pact-pass`, không tạo event `roll` có `to`).
  - Kèm siết test Fix 8 (delimiter `'</li>` → `}</li>` — cũ trả -1 khiến slice duel quá rộng) + 2 test hồi quy mới. race-choose **13/13**; full suite **1459/1459 PASS, 0 fail** (flaky exam-service pass luôn lần này); `node --check` sạch; build pass. Git status trước/sau QA dot 2 giống hệt — Codex không sửa gì.
- [x] C4a. Reward 'dice' ở campaign — user quyết **ĐỔI** (27/10): chọn dice ở chiến dịch được cộng **100 điểm mã lực** (tương đương ~3.3 bước mua, sát giá trị viên xúc xắc thêm ~3.5 bước); duel giữ nguyên extraDice. Sửa 3 chỗ: `route.js` (nhánh campaign + event ghi `points: 100`), `bonusPanel` (campaign: "Nhận 100 điểm mã lực"), `raceHistory` (label theo chế độ). +2 test hồi quy → race-choose **15/15**; full suite **1432/1432 PASS, 0 fail**; `node --check` sạch; build pass. Đối chiếu thêm: skill `double` đã bị shop ẩn sẵn ở campaign — không còn lựa chọn vô hiệu nào.
- [ ] C4. HANDOFF.md record v34 + prompt Codex deploy. → Prompt deploy đã soạn (`tasks/codex-prompt-v34.md`): commit + archive `release-20261027-v34.tar.gz` + deploy; chờ chạy Codex.
