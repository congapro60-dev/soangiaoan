import { LessonPlan, CurriculumDistribution, TemplateFile, LessonTemplate } from '../types';

export class DataValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataValidationError';
  }
}

/**
 * Ràng buộc dữ liệu cho LessonPlan
 */
export const validateLessonPlan = (plan: Partial<LessonPlan>): void => {
  if (!plan.id) throw new DataValidationError('Giáo án thiếu ID định danh.');
  if (!plan.title || plan.title.trim() === '') throw new DataValidationError('Giáo án phải có Tiêu đề (title).');
  if (!plan.userId) throw new DataValidationError('Giáo án phải được gắn với một người dùng (userId).');
  if (!plan.content || plan.content.trim() === '') throw new DataValidationError('Nội dung giáo án (content) không được bỏ trống.');
  if (!['draft', 'completed'].includes(plan.status as string)) throw new DataValidationError('Trạng thái (status) không hợp lệ, chỉ chấp nhận draft hoặc completed.');
};

/**
 * Ràng buộc dữ liệu cho TemplateFile (PPCN, Doc...)
 */
export const validateTemplateFile = (file: Partial<TemplateFile>): void => {
  if (!file.id) throw new DataValidationError('File thiếu ID định danh.');
  if (!file.name) throw new DataValidationError('File tải lên phải có tên (name).');
  if (!file.content) throw new DataValidationError('Nội dung file không được bỏ trống.');
  if (!['pdf', 'word', 'excel'].includes(file.type as string)) throw new DataValidationError('Định dạng file không được hỗ trợ (type).');
  if (!['sample', 'criteria', 'lesson_doc', 'distribution'].includes(file.category as string)) throw new DataValidationError('Danh mục file không hợp lệ (category).');
};

/**
 * Ràng buộc dữ liệu cho CurriculumDistribution
 */
export const validateDistribution = (dist: Partial<CurriculumDistribution>): void => {
  if (!dist.id) throw new DataValidationError('Phân phối chương trình thiếu ID định danh.');
  if (!dist.name) throw new DataValidationError('Tên PPCN không hợp lệ.');
  if (!dist.userId) throw new DataValidationError('PPCN phải gắn với người dùng (userId).');
  if (!dist.content) throw new DataValidationError('Nội dung trích xuất PPCN không được bỏ trống.');
};
