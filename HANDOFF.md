# HANDOFF - signal-station-site (SmartPlan AI)

> Ảnh chụp trạng thái để bắt nhịp ngay. Lịch sử đầy đủ (R1-R18, v6-v26, V27-V30, V40, HKI, HKII, check chéo 01-02/11):
> - `docs/HANDOFF-ARCHIVE.md` (toàn bộ checkpoint trước 05/11/2026)
> - `tasks/archive/handoff-history-to-2026-10-23.md`, `tasks/archive/handoff-history-v27-v30-2026-10-25.md`

## Latest checkpoint - HOTFIX V45: HẢI TRÌNH + TƯƠNG PHẢN BẢNG + PHÒNG TỰ ĐI (05/11/2026)

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
- Codex live QA bằng học sinh giả: hình Hải trình ở phòng mới, phòng tự đi, màu bảng trên trình duyệt, màn hình 375 px.
- Chấm điểm (đúng/sai, mastery, chấm AI) và lỗi RSC prefetch: ngoài bản này, chưa sửa.

### Lệnh nghiệm thu
```powershell
node --test tests/hai-trinh-geometry.test.mjs tests/dataTable-contrast.test.mjs tests/lesson-self-class-quest.test.mjs
npm --prefix "C:\Users\ADMIN\.codex\worktrees\universal-content-release" run build
```

## Checkpoint trước: V44 (04/11/2026)
- Gameplay và visual V8.8 toàn năm: 807 bài, 11.241 task, 714 visual; test 1.470 PASS; archive `release-20261104-v44.tar.gz`. Đã lên site 05/11 (deployment `appgdep_6aeb8908470881918a4c3fae6ea16b61`).
- Nội dung đầy đủ đã chuyển sang `docs/HANDOFF-ARCHIVE.md`, mục "Lưu trữ 04/11/2026".
