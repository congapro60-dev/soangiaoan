# Browser QA Report — Adaptive Student Portal

## Phạm vi kiểm thử

- **Ứng dụng:** Smart Lesson Plan AI
- **Production URL:** https://giaoandewey.vercel.app/
- **Portal đã test:** https://giaoandewey.vercel.app/adaptive-portal/adaptive-1781166037944
- **Bài học:** `ba đường conic` — Toán 10
- **Viewport:** 1504 × 1003, Chrome/Playwright
- **Luồng kiểm thử:** mở bài học từ production, làm pre-test đầu giờ, vào cổng học sinh, thao tác mục tiêu học tập, bắt đầu học theo tuyến, bấm gợi ý / bước tiếp theo, kiểm tra console.
- **Bổ sung sau feedback:** đã chạy tiếp luồng tuyến học từ Bước 3 qua Bước 4 đến **Bước 5: Nhận dạng hypebol qua dấu trừ**.

---

## Kết luận nhanh

Cổng học sinh đã vào được sau pre-test, nhưng trải nghiệm học thực tế vẫn **chưa đạt chất lượng release**. Có lỗi backend personalization 500, nội dung học trong iframe bị thiếu/rỗng, nhiều nhãn nội dung bị lộ dạng placeholder, gợi ý không có giá trị sư phạm, mục lục/TOC bị ẩn hoặc khóa, và console có cảnh báo sandbox iframe.

Mức đánh giá tổng thể: **Không nên phát hành cho học sinh thật trước khi sửa các lỗi Critical/High bên dưới.**

---

## Các phát hiện chính

### 1. API personalization lỗi 500 — HIGH / Backend

**Bằng chứng console:**

```text
[ERROR] Failed to load resource: the server responded with a status of 500 () @ https://giaoandewey.vercel.app/api/gemini-relay
[WARNING] [PersonalizationEngine] Falling back to original lesson: Error: Personalization relay error 500
```

**Ảnh hưởng:**

- Sau khi học sinh nộp test, hệ thống không cá nhân hóa được bằng relay AI.
- App fallback về lesson gốc, khiến phân tuyến/tùy biến theo năng lực có nguy cơ chỉ là hình thức.
- Không có thông báo thân thiện cho giáo viên/học sinh biết personalization đã fail.

**Khuyến nghị:**

- Kiểm tra log serverless `/api/gemini-relay` trên Vercel.
- Trả lỗi có cấu trúc thay vì 500 chung chung.
- Nếu fallback thì cần hiển thị trạng thái nội bộ cho giáo viên/admin, không âm thầm che lỗi.

---

### 2. Sau pre-test, nội dung tuyến học bị rỗng/placeholder — CRITICAL / Content Quality

**Quan sát trong iframe sau khi vào Bước 3:**

```text
3. Nhận dạng elip qua dấu cộng
1Thử và sửa

phản hồi khi đúng/sai:

 Kiểm tra gợi ý
```

Sau khi bấm gợi ý:

```text
phản hồi khi đúng/sai:
Mở bước tiếp theo
```

**Ảnh hưởng:**

- Học sinh không có đề bài rõ ràng để làm.
- Dòng `phản hồi khi đúng/sai:` xuất hiện như placeholder kỹ thuật, không phải nội dung học.
- Gợi ý không giúp học sinh hiểu bài.

**Khuyến nghị:**

- Chặn publish nếu lesson unit thiếu `prompt`, `feedback`, `explanation`.
- Không render label `phản hồi khi đúng/sai:` khi không có nội dung thực.
- Thêm validation bắt buộc cho từng Socratic step trước khi tạo portal.

---

### 3. Nút gợi ý hoạt động nhưng feedback không có giá trị — HIGH / UX + Pedagogy

**Hành vi:**

- Bấm `Kiểm tra gợi ý` có hiện `Mở bước tiếp theo`.
- Tuy nhiên phần gợi ý chỉ hiện placeholder `phản hồi khi đúng/sai:` hoặc nội dung rất chung chung.

**Ảnh hưởng:**

- Tính năng gợi ý không thực hiện chức năng dạy học.
- Học sinh có thể bấm qua bước mà không học được gì.

**Khuyến nghị:**

