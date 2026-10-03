import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
const route = await readFile(new URL('../app/api/escape/route.js', import.meta.url), 'utf8');

test('arenaDuel uses the serialized own player row when rendering the fighter', () => {
  const start = app.indexOf('function arenaDuel(a)');
  const end = app.indexOf('\n    function arenaBracket', start);
  assert.ok(start >= 0 && end > start, 'arenaDuel function exists');
  const source = app.slice(start, end);
  assert.match(source, /own\.knockdowns/);
  assert.doesNotMatch(source, /mine\.knockdowns/);
});

test('arena UI sends the server event id and route validates it', () => {
  assert.match(app, /arenaAction: 'answer', eventId: a\.id/);
  assert.match(app, /arenaAction: action, eventId: a\.id/);
  assert.match(route, /b\.eventId !== event\.id/);
  assert.match(route, /ARENA_EVENT_MISMATCH/);
});
