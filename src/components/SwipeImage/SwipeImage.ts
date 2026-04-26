import { coerceClampedNumber } from '@/utils/coerceNumber';

type SwipeImageEl = HTMLElement & {
  dataset: DOMStringMap & {
    threshold?: string;
    revealed?: string;
    resetting?: string;
    swipeInit?: string;
  };
};

declare global {
  var __SWIPE_REVEAL_OBS__: WeakMap<SwipeImageEl, IntersectionObserver> | undefined;
  var __SWIPE_REVEAL_INIT__: boolean | undefined;
}

const DEFAULT_THRESHOLD = 0.25;
const THRESHOLD_STEPS = 20;

function buildThresholds(steps = THRESHOLD_STEPS): number[] {
  return Array.from({ length: steps + 1 }, (_, i) => i / steps);
}

function parseThreshold(value: string | undefined, fallback = DEFAULT_THRESHOLD): number {
  return coerceClampedNumber(value, fallback, { min: 0, max: 1 });
}

function isSwipeImageEl(node: Element): node is SwipeImageEl {
  return node instanceof HTMLElement && Object.hasOwn(node.dataset, 'swipeImage');
}

function reveal(el: SwipeImageEl): void {
  requestAnimationFrame(() => {
    el.dataset.revealed = 'true';
  });
}

function reset(el: SwipeImageEl): void {
  el.dataset.resetting = 'true';
  delete el.dataset.revealed;
  void el.getBoundingClientRect();

  requestAnimationFrame(() => {
    delete el.dataset.resetting;
  });
}

function arm(el: SwipeImageEl, obsMap: WeakMap<SwipeImageEl, IntersectionObserver>): void {
  const old = obsMap.get(el);
  if (old) old.disconnect();

  const threshold = parseThreshold(el.dataset.threshold);

  const obs = new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;

        if (entry.intersectionRatio >= threshold) {
          reveal(el);
          observer.disconnect();
          break;
        }
      }
    },
    { threshold: buildThresholds() }
  );

  obs.observe(el);
  obsMap.set(el, obs);
}

function initAll(
  obsMap: WeakMap<SwipeImageEl, IntersectionObserver>,
  opts: { forceReset?: boolean } = {}
): void {
  const nodes = document.querySelectorAll('[data-swipe-image]');

  for (const node of nodes) {
    if (!isSwipeImageEl(node)) continue;

    const alreadyInit = node.dataset.swipeInit === 'true';
    if (!alreadyInit) node.dataset.swipeInit = 'true';

    if (opts.forceReset || !alreadyInit) {
      reset(node);
    }

    if (!('IntersectionObserver' in globalThis)) {
      reveal(node);
      continue;
    }

    arm(node, obsMap);
  }
}

export function SwipeImage(): void {
  if (globalThis.__SWIPE_REVEAL_INIT__) return;
  globalThis.__SWIPE_REVEAL_INIT__ = true;

  const obsMap = (globalThis.__SWIPE_REVEAL_OBS__ ??= new WeakMap<
    SwipeImageEl,
    IntersectionObserver
  >());

  const run = (opts?: { forceReset?: boolean }) => initAll(obsMap, opts);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => run(), { once: true });
  } else {
    run();
  }

  window.addEventListener('pageshow', (e) => {
    run({ forceReset: e.persisted === true });
  });

  document.addEventListener('astro:page-load', () => run());
}
