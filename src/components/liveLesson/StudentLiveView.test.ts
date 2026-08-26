import { describe, expect, it } from 'vitest';
import type { RosterResponse } from '../../services/studentPortalApi';
import { getStudentChoiceOptions, getStudentChoiceLabel, resolveStudentLiveIdentity, validateStudentRosterContext } from './StudentLiveView';

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
