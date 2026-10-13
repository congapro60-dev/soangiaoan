# Thiết kế lại luồng HS — 14/10/2026

Trạng thái: approved-for-build; người dùng đã yêu cầu sửa xong toàn bộ rồi phát hành ngày 14/10/2026.
Quyền: triển khai kế hoạch này, kiểm thử, commit và push lên main sau khi cổng kiểm đạt.
Người dùng sửa rõ 14/10/2026: “push lên main”, không yêu cầu deploy/promote thủ công. Vercel có thể tự chạy theo Git integration.
Phối hợp: cập nhật HANDOFF.md và tasks/todo.md sau mỗi mốc; Claude đọc đúng worktree/nhánh trước khi nhận file.
Kế thừa WIP xem ảnh và bút đỏ, không ghi đè hoặc bỏ thay đổi đã được duyệt.

## Mục tiêu

HS tìm bài, xử lý câu chưa chắc, xem điểm/thống kê/báo cáo/năng lực nhanh trên điện thoại và iPad.
Không cần cuộn qua toàn bộ năm học; không làm lộ điểm/đáp án/dấu chữa chưa duyệt.

## Bằng chứng hiện tại

- Phiên production GV xác nhận tài khoản Vũ Việt Cường; dùng cổng HS thật lớp 11Columbus.
- Đã xem Lê Trung Đức và Trần Phúc Minh; cả hai hiện không còn câu chờ xác nhận tại lúc khảo sát.
  Không gửi câu trả lời, nộp bài, sửa hoặc duyệt điểm.
- Điện thoại 390×844: trang 22.504px; Bài tập top1.384, Bảng điểm top18.070, Năng lực top18.889.
- iPad 820×1180: trang17.175px; Bảng điểm top14.140, Năng lực top14.753. Không tràn ngang, nhưng quá dài.
- StudentPortalDashboard.tsx:283 render global ClarifyPanel; gom mọi attempt tại243–249, không chỉ latest.
- Sổ điểm và năng lực đã có, chưa có khu vực riêng; nhận xét/kết quả từng câu bung sẵn trong danh sách bài.
- API studentAssignments chỉ100 bài mở; studentSubmissions limit50 trước lọc lớp/GV; online limit100 trước lọc lớp.
  projectStudentAssignment còn hardcode isOpen:true. Không thể hứa hỗ trợ cả năm bằng pagination UI đơn thuần.

## Bố cục đề xuất

Năm mục điều hướng luôn dễ tới: Bài tập · Sổ điểm · Thống kê · Năng lực · Báo cáo.
Điện thoại: thanh dưới gọn; iPad/laptop: thanh tab trên cố định. Chỉ render nội dung mục đang chọn.
Giữ tên HS/lớp, chuông thông báo, chi phí AI, đăng xuất ở header nhỏ; không lặp khối hero lớn.

### Bài tập

- Mặc định ưu tiên Cần xử lý; vẫn có Tất cả, Chờ GV, Đã có điểm; tìm tên bài, lọc thời gian và trạng thái.
- Mỗi dòng chỉ tên bài, hạn, trạng thái, điểm chính thức nếu có, nút mở bài. Không tự bung ảnh đề/lời nhận xét/22 câu.
- Phân trang20 bài, kèm tổng kết quả và trang; mở bài mới tải ảnh/chấm/lịch sử chi tiết. Giữ tìm kiếm/bộ lọc khi quay lại.
- Bộ lọc Bài tập theo ngày giao (assignment.createdAt); hạn nộp hiển thị riêng. Thống kê theo ngày nộp của lượt cuối,
  bài chưa nộp dùng ngày giao và ghi rõ; không trộn ngày chấm vào cùng bộ lọc.
- Mọi bài của HS gồm đang mở và đã đóng; bài đóng chỉ xem lịch sử, không mở lại quyền nộp.
- Chi tiết bài có đề, ảnh đã nộp, kết quả/bút đỏ sau duyệt, bổ sung ảnh theo luật hiện có.
- Bài cần HS xử lý có badge "Cần xác nhận N câu"; bấm mở trong đúng bài, không global panel.
- Chỉ latest active attempt được yêu cầu trả lời; lịch sử cũ giữ để đối chiếu nhưng không tạo tác vụ trùng.
- "Máy chưa chắc/GV cần soát" khác "HS cần xác nhận": không ép HS trả lời câu bỏ trống hoặc tự luận không đọc được.
  Giữ phép kiểm studentAnswer thực sự có nét đã đọc; rà lại lỗi blank đã phát hiện từ QA trước.
