import { describe, expect, it } from 'vitest';
import {
  AI_GATEWAY_BASE_URL,
  AI_GATEWAY_MAX_OUTPUT_TOKENS,
  AI_GATEWAY_MODEL,
  buildGatewayChatRequest,
  getBearerToken,
  normalizeGatewayPrompt,
  resolveGatewayApiKey,
} from '../_ai-gateway-core';

describe('AI Gateway core contract', () => {
  it('extracts only a Bearer token from the authorization header', () => {
    expect(getBearerToken('Bearer firebase-token')).toBe('firebase-token');
    expect(getBearerToken('bearer firebase-token')).toBe('firebase-token');
    expect(getBearerToken('Basic abc')).toBeNull();
    expect(getBearerToken(undefined)).toBeNull();
  });

  it('normalizes valid prompts and rejects blank or oversized prompts', () => {
    expect(normalizeGatewayPrompt('  Tạo giáo án Toán 10  ')).toBe('Tạo giáo án Toán 10');
    expect(normalizeGatewayPrompt('   ')).toBeNull();
    expect(normalizeGatewayPrompt('x'.repeat(1_000_001))).toBeNull();
  });

  it('keeps the server model fixed and exposes the OpenAI-compatible request shape', () => {
    const request = buildGatewayChatRequest('Xin chào', true);

    expect(AI_GATEWAY_BASE_URL).toBe('https://ai-gateway.vercel.sh/v1');
    expect(AI_GATEWAY_MODEL).toBe('zai/glm-5.2');
    expect(request).toEqual({
      model: 'zai/glm-5.2',
      messages: [{ role: 'user', content: 'Xin chào' }],
      max_tokens: AI_GATEWAY_MAX_OUTPUT_TOKENS,
      stream: true,
    });
  });

  it('reads and trims the server-side API key without providing a fallback', () => {
    expect(resolveGatewayApiKey({ AI_GATEWAY_API_KEY: '  gateway-secret  ' })).toBe('gateway-secret');
    expect(resolveGatewayApiKey({ AI_GATEWAY_API_KEY: '   ' })).toBeNull();
    expect(resolveGatewayApiKey({})).toBeNull();
  });
});
