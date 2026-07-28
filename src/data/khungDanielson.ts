/**
 * Khung Danielson dùng cho module dự giờ — 22 thành tố, 4 phần.
 *
 * Phần I chấm từ giáo án, Phần II–III từ quan sát trực tiếp, Phần IV từ hồ sơ
 * và đối thoại nên trọng số mặc định là 0 (không tính vào điểm tiết dạy).
 */

export type SoPhan = 1 | 2 | 3 | 4;

export type MaThanhTo =
  | '1a' | '1b' | '1c' | '1d' | '1e' | '1f'
  | '2a' | '2b' | '2c' | '2d' | '2e'
  | '3a' | '3b' | '3c' | '3d' | '3e'
  | '4a' | '4b' | '4c' | '4d' | '4e' | '4f';

export interface ThanhTo {
  ma: MaThanhTo;
  ten: string;
  phan: SoPhan;
}

export const COMPONENTS: readonly ThanhTo[] = [
  { ma: '1a', ten: 'Áp dụng kiến thức về nội dung giảng dạy và phương pháp sư phạm', phan: 1 },
  { ma: '1b', ten: 'Hiểu và tôn trọng học sinh', phan: 1 },
  { ma: '1c', ten: 'Đặt mục tiêu giảng dạy', phan: 1 },
  { ma: '1d', ten: 'Sử dụng học liệu hiệu quả', phan: 1 },
  { ma: '1e', ten: 'Cấu trúc bài giảng chặt chẽ', phan: 1 },
  { ma: '1f', ten: 'Thiết kế và phân tích bài đánh giá', phan: 1 },
  { ma: '2a', ten: 'Xây dựng môi trường học tập dựa trên sự tôn trọng & quan tâm', phan: 2 },
  { ma: '2b', ten: 'Xây dựng văn hóa học tập', phan: 2 },
  { ma: '2c', ten: 'Xây dựng môi trường học tập tự giác', phan: 2 },
  { ma: '2d', ten: 'Khuyến khích hành vi tích cực của học sinh', phan: 2 },
  { ma: '2e', ten: 'Tổ chức không gian học tập', phan: 2 },
  { ma: '3a', ten: 'Làm rõ mục tiêu và nội dung kiến thức', phan: 3 },
  { ma: '3b', ten: 'Sử dụng kĩ thuật đặt câu hỏi và trao đổi/thảo luận', phan: 3 },
  { ma: '3c', ten: 'Giúp học sinh tham gia tích cực', phan: 3 },
  { ma: '3d', ten: 'Đánh giá học tập', phan: 3 },
  { ma: '3e', ten: 'Linh hoạt đáp ứng nhu cầu của học sinh', phan: 3 },
  { ma: '4a', ten: 'Tham gia vào các hoạt động đánh giá, tổng kết (tự phản tư)', phan: 4 },
  { ma: '4b', ten: 'Lưu lại quá trình học tập và tiến bộ của HS', phan: 4 },
  { ma: '4c', ten: 'Huy động sự tham gia của gia đình và xã hội', phan: 4 },
  { ma: '4d', ten: 'Đóng góp vào cộng đồng và văn hóa trường học', phan: 4 },
  { ma: '4e', ten: 'Nâng cao năng lực chuyên môn', phan: 4 },
  { ma: '4f', ten: 'Hành động vì lợi ích của học sinh', phan: 4 },
];

