# Kế hoạch triển khai V4 cho 48 giáo án Ban Toán W5–W6

## Nguyên tắc thực hiện

- Một writer tại một thời điểm; OpenCode là implementation engine được giao theo nhóm.
- TDD: test fail trước, code tối thiểu sau; không sửa Firestore Rules/UI ngoài blast radius.
- Giữ `g10_w5_p31_bpt_tiet1` và API pilot hiện tại tương thích.
- Không commit/push/deploy nếu chưa có lệnh riêng.
- Sau mỗi nhóm: báo cáo diff, test và blocker; review độc lập trước khi sang nhóm tiếp.

## Task 0 — baseline và snapshot nguồn

- [ ] Ghi snapshot 48 `LessonSpec` từ nguồn TypeScript hiện hành; không dùng `lesson-data.json` stale.
- [ ] Ghi provenance/hash và kiểm tra count/key/shape/SBT refs/AI error.
- [ ] Viết test drift: thay đổi source fingerprint hoặc thiếu bài phải fail rõ.
- [ ] Chốt mapping `sourceKey`, package ID, alias và binding sang `AdaptiveLesson`.

**Gate:** snapshot tự kiểm đúng 48 bài; không có import tuyệt đối vào mã runtime.

## Task 1 — contract V4 và adapter thuần dữ liệu

- [ ] Bổ sung metadata tối thiểu `lessonMode`, `sourceKey`, `sourceFingerprint`, self-choice policy nếu cần.
- [ ] Tạo adapter `LessonSpec → LiveLessonV4Contract` dùng source snapshot.
- [ ] Giữ timeline 2400 giây; sinh ID ổn định, không dùng index ngẫu nhiên.
- [ ] Tạo timeline riêng theo `formation`, `practice`, `elective-practice` nhưng giữ common core/post-check.
- [ ] Map examples/exercises/quick/mistakes, board plan, screen plan, language support và AI error đã có.
- [ ] Không tự chế nội dung khi nguồn thiếu; trả diagnostic lỗi và chặn publication.

**Test trước code:** representative G10 P31, G10 P37 và G11 P40; 1 case thiếu AI error/thiếu exercise phải fail.

**Gate:** validator pass với gói đại diện; P31 contract cũ không vỡ.

## Task 2 — package registry và artifact runtime

- [ ] Sinh registry có metadata 48 gói và runtime safe projection.
- [ ] Giữ package P31 hiện có làm compatibility fixture; không snapshot/import chéo worktree.
- [ ] Export lookup exact: source key, canonical package ID, approved aliases.
- [ ] Expose status candidate/draft/published theo publication gate; không tự đánh dấu nội dung chưa review là production.
- [ ] Thêm tests count 48, unique IDs, source hash, mode distribution và safe runtime shape.

**Gate:** registry load được trong Vite, không kéo `teacherScript` vào TV projection.

## Task 3 — tích hợp “Bài học phân hoá” hiện tại

- [ ] Launcher dùng generic registry lookup/bind lesson thật, vẫn giữ P31 pilot API.
- [ ] List page chỉ hiện “Mở tiết trực tiếp” khi lesson match gói đã publish; candidate hiển thị trạng thái rõ, không tạo phiên.
- [ ] Dùng `curriculumRef.lessonCode`/source key exact; không title fuzzy match.
- [ ] Không tự seed 48 bài vào Firestore trong lúc code nếu chưa có thao tác import rõ ràng; artifact registry phải dùng được trước.
- [ ] Cập nhật thông báo UI từ “pilot-only” thành trạng thái package tương ứng, không đưa script GV lên TV.

**Gate:** unit tests launcher/list và P31 regression pass.

## Task 4 — language/glossary và cổng HS

- [ ] Bảo toàn `languagePreference` ở payload/session HS, tách khỏi ability/group.
- [ ] Glossary deterministic từ nguồn/registry: vi anchor, en/ja/ko/zh; mục thiếu bản dịch giữ draft và chặn publish.
- [ ] Student projection chỉ nhận scaffold/glossary đã duyệt; kiểm cả full/bilingual/vi-anchor.
- [ ] Không tự dùng ngôn ngữ để xếp nhóm.

**Gate:** language tests + privacy tests + representative student projection pass.

## Task 5 — evidence, route, grouping approval, post-check

- [ ] Map evidence rules theo checkpoint thật của từng mode.
- [ ] Đề xuất nhóm theo task + evidence; GV duyệt; fallback manual/offline.
- [ ] M/S/C có success criteria chung; self-choice có common post-check.
- [ ] Post-check cá nhân và đánh giá lại; không kết luận năng lực từ language preference.

**Gate:** tests cho formation/practice/elective, group approval và post-check; không lộ nhãn route cá nhân trên TV.

## Task 6 — projection TV, offline và không gian UI

- [ ] Map cue/screen/board lớn/bảng phụ đúng vai trò; TV chỉ public allowlist.
- [ ] Kiểm không lộ PII/raw response/private support/teacher script.
- [ ] Sinh offline checklist/printable data từ cùng contract, không tạo nguồn thứ hai.
- [ ] Không dùng Slido/Padlet/AnswerGarden làm dependency bắt buộc; chỉ ghi fallback/appendix nếu nguồn có.

**Gate:** sanitizer/property tests và render-safe fixture pass.

## Task 7 — mở rộng từ đại diện đến 48

- [ ] Chạy generator/validator toàn bộ 48.
- [ ] Báo cáo từng bài: source key, mode, self-choice, AI error, glossary status, publication status, errors.
- [ ] Không promote hàng loạt nếu có lỗi nội dung; giữ candidate và danh sách chờ QA.
- [ ] Kiểm không đụng layout/nguồn DOCX Ban Toán; nếu cần export, dùng source generator hiện tại với layout cố định.

**Gate:** 48 structural pass; mọi non-pass có lý do và artifact traceable.

## Task 8 — kiểm chứng và review độc lập

- [ ] OpenCode reviewer đọc diff và test, report-only; reviewer thứ hai tập trung privacy/source/timing.
- [ ] Tôi chạy lại không tin output agent: lint, lint:api, full tests, focused package tests, build, `git diff --check`.
- [ ] Nếu chạm Rules/service, chạy rules/emulator test; không gọi `evaluation error` là zero nếu chỉ deny-path/fallback còn trace.
- [ ] Browser pilot/staging/Vercel là gate riêng, chưa tuyên bố đạt trong phạm vi này.

**Gate cuối:** có bằng chứng lệnh, exact worktree/branch/HEAD, diff sạch theo phạm vi; chưa push/deploy.

## Handoff sau phiên

- [ ] Viết `tasks/session_v4_all_lesson_packages.md`: nguồn/hash, file tạo/sửa, registry, status 48 gói, lệnh kiểm, lỗi còn lại và bước browser pilot.
- [ ] Cập nhật `tasks/lessons.md` nếu phát hiện/correct pattern mới.
