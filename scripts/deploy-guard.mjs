#!/usr/bin/env node
/**
 * deploy-guard.mjs — CHẶN `vercel --prod` khi thư mục này KHÔNG ở đúng đỉnh `origin/main`.
 *
 * Vì sao: ngày 25/10/2026 có nhiều lần deploy CLI từ các thư mục cũ
 * (spai-merge-main, smart-lesson-plan-ai-score-fix, spai-main-port, …) đẩy
 * production giaoandewey LÙI về code trước G1/G3, xoá mất bản vá tính tiền và
 * bản sửa báo cáo phụ huynh. Deployment CLI không gắn commit Git nên không ai
 * phát hiện cho tới khi soi digest từng function.
 *
 * Cách dùng (thay cho `vercel --prod`):
 *     node scripts/deploy-guard.mjs
 *
 * Cách khác an toàn hơn: chỉ push lên `main` và để Vercel Git integration deploy
 * (mỗi bản deploy gắn đúng một commit, kiểm được bằng `vercel ls --meta githubCommitRef=main`).
 */

import { execFileSync } from 'node:child_process';

const run = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const tryRun = (args) => {
  try { return run(args); } catch { return null; }
};

const die = (lines) => {
  console.error(lines.join('\n'));
  process.exit(1);
};

console.log('→ Kiểm tra trước khi deploy production…');

if (!tryRun(['rev-parse', '--git-dir'])) {
  die(['✗ Không phải repo git. Không deploy production từ thư mục lạ.']);
}

const branch = tryRun(['rev-parse', '--abbrev-ref', 'HEAD']);
if (branch !== 'main' && branch !== 'HEAD') {
  die([
    `✗ Đang ở nhánh '${branch}', không phải main.`,
    '  Deploy production chỉ từ main. Chuyển nhánh rồi thử lại.',
  ]);
}

tryRun(['fetch', 'origin', 'main']);
const head = tryRun(['rev-parse', 'HEAD']);
const main = tryRun(['rev-parse', 'origin/main']);
if (!main) {
  die(['✗ Không đọc được origin/main. Kiểm mạng rồi thử lại.']);
}

if (head !== main) {
  const behind = tryRun(['rev-list', '--count', 'HEAD..origin/main']) ?? '?';
  const ahead = tryRun(['rev-list', '--count', 'origin/main..HEAD']) ?? '?';
  die([
    '✗ Thư mục này KHÔNG ở đỉnh origin/main.',
    `    HEAD        : ${tryRun(['log', '-1', '--format=%h %s', 'HEAD'])}`,
    `    origin/main : ${tryRun(['log', '-1', '--format=%h %s', 'origin/main'])}`,
    `    thiếu ${behind} commit, thừa ${ahead} commit`,
    '',
    '  Deploy bây giờ sẽ đẩy production LÙI về code cũ.',
    '  Chạy: git pull origin main   (hoặc dùng thư mục khác đã cập nhật)',
  ]);
}

const dirty = tryRun(['status', '--porcelain']);
if (dirty) {
  die([
    '✗ Còn file chưa commit:',
    ...dirty.split('\n').map(line => `    ${line}`),
    '',
    '  Deploy sẽ đóng gói cả những file này. Commit hoặc stash trước.',
  ]);
}

console.log(`✓ Ở đúng đỉnh origin/main (${tryRun(['log', '-1', '--format=%h %s', 'HEAD'])})`);
console.log('✓ Cây làm việc sạch');
console.log('');
console.log('→ Deploy production:');
console.log('  (guard chỉ kiểm; chạy `npx vercel --prod` bằng tay sau khi thấy dòng này)');
