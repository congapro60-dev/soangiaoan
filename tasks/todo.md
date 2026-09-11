# Đồng bộ BTVN sang Google Sheet (nút trong app) — KẾ HOẠCH, chờ duyệt — 2026-09-11

**Branch**: `feat/sheet-sync` · base `main` = `646527e`

## Đã chốt với chủ dự án

- Nút **trong app**, chỉ chạy khi bấm. Không chạy định kỳ.
- **Mỗi giáo viên tự cấp quyền** bằng tài khoản Google của mình; không dùng email robot của app.
- Bài giao trong app chưa có cột thì **app tự tạo cột**.
- Hai tab 10 Olinda và 12 Toán LT1 **được bổ sung `⏰ Nộp muộn`** giống file 11 Columbus.
- **Không động vào** tab liên lạc phụ huynh, ghi chú học sinh, quỹ lớp. Chỉ BTVN và logic đi kèm.
- Tính năng **tuỳ chọn theo lớp, mặc định tắt** — giáo viên khác không có sheet thì app chạy như cũ.

## Đã khảo sát (đọc thật hai file, không đoán)

- File 1 "11 Columbus | Quản lý lớp" là **nguồn** của 11 Columbus. Tab `02. BTVN`: dòng 3 Môn, 4 Nội dung,
  5 Hạn kiểm tra, 6 Link, 7 Tính lỗi?, 8–10 ô đếm, 11 tiêu đề, học sinh ở `B12:B37`, trạng thái ở `C12:BI37`.
- Tab `03. HẠNH KIỂM` đọc tab BTVN **bằng công thức** (`MATCH` tên ở cột B, `INDEX` dải `C12:BI37`, so ngày ở
  dòng 5). Sửa ô BTVN là hạnh kiểm tính lại ngay. App không cần và không được ghi vào tab Hạnh kiểm.
- File 2 "Theo dõi BTVN | 3 lớp": `10. OLINDA` (18 em, `C12:BJ29`) và `12. TOÁN LT1` (8 em, `C12:BJ19`) chấm thẳng
  tại file 2, cùng khuôn với file 1, **chưa có cột bài nào**, danh sách chọn **không có** `⏰ Nộp muộn`.
- `11. COLUMBUS (LINK)` trong file 2 là **bản chiếu một chiều** bằng `IMPORTRANGE('02. BTVN'!A1:BJ37)` từ file 1.
  Ghi vào đó là vỡ công thức.
