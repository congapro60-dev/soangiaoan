# V8.8 — ALWAYS-ON HAND RAISE · ANONYMOUS QUESTIONS · UNDERSTANDING PULSE
## Addendum cho Codex — mã `COMM-AQ-01` — 29/10/2026

**Trạng thái:** `REQUIREMENTS_READY_FOR_IMPLEMENTATION_PLANNING` — chưa phải bằng chứng tính năng đã có hoặc đã kiểm thử.

**Áp dụng cho:** V8.8 Consolidation & Quality Hardening; `V8_8_ADAPTIVE_STUDENT_SURFACE_MOBILE_DESKTOP_PARITY_CODEX_ADDENDUM.md`; ba luồng Presenter–Student–Coach. Giữ nguyên V8.3.2 Lesson IR và các quy tắc teacher override, no answer leakage, privacy, evidence provenance, responsive layout, time protection.

**Quyết định của người dùng cần khóa cứng:** **MỌI câu hỏi do học sinh gõ/gửi đều ẨN DANH. Không có lựa chọn “gửi có tên”. Giơ tay là hành động riêng, CÓ tên để giáo viên gọi. Hai chức năng tuyệt đối không được liên kết định danh với nhau.**

---

## 0. Lệnh cho Codex — đọc trước khi code

1. Audit hệ thống hiện tại: danh sách lớp và session identity; Student layout laptop/mobile; Presenter điều khiển và panel thống kê; Coach; realtime event bus; permissions, persistence, logs, privacy.
2. Triển khai nút **Giơ tay** thường trực trên mọi trạng thái của Student View (đang làm, xem hướng dẫn, đang chờ, nhóm, luyện thêm, phản tư, Exit). Hành động này **hiện tên** trong hàng đợi giơ tay của giáo viên trên Presenter và Coach.
3. Triển khai chức năng **Gửi câu hỏi ẩn danh** thường trực, cho phép học sinh gõ và gửi câu hỏi bất cứ lúc nào. Không hiện, không lưu trong đối tượng câu hỏi và không gửi đến giáo viên bất kỳ định danh học sinh nào.
4. Presenter có vùng **Câu hỏi ẩn danh** cập nhật realtime trong phần điều khiển/thống kê. Giáo viên xem câu hỏi mới ngay; chỉ câu được GV chọn **Công bố** mới được hiển thị cho toàn lớp trên màn hình lớn. Không bao giờ công bố danh tính.
5. Sau các hoạt động học tập chính, có **bước tự xác nhận mức độ hiểu** ngắn, có thể phản tư/phản biện. Không biến thành slide bắt buộc sau từng câu vi mô, không làm đứt nhịp dạy hoặc nuốt thời gian Exit.
6. Viết test API, unit, browser, multi-client, privacy, desktop regression và mobile UX. Báo riêng kết quả đã chạy và chưa chạy.

---

## 1. Tách hai cơ chế theo danh tính

| Thuộc tính | GIƠ TAY | GỬI CÂU HỎI |
|---|---|---|
| Khi nào dùng | Bất kỳ thời điểm trong tiết | Bất kỳ thời điểm trong tiết |
| Cách dùng | Một nút bấm/bấm lại để hủy | Ô gõ câu hỏi + Gửi |
| Có định danh | **CÓ** — tên học sinh cho GV gọi | **KHÔNG** — chỉ câu hỏi ẩn danh |
| Trên Presenter | Biểu tượng tay + tên học sinh, hàng đợi gọn | Tab Câu hỏi ẩn danh trong Thống kê/Câu hỏi |
| Trên Coach | Hàng đợi tay giơ có tên | Câu hỏi ẩn danh theo thời gian/trạng thái; không có nút truy người gửi |
| Public display | Tên được hiện theo yêu cầu GV | Chỉ nội dung sau khi GV chọn Công bố |
| Khi HS hủy | Rút khỏi hàng đợi | Chỉ hủy được draft trước khi gửi; câu đã gửi tuân theo quy trình xóa/ẩn |
| Dữ liệu | `userId` cần cho queue giơ tay | **Không có** `userId`, `studentName`, `rosterId`, `sessionIdentity`, `deviceId`, `accountId`, `linkedHandId` |

### Quy tắc bảo mật ưu tiên P0

