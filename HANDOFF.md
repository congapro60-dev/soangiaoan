# HANDOFF - signal-station-site (SmartPlan AI)

> Ảnh chụp trạng thái để bắt nhịp ngay. Lịch sử đầy đủ (R1-R18, v6-v26, V27-V30, V40, HKI, HKII, check chéo 01-02/11):
> - `docs/HANDOFF-ARCHIVE.md` (toàn bộ checkpoint trước 05/11/2026)
> - `tasks/archive/handoff-history-to-2026-10-23.md`, `tasks/archive/handoff-history-v27-v30-2026-10-25.md`

## Latest checkpoint - 5 GAME MỚI: ĐUA XE · RUNG CHUÔNG · GỠ BOM · NÔNG TRẠI · ĐẤU TRƯỜNG (06/11/2026)

**Branch**: `codex/universal-content-release` · Commit `f53a131c`. Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release`.

### Nguồn ý tưởng
Reel FB `2254623681763429` (Thầy Dũng Công Nghệ) quảng bá "Đường Đua Tri Thức" của dethiso.vn. Đã đọc comment, vào site, bóc danh mục 10 game từ bundle JS (trang game chặn khách). Ghi chú đầy đủ: `tasks/research-dethiso-games.md`.

### Đã thêm 5 luật vào Core Engine
Mỗi game là một rule trong `lib/mode-engine/rules/`, dùng chung hạ tầng: server-owned clock, request fingerprint, receipt chống replay, roster cố định, phân hoá cá nhân/cặp/nhóm.

| Luật | File | Cơ chế | Hành động Toán |
|---|---|---|---|
| `speedway` | `rules/speedway.js` | Đua xe 20 bước. Đúng +1 bước (combo ≥3 thì +2); sai −1 và mất chuỗi. Bứt phá +2 khi đủ chuỗi 3. | `accelerate` |
| `bellring` | `rules/bellring.js` | Loại trực tiếp: sai thì rời sàn; cứu 1 lần khi đã đúng 5 câu. Người cuối cùng trên sàn thắng. | `ring` |
| `bomb` | `rules/bomb.js` | Cắt 4 dây trước giờ. Đúng thì cắt 1 dây; sai thì không cắt và đồng hồ bị đẩy. Hết giờ chưa đủ dây thì nổ. | `cut` |
| `farm` | `rules/farm.js` | 5 giai đoạn cây. Đúng = 1 lượt tưới, 2 lượt lên 1 giai đoạn; 2 câu sai liên tiếp mất 1 nước. Chín thì thu hoạch. | `water` |
| `arena` | `rules/arena.js` | HP/MP/4 class/vật phẩm, trùm 9000 HP. Đúng hồi máu + gây sát thương; sai mất 100 máu; combo 3 tặng vật phẩm. | `attack` |

### Điểm đã nối
- `lib/mode-engine/index.js` + `lib/game-modes.js` + `lib/campaign.js`: đăng ký 14 luật.
- `lib/lesson/mode-bridge.js`: `defaultAction`, `choices`, `publicFields` cho cả 5 luật → dùng được trong tiết học, ăn điểm từ bài đã chấm.
- `lib/mode-engine/serialize.js`: public view có `track`, `bomb`, `farm`, `arena` (không lộ đáp án).
- `lib/rule-guide.js`, `lib/lesson/teacher-setup.js`, `components/lesson/LessonModePanel.tsx`, `components/lesson/TeacherLessonTools.tsx`: nhãn + hướng dẫn 3 dòng cho GV.
- `public/session-rules.js`, `public/game-setup.js`, `public/mode-classroom.js`, `public/app.js`: dropdown luật, nhãn hành động, tóm tắt tiến độ, xếp hạng.
- `public/mode-classroom.css`: bảng game riêng (làn đua, sàn thi đấu, dây bom, ô ruộng, thanh máu trùm), responsive 375 px, touch target ≥44 px.

### Kiểm chứng
- `npm test`: **1.507 PASS / 0 FAIL / 2 SKIP** (tăng 20 test mới).
- Test mới: `tests/mode-new-games.test.mjs` (13 case) + `tests/mode-classroom-boards.test.mjs` (7 case).
- `npm run build`: pass, 0 lỗi TypeScript.
- Sửa 2 lỗi thật phát hiện qua test: `bellring` chặn nhầm `rescue` khi đã rời sàn; `arena` cho phép tấn công khi đang gục.

### Khác biệt so với dethiso
Game của họ tách rời đề; ở đây cắm thẳng vào Concept của bài đang dạy, dùng hint 4 tầng và nhánh support/core/extension. Điểm chơi vẫn tách khỏi bằng chứng hộ chiếu.

### Còn mở
- Chưa kiểm trên trình duyệt thật / điện thoại thật.
- Chưa có nút chọn lớp nhân vật (warrior/mage/archer/tank) cho học sinh — hiện mặc định `warrior`.
- Nông trại chưa có cron theo ngày; hiện chạy trong một phiên.

## Checkpoint trước: HOTFIX V45: HẢI TRÌNH + TƯƠNG PHẢN BẢNG + PHÒNG TỰ ĐI (05/11/2026)

**Branch**: `codex/universal-content-release` · HEAD sau commit này (nối trên `03f67b7`, bản V44). Worktree: `C:\Users\ADMIN\.codex\worktrees\universal-content-release`.

### Nội dung
1. **Hải trình P1**: 70 task của 10 bài Toán 10 HKI có góc tam giác sai. Đỉnh C nằm giữa AB nên hai góc đáy luôn bằng nhau, không thể hiện góc 30° và 60°. `scripts/content/build-hki-g10.mjs` đặt C tại `(k/2, k·√3/2)` với A=(-k,0), B=(k,0), cho góc 30°/60°/90°. Đã dựng lại `content/lessons/hki-2026-g10.json` và `content/hki-2026-catalogue.json`.
2. **Tương phản bảng dữ liệu** (`components/lesson/DataVisual.tsx`): hàng thường có nền trắng, chữ `#0f172a` (17,85:1 theo source và SSR). Trước đó hàng trong suốt trên card tối, chỉ 1,22:1.
3. **Phòng tự đi bị giữ lớp** (`lib/lesson/self-pace.js`, `lib/lesson/runtime.js`): quest lớp ở chế độ tự đi không còn bắt buộc. `clearSelfPaceHolds` xóa cờ bắt buộc còn sót trong phòng mở từ V44. Nhánh chế độ GV không đổi.
4. **Sampler QA** (`qa-tools/engine-sample.mjs`): TICK gửi bằng actor hệ thống, đúng với `SYSTEM_COMMANDS`.

