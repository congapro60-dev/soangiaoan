import { describe, expect, it } from 'vitest';
import type { RosterResponse } from '../../services/studentPortalApi';
import {
  buildHintUsePayload,
  buildOfflineStatusText,
  buildStudentGroupAssignment,
  buildStudentLanguageChip,
  buildStudentLanguageChoiceState,
  getStudentChoiceOptions,
  getStudentChoiceLabel,
  resolveStudentLiveIdentity,
  validateStudentLoginClassId,
  validateStudentRosterContext,
} from './StudentLiveView';
import type { StudentLanguageView } from '../../lib/liveLesson/v4';
import {
  computeHintOpacity,
  createHintState,
  getOrderedHints,
  getRevealedHints,
  getRoutedVariant,
  hasMoreHints,
  revealNextHint,
} from '../../lib/liveLesson/v4/taskRouting';
import { getG10P31V4Contract } from '../../data/liveLessonPackages/g10_w5_p31_bpt_tiet1.v4';

describe('student live identity boundary', () => {
  it('uses the authenticated anonymous uid for participantUid and login classId for classId', () => {
    expect(resolveStudentLiveIdentity({ uid: 'firebase-anon-1', isAnonymous: true }, { classId: 'class-1', anonymousUid: 'firebase-anon-1' }, 'class-1'))
      .toEqual({ participantUid: 'firebase-anon-1', classId: 'class-1' });
  });

  it('fails closed for stale uid, teacher auth, missing auth, missing expected class, or wrong class', () => {
    expect(resolveStudentLiveIdentity({ uid: 'firebase-anon-1', isAnonymous: true }, { classId: 'class-1', anonymousUid: 'other-anon' }, 'class-1')).toBeNull();
    expect(resolveStudentLiveIdentity({ uid: 'teacher-1', isAnonymous: false }, { classId: 'class-1', anonymousUid: 'teacher-1' }, 'class-1')).toBeNull();
    expect(resolveStudentLiveIdentity(null, { classId: 'class-1', anonymousUid: 'firebase-anon-1' }, 'class-1')).toBeNull();
    expect(resolveStudentLiveIdentity({ uid: 'firebase-anon-1', isAnonymous: true }, { classId: '' , anonymousUid: 'firebase-anon-1' }, 'class-1')).toBeNull();
    expect(resolveStudentLiveIdentity({ uid: 'firebase-anon-1', isAnonymous: true }, { classId: 'class-2', anonymousUid: 'firebase-anon-1' }, 'class-1')).toBeNull();
    expect(resolveStudentLiveIdentity({ uid: 'firebase-anon-1', isAnonymous: true }, { classId: 'class-1', anonymousUid: 'firebase-anon-1' }, null)).toBeNull();
  });
});

describe('student THINK choice projection', () => {
  it('offers a bounded prediction set with a clear label before AI is shown', () => {
    expect(getStudentChoiceOptions('ai-think-w01')).toEqual(['Yes', 'No', 'Unsure']);
    expect(getStudentChoiceLabel('ai-think-w01', 'Yes')).toBe('Là nghiệm');
    expect(getStudentChoiceLabel('ai-think-w01', 'No')).toBe('Không là nghiệm');
    expect(getStudentChoiceLabel('ai-think-w01', 'Unsure')).toBe('Chưa chắc');
  });
});

describe('student roster context boundary', () => {
  const roster: RosterResponse = {
    classId: 'class-123',
    className: '10A',
    students: [{ studentId: 'student-1', name: 'Nguyễn An' }],
  };

  it('accepts a roster only when it belongs to the linked class', () => {
    expect(validateStudentRosterContext(roster, 'class-123', 'JOIN42')).toEqual({ ok: true, roster });
    expect(validateStudentRosterContext({ ...roster, classId: 'class-999' }, 'class-123', 'JOIN42')).toEqual({
      ok: false,
      message: expect.stringContaining('không khớp'),
    });
  });

  it('requires a fresh link when the join code is missing', () => {
    expect(validateStudentRosterContext(roster, 'class-123', null)).toEqual({
      ok: false,
      message: 'Liên kết cũ thiếu ngữ cảnh lớp. Hãy yêu cầu giáo viên mở phiên mới.',
    });
  });
});

