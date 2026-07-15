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

    const filename = `${safeFilename(currentPlan.title)}.docx`;

    // Giáo án ban Toán → xuất theo ĐÚNG FORM trường (25-26_Mẫu giáo án_Ban Toán):
    // khổ Letter ngang, dải màu pastel, bảng 3 cột, công thức OMML. Nội dung do AI sinh
    // được parse rồi đổ vào form. Lỗi bất kỳ → fallback về renderWordCore để không mất bản.
    if (currentPlan.builtinFormat === 'toan') {
      try {
        const [{ parseToanLesson }, { buildSchoolFormBlob }] = await Promise.all([
          import('../lib/toanSchoolForm/parseToanLesson'),
          import('../lib/toanSchoolForm/buildSchoolFormDocx'),
        ]);
        const model = parseToanLesson(currentPlan.content);
        const blob = await buildSchoolFormBlob(model);
        downloadBlob(blob, filename);
        showToast('Xuất Word (đúng form trường) thành công!', 'success');
        return;
      } catch (schoolErr) {
        console.warn('Xuất form trường thất bại, fallback renderWordCore:', schoolErr);
      }
    }

    const blob = await renderWordBlob({
      title: currentPlan.title || 'Giao an',
      content: currentPlan.content,
      orientation,
      styleProfile: currentPlan.builtinFormat === 'toan' ? 'toan' : undefined,
    });

    downloadBlob(blob, filename);
    showToast('Xuất Word thành công!', 'success');
  } catch (err: any) {
    console.error(err);
    showToast(err.message || 'Lỗi xuất Word. Vui lòng thử lại.', 'error');
  }
};
