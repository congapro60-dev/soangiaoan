import { safeLogoDataUrl } from './parentReportArt';

/**
 * Nhận diện trường hiện đầu báo cáo phụ huynh: tên trường, tên giáo viên, logo.
 * Lưu trên máy giáo viên (localStorage) — mỗi trường/giáo viên tự nhập một lần, web dùng cho mọi trường nên không gán sẵn tên trường nào.
 */
export interface ParentBranding {
  schoolName: string;
  teacherName: string;
  /** data URL png/jpeg/webp đã thu nhỏ; '' = không có logo. */
  logoDataUrl: string;
}

const KEY = 'smartplan.parentBranding';
const EMPTY: ParentBranding = { schoolName: '', teacherName: '', logoDataUrl: '' };

export const loadParentBranding = (): ParentBranding => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<ParentBranding> | null;
    return {
      schoolName: String(raw?.schoolName ?? '').slice(0, 120),
      teacherName: String(raw?.teacherName ?? '').slice(0, 80),
      logoDataUrl: safeLogoDataUrl(raw?.logoDataUrl) ?? '',
    };
  } catch {
    return { ...EMPTY };
  }
};

export const saveParentBranding = (value: ParentBranding): void => {
  try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* không lưu được thì dùng tạm trong phiên */ }
};

/** Dạng gửi vào báo cáo; trống hết thì null để bản in không dựng dải nhận diện. */
export const brandingForReport = (value: ParentBranding): { schoolName?: string; teacherName?: string; logoDataUrl?: string } | null => {
  const out = {
    ...(value.schoolName.trim() ? { schoolName: value.schoolName.trim() } : {}),
    ...(value.teacherName.trim() ? { teacherName: value.teacherName.trim() } : {}),
    ...(safeLogoDataUrl(value.logoDataUrl) ? { logoDataUrl: value.logoDataUrl } : {}),
  };
  return Object.keys(out).length > 0 ? out : null;
};

const MAX_LOGO_EDGE = 360;

/** Thu nhỏ logo người dùng chọn (≤360px cạnh dài) rồi trả data URL đủ nhẹ để nhúng vào từng báo cáo. */
export const fileToLogoDataUrl = async (file: File): Promise<string> => {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Logo cần là ảnh PNG, JPG hoặc WebP.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_LOGO_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // Giữ nền trong suốt với PNG/WebP; JPG nén 0.85. Quá nặng thì chuyển JPG để chắc nhẹ.
  const first = canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.85);
  const result = safeLogoDataUrl(first) ?? safeLogoDataUrl(canvas.toDataURL('image/jpeg', 0.8));
  if (!result) throw new Error('Logo quá nặng, hãy chọn ảnh nhỏ hơn.');
  return result;
};
