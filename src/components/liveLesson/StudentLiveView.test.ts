import { describe, expect, it } from 'vitest';
import { resolveStudentLiveIdentity } from './StudentLiveView';

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
