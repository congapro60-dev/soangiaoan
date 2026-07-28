/// <reference types="node" />

/**
 * Gán vai trò module dự giờ bằng custom claim.
 *
 *   npx tsx scripts/gan-vai-tro.ts <email> <bgh|to_truong|giao_vien>
 *
 * Thứ tự đọc service account giống api/health/firebase-admin.ts:
 * FIREBASE_SERVICE_ACCOUNT_KEY → FIREBASE_SERVICE_ACCOUNT_BASE64 →
 * FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.
 *
 * Custom claim chỉ vào token sau khi người dùng đăng nhập lại, hoặc gọi
 * getIdToken(true) để làm mới ngay.
 */
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const VAI_TRO_HOP_LE = ['bgh', 'to_truong', 'giao_vien'] as const;
type VaiTro = (typeof VAI_TRO_HOP_LE)[number];

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
    if (isUsable(account)) {
      return { ...account, private_key: normalizePrivateKey(account.private_key) };
    }
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

const [email, vaiTro] = process.argv.slice(2);

if (!email || !vaiTro) {
  console.error('Cách dùng: npx tsx scripts/gan-vai-tro.ts <email> <bgh|to_truong|giao_vien>');
  process.exit(1);
}

if (!VAI_TRO_HOP_LE.includes(vaiTro as VaiTro)) {
  console.error(`Vai trò không hợp lệ: "${vaiTro}". Chỉ nhận: ${VAI_TRO_HOP_LE.join(', ')}`);
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

const auth = getAuth();
const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), vai_tro: vaiTro });
console.log(`${email} (${user.uid}) → vai_tro = ${vaiTro}`);
console.log('Người dùng cần đăng nhập lại (hoặc gọi getIdToken(true)) để claim vào token.');
