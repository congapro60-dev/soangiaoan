// Đặt lại webhook + xác nhận verify ĐẠT (chạy sau mỗi lần deploy đổi alias).
// Không in token/secret.
const fs = require('node:fs');
const path = require('node:path');

const { execSync } = require('node:child_process');

let envText = '';
if (process.argv[2] && fs.existsSync(process.argv[2])) {
  envText = fs.readFileSync(process.argv[2], 'utf8');
} else if (fs.existsSync(path.join(__dirname, '../.env'))) {
  envText = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
} else if (fs.existsSync(path.join(__dirname, '../.env.local'))) {
  envText = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
} else {
  // Tự động kéo env từ Vercel nếu chưa có file local
  try {
    const tmp = path.join(require('node:os').tmpdir(), 'zalo_auto_env.txt');
    execSync('npx vercel env pull "' + tmp + '" --environment production --scope congapro60-devs-projects --yes', { stdio: 'ignore' });
    if (fs.existsSync(tmp)) {
      envText = fs.readFileSync(tmp, 'utf8');
      fs.unlinkSync(tmp);
    }
  } catch {}
}
const get = k => { const m = new RegExp(`^${k}=(.+)$`, 'm').exec(envText); return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''; };
const token = get('ZALO_BOT_TOKEN');
const secret = get('ZALO_BOT_WEBHOOK_SECRET');
const url = 'https://zalo-test.congapro60-devs-projects.vercel.app/api/assistant?transport=zalo_bot';
const ORIGIN = 'https://bot-api.zaloplatforms.com';
const call = async (path, body) => {
  const res = await fetch(`${ORIGIN}/bot${encodeURIComponent(token)}${path}`, {
    method: 'POST', redirect: 'error', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(25000),
  });
  return JSON.parse(await res.text());
};
(async () => {
  const set = await call('/setWebhook', { url, secret_token: secret });
  const info = await call('/getWebhookInfo', {});
  console.log('verify:', set?.result?.verification?.outcome ?? JSON.stringify(set).slice(0, 160));
  console.log('url:', info?.result?.url ?? '-');
  const me = await call('/getMe', {});
  console.log('bot:', me?.result?.display_name ?? '-', '| can_join_groups:', me?.result?.can_join_groups);
})();
