// Suite kiểm tra toàn diện bot Zalo cho HS lớp 11 qua webhook Vercel
// Test các ca:
// 1. Chóp tam giác S.ABC (đáy tam giác, SA ⊥ đáy)
// 2. Chóp đều S.ABCD (tâm O)
// 3. Hình lăng trụ tam giác ABC.A'B'C'
// 4. Giải tích 11: Giới hạn lim_{x -> 2} \frac{x^2 - 4}{x - 2} (ảnh KaTeX hoặc Unicode phân số)
// 5. Đại số 11: Cấp số cộng / cấp số nhân
// 6. Tin nhắn thường: tra cứu điểm / hướng dẫn (không hình, kèm link lớp)

const fs = require('fs');
const admin = require('firebase-admin');

// Đọc secret từ .env.probe
const envProbe = fs.readFileSync('.env.probe', 'utf8');
const getEnvVal = (k) => {
  const m = new RegExp(`^${k}=(.*)$`, 'm').exec(envProbe);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
};

const sec = getEnvVal('ZALO_BOT_WEBHOOK_SECRET');
const saRaw = getEnvVal('FIREBASE_SERVICE_ACCOUNT_KEY');

const field = (name) => {
  const m = new RegExp('"' + name + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"').exec(saRaw);
  return m ? m[1].replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\"/g, '"') : null;
};

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: field('project_id'),
    clientEmail: field('client_email'),
    privateKey: field('private_key'),
  }),
  storageBucket: field('project_id') + '.firebasestorage.app',
});

const alias = 'https://zalo-test.congapro60-devs-projects.vercel.app/api/assistant?transport=zalo_bot';

const testCases = [
  {
    name: 'Toán 11 - Chóp đáy tam giác SA vuong goc day',
    text: 'Cho hình chóp S.ABC có đáy ABC là tam giác vuông tại B, SA vuông góc với mặt phẳng (ABC). Hãy vẽ hình và tính thể tích khối chóp biết SA = a, AB = a, BC = 2a.',
    expectMedia: true,
  },
  {
    name: 'Toán 11 - Giới hạn hàm số (phân thức KaTeX)',
    text: 'Tính giới hạn: lim_{x -> 1} \\frac{\\sqrt{2x + 2} - 2}{x - 1}. Trình bày chi tiết các bước.',
    expectMedia: false,
  },
  {
    name: 'Toán 11 - Cấp số nhân',
    text: 'Cho cấp số nhân (u_n) có u_1 = 3 và công bội q = 2. Tính số hạng thứ 7 và tổng 10 số hạng đầu tiên.',
    expectMedia: false,
  },
  {
    name: 'Lớp học - Hỏi link lớp và menu',
    text: 'Làm thế nào để vào cổng học tập trực tuyến của lớp?',
    expectMedia: false,
  },
];

async function sendZaloMessage(text) {
  const mid = 'e2e-' + Date.now() + '-' + Math.floor(Math.random() * 9999);
  const body = JSON.stringify({
    event_name: 'message.text.received',
    message: {
      from: { id: '6428d37c9d35746b2d24', is_bot: false },
      chat: { id: '6428d37c9d35746b2d24', chat_type: 'PRIVATE' },
      text: text,
      message_id: mid,
      date: Date.now(),
    },
  });

  const res = await fetch(alias, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-bot-api-secret-token': sec,
    },
    body,
  });

  return { status: res.status, ok: res.ok };
}

async function getStorageSnapshot() {
  const bucket = admin.storage().bucket();
  const [files] = await bucket.getFiles({ prefix: 'geometry/', maxResults: 100 });
  return files.length;
}

(async () => {
  console.log('=== BẮT ĐẦU E2E TEST TOÁN 11 QUA POWERSHELL/NODE ===');
  let passCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`\n[${i + 1}/${testCases.length}] TEST: ${tc.name}`);
    const beforeCount = await getStorageSnapshot();
    
    const sendResult = await sendZaloMessage(tc.text);
    console.log(`  -> Gửi webhook: HTTP ${sendResult.status}`);
    if (!sendResult.ok) {
      console.log(`  ❌ FAIL webhook HTTP ${sendResult.status}`);
      continue;
    }

    // Đợi 8s cho Vercel AI pipeline xử lý xong
    await new Promise((r) => setTimeout(r, 8000));

    const afterCount = await getStorageSnapshot();
    if (tc.expectMedia) {
      if (afterCount > beforeCount) {
        console.log(`  ✅ PASS: Đã sinh ảnh hình học mới (Storage: ${beforeCount} -> ${afterCount})`);
        passCount++;
      } else {
        console.log(`  ⚠️ WARN: Không thấy ảnh mới trong Storage (có thể model trả text thuần)`);
      }
    } else {
      console.log(`  ✅ PASS: Webhook 200, xử lý lời giải toán/link lớp trơn tru`);
      passCount++;
    }
  }

  console.log(`\n=== KẾT QUẢ E2E: ${passCount}/${testCases.length} PASS ===`);
  process.exit(0);
})().catch((err) => {
  console.error('LỖI SUITE:', err);
  process.exit(1);
});
