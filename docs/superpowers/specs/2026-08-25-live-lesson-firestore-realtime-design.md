# V3 — Phiên dạy phân hoá realtime trong SmartPlan AI

**Ngày:** 2026-08-25  
**Trạng thái:** Đã được người dùng duyệt hướng thiết kế; chờ duyệt bản đặc tả trước khi lập kế hoạch triển khai.  
**Phạm vi:** Bài pilot Toán 10 “Bất phương trình bậc nhất hai ẩn” và khung runtime có thể tái sử dụng cho các bài học phân hoá tiếp theo.

## 1. Quyết định kiến trúc

V3 được xây dựng **bên trong web SmartPlan AI hiện tại**, dùng Firebase project hiện có (`smartplan-ai-14200`). Firestore là lớp dữ liệu realtime của web, không phải một website mới và không phải một trang trên ChatGPT.

V3 tận dụng các thành phần đã có:

- `Bài học phân hoá`: danh sách bài, trình xây dựng bài, xuất bản bài và cổng học sinh.
- `Lớp học`: lớp, danh sách học sinh, mã tham gia và PIN.
- Firebase Auth: giáo viên đăng nhập hiện tại; học sinh dùng phiên ẩn danh đã được máy chủ liên kết với đúng học sinh sau khi kiểm PIN.
- Các collection adaptive hiện có: `adaptiveLessons`, `adaptiveSessionProgress`, `studentLearningProfiles`.

V3 bổ sung một **lớp phiên dạy trực tiếp**. Lớp này không thay thế tiến trình học adaptive sau tiết học; nó điều phối nhịp tiết, thu các phản hồi ngắn và phát thống kê tổng hợp.

## 2. Mục tiêu và giới hạn

### Mục tiêu

1. Giáo viên mở một bài học phân hoá, chọn lớp và bấm “Mở tiết học trực tiếp”.
2. Giáo viên điều khiển cue/nhịp bài trên laptop.
3. Học sinh dùng điện thoại, laptop hoặc iPad để chọn tuyến, trả lời câu hỏi, dùng gợi ý và nộp các câu trả lời đã hoàn tất.
4. TV nhận trạng thái và thống kê tổng hợp realtime qua màn hình web dành riêng cho TV; Vcast/Sender chỉ làm nhiệm vụ đưa màn hình đó lên TV.
5. Cập nhật realtime không làm học sinh bỏ hoạt động nói, làm bảng, trao đổi bạn đôi hoặc ghi vở.
6. Khi mất mạng, bài vẫn có đường lui local/offline và không hiển thị giả rằng dữ liệu đã đồng bộ.

### Không thuộc V3 đầu tiên

- Không cố làm PowerPoint tự thay đổi nội dung trong khi trình chiếu. PPTX hiện tại vẫn là bản offline/dự phòng; TV realtime dùng màn hình web có thiết kế cùng ngôn ngữ thị giác.
- Không gửi từng phím học sinh đang gõ lên Firestore.
- Không dùng Firestore công khai để học sinh đọc câu trả lời riêng của nhau.
- Không xây lại toàn bộ trình soạn bài adaptive trong cùng một đợt.
- Không chấm tự động các câu tư duy bậc cao rồi coi kết quả đó là điểm chính thức.
- Không thêm một hệ thống lớp học/PIN thứ hai.

## 3. Quyết định về danh tính học sinh

MVP V3 ưu tiên **phiên gắn với một lớp hiện có**. Khi giáo viên chọn lớp, học sinh vào bằng link phiên và đăng nhập bằng luồng lớp/PIN hiện tại. Firestore Rules kiểm tra document `studentLinks/{uid}` để biết học sinh thuộc lớp nào; học sinh không tự ghi danh tính của mình vào Firestore.

Lý do không mở chế độ khách ẩn danh hoàn toàn trong MVP:

