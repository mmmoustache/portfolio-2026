import { fireEvent } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initMainNav } from '@/components/MainNavigation/MainNavigation';

type MediaQueryListener = (e: MediaQueryListEvent) => void;

function trackEventListeners() {
  const added: Array<{
    target: EventTarget;
    type: string;
    listener: EventListenerOrEventListenerObject;
    options?: boolean | AddEventListenerOptions;
  }> = [];

  const proto = EventTarget.prototype;
  const originalAdd = proto.addEventListener;
  const originalRemove = proto.removeEventListener;

  proto.addEventListener = function (
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) {
    added.push({ target: this, type, listener, options });
    return originalAdd.call(this, type, listener, options);
  } as any;

  return {
    cleanup() {
      for (let i = added.length - 1; i >= 0; i--) {
        const { target, type, listener, options } = added[i];
        originalRemove.call(target, type, listener, options as any);
      }
      proto.addEventListener = originalAdd;
      proto.removeEventListener = originalRemove;
    },
  };
}

function installMatchMedia(initialMatches = false) {
  let currentMatches = initialMatches;
  const listeners = new Set<MediaQueryListener>();

  const mql: MediaQueryList = {
    media: '(min-width: 1024px)',
    matches: currentMatches,
    onchange: null,
    addEventListener: (_type: string, cb: any) => listeners.add(cb),
    removeEventListener: (_type: string, cb: any) => listeners.delete(cb),
    addListener: (cb: any) => listeners.add(cb),
    removeListener: (cb: any) => listeners.delete(cb),
    dispatchEvent: () => true,
  } as any;

  const trigger = (nextMatches: boolean) => {
    currentMatches = nextMatches;
    (mql as any).matches = nextMatches;
    const evt = { matches: nextMatches, media: mql.media } as MediaQueryListEvent;
    for (const cb of listeners) cb(evt);
  };

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql)
  );
  return { mql, trigger };
}

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];

  callback: IntersectionObserverCallback;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
    FakeIntersectionObserver.instances.push(this);
  }

  trigger(entry: Partial<IntersectionObserverEntry>) {
    this.callback([entry as IntersectionObserverEntry], this as any);
  }
}

function installIntersectionObserver() {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver as any);
}

function installRafImmediate() {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
}

function keydown(key: string, init: Partial<KeyboardEventInit> = {}) {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  document.dispatchEvent(ev);
  return ev;
}

function setupDom() {
  document.body.innerHTML = `
    <a
      href="#content"
      class="skip-to-content"
    >Skip to content</a>

    <header id="siteHeader" data-testid="main-nav">
      <nav id="desktopNav" class="hidden lg:block" aria-label="Primary">
        <a id="desktopLogo" href="/">Desktop Logo</a>
        <div id="desktopNavSentinel" class="h-px w-full" aria-hidden="true"></div>
      </nav>

      <div id="mobileBar" data-at-top="true" data-menu-open="false">
        <a href="/" id="mobileLogo" aria-hidden="true" tabindex="-1">Mobile Logo</a>
        <button id="menuToggle" type="button" aria-controls="mobileMenu" aria-expanded="false">
          <span class="sr-only">Open menu</span>
        </button>
      </div>

      <div
        id="mobileMenu"
        class="pointer-events-none"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        aria-hidden="true"
        hidden
      >
        <div data-menu-overlay>
          <div data-menu-panel>
            <ul>
              <li><a href="/one">One</a></li>
              <li><a href="/two">Two</a></li>
            </ul>
          </div>
        </div>
      </div>
    </header>

    <main id="content" tabindex="-1">
      <button id="contentBtn">Content Button</button>
    </main>
  `;

  const mobileBar = document.getElementById('mobileBar') as HTMLElement;
  Object.defineProperty(mobileBar, 'offsetHeight', { value: 64, configurable: true });

  const content = document.getElementById('content') as HTMLElement;

  content.scrollIntoView = vi.fn() as any;

  return {
    header: document.getElementById('siteHeader') as HTMLElement,
    desktopLogo: document.getElementById('desktopLogo') as HTMLElement,
    desktopSentinel: document.getElementById('desktopNavSentinel') as HTMLElement,

    mobileBar,
    mobileLogo: document.getElementById('mobileLogo') as HTMLElement,
    toggle: document.getElementById('menuToggle') as HTMLButtonElement,

    menu: document.getElementById('mobileMenu') as HTMLElement,
    overlay: document.querySelector('[data-menu-overlay]') as HTMLElement,
    panel: document.querySelector('[data-menu-panel]') as HTMLElement,

    skip: document.querySelector('.skip-to-content') as HTMLAnchorElement,
    content,
    contentBtn: document.getElementById('contentBtn') as HTMLButtonElement,
  };
}