- Map đúng dữ liệu `hints`, `explanation`, `correctFeedback`, `incorrectFeedback` vào Dewey template.
- Nếu không có hint, đổi nút thành disabled hoặc ẩn nút.

---

### 4. Bước 4 và Bước 5 tái diễn lỗi nội dung rỗng/placeholder — CRITICAL / Content Quality

Sau feedback, tôi đã chạy tiếp luồng học từ Bước 3 sang Bước 4 và đến Bước 5.

**Bước 4 quan sát được:**

```text
4. Tiêu điểm của elip và công thức c2=a2−b2
1 Thử và sửa

phản hồi khi đúng/sai:

Kiểm tra gợi ý
```

Sau khi bấm gợi ý / mở bước tiếp theo, hệ thống tiếp tục sinh các bước con nhưng nội dung vẫn chủ yếu là placeholder:

```text
2 Thử và sửa
Tiêu điểm của elip và công thức c2=a2−b2

Ví dụ này được tạo từ giáo án nguồn; giáo viên kiểm tra lại tính chính xác trước khi phát cho học sinh.
Từ khóa tham khảo: Xác định dữ kiện đã cho., Liên hệ với công thức/khái niệm vừa học., Trình bày từng bước, không nhảy kết luận.

3 Thử và sửa
Luyện tập chuẩn 1: Tiêu điểm của elip và công thức c2=a2−b2
Giáo viên rà soát đáp án theo giáo án nguồn.
```

**Bước 5 quan sát được:**

```text
5. Nhận dạng hypebol qua dấu trừ
1 Thử và sửa

phản hồi khi đúng/sai:

Kiểm tra gợi ý
```

Sau khi bấm `Kiểm tra gợi ý` ở Bước 5:

```text
phản hồi khi đúng/sai:
Mở bước tiếp theo
```

**Ảnh hưởng:**

- Lỗi không chỉ xảy ra ở Bước 3 mà tái diễn ở Bước 4 và Bước 5.
- Các bước con được mở tuần tự, nhưng không có bài tập/giải thích cụ thể đủ để học sinh học độc lập.
- Cụm `Ví dụ này được tạo từ giáo án nguồn; giáo viên kiểm tra lại...` và `Giáo viên rà soát đáp án...` đang xuất hiện như nội dung học chính, không phải trạng thái kiểm duyệt nội bộ.

**Khuyến nghị:**

- Xem đây là lỗi hệ thống trong pipeline tạo Dewey activity, không phải lỗi riêng một màn.
- Thêm rule: nếu content chỉ có title/placeholder/generic fallback thì activity phải bị đánh dấu invalid và không được publish.
- Tách nội dung dành cho giáo viên kiểm duyệt khỏi UI học sinh.

---

### 5. Navigation/TOC bị ẩn hoặc khóa, luồng học khó kiểm soát — HIGH / Flow

**Quan sát DOM:**

Các mục TOC tồn tại nhưng đang invisible/locked:

```text
4. Tiêu điểm của elip và công thức c2=a2−b2 — locked
5. Nhận dạng hypebol qua dấu trừ — locked
6. Tiêu điểm và tiệm cận của hypebol — locked
7. Nhận dạng parabol dạng y2=2px — locked
8. Tiêu điểm và đường chuẩn của parabol — locked
```

**Ảnh hưởng:**

- Học sinh không biết tổng lộ trình đang có gì.
- Nếu một activity lỗi hoặc nội dung rỗng, học sinh dễ bị kẹt ở tuyến hiện tại.

**Khuyến nghị:**

- TOC nên hiển thị trạng thái rõ ràng: hiện tại / đã xong / khóa vì chưa hoàn thành bước nào.
- Cho giáo viên/debug mode xem lý do khóa từng mục.
- Thêm fallback `Bỏ qua bước lỗi / Báo giáo viên` nếu unit không đủ dữ liệu.

---

### 6. Goal analysis không dùng input học sinh — MEDIUM/HIGH / Personalization UX

**Input test:**

```text
Em muốn phân biệt được elip, hypebol, parabol và giải phương trình chính tắc.
```

**Kết quả hiển thị:**

```text
Nhận biết: /Trọng tâm/Nâng cao:
Thông hiểu: Có đủ ba tuyến kiến thức chính: elip, hypebol, parabol.
Vận dụng: Có pre-test, quick check, exit ticket, remediation và dữ liệu cần ghi nhận.
```