describe('student V4 language view helpers', () => {
  const saved: StudentLanguageView = {
    language: 'en', supportMode: 'bilingual', showGlossary: true, showSentenceFrames: true, curriculumBridgeIds: [],
  };

  it('shows first-run language choice only when no valid preference exists', () => {
    expect(buildStudentLanguageChoiceState(null)).toEqual({ view: expect.objectContaining({ language: 'vi', supportMode: 'vi_anchor' }), needsFirstRunChoice: true });
    expect(buildStudentLanguageChoiceState(saved)).toEqual({ view: saved, needsFirstRunChoice: false });
  });

  it('keeps a persistent language chip with an explicit change action label', () => {
    expect(buildStudentLanguageChip(saved)).toEqual({ label: 'Tiếng Việt + EN', actionLabel: 'Đổi ngôn ngữ' });
  });

  it('uses explicit offline status text without pretending realtime succeeded', () => {
    expect(buildOfflineStatusText(false, 1, 0)).toBe('Đã lưu trên máy — chờ đồng bộ.');
    expect(buildOfflineStatusText(true, 2, 0)).toBe('Đang đồng bộ 2 phản hồi đã lưu trên máy.');
    expect(buildOfflineStatusText(true, 0, 1)).toBe('Lỗi — dùng vở; 1 phản hồi bị chặn.');
    expect(buildOfflineStatusText(true, 0, 0)).toBe('Đã gửi.');
  });
});

describe('validateStudentLoginClassId', () => {
  it('rejects when result classId does not match expected classId (class A vs class B)', () => {
    expect(validateStudentLoginClassId('class-B', 'class-A')).toEqual({
      ok: false,
      message: expect.stringContaining('khớp'),
    });
  });

  it('rejects when result classId is empty', () => {
    expect(validateStudentLoginClassId('', 'class-A')).toEqual({
      ok: false,
      message: expect.stringContaining('không hợp lệ'),
    });
  });

  it('rejects when expected classId is null', () => {
    expect(validateStudentLoginClassId('class-A', null)).toEqual({
      ok: false,
      message: expect.stringContaining('thiếu'),
    });
  });

  it('accepts matching classIds', () => {
    expect(validateStudentLoginClassId('class-A', 'class-A')).toEqual({ ok: true });
  });
});

describe('returning student language preference', () => {
  it('keeps a returning student language preference without re-prompting', () => {
    const saved: StudentLanguageView = {
      language: 'ja', supportMode: 'bilingual', showGlossary: true, showSentenceFrames: true, curriculumBridgeIds: [],
    };
    const result = buildStudentLanguageChoiceState(saved);
    expect(result.view).toEqual(saved);
    expect(result.needsFirstRunChoice).toBe(false);
  });

  it('retains the language preference across multiple sessions', () => {
    const saved: StudentLanguageView = {
      language: 'ko', supportMode: 'approved_full_translation', showGlossary: false, showSentenceFrames: true, curriculumBridgeIds: [],
    };
    const result = buildStudentLanguageChoiceState(saved);
    expect(result.view.language).toBe('ko');
    expect(result.view.supportMode).toBe('approved_full_translation');
    expect(result.needsFirstRunChoice).toBe(false);
  });
});

describe('student group assignment privacy', () => {
  it('student receives ONLY groupId, scaffold, and start time — NOT the private reason', () => {
    const assignment = buildStudentGroupAssignment('grp-1', 'Hình/khung câu/thuật ngữ đã chuẩn bị.', 1_787_827_200_000);
    const json = JSON.stringify(assignment);

    expect(assignment.groupId).toBe('grp-1');
    expect(assignment.scaffold).toBe('Hình/khung câu/thuật ngữ đã chuẩn bị.');
    expect(assignment.startedAt).toBe(1_787_827_200_000);
    expect(json).not.toContain('reason');
    expect(json).not.toContain('privateReason');
    expect(json).not.toContain('memberIds');
    expect(json).not.toContain('purpose');
  });

  it('assignment JSON does not leak teacher private rationale', () => {
    const assignment = buildStudentGroupAssignment('grp-mixed', 'Thêm điều kiện, phản ví dụ.', Date.now());
    const json = JSON.stringify(assignment);
    expect(json).not.toContain('HS chưa phân biệt');
    expect(json).not.toContain('teacher_defined');
    expect(json).not.toContain('same_need_workshop');
  });
});

