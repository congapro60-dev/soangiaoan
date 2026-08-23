# Đặc tả thiết kế — Lỗi AI trong tuần

**Ngày:** 23/08/2026
**Phạm vi triển khai đầu tiên:** 48 giáo án Ban Toán Khối 10–12, Tuần 5–6, cùng PPTX và thẻ công cụ hiện có.

## 1. Quyết định thiết kế

Không tạo thêm một hoạt động thứ sáu và không cộng thêm thời lượng vào P0–P40. Hoạt động được thiết kế như một sợi chỉ đỏ trong tiết học:

- 48/48 tiết có một phiên bản ngắn, 1–2 phút, dùng lỗi gắn với đúng nội dung tiết.
- 20 tiết được chọn để triển khai đầy đủ chuỗi: tìm lỗi → phân loại → sửa → chứng minh → giải thích vì sao AI mắc lỗi.
- Chỉ các lỗi đầy đủ có sản phẩm đạt chuẩn mới được đưa vào thư viện lớp; không lưu tự động mọi lỗi vi mô.

“AI Error of the Week” là tên của chuỗi năng lực, không bắt buộc mỗi tiết hoặc mỗi tuần chỉ có đúng một lỗi. Khi một tuần có hai mạch kiến thức khác nhau, mỗi mạch vẫn có lỗi ngắn phù hợp; giáo viên chọn 1–2 sản phẩm tiêu biểu để lưu thư viện.

## 2. Hai mức hoạt động

### 2.1. Bản vi mô — dùng ở mọi tiết

Thời lượng: 1–2 phút, thay một câu hỏi hoặc một lượt phản biện đã có.

Quy trình tối thiểu:

1. GV chiếu/đọc một đoạn lời giải AI có lỗi đã được kiểm chứng.
2. HS chỉ ra dòng hoặc điều kiện đáng nghi.
3. GV hỏi một câu gắn với kiến thức tiết học: “Bằng chứng nào cho thấy bước này chưa hợp lệ?”
4. HS ghi một từ khóa hoặc một bước sửa vào vở/phiếu.

Không yêu cầu HS hoàn thành đủ năm bước trong tiết hình thành kiến thức.

### 2.2. Bản đầy đủ — dùng ở 20 tiết trọng tâm

Thời lượng sử dụng lại trong tiến trình hiện có:

- HĐ2 P25–P32: 7 phút cho cả chuỗi năm bước.
- Nếu phù hợp, HĐ1 P13–P18 chuẩn bị bằng một lượt khoanh dòng sai; không cộng thời gian.
- P32–P38 chỉ dùng một câu thoát ngắn để kiểm tra phép chứng minh hoặc lý do AI sai.

Sản phẩm bắt buộc gồm: dòng sai, loại lỗi, lời giải sửa, phép kiểm/chứng minh và một câu giải thích về giới hạn của đầu ra AI.

## 3. Phân loại 48 tiết

### Bản đầy đủ — 20 tiết

- **Khối 10:** 10-5-35, 10-5-37, 10-5-38, 10-6-40, 10-6-41, 10-6-44, 10-6-45.
- **Khối 11:** 11-5-31, 11-5-32, 11-6-35, 11-6-37, 11-6-40, 11-6-41.
- **Khối 12:** 12-5-27, 12-5-29, 12-5-32, 12-5-33, 12-6-38, 12-6-40, 12-6-41.

Lý do chọn: tiết luyện tập/ôn tập/tự chọn đã có nhiệm vụ phản biện, phép kiểm hoặc sản phẩm nhiều bước; việc thay lỗi thường gặp bằng lỗi AI không làm thay đổi mục tiêu Toán.

### Bản vi mô — 28 tiết còn lại

- **Khối 10:** 10-5-31–34, 10-5-36, 10-6-39, 10-6-42–43, 10-6-46.
- **Khối 11:** 11-5-26–30, 11-5-33, 11-6-34, 11-6-36, 11-6-38–39.
- **Khối 12:** 12-5-26, 12-5-28, 12-5-30–31, 12-6-34–37, 12-6-39.

Các tiết này vẫn thể hiện năng lực kiểm định AI, nhưng không chiếm thời gian cần cho việc hình thành khái niệm mới.

## 4. Bốn loại lỗi

Trong giáo án và lời thoại dùng tiếng Việt, không chèn thuật ngữ tiếng Anh ngoài cầu nối CIS đã được quy định:

1. Lỗi khái niệm.
2. Lỗi đại số.
3. Lỗi logic.
4. Thiếu điều kiện.