- Không có nút, API hoặc permission để GV/Coach nhìn thấy “ai đã gửi câu hỏi ẩn danh”.
- Không truyền kèm danh tính trong payload hỏi đáp để rồi chỉ ẩn ở giao diện; **ẩn danh phải được thực thi phía server/data model**.
- Không tái dùng event ID, correlation ID hoặc session ID của hành động giơ tay để gắn với câu hỏi.
- Không cho thống kê riêng tư suy đoán trực tiếp người gửi qua giao diện (ví dụ ghép tên, thiết bị, lần bấm tay và timestamp chính xác).
- Không xuất câu hỏi ẩn danh trong export kèm roster hoặc báo cáo cá nhân.
- Mọi lớp client, server, database, analytics, telemetry và support/admin UI phải được kiểm tra không làm lộ người gửi. Nếu cơ sở hạ tầng vẫn giữ IP/auth/trace có thể định danh, **không được tuyên bố “ẩn danh tuyệt đối không thể truy vết”**; cần đánh giá, giảm thiểu và kiểm chứng với chính sách dữ liệu của nhà trường. Mục tiêu sản phẩm là không tạo/giữ liên kết định danh với nội dung câu hỏi.
- Không cam kết HS không tự viết tên mình trong nội dung; giao diện nhắc nhẹ “Đừng ghi tên hoặc thông tin riêng tư của em/bạn vào câu hỏi”. Cần cơ chế ẩn/sửa nội dung nhạy cảm trước khi Công bố.

---

## 2. Always-on Student UI: hai nút hành động

### Desktop/laptop

- Giữ layout làm bài V8.8 hiện tại; thêm hai hành động nhỏ, luôn truy cập được: **✋ Giơ tay** và **❓ Hỏi ẩn danh**.
- Không che math input, đồ thị, thanh điều khiển tác vụ hoặc nút nộp.
- Phím nóng nếu triển khai phải không xung đột với nhập Toán / khả năng tiếp cận.

### Mobile/tablet

- Thanh hành động dễ chạm ở góc/đáy màn hình; phù hợp safe area, bàn phím ảo, xoay ngang.
- Trên màn hẹp, **Giơ tay** là nút gọn luôn thấy; **Hỏi ẩn danh** mở sheet/modal dễ nhập; modal không phá draft bài đang làm.
- Có trạng thái: `Đang gửi…`, `Đã gửi câu hỏi ẩn danh`, `Chưa gửi được`.
- Không để phần hỏi che toàn bộ câu hỏi Toán đang làm mà không có khả năng đóng nhanh.
- Không cần cài app; hoạt động trên browser Student hiện tại.

### Giơ tay

- Ban đầu: `✋ Giơ tay`.
- Sau bấm: `Đang giơ tay` (có nút `Hạ tay`).
- Khi GV gọi/xử lý: trạng thái được cập nhật; học sinh có thể giơ lại nếu muốn.
- Nhiều lần bấm không tạo duplicate; số thứ tự hàng đợi theo server.

### Hỏi ẩn danh

- Nhãn bắt buộc: **`Đặt câu hỏi ẩn danh`**.
- Gợi ý: `Em muốn hỏi điều gì?`.
- Trước gửi: `Câu hỏi của em sẽ không hiển thị tên.`
- Sau gửi: `Đã nhận câu hỏi ẩn danh.`
- Không hiển thị tuỳ chọn `Có tên / Ẩn danh`.
- Không cần HS giơ tay trước; không bắt buộc bật camera/mic.
- Câu hỏi có thể kèm ngữ cảnh **hoạt động hiện tại** (ID activity, không phải ID học sinh), nếu thực sự có ích.

---

## 3. Presenter + Coach: hàng đợi realtime và công bố có kiểm soát

### Presenter

- Dải gọn không che câu hỏi đang trình chiếu: `✋ 3 bạn đang giơ tay` + một số tên, có thể mở toàn bộ danh sách theo nhu cầu. Các tên này chỉ thuộc chức năng giơ tay.
- Trong điều khiển `Thống kê / Câu hỏi`, thêm tab **`Câu hỏi ẩn danh`** cập nhật trực tiếp ngay khi server nhận.
- Mỗi câu hiển thị `#05 · Hoạt động 4 · Chưa trả lời` + nội dung; **không có tên**.
- Teacher actions: `Xem` · `Công bố` · `Đã trả lời` · `Để sau` · `Ẩn nội dung` · `Xóa theo chính sách`.
- **Mặc định câu mới nằm trong teacher-only review queue**, không tự chiếu nguyên văn lên màn hình chung. Như vậy vẫn cập nhật tức thời cho GV nhưng phòng tránh việc vô tình chiếu thông tin riêng tư hoặc nội dung không phù hợp. Khi giáo viên chọn Công bố, slide/overlay chỉ hiện nội dung câu hỏi + mã ẩn danh.
- Khi thống kê mở, vẫn giữ được bài toán/hình vẽ quan trọng trên Presenter; giáo viên luôn có thể quay về bài mà không mất trạng thái.

### Coach

