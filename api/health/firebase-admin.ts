/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface FirebaseAdminHealthResult {
  ok: boolean;
  missing: string[];
  invalid: string[];
  details?: string;
}

interface FirebaseServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

const parseJsonSecret = (value: string): FirebaseServiceAccount => {
  try {
    return JSON.parse(value) as FirebaseServiceAccount;
  } catch {
    return JSON.parse(value.replace(/\r?\n/g, '\\n')) as FirebaseServiceAccount;
  }
};

const normalizePrivateKey = (privateKey: string) => privateKey.replace(/\\n/g, '\n');

const isUsableServiceAccount = (value: Partial<FirebaseServiceAccount> | null | undefined): value is FirebaseServiceAccount => (
  Boolean(value?.project_id && value?.client_email && value?.private_key)
);

const resolveServiceAccount = (env: NodeJS.ProcessEnv): { account?: FirebaseServiceAccount; missing: string[]; invalid: string[] } => {
  const missing: string[] = [];
  const invalid: string[] = [];

  if (env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const account = parseJsonSecret(env.FIREBASE_SERVICE_ACCOUNT_KEY);
      if (isUsableServiceAccount(account)) {
        return { account: { ...account, private_key: normalizePrivateKey(account.private_key) }, missing, invalid };
      }
      invalid.push('FIREBASE_SERVICE_ACCOUNT_KEY');
    } catch {
      invalid.push('FIREBASE_SERVICE_ACCOUNT_KEY');
    }
  }

  if (env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const decoded = Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      const account = parseJsonSecret(decoded);
      if (isUsableServiceAccount(account)) {
        return { account: { ...account, private_key: normalizePrivateKey(account.private_key) }, missing, invalid };
      }
      invalid.push('FIREBASE_SERVICE_ACCOUNT_BASE64');
    } catch {
      invalid.push('FIREBASE_SERVICE_ACCOUNT_BASE64');
    }
  }

  const account = {
    project_id: env.FIREBASE_PROJECT_ID,
    client_email: env.FIREBASE_CLIENT_EMAIL,
    private_key: env.FIREBASE_PRIVATE_KEY ? normalizePrivateKey(env.FIREBASE_PRIVATE_KEY) : undefined,
  };

  if (!account.project_id) missing.push('FIREBASE_PROJECT_ID');
  if (!account.client_email) missing.push('FIREBASE_CLIENT_EMAIL');
  if (!account.private_key) missing.push('FIREBASE_PRIVATE_KEY');

  return isUsableServiceAccount(account)
    ? { account, missing, invalid }
    : { missing, invalid };
};

export const getFirebaseAdminHealth = (env: NodeJS.ProcessEnv = process.env): FirebaseAdminHealthResult => {
  const { account, missing, invalid } = resolveServiceAccount(env);
  return {
    ok: Boolean(account) && missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
  };
};

export const probeFirebaseAdmin = async (env: NodeJS.ProcessEnv = process.env): Promise<FirebaseAdminHealthResult> => {
  const { account, missing, invalid } = resolveServiceAccount(env);
  if (!account || missing.length > 0 || invalid.length > 0) {
    return { ok: false, missing, invalid };
  }

  try {
    const admin = await import('firebase-admin');
    const appName = '__health_probe__';
    const existingApp = admin.apps.find(app => app?.name === appName);
    const app = existingApp || admin.initializeApp({
      credential: admin.credential.cert({
        projectId: account.project_id,
        clientEmail: account.client_email,
        privateKey: account.private_key,
      }),
    }, appName);

    const db = admin.firestore(app);
    const ref = db.collection('_healthProbe').doc(`probe-${Date.now()}`);
    await ref.set({ checkedAt: admin.firestore.FieldValue.serverTimestamp() });
    await ref.delete();

    return { ok: true, missing, invalid };
  } catch (error) {
    return {
      ok: false,
      missing,
      invalid,
      details: error instanceof Error ? error.message : 'Unknown Firebase Admin probe error',
    };
  }
};

/** Chỉ chấp nhận UUID chuẩn — chặn path traversal và mọi id lạ. */
const IMAGE_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Phục vụ ảnh hình học/công thức cho Zalo qua URL SẠCH (lỗi 28/10).
 *
 * VÌ SAO: gửi thẳng URL Firebase Storage (`.../o/geometry%2F...jpg?alt=media&token=...`)
 * thì Zalo trên ĐIỆN THOẠI hiện khung xám + nút tải xuống, bấm không đọc được — dù
 * header trả về đúng `content-type: image/jpeg` và KHÔNG có `content-disposition`.
 * Hai điểm Zalo mobile không xử lý được: (1) `cache-control: private, max-age=0` nên
 * CDN Zalo không cache được ảnh; (2) URL có path mã hoá + query token nên proxy ảnh
 * của Zalo xử lý sai. Endpoint này trả URL ngắn 1 tham số, cache public dài hạn,
 * `content-disposition: inline` — mọi thứ Zalo cần để render trực tiếp.
 *
 * Đặt trong route health vì Vercel Hobby giới hạn 12 Serverless Function (đã chạm trần);
 * thêm file mới là cả deployment lỗi `exceeded_serverless_functions_per_deployment`.
 * BẢO MẬT: id là UUID ngẫu nhiên, chỉ đọc tiền tố `geometry/` của bucket mình.
 */
const serveGeometryImage = async (req: VercelRequest, res: VercelResponse, id: string): Promise<void> => {
  if (!IMAGE_UUID_RE.test(id)) {
    res.status(400).json({ error: 'bad_id' });
    return;
  }
  try {
    // Route này KHÔNG đi qua _exam-core nên phải tự khởi tạo app (lỗi thật 28/10:
    // "The default Firebase app does not exist").
    const { account } = resolveServiceAccount(process.env);
    if (!account) {
      res.status(503).json({ error: 'firebase_not_configured' });
      return;
    }
    const { getApps, getApp, initializeApp, cert } = await import('firebase-admin/app');
    const { getStorage } = await import('firebase-admin/storage');
    const app = getApps().length ? getApp() : initializeApp({
      credential: cert({
        projectId: account.project_id,
        clientEmail: account.client_email,
        privateKey: account.private_key,
      }),
      storageBucket: `${account.project_id}.firebasestorage.app`,
    });
    const bucket = getStorage(app).bucket();
    let file = bucket.file(`geometry/${id}.png`);
    let [exists] = await file.exists();
    if (!exists) {
      file = bucket.file(`geometry/${id}.jpg`); // tương thích ảnh cũ đã gửi
      [exists] = await file.exists();
    }
    if (!exists) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    const [meta] = await file.getMetadata();
    const [bytes] = await file.download();
    res.setHeader('Content-Type', String(meta.contentType ?? 'image/png'));
    res.setHeader('Content-Length', String(bytes.length));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'HEAD') { res.status(200).end(); return; }
    res.status(200).send(bytes);
  } catch (err) {
    console.error('[geometry-image] lỗi:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'read_failed' });
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ảnh cho Zalo: /api/health/firebase-admin?image=<uuid>
  const imageId = Array.isArray(req.query.image) ? req.query.image[0] : req.query.image;
  if (imageId !== undefined) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    return serveGeometryImage(req, res, String(imageId).trim());
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const health = await probeFirebaseAdmin();
  return res.status(health.ok ? 200 : 503).json(health);
}
