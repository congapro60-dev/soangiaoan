import { describe, expect, it } from 'vitest';
import { GEMINI_RUNTIME_MODELS } from '../lib/gemini';
import { GEMINI_MODELS, PROVIDER_CONFIG_MAP } from './models';
import { LESSON_PLAN_TOKENS, PROVIDER_GUIDES, compareRows, lessonPlanCostVnd } from './providerGuide';

describe('hướng dẫn chọn AI', () => {
  it('mọi model được gợi ý đều có trong danh sách model của hãng đó — không gợi ý model người dùng không chọn được', () => {
    for (const guide of Object.values(PROVIDER_GUIDES)) {
      const ids = new Set(PROVIDER_CONFIG_MAP[guide!.provider].models.map(m => m.id));
      for (const pick of guide!.picks) expect(ids.has(pick.modelId), `${guide!.provider}: ${pick.modelId}`).toBe(true);
    }
  });

  it('không hãng nào ghi gói tiêu dùng kèm API; hãng nào cũng có các bước lấy khoá', () => {
    for (const guide of Object.values(PROVIDER_GUIDES)) {
      expect(guide!.subscription).toMatch(/KHÔNG kèm API|không có gói tháng|Không có gói tháng/);
      expect(guide!.steps.length).toBeGreaterThan(0);
    }
  });

  it('chỉ Gemini và NVIDIA có phần miễn phí', () => {
    const free = Object.values(PROVIDER_GUIDES).filter(g => g!.hasFreeTier).map(g => g!.provider).sort();
    expect(free).toEqual(['gemini', 'nvidia']);
  });

  it('ước tính một giáo án: 8.000 token vào + 10.000 token ra', () => {
    expect(LESSON_PLAN_TOKENS).toEqual({ input: 8_000, output: 10_000 });
    // Gemini 3.8 Flash: 8000×0,75 + 10000×3,75 = 43.500 / 1e6 USD = 0,0435 USD ≈ 1.131đ → làm tròn chục
    expect(lessonPlanCostVnd({ inUsd: 0.75, outUsd: 3.75 })).toBe(1_130);
    // Claude Sonnet 5.5: 0,116 USD ≈ 3.016đ
    expect(lessonPlanCostVnd({ inUsd: 2, outUsd: 10 })).toBe(3_020);
    expect(lessonPlanCostVnd({ inUsd: 2, outUsd: 10 }, 25_000)).toBe(2_900);
  });

  it('bảng so sánh: hãng rẻ nhất lên đầu, hãng không có giá (NVIDIA) xuống cuối', () => {
    const rows = compareRows();
    expect(rows[0].provider).toBe('deepseek');
    expect(rows.at(-1)?.provider).toBe('nvidia');
    const costs = rows.map(r => r.costVnd).filter((c): c is number => c !== null);
    expect(costs).toEqual([...costs].sort((a, b) => a - b));
  });
});

describe('danh sách model Gemini', () => {
  it('mọi model Gemini hiện trong Cài đặt đều gọi được — nếu thiếu ở danh sách chạy thì chọn xong vẫn rơi về model mặc định', () => {
    for (const model of GEMINI_MODELS) expect(GEMINI_RUNTIME_MODELS, model.id).toContain(model.id);
  });
});
