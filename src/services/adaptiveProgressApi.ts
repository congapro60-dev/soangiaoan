import type { StudentLearningProfile, StudentSessionProgressRecord } from '../lib/adaptive/types';
import { auth } from '../lib/firebase';
import type { LiveLessonDefinition } from '../lib/liveLesson/types';

export interface SaveAdaptiveProgressPayload {
  teacherId: string;
  lessonId: string;
  progressId: string;
  studentId: string;
  progressRecord: StudentSessionProgressRecord;
  profileRecord: StudentLearningProfile;
}

interface OfflineProgressRecord extends StudentSessionProgressRecord {
  pendingProfileSync?: boolean;
  savedOfflineAt?: string;
  lastSaveError?: string;
}

export interface OfflineAdaptiveProgressSyncResult {
  attempted: number;
  synced: number;
  failed: number;
}

export interface LiveLessonProgressSaveSummary {
  ok: true;
  eligible: number;
  saved: number;
  failed: number;
  incomplete: number;
}

const ADAPTIVE_PROGRESS_STORAGE_PREFIX = 'adaptive-progress-';
const ADAPTIVE_PROFILE_STORAGE_PREFIX = 'adaptive-profile-';

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const parseStoredJson = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const listOfflineProgressKeys = (storage: Storage) => (
  Object.keys(storage).filter(key => key.startsWith(ADAPTIVE_PROGRESS_STORAGE_PREFIX))
);

const hasPendingProgressForStudent = (storage: Storage, studentId: string) => (
  listOfflineProgressKeys(storage).some(key => {
    const record = parseStoredJson<OfflineProgressRecord>(storage.getItem(key));
    return record?.studentId === studentId;
  })
);

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

export const saveClosedLiveLessonProgressViaApi = async (
  sessionId: string,
  definition: LiveLessonDefinition,
): Promise<LiveLessonProgressSaveSummary> => {
  const current = auth.currentUser;
  if (!current || current.isAnonymous) throw new Error('Cần đăng nhập tài khoản giáo viên để ghi tiến trình.');
  const idToken = await current.getIdToken();
  const response = await fetch('/api/adaptive-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'saveLiveLessonProgress', sessionId, definition, idToken }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'Không ghi được tiến trình sau khi đóng phiên.');
  return data as LiveLessonProgressSaveSummary;
};

export const saveAdaptiveProgressOffline = (
  payload: SaveAdaptiveProgressPayload,
  errorMessage: string,
  savedAt = new Date().toISOString()
) => {
  const storage = getStorage();
  if (!storage) throw new Error('Trình duyệt không hỗ trợ localStorage.');

  const offlineProgress: OfflineProgressRecord = {
    ...payload.progressRecord,
    pendingProfileSync: true,
    savedOfflineAt: savedAt,
    lastSaveError: errorMessage,
  };

  try {
    storage.setItem(`${ADAPTIVE_PROGRESS_STORAGE_PREFIX}${payload.progressId}`, JSON.stringify(offlineProgress));
    storage.setItem(`${ADAPTIVE_PROFILE_STORAGE_PREFIX}${payload.studentId}`, JSON.stringify(payload.profileRecord));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new Error('STORAGE_FULL');
    }
    throw error;
  }
};

export const syncOfflineAdaptiveProgress = async (): Promise<OfflineAdaptiveProgressSyncResult> => {
  const storage = getStorage();
  if (!storage || typeof navigator !== 'undefined' && !navigator.onLine) {
    return { attempted: 0, synced: 0, failed: 0 };
  }

  const progressKeys = listOfflineProgressKeys(storage);
  let attempted = 0;
  let synced = 0;
  let failed = 0;

  for (const key of progressKeys) {
    const progressRecord = parseStoredJson<OfflineProgressRecord>(storage.getItem(key));
    if (!progressRecord) {
      storage.removeItem(key);
      continue;
    }

    const profileRecord = parseStoredJson<StudentLearningProfile>(
      storage.getItem(`${ADAPTIVE_PROFILE_STORAGE_PREFIX}${progressRecord.studentId}`)
    );

    if (!profileRecord) {
      failed++;
      continue;
    }

    attempted++;
    try {
      await saveAdaptiveProgressViaApi({
        teacherId: progressRecord.teacherId,
        lessonId: progressRecord.lessonId,
        progressId: progressRecord.id,
        studentId: progressRecord.studentId,
        progressRecord,
        profileRecord,
      });

      storage.removeItem(key);
      if (!hasPendingProgressForStudent(storage, progressRecord.studentId)) {
        storage.removeItem(`${ADAPTIVE_PROFILE_STORAGE_PREFIX}${progressRecord.studentId}`);
      }
      synced++;
    } catch {
      failed++;
    }
  }

  return { attempted, synced, failed };
};
