export type BanToanTemplateGate = 'NOT_APPLICABLE' | 'TEMPLATE_UNVERIFIED' | 'TEMPLATE_VERIFIED';

export interface BanToanTemplateResolution {
  status: BanToanTemplateGate;
  templateId?: 'ban-toan-2025-2026-landscape';
}

const VERIFIED_SAMPLE_HASH = '051F6F7C16359DBC81E6BEC020FA2CAC480A0C8B97699C309904B318E52B9E61';

export const resolveBanToanTemplateGate = (input: { extension?: string; sourceHash?: string }): BanToanTemplateResolution => {
  if (input.extension?.toLowerCase() !== 'docx') return { status: 'NOT_APPLICABLE' };
  return input.sourceHash?.toUpperCase() === VERIFIED_SAMPLE_HASH
    ? { status: 'TEMPLATE_VERIFIED', templateId: 'ban-toan-2025-2026-landscape' }
    : { status: 'TEMPLATE_UNVERIFIED' };
};
