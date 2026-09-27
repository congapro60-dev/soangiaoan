import { describe, it, expect } from 'vitest';
import { costUsdOfImage, imagePriceFor, isImageModel, imageModelLabel } from './aiPricing';

describe('aiPricing — giá sinh ảnh Imagen (per-image)', () => {
  it('nhận diện model ảnh', () => {
    expect(isImageModel('imagen-4.0-generate-001')).toBe(true);
    expect(isImageModel('gemini-3.7-flash')).toBe(false);
  });

  it('giá/ảnh theo biến thể Imagen', () => {
    const day = '2026-09-27';
    expect(imagePriceFor('imagen-4.0-generate-001', day)).toBe(0.04);
    expect(imagePriceFor('imagen-4.0-ultra-generate-001', day)).toBe(0.06);
    expect(imagePriceFor('imagen-4.0-fast-generate-001', day)).toBe(0.02);
    expect(imagePriceFor('gemini-3.7-flash', day)).toBeNull();
  });

  it('costUsdOfImage = giá/ảnh × số ảnh', () => {
    const day = '2026-09-27';
    expect(costUsdOfImage('imagen-4.0-generate-001', day, 3)).toBeCloseTo(0.12, 6);
    expect(costUsdOfImage('imagen-4.0-ultra-generate-001', day, 2)).toBeCloseTo(0.12, 6);
    expect(costUsdOfImage('imagen-4.0-generate-001', day, 0)).toBe(0);
    expect(costUsdOfImage('khong-co-trong-bang', day, 1)).toBeNull();
  });

  it('nhãn model ảnh', () => {
    expect(imageModelLabel('imagen-4.0-ultra-generate-001')).toBe('Imagen 4 Ultra');
    expect(imageModelLabel('imagen-4.0-generate-001')).toBe('Imagen 4');
  });
});