- Chấm lại ảnh tiếp tục refresh dù HS đóng phần xác nhận; bản nháp và ảnh chọn chưa nộp không mất khi đổi mục.
- Luyện tập và Chấm thử có đường vào gọn trong Bài tập, không chiếm hero hoặc đẩy mục khác xuống cuối.

### Sổ điểm

Dùng StudentScoreView hiện có: điểm hệ số, khảo sát/thi định kì, quý TDS, chuyên cần và bài đã duyệt.
Bảng gọn có tìm/lọc kỳ; điện thoại mỗi dòng nhãn+điểm, iPad có thêm ngày/hệ số.
Không thay thang điểm/công thức tổng; mục thiếu dữ liệu hiện "Chưa có", không hiển thị0 giả.
Chỉ lọc kỳ khi nguồn sổ có phân kỳ rõ; không suy kỳ từ nhãn mơ hồ hoặc tự chia lại điểm hệ số.
Điểm TB có hệ số theo sổ server là nguồn chuẩn, bộ lọc danh sách không tự đổi công thức.

### Thống kê

Theo từng bài: ngày, điểm/max, trạng thái, lượt nộp, nút tới đúng bài. Thống kê chỉ điểm đã duyệt,
có bộ lọc thời gian và xu hướng ngắn. Tổng tính trên toàn tập dữ liệu hợp lệ, không tính trên trang20 dòng đang xem.
Lượt chấm thử tách khỏi điểm chính thức; không biến tín hiệu luyện tập thành điểm học bạ.
Bài periodicTest: phân tích AI không thay điểm bài giấy/SSM chính thức, không dùng điểm AI đó tính TB chính thức.

### Năng lực

Đưa hồ sơ tự đánh giá cùng GV và tiến độ kỹ năng vào mục riêng, một chạm là tới.
Danh sách năng lực gọn, chọn mới mở mô tả4 mức/mục tiêu/khó khăn. Giữ nội dung đã lưu và quyền sửa hiện có.

### Báo cáo

Giả định cần đúng báo cáo GV đã công bố cho PH, gồm kỳ/ngày, nhận xét, bản đồ theo bài SGK, năng lực và PDF.
HS chỉ xem báo cáo đã công bố của chính mình; chưa công bố có empty-state rõ. Không tạo AI/report mới khi mở.
Tái dùng pipeline snapshot/live/overrides và render báo cáo PH, không dùng PIN PH và không ghi sự kiện PH.
API lấy HS/lớp từ studentLinks của phiên; kiểm quyền và allowlist nội dung công bố, loại raw answers/internal notes.
Allowlist cả cấu trúc lồng ParentSafeReport; tải chi tiết phải kiểm báo cáo còn công bố và HS còn thuộc lớp,
không chỉ kiểm khi tải danh sách. Dùng đúng snapshot/live/fallback/overrides như PH.

## Bổ sung: trình bày lời chữa và công thức — yêu cầu 14/10/2026

Nguồn: ảnh người dùng gửi và tệp đính kèm "Văn bản đã dán.txt". Tài liệu là tham khảo;
chỉ chọn yêu cầu phù hợp luồng web, không coi các yêu cầu xuất bản tài liệu là lệnh thực hiện.

### Bằng chứng và nguyên nhân

- Ảnh cho thấy phần "Cách sửa" ghép lời dẫn với toàn chuỗi tính, xuống dòng giữa các số hạng.
  Công thức vectơ đã được dựng, không thể kết luận toàn bộ tính năng thiếu typesetting.
- NhanXetMarkdown.tsx đã dùng remarkMath + rehypeKatex và sanitizeDisplayText; không cần thêm thư viện.
- gradingPrompt.ts có quy tắc Markdown/LaTeX, nhưng phần trình bày nhắm feedbackForStudent,
  chưa quy định rõ cấu trúc explanation/correction và phép tính nhiều bước.
