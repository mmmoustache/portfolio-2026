import { describe, it, expect, vi, afterEach } from 'vitest';
import { splitGraphemes } from '@/utils/splitGraphemes';

describe('splitGraphemes()', () => {
  const originalIntl = globalThis.Intl;

  afterEach(() => {
    globalThis.Intl = originalIntl;
    vi.restoreAllMocks();
  });

  it('splits basic ASCII characters normally', () => {
    expect(splitGraphemes('hello')).toEqual(['h', 'e', 'l', 'l', 'o']);
  });

  it('falls back to Array.from when Intl.Segmenter is not available', () => {
    globalThis.Intl = {} as any;

    const input = '🇬🇧é';

    const result = splitGraphemes(input);

    expect(result).toEqual(Array.from(input));
  });

  it('does not throw when Intl exists but Segmenter is missing', () => {
    globalThis.Intl = {} as any;

    expect(() => splitGraphemes('test')).not.toThrow();
  });

  it('handles empty string', () => {
    expect(splitGraphemes('')).toEqual([]);
  });
});