- Dễ triển khai sai quyền ghi và dễ bị gửi dữ liệu giả hàng loạt.
- Không thể gắn kết quả với tiến trình học sinh hiện có một cách đáng tin cậy.
- Lớp/PIN đã tồn tại trong web nên không cần tạo thêm thao tác mới cho giáo viên.

Có thể bổ sung chế độ “chỉ đếm người tham gia, không nhận diện” sau khi bộ Rules và giới hạn chống lạm dụng được kiểm thử riêng. Chế độ đó không phải điều kiện để V3 pilot hoạt động.

## 4. Luồng sử dụng trên lớp

### Trước tiết học

1. Giáo viên mở tab `Bài học phân hoá`.
2. Mở bài pilot đã xuất bản.
3. Bấm `Mở tiết học trực tiếp`.
4. Chọn lớp đã có trong `Lớp học`.
5. Web tạo phiên, hiển thị ba lối vào:
   - `GV`: bảng điều khiển trên laptop.
   - `TV`: màn hình trình chiếu dành cho học sinh.
   - `HS`: link/QR gửi cho lớp.
6. Giáo viên mở `TV` ở cửa sổ/tab riêng rồi truyền cửa sổ đó lên TV bằng Vcast/Sender. Kịch bản giáo viên, nút điều khiển và ghi chú chuyên môn không nằm trong TV view.

### Trong tiết học

- Giáo viên bấm `Tiếp theo`, `Quay lại`, `Tạm dừng`, `Hiện thống kê` hoặc `Ẩn thống kê`.
- TV cập nhật cue hiện tại và vùng thống kê được phép hiển thị.
- Học sinh chỉ gửi dữ liệu ở các điểm đã định nghĩa trong gói bài học:
  - chọn mục tiêu hoặc tuyến học;
  - chọn phân loại lỗi AI;
  - chọn gợi ý đã dùng;
  - nộp câu trắc nghiệm/đúng-sai;
  - gửi câu trả lời ngắn, exit ticket hoặc xác nhận tự đánh giá.
- Phần thảo luận miệng, bảng lớn, bảng phụ và vở vẫn do giáo viên điều phối; web không biến tiết học thành thời gian nhìn màn hình liên tục.

### Sau tiết học

- Giáo viên đóng phiên.
- Các kết quả cá nhân đủ điều kiện được ghép vào luồng `adaptiveSessionProgress` hiện có.
- Thống kê phiên được giữ ở mức phục vụ phản hồi ngắn; không biến mọi lượt chọn thành một hệ thống điểm mới.

## 5. Các chế độ giao diện

Một route runtime dùng cùng một mã phiên, khác nhau ở `mode`:

```text
/adaptive-live/{sessionId}?mode=teacher
/adaptive-live/{sessionId}?mode=tv
/adaptive-live/{sessionId}?mode=student
```

### Teacher mode

- Timeline P00–P40 và đồng hồ.
- Cue hiện tại, lời nhắc nói, việc cần ghi bảng và việc học sinh cần làm trên thiết bị.
- Số đã tham gia, số đã gửi ở bước hiện tại và thống kê tổng hợp.
- Nút điều khiển TV; không dùng TV để chứa kịch bản giáo viên.

### TV mode

- Tiêu đề/ý định của hoạt động.
- Câu hỏi hoặc hướng dẫn chung cho học sinh.
- Biểu đồ hoặc thẻ thống kê lớn, ít chữ, đọc được khi chiếu.
- Trạng thái `đang chờ dữ liệu`, `đã cập nhật`, `mất kết nối` rõ ràng.
- Không có tên học sinh, PIN, câu trả lời riêng, đáp án ẩn hoặc ghi chú giáo viên.

### Student mode

- Link phiên và luồng đăng nhập lớp/PIN.
- Câu hỏi cá nhân, lựa chọn tuyến, nút gợi ý và ô trả lời.
- Chỉ gửi khi chọn/xác nhận hoặc bấm `Gửi`; không gửi bản nháp từng ký tự.
- Khi mất mạng, hiển thị “đã lưu trên thiết bị — chờ đồng bộ”, không báo “đã nộp” nếu chưa có xác nhận máy chủ.