Mỗi thẻ phải có một lỗi có thật, không được tạo lỗi mơ hồ hoặc đáp án gây tranh cãi. Lỗi được chọn từ lỗi đặc trưng của bài, chẳng hạn: chọn sai nửa mặt phẳng, bỏ hệ số một phần hai, trộn chu kỳ lượng giác, bỏ điều kiện xác định, nối hai nhánh qua tiệm cận đứng hoặc nhầm tích vô hướng với tích tọa độ.

## 5. Kênh hiển thị và công cụ

- **TV:** chiếu lời giải AI, dữ kiện và dòng cần kiểm tra; không chiếu đáp án sớm.
- **Bảng lớn/bảng phụ:** chỉ ghi khung ngắn “Dòng sai → Loại lỗi → Sửa → Phép kiểm”. Cầu nối CIS song ngữ chỉ nằm ở phần ghi bảng.
- **Vở/phiếu:** giữ bản chính của lời giải và bằng chứng; đây là sản phẩm bắt buộc kể cả khi dùng thiết bị.
- **Slido:** chỉ dùng cho phân loại hoặc câu trả lời ngắn khi đã có kết nối.
- **Padlet:** chỉ dùng cho lời giải dài hoặc lưu sản phẩm thư viện khi giáo viên có quyền tạo bảng thật.
- **AnswerGarden:** chỉ dùng khi cần gom một từ khóa ngắn, không dùng để chấm lời giải nhiều bước.
- **Fallback:** phiếu/vở/bảng phụ, giữ nguyên câu hỏi và tiêu chí nếu mạng, tài khoản hoặc thiết bị không sẵn sàng.

Không gọi AI trực tiếp trong giờ. Lời giải được chuẩn bị trước, giáo viên kiểm chứng độc lập và không chứa dữ liệu cá nhân của học sinh.

## 6. Phân hóa và hỗ trợ ngôn ngữ

- **Nhóm cần hỗ trợ:** khoanh dòng sai, chọn giữa hai loại lỗi, dùng khung “Bước này sai vì …”.
- **Nhóm chuẩn:** tự phân loại, sửa và thực hiện phép kiểm.
- **Nhóm nâng cao:** giải thích giới hạn của lời giải, tạo phản ví dụ hoặc sửa một điều kiện để lời giải trở nên đúng.
- **Khối 10:** dùng biểu tượng, hình, ký hiệu và mẫu câu ngắn trước khi yêu cầu diễn đạt tiếng Việt học thuật.
- **Khối 11:** dùng khung câu phản biện “Em không đồng ý với bước … vì …; phép kiểm là …”.
- **Khối 12:** dùng khung phổ quát, yêu cầu lập luận và phép kiểm rõ ràng.

Không hạ chuẩn Toán vì khác biệt ngôn ngữ; chỉ thay đổi đường vào và hình thức hỗ trợ.

## 7. Thư viện lỗi AI

Mỗi mục thư viện có tối thiểu:

- Mã thẻ và bài học.
- Lời giải AI sai đã được giáo viên duyệt.
- Dòng sai và loại lỗi.
- Lời giải sửa cùng phép kiểm.
- Lý do AI có thể mắc lỗi.
- Một câu hỏi hoặc biến thể để dùng lại.

Thư viện local là nguồn dự phòng và nguồn chuẩn. Việc đưa lên Padlet chỉ là bước hiển thị bổ sung, không phải điều kiện để đạt mục tiêu Toán.

## 8. Tiêu chí nghiệm thu sau khi được triển khai

- Đủ 48/48 giáo án có bản vi mô.
- Đúng 20 tiết có bản đầy đủ theo danh sách trên, trừ khi có bằng chứng PPCT mới buộc phải đổi.
- Không thêm hoạt động ngoài P0–P40 và không làm mất các bước hình thành/luyện tập hiện có.
- Cột `Nội dung ghi bảng` chỉ chứa nội dung thực sự ghi/chiếu trên bảng theo thứ tự; kịch bản vận hành chi tiết nằm ở phụ lục.
- Tiếng Anh chỉ xuất hiện ở cầu nối CIS và tên thương hiệu công cụ theo quy ước đã duyệt.
- Mỗi lỗi có đáp án, phép kiểm và phương án fallback.
- DOCX, PPTX và thẻ công cụ được sinh từ nguồn staging; phải kiểm XML/OMML, render trực quan và đối chiếu checksum trước khi ghi đè.

## 9. Ngoài phạm vi

- Không tự tạo hoặc tuyên bố đã tạo phòng Slido, Padlet hay AnswerGarden online.
- Không sửa PPCT hoặc nội dung Toán gốc nếu không có mâu thuẫn cần xử lý.
- Không thêm hoạt động này vào các tuần ngoài W5–W6 trong đợt đầu.
