const ID = /^[A-Za-z0-9._:@-]{1,180}$/;

export const getV84NextStepSaveErrorCopy = (_cause: unknown, locale: 'vi' | 'en' | 'ja'): string => ({
  vi: 'Chưa thể lưu lựa chọn. Hãy thử lại.',
  en: 'Could not save your choice. Please try again.',
  ja: '選択を保存できませんでした。もう一度お試しください。',
})[locale];

export interface V84NextStepOption { id: string; taskRef: string }
export interface V84RestoredNextStep { nextStepId: string | null; responseRevision: number }
export interface V84OwnNextStep { nextStepId: string; responseRevision: number; closingRevision: number }

export const restoreV84NextStep = (value: unknown, options: readonly Pick<V84NextStepOption, 'id'>[], closingRevision: number): V84RestoredNextStep => {
  if (value === null || value === undefined) return { nextStepId: null, responseRevision: 0 };
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('NEXT_STEP_RESTORE_INVALID');
  const saved = value as Record<string, unknown>;
  if (!Number.isSafeInteger(closingRevision) || closingRevision < 1
    || saved.closingRevision !== closingRevision || !Number.isSafeInteger(saved.responseRevision)
    || (saved.responseRevision as number) < 1 || typeof saved.nextStepId !== 'string'
    || !options.some(option => option.id === saved.nextStepId)) throw new Error('NEXT_STEP_RESTORE_INVALID');
  return { nextStepId: saved.nextStepId, responseRevision: saved.responseRevision as number };
};

export const projectV84OwnNextStep = (value: unknown): V84OwnNextStep | null => {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('NEXT_STEP_READ_INVALID');
  const data = value as Record<string, unknown>;
  if (typeof data.nextStepId !== 'string' || !ID.test(data.nextStepId)
    || !Number.isSafeInteger(data.responseRevision) || (data.responseRevision as number) < 1
    || !Number.isSafeInteger(data.closingRevision) || (data.closingRevision as number) < 1) {
    throw new Error('NEXT_STEP_READ_INVALID');
  }
  return { nextStepId: data.nextStepId, responseRevision: data.responseRevision as number,
    closingRevision: data.closingRevision as number };
};

export interface V84NextStepSubmissionInput {
  roomId: string;
  studentId: string;
  participantUid: string;
  packageId: string;
  contentHash: string;
  clientNonce: string;
  nextStepId: string;
  responseRevision: number;
  closingRevision: number;
  options: readonly V84NextStepOption[];
}

export interface V84NextStepRecord {
  studentId: string;
  participantUid: string;
  nextStepId: string;
  packageId: string;
  contentHash: string;
  responseRevision: number;
  closingRevision: number;
  clientNonce: string;
  taskRef: string;
}

export const normalizeV84NextStepOptions = (value: unknown): V84NextStepOption[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const candidate = item as Record<string, unknown>;
    const id = candidate.id;
    const taskRef = candidate.taskRef ?? candidate.action;
    return typeof id === 'string' && typeof taskRef === 'string' && ID.test(id) && ID.test(taskRef)
      ? [{ id, taskRef }] : [];
  });
};

const requireId = (value: unknown, code: string): string => {
  if (typeof value !== 'string' || !ID.test(value)) throw new Error(code);
  return value;
};

const requireRevision = (value: unknown, code: string): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 1) throw new Error(code);
  return value as number;
};

export const validateV84NextStepSubmission = (input: V84NextStepSubmissionInput): V84NextStepRecord => {
  requireId(input.roomId, 'NEXT_STEP_ROOM_INVALID');
  const studentId = requireId(input.studentId, 'NEXT_STEP_STUDENT_INVALID');
  const participantUid = requireId(input.participantUid, 'NEXT_STEP_PARTICIPANT_INVALID');
  const packageId = requireId(input.packageId, 'NEXT_STEP_PACKAGE_INVALID');
  const clientNonce = requireId(input.clientNonce, 'NEXT_STEP_NONCE_INVALID');
  const nextStepId = requireId(input.nextStepId, 'NEXT_STEP_ID_INVALID');
  if (typeof input.contentHash !== 'string' || !/^[a-f0-9]{64}$/.test(input.contentHash)) {
    throw new Error('NEXT_STEP_HASH_INVALID');
  }
  const responseRevision = requireRevision(input.responseRevision, 'NEXT_STEP_RESPONSE_REVISION_INVALID');
  const closingRevision = requireRevision(input.closingRevision, 'NEXT_STEP_CLOSING_REVISION_INVALID');
  if (!Array.isArray(input.options)) throw new Error('NEXT_STEP_OPTIONS_INVALID');
  const option = input.options.find(item => item?.id === nextStepId);
  if (!option || typeof option.taskRef !== 'string' || !ID.test(option.taskRef)) throw new Error('NEXT_STEP_NOT_AUTHORED');
  if (input.options.some(item => !item || !ID.test(item.id) || !ID.test(item.taskRef))) {
    throw new Error('NEXT_STEP_OPTIONS_INVALID');
  }
  return { studentId, participantUid, nextStepId, packageId, contentHash: input.contentHash,
    responseRevision, closingRevision, clientNonce, taskRef: option.taskRef };
};