## 6. Mô hình dữ liệu Firestore

### Phiên dạy

```text
liveLessonSessions/{sessionId}
  schemaVersion: 1
  lessonId: string
  teacherUid: string
  classId: string
  title: string
  status: lobby | running | paused | closed
  currentCueId: string
  currentTvScreenId: string
  publicStateEnabled: boolean
  publicStatsEnabled: boolean
  allowedStepIds: string[]
  createdAt: timestamp
  updatedAt: timestamp
  expiresAt: timestamp
```

`sessionId` được tạo ngẫu nhiên đủ dài, không dùng mã lớp làm ID phiên và không đưa đáp án vào document phiên.

### Phản hồi cá nhân

```text
liveLessonSessions/{sessionId}/responses/{responseId}
  participantUid: string
  classId: string
  stepId: string
  responseType: choice | text | boolean | route | hint | exit_ticket
  value: string | boolean | number
  clientNonce: string
  submittedAt: timestamp
  updatedAt: timestamp
```

`responseId` được tạo ổn định từ học sinh và bước (mỗi học sinh có một bản ghi mới nhất cho mỗi bước); `clientNonce` được tạo một lần cho lần gửi đó và giữ nguyên khi retry. Vì vậy mạng chập chờn không tạo bản ghi trùng. Dữ liệu này chỉ giáo viên chủ phiên đọc được; học sinh chỉ được ghi/cập nhật phản hồi của chính mình trong khi phiên còn mở.

### Trạng thái công khai cho TV

```text
liveLessonSessions/{sessionId}/public/state
  cueId: string
  tvScreenId: string
  status: string
  showStats: boolean
  updatedAt: timestamp

liveLessonSessions/{sessionId}/public/stats
  stepId: string
  participantCount: number
  submittedCount: number
  choiceCounts: map
  routeCounts: map
  errorCategoryCounts: map
  hintUseCount: number
  updatedAt: timestamp
```

TV chỉ đọc hai document tổng hợp này. Không ghi thống kê từ phía học sinh. Teacher mode lắng nghe responses bằng `onSnapshot`, tính lại thống kê thuần túy ở client và ghi bản tổng hợp công khai. Như vậy TV không cần quyền đọc dữ liệu cá nhân.

## 7. Quyền truy cập và an toàn dữ liệu

Firestore Rules mới phải kiểm tra tối thiểu:

- Tạo/sửa/đóng phiên: chỉ `teacherUid` đã đăng nhập.
- Chọn lớp: `classId` thuộc giáo viên đang tạo phiên.
- Học sinh ghi response: phải có `studentLinks/{request.auth.uid}`, thuộc đúng `classId`, phiên đang `lobby/running/paused`, `stepId` nằm trong `allowedStepIds` và payload nằm trong giới hạn kích thước.
- Học sinh không đọc `responses` và không sửa `teacherUid`, `classId`, `participantUid`, `submittedAt` gốc hoặc trạng thái phiên.
- TV chỉ đọc public state/stats khi phiên còn hiệu lực và đã bật public view.
- Khi hết `expiresAt` hoặc `status == closed`, không nhận response mới.
- Public stats không chứa tên, mã học sinh, PIN, nội dung bài làm thô hay đáp án.

Không dùng collection `personalizationCache` đang có quyền quá rộng cho dữ liệu lớp học realtime. Đây là ranh giới an toàn bắt buộc.

## 8. Realtime, quota và offline

### Realtime

- Student submit → Firestore write.
- Teacher `onSnapshot` nhận phản hồi → tính aggregate → ghi public stats.
- TV `onSnapshot` nhận public state/stats.
- Mục tiêu vận hành dưới 3 giây khi mạng ổn định; tiêu chí chấp nhận kiểm thử là TV cập nhật trong tối đa 5 giây.

### Kiểm soát chi phí