- App đã có luồng lấy quyền Google của giáo viên (`src/lib/googleDrive.ts`, scope Drive, dùng cho "Đẩy giáo án lên
  Drive"). Quyền đó gọi được Sheets API → **dùng lại, không mở rộng thêm quyền, không phải cài đặt Google Cloud mới**.
- Vercel đang 12/12 function → đồng bộ chạy trong trình duyệt giáo viên; máy chủ chỉ thêm một action lưu cấu hình.

## Vùng được phép chạm — cam kết nằm ở code

Google cấp quyền theo cả file, không theo tab, nên giới hạn phải do code giữ. Mọi lời gọi Sheets API đi qua một
cổng duy nhất kiểm range; range ngoài danh sách bị chặn trước khi gửi, có test.

| | Được đọc | Được ghi |
|---|---|---|
| Tab đã nối | `A3:B11` (nhận diện mẫu), `B12:B<cuối>` (tên), dòng 3–6 các cột bài, ô trạng thái + ghi chú ô | Dòng 4–6 của **cột app tự tạo**, ô trạng thái `C12:<cuối>`, ghi chú trên ô app điền |
| Olinda, Toán LT1 (một lần, có xác nhận) | — | Danh sách chọn ô trạng thái (thêm `⏰ Nộp muộn`), công thức dòng 8 (đếm Đủ + Nộp muộn, y hệt file 1) |
| **Không bao giờ** | Tab khác | Cột A, B · dòng 1–2 và 7–11 · tab Hạnh kiểm, liên lạc PH, lưu ý HS, quỹ lớp · tab `(LINK)` |

## Nối sheet cho một lớp (làm một lần)

1. Trang lớp → **"Nối Google Sheet"** → dán link file → app liệt kê các tab → chọn tab.
2. App kiểm tab có đúng khuôn (nhãn cột A dòng 3–11). Sai khuôn → báo rõ, không lưu.
3. Tab là bản chiếu (`A4` là công thức `IMPORTRANGE`) → từ chối, nhắc nối file gốc.
4. Khớp tên học sinh app ↔ cột B (bỏ dấu, gộp khoảng trắng). Tên không khớp hoặc trùng → liệt kê cho giáo viên sửa.
5. Lưu vào lớp: `spreadsheetId`, tên tab, `gid`, người nối, thời điểm.

## Bấm "Đồng bộ sang Sheet"

1. Đọc các vùng cho phép.
2. **Khớp cột ↔ bài**: dòng 6 chứa link bài của app (`…?baiGiao=<id>`) là cột của bài đó. Cột không có link = cột tay,
   bỏ qua hoàn toàn.
3. **Cột tay trùng tên bài app** (vd cột D "BTVN Đại số 27/08/2026" đã gõ tay) → đề xuất **gắn link vào cột có sẵn**,
   không tạo cột trùng.
4. Bài app chưa có cột → **tạo ở cột trống đầu tiên** (dòng 3–6 đều trống) trong vùng đã định dạng sẵn. Điền Nội dung
   = tên bài, Hạn = hạn nộp (**giá trị ngày thật** vì công thức Hạnh kiểm so ngày), Link = link app. Môn để trống cho
   giáo viên. Hết cột trống → báo, **không chèn cột** (chèn cột làm lệch công thức và danh sách chọn).
5. **Tính trạng thái** mỗi em mỗi bài, theo hạn ở dòng 5 của sheet:
   - Có bài nộp trước hạn → `✅ Đủ`; sau hạn → `⏰ Nộp muộn`.
   - Không có bài + đã qua hạn → `❌ Chưa làm`; chưa qua hạn hoặc không có hạn → để trống.
   - Bài giao cho nhóm em → em ngoài nhóm `➖ Không áp dụng`.
   - `⚠️ Thiếu` → app **không bao giờ** ghi.
6. **Người sửa luôn thắng** — mỗi ô app điền được gắn ghi chú `SmartPlan: <giá trị> · <thời điểm>`:
   - Ô trống → app ghi.
   - Ô còn đúng giá trị trong ghi chú SmartPlan → app được cập nhật (vd `❌ Chưa làm` → `⏰ Nộp muộn`).
   - Ô có giá trị khác ghi chú, hoặc có giá trị mà không có ghi chú SmartPlan → **người đã chọn, không bao giờ động**.
   - Ghi chú đi theo ô khi chèn, xoá hay kéo cột, nên không lệch như lưu toạ độ ô trong database.
7. **Xem trước rồi mới ghi**: "Gắn link 2 cột có sẵn · Tạo 1 cột · Điền 31 ô · Bỏ qua 4 ô người đã sửa · 1 em không
   khớp tên" → bấm **"Ghi vào Sheet"**. Không bấm thì không ghi gì.
8. Ghi một lượt (`batchUpdate`), báo kết quả.

## Phạm vi v1

- Chỉ bài giao nộp ảnh/file. Đề thi online để sau.

## Việc

- [x] 1. Hàm thuần + test: nhận diện khuôn tab, khớp tên, khớp cột ↔ bài (link, rồi tên bài), tính trạng thái,
      quy tắc người sửa luôn thắng, cổng kiểm range — `src/lib/classroom/sheetSync.ts`, 36 test
- [x] 2. Lớp gọi Sheets API (đọc vùng, đọc ghi chú, `batchUpdate`) dùng token từ `googleDrive.ts` — `sheetsApi.ts`
- [x] 3. Action `setClassSheetSync` lưu cấu hình nối sheet vào lớp + trả về trong dữ liệu lớp — 5 test
- [x] 4. Giao diện `SheetSyncPanel` "Nối Google Sheet" + "Đồng bộ sang Sheet" (xem trước → ghi), đặt trên khung bài tập
- [x] 5. Bổ sung `⏰ Nộp muộn` cho tab chưa có — ô tích trong bản xem trước, mặc định bật
- [x] 6. `lint` 0 · `lint:api` 0 · test 1948/1948 · `build` ✓
- [ ] 7. Chủ dự án thử trên **bản sao** hai file trước khi nối file gốc

## Rủi ro đã biết

- Hộp cấp quyền Google ghi "toàn bộ Drive" vì tính năng đẩy giáo án đang dùng scope đó. Lô này không mở rộng thêm.
  Muốn thu hẹp về từng file thì sau này chuyển sang Google Picker + `drive.file`.
- Không thử được với sheet thật từ máy dev (token nằm trong trình duyệt giáo viên) → bước 7 bắt buộc.

## Review

(điền sau khi xong)

---

# Chuông thông báo cho học sinh — 2026-09-09

**Branch**: `feat/student-notifications` · base `main` = `b49fe2a`

## Yêu cầu

Giáo viên xoá bài của học sinh thì em phải biết bài bị xoá và cần nộp lại. Cổng học sinh có nút
chuông kiểu Facebook, liệt kê: nộp thành công, bị xoá bài, chấm xong có điểm, chấm lỗi, giáo viên
sửa/duyệt điểm. Giáo viên gõ được lý do khi xoá (không bắt buộc).

## Đã khảo sát

- **Nửa "yêu cầu nộp lại" đã chạy sẵn**: xoá bài nộp là document biến mất, `portalViewModel` tự
  trả về `todo` → "Nộp ảnh". Thiếu đúng phần nói cho em biết VÌ SAO.
- Xoá bài đi qua máy chủ (`handleDeleteSubmission` trong `api/classroom.ts`) → ghi thông báo được
  ngay tại đó, không cần đụng quyền Firestore.
- Học sinh đọc dữ liệu qua action `studentAssignments` / `studentSubmissions` trên `/api/classroom`
  — thêm action mới ở đó, KHÔNG thêm Vercel function (đang chạm trần 12).

## Quyết định thiết kế

**Chỉ lưu sự kiện xoá bài.** Bốn loại còn lại suy ra được từ chính bài nộp mà cổng học sinh đã
tải; lưu thêm bản sao chỉ tạo cơ hội cho hai nguồn lệch nhau. Bài bị xoá thì document biến mất,
không còn gì để suy ra — đó là lý do nó phải được ghi lại.

## Việc

- [x] 1. Collection `studentNotifications` + kiểu dữ liệu; máy chủ ghi khi xoá bài, kèm lý do
- [x] 2. Action `studentNotifications` cho học sinh đọc thông báo của CHÍNH em
- [x] 3. Hộp thoại xoá của giáo viên thêm ô "Lý do (tuỳ chọn)"
- [x] 4. Gộp thông báo đã lưu với sự kiện suy ra từ bài nộp thành một dòng thời gian
- [x] 5. Nút chuông + bảng thông báo + huy hiệu chưa đọc
- [x] 6. Thêm: dải nhắc ngay trên thẻ bài vừa bị xoá, không bắt em mở chuông mới hiểu
- [x] 7. `lint` 0 · `lint:api` 0 · test 1906/1906 · `build` ✓

## Review

**Chỉ lưu một loại sự kiện.** `studentNotifications` chỉ nhận `submission_deleted`. Bốn loại còn
lại (nộp xong, chấm xong, chấm lỗi, giáo viên duyệt) suy thẳng từ bài nộp trong `buildStudentFeed`
— giữ thêm bản sao trong Firestore chỉ tạo cơ hội cho hai nguồn nói khác nhau. Một bài chỉ sinh
một mục, lấy trạng thái mới nhất, nên bảng không thành chồng dòng cùng nói về một bài.

**Ghi thông báo sau khi xoá xong, và best-effort.** Ghi trước thì lỗi giữa chừng sẽ báo em bài đã
bị xoá trong khi nó còn nguyên. Lỗi ở bước ghi cũng không được biến một lượt xoá đã thành công
thành lỗi — chỉ log lại.

**Bảo mật**: action lọc theo `studentId` lấy từ `studentLinks` của phiên, không theo tham số client
gửi lên. Có test cho việc em này không đọc được thông báo của em khác.

**Mốc "đã đọc" để ở localStorage theo máy** — huy hiệu chưa đọc là tiện nghi của riêng máy em đang
cầm, không đáng thêm một lượt ghi máy chủ mỗi lần bấm chuông. Đổi máy thì đếm lại từ đầu.

**Đánh dấu đã đọc bằng mốc của mục mới nhất**, không phải "bây giờ": thông báo đến trong lúc bảng
đang mở vẫn được tính là chưa đọc ở lần sau.

**Chưa kiểm được bằng mắt**: cổng học sinh cần mã lớp + PIN thật mới vào được dashboard, nên tôi
không tự đăng nhập bằng dữ liệu thật. Đã xác nhận trang nạp sạch, không lỗi console, và toàn bộ
phần tính toán (dòng thời gian, bộ đếm chưa đọc, hai handler máy chủ) có test. Phần nhìn thấy của
chuông cần giáo viên mở thử trên máy thật.

---

# Báo cáo theo câu: gộp đúng câu + nội dung câu hỏi lưu sẵn — 2026-09-08

**Branch**: `fix/report-question-catalog` · base `main` = `4c64b8c`

## Ba lỗi đã xác định (đọc code đang chạy production)

1. **Một câu bị đếm thành nhiều câu.** `buildQuestionStats` gộp theo đúng chuỗi chữ AI tự đặt, chỉ cắt khoảng trắng ([classReportModel.ts:268](../src/lib/classroom/classReportModel.ts)). `Bài 3.5 – Ý 1`, `Bài 3.5 (Ý 1)`, `Bài 3.5 – Ý 1: Tính cos A` thành ba dòng. Hệ quả nặng: mọi tỉ lệ đều sai vì mẫu số bị xé — cùng một câu ra 100% và 50%.
2. **"Failed to fetch".** Nội dung câu hỏi KHÔNG được lưu ở đâu cả; mỗi lần mở báo cáo, trình duyệt mới tải đề gốc về rồi OCR tại chỗ ([ClassAssignmentReport.tsx:664](../src/components/features/classroom/ClassAssignmentReport.tsx)) — CORS chặn. Trong khi máy chủ ĐÃ đọc trọn đề ở nút "AI giải đề" rồi vứt đi ([grade-homework.ts:1301](../api/grade-homework.ts)).
3. **Khối cảnh báo in hai lần** + liệt kê đủ 20 nhãn câu → khối chữ lằng nhằng.

## Lô 1 — gộp câu + dọn giao diện

- [x] 1. `questionGroupKey()`: rút token cấu trúc, bỏ mô tả tự do
- [x] 2. `buildQuestionStats` gộp theo khoá đó; nhãn hiển thị lấy bản gọn nhất
- [x] 3. Bỏ khối cảnh báo in trùng; dịch lỗi tiếng Anh; gấp danh sách nhãn dài

## Lô 2 — danh mục câu hỏi dựng ở máy chủ

- [x] 4. Action `buildQuestionCatalog` trên `/api/grade-homework` (không thêm function): đọc đề bằng vision, tách từng câu kèm LaTeX, lưu `assignments/{id}.questionCatalog`
- [~] 5. "AI giải đề" lưu luôn danh mục — **BỎ CÓ CHỦ Ý**, xem phần Review
- [x] 6. Báo cáo đọc danh mục đã lưu; "Đọc lại đề" gọi máy chủ thay vì OCR trong trình duyệt
- [x] 7. `lint` 0 · `lint:api` 0 · test 1894/1894 · `build` ✓

## Review

**Lô 1** — `questionGroupKey` đọc nhãn từ trái sang, giữ giá trị của token cấu trúc và dừng ở từ mô tả đầu tiên. `Bài 3.5 – Ý 1 (Tính cos A)` và `Bài 3.5 (Ý 1)` cùng khoá `3.5:1`; `Bài 3.5` trơ trọi vẫn là `3.5` nên câu mẹ không bị nuốt vào câu con; `Bài 3.9a` khớp `Bài 3.9 – Câu a`. Nhãn không có số thì lùi về `normalizeQuestionKey` — trả khoá rỗng sẽ dồn mọi nhãn mô tả vào một dòng, sai nặng hơn hiện trạng.

**Lô 2** — máy chủ đọc đề một lần rồi lưu `questionCatalog` vào bài giao. Báo cáo đọc thẳng danh mục đó: hết tải file trong trình duyệt, hết OCR lặp lại, hết `Failed to fetch`, và công thức hiện đúng vì đã ở dạng LaTeX. Đã có danh mục thì trả lại luôn (`cached: true`), chỉ đọc lại khi giáo viên bấm.

**Việc 5 bỏ có chủ ý.** Nhét thêm một lượt gọi Gemini vào chính request "AI giải đề" là đẩy nó chạm trần 60 giây của Vercel — đúng cái bẫy vừa sửa sáng nay. Danh mục đọc theo yêu cầu, một lần cho mỗi bài giao, rẻ hơn và không đe doạ đường đang chạy tốt.

**Chưa làm**: cắt ảnh từng câu. Cần toạ độ từng câu trên trang; vision model trả khung không đủ chắc trên đề scan nghiêng và chữ Toán viết tay — cắt trúng nửa câu còn khó hiểu hơn không cắt. Chữ + LaTeX đã đủ dùng, vẫn giữ link mở ảnh đề để đối chiếu.

**Chưa cần sửa CORS của Storage** — trình duyệt không còn tải file đề nữa nên lỗi đó không còn đường xuất hiện ở báo cáo.

---

# Fix dứt điểm: bài nộp kẹt "Đang chấm" + "Lỗi" khi chấm AI — 2026-09-08

**Branch**: `fix/grading-stuck-lock` · base `origin/main` = `cc4f1b6`

## Bằng chứng production (đọc Firestore 08/09/2026)

- 15/50 bài gần nhất ở `status='grading'` mà `gradingRunId` VẪN CÒN → khoá chết, không worker nào mở.
- 06/09 15:18–15:25 UTC: 9 bài kẹt liên tiếp → một lượt "Chấm cả lớp" bị Vercel giết giữa chừng.
- Lỗi thật trong `errorMessage`/`lastGradingErrorRaw`: `"AI trả lời dài quá trần cho phép nên bị cắt giữa chừng"` → `finishReason = MAX_TOKENS`.
- 06/09 16:0x–16:37: 5 bài `"Gemini không thể xử lý yêu cầu lúc này"` → HTTP không ok mà code nuốt mất status code.
- Mốc giờ khớp chính xác ảnh giáo viên gửi (13:29 UTC = 20:29, 15:11 UTC = 22:11).

## Nguyên nhân gốc

1. **Khoá chỉ do worker mở.** `claimSubmissionForGrading` ghi `status='grading'`, chỉ nhánh `catch` mở khoá. Worker chết (Vercel 60s, HS tắt máy giữa chừng) → kẹt vĩnh viễn. Không `fetch` nào trong luồng chấm có timeout.
2. **`maxOutputTokens: 8192` quá chật** — token "suy nghĩ" cũng ăn vào trần này; retry dùng y nguyên cấu hình nên hỏng lần hai.
3. **`BATCH_SIZE = 2` không được áp dụng** — `handleGradeAssignment` cắt batch theo hạn mức ngày, một request cố chấm tới 22 bài.
4. **Bulk "Chấm AI" bỏ sót bài kẹt** (lọc `submitted | error`) → hiện "(0)" dù 8 bài đang treo.

## Việc cần làm

- [x] 1. Ngân sách 45s mỗi lượt chấm + timeout cho mọi `fetch`; hết ngân sách thì bỏ retry
- [x] 2. `maxOutputTokens` 8192 → 16384 (thử lại 24576) + prompt thử lại yêu cầu viết gọn
- [x] 3. Hạ ngưỡng khoá chết 10 phút → 2 phút (cả server lẫn client)
- [x] 4. Áp đúng `BATCH_SIZE` cho "Chấm cả lớp"; trả thêm `recovered` để một lần bấm là đủ
- [x] 5. Bulk "Chấm AI" và các nút từng dòng nhận cả bài `grading` đã quá hạn
- [x] 6. Ghim model chấm = `gemini-3.8-flash` trong code, bỏ env override
- [x] 7. Ghi mã HTTP của Gemini vào thông điệp lỗi
- [x] 8. `lint` 0 · `lint:api` 0 · test 1873/1873 · `build` ✓

## Review

**Đổi gì** — 8 file, +221/−54. Bốn cổng kiểm tra đều pass.

`api/_grading-core.ts`: `callGeminiVision` nhận `timeoutMs`, bọc `fetch` trong try/catch và dịch abort thành lỗi đọc được; thông điệp lỗi HTTP kèm mã trạng thái; `GRADING_MODEL` ghim cứng.

`api/grade-homework.ts`: `GRADING_BUDGET_MS = 45s` tính từ lúc đặt khoá, truyền phần thời gian còn lại xuống từng lượt gọi; bỏ lượt thử lại khi không còn đủ giờ; `STALE_GRADING_MS` 2 phút; `BATCH_SIZE` được áp thật; trả thêm `recovered`.

`submissionSelection.ts`: thêm `isGradableNow` — bài `grading` quá hạn cũng là bài chấm được. Dùng cho bộ đếm nút "Chấm AI" và bulk.

`AssignmentPanel.tsx`: các nút từng dòng (Sửa điểm / Duyệt / Xóa điểm / Xóa lượt nộp) chỉ khoá khi máy ĐANG thật sự chấm.

**Test mới**: `api/__tests__/grade-homework.deadline.test.ts` (5 ca) khoá cả hai nguyên nhân gốc — Gemini treo thì bài phải mở khoá chứ không nằm lại "Đang chấm"; trần token phải > 8192; lượt thử lại phải rộng hơn và đòi viết gọn; lỗi HTTP phải lộ mã trạng thái.

**Chưa làm, có chủ ý**: không đặt `thinkingConfig` để chặn token "suy nghĩ" — không có khoá Gemini để thử ở máy này, mà tham số không được model chấp nhận thì trả 400 và chết TOÀN BỘ đường chấm. Nới trần token là cách an toàn hơn cho cùng triệu chứng. Nếu vẫn còn `MAX_TOKENS` sau lô này thì đó là bước tiếp theo, và lúc đó phải thử trên preview trước.

**Còn lại cho chủ dự án**: xoá biến `GRADING_MODEL` trong Vercel nếu còn đặt (giờ code không đọc nữa, nhưng để lại thì gây hiểu nhầm).

---

# AI grading quick/thorough modes — 2026-09-07

- [x] Add gradeOne tests: quick skips transcription, thorough stores transcription, student actor is forced quick.
- [x] Update `api/grade-homework.ts` to whitelist mode, default quick, force students/batch quick, and pass mode to the grading worker.
- [x] Update `src/services/gradingApi.ts` and teacher/student callers to send the intended mode.
- [x] Run `npm run lint`, `npm run lint:api`, `npm run test -- --run`, and `npm run build`.
- [x] Do not commit, push, deploy, delete broadly, or touch files outside grading mode scope.

# P0 — Khôi phục nội dung câu hỏi từ PDF/Word/ảnh trong báo cáo (2026-08-28)

# Live Lesson V4 Service Pilot — 2026-08-28

## Scope

- [x] Study `liveLessonService`, singleton Firebase wiring, current `firestore.rules`, rules-test shapes, and emulator config.
- [x] Add only permitted local pilot wiring: auth emulator in `firebase.json`, `vitest.pilot.config.ts`, `test:pilot` script.
- [x] Create `test/pilot/liveLessonServicePilot.test.ts` driving the real service against Firestore/Auth emulators, with REST bypass seeding.
- [x] Create `qa_artifacts/live-lesson-v4/service-pilot-report.md` with checks and run instructions.
- [x] Run `npm run test:pilot` and capture output; do not use browser, deploy, push, or production data.

## Review

- [x] `npm run test:pilot` PASS: 1 file, 1 test.
- [x] All service allow-path operations logged PASS; deny-path `permission-denied` checks logged PASS.
- [x] No production wiring/rules/service/API/V4 contract files edited.

## Constraints

- Do not edit `src/lib/firebase.ts`, `src/services/liveLessonService.ts`, `firestore.rules`, `api/`, or V4 contract files.
- Only local emulator; no real student data.
- Deny-path evaluator traces are acceptable; all allow-path operations must succeed.

---

# Đẩy giáo án lên Drive + chọn bài theo PPCT — 2026-08-11

- [x] TDD parser nhãn `Phần/Tự luận` và dòng chi tiết neo ngay dưới câu được chọn.
- [x] TDD reader PDF chữ, PDF scan, ảnh và Word có ảnh; OCR chỉ chạy khi thiếu chữ.
- [x] Nối reader lazy vào báo cáo giáo viên, cache trong phiên, không ghi bài nộp/điểm.
- [x] Chạy focused/full test, lint, lint:api, build, diff check và QA read-only.
- [ ] Chờ lệnh riêng mới push/deploy.

Plan: `docs/superpowers/plans/2026-08-28-class-report-question-source-ocr.md`.

## Review/verification — khôi phục nội dung câu hỏi từ nguồn gốc

- Đã sửa trong branch `codex/class-report-collaboration`; chưa push `main`, chưa deploy.
- Thống kê theo câu nay chèn dòng chi tiết ngay sau câu được chọn trong cùng bảng; hover/focus/click vẫn giữ, click có thể ghim và có nút đóng.
- Khi catalog thiếu, chỉ lúc giáo viên mở câu mới tải nguồn đề `http(s)` ở chế độ read-only; ưu tiên `sourceText`/chữ PDF-Word, sau đó đọc ảnh scan/ảnh nhúng DOCX và gọi Vision OCR một lần cho các câu còn thiếu. Kết quả chỉ nằm trong snapshot bộ nhớ hiện tại và có cache/retry; không ghi Firestore, Storage, bài nộp, điểm hoặc nhận xét.
- Parser giữ ngữ cảnh `Phần II/III`, nhận alias `Tự luận – Bài 1`/`Bài 1 (TL)`, hỗ trợ tiêu đề Markdown do OCR trả về; nội dung/đáp án đi qua `NhanXetMarkdown` + KaTeX.
- Guard an toàn: URL chỉ `http(s)`, tối đa 8 nguồn/6 ảnh, file tối đa 20 MB, nguồn treo bị ngắt sau 20 giây; cảnh báo không làm mất số liệu hoặc liên kết đề gốc.
- Focused cuối: **4 files / 50 tests PASS**; full Vitest sau thay đổi timeout: **103 files / 1.370 tests PASS**.
- `lint`, `lint:api`, `npm run build` và `git diff --check`: PASS. Build vẫn hiện cảnh báo chunk lớn/dynamic import vốn có; chunk entry hiện khoảng 1,45 MB, không phải lỗi build và không liên quan dữ liệu lớp.
- Local browser smoke: trang landing tải được, không có console error/warning; chưa có authenticated E2E cho màn hình báo cáo và không dùng dữ liệu thật của lớp 11 Columbus.

# P0 — Báo cáo thủ công và cộng tác giáo viên (2026-08-27)

- [x] Duyệt spec và tạo worktree sạch từ `origin/main`.
- [x] Nút **Tạo báo cáo** tính lại báo cáo với 0 hoặc nhiều lượt nộp, giữ snapshot khi lỗi.
- [x] Membership giáo viên: mời bằng email, co-owner, chuyển quyền, rời/xóa thành viên.
- [x] Nối quyền server-side cho lớp/bài giao/lượt nộp/báo cáo; giữ nguyên namespace dữ liệu cũ.
- [x] Đổi tên lớp, học sinh, bài giao; sửa điểm/nhận xét có history và yêu cầu duyệt lại.
- [x] Hỗ trợ nhất quán bài nộp ảnh và bài online; không lộ đáp án cho học sinh.
- [x] Chạy focused/full tests, lint, lint:api, build và diff check.
- [ ] QA bằng phiên đăng nhập thật/Ox Alpha: Chrome connector không khả dụng; Ox Alpha đã lỗi provider hai lần, chưa có verdict PASS.
- [ ] Chưa push/deploy cho tới khi có lệnh tích hợp riêng.

## Review/verification — báo cáo thủ công và cộng tác giáo viên

- Đang triển khai trong branch `codex/class-report-collaboration`.
- Spec: `docs/superpowers/specs/2026-08-27-class-report-collaboration-design.md`.
- Plan: `docs/superpowers/plans/2026-08-27-class-report-collaboration-plan.md`.
- Tạo báo cáo: có thể ép tính lại cho bài chưa có lượt nộp; lỗi nguồn không thay snapshot đang hiển thị; hỗ trợ dữ liệu bài ảnh và bài online.
- Cộng tác: quyền được kiểm tra ở API Admin; mời co-owner, chuyển quyền sau khi chấp nhận, rời lớp, xóa thành viên; bảo vệ chủ gốc và không xóa dữ liệu bài nộp.
- Đổi tên: giữ nguyên `classId`/namespace và lưu `previousNames` để ghép bài online legacy sau khi đổi tên; đổi tên học sinh/bài giao không tạo ID mới.
- Chấm: co-owner đi qua cùng cổng AI/manual/duyệt/xóa điểm; sửa tay lưu history và buộc duyệt lại; AI regrade lỗi không làm mất điểm cũ.
- Bằng chứng tự động cuối: focused `4 files / 40 tests` pass; full `100 files / 1,344 tests` pass; `lint` pass; `lint:api` pass; `npm run build` pass; `git diff --check` pass.
- QA trình duyệt: local app tải được và không có console error ở smoke unauthenticated; Chrome connector báo `Browser is not available: chrome`, nên chưa thể xác nhận luồng đăng nhập thật/production.
- Ox Alpha Free/OpenCode: model `opencode/x-preview-f-free` đã được gọi nhưng provider trả lỗi `Unexpected server error` ở refs `err_81d184c4` và `err_a6cfdca1`; không dùng làm verdict PASS.

# P0 — Tương thích công thức cũ trong nhận xét chấm (2026-08-25)

- [x] Tái hiện lỗi dữ liệu cũ mất dấu `\\` ở `in/subset/cap` trong màn hình nhận xét.
- [x] Viết test đỏ/xanh cho chuỗi hình học cũ và kiểm tra không đổi câu thường.
- [x] Khôi phục toán tử dạng chữ có điều kiện trong module math duy nhất; không sửa dữ liệu/điểm đã lưu.
- [x] Targeted 27/27, full Vitest 85 files/1,208 tests, `lint`, `lint:api`, `build`, `git diff --check` và Ox Alpha Free QA PASS.
- [ ] Push/deploy sau khi có lệnh tích hợp riêng.

## Review/verification — tương thích công thức cũ

- Chuỗi `D in SA, SA subset (SAB) => D in (SAB)` được chuyển thành vùng KaTeX an toàn ở lớp hiển thị.
- Câu thường như `Học sinh in bài rồi.`, `Fill in the blanks.` và `Please log in now.` giữ nguyên; `repairMathString` không đổi dữ liệu nguồn cũ.
- Chỉ thay đổi `src/lib/adaptive/mathText.ts` và test của module; không chạm Firestore, Storage, submission, grade hay production.

# P0 — Bộ lọc lịch sử lượt nộp giáo viên (2026-08-25)

- [x] Chốt spec: mặc định chỉ lượt mới nhất; lịch sử vẫn giữ nguyên và mở được khi cần.
- [x] Test đỏ/xanh cho projection `latest`/`all`.
- [x] Code bộ lọc và giới hạn “Chọn lượt đang hiển thị” theo đúng projection.
- [ ] Chạy full test, lint, lint:api, build, QA độc lập và push `origin/main`.

# P0 — Báo cáo tổng hợp theo từng bài giao (2026-08-25)

- [x] Duyệt spec và mô hình hóa số liệu latest/official, phân bố điểm, câu hỏi, lỗi, chủ đề và khuyến nghị.
- [x] Code báo cáo read-only cho bài nộp ảnh/AI và đề online; thêm CSV tổng hợp và nối vào màn hình lớp học.
- [x] Siết privacy/identity: không xuất dữ liệu riêng; không gán dòng đầu khi trùng tên; thang điểm online lấy từ cấu hình đề.
- [x] Focused 23/23, full Vitest 85 files/1.207 tests, lint, lint:api, build, diff check và Ox Alpha Free QA PASS.
- [x] Merge vào `main` và push `origin/main` ở `c50e09a`; HTTP smoke production trả 200; không thao tác dữ liệu lớp 11 Columbus.
- [ ] Xác nhận Vercel deployment của `c50e09a` ở trạng thái Ready/Production khi có CLI hoặc dashboard khả dụng.

# P0 — Công thức nhận xét và chẩn đoán nộp trùng (2026-08-25)

- [x] Test đỏ rồi xanh: công thức ở `Bài làm của em` và `Đáp án / mốc cần đạt` đi qua KaTeX.
- [x] Sửa renderer, chạy targeted test xanh.
- [x] Kiểm chứng một lần chọn nhiều ảnh chỉ tạo một lượt nộp; phân biệt với nộp lại/bổ sung ảnh.
- [x] Không tái hiện race/double-submit; giữ nguyên guard UI và không thêm dedupe có thể làm mất nộp bổ sung hợp lệ.
- [x] Chạy full test/lint/build/diff check và Ox Alpha QA; chưa push/deploy khi chưa có lệnh riêng.

# Classroom learning loop — 2026-08-24

## P0 follow-up — camera upload queue cho 11 Columbus

- [x] Bổ sung addendum queue vào spec đã duyệt.
- [x] Viết test đỏ cho append nhiều lần, cap số file và remove theo index.
- [x] Code queue UI: preview/count, chụp thêm, xóa, submit một lần, giữ queue khi lỗi.
- [x] Chạy targeted/full test, rules, lint, build và diff check; chưa push/deploy.
- [ ] Authenticated browser E2E với tài khoản học sinh 11 Columbus trước gate deploy.

## P0 follow-up — giáo viên chọn/xóa lượt nộp cũ

- [x] Bổ sung addendum vào spec: checkbox mọi lượt; bulk delete mọi lượt đã chọn; Chấm AI/Duyệt chỉ lượt mới nhất.
- [x] Viết test đỏ cho phạm vi selection xóa bao gồm lượt cũ nhưng selection chấm/duyệt vẫn chỉ hiện hành.
- [x] Mở khóa checkbox lượt cũ, đổi select-all theo toàn bộ lượt, và bulk delete đúng các `submissionId` đã chọn.
- [x] Xác nhận bằng bulk delete chỉ xóa lượt thành công; lượt lỗi còn lại để thử lại.
- [x] Chạy full test/build/diff check và Ox Alpha Free audit trên diff kết hợp trước gate deploy.
- [ ] Authenticated browser E2E xác nhận tick/xóa lượt cũ trong tài khoản giáo viên trước khi deploy.

## P0 follow-up — bổ sung ảnh sau khi đã chấm

- [x] Bổ sung addendum vào spec và viết implementation plan cho revision `supplementOf`.
- [x] Test đỏ rồi xanh: server ghép file cũ + mới đúng thứ tự, kiểm tra quyền parent, bài đóng, URL ngoài và Storage shared-reference khi xóa.
- [x] Code server action tạo revision an toàn; mở rộng rules đúng field; grade revision bằng toàn bộ evidence.
- [x] Code UI `Bổ sung ảnh và chấm lại`, giữ parent/queue, retry và lựa chọn tự chấm/gửi giáo viên.
- [x] Full unit/rules/lint/build/diff check; Ox Alpha Free đã được gọi nhưng lượt audit combined cuối bị provider network error nên không dùng verdict PASS giả định.
- [ ] Authenticated browser E2E: bài đã chấm → bổ sung ảnh → chấm lại toàn bộ → refresh thấy revision mới.

## P0 follow-up — vòng đời kết quả chấm an toàn dữ liệu

- [x] Duyệt thiết kế: xóa kết quả chấm nhưng giữ submission/Storage; sửa tay phải duyệt lại; AI regrade non-destructive.
- [x] Viết spec/implementation plan: `docs/superpowers/specs/2026-08-24-grade-result-lifecycle.md`, `docs/superpowers/plans/2026-08-24-grade-result-lifecycle.md`.
- [x] Viết test hồi quy cho history, sửa tay, xóa điểm, payload không hợp lệ và AI regrade thất bại.
- [x] Code server actions/UI; không thêm Vercel Function, không migration production.
- [x] Full unit/rules/lint/build đã xanh; Ox Alpha/OpenCode được gọi đúng model và audit cuối đạt PASS.
- [ ] Merge `codex/classroom-ai-detailed-grading` vào `main`, push/deploy sau khi QA đạt.

## Phạm vi đã duyệt

- [x] Profile evidence tương thích ngược: không xóa topic chưa được đánh giá, phân biệt cùng assignment nộp lại, ghi nhận strengths.
- [x] Practice set/attempt: học sinh trả lời được, lưu được, chấm được, không nhận solution trước.
- [x] Student assignment projection không lộ đáp án/hướng dẫn chấm.
- [x] Recovery submission kẹt `grading`.
- [x] QA độc lập bằng Ox Alpha và preflight/test/rules/build.

## Ràng buộc production

- Assignment 11 Columbus đang hoạt động; không reset/xóa/migrate phá hủy.
- Không thêm Vercel Serverless Function.
- Không push `main` hoặc deploy nếu chưa có lệnh riêng.

## Ghi chú thực thi

- Mọi thay đổi production code phải có test đỏ trước.
- Nếu test/rules fail, dừng để chẩn đoán root cause, không chồng patch.

## Review/verification

- Profile evidence: hỗ trợ dữ liệu legacy và `evidenceRefs`, thay thế đúng khi học sinh nộp lại cùng assignment, xóa theo `submissionId`, ghi nhận `strengths` và practice evidence idempotent.
- Practice: private answer key, public hint-only projection, canonical question IDs/scores, quota reservation transaction, attempt lock/idempotency và không trả solution trước khi chấm.
- Privacy/rules: student assignments/submissions đi qua server projection; raw assignment/submission và practice collections bị chặn theo rules; projection không chứa answer key, rubric, instructions, teacher notes.
- Recovery: stale `grading` query không bị giới hạn batch, có composite index, kiểm tra transaction lần cuối trước khi reset.
- Verification hiện tại: targeted supplement/delete `17 tests` pass; full unit `74 files / 1,088 tests` pass; rules `7 files / 240 tests` pass; `lint` pass; `lint:api` pass; `npm run build` pass; `git diff --check` pass (chỉ cảnh báo LF/CRLF). Browser local tải `/lop` tới màn nhập mã lớp, không có console error; chưa chạy authenticated E2E vì chưa có xác nhận action-time để nhập PIN học sinh. Ox Alpha Free focused audit cuối kết thúc `Provider finish_reason: network_error`; không có verdict combined hợp lệ.
- Giới hạn còn lại: practice quota được reserve trước AI nên lần gọi AI thất bại vẫn tiêu quota; leak detection là heuristic chống lộ trực tiếp, chưa chứng minh semantic equivalence; chưa authenticated E2E/production và chưa push/deploy.

## Review/verification — vòng đời kết quả chấm (2026-08-25)

- Targeted lifecycle/hardening: 5 files / 37 tests pass; full unit: 82 files / 1,129 tests pass; rules: 7 files / 242 tests pass; `lint`, `lint:api`, `build`, `git diff --check` pass.
- Invariant đã kiểm: sửa tay lưu history và buộc duyệt lại; xóa điểm không đụng submission/ảnh/file/Storage; AI lỗi giữ grade cũ; history client-deny; ownership và trạng thái `grading` bị chặn.
- Ox Alpha Free/OpenCode: model `opencode/x-preview-f-free` được xác nhận là “Ox Alpha Free (Unlimited)”; audit cuối đạt PASS trên 7/7 hạng mục.

## Hardening sau review — trước merge/deploy (2026-08-25)

- [x] Thêm claim token + transaction finalize: worker AI cũ không thể ghi đè sau stale recovery/manual edit/delete.
- [x] History dùng khóa revision ổn định; history và submission grade hiện hành commit cùng transaction.
- [x] Khóa chéo lớp/học sinh/bài giao cho thao tác sửa/xóa điểm; chặn học sinh chấm đè kết quả đã duyệt.
- [x] Chặn xóa cả bài và khóa sửa/duyệt/chấm lại trên UI trong lúc `grading`; sau xóa reload lại dữ liệu server.
- [x] Đưa duyệt/bỏ duyệt điểm qua server transaction, đồng bộ profile/evidence và chặn approve khi `grading`; bulk approve chỉ nhận lượt `graded`.
- [x] Test hồi quy hardening: `30 tests` targeted pass; full unit `82 files / 1,129 tests`, rules `7 files / 242 tests`, `lint`, `lint:api`, `build`, `git diff --check` và Ox Alpha Free audit đều đạt; production mới chỉ QA read-only, chưa claim authenticated E2E.
## Trạng thái kiểm soát

`READY_FOR_CONTROLLED_SCALE` — chưa phải `READY_FOR_MASS_PRODUCTION`.

Các report kiểm chứng: `qa/reports/content_gates_regression_post_regen_pilot.json`, `qa/reports/regression_post_regen_pilot.json`, `qa/reports/batch01_regen4_v3_verifier_final.json`.

Các artifact hỗ trợ: `temp/tds_staging/batch_2026-08-20_regen4_v3/visual_results.json`, `qa/reference/batch01_regen4_v3_lesson_content_maps.json`, và 4 DOCX trong thư mục staging tương ứng.


## Lô F — Regen5 pilot sau false negative P060 — 2026-08-20

- [x] Audit false negative: gate Activity–Phiếu–Teacher Key trước đó chưa chứng minh mismatch thực sự.
- [x] Cài `triangle_symbol_consistency_pass` với quy ước `a↔A`, `b↔B`, `c↔C` và các góc xen giữa.
- [x] Cài `given_quantity_reassigned=0`, kiểm đồng bộ Activity–Phiếu–Teacher Key và `geometry_recomputation_pass`.
- [x] Sửa generator/rule P060: `b=9`, `c=12`, `A=90°`, `a=15`, `S=54`; đồng bộ activity, GHI BẢNG, Phiếu HS, Teacher Key, map và geometry contract.
- [x] Sửa generator/rule P056: `5,33` chỉ còn trong lời giải sai có bước sai cụ thể; chốt `n∈N`, `n_max=5`.
- [x] Chỉ regenerate P056/P060; giữ nguyên P055/P057.
- [x] Render exact regen5 và visual QA 100%: P055 8 trang, P056 8 trang, P057 7 trang, P060 8 trang; không clipping/overlap/leakage.
- [x] Content-gate regression: `negative_fixtures_all_expected=true`, `positive_fixtures_all_pass=true`, `regen5_all_pass=true`, `overall_pass=true`.
- [x] Regression 19 case: `negative_fixture_all_expected=true`, `gold_locked_all_pass=true`, `all_test_cases_pass=true`.
- [x] Tạo báo cáo `qa/reports/batch01_regen5_pilot_handoff_2026-08-20.md`.
- [x] Không promotion, không chạy Batch 02, không sửa GOLD_LOCKED, không move/delete artifact.
- [ ] Chờ người dùng duyệt regen5 pilot.


## Lô G — Promotion staging Week56 G11–G12 sau duyệt — 2026-08-20

- [x] Kiểm tra AGENTS, thư mục production đích và danh sách canonical IDs cần thay.
- [x] Đối chiếu SHA-256 staging với production candidate; tạo backup có timestamp, không xóa file cũ.
- [x] Thay có kiểm soát chỉ các file Tuần 5–6 Khối 11–12; không chạm Khối 10.
- [x] Hậu kiểm số lượng, SHA-256, tên file, backup và ghi biên bản promotion; không thay file ngoài scope.
- [ ] Chờ xác nhận cuối từ người dùng sau khi gửi biên bản.

Trạng thái: promotion đã hoàn tất và hậu kiểm PASS; backup vẫn được giữ nguyên, không xóa file cũ.

---

## Lô H — Soạn lại 32 giáo án G11–G12 Tuần 5–6 theo mẫu Ban Toán — 2026-08-22

- [x] Đọc `docs/KE_HOACH_FIX_G11_G12_W5_W6.md` và đối chiếu mẫu Ban Toán Khối 10 Tuần 5–6.
- [x] Tạo staging mới, backup 32 file cũ, không sửa `src/`/PPCT JSON.
- [x] Soạn lại đủ 32 DOCX theo bố cục Ban Toán, có Phiếu 1–2 và Teacher Key.
- [x] QA XML/CIS: 32/32 PASS; QA theo tuần: 4/4 PASS.
- [x] Render trực quan: 32/32 DOCX, 276 trang PNG, kiểm tra contact sheet và trang đại diện.
- [x] Ghi đè đúng 32 file đích; checksum staging–đích khớp 32/32.
- [x] `npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai" run build` PASS; chỉ còn cảnh báo chunk/import vốn có.

Backup bản cũ: `C:\Users\ADMIN\AppData\Local\Temp\smartplan-ban-toan-backup-20260822-084004`.

## V3 Live Lesson Firestore realtime — baseline 2026-08-25

- [x] Worktree riêng: `codex/g10-p31-firestore`.
- [x] `npm run lint`: PASS.
- [x] `npm run lint:api`: PASS.
- [x] `npm run build`: PASS; chỉ còn cảnh báo Vite chunk/dynamic import đã có từ trước.
- [x] Full Vitest baseline: 64 test files, 1013 tests passed.
- [ ] Baseline còn 1 test timeout có sẵn ngoài phạm vi V3: `api/__tests__/ai-gateway-handler.test.ts` — SSE raw `[DONE]` sentinel timeout ở 5 giây.
- [x] `npm install` trong worktree bị treo; đã dừng an toàn và dùng junction tới dependency tree đã có ở checkout chính. Bản cài dở được giữ ngoài workspace tại `C:\Users\ADMIN\AppData\Local\Temp\smart-lesson-plan-ai-node_modules-incomplete-20260825`.

## Task 8 — Close-session progress bridge — 2026-08-25

- [x] Sửa bridge theo response contract canonical thực tế: route P16 là response server-confirmed, exit-ticket là `responseType: text`; validate definition và từng response; xử lý toàn bộ submissions; timestamp retry lấy từ session closed/updated timestamp.
- [x] Nối close flow vào action của `/api/adaptive-progress` để server xác minh token, session closed, teacher ownership, class ownership, `studentLinks` và roster trước khi ghi từng record ready.
- [x] Tạo/reuse profileRecord server-side hợp lệ, không bịa objective mastery; chỉ ghi khi lesson đã published/portal-enabled; UI phân biệt eligible/saved/failed/incomplete.
- [x] Viết hướng dẫn vận hành tiếng Việt tại `docs/features/08-live-lesson-realtime.md`, gồm route, laptop/TV/Vcast/thiết bị HS, launch/close, troubleshooting và fallback V2.
- [x] Focused live/API/route verification 42/42 pass; full Vitest 76 files/1110 tests pass; `lint`, `lint:api`, `build` pass. Build chỉ còn warning chunk/import vốn có.
- [x] Rules: chạy trực tiếp Vitest Rules suite trên Firestore Emulator đang chạy đúng worktree — 8 files/260 tests pass. Wrapper `npm run test:rules` không dùng được vì nó cố khởi động thêm emulator trên cổng 8080.
- [x] Không deploy/push; commit riêng sau khi các gate trên có evidence.

### Task 8 review evidence — 2026-08-25

- Focused route/API set: 4 files / 42 tests PASS: live definition, progress bridge, adaptive-progress API, StudentLiveView.
- Full Vitest: 76 files / 1110 tests PASS.
- `npm run lint` và `npm run lint:api`: PASS.
- `npm run build`: PASS; Vite chỉ cảnh báo module externalized/chunk >500KB và index chunk hiện có.
- Rules direct run: 8 files / 260 tests PASS trên emulator PID 18096 đã chạy với đúng `firestore.rules`; wrapper `npm run test:rules` bị chặn do cố bind lại cổng 8080.
- Server mapping evidence: roster doc ID được dùng để kiểm link, adaptive ID là `${teacherUid}_${normalizeStudentCode(roster.code)}`; route lấy từ response server hoặc trusted profile, thiếu cả hai trả `incomplete`.

## Task 9 — Seed bài pilot vào danh sách Bài học phân hoá — 2026-08-26

- [x] Xác định root cause: gói runtime `g10_w5_p31_bpt_tiet1` chỉ nằm trong source, chưa có document `adaptiveLessons` cho tài khoản giáo viên.
- [x] Viết test đỏ/xanh cho bản `AdaptiveLesson` pilot đúng mã `tds-g10-30-pilot`, tiêu đề, lớp 10, 40 phút, nội dung BPT và trạng thái published.
- [x] Thêm nút `Cài bài demo G10 P31` ngay trong trang Quản lý bài học phân hoá; sau khi lưu, bài xuất hiện như một dòng bài bình thường.
- [x] Sửa API tiến trình để tìm document theo `lessonId` trước, vẫn tương thích document legacy theo UID giáo viên.
- [x] Targeted 14/14, full Vitest 97 files/1307 tests, rules 8 files/264 tests, lint, lint:api và build PASS; chỉ còn cảnh báo Vite vốn có.
- [x] Commit `c6eec47` và bản sửa type `069da51`; deployment cuối `dpl_AMePBtDn2e6HuRyaDgXaQ23TxEuW` báo `READY` và đã alias vào `https://giaoandewey.vercel.app`.
- [x] Authenticated browser smoke test: nút hiện ngay trong trang `Bài học phân hoá`; bấm cài thành công, bài `Bất phương trình bậc nhất hai ẩn — Tiết 1` / `tds-g10-30-pilot` xuất hiện ở dòng đầu với các thao tác `Mở bài`, `Xem cổng`, `Mở tiết trực tiếp`, `Xóa`.

## Task 10 — Sửa quyền tạo phiên pilot theo contract — 2026-08-26

- [x] Tái lập lỗi production bằng ca test đúng bộ `allowedStepIds` canonical của G10 P31: 9 bước, có THINK và `route`; test đỏ trước khi sửa.
- [x] Sửa `firestore.rules` tối thiểu: giới hạn 9 bước và giữ `THINK`/`route` trong allowlist; không mở thêm field/quyền khác.
- [x] Rules Emulator xanh: 8 file / 299 test trên nhánh tích hợp.
- [x] Chạy full unit, lint, build và kiểm tra diff.
- [x] Deploy Firestore Rules lên `smartplan-ai-14200`, xác minh release production và smoke test tạo phiên.

## Task 11 — Ổn định listener thống kê TV — 2026-08-26

- [x] Production smoke phát hiện TV báo lỗi stats ngay ở `lobby` dù phiên tạo thành công.
- [x] TDD: test UI và Rules đỏ trước khi sửa; nguyên nhân là TV subscribe khi `showStats=false` và Rules chặn document stats chưa tồn tại.
- [x] Sửa tối thiểu: TV chỉ subscribe khi `showStats=true`; Rules cho phép đọc document stats còn thiếu nhưng vẫn kiểm tra đầy đủ document khi đã tồn tại.
- [x] Targeted UI test 4/4 và Rules 8 file / 266 test PASS.
- [x] Chạy full unit, lint, build và kiểm tra diff.
- [x] Deploy Vercel frontend + Firestore Rules và smoke test lại TV/HS.

## Task 12 — Ổn định timestamp sau điều khiển phiên — 2026-08-26

- [x] Production smoke tái lập lỗi: bật thống kê làm UI báo `updatedAt must be a Firestore Timestamp or finite number`.
- [x] TDD đỏ/xanh: service test kiểm tra cache có `updatedAt:null` và snapshot server đã xác nhận timestamp.
- [x] Sau `updateDoc`/đóng phiên, đọc lại snapshot bằng `getDocFromServer` trước khi chuẩn hoá và ghi public state.
- [x] Listener bỏ qua snapshot cục bộ đang `hasPendingWrites=true`, chờ bản server đã có timestamp trước khi chuẩn hoá.
- [x] Retry có điều kiện khi snapshot server vẫn chưa materialize `updatedAt`; không retry các lỗi dữ liệu khác.
- [x] TDD targeted service 16/16 PASS; full unit riêng 97 file / 1.309 test, `lint`, `lint:api`, `build` PASS; chỉ còn cảnh báo Vite vốn có. Full run song song từng có 1 ca SSE timeout do tranh chấp tài nguyên, đã loại trừ bằng run riêng.
- [x] Deploy bản sửa cuối lên Vercel `dpl_DAWLo3R3yuNom98BnDXgqUoNks3u` (`READY`, alias `giaoandewey.vercel.app`); release lại `firestore.rules` thành công và smoke GV → TV → HS không còn lỗi quyền/timestamp.

## Task 13 — Three-portal UX: mobile GV, fit-to-screen TV, class-context HS — 2026-08-26

- [x] Student link carries the selected class context; student selects a roster name and enters only PIN; creation is blocked when the class has no join code.
- [x] Teacher portal is mobile-first with the current cue and sticky previous/pause/next controls.
- [x] TV portal fits the public screen and five pilot metrics into one viewport without scroll.
- [x] Run focused/full tests, lint, API lint, build, diff check, browser smoke, independent reviews, then release evidence.

### Task 13 implementation evidence — 2026-08-26

- Focused live suite: 5 files / 29 tests PASS after the three-portal changes.
- Full Vitest: 98 files / 1322 tests PASS.
- `npm run lint`: PASS; `npm run lint:api`: PASS.
- `npm run build`: PASS; Vite only reported existing chunk/dynamic-import warnings.
- `git diff --check`: PASS.
- Local browser route smoke reached the live route but could not read the historical session because Firestore returned `Missing or insufficient permissions`; no visual PASS is claimed from that route.
- Vercel deployment `dpl_5PwBUAn4bsV2rEeVvumZEQnC7mjg` is `READY / Production` at `https://giaoandewey.vercel.app`; HTTP smoke `/` and a live route both returned 200.

## Task 14 — Report request storm + classroom/grading/student QA — 2026-08-27

- [x] Xác định production gọi lặp `/api/classroom`; không phải AI sinh báo cáo chậm.
- [ ] TDD lỗi dependency không ổn định và request treo.
- [ ] Sửa tối thiểu, không migration/ghi/xóa dữ liệu lớp.
- [ ] QA lớp học, giao/nộp bài, chấm điểm và giao diện học sinh theo rủi ro.
- [ ] Review độc lập, full gates, push main, production smoke chỉ đọc.
- [ ] Báo cáo lỗi còn lại và đề xuất nâng cấp.

## Task 15 — Khuyến nghị dạy học có bằng chứng — 2026-08-27

- [x] Tách nhãn trung tính như "Không có" khỏi thống kê lỗi và khuyến nghị.
- [x] TDD khuyến nghị phải nêu dữ liệu, ưu tiên, hành động trên lớp, thời lượng và cách kiểm tra lại.
- [x] Sinh khuyến nghị theo điểm lớp, độ phủ nộp bài, câu/chủ đề/lỗi yếu; không suy diễn khi thiếu bằng chứng.
- [x] Hiển thị bản tiếng Việt giáo dục rõ ràng, đọc được trên màn hình báo cáo.
- [x] Chạy focused test, lint, lint:api, build và rà soát diff.

## Task 16 — Ma trận tiến độ học sinh theo bài giao — 2026-08-27

- [x] Tái sử dụng snapshot báo cáo đã tải; không gọi thêm API và không sửa dữ liệu.
- [x] Hiển thị ma trận học sinh × bài giao: thiếu/nộp/chờ chấm/đã duyệt, điểm và số lượt nộp.
- [x] Có tổng hợp theo từng học sinh: số bài đã nộp, tỷ lệ hoàn thành, điểm trung bình chính thức.
- [x] Có lọc/tìm kiếm và bảng cuộn ngang để dùng được khi lớp nhiều học sinh/bài.
- [x] TDD model ma trận, build kiểm tra UI và chạy các gate trước khi bàn giao.

## Task 17 — Xem nội dung câu hỏi và ảnh bài nộp — 2026-08-27

- [x] Trong báo cáo, di chuột/bấm vào số câu để mở nội dung câu hỏi thật; không suy đoán khi nguồn không có cấu trúc.
- [x] Với đề online và đề upload có chữ, hiển thị nội dung qua renderer công thức chuẩn; với ảnh scan, cho mở đề gốc.
- [x] Thay việc mở từng ảnh bài nộp bằng một trình xem ảnh có Trước/Sau, số thứ tự và phím tắt.

### Review/verification — các nâng cấp báo cáo và xem ảnh

- Focused: 4 file test / 37 test pass (`questionCatalog`, `classReportModel`, `classProgressModel`, `ClassAssignmentReport`).
- `npm run lint`: PASS; `npm run lint:api`: PASS; `npm run build`: PASS.
- `git diff --check`: PASS; build chỉ còn cảnh báo Vite chunk/dynamic import vốn có.
- Chưa chạy authenticated browser E2E; chờ người dùng tự QA sau deployment.

## Live Lesson V4 Task 3 — Language/glossary privacy — 2026-08-27

- [x] Đọc Task 3 plan, design sections 6/6.2/6.3/11.3, V4 contract/package và pattern test thuần hiện có.
- [x] Viết test trước cho `languageSupport` và `glossary`: enum giới hạn, preference hợp lệ được reuse, default `vi_anchor`, draft/retired không ra student runtime, ký hiệu Toán giữ nguyên.
- [x] Cài `src/lib/liveLesson/v4/languageSupport.ts` và `glossary.ts` thuần, không gọi AI và không suy ngôn ngữ thành năng lực.
- [x] Thêm helper/test thuần cho `StudentLiveView`: first-run choice, chip đổi ngôn ngữ, popup glossary, trạng thái offline `Đã lưu trên máy`.
- [x] Sửa `liveLessonService` chỉ gửi/lưu `languagePreference` enum size-limited; không gửi support plan/PIN/private data.
- [x] Thêm helper/test thuần cho `TeacherLiveView`: summary nhu cầu riêng tư aggregate, không nhãn công khai năng lực/ngôn ngữ.
- [x] Nghiệm thu: chạy full liveLesson suite theo lệnh user và `npm run lint`.

### Review — Live Lesson V4 Task 3

- RED đã quan sát trước implementation: 5 file test mới/sửa fail vì thiếu module/export đúng kỳ vọng.
- Focused Task 3 tests: 5 files / 21 tests PASS.
- Full requested liveLesson suite: 12 files / 95 tests PASS.
- `npm run lint`: PASS (`tsc --noEmit`).
- Không sửa `firestore.rules`, `TvLiveView`, v4 contract/package Task 1/2 hoặc deploy/push.

## Live Lesson V4 Task 10 — deterministic multi-client E2E — 2026-08-28

- [x] Create pure anonymous fixture `test/fixtures/g10-p31-v4-anonymous.json` with 3 scripted students and no real names.
- [x] Create `test/e2e-v4-live-lesson.mjs` using only relative imports into this worktree and real V4 lib functions.
- [x] Assert 9 required checks: teacher projection, TV public projection, student projection, language/glossary/evidence neutrality, grouping approval, post-check integrity, offline queue, TV privacy, timeline integrity/timing budget.
- [x] Create QA docs under `qa_artifacts/live-lesson-v4/` with coverage table and manifest.
- [x] Verify `npx tsx test/e2e-v4-live-lesson.mjs` exits 0 and prints each PASS line.
- [x] Verify `npm run build` still passes; do not modify contract, `firestore.rules`, or `api/`.

## V4 final local QA checkpoint — 2026-08-29/30

- [x] Fix `closeLiveLessonSession`: do not write the public projection after closing revokes public Rules access.
- [x] Add guarded dev-only emulator wiring; production path remains unchanged when `VITE_USE_EMULATOR` is off.
- [ ] Browser wiring/service smoke against Auth/Firestore Emulator is PASS; three-viewport teacher/TV/student flow is not claimed.
- [x] Rules suite: 8 files / 299 tests PASS; deny-path evaluator traces remain explicitly documented, no zero-trace claim.
- [x] Regression: response `languagePreference` can be updated after an existing response, while the validator still rejects unsupported/private fields.
- [x] Full unit suite: 133 files / 1635 tests PASS.
- [x] Service pilot: 13/13 checks PASS; deterministic V4 E2E: 9/9 checks PASS.
- [x] `lint`, `lint:api`, and `build` PASS.
- [x] Write `qa_artifacts/live-lesson-v4/browser-pilot-report.md` with evidence and limits.
- [ ] Real teacher-authenticated staging smoke and Vercel deployment/HTTP smoke remain pending; push to `main` is a separate release gate.

### Integration QA — 2026-08-30

- [x] Reconciled V4 commits onto `origin/main` in isolated worktree `codex/v4-main-integration`.
- [x] Fixed integration compile regressions, restored the THINK prerequisite, made missing public stats reads safe, and aligned the TV fixture with canonical screen `S8A`.
- [x] `npm run lint`, `npm run lint:api`, `npm run test`, `npm run test:rules`, `npm run test:pilot`, and `npm run build` pass on the integration worktree.
- [ ] Real teacher account, production/Vercel HTTP smoke, and human three-viewport classroom flow are still user-facing QA gates.

## V4 all Ban Toán W5–W6 — 48 lesson packages — 2026-08-30

Đặc tả: `docs/superpowers/specs/2026-08-30-live-lesson-v4-all-ban-toan-design.md`
Kế hoạch: `docs/superpowers/plans/2026-08-30-live-lesson-v4-all-ban-toan-plan.md`

- [ ] Chụp snapshot/provenance từ `LESSON_SPECS` hiện hành; không dùng `lesson-data.json` stale.
- [ ] Tạo adapter `LessonSpec → LiveLessonV4Contract`, đúng 2400 giây, formation/practice/elective-practice.
- [ ] Sinh registry/runtime artifact cho đủ 48 bài, giữ compatibility P31.
- [ ] Tích hợp lookup exact vào chức năng `Bài học phân hoá`, không match title mơ hồ.
- [ ] Giữ `languagePreference` là lựa chọn HS; glossary vi/en/ja/ko/zh và privacy allowlist.
- [ ] Tạo evidence/group proposal/post-check/offline cho từng gói; grouping phải chờ GV duyệt.
- [ ] Chạy focused tests → review độc lập → full lint/lint:api/test/build; chưa commit/push/deploy.
- [ ] Viết `tasks/session_v4_all_lesson_packages.md` sau khi kết thúc phiên.

## V4 three-portal QA continuation — 2026-08-31

- [x] Tái lập và sửa blocker Rules: checkpoint V4 canonical được allowlist đúng, vẫn giới hạn 9 bước.
- [x] Tái lập và sửa race listener HS sau anonymous sign-in: public projection không bị revoke chỉ vì auth state đổi.
- [x] Tái lập và sửa raw LaTeX trên TV/HS bằng renderer KaTeX dùng chung; thêm test chuẩn hóa công thức.
- [x] Browser pilot local dùng dữ liệu giả: GV điều khiển `P00 → P03 → P05 → P08 → P16 → P19 → P20 → P27`; TV và HS nhận realtime; HS gửi choice/text/post-check; TV chỉ hiện thống kê aggregate.
- [x] Visual QA TV/HS: công thức render đúng, TV không tràn khung ở viewport 1280×720; TV không hiện tên HS hoặc text phản hồi cá nhân.
- [x] Gates sau patch: `npm run lint`, `npm run lint:api`, `npm run test`, `npm run test:rules`, `npm run build` đều PASS.
- [ ] Chưa có real teacher-authenticated staging, Vercel/production HTTP smoke hoặc deployment; không được gọi là release production.

## V4 sequential publication — 2026-08-31

- [x] Thêm strict audit đối chiếu source/assessment/route/AI Error/40 phút/glossary trước publish.
- [x] Publish tuần tự một bài mỗi lần, skip bài đã published, chặn khác owner/foreign identity, tiếp tục và báo lỗi từng bài.
- [x] Thêm nút `Xuất bản tuần tự 48 bài`, progress `n/48` và thống kê published/skipped/audit fail/error trong Bài học phân hóa.
- [x] Emulator local: REST xác nhận 48/48 V4 document `published`, 48 source key duy nhất, tất cả 40 phút.
- [ ] Chưa publish Firestore production; cần deploy code trước rồi mới chạy nút trên tài khoản thật.

## Release QA: title/delete/self-study — 2026-08-31

- [x] Tiêu đề draft V4 dùng tên bài + `— Tiết N`, không dùng chuỗi kỹ thuật khó tìm.
- [x] Nút xóa giữ xác nhận rõ ràng, có nhãn truy cập và chỉ cập nhật danh sách sau khi Firestore xóa thành công.
- [x] Browser QA cổng tự học bằng dữ liệu tổng hợp: nhập thông tin → diagnostic → bài học → scaffold → 3 gói M/S/C → vận dụng → tổng kết → lưu tiến trình.
- [x] Phát hiện và sửa gói `Vận dụng` placeholder: converter dùng trực tiếp route task V4 khi lesson chưa có `practiceSet`.
- [x] Phát hiện và sửa công thức kết luận dài tràn ngang: tách các dòng công thức và giới hạn vùng MathJax trong card/vở ghi.
- [x] Chạy lại toàn bộ gate và push `main` thành công (`0a1f381`).

## V4 list UX — one real lesson list — 2026-08-31

- [x] Bỏ lưới catalog `G/W/P` khỏi màn hình chính; giữ catalog dưới dạng tóm tắt.
- [x] Đổi thao tác chính thành `Tạo và xuất bản 48 bài`, xử lý tuần tự và cập nhật bảng bài thật ngay sau từng bài.
- [x] Hiển thị metadata lớp/tuần/tiết dưới tên bài; giữ đủ Mở bài, Xem cổng, Mở tiết trực tiếp, Xóa.
- [x] Xóa state/handler/import chỉ phục vụ nút cài 48 nháp (`handleSeedV4Packages`, `seedingV4`, `v4SeedMessage`, `Plus`, `buildBanToanV4AdaptiveLessonDraft`, `getBanToanV4PackageMetadata`, `banToanV4Metadata`).
- [x] Viết test thuần: `shouldShowLiveLessonAction` cho pilot/V4/legacy, `getDeleteLessonConfirmation`, `resolveAdaptiveBuilderUrl`, `resolveAdaptivePortalUrl`.
- [x] Focused test: 2 files / 32 tests PASS; `lint` PASS.
- [x] Demo P31 `tds-g10-30-pilot` được nhận diện là source `10-5-31`, nâng cấp tại chỗ, không tạo bản sao; runtime launcher dùng V4 khi có identity nguồn.
- [x] QA pure state: published V4 formation/practice/elective và legacy P31 đều có runtime live; draft/archived bị chặn.
- [x] Gỡ catalog grid, giữ một bảng lesson thật và một nút `Tạo và xuất bản 48 bài`; focused 4 files / 49 tests PASS.
- [x] Full unit 145 files / 1.731 tests, Rules 8 files / 301 tests, service pilot 13/13, build và lint PASS sau thay đổi.
- [x] QA browser production sau deploy: xuất bản 48 document thật, bảng có 48 V4 + 3 bài cũ, P31 đúng 1 dòng; 48/48 có nút live, gồm Ôn tập/Tự chọn.
- [x] Chạy gate cuối, commit và push `main`; deployment `dpl_4Y5atCwE2sW2aUxMFWLtafsivYi5` READY.
