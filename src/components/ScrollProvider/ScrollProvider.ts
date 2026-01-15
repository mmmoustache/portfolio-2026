import Lenis from 'lenis';

export type InitScrollProviderOptions = {
  lerp?: number;
};

export function initScrollProvider(options: InitScrollProviderOptions = {}) {
  const prefersReducedMotion =
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  if (prefersReducedMotion) return null;

  if (window.__lenis) return window.__lenis;

  const lenis = new Lenis({
    lerp: options.lerp ?? 0.1,
    smoothWheel: true,

    prevent: (node: Element) => !!node.closest?.('[data-lenis-prevent]'),
  });

  window.__lenis = lenis;

  const raf = (time: number) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);

  const onClick = (e: MouseEvent) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const a = target.closest('a[href^="#"]');
    if (!(a instanceof HTMLAnchorElement)) return;

    const href = a.getAttribute('href');
    if (!href) return;

    if (href === '#') {
      e.preventDefault();
      lenis.scrollTo(0);
      history.pushState(null, '', '#');
      return;
    }

    const el = document.querySelector(href);
    if (!(el instanceof HTMLElement)) return;

    e.preventDefault();
    lenis.scrollTo(el);
    history.pushState(null, '', href);
  };

  document.addEventListener('click', onClick);

  return {
    lenis,
    destroy() {
      document.removeEventListener('click', onClick);
      (lenis as unknown as { destroy?: () => void }).destroy?.();
      delete window.__lenis;
    },
  };
}
