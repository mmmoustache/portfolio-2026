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

export function initNavigationMenu(options: NavMenuOptions = {}): Cleanup {
  const {
    toggleId = 'navigationToggle',
    navId = 'navigation',
    navItemsId = 'navigationItems',
    headerId = 'header',
    initialFocusSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    itemsAnimateDelayMs = 250,
  } = options;

  const toggle = document.getElementById(toggleId) as HTMLButtonElement | null;
  const navEl = document.getElementById(navId);
  const navItemsEl = document.getElementById(navItemsId);
  const header = document.getElementById(headerId);
  const scrollSentinel = document.getElementById('scrollSentinel');

  if (!toggle || !navEl) return () => {};

  let releaseTrap: Cleanup | null = null;
  let previousBodyOverflow = '';

  const stopLenis = () => window.__lenis?.stop();
  const startLenis = () => window.__lenis?.start();

  const setUI = (open: boolean) => {
    if (open) {
      previousBodyOverflow = document.body.style.overflow;

      document.body.classList.add('overflow-hidden', 'h-dvh');
      navEl.classList.add('navigation-offset', 'flex', 'motion-safe:animate-fade-in');
      navEl.classList.remove('hidden');

      window.setTimeout(() => {
        navItemsEl?.classList.add('motion-safe:animate-shift-up');
      }, itemsAnimateDelayMs);

      stopLenis();
    } else {
      document.body.style.overflow = previousBodyOverflow || '';
      document.body.classList.remove('overflow-hidden', 'h-dvh');
      navEl.classList.remove('navigation-offset', 'flex', 'motion-safe:animate-fade-in');
      navItemsEl?.classList.remove('motion-safe:animate-shift-up');
      navEl.classList.add('hidden');
      startLenis();
    }

    toggle.textContent = open ? 'Close' : 'Menu';
    toggle.setAttribute('aria-expanded', String(open));
  };

  const openNav = () => {
    if (!header) return;

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
      },
      {
        root: null,
        threshold: 0,
      }
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

  let cleanedUp = false;

  const cleanup: Cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;

    closeNav();
    unsubscribe?.();

    toggle.removeEventListener('click', onToggleClick);

    document.removeEventListener('astro:before-swap', cleanup);
    window.removeEventListener('pagehide', cleanup);
  };

  document.addEventListener('astro:before-swap', cleanup);
  window.addEventListener('pagehide', cleanup);

  return cleanup;
}
