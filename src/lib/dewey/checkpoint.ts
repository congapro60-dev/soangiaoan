export interface DeweyCheckpointSignal {
  unitIds: string[];
  durationSeconds: number;
  olympiaScore: number;
  notebookEntries?: string[];
}

export interface DeweyCheckpoint {
  lessonId: string;
  studentCode: string;
  completedUnitIds: string[];
  durationSeconds: number;
  olympiaScore: number;
  notebookEntries: string[];
  status: 'in_progress';
  updatedAt: string;
}

export const isTrustedDeweyMessage = (event: MessageEvent, iframeWindow: Window | null): boolean =>
  Boolean(iframeWindow && event.source === iframeWindow);

export const createDeweyCheckpoint = (
  lessonId: string,
  studentCode: string,
  signal: DeweyCheckpointSignal,
  updatedAt = new Date().toISOString(),
): DeweyCheckpoint => ({
  lessonId,
  studentCode,
  completedUnitIds: [...new Set(signal.unitIds.filter(Boolean))],
  durationSeconds: Math.max(0, Math.floor(signal.durationSeconds)),
  olympiaScore: Math.max(0, Math.floor(signal.olympiaScore)),
  notebookEntries: signal.notebookEntries || [],
  status: 'in_progress',
  updatedAt,
});
