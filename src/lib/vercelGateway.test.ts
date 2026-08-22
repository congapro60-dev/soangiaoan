import { describe, expect, it } from 'vitest';
import { parseGatewaySseEvent } from './vercelGateway';

describe('Vercel AI Gateway SSE parser', () => {
  it('parses text chunks and the terminal marker', () => {
    expect(parseGatewaySseEvent('{"text":"Xin chào"}')).toEqual({ text: 'Xin chào' });
    expect(parseGatewaySseEvent('[DONE]')).toEqual({ done: true });
  });

  it('parses server errors and ignores malformed events', () => {
    expect(parseGatewaySseEvent('{"error":"Gateway lỗi"}')).toEqual({ error: 'Gateway lỗi' });
    expect(parseGatewaySseEvent('not-json')).toBeNull();
  });
});
