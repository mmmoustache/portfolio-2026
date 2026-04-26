import { dedupe } from '@/utils/dedupe';
import { getFocusable } from '@/utils/focusTrap';

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    (el as HTMLElement).isContentEditable === true
  );
}

type NavEls = {
  header: HTMLElement;
  desktopLogo: HTMLElement | null;
  desktopSentinel: HTMLElement | null;

  mobileBar: HTMLElement;
  mobileLogo: HTMLElement;
  toggle: HTMLButtonElement;

  menu: HTMLElement;
  overlay: HTMLElement;
  panel: HTMLElement;
};

type InertElement = HTMLElement & {
  inert?: boolean;
};

function warnMainNav(message: string, detail?: unknown) {
  console.warn(`[MainNav] ${message}`, detail);
}

function isHTMLElement(el: Element | null): el is HTMLElement {
  return el instanceof HTMLElement;
}

function isHTMLButtonElement(el: Element | null): el is HTMLButtonElement {
  return el instanceof HTMLButtonElement;
}

function queryRequired<T extends Element>(
  root: ParentNode,
  selector: string,
  isExpected: (el: Element | null) => el is T,
  expectedLabel: string
): T {
  const el = root.querySelector(selector);
  if (!isExpected(el)) {
    throw new Error(`Missing or invalid ${expectedLabel}: ${selector}`);
  }

  return el;
}

function queryOptional<T extends Element>(
  root: ParentNode,
  selector: string,
  isExpected: (el: Element | null) => el is T
): T | null {
  const el = root.querySelector(selector);
  if (el == null) return null;

  return isExpected(el) ? el : null;
}

function collectEls(scope: ParentNode): NavEls {
  const header = queryRequired(scope, '#siteHeader', isHTMLElement, 'header');

  return {
    header,
    desktopLogo: queryOptional(header, '#desktopLogo', isHTMLElement),
    desktopSentinel: queryOptional(header, '#desktopNavSentinel', isHTMLElement),

    mobileBar: queryRequired(header, '#mobileBar', isHTMLElement, 'mobile bar'),
    mobileLogo: queryRequired(header, '#mobileLogo', isHTMLElement, 'mobile logo'),
    toggle: queryRequired(header, '#menuToggle', isHTMLButtonElement, 'menu toggle'),

    menu: queryRequired(header, '#mobileMenu', isHTMLElement, 'mobile menu'),
    overlay: queryRequired(header, '[data-menu-overlay]', isHTMLElement, 'menu overlay'),
    panel: queryRequired(header, '[data-menu-panel]', isHTMLElement, 'menu panel'),
  };
}

function setInert(el: Element, shouldBeInert: boolean) {
  if (!(el instanceof HTMLElement)) return;

  const inertEl = el as InertElement;
  if ('inert' in inertEl) inertEl.inert = shouldBeInert;
}

