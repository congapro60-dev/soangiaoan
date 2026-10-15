import { describe, expect, it } from 'vitest';
import { filterHeaderFeatures } from './Header';

describe('header feature search', () => {
  it('returns navigation matches for a typed feature name', () => {
    expect(filterHeaderFeatures('soạn')).toContainEqual({ id: 'creator', label: 'Soạn giáo án' });
  });

  it('returns no matches for unknown features', () => {
    expect(filterHeaderFeatures('không tồn tại')).toEqual([]);
  });
});
