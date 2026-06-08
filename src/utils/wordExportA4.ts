import { LessonPlan } from '../types';
import { exportLessonViaAPI } from './exportUtils';

export type WordOrientation = 'portrait' | 'landscape';

export const exportToWordA4 = async (
  currentPlan: Partial<LessonPlan>,
  showToast: (msg: string, type?: any) => void,
  orientation: WordOrientation = 'portrait'
) => {
  return exportLessonViaAPI(currentPlan, 'docx', orientation, showToast);
};
