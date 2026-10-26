# 7 bài Tuần 11 còn thiếu thành V8.8 + QA đầy đủ 10 bài — Design

> Thiết kế chốt với chủ dự án ngày 26/10/2026. Bối cảnh: 3 bài mẫu Tuần 11 (`10-11-79`, `11-11-75`, `12-11-80`) đã là Bài học tương tác V8.8 trong code, bài 12 đã QA Production ĐẠT (báo cáo `tasks/qa-week11-acceptance-2026-10-26.md`). Thầy duyệt thiết kế này làm căn cứ cho plan + thi công theo từng bài.

## Mục tiêu

Đưa **7 bài Tuần 11 còn lại** (trong số 10 bài tự học đã publish) thành **Bài học tương tác V8.8** (Presenter / Student / Coach, timeline 12 chặng 0–2400s, AI-error riêng, exit ticket) chạy `/adaptive-live`, rồi **QA đầy đủ A–F cả 10 bài** Tuần 11 trên Production. Sau đợt này, mọi tiết nội dung Tuần 11 mà thầy có bản tự học đều dạy được bằng luồng V8.8.

## Quyết thầy đã chốt (26/10)

1. **Phạm vi = 7 bài còn thiếu** (không mở rộng 15 tiết; 5 tiết chưa có bản tự học không làm trong đợt này).
2. **Duyệt từng bài như cũ** — mỗi bài 1 file thiết kế Gate D, thầy duyệt xong bài nào mới code bài đó (không gom, không bỏ cổng).
3. **Tôi tự dựng** toàn bộ (thiết kế + spec + code + QA), không điều phối nhiều AI.
4. **QA đầy đủ A–F cả 10 bài** (7 mới + 2 mẫu chưa từng QA trình duyệt + bài 12 QA hồi quy sau khi registry đổi).
5. **Thứ tự theo PPCT**: g10 → g11 → g12.

## Danh sách 7 bài

| # | Bài | Khối | Mã dự kiến | Bài tự học tương ứng |
|---|---|---|---|---|
| 1 | Các số đặc trưng đo xu thế trung tâm — Tiết 1 | 10 | `10-11-80` | `adaptive-1792826324771` |
| 2 | Các số đặc trưng đo xu thế trung tâm — Tiết 1 | 11 | `11-11-76` | `adaptive-1792831154099` |
| 3 | Hai mặt phẳng song song — Tiết 2 | 11 | `11-11-78` | `adaptive-1792827844375` |
| 4 | Hai mặt phẳng song song — Tiết 3 | 11 | `11-11-79` | `adaptive-1792828475281` |
| 5 | Nguyên hàm — Tiết 2 | 12 | `12-11-77` | `adaptive-1792832396461` |
| 6 | Khoảng biến thiên, tứ phân vị, độ lệch chuẩn — Tiết 1 | 12 | `12-11-78` | `adaptive-1792833009074` |
| 7 | Luyện tập: Khoảng biến thiên, tứ phân vị, độ lệch chuẩn — Tiết 2 | 12 | `12-11-79` | `adaptive-1792833650874` |

**Quy tắc mã nguồn (chốt 26/10 sau khi rà cơ chế registry):** mã do chính lessonSpec quyết định (`curriculumRef.lessonCode` của bài V4 được sinh từ spec). Quy ước đồng bộ 3 mẫu có sẵn: `key = khối-tuần-<số đuôi id PPCT>` (vd `tds-g10-80` → `10-11-80`, `period` trong spec = số đuôi key). Bước 1 của mỗi vòng: xác nhận entry PPCT (`tds-gXX-NN`) có tiêu đề khớp giáo án sẽ dạy + key chưa trùng 51 key hiện có — kiểm bằng node ngay tại máy, không cần mở Production.

## Hiện trạng (bản đồ kỹ thuật đã rà 26/10)

