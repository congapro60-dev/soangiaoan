# Báo cáo cuối — Gửi Claude Code sửa lỗi

> Hợp nhất 2 nguồn kiểm thử độc lập:
> 1. **Claude (qua trình duyệt + đọc DOM iframe + đọc code)** — `docs/BAOCAO_KiemThu_HinhAnh_MoPhong.md`
> 2. **Antigravity (E2E toàn diện)** — `docs/BAOCAO_E2E_Full_Antigravity.md`
>
> Phạm vi: 2 commit `0ea1b20` (nối hình/mô phỏng vào bài Dewey) + `af497e2` (checkbox bật/tắt sinh mô phỏng).
> Mục tiêu kiểm thử: bài học phân hoá không còn "toàn chữ" — học sinh THẤY hình minh hoạ + mô phỏng tương tác BÊN TRONG bài.

---

## 1. KẾT LUẬN CHUNG

**Bản vá đạt mục tiêu chính.** Cả 2 nguồn đều xác nhận: hình minh hoạ (gallery + TikZ) và mô phỏng tương tác xuất hiện BÊN TRONG iframe bài học Dewey, MathJax render đẹp, không còn bài "toàn chữ", không có lỗi console liên quan render.

**Tuy nhiên có 3 lỗi cần sửa** (1 chặn luồng, 1 sai nội dung, và các lưu ý ổn định). Xếp theo mức ưu tiên ở Mục 3.

| Hạng mục | Claude | Antigravity | Chốt |
|---|---|---|---|
| Phần 1 — tầng hàm `verify_check.mts` | ĐẠT (ALL PASS) | ĐẠT | **ĐẠT** |
| Hình minh hoạ TRONG bài (vc-gallery) | ĐẠT (1 gallery trong iframe) | ĐẠT | **ĐẠT** |
| Mô phỏng tương tác (unit-simulation/sim-frame) | ĐẠT (3 sim, vanilla JS+SVG+slider, sandbox, không thư viện ngoài) | ĐẠT (kéo/xoay thật) | **ĐẠT** |
| TikZ→Kroki (step-illustration) | ĐẠT (5 ảnh, kroki 200) | ĐẠT | **ĐẠT** |
| MathJax | ĐẠT | ĐẠT | **ĐẠT** |
| Console/Network lỗi đỏ khi render | KHÔNG có | KHÔNG có | **Sạch** |
| Checkbox TẮT bỏ bước sinh mô phỏng | ĐẠT (không có bước "dựng mô phỏng") | ĐẠT (nhanh hơn) | **ĐẠT** |
| Mô phỏng ĐÚNG chủ đề môn học | — | **SAI** (XS ra mô hình 3D chóp) | **BUG #2** |
| Tải cổng học sinh khi KHÔNG đăng nhập | **LỖI** (Firebase permissions) | (load được vì còn session GV) | **BUG #1** |

---

## 2. BẰNG CHỨNG ĐÃ XÁC MINH (để Claude Code khỏi kiểm lại)

Bài kiểm thử: "Xác suất có điều kiện · Lớp 12", id `adaptive-1782220244414`, 5 mảnh.

Đọc trực tiếp DOM trong iframe `srcdoc` Dewey (same-origin):
```
.vc-gallery        : 1
.unit-simulation   : 3   (sim-frame iframe: 3) — mảnh 3,4,5 có sim
.step-illustration : 5   (đều <img src="https://kroki.io/tikz/svg/…">)
sim-frame          : sandbox="allow-scripts"; có <script>+<svg>+type=range+onclick;
                     KHÔNG thư viện ngoài; KHÔNG <img> URL ngoài
MathJax            : script tex-mml-chtml.js có trong iframe; công thức render đẹp
Console errors     : 0 (khi đang ở màn bài học)
kroki.io           : ép tải 1 ảnh → 200 OK (387×60); các ảnh khác lazy-load
```
Mô phỏng mảnh 3 ("Công thức nhân xác suất"): 2 thanh trượt (Số bi Xanh / Số bi Đỏ) + sơ đồ cây SVG hiển thị P(B)=3/5, P(A|B)=2/4 — tính đúng theo slider. Antigravity xác nhận thêm: mô phỏng 3D kéo/xoay mượt.

