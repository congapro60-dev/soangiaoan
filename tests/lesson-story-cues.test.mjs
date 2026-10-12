import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { PRODUCT_THEMES } from '../lib/product-content.js';
import { STORY_PROFILES, storyCue } from '../lib/lesson/story-cues.js';

const phases = ['experience', 'guided', 'formation', 'practice', 'recheck', 'exit', 'reflection'];
const sentences = text => text.split(/[.!?…]+/u).map(s => s.trim()).filter(Boolean);

test('all twelve profiles preserve canonical titles, goals and places without mutating themes', () => {
  assert.deepEqual(Object.keys(STORY_PROFILES).sort(), Object.keys(PRODUCT_THEMES).sort());
  for (const [id, profile] of Object.entries(STORY_PROFILES)) {
    assert.equal(profile.title, PRODUCT_THEMES[id].title);
    assert.equal(profile.goal, PRODUCT_THEMES[id].goal);
    assert.deepEqual(profile.places, PRODUCT_THEMES[id].places);
    assert.ok(Object.isFrozen(profile));
    assert.ok(Object.isFrozen(profile.places));
    assert.ok(Object.isFrozen(profile.cues));
  }
});

test('every world has a concise opening, seven distinct phase cues and honest complete/partial endings', () => {
  for (const [theme, profile] of Object.entries(STORY_PROFILES)) {
    const texts = [profile.opening, profile.ending, profile.partialEnding, ...phases.map(phase => storyCue({ theme, phase }))];
    assert.equal(new Set(phases.map(phase => storyCue({ theme, phase }))).size, phases.length);
    for (const text of texts) {
      assert.equal(typeof text, 'string');
      assert.ok(sentences(text).length <= 2, `${theme}: ${text}`);
      assert.match(text, /\bem\b/iu);
      assert.ok(text.length <= 350, `${theme}: long cue`);
      assert.doesNotMatch(text, /(?:đã đạt|đạt chuẩn|đã thành thạo|tăng điểm|trừ điểm|mất điểm|thắng lớp|xếp hạng|đứng đầu)/iu);
    }
    assert.equal(storyCue({ theme, concluded: true, complete: true }), profile.ending);
    assert.equal(storyCue({ theme, concluded: true, complete: false }), profile.partialEnding);
    assert.equal(storyCue({ theme, concluded: true }), profile.partialEnding);
    assert.notEqual(profile.ending, profile.partialEnding);
    assert.match(profile.partialEnding, /còn|tiếp|tạm|chưa/iu);
  }
});

test('world-specific clues appear in every phase without presenting fiction as cultural history', () => {
  const clues = new Set();
  for (const profile of Object.values(STORY_PROFILES)) {
    assert.ok(profile.clue.length > 5);
    clues.add(profile.clue);
    assert.equal(profile.culture.kind, 'fiction');
    assert.match(profile.culture.notice, /hư cấu/iu);
    for (const phase of phases) assert.ok(profile.cues[phase].includes(profile.clue));
    for (const source of profile.culture.furtherReading) {
      assert.match(source.url, /^https:\/\/whc\.unesco\.org\/en\/list\/(?:948|1328)$/);
      assert.equal(source.use, 'optional_teacher_context');
    }
  }
  assert.equal(clues.size, 12);
  assert.equal(Object.values(STORY_PROFILES).filter(p => p.culture.furtherReading.length).length, 2);
});

test('unknown themes and phases safely use modern opening, including prototype property names', () => {
  assert.equal(storyCue(), STORY_PROFILES.modern.opening);
  for (const theme of ['unknown', 'constructor', '__proto__', {}, null]) assert.equal(storyCue({ theme, phase: 'guided' }), STORY_PROFILES.modern.cues.guided);
  for (const phase of ['unknown', 'constructor', '__proto__', null]) assert.equal(storyCue({ theme: 'historical', phase }), STORY_PROFILES.historical.opening);
});

test('cue generation stays offline, deterministic and independent of scores or pupil work', async () => {
  const source = await readFile(new URL('../lib/lesson/story-cues.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\b(?:fetch|eval)\s*\(|node:|AI_PROVIDER|passport|submission|answerKey/);
  const before = JSON.stringify(PRODUCT_THEMES);
  const cue = storyCue({ theme: 'modern', phase: 'recheck', score: 0, wrong: true });
  assert.equal(cue, storyCue({ theme: 'modern', phase: 'recheck', score: 999, wrong: false }));
  assert.equal(JSON.stringify(PRODUCT_THEMES), before);
});
