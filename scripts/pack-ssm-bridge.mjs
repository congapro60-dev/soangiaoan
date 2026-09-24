// Đóng gói tiện ích Edge `extension/ssm-bridge` thành public/downloads/ssm-bridge.zip để giáo viên
// tải thẳng từ app. Chạy tự động trước `npm run build` (prebuild) nên file zip luôn khớp mã nguồn.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import JSZip from 'jszip';

const SRC = 'extension/ssm-bridge';
const FILES = ['manifest.json', 'background.js', 'app-relay.js', 'ssm-session.js', 'README.md'];
const OUT_DIR = 'public/downloads';

const zip = new JSZip();
for (const name of FILES) zip.file(`ssm-bridge/${name}`, readFileSync(join(SRC, name)));

mkdirSync(OUT_DIR, { recursive: true });
const data = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
writeFileSync(join(OUT_DIR, 'ssm-bridge.zip'), data);
console.log(`ssm-bridge.zip: ${FILES.length} file, ${data.length} byte`);
