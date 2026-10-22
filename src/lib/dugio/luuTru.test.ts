import { beforeEach, expect, it, vi } from 'vitest';
import { bienBanRong } from './types';

const state = vi.hoisted(() => ({ stored: {} as Record<string, unknown> }));
vi.mock('../firebase', () => ({ db: {}, removeUndefinedFields: (data: unknown) => data }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, _collection: string, id: string) => ({ id }),
  collection: vi.fn(), deleteDoc: vi.fn(), getDoc: vi.fn(), getDocs: vi.fn(),
  limit: vi.fn(), orderBy: vi.fn(), query: vi.fn(), where: vi.fn(), addDoc: vi.fn(),
  serverTimestamp: () => 'server-time',
  setDoc: async (_ref: unknown, data: object) => { Object.assign(state.stored, data); },
  updateDoc: async (_ref: unknown, data: object) => { Object.assign(state.stored, data); },
}));
import * as storage from './luuTru';

beforeEach(() => { state.stored = {}; });

it('owner save preserves a self-assessment submitted after the owner opened the record', async () => {
  const stale = { ...bienBanRong('owner'), id: 'record', bai: 'Owner edit' };
  const submitted = { diem: { '3b': 4 }, ghiChu: { '3b': 'Teacher evidence' }, hoanThanhLuc: '2026-10-19' };
  state.stored = { ...stale, tuDanhGia: submitted };
  await storage.luuBienBan(stale);
  expect(state.stored.tuDanhGia).toEqual(submitted);
  expect(state.stored.bai).toBe('Owner edit');
});

it('teacher submit updates only self-assessment, preserving newer observer edits', async () => {
  state.stored = { ...bienBanRong('owner'), id: 'record', bai: 'New owner edit', diemChot: { '3b': 2 } };
  const assessment = { diem: { '3b': 3 }, ghiChu: {}, hoanThanhLuc: '2026-10-19' };
  await storage.guiTuDanhGia('record', assessment);
  expect(state.stored.bai).toBe('New owner edit');
  expect(state.stored.diemChot).toEqual({ '3b': 2 });
  expect(state.stored.tuDanhGia).toEqual(assessment);
});
