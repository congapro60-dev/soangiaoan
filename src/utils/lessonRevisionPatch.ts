import { applyEditorPatches, stripEditorPatchTags } from './editorPatchEngine';

export type LessonRevisionStatus = 'applied' | 'blocked';

export interface LessonRevisionPatchOutcome {
  status: LessonRevisionStatus;
  content: string;
  appliedCount: number;
  message: string;
  feedback: string;
  warnings: string[];
}

export const buildLessonRevisionPatchPrompt = (revisionRequest: string, currentContent: string): string => `
Bạn là trợ lý chỉnh sửa giáo án theo cơ chế PATCH AN TOÀN.

NHIỆM VỤ:
- Chỉ sửa đúng phần được yêu cầu: "${revisionRequest}".
- Không viết lại toàn bộ giáo án.
- Không rút gọn các phần không sửa.
- Không dùng các cụm như "giữ nguyên", "nội dung cũ", "...", "…", "phần còn lại giữ nguyên".
- Tuyệt đối KHÔNG dùng <UPDATE_EDITOR>.

ĐỊNH DẠNG BẮT BUỘC:
1) Nếu sửa trọn một mục/hoạt động có heading rõ ràng, trả về:
<PATCH_SECTION>
  <HEADING>## heading chính xác đang có trong giáo án</HEADING>
  <CONTENT>toàn bộ nội dung mới của riêng mục đó, đầy đủ, không placeholder</CONTENT>
</PATCH_SECTION>

2) Nếu sửa một đoạn nhỏ, trả về:
<PATCH>
  <FIND>đoạn nguyên văn chính xác đang có trong giáo án</FIND>
  <REPLACE>đoạn thay thế đầy đủ, không placeholder</REPLACE>
</PATCH>

Có thể thêm một câu giải thích ngắn sau patch, nhưng không được đưa giáo án đầy đủ ngoài patch.

GIÁO ÁN HIỆN TẠI:
${currentContent}
`;

export const applyLessonRevisionPatchResponse = (
  currentContent: string,
  aiResponse: string
): LessonRevisionPatchOutcome => {
  const patchResult = applyEditorPatches(currentContent, aiResponse);
  const feedback = stripEditorPatchTags(aiResponse);

  if (patchResult.appliedCount > 0) {
    return {
      status: 'applied',
      content: patchResult.patched,
      appliedCount: patchResult.appliedCount,
      message: `Đã cập nhật ${patchResult.appliedCount} mục trong giáo án bằng patch an toàn!`,
      feedback,
      warnings: patchResult.warnings,
    };
  }

  const firstWarning = patchResult.warnings[0];
  const firstRejection = patchResult.rejected[0]?.reason;
  const noPatchMessage = 'AI không trả về PATCH_SECTION/PATCH hợp lệ nên hệ thống không ghi đè giáo án.';

  return {
    status: 'blocked',
    content: currentContent,
    appliedCount: 0,
    message: firstWarning || firstRejection || noPatchMessage,
    feedback,
    warnings: patchResult.warnings.length > 0 ? patchResult.warnings : [firstRejection || noPatchMessage],
  };
};