- Có backlog câu hỏi: `Mới`, `Đang xem`, `Đã trả lời`, `Để sau`.
- Có thể nhóm các **chủ đề câu hỏi** dựa trên nội dung; không được biến nhóm nội dung thành hồ sơ cá nhân hay suy đoán người gửi.
- Có thể gợi ý câu trả lời sư phạm cho GV nhưng không tự trả lời thay GV hoặc tự đăng lên màn hình chung.
- Chỉ số câu hỏi = số câu hỏi, **không suy ra số HS đang vướng** vì một HS có thể gửi nhiều câu.

### Realtime failure

- Submission acknowledgement chỉ được xác nhận sau khi server đã nhận; khi socket lỗi có retry/idempotency tránh trùng.
- Teacher queue catch-up sau reconnect; không mất câu mới.
- Mọi tính năng Teacher Override/Lock/Reveal của lesson hiện tại vẫn ưu tiên đúng thiết kế V8.8.

---

## 4. Understanding Pulse sau hoạt động chính

**Mục đích:** giúp HS đánh giá mức độ hiểu, nhận diện chỗ còn vướng và chủ động đề nghị hỗ trợ; không dùng tự báo hiểu để kết luận mastery.

Sau *một hoạt động học tập có nội dung trọng tâm* (không phải mọi click/câu vi mô), tác giả bài học có thể khai báo một **mini-check** (10–30 giây) như một bước chuyển ngắn:

- `Em đã hiểu và có thể tự làm tương tự.`
- `Em hiểu một phần, cần thêm ví dụ.`
- `Em vẫn chưa rõ.`

Hành động mở rộng tùy chọn:
- `Điều em hiểu rõ nhất là…` (phản tư tự chọn).
- `Điều em còn băn khoăn là…` (đưa vào **câu hỏi ẩn danh**).
- `Em muốn trao đổi hoặc phản biện về…` (ý kiến có lí lẽ; cho phép gửi ẩn danh theo chính sách câu hỏi).
- `✋ Giơ tay` (tên hiện trong hàng đợi như thường lệ).

### Choreography

- Không dùng hiểu/chưa hiểu làm điểm số.
- Không tự bật hint chỉ vì HS chọn `Chưa rõ`; Coach gợi ý GV kiểm tra nguyên nhân.
- GV được bỏ qua/bỏ vào cụm/thu gọn pulse theo mục tiêu và time drift; không chặn tiếp tục activity.
- Bảo vệ core teaching, individual recheck, Exit và tự đánh giá cuối tiết.
- Nếu mục tiêu yêu cầu reasoning, cần một evidence độc lập (giải thích, lập luận, recheck); tự báo hiểu chỉ là *perception*.

### Data/evidence boundaries

- Pulse hiểu bài có thể là dữ liệu đánh giá cá nhân hoặc tổng hợp **theo lesson contract riêng**.
- Nhưng **câu hỏi/ý kiến gửi qua luồng Hỏi ẩn danh không được liên kết danh tính với pulse, câu trả lời, roster hoặc lịch sử học sinh**.
- Coach có thể nói `12 lượt chọn cần thêm ví dụ`, không suy `12 em không hiểu` nếu có thiếu phản hồi hoặc bằng chứng khác.

---

## 5. Data contract khuyến nghị (không thay canonical IR)

```ts
// Hand raise — named / permissioned
interface HandRaiseEvent {
  eventId: string;
  lessonSessionId: string;
  studentId: string;
  studentDisplayName: string;
  action: 'raise' | 'lower';
  serverReceivedAt: string;
}

// Question — no learner identifier in stored question object.
interface AnonymousQuestion {
  questionId: string; // random, opaque; unrelated to hand-raise or user ID
  lessonSessionId: string;
  activityId?: string; // lesson context only
  body: string;
  status: 'new' | 'reviewing' | 'answered' | 'deferred' | 'hidden';
  isPublished: boolean; // false until teacher actively publishes
  serverReceivedAt: string;
}

interface UnderstandingPulse {
  activityId: string;
  selfReport: 'understood' | 'need_example' | 'unclear';
  reflection?: string;
  // If reflection is submitted as anonymous question, store separately
  // in AnonymousQuestion with NO user identifier or cross-reference.
}
```

**Security requirement:** việc đăng nhập lớp có thể dùng để xác thực quyền gửi tại request boundary; trước khi ghi/đưa vào queue, phải **tách bỏ định danh khỏi câu hỏi** và không lưu bảng ánh xạ `questionId → studentId`. Cần audit hạ tầng logging/tracing để không tạo liên kết gián tiếp. Đảm bảo CSRF/authz/rate-limit và bảo vệ khỏi spam mà không chuyển danh tính vào question storage.

---

## 6. Những điều không được làm

