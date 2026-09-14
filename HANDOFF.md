# HANDOFF — Soạn giáo án / lớp học / chấm AI
**Cập nhật:** 2026-09-14
**Repo:** `soangiaoan` · **Nhánh chuẩn:** `main`
**Production URL:** https://giaoandewey.vercel.app

Snapshot trạng thái hiện tại. Lịch sử dài đã chuyển vào [`docs/HANDOFF-ARCHIVE.md`](docs/HANDOFF-ARCHIVE.md); chi tiết commit xem `git log`.

## CI đỏ #540–#542 — test liveLesson cũ, đã sửa — 2026-09-14

Quality Gate hỏng từ `dc1f29c` (kéo theo `161a4d7`/`aafd7c7`): **lint qua, 6 test fail**. Mã nguồn đúng, test chưa theo kịp:

- `liveLessonService.test.ts` (4): `updateLiveLessonState` giờ chạy **transaction** đọc phiên + ghi `cueStartedAt`/`cueElapsedSeconds` (đồng hồ cue giữ được khi tạm dừng; rules đã có 2 trường). Mock `tx.get` cũ luôn trả "không tồn tại" → sửa mock định tuyến theo path, cập nhật kỳ vọng payload.
- `languagePack.test.ts` (2): bản EN cố ý **giấu dấu `≤`** ở `cp-model` (HS tự chọn dấu) và HS2 đổi thành "one personal goal" → cập nhật assertion.
- Phần sửa lấy từ bản dở của Codex trong worktree `codex-classroom-grading` (nhánh `codex/p31-classroom-ready`), **bỏ** test mới về nhiệm vụ nhóm P31 vì phụ thuộc nội dung chưa commit. Khi Codex commit, hai file test này sẽ trùng hunk — merge sạch hoặc lấy bản Codex.
- Nghiệm thu: full Vitest **1961/1961**, `lint` 0.

## Hạn BTVN lấy từ app + chống #ERROR! khi ghi hạn — 2026-09-14

QA production tính năng đồng bộ BTVN phát hiện: **hạn ở dòng 5 hiện `#ERROR!`** trên cả 7 cột tab `10. OLINDA`. Nguyên nhân gốc: app ghi hạn bằng công thức `=DATE(2026,9,16)+TIME(8,0,0)` dùng dấu **phẩy**, nhưng file đặt ngôn ngữ Việt lại đòi dấu **chấm phẩy** → công thức vỡ. App đọc lại ra "không có hạn" → **không tính được Nộp muộn / Chưa làm**, chỉ điền Đủ cho em nộp đúng hạn.

**Đã sửa (commit `c70b290`):**

- `deadlineFormula` → **`deadlineSerial`**: ghi hạn thành **SỐ ngày kiểu Sheets (serial)** kèm định dạng `DATE_TIME` (`buildSheetRequests`). Số không lệ thuộc dấu phân cách nên chạy đúng mọi ngôn ngữ; ô vẫn hiển thị ngày giờ.
- `planSheetSync` **ưu tiên hạn từ app** cho cả cột đã có sẵn (trước chỉ dùng dòng 5 của sheet). Nếu app có hạn mà ô dòng 5 đang trống/lỗi/khác thì ghi đè bằng hạn app. Thêm đếm `deadlineWrites` + dòng "sửa X hạn" trong bản xem trước.

**Ngưỡng sắp cắn người:**

- Ghi hạn là **số + numberFormat**, KHÔNG phải công thức nữa. Ai đổi lại sang `formulaValue` sẽ tái hiện `#ERROR!` trên file ngôn ngữ Việt.
- Ghi đè hạn dòng 5 chỉ khi app có hạn và ô lệch >1 phút — hạn app là chuẩn (chủ dự án chốt). Nếu tổ trưởng tự đặt hạn khác trong sheet thì sẽ bị hạn app ghi đè; đây là ý muốn.
- File 1 (11 Columbus) nếu dòng 5 đang là công thức chạy được và trùng hạn app thì **không** bị ghi đè (surgical).
- Nghiệm thu bản này: `sheetSync.test.ts` **41 tests PASS**, `lint` 0, `lint:api` 0, `build` PASS. (6 fail liveLesson lúc đó đã sửa ở mục CI phía trên.)

## Đồng bộ BTVN sang Google Sheet — 2026-09-11 (đã QA production 09-14)

Nút trong app, chỉ chạy khi giáo viên bấm. Tuỳ chọn theo lớp, mặc định tắt. Kế hoạch đầy đủ và khảo sát hai file thật của chủ dự án nằm ở `tasks/todo.md`.

**QA production 2026-09-14 — đã nối cả 3 lớp, chưa ghi trạng thái nào cho tới khi chủ duyệt:**

- 10 Olinda → file 2 `1AMNFsVJ…` / tab `10. OLINDA` — khớp **19/19** (sau khi thêm em mới Nguyễn Công Bảo Khánh vào cột B của sheet).
- 11 Columbus → file 1 `1INWzPG…` / tab `02. BTVN` — khớp **26/26** (ca đặc biệt, file riêng).
- 12 Toán LT1 → file 2 `1AMNFsVJ…` / tab `12. TOÁN LT1` — khớp **8/8**.
- Thử nối nhầm tab bản chiếu `11. COLUMBUS (LINK)` → app **từ chối đúng** (IMPORTRANGE).

