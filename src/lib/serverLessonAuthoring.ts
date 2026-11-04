import { auth } from './firebase';

export const callServerLessonAuthoring = async (prompt: string): Promise<string> => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Đăng nhập tài khoản giáo viên để soạn bài.');
  const idToken = await user.getIdToken();
  const response = await fetch('/api/grade-homework', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'lessonAuthoring', prompt }),
    signal: AbortSignal.timeout(270_000),
  });
  const payload = await response.json().catch(() => null) as { text?: unknown; error?: unknown } | null;
  if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : 'AI authoring thất bại.');
  if (typeof payload?.text !== 'string' || !payload.text.trim()) throw new Error('AI không trả về kế hoạch bài học.');
  return payload.text;
};
