import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderDeweyLesson } from './template';
import { SONG_ANH_SAMPLE } from './sampleContent';

// P0 (b) — chống lộ đáp án: HTML bài học KHÔNG được chứa đáp án dưới bất kỳ hình thức
// attr/div ẩn nào; đáp án chỉ được nhúng vào closure ANSWER_KEY của engine script.
describe('renderDeweyLesson — không lộ đáp án trong DOM', () => {
  const html = renderDeweyLesson(SONG_ANH_SAMPLE, 'classic', { studentCode: 'HS01' });
  const scriptOnly = html.slice(html.lastIndexOf('<script>'));

  it('không còn attr đáp án trên DOM', () => {
    expect(html).not.toContain('data-correct-option');
    expect(html).not.toContain('data-correct-index');
    expect(html).not.toContain('data-correct=');
    expect(html).not.toContain('data-statement-correct');
    expect(html).not.toContain('data-tolerance');
    expect(html).not.toContain('data-explanation=');
    expect(html).not.toContain('data-grade-solution');
  });

  it('không còn blob JSON nguyên bài (#dewey-content) trong body', () => {
    expect(html).not.toContain('id="dewey-content"');
  });

  it('lời giải/chấm ảnh chờ script engine điền, không nằm sẵn trong body', () => {
    const bodyOnly = html.slice(0, html.lastIndexOf('<script>'));
    const sampleSolutions = SONG_ANH_SAMPLE.olympia.packs
      .flatMap(pack => pack.questions)
      .map(question => question.solution)
      .filter(Boolean);
    expect(sampleSolutions.length).toBeGreaterThan(0);
    sampleSolutions.forEach(solution => {
      expect(bodyOnly).not.toContain(solution.slice(0, 60));
    });
  });

  it('engine giữ ANSWER_KEY trong closure script (chấm client-side vẫn chạy được)', () => {
    expect(scriptOnly).toContain('var ANSWER_KEY =');
    expect(scriptOnly).toContain('"correctIndex"');
  });

  it('engine script sinh ra hợp lệ về cú pháp JS (node --check)', () => {
    const start = html.lastIndexOf('<script>');
    const end = html.lastIndexOf('</script>');
    const script = html.slice(start + 8, end);
    expect(script).toContain('var ANSWER_KEY');
    const file = join(mkdtempSync(join(tmpdir(), 'dewey-engine-')), 'engine.js');
    writeFileSync(file, script);
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });
});
