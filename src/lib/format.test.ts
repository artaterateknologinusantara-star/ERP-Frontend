import { describe, expect, it } from 'vitest';
import { formatInt } from './format';

describe('formatInt', () => {
  it('rounds to nearest integer before formatting', () => {
    expect(formatInt(1234.4)).toBe('1.234');
    expect(formatInt(1234.5)).toBe('1.235');
  });

  it('formats with id-ID thousands separator', () => {
    expect(formatInt(1_000_000)).toBe('1.000.000');
  });

  it('handles zero and negative values', () => {
    expect(formatInt(0)).toBe('0');
    expect(formatInt(-1500)).toBe('-1.500');
  });
});
