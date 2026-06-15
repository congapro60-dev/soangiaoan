import { LessonPlan } from '../types';
import { exportExamToDocx } from './examWordExport';

export type WordOrientation = 'portrait' | 'landscape';

export const exportToWordA4 = async (
  currentPlan: Partial<LessonPlan>,
  showToast: (msg: string, type?: any) => void,
  orientation: WordOrientation = 'portrait'
) => {
  try {
    showToast('Đang tạo file Word...', 'info');
    
    // We try to find the rendered markdown container
    // - In CreatorTab it is under #lesson-content
    // - In ViewPlanModal it is under .markdown-body
    const selector = '#lesson-content .wmde-markdown, .markdown-body';
    
    // Check if the DOM element exists
    if (!document.querySelector(selector)) {
      throw new Error('Vui lòng mở giáo án (bấm Xem) trước khi xuất file Word.');
    }

    await exportExamToDocx(currentPlan.content || '', currentPlan.title || 'GiaoAn', selector);
    showToast('Xuất Word thành công!', 'success');
  } catch (err: any) {
    console.error(err);
    showToast(err.message || 'Lỗi xuất Word. Vui lòng thử lại.', 'error');
  }
};