### Kiểm chứng
- Codex QA lần 1: FAIL (2 P1, 1 P2). Sửa xong, lần 2: **PASS 3/3**. Báo cáo: `C:\Users\ADMIN\.codex\sites-release\qa-v45-hotfix-fix2-20261105\REPORT.md`.
- Chạy lại trên bản QA: typecheck, `npm test` (1487 test: 1485 đạt, 0 lỗi, 2 bỏ qua có sẵn), build, verify:assets, sampler 25 và 807 gói đều exit 0. Sampler 807: 807/807 hoàn thành, 0 ép đóng, problems 0.
- **Chưa kiểm**: trình duyệt (tương phản đo thật, ảnh chụp, điện thoại), phòng học thật, chấm đúng/sai và chấm AI, lỗi console RSC prefetch.

### Phát hành
- Chủ máy duyệt phát hành 05/11/2026. Công cụ Sites chỉ có ở Codex, nên Codex thực hiện deploy.
- Rollback về V44 đang live: version `appgprj_6ac8d74b14f8819193caded9533bb337~appgver_360e9f00101481919bc9174dafed81ab`, deployment V44 `appgdep_6aeb8908470881918a4c3fae6ea16b61`. Audience public.
- Không có migration DB, không đổi env.
- Deploy lần 1 (11:25, `appgdep_6aec051c61a88191bc8acb45ce4a77ae`, version `appgprj_6ac8d74b14f8819193caded9533bb337~appgver_15e1d83985b48191a249998826298a6c`) bị rollback lúc 11:29, vì lệnh của Claude không tách tiêu chí phòng cũ và phòng mới. Chủ máy duyệt deploy lại bản đã lưu ngày 05/11.
- **Sắp cắn người sau**: phòng tạo trước V45 giữ gói cũ theo hash (`lib/lesson/service.js:223`), nên vẫn hiện hình Hải trình cũ. Muốn hình đúng phải mở phòng mới.

### Còn mở
- **Kết quả QA live lần deploy lại (FAIL, đã rollback về V44 lúc 13:48)**: hình Hải trình trên bài mới r060 vẽ góc 32,16° / 62,07° / 85,78°, không phải 30° / 60° / 90°. Nguyên nhân: `CoordinatePlane` (`components/lesson/DataVisual.tsx:430-434`) co trục X theo 8,44 px/đơn vị và trục Y theo 9,2 px/đơn vị. Dữ liệu tam giác đúng.
- Đã kiểm đạt: bảng dữ liệu 17,85:1 và không tràn ngang ở 375 px; phòng cũ giữ hình cũ và học sinh giả vào lại được. Chưa kiểm: quest 180 giây đầy đủ, lỗi console mới.
- **Đã deploy** (06/11): commit `f493085b` (tỷ lệ trục hình Hải trình, 97 hình), version 45 `appgver_c7040147fa108191881d629262310e97`, deployment `appgdep_6aed2a0c0cb4819188c6b70d748175c4`, bundle `index-XdWMLzzD.js`, env revision 3.
- **QA live** (báo cáo trong `sites-release/qa-live-scale-fix-20261106/REPORT.md`): hình r060 mới đúng, sai lệch 0,028°; phòng cũ vào lại và đi tiếp được; bảng 375 px đạt; console không có lỗi trong các luồng đã kiểm. Ba phòng test và các nháp đã vào Thùng rác.
- **Còn mở (P2)**: nút "Bỏ qua — không ảnh hưởng điểm" của sự kiện tùy chọn vẫn chặn tung xúc xắc bằng `CLASS_EVENT_ACTIVE` tối đa 180 giây. Chưa sửa; cần chủ máy quyết định.
- **Rollback về V44** nếu cần: `appgver_360e9f00101481919bc9174dafed81ab`.
- Chấm điểm (đúng/sai, mastery, chấm AI) và lỗi RSC prefetch: ngoài bản này, chưa sửa.

### Lệnh nghiệm thu
```powershell
node --test tests/hai-trinh-geometry.test.mjs tests/dataTable-contrast.test.mjs tests/lesson-self-class-quest.test.mjs
npm --prefix "C:\Users\ADMIN\.codex\worktrees\universal-content-release" run build
```

## Checkpoint trước: V44 (04/11/2026)
- Gameplay và visual V8.8 toàn năm: 807 bài, 11.241 task, 714 visual; test 1.470 PASS; archive `release-20261104-v44.tar.gz`. Đã lên site 05/11 (deployment `appgdep_6aeb8908470881918a4c3fae6ea16b61`).
- Nội dung đầy đủ đã chuyển sang `docs/HANDOFF-ARCHIVE.md`, mục "Lưu trữ 04/11/2026".