- Quy tắc retry/RECITATION yêu cầu viết ngắn để tránh cắt JSON và trích dẫn nguyên văn.
  Bổ sung bố cục phải giữ các giới hạn này, không biến mọi câu thành lời giải dài.

### Quyết định chọn lọc

- Mỗi đoạn diễn đạt một ý. Lời dẫn tách khỏi phép tính; đánh số bước khi thực sự có nhiều bước.
  Không bắt buộc mọi câu phải có ba bước hay tự thêm diễn giải chưa được duyệt.
- Công thức ngắn trong dòng; chuỗi biến đổi nhiều bước thành khối riêng, căn dấu bằng bằng aligned.
  Phân số, căn, mũ, chỉ số, vectơ, hệ phương trình dùng cấu trúc LaTeX đúng.
- Ngắt chuỗi dài tại quan hệ bằng/suy ra hoặc ranh giới bước tính; giữ dấu và toán hạng cùng nhau.
  Không thêm break-all vào công thức hoặc tự cắt theo số ký tự; không thu chữ cho vừa.
- Khối tính ưu tiên căn trái trong thẻ hẹp, khoảng cách vừa đủ. Ma trận hoặc biểu thức không thể
  chia an toàn được cuộn ngang riêng trong khối; không làm cả trang tràn ngang, không cắt mất nội dung.
- Đường chấm mới tạo Markdown có cấu trúc cho feedbackForStudent, explanation, correction,
  giữ escape JSON đúng và giữ chế độ quick/thorough, retry, RECITATION.
- Nội dung cũ chỉ cải thiện hiển thị khi có cấu trúc xác định an toàn; không gọi AI để viết lại,
  không chấm lại hoặc sửa bài/đáp án/điểm đã duyệt chỉ vì thay bố cục.
- Dùng chung renderer tại lời chữa bút đỏ, chi tiết từng câu và nơi GV xem cùng lời chữa.
  Nếu cần xử lý dữ liệu toán lỗi, sửa có kiểm chứng tại mathText.ts; không thêm regex vá riêng từng màn.
- Không mở rộng sang XeLaTeX/A4/Word OMML/TikZ/ma trận đề hoặc thiết kế lại xuất PDF trong việc này.

Ví dụ bố cục từ ảnh (minh họa cách trình bày, không phải chỉnh dữ liệu HS):

Lời dẫn: "Công của lực được tính bằng tích vô hướng."

$$
\begin{aligned}
A &= \vec{F}\cdot\overrightarrow{AB}\\
  &= 2\cdot4+1\cdot(-2)+3\cdot1\\
  &= 8-2+3\\
  &= 9\,\mathrm{J}.
\end{aligned}
$$

### Nghiệm thu bổ sung

- Kiểm chính component bằng ví dụ trong ảnh, phân số/căn, vectơ, hệ phương trình và chuỗi dài
  trên 390/430px, iPad820/1024px và desktop1366px; chụp và xem từng trường hợp.
- Không lộ ký tự LaTeX/escape; không bọc lời văn tiếng Việt thành công thức; lời dẫn và các bước rõ ràng.
  Nội dung nguồn không đổi, không mất dấu/số hạng, không đổi thứ tự phép tính.
- Kiểm công thức tại mọi bước qua sanitizer đến KaTeX; test prompt thông thường và retry,
  không dùng test chỉ dò sự xuất hiện của một câu hướng dẫn để thay cho kiểm hiển thị.
- Người dùng duyệt triển khai và phát hành 14/10/2026; QA phải có bằng chứng trước khi đưa lên production.

## Phương án dữ liệu và phạm vi backend

