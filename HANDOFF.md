# HANDOFF — Soạn giáo án / lớp học / chấm AI
**Cập nhật:** 2026-09-30
**Repo:** `soangiaoan` · **Nhánh chuẩn:** `main`
**Production URL:** https://giaoandewey.vercel.app

Snapshot trạng thái hiện tại. Lịch sử dài đã chuyển vào [`docs/HANDOFF-ARCHIVE.md`](docs/HANDOFF-ARCHIVE.md); chi tiết commit xem `git log`.

## Cổng phụ huynh /ph: xem báo cáo trực tuyến bằng tên con + PIN riêng — 2026-10-01

Chủ dự án chốt: phụ huynh có luồng riêng cạnh luồng HS; chọn tên + PIN → xem các báo cáo GV đã công bố, hiện như bản PDF (GV khỏi tải file gửi từng người). GV có vài trăm HS: link CHUNG cả lớp `/ph/<mã lớp>` (gửi nhóm), PIN riêng từng em phát MỘT lần đầu năm.
- Máy chủ `api/_parent-portal.ts` (gộp `classroom`): `issueParentPins` (chỉ cấp em chưa có, trả bảng cả lớp), `resetParentPin`, `publishParentReports` (theo lô ≤40, bản chụp `ParentReportPrintInput` dạng JSON ở `classes/{id}/parentReports/{hs}__{kind}__{from}__{to}`, cùng kì thì ghi đè), `listParentPublished`, `unpublishParentReports`, `parentReports` (công khai: mã lớp + em + PIN).
- PIN phụ huynh TÁCH khỏi PIN HS (`parentSecrets`, khoá sai 5 lần riêng) — PIN HS là chìa khoá đăng nhập của em, phụ huynh nhập nhầm không được khoá em. Phụ huynh KHÔNG có phiên Firebase: mỗi lượt xem gửi lại PIN; trang `/ph` không import `firebase.ts`.
- GV: tab Báo cáo của lớp → "Công bố cho phụ huynh" (cùng đường dựng với xuất ZIP, dùng nhận xét đã lưu; tuỳ chọn AI soạn) + `ClassParentAccessPanel` (cấp PIN, mẫu tin nhắn {ten}{lop}{link}{pin} soạn sẵn từng phụ huynh, chép/Excel, danh sách kì đã công bố + gỡ). Trang: `ParentPortalPage.tsx` dựng lại bằng `buildParentReportPrintDoc`, thu nhỏ theo bề rộng điện thoại, nút Tải PDF.
- Chưa có: nút "Gửi cho PH" từng em riêng (hiện công bố cả lớp), thông báo tự động Zalo/mail. Chưa E2E trên production/trình duyệt (trình duyệt pane bị từ chối mở localhost) — nhờ Codex QA sau khi deploy. `firestore.rules` đã thêm khối deny cho 2 bộ sưu tập mới nhưng CHƯA deploy rules (mặc định vẫn chặn client). Test: parent-portal 7, parentAccess 3, ParentPortalPage 2.

## Hai mail admin = MỘT tài khoản (gộp phiên) — 2026-09-30

Chủ dự án chốt: `congapro60@gmail.com` (chính, `PRIMARY_ADMIN_EMAIL`) và `cuong.vuviet@thedeweyschools.edu.vn` đồng bộ hết. Đăng nhập Google bằng mail phụ → `useAuth` gọi action `linkAdminSession` (`api/_admin-link.ts`, gộp trong `classroom`) → máy chủ xác minh (email_verified, provider google.com, email trong `ADMIN_EMAILS`, không phải mail chính) rồi cấp custom token của uid chính → `signInWithCustomToken`; mọi dữ liệu/quy tắc/API theo uid chạy nguyên, không sao chép.
- Claim `linkedEmail` = mail Google thật; `src/lib/adminLink.ts` nhớ nó, `googleDrive.getDriveAccessToken` dùng Auth phụ `drive-token` (không đổi phiên) với login_hint mail đó — file Drive/Sheet của trường nằm ở mail trường.
- Dữ liệu đã tạo dưới uid riêng của mail trường trước ngày này: chủ dự án chốt BỎ (không chuyển). Chưa E2E trên production (cần đăng nhập Google thật bằng mail trường). Test: `admin-link.test.ts`, `adminLink.test.ts`.

