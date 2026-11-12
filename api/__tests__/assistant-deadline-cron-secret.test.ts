import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../_assistant-deadline-runtime', () => ({ runDeadlineBatch: vi.fn(async () => ({ disabled: true })) }));
vi.mock('../_exam-core', () => ({ getAdminDb: vi.fn(() => ({})) }));
import handler from '../assistant';
import { runDeadlineBatch } from '../_assistant-deadline-runtime';

// Vercel Cron sends CRON_SECRET; the GitHub poller keeps ZALO_DEADLINE_CRON_SECRET. Either one may authorise, each ≥32 chars.
const secret = 'synthetic-cron-secret-0123456789abcd';
async function call(auth?: string, query: Record<string, string> = {}) {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() };
  await handler({ method: 'GET', query: { transport: 'deadline', ...query }, headers: { authorization: auth } } as any, res as any);
  return res;
}
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe('deadline scheduler accepts the Vercel Cron secret', () => {
  it('runs with CRON_SECRET when the poller secret is absent', async () => {
    vi.stubEnv('ZALO_DEADLINE_CRON_SECRET', ''); vi.stubEnv('CRON_SECRET', secret);
    const res = await call('Bearer ' + secret);
    expect(res.status).toHaveBeenCalledWith(200); expect(runDeadlineBatch).toHaveBeenCalledTimes(1);
  });
  it('accepts exactly 32 characters and rejects 31 in either variable', async () => {
    const exact = 'y'.repeat(32), short = 'x'.repeat(31);
    vi.stubEnv('ZALO_DEADLINE_CRON_SECRET', exact); vi.stubEnv('CRON_SECRET', '');
    expect((await call('Bearer ' + exact)).status).toHaveBeenCalledWith(200);
    vi.stubEnv('ZALO_DEADLINE_CRON_SECRET', short); vi.stubEnv('CRON_SECRET', short);
    expect((await call('Bearer ' + short)).status).toHaveBeenCalledWith(401);
    expect(runDeadlineBatch).toHaveBeenCalledTimes(1);
  });
  it('a wrong bearer never runs even when both secrets are configured', async () => {
    vi.stubEnv('ZALO_DEADLINE_CRON_SECRET', secret); vi.stubEnv('CRON_SECRET', 'z'.repeat(32));
    expect((await call('Bearer ' + 'w'.repeat(32))).status).toHaveBeenCalledWith(401);
    expect(runDeadlineBatch).not.toHaveBeenCalled();
  });
  it('passes a validated paging cursor to the batch', async () => {
    vi.stubEnv('ZALO_DEADLINE_CRON_SECRET', ''); vi.stubEnv('CRON_SECRET', secret);
    const res = await call('Bearer ' + secret, { after: 'abc_1' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(runDeadlineBatch).toHaveBeenCalledWith(expect.anything(), 'abc_1');
  });
});
