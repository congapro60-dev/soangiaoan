import type { SubmissionDoc } from './types';
export const hasUnreadSubmissionReply = (submission: SubmissionDoc): boolean => !!submission.feedbackSummary?.lastReplyAt && submission.feedbackSummary.lastReplyAt > (submission.feedbackReadAt || '');
