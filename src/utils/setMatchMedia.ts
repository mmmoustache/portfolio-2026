import { vi } from 'vitest';

export function setMatchMedia(matches: boolean) {
  const matchMedia = vi.fn().mockImplementation((query: string) => {
    return {
      media: query,
      matches,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
  });

  Object.defineProperty(globalThis, 'matchMedia', {
    configurable: true,
    value: matchMedia,
  });

  return matchMedia;
}