## Báo cáo PH: "Kết quả theo yêu cầu cần đạt" thay danh sách chủ đề — 2026-09-30

Chủ dự án: rút gọn, viết chính xác bằng ngôn ngữ Toán học; số dòng phụ thuộc YCCĐ; căn cứ CT GDPT 2018 + SGK Kết nối tri thức + LO TDS.
- `src/lib/curriculum/yccdToan.ts`: YCCĐ lớp 10 (75 mục, lời Chương trình TT 32/2018; mục phép toán vectơ tách theo bài SGK; `sgk` = bài KNTT, không chép chữ sách). **Lớp 11, 12 chưa có** → báo cáo khối đó vẫn chỉ soạn nhận xét như cũ.
- Bằng chứng = từng câu của bài ĐÃ DUYỆT trong kì (`buildRequirementEvidence`, mã `b2q3`). "AI soạn nháp" (một lượt, JSON) trả nhận xét + ghép câu→YCCĐ + ghi chú; máy chủ bỏ mã bịa và TỰ TÍNH mức (≥80% Vững, ≥50% Đang hình thành) — `parentRequirements.ts`.
- Lưu cùng nhận xét ở `parentReportNotes.requirements`; GV đổi mức/sửa ghi chú/bỏ dòng (`RequirementLinesEditor`). PDF + xuất cả lớp dùng bản đã lưu; chưa có thì danh sách chủ đề cũ cắt còn 6.
- **Bẫy đã sửa (QA Codex 30/09):** lượt AI JSON có từng câu + 75 YCCĐ chạy lâu hơn 15s → Vercel 504. `api/classroom.ts` maxDuration 15→60; gọi AI có `timeoutMs` 50s, quá giờ trả 504 kèm lời dặn (lỗi khoá/ví vẫn ném lên như cũ).
- Dữ liệu rút từ PDF Chương trình (pdftotext; kí hiệu font Symbol U+F022 ∀, F024 ∃, F0CC ⊂, F0C9 ⊃, F0C6 ∅, F0B0 ° phải đổi tay) rồi soát tay; nguồn: memory `nguon-yccd-lo-sgk`. Test: parentRequirements 6, builder +1, printDoc +2, API +2.

## Cổng HS mở được khi trình duyệt đang đăng nhập GV/admin + 2 tài khoản admin + đọc Excel nhiều trang — 2026-09-30

- **Cổng /lop chạy trên app Firebase riêng** (`STUDENT_PORTAL_APP` trong `src/lib/firebase.ts`, chọn theo `location.pathname` lúc nạp module): phiên ẩn danh HS lưu ở khoá `firebase:authUser:<apiKey>:student-portal`, không đè phiên Google GV. Phiên HS cũ (ẩn danh ở `[DEFAULT]`) được chép sang một lần → HS không phải nhập lại PIN. Vào /lop bằng điều hướng trong app → `StudentPortalPage` tự tải lại 1 lần. Đã thử dev: tách khoá đúng, chép phiên đúng, reload 1 lần không lặp. **Chưa làm:** chế độ HS của live lesson (`StudentLiveView`) vẫn chặn phiên GV (chung đường dẫn với GV nên không tách theo path được).
- **Admin = 2 tài khoản của chủ dự án**: `ADMIN_EMAILS` thêm `cuong.vuviet@thedeweyschools.edu.vn`; `_ai-keys.ts` tra uid của mọi email admin (cache mỗi phiên máy chủ) → dùng khoá chung + miễn trừ ví như `exemptUids`. Dữ liệu (lớp, giáo án, cài đặt) VẪN tách theo từng tài khoản.
- **Đọc Excel cho lịch năm học/PPCT** (`sheetText.ts` + `readWorkbookText`): ô lấy dạng hiển thị (ngày ra ngày, không ra số 46297), trang liên quan xếp trước rồi mới cắt theo giới hạn. File lịch thật 15 trang: AI (3.7-flash) ra 48 mục, tuần 1 = 17/8, đủ ngày nghỉ (31/8–2/9, 2/10, 24/11, 23/12–1/1, 22/1, Tết 3–10/2, 22/3, 16/4, 30/4, 3/5).

