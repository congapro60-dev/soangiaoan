# Báo cáo sửa 5 lesson web Ban Toán

Phạm vi: sửa dữ liệu trong worktree `codex/fix-five-web-lessons`, không ghi production, không push/deploy.

| Lesson | Lỗi đã xác nhận | Thay đổi | Bằng chứng | Regression test | Commit |
|---|---|---|---|---|---|
| `10-14-110` | Nội dung web dạy chứng minh vuông góc, lệch khỏi mạch tự chọn tích vô hướng/góc/độ dài tổng vectơ đã kiểm trong core. | Đồng bộ spec với `src/lib/lessonCore/cores/g10-p110.json`; giữ cấu trúc V4, bổ sung `level` cho item chuyển từ core; cập nhật catalog và baseline hash. | PPCT tuần 14, `tasks/ke-hoach-ppct-tuan14.md:25`; core chuẩn `g10-p110`. | `tests/lesson1014110Correction.test.ts` — 2 tests pass. | `fa97a78` |
| `10-16-122` | Bài ôn HK1 lại dạy hàm bậc hai/parabol; thiếu hệ bất phương trình và tối ưu nguyên. | Thay bằng hệ `12x+20y≤240`, `x≥2y`, cận `y≤5`, phương án đạt `(10;5)`, `(11;5)`; cập nhật catalog và baseline hash. | QA P122 (`qa_artifacts/P122_review_20261104/` theo hồ sơ giao việc); PPCT tuần 16 trong snapshot. | `tests/lesson1016122Correction.test.ts` — 2 tests pass. | `603124f` |
| `10-17-128` | PPCT ghi phương trình quy về bậc hai nhưng lesson cũ chứa mạch phương trình chứa căn; nội dung không đúng bản ôn đã kiểm. | Chuyển sang mệnh đề, tập hợp, giao-hiệu khoảng và điều kiện tham số; kiểm lượng từ, `A∩B`, `A\\B`, `C_m⊆(-1;4)`. | PPCT tuần 17, `tasks/ke-hoach-ppct-tuan17.md:18`; QA P128 (`qa_artifacts/P128_review_20261104/` theo hồ sơ giao việc). | `tests/lesson1017128Correction.test.ts` — 2 tests pass. | `0546feb` |
| `10-17-129` | PPCT ghi dấu tam thức/bất phương trình bậc hai; lesson cũ không đúng mạch ôn và thiếu kiểm đủ ràng buộc miền nghiệm. | Đồng bộ với core chuẩn `src/lib/lessonCore/cores/g10-p129.json`: miền nghiệm, tối ưu trên đỉnh khả thi, điều kiện nguyên, phương án đạt; cập nhật catalog và baseline hash. | PPCT tuần 17, `tasks/ke-hoach-ppct-tuan17.md:19`; core chuẩn `g10-p129`. | `tests/lesson1017129Correction.test.ts` — 2 tests pass. | `f0812f8` |
| `12-18-131` | Lesson chứa mặt phẳng, mặt cầu và tích có hướng, là mạch HK2; không khớp ôn HK1 Oxyz. | Dùng mạch HK1 từ `12-17-124`, giữ vectơ, tọa độ Oxyz, tích vô hướng, khoảng cách, trung điểm; thay quick checks để loại mạch HK2; cập nhật catalog và baseline hash. | PPCT tuần 18, `tasks/ke-hoach-ppct-tuan18.md:39`; đối chiếu spec HK1 `12-17-124` trong snapshot. | `tests/lesson1218131Correction.test.ts` — 2 tests pass. | `4598479` |

## Kiểm thử

- Affected tests: `nang .\node_modules\.bin\vitest.cmd run tests/lesson1014110Correction.test.ts tests/lesson1016122Correction.test.ts tests/lesson1017128Correction.test.ts tests/lesson1017129Correction.test.ts tests/lesson1218131Correction.test.ts`
- Kết quả đã kiểm chứng trước khi chốt: 5 test files, 10 tests pass, exit code `0`.
- Baseline guard đã chạy cùng từng lesson: `src/lib/liveLesson/v4/lessonAdapter.baseline.test.ts`, 5 tests pass ở mỗi bước.
- Full `nang npx vitest run`: đã chạy, exit code `1` (`469` files pass, `3` files fail, `5741` tests total, `5` failed). Một failure là hash snapshot `banToan-w11-batch2` do 5 lesson này thay đổi có chủ đích; đã cập nhật guard tại `src/lib/lessonCore/adapters/toInteractiveSpec.test.ts` trong commit `f113e1c` và chạy lại affected set `7 files / 31 tests`, exit code `0`. Bốn failure còn lại thuộc hash contract/fixture V8.3.2 ngoài scope.
- `nang npm run lint`: exit code `0`.
- `nang npm run build`: exit code `0`; Vite có cảnh báo chunk lớn đã tồn tại, không phải lỗi build.

## Republish

Các commit chỉ sửa repository. Cần chủ sở hữu duyệt nội dung rồi mới republish 5 lesson lên production. Không có production write trong task này.

Ghi chú: lesson `12-5-26` là sửa trước đó, đã nằm trong commit `d4e3b41`; không thuộc 5 commit của báo cáo này.