export function initMainNav(scope: ParentNode = document): void {
  let els: NavEls;
  try {
    els = collectEls(scope);
  } catch (e) {
    warnMainNav('Unable to initialize navigation', e);
    return;
  }

  const mqDesktop = globalThis.matchMedia('(min-width: 1024px)');

  let isMenuOpen = false;
  let isAtTop = window.scrollY <= 0;
  let isBarVisible = !mqDesktop.matches;
  let lastFocused: Element | null = null;

  function applyNavOffset() {
    const h = els.mobileBar.offsetHeight || 0;
    document.documentElement.style.setProperty('--nav-offset', `${h}px`);
  }

  function setPageInert(shouldInert: boolean) {
    const children = Array.from(document.body.children);
    for (const el of children) {
      if (el === els.header) continue;

      if (shouldInert) {
        setInert(el, true);
        el.setAttribute('aria-hidden', 'true');
      } else {
        setInert(el, false);
        el.removeAttribute('aria-hidden');
      }
    }
  }

  function setLogoVisibility() {
    const shouldShow = isMenuOpen || (isBarVisible && isAtTop);

    els.mobileLogo.style.opacity = shouldShow ? '1' : '0';
    els.mobileLogo.style.pointerEvents = shouldShow ? 'auto' : 'none';

    if (shouldShow) {
      els.mobileLogo.removeAttribute('tabindex');
      els.mobileLogo.setAttribute('aria-hidden', 'false');
    } else {
      els.mobileLogo.setAttribute('tabindex', '-1');
      els.mobileLogo.setAttribute('aria-hidden', 'true');
    }
  }

  function setBarFocusable(shouldBeFocusable: boolean) {
    if (isMenuOpen) shouldBeFocusable = true;

    if (shouldBeFocusable) {
      setInert(els.mobileBar, false);
      els.mobileBar.removeAttribute('aria-hidden');

      els.toggle.removeAttribute('tabindex');
      els.toggle.removeAttribute('aria-hidden');
    } else {
      setInert(els.mobileBar, true);
      els.mobileBar.setAttribute('aria-hidden', 'true');

      els.toggle.setAttribute('tabindex', '-1');
      els.toggle.setAttribute('aria-hidden', 'true');

      els.mobileLogo.setAttribute('tabindex', '-1');
      els.mobileLogo.setAttribute('aria-hidden', 'true');
    }
  }

  function setBarVisible(shouldShow: boolean) {
    if (isMenuOpen) shouldShow = true;

    isBarVisible = shouldShow;

    if (mqDesktop.matches) {
      els.mobileBar.classList.toggle('bar-visible', shouldShow);
    } else {
      els.mobileBar.classList.add('bar-visible');
    }

    setBarFocusable(shouldShow || !mqDesktop.matches);
    setLogoVisibility();
  }

  function lockScroll() {
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`;
  }

  function unlockScroll() {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  function getTrapScopeFocusable(): HTMLElement[] {
    return dedupe([...getFocusable(els.mobileBar), ...getFocusable(els.menu)]);
  }

  function trapFocus(e: KeyboardEvent) {
    if (!isMenuOpen || e.key !== 'Tab') return;

    const focusables = getTrapScopeFocusable();
    if (!focusables.length) {
      e.preventDefault();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (!els.mobileBar.contains(active) && !els.menu.contains(active)) {
      e.preventDefault();
      els.toggle.focus();
      return;
    }

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onMenuKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      return;
    }
    trapFocus(e);
  }

  function openMenu() {
    if (isMenuOpen) {
      els.toggle.focus();
      return;
    }

    isMenuOpen = true;
    lastFocused = document.activeElement;

    setBarVisible(true);

    els.mobileBar.dataset.menuOpen = 'true';
    els.toggle.setAttribute('aria-expanded', 'true');
    els.menu.hidden = false;
    els.menu.setAttribute('aria-hidden', 'false');

    requestAnimationFrame(() => {
      els.menu.classList.remove('pointer-events-none');
      els.menu.style.opacity = '1';
    });

    setPageInert(true);
    lockScroll();
    setLogoVisibility();

    els.toggle.focus();

    document.addEventListener('keydown', onMenuKeydown, true);
  }

  function closeMenu() {
    if (!isMenuOpen) return;
    isMenuOpen = false;

    els.mobileBar.dataset.menuOpen = 'false';
    els.toggle.setAttribute('aria-expanded', 'false');

    els.menu.style.opacity = '0';
    els.menu.classList.add('pointer-events-none');
    els.menu.setAttribute('aria-hidden', 'true');

    const reduce = globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = reduce ? 0 : 180;

    globalThis.setTimeout(() => {
      els.menu.hidden = true;
    }, t);

    setPageInert(false);
    unlockScroll();
    setLogoVisibility();

    document.removeEventListener('keydown', onMenuKeydown, true);

    if (lastFocused && typeof (lastFocused as HTMLElement).focus === 'function') {
      (lastFocused as HTMLElement).focus();
    }
  }

  function toggleMenu() {
    isMenuOpen ? closeMenu() : openMenu();
  }

  function onOverlayClick(e: MouseEvent) {
    const target = e.target as Node | null;
    if (!target) return;
    if (els.panel.contains(target)) return;
    closeMenu();
  }

  function onPanelClick(e: MouseEvent) {
    const target = e.target as HTMLElement | null;
    const link = target?.closest?.('a');
    if (link) closeMenu();
  }

  function updateAtTop() {
    isAtTop = window.scrollY <= 0;
    els.mobileBar.dataset.atTop = String(isAtTop);
    setLogoVisibility();
  }

  function setupDesktopObserver() {
    let io: IntersectionObserver | null = null;

    const teardown = () => {
      if (io) {
        io.disconnect();
        io = null;
      }
    };

    const apply = () => {
      teardown();

      if (!mqDesktop.matches) {
        setBarVisible(true);
        return;
      }

      if (!els.desktopSentinel) {
        setBarVisible(false);
        return;
      }

      io = new IntersectionObserver((entries) => {
        const entry = entries[0];
        setBarVisible(!entry.isIntersecting);
      });

      io.observe(els.desktopSentinel);

      const rect = els.desktopSentinel.getBoundingClientRect();
      const sentinelInView = rect.top < window.innerHeight && rect.bottom >= 0;
      setBarVisible(!sentinelInView);
    };

    mqDesktop.addEventListener('change', apply);

    apply();
  }

  function onGlobalShortcut(e: KeyboardEvent) {
    if (!e.altKey) return;
    if (e.ctrlKey || e.metaKey) return;

    const isK = e.code === 'KeyK' || (typeof e.key === 'string' && e.key.toLowerCase() === 'k');
    if (!isK) return;

    if (isTypingTarget(document.activeElement)) return;

    e.preventDefault();
    e.stopPropagation();

    const fixedBarHidden = mqDesktop.matches && !els.mobileBar.classList.contains('bar-visible');

    if (mqDesktop.matches && fixedBarHidden && els.desktopLogo) {
      els.desktopLogo.focus();
      return;
    }

    openMenu();
  }

  function skipToContent(e: MouseEvent) {
    const target = e.target;

    if (!(target instanceof HTMLElement)) return;

    const link = target.closest<HTMLAnchorElement>('.skip-to-content');
    if (!link) return;

    const content = document.getElementById('content');
    if (!content) return;

    e.preventDefault();

    if (content instanceof HTMLElement) {
      content.focus({ preventScroll: true });
      content.scrollIntoView({ block: 'start' });
    }
  }

  applyNavOffset();
  setupDesktopObserver();
  updateAtTop();
  setLogoVisibility();
  els.mobileLogo.classList.add('js-ready');

  els.toggle.addEventListener('click', toggleMenu, { passive: true });
  window.addEventListener('scroll', updateAtTop, { passive: true });
  window.addEventListener('resize', applyNavOffset, { passive: true });
  document.addEventListener('keydown', onGlobalShortcut, true);
  document.addEventListener('click', skipToContent);

  els.overlay.addEventListener('click', onOverlayClick);
  els.panel.addEventListener('click', onPanelClick);
}
