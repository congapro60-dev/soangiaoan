import { auth } from '../firebase';
import { isAdminEmail } from '../admin/adminConfig';
import { loadClassProgram } from './classProgram';
import { loadParentBranding, type ParentBranding } from './parentBranding';
import type { Program } from './reportStage';

/**
 * Giá trị điền sẵn cho CHỦ DỰ ÁN (tài khoản admin) ở báo cáo phụ huynh: tên trường, tên giáo viên, chương trình lớp.
 * Giáo viên khác không có gì điền sẵn — tự nhập/chọn trong khung "Đầu báo cáo". Giá trị đã lưu trên máy luôn thắng giá trị điền sẵn.
 */
export const OWNER_REPORT_DEFAULTS = { schoolName: 'The Dewey Schools', teacherName: 'Vũ Việt Cường' } as const;

/** Lớp của chủ dự án chỉ theo TDS (chủ dự án xác nhận 01/10/2026). Khớp theo tên lớp. */
const OWNER_TDS_CLASSES: readonly RegExp[] = [/^\s*11\s*columbus/i, /^\s*12\s*vn\s*to[aá]n\s*1/i];

export const ownerBrandingDefaults = (email: string | null | undefined): Pick<ParentBranding, 'schoolName' | 'teacherName'> | null =>
  isAdminEmail(email) ? { ...OWNER_REPORT_DEFAULTS } : null;

export const ownerClassProgram = (email: string | null | undefined, className: string): Program | null =>
  isAdminEmail(email) && OWNER_TDS_CLASSES.some(re => re.test(className)) ? 'TDS' : null;

/** Đầu báo cáo đang dùng: phần đã lưu trên máy, chỗ trống thì lấy giá trị điền sẵn của chủ dự án (nếu là chủ dự án). */
export const effectiveBranding = (email: string | null | undefined = auth.currentUser?.email): ParentBranding => {
  const saved = loadParentBranding();
  const owner = ownerBrandingDefaults(email);
  return owner ? { ...saved, schoolName: saved.schoolName || owner.schoolName, teacherName: saved.teacherName || owner.teacherName } : saved;
};

/** Chương trình của lớp: đã chọn trên máy thì dùng, chưa chọn thì (chủ dự án) lấy theo tên lớp. */
export const effectiveClassProgram = (classId: string, className: string, email: string | null | undefined = auth.currentUser?.email): Program | null =>
  loadClassProgram(classId) ?? ownerClassProgram(email, className);
