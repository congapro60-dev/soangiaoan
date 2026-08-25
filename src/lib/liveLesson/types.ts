import type { LiveCue } from '../../data/liveLessonPackages/g10_w5_p31_bpt_tiet1.cues';

export type LiveLessonMode = 'teacher' | 'student' | 'public';
export type LiveSessionStatus = 'draft' | 'ready' | 'live' | 'paused' | 'ended' | 'archived';
export type LiveResponseType = 'text' | 'number' | 'boolean' | 'choice';

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
  lessonId: string;
  classId: string;
  teacherUid: string;
  mode: LiveLessonMode;
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
  responseCount: number;
  participantCount: number;
  lastUpdatedAt: number;
}

export interface LivePublicState {
  sessionId: string;
  lessonId: string;
  status: LiveSessionStatus;
  currentCueId: string;
  currentTvScreenId: string;
  stats?: LivePublicStats;
}

export interface CreateLiveSessionInput {
  lessonId: string;
  classId: string;
  teacherUid: string;
  mode?: LiveLessonMode;
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
