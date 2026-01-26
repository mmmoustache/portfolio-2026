import { navigationOpen, navigationToggle } from '@/store/navigation.js';
import { createFocusTrap } from '@/utils/focusTrap';

type Cleanup = () => void;

type NavMenuOptions = {
  toggleId?: string;
  navId?: string;
  navItemsId?: string;
  headerId?: string;
  initialFocusSelector?: string;
  itemsAnimateDelayMs?: number;
};

function nextFrame(fn: () => void) {
  requestAnimationFrame(() => requestAnimationFrame(fn));
}

function skipToContent(event: { preventDefault: () => void }) {
  event.preventDefault();
  const target = document.getElementById('content');
  if (!target) return;
  history.replaceState(null, '', '#content');
  target.scrollIntoView();
  target.focus({ preventScroll: true });
}

export function initNavigationMenu(options: NavMenuOptions = {}): Cleanup {
  const {
    toggleId = 'navigationToggle',
    navId = 'navigation',
    navItemsId = 'navigationItems',
    headerId = 'header',
    initialFocusSelector = '#navigationToggle',
    itemsAnimateDelayMs = 250,
  } = options;

  const toggle = document.getElementById(toggleId) as HTMLButtonElement | null;
  const navEl = document.getElementById(navId);
  const navItemsEl = document.getElementById(navItemsId);
  const header = document.getElementById(headerId);
  const headerStatic = document.getElementById('headerStatic');
  const scrollSentinel = document.getElementById('scrollSentinel');
  const skipLink = document.querySelector('a[href="#content"]');

  if (!toggle || !navEl) return () => {};

  let releaseTrap: Cleanup | null = null;
  let previousBodyOverflow = '';
  let cleanedUp = false;
  let itemsAnimTimer: number | null = null;

  const stopLenis = () => window.__lenis?.stop?.();
  const startLenis = () => window.__lenis?.start?.();

  const syncLenisLayout = () => {
    const lenis = window.__lenis as any;
    lenis?.resize?.();
    lenis?.update?.();
  };

  const setBodyLocked = (locked: boolean) => {
    if (locked) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.classList.add('overflow-hidden', 'h-dvh');
    } else {
      document.body.style.overflow = previousBodyOverflow || '';
      document.body.classList.remove('overflow-hidden', 'h-dvh');
    }
  };

  const setUI = (open: boolean) => {
    if (itemsAnimTimer != null) {
      window.clearTimeout(itemsAnimTimer);
      itemsAnimTimer = null;
    }

    if (open) {
      setBodyLocked(true);

      navEl.classList.add('navigation-offset', 'flex');
      navEl.classList.remove('hidden');

      navEl.classList.add('motion-safe:animate-fade-in');

      itemsAnimTimer = window.setTimeout(() => {
        navItemsEl?.classList.add('motion-safe:animate-shift-up');
      }, itemsAnimateDelayMs);

      stopLenis();
    } else {
      setBodyLocked(false);

      navEl.classList.remove('navigation-offset', 'flex', 'motion-safe:animate-fade-in');
      navItemsEl?.classList.remove('motion-safe:animate-shift-up');
      navEl.classList.add('hidden');

      startLenis();

      nextFrame(() => {
        syncLenisLayout();
      });
    }

    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    toggle.dataset.state = open ? 'open' : 'closed';
  };

  const openNav = () => {
    if (!header) {
      setUI(true);
      return;
    }

    setUI(true);

    releaseTrap?.();
    releaseTrap = createFocusTrap(header, {
      initialFocus: initialFocusSelector,
      onEscape: () => navigationOpen.set(false),
    });
  };

  const closeNav = () => {
    setUI(false);
    releaseTrap?.();
    releaseTrap = null;
  };

  if (header && scrollSentinel) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        header.classList.toggle('fixed', !entry.isIntersecting);
        header.classList.toggle('motion-safe:animate-nav-entry', !entry.isIntersecting);
        headerStatic?.classList.toggle('lg:hidden', !entry.isIntersecting);
      },
      { root: null, threshold: 0 }
    );

    observer.observe(scrollSentinel);
  }

  setUI(navigationOpen.get());

  const unsubscribe = navigationOpen.subscribe((open) => {
    if (open) openNav();
    else closeNav();
  });

  const onToggleClick = () => {
    navigationToggle();
  };

  toggle.addEventListener('click', onToggleClick);

  const onBreakpointChange = () => {
    const open = navigationOpen.get();

    setBodyLocked(open);

    if (open) {
      stopLenis();
    } else {
      startLenis();
      nextFrame(() => syncLenisLayout());
    }
  };

  const cleanup: Cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;

    closeNav();
    unsubscribe?.();

    toggle.removeEventListener('click', onToggleClick);
    window.removeEventListener('resize', onBreakpointChange);

    document.removeEventListener('astro:before-swap', cleanup);
    window.removeEventListener('pagehide', cleanup);
  };

  skipLink?.addEventListener('click', skipToContent);

  window.addEventListener('resize', onBreakpointChange);
  document.addEventListener('astro:before-swap', cleanup);
  window.addEventListener('pagehide', cleanup);

  return cleanup;
}
