import { LessonPlan } from '../types';
import { downloadBlob } from './fileUtils';
import { renderWordBlob, safeFilename } from './renderWordCore';

export type WordOrientation = 'portrait' | 'landscape';

export const exportToWordA4 = async (
  currentPlan: Partial<LessonPlan>,
  showToast: (msg: string, type?: any) => void,
  orientation: WordOrientation = 'portrait'
) => {
  try {
    showToast('Đang tạo file Word...', 'info');
    
    if (!currentPlan.content) {
      throw new Error('Nội dung giáo án trống, không thể xuất file.');
    }

    const blob = await renderWordBlob({
      title: currentPlan.title || 'Giao an',
      content: currentPlan.content,
      orientation,
      // Giáo án ban Toán → xuất Word có style KHDH v13 (banner màu, bảng 3 cột 11/54/35%)
      styleProfile: currentPlan.builtinFormat === 'toan' ? 'toan' : undefined,
    });

    const filename = `${safeFilename(currentPlan.title)}.docx`;
    downloadBlob(blob, filename);

    showToast('Xuất Word thành công!', 'success');
  } catch (err: any) {
    console.error(err);
    showToast(err.message || 'Lỗi xuất Word. Vui lòng thử lại.', 'error');
  }
};
