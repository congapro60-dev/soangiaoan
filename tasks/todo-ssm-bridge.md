# Plan — Cầu nối SSM (Edufit) ↔ app, Đợt 1: CHỈ ĐỌC

> Khảo sát 2026-09-24. Tách file khỏi `tasks/todo.md` (đang giữ plan Ban Toán dở).
> Quyết định user: hướng B (tiện ích Edge), cả tổ Toán dùng, thứ tự 3 đợt: đọc → báo giảng/BTVN → điểm danh.

## Ranh giới
- Đợt 1 KHÔNG ghi gì lên SSM. Không tin nào tới phụ huynh.
- Vé đăng nhập SSM KHÔNG rời trình duyệt: không gửi lên Vercel, không lưu Firestore, không log.
- Không thêm Vercel function (giới hạn 12).
- Dữ liệu SSM chỉ đọc khi GV bấm; không lưu bản sao điểm LO lên Firestore ở đợt 1.

## Kiến trúc
```
App (giaoandewey.vercel.app, GV đã đăng nhập mail trường)
  │ window.postMessage  {type:'ssm:request', op, params}
  ▼
Tiện ích Edge — content script trên domain app  ──►  service worker
                                                        │ gọi api-ssm.edufit.vn/api/v1|v2|v3
                                                        │ bằng phiên SSM của chính GV (tab SSM đang mở)
                                                        ▼
                                                  trả JSON về app
```
- Tiện ích kiểm mail: mail trên SSM `/profile` phải trùng mail đăng nhập app, lệch → từ chối.

## Việc
- [x] 0. Cơ chế xác thực SSM (đã kiểm thật): `Authorization: Bearer <localStorage access_token>` + header `workspace: <localStorage workspace>`; không cookie. → tiện ích: content script trên ssm.edufit.vn đọc token tại chỗ, service worker gọi api-ssm; token không rời máy, không log.
- [x] 1. `extension/ssm-bridge/` (Manifest V3): `manifest.json` (host `ssm.edufit.vn`, `api-ssm.edufit.vn`, domain app + localhost:3000), `background.js`, `app-relay.js`. Chỉ cho phép danh sách op cố định (GET), không có op tự do.
  - verify: nạp unpacked vào Edge, app thấy tiện ích (ping/pong).
- [x] 2. `src/lib/ssm/ssmBridge.ts`: `ssmRequest(op, params)` (ping = kiểm đã cài) có timeout + lỗi tiếng Việt ("Chưa mở SSM", "Phiên SSM hết hạn", "Mail SSM khác mail app").
  - verify: unit test với bridge giả.
- [x] 3. Kéo lớp + HS: op `teacherClasses`, `classStudents` → `SsmLinkPanel` ở tab Học sinh (GV ghép 1 lần, lưu localStorage theo từng GV — chưa lên ClassDoc); HS khớp theo Mã HS, liệt kê HS lệch/thiếu, KHÔNG tự thêm/xoá.
  - verify: test ghép theo mã; thử thật 11Columbus (26 HS).
- [ ] 4. Kéo điểm TDS theo LO: op `evaluationQuarters`, `classSubjectAssessment` (F1–F4 0%, IA/SE có trọng số) → mục mới trong `StudentReport.tsx` "Đánh giá theo chuẩn đầu ra (TDS)" theo chuẩn thiết kế phiếu IB (SVG thuần).
  - Chưa có dữ liệu thật (mọi lớp 0/4 Quarter) → dựng parser từ mẫu JSON khi Q1 có điểm; trước đó hiện "SSM chưa có điểm quý này".
  - SSM là NGUỒN GỐC; tab TDS Sheet hiện do GV chép tay từ SSM (user xác nhận 2026-09-24).
- [ ] 4b. Đổ điểm SSM → cột `Điểm Quý N` tab TDS (Sheets API v4, quyền Google GV, như sheet-sync BTVN): khớp Mã HS, CHỈ ghi cột Điểm Quý N, không đụng cột công thức/khối hành động, có bảng xem trước ô cũ → ô mới, ô đã có giá trị khác thì hỏi.
  - SSM tự tính điểm TDS quý từ các điểm LO → app LẤY NGUYÊN số SSM đã tính, KHÔNG tự tính lại (tránh lệch công thức). Chưa thấy SSM trả số này ở đâu → tìm khi Q1 có điểm; không có thì dừng, hỏi user, không đoán công thức.
- [x] 5. Phát cho tổ: nút "Tải tiện ích" trong app (`/downloads/ssm-bridge.zip`, sinh lúc build) + 4 bước cài hiện ngay trong khung SSM. Cân nhắc Edge Add-ons dạng ẩn sau khi ổn.
- [x] 6. `npm run build`, `npm test`, `npm run lint` pass; thử thật chỉ-đọc trên SSM.

## Chưa khảo sát (đợt sau)
- Form ghi lịch báo giảng, BTVN (API POST).
- Điểm danh theo tiết (phải xem lúc có tiết đang diễn ra).

