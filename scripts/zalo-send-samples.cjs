// Gửi THẬT các tin mẫu tới nick Zalo của chủ dự án (đã được đồng ý).
// Nội dung lấy từ CHÍNH các hàm dựng chuỗi production (không chép tay) qua file JSON
// do bước test xuất ra; nếu thiếu file thì dừng, không gửi nội dung tự bịa.
const fs = require('node:fs');
const envText = fs.readFileSync(process.argv[2], 'utf8');
const get = k => { const m = new RegExp(`^${k}=(.+)$`, 'm').exec(envText); return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''; };
const token = get('ZALO_BOT_TOKEN');
const target = get('ZALO_BOT_DUAL_ROLE_USER_IDS').split(',')[0].trim();
const payload = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
if (!token || !target) { console.log('MISSING', { token: !!token, target: !!target }); process.exit(1); }

const ORIGIN = 'https://bot-api.zaloplatforms.com';
const send = async (text) => {
  const res = await fetch(`${ORIGIN}/bot${encodeURIComponent(token)}/sendMessage`, {
    method: 'POST', redirect: 'error', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: target, text }), signal: AbortSignal.timeout(20000),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: body.ok === true, code: body.error_code ?? '-', desc: String(body.description ?? '').slice(0, 100) };
};

(async () => {
  console.log(`target = ${target.slice(0, 4)}...${target.slice(-3)} | ${payload.length} tin`);
  for (let i = 0; i < payload.length; i++) {
    const r = await send(payload[i]);
    console.log(`tin ${i + 1}/${payload.length} (${payload[i].length} ký tự) -> ok=${r.ok} code=${r.code} ${r.desc}`);
    if (!r.ok) { console.log('DỪNG: Zalo từ chối, không gửi tiếp để tránh spam.'); break; }
    await new Promise(res => setTimeout(res, 800));
  }
})();
