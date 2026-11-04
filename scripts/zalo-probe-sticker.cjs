// Dò đúng tham số /sendSticker. CHỈ gọi sendSticker với chat_id không hợp lệ để KHÔNG gửi gì đi.
// TUYỆT ĐỐI không gọi endpoint phá hoại (deleteWebhook/setWebhook) trong script này.
const fs = require('node:fs');
const envText = fs.readFileSync(process.argv[2], 'utf8');
const get = k => { const m = new RegExp(`^${k}=(.+)$`, 'm').exec(envText); return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''; };
const token = get('ZALO_BOT_TOKEN');
const ORIGIN = 'https://bot-api.zaloplatforms.com';
const probe = async (label, body) => {
  const res = await fetch(`${ORIGIN}/bot${encodeURIComponent(token)}/sendSticker`, {
    method: 'POST', redirect: 'error', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(12000),
  });
  const t = await res.text();
  console.log(`${label} -> ${t.slice(0, 150)}`);
};
(async () => {
  await probe('sticker=str', { chat_id: 'invalid-probe', sticker: '1' });
  await probe('sticker=int', { chat_id: 'invalid-probe', sticker: 1 });
  await probe('sticker_id', { chat_id: 'invalid-probe', sticker_id: '1' });
  await probe('no sticker', { chat_id: 'invalid-probe' });
})();