## Khảo sát API GHI (2026-09-24, từ mã JS công khai SSM bản umi.a90344e0)
Header như đợt 1: `Authorization: Bearer <access_token>`, `workspace`, `Accept-Language`.
- **Báo giảng tuần** — `POST /v1/lecture-schedules`, sửa `PUT /v1/lecture-schedules/{id}`; đọc `GET /v1/lecture-schedules` (+ `/subjects /grades /classes /teachers /class-types`).
  Payload JSON: `{start_date, end_date (đầu/cuối tuần, "YYYY-MM-DD"), subject_id, class_ids: [..], content, files: []}`.
- **BTVN** — `POST v1/homeworks`, sửa `POST v1/homeworks/{id}`, xoá `DELETE /v1/homeworks/{id}`; đọc `GET v1/homeworks`, `v1/class-teacher`, `v1/subject-class?class_id&school_year_id`.
  Payload **FormData**, mỗi giá trị `JSON.stringify` trừ `deadline`: `name` ({vi}), `class_ids`, `subject_id`, `is_all_student` (1/0), `student_ids` (khi 0), `deadline` ("YYYY-MM-DD HH:mm:ss"), `content` (JSON {vi: html}).
- **Điểm LO (TDS V2)** — ghi `POST /v2/evaluation/grading-student-by-assessment-form/{id}`, `POST /v2/evaluation/update-result-grading-student/{id}`; nháp `POST /v1/evaluation/grading-student-draft-by-assessment-form/{id}`; duyệt `POST /v2/evaluation/approve-assessment-form`; đọc `GET /v3/evaluation/classes/{classId}/subjects/{subjectId}/quarters`, `/v2/evaluation/class-subject-assessment?assessment_form_id&criteria_id&class_id`. Nhận xét môn: `PUT /v2/evaluation/subject-comments`.
- **Điểm danh** — `GET v1/attendances/getClassTimeTableLessonAttendance/{..}`, `POST v1/attendances/saveAttendanceData/{..}`, `POST v1/attendances/updateAttendanceDataTds/{..}`.
Công cụ: tải toàn bộ chunk (map `return""+({...})[id]...".async.js"` trong umi) rồi lần endpoint → hàm → export → chỗ gọi.

## Dữ liệu THẬT đã đọc (2026-09-24, tài khoản chủ dự án, chỉ GET)
- `GET v1/subject-class?class_id=9681&school_year_id=6` → `{data:[{id,name,total}]}`; 11Columbus: 12 = VN TOÁN, 6730 = ĐỊNH HƯỚNG, 6956 = GDCXXH. `class-teacher` trả `{data:[{id,name}]}` (46 lớp).
- **Báo giảng**: SSM TẠO SẴN ô cho mỗi lớp×môn×tuần (content rỗng = "Trống") → điền = `PUT /v1/lecture-schedules/{id}`. Tìm ô: `GET v1/lecture-schedules?brand_has_school_year_id=10&start_date=YYYY-MM-DD(thứ Hai)&end_date=(Chủ nhật)&class_id=&subject_id=&page=1&limit=50` (lọc bằng `class_id`, KHÔNG phải `class_ids`). Dòng: `{id, class{id,name,code}, subject{subject_id,subject_name}, content (HTML), start_date, end_date, is_allow_edit, is_later, teacher{...}}`. Nội dung mẫu: `<h3>11Columbus – VN TOÁN Chính khoá</h3><p><strong>Thứ Hai 21/9</strong></p><ul><li>Từ 10h00 đến 10h40: …</li></ul>…`.
- **Thời khoá biểu** của GV đang đăng nhập theo ngày: `GET v1/class-time-table-lessons?date=YYYY-MM-DD&skipPagination=true&search=is_active:1&branchType=TDS` → `{data:[{id (mã tiết), subject_name, class_time_table_lesson_attendance_count, classTimeTables:{data:{date, time "10:00-10:40", from, to, name, class:{data:{id,name}}}}}]}` (có cả Sinh hoạt đầu/cuối giờ, subject_name null).
- **Điểm danh 1 tiết**: `GET v1/attendances/getClassTimeTableLessonAttendance/{lessonId}` → `data:{class_id, date, from, to, subject_name, status_attendance (đã điểm danh?), not_time_for_attendance_yet, attendance_time_is_over, students:[{student_id, student_code, full_name{vi}, attendance_status_id, attendance_comment, previous_attendance_status, is_uniform, class_time_table_lesson_id, …}]}`. Ghi: chưa điểm danh → `POST v1/attendances/saveAttendanceData/{lessonId}`, đã có → `POST v1/attendances/updateAttendanceDataTds/{lessonId}`; body `{attendance_data:[bản ghi học sinh (nguyên object GET) đã sửa attendance_status_id + attendance_date "YYYY-MM-DD hh:mm:ss"], attendance_compensation:null}`. Mã: có mặt 1, vắng 2, muộn 3, có phép 6, không phép 7.
- **Điểm LO**: `GET v3/evaluation/classes/{classId}/subjects/{subjectId}/quarters?school_year_id=6` → 4 quý `{id, name, status, assessment_forms:[{id, assessment_name F1/IA1…, radio (trọng số %), status, total_student_graded, total_student, criteria_id}]}`. `GET v2/evaluation/class-subject-assessment?assessment_form_id&criteria_id&class_id` → `{quarter_has_branch_id, result_assessment_form_id (null = chưa chấm), can_edit, is_approved, is_draft_set, …}`. LO + thang điểm: `GET /v2/evaluation/criteria-has-assessment-form/{assessmentFormId}` (CHƯA đọc được — bị chặn), HS: `GET /v2/evaluation/student-by-subject`. Ghi: chưa có kết quả → `POST /v2/evaluation/grading-student-by-assessment-form/{assessmentFormId}`, đã có → `POST /v2/evaluation/update-result-grading-student/{result_assessment_form_id}`; body `{class_id, criteria_id, quarter_has_branch_id, students:[{id,name,result:[{learning_outcome_id, scoring_setting_id, is_number, point:"", grading_student_id}]}]}` (LO có focal_point_id + power_standard_id; điểm = MỨC trong thang `scoring_setting_id`).
- **LO thật (xem qua giao diện SSM, 11Columbus · VN TOÁN · Q1, cả F1 lẫn IA1 cùng bộ)**: trang chấm `/academic/student-assessment-v2/tds/6/evaluate/{classId}/criteria/{criteriaId}/assessment-form/{formId}/subject/{subjectId}/quarter/{quarterId}`. Cây FP (focal point) → PS (power standard) → LO: FP_DIS_TO_8774, 8775; PS 20478 (HSLG + PTLG), 20479 (dãy số, CSC, CSN), 20483 (quan hệ song song); LO 34745 (giá trị LG, công thức LG, hàm số LG), 34746 (PTLG cơ bản), 34747 (dãy số), 34748 (CSC, CSN), 34756 (đường thẳng & mặt phẳng song song). Thang: **N** (chưa đánh giá), 4, 3.5, 3, 2.5, 2, 1.5, 1, 0. Mỗi HS × mỗi LO một ô; nút "Lưu" và "Gửi Phê Duyệt". Cấu trúc JSON của `criteria-has-assessment-form` CHƯA đọc được (auto-mode chặn).

