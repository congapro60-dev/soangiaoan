// Debug + fix fp replace cho R5
import { readFileSync, writeFileSync } from 'node:fs';
let h = readFileSync('HANDOFF.md', 'utf8');
const oldS = 'Giá trị sau R4 (28/10, thêm spec 79 + file giáo án 79): `b6dfa109aaf14022404bbe5f533b9eeba0ea6293c4e375717a466ea67a77be24` (hex-64; trước đó R3·fix1: `54d92529…83c6f`, R3: `f10723f4…`, R2+fix ký hiệu: `36c18d6d…`).';
console.log('includes oldS:', h.includes(oldS));
if (h.includes(oldS)) {
  h = h.replace(oldS, 'Giá trị sau R5 (28/10, thêm spec 77 + file giáo án 77): `7bfadbefd8f7541dd814500ae9c85d1f74921a5eddbb5800ef4ba75a64c6c702` (hex-64; trước đó R4: `b6dfa109…7be24`, R3·fix1: `54d92529…83c6f`).');
  writeFileSync('HANDOFF.md', h, 'utf8');
  console.log('fp replaced OK');
} else {
  // fallback: regex theo mốc "Giá trị sau R4 ... )" đến hết dòng
  const re = /Giá trị sau R4 \(28\/10[^\n]+\)/;
  if (!re.test(h)) throw new Error('không tìm thấy dòng fp R4');
  h = h.replace(re, 'Giá trị sau R5 (28/10, thêm spec 77 + file giáo án 77): `7bfadbefd8f7541dd814500ae9c85d1f74921a5eddbb5800ef4ba75a64c6c702` (hex-64; trước đó R4: `b6dfa109…7be24`, R3·fix1: `54d92529…83c6f`).');
  writeFileSync('HANDOFF.md', h, 'utf8');
  console.log('fp replaced via regex OK');
}