**Kiến trúc:**

- Đồng bộ chạy **trong trình duyệt giáo viên**, bằng quyền Google của chính giáo viên — dùng lại `getDriveAccessToken()` của tính năng "Đẩy giáo án lên Drive". Không email robot, không token Google trên máy chủ.
- Máy chủ chỉ thêm action `setClassSheetSync` (lưu `classes/{id}.sheetSync`) trên `/api/classroom`. Không thêm Vercel function.
- `src/lib/classroom/sheetSync.ts` là toàn bộ phần quyết định (thuần, 41 test). `sheetsApi.ts` chỉ đọc ảnh chụp tab và gửi lệnh đã dựng. `SheetSyncPanel.tsx` là giao diện.

**Ngưỡng sắp cắn người:**

- **Cam kết "không động vào tab liên lạc phụ huynh, ghi chú học sinh, quỹ lớp, hạnh kiểm" nằm ở CODE**, không ở Google (Google cấp quyền theo cả file). Mọi lệnh ghi đi qua `assertWriteAllowed` + `applySheetRequests` kiểm `sheetId`. Ai thêm loại ghi mới phải thêm vào cổng này, không gọi `batchUpdate` thẳng.
- **Người sửa luôn thắng**: ghi chú `SmartPlan: <giá trị> · <giờ>` trên ô là trí nhớ của app. Ô khác giá trị ghi chú hoặc không có ghi chú = người đã chọn, không bao giờ ghi đè.
- **Không chèn/xoá cột**: hết cột trống đã định dạng sẵn thì báo. Chèn/xoá cột làm lệch công thức Hạnh kiểm. App **không tự xoá cột trùng** — chỉ liệt kê cho giáo viên tự xoá.
- **App KHÔNG tự thêm dòng học sinh**: em mới (có trong app, chưa có dòng trong sheet) bị bỏ qua, phải thêm tên vào cột B của tab trước (đã làm với Bảo Khánh).
- Chuỗi trạng thái phải đúng từng ký tự kể cả biểu tượng (`SHEET_STATUS`). "Chưa làm" chỉ ghi **sau** giờ ở dòng 5; không bao giờ ghi "Thiếu".
- **Phải bật Google Sheets API** trong dự án GCP `smartplan-ai-14200` (số `1030734458631`) — đã bật. `sheetsErrorMessage` báo đúng nguyên nhân kèm link nếu chưa bật.
- **Token Google chỉ sống ~1 giờ**; hết hạn thì app cần cấp quyền lại (popup) — bước này cần thao tác người (đăng nhập). Khi lái tab nền: đưa tab ra trước bằng CDP (`computer` screenshot) rồi bấm "thật" thì `reauthenticateWithPopup` tự xong nếu phiên Google còn.
- v1 chỉ bài giao nộp ảnh/file (`type !== 'exam'`, `purpose` = assignment). Đề online chưa lên sheet.
- Deploy làm hỏng tab đang mở → đã có `staleChunkReload.ts` tự tải lại một lần (chặn vòng lặp 30s).

## TV/HS — kết quả trực tiếp và nhịp 40 phút — 2026-09-13

- TV có biểu đồ theo hoạt động; GV và tv-control đều có nút công bố/ẩn. Chỉ owner đọc phản hồi để tổng hợp. Số người gửi không được coi là số người làm đúng.
- Hoạt động nhóm: HS chọn số nhóm 1–12; groupMemberships giữ riêng tư. TV nhận public/groupProgress gồm số thành viên và số người gửi theo nhóm, không tên/UID/bài làm.
- Đồng hồ dùng cueStartedAt + cueElapsedSeconds: tạm dừng giữ thời gian, tiếp tục cộng tiếp; bật/tắt thống kê không reset. TV/HS hiện khoảng phút dự kiến trong tiết.
- Chuyển cue và public state ghi cùng transaction; publisher kiểm tra lại cue/cờ công bố trước khi ghi.
- Phải triển khai firestore.rules cùng ứng dụng: clock có trường optional tương thích session cũ; thêm hai đường dữ liệu nhóm giới hạn quyền.
- Bổ sung luồng HS: nháp riêng theo session/uid/step, hỗ trợ diễn đạt 3 mức (từ khóa → khung câu → tự diễn đạt), đọc lại mục tiêu cá nhân cuối tiết. Nháp không tự đồng bộ/tự gửi.
- Triển khai 13/09: Firebase CLI đã phát hành firestore.rules tới smartplan-ai-14200 từ mã `161a4d7` (chỉ `firestore:rules`). Chưa xác nhận QA tiết học thực tế.
- ⚠ 6 test liveLesson (`languagePack`, `liveLessonService`) đang FAIL trên `origin/main` — cần chủ sở hữu xử lý riêng.
- Chi tiết: `docs/features/2026-09-11-live-activity-results.md`.
