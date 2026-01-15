import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { initScrollProvider } from '@/components/ScrollProvider/ScrollProvider';

const rafSpy = vi.fn();
const scrollToSpy = vi.fn();

let lastCtorOptions: any = null;

vi.mock('lenis', () => {
  return {
    default: vi.fn().mockImplementation((opts) => {
      lastCtorOptions = opts;
      return {
        raf: rafSpy,
        scrollTo: scrollToSpy,
        destroy: vi.fn(),
      };
    }),
  };
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

  beforeEach(() => {
    document.body.innerHTML = '';

    rafSpy.mockClear();
    scrollToSpy.mockClear();
    lastCtorOptions = null;

    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: FrameRequestCallback) => {
        cb(123);
        return 1;
      })
    );

    vi.spyOn(history, 'pushState').mockImplementation(() => {});
  });

  afterEach(() => {
    delete (window as any).__lenis;
    vi.unstubAllGlobals();
    (history.pushState as any).mockRestore?.();
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

    const res = initScrollProvider();
    expect(res).not.toBeNull();
    expect(window.__lenis).toBeTruthy();
    expect(rafSpy).toHaveBeenCalledWith(123);

    const res2 = initScrollProvider();
    expect(res2).toBe(window.__lenis);
  });

  it('uses prevent() to ignore elements inside [data-lenis-prevent]', () => {
    setReducedMotion(false);
    initScrollProvider();

    const outer = document.createElement('div');
    outer.dataset.lenisPrevent = '';
    const inner = document.createElement('div');
    outer.appendChild(inner);
    document.body.appendChild(outer);

    expect(typeof lastCtorOptions.prevent).toBe('function');
    expect(lastCtorOptions.prevent(inner)).toBe(true);

    const normal = document.createElement('div');
    document.body.appendChild(normal);
    expect(lastCtorOptions.prevent(normal)).toBe(false);
  });

  it('clicking a[href="#"] scrolls to top via Lenis', () => {
    setReducedMotion(false);
    initScrollProvider();

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
    initScrollProvider();

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
    const res = initScrollProvider();
    if (!res || 'destroy' in res === false) throw new Error('Expected API');

    const a = document.createElement('a');
    a.href = '#';
    a.textContent = 'Top';
    document.body.appendChild(a);

    a.click();
    expect(scrollToSpy).toHaveBeenCalledTimes(1);

    (res as any).destroy();
    a.click();
    expect(scrollToSpy).toHaveBeenCalledTimes(1);
    expect(window.__lenis).toBeUndefined();
  });
});