| Thành phần | Trạng thái | Vị trí |
|---|---|---|
| Snapshot 51 gói (24 W5 + 24 W6 + 3 W11) | Nguyên trạng, **không sửa** | `src/data/liveLessonPackages/banToan-w5-w6.snapshot.json` |
| Điểm import snapshot | Duy nhất 1 chỗ | `src/lib/liveLesson/v4/lessonAdapter.ts:1` (`?raw`) |
| Công tắc interactive | Đúng 3 key W11 | `src/lib/liveLesson/v4/sequentialPublication.ts:446-447` (`INTERACTIVE_SOURCE_KEYS`) |
| Test chốt cứng 51 gói | Phải cập nhật 51→58 | `lessonAdapter.test.ts:50-63`, `sequentialPublication.test.ts:21/45/195-226` |
| Test chốt cứng 3 key | Phải cập nhật 3→10 | `interactiveUpgrade.test.ts:86`, `week11Catalog.test.ts:52` (đều assert mảng đúng 3 key) |
| Test mẫu cho bài mới | Khuôn có sẵn | `week11Catalog.test.ts` (contract + timeline + AI error + validate) |
| CasioKeyGuide | Chỉ bài 12 | `src/lib/liveLesson/casioGuide.ts` — giữ nguyên |
| Test CasioGuide | Assert null cho bài khác — tự xanh với 7 key mới, không đổi | `casioGuide.test.ts` |
| aiErrors | 51 bản, 1/bài, khóa theo sourceKey | trong snapshot |
| Shape lessonSpec chuẩn | Tham chiếu spec `12-11-80` | key, grade, week, period, kind, lessonType, selfChoice, title, focus, formulas, examples, exercises, quick, mistakes, boardKnowledge |
| Giáo án gốc 7 bài | Chưa tải về (đang ở Thư viện, "lô 15 tiết Tuần 11 CẬP NHẬT 24/10") | Firestore lessonPlans — tải qua phiên GV |
| Bản nháp tham khảo | Có sẵn, chỉ dùng đối chiếu — không copy mù | `Downloads\smart-lesson-plan-ai\giao an manus tao\_qa\ban_toan_rebuild\sbR12B02RemainingSpecsW11W12.ts` và các file staging cùng nhóm |

## Kiến trúc đích

- **File snapshot mới** `src/data/liveLessonPackages/banToan-w11-batch2.snapshot.json` chứa 7 `lessonSpec` + 7 `aiError`, cùng `schemaVersion: 1` và khối `source` riêng (fingerprint của bộ nguồn mới) — **tách hẳn** file 51 gói để giữ nguyên vẹn fingerprint cũ.
- `lessonAdapter.ts`: import thêm file mới `?raw`, parse, và **merge** (lessonSpecs, aiErrors, metadata) trước khi build maps — mọi hàm hiện có (`getBanToanV4Contract`, `getBanToanV4PackageMetadata`, `getAllBanToanV4Contracts`) hưởng tự động, không đổi chữ ký.
- `sequentialPublication.ts`: `INTERACTIVE_SOURCE_KEYS` thêm 7 key (3 → 10). 48 bài W5/W6 còn lại self_study như cũ.
- Mọi luồng runtime khác (timeline 12 chặng sinh từ spec, think window, AI-error chặng 5, exit ticket chặng 11, TV stats, chống rớt kết nối HS) **không đụng** — đã QA đạt ở bài 12.

## Nhịp thi công — 7 vòng, duyệt từng bài

Mỗi bài đi đủ vòng, xong hẳn (QA đạt) mới sang bài kế tiếp:

1. **Xác minh mã** — đọc `curriculumRef` bài adaptive trên Production, chốt sourceKey, ghi vào file Gate D của bài.
2. **Tải giáo án gốc** từ Thư viện về `tasks/giaoan-goc-<mã>.md` (cần phiên app đăng nhập GV; nếu không tải được xin thầy hỗ trợ 1 lần).
3. **Gate D** — soạn `tasks/gate-d-<mã>.md` theo đúng mẫu 3 bài đã duyệt (timeline 12 chặng, AI-error riêng theo nội dung bài, no-spoiler, 3 tuyến, bảng con số đối chiếu giáo án) + biên bản đối chiếu số liệu → **thầy duyệt**.
4. **Gate C** — viết lessonSpec + aiError khớp giáo án gốc; thêm key vào `INTERACTIVE_SOURCE_KEYS`; cập nhật tests; `npm run build` 0 lỗi TS + vitest xanh; deploy Production (push `git -c core.hooksPath=.githooks push origin HEAD:main`, cập nhật HANDOFF.md trước).
5. **QA đầy đủ A–F** trên Production (phiên live mới mỗi lần chạy — phiên auto-expire ~30 phút).

