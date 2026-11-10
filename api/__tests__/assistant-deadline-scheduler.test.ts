import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../_assistant-deadline-runtime', () => ({ runDeadlineBatch: vi.fn(async () => ({ disabled: true })) }));
vi.mock('../_exam-core', () => ({ getAdminDb: vi.fn(() => ({})) }));
import handler from '../assistant';
import { runDeadlineBatch } from '../_assistant-deadline-runtime';
const secret = 'synthetic-scheduler-secret-0123456789';
async function call(auth?: string, method = 'GET', after = '') {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() };
  await handler({ method, query: { transport: 'deadline', after }, headers: { authorization: auth } } as any, res as any);
  return res;
}
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe('deadline scheduler authentication', () => {
  it.each([undefined, 'Bearer wrong'])('never runs for missing/wrong authorization', async auth => {
    vi.stubEnv('ZALO_DEADLINE_CRON_SECRET', secret); const res = await call(auth);
    expect(res.status).toHaveBeenCalledWith(401); expect(runDeadlineBatch).not.toHaveBeenCalled();
  });
  it('fails closed when its dedicated secret is absent', async () => {
    vi.stubEnv('ZALO_DEADLINE_CRON_SECRET', ''); const res = await call('Bearer ' + secret);
    expect(res.status).toHaveBeenCalledWith(401); expect(runDeadlineBatch).not.toHaveBeenCalled();
  });
  it('rejects even matching secrets shorter than 32 characters', async () => {
    vi.stubEnv('ZALO_DEADLINE_CRON_SECRET', 'short'); const res = await call('Bearer short');
    expect(res.status).toHaveBeenCalledWith(401); expect(runDeadlineBatch).not.toHaveBeenCalled();
  });
  it('allows only GET, validates cursor, sends no browser-cacheable data', async () => {
    vi.stubEnv('ZALO_DEADLINE_CRON_SECRET', secret);
    expect((await call('Bearer ' + secret, 'POST')).status).toHaveBeenCalledWith(405);
    expect((await call('Bearer ' + secret, 'GET', '../bad')).status).toHaveBeenCalledWith(400);
    const res = await call('Bearer ' + secret);
    expect(res.status).toHaveBeenCalledWith(200); expect(res.json).toHaveBeenCalledWith({ disabled: true });
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(runDeadlineBatch).toHaveBeenCalledTimes(1);
  });
});
