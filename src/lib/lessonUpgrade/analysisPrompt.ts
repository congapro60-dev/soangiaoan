import { callAI } from '../aiProviders';
import { AppData, LessonAnalysis } from '../../types';

const ANALYSIS_PROMPT_TEMPLATE = `Bạn là một chuyên gia sư phạm và công nghệ giáo dục. 
Nhiệm vụ của bạn là phân tích cấu trúc và nội dung của một giáo án do giáo viên tải lên.
Dưới đây là nội dung giáo án:

<giao_an>
{{CONTENT}}
</giao_an>

YÊU CẦU:
Bạn PHẢI phân tích và trả lời ĐÚNG định dạng JSON sau, TUYỆT ĐỐI không thêm text giải thích bên ngoài.
Lưu ý các mảng (array) phải chứa ít nhất 1-3 phần tử tóm tắt ngắn gọn.

Định dạng JSON bắt buộc:
\`\`\`json
{
  "monHoc": "Tên môn học (VD: Toán)",
  "lop": "Khối lớp (VD: Lớp 10)",
  "tenBai": "Tên bài học",
  "thoiLuong": "Thời lượng (VD: 1 tiết)",
  "mucTieu": ["Mục tiêu 1", "Mục tiêu 2"],
  "hoatDong": ["Hoạt động 1: ...", "Hoạt động 2: ..."],
  "diemManh": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "diemCanNangCap": ["Điểm cần nâng cấp 1", "Điểm cần nâng cấp 2"]
}
\`\`\`
`;

export const analyzeLessonPlan = async (content: string, settings: AppData['settings']): Promise<LessonAnalysis> => {
  const prompt = ANALYSIS_PROMPT_TEMPLATE.replace('{{CONTENT}}', content);
  
  // Use a faster/cheaper model if possible, but default settings are passed
  const response = await callAI(prompt, settings);
  
  // Parse JSON with soft error handling
  try {
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : response;
    
    // basic cleanup for trailing commas if any, though modern AI is usually good
    const parsed = JSON.parse(jsonString.trim());
    
    return {
      monHoc: parsed.monHoc || 'Chưa rõ',
      lop: parsed.lop || 'Chưa rõ',
      tenBai: parsed.tenBai || 'Chưa rõ',
      thoiLuong: parsed.thoiLuong || 'Chưa rõ',
      mucTieu: Array.isArray(parsed.mucTieu) ? parsed.mucTieu : [],
      hoatDong: Array.isArray(parsed.hoatDong) ? parsed.hoatDong : [],
      diemManh: Array.isArray(parsed.diemManh) ? parsed.diemManh : [],
      diemCanNangCap: Array.isArray(parsed.diemCanNangCap) ? parsed.diemCanNangCap : [],
    };
  } catch (error) {
    console.error('Lỗi parse JSON phân tích giáo án:', error, response);
    // Fallback if parsing fails
    return {
      monHoc: 'Không xác định',
      lop: 'Không xác định',
      tenBai: 'Giáo án',
      thoiLuong: '1 tiết',
      mucTieu: ['Không trích xuất được mục tiêu do lỗi định dạng'],
      hoatDong: [],
      diemManh: [],
      diemCanNangCap: ['Cần cung cấp giáo án rõ ràng hơn'],
    };
  }
};
