import { describe, expect, it } from 'vitest';
import { VILAO_MODELS, PROVIDER_CONFIG_MAP } from './models';
import { RELAY_MODEL_IDS } from '../lib/aiRelay';

/**
 * Bẫy 10/2026: Cài đặt liệt kê "DeepSeek v4.1 Flash" dưới nhà cung cấp Vilao, nhưng khoá Vilao
 * KHÔNG bán model đó — `GET /v1/models` chỉ trả gemini-3.8-flash, gpt-image-2,
 * gemini-3.1-flash-image. Giáo viên chọn DeepSeek → mọi lượt gọi 400
 * "Model này chưa dùng được bằng ví web" mà nguyên nhân không lộ ra ở giao diện.
 */
describe('danh sách model Vilao phải là model thật dùng được', () => {
  it('không còn bán model DeepSeek (Vilao không phục vụ model này cho key hiện tại)', () => {
    const ids = VILAO_MODELS.map(model => model.id);

    expect(ids.some(id => /deepseek/i.test(id))).toBe(false);
  });

  it('mọi model của Vilao đều nằm trong danh sách ví web trả được', () => {
    for (const model of VILAO_MODELS) {
      expect(RELAY_MODEL_IDS as readonly string[]).toContain(model.id);
    }
  });

  it('Cài đặt dùng đúng danh sách đó, không có nguồn thứ hai', () => {
    expect(PROVIDER_CONFIG_MAP.vilao.models).toBe(VILAO_MODELS);
  });

  it('vẫn còn ít nhất một model để chọn', () => {
    expect(VILAO_MODELS.length).toBeGreaterThan(0);
  });
});
