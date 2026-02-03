import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { initMainNav } from '@/components/MainNavigation/MainNavigation';

type CreateFocusTrap = (typeof import('@/utils/focusTrap'))['createFocusTrap'];
type Unsubscribe = () => void;

type NavOpenStore<T> = {
  get: () => T;
  set: (v: T) => void;
  subscribe: (fn: (v: T) => void) => Unsubscribe;
};

function createStore<T>(initial: T): NavOpenStore<T> {
  let value = initial;
  const subs = new Set<(v: T) => void>();
  return {
    get: () => value,
    set: (v: T) => {
      value = v;
      for (const fn of subs) fn(v);
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

const navigationOpenStore = createStore(false);

vi.mock('@/store/navigation.js', () => {
  return {
    navigationOpen: navigationOpenStore,
    navigationToggle: vi.fn(() => {
      navigationOpenStore.set(!navigationOpenStore.get());
    }),
  };
});

const focusTrapRelease = vi.fn();
const createFocusTrapImpl: CreateFocusTrap = ((..._args: any[]) =>
  focusTrapRelease) as CreateFocusTrap;
const createFocusTrapMock = vi.fn(createFocusTrapImpl);

vi.mock('@/utils/focusTrap', () => ({
  createFocusTrap: createFocusTrapMock,
}));

function installLenis() {
  const stop = vi.fn();
  const start = vi.fn();
  const resize = vi.fn();
  const update = vi.fn();
  (window as any).__lenis = { stop, start, resize, update };
  return { stop, start, resize, update };
}

type MediaQueryListener = (e: MediaQueryListEvent) => void;

function installMatchMedia(matches = false) {
  let currentMatches = matches;
  const listeners = new Set<MediaQueryListener>();

  const mql: MediaQueryList = {
    media: '(min-width: 64rem)',
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
  options?: IntersectionObserverInit;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = cb;
    this.options = options;
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

function setupDom() {
  document.body.innerHTML = `
    <header id="headerStatic"></header>

    <header id="header">
      <a class="site-author" href="/">Author</a>
      <button id="navigationToggle" aria-controls="navigation" aria-expanded="false">Menu</button>
      <nav id="navigation" class="hidden" aria-label="Primary">
        <ul id="navigationItems"></ul>
      </nav>
    </header>
  `;

  return {
    toggle: document.getElementById('navigationToggle') as HTMLButtonElement,
    nav: document.getElementById('navigation') as HTMLElement,
    navItems: document.getElementById('navigationItems') as HTMLElement,
    header: document.getElementById('header') as HTMLElement,
    headerStatic: document.getElementById('headerStatic') as HTMLElement,
  };
}

describe('initMainNav', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    navigationOpenStore.set(false);

    installIntersectionObserver();
    installRafImmediate();
    installMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    document.body.innerHTML = '';
    delete (window as any).__lenis;
  });

  it('returns a no-op cleanup if required elements are missing', () => {
    document.body.innerHTML = `<div></div>`;
    const cleanup = initMainNav();
    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
  });

  it('initialises UI from store state (closed by default)', () => {
    const { toggle, nav } = setupDom();
    installLenis();

    initMainNav();

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.textContent).toBe('Menu');
    expect(nav.classList.contains('hidden')).toBe(true);
    expect(document.body.classList.contains('overflow-hidden')).toBe(false);
    expect(document.body.classList.contains('h-dvh')).toBe(false);
  });

  it('opens nav on toggle click: locks body, shows nav, stops Lenis, sets aria/text, creates focus trap', () => {
    const { toggle, nav, navItems, header } = setupDom();
    const lenis = installLenis();

    initMainNav({ itemsAnimateDelayMs: 250 });

    toggle.click();

    expect(document.body.classList.contains('overflow-hidden')).toBe(true);
    expect(document.body.classList.contains('h-dvh')).toBe(true);

    expect(nav.classList.contains('hidden')).toBe(false);
    expect(nav.classList.contains('flex')).toBe(true);
    expect(nav.classList.contains('navigation-offset')).toBe(true);
    expect(nav.classList.contains('motion-safe:animate-fade-in')).toBe(true);

    expect(lenis.stop).toHaveBeenCalledTimes(1);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent).toBe('Close');

    expect(createFocusTrapMock).toHaveBeenCalledTimes(1);
    expect(createFocusTrapMock.mock.calls[0][0]).toBe(header);

    expect(navItems.classList.contains('motion-safe:animate-shift-up')).toBe(false);
    vi.advanceTimersByTime(249);
    expect(navItems.classList.contains('motion-safe:animate-shift-up')).toBe(false);
    vi.advanceTimersByTime(1);
    expect(navItems.classList.contains('motion-safe:animate-shift-up')).toBe(true);
  });

  it('closes nav when toggled again: unlocks body, hides nav, starts Lenis, calls resize/update on nextFrame, releases focus trap', () => {
    const { toggle, nav, navItems } = setupDom();
    const lenis = installLenis();

    initMainNav();

    toggle.click(); // open
    expect(navisOpen()).toBe(true);

    toggle.click(); // close

    expect(document.body.classList.contains('overflow-hidden')).toBe(false);
    expect(document.body.classList.contains('h-dvh')).toBe(false);

    expect(nav.classList.contains('hidden')).toBe(true);
    expect(nav.classList.contains('flex')).toBe(false);
    expect(nav.classList.contains('navigation-offset')).toBe(false);
    expect(nav.classList.contains('motion-safe:animate-fade-in')).toBe(false);

    expect(navItems.classList.contains('motion-safe:animate-shift-up')).toBe(false);

    expect(lenis.start).toHaveBeenCalledTimes(1);
    expect(lenis.resize).toHaveBeenCalledTimes(1);
    expect(lenis.update).toHaveBeenCalledTimes(1);

    expect(focusTrapRelease).toHaveBeenCalledTimes(1);

    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.textContent).toBe('Menu');
  });

  it('responds to breakpoint change: if open, stops Lenis; if closed, starts Lenis and resyncs', () => {
    const { toggle } = setupDom();
    const lenis = installLenis();
    const mm = installMatchMedia(false);

    initMainNav();

    toggle.click();
    expect(lenis.stop).toHaveBeenCalledTimes(1);

    mm.trigger(true);
    expect(lenis.stop).toHaveBeenCalledTimes(2);

    toggle.click();
    expect(lenis.start).toHaveBeenCalledTimes(1);
    expect(lenis.resize).toHaveBeenCalledTimes(1);
    expect(lenis.update).toHaveBeenCalledTimes(1);

    mm.trigger(false);
    expect(lenis.start).toHaveBeenCalledTimes(2);
    expect(lenis.resize).toHaveBeenCalledTimes(2);
    expect(lenis.update).toHaveBeenCalledTimes(2);
  });

  it('pins header via IntersectionObserver and toggles headerStatic visibility', () => {
    const { header, headerStatic } = setupDom();
    installLenis();

    initMainNav();

    const obs = FakeIntersectionObserver.instances[0];
    expect(obs).toBeTruthy();

    obs.trigger({ isIntersecting: false } as any);

    expect(header.classList.contains('fixed')).toBe(true);
    expect(header.classList.contains('motion-safe:animate-nav-entry')).toBe(true);
    expect(headerStatic.classList.contains('lg:hidden')).toBe(true);

    obs.trigger({ isIntersecting: true } as any);

    expect(header.classList.contains('fixed')).toBe(false);
    expect(header.classList.contains('motion-safe:animate-nav-entry')).toBe(false);
    expect(headerStatic.classList.contains('lg:hidden')).toBe(false);
  });

  it('cleanup removes listeners, closes nav, releases trap, disconnects observer', () => {
    const { toggle, nav } = setupDom();
    const lenis = installLenis();

    const mm = installMatchMedia(false);
    const cleanup = initMainNav();

    toggle.click();
    expect(nav.classList.contains('hidden')).toBe(false);

    const obs = FakeIntersectionObserver.instances[0];
    expect(obs).toBeTruthy();

    cleanup();

    expect(nav.classList.contains('hidden')).toBe(true);
    expect(document.body.classList.contains('overflow-hidden')).toBe(false);

    expect(focusTrapRelease).toHaveBeenCalled();

    expect(obs.disconnect).toHaveBeenCalledTimes(1);

    navigationOpenStore.set(true);
    expect(nav.classList.contains('hidden')).toBe(true);

    const stopCalls = lenis.stop.mock.calls.length;
    mm.trigger(true);
    expect(lenis.stop.mock.calls.length).toBe(stopCalls);
  });
});

function navisOpen() {
  return document.getElementById('navigationToggle')?.getAttribute('aria-expanded') === 'true';
}