Chọn index workspace nhẹ: metadata toàn bộ bài HS được giao, latest attempt/status, số câu xác nhận,
điểm chính thức theo bài; không gửi ảnh/questionResults tất cả bài. Mở bài tải detail qua projection HS.
Không thêm database hay aggregate vật chất hóa. Xử lý scope trước giới hạn; không sort sau limit gây mất bài.
Chốt quy mô kiểm: index đầy đủ nhẹ cho300 bài/500 lượt, phân trang20 dòng phía UI trên index hoàn chỉnh.
Mở bài tải detail riêng; tổng/count/điểm từng bài từ index có scope đầy đủ. Không dùng legacy arrays đã bị cắt.
Sổ điểm/tổng kết đọc toàn dữ liệu hợp lệ, báo cáo tái sử dụng nguồn chuẩn đã công bố.
Không chỉ xóa limit rồi tải hàng trăm payload ảnh/chấm vào máy HS.

## Rủi ro và đánh đổi

Rủi ro trung bình: đổi bố cục, tải chi tiết theo yêu cầu, thêm đọc báo cáo và index lịch sử.
Rủi ro cao cần kiểm: quyền HS đúng lớp/GV, không leak dữ liệu chưa duyệt; thống kê không thiếu lịch sử.
Ưu: không cuộn dài, nhiệm vụ gắn đúng bài, giao diện gọn và dữ liệu cả năm có thể tra cứu.
Đánh đổi: mở bài thêm1 thao tác; báo cáo phải đi server projection, không chép màn GV hay dùng PIN PH.

## Tiêu chí nghiệm thu

1. Fixture có bài đang chờ: đầu trang không có hàng loạt câu; đúng bài có badge; mở/trả lời/quay lại đúng bài.
   QA phiên HS thật trường hợp chờ khi có dữ liệu thực tế; hiện chưa có case này, không tự tạo/nộp bài thật cho đủ thử.
2. Không hỏi lại blank; HS chưa duyệt không thấy điểm/đáp án/bút đỏ. GV vẫn soát đầy đủ.
3. 390/430px, iPad820/1024px, desktop1366px: không overflow, nút>=44px, không co chữ thành cột hẹp.
4. 300 bài/500 lượt fixture: tối đa20 dòng danh sách, tìm bài cũ và trạng thái chính xác, tổng không thay khi chuyển trang.
5. Mục sổ điểm/năng lực/thống kê/báo cáo truy cập trong1 lần chọn tab, không qua danh sách bài dài.
6. Báo cáo HS đối chiếu với bản PH công bố, không raw notes/answers; kiểm phiên sai lớp/HS bị từ chối.
7. Mất mạng/đổi mục không mất bộ ảnh chờ nộp hay draft clarify; các trạng thái chấm lại tiếp tục cập nhật.
8. Test hành vi/quyền, full suite, lint app/API, build, Rules emulator; QA browser local fixture và real prod sau phát hành.

## Thứ tự triển khai sau duyệt

- [x] Khảo sát production HS thật + source và dữ liệu sẵn có, ghi bằng chứng.
- [x] Phản biện backend độc lập: xác nhận limit/scope và báo cáo công bố cần projection.
- [x] Chốt bố cục5 mục, báo cáo công bố và trình bày công thức; người dùng duyệt triển khai/phát hành 14/10/2026.
- [x] Backend index/detail/report private; test quyền, lịch sử và tổng toàn năm.
- [x] UI điều hướng gọn/bảng bài/chi tiết bài/clarify đúng bài; nối lại bút đỏ và ảnh đã nộp.
- [x] Trình bày lời chữa theo ý/bước, công thức khối căn dấu bằng; QA trực quan điện thoại/iPad.
- [x] QA300/500 fixture, source review độc lập và Gemini PASS; bằng chứng tasks/qa-student-workspace-20261014.md.
- [ ] Full suite cuối + commit/push main; origin/main phải đúng commit đã kiểm.
- [ ] QA HS/GV production phiên mới nếu Git integration tự triển khai; ghi rõ không có pending thật hiện tại.

Đã được phép commit/push main sau kiểm; không deploy/promote thủ công. QA không tự đổi PIN, nộp hoặc duyệt bài thật để tạo dữ liệu thử.

## Tự review

Reviewer chỉ đọc đã xác nhận5 điểm: bằng chứng pending hiện source-only, index đầy đủ+UI paging20,
không suy kỳ hoặc đổi TB sổ, periodic AI khác điểm chính thức, báo cáo nested allowlist+recheck công bố.
Đã cập nhật vào kế hoạch; không còn giả định quan trọng bị giấu.
