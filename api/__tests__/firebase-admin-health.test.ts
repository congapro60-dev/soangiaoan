import { describe, expect, it } from 'vitest';
import { getFirebaseAdminHealth } from '../health/firebase-admin';

describe('firebase admin health check', () => {
  it('reports missing split Firebase Admin variables', () => {
    const health = getFirebaseAdminHealth({});

    expect(health.ok).toBe(false);
    expect(health.missing).toEqual([
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY',
    ]);
    expect(health.invalid).toEqual([]);
  });

  it('accepts a complete split Firebase Admin configuration', () => {
    const health = getFirebaseAdminHealth({
      FIREBASE_PROJECT_ID: 'demo-project',
      FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk@example.iam.gserviceaccount.com',
      FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
    });

    expect(health).toEqual({ ok: true, missing: [], invalid: [] });
  });

  it('accepts a valid JSON service account secret', () => {
    const health = getFirebaseAdminHealth({
      FIREBASE_SERVICE_ACCOUNT_KEY: JSON.stringify({
        project_id: 'demo-project',
        client_email: 'firebase-adminsdk@example.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n',
      }),
    });

    expect(health).toEqual({ ok: true, missing: [], invalid: [] });
  });

  it('reports malformed service account secrets before falling back to split variables', () => {
    const health = getFirebaseAdminHealth({
      FIREBASE_SERVICE_ACCOUNT_KEY: '{not-json',
    });

    expect(health.ok).toBe(false);
    expect(health.invalid).toEqual(['FIREBASE_SERVICE_ACCOUNT_KEY']);
    expect(health.missing).toContain('FIREBASE_PRIVATE_KEY');
  });
});
