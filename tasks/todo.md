# Todo — hiện trạng 27/10/2026

## v33 — chờ Codex deploy (không code thêm)

- [x] Fix P1 (assessment-ai, runtime, TaskInput) + responsive luồng HS
- [x] Verify: tsc 0 lỗi, build pass, 12 đo sw=iw ở 375/390/430, 0 console error
- [x] HANDOFF.md record V33 + archive V27–V30
- [x] Prompt Codex: `tasks/codex-prompt-v33.md` (10 file commit, build-site.mjs, archive mới `release-20261027-v33.tar.gz`)
- [ ] Codex chạy deploy → báo version_number / deployment_id / commit_sha
- [ ] Kiểm độc lập sau deploy: tải chunk live, đối chiếu SHA256 với archive, cập nhật HANDOFF.md
- [ ] Nợ QA v32 còn lại sau deploy (tasks/qa-v32-realpath-20261026/REPORT.md): touch thật (Việc 2), RSC (Việc 3), số dư (Việc 4), dọn fixture C0DDB7 + nháp .2350 vào Trash (Việc 5). P1/P2 của report đã được v33 sửa.

## v34 — "Mã lực mua quyền chọn" (spec đã chốt với user 27/10/2026)

> Quyết định user: phương án C thay xúc xắc ở chế độ chiến dịch; mã lực = điểm hiện có;
> khởi hành 240đ/đội; giá 30đ mỗi bước tự chọn; xúc xắc + 7 skill giữ nguyên ở chế độ thi đua.
> Bối cảnh: `lib/race.js` (STATIONS=[0,8,16,24,32], EVENT_CELLS=[4,10,14,20,26,30], túi số seeded,
> skill boost/double đọc từ `effects.history`); điểm chiến dịch: nhiệm vụ +100, bonus +40, ô sự kiện +40
> (~800–1000đ tối đa/đội); shop client `public/app.js` (skillCosts 20–70).

### Phase A — Server (làm trước)

- [ ] A1. Thêm skill `choose` ("Tự chọn bước"): mua k bước (1–6) tốn `30*k`, ghi `effects.history` `{kind:'choose', steps:k, cost:30k}`.
- [ ] A2. Grant khởi hành: khi khởi tạo race ở campaign mode, `s.score += 240` + event `start-grant` (240đ = đúng 8 bước tới trạm đầu ô 8).
- [ ] A3. Hành động di chuyển mới (thay `roll` trong campaign): validate 1–6, trừ điểm, di chuyển theo đúng logic roll hiện tại (túi số/bỏ qua khi dùng choose; tái dùng code di chuyển, không nhân bản).
- [ ] A4. Chặn `roll` ở campaign mode (thi đua giữ nguyên); ẩn/vô hiệu `double` trong campaign.
- [ ] A5. Verify server: unit test giá (30k), grant 240, chặn roll, di chuyển đúng vị trí + carry.

### Phase B — Client (public/app.js + style.css)

- [ ] B1. Race console: thay nút "Lăn xúc xắc" bằng panel chọn bước 1–6, hiện giá từng mức + mã lực hiện có; đủ điểm mới bật nút.
- [ ] B2. Shop: thêm "Tự chọn bước"; ẩn "Xúc xắc kép" trong campaign; cập nhật skillNames/skillCosts.
- [ ] B3. Rules dialog + briefing: mô tả luật mới (mã lực, khởi hành 240đ, 30đ/bước, dừng chân chờ GV khi hết mã lực).
- [ ] B4. Màn "hết mã lực": thông báo rõ ràng cho HS + trạng thái nhìn thấy trên dashboard GV.

### Phase C — Kiểm chứng

- [ ] C1. `npm run build` + tsc 0 lỗi; test cũ không hồi quy (23 fail nợ v32 không tính).
- [ ] C2. QA puppeteer: phòng mới, HS mua bước → di chuyển → giải nhiệm vụ +100đ → mua tiếp; đội hết mã lực dừng đúng chỗ.
- [ ] C3. Verify responsive 375/390/430 bằng script `Temp\opencode\v33-verify.mjs` (đổi chuỗi join cho luật mới).
- [ ] C4. HANDOFF.md record v34 + prompt Codex deploy (không đóng gói trước khi v33 lên live).
