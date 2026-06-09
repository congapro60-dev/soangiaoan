import { describe, expect, it } from 'vitest';
import { truncateToContextBudget, MAX_SOURCE_CHARS } from './contextBudget';

describe('contextBudget', () => {
  it('returns empty result for undefined or empty text', () => {
    const result1 = truncateToContextBudget(undefined);
    expect(result1.truncatedText).toBe('');
    expect(result1.isTruncated).toBe(false);
    expect(result1.originalLength).toBe(0);

    const result2 = truncateToContextBudget('');
    expect(result2.truncatedText).toBe('');
    expect(result2.isTruncated).toBe(false);
    expect(result2.originalLength).toBe(0);
  });

  it('does not truncate text within budget', () => {
    const text = 'Hello world';
    const result = truncateToContextBudget(text, 50);
    expect(result.truncatedText).toBe(text);
    expect(result.isTruncated).toBe(false);
    expect(result.originalLength).toBe(11);
  });

  it('truncates text exceeding budget and appends warning', () => {
    const text = 'A'.repeat(500);
    const maxLength = 200;
    const result = truncateToContextBudget(text, maxLength);
    
    expect(result.isTruncated).toBe(true);
    expect(result.originalLength).toBe(500);
    expect(result.truncatedText.length).toBe(maxLength);
    expect(result.truncatedText.endsWith('giới hạn độ dài cho phép của AI]')).toBe(true);
  });

  it('uses default MAX_SOURCE_CHARS if not provided', () => {
    const text = 'A'.repeat(MAX_SOURCE_CHARS + 100);
    const result = truncateToContextBudget(text);
    
    expect(result.isTruncated).toBe(true);
    expect(result.originalLength).toBe(MAX_SOURCE_CHARS + 100);
    expect(result.truncatedText.length).toBe(MAX_SOURCE_CHARS);
  });
});
