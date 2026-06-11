import Swal from 'sweetalert2';
import { getSkeletonGuardrailDecision, validateMarkdownAgainstSkeleton, DocumentSkeleton, GuardrailContext } from '../lib/documentSkeleton';

export const withGuardrail = async (
  content: string | undefined | null,
  skeleton: DocumentSkeleton | undefined | null,
  context: GuardrailContext,
  actionFn: () => void | Promise<void>
) => {
  if (!content || content.trim().length === 0) {
    await Swal.fire({
      title: 'Nội dung rỗng',
      text: 'Nội dung đang rỗng, không thể thực hiện thao tác này.',
      icon: 'error',
      confirmButtonText: 'Đã hiểu'
    });
    return;
  }

  if (!skeleton) {
    await actionFn();
    return;
  }

  const validation = validateMarkdownAgainstSkeleton(content, skeleton);
  const decision = getSkeletonGuardrailDecision(validation, context);

  if (decision.mode === 'block') {
    await Swal.fire({
      title: 'Lỗi cấu trúc',
      text: decision.blockingIssues[0]?.message || 'Nội dung không đủ điều kiện để thao tác (lỗi nghiêm trọng).',
      icon: 'error',
      confirmButtonText: 'Đã hiểu'
    });
    return;
  }

  if (decision.requiresConfirmation) {
    const issueDetails = decision.confirmationIssues.map(i => `- ${i.message}`).join('\n');
    const res = await Swal.fire({
      title: 'Cảnh báo định dạng',
      html: `<p class="text-sm text-left mb-2">AI có thể chưa giữ đủ cấu trúc (Bảng, Heading, Placeholder) so với mẫu ban đầu:</p><pre class="text-xs text-left text-red-600 bg-red-50 p-2 rounded whitespace-pre-wrap">${issueDetails}</pre><p class="text-sm text-left mt-2 font-bold">Bạn có chắc chắn muốn tiếp tục xuất/lưu?</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Tiếp tục',
      cancelButtonText: 'Quay lại sửa',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b'
    });
    
    if (!res.isConfirmed) {
      return;
    }
  }

  await actionFn();
};
