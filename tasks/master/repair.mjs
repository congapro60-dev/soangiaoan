import fs from 'node:fs';
import { execSync } from 'node:child_process';

const file = process.argv[2];

for (let attempt = 0; attempt < 80; attempt++) {
  let out;
  try {
    execSync(`node --check "${file}"`, { stdio: 'pipe' });
    console.log(`OK sau ${attempt} lần sửa`);
    process.exit(0);
  } catch (e) {
    out = String(e.stderr || '');
  }
  const m = out.match(/:(\d+)\n/);
  const caretBlock = out.split('\n');
  const lineNo = Number((out.match(/:(\d+)\s/s) || [])[1]);
  if (!lineNo) { console.log('KHÔNG ĐỌC ĐƯỢC LỖI\n' + out.slice(0, 400)); process.exit(1); }

  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const line = lines[lineNo - 1];
  // tìm vị trí ′ cuối cùng trên dòng (thường là dấu đóng chuỗi bị đổi nhầm)
  const idx = line.lastIndexOf('′');
  if (idx === -1) { console.log('KHÔNG CÒN ′ TRÊN DÒNG ' + lineNo + '\n' + out.slice(0, 400)); process.exit(1); }
  lines[lineNo - 1] = line.slice(0, idx) + "'" + line.slice(idx + 1);
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
}

console.log('quá nhiều lỗi');