- Không ghi từng phím.
- Một phản hồi chỉ ghi khi người học xác nhận/gửi.
- TV chỉ lắng nghe hai document tổng hợp, không đọc toàn bộ phản hồi cá nhân.
- Không tạo Cloud Function cho từng lượt chọn trong MVP; teacher mode làm aggregation để giảm hạ tầng và số lần đọc.
- Phiên tự hết hạn và có nút đóng để tránh listener mở cả ngày.

### Offline

- Student mode giữ hàng đợi local theo `sessionId + participantUid + stepId + clientNonce`.
- Khi online lại, gửi tuần tự và xử lý idempotent.
- Teacher/TV hiển thị rõ “đang dùng bản cuối đã đồng bộ” hoặc “chưa có kết nối”; không hiển thị số liệu realtime giả.
- Gói V2 local-first và PPTX/DOCX vẫn được giữ làm đường lui cho tiết demo khi Firebase hoặc mạng không ổn định.

## 9. Gắn với gói bài pilot V2

Nội dung P00–P40 của pilot được chuyển thành một `LiveLessonDefinition` có:

- cue giáo viên;
- màn hình TV tương ứng;
- thao tác học sinh;
- loại response;
- cách tính thống kê;
- cờ cho phép hiện thống kê.

AI Error W01 vẫn nằm trong khoảng P16:45–P20:00, không thêm thời lượng mới. TV chỉ hiện câu trả lời/đếm tổng hợp được phép; giáo viên vẫn dùng bảng và đối thoại để học sinh giải thích lỗi.

Các file local-first hiện tại được giữ ở `artifacts/lesson-pilot/...` làm bản chạy offline và tài nguyên đối chiếu. Runtime V3 trong web dùng schema/types chung, không yêu cầu giáo viên mở đồng thời nhiều file HTML rời.

## 10. Tiêu chí chấp nhận

### Luồng chức năng

1. Giáo viên đã đăng nhập mở được bài học đã xuất bản và tạo phiên gắn với lớp.
2. Học sinh dùng link/QR và PIN hiện có để vào đúng phiên.
3. Giáo viên chuyển cue; TV đổi màn hình tương ứng nhưng không lộ kịch bản giáo viên.
4. Một học sinh gửi lựa chọn; teacher mode và TV nhận thống kê mới qua `onSnapshot` trong tối đa 5 giây trên mạng ổn định.
5. Học sinh thứ hai gửi câu trả lời khác; phân bố trên TV tăng đúng, không nhân đôi khi retry.
6. Học sinh không đọc được response cá nhân của học sinh khác.
7. Học sinh không thể ghi response cho lớp/phiên không thuộc mình.
8. Phiên đóng hoặc hết hạn thì response mới bị từ chối.
9. Mất mạng không mất bản nháp đã xác nhận; khi online lại dữ liệu đồng bộ idempotent.
10. Kết quả cá nhân cuối tiết vẫn đi vào luồng adaptive hiện có mà không phá dashboard cũ.

### Kiểm thử bắt buộc

- Unit test cho reducer/aggregator và schema response.
- Firestore Emulator Rules test cho teacher, học sinh đúng lớp, học sinh sai lớp, TV public view, phiên hết hạn và đọc response trái phép.
- Browser integration với ba context teacher/TV/student.
- `npm run test:rules`, `npm run build`, lint/typecheck và kiểm tra route production.
- Smoke test Vcast/Sender: TV chỉ nhận cửa sổ `mode=tv`, laptop giữ `mode=teacher`.

## 11. Phân ranh triển khai

Đợt đầu chỉ triển khai runtime realtime + pilot package + Rules + hướng dẫn sử dụng. Không tự động deploy production hoặc thay đổi dữ liệu lớp thật trước khi emulator và browser integration đạt tiêu chí trên. Sau khi kiểm thử đạt, mới tạo bản build/deploy để giáo viên chạy thử trên một lớp nhỏ.