## Hồ sơ năng lực HS tự điền cùng GV (+ AI soạn nháp cho GV) — 2026-09-30

Chủ dự án chốt: tab "Năng lực toán học" của file mẫu đưa lên trang HS (mục riêng dưới Bảng điểm); HS sửa phần mình, GV sửa tất; xuất file: HS nền vàng, GV nền xanh (trùng mức: vàng viền xanh, chú thích ở ghi chú ô A3).
- Dữ liệu `competencyPortfolios/{classId}__{studentId}` chỉ qua `api/_portfolio.ts` (gộp vào `classroom`): `studentPortfolio`/`saveStudentPortfolio` (lớp + mã HS lấy từ `studentLinks`, chỉ nhận ô HS), `teacherPortfolio`/`saveTeacherPortfolio` (GV thuộc lớp, HS phải có trong lớp). Lọc chung `sanitizePortfolioPatch` (đúng khối, đúng ô, chữ ≤500). Lưu đọc-sửa-ghi, không transaction: HS và GV lưu cùng lúc thì bản sau thắng (theo từng năng lực gửi lên).
- Mỗi năng lực: mức HS tự đánh giá, Mục tiêu, Phương án, Thời gian (tháng năm học), Khó khăn, Tiến độ (Đã hoàn thành/Đang thực hiện/Chưa thực hiện — đúng danh sách chọn file mẫu), mức GV chốt (trống = mức app tính từ bài đã duyệt), Ý kiến GV.
- Hướng dẫn: mô tả 4 mức NGUYÊN VĂN file mẫu (`levelDescriptions.ts`, 29 cái chép 30/09 + `rubric` 9 cái app bổ sung), gợi ý từng ô + nút "Gợi ý" (`portfolioGuide.ts`, không AI, chỉ điền ô trống). GV: "AI soạn nháp" (`portfolioDraftPrompt.ts`, `callAI` bằng cài đặt của GV) điền mức chốt + ý kiến + ô HS còn trống, KHÔNG đè chữ HS; GV soát rồi "Lưu hồ sơ". Đã thử Gemini thật: nháp hợp lý.
- Xuất (`portfolioExport.ts`): thêm cột G..L, đặt lại danh sách chọn cột "Thời gian" theo năm học (file mẫu còn ghi tháng 2024–2025). Nút xuất khoá khi còn thay đổi chưa lưu.
- **QA production bởi Codex (30/09)**: hồ sơ GV (nháp AI, lưu, xuất 2 màu + 9 dòng bổ sung + .xlsx) PASS; hồ sơ HS (PIN, Gợi ý, Lưu) PASS; SSM điểm LO 10Olinda F1 PASS; lịch báo giảng FAIL → đã sửa: sổ ghi "(tiết 5/6)" trong khi tin ghi "Tiết 6/7" vì tds-g10 tiết 17 ("Tiết 1: Định lý cosin") mang nhầm tên bài → `lessonPeriodNumber` ưu tiên "Tiết N" trong nội dung tiết, đếm chuỗi cùng tên chỉ là dự phòng (MOET không ghi). Còn BLOCKED: AI đọc lịch năm học (Sheet trường chặn congapro60@gmail.com — dùng tài khoản trường), fallback 3.8→3.7 chưa gặp 503 thật.
- Trước QA: chưa E2E trên trình duyệt (trang HS cần phiên HS thật, trang GV cần đăng nhập GV). Đã render test `PortfolioEntryEditor` + test API/lõi. Nghiệm thu: `npx vitest run src/lib/classroom/competency api/__tests__/portfolio.test.ts src/components/features/classroom/PortfolioEntryEditor.test.tsx`.