1. Không có checkbox `Gửi ẩn danh` bật/tắt — **ẩn danh là mặc định bất biến**.
2. Không show tên/email/avatar/lớp cụ thể của người gửi cạnh câu hỏi.
3. Không thêm nút `Xem người gửi` cho GV/Admin trong product UI.
4. Không gộp hand raise event và anonymous question event vào một “message event” mang userId.
5. Không đưa câu mới trực tiếp lên màn hình cả lớp mà không có teacher publish gate.
6. Không dùng phần trăm tự báo hiểu thay cho hiểu Toán đã được xác nhận.
7. Không bắt buộc pulse sau từng câu nhỏ; không tạo quãng ngắt liên tục.
8. Không tạo leaderboard về người hỏi/người giơ tay.
9. Không làm hỏng các chức năng Student View trên laptop khi tối ưu mobile.
10. Không nhận định anonymity đã bảo đảm nếu logs/telemetry vẫn phơi bày identity.

---

## 7. Acceptance / regression tests

### Student / mobile / desktop

- [ ] Giơ tay bất kỳ lúc nào, trên Student mobile/desktop; tên thật hiển thị trên hàng đợi giáo viên.
- [ ] Hạ tay hoặc GV xử lý: hàng đợi cập nhật realtime.
- [ ] Bấm giơ tay nhiều lần không tạo bản ghi trùng.
- [ ] Gửi câu hỏi độc lập, không cần giơ tay trước; không có tùy chọn gửi kèm tên.
- [ ] Câu hỏi đã gửi hiện `Đã nhận câu hỏi ẩn danh` sau acknowledgement server.
- [ ] Mở/đóng modal hỏi không làm mất câu trả lời Toán đang nhập.
- [ ] Keyboard ảo, safe-area, touch targets ổn ở các viewport 320/360/375/390/430.
- [ ] Layout laptop và chức năng nhập Toán, nộp bài, hint, group, peer review không hồi quy.

### Privacy / identity

- [ ] Trong API request/response và **stored question record** không có identity field; phần server xác thực không lưu bảng ánh xạ question→student.
- [ ] Coach/Presenter/export/analytics không có cách lọc câu hỏi theo học sinh.
- [ ] Không có join/correlation qua handRaiseEventId với anonymousQuestionId.
- [ ] Học sinh giơ tay rồi gửi câu hỏi ngay sau đó: không lộ người gửi qua UI, export hoặc event payload.
- [ ] Câu có thông tin nhạy cảm chỉ xuất hiện trong teacher review queue cho tới khi GV quyết định công bố.
- [ ] Audit logs/telemetry/retention và ghi kết quả riêng; không claim untraceability nếu hạ tầng vẫn có thể truy nguyên.

### Presenter / runtime

- [ ] Câu hỏi vào queue realtime trong `Thống kê / Câu hỏi`; không che đề chính.
- [ ] Teacher publish hiện nội dung và mã ẩn danh, không có tên.
- [ ] Teacher defer/answer/hide có hiệu lực trên cả Presenter/Coach.
- [ ] Multi-client concurrent submissions dùng unique question ID, no duplicate on retry.
- [ ] Reconnect teacher/client không mất câu hỏi đã server nhận, trạng thái giơ tay đồng bộ.
- [ ] Hiểu bài pulse sau activity chủ đạo không bắt buộc, không chặn khi time drift; giơ tay/hỏi vẫn hoạt động ngay trên pulse.
- [ ] Tự đánh giá mức hiểu được coi là self-report; Coach không gọi mastery chỉ từ self-report.
- [ ] Privacy/accessibility kiểm tra với các trình duyệt và thiết bị thật đại diện.

### QA reporting

Báo riêng: `Schema/Semantic`, `Unit`, `Browser Desktop`, `Browser Mobile`, `Multi-client E2E`, `Network/Disconnect`, `Privacy/Security`, `Cold Teacher Test`. `NOT_RUN` không được báo `PASS`.

---

## 8. Trạng thái bàn giao

**Đây là addendum V8.8, không thay đổi phiên bản, không thay thế bản Master, không chứng minh runtime đã triển khai.** Codex phải thực hiện audit hiện trạng, trình bày diff, triển khai theo P0 và chạy nghiệm thu trước khi gọi `READY_TO_TEACH`.

**Thứ tự ưu tiên:** yêu cầu người dùng mới nhất → Master V8.8 → Mobile/Desktop Parity Addendum → addendum này cho những phần được làm rõ tại đây → code hiện hành. Riêng quy tắc **typed question is ALWAYS anonymous** là quyết định mới nhất của người dùng và phải thắng mọi lựa chọn ẩn danh cũ nếu mâu thuẫn.
