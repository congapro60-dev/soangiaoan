import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css = () => readFileSync(new URL('../public/mode-classroom.css', import.meta.url), 'utf8');

function luminance(hex) {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map(i => parseInt(value.slice(i, i + 2), 16) / 255)
    .map(x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('every token used by the game boards resolves on both shells', () => {
  const text = css();
  // The lesson room ships --lesson-* while the legacy game shell ships --panel/--gold.
  assert.match(text, /--mc-panel:\s*var\(--panel,\s*var\(--lesson-surface/);
  assert.match(text, /--mc-line:\s*var\(--line,\s*var\(--lesson-border/);
  assert.match(text, /--mc-muted:\s*var\(--muted,\s*var\(--lesson-text-muted/);
  // No rule may depend on a bare legacy token again.
  const bareLegacy = /(?:^|[^-\w])(?:var\(--gold\)|var\(--panel\)|var\(--panel2\)|var\(--line\)|var\(--text\)|var\(--muted\))/g;
  const matches = [...text.matchAll(bareLegacy)];
  assert.equal(matches.length, 0, 'unscoped legacy token: ' + matches.map(m => m[0]).join(', '));
});

test('board text clears WCAG AA on the dark lesson surface', () => {
  const text = css();
  const accent = (text.match(/--mc-accent-text:\s*(#[0-9a-fA-F]{6})/) || [])[1];
  assert.ok(accent, 'accent text token missing');
  assert.ok(contrast(accent, '#1e293b') >= 4.5, `accent ${accent} on panel: ${contrast(accent, '#1e293b').toFixed(2)}`);
  assert.ok(contrast(accent, '#334155') >= 4.5, `accent ${accent} on panel2: ${contrast(accent, '#334155').toFixed(2)}`);
  assert.ok(contrast('#94a3b8', '#1e293b') >= 4.5, 'muted text');
  assert.ok(contrast('#f8fafc', '#1e293b') >= 4.5, 'body text');
});

test('the accent is never used for small body text without the light variant', () => {
  const text = css();
  // Any rule that sets the text colour must use the readable variant, not the raw accent.
  const colorRules = [...text.matchAll(/(?<![-\w])color:\s*var\(--mc-accent\)/g)];
  assert.equal(colorRules.length, 0, 'raw accent used as a text colour');
});

test('boards keep their own layout rules for every new game', () => {
  const text = css();
  for (const selector of ['.game-board .lane', '.game-board .standing', '.game-board .wire', '.game-board .plot', '.game-board .boss-bar']) {
    assert.ok(text.includes(selector), selector);
  }
  assert.match(text, /min-height:\s*64px/);
});
