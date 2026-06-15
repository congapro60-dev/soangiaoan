import { renderWordBlob, safeFilename } from './renderWordCore';
import { downloadBlob } from './fileUtils';

export const exportExamToDocx = async (
  markdown: string,
  title: string,
  _containerSelector?: string
): Promise<void> => {
  if (!markdown) {
    throw new Error('Không có dữ liệu để xuất Word.');
  }

  const blob = await renderWordBlob({
    title,
    content: markdown,
    orientation: 'portrait',
  });

  const filename = `${safeFilename(title, 'bai-tap')}.docx`;
  downloadBlob(blob, filename);
};
