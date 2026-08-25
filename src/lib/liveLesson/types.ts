import type { LiveCue } from '../../data/liveLessonPackages/g10_w5_p31_bpt_tiet1.cues';

export type LiveLessonMode = 'teacher' | 'tv' | 'student';
export type LiveSessionStatus = 'lobby' | 'running' | 'paused' | 'closed';
export type LiveResponseType = 'choice' | 'text' | 'boolean' | 'route' | 'hint' | 'exit_ticket';
export type LiveRoute = 'M' | 'S' | 'C';
export type LiveErrorCategory = 'Conceptual' | 'Algebraic' | 'Logical' | 'Missing condition';

export interface LiveLessonScreen {
  id: string;
  label?: string;
  title?: string;
  body?: string;
  action?: string;
}

export interface LiveResponseStep {
  id: string;
  label: string;
  screenId?: string;
  responseTypes: LiveResponseType[];
  maxTextLength?: number;
}

export interface LiveAiErrorOfTheWeek {
  id: string;
  category: string;
  correction: string;
  proof: string;
}

export interface LiveLessonDefinition {
  id: string;
  lessonId: string;
  title: string;
  durationSeconds: number;
  cues: LiveCue[];
  tvScreens: LiveLessonScreen[];
  studentScreens: LiveLessonScreen[];
  allowedStepIds: string[];
  aiErrorStepId: string;
  aiErrorOfTheWeek: LiveAiErrorOfTheWeek;
  responseSteps: LiveResponseStep[];
}

export interface LiveResponse {
  id: string;
  participantUid: string;
  classId: string;
  stepId: string;
  responseType: LiveResponseType;
  value: string | number | boolean;
  clientNonce: string;
  submittedAt: number;
  updatedAt: number;
}

export interface LiveLessonSession {
  id: string;
  schemaVersion: 1;
  lessonId: string;
  title: string;
  classId: string;
  teacherUid: string;
  allowedStepIds: string[];
  expiresAt: number;
  status: LiveSessionStatus;
  currentCueId: string;
  currentTvScreenId: string;
  publicStateEnabled: boolean;
  publicStatsEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface LiveLessonState {
  session: LiveLessonSession;
  definition: LiveLessonDefinition;
  responses: LiveResponse[];
}

export interface LiveLessonStatePatch {
  status?: LiveSessionStatus;
  currentCueId?: string;
  currentTvScreenId?: string;
  publicStateEnabled?: boolean;
  publicStatsEnabled?: boolean;
}

export interface LivePublicStats {
  stepId: string;
  participantCount: number;
  submittedCount: number;
  choiceCounts: Record<string, number>;
  routeCounts: Record<LiveRoute, number>;
  errorCategoryCounts: Record<LiveErrorCategory, number>;
  hintUseCount: number;
  updatedAt: number;
}

export interface LivePublicState {
  cueId: string;
  tvScreenId: string;
  status: LiveSessionStatus;
  showStats: boolean;
  updatedAt: number;
}

export interface CreateLiveSessionInput {
  definition: LiveLessonDefinition;
  teacherUid: string;
  classId: string;
}

export interface SubmitLiveResponseInput {
  sessionId: string;
  participantUid: string;
  classId: string;
  stepId: string;
  responseType: LiveResponseType;
  value: string | number | boolean;
  clientNonce: string;
}

export class LiveLessonDefinitionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'LiveLessonDefinitionError';
    this.code = code;
  }
}
