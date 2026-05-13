import type { StudentLearningProfile, StudentSessionProgressRecord } from '../lib/adaptive/types';

interface SaveAdaptiveProgressPayload {
  teacherId: string;
  lessonId: string;
  progressId: string;
  studentId: string;
  progressRecord: StudentSessionProgressRecord;
  profileRecord: StudentLearningProfile;
}

export const saveAdaptiveProgressViaApi = async (payload: SaveAdaptiveProgressPayload) => {
  const response = await fetch('/api/adaptive-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || 'Không lưu được kết quả học tập qua API bảo mật.');
  }

  return data as { ok: true; profile: StudentLearningProfile };
};
