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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const health = await probeFirebaseAdmin();
  return res.status(health.ok ? 200 : 503).json(health);
}
