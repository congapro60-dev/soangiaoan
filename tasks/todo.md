# Triển khai Mật Mã Đa Giới

- [x] Mở nguồn đúng V7 và xác nhận checkout sạch.
- [x] Truy vết engine, API, D1, campaign, community và media hiện có.
- [x] Nhận plan read-only qua OpenCode CLI.
- [x] Cài dependencies pnpm từ lockfile, không đổi lockfile.
- [ ] Hoàn chỉnh phạm vi/contract và independent plan review.
- [x] Phase 1 branding/cốt truyện 12 map, generated visuals, media/accessibility contracts và runtime feedback đã triển khai; browser walkthrough/cross-review còn pending.
- [x] Phase 3 pure contracts: modes, recovery, room events và Ngũ Ấn arena; focused tests đã thêm.
- [ ] Recovery đề khó và đồng bộ/idempotency/events ở route/API production.
- [ ] Luật gameplay các chế độ, arena cổ trang và mini games ở route/API production.
- [ ] Tài khoản chủ hệ thống, host invite, quản lý từng phòng và audit.
- [ ] Teacher panels/reports/CSV theo các mode.
- [x] Phase 0 baseline: regression tests, build, typecheck và lint đã chạy; còn 335 lint warnings baseline, không có errors.
- [ ] Independent cross-review và sửa phát hiện.
- [ ] Publish đúng Site và nghiệm thu toàn bộ docs/mat-ma-da-gioi-scope.md.

## Trạng thái

Phase 1 cycle-1 repair và Phase 3 pure gameplay contracts đã được triển khai trong worktree, chưa commit/push. Phase 3 có `lib/game-modes.js`, `lib/recovery.js`, `lib/room-events.js`, `lib/arena.js` và test tập trung; chưa wire route/API/auth/host production. Các mode V7/scoring/regatta và dữ liệu hiện có không bị đổi. Chưa chạy gate cuối phiên: npm test/typecheck/build/lint, browser walkthrough và independent post-diff review vẫn pending.
