import { UpgradeMenuItemId } from '../../types';
import { VIETNAMESE_WRITING_RULES } from '../../prompts/vietnameseWriting';
import { KNOWLEDGE_NANG_LUC_SO } from './knowledge/nangLucSo';
import { KNOWLEDGE_NANG_LUC_AI } from './knowledge/nangLucAI';
import { KNOWLEDGE_PHUONG_PHAP_DAY_HOC } from './knowledge/phuongPhapDayHoc';
import { KNOWLEDGE_GAME_TEMPLATES } from './knowledge/gameTemplates';

export const getProductPrompt = (menuId: UpgradeMenuItemId, lessonContent: string, analysisSummary: string): string | null => {
  const basePrompt = `Bạn là một chuyên gia giáo dục bậc thầy. 
Dưới đây là giáo án gốc và bản phân tích tóm tắt:

<giao_an_goc>
${lessonContent}
</giao_an_goc>

<phan_tich_tom_tat>
${analysisSummary}
</phan_tich_tom_tat>

Dựa trên dữ liệu trên, hãy thực hiện yêu cầu sau đây một cách chuyên nghiệp nhất, sử dụng định dạng Markdown rõ ràng, dễ đọc.
${VIETNAMESE_WRITING_RULES}
`;

  const prompts: Partial<Record<UpgradeMenuItemId, string>> = {
    'A': `YÊU CẦU: Thiết kế lại một Hoạt động khởi động (Warm-up) thật hấp dẫn cho bài học này.
Mục tiêu: Kích thích sự tò mò, kết nối kiến thức cũ với bài mới trong 5-7 phút.
Vui lòng trình bày rõ: Tên hoạt động, Cách thức tổ chức, và Lời dẫn dắt của giáo viên.
Xuất nội dung hoàn toàn bằng Markdown.`,

    'B': `YÊU CẦU: Thiết kế lại Hoạt động Hình thành kiến thức mới cho bài học này.
Mục tiêu: Đảm bảo học sinh đóng vai trò trung tâm, tự khám phá kiến thức thay vì nghe giảng thụ động.
Vui lòng trình bày rõ: Tên hoạt động, Nhiệm vụ của học sinh, Cách giáo viên chốt kiến thức.
Xuất nội dung hoàn toàn bằng Markdown.`,

    'C': `YÊU CẦU: Thiết kế lại Hoạt động Luyện tập cho bài học này.
Mục tiêu: Củng cố ngay các kiến thức vừa học thông qua các dạng bài tập hoặc trò chơi luyện tập tương tác.
Vui lòng cung cấp 3-5 bài tập/tình huống và đáp án/hướng dẫn giải.
Xuất nội dung hoàn toàn bằng Markdown.`,

    'D': `YÊU CẦU: Thiết kế lại Hoạt động Vận dụng/Mở rộng cho bài học này.
Mục tiêu: Gắn kết kiến thức với thực tiễn đời sống, phát triển tư duy bậc cao.
Vui lòng thiết kế 1-2 nhiệm vụ thực tế (Project nhỏ hoặc câu hỏi mở) để học sinh tự làm ở nhà.
Xuất nội dung hoàn toàn bằng Markdown.`,

    'E': `YÊU CẦU: Tạo một Phiếu học tập (Worksheet) chi tiết cho học sinh dựa trên bài học này.
Phiếu học tập cần bao gồm:
1. Tiêu đề phiếu học tập (hấp dẫn, sát nội dung).
2. Tóm tắt lý thuyết cốt lõi (rất ngắn gọn, dạng sơ đồ hoặc gạch đầu dòng).
3. Bài tập trắc nghiệm nhanh (3-5 câu).
4. Bài tập tự luận/Vận dụng (2-3 câu từ dễ đến khó).
5. (Tuỳ chọn) Trò chơi nhỏ (ô chữ, nối từ) liên quan.

Vui lòng xuất nội dung hoàn toàn bằng định dạng Markdown (hỗ trợ bảng biểu nếu cần). Đừng giải thích thêm.`,

    'F': `YÊU CẦU: Tạo một danh sách các câu hỏi kiểm tra đánh giá theo các mức độ nhận thức (Bloom) cho bài học này.
Cấu trúc cần có:
1. Mức độ Nhận biết (3 câu trắc nghiệm + đáp án).
2. Mức độ Thông hiểu (3 câu trắc nghiệm + đáp án).
3. Mức độ Vận dụng (2 câu tự luận ngắn + hướng dẫn chấm).
4. Mức độ Vận dụng cao (1 câu tự luận mở rộng/thực tế + hướng dẫn chấm).

Vui lòng xuất nội dung hoàn toàn bằng định dạng Markdown. Đừng giải thích thêm.`,

    'L': `YÊU CẦU: Tạo một Bảng tiêu chí đánh giá (Rubric) chi tiết cho hoạt động quan trọng nhất hoặc sản phẩm học tập của bài học này.
Cấu trúc Rubric:
- Bảng (Markdown Table) gồm các cột: Tiêu chí, Xuất sắc (9-10), Tốt (7-8), Đạt (5-6), Cần cố gắng (Dưới 5).
- Mỗi ô trong bảng miêu tả rõ biểu hiện hành vi hoặc chất lượng sản phẩm.
- Phần hướng dẫn giáo viên cách sử dụng bảng Rubric này.

Vui lòng xuất nội dung hoàn toàn bằng định dạng Markdown. Đừng giải thích thêm.`,

    'Q': `YÊU CẦU: Thiết kế nhiệm vụ học tập phân hoá (Differentiated Instruction) cho bài học này, nhằm đáp ứng các đối tượng học sinh khác nhau.
Phân hoá làm 3 nhóm:
- Nhóm 1 (Cần hỗ trợ/Học chậm): Nhiệm vụ cụ thể, vừa sức, có nhiều giàn giáo (scaffolding) hỗ trợ.
- Nhóm 2 (Đại trà/Khá): Nhiệm vụ chuẩn theo yêu cầu cần đạt của bài.
- Nhóm 3 (Năng khiếu/Giỏi): Nhiệm vụ thách thức, mở rộng, yêu cầu tư duy bậc cao, tự do sáng tạo.

Ghi chú rõ cách giáo viên tổ chức và quản lý 3 nhóm này trong cùng một tiết học.
Vui lòng xuất nội dung hoàn toàn bằng định dạng Markdown. Đừng giải thích thêm.`,

    'G': `YÊU CẦU: Bổ sung chỉ số năng lực số cho bài học này dựa trên tài liệu tham khảo sau:

<tai_lieu_tham_khao>
${KNOWLEDGE_NANG_LUC_SO}
</tai_lieu_tham_khao>

Dựa vào giáo án và tài liệu trên, hãy:
1. Đề xuất 1-2 năng lực số phù hợp nhất có thể tích hợp vào bài học này.
2. Viết lại một hoạt động cụ thể trong giáo án để thể hiện rõ việc rèn luyện năng lực số đó (ví dụ: dùng công cụ gì, học sinh thao tác thế nào).
Vui lòng xuất nội dung hoàn toàn bằng định dạng Markdown.`,

    'H': `YÊU CẦU: Bổ sung năng lực AI (AI Literacy) cho bài học này dựa trên tài liệu tham khảo sau:

<tai_lieu_tham_khao>
${KNOWLEDGE_NANG_LUC_AI}
</tai_lieu_tham_khao>

Dựa vào giáo án và tài liệu trên, hãy:
1. Đề xuất cách tích hợp năng lực AI (hiểu, tương tác, hoặc đánh giá AI) một cách tự nhiên vào bài học.
2. Gợi ý một hoạt động thực hành nhanh (ví dụ 5-10 phút) cho học sinh sử dụng hoặc thảo luận về AI liên quan đến kiến thức của bài.
Vui lòng xuất nội dung hoàn toàn bằng định dạng Markdown.`,

    'I': `YÊU CẦU: Gợi ý phương pháp/kỹ thuật dạy học tích cực phù hợp nhất cho bài học này dựa trên tài liệu tham khảo sau:

<tai_lieu_tham_khao>
${KNOWLEDGE_PHUONG_PHAP_DAY_HOC}
</tai_lieu_tham_khao>

Dựa vào giáo án và tài liệu trên, hãy:
1. Lựa chọn 1 phương pháp/kỹ thuật phù hợp nhất với bài học này (giải thích ngắn gọn lý do chọn).
2. Viết lại chi tiết (Step-by-step) cách tổ chức một hoạt động cụ thể (trong giáo án) theo đúng quy trình của phương pháp/kỹ thuật đó.
Vui lòng xuất nội dung hoàn toàn bằng định dạng Markdown.`,

    'J': `YÊU CẦU: Thiết kế một trò chơi học tập tương tác cho bài học này dựa trên tài liệu tham khảo sau:

<tai_lieu_tham_khao>
${KNOWLEDGE_GAME_TEMPLATES}
</tai_lieu_tham_khao>

Dựa vào nội dung giáo án và tài liệu trên, hãy:
1. Lựa chọn 1 kịch bản trò chơi phù hợp nhất để củng cố kiến thức hoặc khởi động bài học.
2. Trình bày chi tiết: Tên trò chơi, Mục tiêu, Chuẩn bị, Luật chơi.
3. Cung cấp một bộ 3-5 câu hỏi/nhiệm vụ mẫu trích xuất trực tiếp từ kiến thức bài học để dùng cho trò chơi này.
Vui lòng xuất nội dung hoàn toàn bằng định dạng Markdown.`,

    'K': `YÊU CẦU: Tạo dàn ý chi tiết cho bài trình chiếu (Slide PPT) của bài học này.
Hãy chia thành các slide (Slide 1, Slide 2...). Mỗi slide cần chỉ rõ:
- Tiêu đề slide.
- Nội dung chữ (Bullet points ngắn gọn).
- Đề xuất hình ảnh minh họa cần chèn.
Vui lòng xuất nội dung hoàn toàn bằng Markdown.`,

    'M': `YÊU CẦU: Rà soát và viết lại toàn bộ cấu trúc giáo án này cho chuẩn với định hướng Phát triển Phẩm chất và Năng lực (theo CT GDPT 2018).
Đặc biệt chú trọng làm rõ:
- Năng lực đặc thù và Phẩm chất đạt được.
- Chuyển đổi các hoạt động truyền thụ một chiều thành chuỗi hoạt động khám phá.
Vui lòng xuất nội dung hoàn toàn bằng Markdown.`,

    'N': `YÊU CẦU: Đóng vai trò là một thanh tra chuyên môn khó tính, hãy rà soát kỹ và đưa ra các góp ý chuyên sâu cho giáo án này.
Hãy chỉ ra:
1. Những điểm chưa logic hoặc thiếu thực tế.
2. Những câu hỏi/nhiệm vụ có thể khiến học sinh hiểu lầm.
3. Đề xuất cách sửa chữa cụ thể cho từng lỗi.
Vui lòng xuất nội dung hoàn toàn bằng Markdown.`,

    'O': `YÊU CẦU: Làm mới hoàn toàn giáo án này theo một concept (chủ đề) sáng tạo, đột phá (ví dụ: Game hóa toàn bài, Đóng vai điều tra viên, Chuyến du hành vũ trụ...).
Hãy mô tả:
- Concept chủ đạo.
- Cách biến hóa các hoạt động khô khan thành các chặng đường của concept đó.
Vui lòng xuất nội dung hoàn toàn bằng Markdown.`,

    'P': `YÊU CẦU: Tạo học liệu số hỗ trợ bài giảng. 
Dựa vào kiến thức trọng tâm, hãy cung cấp:
1. 3-5 gợi ý ảnh minh hoạ, MỖI GỢI Ý VIẾT BẰNG TIẾNG VIỆT: tả rõ cảnh cần vẽ, bố cục và chi tiết phải có. Giáo viên đọc là hình dung được ngay, cần thì tự dịch sang công cụ vẽ ảnh. TUYỆT ĐỐI không viết câu lệnh tiếng Anh.
2. 2-3 từ khóa chuẩn tiếng Anh để giáo viên tìm kiếm video/mô phỏng trên YouTube hoặc PhET.
Vui lòng xuất nội dung hoàn toàn bằng Markdown.`,
  };

  if (!prompts[menuId]) {
    return null;
  }

  return basePrompt + '\n' + prompts[menuId];
};
