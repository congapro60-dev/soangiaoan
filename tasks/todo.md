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
- [x] C4. HANDOFF.md record v34 + prompt Codex deploy + deploy + kiểm độc lập (27/10). → Commit `9aea0a1` đã push; archive `release-20261027-v34.tar.gz` (49.442.961 B). Deploy thành công qua vòng retry 429 (Codex, lần thử 2): version **34**, deployment_id `appgdep_6ae096897df88191b16636da5b042ec2`, status succeeded, live https://mat-ma-da-gioi.cuong-vuviet.chatgpt.site . Kiểm độc lập OpenCode sau deploy: SHA256 live khớp archive cả 3 file (app.js 198.962 B `E0765F11…`, style.css 62.854 B `1FB3A67F…`, chunk 66.522 B `46DC675C…`), root HTTP 200, marker "Nhận 100 điểm mã lực" + CSS v34 hiện diện — bằng chứng `C:\Users\ADMIN\.codex\sites-release\v34-live-verification.json`. HANDOFF record V34 có ghi chú kiểm độc lập (chưa commit — đúng quy trình v33).

## v35 — sửa 3 FAIL QA live v34 (27/10/2026, ĐÃ deploy)

- [x] F1 điểm HS stale sau mua kỹ năng: `buySkill` (app.js) thêm `render()` sau `apply(d)`. Gốc rễ: handler chỉ apply + `updateClock()` (khóa nút theo score mới) → text cũ; `raceAction` đã làm đúng chuẩn này.
- [x] F2 GV thiếu trạng thái hết mã lực: `teamDetail` thêm `noMana = !finished && r.race?.campaign && (r.score || 0) < 30` → nhãn " · Hết mã lực" ở cả summary + body; kèm travel notice mode-aware ("Chờ lượt di chuyển hoặc xử lý sự kiện" ở campaign).
- [x] F3 chữ "xúc xắc" sót ở campaign (4 chỗ): nút cổng thoát → "Trở lại bản đồ · Chọn bước di chuyển"; reward giữ bước → "lượt di chuyển tiếp theo"; rules "Chọn thưởng" → campaign là "nhận 100 điểm mã lực" thay viên xúc xắc; helper hết mã lực thêm "giao kèo (+40 điểm, tối đa 2/ván)" (pact `delay` = +40, route.js:943, tối đa 2/ván).
- [x] Test hồi quy F1–F3 trong `race-choose.test.mjs` (pattern region như C4, escape `\${` cho needle chứa template literal): race-choose 18/18; full suite **1435/1435 PASS, 0 fail**; `node --check` sạch; `npm run build` pass.
- [x] Deploy v35 qua Codex (MCP Sites): chặn PTY (`WindowsApps\pwsh.exe` alias — ConPTY Access denied) → fix shim `pwsh.exe` (copy powershell.exe) prepend PATH. Commit `f73d029` (7 file) + push + archive `release-20261027-v35.tar.gz` (49.443.174 B) bởi Codex; native deploy thành công: **version 35**, deployment `appgdep_6ae0bbc0175c8191862d2eea418c8864`, HANDOFF → "DA PHAT HANH".
- [x] Kiểm độc lập sau deploy: root HTTP 200; **18/18 asset SHA256 live↔archive MATCH** (app.js 199.513 B, style.css, 15 chunk/css); marker F1–F3 trên live app.js: "Hết mã lực" ×4, "Chọn bước di chuyển" ×1, "lượt di chuyển" ×15, "điểm mã lực" ×6, "giao kèo"/"+40" ×9, `apply(d); render()` ×2.
- [x] WIP chờ v36: `tasks/lessons.md` (bài học PTY + bài học không đụng file khi Codex chạy), `HANDOFF.md` (record V35 đã điền), `tasks/codex-prompt-v35-resume.md` — commit cùng đợt sau.

## v36 — vá nốt F3 sót sau v35 (27/10/2026) ✅ DA PHAT HANH

- [x] Phát hiện sau khi soi 16 chỗ "xúc xắc" trên live v35: F3 sửa 4 chỗ nhưng còn **3 chỗ lọt được vào campaign**.
- [x] F3b-1 tooltip ô bản đồ (`terrainInfo`): nhánh cuối `'Lăn xúc xắc khi đến lượt...'` → thêm `m.campaign ? 'Chọn bước di chuyển khi đến lượt...'`. Reachable: action `map-spot` (click pin) chạy mọi mode; ô thường không khớp nhánh `cells`/mốc sự kiện trước đó.
- [x] F3b-2 nút lăn fallback (`bonusPanel`): `'Lăn xúc xắc'` → `${r.campaign ? 'Chọn bước di chuyển' : 'Lăn xúc xắc'}`. Reachable: `individual + promisedPasses > paidPasses` không vào `stepBuyPanel`.
- [x] F3b-3 nhãn đồng hồ lượt (`updateRaceClock`, 2 chỗ): thêm nhánh campaign "Chọn bước di chuyển · …" cho cả `individual` và `team`. Reachable khi campaign không có `.step-option`.
- [x] Test hồi quy F3b trong `race-choose.test.mjs` (kiểm 4 needle theo region terrainInfo/bonusPanel/updateRaceClock): **19/19**; full suite **1436/1436 PASS, 0 fail**; `node --check` sạch; `npm run build` pass.
- [x] Deploy v36 qua Codex + kiểm độc lập SHA256 live↔archive: version 36, deployment `appgdep_6ae12290bea08191bd18e355da0b19d7`, commit `1cf10c7f64d76e1dbf3d29cb4c121fff101b12a0`, archive 49.442.863 B, 5 marker "Chọn bước di chuyển" trên live.