/** Mô tả 4 mức của từng thành tố, ngăn bằng dấu `|`. Viết theo đặc thù môn Toán. */
export const RUBRIC_TOM_TAT: Record<MaThanhTo, string> = {
  '1a': '1 Có sai sót toán học không được sửa | 2 Chính xác nhưng theo quy trình, ít liên hệ | 3 Chính xác, dự đoán được lỗi sai phổ biến, nêu quan hệ tiền đề | 4 Nhiều cách tiếp cận, biến lỗi sai thành cơ hội học tập',
  '1b': '1 Không tính đến khác biệt của HS | 2 Chỉ tính đến trình độ chung của lớp | 3 Hiểu nền tảng, lỗ hổng của các nhóm HS | 4 Hiểu đến từng cá nhân, hỗ trợ cá nhân hoá',
  '1c': '1 Không có mục tiêu hoặc chỉ mô tả hoạt động | 2 Mục tiêu chung chung, khó đo | 3 Rõ, đo được, phù hợp chuẩn và trình độ | 4 Phân hoá, hướng tư duy bậc cao, HS hiểu rõ',
  '1d': '1 Học liệu không phù hợp | 2 SGK/phiếu ở mức cơ bản | 3 Chọn có chủ đích, phục vụ mục tiêu | 4 Đa dạng, phân hoá, HS được chọn công cụ',
  '1e': '1 Hoạt động rời rạc | 2 Có trình tự nhưng chưa cân đối | 3 Logic, thời gian hợp lí | 4 Nhiệm vụ nhiều tầng, có phương án dự phòng',
  '1f': '1 Không có kế hoạch kiểm tra hiểu bài | 2 Chỉ ở mức tái hiện | 3 Công cụ đánh giá quá trình gắn mục tiêu, tiêu chí rõ | 4 Đa dạng, phân hoá, HS tự đánh giá',
  '2a': '1 Có tương tác thiếu tôn trọng không được xử lí | 2 Đúng mực nhưng hình thức, phản hồi không đều | 3 Tôn trọng, quan tâm, lắng nghe mọi HS | 4 HS chủ động tôn trọng nhau, dám nói chỗ chưa hiểu',
  '2b': '1 Thụ động, sai lầm bị coi là thất bại | 2 HS làm vì được yêu cầu | 3 Kì vọng cao, coi trọng lập luận hơn đáp số | 4 HS tự đặt chuẩn chất lượng, tranh luận toán học',
  '2c': '1 Nhiều thời gian chết, không có quy trình | 2 Có quy trình nhưng chưa thành thói quen | 3 Quy trình trơn tru, HS biết phải làm gì | 4 HS tự vận hành quy trình',
  '2d': '1 Kì vọng hành vi không rõ | 2 Nhắc nhở thiếu nhất quán | 3 Kì vọng rõ, nhất quán, chủ động phòng ngừa | 4 HS tự điều chỉnh hành vi',
  '2e': '1 Bố trí cản trở việc học | 2 An toàn nhưng chưa phù hợp hoạt động | 3 Phù hợp hoạt động, mọi HS tiếp cận được | 4 HS chủ động điều chỉnh không gian',
  '3a': '1 HS không biết học gì để làm gì | 2 Có nêu mục tiêu nhưng HS chưa nắm | 3 Rõ, có ví dụ và phản ví dụ, ngôn ngữ toán chính xác | 4 HS diễn đạt lại được và giải thích cho bạn',
  '3b': '1 Câu hỏi một từ, vài HS trả lời, không có thời gian chờ | 2 Có câu hỏi mở nhưng chỉ theo trục GV-HS | 3 Nhiều mức tư duy, HS giải thích cách làm, có thời gian chờ | 4 HS phản biện và xây dựng trên ý của nhau',
  '3c': '1 HS nghe và chép | 2 Nhiệm vụ đơn điệu, một bộ phận không tham gia | 3 Nhiệm vụ đòi hỏi tư duy, đa số tham gia thực chất | 4 Nhiệm vụ mở, HS chọn chiến lược',
  '3d': '1 Không kiểm tra hiểu bài, phản hồi đúng/sai | 2 Kiểm tra tổng thể, phản hồi chung chung | 3 Thu minh chứng từ nhiều HS, phản hồi cụ thể kịp thời | 4 HS tự đánh giá theo tiêu chí, GV điều chỉnh ngay trong tiết',
  '3e': '1 Bám cứng giáo án dù HS gặp khó | 2 Điều chỉnh nhỏ, HS xong sớm ngồi chờ | 3 Điều chỉnh nhịp độ/mức nhiệm vụ theo phản hồi HS | 4 Nhiều phương án, HS được chọn mức nhiệm vụ',
  '4a': '1 Không nêu được gì đã diễn ra, quy nguyên nhân cho hoàn cảnh | 2 Nhận xét chung chung, không dẫn bằng chứng | 3 Đánh giá chính xác mức đạt mục tiêu, dẫn bằng chứng, nêu điều sẽ điều chỉnh | 4 Phân tích được vì sao, đưa nhiều phương án thay thế có lí do',
  '4b': '1 Không có hệ thống lưu kết quả | 2 Chỉ ghi điểm số | 3 Theo dõi theo chuẩn đầu ra, dùng để phân nhóm hỗ trợ | 4 HS nắm được tiến trình của mình, đặt mục tiêu cá nhân',
  '4c': '1 Không liên lạc PH hoặc chỉ khi HS vi phạm | 2 Liên lạc một chiều theo quy định | 3 Hai chiều thường xuyên, có thông tin tích cực | 4 PH tham gia thực chất, HS cùng tham gia trao đổi',
  '4d': '1 Không tham gia sinh hoạt tổ | 2 Tham gia khi được yêu cầu | 3 Tích cực, chia sẻ tài liệu, hỗ trợ đồng nghiệp | 4 Chủ động khởi xướng, dẫn dắt',
  '4e': '1 Từ chối bồi dưỡng, phản ứng tiêu cực với góp ý | 2 Tham dự theo yêu cầu, tiếp nhận bị động | 3 Chủ động tìm cơ hội đúng nhu cầu, áp dụng góp ý vào bài dạy | 4 Chia sẻ lại cho tổ, góp phần bồi dưỡng đồng nghiệp',
  '4f': '1 Thiếu trung thực/công bằng hoặc bỏ qua quyền lợi HS | 2 Đúng quy định nhưng thụ động | 3 Chủ động phát hiện và hỗ trợ HS khó khăn | 4 Dám lên tiếng, tìm nguồn lực khi quyền lợi HS bị ảnh hưởng',
};

export const TEN_PHAN: Record<SoPhan, string> = {
  1: 'Phần I · Lập kế hoạch và chuẩn bị',
  2: 'Phần II · Môi trường học tập',
  3: 'Phần III · Hoạt động học tập',
  4: 'Phần IV · Đạo đức giảng dạy',
};

/** Nguồn minh chứng của từng phần — hiện ngay dưới tiêu đề phần trong giao diện. */
export const NGUON_PHAN: Record<SoPhan, string> = {
  1: 'căn cứ giáo án',
  2: 'quan sát trực tiếp',
  3: 'quan sát trực tiếp',
  4: 'hồ sơ & đối thoại · không tính vào điểm tiết dạy',
};

export const TRONG_SO: Record<SoPhan, number> = { 1: 0.2, 2: 0.35, 3: 0.45, 4: 0 };
