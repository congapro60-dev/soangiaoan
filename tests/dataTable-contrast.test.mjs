import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Bảng dữ liệu không đặt màu chữ nên kế thừa màu sáng của trang tối.
// Trên V44, chữ sáng nằm trên nền ô sáng: Codex đo được 1,06–1,18:1 (ngưỡng 4,5:1).
// Bản sửa đặt màu chữ tối, nên mọi hàng phải tự khai nền sáng: thẻ bao quanh có nền tối (#1e293b).
const src = readFileSync(new URL('../components/lesson/DataVisual.tsx', import.meta.url), 'utf8');
const start = src.indexOf('function DataTable(');
const block = src.slice(start, src.indexOf('\n}', start));

function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const inks = [...block.matchAll(/color: "#([0-9a-f]{6})"/g)].map(m => `#${m[1]}`);
const backgrounds = [...block.matchAll(/background: "#([0-9a-f]{6})"/g)].map(m => `#${m[1]}`);

// Khai báo của từng hàng (trước vòng lặp ô) và màu chữ của ô (sau vòng lặp ô).
const rowStart = block.indexOf('visual.rows.map(');
const cellStart = block.indexOf('{row.map(', rowStart);
const rowBackgrounds = [...block.slice(rowStart, cellStart).matchAll(/background: "#([0-9a-f]{6})"/g)].map(m => `#${m[1]}`);
const cellInks = [...block.slice(cellStart).matchAll(/color: "#([0-9a-f]{6})"/g)].map(m => `#${m[1]}`);

test('Bảng dữ liệu: ô có màu chữ riêng (th và td)', () => {
  assert.ok(inks.length >= 2, `cần màu chữ cho th và td, hiện có ${inks.length}`);
});

test('Bảng dữ liệu: chữ tương phản ≥ 4,5:1 trên nền ô và hàng nổi bật', () => {
  assert.ok(inks.length >= 2 && backgrounds.length >= 2, 'thiếu màu chữ hoặc nền trong DataTable');
  const bad = [];
  for (const ink of inks) {
    for (const bg of backgrounds) {
      const c = contrast(ink, bg);
      if (c < 4.5) bad.push(`chữ ${ink} trên nền ${bg}: ${c.toFixed(2)}:1`);
    }
  }
  assert.deepEqual(bad, []);
});

test('Bảng dữ liệu: hàng thường cũng khai nền, không để trong suốt trên thẻ tối', () => {
  assert.ok(rowBackgrounds.length >= 2, `mỗi hàng phải khai nền (hàng thường và hàng nổi bật), hiện có ${rowBackgrounds.length}`);
});

test('Bảng dữ liệu: chữ ô tương phản ≥ 4,5:1 trên nền của từng loại hàng', () => {
  assert.ok(cellInks.length >= 1, 'thiếu màu chữ của ô');
  const bad = [];
  for (const ink of cellInks) {
    for (const bg of rowBackgrounds) {
      const c = contrast(ink, bg);
      if (c < 4.5) bad.push(`chữ ${ink} trên nền hàng ${bg}: ${c.toFixed(2)}:1`);
    }
  }
  assert.deepEqual(bad, []);
});
