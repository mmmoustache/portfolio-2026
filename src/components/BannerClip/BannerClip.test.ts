import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BannerClip } from '@/components/BannerClip/BannerClip';
import { setMatchMedia } from '@/utils/setMatchMedia';

describe('BannerClip component', () => {
  let rafSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document.body.innerHTML = '';

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 1000,
      writable: true,
    });

    rafSpy = vi.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });

    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      value: rafSpy,
      writable: true,
    });

    Object.defineProperty(globalThis, 'cancelAnimationFrame', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('does nothing when prefers-reduced-motion is enabled', () => {
    setMatchMedia(true);

    document.body.innerHTML = `
      <section data-banner-clip data-initial-inset="30" data-initial-scale="1.15">
        <div class="banner-clip__inner"></div>
      </section>
    `;

    BannerClip();

    const figure = document.querySelector('section') as HTMLElement;
    const inner = document.querySelector('.banner-clip__inner') as HTMLElement;

    expect(figure.dataset.hasInitialized).toBeUndefined();
    expect(inner.style.getPropertyValue('--inset')).toBe('');
    expect(inner.style.getPropertyValue('--scale')).toBe('');
    expect(rafSpy).not.toHaveBeenCalled();
  });

  it('initialises once per element and sets CSS vars on first run', () => {
    setMatchMedia(false);

    document.body.innerHTML = `
      <section
        data-banner-clip
        data-initial-inset="30"
        data-initial-scale="1.15"
        data-ease="0.25"
      >
        <div class="banner-clip__inner"></div>
      </section>
    `;

    const figure = document.querySelector('section') as HTMLElement;
    const inner = document.querySelector('.banner-clip__inner') as HTMLElement;

    vi.spyOn(figure, 'getBoundingClientRect').mockReturnValue({
      top: 1000,
      height: 200,
      bottom: 1200,
      left: 0,
      right: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON() {},
    } as DOMRect);

    BannerClip();

    expect(figure.dataset.hasInitialized).toBe('true');
    expect(inner.style.getPropertyValue('--inset')).toBe('30.000%');
    expect(inner.style.getPropertyValue('--scale')).toBe('1.1500');

    const rafCallsAfterFirstInit = rafSpy.mock.calls.length;

    BannerClip();

    expect(rafSpy.mock.calls.length).toBe(rafCallsAfterFirstInit);
  });

  it('updates CSS vars on scroll', () => {
    setMatchMedia(false);

    document.body.innerHTML = `
      <section
        data-banner-clip
        data-initial-inset="30"
        data-initial-scale="1.15"
        data-ease="0.25"
      >
        <div class="banner-clip__inner"></div>
      </section>
    `;

    const figure = document.querySelector('section') as HTMLElement;
    const inner = document.querySelector('.banner-clip__inner') as HTMLElement;

    const rectSpy = vi.spyOn(figure, 'getBoundingClientRect').mockReturnValue({
      top: 1000,
      height: 200,
      bottom: 1200,
      left: 0,
      right: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON() {},
    } as DOMRect);

    BannerClip();

    expect(inner.style.getPropertyValue('--inset')).toBe('30.000%');
    expect(inner.style.getPropertyValue('--scale')).toBe('1.1500');

    rectSpy.mockReturnValue({
      top: 0,
      height: 200,
      bottom: 200,
      left: 0,
      right: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON() {},
    } as DOMRect);

    globalThis.dispatchEvent(new Event('scroll'));

    const inset = inner.style.getPropertyValue('--inset');
    const scale = inner.style.getPropertyValue('--scale');

    expect(Number.parseFloat(inset)).toBeLessThan(30);
    expect(Number.parseFloat(scale)).toBeLessThan(1.15);
    expect(Number.parseFloat(scale)).toBeGreaterThanOrEqual(1);
  });

  it('does not mark itself initialized when the inner element is missing', () => {
    setMatchMedia(false);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    document.body.innerHTML = `
      <section data-banner-clip data-initial-inset="30" data-initial-scale="1.15"></section>
    `;

    const figure = document.querySelector('section') as HTMLElement;

    BannerClip();

    expect(figure.dataset.hasInitialized).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });
});