## v37 — mở luật theo lớp + điều khiển lớp thời gian thực (28/10/2026)

- [x] Tư vấn 10 ý tưởng (kỹ thuật + UI/UX/luật chơi/học tập); user chọn "đi thẳng #1 + #5".
- [x] #1 Progressive disclosure: shop kỹ năng + giao kèo chỉ hiện sau khi giải xong cổng xuất phát (server đã khóa sẵn, chỉ thêm lớp trình bày).
- [x] #5 Teacher console: action `teacher-console` (freeze-all 20s qua events `ice`, broadcast qua `race.classNotice`, grant 10–200đ có event `teacher-grant`); phân quyền `game-action`; UI `classConsole()` trên board GV; banner `map-notice` trên bản đồ cả HS lẫn GV.
- [x] Test: `tests/teacher-console.test.mjs` 5/5 (VM harness route thật + needle client); build pass.
- [x] Gộp đợt với v38 theo quyết định user "phương án 2" — cùng archive deploy.

## v42 — chặn vào muộn + luồng khán giả (29/10/2026)

- [x] Công tắc trên board GV: Mo / Chan vào muộn, lưu config.lateJoin.
- [x] HS vào muộn khi CHẶN → khán giả (spectator=true, status=spectator); không chơi được (403 SPECTATOR); client banner + bản đồ xem.
- [x] HS vào muộn khi MỞ → chơi bình thường (giữ nguyên hành vi cũ).
- [x] Test: v42 **4/4**; full suite **1465/1465 PASS, 0 fail**; build pass.
- [ ] Deploy v42 qua Codex + kiểm độc lập.

## v41 — ma trận SGK đầy đủ + thời lượng tùy chọn + AI focus (29/10/2026)

- [x] +44 bài mới theo SGK KNTT (10: 17, 11: 14, 12: 13) — tổng 88 topics; fallback generator cho bài mới; sửa lỗi undefined prose ở mọi context.
- [x] durationMinutes (10–60 phút) trong campaign config; roomDuration + G.expire theo phòng; UI select; 13 chỗ 30 phút động.
- [x] AI focus: ô Trọng tâm bài học → prompt AI chỉ sinh đúng bài.
- [x] Test: v41 7/7; full suite 1461/1461 PASS, 0 fail; build pass; QA scripts (check-matrix-coverage, find-undefined).
- [ ] Deploy v41 qua Codex + kiểm độc lập.

## v40 — nén ảnh + tổng kết tiết (29/10/2026)

- [x] Nén 3 PNG nặng → WebP bằng ffmpeg (giảm 78–92%, giữ nguyên pixel); cập nhật style.css/campaign-data/product-content/campaign THEMES/LessonThemedRoute; xóa PNG cũ.
- [x] Tổng kết tiết: eviewTopics phân loại outcomes (từ bỏ / không gặp / chưa tới) theo chủ đề trạm; lessonSummary trên board GV; CSV thêm 2 cột.
- [x] Test: 	ests/v40-summary-assets.test.mjs **3/3**; full suite **1454/1454 PASS, 0 fail**; build pass.
- [ ] Deploy v40 qua Codex + kiểm độc lập (webp render + marker tổng kết).

## v39 — telemetry lỗi + đồng hồ tiết + chế độ TV (28/10/2026)

- [x] Telemetry lỗi production: client bắt `error`/`unhandledrejection` → `client-error` (không auth, dedupe, ≤10/phiên); server log + ring 30 trong `system_settings`, fail-soft.
- [x] Đồng hồ tiết học trên board GV: phút còn lại, vị trí trung bình, dự đoán "chốt bài ở trạm nào".
- [x] Chế độ TV: nút trên board GV, chữ to, ẩn hồ sơ dày, lưu localStorage; helper an toàn cho DOM mock.
- [x] Test: `tests/v39-teacher-tools.test.mjs` **2/2**; full suite **1451/1451 PASS, 0 fail**; build pass; smoke local **7/7**; browser 0 console error.
- [ ] Deploy v39 qua Codex + kiểm độc lập.

## v38 — ngân hàng câu hỏi AI theo ma trận (28/10/2026)

- [x] `lib/ai-question-bank.js`: validate candidate theo ma trận (topic/level/độ dài/đáp án số), merge + cap 60, pick theo slot (ưu tiên đúng mức, né đã dùng, bỏ slot mcq/tf).
- [x] Route: `ai-question-generate` (gọi AI qua `aiConfigFor` fail-soft, prompt JSON theo ma trận) + `ai-question-save` (GV duyệt → json_set `$.aiBank`, guard revision); chặn sau begin (409).
- [x] `queueMath` ưu tiên câu AI, fallback bộ câu sẵn có; `campaignPublic` strip `aiBank`; team refresh campaign từ room (3 chỗ).
- [x] UI GV: `aiBankPanel()` trước begin — sinh, duyệt từng câu, sửa đáp án, lưu; hiển thị trạng thái kết nối AI.
- [x] Test: `tests/ai-question-bank.test.mjs` **8/8**; full suite **1449/1449 PASS, 0 fail**; build pass.
- [x] Deploy gộp v37+v38: **live đã có đủ code** (deployment `appgdep_6ae1c323ca20819196865ece9e0deba5`, source commit `5f76087`, archive 49.447.181 B; marker live: `data-console`, `shop-locked`, `aiBankPanel`, `ai-generate` + 3 block CSS). Số version site giữ 37 do commit 5f76087 đã được saveSource từ attempt đầu; commit hồ sơ này sẽ đưa lên **38**.