## QA đầy đủ 10 bài

- **7 bài mới:** QA A–F theo quy trình đã chuẩn hoá ở bài 12: Edge `--remote-debugging-port=9222`, HS join thật (mã lớp + PIN), think window đo mốc thời gian, AI-error (chặng 5/12, TV stats cập nhật), exit ticket (chặng 11/12), chặng 12 disabled Sau, mode=tv `buttons: []`, reload HS tự rejoin giữ nháp.
- **Bài 10 + 11 mẫu** (`10-11-79`, `11-11-75`): chưa từng QA trình duyệt — QA đầy đủ, kèm kiểm **CasioKeyGuide phải ẩn** (chỉ bài 12 có).
- **Bài 12 mẫu:** QA hồi quy sau khi registry 3→10 key (bảo đảm không vỡ bài đã nghiệm thu).
- Dữ liệu QA sẵn: lớp 12 `class-1787208442826`/`AD4GKT` (Lò Mai Phương Chi 7859), lớp 11 `class-1787188523562`/`R6RCFC` (Đặng Tuệ Minh 2750), lớp 10 `class-1787208462088`/`7W288E` (Trần Thùy Anh 2143).
- Báo cáo nghiệm thu tổng hợp cuối đợt (mẫu: `tasks/qa-week11-acceptance-2026-10-26.md`).

## Ràng buộc giữ nguyên

- Không sửa 51 gói cũ (`banToan-w5-w6.snapshot.json` nguyên trạng, kể cả xuống dòng/byte).
- Không đổi số Toán đã duyệt của 3 bài mẫu: x̄=9, s²(An)=0,8, s²(Bình)=2,8, σx=0,89443.
- Cue ID hardcode theo danh sách ở `tasks/ban-giao-cho-codex-tuan11.md` mục 7 — chỉ thêm, không đổi ID cũ.
- Privacy rules, không lộ đáp án vào DOM.
- Nội dung toán của 7 bài mới phải khớp giáo án gốc từng bài (biên bản đối chiếu kèm Gate D).

## Rủi ro + xử lý

| Rủi ro | Xử lý |
|---|---|
| `curriculumRef` của 7 bài lệch mã dự kiến | Bước 1 mỗi vòng chốt mã từ Production trước khi viết nội dung; bảng mã chốt cập nhật vào file Gate D tương ứng |
| Không tải được giáo án từ Thư viện (cần phiên GV) | Xin thầy mở app giúp 1 lần hoặc thầy xuất file; không tự chế nội dung |
| Số liệu Gate D sai so với giáo án | Biên bản đối chiếu số liệu bắt buộc đính kèm trước khi trình duyệt |
| Test chốt cứng 51/3 vỡ khi merge | Cập nhật chính xác các assertion đã liệt kê; chạy đủ vitest trước deploy |
| Snapshot mới lệch shape làm adapter lỗi | Khớp tuyệt đối shape spec `12-11-80`; test catalog mới bắt lỗi ngay |
| Deploy 7 lần (~3 phút/lần) | Chấp nhận theo nhịp duyệt từng bài; nếu thầy muốn gộp thì gộp theo khối |
| Phiên QA auto-expire ~30 phút | Mỗi lần chạy QA tạo phiên mới; script chạy < 10 phút |

## Sản phẩm đầu ra

1. `banToan-w11-batch2.snapshot.json` (7 spec + 7 aiError).
2. `lessonAdapter.ts` merge 2 snapshot; `INTERACTIVE_SOURCE_KEYS` = 10 key.
3. Tests cập nhật (51→58, 3→10) + test catalog mới cho 7 bài.
4. 7 file giáo án gốc + 7 file Gate D đã thầy duyệt (kèm biên bản đối chiếu).
5. 10 báo cáo QA + 1 báo cáo nghiệm thu tổng hợp.
6. HANDOFF.md cập nhật trước mỗi push; `tasks/todo.md` theo dõi tiến độ từng vòng.
