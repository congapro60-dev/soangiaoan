import type { ReviewContext } from './reviewContext.js';

export type ReviewScope = 'auto' | 'screen' | 'activity' | 'lesson' | 'runtime';
export type ReviewRequestStatus =
  | 'NEW' | 'CLASSIFYING' | 'PROPOSAL_READY' | 'WAITING_APPROVAL'
  | 'APPLYING' | 'QA_RUNNING' | 'READY_FOR_REVIEW'
  | 'ACCEPTED' | 'REJECTED' | 'FAILED';

export interface ReviewAttachment {
  id: string;
  storagePath: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  source: 'automatic_screenshot' | 'external_screenshot';
}

export interface ReviewAnnotation {
  id: string;
  type: 'rectangle' | 'arrow' | 'freehand' | 'highlight' | 'pin' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  note?: string;
}

export interface ReviewRequestV832 {
  id: string;
  context: ReviewContext;
  teacherMessage: string;
  attachments: ReviewAttachment[];
  annotations: ReviewAnnotation[];
  scope: ReviewScope;
  createdBy: string;
  createdAt: string;
  status: ReviewRequestStatus;
}
