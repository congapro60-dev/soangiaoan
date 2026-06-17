import { AgentContext } from './types';
import { callAI } from '../aiProviders';

interface CriticResult {
  ok: boolean;
  issues: string[];
}

export const executeCriticAgent = async (
  context: AgentContext,
  plan: string,
  content: string
): Promise<CriticResult> => {
  const prompt = `Bạn là chuyên gia thẩm định giáo án (Critic Agent).
Hãy kiểm tra xem giáo án sau có bám sát dàn ý (Plan) và đạt chuẩn sư phạm không.
Chỉ kiểm tra các lỗi nghiêm trọng (vd: thiếu phần, định dạng markdown sai bét, thiếu WALT/WILF nếu có yêu cầu).
KHÔNG quan tâm các lỗi nhỏ nhặt.

DÀN Ý (PLAN):
${plan}

GIÁO ÁN (CONTENT):
${content}

TRẢ VỀ DUY NHẤT 1 ĐOẠN CHUẨN JSON (Không bọc bằng \`\`\`json):
{
  "ok": true/false, // true nếu giáo án chấp nhận được, false nếu có lỗi nghiêm trọng
  "issues": [] // Danh sách các lỗi cần sửa (tối đa 3 lỗi), nếu ok=true thì để mảng rỗng []
}`;

  try {
    const raw = await callAI(prompt, context.settings);
    // extract json
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { ok: true, issues: [] };
    
    const result = JSON.parse(match[0]) as CriticResult;
    return {
      ok: result.ok ?? true,
      issues: Array.isArray(result.issues) ? result.issues : []
    };
  } catch (err) {
    console.error("CriticAgent parse error:", err);
    return { ok: true, issues: [] }; // Fallback to ok on parse error
  }
};

export const executeFixAgent = async (
  context: AgentContext,
  content: string,
  issues: string[]
): Promise<string> => {
  const prompt = `Bạn là chuyên gia biên soạn giáo án.
Giáo án sau có một số lỗi nghiêm trọng cần được sửa. 
HÃY SỬA LẠI GIÁO ÁN DỰA TRÊN CÁC LỖI NÀY VÀ TRẢ VỀ GIÁO ÁN HOÀN CHỈNH (giữ nguyên những phần đã tốt).

CÁC LỖI CẦN SỬA:
${issues.map((i, idx) => `- ${i}`).join('\n')}

GIÁO ÁN HIỆN TẠI:
${content}

Hãy trả về DUY NHẤT nội dung giáo án sau khi sửa, KHÔNG KÈM LỜI GIẢI THÍCH NÀO KHÁC.`;

  const result = await callAI(prompt, context.settings);
  return result.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
};
