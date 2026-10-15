# Bản chấm tay / Bài chữa nộp hộ — 15/10/2026

Base `3b40a56`, spec commit `8ec0dc3`; branch `codex/handmarked-corrections`. User xác nhận thiết kế và bổ sung HS/PH cùng xem bài chữa. Quyền đã duyệt: GV/PH lưu và opt-in AI như HS; không sửa điểm gốc.

## Phân công

- Backend writer `proxy_risk_review`: contract types, actor grants, private handmarked files/publish/read/audit, correction3roles/provenance, API projections, Rules/tests.
- UI writer `review_proxy_backend`: service credential wiring, handmarked controls/viewer, correction controls HS/GV/PH, component tests.
- Read-only reviewer `final_ui_audit`: security plan/source review, không sửa file.
- Root: integration, docs/checklist, native QA, full gates, commit/push. Không sửa file của writer khi chưa bàn giao.

## Checks trước code

| Task | Yêu cầu | Kiểm | Kết luận | Bằng chứng |
|---|---|---|---|---|
| M1 | GV upload private, mặc định ẩn, grade/original không đổi | API upload/finalize tests | PASS | full suite 3.146/3.146 |
| M2 | HS/PH chỉ xem khi GV công bố; wrong-child/revocation deny | projection/read API tests | PASS | auth matrix, PIN revoke, signed URL race |
| M3 | Tắt/reset-newrevision/audit/expectedRevision chặn race | transaction tests | PASS | immutable revisions, deletion fence + retry |
| M4 | HS/PH/GV correction save/list/review, actor provenance | correction actor matrix | PASS | reload + DTO UID privacy |
| M5 | correction không đổi grade, lock không chặn riêng | original equality/lock tests | PASS | manual-only image/PDF + no grade writes |
| M6 | shared UI GV/HS/PH upload/view/toggle/correction | component + browser | CONDITIONAL | component tests đạt; browser timeout |
| M7 | Private Storage và collection từ chối truy cập trực tiếp | Rules emulator | PASS | 309/309, 10 files, exit 0 |
| M8 | lint app/API strict/non-strict, build, full tests | npm scripts | PASS | 3.146 tests, ba typechecks, final build exit 0 |
| M9 | Review native Astra xhigh theo yêu cầu mới nhất | source review | PASS | astra_final_review, cả diff merge |
| M10 | Source main và theo dõi Git deployment | git/CI/Vercel | PUSHED | 33b21cd; API CI success; Git deployment đang build tại snapshot |

## Runtime/model evidence

Quota script live 15/10: Gemini Antigravity usable ~99–100%; Claude session LIMIT, weekly74%; Codex account sample weekly7% (narrow quota, reserve for review). Native subagents inherited configuredmodel. Cross-vendor review uses liveavailable Gemini via9router; no newpaidAPI/modelconfig changes. No Argon call.

### Điều chỉnh đã chốt trong phiên

- Người dùng yêu cầu dừng gọi model bên ngoài, dùng subagent native `gpt-6-astra` mức `xhigh`. Không gọi thêm 9router/model ngoài sau yêu cầu này. Reviewer mới: `astra_final_review`, chỉ đọc.
- Focused backend: 63/63; sau sửa DTO và compiler, 35/35 ca hand-marked/correction đạt. Focused UI cuối: 25/25 đạt, gồm viewer ảnh trực tiếp, PDF, quyền và lịch sử.
- Compile API lần đầu phát hiện TS18048; đã sửa guard, đang kiểm lại. Chưa coi là full gate PASS.
- `origin/main` có thêm `51732c5`, `2407c50`; tích hợp các thay đổi đó trước kiểm tra cuối, không ghi đè.
- Browser Edge timeout CDP khi vào tab GV; tab QA mới cũng timeout. Chưa xác nhận QA giao diện bằng tài khoản thật cho tính năng mới.
- Bài chữa cho HS/PH giữ ảnh và ghi chú sau khi thu hồi công bố nguồn; nhận xét AI hết căn cứ được ẩn. Lưu/đánh giá mới cần nguồn công bố. Manual-only dùng ảnh chấm tay đã công bố, PDF-only trả chưa đủ căn cứ.
- Strict/non-strict API, app lint và build đạt trước tích hợp main. Build 1,557.57 kB cho index, vẫn thuộc cảnh báo kích thước có sẵn; không coi là tối ưu bundle.
- Review Astra bắt lỗi nhận xét cũ trên UI và cleanup mọi revision khi xóa bài: 5 regression RED được xác nhận, GREEN 34/34. Đang bổ sung fence chống upload đồng thời khi xóa.

## Giới hạn thiết kế

Bản chấm tay lưu riêng, không sửa file nộp gốc/AIgeometry. File URL chỉ phát khi mở sau fresh auth, signed60s; nội dung đã tải không thể thu hồi. Tắt chặn lượt mở tiếp theo, không tuyên bố xóa ảnh khỏi thiết bị người đã xem. Publication chủ độngGV độc lập numericgradeapproval; không suy ra filechấmtaytừảnhgốccóscore.

Native QA không tự tạo bài/đổi điểm trong lớp thật; fixture/synthetic file không chứa dữ liệuHS để kiểm mutation khi cần. Quyền đọc thật theo phiên sẵn có; ghi production cần dữ liệu/đích cụ thể trong scope đã duyệt. Không đọc PIN/token/cookies.