## Đợt 2 — tab SSM trong workspace lớp (2026-09-25) — XONG code, chờ user test
Không tự ghi vào SSM. Mọi thẻ: app soạn/điền sẵn → cô tự tải lên / dán / bấm nút cuối trên SSM.
- **Điểm LO**: tải file mẫu SSM xuất (`Template_Export_Score_*.xlsx`, CDN cdn-ssm.edufit.vn/export/evaluation/, tĩnh, không cần đăng nhập) → `loWorkbook` đọc (cột A=Mã HS, dòng 6=mã LO, D..=ô điểm) → lưới HS×LO (ô N,4,3.5..0) → "Gợi ý điểm bằng AI" (`callAI` client, ghép LO↔năng lực `loMapping`+`loMappingPrompt` 1 lần/bài, điểm từ bài đã duyệt `loClassScores`, quy thang `loScore` điểm/2,5 khớp mức gần nhất — thang KHÔNG có 0,5) → cô sửa tay → "Tải file đã điền" (`fillLoWorkbook` giữ nguyên data validation). Đã kiểm trên file thật + giao diện thật.
- **Lịch báo giảng** (`ssmDrafts.buildScheduleContent`): từ PPCT (`loadPpct('TDS',grade)`) tuần N → HTML kiểu ô báo giảng → nút Chép (rich html+text). Đã kiểm khối 11 tuần 1.
- **BTVN** (`buildHomeworkDraft`): mỗi bài giao (type≠exam) → tên/hạn(YYYY-MM-DD HH:mm:ss)/nội dung, nút chép.
- **Nhận xét PH** (`buildSubjectComment` từ `buildParentSafeReport`): mỗi em một đoạn, nút chép.
- File: `src/lib/ssm/lo*.ts`, `ssmDrafts.ts` (thuần, 47 test); `SsmPanel.tsx` (LO) + `SsmDraftCards.tsx`; tab "ssm" trong `ClassWorkspaceNav`.
- **Chưa đẩy main** — chờ user test 1 vòng thật (đăng nhập GV + upload file lên SSM xem SSM nhận). BTVN/Nhận xét cần đăng nhập GV mới có dữ liệu (demo chặn API — đúng như thiết kế).
- **Bẫy dev**: sau khi thêm import vào ClassesTab, Vite HMR kẹt bản cũ ("SsmDraftCards is not defined") — xóa `node_modules/.vite` + tải lại kèm query cache-bust; production build không dính.
