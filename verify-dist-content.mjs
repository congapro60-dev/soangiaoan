import fs from 'node:fs';
import zlib from 'node:zlib';

const chunk = fs.readFileSync('dist/server/_next/static/semester-content-B6dxrxtp.js', 'utf8');
// Tìm trong chunk: lesson r22-g10-discover-r108 -> data base64
const idIdx = chunk.indexOf('r22-g10-discover-r108');
console.log('có lesson r108:', idIdx >= 0);
if (idIdx >= 0) {
  // data base64 nằm gần đó: tìm chuỗi base64 dài nhất trong 2000 ký tự quanh
  const around = chunk.slice(Math.max(0, idIdx - 500), idIdx + 3000);
  const m = around.match(/"data":"([A-Za-z0-9+/=]{500,})"/);
  if (m) {
    const pkg = JSON.parse(zlib.gunzipSync(Buffer.from(m[1], 'base64')).toString());
    const stats = pkg.tasks.filter(t => /cổ phiếu|Bài 14/.test(t.prompt));
    console.log('task trong pkg:', pkg.tasks.length, '| task Bài 14:', stats.length);
    if (stats.length) console.log('mẫu:', stats[0].prompt.replace(/\s+/g, ' ').slice(0, 110));
    const vis = pkg.tasks.filter(t => t.visual);
    console.log('task có visual:', vis.length);
  } else console.log('không tìm thấy data base64 quanh lesson id');
}
// Đếm tổng số lessons metadata trong chunk
console.log('số lesson id r22-:', (chunk.match(/r22-g\d+-discover/g) || []).length);
