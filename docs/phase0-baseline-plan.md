# Phase 0 — khôi phục kiểm thử baseline

Mục tiêu: sửa test harness trên Windows và có lệnh test/typecheck tái lập được, trước khi sửa gameplay. Không sửa lib/storage.js hoặc bất kỳ logic production.

## Bằng chứng và nguyên nhân

`node --experimental-vm-modules --test tests/*.test.mjs` chạy 9/12 test, 3 suite integration fail ENOENT `lib\\cloudflare:workers`. SourceTextModule hoạt động khi có flag. Cả 3 loader nhận đường dẫn absolute từ node:path.resolve trên Windows, nhưng `moduleAt(path)` so `.endsWith('/lib/storage.js')`; Windows trả `\\lib\\storage.js`, nên không vào SyntheticModule và import production storage tới virtual Cloudflare module như file thật. Đây là lỗi nhận diện đường dẫn, không phải lỗi production hoặc lý do đổi Node version.

## Thay đổi được phép

1. Trong tests/race.test.mjs, tests/community.test.mjs, tests/room-management.test.mjs, thay nhận diện storage bằng so sánh canonical `resolve(path) === resolve('lib/storage.js')` hoặc normalize separator thật tương đương. Giữ toàn bộ assert, fixtures, SQL batch emulation và runtime API tested, không skip.
2. Thêm regression riêng chứng minh đường dẫn POSIX và Windows chọn đúng stub; mọi file khác vẫn đọc SourceTextModule. Có thể dùng helper test-only nếu giảm lặp nhưng không refactor fixture không liên quan.
3. Trong package.json thêm `test: node --experimental-vm-modules --test tests/*.test.mjs` và `typecheck: tsc --noEmit --incremental false`. Giữ mọi dependency và lockfile.
   Baseline lint có 6 lỗi ở biến local tên `module` trong chính 3 test loader và 335 warnings. Đổi biến local thành `loadedModule`/`entryModule` trong 3 loader, không tắt rule. Warnings pre-existing ghi riêng.
4. Chỉ ghi HANDOFF/status bằng dữ kiện đã chạy. Không ghi Phase0 complete từ lời subagent.

## Nghiệm thu

- Các suite integration thực sự chạy và giữ nguyên assertions V7; npm test exit 0.
- npm run typecheck exit 0, không sinh tsconfig.tsbuildinfo.
- npm run build exit 0; ghi rõ baseline lint lỗi nếu có, không tắt eslint rules rộng.
- Git diff chỉ 3 test loader/helper, package scripts và tài liệu. Production source chưa thay đổi.
- Review độc lập sau sửa trước commit/push. Không commit/push trong phase này.

## Trạng thái đã kiểm chứng

- Đã cập nhật ba loader test để so sánh `resolve(path) === resolve('lib/storage.js')`; biến local `module` trong loader đã đổi thành `loadedModule`/`entryModule`.
- Đã thêm regression test cho đường dẫn POSIX và Windows trong `tests/storage-loader.test.mjs`.
- Đã thêm scripts `test` và `typecheck` vào `package.json`.
- `npm test`: exit 0; 18 test pass, 0 fail, 0 skipped.
- `npm run typecheck`: exit 0; không sinh `tsconfig.tsbuildinfo`.
- `npm run build`: exit 0; có 1 cảnh báo vinext về route dynamic API classification, không phải lỗi.
- `npm run lint`: exit 0; 0 errors, 335 warnings. Warnings còn lại là baseline, gồm 1 warning trong `tests/race.test.mjs` và warnings trong production/public files; không còn lỗi local `module` ở ba loader.
- Không commit/push. Production modules, fixtures và assertions không bị thay đổi.

Rollback là bỏ riêng diff test/scripts khi cần; không dữ liệu production, migration hoặc runtime thay đổi.
