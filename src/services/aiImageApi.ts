import { auth } from '../lib/firebase';

/**
 * Sinh MỘT ảnh minh họa (Imagen) từ directive tiếng Việt → URL ảnh đã cache ở Storage.
 * Lỗi bất kỳ → null (bước hậu-sinh thay bằng dòng chú thích, không làm hỏng giáo án).
 * Hết khoá/ví (402) do `aiKeyGate` bọc fetch tự mở hộp chọn rồi gửi lại.
 */
export const generateLessonImage = async (directive: string): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const res = await fetch('/api/grade-homework', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generateImage', directive, idToken: await user.getIdToken() }),
    });
    const data = await res.json().catch(() => null) as { url?: unknown } | null;
    return res.ok && typeof data?.url === 'string' ? data.url : null;
  } catch {
    return null;
  }
};
