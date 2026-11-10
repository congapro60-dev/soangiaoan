import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
let env: RulesTestEnvironment;
const uid = 'anonymous', sessionId = 'a'.repeat(64);
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'bot-web-revocation-rules', firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 } }); });
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'classes/c'), { teacherId: 'teacher', joinCode: 'LOP1' });
    await setDoc(doc(db, 'classes/c/students/s'), { name: 'Học sinh thử' });
    await setDoc(doc(db, 'classes/c/studentSecrets/s'), { pinHash: 'not-readable', updatedAt: 'revision-one' });
    await setDoc(doc(db, 'channelLinks/channel'), { active: true, channel: 'zalo_bot', channelAccountId: 'bot', channelUserId: 'user', role: 'student', classId: 'c', studentId: 's' });
    await setDoc(doc(db, `assistantStudentWebSessions/${sessionId}`), { uid, role: 'student', classId: 'c', studentId: 's', teacherId: 'teacher', linkId: 'channel', botId: 'bot', userId: 'user', pinUpdatedAt: 'revision-one', joinCode: 'LOP1', expiresAt: Date.now() + 8 * 60 * 60_000 });
    await setDoc(doc(db, `studentLinks/${uid}`), { uid, classId: 'c', studentId: 's', teacherId: 'teacher', botWebSession: sessionId });
  });
});
const readClass = () => getDoc(doc(env.authenticatedContext(uid).firestore(), 'classes/c'));
describe('bot student Firestore authorization', () => {
  it('allows active scoped session; hides the server-only grant and PIN', async () => {
    await assertSucceeds(readClass());
    const db = env.authenticatedContext(uid).firestore();
    await assertFails(getDoc(doc(db, `assistantStudentWebSessions/${sessionId}`)));
    await assertFails(getDoc(doc(db, 'classes/c/studentSecrets/s')));
  });
  it.each(['pin', 'unlink', 'student', 'class', 'expiry'])('revokes direct reads after %s change', async change => {
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      if (change === 'pin') await updateDoc(doc(db, 'classes/c/studentSecrets/s'), { pinHash: 'changed', updatedAt: 'revision-two' });
      if (change === 'unlink') await updateDoc(doc(db, 'channelLinks/channel'), { active: false });
      if (change === 'student') await deleteDoc(doc(db, 'classes/c/students/s'));
      if (change === 'class') await updateDoc(doc(db, `studentLinks/${uid}`), { classId: 'other' });
      if (change === 'expiry') await updateDoc(doc(db, `assistantStudentWebSessions/${sessionId}`), { expiresAt: 0 });
    });
    await assertFails(readClass());
  });
  it('cannot read a different class student even when the student ID matches', async () => {
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db, 'classes/other'), { teacherId: 'otherTeacher', joinCode: 'OTHER' });
      await setDoc(doc(db, 'classes/other/students/s'), { name: 'Other student' });
    });
    await assertFails(getDoc(doc(env.authenticatedContext(uid).firestore(), 'classes/other/students/s')));
  });
  it('preserves a normal anonymous PIN-linked student', async () => {
    await env.withSecurityRulesDisabled(async context => { await setDoc(doc(context.firestore(), `studentLinks/${uid}`), { uid, classId: 'c', studentId: 's', teacherId: 'teacher' }); });
    await assertSucceeds(readClass());
  });
});
