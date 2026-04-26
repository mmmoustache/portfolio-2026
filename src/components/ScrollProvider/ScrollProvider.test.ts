import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initScrollProvider } from '@/components/ScrollProvider/ScrollProvider';

const rafSpy = vi.fn();
const scrollToSpy = vi.fn();

type LenisCtorOptions = {
  lerp?: number;
  prevent: (node: Element) => boolean;
  smoothWheel: boolean;
};

let lastCtorOptions: LenisCtorOptions | null = null;

function getLastCtorOptions(): LenisCtorOptions {
  if (!lastCtorOptions) {
    throw new Error('Expected Lenis constructor options to be set');
  }

  return lastCtorOptions;
}

vi.mock('lenis', () => {
  class LenisMock {
    public destroy = vi.fn();
    public raf = rafSpy;
    public scrollTo = scrollToSpy;

    constructor(opts: LenisCtorOptions) {
      lastCtorOptions = opts;
    }
  }

  return { default: LenisMock };
});

function setReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })
  );
}

describe('initScrollProvider', () => {
  const rafOriginal = globalThis.requestAnimationFrame;

  // NEW: keep track of the instance so we can destroy it after each test
  let cleanup: ReturnType<typeof initScrollProvider> | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    cleanup = null;

    let rafRunCount = 0;

    rafSpy.mockClear();
    scrollToSpy.mockClear();
    lastCtorOptions = null;

    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: FrameRequestCallback) => {
        // Run the callback only for the first scheduled frame
        if (rafRunCount++ === 0) cb(123);
        return 1;
      })
    );

    vi.spyOn(history, 'pushState').mockImplementation(() => {});
  });

  afterEach(() => {
    // NEW: remove the click handler + clear window.__lenis via the real destroy()
    if (cleanup && typeof cleanup === 'object' && 'destroy' in cleanup) {
      cleanup.destroy();
    }

    cleanup = null;

    // (optional) keep this as a belt-and-braces cleanup
    delete window.__lenis;

    vi.unstubAllGlobals();
    vi.mocked(history.pushState).mockRestore?.();
    globalThis.requestAnimationFrame = rafOriginal;
  });

  it('does not init when prefers-reduced-motion is true', () => {
    setReducedMotion(true);

    const res = initScrollProvider();
    expect(res).toBeNull();
    expect(lastCtorOptions).toBeNull();
  });

  it('initializes Lenis once and starts RAF loop', () => {
    setReducedMotion(false);

    cleanup = initScrollProvider();
    expect(cleanup).not.toBeNull();
    expect(window.__lenis).toBeTruthy();
    expect(rafSpy).toHaveBeenCalledWith(123);

    const res2 = initScrollProvider();
    expect(res2).toBe(window.__lenis);
  });

  it('uses prevent() to ignore elements inside [data-lenis-prevent]', () => {
    setReducedMotion(false);
    cleanup = initScrollProvider();
    const options = getLastCtorOptions();

    const outer = document.createElement('div');
    outer.dataset.lenisPrevent = '';
    const inner = document.createElement('div');
    outer.appendChild(inner);
    document.body.appendChild(outer);

    expect(typeof options.prevent).toBe('function');
    expect(options.prevent(inner)).toBe(true);

    const normal = document.createElement('div');
    document.body.appendChild(normal);
    expect(options.prevent(normal)).toBe(false);
  });

  it('clicking a[href="#"] scrolls to top via Lenis', () => {
    setReducedMotion(false);
    cleanup = initScrollProvider();

    const a = document.createElement('a');
    a.href = '#';
    a.textContent = 'Top';
    document.body.appendChild(a);

    a.click();

    expect(scrollToSpy).toHaveBeenCalledWith(0);
    expect(history.pushState).toHaveBeenCalledWith(null, '', '#');
  });

  it('clicking an in-page anchor scrolls to the target element via Lenis', () => {
    setReducedMotion(false);
    cleanup = initScrollProvider();

    const section = document.createElement('section');
    section.id = 'thing';
    document.body.appendChild(section);

    const a = document.createElement('a');
    a.href = '#thing';
    a.textContent = 'Go';
    document.body.appendChild(a);

    a.click();

    expect(scrollToSpy).toHaveBeenCalledWith(section);
    expect(history.pushState).toHaveBeenCalledWith(null, '', '#thing');
  });

  it('returns a destroy() that removes the click handler and clears window.__lenis', () => {
    setReducedMotion(false);
    cleanup = initScrollProvider();

    const res = cleanup;
    if (!res || typeof res !== 'object' || !('destroy' in res)) throw new Error('Expected API');

    const a = document.createElement('a');
    a.href = '#';
    a.textContent = 'Top';
    document.body.appendChild(a);

    a.click();
    expect(scrollToSpy).toHaveBeenCalledTimes(1);

    res.destroy();
    a.click();
    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(window.__lenis).toBeUndefined();

    // make sure afterEach doesn't try to destroy twice
    cleanup = null;
  });

  it('ignores cross-page hash links', () => {
    setReducedMotion(false);
    cleanup = initScrollProvider();

    const a = document.createElement('a');
    a.href = '/privacy/#content';
    a.textContent = 'Other page';
    document.body.appendChild(a);

    a.click();

    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(history.pushState).not.toHaveBeenCalled();
  });

  it('ignores malformed in-page hashes safely', () => {
    setReducedMotion(false);
    cleanup = initScrollProvider();

    const a = document.createElement('a');
    a.setAttribute('href', '#%E0%A4%A');
    a.textContent = 'Broken hash';
    document.body.appendChild(a);

    expect(() => a.click()).not.toThrow();
    expect(scrollToSpy).not.toHaveBeenCalled();
  });
});
