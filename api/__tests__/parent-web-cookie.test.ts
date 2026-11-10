import { beforeEach, expect, it, vi } from 'vitest';
const probe = vi.hoisted(() => ({ body: null as Record<string, unknown> | null }));
vi.mock('../_exam-core', async () => ({ ...await vi.importActual<typeof import('../_exam-core')>('../_exam-core'), getAdminDb: () => ({}) }));
vi.mock('../_assistant-web-handoff', async () => ({
  ...await vi.importActual<typeof import('../_assistant-web-handoff')>('../_assistant-web-handoff'),
  handleWebHandoffAction: vi.fn(async (_db, body, res) => { probe.body = body; res.status(200).json({ ok: true }); return true; }),
}));
vi.mock('../_clarify', async () => ({
  ...await vi.importActual<typeof import('../_clarify')>('../_clarify'),
  handleClarifyAction: vi.fn(async (_db, body, res) => { probe.body = body; res.status(200).json({ ok: true }); return true; }),
}));
import classroom from '../classroom';
import gradeHomework from '../grade-homework';
beforeEach(() => { probe.body = null; });
it.each([['classroom', classroom], ['grade-homework', gradeHomework]] as const)('%s derives parent credentials only from cookies', async (_name, handler) => {
  const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), setHeader: vi.fn() };
  const token = 'a'.repeat(64);
  await handler({ method: 'POST', query: {}, headers: { cookie: `spai_parent_web=${token}` }, body: { action: 'probeCookie', webParentSession: 'forged' } } as any, res);
  expect(probe.body?.webParentSession).toBe(token);
  await handler({ method: 'POST', query: {}, headers: {}, body: { action: 'probeCookie', webParentSession: token } } as any, res);
  expect(probe.body?.webParentSession).toBeUndefined();
});
