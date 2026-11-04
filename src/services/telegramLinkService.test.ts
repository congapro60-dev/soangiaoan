import { describe, expect, it } from 'vitest';
import { unwrapGatewayResult } from './telegramLinkService';

describe('assistant gateway response compatibility', () => {
  it('unwraps result envelopes and preserves legacy top-level responses', () => {
    expect(unwrapGatewayResult({ result: { ok: true } })).toEqual({ ok: true });
    expect(unwrapGatewayResult({ links: [] })).toEqual({ links: [] });
  });
});
