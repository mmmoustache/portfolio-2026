import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SwipeImage } from '@/components/SwipeImage/SwipeImage';

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

function installRafQueue() {
  const queue: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    queue.push(cb);
    return queue.length;
  });

  return {
    flush(count = Infinity) {
      let n = 0;
      while (queue.length && n < count) {
        const cb = queue.shift()!;
        cb(0);
        n++;
      }
    },
  };
}

type IOInstance = {
  cb: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  _targets: Set<Element>;
  trigger: (entries: Partial<IntersectionObserverEntry>[]) => void;
};

function installIntersectionObserver() {
  const instances: IOInstance[] = [];

  class FakeIO {
    cb: IntersectionObserverCallback;
    options?: IntersectionObserverInit;
    observe = vi.fn((el: Element) => this._targets.add(el));
    disconnect = vi.fn();
    unobserve = vi.fn((el: Element) => this._targets.delete(el));
    _targets = new Set<Element>();

    constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.cb = cb;
      this.options = options;
      instances.push(this as any);
    }

    trigger(entries: Partial<IntersectionObserverEntry>[]) {
      this.cb(entries as IntersectionObserverEntry[], this as any);
    }
  }

  vi.stubGlobal('IntersectionObserver', FakeIO as any);

  return {
    instances,
  };
}

function setupDom(threshold?: string) {
  document.body.innerHTML = `
    <div
      data-swipe-image
      ${threshold == null ? '' : `data-threshold="${threshold}"`}
      id="swipe"
    >
      <img alt="x" />
    </div>
  `;

  const el = document.getElementById('swipe') as HTMLElement;

  el.getBoundingClientRect = vi.fn(() => ({
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })) as any;

  return el;
}

function resetSwipeGlobals() {
  globalThis.__SWIPE_REVEAL_INIT__ = undefined;
  globalThis.__SWIPE_REVEAL_OBS__ = undefined;
}

describe('SwipeImage()', () => {
  let listeners: ReturnType<typeof trackEventListeners>;
  let raf: ReturnType<typeof installRafQueue>;
  let io: ReturnType<typeof installIntersectionObserver>;

  beforeEach(() => {
    listeners = trackEventListeners();
    raf = installRafQueue();
    io = installIntersectionObserver();

    resetSwipeGlobals();

    vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
  });

  afterEach(() => {
    listeners.cleanup();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    resetSwipeGlobals();
  });

  it('is idempotent: calling twice only initialises once', () => {
    setupDom();
    SwipeImage();
    SwipeImage();

    expect(io.instances.length).toBe(1);
  });

  it('on init, marks element as swipeInit=true, resets, then arms observer', () => {
    const el = setupDom();
    SwipeImage();

    expect(el.dataset.swipeInit).toBe('true');
    expect(el.dataset.resetting).toBe('true');
    expect(el.dataset.revealed).toBeUndefined();

    expect(io.instances.length).toBe(1);
    expect(io.instances[0].observe).toHaveBeenCalledTimes(1);
    expect(io.instances[0].observe).toHaveBeenCalledWith(el);

    raf.flush(1);
    expect(el.dataset.resetting).toBeUndefined();
  });

  it('reveals when intersectionRatio >= threshold (default 0.25)', () => {
    const el = setupDom();
    SwipeImage();

    const obs = io.instances[0];

    obs.trigger([{ isIntersecting: true, intersectionRatio: 0.2, target: el }]);
    raf.flush();
    expect(el.dataset.revealed).toBeUndefined();
    expect(obs.disconnect).not.toHaveBeenCalled();

    obs.trigger([{ isIntersecting: true, intersectionRatio: 0.3, target: el }]);
    expect(el.dataset.revealed).toBeUndefined();
    raf.flush(1);
    expect(el.dataset.revealed).toBe('true');
    expect(obs.disconnect).toHaveBeenCalledTimes(1);
  });

  it('respects per-element data-threshold (e.g. 0.8)', () => {
    const el = setupDom('0.8');
    SwipeImage();

    const obs = io.instances[0];

    obs.trigger([{ isIntersecting: true, intersectionRatio: 0.79, target: el }]);
    raf.flush();
    expect(el.dataset.revealed).toBeUndefined();

    obs.trigger([{ isIntersecting: true, intersectionRatio: 0.8, target: el }]);
    raf.flush(1);
    expect(el.dataset.revealed).toBe('true');
  });

  it('clamps invalid thresholds via behaviour: data-threshold="2" acts like 1', () => {
    const el = setupDom('2');
    SwipeImage();

    const obs = io.instances[0];

    obs.trigger([{ isIntersecting: true, intersectionRatio: 0.99, target: el }]);
    raf.flush();
    expect(el.dataset.revealed).toBeUndefined();

    obs.trigger([{ isIntersecting: true, intersectionRatio: 1, target: el }]);
    raf.flush(1);
    expect(el.dataset.revealed).toBe('true');
  });

  it('pageshow persisted=true force-resets (sets resetting again + clears revealed)', () => {
    const el = setupDom('0');
    SwipeImage();

    const obs1 = io.instances[0];

    obs1.trigger([{ isIntersecting: true, intersectionRatio: 1, target: el }]);

    raf.flush(2);

    expect(el.dataset.revealed).toBe('true');

    const evt = new PageTransitionEvent('pageshow', { persisted: true });
    globalThis.dispatchEvent(evt);

    expect(el.dataset.resetting).toBe('true');
    expect(el.dataset.revealed).toBeUndefined();

    raf.flush(1);
    expect(el.dataset.resetting).toBeUndefined();
  });

  it('astro:page-load reruns and re-arms observer (disconnects old observer)', () => {
    const el = setupDom();
    SwipeImage();

    const firstObs = io.instances[0];

    document.dispatchEvent(new Event('astro:page-load'));

    expect(firstObs.disconnect).toHaveBeenCalledTimes(1);
    expect(io.instances.length).toBe(2);
    expect(io.instances[1].observe).toHaveBeenCalledWith(el);
  });

  it('when document is loading, waits for DOMContentLoaded', () => {
    vi.restoreAllMocks();
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');

    const el = setupDom();
    SwipeImage();

    expect(io.instances.length).toBe(0);
    expect(el.dataset.swipeInit).toBeUndefined();

    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(io.instances.length).toBe(1);
    expect(el.dataset.swipeInit).toBe('true');
  });

  it('reveals immediately when IntersectionObserver is unavailable', () => {
    const el = setupDom();
    vi.unstubAllGlobals();
    listeners.cleanup();
    listeners = trackEventListeners();
    raf = installRafQueue();

    resetSwipeGlobals();
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');

    SwipeImage();

    expect(el.dataset.swipeInit).toBe('true');
    expect(el.dataset.revealed).toBeUndefined();

    raf.flush(2);

    expect(el.dataset.revealed).toBe('true');
  });
});