## Khung năng lực khối 10 đủ theo LO SSM + xuất hồ sơ bổ sung dòng + tải .xlsx — 2026-09-30

Chủ dự án chốt: SSM khối 10 có 19 LO mà khung chỉ 8 năng lực (AI ghép LO được 10/19) → thêm 9 năng lực `g10-*` (hàm số & đồ thị, BPT bậc hai, đếm/tổ hợp, Newton, GTLG 0–180°, vectơ tọa độ, PT đường thẳng, đường tròn, conic), mỗi cái có `rubric` 4 mức (file mẫu trường CHƯA có các dòng này). Sau đó AI ghép 19/19 (khối 11: 19/20 — thiếu "Hoạt động thực hành và trải nghiệm"; khối 12: 17/17).
- Xuất hồ sơ (`portfolioExport.ts`): `buildPortfolioAddRowsRequests` chèn dòng cho năng lực bản sao chưa có — đúng mảng, sau năng lực đứng trước trong khung, `copyPaste` định dạng/danh sách chọn của dòng bên cạnh, điền A..F — rồi mới bôi vàng (1 batchUpdate). File mẫu gốc KHÔNG đụng. Hộp kết quả có nút "Tải file .xlsx về máy" (`downloadPortfolioXlsx`, Drive export) để GV thay file trên Drive trường.
- BTVN: gắn nhãn AI/tay tự dùng khung mới. **Bẫy:** bài khối 10 đã DUYỆT nhãn trước đây giữ nguyên nhãn cũ (guard `competencyTagsApproved`) — muốn thêm năng lực mới phải sửa tay trong ô nhãn.
- Chưa chạy xuất thật trên production (cần GV bấm, popup Google). Test: framework, portfolioExport +4.

## Model Gemini mặc định = gemini-3.8-flash — 2026-09-30

Chủ dự án chốt (3.7 hay 503 quá tải). `DEFAULT_GEMINI_RUNTIME_MODEL` + `DEFAULT_DATA.settings` + FormatAgent + khoá HS + tạo mô phỏng (client & `api/generate-simulation.ts`) → 3.8; `GEMINI_RUNTIME_MODELS` giữ 3.7 ngay sau làm dự phòng (`callGeminiAIRaw` tự lùi model khi lỗi). **Bẫy:** cài đặt GV lưu cả `selectedModel` → `withCurrentDefaultModel` (useAppState) chuyển đúng giá trị mặc định cũ `gemini-3.7-flash` sang 3.8 khi nạp (không phân biệt được ai CỐ Ý chọn 3.7). Bảng giá đã có 3.8. 3.8 cũng lúc lúc 503. Test `useAppState.defaultModel.test.ts`.

## Lịch báo giảng + SSM đợt 2 (điểm LO, soạn sẵn nội dung) — 2026-09-29

