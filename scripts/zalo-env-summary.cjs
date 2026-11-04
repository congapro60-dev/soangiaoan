// In danh sách userId được phép nhưng CHE BỚT (không in nguyên định danh Zalo).
const fs = require('node:fs');
const t = fs.readFileSync(process.argv[2], 'utf8');
const get = k => { const m = new RegExp(`^${k}=(.+)$`, 'm').exec(t); return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''; };
const mask = v => v ? v.split(',').map(s => s.trim()).filter(Boolean).map(s => `${s.slice(0, 4)}...${s.slice(-3)}`).join(' , ') : '(rong)';
for (const k of ['ZALO_BOT_ID', 'ZALO_BOT_ALLOWED_USER_IDS', 'ZALO_BOT_DUAL_ROLE_USER_IDS', 'ASSISTANT_NAME', 'ZALO_BOT_CONGRA_STICKER']) {
  console.log(`${k} = ${mask(get(k))}`);
}
