import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { ref, uploadBytes, deleteObject, getBytes } from 'firebase/storage';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, it } from 'vitest';
let env: RulesTestEnvironment;
const projectId = 'demo-smartplan-storage-lock';
beforeAll(async () => { env = await initializeTestEnvironment({ projectId, storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 } }); });
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearStorage(); });
it('owner uploads a temporary legacy object once; cannot rewrite or delete accepted bytes', async () => {
  const owner = env.authenticatedContext('student').storage(`gs://${projectId}.appspot.com`);
  const object = ref(owner, 'homework/student/a.jpg');
  await assertSucceeds(uploadBytes(object, new Uint8Array([1, 2, 3]), { contentType: 'image/jpeg' }));
  await assertSucceeds(getBytes(object));
  await assertFails(uploadBytes(object, new Uint8Array([4, 5, 6]), { contentType: 'image/jpeg' }));
  await assertFails(deleteObject(object));
  await assertFails(uploadBytes(ref(env.authenticatedContext('other').storage(`gs://${projectId}.appspot.com`), 'homework/student/b.jpg'), new Uint8Array([1]), { contentType: 'image/jpeg' }));
});
it('signed upload staging and accepted homework are server-only for student and teacher', async () => {
  await env.withSecurityRulesDisabled(async context => { const storage = context.storage(`gs://${projectId}.appspot.com`); await uploadBytes(ref(storage, 'accepted-homework/class/student/a'), new Uint8Array([1]), { contentType: 'image/jpeg' }); });
  for (const uid of ['student', 'teacher']) {
    const storage = env.authenticatedContext(uid).storage(`gs://${projectId}.appspot.com`);
    await assertFails(uploadBytes(ref(storage, 'pending-homework/grant/0'), new Uint8Array([1]), { contentType: 'image/jpeg' }));
    await assertFails(uploadBytes(ref(storage, 'accepted-homework/class/student/a'), new Uint8Array([2]), { contentType: 'image/jpeg' }));
    await assertFails(deleteObject(ref(storage, 'accepted-homework/class/student/a')));
    await assertFails(getBytes(ref(storage, 'accepted-homework/class/student/a')));
  }
});
