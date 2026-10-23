import { describe, expect, it } from 'vitest';
import { resolveBanToanTemplateGate } from './banToanTemplate';

describe('V8.8 Ban Toan template gate', () => {
  it('recognizes the supplied official sample by byte hash', () => {
    expect(resolveBanToanTemplateGate({ extension: 'docx', sourceHash: '051F6F7C16359DBC81E6BEC020FA2CAC480A0C8B97699C309904B318E52B9E61' })).toEqual({
      status: 'TEMPLATE_VERIFIED', templateId: 'ban-toan-2025-2026-landscape',
    });
  });

  it('keeps other sources unverified', () => {
    expect(resolveBanToanTemplateGate({ extension: 'docx', sourceHash: 'a'.repeat(64) }).status).toBe('TEMPLATE_UNVERIFIED');
    expect(resolveBanToanTemplateGate({ extension: 'pdf', sourceHash: 'a'.repeat(64) }).status).toBe('NOT_APPLICABLE');
  });
});
