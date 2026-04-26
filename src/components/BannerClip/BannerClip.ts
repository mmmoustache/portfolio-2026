import { clamp } from '@/utils/clamp';
import { prefersReducedMotion } from '@/utils/prefersReduceMotion';

type BannerClipDataset = {
  ease?: string;
  hasInitialized?: 'true' | 'false';
  initialInset?: string;
  initialScale?: string;
};

type BannerClipEl = HTMLElement & {
  dataset: DOMStringMap & BannerClipDataset;
};

function parseNumber(
  value: string | undefined,
  fallback: number,
  opts?: { min?: number; max?: number }
): number {
  const valueAsInt = value == null ? Number.NaN : Number(value);
  const safeInt = Number.isFinite(valueAsInt) ? valueAsInt : fallback;
  const min = opts?.min ?? -Infinity;
  const max = opts?.max ?? Infinity;
  return clamp(safeInt, min, max);
}

function isBannerClipEl(el: Element): el is BannerClipEl {
  return el instanceof HTMLElement && Object.hasOwn(el.dataset, 'bannerClip');
}

function warnBannerClip(message: string, detail?: unknown) {
  console.warn(`[BannerClip] ${message}`, detail);
}

export function BannerClip(): void {
  if (prefersReducedMotion()) return;

  const els = document.querySelectorAll<HTMLElement>('[data-banner-clip]');

  els.forEach((el) => {
    if (!isBannerClipEl(el)) return;

    if (el.dataset.hasInitialized === 'true') return;

    const inner = el.querySelector<HTMLElement>('.banner-clip__inner');
    if (!inner) {
      warnBannerClip('Missing inner element for banner clip', el);
      return;
    }

    el.dataset.hasInitialized = 'true';

    const initialInset = parseNumber(el.dataset.initialInset, 30, { min: 0, max: 100 });
    const initialScale = parseNumber(el.dataset.initialScale, 1.15, { min: 1, max: 3 });
    const ease = parseNumber(el.dataset.ease, 0.12, { min: 0.02, max: 0.25 });

    let currentInset = initialInset;
    let targetInset = initialInset;
    let currentScale = initialScale;
    let targetScale = initialScale;
    let rafId: number | null = null;
    let ticking = false;

    const computeProgress = (): number => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const denom = vh + rect.height || 1;
      const raw = (vh - rect.top) / denom;
      return clamp(raw, 0, 1);
    };

    const updateTarget = (): void => {
      const p = computeProgress();
      targetInset = initialInset * (1 - p);
      targetScale = initialScale - (initialScale - 1) * p;
    };

    const apply = (): void => {
      currentInset = currentInset + (targetInset - currentInset) * ease;
      currentScale = currentScale + (targetScale - currentScale) * ease;

      if (Math.abs(currentInset - targetInset) < 0.03) currentInset = targetInset;
      if (Math.abs(currentScale - targetScale) < 0.002) currentScale = targetScale;

      inner.style.setProperty('--inset', `${currentInset.toFixed(3)}%`);
      inner.style.setProperty('--scale', currentScale.toFixed(4));

      ticking = false;
      rafId = null;
    };

    const requestTick = (): void => {
      if (ticking) return;
      ticking = true;
      rafId = globalThis.requestAnimationFrame(apply);
    };

    const onScrollOrResize = (): void => {
      updateTarget();
      requestTick();
    };

    const ac = new AbortController();
    const { signal } = ac;

    window.addEventListener('scroll', onScrollOrResize, { passive: true, signal });
    window.addEventListener('resize', onScrollOrResize, { passive: true, signal });
    el.addEventListener('load', onScrollOrResize, { capture: true, signal });

    const observer = new MutationObserver(() => {
      if (!el.isConnected) {
        ac.abort();
        observer.disconnect();
        if (rafId != null) globalThis.cancelAnimationFrame(rafId);
        rafId = null;
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    onScrollOrResize();
  });
}
