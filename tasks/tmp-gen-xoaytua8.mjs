import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('tasks/tmp-qa-xoaytua7.cjs', 'utf8');
const anchor = "  console.log('GV chặng:', gvStage);";
if (!src.includes(anchor)) throw new Error('anchor missing');
const block = [
  anchor,
  "  // Bật 'Hiện kết quả lớp' để groupProgress được publish (rule yêu cầu publicStatsEnabled).",
  '  let statsOn = false;',
  '  for (let i = 0; i < 5; i++) {',
  '    const state = await gv2.evaluate(() => {',
  "      const t = document.body.innerText || '';",
  "      if (t.indexOf('Ẩn kết quả lớp') >= 0) return 'on';",
  "      const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === 'Hiện kết quả lớp' && !x.disabled);",
  "      if (b) { b.click(); return 'clicked'; }",
  "      return 'missing';",
  '    });',
  "    if (state === 'on') { statsOn = true; break; }",
  '    await sleep(2500);',
  '  }',
  "  console.log('publicStatsEnabled:', statsOn ? '✓ bật' : '✗ chưa bật');",
].join('\n');
writeFileSync('tasks/tmp-qa-xoaytua8.cjs', src.split(anchor).join(block), 'utf8');
console.log('written tmp-qa-xoaytua8.cjs');
