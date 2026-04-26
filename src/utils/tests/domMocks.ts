import { vi } from 'vitest';

type AddedListener = {
  listener: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
  target: EventTarget;
  type: string;
};

export function trackEventListeners() {
  const added: AddedListener[] = [];

  const proto = EventTarget.prototype;
  const originalAdd = proto.addEventListener;
  const originalRemove = proto.removeEventListener;

  const patchedAdd: typeof proto.addEventListener = function (
    this: EventTarget,
    type,
    listener,
    options
  ) {
    if (!listener) {
      return originalAdd.call(this, type, listener, options);
    }

    added.push({ target: this, type, listener, options });
    return originalAdd.call(this, type, listener, options);
  };

  proto.addEventListener = patchedAdd;

  return {
    cleanup() {
      for (let i = added.length - 1; i >= 0; i--) {
        const { target, type, listener, options } = added[i];
        originalRemove.call(target, type, listener, options);
      }

      proto.addEventListener = originalAdd;
      proto.removeEventListener = originalRemove;
    },
  };
}

type MediaQueryChangeListener = (event: MediaQueryListEvent) => void;

function toChangeListener(
  listener: EventListenerOrEventListenerObject | null
): MediaQueryChangeListener | null {
  if (!listener) return null;

  if (typeof listener === 'function') {
    return (event) => {
      listener.call(globalThis, event);
    };
  }

  return (event) => {
    listener.handleEvent(event);
  };
}

export function installMatchMedia(initialMatches = false) {
  let currentMatches = initialMatches;
  const listeners = new Set<MediaQueryChangeListener>();

  const mql: MediaQueryList = {
    media: '(min-width: 1024px)',
    get matches() {
      return currentMatches;
    },
    onchange: null,
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject | null) => {
      const handler = toChangeListener(listener);
      if (handler) listeners.add(handler);
    },
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject | null) => {
      const handler = toChangeListener(listener);
      if (handler) listeners.delete(handler);
    },
    addListener: (listener) => {
      if (!listener) return;
      listeners.add(listener);
    },
    removeListener: (listener) => {
      if (!listener) return;
      listeners.delete(listener);
    },
    dispatchEvent: () => true,
  };

  const trigger = (nextMatches: boolean) => {
    currentMatches = nextMatches;

    const event = { matches: nextMatches, media: mql.media } as MediaQueryListEvent;

    for (const listener of listeners) {
      listener(event);
    }

    mql.onchange?.call(mql, event);
  };

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql)
  );

  return { mql, trigger };
}
