/// <reference types="node" />

/**
 * Đổi vai bot Zalo cho TÀI KHOẢN TEST — chỉ bật/tắt `active` của channelLinks,
 * không tạo/xoá doc (link đã tạo bằng PIN giữ nguyên, bật lại là dùng lại được).
 *
 *   npx tsx --env-file=<env-file> scripts/doi-vai-bot.ts <status|parent|student|teacher> <zaloUserId> [botId]
 *
 * - status           : liệt kê link của tài khoản.
 * - parent|student    : chỉ vai này active (tắt các vai khác) — dùng để đổi luồng khi test.
 * - teacher           : khôi phục vai GV (đã link bằng /link <mã> trước đó).
 *
 * Thứ tự đọc service account giống api/_exam-core.ts và scripts/gan-vai-tro.ts.
 */
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

const parseJsonSecret = (value: string): ServiceAccount => {
  try {
    return JSON.parse(value) as ServiceAccount;
  } catch {
    return JSON.parse(value.replace(/\r?\n/g, '\\n')) as ServiceAccount;
  }
};

const normalizePrivateKey = (privateKey: string) => privateKey.replace(/\\n/g, '\n');

const isUsable = (v: Partial<ServiceAccount>): v is ServiceAccount =>
  Boolean(v.project_id && v.client_email && v.private_key);

const resolveServiceAccount = (): ServiceAccount => {
  const env = process.env;
  for (const raw of [
    env.FIREBASE_SERVICE_ACCOUNT_KEY,
    env.FIREBASE_SERVICE_ACCOUNT_BASE64
      ? Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8')
      : undefined,
  ]) {
    if (!raw) continue;
    const account = parseJsonSecret(raw);
    if (isUsable(account)) return { ...account, private_key: normalizePrivateKey(account.private_key) };
  }
  const account = {
    project_id: env.FIREBASE_PROJECT_ID,
    client_email: env.FIREBASE_CLIENT_EMAIL,
    private_key: env.FIREBASE_PRIVATE_KEY ? normalizePrivateKey(env.FIREBASE_PRIVATE_KEY) : undefined,
  };
  if (!isUsable(account)) {
    throw new Error(
      'Thiếu service account. Đặt FIREBASE_SERVICE_ACCOUNT_KEY, hoặc FIREBASE_SERVICE_ACCOUNT_BASE64, ' +
        'hoặc bộ ba FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.',
    );
  }
  return account;
};

const MODES = ['status', 'parent', 'student', 'teacher'] as const;
const [mode, userId, botId] = process.argv.slice(2);

if (!mode || !userId || !MODES.includes(mode as (typeof MODES)[number])) {
  console.error('Cách dùng: npx tsx --env-file=<env-file> scripts/doi-vai-bot.ts <status|parent|student|teacher> <zaloUserId> [botId]');
  process.exit(1);
}

const account = resolveServiceAccount();
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key,
    }),
  });
}
const db = getFirestore();

let query = db.collection('channelLinks').where('channel', '==', 'zalo_bot').where('channelUserId', '==', userId);
if (botId) query = query.where('channelAccountId', '==', botId);
const snaps = await query.get();

if (snaps.empty) {
  console.log('Chưa có link nào cho tài khoản Zalo này trên bot' + (botId ? ` ${botId}` : '') + '.');
  console.log('Nhắn tin link cho bot: <mã lớp> <PIN> phụ huynh | học sinh (GV dùng /link <mã>).');
  process.exit(0);
}

const roleOf = (data: FirebaseFirestore.DocumentData) => String(data.role ?? 'teacher');

if (mode === 'status') {
  console.log(`Tìm thấy ${snaps.size} link:`);
  for (const snap of snaps.docs) {
    const d = snap.data();
    console.log(`- [${roleOf(d)}] bot=${d.channelAccountId} lớp=${d.classId ?? '-'} HS=${d.studentId ?? '-'} active=${d.active === true} (doc ${snap.id.slice(0, 12)}…)`);
  }
  process.exit(0);
}

const target = mode;
const batch = db.batch();
let flipped = 0;
for (const snap of snaps.docs) {
  const d = snap.data();
  const shouldActive = roleOf(d) === target;
  if (d.active === shouldActive) continue;
  batch.update(snap.ref, { active: shouldActive, updatedAt: Date.now() });
  flipped++;
  console.log(`${shouldActive ? 'BẬT' : 'TẮT'} [${roleOf(d)}] lớp=${d.classId ?? '-'} HS=${d.studentId ?? '-'}`);
}
if (flipped) await batch.commit();
console.log(flipped ? `Xong — ${flipped} link đổi trạng thái. Giờ chỉ vai [${target}] active.` : 'Không cần đổi — các link đã đúng trạng thái.');
const hasTarget = snaps.docs.some(snap => roleOf(snap.data()) === target);
if (!hasTarget) {
  console.log(`Lưu ý: tài khoản CHƯA TỪNG link vai [${target}] — hãy nhắn tin link cho bot trước (vd: <mã lớp> <PIN> ${target === 'student' ? 'học sinh' : target === 'parent' ? 'phụ huynh' : '/link <mã>'}).`);
}
