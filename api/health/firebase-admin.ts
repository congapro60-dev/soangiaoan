/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface FirebaseAdminHealthResult {
  ok: boolean;
  missing: string[];
  invalid: string[];
}

const parseJsonSecret = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return JSON.parse(value.replace(/\r?\n/g, '\\n'));
  }
};

const hasUsableJsonSecret = (value: string | undefined) => {
  if (!value) return false;

  try {
    const parsed = parseJsonSecret(value);
    return Boolean(parsed?.project_id && parsed?.client_email && parsed?.private_key);
  } catch {
    return false;
  }
};

const hasUsableBase64Secret = (value: string | undefined) => {
  if (!value) return false;

  try {
    return hasUsableJsonSecret(Buffer.from(value, 'base64').toString('utf8'));
  } catch {
    return false;
  }
};

export const getFirebaseAdminHealth = (env: NodeJS.ProcessEnv = process.env): FirebaseAdminHealthResult => {
  const missing: string[] = [];
  const invalid: string[] = [];

  if (env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    if (hasUsableJsonSecret(env.FIREBASE_SERVICE_ACCOUNT_KEY)) return { ok: true, missing, invalid };
    invalid.push('FIREBASE_SERVICE_ACCOUNT_KEY');
  }

  if (env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    if (hasUsableBase64Secret(env.FIREBASE_SERVICE_ACCOUNT_BASE64)) return { ok: true, missing, invalid };
    invalid.push('FIREBASE_SERVICE_ACCOUNT_BASE64');
  }

  if (!env.FIREBASE_PROJECT_ID) missing.push('FIREBASE_PROJECT_ID');
  if (!env.FIREBASE_CLIENT_EMAIL) missing.push('FIREBASE_CLIENT_EMAIL');
  if (!env.FIREBASE_PRIVATE_KEY) missing.push('FIREBASE_PRIVATE_KEY');

  return { ok: missing.length === 0 && invalid.length === 0, missing, invalid };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const health = getFirebaseAdminHealth();
  return res.status(health.ok ? 200 : 503).json(health);
}