Pipeline có cơ chế **guard chất lượng** chạy đúng: banner "⚠️ Cảnh báo chất lượng (1) — `sim_2_skipped`: mô phỏng mảnh 'Tính xác suất … qua bảng tần suất 2 chiều' không đạt chuẩn tương tác, đã bỏ qua." → loại sim kém, fault-isolated, không vỡ bài. Antigravity ghi nhận pipeline xử lý lỗi Quota Gemini (429) tốt.

Checkbox TẮT: chuỗi tiến độ đi thẳng "mảnh 1/4 → mảnh 2/4" **không có** bước "Đang dựng mô phỏng tương tác cho mảnh i/N" (BẬT thì có cho từng mảnh).

---

## 3. CÁC LỖI CẦN SỬA (theo ưu tiên)

### 🔴 BUG #1 — CHẶN LUỒNG: Cổng học sinh không tải được khi chưa đăng nhập (Firestore rules)

**Triệu chứng:** Mở `/adaptive-portal/{lessonId}` trong tab/phiên KHÔNG có đăng nhập giáo viên → màn "Chưa tìm thấy bài học — Không tải được bài học phân hoá từ hệ thống". Console:
```
[ERROR] src/pages/AdaptiveStudentPortalPage.tsx:343
Không tải được cổng học sinh FirebaseError: Missing or insufficient permissions.
```
(Khi publish xong mở ngay trong tab giáo viên thì load được — vì còn session đăng nhập. Antigravity cũng test trong trạng thái còn session nên không gặp. Học sinh thật quét QR sẽ là **ẩn danh** → bị chặn.)

**Nguyên nhân:** `firestore.rules` dòng ~39-41:
```
match /adaptiveLessons/{lessonId} {
  allow read: if request.auth != null;   // ⛔ học sinh ẩn danh bị chặn
  ...
}
```
Collection `adaptiveLessons` chỉ cho đọc khi đã auth, nhưng cổng học sinh là công khai.

**Đề xuất sửa (chọn 1):**
- (a) Cho đọc công khai CÓ ĐIỀU KIỆN: `allow read: if request.auth != null || resource.data.portalEnabled == true;` (chỉ lộ bài đã bật cổng). Đây là cách tối thiểu, khớp với `portalEnabled` đã dùng ở `adaptiveSessionProgress`.
- (b) Hoặc bật Firebase **Anonymous Auth** và cho cổng học sinh đăng nhập ẩn danh trước khi đọc (giữ rule `request.auth != null`).
- Khuyến nghị (a) vì đơn giản, đúng mô hình "link công khai" và không làm lộ bài chưa publish. Nhớ rà các field nhạy cảm trong doc `adaptiveLessons` (không nên chứa thông tin riêng tư của GV).

**Kiểm thử lại sau fix:** mở cổng ở cửa sổ ẩn danh (không đăng nhập) → phải vào được màn chào.

---

### 🟠 BUG #2 — SAI NỘI DUNG: Mô phỏng môn Xác suất bị nhận nhầm thành Hình học không gian 3D

**Triệu chứng (Antigravity phát hiện):** Bài "Xác suất có điều kiện" sinh ra mô phỏng **mô hình 3D khối chóp (Three.js)** thay vì mô phỏng xác suất.

**Nguyên nhân (Claude xác minh vị trí):** `src/lib/adaptive/adaptiveFromLessonPlan.ts:190`:
```js
const isSpatialGeometry = /không gian|hình chóp|hình lăng trụ|tứ diện|mặt phẳng|đường thẳng vuông góc|góc giữa|khoảng cách/.test(normalizedText);
```
Token trần `không gian` khớp cụm **"không gian mẫu"** (sample space) của Xác suất → route nhầm sang `sampleGeometry3DPyramidSimulation`. `mặt phẳng` cũng dễ bắt nhầm.

**Đề xuất sửa:**
- Siết Regex để chỉ bắt đúng ngữ cảnh hình học không gian, loại trừ "không gian mẫu":
  ```js
  const isSpatialGeometry =
    /(hình\s)?không gian(?!\s*mẫu)|hình chóp|hình lăng trụ|tứ diện|hình hộp|hình cầu|hình nón|hình trụ|đường thẳng vuông góc|góc giữa (hai|đường|mặt)|khoảng cách (từ|giữa).*(mặt phẳng|đường thẳng)/.test(normalizedText);
  ```
  (Điểm mấu chốt: `không gian(?!\s*mẫu)` để bỏ "không gian mẫu"; bỏ `mặt phẳng` đứng một mình hoặc gắn nó với ngữ cảnh hình học.)
