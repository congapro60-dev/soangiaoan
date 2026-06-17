import { AgentContext, ContentResult, FormatResult } from './types';
import { callAIStream } from '../aiProviders';
import { cleanMarkdownOutput } from '../../utils/markdownUtils';

export const executeFormatAgent = async (
  context: AgentContext,
  content: ContentResult
): Promise<FormatResult> => {
  const prompt = `
BẠN LÀ MỘT BIÊN TẬP VIÊN VÀ CHUYÊN GIA ĐỊNH DẠNG TÀI LIỆU (FORMATTER).
NHIỆM VỤ: Lấy nội dung giáo án thô dưới đây và ĐỊNH DẠNG LẠI CHÍNH XÁC theo cấu trúc bắt buộc. TUYỆT ĐỐI KHÔNG cắt xén hoặc rút gọn nội dung chuyên môn, chỉ sắp xếp và trình bày lại cho đẹp mắt, đúng chuẩn bảng biểu Markdown và đúng template yêu cầu.

YÊU CẦU ĐỊNH DẠNG BẮT BUỘC:
<format_rules>
${context.templateFormat}
${context.templateContext}
${context.mathRestrictions}
${context.additionalRequirements}
</format_rules>

NỘI DUNG GIÁO ÁN THÔ (CẦN ĐỊNH DẠNG LẠI):
<raw_content>
${content.rawContent}
</raw_content>

BỐ CỤC PHẢN HỒI:
Trả về duy nhất nội dung Markdown cuối cùng bên trong thẻ <lesson_content> ... </lesson_content>. Đảm bảo tuân thủ mọi nguyên tắc bảng biểu (3 cột, không xuống dòng bừa bãi bằng <br><br>).
  `;

  let fullResult = '';
  await callAIStream(prompt, context.settings, (chunk) => {
    fullResult += chunk;
  });

  const finalMatch = fullResult.match(/<lesson_content>([\s\S]*?)<\/lesson_content>/i);
  let finalMarkdown = finalMatch ? finalMatch[1].trim() : fullResult;
  finalMarkdown = cleanMarkdownOutput(finalMarkdown);

  return {
    finalMarkdown
  };
};