Chủ dự án muốn: GV đưa tài liệu sẵn có (file/link) → app viết hộ → GV tự chép/tải, tự đưa lên SSM. Web sẽ PUBLIC nên mọi thứ phải chung cho mọi trường (dữ liệu Dewey chỉ là mẫu thử).
- **Mục "Lịch báo giảng"** (thanh bên; `LessonScheduleTab` + `components/features/lessonSchedule/*`, lõi thuần `src/lib/schedule/*`): bộ lịch (TDS/MOET… GV tự đặt tên, TKB + PPCT riêng) = nhiều TKB theo quý + lớp + PPCT + phân môn từng ô → tin tuần gửi PH (sửa được, chép) + sổ báo giảng Excel khuôn MOET (tuần / cả năm).
  - TKB: link Prime Timetable → `api/_timetable.ts` (action `fetchPrimeTimetable`; chỉ `primetimetable.com/api/v2/timetables/{uuid}/`; cần đăng nhập GV; trang không có CORS nên máy chủ tải hộ). GV nhận theo mail rồi theo tên bỏ dấu; giờ thật lấy từ TÊN tiết theo cấp ("MHS:8:10-8:50"), tiết đôi `length:2`. Không dùng Prime → nhập tay.
  - Lịch năm học + PPCT của trường: file Excel/Word/PDF hoặc link Google (đọc bằng quyền Drive của GV, `sourceText.ts`) → AI (`callAI`) → bảng GV soát. Chỉ loại "HS nghỉ" làm mất tiết; tuần nghỉ trọn T2–T6 tự không đánh số.
  - Luật xếp (`lessonCalendar.ts`, khớp cách GV làm tay): tuần N nhận tiết PPCT tuần N + tiết dồn; ô gán phân môn lấy đúng mạch, hết thì Tự chọn; **Tự chọn là tiết đệm — không xếp được thì BỎ, không dồn** (PPCT đặt Tự chọn vào tuần có lễ); bài học bị dồn thì báo GV. Nhãn "(tiết N)"/"(tiếp)": các lần cùng tên cách ≤1 tuần PPCT là một chuỗi.
  - Cấu hình lưu **localStorage theo uid** (`lich-bao-giang:v1:<uid>`) — đổi máy/trình duyệt phải nhập lại.
- **Tab SSM trong lớp** (`SsmPanel` + `SsmDraftCards`): điểm LO — file hoặc LINK file mẫu SSM (`api/_ssm-template.ts` tải hộ `cdn-ssm.edufit.vn/export/evaluation/*.xlsx`) → AI ghép LO↔năng lực → gợi ý thang 4 (điểm/2,5, khớp mức gần nhất) → GV sửa → tải file đã điền (SSM đã nhận file này); 3 thẻ soạn sẵn báo giảng/BTVN/nhận xét để chép. App KHÔNG ghi gì vào SSM.
- **Bẫy:** PPCT `tds-g10` có 6 tiết (g12: 1) phân môn "Tự chọn" nhưng `isElective=false` — UI đã loại khỏi danh sách phân môn, file gốc chưa sửa. Dev proxy `/api` sang production nên nút tải TKB chỉ thử được sau deploy. Git for Windows 2.56 (tự cập nhật 29/09) chuyển sang thư mục `ucrt64`; trong lúc đang cài thì bash/https chưa chạy — chờ cài xong là ổn, không cần sửa tay.
- QA production 29/09 (tài khoản GV thật): tải TKB TDS qua máy chủ OK, tin tuần 5 trùng ảnh mẫu. Sửa sau QA: so tên GV không kể thứ tự chữ (tên Google "việt cường vũ" ↔ TKB "VŨ VIỆT CƯỜNG"), chữ ký mặc định = tên TKB viết hoa chữ đầu. Bước AI đọc Google Sheet cần popup cấp quyền Google — chỉ người dùng bấm tay mới mở được.
- Kiểm trên dữ liệu thật: tin TDS 10Olinda tuần 5 trùng ảnh mẫu GV; sổ MOET tuần 1/4/5/6 trùng file LBG của GV (10Olinda + 11Columbus); Excel đọc lại đúng. `ai-gateway-handler` vẫn chập chờn khi chạy cả bộ (chạy riêng pass).
- Nghiệm thu: `npx vitest run src/lib/schedule src/lib/ssm api/__tests__/timetable.test.ts api/__tests__/ssm-template.test.ts`; `npm run lint`, `npm run lint:api`, `npm run build`.