describe('student routed task display', () => {
  const contract = getG10P31V4Contract();

  it('each route M/S/C shows a different prompt but the same success criteria', () => {
    const m = getRoutedVariant(contract, 'M');
    const s = getRoutedVariant(contract, 'S');
    const c = getRoutedVariant(contract, 'C');
    expect(m!.variant.prompt).not.toBe(s!.variant.prompt);
    expect(s!.variant.prompt).not.toBe(c!.variant.prompt);
    expect(m!.variant.successCriteria).toEqual(s!.variant.successCriteria);
    expect(s!.variant.successCriteria).toEqual(c!.variant.successCriteria);
  });

  it('route C shows extension while M and S do not', () => {
    expect(getRoutedVariant(contract, 'C')!.variant.extension).toBeDefined();
    expect(getRoutedVariant(contract, 'M')!.variant.extension).toBeUndefined();
    expect(getRoutedVariant(contract, 'S')!.variant.extension).toBeUndefined();
  });

  it('ordered hints are revealed one at a time and stay in order', () => {
    const hints = getOrderedHints(contract, 'M');
    expect(hints.length).toBeGreaterThan(0);

    let state = createHintState(hints);
    expect(hasMoreHints(state)).toBe(true);

    const first = revealNextHint(state);
    expect(first).toBe(1);
    expect(getRevealedHints(hints, first)).toEqual([hints[0]]);

    const second = revealNextHint({ ...state, revealedCount: first });
    expect(second).toBe(2);
    expect(getRevealedHints(hints, second)).toEqual([hints[0], hints[1]]);
  });

  it('hint fading decreases opacity for older hints', () => {
    const hints = ['A', 'B', 'C'];
    let count = 0;
    count = revealNextHint({ revealedCount: count, totalHints: 3 });
    count = revealNextHint({ revealedCount: count, totalHints: 3 });
    count = revealNextHint({ revealedCount: count, totalHints: 3 });

    expect(computeHintOpacity(2, count)).toBe(1);
    expect(computeHintOpacity(1, count)).toBe(0.6);
    expect(computeHintOpacity(0, count)).toBe(0.35);
  });

  it('hint button text shows remaining count', () => {
    const hints = getOrderedHints(contract, 'S');
    const state = createHintState(hints);
    expect(hasMoreHints(state)).toBe(true);
    expect(state.totalHints - state.revealedCount).toBe(hints.length);
  });

  it('records hintUse: revealing a hint builds a hint response payload for the current step', () => {
    const languagePreference: StudentLanguageView = {
      language: 'vi', supportMode: 'vi_anchor', showGlossary: true, showSentenceFrames: false, curriculumBridgeIds: [],
    };
    const payload = buildHintUsePayload({
      sessionId: 'sess-1', participantUid: 'anon-1', classId: 'class-1', stepId: 'route-work', revealedCount: 1, languagePreference,
    });
    expect(payload.responseType).toBe('hint');
    expect(payload.stepId).toBe('route-work');
    expect(payload.value).toBe(1);
    expect(payload.sessionId).toBe('sess-1');
    expect(payload.participantUid).toBe('anon-1');
    expect(payload.classId).toBe('class-1');
  });

  it('hintUse nonce is stable per step+count so re-reveal does not duplicate', () => {
    const languagePreference: StudentLanguageView = {
      language: 'vi', supportMode: 'vi_anchor', showGlossary: true, showSentenceFrames: false, curriculumBridgeIds: [],
    };
    const first = buildHintUsePayload({ sessionId: 's', participantUid: 'u', classId: 'c', stepId: 'route-work', revealedCount: 1, languagePreference });
    const firstAgain = buildHintUsePayload({ sessionId: 's', participantUid: 'u', classId: 'c', stepId: 'route-work', revealedCount: 1, languagePreference });
    const second = buildHintUsePayload({ sessionId: 's', participantUid: 'u', classId: 'c', stepId: 'route-work', revealedCount: 2, languagePreference });
    expect(first.clientNonce).toBe(firstAgain.clientNonce);
    expect(first.clientNonce).not.toBe(second.clientNonce);
  });
});