**Ảnh hưởng:**

- Kết quả giống dữ liệu template/metadata hơn là phân tích thật từ input học sinh.
- Dòng `/Trọng tâm/Nâng cao:` bị lộ, gây cảm giác sản phẩm chưa hoàn thiện.

**Khuyến nghị:**

- Nếu không gọi AI được, dùng rule-based parser tối thiểu dựa trên text học sinh.
- Làm sạch dữ liệu nguồn, loại các marker `/Trọng tâm/Nâng cao:` khỏi UI học sinh.

---

### 7. Broken/empty visual asset — MEDIUM / UI

**Quan sát:**

Trong nội dung mở đầu có khung hình trống với dấu `?` lớn.

**Ảnh hưởng:**

- Trông giống ảnh/mô phỏng bị hỏng.
- Giảm niềm tin của giáo viên và học sinh.

**Khuyến nghị:**

- Kiểm tra field media/embed của lesson.
- Nếu asset lỗi, render placeholder thân thiện: `Giáo viên chưa thêm hình minh họa` thay vì dấu hỏi.

---

### 8. Iframe sandbox warning — MEDIUM / Security

**Console warning:**

```text
An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing.
```

**Ảnh hưởng:**

- Cấu hình sandbox hiện tại làm giảm hiệu quả sandbox isolation.
- Nếu nội dung lesson có HTML/JS sinh bởi AI, rủi ro bảo mật cần được xem nghiêm túc.

**Khuyến nghị:**

- Rà lại nhu cầu `allow-same-origin`.
- Nếu cần chạy mô phỏng JS do AI sinh ra, cân nhắc chạy trong origin/domain tách biệt.
- Sanitization bắt buộc với nội dung HTML sinh động.

---

## Bug matrix

| # | Lỗi | Mức độ | Nhóm | Trạng thái |
|---|---|---:|---|---|
| 1 | `/api/gemini-relay` trả 500, personalization fallback | HIGH | Backend/AI | Repro được |
| 2 | Nội dung tuyến học rỗng/placeholder | CRITICAL | Content/Flow | Repro được |
| 3 | Gợi ý không có nội dung sư phạm | HIGH | UX/Pedagogy | Repro được |
| 4 | Bước 4 và Bước 5 tái diễn lỗi rỗng/placeholder | CRITICAL | Content/Flow | Repro được |
| 5 | TOC bị ẩn/khóa, khó biết lộ trình | HIGH | Navigation | Repro được |
| 6 | Phân tích mục tiêu không dùng input học sinh | MED-HIGH | Personalization | Repro được |
| 7 | Visual asset hiển thị dấu hỏi | MEDIUM | UI/Asset | Repro được |
| 8 | Iframe sandbox warning | MEDIUM | Security | Repro được |

---

## Checklist đề xuất trước release

- [ ] Sửa `/api/gemini-relay` 500 hoặc có fallback cá nhân hóa offline đáng tin cậy.
- [ ] Thêm validation không cho publish lesson khi Socratic step thiếu prompt/feedback.
- [ ] Làm sạch marker nội bộ như `/Trọng tâm/Nâng cao:` và `phản hồi khi đúng/sai:` khỏi UI học sinh.
- [ ] Sửa logic gợi ý để hiển thị hint/explanation thật.
- [ ] Làm rõ trạng thái TOC và lý do khóa từng mục.
- [ ] Xử lý asset/mô phỏng bị thiếu bằng fallback UI thân thiện.
- [ ] Rà lại sandbox iframe và chiến lược chạy HTML/JS sinh bởi AI.

---

## Ghi chú

Một báo cáo QA cũ đã tồn tại ở `adaptive_portal_qa_report.md`; các lỗi lần này xác nhận lại nhiều rủi ro hệ thống tương tự, nhưng được kiểm thử trên portal production mới `adaptive-1781166037944` và có thêm bằng chứng console về lỗi `/api/gemini-relay` 500.

Sau feedback, phạm vi browser QA đã được mở rộng từ Bước 3 sang Bước 4 và đến Bước 5. Kết quả xác nhận lỗi nội dung rỗng/placeholder là lỗi lặp lại xuyên suốt tuyến học, không phải lỗi cục bộ ở Bước 3.
