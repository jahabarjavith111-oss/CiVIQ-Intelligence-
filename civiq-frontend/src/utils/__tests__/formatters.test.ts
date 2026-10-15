import { describe, it, expect } from 'vitest';
import { cn, formatCurrency, formatFileSize } from '../formatters';

describe('formatters', () => {
  it('cn joins classes', () => {
    expect(cn('a', false, null, undefined, { b: true, c: false })).toBe('a b');
  });
  it('formats currency', () => {
    expect(formatCurrency(45000000)).toContain('4,50,00,000');
  });
  it('formats file sizes', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});