- Bền hơn: thêm guard chủ đề Xác suất/Thống kê — nếu text khớp `xác suất|biến cố|không gian mẫu|tổ hợp|chỉnh hợp|hoán vị|kỳ vọng|phương sai` thì **không** dùng 3D pyramid (ưu tiên mô phỏng HTML/SVG vanilla hoặc TikZ sơ đồ cây/Venn — vốn đã chạy tốt cho bài này).
- Lưu ý 2 nơi khác cũng có chuỗi tương tự cần đồng bộ logic: prompt JSON (dòng ~1351, ~1393, ~1401, ~1430, ~1734) hướng dẫn AI "simulation_3d cho hình học không gian" — không sai, nhưng nên nhấn mạnh "KHÔNG dùng cho không gian mẫu trong Xác suất" để AI không tự gắn `simulation_3d`.

**Kiểm thử lại sau fix:** sinh lại bài Xác suất → mô phỏng phải là loại tương tác xác suất (slider/sơ đồ cây), KHÔNG phải khối chóp 3D. Đồng thời kiểm 1 bài Hình học không gian thật (vd "hình chóp S.ABCD") vẫn ra 3D đúng.

---

### 🟡 CÁC LƯU Ý ỔN ĐỊNH (không chặn, nên xử lý)

1. **Dev server rớt giữa buổi** (`ERR_CONNECTION_REFUSED`) vài lần khi đang test nặng (pipeline AI dài). Có thể do HMR/giới hạn tài nguyên. Không phải lỗi runtime của bài, nhưng làm gián đoạn E2E. Cân nhắc tách quá trình sinh AI ra worker/timeout rõ ràng.
2. **Tab cổng học sinh mở bằng `window.open(..., 'noopener')`** đôi khi vào trang lỗi ngay sau publish, phải F5. Nên thêm health-check/độ trễ nhỏ hoặc retry trước khi điều hướng. (Liên quan: sau khi sửa BUG #1, kiểm lại đường mở tab này.)
3. **Độ trễ AI cao + lỗi Quota 429 (Gemini)** quan sát được ở cả 2 phiên; pipeline đã xử lý 429 tốt (Antigravity xác nhận). Nên hiển thị tiến độ/cảnh báo rõ cho giáo viên khi bị rate-limit, và cân nhắc backoff.
4. **`sim_2_skipped` là hành vi ĐÚNG** (giữ nguyên guard). Gợi ý nâng cấp: thử sinh lại 1 lần trước khi bỏ, để tăng tỉ lệ mảnh có mô phỏng.
5. **Phần chưa kiểm hết:** do BUG #1 chặn phiên ẩn danh và server rớt, mình **chưa đi trọn vẹn Bước 4 (Luyện tập Olympia) → Bước 5 (Tổng kết/Lưu kết quả)** trong một phiên học sinh thật liền mạch. Đã xác minh tới Bước 3 (mảnh kiến thức + mô phỏng). Sau khi sửa BUG #1, cần chạy lại E2E trọn vẹn 5 bước ở cửa sổ ẩn danh (gồm: làm Olympia, kiểm điểm cộng dồn, nộp, màn lưu kết quả + ghi `adaptiveSessionProgress`).

---

## 4. TÓM TẮT VIỆC CHO CLAUDE CODE

1. **Sửa BUG #1** — `firestore.rules` (`adaptiveLessons` read công khai theo `portalEnabled`) → deploy rules → test cửa sổ ẩn danh vào cổng.
2. **Sửa BUG #2** — `adaptiveFromLessonPlan.ts:190` siết Regex `không gian(?!\s*mẫu)` + guard chủ đề Xác suất; đồng bộ ghi chú trong các prompt JSON; test lại bài XS và bài Hình không gian.
3. **Xử lý lưu ý #2** (mở tab cổng học sinh) và cân nhắc #1/#3/#4.
4. **Sau khi fix**, chạy lại E2E trọn 5 bước cổng học sinh ở phiên ẩn danh để đóng phần #5 còn dang dở.

*Nguồn đối chiếu: `docs/BAOCAO_KiemThu_HinhAnh_MoPhong.md` (Claude), `docs/BAOCAO_E2E_Full_Antigravity.md` (Antigravity). Vị trí code đã xác minh trực tiếp: `firestore.rules:39-41`, `src/lib/adaptive/adaptiveFromLessonPlan.ts:188-206`, `src/pages/AdaptiveStudentPortalPage.tsx:343`.*
