import Lenis from 'lenis';

import { prefersReducedMotion } from '@/utils/prefersReduceMotion';

export type InitScrollProviderOptions = {
  lerp?: number;
};

function findHashTarget(hash: string): HTMLElement | null {
  const id = hash.slice(1);
  if (!id) return null;

  try {
    const decodedId = decodeURIComponent(id);
    const target = document.getElementById(decodedId);
    return target instanceof HTMLElement ? target : null;
  } catch {
    return null;
  }
}

export function initScrollProvider(options: InitScrollProviderOptions = {}) {
  if (prefersReducedMotion()) return null;

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

    const href = a.getAttribute('href')?.trim();
    if (!href || !href.startsWith('#')) return;

    if (href === '#') {
      e.preventDefault();
      lenis.scrollTo(0);
      history.pushState(null, '', '#');
      return;
    }

    const url = new URL(a.href, window.location.href);
    if (
      url.origin !== window.location.origin ||
      url.pathname !== window.location.pathname ||
      url.search !== window.location.search
    ) {
      return;
    }

    const el = findHashTarget(href);
    if (!el) return;

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