describe('initMainNav', () => {
  let listenerTracker: ReturnType<typeof trackEventListeners>;

  beforeEach(() => {
    listenerTracker = trackEventListeners();
    vi.useFakeTimers();
    document.body.innerHTML = '';

    installIntersectionObserver();
    installRafImmediate();
  });

  afterEach(() => {
    listenerTracker.cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('does not throw if required elements are missing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    document.body.innerHTML = `<div></div>`;

    expect(() => initMainNav()).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('sets --nav-offset based on mobileBar height', () => {
    setupDom();
    installMatchMedia(false);

    initMainNav();

    expect(document.documentElement.style.getPropertyValue('--nav-offset')).toBe('64px');
  });

  it('initialises logo visibility at top on mobile (shows logo, makes it focusable)', () => {
    const { mobileLogo } = setupDom();
    installMatchMedia(false);

    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });

    initMainNav();

    expect(mobileLogo.style.opacity).toBe('1');
    expect(mobileLogo.getAttribute('aria-hidden')).toBe('false');
    expect(mobileLogo.hasAttribute('tabindex')).toBe(false);
  });

  it('opens menu on toggle click: aria/data/hidden/class/scroll lock/inert and focuses toggle', () => {
    const { toggle, menu, mobileBar, header } = setupDom();
    installMatchMedia(false);

    initMainNav();

    const outside = document.createElement('button');
    outside.textContent = 'outside';
    document.body.appendChild(outside);

    toggle.click();

    expect(mobileBar.dataset.menuOpen).toBe('true');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(menu.hidden).toBe(false);
    expect(menu.getAttribute('aria-hidden')).toBe('false');

    expect(menu.classList.contains('pointer-events-none')).toBe(false);
    expect(menu.style.opacity).toBe('1');

    // scroll lock
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.body.style.overflow).toBe('hidden');

    const bodyChildren = Array.from(document.body.children);
    for (const el of bodyChildren) {
      if (el === header) continue;
      expect(el.getAttribute('aria-hidden')).toBe('true');
    }

    // focus
    expect(document.activeElement).toBe(toggle);
  });

  it('closes menu on Escape: hides menu (after timeout), unlocks scroll, restores focus', () => {
    const { toggle, menu, panel } = setupDom();
    installMatchMedia(false);

    const before = document.createElement('button');
    before.textContent = 'before';
    document.body.appendChild(before);
    before.focus();

    initMainNav();

    toggle.click(); // open
    expect(menu.hidden).toBe(false);

    // move focus inside menu then press Escape
    const firstLink = panel.querySelector('a') as HTMLAnchorElement;
    firstLink.focus();
    expect(document.activeElement).toBe(firstLink);

    const ev = keydown('Escape');
    expect(ev.defaultPrevented).toBe(true);

    // immediately: aria + class + opacity
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(menu.getAttribute('aria-hidden')).toBe('true');
    expect(menu.classList.contains('pointer-events-none')).toBe(true);
    expect(menu.style.opacity).toBe('0');

    // scroll unlocked immediately
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.body.style.overflow).toBe('');

    expect(menu.hidden).toBe(false);
    vi.advanceTimersByTime(179);
    expect(menu.hidden).toBe(false);
    vi.advanceTimersByTime(1);
    expect(menu.hidden).toBe(true);

    expect(document.activeElement).toBe(before);
  });

  it('closes menu when clicking overlay outside the panel', () => {
    const { toggle, menu, overlay, panel } = setupDom();
    installMatchMedia(false);

    initMainNav();

    toggle.click(); // open
    expect(menu.hidden).toBe(false);

    fireEvent.click(panel, { bubbles: true });
    expect(menu.hidden).toBe(false);

    fireEvent.click(overlay, { bubbles: true });
    vi.advanceTimersByTime(180);
    expect(menu.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes menu when clicking a link inside the panel', () => {
    const { toggle, menu, panel } = setupDom();
    installMatchMedia(false);

    initMainNav();

    toggle.click(); // open
    expect(menu.hidden).toBe(false);

    const link = panel.querySelector('a') as HTMLAnchorElement;
    fireEvent.click(link, { bubbles: true });

    vi.advanceTimersByTime(180);
    expect(menu.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('traps Tab when open: if focus is outside trap scope, Tab focuses the toggle', () => {
    const { toggle } = setupDom();
    installMatchMedia(false);

    initMainNav();
    toggle.click(); // open

    const outside = document.createElement('button');
    outside.textContent = 'outside';
    document.body.appendChild(outside);

    const spy = vi.spyOn(document, 'activeElement', 'get').mockReturnValue(outside as any);

    const ev = keydown('Tab');

    spy.mockRestore();

    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(toggle);
  });

  it('traps Tab wrapping when open: Shift+Tab on first -> last', () => {
    const { toggle, mobileLogo, panel } = setupDom();
    installMatchMedia(false);

    initMainNav();
    toggle.click(); // open

    const first = mobileLogo;
    const last = panel.querySelectorAll('a')[1];

    first.focus();
    expect(document.activeElement).toBe(first);

    const ev = keydown('Tab', { shiftKey: true });
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
  });

  it('traps Tab wrapping when open: Tab on last -> first', () => {
    const { toggle, mobileLogo, panel } = setupDom();
    installMatchMedia(false);

    initMainNav();
    toggle.click(); // open

    const first = mobileLogo;
    const last = panel.querySelectorAll('a')[1];

    last.focus();
    expect(document.activeElement).toBe(last);

    const ev = keydown('Tab');
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it('Alt+K opens menu when not typing', () => {
    const { toggle } = setupDom();
    installMatchMedia(false);

    initMainNav();

    const ev = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      altKey: true,
      key: 'k',
      code: 'KeyK',
    });
    document.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('Alt+K does nothing when typing in an input', () => {
    const { toggle } = setupDom();
    installMatchMedia(false);

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    initMainNav();

    const ev = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      altKey: true,
      key: 'k',
      code: 'KeyK',
    });
    document.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('on desktop, if bar is hidden and desktopLogo exists, Alt+K focuses desktopLogo instead of opening menu', () => {
    const { desktopLogo, mobileBar, toggle } = setupDom();
    const mm = installMatchMedia(true);

    initMainNav();

    mobileBar.classList.remove('bar-visible');
    mm.trigger(true);

    const ev = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      altKey: true,
      key: 'k',
      code: 'KeyK',
    });
    document.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(desktopLogo);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('clicking skip-to-content focuses #content and calls scrollIntoView', () => {
    const { skip, content, contentBtn } = setupDom();
    installMatchMedia(false);

    initMainNav();

    contentBtn.focus();
    expect(document.activeElement).toBe(contentBtn);

    fireEvent.click(skip, { bubbles: true });

    expect(document.activeElement).toBe(content);
    expect(content.scrollIntoView as any).toHaveBeenCalledTimes(1);
  });

  it('desktop observer toggles bar-visible based on sentinel intersection', () => {
    const { mobileBar } = setupDom();
    installMatchMedia(true);

    const sentinel = document.getElementById('desktopNavSentinel') as HTMLElement;
    sentinel.getBoundingClientRect = vi.fn(() => ({
      top: 0,
      bottom: 1,
      left: 0,
      right: 0,
      width: 0,
      height: 1,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })) as any;

    initMainNav();

    const obs = FakeIntersectionObserver.instances[0];
    expect(obs).toBeTruthy();

    obs.trigger({ isIntersecting: true });
    expect(mobileBar.classList.contains('bar-visible')).toBe(false);

    obs.trigger({ isIntersecting: false });
    expect(mobileBar.classList.contains('bar-visible')).toBe(true);
  });
});
