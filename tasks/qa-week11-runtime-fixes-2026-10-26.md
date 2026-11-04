# Sửa lỗi QA runtime Tuần 11 — 26/10/2026

## Goal

Sửa năm findings kỹ thuật được thầy cho phép qua “fix luôn”; không đổi nội dung Toán, ba mã bài, 51 gói, cue ID hoặc privacy rules.

## Confirmed facts

- Worktree: `C:\Users\ADMIN\.codex\worktrees\week11-runtime-fixes\smart-lesson-plan-ai`.
- Nhánh `codex/week11-runtime-fixes`, base `3616442`; thay đổi chưa commit.
- Checkout QA cũ `C:\Users\ADMIN\.config\superpowers\worktrees\smart-lesson-plan-ai\nop-bai-da-cham` vẫn sạch; không chép đè vào đó.

| Finding | Sửa | Kiểm chứng |
|---|---|---|
| Presenter không đóng được phiên | Nút Đóng phiên, xác nhận native, gọi `closeLiveLessonSession` hiện có; busy/error/retry | Test handler thật và tích hợp `LiveLessonPage` với service mock, hủy/đóng, busy, thất bại rồi thử lại |
| Câu mới bị khóa theo kết quả cũ | Reset `publicStatsEnabled=false` trong chính transaction đổi cue; giữ nguyên nếu pause/cùng cue | Test transaction kiểm cả parent và public/state, kể cả patch mang cờ cũ true |
| Luyện tập bỏ qua khóa | Truyền khóa vào input/nút/support; chặn thêm tại submitStep | Test waiting/showStats/closed/listener error; gọi trực tiếp handler vẫn không enqueue |
| Chọn đáp án tự gửi | onChange chỉ giữ lựa chọn; Gửi mới enqueue; bảo toàn boolean false và AI-error category+explanation | Test choice/route/boolean, text/exit; cả hai AI-error ID; pilot model/quick-check/notice-wonder |
| Client bỏ lỡ đóng khi offline | Khi listener lỗi, thay runtime cũ bằng màn lỗi có Thử lại; không giả suy thành closed; giữ màn kết thúc nếu đã biết closed | Test route helper và render thực của LiveLessonPage trả recovery component thay TV/HS |

Nháp luyện tập chỉ được đánh dấu đã gửi sau khi enqueue thành công. Đó là xác nhận lưu hàng đợi trên thiết bị, không phải bằng chứng máy chủ đã nhận.

## Verification

| Lệnh | Kết quả |
|---|---|
| `npm run lint` | PASS, exit 0, lượt cuối sau sửa kiểu trong test |
| `npm run lint:api` | PASS, exit 0 |
| `npx --no-install vitest run src/lib/liveLesson src/components/liveLesson src/pages src/services/liveLessonService.test.ts` | 63 file / 619 test PASS |
| `npm run build` | PASS, 1m05s; entry 709,53 kB; cảnh báo chunk lazy >500 kB như trước |
| `npx --no-install firebase emulators:exec --only firestore,storage 'vitest run --config vitest.rules.config.ts --hookTimeout=90000'` | 11 file / 314 test PASS |
| Test sau sửa kiểu cuối trong test harness | 3 file / 29 test PASS; không đổi production code sau build |
| `git diff --check` | PASS |
| Diff snapshot Toán + firestore.rules + storage.rules | Rỗng |

Các lệnh npm trỏ `--prefix` đúng worktree; npx chạy trong worktree. Không cài dependency mới. Không chạy full-repo Vitest hoặc sửa bốn test v832 ngoài phạm vi.

Logs: `C:\Users\ADMIN\.codex\visualizations\2026\09\19\01a0b75c-c512-79c3-b758-9e32621ff4bb\fix-week11-2026-10-26` — `lint-verified.log`, `lint-api.log`, `vitest-final.log`, `build-final.log`, `rules.log`.

## Failed attempts

- QA browser trước kết thúc vì công cụ không xác định được URL Windows đủ tin cậy. Không lặp bằng cơ chế khác để vượt chặn; lượt sửa này không chạy browser/production.
- Regression tests đã đỏ trước sửa: đổi cue giữ kết quả; listener giữ running; thiếu nút đóng; Student tự gửi/không khóa luyện tập.
- Review vòng một bắt hồi quy mixed choice/text của pilot; đã bổ sung đường xác nhận lựa chọn riêng, nhãn phân biệt với nội dung viết; test đỏ 5 ca rồi xanh.
- Lint cuối bắt TS2339 trong traversal test mới; đã khai báo children rõ kiểu và chạy lint/test lại xanh.
- Catalog 9router không truy cập được; không biết quota/account/served-model router. Dùng native agents, không tuyên bố đã review chéo hãng.

## Review và active constraints

- Agent Dalton: Student fix và test, source scope riêng.
- Agent Hypatia: đọc diff độc lập; vòng cuối không còn blocker/major. Cùng họ OpenAI; chưa có review khác hãng. Không coi review source là nghiệm thu browser.
- Không commit, push, deploy, đổi dữ liệu production hay thẩm định quyết định sư phạm.
- Giữ cách đóng fail-closed hiện có; không cho client đã mất quyền đọc tiếp tục runtime. Chưa phân biệt chắc closed với expiry khi client offline bỏ lỡ marker; màn lỗi tải lại là giới hạn có chủ đích.
- Cần QA browser ba vai trên bản triển khai chứa diff này trước khi nghiệm thu tiết thật. Các test React dùng hook harness, không chứng minh effect/timer/media/Firestore E2E hoặc độ trễ ≤5s.

**Trạng thái: implemented + locally tested; chưa deployed/production verified.**
