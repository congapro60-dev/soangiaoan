import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessTeacherSolutions } from '../lib/lesson/teacher-access.js';

test('teacher solutions require root or an active global host', () => {
  const user = { userId: 'u1' };
  assert.equal(canAccessTeacherSolutions({ user, isRootUser: true }), true);
  assert.equal(canAccessTeacherSolutions({ user, systemHost: { role: 'host', revoked_at: null } }), true);
  assert.equal(canAccessTeacherSolutions({ user, systemHost: { role: 'host', revoked_at: 1 } }), false);
  assert.equal(canAccessTeacherSolutions({ user, systemHost: { role: 'observer', revoked_at: null } }), false);
  assert.equal(canAccessTeacherSolutions({ user: null, isRootUser: true }), false);
});
